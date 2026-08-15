/**
 * Real Cordis composition test: `apply` is mounted through the real plugin
 * machinery (`ctx.plugin`) instead of being invoked directly — this proves
 * the conditional injections wait for their services and activate when they
 * arrive, every registration lands on the plugin fiber, and fiber disposal
 * removes everything (no residue).
 *
 * Requires the built lib; run with: node tests/real-composition.spec.mjs
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { apply, SETTINGS_NAMESPACE } from '../lib/index.js'

/** Poll a predicate until it holds (the inject sub-fibers mount asynchronously). */
async function until(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (predicate()) return
    if (Date.now() > deadline) throw new Error('condition not met within timeout')
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

function settingsService(settingsValue = {}) {
  return {
    register: (ns, schema, options) => ({
      get: () => settingsValue,
      watch: () => () => {},
    }),
    get: () => settingsValue,
  }
}

function toolsService(toolBox) {
  return {
    register: (tool) => {
      toolBox.push(tool)
      return () => { toolBox.splice(toolBox.indexOf(tool), 1) }
    },
  }
}

function skillsService(skillBox) {
  return {
    register: (registration) => {
      skillBox.push(registration)
      return () => { skillBox.splice(skillBox.indexOf(registration), 1) }
    },
  }
}

test('条件注入等待服务出现后挂载；fiber dispose 移除全部注册', async () => {
  const ctx = new Context()
  const toolBox = []
  const skillBox = []
  let registeredNs
  ctx.provide('settings', {
    register: (ns, schema, options) => {
      registeredNs = { ns, schema, options }
      return { get: () => ({}), watch: () => () => {} }
    },
    get: () => ({}),
  })
  ctx.provide('tools', toolsService(toolBox))

  const plugin = await ctx.plugin(apply, {})
  assert.equal(registeredNs.ns, SETTINGS_NAMESPACE, '必须注册 deepseek-prism 设置命名空间')
  assert.equal(toolBox.length, 1, 'prism_see 工具必须注册')
  assert.equal(ctx.get('imageFallback'), undefined, 'apiProxy/llm 未出现前不得提供 imageFallback')

  // Gateway services arrive later: the pending injections must activate.
  const sessions = {
    prompt: async () => ({ result: { ok: true } }),
    models: async () => ({ result: { ok: true, value: { current: { provider: 'p', model: 'm' } } } }),
  }
  const originalPrompt = sessions.prompt
  ctx.provide('apiProxy', { sessions })
  ctx.provide('llm', { resolveModelInfo: async () => ({ inputModalities: ['text'] }) })
  ctx.provide('attachments', { saveImage: async () => ({ attachmentId: 'sha256:x', bytes: 1, width: 1, height: 1 }) })
  ctx.provide('skills', skillsService(skillBox))

  await until(() => ctx.get('imageFallback') !== undefined)
  assert.equal(typeof ctx.get('imageFallback').transformImages, 'function')
  assert.equal(skillBox.length, 1, '技能注册必须随 skills 服务出现而挂载')
  assert.notEqual(sessions.prompt, originalPrompt, 'prompt 包装必须随 apiProxy 出现而挂载')

  await plugin.dispose()
  assert.equal(ctx.get('imageFallback'), undefined, 'dispose 必须移除 imageFallback 服务')
  assert.equal(sessions.prompt, originalPrompt, 'dispose 必须恢复 sessions.prompt')
  assert.equal(toolBox.length, 0, 'dispose 必须移除 prism_see 工具')
  assert.equal(skillBox.length, 0, 'dispose 必须移除技能注册')
  await plugin.dispose()
})

test('真实 Cordis 装配：缺省 config 可正常挂载（Config 全可选）', async () => {
  const ctx = new Context()
  const toolBox = []
  ctx.provide('settings', settingsService({}))
  ctx.provide('tools', toolsService(toolBox))
  const plugin = await ctx.plugin(apply)
  assert.equal(toolBox.length, 1, '无 row config 时插件照常提供工具')
  await plugin.dispose()
})

test('真实 Cordis 装配：无 settings 服务时行配置即权威来源', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    assert.match(options.headers.Authorization, /Bearer sk-row/, '行配置密钥必须进入视觉调用')
    return {
      ok: true,
      text: async () => JSON.stringify({ choices: [{ message: { content: '{"a":"ok"}' } }] }),
    }
  }
  try {
    const ctx = new Context()
    const toolBox = []
    ctx.provide('tools', toolsService(toolBox))
    const sessions = {
      prompt: async () => ({ result: { ok: true } }),
      models: async () => ({ result: { ok: true, value: { current: { provider: 'p', model: 'm' } } } }),
    }
    ctx.provide('apiProxy', { sessions })
    ctx.provide('llm', { resolveModelInfo: async () => ({ inputModalities: ['text'] }) })
    const plugin = await ctx.plugin(apply, { apiKey: 'sk-row', model: 'glm-row' })

    await until(() => ctx.get('imageFallback') !== undefined)
    const transformed = await ctx.get('imageFallback').transformImages([
      { type: 'image', mediaType: 'image/png', data: 'AQ==' },
    ])
    assert.match(transformed[0].text, /src=deepseek-prism\/glm-row/, '行配置模型必须生效')
    await plugin.dispose()
  } finally {
    globalThis.fetch = originalFetch
  }
})

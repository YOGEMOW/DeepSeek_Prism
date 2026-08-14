/**
 * Real Cordis composition test: `apply` is mounted through the real plugin
 * machinery (`ctx.plugin`) instead of being invoked directly — this proves
 * the `inject` declaration waits for the settings/tools services, the
 * `imageFallback` service lands on the fiber, and fiber disposal removes
 * every registration.
 *
 * Requires the built lib; run with: node tests/real-composition.spec.mjs
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { apply, SETTINGS_NAMESPACE } from '../lib/index.js'

test('真实 Cordis 装配：inject 等待、服务注册、fiber dispose 清理', async () => {
  const ctx = new Context()
  let registeredNs
  const settings = {
    register: (ns, schema, options) => {
      registeredNs = { ns, schema, options }
      return { get: () => ({ apiKey: 'sk-test' }) }
    },
    get: () => ({ apiKey: 'sk-test' }),
  }
  const toolBox = []
  const tools = {
    register: (tool) => {
      toolBox.push(tool)
      return () => {
        const index = toolBox.indexOf(tool)
        if (index >= 0) toolBox.splice(index, 1)
      }
    },
  }
  ctx.provide('settings', settings)
  ctx.provide('tools', tools)

  // Cordis mounts the plugin only after the injected services are present.
  const dispose = await ctx.plugin(apply, {})
  assert.equal(registeredNs.ns, SETTINGS_NAMESPACE, '必须注册 deepseek-prism 设置命名空间')
  assert.equal(toolBox.length, 1, 'prism_see 工具必须注册')
  assert.equal(toolBox[0].name, 'prism_see')

  // The fallback service is resolvable through the real service store.
  const fallback = ctx.get('imageFallback')
  assert.ok(fallback, 'imageFallback 服务必须由 apply 提供')
  assert.equal(typeof fallback.transformImages, 'function')

  // Fiber disposal removes the tool, the fallback service, and stays idempotent.
  dispose()
  assert.equal(toolBox.length, 0, 'dispose 必须移除已注册工具')
  assert.equal(ctx.get('imageFallback'), undefined, 'dispose 必须移除 imageFallback 服务')
  dispose()
})

test('真实 Cordis 装配：缺省 config 可正常挂载（Config 全可选）', async () => {
  const ctx = new Context()
  ctx.provide('settings', {
    register: () => ({ get: () => ({}) }),
    get: () => ({}),
  })
  ctx.provide('tools', { register: () => () => {} })
  const dispose = await ctx.plugin(apply)
  assert.ok(ctx.get('imageFallback'), '无 row config 时插件照常提供能力')
  dispose()
})

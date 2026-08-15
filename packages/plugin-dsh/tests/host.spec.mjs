/**
 * DeepSeek Prism host plugin tests: Cordis mounting, settings/tool/skill
 * registration, the `prism_see` execution path against a mocked vision API,
 * the image admission conversion (VEP/2 + attachment pointers), and the
 * `apiProxy.sessions.prompt` wrapper.
 *
 * Requires the built lib (`pnpm run build` first) and the linked local
 * devDependencies. Run with: node tests/host.spec.mjs
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import {
  apply,
  attachmentObjectPath,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  installPromptDegradation,
  loadSkillDefinition,
  parseSkillFrontmatter,
  PrismConfigError,
  resolveVisionModule,
  SETTINGS_NAMESPACE,
  transformImageContent,
} from '../lib/index.js'

const PNG_BASE64 = 'AQ=='

/** Build a cordis context with stubbed services; the sessions pair models a text-only session. */
function stubServices({ settings = {}, withGateway = false } = {}) {
  const ctx = new Context()
  let registeredNs
  const watchers = []
  const settingsService = {
    register: (ns, schema, options) => {
      registeredNs = { ns, schema, options }
      return {
        get: () => settings,
        watch: (fn) => { watchers.push(fn); return () => {} },
      }
    },
    get: () => settings,
  }
  const toolBox = []
  const toolsService = {
    register: (tool) => {
      toolBox.push(tool)
      return () => { toolBox.splice(toolBox.indexOf(tool), 1) }
    },
  }
  const skillBox = []
  const skillsService = {
    register: (registration) => {
      skillBox.push(registration)
      return () => { skillBox.splice(skillBox.indexOf(registration), 1) }
    },
  }
  const attachmentBox = []
  const attachmentsService = {
    saveImage: async ({ data, mediaType, name }) => {
      const attachmentId = `sha256:${'a'.repeat(64)}`
      const saved = { attachmentId, name, mediaType, bytes: data.byteLength, width: 10, height: 20 }
      attachmentBox.push(saved)
      return saved
    },
  }
  ctx.provide('settings', settingsService)
  ctx.provide('tools', toolsService)
  ctx.provide('skills', skillsService)
  ctx.provide('attachments', attachmentsService)
  let sessions
  let apiCalls = []
  if (withGateway) {
    sessions = {
      prompt: async (request) => {
        apiCalls.push(request)
        return { result: { ok: true } }
      },
      models: async () => ({
        result: { ok: true, value: { current: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } },
      }),
    }
    ctx.provide('apiProxy', { sessions })
    ctx.provide('llm', { resolveModelInfo: async () => ({ inputModalities: ['text'] }) })
  }
  return {
    ctx, watchers, toolBox, skillBox, attachmentBox,
    sessions, apiCalls: () => apiCalls,
    registeredNs: () => registeredNs,
  }
}

/** Mount the real plugin; returns the plugin instance with dispose. */
async function mount({ settings, withGateway } = {}) {
  const stubs = stubServices({ settings, withGateway })
  const plugin = await stubs.ctx.plugin(apply, {})
  return { ...stubs, plugin }
}

/** Poll a predicate until it holds (the inject sub-fibers mount asynchronously). */
async function until(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (predicate()) return
    if (Date.now() > deadline) throw new Error('condition not met within timeout')
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

function tempImage() {
  return mkdtemp(path.join(os.tmpdir(), 'prism-plugin-'))
}

function mockFetch(body, usage) {
  return async () => ({
    ok: true,
    text: async () => JSON.stringify({
      choices: [{ message: { content: body } }],
      ...(usage === undefined ? {} : { usage }),
    }),
  })
}

test('apply 通过真实 Cordis 装配注册设置命名空间、prism_see 工具、技能与 imageFallback', async () => {
  const { ctx, registeredNs, toolBox, skillBox, plugin } = await mount({ withGateway: true })
  await until(() => ctx.get('imageFallback') !== undefined)
  assert.equal(registeredNs().ns, SETTINGS_NAMESPACE, '必须注册 deepseek-prism 设置命名空间')
  assert.equal(toolBox.length, 1, 'prism_see 工具必须注册')
  assert.equal(toolBox[0].name, 'prism_see')
  assert.equal(typeof toolBox[0].execute, 'function')
  assert.match(toolBox[0].description, /VEP\/2/)
  assert.equal(skillBox.length, 1, 'deepseek-prism 技能必须运行时注册')
  assert.equal(skillBox[0].name, 'deepseek-prism')
  assert.ok(skillBox[0].content.length > 0, '技能正文非空')
  assert.ok(skillBox[0].resourceBase, '技能资源基准目录存在')
  const fallback = ctx.get('imageFallback')
  assert.ok(fallback, 'imageFallback 服务必须提供')
  assert.equal(typeof fallback.transformImages, 'function')
  await plugin.dispose()
})

test('fiber dispose 清理全部注册：imageFallback、工具、技能、prompt 包装', async () => {
  const stubs = stubServices({ withGateway: true })
  const originalPrompt = stubs.sessions.prompt
  const plugin = await stubs.ctx.plugin(apply, {})
  const { ctx, sessions, toolBox, skillBox } = stubs
  await until(() => ctx.get('imageFallback') !== undefined)
  assert.notEqual(sessions.prompt, originalPrompt, 'prompt 必须被包装')
  await plugin.dispose()
  assert.equal(ctx.get('imageFallback'), undefined, 'dispose 必须移除 imageFallback 服务')
  assert.equal(sessions.prompt, originalPrompt, 'dispose 必须恢复 sessions.prompt')
  assert.equal(toolBox.length, 0, 'dispose 必须移除 prism_see 工具')
  assert.equal(skillBox.length, 0, 'dispose 必须移除技能注册')
  await plugin.dispose()
})

test('无 apiProxy/llm 的 profile（headless）照常挂载工具与技能，不提供 imageFallback', async () => {
  const { ctx, toolBox, skillBox, plugin } = await mount({})
  assert.equal(toolBox.length, 1, 'prism_see 工具必须注册')
  assert.equal(skillBox.length, 1, '技能必须注册')
  assert.equal(ctx.get('imageFallback'), undefined, '无 apiProxy 时不应提供 imageFallback')
  plugin.dispose()
})

test('无密钥时 execute 抛出 PrismConfigError 配置指引', async () => {
  const originalEnv = { ...process.env }
  delete process.env.SILICONFLOW_API_KEY
  delete process.env.VISION_API_KEY
  try {
    const { toolBox, plugin } = await mount({})
    await assert.rejects(
      toolBox[0].execute({ image: 'x.png', question: '有什么' }, { agent: { session: { header: { cwd: process.cwd() } } } }),
      (error) => error instanceof PrismConfigError && /未配置视觉 API 密钥/.test(error.message),
    )
    plugin.dispose()
  } finally {
    process.env = originalEnv
  }
})

test('execute 用 settings 密钥调用视觉 API 并返回 VEP/2', async () => {
  const dir = await tempImage()
  const calls = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return {
      ok: true,
      text: async () => JSON.stringify({
        choices: [{ message: { content: '<|begin_of_box|>{"a":"Cannot find module ethers","t":"src/app.ts:42","c":0.97}<|end_of_box|>' } }],
      }),
    }
  }
  try {
    const imagePath = path.join(dir, 'shot.png')
    await writeFile(imagePath, Buffer.from('tiny-fake-png'))
    const { toolBox, plugin } = await mount({
      settings: { apiKey: 'sk-test', baseUrl: 'https://vision.example/v1/', model: 'glm-test', region: 'cn' },
    })
    const result = await toolBox[0].execute(
      { image: imagePath, question: '提取报错信息' },
      { agent: { session: { header: { cwd: dir } } } },
    )
    assert.match(result.text, /^VEP\/[12]\|src=deepseek-prism\/glm-test\|m=error/)
    assert.match(result.text, /a="Cannot find module ethers"/)
    assert.equal(calls.length, 1)
    const body = JSON.parse(calls[0].options.body)
    assert.equal(body.model, 'glm-test')
    assert.equal(body.temperature, 0)
    assert.match(calls[0].options.headers.Authorization, /Bearer sk-test/)
    plugin.dispose()
  } finally {
    globalThis.fetch = originalFetch
    await rm(dir, { recursive: true, force: true })
  }
})

test('execute detail 模式返回清理后的分节报告', async () => {
  const dir = await tempImage()
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify({
      choices: [{ message: { content: '```json\n{"a":"A1 页面概述"}\n```' } }],
    }),
  })
  try {
    const imagePath = path.join(dir, 'ui.png')
    await writeFile(imagePath, Buffer.from('tiny-fake-png'))
    const { toolBox, plugin } = await mount({ settings: { apiKey: 'sk-test', model: 'glm-test' } })
    const result = await toolBox[0].execute(
      { image: imagePath, question: '还原这个页面', detail: true },
      { agent: { session: { header: { cwd: dir } } } },
    )
    assert.equal(result.text, '{"a":"A1 页面概述"}')
    plugin.dispose()
  } finally {
    globalThis.fetch = originalFetch
    await rm(dir, { recursive: true, force: true })
  }
})

test('settings 缺省时回退环境变量与默认值', async () => {
  const originalEnv = { ...process.env }
  process.env.SILICONFLOW_API_KEY = 'sk-env'
  delete process.env.VISION_BASE_URL
  delete process.env.VISION_MODEL
  try {
    const dir = await tempImage()
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => ({
      ok: true,
      text: async () => JSON.stringify({ choices: [{ message: { content: '{"a":"ok"}' } }] }),
    })
    try {
      const imagePath = path.join(dir, 'a.png')
      await writeFile(imagePath, Buffer.from('x'))
      const { toolBox, plugin } = await mount({})
      const result = await toolBox[0].execute(
        { image: imagePath, question: '看到什么' },
        { agent: { session: { header: { cwd: dir } } } },
      )
      assert.match(result.text, new RegExp(`src=deepseek-prism/${DEFAULT_MODEL}`))
      plugin.dispose()
    } finally {
      globalThis.fetch = originalFetch
      await rm(dir, { recursive: true, force: true })
    }
  } finally {
    process.env = originalEnv
  }
})

test('resolveVisionModule 定位到技能目录的 vision.mjs', async () => {
  const vision = await resolveVisionModule()
  assert.equal(typeof vision.callVision, 'function')
  assert.equal(typeof vision.toVep, 'function')
  assert.equal(vision.DEFAULT_MAX_CHARS, 520)
  assert.equal(vision.defaultMaxTokensFor(false), 512)
})

test('默认值常量与技能脚本一致', async () => {
  const vision = await resolveVisionModule()
  const provider = vision.PROVIDERS.find(p => p.id === 'siliconflow')
  assert.equal(DEFAULT_MODEL, provider.defaultModel)
  assert.equal(DEFAULT_BASE_URL, provider.baseUrl)
})

test('transformImageContent 把图片转为 VEP 文本、持久化附件并附路径指针（不再保留原图块）', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = mockFetch('<|begin_of_box|>{"a":"截图里有报错信息","t":"main.ts:12","c":0.95}<|end_of_box|>', {
    prompt_tokens: 120, completion_tokens: 48, total_tokens: 168,
  })
  try {
    const { ctx, attachmentBox } = stubServices()
    const sourceOf = () => ({ apiKey: 'sk-test', model: 'glm-test' })
    const transformed = await transformImageContent(ctx, [
      { type: 'text', text: '看看这张图' },
      { type: 'image', mediaType: 'image/png', data: PNG_BASE64, name: 'shot.png' },
      { type: 'image', mediaType: 'image/jpeg', data: 'Ag==' },
    ], sourceOf)
    assert.deepEqual(transformed[0], { type: 'text', text: '看看这张图' })
    assert.equal(transformed.filter(part => part.type === 'image').length, 0, '原图块必须移除（未打补丁序列化器兼容）')
    const pointers = transformed.filter(part => /已保存为附件：/.test(part.text))
    assert.equal(pointers.length, 2, '每张图片一条附件路径指针')
    assert.match(pointers[0].text, /shot\.png（10×20 px、1 B）/)
    assert.match(pointers[0].text, /attachments[/\\]v1[/\\]objects[/\\]aa/)
    assert.equal(attachmentBox.length, 2, '两张图片均持久化为附件')
    const evidence = transformed.filter(part => /【DeepSeek Prism 识别：/.test(part.text))
    assert.equal(evidence.length, 2)
    assert.match(evidence[0].text, /^【DeepSeek Prism 识别：shot\.png】/)
    assert.match(evidence[0].text, /VEP\/[12]\|src=deepseek-prism\/glm-test/)
    assert.match(evidence[0].text, /a="截图里有报错信息"/)
    assert.match(evidence[0].text, /【DeepSeek Prism 用量】tokens=336/)
    assert.doesNotMatch(evidence[0].text, /balance=/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('transformImageContent 无 attachments 服务时跳过指针、仍返回 VEP 证据', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = mockFetch('{"a":"ok"}', { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 })
  try {
    const ctx = new Context()
    const transformed = await transformImageContent(ctx, [
      { type: 'image', mediaType: 'image/png', data: PNG_BASE64 },
    ], () => ({ apiKey: 'sk-test', model: 'glm-test' }))
    assert.equal(transformed.length, 1)
    assert.equal(transformed[0].type, 'text')
    assert.doesNotMatch(transformed[0].text, /已保存为附件/)
    assert.match(transformed[0].text, /【DeepSeek Prism 识别：图片 1】/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('transformImageContent 无密钥时抛出 PrismConfigError', async () => {
  const originalEnv = { ...process.env }
  delete process.env.SILICONFLOW_API_KEY
  delete process.env.VISION_API_KEY
  try {
    const ctx = new Context()
    await assert.rejects(
      transformImageContent(ctx, [{ type: 'image', mediaType: 'image/png', data: PNG_BASE64 }], () => ({})),
      (error) => error instanceof PrismConfigError,
    )
  } finally {
    process.env = originalEnv
  }
})

test('transformImageContent 已含 VEP 证据的内容原样返回（幂等，防二次转换）', async () => {
  const ctx = new Context()
  const content = [
    { type: 'text', text: '【DeepSeek Prism 识别：a.png】\nVEP/1|a="x"' },
    { type: 'image', mediaType: 'image/png', data: PNG_BASE64 },
  ]
  const transformed = await transformImageContent(ctx, content, () => ({ apiKey: 'sk-test' }))
  assert.deepEqual(transformed, content)
})

test('transformImageContent 纯文本内容原样返回', async () => {
  const ctx = new Context()
  const content = [{ type: 'text', text: 'hello' }]
  const transformed = await transformImageContent(ctx, content, () => ({ apiKey: 'sk-test' }))
  assert.deepEqual(transformed, content)
})

test('transformImageContent showBalance 开启时查询余额并附带余额/消耗字段', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/user/info')) {
      return { ok: true, json: async () => ({ data: { balance: '9.99' } }) }
    }
    return {
      ok: true,
      text: async () => JSON.stringify({
        choices: [{ message: { content: '{"a":"ok"}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    }
  }
  try {
    const { ctx } = stubServices()
    const transformed = await transformImageContent(ctx, [
      { type: 'image', mediaType: 'image/png', data: PNG_BASE64 },
    ], () => ({ apiKey: 'sk-test', model: 'glm-test', showBalance: true }))
    assert.match(transformed[1].text, /tokens=15/)
    assert.match(transformed[1].text, /balance=9\.99/)
    // 估算单价：输入 0.14 元/M、输出 0.86 元/M → (10*0.14 + 5*0.86)/1e6 = 5.7e-6
    assert.match(transformed[1].text, /cost=0\.000006/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('transformImageContent 输出触顶时自动升级预算重试并汇总用量', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  const maxTokensSeen = []
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/user/info')) {
      return { ok: true, json: async () => ({ data: { balance: '0' } }) }
    }
    calls += 1
    maxTokensSeen.push(JSON.parse(options.body).max_tokens)
    const completion = calls === 1 ? 500 : 200
    return {
      ok: true,
      text: async () => JSON.stringify({
        choices: [{ message: { content: '{"a":"ok"}' } }],
        usage: { prompt_tokens: 10, completion_tokens: completion, total_tokens: 10 + completion },
      }),
    }
  }
  try {
    const { ctx } = stubServices()
    const transformed = await transformImageContent(ctx, [
      { type: 'image', mediaType: 'image/png', data: PNG_BASE64 },
    ], () => ({ apiKey: 'sk-test', model: 'glm-test', showBalance: true }))
    assert.equal(calls, 2, '触顶后必须升级重试')
    assert.deepEqual(maxTokensSeen, [512, 1024])
    assert.match(transformed[1].text, /tokens=720/)
    assert.doesNotMatch(transformed[1].text, /balance=/)
    assert.match(transformed[1].text, /cost=0\.000605/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('transformImageContent 用户附带问题文本时按意图模式识别（qa）', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = mockFetch('{"a":"红色按钮","t":"确定"}', { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 })
  try {
    const { ctx } = stubServices()
    const transformed = await transformImageContent(ctx, [
      { type: 'text', text: '这个按钮是什么颜色？' },
      { type: 'image', mediaType: 'image/png', data: PNG_BASE64 },
    ], () => ({ apiKey: 'sk-test', model: 'glm-test' }))
    assert.deepEqual(transformed[0], { type: 'text', text: '这个按钮是什么颜色？' })
    assert.match(transformed[2].text, /m=qa/)
    assert.match(transformed[2].text, /【DeepSeek Prism 识别：图片 1】/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('transformImageContent 双图 + 对比意图触发 diff 模式（一次双图调用）', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  let seenImages = 0
  globalThis.fetch = async (url, options) => {
    calls += 1
    const body = JSON.parse(options.body)
    seenImages = body.messages[0].content.filter((c) => c.type === 'image_url').length
    return {
      ok: true,
      text: async () => JSON.stringify({
        choices: [{
          message: {
            content: '{"d":[{"x":0.1,"y":0.1,"w":0.2,"h":0.2,"desc":"按钮颜色变化"}],"t":"图A 确定 图B 取消"}',
          },
        }],
        usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
      }),
    }
  }
  try {
    const { ctx } = stubServices()
    const transformed = await transformImageContent(ctx, [
      { type: 'text', text: '对比这两张图的差异' },
      { type: 'image', mediaType: 'image/png', data: PNG_BASE64 },
      { type: 'image', mediaType: 'image/png', data: 'Ag==' },
    ], () => ({ apiKey: 'sk-test', model: 'glm-test' }))
    assert.equal(calls, 1, 'diff 只调用一次')
    assert.equal(seenImages, 2, '双图在同一请求中')
    assert.equal(transformed.filter(part => part.type === 'image').length, 0, '原图块必须移除')
    const diffPart = transformed.find(part => /【DeepSeek Prism 对比：/.test(part.text))
    assert.match(diffPart.text, /【DeepSeek Prism 对比：图 1 vs 图 2】/)
    assert.match(diffPart.text, /m=diff/)
    assert.match(diffPart.text, /d=\[{"x":0\.1,"y":0\.1,"w":0\.2,"h":0\.2,"desc":"按钮颜色变化"}\]/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('prompt 包装：文本模型会话的图片请求被转为 VEP 文本后进入上游', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = mockFetch('{"a":"ok"}', { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 })
  try {
    const { sessions, apiCalls, plugin } = await mount({ settings: { apiKey: 'sk-test', model: 'glm-test' }, withGateway: true })
    await sessions.prompt({
      payload: {
        sessionId: 's1',
        mode: 'queue',
        content: [
          { type: 'text', text: '看看这张图' },
          { type: 'image', mediaType: 'image/png', data: PNG_BASE64, name: 'shot.png' },
        ],
      },
    })
    assert.equal(apiCalls().length, 1, '上游 prompt 恰好调用一次')
    const content = apiCalls()[0].payload.content
    assert.equal(content.filter(part => part.type === 'image').length, 0, '上游内容不含图片块')
    assert.ok(content.some(part => /【DeepSeek Prism 识别：shot\.png】/.test(part.text)), '上游内容含 VEP 证据')
    assert.deepEqual(content[0], { type: 'text', text: '看看这张图' })
    plugin.dispose()
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('prompt 包装：无图片请求原样通过，不调用视觉 API', async () => {
  const { sessions, apiCalls, plugin } = await mount({ settings: { apiKey: 'sk-test' }, withGateway: true })
  const request = { payload: { sessionId: 's1', mode: 'queue', content: [{ type: 'text', text: 'hi' }] } }
  await sessions.prompt(request)
  assert.equal(apiCalls().length, 1)
  assert.equal(apiCalls()[0], request, '纯文本请求必须原样引用')
  plugin.dispose()
})

test('prompt 包装：视觉模型会话原样通过', async () => {
  const { ctx, sessions, apiCalls, plugin } = await mount({ settings: { apiKey: 'sk-test' }, withGateway: true })
  // 切换会话当前模型为视觉模型
  ctx.get('llm').resolveModelInfo = async () => ({ inputModalities: ['text', 'image'] })
  const request = {
    payload: {
      sessionId: 's1',
      mode: 'queue',
      content: [{ type: 'image', mediaType: 'image/png', data: PNG_BASE64 }],
    },
  }
  await sessions.prompt(request)
  assert.equal(apiCalls().length, 1)
  assert.deepEqual(apiCalls()[0].payload.content, request.payload.content, '视觉模型内容原样通过')
  plugin.dispose()
})

test('prompt 包装：缺失密钥时 PrismConfigError 直达客户端（不伪装成模型拒绝）', async () => {
  const originalEnv = { ...process.env }
  delete process.env.SILICONFLOW_API_KEY
  delete process.env.VISION_API_KEY
  try {
    const { sessions, apiCalls, plugin } = await mount({ withGateway: true })
    await assert.rejects(
      sessions.prompt({
        payload: { sessionId: 's1', content: [{ type: 'image', mediaType: 'image/png', data: PNG_BASE64 }] },
      }),
      (error) => error instanceof PrismConfigError,
    )
    assert.equal(apiCalls().length, 0, '配置错误不得进入上游')
    plugin.dispose()
  } finally {
    process.env = originalEnv
  }
})

test('prompt 包装 dispose 链式安全：仅在自己仍是最外层时恢复', async () => {
  const stubs = stubServices({ settings: { apiKey: 'sk-test' }, withGateway: true })
  const plugin = await stubs.ctx.plugin(apply, {})
  const { ctx, sessions } = stubs
  await until(() => ctx.get('imageFallback') !== undefined)
  const prismWrapped = sessions.prompt
  // 另一插件在 prism 包装之上再包一层
  const outer = async (request) => {
    const inner = prismWrapped
    return inner.call(sessions, request)
  }
  sessions.prompt = outer
  await plugin.dispose()
  assert.equal(sessions.prompt, outer, 'dispose 时外层包装必须保留')
  assert.equal(typeof ctx.get('imageFallback'), 'undefined', 'dispose 必须移除 imageFallback 服务')
})

test('installPromptDegradation 在 sessions.prompt 缺失时返回 undefined', () => {
  const ctx = new Context()
  ctx.provide('apiProxy', { sessions: {} })
  ctx.provide('llm', { resolveModelInfo: async () => ({ inputModalities: ['text'] }) })
  assert.equal(installPromptDegradation(ctx, async (content) => content), undefined)
})

test('技能素材：frontmatter 解析与资源基准目录', () => {
  const skill = loadSkillDefinition()
  assert.equal(skill.name, 'deepseek-prism')
  assert.ok(skill.description.length > 0, 'SKILL.md 必须带 description')
  assert.ok(skill.content.includes('DeepSeek Prism'), '正文剥离 frontmatter 后保留')
  assert.equal(skill.resourceBase.kind, 'directory')
  assert.match(skill.path, /SKILL\.md$/)
  assert.equal(parseSkillFrontmatter('no frontmatter'), undefined)
})

test('附件对象路径按 attachment-local v1 布局重建', () => {
  const sha = 'ab'.padEnd(64, '0')
  assert.equal(
    attachmentObjectPath(`sha256:${sha}`, 'C:/home'),
    path.join('C:/home', 'attachments', 'v1', 'objects', 'ab', sha),
  )
})

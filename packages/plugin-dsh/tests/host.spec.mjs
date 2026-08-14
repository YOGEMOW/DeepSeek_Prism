/**
 * DeepSeek Prism host plugin tests: settings/tool registration and the
 * `prism_see` execution path against a mocked vision API.
 *
 * Requires the built lib (`node_modules/.bin/tsdown` in the package dir) and
 * the linked local devDependencies (`pnpm install` after the link: specs).
 * Run with: node tests/host.spec.mjs
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import {
  apply,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  resolveVisionModule,
  SETTINGS_NAMESPACE,
} from '../lib/index.js'

function stubContext(settingsValue) {
  let registered
  const settings = {
    register: (ns, schema, options) => {
      registered = { ns, schema, options }
      return { get: () => settingsValue }
    },
    get: () => settingsValue,
  }
  const tools = []
  const ctx = new Context()
  ctx.provide('settings', settings)
  ctx.provide('tools', { register: (tool) => { tools.push(tool) } })
  return { ctx, tools, registered: () => registered }
}

function tempImage() {
  return mkdtemp(path.join(os.tmpdir(), 'prism-plugin-'))
}

test('apply 注册 settings 命名空间与 prism_see 工具', () => {
  const { ctx, tools, registered } = stubContext({})
  apply(ctx, {})
  const reg = registered()
  assert.equal(reg.ns, SETTINGS_NAMESPACE)
  assert.ok(reg.schema, '必须注册 settings schema')
  assert.equal(tools.length, 1)
  assert.equal(tools[0].name, 'prism_see')
  assert.equal(typeof tools[0].execute, 'function')
  assert.match(tools[0].description, /VEP\/2/)
})

test('无密钥时 execute 抛出配置指引错误', async () => {
  const { ctx, tools } = stubContext({})
  apply(ctx, {})
  await assert.rejects(
    tools[0].execute({ image: 'x.png', question: '有什么' }, { agent: { session: { header: { cwd: process.cwd() } } } }),
    /未配置视觉 API 密钥/,
  )
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
    const { ctx, tools } = stubContext({
      apiKey: 'sk-test',
      baseUrl: 'https://vision.example/v1/',
      model: 'glm-test',
      region: 'cn',
    })
    apply(ctx, {})
    const result = await tools[0].execute(
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
    const { ctx, tools } = stubContext({ apiKey: 'sk-test', model: 'glm-test' })
    apply(ctx, {})
    const result = await tools[0].execute(
      { image: imagePath, question: '还原这个页面', detail: true },
      { agent: { session: { header: { cwd: dir } } } },
    )
    assert.equal(result.text, '{"a":"A1 页面概述"}')
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
      const { ctx, tools } = stubContext({})
      apply(ctx, {})
      const result = await tools[0].execute(
        { image: imagePath, question: '看到什么' },
        { agent: { session: { header: { cwd: dir } } } },
      )
      assert.match(result.text, new RegExp(`src=deepseek-prism/${DEFAULT_MODEL}`))
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

test('apply 提供 imageFallback 服务，把图片 part 转成 VEP/2 文本 part', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify({
      choices: [{ message: { content: '<|begin_of_box|>{"a":"截图里有报错信息","t":"main.ts:12","c":0.95}<|end_of_box|>' } }],
      usage: { prompt_tokens: 120, completion_tokens: 48, total_tokens: 168 },
    }),
  })
  try {
    const { ctx } = stubContext({ apiKey: 'sk-test', model: 'glm-test' })
    apply(ctx, {})
    const fallback = ctx.get('imageFallback')
    assert.ok(fallback, '必须提供 imageFallback 服务')
    const transformed = await fallback.transformImages([
      { type: 'text', text: '看看这张图' },
      { type: 'image', mediaType: 'image/png', data: 'AQ==', name: 'shot.png' },
      { type: 'image', mediaType: 'image/jpeg', data: 'Ag==' },
    ])
    assert.equal(transformed.length, 5)
    assert.deepEqual(transformed[0], { type: 'text', text: '看看这张图' })
    // 原图作为展示附件保留在消息里。
    assert.equal(transformed[1].type, 'image')
    assert.equal(transformed[2].type, 'image')
    assert.match(transformed[3].text, /^【DeepSeek Prism 识别：shot\.png】/)
    assert.match(transformed[3].text, /VEP\/[12]\|src=deepseek-prism\/glm-test/)
    assert.match(transformed[3].text, /a="截图里有报错信息"/)
    assert.match(transformed[4].text, /^【DeepSeek Prism 识别：图片 2】/)
    assert.equal(transformed[4].type, 'text')
    // showUsage 默认开启：用量行携带本次消息的总 token 数（两图各 168）；
    // showBalance 默认关闭：无余额字段。
    assert.match(transformed[3].text, /【DeepSeek Prism 用量】tokens=336/)
    assert.match(transformed[4].text, /【DeepSeek Prism 用量】tokens=336/)
    assert.doesNotMatch(transformed[3].text, /balance=/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('imageFallback showBalance 开启时查询余额并附带余额/消耗字段', async () => {
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
    const { ctx } = stubContext({ apiKey: 'sk-test', model: 'glm-test', showBalance: true })
    apply(ctx, {})
    const fallback = ctx.get('imageFallback')
    const transformed = await fallback.transformImages([
      { type: 'image', mediaType: 'image/png', data: 'AQ==' },
    ])
    assert.equal(transformed[0].type, 'image', '原图作为展示附件保留')
    assert.match(transformed[1].text, /tokens=15/)
    assert.match(transformed[1].text, /balance=9\.99/)
    // 估算单价：输入 0.14 元/M、输出 0.86 元/M → (10*0.14 + 5*0.86)/1e6 = 5.7e-6
    assert.match(transformed[1].text, /cost=0\.000006/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('imageFallback 输出触顶时自动升级预算重试并汇总用量', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  const maxTokensSeen = []
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/user/info')) {
      // 赠金账户：API 返回 0，不应渲染误导性的“余额”字段。
      return { ok: true, json: async () => ({ data: { balance: '0' } }) }
    }
    calls += 1
    maxTokensSeen.push(JSON.parse(options.body).max_tokens)
    // 第一次触顶 512 档（500 >= 512*0.95），第二次在 1024 档正常收尾。
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
    const { ctx } = stubContext({ apiKey: 'sk-test', model: 'glm-test', showBalance: true })
    apply(ctx, {})
    const fallback = ctx.get('imageFallback')
    const transformed = await fallback.transformImages([
      { type: 'image', mediaType: 'image/png', data: 'AQ==' },
    ])
    assert.equal(calls, 2, '触顶后必须升级重试')
    assert.deepEqual(maxTokensSeen, [512, 1024])
    // 用量汇总两轮：total = 510 + 210 = 720；余额 0 不渲染；cost 按汇总估算
    // （20*0.14 + 700*0.86 = 604.8 → 0.000605 元）。
    assert.match(transformed[1].text, /tokens=720/)
    assert.doesNotMatch(transformed[1].text, /balance=/)
    assert.match(transformed[1].text, /cost=0\.000605/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('imageFallback 无密钥时抛出配置指引错误', async () => {
  const { ctx } = stubContext({})
  apply(ctx, {})
  const fallback = ctx.get('imageFallback')
  assert.ok(fallback, '必须提供 imageFallback 服务')
  await assert.rejects(
    fallback.transformImages([{ type: 'image', mediaType: 'image/png', data: 'AQ==' }]),
    /未配置视觉 API 密钥/,
  )
})

test('imageFallback 用户附带问题文本时按意图模式识别（qa）', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify({
      choices: [{ message: { content: '{"a":"红色按钮","t":"确定"}' } }],
      usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
    }),
  })
  try {
    const { ctx } = stubContext({ apiKey: 'sk-test', model: 'glm-test' })
    apply(ctx, {})
    const fallback = ctx.get('imageFallback')
    const transformed = await fallback.transformImages([
      { type: 'text', text: '这个按钮是什么颜色？' },
      { type: 'image', mediaType: 'image/png', data: 'AQ==' },
    ])
    assert.equal(transformed.length, 3)
    assert.deepEqual(transformed[0], { type: 'text', text: '这个按钮是什么颜色？' })
    assert.equal(transformed[1].type, 'image', '原图作为展示附件保留')
    assert.match(transformed[2].text, /m=qa/)
    assert.match(transformed[2].text, /【DeepSeek Prism 识别：图片 1】/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('imageFallback 双图 + 对比意图触发 diff 模式（一次双图调用）', async () => {
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
    const { ctx } = stubContext({ apiKey: 'sk-test', model: 'glm-test' })
    apply(ctx, {})
    const fallback = ctx.get('imageFallback')
    const transformed = await fallback.transformImages([
      { type: 'text', text: '对比这两张图的差异' },
      { type: 'image', mediaType: 'image/png', data: 'AQ==' },
      { type: 'image', mediaType: 'image/png', data: 'Ag==' },
    ])
    assert.equal(calls, 1, 'diff 只调用一次')
    assert.equal(seenImages, 2, '双图在同一请求中')
    assert.equal(transformed.length, 4, '文本 part + 两原图 + diff part')
    assert.deepEqual(transformed[0], { type: 'text', text: '对比这两张图的差异' })
    assert.equal(transformed[1].type, 'image', '原图作为展示附件保留')
    assert.equal(transformed[2].type, 'image', '原图作为展示附件保留')
    assert.match(transformed[3].text, /【DeepSeek Prism 对比：图 1 vs 图 2】/)
    assert.match(transformed[3].text, /m=diff/)
    assert.match(transformed[3].text, /d=\[{"x":0\.1,"y":0\.1,"w":0\.2,"h":0\.2,"desc":"按钮颜色变化"}\]/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  apply,
  applyVisionEnvironment,
  attachmentObjectPath,
  degradeImageContent,
  imagePointerText,
  installPromptDegradation,
  isCurrentModelTextOnly,
  loadSkillDefinition,
  parseSkillFrontmatter,
  resolveSkillSource,
} from "../src/index.mjs";

const SHA = "a".repeat(64);

/**
 * 构造与真实 api-proxy 一致的会话桩：`models` 同样从 `request.payload` 解构，
 * 传错形状（如裸 { sessionId }）会像真实实现一样抛 TypeError。
 */
function fakeGateway({ inputModalities = ["text"], current = { provider: "deepseek", model: "deepseek-v4-flash" }, modelsError = false } = {}) {
  const calls = [];
  const original = async (request) => {
    calls.push(request);
    return { result: { ok: true, value: { accepted: true } } };
  };
  const sessions = {
    prompt: original,
    models: async (request) => {
      // 与 api-proxy 的 sessions.models 相同的解构（回归：形状错误会抛错）
      const { sessionId } = request.payload;
      if (modelsError || sessionId !== "s1") {
        return { result: { ok: false, error: { code: "session-not-found" } } };
      }
      return { result: { ok: true, value: { current } } };
    },
  };
  const ctx = {
    apiProxy: { sessions },
    llm: {
      resolveModelInfo: async () => ({ inputModalities }),
    },
    attachments: {
      imageLimits: { maxImagesPerMessage: 2, maxMessageImageBytes: 4096 },
      validateImage: async () => {},
      saveImage: async (input) => ({
        attachmentId: `sha256:${SHA}`,
        mediaType: input.mediaType,
        bytes: input.data.byteLength,
        width: 12,
        height: 34,
        ...input.name === undefined ? {} : { name: input.name },
      }),
    },
    on: () => {},
  };
  installPromptDegradation(ctx);
  return { ctx, sessions, calls };
}

function imagePart(name) {
  return { type: "image", mediaType: "image/png", data: Buffer.from("x").toString("base64"), ...(name ? { name } : {}) };
}

const textPart = { type: "text", text: "看这张图" };

function promptRequest(content) {
  return { rpcId: "rpc-1", payload: { sessionId: "s1", mode: "queue", content } };
}

test("纯文本模型 + 图片：降级为文本指针后交给上游", async () => {
  const { sessions, calls } = fakeGateway();
  const result = await sessions.prompt(promptRequest([imagePart("shot.png"), textPart]));
  assert.equal(result.result.ok, true);
  assert.equal(calls.length, 1);
  const content = calls[0].payload.content;
  assert.equal(content.length, 2);
  assert.equal(content[0].type, "text");
  assert.match(content[0].text, /图片附件 shot.png/);
  assert.match(content[0].text, /12x34 px/);
  assert.match(content[0].text, /deepseek-prism/);
  assert.match(content[0].text, /attachments/);
  assert.ok(!content.some((block) => block.type === "image"), "上游不应再看到图片块");
  assert.deepEqual(content[1], textPart);
});

test("回归：models RPC 传完整请求形状（{ payload: { sessionId } }），裸对象会抛错", async () => {
  // 真实 api-proxy 的 sessions.models 从 request.payload 解构；
  // 若插件传错形状，降级判定会抛错并回退上游。这里直接验证正确形状可用。
  const { ctx } = fakeGateway();
  const textOnly = await isCurrentModelTextOnly(ctx.apiProxy, ctx.llm, "s1");
  assert.equal(textOnly, true);
  const vision = await isCurrentModelTextOnly(ctx.apiProxy, { resolveModelInfo: async () => ({ inputModalities: ["text", "image"] }) }, "s1");
  assert.equal(vision, false);
});

test("无图片的 prompt 原样透传", async () => {
  const { sessions, calls } = fakeGateway();
  await sessions.prompt(promptRequest([textPart]));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].payload.content, [textPart]);
});

test("视觉模型 + 图片：原样透传不降级", async () => {
  const { sessions, calls } = fakeGateway({ inputModalities: ["text", "image"] });
  const request = promptRequest([imagePart("shot.png")]);
  await sessions.prompt(request);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.content[0].type, "image");
});

test("模型查询失败：原样透传", async () => {
  const { sessions, calls } = fakeGateway({ modelsError: true });
  await sessions.prompt(promptRequest([imagePart("shot.png")]));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.content[0].type, "image");
});

test("图片校验/持久化失败：回退上游原逻辑（不降级）", async () => {
  const { ctx, sessions, calls } = fakeGateway();
  ctx.attachments.validateImage = async () => {
    throw new Error("boom");
  };
  const request = promptRequest([imagePart("shot.png")]);
  await sessions.prompt(request);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.content[0].type, "image", "失败时应把原内容交给上游");
});

test("attachmentObjectPath 按 sha256 前缀分桶", () => {
  assert.equal(
    attachmentObjectPath(`sha256:${SHA}`, "C:/dsh"),
    path.join("C:/dsh", "attachments", "v1", "objects", "aa", SHA)
  );
  assert.equal(
    attachmentObjectPath(SHA, "C:/dsh"),
    path.join("C:/dsh", "attachments", "v1", "objects", "aa", SHA)
  );
});

test("imagePointerText 包含名称、尺寸与对象路径", () => {
  const text = imagePointerText(
    { attachmentId: `sha256:${SHA}`, mediaType: "image/png", bytes: 100, width: 640, height: 480, name: "地图.jpg" },
    "C:/dsh"
  );
  assert.match(text, /图片附件 地图\.jpg/);
  assert.match(text, /640x480 px、100 B/);
  assert.match(text, /objects\\aa\\a+/);
});

test("degradeImageContent 校验全部通过后才持久化，顺序保持", async () => {
  const saved = [];
  const ctx = {
    attachments: {
      imageLimits: { maxImagesPerMessage: 2, maxMessageImageBytes: 4096 },
      validateImage: async () => {},
      saveImage: async (input) => {
        saved.push(input.name ?? "(unnamed)");
        return {
          attachmentId: `sha256:${SHA}`,
          mediaType: input.mediaType,
          bytes: input.data.byteLength,
          width: 1,
          height: 1,
          ...input.name === undefined ? {} : { name: input.name },
        };
      },
    },
  };
  const blocks = await degradeImageContent(ctx, [textPart, imagePart("b.png"), imagePart("a.png")], "C:/dsh");
  assert.deepEqual(saved, ["b.png", "a.png"]);
  assert.deepEqual(blocks[0], textPart);
  assert.equal(blocks[1].type, "text");
  assert.equal(blocks[2].type, "text");
});

test("degradeImageContent 超限与非法 base64 抛错", async () => {
  const ctx = {
    attachments: {
      imageLimits: { maxImagesPerMessage: 1, maxMessageImageBytes: 4096 },
      validateImage: async () => {},
      saveImage: async () => {},
    },
  };
  await assert.rejects(degradeImageContent(ctx, [imagePart("a.png"), imagePart("b.png")], "C:/dsh"), /image count/);
  await assert.rejects(
    degradeImageContent(ctx, [{ type: "image", mediaType: "image/png", data: "not-base64!!" }], "C:/dsh"),
    /canonical base64/
  );
});

test("loadSkillDefinition 从素材加载技能（frontmatter 剥离、资源基准为目录）", () => {
  const skill = loadSkillDefinition();
  assert.equal(skill.name, "deepseek-prism");
  assert.match(skill.description, /VEP\/1/);
  assert.match(skill.content, /强制协议/);
  assert.doesNotMatch(skill.content, /^---/, "正文不应含 frontmatter");
  assert.equal(skill.resourceBase.kind, "directory");
  assert.ok(existsSync(path.join(skill.resourceBase.path, "scripts", "vision.mjs")), "素材目录应含 vision.mjs");
});

test("parseSkillFrontmatter 提取 name/description", () => {
  const raw = [
    "---",
    "name: deepseek-prism",
    "description: 识别图片用的技能",
    "---",
    "# 正文",
  ].join("\n");
  const parsed = parseSkillFrontmatter(raw);
  assert.equal(parsed.data.name, "deepseek-prism");
  assert.equal(parsed.data.description, "识别图片用的技能");
  assert.equal(parsed.body, "# 正文");
  assert.equal(parseSkillFrontmatter("no frontmatter"), undefined);
});

test("apply 通过 ctx.inject 注册技能（skill 服务可用时）", () => {
  const registered = [];
  const injections = [];
  const ctx = {
    logger: { info: () => {}, warn: () => {} },
    on: () => {},
    inject: (deps, cb) => { injections.push({ deps, cb }); },
    skills: {
      register: (skill) => {
        registered.push(skill);
        return () => {};
      },
    },
  };
  apply(ctx);
  const skillsEntry = injections.find((entry) => entry.deps.includes("skills"));
  assert.ok(skillsEntry, "应注册 skills 条件注入");
  skillsEntry.cb(ctx);
  assert.equal(registered.length, 1);
  const skill = registered[0];
  assert.equal(skill.name, "deepseek-prism");
  assert.match(skill.description, /VEP\/1/);
  assert.match(skill.content, /强制协议/);
  assert.deepEqual(skill.invocation, { modelInvocable: true, userInvocable: true });
  assert.equal(skill.source, "custom");
  assert.equal(skill.resourceBase.kind, "directory");
  assert.ok(existsSync(path.join(skill.resourceBase.path, "scripts", "vision.mjs")));
});

test("apply 不向任何用户技能根写入副本（无物化）", async () => {
  const injections = [];
  const ctx = {
    logger: { info: () => {}, warn: () => {} },
    on: () => {},
    inject: (deps, cb) => { injections.push({ deps, cb }); },
    skills: { register: () => () => {} },
  };
  apply(ctx);
  const skillsEntry = injections.find((entry) => entry.deps.includes("skills"));
  skillsEntry.cb(ctx);
  const fakeHome = await mkdtemp(path.join(os.tmpdir(), "dsh-plugin-home-"));
  const oldHome = process.env.DSH_HOME;
  process.env.DSH_HOME = fakeHome;
  try {
    assert.equal(existsSync(path.join(fakeHome, "skills", "deepseek-prism")), false, "apply 不应向技能根写副本");
  } finally {
    if (oldHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = oldHome;
    await rm(fakeHome, { recursive: true, force: true });
  }
});

function envCtx(section, keyValue) {
  return {
    get: (name) => name === "settings"
      ? { get: () => section }
      : name === "credentials"
        ? { resolve: async () => (keyValue === undefined ? undefined : { value: keyValue }) }
        : undefined,
    logger: { info: () => {}, warn: () => {} },
  };
}

const ENV_KEYS = ["SILICONFLOW_API_KEY", "CUSTOM_VISION_KEY", "VISION_PROVIDER", "VISION_MODEL", "VISION_REGION"];

async function withCleanEnv(run) {
  const saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("applyVisionEnvironment：凭据注入密钥变量，模型选择注入 VISION_*", async () => {
  await withCleanEnv(async () => {
    const result = await applyVisionEnvironment(envCtx({
      provider: "siliconflow",
      model: "glm-x",
      region: "global",
      apiKeyEnv: "SILICONFLOW_API_KEY",
    }, "sk-secret"));
    assert.equal(result.configured, true);
    assert.equal(process.env.SILICONFLOW_API_KEY, "sk-secret");
    assert.equal(process.env.VISION_PROVIDER, "siliconflow");
    assert.equal(process.env.VISION_MODEL, "glm-x");
    assert.equal(process.env.VISION_REGION, "global");
  });
});

test("applyVisionEnvironment：无凭据时 configured=false 且不设密钥变量", async () => {
  await withCleanEnv(async () => {
    const result = await applyVisionEnvironment(envCtx({ apiKeyEnv: "SILICONFLOW_API_KEY" }, undefined));
    assert.equal(result.configured, false);
    assert.equal(process.env.SILICONFLOW_API_KEY, undefined);
  });
});

test("applyVisionEnvironment：apiKeyEnv 缺省回退 SILICONFLOW_API_KEY，自定义引用按段取值", async () => {
  await withCleanEnv(async () => {
    const result = await applyVisionEnvironment(envCtx({ model: "m2" }, "sk-custom"));
    assert.equal(result.apiKeyEnv, "SILICONFLOW_API_KEY");
    assert.equal(process.env.SILICONFLOW_API_KEY, "sk-custom");
    const custom = await applyVisionEnvironment(envCtx({ apiKeyEnv: "CUSTOM_VISION_KEY" }, "sk-custom-2"));
    assert.equal(custom.apiKeyEnv, "CUSTOM_VISION_KEY");
    assert.equal(process.env.CUSTOM_VISION_KEY, "sk-custom-2");
    assert.equal(process.env.VISION_MODEL, "m2");
  });
});

test("applyVisionEnvironment：空 provider/model/region 不覆盖已有 env", async () => {
  await withCleanEnv(async () => {
    process.env.VISION_PROVIDER = "pre-set";
    await applyVisionEnvironment(envCtx({}, "k"));
    assert.equal(process.env.VISION_PROVIDER, "pre-set");
    assert.equal(process.env.VISION_MODEL, undefined);
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  attachmentObjectPath,
  degradeImageContent,
  imagePointerText,
  installPromptDegradation,
  materializeSkill,
  resolveSkillSource,
} from "../src/index.mjs";

const SHA = "a".repeat(64);

function fakeGateway({ inputModalities = ["text"], current = { provider: "deepseek", model: "deepseek-v4-flash" }, modelsError = false } = {}) {
  const calls = [];
  const original = async (request) => {
    calls.push(request);
    return { result: { ok: true, value: { accepted: true } } };
  };
  const sessions = {
    prompt: original,
    models: async () => {
      if (modelsError) return { result: { ok: false, error: { code: "session-not-found" } } };
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

test("materializeSkill：安装、版本戳跳过、force 重装、保留用户 .env", async () => {
  const src = resolveSkillSource();
  assert.ok(src, "技能素材源应可解析");
  const dest = await mkdtemp(path.join(os.tmpdir(), "dsh-plugin-test-"));
  try {
    const first = await materializeSkill({ src, dest, version: "0.4.0" });
    assert.equal(first.action, "install");
    assert.ok((await stat(path.join(dest, "SKILL.md"))).isFile(), "SKILL.md 应被物化");
    assert.equal(await readFile(path.join(dest, ".dsh-plugin-version"), "utf8"), "0.4.0");

    await writeFile(path.join(dest, ".env"), "SILICONFLOW_API_KEY=sk-user", "utf8");
    const before = (await stat(path.join(dest, ".env"))).mtimeMs;

    const second = await materializeSkill({ src, dest, version: "0.4.0" });
    assert.equal(second.action, "skip", "同版本应跳过");
    assert.equal(await readFile(path.join(dest, ".env"), "utf8"), "SILICONFLOW_API_KEY=sk-user", "用户 .env 不被触碰");

    const third = await materializeSkill({ src, dest, version: "0.4.1", force: true });
    assert.equal(third.action, "install");
    assert.equal(await readFile(path.join(dest, ".dsh-plugin-version"), "utf8"), "0.4.1");
    assert.equal(await readFile(path.join(dest, ".env"), "utf8"), "SILICONFLOW_API_KEY=sk-user", "强制重装仍保留 .env");
  } finally {
    await rm(dest, { recursive: true, force: true });
  }
});

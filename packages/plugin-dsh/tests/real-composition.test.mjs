/**
 * Real Cordis composition test for the mainline plugin: `apply` is mounted
 * through the real plugin machinery (`ctx.plugin`) — proving the conditional
 * `ctx.inject` waits resolve, the skill registers, the prompt wrapper installs
 * and restores, and disposal tears everything down.
 *
 * Requires the cordis dev link (`pnpm install`); run with:
 * node --test tests/real-composition.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { apply, SETTINGS_NAMESPACE, DEFAULT_API_KEY_REF } from "../src/index.mjs";

test("真实 Cordis 装配：注入等待、prompt 包装与 dispose 恢复", async () => {
  const ctx = new Context();
  const skills = [];
  ctx.provide("skills", {
    register: (skill) => {
      skills.push(skill);
      return () => {
        const index = skills.indexOf(skill);
        if (index >= 0) skills.splice(index, 1);
      };
    },
  });
  const originalPrompt = async (request) => ({ result: { ok: true, value: { accepted: true } } });
  const sessions = {
    prompt: originalPrompt,
    models: async () => ({
      result: { ok: true, value: { current: { provider: "deepseek", model: "deepseek-v4-flash" } } },
    }),
  };
  ctx.provide("apiProxy", { sessions });
  ctx.provide("attachments", {
    imageLimits: { maxImagesPerMessage: 2, maxMessageImageBytes: 4096 },
    validateImage: async () => {},
    saveImage: async (input) => ({
      attachmentId: `sha256:${"a".repeat(64)}`,
      mediaType: input.mediaType,
      bytes: input.data.byteLength,
      width: 12,
      height: 34,
    }),
  });
  ctx.provide("llm", { resolveModelInfo: async () => ({ inputModalities: ["text"] }) });
  ctx.provide("settings", { get: () => ({ degradeMode: "pointer" }) });

  const plugin = await ctx.plugin(apply, {});
  assert.equal(typeof plugin.dispose, "function");
  assert.equal(skills.length, 1, "技能必须注册到 ctx.skills");
  assert.equal(skills[0].name, "deepseek-prism");
  assert.ok(sessions.prompt !== originalPrompt, "prompt 必须被降级包装");
  const fallback = ctx.get("imageFallback");
  assert.ok(
    fallback !== undefined && typeof fallback.transformImages === "function",
    "必须提供官方 imageFallback 准入接缝",
  );

  // 图片 prompt + 纯文本模型 → 文本指针降级后交给上游。
  const result = await sessions.prompt({
    payload: {
      sessionId: "s1",
      content: [
        { type: "image", mediaType: "image/png", data: Buffer.from("x").toString("base64") },
        { type: "text", text: "看这张图" },
      ],
    },
  });
  assert.equal(result.result.ok, true);

  await plugin.dispose();
  assert.equal(skills.length, 0, "dispose 必须移除技能");
  assert.equal(sessions.prompt, originalPrompt, "dispose 必须恢复原始 prompt");
  assert.equal(ctx.get("imageFallback"), undefined, "dispose 必须移除 imageFallback 服务");
  await plugin.dispose(); // 幂等
});

test("他人已包装的 prompt：链式包装，dispose 恢复他人包装", async () => {
  const ctx = new Context();
  const originalPrompt = async () => ({ result: { ok: true, value: { accepted: true } } });
  const thirdParty = async (request) => originalPrompt(request);
  const sessions = { prompt: thirdParty };
  ctx.provide("apiProxy", { sessions });
  ctx.provide("attachments", {
    imageLimits: { maxImagesPerMessage: 2, maxMessageImageBytes: 4096 },
    validateImage: async () => {},
    saveImage: async () => ({}),
  });
  ctx.provide("llm", { resolveModelInfo: async () => ({ inputModalities: ["text"] }) });
  ctx.provide("settings", { get: () => ({}) });

  const plugin = await ctx.plugin(apply, {});
  assert.notEqual(sessions.prompt, thirdParty, "链式包装在他人包装之上");
  await plugin.dispose();
  assert.equal(sessions.prompt, thirdParty, "dispose 恢复他人包装（不丢失中间层）");
});

test("无 apiProxy 的 profile：插件照常挂载（条件注入跳过）", async () => {
  const ctx = new Context();
  ctx.provide("skills", { register: () => () => {} });
  const plugin = await ctx.plugin(apply, {});
  assert.equal(typeof plugin.dispose, "function");
  await plugin.dispose();
});

test("保存密钥（credentials 域）后即时注入 process.env：credentials/updated 重跑 applyVisionEnvironment", async () => {
  const ctx = new Context();
  const envBackup = {};
  for (const key of ["SILICONFLOW_API_KEY", "VISION_PROVIDER", "VISION_MODEL", "VISION_REGION"]) {
    envBackup[key] = process.env[key];
    delete process.env[key];
  }
  ctx.provide("skills", { register: () => () => {} });
  // 完整 settings 服务（installSettingsSection 需要 register），schema 用
  // schemastery 的 object schema；installPrismSettings 动态导入真实
  // dsh-settings / schemastery，与宿主装配路径一致。
  ctx.provide("settings", {
    get: () => resolvedSection,
    register: (ns, schema) => {
      const resolved = schema({});
      return {
        get: () => resolved,
        watch: () => () => {},
        update: async () => {},
        replace: async () => {},
      };
    },
  });
  const resolvedSection = {};
  const resolvedValues = new Map();
  ctx.provide("credentials", {
    resolve: async (ref) => ({ value: resolvedValues.get(ref) }),
  });

  const plugin = await ctx.plugin(apply, {});
  await new Promise((resolve) => setTimeout(resolve, 50)); // installPrismSettings 异步链

  assert.equal(process.env.SILICONFLOW_API_KEY, undefined, "未保存密钥时 env 不注入");
  resolvedValues.set("SILICONFLOW_API_KEY", "sk-saved-via-credentials");
  ctx.emit("credentials/updated", "SILICONFLOW_API_KEY");
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(process.env.SILICONFLOW_API_KEY, "sk-saved-via-credentials", "凭据更新后 env 立即注入");

  for (const [key, value] of Object.entries(envBackup)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await plugin.dispose();
});

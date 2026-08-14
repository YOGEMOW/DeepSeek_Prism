/**
 * @module @yogemow/deepseek-prism-dsh
 *
 * DeepSeek Prism for DeepSeek Harness（DSH）—— 一个零依赖 Cordis 插件：
 *
 * 1. **技能运行时注册**：把包内携带的 deepseek-prism 技能注册到 `ctx.skills`
 *    （运行时 provider，资源基准目录指向包内素材），不向 `$DSH_HOME/skills`
 *    写入任何副本 —— harness 上只有插件这一处技能来源，无重复安装。
 * 2. **纯文本模型图片降级**：包装 `ctx.apiProxy.sessions.prompt`——当会话当前模型
 *    不支持图片输入时，把上传的图片块降级为文本指针（描述 + 内容寻址对象路径），
 *    让模型可以按 deepseek-prism 技能指引对该文件运行视觉脚本；视觉模型不受影响。
 * 3. **设置界面集成**：注册 `deepseek-prism-dsh` 设置命名空间（视觉 Provider /
 *    模型 / 区域 / API 密钥引用），密钥经 `ctx.credentials` 存储（只写不回显）；
 *    设置生效后把密钥与模型选择注入 `process.env`（vision.mjs 子进程自动继承，
 *    无需任何 .env 文件）。
 *
 * 运行依赖：仅 Node 内置模块 + cordis 宿主注入；设置相关包（dsh-settings /
 * dsh-credentials / schemastery）为可选运行时解析（动态导入，缺失时降级跳过）。
 */

import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const name = "deepseek-prism-dsh";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 设置命名空间（web 设置页的插件卡片读写它）。 */
export const SETTINGS_NAMESPACE = "deepseek-prism-dsh";

/** 视觉 Provider 预设 id（与 vision.mjs PROVIDERS 一致；空串 = auto）。 */
export const VISION_PROVIDERS = [
  "", "siliconflow", "zhipu", "modelscope", "alibaba", "openrouter", "groq", "custom",
];

/** 默认凭据引用（环境变量名）。 */
export const DEFAULT_API_KEY_REF = "SILICONFLOW_API_KEY";

/** 降级模式：pointer = 文本指针（零补丁）；vep = VEP 转换（需最小补丁包，原图保留 + 用量显示）。 */
export const DEGRADE_MODES = ["pointer", "vep"];

/** VEP 模式的估算单价（¥/1M tokens，SiliconFlow zai-org/GLM-4.5V，2026-08）。 */
const PRICE_PER_M = { input: 0.14, output: 0.86 };

/** VEP 模式自适应预算档位（按图片字节选择，输出触顶自动升级重试）。 */
const BUDGET_TIERS = [
  { maxBytes: 256 * 1024, maxTokens: 512, timeoutMs: 45_000, maxChars: 520 },
  { maxBytes: 1024 * 1024, maxTokens: 1024, timeoutMs: 60_000, maxChars: 1024 },
  { maxBytes: Number.POSITIVE_INFINITY, maxTokens: 2048, timeoutMs: 90_000, maxChars: 2048 },
];
const TIER_EXHAUSTED_RATIO = 0.95;

/**
 * 技能素材源目录：优先包内 `skill/`（发布形态），
 * 回退仓库 `deepseek-prism/`（源码形态，便于本地开发与测试）。
 */
export function resolveSkillSource() {
  const bundled = path.join(PACKAGE_ROOT, "skill");
  if (existsSync(bundled)) return bundled;
  return path.resolve(PACKAGE_ROOT, "..", "..", "deepseek-prism");
}

/**
 * 最小化解析 SKILL.md 的 YAML frontmatter（name/description 单行取值即可）。
 * @returns {undefined | { data: Record<string, string>, body: string }}
 */
export function parseSkillFrontmatter(raw) {
  const lines = String(raw ?? "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return undefined;
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) return undefined;
  const data = {};
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z0-9-]+):\s*(.*)$/.exec(line);
    if (match) data[match[1]] = match[2];
  }
  return { data, body: lines.slice(end + 1).join("\n").trim() };
}

/**
 * 从包内素材加载技能定义（frontmatter 剥离后的正文 + 目录资源基准）。
 */
export function loadSkillDefinition() {
  const dir = resolveSkillSource();
  const raw = readFileSync(path.join(dir, "SKILL.md"), "utf8");
  const parsed = parseSkillFrontmatter(raw);
  if (parsed === undefined) {
    throw new Error(`invalid SKILL.md frontmatter at ${path.join(dir, "SKILL.md")}`);
  }
  const description = parsed.data.description;
  if (!description) {
    throw new Error(`SKILL.md description missing at ${path.join(dir, "SKILL.md")}`);
  }
  return {
    name: parsed.data.name ?? "deepseek-prism",
    description,
    content: parsed.body,
    resourceBase: { kind: "directory", path: dir },
    path: path.join(dir, "SKILL.md"),
  };
}

/**
 * 把技能注册进 `ctx.skills`（运行时 provider，模型可经 skill 工具加载，
 * 用户也可用 /deepseek-prism 手势直接调用）。失败仅告警，不阻断宿主。
 * @returns {undefined | (() => void)} 技能注册的 disposer（由注入回调收集，fiber dispose 时执行）。
 */
export function installSkillRegistration(ctx) {
  try {
    const skill = loadSkillDefinition();
    const disposer = ctx.skills.register({
      name: skill.name,
      description: skill.description,
      whenToUse: skill.whenToUse,
      content: skill.content,
      resourceBase: skill.resourceBase,
      path: skill.path,
      invocation: { modelInvocable: true, userInvocable: true },
      source: "custom",
    });
    ctx.logger?.info(`deepseek-prism-dsh: skill "${skill.name}" registered from ${skill.resourceBase.path}`);
    return disposer;
  } catch (error) {
    ctx.logger?.warn(`deepseek-prism-dsh: skill registration failed: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

/**
 * 本地附件 v1 内容寻址对象路径（与 `@deepseek-ai/dsh-attachment-local` 布局一致）：
 * `<home>/attachments/v1/objects/<sha256[:2]>/<sha256>`。
 */
export function attachmentObjectPath(attachmentId, home = dshHome()) {
  const id = String(attachmentId);
  const sha256 = id.startsWith("sha256:") ? id.slice("sha256:".length) : id;
  return path.join(home, "attachments", "v1", "objects", sha256.slice(0, 2), sha256);
}

/** DSH 配置根：`$DSH_HOME` 或 `~/.dsh`。 */
export function dshHome() {
  return process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
}

/** 纯文本模型场景下替代图片块的文本指针。 */
export function imagePointerText(ref, home = dshHome()) {
  const displayName = ref.name ?? "image";
  const filePath = attachmentObjectPath(ref.attachmentId, home);
  return `[图片附件 ${displayName}：${ref.width}x${ref.height} px、${ref.bytes} B，已保存到 ${filePath}。当前模型不支持直接读图（read_image 会失败）；如需分析图片内容，请通过 skill 工具加载可用的识图技能（如 deepseek-prism），并按技能指引对该文件运行视觉脚本。]`;
}

/**
 * 把一组 prompt 内容中的图片块降级为文本指针：先整体校验（数量/字节/base64），
 * 全部通过后逐个持久化附件并替换为文本块。校验或持久化失败时抛出，
 * 由调用方决定回退到上游原逻辑。
 */
export async function degradeImageContent(ctx, content, home = dshHome()) {
  const limits = ctx.attachments.imageLimits;
  const images = content.filter((part) => part?.type === "image");
  if (images.length > limits.maxImagesPerMessage) {
    throw new Error(`image count ${images.length} exceeds the limit ${limits.maxImagesPerMessage}`);
  }
  const decoded = images.map((part) => {
    const data = Buffer.from(String(part.data), "base64");
    if (data.toString("base64") !== String(part.data)) {
      throw new Error("image data is not canonical base64");
    }
    return { part, data };
  });
  const totalBytes = decoded.reduce((sum, item) => sum + item.data.byteLength, 0);
  if (totalBytes > limits.maxMessageImageBytes) {
    throw new Error(`image bytes ${totalBytes} exceed the limit ${limits.maxMessageImageBytes}`);
  }
  for (const item of decoded) {
    await ctx.attachments.validateImage({
      data: item.data,
      mediaType: item.part.mediaType,
      ...item.part.name === undefined ? {} : { name: item.part.name },
    });
  }
  const blocks = [];
  for (const part of content) {
    if (part?.type !== "image") {
      blocks.push({ type: "text", text: part.text });
      continue;
    }
    const item = decoded.find((candidate) => candidate.part === part);
    const ref = await ctx.attachments.saveImage({
      data: item.data,
      mediaType: part.mediaType,
      ...part.name === undefined ? {} : { name: part.name },
    });
    blocks.push({ type: "text", text: imagePointerText(ref, home) });
  }
  return blocks;
}

/**
 * 动态加载技能目录的 vision.mjs（与技能素材同源，零额外依赖）。
 * @returns {Promise<object>} vision.mjs 的导出。
 */
export async function loadVisionModule() {
  const dir = resolveSkillSource();
  const { pathToFileURL } = await import("node:url");
  return import(pathToFileURL(path.join(dir, "scripts", "vision.mjs")).href);
}

/** 归一化 callVision withMeta 返回的 usage 块。 */
function normalizeUsage(usage) {
  const u = usage ?? {};
  return {
    promptTokens: Number(u.prompt_tokens) || 0,
    completionTokens: Number(u.completion_tokens) || 0,
    totalTokens: Number(u.total_tokens) || 0,
  };
}

/**
 * 自适应预算识别：按图片字节选择档位，输出触顶（≥95%）自动升级一档重试，
 * 用量汇总所有轮次。
 * @returns {Promise<{ raw: string, usage: object, maxChars: number }>}
 */
async function recognizeWithBudget(vision, provider, prompt, imageDataUrls, bytes, withMeta) {
  let tierIndex = BUDGET_TIERS.findIndex((tier) => bytes <= tier.maxBytes);
  if (tierIndex < 0) tierIndex = BUDGET_TIERS.length - 1;
  let totals = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  for (;;) {
    const tier = BUDGET_TIERS[tierIndex];
    const result = await vision.callVision({
      provider,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      model: provider.defaultModel,
      prompt,
      imageDataUrls,
      maxTokens: tier.maxTokens,
      timeoutMs: tier.timeoutMs,
      withMeta: true,
    });
    const current = normalizeUsage(result.usage);
    totals = {
      promptTokens: totals.promptTokens + current.promptTokens,
      completionTokens: totals.completionTokens + current.completionTokens,
      totalTokens: totals.totalTokens + current.totalTokens,
    };
    if (current.completionTokens >= tier.maxTokens * TIER_EXHAUSTED_RATIO
      && tierIndex < BUDGET_TIERS.length - 1) {
      tierIndex += 1;
      continue;
    }
    return { raw: result.text, usage: totals, maxChars: tier.maxChars };
  }
}

/** 用量行（`【DeepSeek Prism 用量】tokens=…|balance=…|cost=…`），按开关与可用数据组装。 */
async function buildUsageLine(section, vision, totals) {
  const fields = [];
  if (section.showUsage !== false && totals.totalTokens > 0) {
    fields.push(`tokens=${totals.totalTokens}`);
  }
  if (section.showBalance === true) {
    const balance = await vision.queryBalance({
      baseUrl: providerOf(section, vision).baseUrl,
      apiKey: providerOf(section, vision).apiKey,
      providerId: "siliconflow",
    });
    if (balance !== null && balance > 0) fields.push(`balance=${balance}`);
    if (totals.totalTokens > 0) {
      const cost = (totals.promptTokens * PRICE_PER_M.input + totals.completionTokens * PRICE_PER_M.output) / 1_000_000;
      fields.push(`cost=${cost.toFixed(6)}`);
    }
  }
  return fields.length === 0 ? "" : `\n【DeepSeek Prism 用量】${fields.join("|")}`;
}

/** 由设置段构造 provider 描述（默认 siliconflow）。 */
function providerOf(section, vision) {
  const preset = (vision.PROVIDERS ?? []).find((p) => p.id === (section.provider || "siliconflow"))
    ?? (vision.PROVIDERS ?? [])[0];
  const baseUrl = section.baseUrl || preset.baseUrl;
  return {
    id: preset.id,
    name: preset.name,
    region: section.region || "cn",
    baseUrl,
    apiKey: process.env[section.apiKeyEnv || DEFAULT_API_KEY_REF] || "",
    defaultModel: section.model || preset.defaultModel,
    supportsDetail: true,
    priority: 0,
    notes: "",
  };
}

/**
 * VEP 转换降级（需最小补丁包）：图片经视觉流水线转为 VEP/2 文本块并保留
 * 原图附件块（消息内展示；补丁的序列化器对模型请求剥离图片）。意图基于
 * 用户附带文本推断（qa/grounding/diff 等八模式），双图 + 对比意图走单次
 * 多图 diff 调用；按 showUsage/showBalance 附加用量行。
 * @returns {Promise<Array>} 降级后的 content blocks。
 */
export async function degradeVepContent(ctx, content, section) {
  const vision = await loadVisionModule();
  const provider = providerOf(section, vision);
  if (provider.apiKey === "") {
    throw new Error("missing vision API key for vep degradation");
  }
  const textParts = content.filter((part) => part?.type === "text");
  const imageParts = content.filter((part) => part?.type === "image");
  const userText = textParts.map((part) => part.text).join("\n").trim();
  const question = userText === ""
    ? "完整精确提取图片中的全部文本内容，保留原文、顺序与换行；若图片没有文本则描述最重要的可见内容。"
    : `${"完整精确提取图片中的全部文本内容，保留原文、顺序与换行；若图片没有文本则描述最重要的可见内容。"} 用户附带说明：${userText}`;
  const mode = userText === "" ? vision.inferMode(question) : vision.inferMode(userText);
  const prompt = vision.buildPrompt(question, mode);

  // 原图附件：持久化并保留 image 块（补丁环境下请求侧剥离）。
  const saved = [];
  for (const part of imageParts) {
    const data = Buffer.from(String(part.data), "base64");
    const ref = await ctx.attachments.saveImage({
      data,
      mediaType: part.mediaType,
      ...part.name === undefined ? {} : { name: part.name },
    });
    saved.push({ part, ref });
  }

  const blocks = [];
  for (const part of content) {
    if (part?.type !== "image") {
      blocks.push({ type: "text", text: part.text });
    }
  }

  if (mode === "diff" && imageParts.length === 2) {
    const urls = saved.map((entry) => `data:${entry.part.mediaType};base64,${entry.part.data}`);
    const bytes = Math.max(...saved.map((entry) => Buffer.from(entry.part.data, "base64").byteLength));
    const { raw, usage, maxChars } = await recognizeWithBudget(vision, provider, prompt, urls, bytes);
    const result = vision.parseVisionResult(raw, provider.id, provider.defaultModel, mode, false);
    const name = (entry, index) => (entry.part.name && entry.part.name.trim() !== "" ? entry.part.name : `图 ${index + 1}`);
    const usageLine = await buildUsageLine(section, vision, usage);
    const text = `【DeepSeek Prism 对比：${name(saved[0], 1)} vs ${name(saved[1], 2)}】\n${vision.toVep(result, maxChars)}${usageLine}`;
    blocks.push({ type: "text", text });
    blocks.push(...saved.map((entry) => ({ type: "image", attachment: entry.ref })));
    return blocks;
  }

  const recognized = [];
  for (const entry of saved) {
    const imageDataUrl = `data:${entry.part.mediaType};base64,${entry.part.data}`;
    const bytes = Buffer.from(entry.part.data, "base64").byteLength;
    const { raw, usage, maxChars } = await recognizeWithBudget(
      vision, provider, prompt, [imageDataUrl], bytes
    );
    const result = vision.parseVisionResult(raw, provider.id, provider.defaultModel, mode, false);
    const label = entry.part.name && entry.part.name.trim() !== ""
      ? entry.part.name
      : `图片 ${imageParts.indexOf(entry.part) + 1}`;
    recognized.push({
      text: `【DeepSeek Prism 识别：${label}】\n${vision.toVep(result, maxChars)}`,
      usage,
    });
  }
  const totals = recognized.reduce(
    (sum, item) => ({
      promptTokens: sum.promptTokens + item.usage.promptTokens,
      completionTokens: sum.completionTokens + item.usage.completionTokens,
      totalTokens: sum.totalTokens + item.usage.totalTokens,
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  );
  const usageLine = await buildUsageLine(section, vision, totals);
  for (const item of recognized) {
    blocks.push({ type: "text", text: `${item.text}${usageLine}` });
  }
  blocks.push(...saved.map((entry) => ({ type: "image", attachment: entry.ref })));
  return blocks;
}

/**
 * 查询会话当前模型是否为纯文本（无 image 输入模态）。
 * 通过 `sessions.models` RPC（完整请求形状 { payload: { sessionId } }）读取
 * 当前选择，再经 `llm.resolveModelInfo` 判定。
 */
export async function isCurrentModelTextOnly(apiProxy, llm, sessionId) {
  const response = await apiProxy.sessions.models({ payload: { sessionId } });
  if (response?.result?.ok !== true) return false;
  const current = response.result.value?.current;
  if (current === undefined) return false;
  const info = await llm.resolveModelInfo(current.provider, current.model);
  return info.inputModalities !== undefined && !info.inputModalities.includes("image");
}

/**
 * 包装 `apiProxy.sessions.prompt`：图片 prompt + 纯文本模型 → 降级为文本指针
 * 或 VEP 转换；其余情况原样交给上游。链式安全：保存当前实现引用，dispose
 * 时仅在自己仍是最外层包装时恢复（他人包装不受影响）。
 * @returns {undefined | (() => void)} 恢复函数（由注入回调收集）。
 */
export function installPromptDegradation(ctx) {
  const sessions = ctx.apiProxy.sessions;
  const originalPrompt = sessions.prompt;
  if (typeof originalPrompt !== "function") return undefined;
  const callOriginal = (request) => originalPrompt.call(sessions, request);
  const wrapped = async (request) => {
    const content = request?.payload?.content;
    if (!Array.isArray(content) || !content.some((part) => part?.type === "image")) {
      return callOriginal(request);
    }
    let textOnly = false;
    try {
      textOnly = await isCurrentModelTextOnly(ctx.apiProxy, ctx.llm, request.payload.sessionId);
    } catch {
      textOnly = false;
    }
    if (!textOnly) return callOriginal(request);
    try {
      const section = ctx.get("settings")?.get(SETTINGS_NAMESPACE) ?? {};
      const mode = section.degradeMode === "vep" ? "vep" : "pointer";
      const degraded = mode === "vep"
        ? await degradeVepContent(ctx, content, section)
        : await degradeImageContent(ctx, content);
      return await callOriginal({ ...request, payload: { ...request.payload, content: degraded } });
    } catch {
      // 校验/持久化/识别失败交由上游原逻辑处理（含拒绝路径与错误响应）。
      return callOriginal(request);
    }
  };
  sessions.prompt = wrapped;
  return () => {
    if (sessions.prompt === wrapped) sessions.prompt = originalPrompt;
  };
}

/** Cordis 插件入口。 */
export function apply(ctx, config = {}) {
  // 技能注册：需要 skills 服务；失败仅告警。返回的 disposer 随 fiber 清理。
  ctx.inject(["skills"], (skillsCtx) => {
    return installSkillRegistration(skillsCtx);
  });
  // 网关相关服务用条件注入：无 apiProxy 的 profile（如 headless）跳过降级。
  ctx.inject(["apiProxy", "attachments", "llm"], (gatewayCtx) => {
    return installPromptDegradation(gatewayCtx);
  });
  // 设置命名空间 + 凭据/环境注入：需要 settings 服务；缺失或包不可解析时降级跳过。
  ctx.inject(["settings"], (settingsCtx) => {
    void installPrismSettings(settingsCtx, config)
      .then(() => applyVisionEnvironment(settingsCtx))
      .catch((error) => {
        settingsCtx.logger?.warn(
          `deepseek-prism-dsh: settings integration failed: ${error instanceof Error ? error.message : String(error)}`
        );
      });
  });
}

/**
 * 把当前设置段（provider/model/region/apiKeyEnv + 凭据密钥）应用到宿主进程环境，
 * 使模型运行 vision.mjs 的子进程（继承宿主 env）无需任何 .env 文件即可调用视觉 API。
 * @returns 应用结果摘要（不含密钥明文）。
 */
export async function applyVisionEnvironment(ctx) {
  const settings = ctx.get("settings");
  const credentials = ctx.get("credentials");
  const section = settings?.get(SETTINGS_NAMESPACE) ?? {};
  const apiKeyEnv = typeof section.apiKeyEnv === "string" && section.apiKeyEnv.length > 0
    ? section.apiKeyEnv
    : DEFAULT_API_KEY_REF;
  let configured = false;
  if (credentials !== undefined) {
    const resolved = await credentials.resolve(credentialRefOf(apiKeyEnv));
    if (resolved?.value !== undefined && String(resolved.value).length > 0) {
      process.env[apiKeyEnv] = String(resolved.value);
      configured = true;
    }
  }
  if (typeof section.provider === "string" && section.provider.length > 0) {
    process.env.VISION_PROVIDER = section.provider;
  }
  if (typeof section.model === "string" && section.model.length > 0) {
    process.env.VISION_MODEL = section.model;
  }
  if (typeof section.region === "string" && section.region.length > 0) {
    process.env.VISION_REGION = section.region;
  }
  return {
    apiKeyEnv,
    configured,
    provider: typeof section.provider === "string" ? section.provider : "",
    model: typeof section.model === "string" ? section.model : "",
    region: typeof section.region === "string" ? section.region : "",
  };
}

/** 避免顶层依赖 dsh-credentials：凭据引用就是一个字符串（这里仅作文档化别名）。 */
function credentialRefOf(ref) {
  return ref;
}

/**
 * 注册设置命名空间（需 dsh-settings / schemastery 可解析；动态导入，缺失时抛错由调用方降级）。
 */
export async function installPrismSettings(ctx, entryConfig = {}) {
  const { installSettingsSection, settingsNamespace } = await import("@deepseek-ai/dsh-settings");
  const { default: z } = await import("@deepseek-ai/schemastery");
  const schema = z.object({
    provider: z.string().default(""),
    model: z.string().default(""),
    region: z.string().default("cn"),
    apiKeyEnv: z.string().role("credential-ref").default(DEFAULT_API_KEY_REF),
    apiKey: z.string().role("secret"),
    degradeMode: z.string().default("pointer"),
    showUsage: z.boolean().default(true),
    showBalance: z.boolean().default(false),
  });
  let currentSource = () => entryConfig;
  installSettingsSection(ctx, settingsNamespace(SETTINGS_NAMESPACE), schema, entryConfig, {
    setSource: (source) => {
      currentSource = source;
    },
    onChange: () => {
      void applyVisionEnvironment(ctx);
    },
  });
  ctx.logger?.info(`deepseek-prism-dsh: settings namespace "${SETTINGS_NAMESPACE}" registered`);
  return currentSource;
}

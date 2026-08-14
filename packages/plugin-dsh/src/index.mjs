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
 *
 * 零依赖：仅使用 Node 内置模块；除 cordis 宿主注入外无任何运行时依赖。
 */

import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const name = "deepseek-prism-dsh";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
    ctx.on("dispose", disposer);
    ctx.logger?.info(`deepseek-prism-dsh: skill "${skill.name}" registered from ${skill.resourceBase.path}`);
  } catch (error) {
    ctx.logger?.warn(`deepseek-prism-dsh: skill registration failed: ${error instanceof Error ? error.message : String(error)}`);
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
 * 包装 `apiProxy.sessions.prompt`：图片 prompt + 纯文本模型 → 降级为文本指针；
 * 其余情况（无图片、视觉模型、判定失败、降级失败）原样交给上游。
 */
export function installPromptDegradation(ctx) {
  const sessions = ctx.apiProxy.sessions;
  const originalPrompt = sessions.prompt?.bind(sessions);
  if (typeof originalPrompt !== "function") return;
  const wrapped = async (request) => {
    const content = request?.payload?.content;
    if (!Array.isArray(content) || !content.some((part) => part?.type === "image")) {
      return originalPrompt(request);
    }
    let textOnly = false;
    try {
      textOnly = await isCurrentModelTextOnly(ctx.apiProxy, ctx.llm, request.payload.sessionId);
    } catch {
      textOnly = false;
    }
    if (!textOnly) return originalPrompt(request);
    try {
      const degraded = await degradeImageContent(ctx, content);
      return await originalPrompt({ ...request, payload: { ...request.payload, content: degraded } });
    } catch {
      // 校验/持久化失败交由上游原逻辑处理（含拒绝路径与错误响应）。
      return originalPrompt(request);
    }
  };
  sessions.prompt = wrapped;
  ctx.on("dispose", () => {
    if (sessions.prompt === wrapped) sessions.prompt = originalPrompt;
  });
}

/** Cordis 插件入口。 */
export function apply(ctx, config = {}) {
  // 技能注册：需要 skills 服务；失败仅告警。
  ctx.inject(["skills"], (skillsCtx) => {
    installSkillRegistration(skillsCtx);
  });
  // 网关相关服务用条件注入：无 apiProxy 的 profile（如 headless）跳过降级。
  ctx.inject(["apiProxy", "attachments", "llm"], (gatewayCtx) => {
    installPromptDegradation(gatewayCtx);
  });
}

export default apply;

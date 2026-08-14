#!/usr/bin/env node
/**
 * deepseek-prism-skill —— 把包内携带的 deepseek-prism 技能安装到 Codex 技能目录。
 *
 * 用法:
 *   npx @yogemow/deepseek-prism-skill [--dest <目录>] [--force] [--version] [--help]
 *
 * 默认目标: ~/.codex/skills/deepseek-prism
 * 密钥配置: 安装后在该目录创建 `.env`（SILICONFLOW_API_KEY=...），或设置同名环境变量。
 */
import { copyFile, cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE_DIR = path.join(PACKAGE_ROOT, "bundle");
const STAMP_FILE = ".codex-package-version";
const SKILL_DIR_NAME = "deepseek-prism";

function version() {
  return JSON.parse(readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8")).version ?? "0.0.0";
}

function parseArgs(argv) {
  const args = { dest: undefined, force: false, version: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (item === "--dest") args.dest = argv[++i];
    else if (item === "--force") args.force = true;
    else if (item === "--version") args.version = true;
    else if (item === "--help" || item === "-h") args.help = true;
    else {
      console.error(`未知参数: ${item}`);
      process.exitCode = 1;
      return args;
    }
  }
  return args;
}

async function install({ dest, force }) {
  const stamp = path.join(dest, STAMP_FILE);
  if (!force && existsSync(stamp) && readFileSync(stamp, "utf8").trim() === version()) {
    return "skip";
  }
  await mkdir(dest, { recursive: true });
  for (const entry of await readdir(BUNDLE_DIR, { withFileTypes: true })) {
    const from = path.join(BUNDLE_DIR, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await rm(to, { recursive: true, force: true });
      await cp(from, to, { recursive: true });
    } else {
      await copyFile(from, to);
    }
  }
  await writeFile(stamp, version(), "utf8");
  return "install";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`deepseek-prism-skill v${version()}

安装 deepseek-prism 技能到 Codex 技能目录。

用法:
  deepseek-prism-skill [--dest <目录>] [--force] [--version] [--help]

选项:
  --dest <目录>   技能安装目标目录（默认 ~/.codex/skills/${SKILL_DIR_NAME}）
  --force         忽略版本戳强制重装
  --version       输出版本号
  --help          显示本帮助`);
    return;
  }
  if (args.version) {
    console.log(version());
    return;
  }
  if (!existsSync(BUNDLE_DIR)) {
    console.error(`错误: 包内未找到技能素材目录 ${BUNDLE_DIR}（发布包应包含 bundle/）。`);
    process.exitCode = 1;
    return;
  }
  const dest = args.dest === undefined
    ? path.join(os.homedir(), ".codex", "skills", SKILL_DIR_NAME)
    : path.resolve(args.dest);
  try {
    const action = await install({ dest, force: args.force });
    console.log(
      action === "install"
        ? `deepseek-prism-skill v${version()} 已安装到 ${dest}`
        : `deepseek-prism-skill v${version()} 已是最新（${dest}，--force 可重装）`
    );
    console.log("密钥配置: 在该目录创建 .env（SILICONFLOW_API_KEY=...）或设置同名环境变量；验证: node \"<技能目录>/scripts/vision.mjs\" doctor");
  } catch (error) {
    console.error(`安装失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

main();

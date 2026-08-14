/**
 * prepack-skill —— 把仓库根 `deepseek-prism/` 技能素材复制进 Codex 包 `bundle/`。
 * 在 `npm pack`/`npm publish` 前自动执行（packages/skill 的 prepack 脚本）。
 */
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(repoRoot, "deepseek-prism");
const target = path.join(repoRoot, "packages", "skill", "bundle");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
console.log(`prepack-skill: ${source} -> ${target}`);

/**
 * prepack-plugin-dsh —— 把仓库根 `deepseek-prism/` 技能素材复制进 DSH 插件包 `skill/`。
 * 在 `npm pack`/`npm publish` 前自动执行（packages/plugin-dsh 的 prepack 脚本）。
 */
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(repoRoot, "deepseek-prism");
const target = path.join(repoRoot, "packages", "plugin-dsh", "skill");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
console.log(`prepack-plugin-dsh: ${source} -> ${target}`);

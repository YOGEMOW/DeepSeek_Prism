# AGENTS.md

## 项目约定（必须遵守）

1. 每次任务开始时：先读 `PROJECT.md`、`STATUS.md`、`DECISIONS.md`，再制定本次计划。
2. 任务完成时：更新 `STATUS.md`（已完成 / 进行中 / 待处理）。
3. 仅当形成新的长期技术决策时更新 `DECISIONS.md`（编号 Dn，含决策 / 原因 / 代价）。
4. 不要重写已经确认的历史记录；`CHANGELOG.md` 追加新条目。
5. 每次改动后运行：`node --test`（在 `deepseek-prism` 目录；Node 18+ 自动发现测试，避免个别 Node 版本不识别 `tests/` 目录参数的问题）；Skill 结构变更后运行 skill-creator 的 `quick_validate.py`。若 `quick_validate.py` 报 `ModuleNotFoundError: No module named 'yaml'`，先执行 `python -m pip install pyyaml`（新环境需用户授权网络）再重试，不要跳过该项校验。仓库根 `npm test` 会先构建 DSH 插件（`pnpm -C packages/plugin-dsh run build`）再同时运行技能与插件测试。
6. 不提交 `.env`、`.vision-cache/`、`dist/`、各包 `bundle/`/`skill/` 生成目录与密钥；远程推送前需用户确认。
7. 所有命令行操作统一使用 PowerShell 7（`pwsh`），包括测试、校验、复制安装与 git 操作；不使用 Windows PowerShell 5.1（`powershell.exe`）。
8. 发布流程（v0.4.0 起）：先更新 CHANGELOG/STATUS/DECISIONS，再运行 `node scripts/release.mjs <版本>`（构建插件 → 测试 → 同步版本 → npm pack（prepack 自动物化技能素材）→ 发布 GitHub Packages 双包），随后 git 提交、打 tag、`gh release create`（附 `dist/*.tgz`）。发布后按需同步：DSH 侧为「应用 `harness-patch/dsh-prism-harness.patch` + `dsh plugin add` 安装插件 + 重启」；Codex 侧同步技能副本。

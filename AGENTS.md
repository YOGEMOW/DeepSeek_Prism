# AGENTS.md

## 项目约定（必须遵守）

1. 每次任务开始时：先读 `PROJECT.md`、`STATUS.md`、`DECISIONS.md`，再制定本次计划。
2. 任务完成时：更新 `STATUS.md`（已完成 / 进行中 / 待处理）。
3. 仅当形成新的长期技术决策时更新 `DECISIONS.md`（编号 Dn，含决策 / 原因 / 代价）。
4. 不要重写已经确认的历史记录；`CHANGELOG.md` 追加新条目。
5. 每次改动后运行：`node --test`（在 `deepseek-prism` 目录；Node 18+ 自动发现测试，避免个别 Node 版本不识别 `tests/` 目录参数的问题）；Skill 结构变更后运行 skill-creator 的 `quick_validate.py`。若 `quick_validate.py` 报 `ModuleNotFoundError: No module named 'yaml'`，先执行 `python -m pip install pyyaml`（新环境需用户授权网络）再重试，不要跳过该项校验。
6. 不提交 `.env`、`.vision-cache/` 与密钥；远程推送前需用户确认。
7. 所有命令行操作统一使用 PowerShell 7（`pwsh`），包括测试、校验、复制安装与 git 操作；不使用 Windows PowerShell 5.1（`powershell.exe`）。

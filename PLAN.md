# PLAN.md

## 当前实施计划

### 已完成阶段

1. 方案设计：阅读三个参考仓库（agentic-ai-playground/16_DeepSeek_Read_Images、claude-vision-skill、free-vision-skill），确定触发协议、VEP/1 协议、多 Provider 降级与双模式输出。
2. 可行性验证：实测 SiliconFlow `zai-org/GLM-4.5V` 返回带 `<|begin_of_box|>` 包裹的 JSON 与 reasoning tokens。
3. 项目初始化：`git init`、六份文档、AGENTS.md、Skill 骨架（init_skill.py）。
4. Skill 实现与验证：SKILL.md / references / agents/openai.yaml / `scripts/vision.mjs` 完成；12 项单元与 mock 测试通过；quick_validate 通过；SiliconFlow 真实冒烟（error / ocr / ui / --detail）通过。
5. 安装与提交：Skill 复制安装到 `C:\Users\用户名\.codex\skills\deepseek-prism`；初始提交 `1a3f3d0`。
6. 更名：项目与 Skill 由 DeepSeek_Vision / deepseek-vision 更名为 DeepSeek_Prism / deepseek-prism（显示名 “DeepSeek Prism”）。
7. DSH 平台适配（2026-08-14，v0.3.0）：sharp 查找新增 DSH Web 运行时（`~/.dsh/profiles/node_modules/sharp`）与 DSH 用户根候选；SKILL.md / README / references/providers.md / PROJECT / PLAN / STATUS / DECISIONS / RISKS 双平台化；测试与 SiliconFlow 真实冒烟通过；发布 v0.3.0。

### 当前进行中

- 无（v0.3.0 已完成）。

### 后续待办

- Windows Keychain / Credential Manager 支持（评估）。
- sharp 自动裁剪大图白边以降低 token（可选）。
- 更多真实场景样例（错误日志、长表格、手机截图）。
- 本地视觉模型（Ollama）适配。

### 执行流程约定（每次改动）

1. 先读 PROJECT.md、STATUS.md、DECISIONS.md。
2. 按 PLAN 实施；完成后更新 STATUS.md；仅新长期决策写入 DECISIONS.md；不重写历史。
3. 运行 `node --test`（在 deepseek-prism 目录；Node 18+ 自动发现测试，兼容 Node 18/20/22/24）与 `python <skill-creator>/scripts/quick_validate.py deepseek-prism`（Windows 上需先 `$env:PYTHONUTF8='1'`，否则脚本按 GBK 读 UTF-8 文件报错）。若提示 `No module named 'yaml'`，先执行 `python -m pip install pyyaml` 再重试。
4. 更新 CHANGELOG.md 后提交。

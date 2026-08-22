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
8. 识图链路修复（2026-08-14，v0.3.1）：DSH 宿主图片降级（api-proxy 本地补丁）+ `vision.mjs` 魔数嗅探；发布 v0.3.1。
9. DSH 插件化与双包发布（2026-08-14，v0.4.0）：`packages/plugin-dsh`（`@yogemow/deepseek-prism-dsh`，素材物化 + prompt 降级包装）与 `packages/skill`（`@yogemow/deepseek-prism-skill`，一键安装 CLI）；`scripts/release.mjs` 双包发布编排；宿主补丁回退；发布 v0.4.0。
10. 主线切换（2026-08-15）：`dsh-plugin/` 完整 UI 集成路线（含 `harness-patch/dsh-prism-harness.patch`）提升为唯一主线并迁入 `packages/plugin-dsh`（`@yogemow/deepseek-prism-dsh`）；零补丁 B 架构废弃并归档至 `archive/plugin-dsh-zero-patch/`；`vision.mjs` 解析「包内 `skill/` 优先、仓库回退」，npm pack 分发可用；根 `npm test` 61 项通过；补丁重应用回 deepseek-harness checkout 并重建产物，插件装回 web profile，`deepseek-prism` 设置段恢复。
11. 自包含组合包路线（2026-08-16，v0.7.0 零补丁版）：`packages/plugin-dsh` 重构为 harness 零补丁（`sessions.prompt` 包装 + `imageFallback` 服务 + 技能运行时注册 + `PrismConfigError` + 设置卡片指引态 + 三通道配置）；deepseek-harness checkout 回退全部补丁并重建上游基线；重启实测通过（工具 / 技能 / 设置密钥 / 发图准入 VEP 降级）；发布 v0.7.0。
12. 0.8.0 统一版（2026-08-16）：`packages/plugin-dsh` 合并 0.6.x/0.7.x 为一条主线并适配 `deepseek-harness` 0.1.0-rc.8（上游原生图片支持）——新增 `deployMode`、`visionModelHandling`、`provider`（含 `deepseek` 视觉）三配置；`vision.mjs` 加 DeepSeek 视觉 Provider；harness 补丁针对新上游重建（删白名单 hunk、serialize 剥离改到 adapter `stripDisplayOnlyImages`、ui-conversation 折叠/进度卡片与 `sendingCount` 移植）；harness 侧 234 项测试、插件 29 项测试通过；deepseek-harness checkout 应用新补丁并重建。

### 当前进行中

- 0.8.0 统一版已实现并提交（插件 + 补丁 + 文档）；pending：重建 harness 已执行、`git tag v0.8.0` + GitHub Release、npmjs 发布（用户 2FA）、部署 profile 切 0.8.0 并重启验证。

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

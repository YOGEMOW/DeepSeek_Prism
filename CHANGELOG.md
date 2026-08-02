# CHANGELOG.md

## [未发布] 2026-08-02（v0.1.0 初始版本）

### Changed

- 项目与 Skill 更名：项目目录 `DeepSeek_Vision` → `DeepSeek_Prism`；Skill `deepseek-vision` → `deepseek-prism`；界面显示名改为 “DeepSeek Prism”；安装路径同步为 `C:\Users\YOGIMOV\.codex\skills\deepseek-prism`。历史条目保留原名。

### Added

- 项目文档：PROJECT / PLAN / STATUS / DECISIONS / RISKS / CHANGELOG + AGENTS.md（任务开始读 PROJECT/STATUS/DECISIONS，完成更新 STATUS）。
- Skill `deepseek-vision`：SKILL.md 强制触发协议（先读图 → 识别信号 → 调用脚本，禁止归咎用户）；VEP/1 紧凑证据输出；`--detail` 五模式分节报告（页面还原 / 问题定位 / 报错日志 / 文本表格 / 图表数据）。
- 脚本 `scripts/vision.mjs`：零依赖 Node CLI（see / providers / cache / doctor）；本地模式推断；多 Provider 预设与自动降级；SHA-256 本地缓存（TTL 24h / 1000 条）；盒子标记剥离与容错 JSON 解析。
- 配置：Provider 预设 SiliconFlow（zai-org/GLM-4.5V）/ 智谱 / ModelScope / 阿里 / OpenRouter / Groq；`.env` 与 `.vision-cache/` 入 gitignore。
- 测试：单元测试（模式推断、prompt、解析、VEP 压缩、缓存、降级顺序）+ mock 端到端（不消耗真实 API）。
- 示例：`examples/design-page.html`（由设计稿截图经 `--detail` UI 模式重建的社区论坛页面，验证像素级还原链路）。
- 示例：`examples/hand-drawn-mcp-page.html`（由手绘稿经 `--detail` UI 模式生成的 MCP 中央网关管理后台页面）。
- 示例：`examples/wireframe-page.html`（由手绘稿还原的 MCP 管理后台三界面线框页，验证手绘稿还原链路）。

### Fixed

- 紧凑 VEP 裁剪路径丢失 `m=` 模式字段（已补回）。
- Schema 中 `"c":0.0` 示例被 GLM-4.5V 照抄导致置信度失真（已移除示例值，模型按需省略或填写）。
- 修复 `detail` 变量声明顺序导致的 ReferenceError。
- A 模式（页面还原）扩展为 A1–A7：新增“图标与图案清单”，强制覆盖顶部导航栏、标签栏、左右侧边栏、主内容区、底部区域与浮动元素，并要求元素级精确色值；输出不完整时按 SKILL.md 指引分区补查（再次调用并合并证据）。
- `--detail` 默认输出预算提升至 4096 tokens（`DETAIL_MAX_TOKENS`）、默认超时提升至 150 秒（`DETAIL_TIMEOUT_MS`），避免长结构化报告被截断或超时。

### Build / Test

- `node --test tests/`（13 项全部通过）；skill-creator `quick_validate.py` 通过；SiliconFlow 真实冒烟与 4 次真实用户测试通过。

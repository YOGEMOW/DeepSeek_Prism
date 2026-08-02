# CHANGELOG.md

## [未发布] 2026-08-02（v0.1.0 初始版本）

### Added

- 项目文档：PROJECT / PLAN / STATUS / DECISIONS / RISKS / CHANGELOG + AGENTS.md（任务开始读 PROJECT/STATUS/DECISIONS，完成更新 STATUS）。
- Skill `deepseek-vision`：SKILL.md 强制触发协议（先读图 → 识别信号 → 调用脚本，禁止归咎用户）；VEP/1 紧凑证据输出；`--detail` 五模式分节报告（页面还原 / 问题定位 / 报错日志 / 文本表格 / 图表数据）。
- 脚本 `scripts/vision.mjs`：零依赖 Node CLI（see / providers / cache / doctor）；本地模式推断；多 Provider 预设与自动降级；SHA-256 本地缓存（TTL 24h / 1000 条）；盒子标记剥离与容错 JSON 解析。
- 配置：Provider 预设 SiliconFlow（zai-org/GLM-4.5V）/ 智谱 / ModelScope / 阿里 / OpenRouter / Groq；`.env` 与 `.vision-cache/` 入 gitignore。
- 测试：单元测试（模式推断、prompt、解析、VEP 压缩、缓存、降级顺序）+ mock 端到端（不消耗真实 API）。

### Fixed

- 紧凑 VEP 裁剪路径丢失 `m=` 模式字段（已补回）。
- Schema 中 `"c":0.0` 示例被 GLM-4.5V 照抄导致置信度失真（已移除示例值，模型按需省略或填写）。

### Build / Test

- `node --test tests/`（全部通过）；skill-creator `quick_validate.py` 通过；SiliconFlow 真实冒烟 2–3 类图片通过。

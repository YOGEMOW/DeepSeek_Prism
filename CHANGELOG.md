# CHANGELOG.md

## [0.2.0] 2026-08-05

### Added

- 输出策略自动分级：小图/简单任务保持 VEP/1（≤520 字符）；长内容任务（代码截图、长日志、文档、宽/高比 ≥ 2.5 的截图或问题命中长内容词）自动走 `--detail` 完整通道（默认 4096 token）。
- 超长内容自动续写：检测 `finish_reason=length` 或无自然结束标记（括号不平衡、尾随分隔符）时，以上一段结尾 200 字符为锚点再次调用，直到模型回复 `[完成]`/“没有更多内容”，合并输出；上限 8 次续写，仍不完整时末尾标注 `[截断]`。
- 新增 `--raw`（输出 cleanRaw 原文）与 `--full`（隐含 detail，输出 `{raw, parsed}` JSON 信封）；新增 `--compact` 强制紧凑 VEP/1。
- 图片宽高解析（PNG/JPEG/GIF/WebP/BMP + AVIF/TIFF/SVG 的 sharp metadata 回退）与内置 sharp 等比缩放：`VISION_RESIZE_TOOL=auto|sharp|skip`、`VISION_RESIZE_MAX`（默认 2048），自动查找 Codex 运行时自带 sharp（libvips），不依赖宿主安装 Python/Pillow；动画 GIF 缩放后保留全部帧，SVG 缩放后栅格化为 PNG。
- Provider `outputLimit` 感知：SiliconFlow/智谱/ModelScope/阿里 detail 上限 4096，OpenRouter/Groq 8192；`VISION_MAX_OUTPUT_TOKENS` 仍可覆盖。
- `VISION_DETAIL_AUTO=auto|always|never` 控制自动分级；`vepFieldBudget()` 字段预算随 `--max-chars` 缩放（答案 45%、文本 35%、摘要 25%）。
- `VISION_MAX_CONTINUATIONS` 可配置续写次数上限（默认 8，0 关闭续写）；`doctor` 输出 Node 版本与图片缩放后端状态，便于多端环境排查。

### Changed

- 字段截断与 VEP 压缩路径显式追加 `[截断]` 标记，不再静默停在单词中间。
- 缓存 key 增加输出通道参数（`vep`/`detail`），避免两种模式结果互串；旧缓存条目自然过期。
- 缓存条目增加版本号（CACHE_VERSION=2）：旧格式、过期、损坏条目在读取/淘汰/统计时自动清理。
- 修复 `--no-cache` 语义：不再在请求后写回缓存（原实现只删除后仍会重新写入）。
- `callVision` 新增 `withMeta` 选项返回 `{text, finishReason}`（默认仍返回字符串，导出接口兼容）。

### Fixed

- `--json` 与自动 detail 组合现在始终返回解析后的 JSON（原先返回 Markdown 原文）。
- 新增 `VISION_MAX_INPUT_PIXELS` 输入像素上限（默认 268MP）并恢复 sharp 解压防护，超大/恶意图片跳过缩放。
- `VISION_MAX_CONTINUATIONS=0` 现在真正关闭续写（原先 0 会回退默认 8）。
- `--full` 的 `parsed` 不再被 `extractJson` 的 1000 字符回退截断。
- AVIF/TIFF 缩放后统一转 PNG，避免部分视觉 API 拒绝 heif/tiff data URL。
- 续写段只剥离盒子标记、不再逐段剥离代码围栏，跨段代码块合并后围栏保留。
- 续写合并时折叠相邻重复围栏（` ```\n``` ` 合并为单个），避免段边界围栏重复。
- 首段仅返回 `[完成]` 时不再输出空串。
- `loadSharp` 失败后不再缓存失败状态，设置 `VISION_SHARP_PATH` 后可在同进程重试。
- usage 明确 `--detail`/`--full` 优先于 `--compact`。
- 极小 `--max-chars` 下字段预算不再超过总预算。
- 缓存写入改为临时文件 + rename 原子写，损坏/半写入条目自动按 miss 清理。

### Docs

- SKILL.md / README / references/modes.md / references/providers.md 同步自动分级、续写、`--raw`/`--full`、内置 sharp 缩放、`VISION_MAX_INPUT_PIXELS` 与 Provider 上限说明。
- AGENTS.md / PLAN.md / RISKS.md 补充 `quick_validate.py` 缺 PyYAML 时的安装指引（`python -m pip install pyyaml`），方便新环境 AI 及时安装。
- 项目约定：所有命令行操作统一使用 PowerShell 7（`pwsh`），不使用 Windows PowerShell 5.1；AGENTS.md 新增约定第 7 条，DECISIONS 记录 D12。
- AGENTS.md / PLAN.md / PROJECT.md 测试命令统一为 `node --test`，明确 Node >= 18（兼容 18/20/22/24），解决多用户不同 Node 版本下 `node --test tests/` 不识别目录参数的问题。
- DECISIONS 新增 D13（自动分级与续写）、D14（内置 sharp 缩放后端）；RISKS 记录范围外问题。

### Test

- `node --test` 42 项全部通过（含 sharp 缩放、GIF 动画帧保留、AVIF/TIFF/SVG 尺寸回退、旧缓存清理、`--no-cache` 不写缓存、重复围栏折叠，以及 10 项审计缺陷的失败→通过回归）。
- skill-creator `quick_validate.py` 通过（本机已安装 PyYAML 6.0.3）。
- SiliconFlow 真实冒烟通过：VEP / 自动 detail / `--full` / 大图缩放，以及真实续写（256 token 上限下 5 次 API 调用自动合并 4213 字符，无 `[截断]`）。

## [0.1.1] 2026-08-04

### Changed

- 文档中的本机路径统一为通用写法 `C:\Users\用户名\`（SKILL.md / PROJECT.md / PLAN.md / STATUS.md / DECISIONS.md / CHANGELOG.md），移除原真实用户名，便于公开分享与隐私保护；安装副本 SKILL.md 同步更新。

### Fixed

- 密钥查找优化：`vision.mjs` 现在依次检查环境变量、运行目录 `.env`、脚本目录（scripts/）`.env`、技能根目录 `.env`；`No credential` 报错会列出实际查找位置，`doctor` 命令新增 `.env 查找位置` 展示。
- 配置说明完善：`SKILL.md` 新增“密钥配置（必读）”一节；README 安装说明补充备选配置方式（用户环境变量 / 技能根目录 `.env`）。

## [0.1.0] 2026-08-02

### Added

- `LICENSE`：MIT License（Copyright (c) 2026 YOGEMOW）。
- `THIRD_PARTY_NOTICES.md`：free-vision-skill（MIT，© 2026 lora-sys）与 agentic-ai-playground（MIT，© 2025 Peng Qian）的版权声明及许可全文；claude-vision-skill（无 LICENSE）仅借鉴思路的说明。
- `README.md`：项目介绍、功能、安装、使用、环境变量、工作原理与许可证说明（不含真实 Key）。

### Changed

- 创建 GitHub 公开仓库 [YOGEMOW/DeepSeek_Prism](https://github.com/YOGEMOW/DeepSeek_Prism)（默认分支 `master`）并推送全部提交。
- README：`常用选项`长行改为逐项列表；环境变量表格拆分超长单元格（`VISION_API_KEY` / `VISION_BASE_URL` / `VISION_MODEL` 独立成行），提升窄窗口可读性，避免行内代码与中文括号混排换行。
- `THIRD_PARTY_NOTICES.md`：精简声明表格“借鉴范围”长单元格（移除超长行内代码与冗余描述），降低窄窗口挤压。

### Fixed

- 版权署名统一为 GitHub 账号 YOGEMOW：`LICENSE` / `README.md` / `CHANGELOG.md` / `STATUS.md` / `DECISIONS.md` 中的 `Copyright (c) 2026 YOGIMOV` 修正为 `YOGEMOW`；安装路径使用通用写法 `C:\Users\用户名\`（详见未发布条目）。

### Changed

- 项目与 Skill 更名：项目目录 `DeepSeek_Vision` → `DeepSeek_Prism`；Skill `deepseek-vision` → `deepseek-prism`；界面显示名改为 “DeepSeek Prism”；安装路径同步为 `C:\Users\用户名\.codex\skills\deepseek-prism`。历史条目保留原名。

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

# CHANGELOG.md

## [未发布] 2026-08-15

### Added

- 对话发图自动降级：插件宿主半新增可选 `imageFallback` 服务（`transformImages`）——harness 的 api-proxy `prompt` 准入在“当前模型不支持图片且该服务已挂载”时，把上传的图片 part 经视觉流水线转为 VEP/1 文本后再入会话（文本模型会话可直接上传图片并自动识图；未挂载时维持原 `MODEL_DOES_NOT_SUPPORT_IMAGES` 拒绝，转换失败返回 `IMAGE_FALLBACK_FAILED`）。
- 插件测试新增 2 项：`imageFallback` 图片→VEP/1 文本转换（多图编号 + 文件名标注、文本 part 原样保留）、无密钥指引错误（合计 9 项全部通过）。

### Changed

- harness（经用户确认的纯增量）：`packages/host/apiproxy/src/api-proxy.ts` 新增可选 `ImageFallbackService` 接缝（`ctx.get('imageFallback')`，约 20 行，无其他行为变化）；`api-proxy-models.spec.ts` 新增 3 项测试（未挂载保持拒绝 / 降级转换成功 / 转换失败错误码）；api-proxy 13 项测试、宿主 tsc 重建通过。
- `dsh-plugin/src/index.ts`：提取 `resolvePrismSettings` / `prismProvider` 共享配置解析，`prism_see` 与 `imageFallback` 复用同一密钥解析顺序（设置文档 → 环境变量 → 默认值），密钥缺失错误文案统一。
- 移除 DSH 技能安装（经用户确认）：插件形态已覆盖 DSH 上 skill 的全部功能，删除 `C:\Users\YOGIMOV\.dsh\skills\deepseek-prism`；插件运行时仅依赖仓库内 `deepseek-prism/scripts/vision.mjs`，不受影响；保留仓库源码与 Codex 安装副本（`C:\Users\YOGIMOV\.codex\skills\deepseek-prism`）。
- DSH 前端 VEP 折叠展示（harness 配套，经用户确认）：`ui-conversation` 用户气泡按文本约定（`【DeepSeek Prism 识别：<文件名>】\nVEP/1|…`）把证据折叠为“查看识别结果：<文件名>”链接按钮，点击展开完整 VEP（等宽小字、aria-expanded）；模型仍收到完整证据文本（后端无改动），普通文本与多图顺序不变，复制文本仍含完整 VEP；新增 `tests/message-vep.client.spec.tsx` 6 项，ui-conversation 全量 422 项测试通过；重建客户端 bundle 后刷新页面生效。
- DSH 识图进度执行链卡片（harness 配套，经用户确认）：`ui-conversation` ChatView 订阅输入机状态，发送含图片的消息时在消息流末尾渲染“DeepSeek Prism 图片识别”执行链卡片（ongoing 状态点 + “正在识别 N 张图片…”），消息落地后消失；纯本地展示不进会话日志；chat-view 新增 2 项用例，ui-conversation 全量 424 项测试通过。
- Prism 设置卡片仿照重做（经用户确认）：PrismCard 弃用 inline style，仿照 ui-settings-plugins 的 PluginCard/ValueField/SecretField 设计重做（可折叠头部、字段行、保存/放弃脚注，同一套 `--dsw-alias-*` token）；新增 `PrismCard.module.css` 与 CSS Modules 构建链（tsdown lightningcss 虚拟插件 + `src/css-modules.d.ts`，lightningcss link 加入 devDependencies）；插件 typecheck/构建/9 项测试通过。
- 识别完整提取 + 用量/余额显示 + 执行链修复（经用户确认）：`vision.mjs` ocr 模式改为完整精确提取全部文字（逐字保留不省略），新增 `callVisionWithUsage`（返回 usage）与 `queryBalance`（SiliconFlow `/v1/user/info`，失败静默）；插件降级识别默认完整提取，按设置附加 `【DeepSeek Prism 用量】tokens=…|balance=…|cost=…` 行（余额差为本次消耗），设置新增 `showUsage`（默认开）/`showBalance`（默认关）即时保存开关（PrismCard checkbox 行）；修复执行链卡片：`InputState` 新增 facade 层 `sendingCount`（普通发送走 default-sink、phase 始终 plain 且乐观提交即清空图片，原条件永不成立），hub.sink 置位、RPC settle 清除，ChatView 改订阅该字段；前端 VEP 折叠链接标题显示消耗 token、展开区显示余额与本次消耗；测试：插件 10 项、skill 18 项、ui-conversation 426 项全部通过；重建插件与 ui-conversation bundle，**需重启 web 服务使宿主侧生效**。
- 动态预算 + 消耗金额修复 + 文案清理（经用户确认）：降级识别预算按图片字节大小三档自适应（≤256KB→512 token、≤1MB→1024、更大→2048；输出触顶 ≥95% 时自动升级一档重试，用量汇总所有轮次），小图省 token、长文完整呈现；消耗金额改为 token × 内置单价估算（GLM-4.5V 输入 ¥0.14/M、输出 ¥0.86/M），替换在余额为 0 或精度不足时失效的余额差算法；设置文案删除“（SiliconFlow）”括注；插件测试 11 项（新增触顶升级用例）全部通过，重建 bundle。

## [未发布] 2026-08-14

### Added

- DSH 插件化：新增 `dsh-plugin/`（`@yogemow/dsh-prism` 组合包）——宿主插件注册 `deepseek-prism` 设置命名空间与模型可见的 `prism_see` 工具（复用 `deepseek-prism/scripts/vision.mjs` 流水线，运行时按仓库相对路径动态导入）；浏览器半注册 设置 → 插件 → 可配置 卡片（视觉 API 密钥 / 模型 / Base URL / 区域，密钥为 `role('secret')` 写后即掩）。安装：`pnpm dsh plugin --profile web add <repo>\dsh-plugin`。
- 插件测试：`dsh-plugin/tests/host.spec.mjs`（7 项：注册契约、无密钥指引错误、settings 密钥 + mock 视觉 API 端到端 VEP/1、detail 模式、环境变量回退、vision.mjs 定位、默认值一致性）。

### Changed

- 上一条 DSH 适配（技能形态）保留；插件形态与技能形态并存（`prism_see` 工具 + `skill` 工具均可触发识图）。
- harness 设置暴露（经用户确认的一行纯增量）：`packages/host/apiproxy/src/api-proxy.ts` 的 `WEB_SETTINGS_NAMESPACES` 追加 `'deepseek-prism'`，使设置界面可读写插件命名空间（harness 注释声明该处为插件设置暴露的唯一路径）；重建 `@deepseek-ai/dsh-host-apiproxy`；api-proxy-config 30 项既有测试、oxlint、tsc 均通过；其余 harness 行为与接口协议不受影响。

## [未发布] 2026-08-14

### Added

- DSH 适配：安装到 `C:\Users\用户名\.dsh\skills\deepseek-prism`（DeepSeek Harness 用户技能目录，`$DSH_HOME/skills`），由 harness 的 skill-filesystem / tool-skill 自动发现。
- 回归测试：`tests/skill-meta.test.mjs` 锁定 DSH 发现契约（frontmatter name/description 合法性、`resourceBase` 路径指引、`scripts/vision.mjs` 存在），防止 SKILL.md 回退为纯 Codex 写法。

### Changed

- `SKILL.md`：命令示例改用 `<资源目录>` 占位符并说明其解析方式（DSH 为 `skill` 工具返回的 `resourceBase.path`，默认 `C:\Users\用户名\.dsh\skills\deepseek-prism`；Codex 为 `C:\Users\用户名\.codex\skills\deepseek-prism`）；强制协议补充 DSH `read_image` 工具；新增 Windows 路径含空格/中文时加引号的说明；其余内容不变，Codex 安装副本仍兼容。

## [未发布] 2026-08-04

### Changed

- 项目约定：所有命令行操作统一使用 PowerShell 7（`pwsh`），不使用 Windows PowerShell 5.1；AGENTS.md 新增约定第 7 条，DECISIONS 记录 D12。

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

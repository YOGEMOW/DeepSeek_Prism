# CHANGELOG.md

## [0.6.1] 2026-08-15

### Fixed

- **DSH 部署「插件无法正常使用」排查与修复**（配置层，无需改代码）：用户报识图不可用，实测 `prism_see` 与图片准入降级均报 **SiliconFlow HTTP 401 "Token is invalid"**。逐项排查确认插件本体正常（`prism_see` 工具已注册、`deepseek-prism` 设置命名空间已注册、`imageFallback` 接缝在运行中 host 产物中生效、前端 VEP 折叠/进度卡片 bundle 已在线上服务）；根因是 `~/.dsh/settings.yaml` 的 `deepseek-prism.apiKey` 误存为 **DeepSeek API Key**（与 `DEEPSEEK_API_KEY` 完全相同），而视觉提供方是 SiliconFlow——插件密钥解析顺序为 `settings.apiKey` 优先于凭据库/环境变量，错误密钥遮蔽了 `.credentials.yaml` 中早已配置好的 `SILICONFLOW_API_KEY`。修复：经 settings 服务把 `deepseek-prism.apiKey` 更新为凭据库中的 SiliconFlow Key；`prism_see` 实测恢复（VEP/2 证据 + 用量行正常），准入降级同链路一并恢复。无需重启 harness。
- **动态插件宿主跨 realm 写入 settings 的坑（诊断附注）**：动态插件 `code.host` 运行在 `node:vm` 沙箱 realm，直接传对象字面量给宿主 settings 服务会被 `isPlainObject` 拒绝（跨 realm 原型不相等）；需用 `Object.create(null)` 构造补丁对象。

## [0.6.0] 2026-08-15

### Added

- **主线切换：harness 补丁完整路线取代零补丁 B 架构**（DSH 插件）：原 `dsh-plugin/` 技术储备整体迁入 `packages/plugin-dsh`（包名统一 `@yogemow/deepseek-prism-dsh`，版本对齐 0.5.0）——`prism_see` 工具 + `imageFallback` 接缝 + 设置卡片，依赖 `harness-patch/dsh-prism-harness.patch`（设置白名单 / 降级接缝 / 图片块剥离 / 前端 VEP 折叠与执行链进度卡片）；`vision.mjs` 解析改为「包内 `skill/` 优先、仓库回退」，npm pack 分发可用（prepack 自动物化素材）；`release.mjs` 与根 `npm test` 增加插件构建步骤并指向新测试路径。

### Changed

- **DSH 部署重新安装**（2026-08-15）：`dsh-prism-harness.patch` 应用回 deepseek-harness checkout 并重建 host/client 产物；插件经 `dsh plugin add` 装回 web profile；`deepseek-prism` 设置段恢复（含 API 密钥）。**需重启 harness 生效**。

### Deprecated

- **零补丁 B 架构主线废弃**：旧 `packages/plugin-dsh` 实现（`sessions.prompt` 包装 + 运行时技能注册 + pointer/vep 降级开关）归档至 `archive/plugin-dsh-zero-patch/`（不维护、不参与发布）；`harness-patch/dsh-prism-minimal.patch` 删除。

### Fixed

- **密钥未注入 process.env（Loader 环境下 `ctx.get` 读不到未声明服务）**（DSH 插件）：真实装配复现（`ctx.plugin`）一切正常，但 Loader 装载的插件 ctx 上 `ctx.get("credentials")` 可能返回 undefined——`applyVisionEnvironment` 只注入了 provider/model 而跳过密钥，vision.mjs 子进程无密钥。修复：`credentials` 改为**显式注入**（`installPrismSettings` 内 `ctx.inject(["credentials"])` 持有引用，凭据更新监听与 settings onChange 都带引用调用 `applyVisionEnvironment(ctx, credentialsRef)`）；`installImageFallback`/`installPromptDegradation` 的 settings 段读取同样改为显式注入（保证 vep 模式可读到降级模式）。**需重启 harness 生效**。
- **发图仍报「该模型不支持识图」**（DSH 插件）：api-proxy 的图片准入在纯文本模型 + 图片时要求 `imageFallback` 服务（harness 官方接缝），缺失即拒绝 `MODEL_DOES_NOT_SUPPORT_IMAGES`——旧实现只包装 `sessions.prompt`，未注册该接缝。现插件 `ctx.provide("imageFallback")`：准入层直接调用降级（文本指针 / VEP 转换），与 prompt 包装互为兜底；vep 模式对已降级内容（含证据标记）原样返回避免二次转换；降级失败保留原 content（序列化器剥离兜底）；模态判定失败/信息缺失时保守按纯文本降级。vep 保留的原图块改为携带原始 base64（api-proxy `durablePromptContent` 依赖 `data` 持久化生成附件引用）。**需重启 harness 生效**。
- **密钥保存后识图仍失败**（DSH 插件）：视觉密钥经 credentials 域保存，不触发 settings commit，`applyVisionEnvironment`（把密钥注入 `process.env` 供 vision.mjs 子进程继承）此前只在 settings 保存时运行——保存密钥后 env 从未注入，识图永远缺密钥。现插件监听 `credentials/updated`，凭据一更新即重跑环境注入（**需重启 harness 生效**；重启前变通：保存密钥后再保存任意设置字段即可触发注入）。
- **保存配置过慢**（DSH 设置卡片）：保存路径由「逐字段串行 RPC」改为「**一次 `settings.mutate` 批量提交全部字段**」——原来每个暂存字段各发一次 `settings.mutate` RPC，宿主端每次都要文件锁 + 全量写盘 + `document-updated` 广播（广播又触发所有设置 scope 的全量 `describe` 回读），8 个字段 ≈ 8 次串行完整往返；现在合并为单次 RPC（宿主单次排队/写盘/广播），并以 mutate 响应 view 的 `user` 层逐 op 验证落地，失败回读 `scope.load()` 恢复真实状态。`apiKey` 仍单独走 credentials 域（每保存最多 2 次 RPC）。新增 `tests/client-save.test.mjs`（9 项，覆盖批量合并、落地验证、冲突回读、apiKey 分支、无效草稿、reset unset）。

### Changed

- **DSH 设置卡片 UI 重做**（PluginCard 风格）：`packages/plugin-dsh` 的 client 卡片改为与 harness 其他插件卡片一致的可折叠卡片——头部（名称/描述/未保存徽章/chevron）+ 字段行（标签/已覆盖徽章/重置/提示，密钥密码框 + 已配置徽章）+ 保存/放弃脚注，全部改用 `--dsw-alias-*` 主题 token（原硬编码颜色移除）。
- **卡片文案逻辑修订**：密钥标注必填；降级模式提示区分零补丁/需补丁并警示未打补丁勿切换；用量/余额开关注明「仅 VEP 模式」；补展开/收起/未保存/只读文案（中英文）。

### Added

- **VEP 转换降级模式**（DSH 插件）：设置卡片新增「图片降级模式」（`pointer` 默认 / `vep`）与「显示识别消耗 token」「显示余额与消耗额」开关。`vep` 模式在准入时把图片直接转为 VEP/2 文本（八模式意图、自适应预算、双图 diff、用量行），并**保留原图附件**（消息内展示）；需 `harness-patch/dsh-prism-minimal.patch`（设置白名单一行 + llm-deepseek 图片剥离 + ui-conversation 折叠/执行链信号）。`pointer` 模式保持零补丁文本指针行为。
- 新增 `harness-patch/dsh-prism-minimal.patch`（主线最小补丁，官方基线验证可应用）与 `harness-patch/README.md`（两套补丁的定位说明）。

### Changed

- 决策：`dsh-plugin/`（旧「完整 UI 集成路线」）转为**技术储备**（参考实现，不参与发布，README 已标注）；主线为 `packages/plugin-dsh`（零补丁 B 架构 + 最小补丁包混合路线），Codex skills 支持（`packages/skill`）保持不变。
- DSH 插件测试扩展至 20 项（新增 vep 模式转换 / 无密钥回退用例）。

### Changed

- **合并两条开发线的 vision.mjs 能力**：在 v0.5.0（sharp 缩放 / 自动续写 / detail 分级）基础上移植 VEP/2 多模式增量——`inferMode` 扩展八种模式（新增 `qa` 带意图问答 / `grounding` 对象定位 / `diff` 双图对比，问句优先于界面模式）；`MODE_RULES` 强化完整事实提取（ocr 逐字全文、general 完整描述）；`buildPrompt` schema 新增 `g`（归一化 bounding box）/ `d`（像素差异区域）/ `art`（可交付产物如 UI 还原 HTML）；`parseVisionResult` / `toVep` 支持新字段并升级为 VEP/2（分级裁剪保留 g/d）；`callVision` 支持多图（`imageDataUrls`，diff 双图同请求）；新增 `queryBalance`（SiliconFlow `/v1/user/info`，失败静默）；`PROMPT_VERSION` 升 `dv-2`。
- SKILL.md 路径指引统一为 `<资源目录>` 并补充 DSH `resourceBase.path` 定位说明。
- 作废并行开发的 `dsh-plugin/`（TypeScript/tsdown 实现）与 `harness-patch/`：其降级机制（api-proxy `imageFallback` 接缝 + 前端折叠/执行链）与主线的文本指针降级方案不同，功能增量已并入 `vision.mjs` 主线；两目录自本版本起从仓库移除。

### Added

- `vision.mjs` 新增 `queryBalance` 导出与多图调用测试；`vision.test.mjs` 覆盖八模式推断、g/d/art 解析、VEP/2 裁剪、多图与余额查询。

## [0.5.0] 2026-08-14

### Added

- **设置界面集成**（DSH 插件）：注册 `deepseek-prism-dsh` 设置命名空间，在 harness 设置页「插件」配置页新增 DeepSeek Prism 卡片：
  - 视觉 **API 密钥**：`type=password` 只写控件，保存后仅显示「已配置」徽标（中间字符不展示、明文不随响应返回），经 `ctx.credentials` 写入凭据库；
  - **Provider / 模型 / 区域 / 密钥环境变量名（凭据引用）**：写入设置命名空间，保存后宿主把密钥与 `VISION_PROVIDER/VISION_MODEL/VISION_REGION` 注入 `process.env`，vision.mjs 子进程自动继承，无需任何 `.env` 文件。
  - 客户端为手写 `__ModuleLoader__` bundle（零构建，仅 `require('react')`），宿主侧设置/凭据包为可选动态导入（缺失时降级跳过）。
- harness 侧一行 allowlist 补丁：`WEB_SETTINGS_NAMESPACES` 加入 `deepseek-prism-dsh`（设置页可读写该命名空间）。

### Test

- 插件测试 18 项全部通过（新增：凭据/模型选择 env 注入、缺省引用回退、空值不覆盖）；全量 61 项通过。

## [0.4.1] 2026-08-14

### Fixed

- **插件图片降级从未生效的根因**：`isCurrentModelTextOnly` 以裸 `{ sessionId }` 调用 `sessions.models`，而真实 api-proxy 从 `request.payload` 解构（抛错被 catch 吞掉后回退上游，图片上传仍被拒绝）；已改为完整请求形状 `{ payload: { sessionId } }`，并新增形状回归测试。实测：插件生效后纯文本模型图片上传降级成功。

### Changed

- **消除 harness 上的重复安装**：插件不再把技能素材物化到 `$DSH_HOME/skills/deepseek-prism`（不再产生文件系统副本），改为启动时通过 `ctx.skills.register` **运行时注册**技能（资源基准目录指向包内素材）；已清理 `~/.dsh/skills/deepseek-prism` 旧副本与仓库内生成的 `packages/*/bundle|skill` 素材副本（发布时由 prepack 按需再生成）。

### Test

- 插件测试 14 项全部通过（新增：models RPC 形状回归、技能注册、无物化验证）；`node --test` 全量 57 项通过。

## [0.4.0] 2026-08-14

### Added

- **DSH 插件化**：新增 `packages/plugin-dsh`（`@yogemow/deepseek-prism-dsh`）——把此前对 DSH 宿主的 api-proxy 改造与技能整合为一个零依赖 Cordis 插件：
  - 技能物化：插件启动时把包内携带的 deepseek-prism 素材写入 `$DSH_HOME/skills/deepseek-prism`（版本戳防重复、保留用户 `.env`），由 skill-filesystem 自动发现；
  - 图片降级：包装 `apiProxy.sessions.prompt`，纯文本模型收到图片时降级为文本指针（描述 + 附件对象路径），视觉模型不受影响；不再需要修改/分叉 DSH 宿主源码。
  - 安装：`dsh plugin --profile web add @yogemow/deepseek-prism-dsh`（`dsh.bundle` 声明自动激活）。
- **双包发布**：新增 `packages/skill`（`@yogemow/deepseek-prism-skill`，Codex 用，含 `deepseek-prism-skill` 一键安装 CLI）与 `packages/plugin-dsh`（DSH 用）；发布编排脚本 `scripts/release.mjs`（测试 → 同步版本 → npm pack → 可选发布 GitHub Packages），prepack 自动把 `deepseek-prism/` 素材物化进各包；发布物（`dist/*.tgz`）作为 GitHub Release 资产分发（GitHub Packages 的 npm 发布需 classic PAT，脚本已支持 `NODE_AUTH_TOKEN`）。
- 根 `package.json`（private workspaces）与发布文档同步（README / STATUS / DECISIONS D16 / PLAN / AGENTS / RISKS）。

### Test

- `node --test` 53 项全部通过（vision 43 + 插件 10：降级透传矩阵、校验回退、对象路径、素材物化与版本戳）。
- skill-creator `quick_validate.py` 通过。

## [0.3.1] 2026-08-14

### Added

- 无扩展名图片文件支持：`readImageSource` 在扩展名未知时按魔数嗅探 MIME（PNG/JPEG/GIF/BMP/WebP/AVIF/TIFF/SVG），适配 DSH 附件对象路径等无扩展名来源。
- SKILL.md 补充 DSH 图片附件注入说明：纯文本模型场景下用户上传的图片会以 `[图片附件 …已保存到 <路径>]` 文本块进入会话，直接以该路径调用本 Skill 脚本即可。

### Fixed

- DSH 纯文本模型识图链路：DSH 宿主不再拒绝纯文本模型的图片上传，而是将图片落盘为内容寻址对象并注入路径文本；`vision.mjs` 可分析该无扩展名对象文件（配合魔数嗅探）。

### Test

- `node --test` 43 项全部通过（新增 `sniffImageMime` 8 类魔数用例）。

## [0.3.0] 2026-08-14

### Added

- DeepSeek Harness（DSH）平台适配：Skill 升级为 Codex / DSH 双平台通用。
  - `scripts/vision.mjs` sharp 自动查找新增 DSH Web 运行时候选（`~/.dsh/profiles/node_modules/sharp`，含 `DSH_HOME` 解析）与 DSH 用户根候选（`~/.dsh/node_modules/sharp`），DSH 环境大图缩放开箱即用。
  - SKILL.md：触发协议补充 DSH `read_image` 工具；命令章节给出 Codex / DSH 两套默认安装路径；sharp 查找顺序说明双平台（`VISION_SHARP_PATH` → Codex 运行时 → DSH profiles → 技能目录 node_modules）。
  - `doctor` 与缩放警告文案更新为双平台查找说明；references/providers.md 的 `VISION_SHARP_PATH` 行同步。
  - README：安装章节新增 DSH 安装方式（`C:\Users\用户名\.dsh\skills\deepseek-prism`）与宿主刷新说明；说明 `agents/openai.yaml` 仅 Codex 使用（DSH 忽略）。
  - PROJECT / PLAN / STATUS / DECISIONS / RISKS 同步双平台定位；DECISIONS 新增 D15。

### Test

- `node --test` 42 项全部通过（DSH sharp 环境实测：大图等比缩放、GIF 动画帧保留、AVIF/TIFF/SVG 尺寸回退、`VISION_SHARP_PATH` 重试）。
- skill-creator `quick_validate.py` 通过。
- SiliconFlow 真实冒烟通过：DSH 安装副本 `see --json` 正确提取报错截图（error 模式，含文件:行号）。

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

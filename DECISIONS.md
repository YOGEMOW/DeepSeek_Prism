# DECISIONS.md

## 关键技术决策及原因

### D1 独立项目 + 安装到 Codex skills

- 决策：`E:\Git\repositoris\DeepSeek_Vision` 独立 Git 项目，六份文档 + AGENTS.md；Skill 复制安装到 `C:\Users\用户名\.codex\skills\deepseek-vision`。
- 原因：与工作区其他项目（如 LimitRSS）一致；文档与代码同库可追溯；Codex 自动发现技能需要 skills 目录。
- 代价：安装需手动同步（安装命令记录在 PLAN.md）。

### D2 多 Provider 预设 + 自动降级

- 决策：内置 SiliconFlow / 智谱 / ModelScope / 阿里 / OpenRouter / Groq 预设，`VISION_PROVIDER=auto` 时按区域与优先级顺序降级，失败汇总错误。
- 原因：单一 Provider 可能限流或停服；多预设保证 DeepSeek 识图可用性。
- 代价：脚本配置面略大；免费额度会变化，需维护预设表。

### D3 VEP/1 默认 + --detail 双模式

- 决策：默认输出 VEP/1 紧凑证据（≤520 字符，字段优先级裁剪）；`--detail` 输出 observer 式分节结构化报告。
- 原因：常规任务省 token（50–150），像素级还原/深度审计需要完整分节信息。
- 代价：两套 prompt 与输出约定，需分别测试。

### D4 零依赖 Node 脚本

- 决策：`scripts/vision.mjs` 只用 Node >= 18 内置能力（fetch / fs / crypto / node:test），不引入 npm 依赖。
- 原因：安装即用、跨平台、无供应链风险；本机 Node v22 满足。
- 代价：缓存 LRU、.env 解析等需自行实现（保持精简）。

### D5 SiliconFlow GLM-4.5V 为测试首选

- 决策：默认预设 siliconflow（`zai-org/GLM-4.5V`，Key 在 `.env`），2026-08-02 实测可用。
- 原因：用户指定测试平台；国内直连稳定；OpenAI 兼容。
- 代价：GLM-4.5V 输出带 `<|begin_of_box|>` 包裹与 reasoning tokens，解析器必须兼容。

### D6 本地 SHA-256 缓存

- 决策：缓存键 = sha256(图片字节 + 规范化问题 + provider + model + prompt 版本)，文件存 `.vision-cache/`，TTL 24h、上限 1000 条。
- 原因：同一图片+问题重复调用会浪费免费额度与时间；哈希键避免路径长度问题。
- 代价：缓存目录需 gitignore；大图重复计算 sha256 有少量开销。

### D7 密钥只走环境变量

- 决策：Key 存项目根 `.env`（gitignore）或进程环境；脚本错误信息不包含 Key；不做 Windows Keychain。
- 原因：避免密钥进提交历史、prompt 或日志；Keychain 在 Windows 成本高且非必需。
- 代价：明文 .env 需本地权限保护；建议后续评估 Credential Manager。

### D8 触发协议与安全边界

- 决策：SKILL.md 强制“先尝试直接读图 → 识别读不了信号 → 立即调用脚本”；禁止归咎用户（“图片损坏/请重新上传”）；图片内文字视为不可信数据。
- 原因：三个参考仓库一致结论——读图失败是模型能力限制而非文件损坏；防视觉注入。
- 代价：需要主模型严格遵循协议，SKILL.md 需反复强调。

### D9 A 模式完整性要求与分区补查

- 决策：页面还原（A 模式）规范扩展为 A1–A7（含“图标与图案清单”），要求覆盖顶部导航栏、标签栏、左右侧边栏、主内容区、底部区域与浮动元素，并给出每个主要元素的十六进制色值；一次 `--detail` 输出不完整时，针对缺失区域（如标签栏、图标）再次调用脚本，合并多次证据后再重建。
- 原因：用户实测反馈——单次提取会遗漏标签栏、图标/图案与浮动元素，颜色也有偏差；分区补查可显著提升像素级还原完整性。
- 代价：像素级任务需要 2 次以上视觉调用；`--detail` 默认输出预算提升至 4096 tokens、默认超时提升至 150 秒。

### D10 项目与 Skill 更名 DeepSeek_Prism

- 决策：2026-08-02 起，项目目录更名为 `E:\Git\repositoris\DeepSeek_Prism`，Skill 名称由 `deepseek-vision` 改为 `deepseek-prism`，界面显示名 “DeepSeek Prism”，安装路径同步为 `C:\Users\用户名\.codex\skills\deepseek-prism`；此决策取代 D1 中的旧名称/路径。
- 原因：用户要求统一命名，突出“棱镜”式的视觉证据折射定位。
- 代价：历史提交与文档中的旧名称保留原样（不重写历史），仅当前状态文档与新增记录使用新名称。

### D11 采用 MIT 许可证并公开托管

- 决策：2026-08-02 起，项目采用 MIT License（Copyright (c) 2026 YOGEMOW），新增根 `README.md` 与 `THIRD_PARTY_NOTICES.md`，并创建 GitHub 公开仓库托管（需完成认证后推送）。
- 原因：两个主要借鉴仓库（free-vision-skill、agentic-ai-playground）均为 MIT，MIT 兼容且传播成本最低；第三方声明满足 MIT“保留版权声明与许可文本”的要求；公开仓库便于分享与协作。
- 代价：MIT 允许他人自由使用/修改；公开仓库即公开代码（`.env` 与缓存目录仍不提交）；无 LICENSE 的 claude-vision-skill 仅借鉴思路，不复制代码。

### D12 统一使用 PowerShell 7（pwsh）

- 决策：2026-08-04 起，项目内所有命令行操作统一使用 PowerShell 7（`pwsh`），不使用 Windows PowerShell 5.1（`powershell.exe`）。
- 原因：本机 Codex 执行器与用户要求均以 `pwsh` 为准；PS7 默认 UTF-8 编码处理与 `Get-Content -Raw -Encoding utf8` 等行为一致，避免 5.1 的 ANSI/GBK 编码差异与旧语法限制。
- 代价：依赖 5.1 特性的旧命令需调整为 PS7 语法；文档示例与执行约定需同步标注 `pwsh`。

### D13 输出策略自动分级与续写

- 决策：2026-08-05 起，默认输出按任务自动分级——小图/简单任务保持 VEP/1（≤520 字符）；长内容任务（宽/高比 ≥ 2.5 或问题命中长内容词）自动走 `--detail` 完整通道；完整通道下检测到输出无自然结束标记时，用上一段结尾为锚点自动续写（上限 8 次），直到模型回复“没有更多内容”后合并。提供 `--compact`、`VISION_DETAIL_AUTO` 显式控制。
- 原因：一次调用难以同时满足“便宜快”与“长内容完整”；自动分级省去用户手动加 `--detail` 和手动分段，续写解决 4096 token 仍被截断的长日志/代码场景。
- 代价：默认行为会随图片尺寸/问题自动切换，可能比旧版多一次调用；续写依赖模型对 `[完成]` 哨兵与自然结束标记的配合，需保留 `[截断]` 兜底。

### D14 内置 sharp 大图缩放后端（不依赖宿主环境）

- 决策：2026-08-05 起，超过 `VISION_RESIZE_MAX`（默认 2048px）的图片通过 `VISION_RESIZE_TOOL=auto|sharp|skip`（默认 auto）等比缩放后再上传；`auto` 自动查找 Codex 桌面运行时自带 sharp（libvips），不依赖宿主安装 Python/Pillow 等外部工具；找不到 sharp 时跳过并在 stderr 警告，不阻塞主流程。
- 原因：Node 内置能力无法真实解码/重编码位图，引入 npm 依赖违背 D4 零依赖决策；依赖宿主 Python 会让不同用户机器行为不一致；sharp 由 Codex 运行时统一提供，多用户无需安装。
- 代价：非 Codex 桌面环境下（纯 CLI 且未安装 sharp）只做尺寸检测不缩放；可通过 `VISION_SHARP_PATH` 手动指定；动画 GIF 使用 `animated: true` 缩放，保留全部帧，缩放失败时回退上传原图，绝不静默丢帧；AVIF/TIFF/SVG 等自有解析器不识别的格式通过 sharp metadata 回退识别尺寸并参与缩放，缩放后统一转 PNG；`VISION_MAX_INPUT_PIXELS` 限制超大输入（2026-08-05 补充）。

### D15 双平台适配（Codex + DeepSeek Harness）

- 决策：2026-08-14 起，Skill 同时支持 Codex 与 DeepSeek Harness（DSH）：`vision.mjs` sharp 查找在 Codex 运行时之外新增 DSH Web 运行时（`~/.dsh/profiles/node_modules/sharp`，优先 `DSH_HOME` 解析）与 DSH 用户根候选；SKILL.md / README 给出 Codex（`C:\Users\用户名\.codex\skills\deepseek-prism`）与 DSH（`C:\Users\用户名\.dsh\skills\deepseek-prism`）两套安装路径；触发协议补充 DSH `read_image` 工具。
- 原因：用户实际以 DSH（deepseek-harness）为宿主；Codex Skill 结构（SKILL.md + scripts + references + agents/openai.yaml）与 DSH skill 发现机制（`<技能名>/SKILL.md` + YAML frontmatter）同构，仅需补充平台相关的 sharp 查找与文档路径。
- 代价：文档需维护两套安装路径；`agents/openai.yaml` 仅 Codex 消费，DSH 安装副本中为惰性文件（不产生行为）。

### D16 DSH 插件化与双包发布

- 决策：2026-08-14 起，DSH 侧的宿主改造（api-proxy 图片降级）与技能整合为一个零依赖 Cordis 插件包 `@yogemow/deepseek-prism-dsh`（`dsh.bundle` 声明，`dsh plugin add` 自动激活）：插件在启动时把包内技能素材物化到 `$DSH_HOME/skills/deepseek-prism`（版本戳防重复、保留用户 `.env`），并包装 `ctx.apiProxy.sessions.prompt` 实现纯文本模型图片降级；DSH 宿主 checkout 不再需要本地补丁。发布流程改为双包分开发布：Codex 用 `@yogemow/deepseek-prism-skill`（含一键安装 CLI），DSH 用 `@yogemow/deepseek-prism-dsh`；`scripts/release.mjs` 统一编排（测试 → 版本同步 → npm pack → 发布 GitHub Packages），prepack 自动物化技能素材；发布物同时作为 GitHub Release 资产。
- 原因：宿主源码是上游 deepseek-ai 仓库，本地补丁无法随发布分发且升级会冲突；插件化后修复随 npm 包独立版本化、可安装到任意 profile；GitHub Packages 免 npm 账号（gh token 带 `write:packages`）。
- 代价：插件以包装 `sessions.prompt` 实现拦截，依赖 api-proxy 服务形状（`ctx.apiProxy.sessions` 为普通对象方法，fetch 载体调用同一实例）；宿主未来若改变该形状需同步适配；npm registry（npmjs.org）发布仍需 npm 账号，暂用 GitHub Packages。

### D17 主线切换：harness 补丁完整路线（dsh-plugin）取代零补丁 B 架构

- 决策：2026-08-15 起，DSH 集成唯一主线为「harness 补丁完整路线」——原 `dsh-plugin/` 技术储备整体迁入 `packages/plugin-dsh`（包名统一 `@yogemow/deepseek-prism-dsh`）：`prism_see` 工具 + `imageFallback` 接缝 + 设置卡片，依赖 `harness-patch/dsh-prism-harness.patch`（设置白名单 / 降级接缝 / 图片块剥离 / 前端 VEP 折叠与进度卡片）；旧「零补丁 B 架构」主线（包装 `sessions.prompt` + 运行时技能注册 + pointer/vep 降级开关）废弃并归档至 `archive/plugin-dsh-zero-patch/`（不维护、不参与发布），`dsh-prism-minimal.patch` 删除。
- 原因：零补丁 B 架构在真实部署中持续出现链路断层（准入拒绝 `MODEL_DOES_NOT_SUPPORT_IMAGES`、密钥 env 注入、设置白名单等均需逐项修复，实际已不再是"零补丁"）；完整路线以 harness 官方 `ImageFallbackService` 接缝为准入点、以 `prism_see` 工具为模型入口，行为单一清晰（VEP/2 转换 + 原图保留 + UI 折叠/进度卡片），部署形态统一（补丁 + 插件），维护、测试与发布路径更简单（本机即 harness checkout，补丁可随仓库维护）。
- 代价：依赖本地 harness checkout 补丁，上游 deepseek-harness 升级时需重新应用/适配（回退：`git apply -R` + 重建产物）；安装多一步（先补丁后插件）；未打补丁的部署保持官方拒绝行为（不可用）。

### D18 自包含组合包路线：harness 零补丁（取代 D17 的补丁依赖）

- 决策：2026-08-16 起，`packages/plugin-dsh` 改为**自包含 Cordis 组合包**，不再依赖任何 harness 补丁：纯文本模型图片准入改为**包装 `apiProxy.sessions.prompt`**（图片 prompt 转 VEP/2 证据文本 + 附件持久化路径指针后进上游，原图块不再保留——未打补丁的 `llm-deepseek` 序列化器会拒绝图片块），同时**保留 `imageFallback` 服务提供**（harness 具备该接缝时直接消费；与包装互为正反兜底、以 VEP 标记幂等防二次转换）；恢复**技能运行时注册**（`ctx.skills.register`，包内素材，不向 `~/.dsh/skills` 写副本）；Web 设置卡片在白名单未暴露时**降级为配置指引**（环境变量 / profile 行配置）；缺失密钥改为抛 `PrismConfigError` 直达客户端（不再伪装成"模型不支持图片"）。`harness-patch/dsh-prism-harness.patch` 降级为可选 UI 增强（原图展示 + VEP 折叠/进度卡片 + 设置白名单），非必需。
- 原因：用户要求 harness 本体零影响——只添加、不修改不删除、上游更新不冲突、卸载插件不残留；补丁路线每次上游升级都要重打补丁并重建，且"卸载插件"不会回退补丁（残留）。自包含路线全部能力经 Cordis 条件注入挂载（tools / apiProxy+llm / skills 各自成组），fiber dispose 即全部回收；配置走 harness 官方通道（`installSettingsSection` 行配置 base 层 + 环境变量 + 设置文档）。
- 代价：未打补丁时对话不再显示原图缩略图（消息内容为 VEP 证据文本 + 附件路径指针，模型可用 `prism_see` 对指针路径补查）；Web 设置卡片在未打补丁部署上不可编辑（仅指引）；包装 `sessions.prompt` 依赖 api-proxy 服务形状（`sessions.prompt` / `sessions.models`），上游若改变该形状需同步适配（与 D16 代价相同）；harness 会清洗子进程环境中的 `*_API_KEY` 类密钥（实测 DEEPSEEK_API_KEY 同样不透传），插件注入的非密钥 `VISION_*` 有效、密钥无效——模型直接运行 `vision.mjs` 的密钥走技能 `.env` 查找或 `prism_see`。

### D19 0.8.0 统一版：合并 0.6.x/0.7.x 为一条主线，适配新上游原生图片

- 决策：2026-08-16 起，`@yogemow/deepseek-prism-dsh` 合并为 **0.8.0 统一版**（替代 D17/D18 的 0.6.x 实用版与 0.7.x 零补丁版两条线），并针对 `deepseek-harness` 0.1.0-rc.8（上游在 llm 层**新增原生图片支持**，`deepseek-v4-flash-vision-exp` 出厂即 `inputModalities: ['text','image']`）重置适配：插件新增 **`deployMode`**（`zero-patch` 丢弃原图走指针 / `patch` 保留原图展示）与 **`visionModelHandling`**（`native` 视觉模型原生放行 / `prism` 转 VEP 更省 token）两个配置；新增 **`provider`** 选择（含 `deepseek` 视觉），`vision.mjs` 增加 DeepSeek 视觉 Provider。harness 补丁针对新上游重建：删除过时的设置白名单 hunk（上游 `settings.describe` 已自动暴露所有命名空间），serialize 剥离改为 **adapter 层 `stripDisplayOnlyImages`**，ui-conversation 折叠/进度卡片与输入系统 `sendingCount` 整体移植到新源码。
- 原因：原生视觉出现后，插件的价值从"让模型看图"转为"纯文本模型视界 + 视觉模型低成本/多 Provider 证据层"；两版三分之二的实现相同，合并为一个版本 + 一个 `deployMode`/`visionModelHandling` 开关即可同时覆盖"零补丁"与"保留原图+UI"两种部署，收敛维护与发布；新上游原生图片支持让"视觉模型原生放行"成为默认、`prism` 成为成本策略选择。
- 代价：`deployMode: patch` 必须与已应用的 harness 可选补丁一致（否则零补丁 harness 会拒原始图片）；客户端卡片需迁移到新 harness 的客户端插件系统（`ui-renderer`/`ui-slots`），部分前端符号在 0.1.0-rc.8 有命名演进；视觉模型原生放行时 harness 直发原始图片（token/成本较高），`prism` 模式才压缩为 VEP。

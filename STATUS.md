# STATUS.md

## 已完成

- 重启验证（2026-08-16）：零补丁链路实测通过——重启后 `prism_see` 工具已注册（新描述）、`deepseek-prism` 技能随包运行时注册进入技能目录、设置文档密钥正确解析（settings.yaml 的 `deepseek-prism.apiKey` 继续生效）；`prism_see` 真实冒烟返回正确 VEP/2 证据（SiliconFlow GLM-4.5V）；**对话发图实测通过**：上传 `屏幕截图 2022-06-14 002808.jpg`（434×471、49816 B）→ 未被 `MODEL_DOES_NOT_SUPPORT_IMAGES` 拒绝，自动转为附件路径指针（`~/.dsh/attachments/v1/objects/a3/a30015f2…`，与 attachment-local v1 布局一致）+ VEP/2 证据（`m=general`、`Cartoon FX Free…` 内容正确、`[截断]` 为字段预算标记、`tokens=1013` 为 512→1024 档自适应升级两轮合计）+ 用量行 `cost=0.000476`；宿主注入的非密钥 `VISION_*`（model/baseUrl/region）可到达模型子进程，harness 会清洗子进程环境中的 `*_API_KEY` 类密钥（实测 DEEPSEEK_API_KEY 也不透传），已修正插件 JSDoc/README 的注入说明（模型直接运行 vision.mjs 的密钥走技能 `.env` 或 prism_see）。
- 自包含组合包路线（2026-08-16，未发布）：DSH 插件重构为 harness 零补丁——纯文本模型图片准入改为包装 `apiProxy.sessions.prompt`（图片转 VEP/2 证据文本 + 附件路径指针，原图块不再保留）+ 保留 `imageFallback` 服务提供（幂等互兜）；恢复技能运行时注册（`ctx.skills.register`，包内素材，不向 `~/.dsh/skills` 写副本）；缺失密钥抛 `PrismConfigError` 直达客户端；Web 设置卡片在白名单未暴露时降级为配置指引（环境变量 / profile 行配置）；配置三通道（设置卡片 / 行配置 / 环境变量）；`apply` 按能力分组条件注入、全部注册挂 fiber（dispose 零残留）；插件测试重写 29 项、仓库全量 75 项全部通过；文档同步（README/harness-patch/PROJECT/STATUS/DECISIONS D18/CHANGELOG）。
- deepseek-harness checkout 回退补丁（2026-08-16）：15 处修改 revert 至上游、新增 spec 与遗留日志删除、host/client 产物重建为上游基线，`git status` 干净；harness 侧零残留、上游更新零冲突。
- 发布 v0.6.1（2026-08-15）：用户实测通过（图片准入降级链路恢复：`【DeepSeek Prism 识别：…】` VEP/2 证据 + 用量行正常，前端折叠 bundle 已在运行中服务器生效）；CHANGELOG 追加 0.6.1 条目（部署故障排查与跨 realm 写入附注）；双包（`@yogemow/deepseek-prism-dsh` / `@yogemow/deepseek-prism-skill`）发布 GitHub Packages 并作为 GitHub Release v0.6.1 资产。
- 主线混合路线落地（2026-08-15）：`packages/plugin-dsh` 新增 **VEP 转换降级模式**（设置开关：`pointer` 零补丁默认 / `vep` 需最小补丁）——vep 模式在准入时直接生成 VEP/2 文本（八模式意图、自适应预算、双图 diff、用量/余额开关）并保留原图附件；新增 `harness-patch/dsh-prism-minimal.patch`（设置白名单一行 + llm-deepseek 图片剥离 + ui-conversation 折叠/执行链信号，官方基线验证可应用）；`dsh-plugin/` 转为**技术储备**（参考实现，README 标注，不参与发布）；Codex skills（`packages/skill`）保持不变；测试：plugin-dsh 20 项（新增 vep 模式用例）、dsh-plugin 15 项、skill 49 项全部通过。
- VEP/2 多模式合并入主线（2026-08-15）：在 v0.5.0 基础上移植八模式意图（qa/grounding/diff 等）、完整事实提取规则、`g`/`d`/`art` 字段、多图 `callVision`、`queryBalance`、VEP/2 输出与 `dv-2` 提示版本；SKILL.md 统一 `<资源目录>` 并补充 resourceBase 说明。
- 三个参考仓库代码阅读与方案合成（observer 五模式 / vision.js 零依赖调用 / free-vision VEP + 降级 + 缓存）。
- SiliconFlow GLM-4.5V 接口实测（模型可用、盒子标记、reasoning tokens）。
- 项目目录、六份文档、AGENTS.md、.gitignore、.env 建立；Skill 骨架初始化。
- Skill 本体完成：SKILL.md（强制触发协议 + 查询模板 + 安全规则）、agents/openai.yaml、references/modes.md（五模式 detail 规范）、references/providers.md。
- `scripts/vision.mjs` 完成：see / providers / cache / doctor；VEP/1 编译与字符预算；本地模式推断；多 Provider 预设与自动降级；SHA-256 缓存（TTL 24h / 1000 条）；盒子标记剥离与容错 JSON 解析。
- 测试：12 项单元与 mock 端到端全部通过；skill-creator quick_validate 通过。
- 真实冒烟（SiliconFlow zai-org/GLM-4.5V）：error / ocr / ui 三类 VEP 输出正确，--detail 分节报告正确；修复紧凑 VEP 丢失 m 字段、模型照抄示例置信度两个问题。
- 安装：Skill 复制到 `C:\Users\用户名\.codex\skills\deepseek-prism`（含最终版 vision.mjs，不含 .env）。
- 提交：初始提交 `1a3f3d0`（17 文件；`.env` 与 `.vision-cache/` 未被跟踪）；临时克隆目录已清理。
- 首次真实用户测试（2026-08-02）：解释用户提供的 Unity Asset Store 截图，`--detail` 模式正确输出资源详情页的概述、对象、文本与数值。
- 第二次真实用户测试（2026-08-02）：基于 LSP 诊断截图给出解决方案；`--detail` 正确提取 Pyright reportMissingImports 诊断（auth.py 第 4 行 fastapi 导入失败）。
- 第三次真实用户测试（2026-08-02）：图表模式解读 Revenue/Earnings Trend 柱线复合图（3Q25–3Q26），正确提取各季度 Revenue 与 Adj EPS 数值及趋势。
- 第四次真实用户测试（2026-08-02）：设计稿截图 → HTML 页面重建（`examples/design-page.html`，三栏社区论坛）；发现并修复 `--detail` 输出被 512 token 截断的问题（默认提升至 2048）。
- 第五轮迭代（2026-08-02）：按用户反馈补强 A 模式（A1–A7 图标/图案/标签栏/元素级色值 + 分区补查策略），`--detail` 预算提升至 4096 tokens、超时提升至 150 秒；重新提取设计稿（完整 A1–A7 + 标签栏/图标补查，确认无底部标签栏、含右下角粉色浮动角色）并重建 `examples/design-page.html`（内联 SVG 图标、次级标签栏、浮动角色占位）。
- 第六次真实用户测试（2026-08-02）：手绘稿 → HTML 页面生成（`examples/hand-drawn-mcp-page.html`）；UI 模式正确解读三块手绘界面（MCP 中央网关 API Key 表格 / MCP 权限服务配置表单 / 从 JSON 导入）并转为完整管理后台页面。
- 第七次真实用户测试（2026-08-02）：图片描述（十万个为什么/数学1-1.png）；识别为黑白线描插图——戴高顶礼帽人物、木箱与带指针的秤，无文字。
- 更名（2026-08-02）：项目目录 DeepSeek_Vision → DeepSeek_Prism；Skill deepseek-vision → deepseek-prism（显示名 “DeepSeek Prism”）；文档、脚本、安装副本同步更新。
- 第六次真实用户测试（2026-08-02）：手绘稿 → HTML 页面还原（`examples/wireframe-page.html`，三个线框界面：MCP中央网关 / MCP权限 / 从JSON导入；黑白线框风格 + 手写文字 + 图标清单）。
- 开源合规（2026-08-02）：新增 `LICENSE`（MIT，© 2026 YOGEMOW）、`THIRD_PARTY_NOTICES.md`（free-vision-skill / agentic-ai-playground 的 MIT 声明与许可全文，claude-vision-skill 无 LICENSE 仅借鉴思路）、`README.md`；提交 `0093201`。
- 公开托管（2026-08-02）：GitHub 公开仓库 [YOGEMOW/DeepSeek_Prism](https://github.com/YOGEMOW/DeepSeek_Prism) 创建并推送成功（默认分支 `master`，remote `origin`；`.env` 与 `.vision-cache/` 未入库）。
- README 排版优化（2026-08-02）：针对窄窗口下“常用选项”长行与表格超长单元格换行错位，改为逐项列表，并将 `VISION_API_KEY / VISION_BASE_URL / VISION_MODEL` 拆分为独立表格行；GitHub 渲染经 HTML 校验正常。
- 其余区域检查（2026-08-02）：README 功能/工作原理/文档/安全等区域均为短行，无同类风险；`THIRD_PARTY_NOTICES.md` 声明表格“借鉴范围”长单元格已精简；GitHub 渲染 HTML 复核通过（常用选项列表化、环境变量表格拆分均正常）。
- 发布 v0.1.0（2026-08-02）：GitHub Release `v0.1.0` 创建并推送 tag（CHANGELOG 合并为单一 0.1.0 条目）。
- 版权署名排查（2026-08-02）：全仓库扫描 YOGIMOV/YOGEMOW——5 处版权署名修正为 `YOGEMOW`（LICENSE/README/CHANGELOG/STATUS/DECISIONS）；Release 说明同步更新。
- 本机路径通用化（2026-08-02）：全部文档中的用户目录路径统一为 `C:\Users\用户名\`（SKILL.md / PROJECT.md / PLAN.md / STATUS.md / DECISIONS.md / CHANGELOG.md），移除原真实用户名，安装副本同步。
- 约定更新（2026-08-04）：AGENTS.md 新增“统一使用 PowerShell 7（pwsh）”约定（第 7 条）；DECISIONS 记录 D12；CHANGELOG 追加未发布条目。
- 发布 v0.1.1（2026-08-04）：密钥查找扩展（环境变量 / 运行目录 / 脚本目录 / 技能根目录 `.env`）；`No credential` 报错与 `doctor` 命令列出 `.env` 查找位置；SKILL.md 新增“密钥配置（必读）”并同步 README 安装说明；CHANGELOG 合并 0.1.1；GitHub Release `v0.1.1` 创建并推送 tag。
- 输出策略自动分级与续写（2026-08-05，随 v0.2.0 发布）：小图/简单任务保持 VEP/1；长内容自动走 `--detail` 完整通道；超长自动续写合并（`VISION_MAX_CONTINUATIONS` 可调，默认 8，合并时折叠重复围栏）；新增 `--raw` / `--full` / `--compact` 与 `VISION_DETAIL_AUTO`；字段预算随 `--max-chars` 缩放并带 `[截断]` 标记；图片宽高解析（含 AVIF/TIFF/SVG 的 sharp metadata 回退）与内置 sharp 等比缩放（不依赖宿主环境，动画 GIF 保留全部帧，AVIF/TIFF/SVG 统一转 PNG，`VISION_MAX_INPUT_PIXELS` 防超大输入）；Provider `outputLimit` 感知（OpenRouter/Groq 8192）；缓存 key 按输出通道隔离，旧格式条目自动清理，缓存原子写，`--no-cache` 不再写缓存；测试命令统一为 `node --test` 兼容 Node 18/20/22/24；`doctor` 输出 Node 版本与缩放后端状态；审计 11 项缺陷全部修复并补回归测试；测试扩至 42 项全部通过；skill-creator quick_validate 通过（PyYAML 6.0.3）；SiliconFlow 真实冒烟通过（VEP / 自动 detail / --full / 大图缩放 / 256 token 强制截断下 5 次调用真实续写合并）。
- 发布 v0.2.0（2026-08-05）：自动分级与续写、`--raw`/`--full`/`--compact`、字段预算缩放与截断标记、内置 sharp 缩放（AVIF/TIFF/SVG 回退转 PNG、像素上限）、Provider `outputLimit`、缓存清理与原子写、Node 多版本兼容、11 项审计缺陷修复；42 项测试与 quick_validate 通过；真实冒烟通过；已同步安装副本并推送 GitHub Release。
- DSH 平台适配（2026-08-14，随 v0.3.0 发布）：Skill 升级为 Codex / DeepSeek Harness 双平台通用——`vision.mjs` sharp 查找新增 DSH Web 运行时（`~/.dsh/profiles/node_modules/sharp`，含 `DSH_HOME` 解析）与 DSH 用户根候选；SKILL.md 触发协议补充 DSH `read_image` 工具并给出两套安装路径；README / references/providers.md / PROJECT / PLAN / RISKS 同步双平台说明；DECISIONS 记录 D15；已同步 DSH 安装副本（`C:\Users\用户名\.dsh\skills\deepseek-prism`，含 `.env` 密钥配置）。
- 发布 v0.3.0（2026-08-14）：DSH 双平台适配；42 项测试与 quick_validate 通过；SiliconFlow 真实冒烟通过；GitHub Release `v0.3.0` 创建并推送 tag。
- 识图链路修复（2026-08-14，随 v0.3.1 发布）：定位 DSH 纯文本模型无法识图的根因——DSH 宿主在图片上传时直接拒绝纯文本模型（`MODEL_DOES_NOT_SUPPORT_IMAGES`），图片从未进入会话；已在 DSH 宿主（deepseek-harness）实现图片附件降级：纯文本模型收到图片时改为注入 `[图片附件 …已保存到 <路径>]` 文本块（路径为附件内容寻址对象）；`vision.mjs` 新增无扩展名魔数嗅探（PNG/JPEG/GIF/BMP/WebP/AVIF/TIFF/SVG）；43 项测试通过；DSH 宿主 api-proxy 375 项测试通过；发布 v0.3.1。
- DSH 插件化与双包发布（2026-08-14，随 v0.4.0 发布）：新增 `packages/plugin-dsh`（`@yogemow/deepseek-prism-dsh`，零依赖 Cordis 插件）——启动时把技能素材物化到 `$DSH_HOME/skills/deepseek-prism`（版本戳防重复、保留 `.env`），并包装 `apiProxy.sessions.prompt` 实现纯文本模型图片降级；DSH 宿主 checkout 回退本地补丁（保持与上游一致）。新增 `packages/skill`（`@yogemow/deepseek-prism-skill`，Codex 用，含一键安装 CLI）。发布编排 `scripts/release.mjs`（测试 → 版本同步 → pack → GitHub Packages 发布），prepack 自动物化素材；53 项测试与 quick_validate 通过；双包已发布 GitHub Packages 并作为 GitHub Release v0.4.0 资产。
- 识图链路修复与去重复（2026-08-14，随 v0.4.1 发布）：API 实测定位「重启后无法识图」根因——插件 `isCurrentModelTextOnly` 以裸 `{ sessionId }` 调用 `sessions.models`，真实实现从 `request.payload` 解构导致抛错回退上游（图片上传仍被 `MODEL_DOES_NOT_SUPPORT_IMAGES` 拒绝）；已改为完整请求形状并加回归测试（实测降级成功）。同时按用户要求消除重复：插件改为 `ctx.skills.register` 运行时注册技能（不再物化副本），清理 `~/.dsh/skills/deepseek-prism` 与仓库生成素材副本；插件测试 14 项、全量 57 项通过；发布 v0.4.1。
- 设置界面集成（2026-08-14，随 v0.5.0 发布）：DSH 插件注册 `deepseek-prism-dsh` 设置命名空间，harness 设置页「插件」页新增 DeepSeek Prism 卡片——视觉 API 密钥（password 只写 + 「已配置」徽标，经 credentials 凭据库存储，明文不回显）+ Provider/模型/区域/凭据引用（写入设置段后注入 `process.env`，vision.mjs 免 .env）；客户端为手写 `__ModuleLoader__` bundle（零构建）；harness `WEB_SETTINGS_NAMESPACES` 加一行 allowlist（本地补丁）；插件测试 18 项、全量 61 项通过；发布 v0.5.0。
- 设置卡片保存提速（2026-08-15）：诊断「保存配置很慢」根因——保存路径逐字段串行 RPC，每个字段一次 `settings.mutate`，宿主端每次都要文件锁 + 全量写盘 + `document-updated` 广播（广播再触发所有设置 scope 的全量 describe 回读），8 个字段 ≈ 8 次串行完整往返；改为一次 `settings.mutate` 批量提交全部字段（单次排队/写盘/广播），以响应 view 的 user 层逐 op 验证落地、失败回读 `scope.load()`；apiKey 仍走 credentials 域（每保存 ≤2 次 RPC）。新增 client 保存路径测试 9 项；插件测试 32 项、仓库全量 66 项通过。
- 识图失败 + 密钥保存排查（2026-08-15）：宿主 RPC 直测确认 settings.mutate / credentials.set / describe 全部正常、`deepseek-prism-dsh` 命名空间已注册（revision 0 证明保存从未落盘成功过；settings.yaml 的 `deepseek-prism` 段是旧 dsh-plugin 路线残留，含明文密钥，主线不使用）；根因是**密钥经 credentials 域保存不触发 settings onChange，`applyVisionEnvironment` 从未把密钥注入 process.env**，vision.mjs 子进程无密钥 → 识图失败。修复：插件监听 `credentials/updated` 事件，凭据更新即重跑环境注入（**需重启 harness 生效**；重启前可先保存密钥、再保存任意设置字段触发注入）；新增 real-composition 用例验证凭据更新 → env 注入。插件测试 33 项、仓库全量 67 项通过。
- 图片准入接缝接入（2026-08-15）：重启后用户仍报「该模型不支持识图」——api-proxy 图片准入（纯文本模型 + 图片）要求 `imageFallback` 服务（harness 官方接缝），缺失即拒绝 `MODEL_DOES_NOT_SUPPORT_IMAGES`，旧实现只包装 `sessions.prompt` 未注册接缝。修复：插件 `ctx.provide("imageFallback")`（准入层直接降级，与包装互为兜底；vep 对已降级内容原样返回防二次转换；失败保留原 content 由序列化器剥离兜底；模态判定失败/缺失保守按纯文本降级）；vep 原图块改携原始 base64（兼容 `durablePromptContent` 持久化）。**需重启 harness 生效**。插件测试 37 项、仓库全量 70 项通过。
- 部署故障修复（2026-08-15，v0.6.0 之后）：用户报「插件无法正常使用」——诊断确认插件本体已加载（`prism_see` 工具、settings 命名空间、`imageFallback` 接缝均在线，harness 补丁已生效），根因是 `~/.dsh/settings.yaml` 的 `deepseek-prism.apiKey` 存了 DeepSeek API Key（与 `DEEPSEEK_API_KEY` 相同），而视觉提供方是 SiliconFlow，插件按 `settings.apiKey` 优先取到错误密钥 → SiliconFlow HTTP 401 "Token is invalid"。正确的 `SILICONFLOW_API_KEY` 早已在 `.credentials.yaml`，只是从未被使用。修复：通过 settings 服务（一次性动态插件，null-prototype 对象跨 sandbox realm 写入）将 `deepseek-prism.apiKey` 更新为凭据库中的 SiliconFlow Key；`prism_see` 实测恢复（返回 VEP/2 证据）。注：动态插件宿主代码运行在 `node:vm` 沙箱 realm，直接传对象字面量会被宿主 `isPlainObject` 拒绝，需用 `Object.create(null)` 构造补丁对象。

## 进行中

- 发布 v0.7.0（2026-08-16）：文档就绪（CHANGELOG 去未发布标记、README 版本选择矩阵、PLAN 设计路线、仓库 About 待更），正在执行 `scripts/release.mjs 0.7.0` 与 git 提交/tag/gh release。

## 待处理

- 发布收尾：GitHub 仓库 About 描述更新（`gh repo edit`）；Codex 侧技能副本按需同步。
- Keychain / 自动裁剪 / 更多样例（按需）。

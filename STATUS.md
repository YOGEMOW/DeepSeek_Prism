# STATUS.md

## 已完成

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

- DSH 适配（2026-08-14）：SKILL.md 适配 DeepSeek Harness 技能系统——脚本路径改由 `skill` 工具返回的 `resourceBase.path` 定位（`<资源目录>`），补充 DSH `read_image` 工具与 Windows 引号说明，保留 Codex 兼容；新增 `tests/skill-meta.test.mjs`（3 项）锁定 DSH 发现契约（frontmatter 合法性 / resourceBase 指引 / 脚本存在）；安装到 `C:\Users\用户名\.dsh\skills\deepseek-prism`；17 项测试全部通过，DSH 会话技能目录可见并可加载。

- DSH 插件化（2026-08-14）：新增 `dsh-plugin/`（`@yogemow/dsh-prism` bundle）——宿主插件注册 `deepseek-prism` 设置命名空间（API 密钥为写后即掩的 `role('secret')` 字段）与模型可见的 `prism_see` 工具，复用 `deepseek-prism/scripts/vision.mjs` 视觉流水线；浏览器半注册 设置 → 插件 → 可配置 卡片（密钥/模型/Base URL/区域）；安装到 web profile（`dsh plugin --profile web add`），`--dump-config` 验证组合层生效；插件 7 项测试（含 mock 视觉 API 端到端）与类型检查通过。
- DSH 设置暴露（2026-08-14）：harness api-proxy 的 `WEB_SETTINGS_NAMESPACES` 白名单追加 `'deepseek-prism'`（一行纯增量，经用户确认；harness 注释声明该处为插件设置暴露的唯一路径，插件自暴露为 deferred work）；重建 `@deepseek-ai/dsh-host-apiproxy` 并验证 profile 解析链；api-proxy-config 既有 30 项测试与 oxlint/tsc 均通过；待重启 web 服务后完成界面级验证（设置卡片 + prism_see 工具）。
- DSH 对话发图降级（2026-08-15）：harness api-proxy `prompt` 准入新增可选 `ImageFallbackService` 接缝（经用户确认，约 20 行纯增量）——模型不支持图片时若挂载了 `imageFallback` 服务则转换图片 part 后放行，未挂载维持原拒绝；插件宿主半提供 `imageFallback` 服务（图片 part → VEP/1 文本，复用 vision.mjs 流水线与设置密钥，多图编号标注），并提取 `resolvePrismSettings` 共享配置解析；api-proxy 13 项测试（含 3 项新用例）与插件 9 项测试（含 2 项新用例）通过；重建 api-proxy 与插件 bundle；待重启 web 服务后界面级验证（对话直接发图自动识别）。
- DSH 发图降级界面级验证通过（2026-08-15）：用户上传 Java 代码截图，准入层自动转 VEP/1 证据并正常回答，无“不支持图片”拦截。
- 移除 DSH skill 安装（2026-08-15，经用户确认）：插件形态（`prism_see` 工具 + 发图自动降级 + 设置卡片）已覆盖 DSH 上 skill 的全部功能，删除 `C:\Users\YOGIMOV\.dsh\skills\deepseek-prism`（约 480KB）；插件运行时仅依赖仓库内 `deepseek-prism/scripts/vision.mjs`，不受影响；保留仓库源码与 `C:\Users\YOGIMOV\.codex\skills\deepseek-prism`（Codex 仍走 skill 形态）。
- DSH 前端 VEP 折叠展示（2026-08-15）：harness `ui-conversation` 用户气泡新增 VEP/1 证据折叠渲染——识别插件降级文本包装（`【DeepSeek Prism 识别：<文件名>】\nVEP/1|…`）并折叠为“查看识别结果：<文件名>”链接按钮，点击展开完整证据（aria-expanded，等宽小字），普通文本与多图多块顺序不变，复制文本仍含完整 VEP；新增 `tests/message-vep.client.spec.tsx`（6 项），ui-conversation 全量 28 文件 422 项测试通过；重建 ui-conversation 客户端 bundle，刷新页面即生效（模型侧仍收到完整 VEP 文本，后端无改动）。
- DSH 识图进度执行链卡片（2026-08-15，经用户确认）：`ui-conversation` 的 ChatView 订阅输入机状态，发送含图片的消息（phase=submitting 且带草稿图）时在消息流末尾渲染“DeepSeek Prism 图片识别”执行链卡片（ongoing 追逐状态点 + “正在识别 N 张图片…”），消息落地后自动消失；纯本地展示，不进会话日志；chat-view 新增 2 项用例，ui-conversation 全量 28 文件 424 项测试通过。
- Prism 设置卡片仿照重做（2026-08-15，经用户确认）：`dsh-plugin` 的 PrismCard 弃用手写 inline style，按 ui-settings-plugins 的 PluginCard/ValueField/SecretField 设计仿照重做——可折叠头部（名称/描述/未保存徽章/chevron）+ 字段行（标签/已覆盖徽章/重置/提示，密钥为写后即掩的密码框 + 已设置徽章）+ 保存/放弃脚注，全部使用同一套 `--dsw-alias-*` 主题 token；新增 `PrismCard.module.css`（CSS Modules，tsdown 配置新增 lightningcss 虚拟插件与 `src/css-modules.d.ts`，lightningcss 以 link 加入 devDependencies）；插件 typecheck/构建/9 项测试通过。
- 识别完整提取 + 用量/余额显示 + 执行链修复（2026-08-15，经用户确认）：① `vision.mjs` ocr 模式改为“完整精确提取全部文字（逐字保留、不省略）”并新增 `callVisionWithUsage`（返回 usage）与 `queryBalance`（SiliconFlow `/v1/user/info`，实测接口存在、失败静默）；② 插件降级识别默认走完整提取，`transformImages` 汇总总 token 数、按设置附加 `【DeepSeek Prism 用量】tokens=…|balance=…|cost=…` 行（余额差为本次消耗，仅 SiliconFlow 且开启时查询）；设置新增 `showUsage`（默认开）与 `showBalance`（默认关）两个即时保存的开关（PrismCard checkbox 行）；③ 修复执行链卡片不显示：根因是普通发送走 `default-sink`、phase 始终 `plain` 且乐观提交立即清空图片——`InputState` 新增 facade 层 `sendingCount`（hub.sink 提交时置位、RPC settle 清除），ChatView 改订阅该字段；④ 前端 VEP 折叠链接标题显示消耗 token（≥1000 显示 `1.2k`），展开区显示余额与本次消耗（解析用量行）；测试：插件 10 项（新增 showBalance 用例）、skill 18 项（新增 callVisionWithUsage/queryBalance 用例）、ui-conversation 426 项（新增用量行与 sendingCount 用例）全部通过；重建插件与 ui-conversation bundle；**需重启 web 服务使宿主侧改动生效**。
- 长文提取预算修复（2026-08-15）：真实测试（刘慈欣寄语长文）发现 512 token 紧凑上限导致完整提取错乱（截断后模型“补全”产生乱序/幻觉）——降级识别的输出预算提升至 2048 token、超时 90 秒、VEP 文本预算 2048 字符（`VEP_MAX_CHARS` 仍可覆盖）；`prism_see` 工具保持紧凑默认；插件 10 项测试通过，重建 bundle。
- 动态预算 + 消耗金额修复 + 文案清理（2026-08-15，经用户确认）：① 降级识别预算改为按图片字节大小分三档（≤256KB→512/45s/520、≤1MB→1024/60s/1024、更大→2048/90s/2048），输出触顶（≥95% 档位上限）时自动升级一档重试，用量汇总所有轮次——小图省 token、长文完整；② 消耗金额改为按 token 数 × 内置单价估算（GLM-4.5V 输入 ¥0.14/M、输出 ¥0.86/M，参考 typingmind 定价页），替换失效的“余额差”算法（余额 0 或精度不足时永远不显示 cost）；③ 设置文案删除“（SiliconFlow）”括注；测试：插件 11 项（新增触顶升级用例，断言 512→1024 重试与用量汇总）全部通过；重建 bundle。
- 赠金账户余额显示处理（2026-08-15）：实测 SiliconFlow `user/info` 对赠金账户返回 `balance/chargeBalance/totalBalance` 全为 0（备选余额端点均 404），API 不暴露赠金数字——余额字段仅在 >0 时渲染，避免误导性的“余额 ¥0”，cost（估算消耗）照常显示；用户实测 `tokens=2312|cost=0.001306` 正常；插件 11 项测试通过，重建 bundle。
- 消耗金额独立显示修复（2026-08-15）：用户实测发现余额省略后（赠金账户）展开区整行不渲染、cost 消失——前端把 cost 渲染嵌套在 balance 条件里，两者解耦（balance/cost 各自独立渲染，可单独出现）；message-vep 新增 1 项用例（无 balance 时 cost 单独显示）共 9 项通过；重建 ui-conversation bundle，刷新页面生效（纯客户端改动，无需重启服务）。
- 粘贴图片保留缩略图可重复使用（2026-08-15，经用户确认）：`facade.commitSend` 不再从草稿移除已粘贴图片——发送成功后缩略图保留在输入框，可再次发送同一张图（无需重新粘贴）；文本照常清空，手动点缩略图 × 可移除；input-scenarios 新增 1 项用例（commitSend 后 imageIds 保留、removeImage 仍有效）共 9 项通过，ui-conversation 全量 428 项通过；重建 bundle，刷新页面生效。
- 撤回"发送后保留缩略图"（2026-08-15，经用户确认）：用户实测后要求恢复原行为——`facade.commitSend` 恢复为发送成功即从草稿移除已粘贴图片（缩略图随消息发送而清空），对应新增用例与 import 一并移除；ui-conversation 全量 427 项通过；重建 bundle，刷新页面生效。
- VEP/2 格式升级（2026-08-15，经用户确认）：输出格式从压缩摘要升级为多模式完整事实描述——`vision.mjs`：inferMode 扩展八种模式（error/diff/chart/grounding/qa/ui/ocr/general，问句优先于界面模式），MODE_RULES 按模式生成完整提取/定位/对比规则，schema 新增 g（归一化 bounding box）/d（像素差异区域）/art（可交付产物如 UI 还原 HTML）字段，`parseVisionResult` 解析并校验新字段（越界坐标丢弃），`toVep` 输出 VEP/2（prose 字段带引号、分级裁剪：先丢 s/o/g/d/art 再截断文本），`callVisionWithUsage` 支持多图（imageDataUrls，diff 双图同请求），PROMPT_VERSION 升 dv-2；插件：fallback 把用户附带文本并入 prompt 且**意图仅基于用户文本推断**（避免默认提取指令淹没关键词），双图 + 对比意图触发 diff 单次双图调用（`【DeepSeek Prism 对比：A vs B】`），`prism_see` 文案同步 VEP/2；前端 VEP_EVIDENCE_RE 兼容 VEP/1|2（旧消息仍可折叠）；测试：skill 19 项（新增模式/新字段解析/VEP/2 裁剪用例）、插件 13 项（新增 qa 意图与双图 diff 用例）、ui-conversation 427 项全部通过；**需重启 web 服务使 vision.mjs 模块缓存与插件宿主侧生效**。
- 输入照片在上下文中显示（2026-08-15，经用户确认）：降级转换不再丢弃原图——插件 `transformImages` 返回时保留图片 part 作为**展示附件**（普通与 diff 路径均如此，消息含原图缩略图、可点开原图），VEP 文本作为额外 text part 追加；harness `llm-deepseek` 序列化器改为**剥离 display-only 图片块**（不再抛 UNSUPPORTED_CONTENT，文本流保持纯文本，flattenText 天然跳过 image）；`serialize.spec` 的拒绝用例改为剥离断言（27 项全过）；插件 13 项、llm-deepseek+api-proxy 回归 164 项全部通过；重建 llm-deepseek host bundle 与插件 bundle；**需重启 web 服务生效**。
- 插件整理入库（2026-08-15）：`dsh-plugin/` 全量入 git（源码/测试/配置/文档，`.gitignore` 排除 `node_modules/`、`lib/`、密钥）；新增 `harness-patch/`——把 harness 侧 15 个改动文件 + 1 个新测试（api-proxy 接缝与白名单、llm-deepseek 图片剥离、ui-conversation 折叠/进度/发送信号）打包为可 `git apply` 的补丁并附应用说明（版本适用范围、重建命令）；根 README 与 dsh-plugin/README 补充「另一台机器部署」完整步骤（补丁 → 重建 → link 路径调整 → 构建 → 安装 → 配置）；skill-meta.test.mjs 补提交；暂存待提交，推送前需用户确认。
## 进行中

- 无（v0.1.1 已完成并公开托管）。

## 待处理

- Keychain / 自动裁剪 / 更多样例（按需）。

# DECISIONS.md

## 关键技术决策及原因

### D1 独立项目 + 安装到 Codex skills

- 决策：`E:\Git\repositoris\DeepSeek_Vision` 独立 Git 项目，六份文档 + AGENTS.md；Skill 复制安装到 `C:\Users\YOGIMOV\.codex\skills\deepseek-vision`。
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

- 决策：2026-08-02 起，项目目录更名为 `E:\Git\repositoris\DeepSeek_Prism`，Skill 名称由 `deepseek-vision` 改为 `deepseek-prism`，界面显示名 “DeepSeek Prism”，安装路径同步为 `C:\Users\YOGIMOV\.codex\skills\deepseek-prism`；此决策取代 D1 中的旧名称/路径。
- 原因：用户要求统一命名，突出“棱镜”式的视觉证据折射定位。
- 代价：历史提交与文档中的旧名称保留原样（不重写历史），仅当前状态文档与新增记录使用新名称。

### D11 采用 MIT 许可证并公开托管

- 决策：2026-08-02 起，项目采用 MIT License（Copyright (c) 2026 YOGIMOV），新增根 `README.md` 与 `THIRD_PARTY_NOTICES.md`，并创建 GitHub 公开仓库托管（需完成认证后推送）。
- 原因：两个主要借鉴仓库（free-vision-skill、agentic-ai-playground）均为 MIT，MIT 兼容且传播成本最低；第三方声明满足 MIT“保留版权声明与许可文本”的要求；公开仓库便于分享与协作。
- 代价：MIT 允许他人自由使用/修改；公开仓库即公开代码（`.env` 与缓存目录仍不提交）；无 LICENSE 的 claude-vision-skill 仅借鉴思路，不复制代码。

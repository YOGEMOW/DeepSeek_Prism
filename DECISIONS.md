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

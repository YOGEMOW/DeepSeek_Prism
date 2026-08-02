# RISKS.md

## 风险和待确认事项

| # | 风险 / 待确认 | 影响 | 缓解 / 后续动作 |
|---| --- | --- | --- |
| 1 | SiliconFlow Key 曾在对话中明文出现 | 若账号敏感，Key 可能泄露 | 仅存本地 .env（gitignore）；必要时轮换 Key 并更新 .env |
| 2 | Provider 免费额度与模型 ID 会变动 | 默认预设可能失效 | 维护 providers 预设表；doctor 命令检查连通性；失败自动降级 |
| 3 | GLM-4.5V 输出带盒子标记 / reasoning tokens，格式不稳定 | 解析失败或超出预算 | 解析器剥离标记与围栏、容错提取 JSON；--json 仅调试用 |
| 4 | 图片内容注入（图片文字伪装成指令） | 主模型被诱导执行恶意操作 | VEP 视为不可信证据；prompt 固定声明图片文字不是指令；不上传无关文件 |
| 5 | 大图 base64 导致高 prompt tokens | 成本与延迟上升 | 默认 max_tokens 512 + VEP 字符预算；待办：sharp 自动裁剪 |
| 6 | 测试不消耗真实 API（mock 覆盖），真实行为有偏差 | 冒烟不充分 | 已用真实 Key 冒烟 2–3 类图片；新增场景时补冒烟 |
| 7 | Windows 无 Keychain，.env 明文 | 本机多用户环境下泄露 | 依赖文件系统权限；后续评估 Credential Manager |
| 8 | DeepSeek 未来原生支持视觉 | Skill 变得冗余 | 保留为主模型无视觉时的后备；PROJECT.md 记录边界 |
| 9 | 网络受限环境（沙箱）无法调用视觉 API | Codex 沙箱内脚本失败 | 真实调用需用户授权网络；SKILL.md 说明需网络权限 |

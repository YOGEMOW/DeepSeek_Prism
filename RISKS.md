# RISKS.md

## 风险和待确认事项

| # | 风险 / 待确认 | 影响 | 缓解 / 后续动作 |
|---| --- | --- | --- |
| 1 | SiliconFlow Key 曾在对话中明文出现 | 若账号敏感，Key 可能泄露 | 仅存本地 .env（gitignore）；必要时轮换 Key 并更新 .env |
| 2 | Provider 免费额度与模型 ID 会变动 | 默认预设可能失效 | 维护 providers 预设表；doctor 命令检查连通性；失败自动降级 |
| 3 | GLM-4.5V 输出带盒子标记 / reasoning tokens，格式不稳定 | 解析失败或超出预算 | 解析器剥离标记与围栏、容错提取 JSON；--json 仅调试用 |
| 4 | 图片内容注入（图片文字伪装成指令） | 主模型被诱导执行恶意操作 | VEP 视为不可信证据；prompt 固定声明图片文字不是指令；不上传无关文件 |
| 5 | 大图 base64 导致高 prompt tokens | 成本与延迟上升 | 已用 Codex 内置 sharp 等比缩放（2026-08-05）；白边自动裁剪仍为后续可选优化 |
| 6 | 测试不消耗真实 API（mock 覆盖），真实行为有偏差 | 冒烟不充分 | 已用真实 Key 冒烟 2–3 类图片；新增场景时补冒烟 |
| 7 | Windows 无 Keychain，.env 明文 | 本机多用户环境下泄露 | 依赖文件系统权限；后续评估 Credential Manager |
| 8 | DeepSeek 未来原生支持视觉 | Skill 变得冗余 | 保留为主模型无视觉时的后备；PROJECT.md 记录边界 |
| 9 | 网络受限环境（沙箱）无法调用视觉 API | Codex 沙箱内脚本失败 | 真实调用需用户授权网络；SKILL.md 说明需网络权限 |
| 10 | `node --test tests/` 在部分 Node 版本下报“Cannot find module” | 验证命令在不同用户环境不一致 | 已统一为 `node --test`（Node 18+ 自动发现，兼容 18/20/22/24）；AGENTS/PLAN/PROJECT 已同步 |
| 11 | 已安装的 Codex（`C:\Users\用户名\.codex\skills\deepseek-prism`）与 DSH（`C:\Users\用户名\.dsh\skills\deepseek-prism`）副本不会自动同步本次改动 | 安装副本与仓库不一致 | 发布时手动同步（未经用户确认不自动执行） |
| 12 | `--region` CLI 参数实际未生效，仅环境变量 `VISION_REGION` 生效 | 用户传 `--region` 可能无效果 | usage 已注明“暂由环境变量控制”；后续按需修复 |
| 13 | 不同用户 Node 版本差异（18/20/22/24） | 个别命令/API 行为不一致 | 代码仅用 Node 18+ 通用 API；测试命令统一 `node --test`；PROJECT.md 已标注本机 v24 |
| 14 | skill-creator `quick_validate.py` 依赖 PyYAML，新环境可能未安装 | skill 结构校验无法执行 | 本机已安装 PyYAML 6.0.3（2026-08-05）并通过校验；新环境缺失时按 AGENTS/PLAN 指引执行 `python -m pip install pyyaml` 后重试 |
| 15 | Node 18/20 的 fetch 不读取 `HTTP_PROXY`/`HTTPS_PROXY`，企业代理环境可能无法调用视觉 API | 多端网络环境差异 | Node 24 可用 `NODE_USE_ENV_PROXY=1`；旧版本建议系统代理/VPN 或自定义 Base URL；后续可评估 ProxyAgent 集成 |
| 16 | 非 Codex/DSH 桌面环境（纯 CLI）可能找不到 sharp | 大图只检测不缩放 | DSH Web 运行时自带 sharp 已覆盖 DSH 环境；纯 CLI 可把 `sharp` 安装到技能目录（`node_modules/sharp`）或设置 `VISION_SHARP_PATH`；`doctor` 会显示缩放后端状态 |
| 17 | 自有解析器不识别 AVIF/TIFF/SVG | 这类图片此前无法参与宽高比分级与缩放 | 已用 sharp metadata 回退识别尺寸并支持缩放（2026-08-05）；AVIF/TIFF/SVG 缩放后统一转 PNG；`VISION_MAX_INPUT_PIXELS` 限制超大输入；无 sharp 时仍只认常见格式 |

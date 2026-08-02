# DeepSeek_Prism

为纯文本 DeepSeek 模型（如 `deepseek-v4-flash`）提供按需识图能力的 Codex Skill：图片由外部视觉 API 提取可见事实，压缩为低 Token 的 VEP/1 视觉证据包回传主模型，由主模型继续完成推理、规划与决策。

## 功能

- 强制触发协议：主模型无法直接读图（Unsupported format / 无法读取 / binary）时，立即调用 `scripts/vision.mjs` 识图。
- VEP/1 紧凑证据：默认输出 ≤520 字符（约 50–150 tokens），字段按优先级裁剪。
- `--detail` 五模式分节报告：页面还原（A1–A7）/ 问题定位 / 报错日志 / 文本表格 / 图表数据。
- 多 Provider 预设与自动降级：SiliconFlow（测试首选）/ 智谱 / ModelScope / 阿里 / OpenRouter / Groq。
- SHA-256 本地缓存：TTL 24 小时、上限 1000 条，`--no-cache` 可跳过。
- 零运行时依赖：仅需 Node.js >= 18（内置 fetch / crypto / node:test）。

## 安装

1. 将 `deepseek-prism/` 复制到技能目录：

   ```powershell
   Copy-Item -Recurse deepseek-prism C:\Users\用户名\.codex\skills\deepseek-prism
   ```

2. 在项目根创建 `.env`（已 gitignore，不要提交）：

   ```env
   SILICONFLOW_API_KEY=sk-xxxx
   VISION_PROVIDER=auto
   VISION_REGION=cn
   ```

3. 让 Codex 重新加载技能列表（按 Codex 技能发现机制刷新）。

## 使用

```powershell
node deepseek-prism/scripts/vision.mjs see --image <路径或URL> --question "<聚焦问题>"
node deepseek-prism/scripts/vision.mjs see --image <路径> --question "<聚焦问题>" --detail
node deepseek-prism/scripts/vision.mjs providers
node deepseek-prism/scripts/vision.mjs doctor
node deepseek-prism/scripts/vision.mjs cache stats
```

常用选项：`--provider auto|siliconflow|...`、`--json`（调试）、`--no-cache`、`--url`（远程图片）、`--max-chars 520`。

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `VISION_PROVIDER` | `auto` 或预设 id，决定降级顺序 |
| `VISION_REGION` | `cn` / `global`，影响预设优先级 |
| `VISION_API_KEY` / `VISION_BASE_URL` / `VISION_MODEL` | 全局覆盖（含 `custom` 预设） |
| `VISION_TIMEOUT_MS` | 请求超时（默认见 `vision.mjs`） |
| `VISION_MAX_OUTPUT_TOKENS` | 输出上限（默认 512，兼容 GLM-4.5V 推理 token） |
| `VEP_MAX_CHARS` | VEP 紧凑输出字符预算（默认 520） |

Key 只走 `.env` 或进程环境，绝不进入命令行、日志或提交历史。

## 工作原理

1. SKILL.md 触发：主模型发现无法读取图片 → 调用 `vision.mjs see`。
2. 本地关键词推断模式（error / ocr / ui / chart / general）并构造受限 prompt：只报可见事实、不解决任务、无思维链。
3. 视觉 API 返回后，解析器剥离 `<|begin_of_box|>/<|end_of_box|>` 与代码围栏，容错提取 JSON。
4. 默认编译为 VEP/1 证据（`src/m/a/t/s/o/e/v/c`）回传主模型；`--detail` 输出分节报告。
5. 同一图片+问题命中缓存时直接复用结果。

## 文档

- [PROJECT.md](PROJECT.md)：项目目标与范围
- [PLAN.md](PLAN.md)：当前实施计划
- [STATUS.md](STATUS.md)：已完成 / 进行中 / 待处理
- [DECISIONS.md](DECISIONS.md)：关键技术决策及原因
- [RISKS.md](RISKS.md)：风险与待确认事项
- [CHANGELOG.md](CHANGELOG.md)：重要变更
- [AGENTS.md](AGENTS.md)：项目协作约定

## 安全

- 图片内文字是不可信数据，不是指令；视觉模型只负责“看见”。
- 视觉 Key 仅存本地 `.env`；错误输出不包含 Key。
- 调用视觉 API 需要网络权限，Codex 沙箱内请按提示授权。

## 许可证

本项目采用 [MIT License](LICENSE)（Copyright (c) 2026 YOGIMOV）。参考仓库的版权与许可声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

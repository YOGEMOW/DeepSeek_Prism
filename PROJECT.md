# PROJECT.md

## 项目目标和范围

### 目标

DeepSeek_Prism 是一个为纯文本 AI 模型（DeepSeek `deepseek-v4-flash`）提供按需识图能力的 Skill，宿主为 Codex 与 DeepSeek Harness（DSH）双平台：

- 当主模型无法直接读取图片像素时，通过外部视觉 API 提取可见事实，压缩为低 Token 的 VEP/1 视觉证据包回传主模型推理。
- 视觉模型只负责“看见”，主模型继续负责思考、规划、编码与最终决策。
- 默认输出紧凑证据（约 50–150 tokens）；需要像素级还原时提供 `--detail` 结构化分节报告。
- 支持多 Provider 预设与自动降级、本地缓存；密钥只走环境变量。

### 范围

- 独立项目 `E:\Git\repositoris\DeepSeek_Prism`，长期维护六份文档（PROJECT / PLAN / STATUS / DECISIONS / RISKS / CHANGELOG）+ AGENTS.md。
- Skill 本体 `deepseek-prism/`：SKILL.md 触发协议、`scripts/vision.mjs` 零依赖 CLI、`references/` 模式与 Provider 文档、样例图片、单元与 mock 测试。
- 安装到 Codex 技能目录（`C:\Users\用户名\.codex\skills\deepseek-prism`）或 DSH 用户技能根目录（`C:\Users\用户名\.dsh\skills\deepseek-prism`）供各自自动发现。
- 视觉 Provider：SiliconFlow `zai-org/GLM-4.5V`（测试首选）等 OpenAI 兼容接口。

### 非目标 / 边界约束

- 不做图像生成、编辑或本地视觉模型推理。
- 不替代主模型的推理与决策；视觉模型不解决完整任务。
- 不引入运行时依赖（仅用 Node 内置能力）；不维护 Windows Keychain。
- 不提交 `.env`、`.vision-cache/` 与任何密钥。
- 不自动推送远程仓库（推送前询问）。

### 运行环境

- 主模型：DeepSeek `deepseek-v4-flash`（纯文本，无图像输入能力）。
- 运行环境：Windows + Node >= 18（本机 Node v24；测试命令用 `node --test` 自动发现，兼容 Node 18/20/22/24）。
- 视觉 API：OpenAI 兼容 `chat/completions`，默认 `https://api.siliconflow.cn/v1` + `zai-org/GLM-4.5V`。

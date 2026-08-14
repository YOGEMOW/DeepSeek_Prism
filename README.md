# DeepSeek_Prism

为纯文本 DeepSeek 模型（如 `deepseek-v4-flash`）提供按需识图能力的 Skill + DSH 插件：图片由外部视觉 API 提取事实，压缩为低 Token 的 **VEP/2 多模式证据包**回传主模型，由主模型继续完成推理、规划与决策。

## 功能

- 强制触发协议：主模型无法直接读图（Unsupported format / 无法读取 / binary）时，立即调用 `scripts/vision.mjs` 识图。
- **VEP/2 八模式**（意图自动推断）：`qa` 带意图问答 / `ocr` 长截图完整文本 / `ui` 界面还原（含 `g` 元素定位坐标）/ `grounding` 对象边界框 / `diff` 双图像素差异（`d` 区域）/ `error` 报错日志 / `chart` 图表 / `general` 完整事实描述；`art` 可携带可交付产物（如 UI 还原 HTML）。
- 自适应预算：按图片字节分三档（512/1024/2048 token），输出触顶自动升级重试，小图省 token、长文完整。
- `--detail` 五模式分节报告：页面还原（A1–A7）/ 问题定位 / 报错日志 / 文本表格 / 图表数据。
- 多 Provider 预设与自动降级：SiliconFlow（测试首选）/ 智谱 / ModelScope / 阿里 / OpenRouter / Groq。
- SHA-256 本地缓存：TTL 24 小时、上限 1000 条，`--no-cache` 可跳过。
- 零运行时依赖：仅需 Node.js >= 18（内置 fetch / crypto / node:test）。
- DSH 插件形态（GUI）：设置卡片配置密钥/模型/显示开关，发图自动识别（原图保留在对话中、VEP 折叠为链接、执行链进度卡片、用量/消耗显示）。

## 安装

1. 将 `deepseek-prism/` 复制到技能目录：

   ```powershell
   Copy-Item -Recurse deepseek-prism C:\Users\用户名\.codex\skills\deepseek-prism
   ```

   - DeepSeek Harness（DSH）：复制到 `C:\Users\用户名\.dsh\skills\deepseek-prism`（即 `$DSH_HOME/skills`），由 harness 的 `skill` 工具自动发现，脚本路径以该工具返回的 `resourceBase.path` 为准。

   - DeepSeek Harness 插件形态（推荐 GUI 使用）：先应用 harness 前置补丁（见下文「另一台机器部署」），再在 deepseek-harness checkout 下执行 `pnpm dsh plugin --profile web add <本仓库>\dsh-plugin`，重启 web 服务后，在 设置 → 插件 → 可配置 中填写视觉 API 密钥与模型。详见 [dsh-plugin/README.md](dsh-plugin/README.md)。

2. 配置密钥（任选其一，脚本按顺序查找：环境变量 → 运行目录 `.env` → 脚本目录 `.env` → 技能根目录 `.env`）：

   ```env
   SILICONFLOW_API_KEY=sk-xxxx
   VISION_PROVIDER=auto
   VISION_REGION=cn
   ```

   - 或设置用户环境变量 `SILICONFLOW_API_KEY`（推荐，所有项目通用）；
   - 或在技能根目录（SKILL.md 所在目录）创建 `.env`（写入同样内容）。

3. 让 Codex 重新加载技能列表（按 Codex 技能发现机制刷新）。

## 使用

```powershell
node deepseek-prism/scripts/vision.mjs see --image <路径或URL> --question "<聚焦问题>"
node deepseek-prism/scripts/vision.mjs see --image <路径> --question "<聚焦问题>" --detail
node deepseek-prism/scripts/vision.mjs providers
node deepseek-prism/scripts/vision.mjs doctor
node deepseek-prism/scripts/vision.mjs cache stats
```

常用选项：

- `--provider auto|siliconflow|...`：选择 Provider（默认 `auto`）
- `--json`：调试用，输出解析后的 JSON
- `--no-cache`：跳过本地缓存
- `--url`：将 `--image` 视为远程图片 URL
- `--max-chars 520`：VEP 输出字符预算

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `VISION_PROVIDER` | `auto` 或预设 id，决定降级顺序 |
| `VISION_REGION` | `cn` / `global`，影响预设优先级 |
| `VISION_API_KEY` | 全局覆盖 API Key（配合 `custom` 预设） |
| `VISION_BASE_URL` | 全局覆盖 Base URL（配合 `custom` 预设） |
| `VISION_MODEL` | 全局覆盖模型 ID（配合 `custom` 预设） |
| `VISION_TIMEOUT_MS` | 请求超时（默认见 `vision.mjs`） |
| `VISION_MAX_OUTPUT_TOKENS` | 输出上限（默认 512，兼容 GLM-4.5V 推理 token） |
| `VEP_MAX_CHARS` | VEP 紧凑输出字符预算（默认 520） |

Key 只走 `.env` 或进程环境，绝不进入命令行、日志或提交历史。

## 工作原理

1. SKILL.md 触发：主模型发现无法读取图片 → 调用 `vision.mjs see`。
2. 关键词推断八种模式（qa / ocr / ui / grounding / diff / error / chart / general）并构造受限 prompt：只报可见事实、不解决任务、无思维链。
3. 视觉 API 返回后，解析器剥离 `<|begin_of_box|>/<|end_of_box|>` 与代码围栏，容错提取 JSON（含 `g` 定位、`d` 差异、`art` 产物）。
4. 默认编译为 VEP/2 证据（`src/m/a/t/s/o/g/d/art/e/v/c`，分级裁剪）回传主模型；`--detail` 输出分节报告。
5. 同一图片+问题命中缓存时直接复用结果。

## 另一台机器部署（DSH 插件形态）

插件需要 deepseek-harness 源码的三处配套改动（发图降级接缝、文本模型图片剥离、前端 VEP 折叠与进度卡片），已打包为补丁：

```powershell
# 1. 应用 harness 补丁（详见 harness-patch/README.md）
cd <deepseek-harness checkout>
git apply <本仓库>\harness-patch\dsh-prism-harness.patch

# 2. 重建 harness 相关产物
node node_modules\typescript\bin\tsc -b tsconfig.host.json
node node_modules\tsdown\dist\run.mjs --env.DSH_BUILD_FACE host --filter @deepseek-ai/dsh-host-apiproxy --filter @deepseek-ai/dsh-llm-deepseek
node node_modules\typescript\bin\tsc -b tsconfig.client.json
node node_modules\tsdown\dist\run.mjs --env.DSH_BUILD_FACE client

# 3. 调整插件开发依赖的 link 路径（指向你自己的 harness/profiles 位置），然后构建
cd <本仓库>\dsh-plugin
#   编辑 package.json 的 devDependencies，把 link:C:/Users/.../ 与 link:E:/Git/.../ 改为本机路径
pnpm install
pnpm run build
node tests\host.spec.mjs        # 应全部通过

# 4. 安装插件并重启
cd <deepseek-harness checkout>
pnpm dsh plugin --profile web add <本仓库>\dsh-plugin
pnpm dsh --profile web --port 8080

# 5. 设置 → 插件 → 可配置 → DeepSeek Prism：填写视觉 API 密钥（必填）、模型、Base URL
```

> 注意：`dsh-plugin` 必须在 `DeepSeek_Prism` 仓库 checkout 内安装（运行时动态导入相邻的 `deepseek-prism/scripts/vision.mjs`）。

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

本项目采用 [MIT License](LICENSE)（Copyright (c) 2026 YOGEMOW）。参考仓库的版权与许可声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

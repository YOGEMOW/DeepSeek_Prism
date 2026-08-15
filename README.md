# DeepSeek_Prism

为纯文本 DeepSeek 模型（如 `deepseek-v4-flash`）提供按需识图能力的 Codex / DeepSeek Harness（DSH）双平台 Skill：图片由外部视觉 API 提取可见事实，压缩为低 Token 的 VEP/1 视觉证据包回传主模型，由主模型继续完成推理、规划与决策。

## 版本选择

| 版本 | 定位 | 说明 |
| --- | --- | --- |
| **[v0.7.1](https://github.com/YOGEMOW/DeepSeek_Prism/releases/tag/v0.7.1)** | **零补丁版** | DSH 当前主线：自包含 Cordis 组合包，`prism_see` 工具 + 纯文本模型图片准入 VEP 降级 + 技能运行时注册 + 设置卡片；harness 本体零改动、上游更新零冲突、卸载零残留 |
| **[v0.6.2](https://github.com/YOGEMOW/DeepSeek_Prism/releases/tag/v0.6.2)** | **实用版** | DSH 完整 UI 体验：原图保留展示 + VEP 折叠链接/识别进度卡片 + Web 设置卡片可编辑；需应用 `harness-patch/dsh-prism-harness.patch`（可选增强） |
| **[v0.2.0](https://github.com/YOGEMOW/DeepSeek_Prism/releases/tag/v0.2.0)** | **Codex 推荐 skills 版** | Codex 平台的技能本体（SKILL.md + `scripts/vision.mjs` + references），安装到 `~/.codex/skills/deepseek-prism` |

## 功能

- 强制触发协议：主模型无法直接读图（Unsupported format / 无法读取 / binary）时，立即调用 `scripts/vision.mjs` 识图。
- VEP/1 紧凑证据：默认输出 ≤520 字符（约 50–150 tokens），字段按优先级裁剪。
- `--detail` 五模式分节报告：页面还原（A1–A7）/ 问题定位 / 报错日志 / 文本表格 / 图表数据。
- 自动分级：小图/简单任务默认 VEP/1；长内容（代码截图、长日志、文档、宽/高比大的图）自动走 `--detail` 完整通道；超长内容自动续写并合并。
- 程序化输出：`--raw` 输出清洗后的原文；`--full` 输出 `{raw, parsed}` JSON 信封。
- 输入预处理：解析图片宽高（含 AVIF/TIFF/SVG 的 sharp metadata 回退），超过 2048px 时用 sharp（libvips）等比缩放后再上传，不依赖宿主安装 Python 等工具；sharp 自动查找 Codex 桌面运行时 / DSH Web 运行时（`~/.dsh/profiles/node_modules/sharp`）/ 技能目录 `node_modules/sharp`（或 `VISION_SHARP_PATH` 指定）；动画 GIF 缩放后保留全部帧，AVIF/TIFF/SVG 统一转为 PNG 保证视觉 API 兼容。
- 多 Provider 预设与自动降级：SiliconFlow（测试首选）/ 智谱 / ModelScope / 阿里 / OpenRouter / Groq。
- SHA-256 本地缓存：TTL 24 小时、上限 1000 条，`--no-cache` 可跳过。
- 零运行时依赖：仅需 Node.js >= 18（内置 fetch / crypto / node:test）。

## 安装

按平台分开发布两个包（版本选择见上表；GitHub Release 资产见 [Releases](https://github.com/YOGEMOW/DeepSeek_Prism/releases)）：

- **DSH（DeepSeek Harness）**：`@yogemow/deepseek-prism-dsh`（npmjs 已发布 v0.6.2 与 v0.7.1）。两个版本的差别：

  | 版本 | 定位 | 安装命令 | 前置要求 |
  | --- | --- | --- | --- |
  | **v0.7.1**（latest） | 零补丁版：`prism_see` 工具 + 纯文本模型图片准入 VEP 降级 + 技能运行时注册 + 设置卡片 | `dsh plugin --profile <name> add @yogemow/deepseek-prism-dsh` | **无**——harness 本体零改动、上游更新零冲突、卸载零残留 |
  | **v0.6.2** | 实用版：原图保留展示 + VEP 折叠链接/识别进度卡片 + Web 设置卡片可编辑 | `dsh plugin --profile <name> add @yogemow/deepseek-prism-dsh@0.6.2` | 需应用 `harness-patch/dsh-prism-harness.patch` 并重建 host/client 产物 |

  ```powershell
  # 1) 按名安装（默认 v0.7.1；指定版本加 @0.6.2）
  dsh plugin --profile web add @yogemow/deepseek-prism-dsh
  # 2) 重启 web 服务；卸载：dsh plugin --profile web remove @yogemow/deepseek-prism-dsh
  ```

  本地/离线安装（源码 checkout 形态需与 `deepseek-prism/` 相邻；tarball 形态包内已含 skill/ 素材）：

  ```powershell
  dsh plugin --profile web add E:\Git\repositoris\DeepSeek_Prism\packages\plugin-dsh
  # 或
  dsh plugin --profile web add https://github.com/YOGEMOW/DeepSeek_Prism/releases/download/v0.7.1/deepseek-prism-dsh-0.7.1.tgz
  ```

  插件能力（v0.7.1）：模型可用 `prism_see` 工具按路径/URL 识图；对话直接上传图片时，纯文本模型自动把图片转为 VEP/2 证据文本入会话（原图持久化为附件并以路径指针告知模型，可对该路径补查）；`deepseek-prism` 技能随包运行时注册。配置三选一：Web 设置卡片（harness 白名单暴露该命名空间时）、profile 的 `cordis.patch.yml` 行配置、环境变量（`SILICONFLOW_API_KEY` / `VISION_BASE_URL` / `VISION_MODEL` / `VISION_REGION`）。详见 `packages/plugin-dsh/README.md`。

  > `harness-patch/dsh-prism-harness.patch` 为可选增强（原图展示 + 前端 VEP 折叠/进度卡片，应用后设置卡片可编辑），仅 v0.6.2 需要；`archive/plugin-dsh-zero-patch/` 为旧「零补丁 B 架构」的归档参考（不维护、不参与发布）。

- **Codex**：`@yogemow/deepseek-prism-skill`（含一键安装 CLI）：

  ```powershell
  npx @yogemow/deepseek-prism-skill   # 从 GitHub Release 资产安装：
  npx https://github.com/YOGEMOW/DeepSeek_Prism/releases/download/v0.4.0/deepseek-prism-skill-0.4.0.tgz
   # 或指定目标目录：npx deepseek-prism-skill --dest D:\skills
   # 手动方式：Copy-Item -Recurse deepseek-prism C:\Users\用户名\.codex\skills\deepseek-prism
  ```

1. 配置密钥（任选其一，脚本按顺序查找：环境变量 → 运行目录 `.env` → 脚本目录 `.env` → 技能根目录 `.env`）：

   ```env
   SILICONFLOW_API_KEY=sk-xxxx
   VISION_PROVIDER=auto
   VISION_REGION=cn
   ```

   - 或设置用户环境变量 `SILICONFLOW_API_KEY`（推荐，所有项目通用）；
   - 或在技能根目录（SKILL.md 所在目录）创建 `.env`（写入同样内容）。

2. 让宿主重新加载技能列表（Codex 按技能发现机制刷新；DSH 的 skill-filesystem watcher 自动发现新目录，无需重启）。

运行要求：Node.js >= 18（内置 fetch / node:test）；缩放自动使用 Codex 桌面运行时 / DSH Web 运行时自带的 sharp，无需额外安装。

### 纯 CLI 环境可选：安装 sharp（仅大图缩放需要）

Codex 桌面运行时与 DSH Web 运行时均自带 sharp，开箱即用。若在纯 CLI 环境（两者都没有）使用且需要大图等比缩放：

```powershell
# 方式一：安装到技能目录（脚本会自动查找 deepseek-prism/node_modules/sharp）
cd deepseek-prism
npm install sharp

# 方式二：安装到其他位置后指定路径
$env:VISION_SHARP_PATH = "D:\tools\node_modules\sharp"
```

未安装 sharp 时脚本仍可正常识别图片并调用视觉 API，只是超过 `VISION_RESIZE_MAX` 的大图不做缩放（stderr 会警告）；`node vision.mjs doctor` 可查看当前缩放后端状态。

## 使用

```powershell
node deepseek-prism/scripts/vision.mjs see --image <路径或URL> --question "<聚焦问题>"
node deepseek-prism/scripts/vision.mjs see --image <路径> --question "<聚焦问题>" --detail
node deepseek-prism/scripts/vision.mjs see --image <路径> --question "<聚焦问题>" --full
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
- `--compact`：强制紧凑 VEP/1 输出（与 `--detail`/`--full` 同传时后者优先）
- `--raw`：只输出清洗后的原始文本
- `--full`：隐含完整通道，输出 `{raw, parsed}` JSON 信封

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `VISION_PROVIDER` | `auto` 或预设 id，决定降级顺序 |
| `VISION_REGION` | `cn` / `global`，影响预设优先级 |
| `VISION_API_KEY` | 全局覆盖 API Key（配合 `custom` 预设） |
| `VISION_BASE_URL` | 全局覆盖 Base URL（配合 `custom` 预设） |
| `VISION_MODEL` | 全局覆盖模型 ID（配合 `custom` 预设） |
| `VISION_TIMEOUT_MS` | 请求超时（默认见 `vision.mjs`） |
| `VISION_MAX_OUTPUT_TOKENS` | 输出上限覆盖（默认 compact 512 / detail 按 Provider：SiliconFlow 等 4096，OpenRouter/Groq 8192） |
| `VEP_MAX_CHARS` | VEP 紧凑输出字符预算（默认 520） |
| `VISION_DETAIL_AUTO` | 自动分级开关：`auto` / `always` / `never`（默认 `auto`） |
| `VISION_MAX_CONTINUATIONS` | 超长内容续写次数上限（默认 8；设为 0 关闭续写） |
| `VISION_RESIZE_TOOL` | 大图缩放后端：`auto` / `sharp` / `skip`（默认 `auto`，找不到内置 sharp 时跳过并在 stderr 警告） |
| `VISION_RESIZE_MAX` | 大图缩放边长阈值（默认 2048px） |
| `VISION_MAX_INPUT_PIXELS` | 输入像素上限，超过则跳过缩放（默认 268435456，即 sharp 默认解压上限） |
| `VISION_SHARP_PATH` | 可选：手动指定 sharp 包路径（默认自动查找 Codex 运行时 / DSH Web 运行时 / 技能目录 node_modules） |

Key 只走 `.env` 或进程环境，绝不进入命令行、日志或提交历史。

## 工作原理

1. SKILL.md 触发：主模型发现无法读取图片 → 调用 `vision.mjs see`。
2. 本地关键词推断模式（error / ocr / ui / chart / general）并构造受限 prompt：只报可见事实、不解决任务、无思维链。
3. 视觉 API 返回后，解析器剥离 `<|begin_of_box|>/<|end_of_box|>` 与代码围栏，容错提取 JSON。
4. 默认编译为 VEP/1 证据（`src/m/a/t/s/o/e/v/c`）回传主模型；`--detail` 输出分节报告。
5. 长内容任务自动切换完整通道；输出被截断时以锚点续写、合并，直到模型回答“没有更多内容”。
6. 超 2048px 的图片用内置 sharp 等比缩放后再上传（动画 GIF 保留全部帧），节省流量与 API 费用；旧版本缓存条目自动清理。
7. 同一图片+问题+输出通道命中缓存时直接复用结果。

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

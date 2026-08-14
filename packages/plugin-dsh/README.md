# @yogemow/deepseek-prism-dsh

DeepSeek Prism 的 Harness 插件形态（DSH 主线）：宿主插件注册 `deepseek-prism` 设置命名空间与模型可见的 `prism_see` 工具；浏览器侧在 设置 → 插件 → 可配置 中提供配置卡片（视觉 API 密钥、模型、Base URL、区域、用量/余额开关）。

视觉流水线复用同仓库 `deepseek-prism/scripts/vision.mjs`（prompt、Provider、解析、VEP/2 编译）。源码 checkout 安装时通过仓库相对路径在运行时动态导入（bundle 与 `deepseek-prism/` 技能目录相邻）；`npm pack`/发布形态由 prepack 把技能素材物化进包内 `skill/`，两种形态解析顺序为「包内 `skill/` 优先、仓库回退」。

> 本路线依赖 harness 配套补丁 `harness-patch/dsh-prism-harness.patch`（一次性应用，见 `../harness-patch/README.md`）；旧「零补丁 B 架构」主线已废弃并归档至 `archive/plugin-dsh-zero-patch/`。

## 功能

- **设置界面配置**：设置 → 插件 → 可配置 → DeepSeek Prism（识图）卡片。API 密钥为写后即掩的 secret（`role('secret')`），任何响应都不会回传其值；卡片通过脱敏 describe 的 `secrets` 槽位显示"已设置/未设置"。
- **`prism_see` 工具**：模型传入图片路径/URL 与聚焦问题，返回 VEP/2 紧凑证据（`detail: true` 时输出分节报告）。密钥解析顺序：设置文档 → 环境变量 `SILICONFLOW_API_KEY` / `VISION_API_KEY`。
- **对话发图自动降级**：宿主插件提供可选 `imageFallback` 服务——当前模型不支持图片输入时，harness 的 prompt 准入把用户上传的图片交给本插件转为 VEP/2 文本后入会话（八模式意图、自适应预算、双图 diff、用量/余额行），原图保留为展示附件；依赖 harness 的 `ImageFallbackService` 接缝（见前置条件）。
- **模型/Base URL/区域**：设置文档覆盖默认值（`zai-org/GLM-4.5V`、`https://api.siliconflow.cn/v1`、`cn`），也接受 `VISION_MODEL` / `VISION_BASE_URL` / `VISION_REGION` 环境变量覆盖。

## 安装

```powershell
# 在 deepseek-harness checkout 下执行（源码 checkout 形态，需与 deepseek-prism/ 相邻）
pnpm dsh plugin --profile web add E:\Git\repositoris\DeepSeek_Prism\packages\plugin-dsh
# 或从发布 tarball 安装（包内已含 skill/ 素材，无需相邻目录）：
pnpm dsh plugin --profile web add <deepseek-prism-dsh-*.tgz>
```

首次 add 会初始化 profile（若尚未初始化）。安装后**重启 web 服务**使新行生效（`dsh` 组合无热重载）：

```powershell
pnpm dsh --profile web --port 8080   # 按你实际启动方式重启
```

### 前置条件：harness 配套改动（一次性，必装补丁）

插件依赖 harness 源码的配套改动，已打包为 `../harness-patch/dsh-prism-harness.patch`（设置白名单、发图降级接缝、文本模型图片剥离、前端 VEP 折叠与进度卡片；详情与重建命令见 `../harness-patch/README.md`）：

```powershell
# 在 deepseek-harness checkout 下
git apply <本仓库>\harness-patch\dsh-prism-harness.patch
```

应用后按补丁 README 的重建命令重建 host/client 产物并重启 web 服务。改动均为纯增量：设置白名单一行、`ImageFallbackService` 可选接缝（未挂载插件的部署行为不变）、图片块剥离（文本模型兜底）。

### 前置条件：开发依赖 link 路径（他人机器）

`package.json` 的 devDependencies 全部为 `link:` 指向本机路径（`C:/Users/.../.dsh/profiles/node_modules/*` 与 `E:/Git/.../deepseek-harness/node_modules/*`）。**在另一台机器上构建前**，先把这些路径改为你本机对应的 profile/harness 位置（harness 重建后其 node_modules 即有这些包），再 `pnpm install`。

重启后在 设置 → 插件 → 可配置 填写密钥与模型并保存，随后可直接在对话中上传图片（自动走 Prism 识别，原图保留在对话中、识别结果折叠为链接），或让模型使用 `prism_see` 按路径/URL 识图。

## 开发

```powershell
# 依赖：devDependencies 为 link: 指向本机 profile/harness node_modules；按需调整后
pnpm install            # 或手工建立 node_modules 联接
pnpm run build          # tsdown：lib/index.js（宿主）+ lib/client.js（浏览器）
pnpm run typecheck      # tsc --noEmit
pnpm run test           # node tests/host.spec.mjs tests/real-composition.spec.mjs
```

## 已知限制

- 工具不包含本地缓存（技能 CLI 的 SHA-256 缓存仅存在于 `vision.mjs see` 命令路径）。
- `prism_see` 默认不做工具级超时暴露（沿用 vision.mjs 的 45s / detail 150s）。

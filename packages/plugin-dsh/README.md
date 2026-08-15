# @yogemow/deepseek-prism-dsh

DeepSeek Prism 的 Harness 插件形态（DSH 主线）：一个**自包含 Cordis 组合包（bundle）**，经 `dsh plugin add` 安装进任意 profile，**不需要对 deepseek-harness checkout 打任何补丁**——harness 侧没有行被修改，上游更新不会冲突，`dsh plugin remove` 后不残留任何文件。

- **宿主插件**：`prism_see` 模型工具；纯文本模型图片准入（包装 `apiProxy.sessions.prompt`，把图片 prompt 转为 VEP/2 证据文本 + 已存附件指针）；可选 `imageFallback` 服务（harness 若具备该接缝则直接消费，与包装互为幂等兜底）；`deepseek-prism` 技能运行时注册（`ctx.skills.register`，资源在包内，不向 `~/.dsh/skills` 写副本）。
- **浏览器侧**：设置 → 插件 → 可配置 → DeepSeek Prism（识图）卡片。命名空间被 Web 设置白名单暴露时（打了 `dsh-prism-harness.patch` 的部署或未来上游合并）卡片可编辑；未暴露时卡片降级为配置指引（环境变量 / 行配置）。

视觉流水线复用同仓库 `deepseek-prism/scripts/vision.mjs`（prompt、Provider、解析、VEP/2 编译）。源码 checkout 安装时通过仓库相对路径在运行时动态导入（bundle 与 `deepseek-prism/` 技能目录相邻）；`npm pack`/发布形态由 prepack 把技能素材物化进包内 `skill/`，两种形态解析顺序为「包内 `skill/` 优先、仓库回退」。

## 功能

- **`prism_see` 工具**：模型传入图片路径/URL 与聚焦问题，返回 VEP/2 紧凑证据（`detail: true` 时输出分节报告）。
- **对话发图自动降级**：当前模型不支持图片输入时，插件把上传的图片转为 VEP/2 文本后入会话（八模式意图、自适应预算、双图 diff、用量/余额行），并把原图持久化为 harness 附件、以路径指针告知模型（可用 `prism_see` 对该路径补查）。原图块不再留在消息内容里，因此对任何 harness 代际（含未打补丁的 `llm-deepseek` 序列化器）都安全。
- **技能运行时注册**：`deepseek-prism` 技能随包注册，模型可经 skill 工具加载、用户可用 `/deepseek-prism` 手势；卸载插件即移除。
- **设置卡片**：白名单暴露时提供密钥/模型/Base URL/区域/用量与余额开关；API 密钥为写后即掩的 secret，任何响应都不会回传其值。

## 安装

```powershell
# 源码 checkout 形态（需与 deepseek-prism/ 相邻）：
dsh plugin --profile web add E:\Git\repositoris\DeepSeek_Prism\packages\plugin-dsh
# 或从发布 tarball 安装（包内已含 skill/ 素材，无需相邻目录）：
dsh plugin --profile web add <deepseek-prism-dsh-*.tgz>
```

安装后重启 web 服务使新行生效。卸载：

```powershell
dsh plugin --profile web remove @yogemow/deepseek-prism-dsh
```

移除依赖即移除 patch 层：行被卸载、fiber 释放全部注册（工具、技能、接缝服务、prompt 包装、设置命名空间、环境注入源），harness checkout 与 `~/.dsh` 均无残留。

## 配置（三种方式，按优先级）

1. **设置文档**：白名单暴露 deepseek-prism 的部署可在 Web 设置卡片中配置（写入 `$DSH_HOME/settings.yaml`）。
2. **行配置**：在 profile 自己的 `cordis.patch.yml` 中按 id 覆盖本行（不要改包内 `cordis.patch.yml`）：

   ```yaml
   - id: prism
     config:
       apiKey: sk-…        # 或省略密钥，改用环境变量
       model: zai-org/GLM-4.5V
       baseUrl: https://api.siliconflow.cn/v1
       region: cn
   ```

3. **环境变量**：`SILICONFLOW_API_KEY`（或 `VISION_API_KEY`）、`VISION_BASE_URL`、`VISION_MODEL`、`VISION_REGION`。宿主解析后会把非密钥值注入 `VISION_*`（模型运行的 `vision.mjs` 子进程可继承 base URL / model / region）；harness 会清洗子进程环境中的 `*_API_KEY` 类密钥变量，因此模型直接运行脚本时密钥需走技能自身的 `.env` 查找，或直接使用 `prism_see`（密钥在进程内传递）。

未配置密钥时，`prism_see` 与发图降级会抛出可操作的配置错误（不会被误报成"模型不支持图片"）。

## 开发

```powershell
# 依赖：devDependencies 为 link: 指向本机 profile/harness node_modules；按需调整后
pnpm install            # 或手工建立 node_modules 联接
pnpm run build          # tsdown：lib/index.js（宿主）+ lib/client.js（浏览器）
pnpm run typecheck      # tsc --noEmit
pnpm run test           # node tests/host.spec.mjs tests/real-composition.spec.mjs
```

## 已知限制

- **图片不再以原图块保留在消息中**：识别后消息内容为 VEP 证据文本 + 附件路径指针；对话不再显示原图缩略图（这是无补丁兼容的代价，`llm-deepseek` 对未打补丁序列化器会拒绝图片块）。想要原图展示 + 前端折叠/进度卡片的完整 UI 体验，可另打 `../harness-patch/dsh-prism-harness.patch`（可选、非必需）。
- 附件路径指针按 `@deepseek-ai/dsh-attachment-local` 的 v1 对象布局（`$DSH_HOME/attachments/v1/objects/<前2位>/<sha256>`）重建；若部署改用其它附件存储后端，路径仅作参考。
- 设置键被清空后，注入进程环境的 `VISION_*` 旧值保留到重启。
- 工具不包含本地缓存（技能 CLI 的 SHA-256 缓存仅存在于 `vision.mjs see` 命令路径）。
- `prism_see` 默认不做工具级超时暴露（沿用 vision.mjs 的 45s / detail 150s）。

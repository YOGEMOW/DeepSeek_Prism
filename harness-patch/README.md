# DeepSeek Prism — Harness 前置补丁

DeepSeek Prism 插件需要 deepseek-harness 源码的三处配套改动（发图降级接缝、文本模型图片剥离、前端 VEP 折叠与识别进度）。本目录的补丁把全部改动打包，方便在**官方 checkout** 上复现。

## 适用范围

- 补丁基于 **deepseek-harness @ 2026-08 本地 checkout**（`@deepseek-ai/dsh-host-apiproxy 0.1.0-rc.5` 一代）生成。
- 若你的 harness 版本更新导致 `git apply` 冲突，请按补丁内的 diff 手动合并（改动均为纯增量，语义见下文清单）。

## 应用步骤

```powershell
# 在 deepseek-harness checkout 根目录执行
git apply E:\Git\repositoris\DeepSeek_Prism\harness-patch\dsh-prism-harness.patch
# 若提示文件不存在（版本差异），改用 patch -p1 --binary < 补丁路径 并手动解决冲突
```

## 补丁包含的改动清单

| 文件 | 作用 |
| --- | --- |
| `packages/host/apiproxy/src/api-proxy.ts` | `WEB_SETTINGS_NAMESPACES` 白名单追加 `'deepseek-prism'`（设置卡片可读写）；`prompt` 准入新增可选 `ImageFallbackService` 接缝（`ctx.get('imageFallback')`：模型不支持图片且有插件挂载时转换放行，未挂载维持原拒绝，失败返回 `IMAGE_FALLBACK_FAILED`） |
| `packages/llm/llm-deepseek/src/serialize.ts` | 图片块由"拒绝（UNSUPPORTED_CONTENT）"改为**剥离**：消息中的图片是展示附件（fallback 保留原图供 UI 显示），发往模型的文本流保持纯文本 |
| `packages/client/ui-conversation/src/client/chat/MessageItem.tsx` | 用户气泡 VEP/1\|2 证据折叠链接（识别/对比前缀），用量行解析（tokens/balance/cost） |
| `packages/client/ui-conversation/src/client/chat/MessageItem.module.css` | 折叠链接与展开区样式 |
| `packages/client/ui-conversation/src/client/chat/ChatView.tsx` | 图片识别执行链进度卡片（`sendingCount` 驱动） |
| `packages/client/ui-conversation/src/client/chat/ChatView.module.css` | 进度卡片样式 |
| `packages/client/ui-conversation/src/client/input/{contract,facade,hub,machine}.ts` | `InputState.sendingCount`（发送在途图片数，普通发送走 default-sink、phase 恒为 plain 的替代信号） |
| `packages/client/ui-conversation/src/client/locales.ts` | VEP 折叠/用量/进度卡片文案（zh/en） |
| 测试文件（`api-proxy-models`、`serialize`、`chat-view`、`queue-dock`、新增 `message-vep.client.spec.tsx`） | 各改动配套用例 |

## 应用后重建

```powershell
# 在 deepseek-harness checkout 根目录
node node_modules\typescript\bin\tsc -b tsconfig.host.json
node node_modules\tsdown\dist\run.mjs --env.DSH_BUILD_FACE host --filter @deepseek-ai/dsh-host-apiproxy --filter @deepseek-ai/dsh-llm-deepseek
node node_modules\typescript\bin\tsc -b tsconfig.client.json
node node_modules\tsdown\dist\run.mjs --env.DSH_BUILD_FACE client
```

然后重启 web 服务（`pnpm dsh --profile web --port 8080`），再按仓库根 README 安装插件。

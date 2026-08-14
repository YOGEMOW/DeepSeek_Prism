# DeepSeek Prism — Harness 补丁包

DSH 主线插件（`packages/plugin-dsh`，`@yogemow/deepseek-prism-dsh`）依赖 harness 源码的配套改动，本目录提供**唯一补丁** `dsh-prism-harness.patch`（旧「最小补丁包」已随零补丁 B 架构主线一起废弃，见 `archive/plugin-dsh-zero-patch/`）。补丁为纯增量，包含：

1. **设置白名单**：`api-proxy` 的 `WEB_SETTINGS_NAMESPACES` 追加 `deepseek-prism`（设置卡片可读写）；
2. **发图降级接缝**：`api-proxy` 新增可选 `ImageFallbackService` 服务接缝——纯文本模型收到图片时由挂载的插件（本插件 `ctx.provide('imageFallback')`）转为 VEP/2 文本后准入，未挂载插件的部署保持原有 `MODEL_DOES_NOT_SUPPORT_IMAGES` 拒绝行为；
3. **图片块剥离**：`llm-deepseek` 序列化器把消息中的展示附件图片块剥离，模型请求保持纯文本（配合原图保留展示）；
4. **前端增强**：`ui-conversation` 的 VEP/1|2 折叠链接（识别/对比前缀 + 用量行解析）、识别执行链进度卡片（`sendingCount` 信号：input contract/facade/hub/machine）、文案与样式，及配套测试（serialize / chat-view / queue-dock / message-vep）。

## 补丁文件

| 文件 | 内容 |
| --- | --- |
| `dsh-prism-harness.patch` | 上述 ①–④ 全部改动（**主线唯一补丁，必装**） |

## 应用步骤

```powershell
# 在 deepseek-harness checkout 根目录执行
git apply <本仓库>\harness-patch\dsh-prism-harness.patch
# 版本差异导致冲突时：patch -p1 --binary < 补丁路径 并手动合并
```

## 应用后重建

```powershell
# 在 deepseek-harness checkout 根目录
node node_modules\typescript\bin\tsc -b tsconfig.host.json
node node_modules\tsdown\dist\run.mjs --env.DSH_BUILD_FACE host --filter @deepseek-ai/dsh-host-apiproxy --filter @deepseek-ai/dsh-llm-deepseek
node node_modules\typescript\bin\tsc -b tsconfig.client.json
node node_modules\tsdown\dist\run.mjs --env.DSH_BUILD_FACE client
```

重启 web 服务后：对话上传图片自动走 Prism 识别（原图保留在对话中、识别结果折叠为链接、执行链进度卡片在发送期间显示）；设置 → 插件 → 可配置 中可配置 DeepSeek Prism 卡片。

## 回退

```powershell
# 在 deepseek-harness checkout 根目录
git apply -R <本仓库>\harness-patch\dsh-prism-harness.patch
# 并按上述重建命令重建后重启
```

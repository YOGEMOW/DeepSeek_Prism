# DeepSeek Prism — Harness 补丁包（可选增强，非必需）

> **v0.7.0 起主线插件不再依赖任何 harness 补丁**：`packages/plugin-dsh`（`@yogemow/deepseek-prism-dsh`）为自包含 Cordis 组合包，`dsh plugin add` 安装、`dsh plugin remove` 卸载零残留，harness checkout 无需任何改动（上游更新零冲突）。
>
> 本补丁保留为**可选增强**：它把「原图块保留展示 + 前端 VEP 折叠/进度卡片 + 设置白名单（Web 设置卡片可编辑）」加回 harness（deepseek-harness 上游尚未提供这些扩展点）。不打补丁时，插件仍完整工作：图片转 VEP 证据文本入会话（原图以附件路径指针告知模型）、Web 设置卡片降级为配置指引（环境变量 / profile 行配置）。只有需要上述 UI 增强时才应用本补丁。

## 补丁内容

`dsh-prism-harness.patch` 为纯增量，包含：

1. **设置白名单**：`api-proxy` 的 `WEB_SETTINGS_NAMESPACES` 追加 `deepseek-prism`（Web 设置卡片可读写）；
2. **发图降级接缝**：`api-proxy` 新增可选 `ImageFallbackService` 服务接缝——纯文本模型收到图片时由挂载的插件（本插件 `ctx.provide('imageFallback')`）转为 VEP/2 文本后准入；插件同时包装 `sessions.prompt`，二者幂等互兜，未挂载插件的部署保持原有 `MODEL_DOES_NOT_SUPPORT_IMAGES` 拒绝行为；
3. **图片块剥离**：`llm-deepseek` 序列化器把消息中的展示附件图片块剥离，模型请求保持纯文本（配合原图保留展示）；
4. **前端增强**：`ui-conversation` 的 VEP/1|2 折叠链接（识别/对比前缀 + 用量行解析）、识别执行链进度卡片（`sendingCount` 信号：input contract/facade/hub/machine）、文案与样式，及配套测试（serialize / chat-view / queue-dock / message-vep）。

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

回退后插件照常工作（VEP 证据文本 + 附件路径指针 + 配置指引卡片），只是没有原图展示与前端折叠/进度卡片。

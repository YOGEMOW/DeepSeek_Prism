# DeepSeek Prism — Harness 补丁包

主线插件（`packages/plugin-dsh`，B 架构）以**零补丁**为默认：纯官方 harness 即可安装使用（文本指针降级 + 设置界面）。本目录提供**可选的最小补丁包**，用于启用三个增强 UI 特性：

1. **消息内原图展示**：降级消息保留 image 附件块（模型请求由序列化器剥离，纯文本流不变）；
2. **识别执行链进度卡片**：发送含图消息时在对话流显示"正在识别"卡片；
3. **VEP 折叠链接 / 用量显示**：识别结果折叠为链接，展开可见消耗（需配合插件的「VEP 转换」降级模式）。

## 补丁文件

| 文件 | 内容 | 用途 |
| --- | --- | --- |
| `dsh-prism-minimal.patch` | ① `api-proxy` 白名单加 `deepseek-prism-dsh`（设置卡片读写，一行）；② `llm-deepseek` 序列化器剥离 display-only 图片块；③ `ui-conversation` 折叠/执行链/发送在途信号（`sendingCount`）及配套测试 | **主线**：`packages/plugin-dsh` 的增强补丁 |
| `dsh-prism-harness.patch` | 旧「完整 UI 集成路线」补丁（含 `api-proxy` 的 `ImageFallbackService` 接缝，服务于已存档的 `dsh-plugin/` 技术储备） | 技术储备，一般不用 |

## 应用步骤（主线最小补丁）

```powershell
# 在 deepseek-harness checkout 根目录执行
git apply <本仓库>\harness-patch\dsh-prism-minimal.patch
# 版本差异导致冲突时：patch -p1 --binary < 补丁路径 并手动合并
```

## 补丁内容清单（minimal）

| 文件 | 作用 |
| --- | --- |
| `packages/host/apiproxy/src/api-proxy.ts` | `WEB_SETTINGS_NAMESPACES` 追加 `'deepseek-prism-dsh'`（仅一行，设置卡片可读写） |
| `packages/llm/llm-deepseek/src/serialize.ts` | 图片块由拒绝（UNSUPPORTED_CONTENT）改为**剥离**：消息中的图片是展示附件，模型请求保持纯文本 |
| `packages/client/ui-conversation/...` | VEP/1\|2 折叠链接（识别/对比前缀 + 用量行解析）、识别执行链进度卡片（`sendingCount` 信号：input contract/facade/hub/machine）、文案与样式 |
| 测试（serialize / chat-view / queue-dock / message-vep） | 各改动配套用例 |

> 说明：主线插件直接包装 `apiProxy.sessions.prompt` 公共 RPC，**不需要** api-proxy 的 `ImageFallbackService` 接缝（旧补丁才有）；`api-proxy` 在本补丁中仅加一行设置白名单。

## 应用后重建

```powershell
# 在 deepseek-harness checkout 根目录
node node_modules\typescript\bin\tsc -b tsconfig.host.json
node node_modules\tsdown\dist\run.mjs --env.DSH_BUILD_FACE host --filter @deepseek-ai/dsh-host-apiproxy --filter @deepseek-ai/dsh-llm-deepseek
node node_modules\typescript\bin\tsc -b tsconfig.client.json
node node_modules\tsdown\dist\run.mjs --env.DSH_BUILD_FACE client
```

重启 web 服务后，在插件设置中把「降级模式」切到 **VEP 转换**（需本补丁）即可启用原图保留 / 用量显示 / VEP 折叠；执行链卡片在补丁存在时自动生效。未打补丁时保持默认「文本指针」模式，行为与零补丁部署完全一致。

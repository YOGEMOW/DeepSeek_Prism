# @yogemow/deepseek-prism-dsh

DeepSeek Prism 的 DeepSeek Harness（DSH）插件（主线实现，零补丁默认）。

## 能力

- **技能运行时注册**：把包内 `deepseek-prism` 技能注册进 `ctx.skills`（资源基准指向包内素材，不写 `$DSH_HOME/skills` 副本），模型可经 skill 工具加载。
- **纯文本模型图片降级**（包装 `apiProxy.sessions.prompt` 公共 RPC）：
  - `pointer`（默认，零补丁）：图片持久化后以文本指针（内容寻址路径）进入会话，模型按技能指引运行视觉脚本；
  - `vep`（需最小补丁包，见 `../harness-patch/README.md`）：准入时直接生成 VEP/2 文本（八模式意图、自适应预算、双图 diff、用量/余额显示），消息保留原图附件（对话内展示）。
- **设置界面**：视觉 Provider / 模型 / 区域 / 密钥环境变量名 / 密钥（凭据库掩码写入）/ 降级模式 / 用量与余额显示开关。

## 安装

```powershell
pnpm dsh plugin --profile web add <本仓库>\packages\plugin-dsh
pnpm dsh --profile web --port 8080
```

## 开发

```powershell
pnpm install        # 建 cordis 测试 link（指向本机 profile）
node --test tests/plugin.test.mjs tests/real-composition.test.mjs
```

## 已知限制

- **`process.env` 注入不回滚**：设置生效时把密钥与 `VISION_PROVIDER/VISION_MODEL/VISION_REGION` 注入宿主进程环境（vision.mjs 子进程继承）；插件卸载后这些 env 保持（进程级副作用，bundle 常驻影响小）。
- **设置依赖为可选**：`dsh-settings`/`dsh-credentials`/`schemastery` 缺失时设置功能静默降级（日志告警），技能与降级不受影响。
- **prompt 包装为链式**：保存安装时的实现引用，dispose 时仅在自己仍是最外层时恢复；多个插件顺序包装时各自恢复，不丢失中间层。
- `vep` 模式依赖 harness 最小补丁（序列化器剥离图片块、ui-conversation 折叠/进度信号、设置白名单一行）；未打补丁时请保持 `pointer` 模式。

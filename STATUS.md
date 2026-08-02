# STATUS.md

## 已完成

- 三个参考仓库代码阅读与方案合成（observer 五模式 / vision.js 零依赖调用 / free-vision VEP + 降级 + 缓存）。
- SiliconFlow GLM-4.5V 接口实测（模型可用、盒子标记、reasoning tokens）。
- 项目目录、六份文档、AGENTS.md、.gitignore、.env 建立；Skill 骨架初始化。
- Skill 本体完成：SKILL.md（强制触发协议 + 查询模板 + 安全规则）、agents/openai.yaml、references/modes.md（五模式 detail 规范）、references/providers.md。
- `scripts/vision.mjs` 完成：see / providers / cache / doctor；VEP/1 编译与字符预算；本地模式推断；多 Provider 预设与自动降级；SHA-256 缓存（TTL 24h / 1000 条）；盒子标记剥离与容错 JSON 解析。
- 测试：12 项单元与 mock 端到端全部通过；skill-creator quick_validate 通过。
- 真实冒烟（SiliconFlow zai-org/GLM-4.5V）：error / ocr / ui 三类 VEP 输出正确，--detail 分节报告正确；修复紧凑 VEP 丢失 m 字段、模型照抄示例置信度两个问题。
- 安装：Skill 复制到 `C:\Users\YOGIMOV\.codex\skills\deepseek-vision`（含最终版 vision.mjs，不含 .env）。
- 提交：初始提交 `1a3f3d0`（17 文件；`.env` 与 `.vision-cache/` 未被跟踪）；临时克隆目录已清理。
- 首次真实用户测试（2026-08-02）：解释用户提供的 Unity Asset Store 截图，`--detail` 模式正确输出资源详情页的概述、对象、文本与数值。
- 第二次真实用户测试（2026-08-02）：基于 LSP 诊断截图给出解决方案；`--detail` 正确提取 Pyright reportMissingImports 诊断（auth.py 第 4 行 fastapi 导入失败）。
- 第三次真实用户测试（2026-08-02）：图表模式解读 Revenue/Earnings Trend 柱线复合图（3Q25–3Q26），正确提取各季度 Revenue 与 Adj EPS 数值及趋势。

## 进行中

- 无（v0.1.0 已完成）。

## 待处理

- Keychain / 自动裁剪 / 更多样例 / 远程推送（按需）。

# 第三方声明（THIRD-PARTY NOTICES）

本项目在设计与实现过程中参考了以下开源仓库。按各仓库许可证要求，保留其版权声明与许可文本；借鉴均为思路/协议层面的重新实现，未复制其代码。

| 仓库 | 许可证 | 版权 | 借鉴范围 |
| --- | --- | --- | --- |
| [lora-sys/free-vision-skill](https://github.com/lora-sys/free-vision-skill) | MIT | Copyright (c) 2026 lora-sys | VEP/1 紧凑证据协议（`a/t/s/m/o/e/v/c` 字段）、本地模式推断、SHA-256 缓存与多 Provider 降级设计 |
| [qtalen/agentic-ai-playground](https://github.com/qtalen/agentic-ai-playground)（`16_DeepSeek_Read_Images`，v0.16.0） | MIT | Copyright (c) 2025 Peng Qian | observer 五模式结构化输出 → 本项目 `references/modes.md` 五模式 detail 规范 |
| [asuojun/claude-vision-skill](https://github.com/asuojun/claude-vision-skill) | 未提供 LICENSE（默认保留所有权利） | — | 仅借鉴 OpenAI 兼容 `chat/completions` + base64 的调用思路；未复制代码 |

## MIT License（free-vision-skill）

MIT License

Copyright (c) 2026 lora-sys

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## MIT License（agentic-ai-playground）

MIT License

Copyright (c) 2025 Peng Qian

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 说明

- `asuojun/claude-vision-skill` 未提供 LICENSE 文件，按默认规则保留所有权利；本项目仅参考其展示的“OpenAI 兼容 API + base64”调用思路，未复制其实现。
- 本项目自己的许可证为 MIT，详见 [LICENSE](LICENSE) 与 [README.md](README.md)。

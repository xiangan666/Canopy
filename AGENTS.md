# Canopy 项目工作约定

- 自主选择有证据支持的最佳可行方案，按最高可达到的工程质量完成实现、验证和交付；普通技术决策不重复询问。
- 工作范围为本项目。修改前检查工作区与暂存区，保护现有改动、上游版权、原始安装包和世界数据。
- `package.json` 是版本事实源，上游基线为 1.6.3；运行 `npm run version` 同步包头、包依赖与 `PACK_VERSION`，不得改动包头 UUID。
- Windows 开发命令：`npm ci --ignore-scripts --no-audit --no-fund`、`npm run validate`、`npm test`、`npm run build`。支持 Node.js 22 / 24 / 26；详细验证边界见 [docs/testing.md](docs/testing.md)。
- 每轮实际修改，包括文档和工程配置，均须升版、更新 CHANGELOG、验证、提交并推送，再发布并核对 GitHub Release 及资产。纯只读任务不发版，同轮修改合并为一个版本。
- 发布仓库为 `xiangan666/Canopy`，工作流为 `.github/workflows/release.yml`，恢复步骤见 [docs/releasing.md](docs/releasing.md)。不得伪造发布结果、绕过保护规则、强推或移动已发布标签。
- 新文档使用中文，既有源码遵守原风格；翻译保留命令/规则 ID、占位符与格式代码。第三方来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 未在匹配的 Minecraft 客户端或服务端实际运行时，明确报告游戏内验证未执行。

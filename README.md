# Canopy 简体中文本地化版

[![CI](https://github.com/xiangan666/Canopy/actions/workflows/ci.yml/badge.svg)](https://github.com/xiangan666/Canopy/actions/workflows/ci.yml)
[![GitHub Release](https://img.shields.io/github/v/release/xiangan666/Canopy)](https://github.com/xiangan666/Canopy/releases/latest)

面向《我的世界》国际基岩版技术生存、红石测试和服务器维护的扩展包。本仓库维护 Canopy 的简体中文语言资源与原有中文运行反馈，保留上游的命令、规则、行为包和资源包结构。

- 本地化维护版本：**1.6.4**；版本事实源为 [package.json](package.json)。
- 上游基线：[ForestOfLight/Canopy v1.6.3](https://github.com/ForestOfLight/Canopy)。本仓库的版本独立递增，不表示上游已经发布同名版本。
- 成熟度：社区维护版；自动检查覆盖源码与发行包，游戏内兼容性需在匹配的客户端或服务端中验证。
- 本地化维护者：姓名 **相安**；邮箱 **[3199912548@qq.com](mailto:3199912548@qq.com)**。
- 原作者：**ForestOfLight**；许可证：**MIT**，保留原作者与第三方声明。

## 下载与安装

从 [GitHub Releases](https://github.com/xiangan666/Canopy/releases) 下载：

| 资产 | 用途 |
| --- | --- |
| `Canopy-v1.6.4-zh_CN.mcaddon` | 推荐给玩家，直接导入游戏 |
| `Canopy-v1.6.4-zh_CN-source.zip` | 完整源码、使用说明与开发工具 |
| `SHA256SUMS.txt` | 校验下载的两个发行文件 |

1. 备份准备使用的世界，用国际基岩版打开 `.mcaddon` 并等待导入完成。
2. 在世界设置中同时启用对应的行为包与资源包，将游戏语言设为简体中文。
3. 使用与下列脚本 API 相匹配的版本，启用客户端要求的 Beta API 等实验选项。
4. 进入测试世界，在聊天栏输入 `./help`。出现 Canopy 中文帮助即完成最小安装检查；原版斜杠命令使用 `/help`。

`./` 是 Canopy 默认的聊天命令前缀。清单最低引擎版本为 `[1, 26, 60]`，源码记录的目标游戏版本为 `1.26.60.5`；这些声明**不保证任意后续稳定版支持所用 Beta API**。本项目不提供网易版、Java 版或原生平台安装器。

| 游戏提供的脚本模块 | 清单版本 |
| --- | --- |
| `@minecraft/server` | `2.12.0-beta` |
| `@minecraft/server-ui` | `2.4.0-beta` |
| `@minecraft/debug-utilities` | `1.0.0-beta` |
| `@minecraft/server-gametest` | `1.0.0-beta` |

这些模块由游戏运行时提供，不通过 npm 安装到发行包。完整的[安装、升级、校验与回退步骤](docs/installation.md)和[故障排查](docs/troubleshooting.md)另见文档。

## 功能范围

- `./help` 帮助、Canopy 全局规则与 InfoDisplay 信息显示规则。
- 区域方块分析、距离与坐标工具、区块边界、光照和红石信号显示。
- 漏斗计数器、漏斗生成器、刷怪跟踪、实体密度和生命周期追踪。
- 模拟玩家管理、物品栏查看、快捷填充容器、窥视容器和耐久度提示。
- TNT、矿车、末影珍珠、活塞、爆炸、碰撞箱等技术向规则。
- 当前中文语言资源含 595 个键；构建时检查其他语言的键覆盖情况和与英文共有条目的占位符。

具体指令与参数以游戏中的 `./help` 为准。游戏功能与权限由原有 Canopy 实现决定；本轮工程整理的变化见 [CHANGELOG](CHANGELOG.md)。

## 从源码验证与构建

开发环境为 Windows、Node.js **22 / 24 / 26**、npm **10 或更新版本**，以及 PowerShell **7**（npm 构建入口）。`.nvmrc` 推荐使用 Node.js 24。打包脚本也支持 Windows PowerShell **5.1**，CI 包含对应的回归测试。项目没有 npm 第三方依赖，仍提交锁文件以固定工具入口的包元数据。

在仓库根目录运行，Shell 为 **PowerShell**：

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run validate
npm test
npm run build
```

只有 Windows PowerShell 5.1 时，可用以下命令代替 `npm run build`：

```powershell
powershell.exe -NoProfile -File .\tools\build.ps1
```

产物为 `dist/Canopy-v1.6.4-zh_CN.mcaddon` 和同名 `.mcaddon.sha256`。也可通过 `-OutputPath` 指定 `.mcaddon` 输出路径；输出不能位于 `source/` 中。构建使用临时文件，完成验证后替换目标；验证失败会保留已有产物。仓库根目录原有的 `Canopy-v1.6.3.mcaddon` 不参与构建与上传。

检查覆盖以下内容：

- 所有源码 JSON、包与模块 UUID 唯一性、互相依赖、版本同步和脚本入口。
- 6 种语言的重复键、语言清单、中文键覆盖及英文占位符一致性。
- 352 个 JavaScript 文件的语法、内部导入路径大小写及游戏模块依赖声明。
- 文档中的本地文件链接、发行包结构、必要文件、SHA-256，以及构建失败时的产物保护。

自动检查不能代替游戏内运行。当前验证边界与手工验收清单见[测试说明](docs/testing.md)。

## 项目结构

```text
source/
  Canopy[BP]/          行为包、脚本、实体、结构与随包说明
  Canopy[RP]/          资源包、界面、语言与纹理
tools/
  validate.mjs         源码、版本、本地化与内部链接校验
  sync-version.mjs     从 package.json 同步游戏内版本
  build.ps1            验证并生成 .mcaddon 与摘要
  publish.ps1          构建、草稿发布、资产核对与正式发布
tests/                 工程校验与打包回归测试
docs/                  安装、架构、测试、故障排查与发布说明
.github/               CI、标签发布、依赖维护和协作模板
dist/                  生成产物，默认被 Git 忽略
```

## 维护与贡献

本地化保留指令名、规则 ID、实体 ID、物品 ID、`%1` / `%s` 占位符与 `§` 格式代码；上游语言文件用于比对同步。已有脚本保持原有注释和命名，新文档使用中文。

提交问题请使用本仓库的 [Issues](https://github.com/xiangan666/Canopy/issues)，附上游戏版本、两个包的版本、复现步骤和内容日志。开发流程见[贡献指南](CONTRIBUTING.md)，结构与边界见[架构说明](docs/architecture.md)。每轮实际修改均更新版本和 CHANGELOG，并通过[发布流程](docs/releasing.md)发布 GitHub Release。

## 许可证与来源

本项目按 [MIT 许可证](LICENSE)分发。原作者 ForestOfLight 的版权声明、行为包与资源包许可证保持保留；中文本地化署名为相安。内置 jsep、MCBE-IPC 等来源与许可见[第三方声明](THIRD_PARTY_NOTICES.md)。

# 贡献指南

本仓库维护 Canopy 的简体中文本地化与工程交付流程，基于上游 v1.6.3。优先修复明确问题并保持包布局、UUID、API 依赖和命令契约稳定；上游功能同步应单独说明来源与兼容性。

## 环境与验证

使用 Windows、Node.js 22 / 24 / 26、npm 10+ 和 PowerShell 7。Windows PowerShell 5.1 可直接运行打包脚本。克隆后在根目录使用 PowerShell：

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run validate
npm test
npm run build
```

这些是本仓库实际的质量检查入口。项目不依赖 npm 安装 Minecraft 运行时，也不对第三方源码执行批量格式化；编辑器规则见 `.editorconfig`，Git 文本统一使用 LF。新增脚本应保留清楚的退出状态与超时，测试检查可观察行为。游戏内验收步骤见[测试说明](docs/testing.md)。

## 提交翻译与代码

- 翻译时保留语言键、占位符、换行和 `§` 颜色代码。新增玩家可见文案优先接入 `.lang`，在中文资源中补齐新键。
- 不直接修改内置 jsep 生成文件；更新流程见它自带的 README，许可同步见[第三方声明](THIRD_PARTY_NOTICES.md)。
- 包头 UUID 代表已有世界中的包引用，不得为普通版本更新重新生成。模块 UUID 必须彼此不同，且与包头 UUID 不同。
- 修改游戏逻辑时，提供复现步骤、正常与异常路径的验证；Node.js 语法通过不等于 Beta API 可运行。
- 编辑前检查 `git status --short` 与暂存差异，保留其他人的改动。显式暂存本任务文件，不使用整体清理、强推或覆盖既有标签。

从真实的 `main` 建立短期主题分支，例如 `docs/install` 或 `fix/pack-validation`，提交 PR。使用 Conventional Commits，例如 `fix(build): 保留验证失败前的构建产物`；仅关联真实存在的问题或评审。

PR 说明具体问题、最终行为、影响范围、实际检查结果与文档影响。未经游戏内测试时明确写出未验证项。公开问题反馈不得包含世界备份中的私人数据或凭证；非公开报告使用[安全说明](SECURITY.md)中的联系方式。

## 版本与发布

`package.json` 是版本事实源。维护、修复、构建与文档整理默认递增 PATCH；公共功能新增递增 MINOR，不兼容变更递增 MAJOR。版本指本地化维护版，不代表上游版本号。

每轮实际修改必须同步版本、CHANGELOG、文档，完成验证、提交与推送，再推送对应标签并跟进 GitHub Release 和资产核对。纯只读检查不创建新版本，同轮连续编辑统一发布一个版本。发布失败须报告具体阻塞，不能将本地构建视为已发布。

升级命令、标签与发布恢复步骤见[发布说明](docs/releasing.md)。维护者姓名为相安，邮箱为 3199912548@qq.com；保留上游作者、贡献者与许可证，不将工具或模型署为作者。

# 故障排查

## 找不到 Node.js 或构建拒绝版本

旧构建会在缺少 Node.js 时跳过语法检查，现已改为明确失败。使用 PowerShell 运行 `node --version`、`Get-Command node`，确认 Node.js 22、24 或 26 在当前 Shell 的 PATH 中；安装或切换后重新打开终端。npm 构建入口还需要 PowerShell 7，只有系统自带 5.1 时使用 `powershell.exe -NoProfile -File .\tools\build.ps1`。

## 路径含方括号导致文件未找到

`Canopy[BP]` 与 `Canopy[RP]` 中的方括号在 PowerShell 通配路径中有特殊含义。手工读取时使用 `Get-Content -LiteralPath 'source\Canopy[BP]\manifest.json'` 等字面路径。仓库脚本和测试覆盖了这一情况，不要为绕过问题重命名游戏包目录。

## 包或游戏内版本不一致

运行 `npm run version`，使两个包头、包依赖与 `PACK_VERSION` 从 `package.json` 同步；`package-lock.json` 应由 `npm version ... --no-git-tag-version` 或 npm 的锁文件命令同步。再执行 `npm run validate`。不要手工改变 UUID 来消除版本错误。

## 资源包模块 UUID 冲突

原始本地化工作版本的资源模块 UUID 与行为包头 UUID 重复。1.6.5 为资源模块分配独立 UUID，保留两个包头 UUID。确认同时升级两个包，并检查世界中没有混用同 UUID 的上游版或旧缓存。包头与模块唯一性约定见 [Minecraft 官方清单参考](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest?view=minecraft-bedrock-stable)。

## 中文键或占位符检查失败

校验输出会列出缺失键、重复键或占位符不一致的键。核对 `texts/languages.json` 与实际语言文件；补译其他语言新增的键。占位符必须保留数量和编号，不将 `%s` 翻译为中文，也不删除重复参数。修复后重跑 `npm run validate`。

## 游戏提示缺少 Beta API 或没有中文帮助

最低引擎版本不是完整的 API 兼容保证。按清单核对游戏实际提供的模块版本和实验选项，检查行为包、资源包是否同时启用，游戏语言是否为简体中文，并查看内容日志。保留具体日志和版本信息，按[问题模板](https://github.com/xiangan666/Canopy/issues/new/choose)反馈；不能仅凭打包成功判断游戏运行正常。

## Release 工作流失败或只留下草稿

先在 [Actions](https://github.com/xiangan666/Canopy/actions/workflows/release.yml) 找到具体失败步骤，核对提交、远程标签、仓库权限及资产列表。未正式发布的草稿可按[发布恢复步骤](releasing.md)重试；已发布版本不覆盖资产、不移动标签，修复通过新版本交付。

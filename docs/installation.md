# 安装、升级与回退

## 运行前提

本扩展包面向《我的世界》国际基岩版。两个清单要求最低引擎版本 `[1, 26, 60]`；源码 `MC_VERSION` 记录目标版本 `1.26.60.5`。实际使用还要求游戏提供清单声明的 Beta API，模块与精确版本见[根目录说明](../README.md)。最低引擎版本本身不能证明所有后续版本兼容。

请先在世界副本中验证，再用于长期存档。行为包和资源包应来自同一次 Release，使用简体中文并启用匹配客户端要求的 Beta API / 实验选项。CI 不包含游戏客户端或服务端，因此没有自动证明实际游戏内可运行。

## 下载与完整性校验

从[正式 Releases](https://github.com/xiangan666/Canopy/releases)下载同一版本的 `.mcaddon` 与 `SHA256SUMS.txt`。开发者可另外下载 `-source.zip`；GitHub 自动生成的 Source code 链接不能代替已构建的 `.mcaddon`。

以下命令使用 **PowerShell**，工作目录为下载文件所在目录：

```powershell
$addon = @(Get-ChildItem -LiteralPath . -Filter 'Canopy-v*-zh_CN.mcaddon' -File)
if ($addon.Count -ne 1) { throw '请只保留本次待校验的一个 .mcaddon 文件。' }
$addon = $addon[0]
$record = @(Get-Content -LiteralPath .\SHA256SUMS.txt |
    Where-Object { ($_ -split '\s+', 2)[1] -ceq $addon.Name })
if ($record.Count -ne 1) { throw '找不到唯一的摘要记录。' }
$expected = ($record[0] -split '\s+', 2)[0]
$actual = (Get-FileHash -LiteralPath $addon.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -cne $expected) { throw 'SHA-256 不匹配，请重新下载同一 Release 的文件。' }
Write-Output 'SHA-256 一致，可以导入。'
```

摘要只检查下载文件与 Release 中的记录是否一致，不单独证明发布者身份。源码归档可使用同样方法校验，选择对应文件名即可。

## 最小安装检查

1. 备份世界，使用国际基岩版打开 `.mcaddon`，确认行为包与资源包均完成导入。
2. 在世界的活动行为包与活动资源包中分别启用对应的 Canopy 中文包，不要混用不同版本。
3. 按客户端提示配置所需实验选项，使用简体中文进入世界。
4. 在聊天栏输入 `./help`，确认出现 Canopy 中文帮助；使用内容日志检查是否存在脚本加载错误。
5. 按[游戏内测试清单](testing.md)检查需要使用的工具。测试结束后再决定是否用于正式世界。

服务器安装时将对应行为包、资源包和世界包引用一并更新，依服务端实际目录和管理流程操作。本仓库不包含通用服务器部署程序，也不擅自修改服务器配置。

## 升级与数据保护

升级前保存完整世界备份及上一版两个包的文件。停止正在使用该世界的客户端或服务端，再同时替换两个包，检查清单和内容日志。

两个包头 UUID 保持上游值，因此已有世界引用可以继续匹配，但同 UUID 的上游版与本地化版会发生身份冲突，不能同时启用。1.6.5 只修正资源模块的重复 UUID，不更换包头 UUID，不引入世界存储格式迁移。

本地化维护版与上游版本独立递增；不得仅按同名数字判断功能或运行时 API 一致。

## 回退

出现异常时先保留当前世界副本和内容日志，再恢复上一版的行为包、资源包与升级前的世界备份。仅替换脚本不能保证撤销游戏运行期间产生的方块、实体、规则或动态属性变化。构建与发布工具只读源码、写入 `dist/`，不会自动部署到世界或覆盖根目录的原始上游安装包。

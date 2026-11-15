# 版本与 GitHub Release 流程

## 事实源与权限

目标仓库为公开的 [xiangan666/Canopy](https://github.com/xiangan666/Canopy)，默认分支 `main`。`package.json` 是本地化维护版的版本事实源；清单和脚本版本由 `tools/sync-version.mjs` 同步，`package-lock.json` 由 npm 管理。上游基线仍为 1.6.3。

维护者使用 Windows、受支持的 Node.js / npm、PowerShell 7、Git 与 [GitHub CLI](https://cli.github.com/)，并使用已有登录态。不要将令牌写入仓库或命令日志。GitHub Actions 默认 `contents: read`，只有发布 job 使用 `contents: write`；工作流中的远程 Actions 固定到核实过的完整提交 SHA，Dependabot 负责提出后续更新。

普通维护、文档与构建整理默认升 PATCH，公共功能新增升 MINOR，不兼容变更升 MAJOR。每轮实际修改都必须发布；连续编辑、验证修正和发布准备合并为同一版本。历史本地工作版本没有已知发布日期时保留真实说明，不伪造旧 Release。

## 准备候选提交

在干净的主题分支上实现修改，保留他人改动。以下示例使用 **PowerShell**，工作目录为仓库根目录；`patch` 可按实际兼容性改为 `minor` 或 `major`：

```powershell
npm version patch --no-git-tag-version
npm run validate
npm test
npm run build
```

`npm version` 会同步 `package.json`、锁文件，并通过 version 生命周期同步两个包头、包依赖和 `PACK_VERSION`。模块 UUID、包头 UUID 和脚本 API 版本不因普通维护发版改变。

实现阶段将变化写入 `CHANGELOG.md` 的 `Unreleased`。确认验收通过、准备发布时，将条目整理到 `## [X.Y.Z] - YYYY-MM-DD`，保留空的 `Unreleased`，日期用实际发布日。维护版本和比较链接，更新 README 中的当前版本及受影响文档。若发布受阻，准确记录未发布状态。

审阅差异，显式暂存本轮文件并使用 Conventional Commits 提交。通过 PR 和仓库实际要求的检查合并到可发布提交；不绕过分支保护或编造评审。新仓库首次导入可以建立基线提交，再提交本轮维护版。

## 推送与自动发布

先推送候选提交，等待 main 的 CI 检查通过，再从对应提交创建版本标签。以下命令使用 **PowerShell**：

```powershell
$version = (Get-Content -LiteralPath .\package.json -Raw | ConvertFrom-Json).version
$tag = "v$version"
git tag -a $tag -m "Canopy $tag 简体中文维护版"
if ($LASTEXITCODE -ne 0) { throw '创建标签失败。' }
git push origin $tag
if ($LASTEXITCODE -ne 0) { throw '推送标签失败。' }
gh run list --workflow release.yml --limit 5
```

标签触发唯一的 `.github/workflows/release.yml` 发布入口。它检出标签、运行校验和测试，再调用 `tools/publish.ps1`：

1. 要求工作区干净，版本、当前提交、本地标签和远程标签一致。
2. 构建 `.mcaddon`，从候选提交执行 `git archive` 生成完整源码归档。
3. 从对应 CHANGELOG 版本节生成发布说明，计算两个发行文件的 `SHA256SUMS.txt`。
4. 使用已存在的远程标签创建草稿（`--verify-tag`），上传三个资产，下载后核对名称、大小、SHA-256 和可用的 GitHub digest。
5. 正式发布为稳定版并显式标记 latest，再次下载核对。启用不可变发布的仓库还执行 `gh release verify`。

预期资产为 `Canopy-vX.Y.Z-zh_CN.mcaddon`、`Canopy-vX.Y.Z-zh_CN-source.zip`、`SHA256SUMS.txt`。源码归档含 README、许可证、文档、工具和测试，不包含 `.git`、本地原始上游安装包、缓存或凭证；没有 Git LFS、子模块或需额外下载的 npm 构建依赖。发行资产的实际内容与摘要才是验收证据，GitHub 自动源码链接是补充。

构建固定 ZIP 条目时间戳；相同字节输入和运行时下可比较重复构建，不承诺不同运行时逐字节一致。检查点和权限边界见[测试说明](testing.md)。

## 失败恢复与完成核对

CI 失败时修复根因并重跑受影响检查；不要降低门槛。首次正式发布前允许修正候选提交，但不要强制移动已有远程标签。发布流程在已有草稿上恢复上传与核对；已正式发布时仅验证，不覆盖资产。

在 Actions 的 Release 页面选择 Run workflow，输入已存在的标签，可以恢复该标签的发布。也可用 PowerShell 和 GitHub CLI：

```powershell
gh workflow run release.yml -f tag=v1.6.4
```

本地诊断或明确需要恢复时，可在已经检出的干净标签上调用同一个入口，而不是另建第二套发布流程：

```powershell
pwsh -NoProfile -File .\tools\publish.ps1 -Tag v1.6.4
```

资产核对不符时保持草稿并排查，不将草稿描述为正式版本。已发布版本的问题通过下一个版本修复，不删除历史、不重用同名标签。远程标签存在但需要更换候选时，应保留标签并选择新的版本，不能强制改写。

完成后核对 Release URL、`draft=false`、`prerelease=false`、latest 标签、发布提交，以及三个资产的名称、大小与下载内容。向使用者报告旧版本 → 新版本、提交 SHA、标签、Release 链接、真实测试结果与尚未执行的游戏内验收。没有发布成功时明确写“修改已完成，发布未完成”，并说明具体阻塞。

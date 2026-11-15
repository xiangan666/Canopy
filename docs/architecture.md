# 架构与维护边界

## 包与运行时

`source/Canopy[BP]` 是行为包，`manifest.json` 声明数据模块和 `scripts/main.js` 脚本入口。`main.js` 导入命令、规则和启动逻辑，注册功能；`src/commands` 提供命令入口，`src/rules` 定义规则，`src/classes` 实现工具与会话。`lib/canopy` 包含命令、帮助与规则基础设施，其他 `lib` 子目录为内置组件。

`source/Canopy[RP]` 是资源包，提供语言、界面、纹理和雾效果。`texts/languages.json` 列出资源语言，`zh_CN.lang` 维护中文，其他语言作为上游比对资料保留。行为包通过语言键和游戏消息格式获取文本，部分原有中文运行反馈仍位于脚本中。

两包使用包头 UUID 与版本互相引用。脚本从游戏提供的 `@minecraft/*` 模块取得运行能力；这些不是本仓库的 npm 依赖，Node.js 只承担工程校验和测试，不执行游戏初始化代码。

## 版本与构建数据流

```text
package.json version
  -> tools/sync-version.mjs
  -> 两个 manifest.header、包依赖、游戏内 PACK_VERSION

source/ + 版本元数据
  -> tools/validate.mjs
  -> tools/build.ps1 的临时归档
  -> 校验归档 -> dist/*.mcaddon + *.mcaddon.sha256

已推送的候选提交与版本标签
  -> Release 工作流 -> 验证与测试 -> tools/publish.ps1
  -> 源码归档 + SHA256SUMS.txt -> 草稿资产下载核对
  -> 正式 Release -> 再次下载核对
```

`package.json` 是本地化维护版本事实源；`package-lock.json` 固定包元数据，`npm version ... --no-git-tag-version` 通过 version 生命周期同步运行时副本。模块自身的接口版本不随维护版机械变动。上游基线保留在 README、CHANGELOG 与第三方声明中。

## 实现取舍

- 保留上游目录、游戏逻辑与许可证，避免为工程整理移动 352 个脚本或整体重排第三方代码。
- 校验器只依赖 Node.js 标准库，检查 JSON、UUID、版本、语言、语法和静态模块路径；保留 Bedrock 已有的无扩展名与从 `scripts/` 根目录导入方式。
- 构建脚本保留 PowerShell 5.1 兼容入口，所有带方括号的文件系统操作使用字面路径或 .NET API。发布入口使用 PowerShell 7 与 GitHub CLI。
- 构建先验证，再写临时文件；归档完成后替换目标，避免验证失败破坏已有包。归档和其摘要文件是顺序替换，不宣称它们构成跨文件事务。
- ZIP 使用排序条目和固定时间戳，保证相同文件字节与相同运行时下重复构建可比较；不同换行、操作系统或压缩运行时可能产生不同字节，不承诺跨环境逐字节一致。
- GitHub 发布只接受已提交、已推送且版本一致的标签；草稿可恢复上传，已发布资产不覆盖。上游原始 `.mcaddon` 不纳入 Git 或源码归档。

游戏内的存储、事件与权限继续由现有 Canopy 实现负责。本轮不修改世界数据模型，不引入后台服务、数据库、部署平台或网络 API。

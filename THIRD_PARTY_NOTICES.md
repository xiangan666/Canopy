# 第三方来源与许可证

本文件记录仓库中可由现有文件核实的来源，不将本地化维护者署为上游代码作者。发行时保留相应原文。

| 组件 | 位置 | 来源与许可 |
| --- | --- | --- |
| Canopy | `source/Canopy[BP]`、`source/Canopy[RP]` | 基于 [ForestOfLight/Canopy](https://github.com/ForestOfLight/Canopy) v1.6.3；MIT，Copyright (c) 2024 ForestOfLight。根目录与两个包中的 LICENSE 保留原文。 |
| 简体中文本地化 | 语言资源、原有中文反馈和本仓库维护文档 | 相安，2026；根目录 LICENSE 含中文本地化版权声明，MIT。 |
| jsep | `source/Canopy[BP]/scripts/lib/jsep/` | v1.4.0 ESM 构建；[上游固定版本](https://github.com/EricSmekens/jsep/tree/v1.4.0)，MIT，Copyright (c) 2013 Stephen Oney。原始许可已补充到该目录的 LICENSE。 |
| MCBE-IPC | `source/Canopy[BP]/scripts/lib/MCBE-IPC/` | `ipc.js` 文件头自带完整 MIT 许可，Copyright (c) 2025 OmniacDev；保留该声明。现有文件未记录独立版本号，因此不填写推测版本。 |
| Vector 与 EntityItemDatabase | `source/Canopy[BP]/scripts/lib/` | 随 Canopy 基线内置；Vector 文件标注作者未知，不补写或替换原作者。当前未记录可独立核实的版本或仓库地址。 |

jsep 的新增 LICENSE 来自固定版本的[原始许可文件](https://raw.githubusercontent.com/EricSmekens/jsep/v1.4.0/LICENSE)，没有改写许可条款。更新该组件时按其自带 README 操作，并同步核对构建文件、版本、LICENSE 和本表。

`@minecraft/server`、`@minecraft/server-ui`、`@minecraft/debug-utilities`、`@minecraft/server-gametest` 由游戏提供；本发行包不包含这些运行时实现，也不将本项目 MIT 许可用于声明第三方游戏的授权。

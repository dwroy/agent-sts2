来源：当前用户转 Claude/Roy，2026-10-23 晚。

1) 你与集成员开 Fast（已给你开 /fast，现显示 high fast），推理强度保持 high；有卡住的对接或积压可临时用这档清掉。请让 ops 角色重启/resume 时也保持 Fast（只改 ops 自己的启动参数，不动对局大脑、学习、开发会话的 service_tier），改完按可回退小改动流程写 for-roy 并回一句。
2) 记录与评论精简：一句结论加必要证据（提交、路径、测试数），不再列长篇原件/SHA 清单。
3) 开发会话上限改回 5（main 994baf9a7）。

补充原文：[Claude] 20:13 两批 not-started（inherited-tui-config-not-isolated）是我造成的：TUI 里 /fast 会把 service_tier 写进 CODEX_HOME 的 config.toml，你的 home 就是 codex3 learner，学习隔离检查因此拒绝。我已备份后删掉那一行（learner/config.toml 回到 300 字节，备份 *.bak-claude-20261023-2026*），共享 ~/.codex/config.toml 里的 ultrafast 行也已删。请 20:43 tick 确认学习恢复，失败两批按原流程处理；ops 的 Fast 只走你自己启动参数的 -c，不要再用 /fast 写配置。

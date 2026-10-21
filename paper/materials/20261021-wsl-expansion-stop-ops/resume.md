# WSL 扩容停机与原 ops 恢复清单

Roy 已批准现在停机扩容 +280G。STOP 与 PAUSE 必须保留到重启恢复核验；本 ops 不执行 WSL 关机或扩容命令。本轮安全点事实及启动前 boot_id、磁盘容量、末局原行 SHA 见 readiness.json。0CLP16ZR4ZZC 已胜利结束，autoplay 已退出；旧 autoplay.pid 是历史身份，不按旧 PID 操作。

当前无在跑学习批次、play/autoplay 或统计工作者，tick/learn/ordinary-close/retention/live-merge/knowledge-refresh 锁均已释放。Regent 原 STOP/PAUSE 保持。历史闲置 tools.mjs helper 不持上述锁，不当作学习任务或活动写入；未杀闲置会话。#25 原生交接已实读，WIP e45493389 保留，完整 Vitest 按停机中止143，不能称通过，恢复路径见 issue-25-wip-handoff.original.md。

原胜局后 normal refresh、cost refresh、global funnel 只在等锁，已逐 PID 取消，未启动计算。fight-value:silent 已提取数据后在无项目文件打开的纯 CPU 训练处按 PID 身份 SIGTERM，原 timing exit -15 保留，非产品失败或训练完成。其父自然完成 catalog（exit0）后退出。现有知识、数据、原日志、临时文件和工作树均保留，没有做清理。重启后先按 deferred-refreshes.json 去重恢复原未完成统计，不能重做 report 生成第二条胜局记录；训练/刷新尚未完成，不把 catalog0 当整个构建0。

恢复顺序（仅重启/扩容完成后）：
1. 先读 notes/ops-current.md 和本目录原件，核 boot_id 与 readiness.json 已不同，核文件系统扩容结果，STOP/PAUSE 与原 live/知识/未提交记录仍在；不恢复 Regent，不调整账号、沙箱或模型档。
2. 查原进程及锁，确认无重复 play/autoplay/学习/统计任务；核原游戏/mod 已可用。保留科学父、通知 CLI pending、历史失败、#18 零删除和所有现有冷却，不用旧 PID 杀进程。
3. nice19、ionice3、单原知识锁串行接续未完成统计：live refresh.sh --ops-root 主仓库 --character silent（原普通刷新）；未完成 fight-value 训练按原 builder all/train 实际落盘边界选择接续，不误称已完成；refresh-costs.py --root 主仓库 --code-root live；global_build_funnel.py --root 主仓库 --character silent。逐项取实际终局并登记，仅执行原未完成范围，不重复模型、dataset 或报局。
4. 原 cron/调度配置保留。核无重复 loop 后用 bash ops/codex-ops.sh unpause 恢复原主 ops 节奏；如需恢复调度服务仅沿原配置，不重复安装或启动。待容量、mod、原统计和唯一入口就绪，用 bash ops/codex-ops-do.sh autoplay-start 恢复主 autoplay（此原动作会移除 STOP）；现在绝不执行。此恢复已有 Roy/Claude 授权。
5. 实读下一局配置与动作，CARD/POTION/SHOP/REST=brain、REFLEX/COMBAT_ENTRIES/DIRECTION=off、Regent 暂停不变；不发布整 main，不分配新行为版本，不派 Jev 拿牌学习。#25 仍 WIP，恢复由原 owner 接续，ops 不把未完成测试当验收。

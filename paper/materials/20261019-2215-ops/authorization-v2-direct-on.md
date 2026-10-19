# Roy / Claude 2026-10-19 22:21:44 CST 更正：直接 V6 开启运行

本授权 v2 取代 authorization.md 的第5项，以及所有影子健康检查/等额外on确认的旧安排。依据 main 601160a34 docs/v6-plan.md 第9节恢复运行与上线安排及 watcher 最新用户指派。

1. 不开 V5 局、不开影子局。W5 与 B（含 W5/W7 共用生产请求工厂）合入、live 按 Nova 重建后，并且校准完成或在对局期间降到 ≤4 进程，由 ops 移除 STOP，Silent A10 直接 V6_BUILD=on、V6_CARD_DECIDER=jev、V6_POTION_DECIDER=jev，出牌条目开启。商店/休息等 W7 合入后的下一局开启。正式知识发布前 W3 使用 construction-templates 要求签名过渡组合，不能因正式知识尚未发布而自动延迟此授权。
2. 开启时沿原 live-merge.lock 登记 V6 release_id 与规则变更通知。Jev 为 Nova typesafe/jev-1.14 Decisions，DeepSeek 为 Nova deepseek/deepseek-flash，无自费回退；key只文件加载不打印。首批V6局由Claude监督，出现报错/超时/卡住按开关回退，不自行转成影子验收前置。Regent仍暂停。
3. 核学习闭环：每局复盘、策略提案、经验更新能实际读到 logs/v6-build.jsonl 和 Jev decisions 记录；W2.2 生成器能在局间刷新组合指标并更新冻结历史包。watcher正在只读核接口/缺口，缺口入当前清单，不把排队/任务报告当正式入库。
4. 原ops线程/账号/high、原cron、Herdr托管、学习自动派发/回收、在途校准/核心卡R2禁止复派、正式发布经学习者和消费者读回等继续按原授权。当前W5与共用请求工厂尚未交付，保持STOP直到上述上线条件满足。

请立即纳入 notes/ops-current.md；收到后回执v2授权已经取代影子安排。watcher会继续B，不开局。

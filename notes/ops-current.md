# 运维当前清单（调度器生成；索引模式）
生成：2026-10-22T07:44:08+08:00；原件索引：/home/dw/Projects/agent-sts2/ops/codex-ops/current.json SHA256 e885d53b2f1114860440996a1ae234bfebed31204d7dce97b75de437002cbba2
main f4545ae2a0376b00be16d9a61bcd2148d51111d8
live 0cd3629d3a7f3a3bcacd22fa0a4206acc4d81e78；登记 release 见 current.json.release（不代表检查绿或实际采用）。
动态事实超出短清单预算，已完整保存在上述 SHA 的 current.json；没有截断授权、失败、任务或事件。
处理前必须核 SHA 并逐项读取以下字段及其原件；本清单不代表已经读过授权，不可沿用旧清单：
- restoration_context：完整 summary、authorization 路径/SHA、takeover_receipt、external_tasks；先核授权原文与失败回执，缺失或冲突时停止并保留待办。
- identity、home_selector、execution：原账号、pane/session、执行模式；不以默认配置推定实际生效。
- active_batches：在途 3；完整 owner/线程/PID/租约/路径，不重复派发或按旧 PID 操作。
- open_requests：开放父要求 7；不因本轮结束关闭。
- pending_notices：未确认 9；按本事件 notice id 核原件，不代其他角色 ACK，不把排队当送达。
- queued_events：队列 8；只处理本轮已提交事件，按路径及 sources 的字节数/SHA 核全文，不以 preview 代完整事件。
- not_marked_completed_transactions：未标 completed 189；保留未知/失败与原件引用，不推定活进程或成功。
- historical_lost：历史 8；不自行关闭；human_pace、transactions、recent_directives、inbox_tail、sources、missing：按事件定位未完成事务及指令的 offset/bytes/SHA，缺项不冒当前。
首次另读 AGENTS/README/最新 STATE/学习协议；历史 handoff/decision-log 只沿事务定位，摘要冲突查原件。
模型 gpt-6.1-sol；普通 ops/学习下次自然启动 high，专项有理由 xhigh，大脑 xhigh；实际档位须原生回执。不热切在途会话。
只处理原事件，不新增轮询/模型/局/计时器；STOP、恢复开局及角色授权必须按 restoration_context 原文核实，regent 保持暂停。
不读凭据/.env/游戏二进制，不改共享配置/账号/ops prompt，不推送。
H0/0332 等科学边界、精确宿主树、发布/兼容与 retention 沿原报告核实；索引不代验收、shipped、覆盖率或消费。
严格普通无源码成功仍须原调度器账本检查、唯一 dataset、受控记录提交及 ordinary-close 回执；异常/异议/缺证/人工决定正常唤醒。
普通记录300–500字并附原件路径；不复制报告，通关/升级照旧。

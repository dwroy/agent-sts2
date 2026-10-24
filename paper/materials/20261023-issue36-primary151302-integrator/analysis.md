# #36 普通151302主组收尾与 MC 整项 duplicate 异议读回

[watcher] 实读 ops 评论 6359997957；独立读回见 readback.json，原异议未改写保存在 original-mc-scope-dissent.json。

原生 session/turn、一次 prompt marker/SHA、bootstrap 和完成消息经现有 verify_native 纯读校验通过；实际 turn_context 为 gpt-6.1-sol/high/workspace-write。原 TUI rc0/native-task-complete、wrapper done/rc0 与 learn.json 原批次 canonical SHA 相同。原生和 supervisor 的原 PID/birth 已结束，原 lease 非阻塞取得后立即释放。主组可单独计入自然收尾。

原回收 manifest SHA 核同；checkout 已退、worktree 未登记，分支仍指向原 9bbc70f。60 份 scratch 文件共 205084211 字节保留，报告、提案、账本检查及读回原件 SHA 均同。未重测历史磁盘释放量。原报告无源码修改，tests 全 null、merged=null；一项已有 live 窄实现、九项 waiting，32 条既有账本链接为原 ops 选取口径，不新增支持分母。

转告 Roy：silent-proposal-e7ed37db21fc698a / silent-0324 的整项 duplicate 范围过宽。live d1f523bb 中手牌修复祖先存在，但药水 MC 补线 8ed7001347cedd668ddf82e308df56653074be85 不是 live 祖先；当前 poolCardModel 的 ctx 无角色/进阶，modelHandCard 调用亦未传该上下文。非祖先本身不排除等价实现，但消费者读回和原 pending integration completed=false 一起，不足以认定整项已完成。保留整项 waiting，由原 owner 沿原联合输入核 main/live/实际消费者，不重复开发，不拿旧独立 full 代当前组合通过。原 134302 duplicate 报告与旧失败记录保留。

ops 在 notes/for-roy.md、ops/inbox-dev.md 双写的两行原文已逐字核对；watcher 在当前会话明确转达 Roy，独立记录自身接收与转达，不修改原通知或代填任何角色 ACK。

二组原 bindings0/code75 原件保持不变；本次不采样其后续完成，不收 pane 或重开模型。下一批自然派出及科学父尚未验收，#36/#20 保持开放。#46 原窗口 [2026-10-23 13:46:30, 2026-10-24 13:46:30) 不变。本次仅记录，无生产修改或新 full。

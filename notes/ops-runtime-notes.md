# 运维运行笔记

2026-10-24，#56 6384926225：只改未启动的 plan，不补写在途 batch 行。

`learner/lib/startup-recovery.ts:captureStartupLease` 对整行 batch 注册值和原监督 PID birth 做哈希。即使只加 `external_lane` 也会改变租约，令原监督退出，关闭完成与自动续接；模型可能仍在原线程继续，不能据 wrapper rc75 判它没完成。

lane、policy 等派发字段由原 dispatch 在启动前一次登记。运行中仅沿原状态机和原租约事务操作，不以“元数据不改输入”为由手改注册行；未启动的 plan 可以按授权冻结新输入。接异常先核原生 session/turn、末回合、空输入、PID/birth 与实际产物；已有完整结果不重派。新监督需归档原字节并核新 epoch，不能覆盖旧失败或把进程消失当退休证明。

缺身份且无法补证的历史任务，仅按具体主管裁决记 `abandoned-unverifiable`，不记 done、不计产出；原回执、tab、worktree、草稿与过程产物保留。此例授权为 #56 评论6384926225，只适用列明的三批，不作为其他未知任务的自动放行规则。

原件：paper/materials/20261024-211311-attention-ops/lease-root-cause.json，paper/materials/20261024-211311-own-abandon-ops/。

[watcher] 已按本轮要求登记 P1 门修 #52，正常看板接原 #48/#51 代码；本轮不手开开发/学习会话。

已独立核对 shared.priority_hold：空副本 false，仅缺树校准标记 true，仅无已结束证据的 queued 审计 true，两标记 true；普通 writer 等待仍 true。固定探针没有修改实际 state、启动模型或 full。#52 要求与原派发条件共用可派性判断，保留旧请求/失败/证据/重试/lease，并覆盖实际可派任务和两个消费者的正反回归。

唯一检查安排：先 #52 候选核验及冻结，原集成员/ops 分配唯一窗口；请原 ops 保持 #28 R423 净组合 b30925f 的 new full=0，等 P1 窗口释放。此前 main 的 679 文件/6643 过/2 跳过 full 只属于原 main 树，不能覆盖净组合的 180 源叶差异，也不能覆盖未交付的 #52。不同输入必须分别核合同并串行安排，不重复或并发起 full。原 ops 请在本 issue 确认窗口归属/释放。

普通经验 20261024-033643-experience-update 的 native-accepted 是 ops 原恢复结果；外部仍未真实派出，不把 ready/排队当学习完成。P1 门修后沿原调度器自然派发；#28 实际发布/读回 → #37 → #20 父（含 #39/#43）顺序保留。#51/#48 及科学父仍开放。

只读补验、#52 原文及远端读回：paper/materials/20261024-issue51-dispatch-gates-integrator/。本轮仅协调，不改变 live/生产 state。

# 运维会话交接单

运维会话开工前和每轮学习闭环开始前先读这里。**主会话**（和 Dai 讨论的那个）还在做的事列在“进行中”，这些运维会话不要重复做。主会话做完一项就从这里删掉。

## 进行中（主会话负责）
（无：9 局复盘已写完并提交，交接完成）

## 交给运维会话的
- **A8 窗口（Dai 2026-09-29 21:26）**：jev-sts2-v3/.env 的 TARGET_ASCENSION 已改成 8。现在这局 ULQPBK1211FG 还是 A9，从下一局起打 A8，**打满 20 局 A8**（以 runs.jsonl 里 ascension=8、且在 2026-09-29 21:26 之后结束的局计数）。
  - 这 20 局里赢了也不要改 TARGET_ASCENSION，胜利照常提醒 Dai。
  - 满 20 局时在会话里通知 Dai，附上这 20 局的平均层数、各阶段通过率、胜局，并和 V3 在 A8 的 10 局（09-29 03:58 的对比报告）、以及 A9 的 41 局并排比较；之后**对局会自动停止**（Dai：20 局完成后就停止游戏）：独立脚本 ops/stop-after-a8.sh（日志 ops/stop-after-a8.log）在第 20 局开始时创建 ops/STOP，autoplay 打完这局就退出。停下后不要重启 autoplay，也不要删 ops/STOP；卡死检查看到 STOP 会自动返回 OK。
- **知识库一视同仁（Dai 2026-09-29）**：攻略（ironclad-guide.md）、DeepSeek 手册（ds-handbook.md）、Jev 提示（jev-hints.json）、代码的卡牌参考分（card-value.ts 的 TIER 表和角色分类）、boss 笔记，和经验库（experience.json）一样都算知识库，不区分来源，只分新旧。每次更新经验库时，同时核对这些内容：和我们的复盘数据冲突的，改成数据版本（写明局数）；数据说明无效的就删掉；还没有数据覆盖的先保留。改动记在 paper/materials/experience-changelog.md。
- 给 DeepSeek 和 Jev 的提示里加一句：攻略或手册和经验库、实测数据冲突时，以数据为准。这条算小改动，随下一批修复一起做。
- C 批已于 16:45 合入 v3（54d6d9e，1036 个测试全过）。step1-bugfix 已空出来，fix-queue.md 里还开着的条目（从“From the route-review work”那一段起）归运维会话的下一批修复。
- 上面“进行中”清空以后，学习闭环全部由运维会话负责。
- fix-queue.md 里还没被派出去修的条目，归运维会话的下一批修复。

更新：2026-09-29 21:26

## 运维 codex 待合入（2026-10-05 05:57）
- 经验批次`20261005-053531-experience-update`：提交`4f429c0c7ff6b3eda9046781d64341f2e1943243`（exp-silent，经验2026-10-05.6）已自测tsc 0、145文件1888用例通过，因decision-log冲突由运维兜底；本轮先机械同步main并归档第六次增量，live仍待合入。交接在`learner/runs/20261005-053531-experience-update/handoff-ops.md`。
- live的`ops/live-merge.lock`正被`20261005-053531-fix-batch`使用，本轮非阻塞取锁失败，不等待；已用`learner-merge exp-silent`白名单动作发送新合入兜底事件。下一轮该事件到来时，按不可变提交`4f429c0c7ff6b3eda9046781d64341f2e1943243`处理：保留双方decision-log及刷新数据，锁内合入、跑固定沙箱入口；通过后登记新eval版本、同步main，再经ledger.py以by=ops登记`silent-0006/0007/0017/0018/0019/0020/0021/0036/0046/0053/0054/0055`为shipped。本轮这12项保持proposed。完成时在本节后追加已处理状态，保留历史。
- 本轮没有复盘或新纯bug，不改经验内容，不另设审核；合入后完整沙箱外检查缺少补跑动作的既有请求仍在收件箱，待后续回报处理。

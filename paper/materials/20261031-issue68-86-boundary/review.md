# #68 与 #86：K 退役边界预核

后续到件：#86 已交固定方案 `892d7768`，本会话已继续作 [正式窄范围复核](proposal-892d7768-review.md)。下文保留取件早期的预核事实，不表示方案现在仍未到件。

本轮接收 [68/6539642223](https://github.com/dwroy/agent-sts2/issues/68#issuecomment-6539642223) 及 [ops 转发](https://github.com/dwroy/agent-sts2/issues/68#issuecomment-6539813507)。第一批 K 保管继续接线和采用；DataSeal 暂停，CodeSeal 等 #86 方案后由主管决定。旧研究、665fde83 方案及 33fcb6fc/200c5227 工程冻结保留。

这是对 [#86 原单](https://github.com/dwroy/agent-sts2/issues/86) 的 K/发布窄接口预核：取件时该单尚无方案评论，不能称已审完 schema、选型或全量清点。A/B/C/D 清点、存储选型、消费者迁移与实施仍由原 #86 owner 完成并交主管批准。本会话不写 DB、改读路径或启用 K 保管。

## 已核原件与现状

原单、主管调整、ops 转发及新增人工接力裁决 77/6539468421 原文分别保存，URL/作者/原件 SHA 见 authority-index.json；均为 dwroy 带角色前缀的项目意见。

source-index.json 固定本轮只读来源：项目准备 33fcb6fc，源码冻结 200c5227；鲜核 primary main 39e48ce9、LIVE fc9b1bb7。共享 installed merge_queue.py 字节仍同原 51c pin；kit#1 未交新生命周期/source-lock 接口或新 pin。#68 仍 default off、未采用，不能开始稳定计时。原集成/ops 的 7ee 与 K 事务由原 owner 核新鲜终态；这里的源码/HEAD 读回不代 PID、锁或 full 终态验收。

## 先后关系必须清楚

| 阶段 | 代码合并/发布的 K 合同 | 退役记录 |
| --- | --- | --- |
| 当前，#68 尚未实际采用 | 原人工接力及原在途继续；包括 77/6539468421 的临时优先级和补跑要求 | 不能据工程准备或 #86 原单提前释放 K |
| #68 第一批实际采用，迁移仍有受保护可变文件 | 新 job 按冻结合同同 OFD 保管至 strict/失败；旧 job 不热转换 | 四条人工接力在适用新事务中“由自动保管取代”，不在同一事务并行选规则 |
| #86 核收相应源码路径已无可变知识输入/兼容写体 | 新代码合并、发布、fast 不拿 K；K 仅防两次刷新并行 | 人工接力及代码发布自动保管“由入库取代”；原已启动事务仍原样结算 |

不能只按“第 A 批完成”判断 K 已可退役。若 B 类或兼容输出仍会改 tracked ROOT/LIVE 文件，仍存在原冲突。若 #86 计划提前封住其写入口，应给路径与消费者闭集证据，写清哪些合同先退出、哪些仍沿旧合同；C/D 原始缓存、普通报告和代码夹具分账，不把目录名当证明。

## 请 #86 方案逐项覆盖的接口

| 实际入口/证据 | 当前作用 | 入库方案要给出的替代或保留证明 |
| --- | --- | --- |
| knowledge/builders/refresh_driver.py 的全周期 K 与逐 producer refresh_step | K 串行刷新；各固定 producer 当前可分别发布 D1 | K 可保留刷新互斥。一次完整刷新原子可见不能仅靠 K：长计算在 staging，短事务/快照切换，写明失败重启后消费者只见完整一版。选单库或 stats 库由 #86 说明，不在本评审代选 |
| ops/board_queue_checks.py overlay_data、snapshot/verify_after | tracked knowledge 数据进入 W/G 与实际 LIVE 前像，bytes/mode/index 漂移拒绝 | 给 producer→DB→固定消费者版本→旧兼容输出→Git 删除/保留的逐路径表，修改原快照/overlay 调用，而非先忽略全部 knowledge/。builders、方法声明、配置与固定夹具仍严格；这不是继续开发 DataSeal |
| 原 kit workspace_worker 的 sync_lock(K)→mutation_lock(L)，.agents/queue-workspace.json | 原唯一 primary writer 在同步前自己取 K | #68 暂时需要 source-lock provider 借原 OFD，当前仍待 owner；#86 后对应新 job 可走已核无数据 K 的 source 合同。两种合同分别固定，新 pin/策略/权威继续原入口，不在本地热补或另建 main writer |
| ops/publication_gate.py source_locks、writing、release；fixed_method_admission.py | 原 learn/game→K→L/适用 D1 门，安装核验/方法 CAS/持久事务/verify_release | 迁移后从已证明纯代码发布路径移除 K，不顺带删除 next-game admission、L、authority 或仍适用的方法/DB 事务门。局间只做已准备好的短切换；新 DB 结构本身不代源码发布核收 |
| ops/learning_runtime_data.py OUTPUTS、bind_launch、refresh_step 与 run-config 版本 | D1 的产物集合、请求、方法及原绑定；K1 有独立版本语义 | 用实际读取路径核 A/B 覆盖，不假定所有叶已有 K1/D1。保历史 ID、source cut、manifest、角色/适用范围与原局绑定；新增版本映射可审计，不能把旧 request 热绑新方法或把存储迁移算新科学验证 |
| ops/board_refresh_queue.py 与 board_queue_control.py 的 hold/债务 | 普通 all/成本/漏斗的排队、取消、未获准意图及新 ID 补跑 | 旧已启动/等 K 作业按原身份退场或结算，不能在内存里改成 DB 作业。补跑用实际已安装/已准入的新方法和新 ID，保原取消/失败；显式 cutoff/专题仍归原 owner。迁移成功不代补跑成功 |

代码事实以 200c5227 与 source-index.json 为准。实际 main 尚未采用这些准备模块，所以表内 #68 新保管/债务逻辑是待接工程合同，不冒运行事实。

## 原子可见、方法和回滚的交叉条件

1. #86 原单要求一次刷新/发布完整可见。当前 K 的互斥与逐 producer D1 发布不能直接充当整周期事务证明。14–35 分钟计算若复用同一 SQLite writer，须说明如何避免长期占写事务挡学习/短发布；失败 staging 不抬 latest 指针。旧周期/角色/样本分母照原账，不因入库混为同一验证。
2. #68 准备保持 13 producer/434 方法输入同基线，这不预先证明 #86 也不改方法。读 DB 的 adapter、schema、闭包/声明及 opaque callsite 实变时，仍按 #84 对实际最终组合准备票据、核双根/安装、CAS 与原事务回执；旧已完成 D1 不因此重算。#86 的读回/等价/时延测量应绑定其真实冻结输入、版本与新代码。
3. “只切开关回 JSON 读路径”应有已准备的、版本固定且在代码树外的只读 JSON 快照，逐叶值与原版本对应；不是局间再导出 37MB 或把旧 tracked LIVE 文件恢复成可写。若回退还要恢复旧 LIVE 就地 writer，必须一并恢复匹配的 K/发布合同，不能只改 reader 开关后继续无 K 合并。具体目录和 schema 由 #86 选定。
4. 关闭 #68 不能跳过未结 keeper/borrower/发布/hold。现 enabled() 明确拒绝 off 绕过活 hold。先按原 job 核真实退场、原 publication/#84、全队列与债务到明确结算，再在原自然窗口让新 job 使用无数据 K 合同；连续性丢失仍记失败，不把 DB 迁移补成旧 full 绿。

## 方案到件后的最小复核清单

- 清点表能逐一指向真实 writer/reader、存储/版本、可变旧路径和兼容入口；剩余未迁移项不能在 source freeze 中被无声忽略。
- DB-only 刷新推进时，ROOT/LIVE 代码/config/index 保持；在跑游戏仍读原固定版本，下一局固定新完整版本，方法与科学证据可追溯；给原单要求的逐项等价及延迟实测。
- 新 pure-code 合并/发布/fast 的相关调用点实际不取 K；刷新互斥仍有效，原游戏/资源预算/唯一 writer 不变。每个分批 candidate 独立冻结/检查，旧 full 不移花接木到新 schema/reader 组合。
- 数据写失败、进程中断、切换未准备好、旧 job 未退、DB writer busy 和 JSON 读回开关回退，都保原事实且不阻塞下一局等待长准备。原单的“没准备好跳过边界”与旧事务恢复分别证明。
- 四条旧人工规则和 #68 临时自动保管注明适用期与“由入库取代”的实际核收点；公告/方案不代真实退役，#68 第二批不因一天到期自动启动。

本轮只是把上述接口交原 #86 owner 写入方案。待实际方案/路径清点到件，再逐项核，不代主管批准或 #86 原 owner 的采用 ACK。第一批的两个共享接口仍归原 kit owner；当前无新到件，不改 pin/控制/主线/LIVE/STOP，不运行对局、生产刷新或迁移。

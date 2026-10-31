# #86 固定方案 892d7768：#68 的 K 边界复核

审阅原件：[892d7768 方案](https://github.com/dwroy/agent-sts2/blob/892d7768ab03f08735beace06d5f5395f2efb9e3/paper/materials/20261031-issue86-plan/plan.md)，交付 [86/6539933254](https://github.com/dwroy/agent-sts2/issues/86#issuecomment-6539933254)。原文、Git blob/SHA256、交付原评论均在本目录留证。这里仅复核 K/代码发布/回滚及 #68 衔接；未独立重做 603 项清点、SQL 实现或性能测量。主管已在 [86/6539967934](https://github.com/dwroy/agent-sts2/issues/86#issuecomment-6539967934) 批准 A 开工，本评审不增加审批轮。

结论：方案与 #68 最新边界在原则上对齐。第一批继续；DataSeal 暂停；按新批准现阶段不新做 CodeSeal，保已有 strict，A 核收后再看补充。下面三项作为已批实施的交接/验收字段到件，不要求重新选择存储、重复在途检查或等本评审另行批准后才开工。

## 已对齐的具体条款

| 固定方案位置 | 本次核对 |
| --- | --- |
| §2–3，独立 stats + 正式 K1，整轮候选/短提交、不可变 bundle | 不把两库各自的 current 当一笔跨库发布；长计算/镜像准备不占发布事务；旧 K1/D1 标识与原绑定保留。满足本次对“互斥 K 不能代整轮原子可见”的预核要求 |
| §4、§6，局中预制 bundle/JSON 镜像，局间只切小指针 | 原局不热切，JSON 回读同一 manifest，坏库时不先打开坏库取镜像证明，不退回旧 Git 116 条策略。不会因 reader 回退自动恢复源码树内 writer；与新无数据 K 合同可以兼容 |
| §7 L224–228，逐入口 K 清单、保原 #84/#57、A 精确路径退出、B/C 尚未迁仍保护 | 已覆盖 primary sync 暗中重取 K、禁止忽略全 knowledge/、残余 writer 能改 strict 输入就不能宣称解锁、CPU/内存/磁盘准入不因去 K 扩容等要点 |
| §7 L230–238，四条人工裁决的替代表 | “入库实际核收后由入库取代”，当前 7ee/c0075dfa 顺序、原事务与 environment 失败保留；方案不让原 K 保护提前失效 |
| §8–9，独立批次和未完成验证 | A/B/C-D 分批走原队列；DB 对照/时延/故障与自然消费明列待实施，不用本次 JSON 局部测量冒已验证收益 |

## 1. K-free 切换点补旧事务和债务的交接行

§3 已写旧 D1 自然结算、未知事务保留；§7 又写旧方法失效候选留失败/待重算而不阻合并。请在实施交接明确区分 **候选失效** 与 **活 worker/borrower/发布写体退场**：可以保留无效候选，不可以因此把活 PID/资源/旧 K hold 算已释放。

此项不要求等所有失效数据候选长算完才合并。其代码/输入/输出已隔离且不触碰新源码输入时，可沿原资源事实继续或留失败；仍保护旧源码作业的 keeper、借用和发布事务才须按原合同结算，不能用迁移开关抹掉。原方案 L224 的“不等失效候选完成”与这一分账可以同时成立。

当前 #68 准备的 `board_refresh_queue.enabled()` 会拒绝 off 绕过未结 hold，keeper/publication 同 OFD 也有原 outcome/修复链。若迁移切换时已使用 #68 合同，切换表需含旧 epoch/job/outcome、原 publication/#84、worker/borrower/资源真退和未结请求；若仍是现行人工合同，就引用原 owner 的对应结算原件，不把未采用的 #68 结构当现场事实。

all→成本→漏斗债务各保原取消/失败 alias；迁后补跑用实际已安装/准入的新方法、新 request 与新 bundle/schema，保原请求不变。一次 S1 提交不代成本/漏斗已跑，也不代原 D1 成功；显式 cutoff/专题归原 owner。该交接用于决定新 job 何时采用无 K 合同，不阻塞已绑定旧局继续运行。

## 2. 把 A 期剩余 B/C 的“只读兼容”落到闭集

§7 L228 的条件正确：剩余 writer 还能改 strict 输入，就不能交“已解锁”。实施表请给出 A 期仍留在 Git/LIVE 的 B/C 每类路径的 writer 处置、只读/候选路由、消费者所读固定版本/SHA，以及与新 bundle 的关系。尤其 B 中仍走固定方法的校准、opening-value、event-pages，不能只因分类是 B 就假定不再变化；学习候选与已发布资源也不能混为同一就地 writer。

这不要求 A 批代做全部 B/C 入库，但“旧副本不再就地更新”须有实际入口/权限或路由证据和反例测试。不能用暂停普通学习/删除研究来满足闭集；若某写者尚未封住，按方案自己的守卫保对应旧保护，报告还未解锁，而不是先从 strict 去掉其叶。后续 B/C 仍按新独立批次核收。

## 3. primary-sync/provider 与最终退 K 一起冻结

§7 已识别 `.agents/queue-workspace.json:sync_lock`，并明确不私改 kit，口径正确。当前 51c 的 workspace_worker 实际在 L/common writer/queue/CAS 前独立 open/flock K；#68 第一批需要借同一 OFD，#86 核收后的新代码合同则不需要数据 K。请与原共享 owner 对齐同一个受冻结 source-lock provider/等价接口对两阶段的表达，带原 sync-job/authority 与真实 worker/resource 身份，按 job 固定合同。

生命周期回调本身不足以解除 primary-sync 自等；把 K 文件删掉或仅改 source_locks 也不足以证明退役。新 pin、项目策略、ROOT/LIVE 映射、原唯一 writer、精确 strict/方法声明及实际资源预算须同组合核。准备 #86 方案/获批代码不必等 DataSeal，实际切换不能让旧 job 换合同；当前旧事务与 K 不动。

## 后续界面

#86 方案到件后，本轮 K 窄范围复核已经完成；上述三项随已批 A 实施补到逐入口交接/验收记录。实施与连续五局自然 shadow/既定延迟门、原局间短切换等按 86/6539967934 执行，由原角色核收；本评审不代运行验收。当前 #68 新 pin 尚未到件，第一批继续原任务且 default off；源码 200c5227 与 26 份冻结输入未改，不把本轮评审当采用 ACK。

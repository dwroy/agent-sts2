# #87 合并交付：r1 + 会话夹具修复 + 已通过档案返工 r2 + A

按 [87/6545141143](https://github.com/dwroy/agent-sts2/issues/87#issuecomment-6545141143) 先复现、确认根因再修复，直接叠在主管已通过的 `c29bed2c2932c77985def6ec114389f1596156e9` 上。新的固定 HEAD 包含原 r1 全部业务、此修复、档案返工与 A 对齐，替代拆开的旧交付；旧分支、失败批与原件全部保留。顺序已改为 #83 r5 → 本次合并交付 → #86 A1。

## 根因与修复

在 c29 上仅选择原8场景复现，**8/8 同样失败**，与原批的 expected1/2、app-server exited1、fixture Jev失败一致。实际输出schema把 `boss_target` 声明为非nullable必填object，内部必填boss_ids/gap/reason；#64固定初始路线和后续拿牌两种脚本回答都漏了它。fake strict checker把遗漏槽填null后按原schema拒绝，模拟app-server退出，隔离会话重启后仍失败，最后才触发刻意留空的Jev夹具。它是r1引入新合同后旧测试夹具未同步，不是线上模型/网络/资源故障，也不是应放宽strict的理由。[schema/失败链证据](strict-schema-summary.json) 取自实际发出的原请求；确认后已向主管inbox追加根因一行。

**修复仅一份测试夹具** `agent/tests/brain-codex-session.test.ts`：两种脚本回答补一个合法固定 `boss_target={boss_ids:[],gap:"unknown",reason:"固定格式，本步不补构筑"}`，不填Boss需求或打法。原159条assertion行完整保留，strict checker完全未改，无新skip、无timeout/重试放宽。另加3条断言确认schema仍要求boss_target、首次上下文正确持久化后reward不再强制复核、选择记录保留boss_target。详见 [assertion-preservation.json](assertion-preservation.json)。

加字段后原8项全部通过；完整会话文件35项（包含另外27项）也全部通过，原路由更改/不更改、construction patch、缺理由、非法route、请求次数、计划持久化、journal replay和恢复后的map消费者断言均继续成立。首次计划已有完整endgame，本次无需改run_plan适配或任何生产schema；新增持久化断言也验证了这一点。

## 检查

- 完整会话35项 + 档案/报告33项均通过；同次4文件69项仅1项导入检查因切分支重新稀疏掉旧issue29文件而失败。恢复同一原blob `b84d95c5185941eec143cbcf2966d5770309cca5` / 211076B 后，导入检查1/1通过，没有改其断言或排除。前后记录全部保留，不能把68/69首验改写成单轮69绿。
- 生产tsc和报告CLI+learner隔离tsc通过；nice19、单worker/thread池、无文件并发，使用本地假app-server和固定ModClient，无真实模型/游戏调用，没有运行生产play。
- c29已通过的两档案源叶、声明、所有其余生产源码和15对齐叶均逐字节不动。因此两方法仍c29的308/402节点及相同身份/边/contract，24方法检查沿其同字节回执，不因纯fixture改动重跑或改身份。
- 原1bebd996 full失败原件/状态保留。原更早开发自测6118/6119、同blob稀疏夹具复验、2ec的34文件387项、c29档案33项/24方法及失败修正日志都继续保留；最终full只由原集成员在新合并批执行，不新开本单全量。

完整 [validation.json](validation.json)、[checks/](checks/) 与源SHA在本目录。初次定向的27 unselected只用于“先复现8项”，最终完整35项全部执行，没有跳过原测试。

## 已通过档案与 A 对齐，完整题面

c29返工保持：8条fight_plan专用/单窗战斗观察仅可查目录，正文只两条已发布蟹机制；每Boss恢复r1三项M核心/HP/n，O/E最后填且不能挤掉M/事实，首试unknown与含重试分窗不倒推。源为已发布K1-0924d4ea，原条件/反证/冲突完整保留。前后完整题面继续在此最终HEAD内的：

- [F1原始前](../20261031-issue87-dossier-rework/full-prompts-final/opening.before.json) / [最终后](../20261031-issue87-dossier-rework/full-prompts-final/opening.after.json)：1480B，整题+2019B。
- [F32原始前](../20261031-issue87-dossier-rework/full-prompts-final/act2_before_boss.before.json) / [最终后](../20261031-issue87-dossier-rework/full-prompts-final/act2_before_boss.after.json)：1472B，整题+1993B。
- [F35原始前](../20261031-issue87-dossier-rework/full-prompts-final/act3_revealed.before.json) / [最终后](../20261031-issue87-dossier-rework/full-prompts-final/act3_revealed.after.json)：1477B，整题+1991B。

[返工报告](../20261031-issue87-dossier-rework/implementation.md) 另链接2ec完整题面与c29最终题面的逐题前后；[M/事实/目录逐项核查](../20261031-issue87-dossier-rework/three-prompt-review.json)、[15叶同blob证明](../20261031-issue87-dossier-rework/alignment-15-unchanged.json)、[完整12+3 blob表](../20261031-issue87-r2-v6-alignment/blob-table.md)、[闭包重算表](../20261031-issue87-r2-v6-alignment/closure-recalculation.json) 及[c29 pin变更](../20261031-issue87-dossier-rework/declaration-delta.json) 都包含在最终树中。修复不改生产字节，所以无需重新生成相同题面或改原测量值；固定构造器回放零模型、计时不代生产延迟/自然收益。

## 新的完整集成范围

**r1未采用，不能再沿用此前以r1冻结候选为预备基线的14叶runtime图。** 对当前冻结main159c→合并业务源，现存生产差量是r1原18叶 ∪ A恢复12叶，共30叶；另三撤出路径只作ROOT-only，LIVE本来不存在。两报告CLI也须沿原登记列ROOT-only；测试/报告/记录归ROOT。原精确列表和警示在 [combined-runtime-scope.json](combined-runtime-scope.json)。这不是提交票：#83先走，最终必须按其采用后的实际main→最终规范HEAD，重算完整差量，保留#83先行rollout两叶并语义归并/重算方法，核全映射、runtime不越界和原cold≤4MiB，冻结两policy后再提交。

新请求取代旧r1/r2拆单，由原集成员沿同一入口处置，不由开发手动submit/tick/assembly/full或撤改旧失败回执。#86排后且其旧rollout前像不能覆盖先行修复。最新exact14方法例外只用于77/旧r1/83r5；本次合并对齐实际部署必须正常方法、闭包零差异，再由ops回执和主管整体撤销例外。没有LIVE/STOP/共享配置、超时、版本分号或其他会话变更；自然10局/首试30局科学父项继续分账开放。

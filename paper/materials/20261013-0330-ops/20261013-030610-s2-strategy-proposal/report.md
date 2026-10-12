# 静默猎手策略提案逐项核验

记录时间：2026-10-13T03:22:01+08:00。任务 strategy-proposal；角色 silent；批次 20261013-030610-s2-strategy-proposal。

本批是普通专用队列消费：reason=proposal，领取十个原id；没有research_request、implementation_request或proposal_repair。普通专题登记绑定其他批次，不满足本批条件，不转为专题。初始工作树干净；按要求git merge --no-edit main返回Already up to date。完整base/HEAD：5940fdd4c7386040f495c68b9e586d2980305fd1。本批不改源码、知识、任务模板或live，不新增提案id，不关闭其他父要求。

## 证据范围与方法

六个派发局在原runs.jsonl各有唯一行，均SILENT/A10。只提取这些局的状态、决策、SL、配置和计划；日志只读，材料放本批scratch。十份原Markdown均保存原字节，实际SHA256与队列登记一致。账本仅核这些提案关联的silent条目；当前静默经验仅核十二个已关联条目，未把其中其他局的汇总数字充作本批新增验证。

| 局号 | 状态 | 决策 | SL记录 | 配置 | 计划 |
|---|---:|---:|---:|---:|---:|
| 751FN9QM9MHQ | 624 | 615 | 6 | 1 | 2 |
| KV0JHNJCKXLS | 686 | 669 | 7 | 1 | 5 |
| YQL8RZ8BWN1E | 582 | 571 | 6 | 1 | 3 |
| L9SGRBB5R698 | 653 | 635 | 6 | 1 | 3 |
| PU80F84P6HPN | 1064 | 1033 | 12 | 1 | 5 |
| KEN58SH9SLZ6 | 558 | 548 | 6 | 1 | 3 |

合计4167状态、4071决策、43 SL记录、6配置、21计划，另核6条runs；SL记录包含各局其他层战斗，不全部当目标boss独立尝试。每个原始行保存物理行号、字节偏移、长度与SHA，见evidence-manifest.json；分析结果见evidence-analysis.json。

## 已核局部事实、反例与未知

- 751FN9QM9MHQ F17：T2首/第三试同指纹，实际净损13→18、敌净削9→18；T7第二/第四试净损13→23、敌121→109/103，跨轮净削12→18；T13首/末试净损8→2、净削17→11。多伤与省血方向相反，不能拟统一取舍。T7题面damage_dealt=9/15与跨轮净削12/18分开；原提案多6伤结论不变。首次分析混用口径而断言失败，原脚本/失败保存，不改原提案或原日志。
- 751 F13 T3：原题272361中plan2有药损8/牌伤26，plan3当轮无药损8/牌伤16，但其后续7/8样本喝药；plan5才是整段抽样无药，损8/牌伤16。三线推演并列不代表三个实际执行分支。持有价缺表记零仍未知，不推导固定留药或药水价值零。
- 751 F17 T7首试状态278500—278505：生存者实际弃一呼唤，最终27挡覆盖27来袭，剩一呼唤导致45→39；敌121→117包含已结算的其他来源，不能全归卡牌。未决弃牌的保守惩罚不当已确定损血。
- KV0JHNJCKXLS F33：第4/5试T5同指纹，删致命毒药+后当轮净损均0、敌净削36→29；首/末T1删输出净削28→14，净损仍0。T4毒结算与30回血、实际终态和判死截断分列；后继动作改变，没有“删输出保血”的实际证据或固定后继胜率对照。
- KEN58SH9SLZ6 F17：第4/5试T10同指纹，净损15→21、净削2→4；第4/末试T5同指纹，净损7→5、净削1→2，但步法建立从T5延至T9，T8双防御仍各5。反例排除“只取当轮最省血恒优”，也不能推出关闭未试探索。末试T10攻击净损8和呼唤6共14、T12处理完呼唤后净损13均保留。
- KEN七次实际饮用：F3 T2攻击药、F4 T1稳定血清、F5 T2速度药、F11 T1虚弱药/T2攻击药、F15 T1发光水及技能药，逐槽位由有药变空；无discard_potion。F15技能药274272只报pending(unstable)，后续280354→280355才确认消耗；首次派发不能证明随机选牌及整轮收益已兑现。六次boss空药入口不证明留药必胜。
- YQL8RZ8BWN1E F17六试均失败，本体已结束仍需自爆。末T10状态280160→280161饮用毒药，残壳毒2→8、血26/挡13/来袭41不变，原始占位HP不改写。26+13−41=−2与死亡帧截断0分开。L9SGRBB5R698 F17 T14和PU80F84P6HPN T17近十亿占位血亦已核；PU末试T15获胜属于另一条整体轨迹，不是新排序的受控效果。

同局多个SL不拆作独立训练/验证局；这里没有拟合权重，没有运行新模拟、LLM或网络。保留现行探索、HP护栏、药水和终局规则。今后拟合须用更早独立silent局发现/校准，冻结本批案例，留真实开始时间更靠后的独立局验证；其他角色和未观察进阶保持等价。

## 已上线子项与完整请求的区别

现有源码实际live祖先及blob核验见source-ancestry.json：

| 源码 | 实际源码commit | 本批与live的blob |
|---|---|---|
| agent/src/reflex/silent-held-loss.ts | 9d8278702dbc581b5015ba7ec9a70dc0fb94cccb | 一致 |
| agent/src/reflex/silent-sl-resource-comparison.ts | 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 一致 |
| agent/src/reflex/silent-selection-audit.ts | 9d8278702dbc581b5015ba7ec9a70dc0fb94cccb | 一致 |
| agent/src/reflex/silent-selection-dispatch.ts | fdaf787a372880b0438e73bcac7e6d2168b038ed | 一致 |
| agent/src/reflex/silent-potion-reference.ts | c4670f4f416c7d93e192e889c5080e7e4e0e733f | 一致 |
| agent/src/reflex/silent-giant-potion.ts | 40168f4a903ae1d8c48bd03006f8fea19fd3aa3c | 一致 |
| agent/src/reflex/silent-sl-comparison.ts | 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 一致 |
| agent/src/sl/attempts.ts | b01edf46b4b619f217d070a196e161df9fe716a0 | 一致 |
| agent/src/sl/explore.ts | b01edf46b4b619f217d070a196e161df9fe716a0 | 仅三处Roy/Dai旧注释差异，详见patch |

候选模型与资源差已存在；silentHeldLossFacts.actual_held_hp_loss仍为null，silentSelectionAudit.actual_turn、silentSelectionDispatch.actual_turn及whole_plan_executed仍为空，silentSlComparison.actual_turn_result也为空。首次派发回执不证明整线执行。巨兽阶段展示与单次毒药观察已有实现，但enemyHpLeft仍累计原始HP，anchorRank仍将其用于同存活回合排序。已存在子项不等于十个宽提案全部完成，不登记完整duplicate或implemented。

## 逐项处置

| 原提案id | 证据层/回合 | 既有账本 | 处置与缺口 |
|---|---|---|---|
| silent-proposal-366288801d9150d9 | 751 F17 T2/T7/T13 | silent-0079, silent-0176 | waiting：已核同指纹局部血价；缺确定弃牌后的实际整轮分账、续问归属和保持后继一致的整战对照，不能拟探索门槛。 |
| silent-proposal-85929bdfc8a3fc1b | 751 F13 T3、F17 T7/T13/T17 | silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176 | waiting：已有未决持牌和未知持有价值诊断；F13无药只属模型支线，缺实际无药整战、留药后继及联合兑现核验。 |
| silent-proposal-efd9f83ee9e1a6dc | 751 F17 T2/T7/T13 | silent-0079, silent-0176 | waiting：已有候选血价和持牌预测子项；整轮实际结果字段仍空，六次SL均无受控胜线，不能将子项记成整项实现。 |
| silent-proposal-131042659448ae74 | 751 F13 T3、F17 T3/T5/T7/T17 | silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176 | waiting：力量、敏捷、毒、荆棘和呼唤的各自观测已核；缺跨续问的联合收益归属、实际无药及留药整战分支。 |
| silent-proposal-990f054036609447 | KV F33 T1/T4/T5 | silent-0102, silent-0019, silent-0020 | waiting：T5删毒两线均零损、净削36→29；缺跨续问毛伤、净伤、回血分账及相同后继整战，不能把删输出记成保血。 |
| silent-proposal-e18d3f18e6cac2a0 | YQL F17 T9/T10；L9 T14；PU T17 | silent-0017, silent-0250, silent-0011, silent-0027, silent-0046 | waiting：本体与残壳展示已有live子项；占位血仍参与同轮参考排序，缺候选改序后的受控完整后继及独立验证。 |
| silent-proposal-9733bb80f445aeae | YQL F17 T10；L9/PU F17 | silent-0017, silent-0019, silent-0020, silent-0250 | waiting：毒2→8后血26、挡13、来袭41不变；缺提前喝、不喝、留药及参考改序的整战对照，局部观察不定新药水规则。 |
| silent-proposal-c51468c5e8ba6668 | KEN F3 T2/F4 T1/F5 T2/F11 T1-T2/F15 T1 | silent-0019 | waiting：七次饮用及槽位消耗已核；缺随机选牌、重问与整轮收益的完整归属，以及F15不喝和留药boss的整战对照。 |
| silent-proposal-86a7db08d1a31976 | KEN F17 T2/T5/T9/T10/T12/T13 | silent-0079, silent-0021, silent-0125, silent-0005, silent-0176 | waiting：T10多6血仅多2伤；T5省2血却延迟步法至T9，缺能力后继受控收益和独立验证，不能拟统一血价或禁探索。 |
| silent-proposal-e282a9131b99129a | KEN F17 T2/T5/T9/T10/T13 | silent-0021, silent-0079, silent-0125, silent-0176 | waiting：已有候选、持牌和首次派发诊断；实际整轮字段仍空，缺完整归属、固定后继整战及后期独立验证局。 |

## 预期行为、验证入口与回退

当前保留原行为。后续实现需把原答、护栏后、SL后及真正执行动作关联到同一回合，在抽牌、弃牌、随机药水与重问时截断未执行续步；由后续状态验证实际损血、净削、回血/毒/反伤和能力建立，未知字段保持未知。用本批固定帧核公式，不让刷新JSON改变夹具；若改参考排序，额外保存旧/新路径、原始占位血与本体进度、血挡和完整后继，再以独立局核范围。仅诊断验证通过不宣称新策略或通关效果。

本次无可证明整项闭环的新源码改动，所以无源码提交、撤源码负对照、tsc、vitest或源码用例结果；tests均null。没有合入、发布编号或shipped。预期影响仅是证据和处置可追溯；回退无需操作，原源码、经验、日志及原提案保持。实际规则后续上线再依协议通知Roy，本批不冒称通知已送达或消费者已采用。

## 原失败保留与材料

- 首次提取只找顶层run_id，states和run-plans误记0；原evidence-manifest-initial-schema-miss.json保留。随后按state.run_id及run字段校正，原字节与4167状态/21计划完整提取并核SHA；不把0解释为日志缺失。
- 首次分析把751 T7题面伤害9/15当跨轮净削而失败，保留analyze-evidence-initial.txt及analysis-initial-failure.txt；第二次遇到无chosen决策，保留analyze-evidence-schema-failure.txt及analysis-schema-failure.txt。最终区分题面/净差并处理非动作行后分析exit0。这是材料校验，不充作生产tsc/vitest、撤源码失败或策略自测成功。
- 开工第一条git命令遭沙箱构建期其他工作树路径ENOENT，原工具回执保留；同权限重试成功，无扩大权限。
- 十份*.original.md、proposals-folded.json、proposal-history.json、ledger-own-snapshots.json、experience-linked-snapshots.json、evidence-manifest.json及局别原始JSONL保留。
- proposal.md为本批汇总提案与逐项处置，report.md为完整报告，result.json为机器回报。来源任务仍沿原postmortem/experience-update，目标本批strategy-proposal；原id、原Markdown及历史账本状态不改写。

## 账本与交付

只经根目录learner/ledger.py update追加本批proposal/report路径及核验说明，不新增重复发现，不把既有shipped条目降为proposed，不新增shipped、效果或版本。CLI输入输出保存在ledger-updates.jsonl/ledger-cli-output.txt，实际完成情况由final-integrity.json记录。交运维逐项等待；未执行支线、未完成整轮归属及父要求仍保留，不因本批报告关闭。

最终共享记录检查：ops于2026-10-13T03:17:28+08:00对九个关联既有账本追加shipped。本批03:22:31的十六行只有by/where/note，不含status、version、effect或commits；保留并行原行，不把这些ops记录归成本批上线。首次完整性断言错误要求共享账本状态与开工快照一致，已保留integrity-initial-failure.txt；最终改为逐字核本批CLI输入与实际追加、身份及工作树零改动。密钥扫描exit0、gitleaks.json=[]。本批机器回报仍为十项waiting、fixes=[]、merged=null和tests三个null。

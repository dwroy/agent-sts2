# 静默猎手策略队列逐项复核报告

记录时间：2026-10-13T01:56:21+08:00。批次：20261013-014201-s2-strategy-proposal。

本批10项均为waiting。只完成本批证据核验和逐项处置，没有新源码、知识数据、提交、live合入或版本。本批不是手动专题/冻结实现请求；未领取其他队列或重做量化父请求，未派下级agent。

## 身份与基线

HEAD/base：`9eabfcce9522c7aae3739a71275cc54f2d0d3ca8`（完整40位）；开工干净，普通任务执行`git merge --no-edit main`结果Already up to date。根learn.json本批task=strategy-proposal、character=silent、reason=proposal、worktree匹配、proposal_ids恰为下列10项，无research_request/implementation_request。普通专题候选根请求绑定20261010-150327，未与本批匹配；保持普通队列范围。再次核绑定保存batch-binding.json。

六个派发局在runs.jsonl各有唯一行：751第583行、KV第584行、YQL第585行、L9第535行、PU第540行、KEN第586行，全部SILENT/A10。未读取其他角色知识。历史运行代码分别为79bee0fc+dirty、70c8352b+dirty、b0b0e679+dirty、4fb81b17+dirty、0581ecb3+dirty、f9db52c1+dirty；当前源码只作实现定位，不冒称恢复历史dirty树。

## 原证据与核验范围

按run_id过滤并保留原JSONL字节，raw-input-manifest.json逐行保存源绝对路径、全局行号、字节偏移和SHA256，日志只读。

|局号|decisions|states|sl-attempts|run-config|run-plans|
|---|---:|---:|---:|---:|---:|
|751FN9QM9MHQ|615|624|6|1|2|
|KV0JHNJCKXLS|669|686|7|1|5|
|YQL8RZ8BWN1E|571|582|6|1|3|
|L9SGRBB5R698|635|653|6|1|3|
|PU80F84P6HPN|1033|1064|12|1|5|
|KEN58SH9SLZ6|548|558|6|1|3|

共4071决策、4167状态、43条SL、6配置及21计划，全部状态run.character_id/ascension逐帧核为SILENT/A10。SL条数按当前物理文件精确run_id匹配，不等独立尝试数；KV包括F16，PU包括F17/F28。旧PU复盘说13条SL，当前原文精确命中12条，保持差异，未补造第13条或改历史。

原10份提案逐文件SHA256与专用队列一致，*.original.md保持字节；已读对应六局复盘并保存*.postmortem.md。仅折叠本批16个关联账本条目；当前silent经验只取本批12条已链接项，版本2026-10-12.14。历史引用的其他局只作为原记录背景，未扩展证据任务或将其当本次独立核验。

## 同盘局部成本、反例与限制

六组首次题指纹核验与六组跨轮资源差核验均通过。净削含当轮实际结算的毒/反伤等，不冒称全部牌伤；summary跨轮净差不补截断的敌回合。

|局/层/回合|尝试对|实损|敌净削|限制|
|---|---|---|---|---|
|751/F17/T2|1→3|13→18|9→18|下轮多打牌/抽序亦变，不能归整战因果|
|751/F17/T7|2→4|13→23|12→18|未决弃牌保守模型两线同多计6，血价差10仍成立|
|751/F17/T13|1→6|8→2|17→11|省血少输出，两线均失败|
|KEN/F17/T10|4→5|15→21|2→4|无实体新增两段各1；后轮也变|
|KEN/F17/T5|4→6|7→5|1→2|续问追加小刀且步法建立延迟，排除只保血恒优|
|KV/F33/T5|4→5|0→0|36→29|删毒没有当轮保血收益，续问和后轮改线|

751 T7首次题272455进入pending，之后选弃牌才少一呼唤；states278500→278505实际45→39、敌121→117，不能把未决弃牌模型的保守6血看作新纯bug。751 F13 T3的plan2即时损8/伤26，严格无药plan5损8/伤16，两者五轮模型均8/8赢、存活样本终结均值2.3/2.9；plan3虽本轮不喝，后继7/8喝药。实际选择饮药，states278403→278404槽0消耗、建5力量，未执行的plan5与留到boss支线仍未知。

KEN七次槽位饮药在potion-and-ability-verification.json逐前后状态核验：F3T2攻击、F4T1稳定、F5T2速度、F11T1虚弱、F11T2攻击、F15T1发光、F15T1技能。随机生成的中位例不是实取卡；选择、抽牌后重问可截断原线。末试T8未建敏捷，T9 states280701→280702才0→2敏；即省2血不能当能力收益保留。

巨兽原SL 679/682（L9）、715/716（PU）、958—963（YQL）直接记录占位血；681/717/960—963的anchor.ranked是参考路径来源，不能把该记录所在尝试当被引用路径本身。YQL states280160→280161的毒2→8，HP26、挡13、来袭41及占位HP不变；26+13−41=−2与死亡截断0分开。PU末试F17T15获胜只是另一整战支线的实录，不证明新参考排序或单个动作可转胜。

以上不足拟合5/10/6血等固定准入门槛、药水持有HP价、只保血优先或新自爆排序；同一局多次SL不能拆成训练与留出验证样本。没有给未知分支补预训练事实、模型胜率或虚构胜局。

## 已有实现与逐项处置

source-ancestry.json核12条定位路径对应真实live祖先源码，并对照当时live HEAD与工作文件：全部工作源码和HEAD一致。记录live HEAD：`3f7eba0ef0c8f29bc2fbf21c8fb81d7a3cac55ee`。

- `9d8278702dbc581b5015ba7ec9a70dc0fb94cccb`：silentHeldLossFacts及selection_audit的持牌/pending拆项。
- `c4670f4f416c7d93e192e889c5080e7e4e0e733f`：silentPotionReference未知持有价与整战无药样本参考。
- `66283dd9982bdd7f480da7a4d9bfefea0572a9ac`：SL candidate/resource_comparison及selection audit候选拆项。
- `40168f4a903ae1d8c48bd03006f8fea19fd3aa3c`：巨兽当前阶段/毒水实录展示。
- `b01edf46b4b619f217d070a196e161df9fe716a0`：本批定位的attempt/explore/controller最新源码；当前giant_phase/giant_final_resources已区分本体0与自爆，但enemyHpLeft/anchorRank保留原始占位残血比较。

这些是已有子项，不能以一条诊断提交替代原完整提案。candidate_comparison.actual_turn_result、selection_audit.actual_turn仍为null，首次派发与真正整轮兑现不同；T7弃牌、KEN随机药、KV续问以及能力后继的归属仍需补足。五条大文件与当前live的blob差异全部仅Roy/Dai注释替换，local-live-source.patch保留；未覆盖这些差异，也未读取其中注释引用的其他角色数据。

### silent-proposal-366288801d9150d9

来源：postmortem → strategy-proposal；领域：sl, combat；账本：silent-0079, silent-0176；证据局：751FN9QM9MHQ。

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md`；SHA256：`0ba601d50f1341977ec60627d24994e0755ef1cf396a60832000400c5805c524`。

处置：**waiting**。751 F17 T2/T7/T13同指纹实损13→18、13→23、8→2及净削9→18、12→18、17→11已核。live已有候选资源/B2/首次派发子项，但actual_turn仍空；T7生存者进入pending后才选弃牌，缺确定弃牌后的全轮收益归属和保持后继/随机输入一致的整战验证，不拟额外血价门槛。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-85929bdfc8a3fc1b

来源：postmortem → strategy-proposal；领域：combat, potion；账本：silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176；证据局：751FN9QM9MHQ。

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md`；SHA256：`d42d3f29d0d36b262352160a104dd8b97831ef9d8ecbbd4bce3dba367f9c8d68`。

处置：**waiting**。751 F13 T3有药plan2和严格整战无药plan5均模型8/8赢、损8，终结均值2.3/2.9轮；plan3后续7/8仍喝药。未知持有价值及持牌保守来源已展示，缺实际无药/留药后继与确定弃牌后毒、荆棘、持牌/药价的联合执行验证，不能把缺表0拟成留药价值。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-efd9f83ee9e1a6dc

来源：experience-update → strategy-proposal；领域：sl, combat；账本：silent-0079, silent-0176；证据局：751FN9QM9MHQ。

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md`；SHA256：`0065ae0291ac4675d0a895128c71c68b35602c3eb6b5887b92fca11891c29006`。

处置：**waiting**。751的SL成本预测已有live祖先66283dd9982bdd7f480da7a4d9bfefea0572a9ac，持牌pending拆项已有9d8278702dbc581b5015ba7ec9a70dc0fb94cccb；两者不能补出确定弃牌后的全轮分账与更差B2线的受控后继，六次SL仅一独立局，原完整提案仍waiting。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-131042659448ae74

来源：experience-update → strategy-proposal；领域：combat, potion；账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176；证据局：751FN9QM9MHQ。

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md`；SHA256：`b1ff1ca1e5d3da182f25af9b0040780e288a77e627b08c2fee262a17f8f49951`。

处置：**waiting**。751 F17 T7实际一呼唤失6、全挡仍损6及F13肌肉药建5力量已核；已有持牌/药价参考不是敏捷、毒、荆棘、呼唤和药水的联合实际收益核验。缺同题实际无药整战及完整续问归属，不调整饮药/护栏/弃牌排序。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-990f054036609447

来源：experience-update → strategy-proposal；领域：combat, sl；账本：silent-0102, silent-0019, silent-0020；证据局：KV0JHNJCKXLS。

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md`；SHA256：`c7fa0a97eea334f338e208a6bae8e709dce021cd3157dd32cb3ca1a45900e053`。

处置：**waiting**。KV F33 T5首次题273400/273450同指纹，删致命毒药后净削36→29、两线均零损，273451续问阻止补毒且T6改线；缺跨问毒/回血毛净伤归属与保持后继一致的整战，不把删输出称保血收益，也不拟SL门槛。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-e18d3f18e6cac2a0

来源：postmortem → strategy-proposal；领域：combat, potion, sl, terminal；账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046；证据局：YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN。

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md`；SHA256：`3cc66ab0b4fb05a0d6d4e62b514b13caf9e157eba4d781f5a60f76276047c821`。

处置：**waiting**。巨兽阶段及最终资源展示已有live祖先源码；L9 F17 T14、PU T17、YQL T13占位HP原行已核。当前anchorRank仍以原始占位血作同轮比较，改为本体0会改变旧平局选择；缺改序后的完整后继及独立验证，PU末试胜不能归因于新排序，不能把阶段展示当整项完成。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-9733bb80f445aeae

来源：experience-update → strategy-proposal；领域：combat, potion, sl, terminal；账本：silent-0017, silent-0019, silent-0020, silent-0250；证据局：YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN。

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md`；SHA256：`c0da0af7803a73b361bb98e358c2a5c12b8056a68c28614a592138e7cdd88382`。

处置：**waiting**。YQL F17 T10 states280160→280161仅毒2→8，HP26/挡13/自爆41不变，当前巨兽药水观察展示已有40168f4a903ae1d8c48bd03006f8fea19fd3aa3c。缺提前喝/不喝/留药及改SL参考排序的受控整战，不把6毒当减伤或新药价。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-c51468c5e8ba6668

来源：postmortem → strategy-proposal；领域：potion；账本：silent-0019；证据局：KEN58SH9SLZ6。

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md`；SHA256：`168cc03750525c56cace3915f22ef4dd1cf768f87b17e70f5228964a168c8469`。

处置：**waiting**。KEN七次实际耗药槽位均由原状态核实；攻击/技能药进入选牌，发光水后另问，F15技能药的中位例取逃脱计划而实际后续另选，原候选不等完整执行。缺逐候选整轮收益归属、F15不喝及任一药留到boss的对照，暂保留持有价值规则。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-86a7db08d1a31976

来源：postmortem → strategy-proposal；领域：combat, sl；账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176；证据局：KEN58SH9SLZ6。

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md`；SHA256：`10de295b469f48281050aeb04a8ad6ccb2906e007d48386a6c8f769cc7600ac6`。

处置：**waiting**。KEN F17 T10第4/5试同指纹多损6仅多净削2；T5第4/6试省2血、追加小刀后多净削1，却把步法T5延至T9（states280701→280702才建2敏）。缺能力后续完整收益及同后继/独立验证，不从无实体局部6血/2伤写统一探索阈值。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

### silent-proposal-e282a9131b99129a

来源：experience-update → strategy-proposal；领域：combat, sl；账本：silent-0021, silent-0079, silent-0125, silent-0176；证据局：KEN58SH9SLZ6。

原提案：`/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md`；SHA256：`a88a2a95875b8fa04d80376a10a3ed59ede080db13ccb2a7e14c3ebfc1c34872`。

处置：**waiting**。KEN持牌预测/候选比较及首次派发子项已有实际live祖先，实际整轮字段仍空；T5省血同时延迟能力、T10多血价只加2实伤说明双向成本，但六次重打非独立样本，缺保持后继不变的换线因果与后期独立验证，不能登记完整implemented/duplicate。

预期后续：依本项冻结原帧补确定选择后的动作/状态归属；规则候选先补保持其余后继一致的本角色整战对照，若拟合则用更早独立局训练、之后新局留出验证。不用同局相关SL报泛化收益。此次保留现有规则；新增实现才执行撤码失败/恢复通过与沙箱自测、live合入。

## 验证、失败与交付

本批没有源码修改，未运行生产tsc/vitest、沙箱套件或撤码对照；tests固定记录为tsc=null、vitest=null、cases=null。上述SHA、身份、指纹、资源与槽位核验是材料分析，不是生产测试或实盘反事实。没有源码提交，因此没有merged、release_id、版本、shipped或已采用声明；第4节不执行空合入。

两次材料分析错误原文保存analysis-failures.txt：非战斗首帧combat=null的诊断打印报TypeError；KV把同轮续问误计首次题导致断言失败。前者未损坏已冻结材料，后者纠正为273400/273450首次题、273451另问；修正后的逐帧身份核验与candidate-verification.json保留。没有把它们当生产代码故障或测试通过。

账本仅经根learner/ledger.py update补本报告/提案路径与逐项等待说明，不新增重复经验/提案id，不改旧claim/status/version或替运维标shipped。父量化/牌表要求不据本批报告关闭。当前无新异议/旧知识冲突结论，旧限制和原复盘勘误均保留；PU物理条数差异交ops核查，未修改原记录。

提案材料：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-014201-s2/learner/runs/20261013-014233-strategy-proposal/proposal.md`。正式报告：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-014201-s2/learner/runs/20261013-014233-strategy-proposal/report.md`。逐项机读结果：proposal_results.json，最终回报：result.json；原行证据清单：raw-input-manifest.json，已有源码与实际live祖先：source-ancestry.json。最终工作树应保持HEAD=base且git status干净；除scratch和明确授权的根账本CLI追加外无写入。

最终验收补记：根ledger CLI退出0，16条实际追加行/偏移/SHA在ledger-cli-rows.json，均仅where/note更新。pinned-live-source-verification.json在冻结实际live HEAD 3f7eba0ef0c8f29bc2fbf21c8fb81d7a3cac55ee下复核13源码路径及祖先，全部与其工作文件一致；新补读的silent-selection-dispatch实际整轮字段同样为null。gitleaks对本批材料扫描退出0/空结果（gitleaks-report.json），不是源码测试。最终JSON十项覆盖完整、HEAD=base、工作树干净核验通过。

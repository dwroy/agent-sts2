# 静默猎手策略提案逐项复核

本批只处理派来的十个原提案，不新增提案ID。六来源局均由runs.jsonl核为SILENT/A10。本次结论是十项waiting，原假设和现行规则保持。现有诊断的实际live祖先已核，但它们只覆盖预测或阶段展示；不把局部实现认作跨续问实际兑现、整战反事实或组合提案完成。

复核时间：2026-10-13T23:57:08+0800。批次：20261013-234152-s2-strategy-proposal。

初始HEAD为b6cfca865bd7183f16f883fe073cec1ea87f9813；按普通批次要求合并main后，report.base为`1ed5e441700b5ceaa3c1f9bc9f27a3b62fe9f082`。绑定行task=strategy-proposal、character=silent、reason=proposal、worktree吻合，十个proposal_ids无重复；无research_request、implementation_request、proposal_repair，故不承接其他专题。普通专题文件绑定20261010-150327，与本批不匹配。派发原件见dispatch.json，队列add/末态见queue-snapshot.json。十份原Markdown字节SHA256均与队列原登记吻合；原件与原失败/处置历史保持。

## 证据与限定结论

实际抽取本批六局的4071条决策、4167条状态、43条SL尝试记录；只对下列选定事实作有界复核，不声称分析所有决策或全历史。原日志只读；每条冻结原字节的物理行号和SHA见evidence-index.json。状态局号在state.run_id。更早角色私有数据未读取，本批不发布公共经验。

| 局号 | 决策 | 状态 | SL记录 |
|---|---:|---:|---:|
| 751FN9QM9MHQ | 615 | 624 | 6 |
| KV0JHNJCKXLS | 669 | 686 | 7 |
| YQL8RZ8BWN1E | 571 | 582 | 6 |
| L9SGRBB5R698 | 635 | 653 | 6 |
| PU80F84P6HPN | 1033 | 1064 | 12 |
| KEN58SH9SLZ6 | 548 | 558 | 6 |

固定证据读回的30项断言全部相符，verify-evidence.log/verification.json保留结果；这是日志核验，不是tsc、vitest或源码撤改测试。

- 751FN9QM9MHQ F17 T2，decisions272434/272575同指纹，states278479→278483及278620→278623：整轮净损13→18、敌净血差9→18。T7 decisions272531/272652同指纹，states278576→278581及278697→278702：净损13→23、敌净血差12→18；题面损19→29，不能把两线各保守多计6误当换线多花16血。T13 decisions272483/272820，states278528→278532及278865→278869：净损8→2、敌净血差17→11。这些是正反向取舍；六试全败，不推出固定5/6/10血阈值。
- 751 F13 T3 decisions272361的有药plan2/无药plan3/整战无药plan5均当轮损8，有药牌伤26、无药16，已有8/8样本。plan3后续7/8喝药，plan5才明确整战不喝；缺表成本0不等于持有价已证0，也不等于无药支线实际执行。F17空栏不能倒推F13错误。
- KV0JHNJCKXLS F33第4/5试T5，decisions273400/273450同指纹，states279460→279465及279511→279515：两线当轮均零损，净扣36→29；后续避免补打毒药另见273451。首/末T1 decisions273242/273474同指纹，states279298→279309及279535→279545：均零损，净扣28→14。这支持删输出不等于已证保血，不支持单步导致整战失败。毛伤/回血必须另记，不能用净差补齐。
- YQL8RZ8BWN1E F17六试本体结束T12/T12/T11/T12/T12/T9，自爆来袭50/50/47/50/50/41；phase-and-power-observations.json记录首次EXPLODE_MOVE＋DeathBlow有效帧279890/279944/279999/280055/280114/280157。末次T10 states280160→280161毒2→8、HP26/挡13/来袭41不变；这一次施毒没有已观察的回血/加挡/降低自爆收益，不外推提前用药。六试全败。L9SGRBB5R698 F17 T14的sl-attempts679/682、PU80F84P6HPN F17 T17的715/716和YQL958—963，均保留原始近十亿占位血。PU第5试F17赢留2（719）是原实际路径，并非新排序受控结果。
- KEN58SH9SLZ6 F17第4/5试T10 decisions274505/274568同指纹，states280588→280592及280651→280655：净损15→21、敌净血差2→4；B2 .385→.127，差-.2583、SE .0132。第4/末试T5 decisions274484/274601同指纹，states280567→280572及280684→280689：省2血，净伤1→2包含追加小刀；第4试T5已有2敏捷，末试T8仍0、T9才2。省血不能当长期收益不变，能力分数不能预支成当前挡。
- KEN七次实际耗药通过decision及前后occupied槽位确认：F3 T2攻击药274131/280206→280207；F4 T1血清274156/280232→280233；F5 T2速度274185/280262→280263；F11 T1虚弱274235/280313→280314、T2攻击274237/280315→280316；F15 T1发光274267/280348→280349、技能274272/280354→280355。三处action receipt仍pending(unstable)，后帧槽位变化支持耗药，不把队列回执当完整方案执行。六次F17均75血/空药栏；无不饮用或留药整战受控支线。

全部相关多次SL按同局相关尝试解释，不拆训练/验证。若后续拟新门槛，需保存完整原/替线动作、抽弃与药水续问、每轮结算分账，按独立局真实时间切分，另留后期验证。未执行反事实和未知值保持未知。

## 现有live源码及消费者边界

| 现有部分 | 实际live祖先源码提交 | 当前边界 |
|---|---|---|
| held_loss | `05cd292c6f01bb31e406473d3a9843e659d62b93` | 候选持牌失血、挡后入伤、未决弃牌；actual_held_hp_loss=null，不能叫完整实际归属。 |
| potion_reference | `04921bd785ac6838066522f91ea0bb6ab95cb6a1` | 无药/未知持有价同题对照；已有样本或时钟字段不等于实打留药结果。 |
| candidate_comparison | `a8b1f8be153fe4f3a34146117546c2178f2e446b` | SL候选两线比较；actual_turn_result=null，重问后不沿用预测作已执行。 |
| resource_comparison | `a8b1f8be153fe4f3a34146117546c2178f2e446b` | 原/替线资源差；execution=unverified，随机中位线不作配对实际差。 |
| giant_potion | `d5e20aa4dd44168ce30944dfcce74f8322144953` | 本体结束/毒水单次限制事实；不改参考排序或必死判断。 |
| giant_resources | `0d092f6b928a6221eabf3516abad25c48ceaac9c` | 窄观察修饰集的最终资源；本批YQL其他遗物/能力不在该通用可确认范围。 |

六个提交均是真实live祖先，其对应源码blob与当前live、本工作树完全相同（source-provenance.json）。另核explore.ts的enemyHpLeft仍直接累加原始显示HP，anchorRank仍按存活轮数后用它破平局；已存在阶段说明不代表排序修好。源码完整等价没有成立，故不将十个宽提案任何一个标duplicate/implemented。

## 逐项处置

### silent-proposal-366288801d9150d9

账本：silent-0079, silent-0176。证据：751 F17 T2/T7/T13，均A10。来源：postmortem；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md；SHA256：0ba601d50f1341977ec60627d24994e0755ef1cf396a60832000400c5805c524。

处置：waiting。候选血价与B2差已展示，但完整回合实际结果仍未自动关联跨抽弃牌续问；缺保持其余后继一致的原/换整战回放及独立后期验证，不能拟额外失血门槛。

预期行为与验证：保留现有候选、诊断和规则；按本项原范围补齐上述缺口，再用固定日志/状态核实际消费者及完整后继。既有已观察数字可作核验输入，不据此承诺通关率。无需回退当前规则；将来只回退实际独立实现提交并保留历史。

### silent-proposal-85929bdfc8a3fc1b

账本：silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176。证据：751 F13 T3、F17 T7/T13/T17，均A10。来源：postmortem；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md；SHA256：d42d3f29d0d36b262352160a104dd8b97831ef9d8ecbbd4bce3dba367f9c8d68。

处置：waiting。未决弃牌与药水未知持有价诊断已有；原提案的已确定/未决损血联合核验仍缺续问后实际归属，F13无药或留药至F17没有受控完整实打，不能将局部字段判整项重复完成。

预期行为与验证：保留现有候选、诊断和规则；按本项原范围补齐上述缺口，再用固定日志/状态核实际消费者及完整后继。既有已观察数字可作核验输入，不据此承诺通关率。无需回退当前规则；将来只回退实际独立实现提交并保留历史。

### silent-proposal-efd9f83ee9e1a6dc

账本：silent-0079, silent-0176。证据：751 F17 T2/T7/T13，均A10。来源：experience-update；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md；SHA256：0065ae0291ac4675d0a895128c71c68b35602c3eb6b5887b92fca11891c29006。

处置：waiting。同751证据的经验来源提案仍缺完整执行分账、单一改线受控后继与独立验证；六次相关失败不能拟统一血价阈值或关闭更差线探索。

预期行为与验证：保留现有候选、诊断和规则；按本项原范围补齐上述缺口，再用固定日志/状态核实际消费者及完整后继。既有已观察数字可作核验输入，不据此承诺通关率。无需回退当前规则；将来只回退实际独立实现提交并保留历史。

### silent-proposal-131042659448ae74

账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176。证据：751 F13 T3、F17 T3/T5/T7/T17，均A10。来源：experience-update；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md；SHA256：b1ff1ca1e5d3da182f25af9b0040780e288a77e627b08c2fee262a17f8f49951。

处置：waiting。逐张机制及候选事实已有，跨续问整线执行、能力逐轮兑现与无药/留药支线尚未联合验收；缺该组合范围的完整结果，不能将局部诊断判整项实现。

预期行为与验证：保留现有候选、诊断和规则；按本项原范围补齐上述缺口，再用固定日志/状态核实际消费者及完整后继。既有已观察数字可作核验输入，不据此承诺通关率。无需回退当前规则；将来只回退实际独立实现提交并保留历史。

### silent-proposal-990f054036609447

账本：silent-0102, silent-0019, silent-0020。证据：KV F33 T1/T4/T5；F28/F32路线仅原提案限定观察，均A10。来源：experience-update；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md；SHA256：c7fa0a97eea334f338e208a6bae8e709dce021cd3157dd32cb3ca1a45900e053。

处置：waiting。KV删毒当轮同零损而少7净输出，已有净血字段不能代替敌回血毛/净分账；缺其余后继受控的整战比较及路线休息反事实。

预期行为与验证：保留现有候选、诊断和规则；按本项原范围补齐上述缺口，再用固定日志/状态核实际消费者及完整后继。既有已观察数字可作核验输入，不据此承诺通关率。无需回退当前规则；将来只回退实际独立实现提交并保留历史。

### silent-proposal-e18d3f18e6cac2a0

账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046。证据：YQL F17 T10/T12/T13；L9 F17 T14；PU F17 T17，均A10。来源：postmortem；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md；SHA256：3cc66ab0b4fb05a0d6d4e62b514b13caf9e157eba4d781f5a60f76276047c821。

处置：waiting。本体/自爆事实已有，但SL同轮排序仍用原始占位血；缺新参考路径的受控完整后继与最终资源校准，不能直接将占位血归零改序。

预期行为与验证：保留现有候选、诊断和规则；按本项原范围补齐上述缺口，再用固定日志/状态核实际消费者及完整后继。既有已观察数字可作核验输入，不据此承诺通关率。无需回退当前规则；将来只回退实际独立实现提交并保留历史。

### silent-proposal-9733bb80f445aeae

账本：silent-0017, silent-0019, silent-0020, silent-0250。证据：YQL F17 T10；L9 F17 T14；PU F17 T17，均A10。来源：experience-update；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md；SHA256：c0da0af7803a73b361bb98e358c2a5c12b8056a68c28614a592138e7cdd88382。

处置：waiting。已有巨兽阶段和毒水限制诊断；缺阶段参考路径改序的完整对照及提前用药/留药整战结果，原胜线不能证明新排序或药时收益。

预期行为与验证：保留现有候选、诊断和规则；按本项原范围补齐上述缺口，再用固定日志/状态核实际消费者及完整后继。既有已观察数字可作核验输入，不据此承诺通关率。无需回退当前规则；将来只回退实际独立实现提交并保留历史。

### silent-proposal-c51468c5e8ba6668

账本：silent-0019。证据：KEN F3 T2、F4 T1、F5 T2、F11 T1/T2、F15 T1、F17 T1，均A10。来源：postmortem；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md；SHA256：168cc03750525c56cace3915f22ef4dd1cf768f87b17e70f5228964a168c8469。

处置：waiting。KEN七次耗药槽位已核实，但重问和随机选牌后的完整候选兑现归属仍缺；没有F15不饮用或保留至boss的受控整战支线。

预期行为与验证：保留现有候选、诊断和规则；按本项原范围补齐上述缺口，再用固定日志/状态核实际消费者及完整后继。既有已观察数字可作核验输入，不据此承诺通关率。无需回退当前规则；将来只回退实际独立实现提交并保留历史。

### silent-proposal-86a7db08d1a31976

账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176。证据：KEN F17 T2/T5/T8/T9/T10/T13，均A10。来源：postmortem；原文：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md；SHA256：10de295b469f48281050aeb04a8ad6ccb2906e007d48386a6c8f769cc7600ac6。

处置：waiting。KEN T10多损6仅多2净伤、T5省2却延迟步法均可复核；缺完整能力收益分账、固定其他后继的整战重放及独立后期验证。

预期行为与验证：保留现有候选、诊断和规则；按本项原范围补齐上述缺口，再用固定日志/状态核实际消费者及完整后继。既有已观察数字可作核验输入，不据此承诺通关率。无需回退当前规则；将来只回退实际独立实现提交并保留历史。

### silent-proposal-e282a9131b99129a

账本：silent-0021, silent-0079, silent-0125, silent-0176。证据：KEN F17 T2/T5/T8/T9/T10/T13，均A10。来源：experience-update；原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md；SHA256：a88a2a95875b8fa04d80376a10a3ed59ede080db13ccb2a7e14c3ebfc1c34872。

处置：waiting。原经验与局部成本已核实，但六试相关且后继同变；缺跨续问完整兑现、受控整战后继与独立后期样本，不能以局部诊断关闭原宽提案。

预期行为与验证：保留现有候选、诊断和规则；按本项原范围补齐上述缺口，再用固定日志/状态核实际消费者及完整后继。既有已观察数字可作核验输入，不据此承诺通关率。无需回退当前规则；将来只回退实际独立实现提交并保留历史。

## 记录、验证与失败保留

本批无源码、知识或版本修改，无新增源码提交、live合入、release_id，也不新建重复code-proposal ID或登记shipped。现有十个CLI ID按原队列消费，逐项结果交原调度器追加；不手写队列或learn.json。仅经根ledger.py update为旧账本追加本批链接和核验限制，保留历史claim/status/version，不将旧已上线机制降级，也不把宽提案waiting误称机制未观察。没有新增游戏知识add，故无新增status=proposed条目。

源码撤掉失败/恢复通过：不适用（本批没有源码改动）。tsc=null，vitest=null，cases=null，未运行生产测试，不报0或套用历史绿验收。固定材料验证30项相符与阶段/能力读回单列；没有LLM、网络或play。

初次日志抽取按任意引用匹配，遇到非本批根run_id行JSON解析失败，部分产物保留decisions-evidence-first-scan.failed.jsonl。改为明确根run_id后六局决策/尝试抽取缺口0。首次状态抽取把run_id当根字段得到0，修正为state.run_id后实际4167帧读回，旧零计数保留*-first-scan.json，不能当缺帧或新证据。巨兽首次仅max_hp识别把过渡帧当下一轮而断言失败；首次观察保留phase-detection-first-check.failed.json，最终增加实际move/DeathBlow来袭核验后六次回合和伤害全相符。这些是本批分析脚本的失败/修正，不是生产代码失败，不隐去或冒作新游戏结论。

proposal.md、report.md以及本批原字节证据都在指定scratch内。最终工作树保持干净、HEAD=report.base；只有授权根账本经CLI追加记录。工作树/原日志/初稿由原调度器验收后回收，不删除自身。

## 本批最终机械验收

2026-10-13T23:59:01+0800：根账本CLI的16个原条目追加行逐字段精确读回，未写status/claim/version；根ledger.py check：458条目、0问题。code-proposal结果十ID齐全、无新ID或源码commit。初两次账本回执读回分别误认一ID一行、JSON列表而失败；按真实空格分隔输出核验后通过，失败原因保留ledger-readback-first-checks.failed.json，不重复CLI追加。gitleaks scratch扫描退出0、约153.97MB、no leaks found，原日志见gitleaks.log。git status --porcelain空、HEAD与report.base相同。

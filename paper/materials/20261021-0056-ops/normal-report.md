# 静默猎手策略提案批次报告

记录时间：2026-10-21T00:53:43+08:00，写前已运行date。本批十项均waiting，未新增生产源码、知识、提交、合入或版本；未声称shipped、正式入库、自然采用或收益。逐项处置及原账本见proposal.md和result.json。

## 身份与基线

开工git status --short为空，HEAD=cc87015b78fa3f430e7a344d2edb01bc59e148dd；git merge --no-edit main返回Already up to date，最终继续保持该完整40位基线。本批learn.json实际task=strategy-proposal、character=silent、reason=proposal，绑定本工作树和十个proposal_ids，无proposal_repair、research_request或implementation_request。普通专题文件绑定别的旧批，不满足本批承接条件，未读其他专题替代身份。dispatch.json保留实际本批行。

已读README、最新STATE-2026-10-19、decision-log末尾、学习协议、代码提案协议。STATE历史STOP与后续决定分别保留，不自行调整运维状态。独立完成，未派子agent、未联网、未运行play、未修改共享配置或模型档位；未独立核到本原生请求的turn_context，因此不宣称档位已验收生效。

## 原始证据与冻结边界

先核runs.jsonl，六局均SILENT/A10且ended非空，终局均victory=false。脑来源及历史引擎计数字段原样保留，本任务不重算纯Codex战绩或策略效果分母。身份只用明确run_id/state.run_id/fingerprint.run与精确decision_id原行；正文引用其他局不增加本批所属证据。

| 局号 | 结束时间 | 层 | decisions | states | Jev行 | 本批完整读题 |
| --- | --- | --- | --- | --- | --- | --- |
| 751FN9QM9MHQ | 2026-10-07T10:42:44.792Z | 17 | 615 | 624 | 137 | 1 |
| KV0JHNJCKXLS | 2026-10-07T11:22:13.836Z | 33 | 669 | 686 | 104 | 2 |
| YQL8RZ8BWN1E | 2026-10-07T11:52:08.518Z | 17 | 571 | 582 | 253 | 1 |
| L9SGRBB5R698 | 2026-10-06T06:15:59.398Z | 17 | 635 | 653 | 251 | 0 |
| PU80F84P6HPN | 2026-10-06T09:35:15.526Z | 33 | 1033 | 1064 | 172 | 0 |
| KEN58SH9SLZ6 | 2026-10-07T12:23:25.134Z | 17 | 548 | 558 | 109 | 4 |

已实际运行摘要入口、指定v6-evidence四流提取和默认evidence八流提取。两份manifest保留各自切点，日志继续追加造成切点不同不是冲突；没有覆盖旧截点或零行初稿。source_size/前缀SHA、每行offset/bytes/SHA及identity均保留。原日志只读，原始题面八行又按offset读回并逐SHA核同，1026条Jev均机械读回核hash及精确decision_id关联。默认与专项所选decisions/Jev计数相同；summary仅索引，不作为机制/采用证据。

| 流 | 默认冻结source_size | 默认冻结前缀SHA256 |
| --- | --- | --- |
| states | 14787827276 | 8af8a77ad3dbb5b9afccedc6fa998eb4ca535c5f64c029a0a6bd064ad67f6032 |
| decisions | 3024221949 | c4f6a89e5a7fce9d543aee96e1c3857e186bc038040bab8372cad699209dbe6e |
| sl-attempts | 50187049 | e6dd3f528787fa03b936f9f3367baacc1410c9fb889cf5fa99f44d56df655b49 |
| run-config | 2276751 | 7fcfd71260bbeac8ce3e0062e108b99757f22928520e320bc52018842b05decb |
| run-plans | 10154299 | dbc7b5b96e590ff126d1d83dfdcd735b3ec00648022c6433da88184e888a7b77 |
| brain | 1133049277 | ebfbaf8cecdbd0e7c5a47d488448f7827327d00519dcdf470e8152c00f2064ac |
| v6-build | 64655258 | 3d8f2ff612161c217ad323f9f7d732b10406fea93021da7e84255e291d65d234 |
| jev-prompts | 2211696989 | beeaf59bf99abe9e186360208531dffdac5a5becce8d7afbd7a6efbf911eeebd |

专项切点另见v6-evidence/evidence-manifest.json。v6-build在64,655,258字节切点均no_match；其entries/jev_answer/fallback/unknown对本批不可观测，不记全0业务结果。六份历史run-config没有V6字段，on/off未知，不能把缺字段写成off；Jev.enabled均true。不存在本批V6题面可读不表示没有历史对局证据，也不代表当前V6的发布/消费验收。

全流保留缺口：states有2条invalid及3350条unknown_identity；decisions有2条invalid、1934条unknown_identity及1413条unmatched_decision_id；Jev有1条invalid；brain有2条invalid。它们是扫描前缀的全局缺口，不计作本批错误分母或其他角色游戏事实。所选Jev显式身份与decisions精确关联均成立，1026条均有request/answers且error字段无非空值；这只说明这些日志字段，不证明答案正确。完整行截断计数为0，不把未知/缺失改写为成功或零。对象视图pending_host_seal和deferred_errno=18保留，宿主封存尚未验收。

## 逐问题原文覆盖

模型完整读取8条原始request（含state/全部questions和选项）、answers及身份元数据；其中28271首轮工具输出总预算裁掉头部，已单独补读前2000字符，不能把被截掉输出当已读。对应决策chosen/result、SL替线与后续state窗口另核；gate_reject和selection_dispatch在本批所选81条续步中是字段缺失，明确不填false或伪造成功。

| Jev原行 | 决策原行 | 精确decision_id | Jev offset/bytes | Jev SHA256 |
| --- | --- | --- | --- | --- |
| 27699 | 272361 | 179c20e7-efd4-44e8-8ee1-406abd398d69 | 398012392/17613 | 2e96bb662b4fdd0723eed722f13c3a01fff5c2d24841b235f1c2ef1075178cf9 |
| 27899 | 273400 | 610bfa55-18de-410d-ac05-cf5c43772962 | 400525783/16475 | caf5b6295b68e649a4dcf5ebaf3017b699af0f0faa1b71dae6e0ffacf5a53e30 |
| 27907 | 273450 | 427b1bd7-6bb7-440e-bc15-caa96029c513 | 400689626/17713 | e152ebc69c9315ea695891fcaa01fcbe442eb31e1ab0579c94e9d3f75cc7c86b |
| 28173 | 274087 | 2b22d776-2a5e-47cd-a9e2-46d3e67f61ef | 404305929/13653 | fb25cd458d94d92f7c9c8db4a34580967c2adfa52150a5d185c459214f243bd3 |
| 28211 | 274272 | fed78f61-e646-42f4-b93d-84efa3e6575d | 404771254/13500 | 8403d3a0a440a33db1df96ddedfcbe8dbf34913af2ae46a766894675a836cf33 |
| 28257 | 274505 | 4b79d414-135c-400c-a965-9446f0cab72a | 405376179/17673 | cddbcc8a6dd676323d16578339e37923f643c30904c3036d4365d74a2bed3571 |
| 28271 | 274568 | a2ec4e39-f5ad-4380-ab93-f804ddbebf3f | 405594035/19251 | a487fcb03ef4577e2dbcee298fa879970c0a6b72bbbec2b0e27b67e6996176a4 |
| 28276 | 274601 | 2073c41d-00b2-43a5-9ccb-946168bf512b | 405691722/22689 | 6e6d5e75f9775d6c0b5eb01c78a8ff04703be89bba84af72e341858d7d44709a |

其余1018条未逐字完整读题，question-index.json每条均标model_read=false及具体范围原因；19锚点的其他问题只作决策/状态核对，没有冒称完整题面复核。L9/PU本批仅核巨兽阶段状态、SL原行及角色终局，完整Jev读题为0。未完整重读全部路线/休息、九类历史经验各来源、完整技能/攻击药随机收益及后期独立局，保留缺口；未用最后五条替代全覆盖。coverage.json区分完整读题、机械扫描、状态窗口与未读范围。

## 从原文到实际后果

1. **751 F13 T3（0019/0021/0129等）**：完整Jev27699答plan2，confidence=.24；plan2有药损8/伤26，plan3无药当轮损8/伤16但后续7/8使用肌肉药，plan5才是整战禁药参考（8/8模型胜）。272361先防御，272362再饮药，278402—407核槽位消失、力量+5及实际58→50。题面缺表成本0不是已证持有价值0。药后敌40→11的29是状态净血变化，题面damage26与敌已有挡/毒/反伤的来源不能直接混作同一数。未执行plan5或留药Boss，不判本次饮用错误。
2. **751 F17 T2/T7（0079/0176）**：272434/575、272531/652同指纹对照，后者SL明确B2 .103→.013、diff−.09/se .0088；states278576—581与278697—702实损13→23、敌净扣12→18，多6扣血花10血。T2两分支63→50/45、敌186→177/168；额外抽牌影响后续，不能只归单步。T7生存者后的实际选择弃呼唤，未决弃牌的保守上界不是pure bug。此组本批完整读题未覆盖，仅原决策和续帧复核；不据它拟合策略权重。
3. **KV F33 T5（0102/0019/0020）**：完整题27899/27907指纹相同、Jev均选plan1猎杀者+毒药，且所有B2为0。273450经SL改只猎杀者，后续273451结束，279460—465与279511—515核敌334→298/305、玩家均30不变、后毒20/13。273403与273452超时均保留，后重试成功，不能把第一次失败抹去或说整线已一次成功。删毒少扣7，没有当轮保血；完整后轮毛伤、回血与改动后的受控后继未齐，不用净扣当完整毛伤。后轮Jev历史文字只是题面，不取作本批独立实盘验收。
4. **YQL F17 T10（0017/0250）**：完整28173有三动作和生存判断，药水明确未模拟；答p0->e0/.34、生存lethal/.92。274087实际用药，280160→161确认毒2→8，HP26/挡13/DeathBlow41均未变，274088结束后280162死亡截断0；26+13−41=−2是前帧算式，不能和死亡帧0混记。本批没有提前喝药整场对照，不能用多6毒记已兑现6伤/减伤。
5. **L9/PU阶段与SL口径（0017/0250）**：原状态249144为L9 F17 T14、1血/0挡、占位999999999且EXPLODE_MOVE/53；252077为PU F17 T16、占位999999993但ABOUT_TO_BLOW_MOVE/Stun，不能仅按占位HP判当前自爆来袭。SL681引用的anchor是旧第1试T14，不是681自身第3试T13的summary；717对同T17的占位999999981/989排序。YQL960—963也保留旧参考占位血。阶段事实与实际排序分开，归零后改序收益没有受控验证。
6. **KEN七次耗药与技能药（0019）**：274131/156/185/235/237/267/272逐槽位核对，随机药pending后续继续查选择和出牌，不作失败或整方案成功。完整28211的逃脱计划是中位样例；280355实际候选斗篷/墨之刃/萎靡，274273选斗篷，280356入手零费斗篷、274274打出挡4→12，274275小刀扣敌4，280359仍46血。本批没有完整逐字读其余六瓶原题，不把整战零损都归此药，也不证明保留到Boss更优。
7. **KEN F17 T10/T5（0079/0021/0125/0176）**：完整28257/28271均答plan4/.97，第5试274568被SL换plan2；原/换B2 .385/.127、diff−.2583/se .0132。280588—592与280651—655核37→22/16、敌82→80/78，多6损只多2扣血，呼唤留手与无实体逐段结算可见。T5完整28276答plan5/.99却SL改plan3，原4试280567—572实际损7/扣敌1，末试280684—689损5/扣敌2且没建敏捷，额外小刀单列。省2血同时丢能力建立是反例；T9以后整场能力兑现未在本批重读，原提案延至T9保留为线索，不升称本批已验收整战因果。

本批所读原题含历史potion_experience的A8/A9旧统计，属于题面原样保留，未核角色，不计为Silent事实/支持分母，也未读或迁用其他角色知识文件。题面中的其他局号、经验文本和模拟赢数不建立本批局身份或真实收益。

## 已有实现与未完成范围

只读实际live=4528a751f17e341a97e7ff70295ec9fba0c947e9，source-readback.json核九叶与本树逐SHA同字节，相关提交均为该live祖先。已有持牌/弃牌未决拆项、未知持有值与无药参考、SL候选预测、单动作派发、巨兽阶段/药水观察；不重造这些功能。selection-audit仍scope=predicted_candidates/actual_turn=null；selection-dispatch为single_action_receipt、state_effect_verified=false/whole_plan_executed=null；resource_comparison仍current_turn_prediction。它们没有完成原宽项的整轮实际来源及联合验证，故十项不整项登记duplicate或implemented，也不因原账本shipped而倒推这些代码提案已完成。原账本状态不降级。

本批没有新的已证策略权重或可完成的遗漏诊断范围；保留现行出牌/药水/SL/终局规则、其他角色及未观察等级等价。原计划允许纯诊断无需胜率证据，这点保持；当前剩余缺口具体见十项处置，非以缺胜率拒绝所有工具工作。

## 验证与交付

执行的是证据身份/SHA、完整问题关联、原提案SHA、局部动作与状态和live祖先/源码字节核验。无生产源码/知识变动，tsc/vitest/cases均null，未跑撤源码红绿或产品测试，不虚报测试通过、gitleaks提交扫描、commit、merge、eval版本或上线通知。提证不证明正式发布、下一局消费或自然收益；只读live不等于本批合入。

一次分析脚本初稿误从combat.player.hand取手牌，空数组不是真实无牌；已核原始schema改为combat.hand，并排除锚点下一回合的动作。初稿state-windows.initial.json完整保留，结论仅用纠正后state-windows.json及selected-states.raw.evidence.jsonl；源日志和提案未改。脚本只在scratch，不是生产源码修复或产品失败。

完整材料入口：proposal.md、result.json、dispatch.json、assigned-proposals.json、十份original.md、proposal-recovery.json、referenced-ledger-rows.json、source-readback.json、evidence-summary.json、两份evidence-manifest.json、question-index.json、read-question-refs.json、read-questions.raw.jsonl、coverage.json、selected-decisions.json、state-windows.json、additional-states.json、selected-states.raw.evidence.jsonl和sl-phase-anchors.json。账本核验记录另经唯一CLI追加并读回，见ledger-receipt.txt/ledger-readback.json；仅proposed，不覆盖原shipped或关闭科学父。最终交付校验另存delivery-check.json。

本批核验台账：silent-0539，经根目录learner/ledger.py add追加、show --json实际读回，status=proposed，by=learner:strategy-proposal；不代十项提案实现或原账本shipped。

# Silent 策略提案消费报告

登记时间：2026-10-21 03:55:06 CST（写时间前已执行date）。批次：20261021-034104-strategy-proposal。

结论：十项原提案均waiting。本批没有足够新增、独立且完整的证据支持更改排序、留药价值或探索门槛；已有窄字段不能代替宽项验收。没有源码/知识改动、提交或合入，无发布版本。测试、撤源码红灯和恢复绿灯均未运行，结果为null。本批复核账本为silent-0544，仅proposed；不改原账本的历史shipped，不把本报告算正式入库或消费者采用。

## 身份、基线与任务边界

- base和最终HEAD：819b1cdbe7a54a860e654a6b8ab3e23497d2d01e。开工git status干净；普通批次git merge --no-edit main返回Already up to date。
- 已读README、最新STATE-2026-10-19、decision-log末尾、learning-protocol、learning-code-proposals及retention文档。STATE中的旧停点已有后续更新，本批没有据旧停点重建或修改live。
- 根learn.json本批为silent/strategy-proposal，reason=proposal，工作树匹配，领取十原proposal_ids；无research_request、implementation_request、proposal_repair。只读根notes/strategy-research-silent.json后确认它绑定20261010的另一批，不套用该专题，不读其他专题或另领队列。
- 六局runs.jsonl的原行均已通过原始offset/bytes/SHA再次读回，character=SILENT、A10且ended非空；见run-verification.json和raw/runs-*.json。结局均败：751/KEN/YQL/L9至F17，KV/PU至F33。角色和结束身份不依赖正文提及或相近时间。
- 六局历史代码均dirty；保留run-config原行，不宣称重建了历史dirty源码或知识。L9实际decider含deepseek，不能列为纯Codex脑验证。本批只学本角色，不把历史题面内附带的旧异角色药水统计计为Silent证据，也不读取其他角色知识文件。
- 独自执行，无子agent、联网、play、依赖安装或配置/权限变更。宿主要求普通模式/high，本批未核当前原生turn_context回执，不自行声称该档位已验收生效。

## 提证与原始阅读范围

先核runs角色/结束，再运行指定evidence_summary；首次因沙箱glob扫描碰到已回收缓存而未启动，错误原文和退出1保留initial-failure.md。同一指定命令重试退出0，摘要SHA见产物清单。摘要只作入口，未以最后五条代表全覆盖。

随后完成指定v6-evidence提取（v6-build、jev-prompts、decisions、run-config）和原任务默认evidence提取（含states、SL、run-plans、brain）。两次各自冻结，不合并或覆盖旧切点；manifest保留逐流source_size/source_sha256、逐行offset/bytes/SHA、身份来源、全量计数及有限缺口索引。

v6-build在指定切点扫描648条有效行，对六局均no_match；该流存在，不是缺流。六局run-config各一行，没有V6字段，属于历史V6配置未记录，不能追填off或把无匹配解释为entries/jev_answer/fallback/unknown均0，更不能解释为收益0。V6的entries是候选/参考内容，jev_answer是作答记录，fallback/unknown是降级/未知身份；即使存在也须与实际decisions及后果分验，本批没有可归属的原row可作这些结论。

Jev匹配1026原row，均含request/answers、均无error字段；这只是字段覆盖，未读的题不报告内容正确或执行成功。原流全局有1条invalid_json（line53166，offset822467067，bytes60550，SHA885bb0d5de4cba94ee7f3cc377dcf414405c3097315db2ef513bb144d564b467），身份未知，不把它分派给本批或解释成本批错误0。decisions全局2条非法行、unknown_identity1934/unmatched_decision_id1428；states全局2条非法行、unknown_identity3365；这些缺口均未强行认领。两提取切点各流incomplete_lines=0，不等于不存在历史缺帧或被SL截断。

本模型完整精读七条Jev request（完整state和全部questions/criteria）、answers及其精确decision_id原行，核chosen/result/gate_reject/selection_dispatch和SL；按原行逐字节重读验证，另存question-*.json及raw/。工具展示曾截断的272361 plan4与274568 fingerprint已单独补读，不将截断展示当完整。所有七题gate_reject、selection_dispatch和selection_audit字段均缺失，明确记absent，不填false；chosen首步不能证明整条候选执行。

question-audit.json保存每题及后续12条decision的原始引用/字段；模型精读与结论相关的同层同回合完整续步到下一轮或死亡，不将其余后续条目全部称已精读。state_audit.py用同run、精确observed_ts与完整fingerprint绑定题前状态，读到下一轮或终局，另核资源锚点，共53个不同原state逐字节SHA核验；模型只读相关状态字段和这些窗口，不灌入全局所有states。完整raw行仍保留。run-plans与brain只机械提取，本批未精读其完整题面、不以其内容增补游戏结论。

本批没有全覆盖Jev的要求替代声明：七题覆盖751三题、KEN三题、YQL一题；其余1019题未逐题精读，具体分母及未读原因见下表。L9/PU/KV只读身份、配置及指定SL原字段，不冒称其Jev问题已逐题验收。SL summary及explore.target.anchor是日志里的原字段，仍不等于逐动作来源结算。

## 关键证据、反例与判断

**751FN9QM9MHQ F17 T7第二/四试（silent-0079/0176）**：272531/272652同指纹，Jev均答plan2。第四试SL改第三张为打击，后续272655确实打击；两次生存者回执先pending，接下来的选择与状态才证明各弃一呼唤。states278576—278581为45→32、敌121→109；278697—278702为45→22、敌121→103。实际多10损血换多6扣敌血。题面预测19/29实际13/23，各有保守6差；这不抵消相对10血价，也不能先把未决弃牌算确定。SL b2差−.09/SE.0088是预测。本批未重新完整回放T2/T13，不借原提案文字将它们列为本次原始验收。

**KEN58SH9SLZ6 F17 T10第四/五试（silent-0079/0021/0125/0005/0176）**：274505/274568同指纹，Jev均plan4，五试SL替plan2。后续274570实际打匕首雨，原四试274507打第二呼唤。原状态敌无实体1；37→22与37→16、敌82→80与82→78，分别兑现2/4扣敌血及15/21损血。B2 .385/.127、差−.2583/SE.0132不当实盘胜率。这只证明局部代价；两次完整后续行为不同，不据最终死亡时点归因本轮。T5少损血与能力延迟可能有取舍，但其完整题面/收益在本批未验收，明确保留未知。

**751FN9QM9MHQ F13 T3（silent-0019/0021/0005/0007/0129/0176）**：272361的plan2与整战无药plan5五轮均8/8结束、损8，终结时点约2.3/2.9；plan3虽本轮无药，后续7/8样本用药，不能误称整战无药。实际272362饮肌肉药，states278403→278404槽0清空、力量+5；278407血50、敌11。原题伤害26与实际扣29不同来源，毒和荆棘另计。药表未加载不代表持有价值零；没有实打无药或留药Boss分支，不据空药失败倒推固定药价。

**YQL8RZ8BWN1E F17 T10（silent-0017/0250/0011/0027/0046）**：274087毒药选项明确未模拟，Jev选用药且判断lethal；274088结束回合，280162死亡。280160/280161毒2→8、26血13挡、自爆41和占位HP均不变。本体结束不等获胜，新增毒不当已兑现减伤。SL960—963保留predicted_death与实际died的区别；不能把前五试截断敌回合充作实际死亡。L9的SL681里explore.target.anchor引用首试T14占位999999999，**不是该次末态本体28**；PU的SL717 anchor在同T17比较999999981/999999989，仍是旧参考口径的来源。没有证明直接改0或改变最长存活优先可改善。

**KEN58SH9SLZ6 F15 T1及七次耗药（silent-0019）**：274272先pending，274273实际三选一拿斗篷与匕首，再274274/275打斗篷/小刀。280355三选CLOAK_AND_DAGGER/BLADE_OF_INK/MALAISE，280357挡4→12，280358敌52→48，280359再毒结算至45，HP始终46。原题中位逃脱计划和mean2.5损血不是实际结果。七对槽位变更均已核（F3攻击、F4稳定、F5速度、F11虚弱/攻击、F15发光水/技能）；其余六次完整题面、各随机后继收益及不喝/留药整战未验收，不用七次槽清空宣称七次持有价值均已量化。

**KV0JHNJCKXLS F33（silent-0102/0019/0020）**：SL952—957的终局仍是六试同局，末试T8实死，前五试predicted_death；各次敌末血不能代毛伤、治疗和牌效的逐源归属。本批未精读该局104道Jev题、未验证完整删毒反事实，不沿原经验摘要拟新权重。该局F17一试won也不提供后续知识恶魔的受控胜线。

## 已有源码与未完成范围

source-audit.json保存八个文件的SHA、对应完整提交、实际live祖先检查和字节比较，全部成立。只证明这些窄字段在源码中存在；历史六局没有这些新字段，不能以当前源码反填历史，也不能以祖先关系冒称本批发布或下一局消费者读回。

- silent-held-loss/silent-selection-audit：分列保守持牌预测及原答/护栏后/SL后；actual_turn仍null、pending_dispatch，不是整轮结算。
- silent-sl-resource-comparison/silent-sl-comparison：模型候选资源差和B2审计仍须接真实派发与后继；字段标unverified，不是实际收益。
- silent-potion-reference/potion-cost：未知hold_hp和整战无药参考已分列；没有给缺失价值拟数。
- silent-giant-potion/sl-attempts：阶段和末态资源已展示，不证明改序收益或早喝必胜。

这十项原提案还包含整轮/整战/跨战联合验证；因此没有将部分覆盖登记duplicate或implemented。五个原Markdown缺口保留原路径/SHA，既不伪造恢复，也不擅自关闭。根账本仅经CLI新增silent-0544，原队列状态交调度器按proposal_results处理，不手写队列、不新建重复id。

## 后续验证与交付

先恢复五份旧Markdown按原SHA核验。继续取得确定弃牌、抽牌或随机药重问后的完整来源结算；若修改排序/持有价值，固定原/新线同输入重放，区分模拟误差与实盘，按独立局真实时间切分并保留新局验证；同一局六次SL只算一局。当前不拟合通用阈值，不跨角色借参数。预期仅支持成本审计，通关收益未知。

本批fixes=[]、merged=null、version=null，tests={tsc:null,vitest:null,cases:null}，撤源码/恢复测试null。没有生产代码提交，故不运行代码提交前测试或live合后测试，不制造成功。没有改变铁甲或任何角色源码/知识。本批不执行上线双通知；运维消费本报告与proposal.md，逐项保留waiting。未关闭学习父要求、未声称经验正式入库/消费者采用/自然收益。

交付：本目录proposal.md、report.md、result.json、proposal-results.json、proposal-inputs.json、ledger-inputs.json、ledger-add.log、run-verification.json、question-audit.json、state-windows.json、sl-audit.json、source-audit.json、两份evidence-manifest.json和raw/。初次失败原件保留initial-failure.md。

以下表由上述冻结产物机械生成，只作定位与处置，不替代原文。

## 冻结切点与来源SHA

| 提取 | 流 | source_size | source_sha256 |
|---|---|---:|---|
| v6-evidence | v6-build | 64671195 | afbfbf24c4059d73bbeac7ad3f8f52f4a5a33bfbea75ef45b6d7800e674e3d1d |
| v6-evidence | jev-prompts | 2255979631 | e5f557293b2719ae68edb035c3fa84b4eeb7fb8c3532e5215a55356b24ebf8f4 |
| v6-evidence | decisions | 3088102199 | d0408fe393e41713d814e40c6cbb3bddd53ddfda618b3c0aeb1deb68570272d6 |
| v6-evidence | run-config | 2306890 | 2bb75ca459c39e29726aa83e4f89c71c938f67cd9c5a8abdeb022e96c104c53a |
| evidence | states | 14891071755 | 7b4c0161e0be24d11b4f2d177a5e94918ebdca54b761a372630406c1cbcebd40 |
| evidence | decisions | 3088399420 | 638f8fea66afde1362bab0ee9e49b2512659681921a6635182b84dfc2ac87d6a |
| evidence | sl-attempts | 50735400 | a7397dd1f0c8f16ea404e8a6190c8e57ac0c6e5da61e2a7b67073fa2600fd267 |
| evidence | run-config | 2306890 | 2bb75ca459c39e29726aa83e4f89c71c938f67cd9c5a8abdeb022e96c104c53a |
| evidence | run-plans | 10219710 | 7111f9b74ab5f4b722f4247dcf1cea685a9d5ab6c9dd754baa90231a956a473d |
| evidence | brain | 1148728788 | 0e50f030bc2a108cf3b35d4d3b8100fb28e3ed2ad03b5fcae08bb9a34190100d |
| evidence | v6-build | 64671195 | afbfbf24c4059d73bbeac7ad3f8f52f4a5a33bfbea75ef45b6d7800e674e3d1d |
| evidence | jev-prompts | 2256483509 | bab610bf84b12cc6109bcdc354c8b31ce5f147eeee2fc7478c740d85ae7ca8b8 |

## Jev覆盖分母

| 局号 | 匹配题 | 完整精读 | 未精读 | 原因 |
|---|---:|---:|---:|---|
| 751FN9QM9MHQ | 137 | 3 | 134 | 本批只核派发提案的指定关键窗口；其余题不作为已验收内容或收益 |
| KV0JHNJCKXLS | 104 | 0 | 104 | 本批只核派发提案的指定关键窗口；其余题不作为已验收内容或收益 |
| YQL8RZ8BWN1E | 253 | 1 | 252 | 本批只核派发提案的指定关键窗口；其余题不作为已验收内容或收益 |
| L9SGRBB5R698 | 251 | 0 | 251 | 本批只核派发提案的指定关键窗口；其余题不作为已验收内容或收益 |
| PU80F84P6HPN | 172 | 0 | 172 | 本批只核派发提案的指定关键窗口；其余题不作为已验收内容或收益 |
| KEN58SH9SLZ6 | 109 | 3 | 106 | 本批只核派发提案的指定关键窗口；其余题不作为已验收内容或收益 |

## 七题原始定位

Jev来源固定为logs/jev-prompts.jsonl，精确decisions归属来源及各自offset/bytes/SHA另见question-audit.json。

| decisions行 | decision_id | Jev行 | offset | bytes | SHA256 |
|---:|---|---:|---:|---:|---|
| 272361 | 179c20e7-efd4-44e8-8ee1-406abd398d69 | 27699 | 398012392 | 17613 | 2e96bb662b4fdd0723eed722f13c3a01fff5c2d24841b235f1c2ef1075178cf9 |
| 272531 | fd52f1c7-ecb9-4c66-99ba-e1419817dc34 | 27740 | 398408080 | 13503 | a939442365fd65efe504a8b23895a31aa824361b7edc4314f98bd183e45ba2a1 |
| 272652 | 9836a127-543c-4e2f-adb9-e4c7bc103a3b | 27770 | 398747334 | 16452 | de09b2d48996874de68bc1bc0f44560ba3c827066aa8252cbe0b420debcf3124 |
| 274087 | 2b22d776-2a5e-47cd-a9e2-46d3e67f61ef | 28173 | 404305929 | 13653 | fb25cd458d94d92f7c9c8db4a34580967c2adfa52150a5d185c459214f243bd3 |
| 274272 | fed78f61-e646-42f4-b93d-84efa3e6575d | 28211 | 404771254 | 13500 | 8403d3a0a440a33db1df96ddedfcbe8dbf34913af2ae46a766894675a836cf33 |
| 274505 | 4b79d414-135c-400c-a965-9446f0cab72a | 28257 | 405376179 | 17673 | cddbcc8a6dd676323d16578339e37923f643c30904c3036d4365d74a2bed3571 |
| 274568 | a2ec4e39-f5ad-4380-ab93-f804ddbebf3f | 28271 | 405594035 | 19251 | a487fcb03ef4577e2dbcee298fa879970c0a6b72bbbec2b0e27b67e6996176a4 |

## 十项原提案的逐项结果

### silent-proposal-366288801d9150d9

- 状态：waiting。候选预测、持牌分项已有窄实现；本批T7只验证局部血价，缺确定弃牌后的整轮实际来源联合验收及独立完整后继，不能把部分字段等同整项完成。
- 来源局：751FN9QM9MHQ；原账本：silent-0079, silent-0176。
- 原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-sl-cost.md
- 登记SHA256：0ba601d50f1341977ec60627d24994e0755ef1cf396a60832000400c5805c524；本批读取：存在、原字节SHA一致，已保存original-proposals副本。
- 源码处置：无新增提交；已有局部字段不代表原项的完整验收。

### silent-proposal-85929bdfc8a3fc1b

- 状态：waiting。未知持有价值与无药参考已有展示；F13仅实际执行用药分支，缺同盘无药完整实战及留肌肉药至Boss的对照，不能拟持有价值。
- 来源局：751FN9QM9MHQ；原账本：silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176。
- 原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-191301-postmortem/proposal-combat-potion-facts.md
- 登记SHA256：d42d3f29d0d36b262352160a104dd8b97831ef9d8ecbbd4bce3dba367f9c8d68；本批读取：存在、原字节SHA一致，已保存original-proposals副本。
- 源码处置：无新增提交；已有局部字段不代表原项的完整验收。

### silent-proposal-efd9f83ee9e1a6dc

- 状态：waiting。原Markdown位于已不存在的exp路径，本批未恢复到可校验原件；同时缺确定弃牌后的整轮联合验收、受控完整后继和独立验证。
- 来源局：751FN9QM9MHQ；原账本：silent-0079, silent-0176。
- 原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-sl-cost.md
- 登记SHA256：0065ae0291ac4675d0a895128c71c68b35602c3eb6b5887b92fca11891c29006；本批读取：原路径不存在；本批和保留exp基线精确Git路径未选到blob，未定位相应恢复归档；等待原件，不能由摘要代替。
- 源码处置：无新增提交；已有局部字段不代表原项的完整验收。

### silent-proposal-131042659448ae74

- 状态：waiting。原Markdown未恢复，九类经验的逐来源收益、路线休息及跨战留药联合验证不齐；已发布经验与局部字段不能关闭宽项。
- 来源局：751FN9QM9MHQ；原账本：silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176。
- 原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-193251-experience-update/proposal-combat-potion-facts.md
- 登记SHA256：b1ff1ca1e5d3da182f25af9b0040780e288a77e627b08c2fee262a17f8f49951；本批读取：原路径不存在；本批和保留exp基线精确Git路径未选到blob，未定位相应恢复归档；等待原件，不能由摘要代替。
- 源码处置：无新增提交；已有局部字段不代表原项的完整验收。

### silent-proposal-990f054036609447

- 状态：waiting。原Markdown未恢复；KV本批只复核SL终局字段，未完成知识恶魔全战毛伤、回血归属、删毒对照和受控后继，不能据净血差改序。
- 来源局：KV0JHNJCKXLS；原账本：silent-0102, silent-0019, silent-0020。
- 原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-200255-experience-update/proposal-sl-accounting.md
- 登记SHA256：c7fa0a97eea334f338e208a6bae8e709dce021cd3157dd32cb3ca1a45900e053；本批读取：原路径不存在；本批和保留exp基线精确Git路径未选到blob，未定位相应恢复归档；等待原件，不能由摘要代替。
- 源码处置：无新增提交；已有局部字段不代表原项的完整验收。

### silent-proposal-e18d3f18e6cac2a0

- 状态：waiting。巨兽阶段/当轮毒药/末态资源已有窄实现；缺新排序及提前用药的受控整战，残血置0可能改变同轮平局选线，保留原排序。
- 来源局：YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN；原账本：silent-0017, silent-0250, silent-0011, silent-0027, silent-0046。
- 原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-201301-postmortem/phase-sl-proposal.md
- 登记SHA256：3cc66ab0b4fb05a0d6d4e62b514b13caf9e157eba4d781f5a60f76276047c821；本批读取：存在、原字节SHA一致，已保存original-proposals副本。
- 源码处置：无新增提交；已有局部字段不代表原项的完整验收。

### silent-proposal-9733bb80f445aeae

- 状态：waiting。原Markdown未恢复；阶段展示只覆盖窄项，SL排序、用药与路线休息的联合验证和受控整战不齐。
- 来源局：YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN；原账本：silent-0017, silent-0019, silent-0020, silent-0250。
- 原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-203654-experience-update/proposal-giant-phase.md
- 登记SHA256：c0da0af7803a73b361bb98e358c2a5c12b8056a68c28614a592138e7cdd88382；本批读取：原路径不存在；本批和保留exp基线精确Git路径未选到blob，未定位相应恢复归档；等待原件，不能由摘要代替。
- 源码处置：无新增提交；已有局部字段不代表原项的完整验收。

### silent-proposal-c51468c5e8ba6668

- 状态：waiting。七组槽位消耗及技能药实际选牌/续步已核；仍缺其余随机药完整收益归属、不喝及留药的整战对照，不能确定持有价值。
- 来源局：KEN58SH9SLZ6；原账本：silent-0019。
- 原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-resources.md
- 登记SHA256：168cc03750525c56cace3915f22ef4dd1cf768f87b17e70f5228964a168c8469；本批读取：存在、原字节SHA一致，已保存original-proposals副本。
- 源码处置：无新增提交；已有局部字段不代表原项的完整验收。

### silent-proposal-86a7db08d1a31976

- 状态：waiting。KEN T10局部6血/2伤已核；未精读T5能力建立的完整题面和整战能力收益归属，缺受控后继及独立验证，不改探索/护栏。
- 来源局：KEN58SH9SLZ6；原账本：silent-0079, silent-0021, silent-0125, silent-0005, silent-0176。
- 原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-204301-postmortem/proposal-combat-sl.md
- 登记SHA256：10de295b469f48281050aeb04a8ad6ccb2906e007d48386a6c8f769cc7600ac6；本批读取：存在、原字节SHA一致，已保存original-proposals副本。
- 源码处置：无新增提交；已有局部字段不代表原项的完整验收。

### silent-proposal-e282a9131b99129a

- 状态：waiting。原Markdown未恢复；原答、SL换线与首步回执已核但不代整轮来源联合验收，能力兑现、受控后继及时间留出验证不足。
- 来源局：KEN58SH9SLZ6；原账本：silent-0021, silent-0079, silent-0125, silent-0176。
- 原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-sl-cost.md
- 登记SHA256：a88a2a95875b8fa04d80376a10a3ed59ede080db13ccb2a7e14c3ebfc1c34872；本批读取：原路径不存在；本批和保留exp基线精确Git路径未选到blob，未定位相应恢复归档；等待原件，不能由摘要代替。
- 源码处置：无新增提交；已有局部字段不代表原项的完整验收。


## 实际live源码核验

核验时live HEAD：a7d07949efb03278a62050ca39447941309b4b7e。以下8项均is-ancestor=true、工作树文件与实际live字节相同；不是本批实现或新发布。

| 文件 | 完整源码提交 | SHA256 |
|---|---|---|
| agent/src/reflex/silent-selection-audit.ts | 9d8278702dbc581b5015ba7ec9a70dc0fb94cccb | 2de2533b477546682ef601d0613bd1adb805e03b894f64347475bfa4e222e4db |
| agent/src/reflex/silent-held-loss.ts | 9d8278702dbc581b5015ba7ec9a70dc0fb94cccb | c60884d37a5386e21ea357cb6b0942bcc3c098366167dcde4506ae79541e9022 |
| agent/src/reflex/silent-sl-resource-comparison.ts | 0e4fe4df89a06682468e0e4716c12126e76369d5 | 75e3ca7380dab1f0c811b91df908eba08a46ae2810b1b983dd699eafef269ab0 |
| agent/src/reflex/silent-sl-comparison.ts | 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 2fbb427662af78dd5428c70e0af9bb82dfe312d4ccffb33201da3c26dfdfc760 |
| agent/src/reflex/silent-potion-reference.ts | c4670f4f416c7d93e192e889c5080e7e4e0e733f | 94399dd7279d6eaed91d139507baf6936a161cd61a792644a4ab7c5d9102a360 |
| agent/src/reflex/silent-giant-potion.ts | 40168f4a903ae1d8c48bd03006f8fea19fd3aa3c | 4f032ab6458326668c37361d33b7882e7f922bf07ad3f995abb6b5085de5a5d6 |
| agent/src/sl/attempts.ts | b01edf46b4b619f217d070a196e161df9fe716a0 | f3f785f18c77ccc482a58b236d168780c8e010fb0bec12ec3e14ab61a8aca415 |
| agent/src/reflex/potion-cost.ts | c519952b31e3a0bb3acdd2115883ae8671b8a090 | b0a952df65e6af5ddd99742b9894367dff086052ef810865e85fe73c0c06c0b2 |

## 小型清单SHA

- evidence-summary.json：38784 bytes，SHA256 c781b7303b77a1fecbc0b18c87331c61083b55cd763eef9a9bbfcae51fc98c73
- dispatch-row.json：3826 bytes，SHA256 92c92a8f3f8c5aa95dfaec5fa6968e339a152942b92f32ed045252ada393092d
- proposal-inputs.json：10951 bytes，SHA256 be56673ea59b4c857ba896ddc1c831e760c43037c1376fa66967a3d026d5c597
- question-audit.json：231946 bytes，SHA256 c1cf0a111115f5409114dc834d2982d09f673a9bff3585687dfd3e993ebdcafb
- state-windows.json：340359 bytes，SHA256 c3eb800e089c0beec34dba37712b886617f5f80167e0552034618e3a65e879d3
- source-audit.json：2341 bytes，SHA256 63c9b8d49bfbf338f028e045e4ee1a20c89e89cc89fa78012ea3fa13e45b56c4
- run-verification.json：6026 bytes，SHA256 37af4d3656b0bce5097cc4f987e174b829245440c2b183a6e098ba3f4863813b
- sl-audit.json：14560 bytes，SHA256 9002ae8d6a608fb0f17e4ef263831a85c489572863bdbe33a9eae8cf82e0aa37
- proposal-results.json：2561 bytes，SHA256 39b942baa1ec9fc0a27996367db04b378094cf0e723608ed9b54cc54f46918ce
- ledger-item.json：2196 bytes，SHA256 40001db7ac0149a7739c5151b1c6465d40237aec800c3b55276fdb2117bfcaf6

## 最终机械核验

12份冻结流输出的SHA256与各自manifest一致；十个派发id与proposal_results集合完全一致且各出现一次。HEAD仍等于完整base，git status为空，git diff --binary为空并保留source-diff.patch。gitleaks本批材料扫描203328407 bytes，退出0、no leaks found，原日志gitleaks.log及gitleaks.json保留。这些是材料/身份完整性核验，不是tsc/vitest、科学收益验证或上线验收。

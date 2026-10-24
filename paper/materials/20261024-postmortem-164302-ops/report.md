# 流派剧本/rk去向表

| 本批局 | 已有目标ID / 真实候选ID | 完整局与关键窗口 | 人类赢家可比偏离、限制 | 实际处置 |
|---|---|---|---|---|
| 06BV1PZWV14R | silent-core-poison-defense-observation / silent-pb-poison-setup-resource-c8c69412 | F1—F22；关键F7,F9,F13,F17,F19,F21,F22 | 同前缀人类可比组未交付，偏离幅度未知；本局n=1、历史精确源码未知 | 复用已有ID的局部候选；formal_publication/consumer_readback=pending |
| P4ZBYNW92PPK | silent-core-poison-defense-observation / silent-pb-skull-poison-power-cost-c8c69412 | F1—F48；关键F15,F17,F28,F33,F34,F35,F38,F43,F45,F47,F48 | 同前缀人类可比组未交付，偏离幅度未知；本局n=1、历史精确源码未知 | 复用已有ID的局部候选；formal_publication/consumer_readback=pending |
| 4374764UVEXD | silent-core-shiv-defense-observation / silent-pb-uncommitted-shiv-poison-c8c69412 | F1—F24；关键F8,F15,F16,F17,F20,F21,F23,F24 | 同前缀人类可比组未交付，偏离幅度未知；本局n=1、历史精确源码未知 | 复用已有ID的局部候选；formal_publication/consumer_readback=pending |
| 160G2YS143YB | silent-core-dexterity-defense-observation / silent-pb-dex-poison-startup-c8c69412 | F1—F23；关键F7,F8,F9,F11,F16,F17,F19,F21,F22,F23 | 同前缀人类可比组未交付，偏离幅度未知；本局n=1、历史精确源码未知 | 复用已有ID的局部候选；formal_publication/consumer_readback=pending |

记录时间：2026-10-24T17:11:42+08:00。来源batch c8c69412-8b87-4c8a-b8c0-27e4bea77132；postmortem只追加授权记录，没有代码/正式经验/策略/rk修改，没有提交、推送或游戏操作。

两份实际产物：[whole-run-summary.json](/home/dw/Projects/agent-sts2/learner/runs/20261024-164319-824e21ec-27a8-4473-98cd-03d4077a0d50-postmortem/whole-run-summary.json)、[playbook-rk-candidates.json](/home/dw/Projects/agent-sts2/learner/runs/20261024-164319-824e21ec-27a8-4473-98cd-03d4077a0d50-postmortem/playbook-rk-candidates.json)。前者包含四局逐层轨迹、原计划、全部Codex构筑决定/选项/原理由/后继、各幕末真实快照、全部战斗和SL资源链；后者含4个逐局剧本局部候选与3个决策类型独立候选。当前7个候选全部待正式发布与读回，不称三输入剧本完成。

## 冻结输入及可用字段

- 已核四局均在runs.jsonl结束且character=SILENT/A10；启动时与写入前均无既有目标标题。notes/roy-manual-play.json排除Z2KBGZQMSRV5，手动窗口08:38:01—09:56:28 +08:00；本批首决策均在结束后，run-config为auto/Codex。恢复后自动局按实际来源纳入，未将停局工作量变化记收益。
- 外部统计、外部代表完整局、#54字段可用性冻结回执、自有四表均未交付本任务。六项外部字段（开局祝福、购买、删牌、事件、药水获得/使用、休息/锻造）全部标不可用；不下载、不扩读外部原库或其他自有局。原始题面带有外部开卷附件，但这不是人类整局统计/代表完整局，也不作本批外部验证。
- 三输入覆盖固定为：外部统计missing、代表完整局missing、自有整局present（4授权局；每个具体前缀多n=1，SL不扩独立分母）。本批没有擅自重建#54四表，只以有限样本资源/成型偏离线索给后继任务。不虚构人类赢家缺牌、固定拿牌比例、安全HP或必胜替线。
- 四局runs.code都为current，run-config中commit/code/dirty未知，error=git status failed: spawnSync git ENOBUFS。报告引用当前live仅用于显示bug源码定位与复现，不能回填当局源码/release。

## 四局整局摘要

### 06BV1PZWV14R

F1未定→F1药瓶后暂偏P；F2迷雾、F4第二药瓶、F7蛇咬持续补毒；F17工具、F19猛扑、F20玩偶、F21低费毒，始终是缺触媒与持续防御的施毒过渡。 按实际原题coreCatalog逐层核，P/D/S/R首次完整持有签名均未观察；组件首次出现与缺件在JSON中，持有签名也不等能力兑现。
F7双尾鼠45→8、F8休息8→29、F9普通双敌29→5、F11休息5→26、F13蛞蝓26→8、F14事件8→18、F16休息18→39、F17Boss39→29；幕间/先古后F19以61进入、赢后43，F20玩偶选项付5血至38，F21地道虫38→22，F22入22/70并各试喝果汁至27/75。
寄生惧魔 PARAFRIGHT／胧光怪 THE_OBSCURA，末次T6仅4血0挡对20+10来袭；毒结算后两敌仍11/31血，玩家归零。

- 第1幕末：F17，29/70HP，24张牌；药槽[[0, 'DEXTERITY_POTION']]；s535879。具体逐牌/重复张数见实际JSON快照。
- 第2幕末：未到幕末/缺幕末快照，牌组/HP/药水未记录，不倒填。
- 第3幕末：未到幕末/缺幕末快照，牌组/HP/药水未记录，不倒填。
- Boss及首试：F17第1次won，T7，HP29。死亡战第一试预测死亡，第三次重载后第四试实际死亡；F49均未到。
- 计划/预测/执行/后继分列在JSON。#50目标F48→F49两战；每题endgame和construction检查点不作既成事实，最新construction-log保留跳过/原理由与omitted，来源未知的state删加不作主动选择。
- 与人类赢家：同前缀人类赢家未知；本局可核的是持续补毒未补齐触媒/防御，F7、F9和F13赢战反复耗掉营火缓冲，第二幕未到计划营火。不能归因拿药瓶或证明某替牌获胜。

### P4ZBYNW92PPK

F1巨大扭蛋后见异蛇头骨而暂偏P→F2蛇咬、F3冒泡、F5单步法；F28独立药瓶、F30毒雾；F34带刺手甲后计划转为技能施毒防守，未改P方向；无触媒，非完整P核心。 按实际原题coreCatalog逐层核，P/D/S/R首次完整持有签名均未观察；组件首次出现与缺件在JSON中，持有签名也不等能力兑现。
F28甲虫组合53→28，F29休息28→53，F30普通战53→41，F32休息41→66，F33帝王蟹66→45；F34先古后F35入76→44，F37赢44→42，F38赢42→26；F42休息26→51，F43赢51→48，F44休息48→73，F45限时假人赢73→73，F47选择锻造扫腿而非补11血，F48带两瓶虚弱药、73/84进入，四次均未过。
女王 QUEEN／火炬头聚合体 TORCH_HEAD_AMALGAM，末次T7为7血7挡，对当前显示22来袭；过敌方回合归零，两敌剩132/42血。显示意图与结算中变化另核，不把22当独立毛伤测量。

- 第1幕末：F17，65/74HP，23张牌；药槽[[0, 'POISON_POTION']]；s536310。具体逐牌/重复张数见实际JSON快照。
- 第2幕末：F33，45/84HP，31张牌；药槽[[0, 'BLESSING_OF_THE_FORGE']]；s536582。具体逐牌/重复张数见实际JSON快照。
- 第3幕末：未到幕末/缺幕末快照，牌组/HP/药水未记录，不倒填。
- Boss及首试：F17第1次won，T8，HP65；F33第1次won，T10，HP45。死亡战第一试预测死亡，第三次重载后第四试实际死亡；F49均未到。
- 计划/预测/执行/后继分列在JSON。#50目标F48→F49两战；每题endgame和construction检查点不作既成事实，最新construction-log保留跳过/原理由与omitted，来源未知的state删加不作主动选择。
- 与人类赢家：同流派人类赢家/取得时间线未交付，差异未知。本局真实偏离线索是F34能力费用条件改变、F35/F38赢战失血、F47明确取永久防守而非治疗；不得因此认定遗物、锻造或未删基础牌为可避免败因。

### 4374764UVEXD

F2/F3双刺击配低费输出过滤，计划始终uncommitted；F12隐秘匕首、F17刀扇、F18烘焙手套形成力量小刀/毒混合过渡，F20单步法补防御。未出现既有S签名的增益组件，不硬定完整小刀流。 按实际原题coreCatalog逐层核，P/D/S/R首次完整持有签名均未观察；组件首次出现与缺件在JSON中，持有签名也不等能力兑现。
F8精英68→43，F15花园幽灵鳗赢76→29（净失47）；F16休息29→51，F17Boss赢51→27；先古/幕间后F19赢66→58、F21双盛碗虫58→50、F23猎人杀手赢50→17，F24以17/76和癫狂之触进战。首次T3喝药后T8判死恢复；末三试T2结束，末次实际死亡且药仍持有。
熟睡甲虫 SLUMBERING_BEETLE／盛碗虫（石）BOWLBUG_ROCK／盛碗虫（丝）BOWLBUG_SILK，末次T2为8血8挡对16+10；甲虫仍睡，玩家归零，三敌剩89/28/43血。

- 第1幕末：F17，27/76HP，23张牌；药槽[[0, 'CURE_ALL']]；s537283。具体逐牌/重复张数见实际JSON快照。
- 第2幕末：未到幕末/缺幕末快照，牌组/HP/药水未记录，不倒填。
- 第3幕末：未到幕末/缺幕末快照，牌组/HP/药水未记录，不倒填。
- Boss及首试：F17第1次won，T12，HP27。死亡战第一试预测死亡，第三次重载后第四试实际死亡；F49均未到。
- 计划/预测/执行/后继分列在JSON。#50目标F48→F49两战；每题endgame和construction检查点不作既成事实，最新construction-log保留跳过/原理由与omitted，来源未知的state删加不作主动选择。
- 与人类赢家：无已交付人类同前缀可比组。本局只给未定混合方向的n=1对照：早期前置爆发没有补齐长战防守；F15、F23虽然获胜却消耗关键资源，不能据此断言F23留血或F24换弃牌必胜。

### 160G2YS143YB

F1卷轴箱选含步法/翻越撑击/突然一拳包后偏D；F2毒药、F6毒雾配持续输出，F8第二步法、F19第三步法；F17暗影与F18士兵补挡。仍缺既有D模板具名后空翻/冲刺/扫腿，未把双步法或三步法等同完整D核心。 按实际原题coreCatalog逐层核，P/D/S/R首次完整持有签名均未观察；组件首次出现与缺件在JSON中，持有签名也不等能力兑现。
F7选择锻造毒药后F8骇鳗53→27，F9与F11两次休息使下一精英F12以71进入；F17族母54→31。第二幕F19双虫65→48，F21草蜢48→39，F22外骨骼虫39→18（已用虚弱药），F23无药18/74进入并四试失败。F21已改早营火路线，仍须先过F22/F23，未到计划F25营火。
虱虫之祖 LOUSE_PROGENITOR，末次T4为7血0挡对虚弱后12来袭；敌94血12毒，结算12毒后剩82血，玩家归零。

- 第1幕末：F17，31/74HP，23张牌；药槽[]；s537795。具体逐牌/重复张数见实际JSON快照。
- 第2幕末：未到幕末/缺幕末快照，牌组/HP/药水未记录，不倒填。
- 第3幕末：未到幕末/缺幕末快照，牌组/HP/药水未记录，不倒填。
- Boss及首试：F17第1次won，T8，HP31。死亡战第一试预测死亡，第三次重载后第四试实际死亡；F49均未到。
- 计划/预测/执行/后继分列在JSON。#50目标F48→F49两战；每题endgame和construction检查点不作既成事实，最新construction-log保留跳过/原理由与omitted，来源未知的state删加不作主动选择。
- 与人类赢家：缺人类同前缀组，不能给优劣幅度。本局可核偏离是重复能力与挡牌启动的时序，F19第三步法选择已承认未证收益，F22护栏替线只减少模型当轮损失，不证明整战或下战获益。

## 决策单元与处置

| 类型 | 复用目标 | 本批真实贡献 | 限制 |
|---|---|---|---|
| 用药（rk+策略） | silent-brain-potion-buff-before-relevant-cards、uncovered-end-turn、reserve-terminal-proxy-context；silent-reflex-v6-dexterity-established | 6/13/7/4瓶自然槽位增加；实use_potion分别9/17/7/4次（含重试）；P4事件喝缚魂/赠毒各一，SL恢复另列 | 无外部回执/逐回合人类用药，无安全药量、持药价或用药因果收益；候选不改阈值 |
| 休息/锻造与路线 | silent-brain-act1-rest-smith-resource-proxy、silent-rest-buffer-observation、silent-route-hp-observation | 四局真实休息题各3/11/4/4次；完整当前HP、合法具名项、原理由和下一实际遭遇分列；全部赢战失血保留 | 下一Boss距离只用实到代理，未达营火不补预测误差；无受控休息/锻造比较 |
| 冷启动 | silent-brain-first-combat-reward-type-comparison、early-block-after-attack-prefix、first-three-combat-skip-check、first-boss-power-hp-review | 四局开局选择、前三实际战斗奖励/完整备选和首Boss均首试胜，后继与选择触发分开 | 不能按终局倒填开局核心，不把事后完整三战或Boss结果当前触发 |

正式策略复用只是候选去向；已存在ID的旧证据、反例、置信度均未改。旧244/#48不重写，不按条数重造机制。此次没有消费者读回或自然收益验收。

## 原始流与问题覆盖

| 流 | 冻结切点与扫描 | 本批结果 |
|---|---|---|
| v6-build | bytes=64753212；SHA=1167aaefdcdd28e1e9a16b363c17523a649910782dfb7e44225a578244b195f3；invalid=0、incomplete=0 | {'06BV1PZWV14R': 0, 'P4ZBYNW92PPK': 0, '4374764UVEXD': 0, '160G2YS143YB': 0}；身份缺口{} |
| jev-prompts | bytes=3317411550；SHA=5f1866a74ded149e7ba9d1dac6368f4c598368f0927664c3a58dc57171e992c3；invalid=1、incomplete=0 | {'06BV1PZWV14R': 100, 'P4ZBYNW92PPK': 176, '4374764UVEXD': 124, '160G2YS143YB': 77}；身份缺口{} |
| decisions | bytes=4764658981；SHA=b4a20c9259d8c84dfae7925fc7057ab724553314bd0359beb681580543051e34；invalid=2、incomplete=0 | {'06BV1PZWV14R': 459, 'P4ZBYNW92PPK': 830, '4374764UVEXD': 545, '160G2YS143YB': 434}；身份缺口{'unknown_identity': 1934, 'unmatched_decision_id': 1809} |
| run-config | bytes=3445978；SHA=9badf1e15b61f7b5de102903d9172b87841e9bd1889ca9497b67a285b4792353；invalid=0、incomplete=0 | {'06BV1PZWV14R': 2, 'P4ZBYNW92PPK': 2, '4374764UVEXD': 2, '160G2YS143YB': 2}；身份缺口{} |

- 原始边界：evidence-summary和extract_evidence分别冻结；原文件可能继续追加，但本批结束局的精确身份匹配计数不由邻近时间或题目字符串推断。每行offset/bytes/SHA和身份来源保留，两个冻结切点都不覆盖旧值。原Jev流有一条历史invalid_json，未用于补本批事实。
- V6配置on，但v6-build四局no_match；entries、jev_answer、fallback、unknown均不可核，不补0。Jev request、answers、error另列，不把完整题面存在视为采用或执行成功。deepseek-reasoning在四局首末决策时间窗均无行；时间窗只能是该无run_id流的代理，本批实际脑引擎由run-config/decisions核为Codex。
- 全部477条Jev请求机械索引，473有answers、4有错误。完整questions全部候选及当前状态核读8题（每局1选择+1战斗题），外部开卷/历史经验附件有限阅读，不能称完整raw请求通读。另对4条错误核readback。其余题保留mechanically_indexed及未读原因，不以最后5条或本次流式分析冒称逐题通读。question-coverage.json逐decision_id列身份/原行；question-review.json保存8题与4错误的原题/答案/dispatch/后继。缺gate_reject或selection_dispatch明确字段未记录，不当0次闸拒绝。

| 局 | 请求/答案/错误；低信心 | 选rollout最佳或显式并列 / 可比较题 | 自主代码战斗回合 |
|---|---|---|---|
| 06BV1PZWV14R | 100/99/1；19 | 68/68 | 78 |
| P4ZBYNW92PPK | 176/176/0；36 | 122/122 | 96 |
| 4374764UVEXD | 124/121/3；30 | 65/69 | 80 |
| 160G2YS143YB | 77/77/0；6 | 57/59 | 77 |

自主代码回合按层/SL尝试/回合去重，剔除combat/plan-continue；不是代码独占回合。raw decider=code包含续执行，不能与runs自动笔记的code/jev-plan分类直接同义。最佳比例计答案，不代执行：护栏、SL探索与重算仍可能改线。所有逐体逐回合需要/净推进在各resources与summary；净敌HP减少不是毛伤，召体/回血/移除和同ID歧义保留。

核读的推演/实际对照：06第一试F22T3蛇咬题预计从13到2，后继确为2，但后续判死；P4第一试F48T4 end_turn预计46→34，后继实到34，5轮8/8模拟胜不等实过（随后本试T6预测死亡）；437第一试F24T7计划两防御/蛇咬/中和预计4→3，动作与后继T8为3；160第一试F23T3生存者预计18血不变，实T4仍18，但后继T6预测死亡。这里只核同题/同试次的局部预测，不将局部准确率或模拟胜率升为整战可信度。完整杀序未见自然获胜验证；P4所读focus=女王与另focus=聚合体是题内选项，实际该步end_turn、终局双敌存活。

160 F22T2护栏48ad4a21-9d00-4701-80a8-1753f81e23d5为唯一替线：hp_guard预测损血10→0、伤害6→12，两线3轮/2样本均1死0胜、后续预期损21相同。真实先打击/步法后重算成防御+、步法，未执行原斗篷后继；不记实省10血或整战收益。该原字段与后继均保留于execution-audit/whole-run-summary。

## 新纯bug与代码提案

- P4ZBYNW92PPK：带刺手甲 SPIKED_GAUNTLETS 的显式数值与energyIcons图标重复，Jev收到“11点能量”；原遗物加1费、手牌毒雾/步法+实2费。当前live agent/src/knowledge/relic-values.ts:44固定输入复现rc0，源码提交/diff/SHA及最初tsx EPERM失败保留在relic-render-repro.json。新账本silent-0617，早先Silent复盘/ledger/fix-queue未检出同项；不证明对当局打法或死亡的影响。未改源码。
- 整局候选提案：silent-proposal-06e99bfade96b76b，/home/dw/Projects/agent-sts2/learner/runs/20261024-164319-824e21ec-27a8-4473-98cd-03d4077a0d50-postmortem/proposal-whole-run.md；combat/potion/terminal；缺三输入及受控替线，保留现有行为，不改数值；strategy-proposal独立核覆盖或waiting。
- 纯显示bug提案：silent-proposal-4976c043ffdcd610，/home/dw/Projects/agent-sts2/learner/runs/20261024-164319-824e21ec-27a8-4473-98cd-03d4077a0d50-postmortem/proposal-relic-render.md；structure；仅修正数字+图标组合呈现，保留未知和真实费用，不添加游戏知识。待strategy-proposal实现、检查与发布，未登记implemented/shipped。

## 记录验收

- 06BV1PZWV14R：已一次cat追加；新增[]，更新['silent-0352', 'silent-0019', 'silent-0020']，实际CLI读回['silent-0019', 'silent-0020', 'silent-0352']。各旧条目只support，repeat=[]。
- P4ZBYNW92PPK：已一次cat追加；新增['silent-0617']，更新['silent-0352', 'silent-0019', 'silent-0020']，实际CLI读回['silent-0019', 'silent-0020', 'silent-0352', 'silent-0617']。各旧条目只support，repeat=[]。
- 4374764UVEXD：已一次cat追加；新增[]，更新['silent-0354', 'silent-0019', 'silent-0020']，实际CLI读回['silent-0019', 'silent-0020', 'silent-0354']。各旧条目只support，repeat=[]。
- 160G2YS143YB：已一次cat追加；新增[]，更新['silent-0353', 'silent-0019', 'silent-0020']，实际CLI读回['silent-0019', 'silent-0020', 'silent-0353']。各旧条目只support，repeat=[]。
- gitleaks任务目录扫描约128.96MB，退出0、无泄漏；原回执gitleaks.json保留。
- 最终ledger.py check退出0；各局标题唯一，关键进场血量/死亡回合及资源表按原始字节重新核回。verification.json记录逐引用SHA核验和产物SHA；未发现需勘误数字。
- 未记录/未知包括准确历史源码/release、外部三输入缺件与六字段回执、自有四表、未达幕末/F49、逐源毛伤/回复拆分、未执行替线收益、严格同前缀人类比较和Boss时钟配对准确率。没有将这些未知写成0。
- 全部写入只限授权lessons追加、账本/提案CLI及本任务目录；未写正式经验/策略/rk/来源schema/消费者。纯记录和固定只读复现，无产品代码变更，不运行整库测试；无提交、推送、运行游戏或STOP操作。原失败与过程输入不清理。
- 正式发布、consumer_readback、自然采用/收益、三输入剧本与学习父要求均保持pending。调用方负责记录提交与后续发布链，不将本报告完成视作父项关闭。

# 本批策略提案回报

记录时间：2026-10-13 03:46:11 CST。task=strategy-proposal，character=silent，batch=20261013-033546-s2-strategy-proposal。

本批10项已逐项复核，全部保持waiting。没有足够的新证据支持改实际策略，且已有事实子项不能冒称完整父提案duplicate/implemented。本次无生产代码/知识/测试文件变更、无提交、无合入、无新eval版本、无shipped或自然消费者效果声明。

## 批次与基线

开工git status干净，HEAD=b2e6b586440c56ea13ed2f41779ac5fc38304a4e；普通批次git merge --no-edit main返回Already up to date，base保持该完整40位。根learn.json本批task/character/worktree和六个runs一致，proposal_ids精确10项，无proposal_repair/research_request/implementation_request。普通专题身份只查strategy-research-silent.json，绑定的是另一batch，不承接专题，也不读取其他根专题请求。原提案10份逐一核SHA且保存原字节；未领取其他id、未另造重复提案。

六局runs.jsonl各唯一一次，均SILENT/A10，结束时间2026-10-07 05:17:57.587Z至10:10:37.387Z；运行版本均dirty，不能用当前main/live源码冒作当时逐字源码。原角色知识只读silent。报告材料均在本批scratch，目录gitignore忽略，工作树应保持干净。

## 原始证据与口径

| 原日志 | 核原字节记录数 |
| --- | ---: |
| states | 4062 |
| decisions | 3941 |
| sl-attempts | 38 |
| brain | 188 |
| run-plans | 33 |
| run-config | 6 |

合计8268条逐原文件offset/bytes/SHA核验并检查本角色/局号；raw-evidence-index.json可定位每条。内容分析集中在986个目标状态帧、972条对应决策和6段原复盘；其余记录核身份/原字节，不冒称重做所有局的全历史机制或构筑研究。state-facts.json、decision-facts.json、sl-facts.json保留事实，reviews的原文与勘误未改写。

| 同指纹局面 | 原/替线实际损血 | 原/替线敌方本体净扣 | 状态锚点 |
| --- | --- | --- | --- |
| 8JRE1C4H4Z2W F33 T2 | 3/15 | 10/17 | 276208→276212、276274→276278 |
| YF0LXT1QSTGG F48 T1 | 0/9 | 45/38 | 277327→277337、277366→277373 |
| XP2SL33HT0D9 F33 T3 | 9/14 | 24/27 | 278028→278031、278076→278079 |
| XP2SL33HT0D9 F33 T1 | 2/10 | 25/34 | 278018→278023、278231→278236 |

四组指纹及观测时间都回连原帧。敌方净扣含已结算毒/反伤，不能冒称纯卡牌输出；只控制起点与当轮观测，未控制整场随机输入/抽弃/后续选择。全败/封顶推演不等于无血价，也不据这四组拟探索惩罚或禁止条件。反例包括YF F33重打胜、护栏省血而仍败、能力已建立仍败、未完整执行的抽弃候选。六局没有本批要求的新增完整受控胜线或独立后移验证。

## 现有源码与消费者核对

只读冻结live提交0751319737989d6a9940d608914448e8f0f15056。15个所查base源码提交全为该live祖先，但只有7份文件字节相同；其余8份分别保留base/live源码.txt，不宣称当前源码等价或补合main/live历史差异。共同代码仅用于查调用接线，未读其他角色知识。

| 文件 | 实际live祖先中的base源码提交 | 当前base/live字节 |
| --- | --- | --- |
| agent/src/reflex/turn-solver.ts | 68711002f15b298b8863d2258ee5da236da151d2 | 不同，分别冻结 |
| agent/src/reflex/rollout.ts | 68711002f15b298b8863d2258ee5da236da151d2 | 不同，分别冻结 |
| agent/src/reflex/rollout-live.ts | 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 不同，分别冻结 |
| agent/src/reflex/combat-plan.ts | 68711002f15b298b8863d2258ee5da236da151d2 | 不同，分别冻结 |
| agent/src/reflex/card-model.ts | b2805be4ba44b7375c7908d873889372cc3cfe6c | 不同，分别冻结 |
| agent/src/reflex/passive-pieces.ts | c519952b31e3a0bb3acdd2115883ae8671b8a090 | 不同，分别冻结 |
| agent/src/reflex/silent-selection-audit.ts | 9d8278702dbc581b5015ba7ec9a70dc0fb94cccb | 相同 |
| agent/src/reflex/silent-selection-dispatch.ts | fdaf787a372880b0438e73bcac7e6d2168b038ed | 相同 |
| agent/src/reflex/silent-hp-guard-audit.ts | 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 相同 |
| agent/src/reflex/silent-sl-comparison.ts | 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 相同 |
| agent/src/reflex/silent-sl-resource-comparison.ts | 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 相同 |
| agent/src/reflex/silent-phase-current.ts | aad2700abed6dff1d66e87fb36aaa6fedb39adf3 | 相同 |
| agent/src/knowledge/monster-db.ts | 4ed3c72df30f27b881da637aebf528b97440e0bb | 相同 |
| agent/src/hand/loop.ts | fdaf787a372880b0438e73bcac7e6d2168b038ed | 不同，分别冻结 |
| agent/src/sl/explore.ts | b01edf46b4b619f217d070a196e161df9fe716a0 | 不同，分别冻结 |

live combat-plan明确调用silentPhaseCurrentFacts、silentSlComparison、silentSlResourceComparison、silentHpGuardAudit和silentSelectionAudit；loop调用silentSelectionDispatch。六个专用事实模块字节相同，当前进阶monster-db也相同。候选审计scope=predicted_candidates、actual_turn=null；派发回执scope=single_action_receipt、state_effect_verified=false、whole_plan_executed=null。当前阶段函数只承诺本帧，不记录累计已兑现毒伤。这些源码事实证明现有子项范围，不能作为整轮执行/累计能力校准完成的证明。未运行LLM/网络或游戏。

monster-db当前进阶有数据即选精确进阶，moveDamageAt/monsterHpAt没有五样本门槛；房间代价ROOM_COST_MIN_N仍5。现有逐实体成长/污染/临时减力/船夹板接线保留；现场层数与当前库不替代当时历史调用输入，不推断未观察的来源分支。

## 逐项提案与具体缺口

# 静默猎手已派发十项提案的证据复核

## silent-proposal-c20b5139dd0dff71

冻结当前技能效果和污染逐击血价；当前进阶从观测数据库取攻击，保留所有选项。

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md；SHA256=bed21b409432a70aeba53c8cbf1ce31a5e83113f5208f144766b259c4f9a0c3c
- 来源任务：experience-update；实现任务：strategy-proposal；本批=20261013-033546-s2-strategy-proposal
- 证据局号/层/回合：DUZUBAJ3A8GP F27 T4–6；silent-0168；states:274830–274839
- 全部既有账本id：silent-0168
- 本次原帧核验：T4污染0→3→3→6，勒紧能力没有增加污染；T5火花6，污染0→6→12→18，下一轮消失，46→37实损9。
- 反例/限制：技能同时提供毒、虚弱或格挡，不能将9实损当作每张技能的固定净惩罚。
- 旧/预期行为：保留现有选线、药水、SL、终局权重；按原提案补可证事实与限定机制，全部选项保留，推演相同标并列。
- 处置：waiting。首样本数据库、污染与火花接线已有；缺技能收益/火花增长/污染清除联合预测的独立校准及完整受控替线，不改技能惩罚。
- 后续验证：冻结技能前后状态与实际移动输入，逐步核对污染、虚弱、挡、毒、玩家血与敌本体血；后续独立局验证联合模型。 若新增生产实现，撤源码固定夹具失败/恢复通过，再跑原沙箱入口和live合入后检查。
- 拟合/切分：本批六局均为既有A10发现样本；每个SL存档归同一run，不拟新参数、不冒称后移盲测。
- 预期影响/回退：当前只补链接与报告，无运行行为改动或源码回退；以后实现须引用自己的live源码祖先，规则变更按既有授权双通知。

## silent-proposal-ae9e692d680e3819

提案：逐实体记录已观察的抢夺/返还与负属性，再验证当前方案，不设置固定击杀序。

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md；SHA256=b30fb59d7407c7226d4d67196479a4e2cc9322e478ab8314fa4a7ead7ea6c3b5
- 来源任务：experience-update；实现任务：strategy-proposal；本批=20261013-033546-s2-strategy-proposal
- 证据局号/层/回合：5PM6JAQG6FNQ F39 T2/4–6；silent-0183、silent-0005；states:274341/274351/274358/274362/274379/274391
- 全部既有账本id：silent-0183、silent-0005
- 本次原帧核验：两次抢夺使玩家力敏−2/−2、再到−4/−4；首试两步法后敏捷0，失落退场后力量恢复；T6仍有遗忘继续抢敏。
- 反例/限制：末试单步法仅恢复至−2敏；失落被毒杀也未使8血0挡承受遗忘19攻击。
- 旧/预期行为：保留现有选线、药水、SL、终局权重；按原提案补可证事实与限定机制，全部选项保留，推演相同标并列。
- 处置：waiting。缺遗忘死亡返敏、同属性多来源抢夺与临时属性混合返还的连续事件及稳定实例身份，不补一般返还模型或固定击杀序。
- 后续验证：补同属性多来源与临时属性相邻事件夹具，分实体归源，死亡返还与后续再抢分开；击杀序需完整同资源对照。 若新增生产实现，撤源码固定夹具失败/恢复通过，再跑原沙箱入口和live合入后检查。
- 拟合/切分：本批六局均为既有A10发现样本；每个SL存档归同一run，不拟新参数、不冒称后移盲测。
- 预期影响/回退：当前只补链接与报告，无运行行为改动或源码回退；以后实现须引用自己的live源码祖先，规则变更按既有授权双通知。

## silent-proposal-52f1e1bd2e7db0ed

第一观测起使用当前进阶HP/攻击事实，冻结加压与弱；保留房间代价五样本门槛。

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-sewer-clam-pressure-growth.md；SHA256=651f0bdcdb88c5cd511aae9b4744b0d60852b08a67d67d0bcb76d52bd5ce8376
- 来源任务：experience-update；实现任务：strategy-proposal；本批=20261013-033546-s2-strategy-proposal
- 证据局号/层/回合：CA5KE8GFJ9X2 F13 T1–5；silent-0231；states:273237/273247/273252/273258/273263
- 全部既有账本id：silent-0231
- 本次原帧核验：同喷水意图11→15→19、力量0→4→8；轮初覆甲9/9/8/7/6；T5虚弱14攻击对2血10挡。
- 反例/限制：这些帧能确认当前数值，不能隔离完整覆甲触发条件及额外来源；死亡的2血截断也不是完整未挡需求4。
- 旧/预期行为：保留现有选线、药水、SL、终局权重；按原提案补可证事实与限定机制，全部选项保留，推演相同标并列。
- 处置：waiting。当前进阶首样本读取已存在；缺覆甲减层独立触发/叠加来源及历史实际调用移动输入，不能认证成长与覆甲联合重放。
- 后续验证：核实际读取的A10移动表与加压/覆甲逐事件重放，保留房间代价五样本门槛；当前库快照不冒作当时输入。 若新增生产实现，撤源码固定夹具失败/恢复通过，再跑原沙箱入口和live合入后检查。
- 拟合/切分：本批六局均为既有A10发现样本；每个SL存档归同一run，不拟新参数、不冒称后移盲测。
- 预期影响/回退：当前只补链接与报告，无运行行为改动或源码回退；以后实现须引用自己的live源码祖先，规则变更按既有授权双通知。

## silent-proposal-6dd8bbff876be528

复验现有HIGH_VOLTAGE_POWER逐实体增长，当前进阶攻击从DB读；新召唤者不继承旧实体计数。

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-zapbot-high-voltage-growth.md；SHA256=48b2be77326bb54c99a17547f0499b91bca9816e1ff9f0761baded11ddeccde5
- 来源任务：experience-update；实现任务：strategy-proposal；本批=20261013-033546-s2-strategy-proposal
- 证据局号/层/回合：5PM6JAQG6FNQ F38 T3–4；silent-0233、silent-0209；states:274308/274313
- 全部既有账本id：silent-0233、silent-0209
- 本次原帧核验：23上限电击机器人在T3力2、攻击17，T4力4、攻击19，高电压均2；index从4变3，不能用index当永久身份。
- 反例/限制：未实打的先杀爪牙候选不证明能多保27血救后场；单个旧实体成长不能覆盖新旧同种并存。
- 旧/预期行为：保留现有选线、药水、SL、终局权重；按原提案补可证事实与限定机制，全部选项保留，推演相同标并列。
- 处置：waiting。逐实体高电压增长已有接线；缺同种电击新旧并存/替换的稳定身份与连续召唤事件，不能认证全部不继承分支。
- 后续验证：冻结召唤事件和稳定实例键，用新旧同种并存与index重排夹具验证独立计数，再核完整杀序。 若新增生产实现，撤源码固定夹具失败/恢复通过，再跑原沙箱入口和live合入后检查。
- 拟合/切分：本批六局均为既有A10发现样本；每个SL存档归同一run，不拟新参数、不冒称后移盲测。
- 预期影响/回退：当前只补链接与报告，无运行行为改动或源码回退；以后实现须引用自己的live源码祖先，规则变更按既有授权双通知。

## silent-proposal-578e415a259e6835

核验静默沙虫同指纹SL实付血价、已建攻防与毒结算、候选及资源分账；证据不足保留原选择规则

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-173847-experience-update/proposal-mechanisms-sl-resources.md；SHA256=e13a77ede19196a05647125bcb3c4481ed36ddf98e9e7e2889817f10c9fa190a
- 来源任务：experience-update；实现任务：strategy-proposal；本批=20261013-033546-s2-strategy-proposal
- 证据局号/层/回合：8JRE1C4H4Z2W F33 首/第三试T2、第二试T5、末试T11及F17 T6；原提案全部账本id见下
- 全部既有账本id：silent-0005、silent-0006、silent-0018、silent-0079、silent-0019、silent-0020、silent-0021、silent-0125、silent-0023、silent-0027、silent-0046、silent-0016
- 本次原帧核验：同指纹T2原/替线实损3/15、敌净扣10/17；末试T11有2敏与余像仍只有22挡、5血对37。
- 反例/限制：护栏候选节省量不等于实打节省量；抽弃牌后重规划可改变后续动作，防御替换也有省血但仍败的反例。
- 旧/预期行为：保留现有选线、药水、SL、终局权重；按原提案补可证事实与限定机制，全部选项保留，推演相同标并列。
- 处置：waiting。原答/护栏/SL候选和单动作回执已有；缺跨抽弃牌重规划的完整执行归属、中间事件及能力累计收益链，不能认证整轮审计。
- 后续验证：以F17 T6、F33 T2/T5/T11为固定执行链夹具，分候选/首次派发/后续重规划/终轮结算；SL恢复不计回血。 若新增生产实现，撤源码固定夹具失败/恢复通过，再跑原沙箱入口和live合入后检查。
- 拟合/切分：本批六局均为既有A10发现样本；每个SL存档归同一run，不拟新参数、不冒称后移盲测。
- 预期影响/回退：当前只补链接与报告，无运行行为改动或源码回退；以后实现须引用自己的live源码祖先，规则变更按既有授权双通知。

## silent-proposal-c0767768bf6a7ab1

全败SL替换与覆盖重放应分列同轮资源代价及未执行续步；先实现事实核验，禁止探索或惩罚系数缺受控胜局证据。

- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-sl-resource-trade.md；SHA256=28e9d34c33097cb3858c0f92f68f34b6204fc8a6880ffda62e6cbb510c7546cb
- 来源任务：postmortem；实现任务：strategy-proposal；本批=20261013-033546-s2-strategy-proposal
- 证据局号/层/回合：YF0LXT1QSTGG F48 第二/第三试T1、第四试T5及F33重打；silent-0079；decisions:271309/271348
- 全部既有账本id：silent-0079
- 本次原帧核验：同指纹T1原/替线实损0/9、敌净扣45/38；两候选全败封顶不抹掉多9血少7净扣。
- 反例/限制：F33有重打实际获胜；F48第四试T5抽弃重规划使候选没有完整执行，不能将全部SL判无效。
- 旧/预期行为：保留现有选线、药水、SL、终局权重；按原提案补可证事实与限定机制，全部选项保留，推演相同标并列。
- 处置：waiting。替线资源比较已有；缺覆盖重放/弃牌后的完整执行证明及同资源随机输入下完整获胜替线，不拟禁止探索或血价系数。
- 后续验证：先核完整续步与抽弃切断，再以独立后移A10同角色局验证；保留F33成功SL反例，不从全败封顶拟全局规则。 若新增生产实现，撤源码固定夹具失败/恢复通过，再跑原沙箱入口和live合入后检查。
- 拟合/切分：本批六局均为既有A10发现样本；每个SL存档归同一run，不拟新参数、不冒称后移盲测。
- 预期影响/回退：当前只补链接与报告，无运行行为改动或源码回退；以后实现须引用自己的live源码祖先，规则变更按既有授权双通知。

## silent-proposal-a46bdb7fe711d79a

实验体候选区分阶段、已建能力与已兑现毒/挡收益；零毒触媒和后取得敏捷不预支，动作排序调整证据不足。

- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-174301-postmortem/proposal-phase-poison-delivery.md；SHA256=eb929b3084fc0d0026276fcaf148aac938a284f89c40176600b248999450cdb6
- 来源任务：postmortem；实现任务：strategy-proposal；本批=20261013-033546-s2-strategy-proposal
- 证据局号/层/回合：YF0LXT1QSTGG F48 末试T3–5；silent-0021、silent-0027、silent-0028、silent-0085；states:277512–277528
- 全部既有账本id：silent-0021、silent-0027、silent-0028、silent-0085
- 本次原帧核验：T3敌4血4毒、T4新阶段212血且旧毒/力清空；T5触媒2而零毒，5敏先给13+10=23挡，之后敏捷6仍23挡；敌197→160。
- 反例/限制：先前尝试建立毒雾或余像仍败，不能以毒未启动作为唯一死因；后取得敏捷不倒补格挡。
- 旧/预期行为：保留现有选线、药水、SL、终局权重；按原提案补可证事实与限定机制，全部选项保留，推演相同标并列。
- 处置：waiting。当前阶段/组件/零毒触媒事实已有；缺跨阶段逐伤害来源事件和跨抽弃牌完整候选执行链，不认证累计能力收益或改排序。
- 后续验证：重放阶段转换、零毒能力、敏捷取得顺序与遗忘额外伤害，分行动/结算/未派发；后移局核能力实际兑现而非持有。 若新增生产实现，撤源码固定夹具失败/恢复通过，再跑原沙箱入口和live合入后检查。
- 拟合/切分：本批六局均为既有A10发现样本；每个SL存档归同一run，不拟新参数、不冒称后移盲测。
- 预期影响/回退：当前只补链接与报告，无运行行为改动或源码回退；以后实现须引用自己的live源码祖先，规则变更按既有授权双通知。

## silent-proposal-1044224808015e5c

核验A10双蟹B2零胜并列的SL换线血价，分列当轮损失、输出与成长；缺独立胜线时保留原行为，不以零差宣称安全。

- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-sl-blood-price.md；SHA256=4e864f92eb146261d320cdac4a721859b4c960e4d9522e27bafa8e6ab15159d5
- 来源任务：postmortem；实现任务：strategy-proposal；本批=20261013-033546-s2-strategy-proposal
- 证据局号/层/回合：XP2SL33HT0D9 F33 首/第二试T3、首/末试T1；silent-0079；decisions:271992/272040/271982/272195
- 全部既有账本id：silent-0079
- 本次原帧核验：T3同指纹实损9/14、敌净扣24/27；T1同指纹实损2/10、敌净扣25/34，末试还有手里剑力量成长。
- 反例/限制：两组皆缺完整受控胜线；末试T2零损及T3只损4，不支持按少挡牌数否定所有探索。
- 旧/预期行为：保留现有选线、药水、SL、终局权重；按原提案补可证事实与限定机制，全部选项保留，推演相同标并列。
- 处置：waiting。血价与成长候选事实已有；缺同资源随机输入下完整受控替线、独立后移验证和可获胜反例，不启用固定低当轮损血优先。
- 后续验证：按run而非SL尝试切分，保留朝向/临时减力/手里剑成长，补完整胜线与独立后移局再验证窄规则。 若新增生产实现，撤源码固定夹具失败/恢复通过，再跑原沙箱入口和live合入后检查。
- 拟合/切分：本批六局均为既有A10发现样本；每个SL存档归同一run，不拟新参数、不冒称后移盲测。
- 预期影响/回退：当前只补链接与报告，无运行行为改动或源码回退；以后实现须引用自己的live源码祖先，规则变更按既有授权双通知。

## silent-proposal-7cbc6005db712ba9

用本角色日志核验双蟹朝向、临时减力、船夹板T2格挡与能力实际兑现；补缺失条件参考，保留原出牌权重和未验证条件。

- 原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-181302-postmortem/proposal-combat-realized-window.md；SHA256=f6d851dba9b1b5b9765030c0d2f66f074d4ba4ed203f7dcf5bc6c9639fa73291
- 来源任务：postmortem；实现任务：strategy-proposal；本批=20261013-033546-s2-strategy-proposal
- 证据局号/层/回合：XP2SL33HT0D9 F33 末试T2–5；silent-0021、0005、0007、0063、0065、0241、0242；states:278236–278260
- 全部既有账本id：silent-0021、silent-0005、silent-0007、silent-0063、silent-0065、silent-0241、silent-0242
- 本次原帧核验：T2轮初14挡，镣铐爪0→−9力、4→0攻击，斗篷后20挡；T3恢复；T4火箭57→38→28，4敏脆弱下6挡。
- 反例/限制：已启动能力仍无减员、末次仍败；不能把额外触发混入船夹板或将朝向/虚弱合为一个单牌贡献。
- 旧/预期行为：保留现有选线、药水、SL、终局权重；按原提案补可证事实与限定机制，全部选项保留，推演相同标并列。
- 处置：waiting。挡/减力/朝向子项已有；缺联合候选收益、额外触发来源隔离和混合意图缺值语义，不认证整个机制包或改持续价值权重。
- 后续验证：固定核14+6、0→−9→0、57→38→28、脆弱6挡与毒末结算；缺值保持未知，额外来源独立归因。 若新增生产实现，撤源码固定夹具失败/恢复通过，再跑原沙箱入口和live合入后检查。
- 拟合/切分：本批六局均为既有A10发现样本；每个SL存档归同一run，不拟新参数、不冒称后移盲测。
- 预期影响/回退：当前只补链接与报告，无运行行为改动或源码回退；以后实现须引用自己的live源码祖先，规则变更按既有授权双通知。

## silent-proposal-c59f592f1427a67e

核实静默临时减力/轮初挡与已建能力兑现，分列同盘SL原答/替换/实际血价；缺完整胜线时保留规则并后移验证

- 原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-184216-experience-update/proposal-mechanisms-sl-resources.md；SHA256=81f2b4019e4218efea09382a1f6781a412e3090205b8b4d8568ce9b9396a5dd2
- 来源任务：experience-update；实现任务：strategy-proposal；本批=20261013-033546-s2-strategy-proposal
- 证据局号/层/回合：YF0LXT1QSTGG F48 T1/3–5、XP2SL33HT0D9 F33 T1–5及两局前段资源；原提案全部账本id见下
- 全部既有账本id：silent-0005、silent-0006、silent-0019、silent-0020、silent-0021、silent-0028、silent-0027、silent-0079、silent-0046、silent-0085、silent-0060、silent-0063、silent-0065、silent-0062、silent-0039、silent-0013、silent-0011、silent-0023、silent-0018、silent-0087、silent-0241、silent-0242
- 本次原帧核验：两局同盘血价与能力时点支持前述事实：当前能力、当轮输出/挡、后轮恢复和SL恢复必须分账。
- 反例/限制：经验支持和局部事实不等于整场因果；YF/XP都无本提案要求的完整受控胜线，SL各尝试仍相关。
- 旧/预期行为：保留现有选线、药水、SL、终局权重；按原提案补可证事实与限定机制，全部选项保留，推演相同标并列。
- 处置：waiting。局部事实/候选审计已有；缺完整累计收益、跨重规划因果归属和恢复资源全链，不认证整包、量化父项或自然采用效果。
- 后续验证：对两局逐动作拼接资源链与能力累计来源，保留未结算毒、死亡截断及召唤缺帧；独立后移局再验证规则。 若新增生产实现，撤源码固定夹具失败/恢复通过，再跑原沙箱入口和live合入后检查。
- 拟合/切分：本批六局均为既有A10发现样本；每个SL存档归同一run，不拟新参数、不冒称后移盲测。
- 预期影响/回退：当前只补链接与报告，无运行行为改动或源码回退；以后实现须引用自己的live源码祖先，规则变更按既有授权双通知。


## 验证、记录与上线

audit-evidence.py核原字节/身份及四组实际血价，通过；这是离线证据检查，不是tsc/vitest或新实现撤源码红绿。未改生产源码，tsc=null、vitest=null、cases=null；撤源码失败/恢复通过不适用，未执行也未报成功。未提交、未进入live合入锁，没有merged或release_id；保留已上线历史，不登记shipped。scratch只保存分析与报告，gitleaks及最终干净检查另有回执。

仅经根learner/ledger.py update为10项涉及的既有账本追加本批proposal.md/report.md链接及具体waiting说明，不追加重复游戏证据、不改claim、version、effect或原status（已shipped不降级）。已有id全部来自原CLI；无新发现需code_proposals.py add，专用队列原state与认领字段由调度器消费最终proposal_results，不手写队列或learn.json。

无新源码可回退；后续有证据的独立实现沿原id接续。运维交付路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-033546-s2/learner/runs/20261013-033559-strategy-proposal/proposal.md；完整JSON为result.json。报告不关闭任何量化学习/经验沉淀父要求。

一次探索结构查看误将非战斗帧combat=null当作对象，命令报TypeError；后续只读combat非空帧并完整核验通过。初次路径查找中不存在的旧文件名报错，按实际文件定位；它们不是游戏或生产测试失败。历史工具输出保留，不将首次探查报为验证通过。

## 最终材料验收

证据检查退出0：8268原记录及4组成对血价复核；gitleaks退出0、发现0；根账本30条本批物理追加逐条核原字节，均只含链接/说明、未变更status/claim/evidence/version/effect，账本检查448项0问题。最终HEAD=b2e6b586440c56ea13ed2f41779ac5fc38304a4e，git status --porcelain为空。本批10/10已处置waiting，fixes=[]、merged=null、tests三项null。独立回执final-verification.json，原CLI行ledger-physical-rows.jsonl。

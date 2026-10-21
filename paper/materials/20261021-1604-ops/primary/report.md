# Silent 策略消费批次报告

记录时间：2026-10-21T15:57:10+08:00（写入前已运行 date）。

## 结果与身份

本批十项原提案均 waiting。部分诊断子功能已有实际 live 祖先，但没有足够证据将完整父提案登记 implemented/duplicate，也没有支持新的策略阈值、SL排序或药水价值参数。本轮没有源码提交、没有新游戏版本、没有合入live；fixes=[]、merged=null，tsc/vitest/cases均null。未运行测试不是测试成功；没有新源码，因此不做撤源码失败/恢复通过试验。

任务 strategy-proposal，角色 silent，批次 20261021-154302-strategy-proposal。dispatch.json 是只读提取的本批原行，task/character/worktree/runs 与当前任务一致，proposal_ids 恰十项、无 proposal_repair、无 research_request、无 implementation_request。根 notes/strategy-research-silent.json 属于旧批次，不借此切换为纯研究。

派发 HEAD 为 85f99b4757beef925010e857adafc9f081b37396，开工 git status 干净。按普通任务要求 git merge --no-edit main，快进至本报告 base：**757b23b2ab3d7e6fdd087e4722df31bd87eeb73f**，只涉及记录和数据，执行源码、任务模板和knowledge未改变。不是手动研究 dispatch_base，也没有用新提交伪装基线。报告和过程材料全部位于本批忽略的 learner/runs/；不修改原任务/请求或其他角色知识，不派下级agent，不联网、不运行play。

六个 runs.jsonl 原始行均为 SILENT、A10、ended非空，胜负均false：751FN9QM9MHQ F17、KV0JHNJCKXLS F33、YQL8RZ8BWN1E F17、L9SGRBB5R698 F17、PU80F84P6HPN F33、KEN58SH9SLZ6 F17。不能把整局结局混作其中某场未胜；例如PU的F17和F33另分。原行与源冻结SHA、offset/bytes/SHA见 run-verification.json。

本会话未读取自己的原生 turn_context/模型请求回执，故不报告模型/推理档位已实际核验；历史 run-config 中的大脑配置也不作为本学习会话配置证明。

## 原文恢复与范围

十条队列 add 原行保存 dispatch-proposals.json。四件原Markdown直接读原路径；六件旧 exp 路径已不存在，从 retention 已校验归档按原队列SHA精确读取匹配成员，写入本批 original-proposals/。没有展开整个仓库、恢复/改动旧工作树或修改任务状态。original-proposal-manifest.json 保存每项原路径、归档SHA、成员路径、字节数和提案SHA；十件全部匹配，完整实读。

已读 README、最新STATE-2026-10-19、decision-log末尾、学习协议及代码提案闭环。STATE的旧停点与后续日志更新分开，不据旧停点自行恢复/停止生产。原提案之外不领取队列、不使用外部公开数据、不搬用其他角色知识。

## 冻结提证与缺失

已按任务精确运行根 evidence_summary.py；摘要SHA为84062ccbc304c502128e6d5b02e06995d9e0e67f76412609e9da92a3e433b31a。它只作事实定位入口，最后五条不是覆盖范围。

两次共用 extract_evidence.py 均正常退出：v6-evidence/ 按 --streams v6-build jev-prompts decisions run-config；evidence/ 按原默认流。两个 evidence-manifest.json 保留各自完整 source_size/source_sha256/计数/缺口及输出内容SHA，未覆盖旧报告、未把不同切点混为一个切点。两次 decisions/jev 冻结大小不同源于日志继续追加；本批历史行按原位置和SHA回读一致。

V6专项冻结切点：v6-build=64678849字节，jev-prompts=2404371442，decisions=3341249847，run-config=2427471。通用提证：states=15256246850，decisions=3341330168，sl-attempts=52695564，run-config=2427471，run-plans=10382170，brain=1215304477，v6-build=64678849，jev-prompts=2404513635。完整前缀SHA均见manifest，不只保存抽样尾部。

V6-build 本批六局均no_match，所读冻结源有效660行。没有本批可实读的 entries/jev_answer/fallback/unknown 行，相关采用率、数量分布和收益为未知，不把无匹配说成entries为零或V6有效。本批日期早于当前V6日志；六条历史run-config均没有顶层/loop的V6开关字段，**无显式off证据**，保留历史缺字段/缺匹配状态，不补写off。Jev日志的 request/answers/error 是另一条流，不能作V6答复或V6采用证明。

专项decisions冻结源存在2行invalid_json、1934 unknown_identity、1488 unmatched_decision_id；专项Jev全源有1行invalid_json。本批已收行身份均明示一致run_id/指纹，Jev每行另保精确decision_id对应decisions原行的decision_ref；上述全源缺口未归属于本批。专项及通用流 incomplete_lines=0，所选原文均未截断，但不能据此排除invalid行中无法归属的本批内容。缺失不是零。run-plans的run字段由统一identity入口接收，不以正文提局号或相似question_id关联。

## 问题覆盖与原文读取

| 局号 | Jev request/answers行 | error字段非空 | 完整题面实读 |
| --- | ---: | ---: | ---: |
| 751FN9QM9MHQ | 137/137 | 0 | 3 |
| KV0JHNJCKXLS | 104/104 | 0 | 2 |
| YQL8RZ8BWN1E | 253/253 | 0 | 1 |
| L9SGRBB5R698 | 251/251 | 0 | 0 |
| PU80F84P6HPN | 172/172 | 0 | 0 |
| KEN58SH9SLZ6 | 109/109 | 0 | 4 |

共1026条本批Jev行机械索引；10题完整实读request（全部state/context/questions/criteria）、answers及error存在性，关联decisions的chosen/result/gate_reject/selection_dispatch与续步。三组同指纹配对完整questions逐对象相等，第二题读取所有变化state字段，完全相同的题面以原字节+相等校验复用，证明保存在question-pairs.json。不是只读答案或选中候选。

其余1016题没有逐题实读：范围限定为十个原提案的关键对照与证据缺口，本轮不从未读题面推断规则/收益，也不声称六局完整科学覆盖。question-coverage.json逐题保存精确decision_id、原引用、reviewed与未读原因；L9/PU本轮只核角色结局和本体/占位阶段原始状态，没有完整实读这两局Jev题面。原提案要求的751 T2/T13、KV T1及全战回血、KEN T2/T5/T8/T9、其他五次耗药、原105局统计均未完成本轮完整复验，保留waiting。

所读历史题面内嵌旧知识文本、其他历史局号及A8/A9通用药水统计，仅作为当时题面保存；本轮不核其游戏结论、不把正文中的其他局归入本批、不据这些可能来自其他角色的统计学习或拟合。

case-audit.json保存每题原questions、dispatch字段的present/value、全部续步及状态原字段投影、逐行引用。pre-state按**已核run_id + observed_ts精确相等 + 完整fingerprint相等**唯一定位，后续仅在同一已核局内顺读至下一回合/终局，模态选牌不截断整轮。状态时序只用来连接后果，不据时间邻近确定局归属。selected-raw-rows.jsonl保留完整原row；source-readback.json记录121个去重decisions/Jev/config/states原行从只读源seek(offset)/read(bytes)，SHA与JSON逐项相同。不是从摘要恢复内容。

## 逐问题原始执行后果

| decisions原行与精确decision_id | 原始题答、执行与状态窗口 |
| --- | --- |
| 272361 / 179c20e7-efd4-44e8-8ee1-406abd398d69 | 751 F13 T3，Jev plan2，置信0.24。题面有药损8/伤26，整战无药plan5损8/伤16，均8/8模型胜；普通plan3后续7/8样本会喝，不能混为无药整战。首chosen只打防御；272362续步才饮槽0肌肉药，completed。states278402–278407核58→50、挡0→7、力量+5、槽消失、逐牌/毒/反伤后敌40→11。原题伤26与最终净扣29有来源差别，不把净扣29全归药水。未实打留药或无药分支。 |
| 272531 / fd52f1c7-ecb9-4c66-99ba-e1419817dc34 | 751 F17第2试T7，Jev plan2。题面匕首雨/生存者/防御+，模型损19。states278576–278581含选牌模态，生存者实际弃呼唤；续步272532 pending，272533选牌completed，272534防御+completed。实际45→32、敌121→109，损13、净扣12。 |
| 272652 / 9836a127-543c-4e2f-adb9-e4c7bc103a3b | 同指纹T7第4试，Jev仍plan2，SL另换匕首雨/生存者/打击；B2 .103→.013、配对差−.09、SE .0088。首chosen仍相同匕首雨，不能由首动作辨完整线。states278697–278702及272653–272656确认实际弃呼唤后打击、45→22、敌121→103。损23、净扣18，多10损换6伤；保守未决弃牌多计6在两线均存在。未取得受控整战胜线。 |
| 273400 / 610bfa55-18de-410d-ac05-cf5c43772962 | KV F33第4试T5，Jev plan1猎杀者+致命毒药+。states279460–279465，敌334→319→298，毒14→21→20，玩家30不变。续273403选诅咒timeout，273404重试completed；失败回执保留，不记两次选牌成功。 |
| 273450 / 427b1bd7-6bb7-440e-bc15-caa96029c513 | 同指纹第5试，Jev仍plan1，SL删毒药；两线B2均0、配对差/SE均0，只是模型全败。273451再次问后结束，states279511–279515敌334→319→305、毒14→13，玩家30不变。273452选牌timeout、273453重试completed。扣敌36→29且未省血，不等于已证新排序应全局禁止此线；原/换后续也改变。 |
| 274087 / 2b22d776-2a5e-47cd-a9e2-46d3e67f61ef | YQL F17末试T10，Jev单动作题选p0->e0、置信.34，survival选lethal。题面明确药效未入数值，切割打占位血、结束损28后HP−2。chosen use_potion槽0且completed；states280160→280161毒2→8，HP26/挡13/来袭41均未变，随后280162 GAME_OVER HP0。模型−2与实际死亡截断0分账；不推提前喝必胜。 |
| 274267 / f459d9ea-34bc-4054-91d8-3b6094462289 | KEN F15 T1，Jev选p1发光水、.82，chosen槽1，completed。题面含7选项，发光水当轮MC12样本；三轮rollout4样本、已降级、零样本胜，与估计100%分开。states280348–280359核槽1消失、真实十张手牌、274268重新问后继续出牌，末玩家46未变。未将中位示例整线当实打。 |
| 274272 / fed78f61-e646-42f4-b93d-84efa3e6575d | KEN同T1后段Jev选p0技能药、.56，回执pending(unstable)；states280354–280359核槽0消失，真实候选为斗篷与匕首/墨之刃/萎靡，274273选0completed；实际新增斗篷免费打出，挡4→12，小刀造成4，下一轮HP46、敌45。不是题面中位示例的逃脱计划，也不由排队回执独立断执行完成。 |
| 274505 / 4b79d414-135c-400c-a965-9446f0cab72a | KEN F17第4试T10，Jev plan4、.97，呼唤/带毒刺击/呼唤。states280588–280592玩家37→22、敌82→80，净损15、净扣2，下一轮毒9。 |
| 274568 / a2ec4e39-f5ad-4380-ab93-f804ddbebf3f | 同指纹第5试，Jev仍plan4、.97，SL把第二呼唤换匕首雨；B2 .385→.127、差−.2583、SE .0132，五轮死亡6/24→12/24。states280651–280655玩家37→16、敌82→78；留一呼唤多损6，匕首两段在无实体下各1。此处预测与当轮实况相合，但后轮不受控，不能把整战成败归本步。 |

十个首题与上述续步中 gate_reject/selection_dispatch 均未写入；报告为字段缺省，不当已通过现代选择派发闸。所选Jev原始行没有error，不能推出候选全线执行无错（KV续步确有timeout）。未改变日志、抹掉失败或将现代字段倒填历史。

L9 F17 states249143–249145：本体16/250、毒23、蒸汽53后进入T14 999999999占位与DeathBlow53，玩家1血；PU F17 states252076–252078：本体5/250后在T16进入占位999999993/999999989，**仍蒸汽62且意图Stun**。因此“看到大血就等于当前已经是EXPLODE_MOVE”的泛化不成立。当前狭窄识别要求EXPLODE_MOVE/DeathBlow且无蒸汽，PU这一过渡帧不适用，保持unknown而不是扩规则。这里只核状态条件，不给过渡帧新估值。

## 现有实现的实际 live 读回

只读 live HEAD **5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532**。implementation-readback.json核四个源码提交均为实际live祖先，并比对六份相关文件的base/live Git blob全相同：

- 1698adc96ba434a46942321e0237b70657e625b2：Silent SL候选/资源比较子实现。现有结构写明candidate_forecast/current_turn_prediction、execution=unverified、actual_turn_result=null；缺失的真实整线结算不能假装已有。
- c4670f4f416c7d93e192e889c5080e7e4e0e733f：持有价值未知、同题无药参考及后续仍可能喝药的区分；不替代原九经验消费者与实际留药后果验证。
- 5b56a452bb9be14d620b368ec46974c1b57901ca、b01edf46b4b619f217d070a196e161df9fe716a0：已集成狭窄巨兽阶段/资源事实；仍保留原参考路径排序，不代表新排序有效。

已读agent/src/reflex/silent-sl-resource-comparison.ts、silent-sl-comparison.ts、silent-potion-reference.ts、combat-plan.ts相关调用、sl/attempts.ts与sl/explore.ts相关门和阶段展示。以上是现有子实现，不是本批新实现；整项proposal_results仍waiting，不填commit冒充完整duplicate。没有借其他角色样本或把本轮日志回放算为下一局消费者读回。

## 逐项结果、后续条件与记录

proposal.md逐项列出十个原CLI id、全部原账本、局号/层/回合、缺口、旧/候选行为、反例、时间切分、验证和回退。proposal-results.json与result.json提供同一逐项机器结果。code_proposals仅链接原十项CLI id，没有再运行add制造重复id；implementation_domains=[]表示本轮无实际源码实现，不删除原提案domains。

本轮只把已核证据读回与waiting限制通过根ledger.py update追加到相关既有Silent账本，by=learner:strategy-proposal；不改已有claim/first_run/status/version，更不将旧shipped经验状态挪作本批源码上线证明。不登记新的经验规则、不修改知识库或提案队列状态，最终proposal_results交原调度器接续。当前父范围的数据缺口保留，不能因报告/批次完成关闭。

无新增源码，因此未提交、未改live、未加eval版本、未执行完整检查或撤源码试验，也不写虚假上线通知。已有实现的历史检查只作来源，本轮不报告它们为自己新跑通过。源材料/报告做本地gitleaks扫描，实际结果保存在gitleaks-check.txt；最终工作树与基线差异复核见completion-check.json。没有需要通过GitHub/Slack发送的消息，本报告及最终JSON由原启动器交运维。

仍未知：完整整战反事实、独立时间留出、各旧提案的联合科学验收、下一局实际消费、策略收益。V6无匹配和历史身份/坏行缺口也不由本批消除。后续只需按这些具体未完成项补证，不重新把原摘要或已有诊断发布当科学闭环。

# Silent 本批策略证据与十项处置

记录时间：2026-10-20T18:54:47+08:00（写入前已运行 date）。

本批十个已领取提案全部完成本轮核验与处置，均保留 waiting。未获得足以改变策略或验收整个原提案的新证据；无生产源码/知识/经验改动，无提交、live合入、版本、shipped或自然收益声明。最终结果见 result.json，逐项证据/账本/验证/回退见 proposal.md。

## 身份、基线与授权范围

开工git status干净，初始HEAD `eca0988cbf9b05fc25977c2077f016c0317fed55`。本批根learn.json对应行只读核 task=strategy-proposal、character=silent、reason=proposal、准确工作树与六局集合、十proposal_ids；没有research_request、implementation_request、proposal_repair。普通专题请求绑定20261010另一批次，不承接其work_spec、不扩展队列。保存 dispatch-proposals.json。未派下级agent。

普通任务按指令 git merge --no-edit main，快进到本报告完整40位base `ecb092c3d54a6cc9c547ac9c6e4925e021033b98`，只带七个运维/记录文件，没有源码或knowledge差异、没有冲突。HEAD保持该base。已读README、最新STATE-2026-10-19、decision-log末尾、learning-protocol、learning-code-proposals及回收说明；旧状态停点与后续决定按时间保留。本任务要求普通/high，但本会话工具未取得原生turn_context/请求回执，未宣称已独立验收档位。

六局runs.jsonl原行均逐字节回读核SHA：显式SILENT、A10、有ended，均最终失败；CA5 F13、5PM F39、DUZ F30、8JRE F33、YF0 F48、XP2 F33。逐局原文及offset/bytes/SHA/冻结切点保存在 run-verification.json。每局SL尝试仍属于同一独立局。

十份专用队列原提案均读原文并按proposal_sha256核对；六个旧路径已不存在，但从上一批保留的同名原文副本读回、SHA与队列精确相同，未用上一批摘要代替原提案。路径映射与SHA在 proposal-provenance.json；十份原文保存在本目录 *.original.md。既有30个账本按ledger.fold规则只读折叠并筛出本批证据，见 ledger-context.json；没有把历史shipped账本降级为proposed，也没有重复加经验或提案。

## 提证、冻结切点与缺口

先运行根evidence_summary.py生成 evidence-summary.json（事实索引，不能代原文），再由规定extract_evidence.py分别建立 v6-evidence/ 和 evidence/。实际读取两个 evidence-manifest.json；以下为通用提取manifest的冻结源前缀，而非文件当前尾部：

| 流 | 冻结字节 | 冻结前缀SHA256 | 六局匹配行数 | 全流无效/截断行 |
|---|---:|---|---:|---:|
| states | 14718684631 | `4169a0922f5b4c700a56eabf6283d7ada026b4f71b82e8ace11f426d198e3716` | 4062 | 2/0 |
| decisions | 2967844963 | `8d339ded386f895656fc2f166ac65e8a3a61dd837781720da98d1dec37f45c25` | 3941 | 2/0 |
| sl-attempts | 49894916 | `f681c8043c5df36b2ca99051d0a7bdbd1a337cc9e6346b96f6fbddd269ae1c64` | 38 | 0/0 |
| run-config | 2240582 | `80ac2f7d9030022fa59a5f5861eccfea3a9423e873bb3ddac6d9d7c921406d40` | 6 | 0/0 |
| run-plans | 10120201 | `13d26e121b50e4b14405327d22328245f5c846f315ce95ed2d38032053b68ed1` | 33 | 0/0 |
| brain | 1117125269 | `c731a1a300e41868ff996bfe9d08b13476f83788e0223f9b2f68368d6ccc5df3` | 188 | 2/0 |
| v6-build | 64622743 | `d9d6b2891dc95f42d8081c74fe22fe1cf73eea92d323ba2c08b7943a70f58c54` | 0 | 0/0 |
| jev-prompts | 2181673141 | `bc7b6d70b2cdccdf3943d9be85511be62155797836c15dfb84989d67ac1f81cb` | 811 | 1/0 |

摘要与提取各自冻结，未覆盖旧切点。逐行原始row保留source_size、offset、bytes、SHA及identity。run-plans从run字段识别，其他流核run_id/state.run_id/fingerprint.run；冲突/未知不收。Jev的decision_id精确回连decisions原行，不按正文提及、时间邻近或question_id相似字符串归属。18条重点决定还按同局精确observed_ts和完整fingerprint回连18条原状态，18/18成功；时间用于身份已确定后的事件定位，不建立局身份。

全流states有3332条unknown_identity，decisions有1934条unknown_identity和1395条unmatched_decision_id；无效行和这些身份缺口均保留manifest，不摊入本批角色/结果。无截断行也不意味着证据完整。提取器为内容仓储记录 pending_host_seal=true/deferred_errno=18；本地视图、原日志回读与SHA核验可用，但不冒称宿主已封存。没有手工改对象仓储或消除旧失败。

## V6 / Jev / 决定 / 执行分层

V6流存在且本批六局各0匹配，selection_status=no_match。六份原run-config已回读SHA且没有V6字段（run-config-verification.json），因此本批V6启用身份是历史未知；不能改写成显式off。entries、jev_answer、fallback、unknown没有本批可读原行，分别保持未观测/未知，不把它们各自计成0，也不拿现代V6题面推历史采用。

Jev匹配共811行：DUZ84、5PM92、CA558、8JRE139、YF0269、XP2169。811行均有request/answers、没有error字段；这是所选行的字段事实，全流那1条无效行身份未知，不据此宣称历史从无调用错误。完整题面存在仅证留档，不证原答采用、执行成功或收益。

3941条decisions中3937有chosen、3941有result，64有sl_explore；gate_reject和selection_dispatch字段全部缺失，记未知/旧格式缺字段。重点18条的result都是completed: Action completed.，只能作单动作回执。原Jev答、护栏/SL替换、chosen动作及后续状态分别核验，不能把原答当最终整轮执行。question-inventory.json逐题保留原/决定引用、answer/error状态及chosen/result/字段存在性。

## 全文题面覆盖与未读范围

以下八题已读完整request.state、questions全部criteria及answers，按原offset回读核SHA，并核chosen/result、gate_reject/selection_dispatch字段缺失与相关后续states。原题在raw-review/jev-行号.json。大题分state/criteria窗口阅读，输出截断处另读剩余criteria；没有把最后五条当完整覆盖。

| Jev原行 | 局/层/回合 | decisions原行 | Jev offset/bytes/SHA256 |
|---|---|---:|---|
| 26718 | CA5KE8GFJ9X2 F13 T3 | 267375 | 385427376/4980/`c9e82ea5f42c68908d8b86dc8fbcf4a67116a5179d16ee87121b1cc6f7ce0598` |
| 26868 | 5PM6JAQG6FNQ F38 T3 | 268385 | 387373662/30330/`a6fe0affad0399c3812b2e40db673913c10749868b14bbb5356944f683ad71ef` |
| 26875 | 5PM6JAQG6FNQ F39 T4 | 268427 | 387513383/11608/`ccf90aff22e190b64be2c0847e7db7ea0c78fa4847ab3604d7c422337a9214eb` |
| 26931 | DUZUBAJ3A8GP F27 T5 | 268894 | 388258326/6515/`5c49e7aafbada732e368ee433eb8f232f5ffdc16ba2976dba40459d9898ee992` |
| 27194 | 8JRE1C4H4Z2W F33 T2 | 270282 | 391510246/18141/`94d36ae26dca8adb8f3fcaeb5f9765fdc2e7289dc80175d514df26908ae96c09` |
| 27484 | YF0LXT1QSTGG F48 T1 | 271348 | 394988203/25893/`1037c05afd6e6de2b456bd11fb6672917508eb8bc094b3ee25c79575177cda52` |
| 27510 | YF0LXT1QSTGG F48 T5 | 271502 | 395442426/7714/`3c3b8d48339e6e4ab8ffe16979ff2a13f9dcd54ad8cddce771ffcc1696375d95` |
| 27624 | XP2SL33HT0D9 F33 T3 | 272040 | 396759387/29521/`48d155c7dac4742223afb0a55203278f78ed555cc726725b82391ff511f94055` |

811题逐项身份和阅读状态在question-coverage.json；其余803题仅做结构/身份索引，未全文审阅，原因是本轮十个已领取旧提案的有界机制与配对窗口，不做六局所有题面的全面审计。特别是配对另一侧的Jev原题、末试双蟹T2/T4完整候选、沙虫T5护栏题与后续重规划题不在八题全文集；对应部分决定和状态另核，不称未读候选已验证。原题含旧提示引用的历史药水/其他角色统计，本轮不将这些正文当Silent证据或新规则。

review_evidence.py流式定位本批4062条状态，只回读重点289条原始字节并校验SHA，保存 verified-states.jsonl、verified-state-refs.json及state-projections.json；模型只读限定窗口的HP/挡/手牌/能力/敌HP/意图原字段，不全量读取states。18条重点决定原文在verified-decisions.json，精确状态关联在decision-state-joins.json。289是机械回读数，不冒称模型逐字阅读289份全状态。brain、run-plans、sl-attempts其余内容仅提取归档，未全部全文分析；没有原101局全审计或新完局验证。

## 原始事实、反例和不能推导的策略

四组同指纹配对在paired-observations.json：沙虫T2损3→15、净扣10→17；实验体T1损0→9、净扣45→38；双蟹T1损2→10、净扣25→34且多1力量；双蟹T3损9→14、净扣24→27。它们是相关尝试的当轮观测差，不是四个独立策略实验，也不是完整反事实胜负。净扣敌HP与攻击毛伤/实际毒结算分开，SL恢复不记回血。

DUZ T5技能污染与毒/弱同变，不能仅由9损推少技能更优。5PM末死清场不能证明遗忘死亡返敏；电击index改变也不等跨召唤持久身份。CA5末轮完整需损4而实际HP仅2，死亡截断不能当完整伤害。YF新阶段旧毒清空、零毒触媒不提供现存毒收益；持有毒雾不等建立，T5后得敏捷不补已获23挡，敌197→160中刀舞消耗1和四刀36分列；18血对44攻/23挡短3。XP末T2镣铐临时减力、14+6挡实际零损，T4转向57→38与弱38→28分列；能力已建仍败，不能把成长或未派发续步提前计入收益。

原提案保留的反例（YF F33成功SL、已建毒雾仍败，沙虫保挡延至T11仍败等）没有被本轮否定；对应整战本轮未重新全文验收，作为已有反例和后续验证要求保留，不当新增独立实证。全败B2的0差/0标准误不能证明安全；沙虫题的0/24和5/24也不能说同死亡率。没有新的最优血价、技能顺序、击杀序、强制能力先手、药水时机、牌组大小或房间成本结论。

## 已有live局部实现与剩余范围

核查时实际live HEAD `64c218a04ebe029fdda0b5f25025302ebf2a4124`；下列源码提交均核live祖先且当前叶子字节相同，回执在existing-live-sources.json：

- `aad2700abed6dff1d66e87fb36aaa6fedb39adf3`：`agent/src/reflex/silent-phase-current.ts`；live祖先退出码0，当前两树叶子SHA一致=True。
- `9d8278702dbc581b5015ba7ec9a70dc0fb94cccb`：`agent/src/reflex/silent-selection-audit.ts`；live祖先退出码0，当前两树叶子SHA一致=True。
- `fdaf787a372880b0438e73bcac7e6d2168b038ed`：`agent/src/reflex/silent-selection-dispatch.ts`；live祖先退出码0，当前两树叶子SHA一致=True。
- `66283dd9982bdd7f480da7a4d9bfefea0572a9ac`：`agent/src/reflex/silent-sl-comparison.ts`；live祖先退出码0，当前两树叶子SHA一致=True。
- `0e4fe4df89a06682468e0e4716c12126e76369d5`：`agent/src/reflex/silent-sl-resource-comparison.ts`；live祖先退出码0，当前两树叶子SHA一致=True。

当前阶段字段主动保留poison_damage_already_dealt=null；候选审计scope=predicted_candidates、execution_status=pending_dispatch、actual_turn=null；SL比较scope=candidate_forecast、actual_turn_result=null；资源比较execution=unverified；dispatch仅single_action_receipt且whole_plan_executed=null。已读hand/loop.ts接线，单动作回执不补整轮归属。

HAZE当前数值接线、vitalSpark/tainted当前值、HIGH_VOLTAGE增长集合、fresh spawn的strength/growth=0等路径存在，只证明局部模型覆盖；旧run-config的dirty_files主要是知识/观测数据，不能把dirty标签直接说成未知源码，也不能假装原运行实际读取的刷新数据已恢复。本批未补齐那套运行输入及联合校准，不登记整个原提案duplicate/implemented，更不登记shipped。

## 十项最终处置


- `silent-proposal-c20b5139dd0dff71`；账本 silent-0168；证据 DUZUBAJ3A8GP F27 T4—T6；states274830—274839；decision268894；Jev26931。本轮核实：火花3→6；T5污染0→6→12→18，17挡后46→37。迷雾同时增加毒/弱，不能只看污染。 **waiting**：缺原运行刷新知识/移动表输入及污染、弱、成长、挡、迷雾共同冻结的源码重放；单局血价不能支持强制少技能规则。

- `silent-proposal-ae9e692d680e3819`；账本 silent-0183, silent-0005；证据 5PM6JAQG6FNQ F39 T4—T6；states274351—274362；decision268427；Jev26875。本轮核实：玩家−4力/−4敏，两步法使敏捷回0；失落2血3毒后消失，下一轮力量回0，遗忘再次夺2敏。 **waiting**：缺逐实体抢夺累计来源、遗忘死亡返敏的连续实盘及联合模型重放；末死清场不能代返还证据，不规定固定击杀序。

- `silent-proposal-52f1e1bd2e7db0ed`；账本 silent-0231；证据 CA5KE8GFJ9X2 F13 T1—T5；states273237—273269；decision267375；Jev26718。本轮核实：加压力0→4→8，同喷水11→15→19；末弱后14，2血10挡完整需损4、短2，实际死亡扣血截断2。 **waiting**：缺原运行A10移动表与加压/覆甲/弱联合重放；覆甲9/9/8/7/6只确认现场层数，未隔离完整减层条件。首样本取事实与房间代价五样本门槛不变。

- `silent-proposal-6dd8bbff876be528`；账本 silent-0233, silent-0209；证据 5PM6JAQG6FNQ F38 T3—T4；states274308—274317；decisions268385/268390；Jev26868。本轮核实：电击力量2→4、攻击17→19，T3损30、T4才退场；index由4变3，不能作持久身份。原答选plan10，先药瓶。 **waiting**：缺跨召唤代际持久实体身份、实际原移动表与联合重放。未执行的先杀爪牙plan1损3/伤35只是预测，不能记必保27血。

- `silent-proposal-578e415a259e6835`；账本 silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016；证据 8JRE1C4H4Z2W F33 T2；decisions270216/270282；states276208—276212及276274—276278；Jev27194。本轮核实：完整指纹相同；Jev仍plan1，SL换尖啸为打击；本轮实损3/15、净扣10/17。0/24与5/24死亡不并列。 **waiting**：已有候选/单动作审计，缺跨抽弃、生成、药水、护栏/SL重规划直到整轮终止的完整执行归属。未取得受控后继，不拟血价或成长权重。

- `silent-proposal-c0767768bf6a7ab1`；账本 silent-0079；证据 YF0LXT1QSTGG F48 T1；decisions271309/271348/271354；states277327—277337及277366—277373；Jev27484。本轮核实：同指纹；原答plan5，SL改plan4并实际提前end_turn；本轮实损0/9、净扣45/38。预测0/10与54/36须和实际分列。 **waiting**：缺覆盖重放/重规划至终止的机器归属与同后继整战对照。全败封顶预测不能证明换线安全，也不足支持禁止探索或设置惩罚系数。

- `silent-proposal-a46bdb7fe711d79a`；账本 silent-0021, silent-0027, silent-0028, silent-0085；证据 YF0LXT1QSTGG F48 T3—T5；states277508—277528；decisions271495/271502/271509；Jev27510。本轮核实：4血4毒转212血新阶段并清旧敌状态；触媒2已建但T5零毒。5敏时先得13+10=23挡，第三小刀升6敏不倒补；敌197→160。 **waiting**：已有当前阶段字段，缺逐候选即时施毒、已结算毒、消耗附伤、能力顺序与抽弃重规划的联合校准。没有未选顺序整战实证，不强制能力先手。

- `silent-proposal-1044224808015e5c`；账本 silent-0079；证据 XP2SL33HT0D9 F33 T1/T3；decisions271982/272195与271992/272040；states278018—278023、278231—278236、278028—278031、278076—278079；Jev27624。本轮核实：两组各同指纹；T1多8血换9净伤及1力，T3多5血换3净伤。B2均0、se0仅是已抽样值；末线没有完整胜局。 **waiting**：缺同抽序、随机药瓶落点、等预算完整后继与独立后移验证。全败并列不能拟保血探索规则或全局HP惩罚常数。

- `silent-proposal-7cbc6005db712ba9`；账本 silent-0021, silent-0005, silent-0007, silent-0063, silent-0065, silent-0241, silent-0242；证据 XP2SL33HT0D9 F33末试T2—T5；states278236—278261；Jev27624仅作同局T3题面，末试对应题未全文阅读。本轮核实：镣铐使爪力−9且下轮恢复；轮初14挡+斗篷6=20，零损；火箭57→转向38→弱后28，4敏脆弱下偏折6挡。 **waiting**：局部机制路径不等完整候选联合传播、临时/持续能力和逐来源实际收益的消费者验收。未选目标/顺序无受控整战，不改权重；早期A1/A6局本批未另读。

- `silent-proposal-c59f592f1427a67e`；账本 silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242；证据 YF0LXT1QSTGG F48与XP2SL33HT0D9 F33；上述原始窗口；原账本30项只读关联。本轮核实：本轮只核本批六锚点、两局血价与能力兑现；未将原提案101局历史分母搬作本批验证。 **waiting**：缺原101局审计的本轮完整复验、整线归属及路线/休息/用药消费者验收；未隔离整战收益，不以部分展示字段认领整项完成。

## 验证与交付限制

未改生产代码或知识，未运行tsc/vitest，未做撤源码红/恢复绿；tests三项固定null。SHA/精确身份/指纹和观测差值核验属于数据一致性检查，不是源码测试、策略效果或自然收益验收。无提交，提交前gitleaks/Co-Authored-By及live锁内发布流程不触发；无eval号、上线decision-log或双通知。没有运行play、网络、额外模型、改账号/配置/prompt、STOP或既有父请求。

本轮沿用已有代码提案id，未新增或修改游戏结论，未经CLI追加重复账本，原队列处置由最终proposal_results交调度器接续。缺数据不是零，局部已有实现不替整项验收；后续新Silent完局/原输入恢复后再验证，其他角色保持等价。提证、报告、源码存在都不证明正式发布、下一局消费或自然收益，不关闭学习父要求。

交运维：本目录proposal.md、report.md、result.json以及两个manifest、逐题覆盖和原字节回读引用。最终git status及binary diff保存在final-verification.json/working-tree.diff；scratch为忽略材料，HEAD保持报告base、fixes=[]、merged=null、工作树干净。

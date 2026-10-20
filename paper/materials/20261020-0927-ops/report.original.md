# 静默猎手策略提案逐项复核

记录时间：2026-10-20T09:25:55+08:00。本批 `20261020-091302-s2-strategy-proposal`；角色 silent，普通队列，reason=proposal。基线和最终 HEAD 均为 `32f0201faf019d61e379368596eafda3f715d7c2`；开工工作树干净，`git merge --no-edit main` 返回 Already up to date。本批没有 research_request、implementation_request、proposal_repair；不承接其他专题，不领取额外提案。

结论：十个原提案均保留 waiting，本批没有新增策略源码、经验、参数、提案 id、提交或上线。局部审计实现已存在，完整实现的验收缺口仍在，不能将局部实现登记为整个提案 duplicate/implemented。没有足够的配对整战/时间后移证据支持修改SL探索、HP血价、固定目标顺序或能力优先级；本次也没有完成十项要求的联合生产校准。待新局重派，父要求保持开放。

## 派发与原件

`dispatch.json` 保存根 learn.json 本批对应对象；`assigned-proposals.json` 保存十条原 add 记录。仅核本角色、本批。四份原 Markdown 在原路径读到且SHA匹配，六份原路径随工作树回收后缺失；从既有保留归档只读取对应六个成员，逐份SHA与原队列完全相同，保存 `/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261020-091302-s2/learner/runs/20261020-091306-fdd3bfa4-51b1-47d0-bffc-9fa8fe6182ec-strategy-proposal/<原提案id>.original.md`。完整来源见 `proposal-recovery.json`：归档为 codex-strategy-silent-20261018-114302-s2.tar.gz，只读取提案成员，没有恢复整个checkout或源码副本。原件缺路径没有被解释为证据不存在；没有改原请求或原提案。

账本链接逐项沿原id；`assigned-ledger-history.json` 是这些既有id的只读历史快照，包含原主张/证据/追加记录，不是本批新登记或新验证。没有新增学习结论，故未重复追加账本或重复创建code_proposals id，未标shipped。

## 原始提证与冻结范围

先运行指定根 evidence_summary.py，产物 `evidence-summary.json`，SHA256 `15ffc92c28469f058f42b412a112855b207cd8dc245d495c8475da61256b92ab`。摘要仅定位入口，未将最后五条当完整覆盖。

指定 extract_evidence.py 命令（nice19）完成，`v6-evidence/evidence-manifest.json` 保存 v6-build、jev-prompts、decisions、run-config 各流 source_size、源前缀SHA、逐行offset/bytes/SHA及身份。另用同入口提 states、sl-attempts、run-plans、runs，见 `evidence/evidence-manifest.json`；两个冻结切点独立，未覆盖前一份报告。run-plans 使用run身份；其余用显式run_id/state.run_id/fingerprint.run，Jev可用decisions原行校验精确decision_id；没有以正文、时间邻近或相似question_id判所属局。未知身份、坏行和无匹配均保留。

| 局号 | 已结束UTC | 终层 | decisions | Jev原行 | states |
|---|---|---:|---:|---:|---:|
| DUZUBAJ3A8GP | 2026-10-07T06:57:27.794Z | 30 | 602 | 84 | 623 |
| 5PM6JAQG6FNQ | 2026-10-07T06:21:09.408Z | 39 | 638 | 92 | 660 |
| CA5KE8GFJ9X2 | 2026-10-07T05:17:57.587Z | 13 | 265 | 58 | 282 |
| 8JRE1C4H4Z2W | 2026-10-07T08:17:09.498Z | 33 | 659 | 139 | 676 |
| YF0LXT1QSTGG | 2026-10-07T09:15:57.174Z | 48 | 1065 | 269 | 1091 |
| XP2SL33HT0D9 | 2026-10-07T10:10:37.387Z | 33 | 712 | 169 | 730 |

runs原始行六条全部SILENT/A10/victory=false且ended非空，未出现重复或角色冲突。该表只描述六个独立局；SL多次重试不增加独立分母。

| 流 | 冻结字节切点 | 源前缀SHA256 |
|---|---:|---|
| v6-build | 4513358 | b428841b649bb76bac16ba484d6cc958160fafffafe23969a5f6726592127cab |
| jev-prompts | 1828766383 | 86510a105da070f1579424bc17cb70468e194d5b75738f81e844c4b9204e1010 |
| decisions | 2776381218 | 86437dcc84931d0a2710ab649fbb2f60edb4d89095d79511acb66211f85a24d6 |
| run-config | 2185753 | cfd45ebd37db3307623b6344bc28621a4f44030c7ccd815cb803ac9bfb1fe149 |
| states | 14618144737 | bc1d4fe242203f6b1e533538c6bfe7b7d85130e78ec7e5ab8fdcf2b65a91e905 |

V6流在该切点全29行、本批各局均no_match。六份原run-config的根和loop均无V6字段；这是历史缺配置字段/缺本批匹配流，不冒称显式V6 off，更不称on。v6-build的entries、jev_answer、fallback、unknown在本批无可读匹配行，均未观察，不能填0或与Jev原答混算。没有正式发布、下一局消费、自然采用或收益证明。

Jev本批811行机械计数均call=ask、无非空error；这仅是已选入行的字段检查，非全部原流无故障。全源存在1条invalid_json（行53166），身份不可认；decisions全源2条invalid_json，unknown_identity=1934、unmatched_decision_id=1374；states全源2条invalid_json、unknown_identity=3314。不得将这些未知行分摊给本批。冻结流未见半行截断（incomplete_lines=0），但模型答题预算/模拟time-limit和没有完整候选后继仍是不同缺口。完整gap引用与身份出处保留在manifest；最后五条gap_refs只是有限展示。

## 逐题实际阅读与执行核验

`question-coverage.json` 为811行逐条清单，完整阅读7题，另10题提取并局部读，794题仅机械定位未逐题读；后两类合804题，逐题给出未读原因。未读题不贡献本批完整题面覆盖或新的策略结论。选题按十原提案的问题定位，非按最后五条。每份 `question-<行号>.json` 保留完整原request、answers/error、精确decisions原行与所有源引用；`question-readback.json` 对17题的prompt/decision共34个原字节片段逐份回读SHA及JSON相等。

完整核题面/全部选项/答案的7题（行号属于原jev-prompts流，不是decision_id）：

| Jev行 | 精确decision_id | 局/层/回合 | 采用与后果 |
|---:|---|---|---|
| 26869 | a108eb5e-509f-48db-9028-c4a9bc386797 | 5PM6 F38 T4 | Jev plan2；切割→步法→防御→匕首雨+逐步completed，T5血31→27；机器人退场。预测37伤与净本体扣血不能直接等同，荆棘等另核。 |
| 26875 | 561d69e3-cd22-4860-8d81-d4630037051a | 5PM6 F39首试T4 | Jev plan1；生成小刀后重规划、下注后结束。负敏−4→−2→0，5挡；毒杀失落后玩家力−4→0，血19→5。题面12伤/14损不证明整线原样完成，后续仍败。 |
| 26930 | ebee5225-f98c-417f-8e14-cf9a94f4712c | DUZU F27 T5 | Jev plan2；生存者首次result=pending(unstable)，后有精确选择和防御/迷雾completed；污染0→6→12→18，17挡对26，次轮46→37。题面7伤与实扣13分列，不据此断言当前源码bug。 |
| 26931 | e8834900-a9ad-4f43-b256-351e5ed6c274 | DUZU F27 T5选择 | Jev card0精密瞄准；chosen=select_deck_card/0、completed；随后防御与迷雾执行。不能把前一步pending当失败，也不能仅凭题面当已执行。 |
| 27194 | a0a63fc0-828b-477c-9705-72c7e45ee4c3 | 8JRE F33第3试T2 | Jev plan1逃离/毒刺/尖啸；SL换plan2逃离/毒刺/打击，三步及结束均completed。题面原线0/24死、替线5/24死，非同死率；实际47→32、敌326→309。 |
| 27484 | c2213f65-9079-4ac6-9705-3f2407ff1121 | YF0L F48第3试T1 | Jev plan5，SL截到步法/刺杀/两打击/防御+/赠礼；271354另题结束，余挡续步未执行。实际27→18、敌111→73；原线第二试0损/45扣，替线9损/38扣。 |
| 27624 | 33560091-b5f4-41b4-bcd8-06b3adf2327b | XP2S F33第2试T3 | Jev plan2防御/猎杀，SL换plan9打击/药瓶；两步及结束completed。9个候选B2零胜并列，五轮24/24死；实际45→31、敌合387→360。原线首试9损/24扣，替线14损/27扣。 |

七题error字段均缺失，answers存在；不把error缺失扩大为所有外部请求成功。原decisions相应chosen/result均已核，gate_reject与selection_dispatch字段缺失；`execution-chains.json` 明确保留未知，没有用rationale冒充该字段。表中的SL/护栏出处来自原rationale，实际动作另由chosen/result和states核。局部读的另十题为26868、26929、27175、27191、27478、27508、27600、27603、27634、27671；它们的全部题面未计覆盖。

CA5K F13 T5走code least-loss/continue/end_turn，没有该轮Jev题面，故保留这项历史无匹配；decisions267381—267386完整核读。加压后力4→8、攻击15→19，虚弱后11/14，2血10挡对14，GAME_OVER敌剩16（含死亡荆棘），不能把玩家仅剩2血截断当完整需求损2。

`states_audit.py` 仅流式读取冻结states并投影提案相关战斗窗口，模型没有读整局states。`state-windows.json` 保存906帧选窗及完整源引用；`raw-readback-verification.json` 回读913段（906状态+7决策），SHA及原JSON相等。七题前帧用已独立核实run身份、精确observed_ts及fingerprint共同匹配，分别274313、274351、274834、274835、276274、277366、278076；相同fingerprint在多次SL重现，单靠指纹不绑定本次尝试。后继按同局状态、逐步dispatch与回合边界核，不以时间近似建立局身份。

`paired-endpoints.json` 保存原帧offset/bytes/SHA：DUZU T5损9/扣13；沙虫首/第三T2损3/15、扣10/17；实验体第二/第三T1损0/9、扣45/38；双蟹首/第二T3损9/14、扣24/27。这是当轮玩家净HP/敌本体净减少，不能自动归给某张牌、能力或整战胜率。

其他核读状态：实验体末试277512→277513第一阶段4血4毒转212且旧毒/敌力消失；277527为18血23挡、敌160，44攻击仍死亡。双蟹末试278236→278237普通镣铐0→−9力、4→0攻，278242恢复；T2轮初14挡；278249/278254/278255为背向57、弱后28、已建4敏且偏折6挡，未把后取得属性倒补。中间转向38见旧提案，本次未单独输出该中间帧，不能冒报完整三段联合重放。反例/限制保留：付血换伤同时可有力量或毒的后续收益；防御换线也可延长生存但仍败；前段建立能力仍可能败；未选线无完整后继，六次SL非六个独立局。

## 当前源码与live祖先的只读核验

`source-audit.json` 对实际live `c351dbe7b5603bbb591e0f63d88be32fa60df56f` 核祖先和叶子blob相等：

- SL当前轮资源比较：0e4fe4df89a06682468e0e4716c12126e76369d5；仍标execution=unverified。
- 实验体当前阶段事实：aad2700abed6dff1d66e87fb36aaa6fedb39adf3；已建/仅持有分列、已兑现毒伤为null。
- 候选选择审计：9d8278702dbc581b5015ba7ec9a70dc0fb94cccb；execution_status=pending_dispatch、actual_turn=null。
- HP护栏审计：66283dd9982bdd7f480da7a4d9bfefea0572a9ac；actual_outcome=null，后续SL/重规划可改变实际派发。

还核rollout.ts的HIGH_VOLTAGE增长路径、rollout-live.ts按传入asc读moveDamageAt，以及room-costs.ts的MEASURED_ROOM_MIN_N=5。存在入口不等当年dirty运行输入可重现或联合校准完成。历史run-config都标dirty知识数据；没有复原当年完整移动表输入，不把当前知识表冒充旧输入。本批没有任何提案达到整体implemented/duplicate标准。

## 验证、发布与限制

本批只写忽略的scratch报告/证据分析脚本，没有agent/learner/ops生产脚本、知识、记录或Git跟踪文件改动。tsc、vitest、撤源码失败/恢复通过均未运行，值为null；原字节回读与端点断言只是证据核验，不冒作生产回归测试。没有提交，所以没有提交前gitleaks或测试成功声明；没有合入、eval版本、shipped或双通知Roy规则变更。未运行play、LLM、网络或依赖安装，未推送。铁甲及其他角色行为未变；旧题面自带的其他角色历史统计没有作为学习证据。

一次状态审计进程的输出收取及一次只读源码检查遇到bubblewrap的临时路径扫描竞态（其他工作树.aws/.codex或w3临时路径消失），报错原文见tool-errors.txt；后续相同审计/检查重试成功，未按代码失败处理，未改变权限或删除其他现场。

证据限制：仅七题完整模型阅读，不称811题完整覆盖；只核906帧相关窗口而非六局全量复盘；宽提案原历史101局与未派发更广样本没有重新验证；未知身份/坏行不补局号；历史缺V6流不作off/on或零采用证明；局部审计字段存在不证明自然消费者已用或获益；没有新受控整战胜线/独立后移验证，不能从全败或模拟并列拟策略常数。

运维交付：本目录proposal.md、report.md和result.json。每个派发id逐项waiting，见下一节和proposal_results；不代运维更新shipped，不关闭学习父要求。

## 十项处置

### silent-proposal-c20b5139dd0dff71

原摘要：冻结当前技能效果和污染逐击血价；当前进阶从观测数据库取攻击，保留所有选项。

原证据局：DUZUBAJ3A8GP；账本：silent-0168。

处置：waiting。污染/弱/挡/施毒的逐帧事实已核；缺当时实际移动表冻结输入及火花增长、污染清除与技能收益联合生产重放，未选整线后继未知，不能改技能选择。

原件：silent-proposal-c20b5139dd0dff71.original.md（SHA256 bed21b409432a70aeba53c8cbf1ce31a5e83113f5208f144766b259c4f9a0c3c）。无新commit。

### silent-proposal-ae9e692d680e3819

原摘要：提案：逐实体记录已观察的抢夺/返还与负属性，再验证当前方案，不设置固定击杀序。

原证据局：5PM6JAQG6FNQ；账本：silent-0183, silent-0005。

处置：waiting。核到两步法负敏恢复、失落退场返力；遗忘退场返敏未观察，缺逐实体抢夺来源隔离和混合增益/退场返还联合校准，不设固定击杀序。

原件：silent-proposal-ae9e692d680e3819.original.md（SHA256 b30fb59d7407c7226d4d67196479a4e2cc9322e478ab8314fa4a7ead7ea6c3b5）。无新commit。

### silent-proposal-52f1e1bd2e7db0ed

原摘要：第一观测起使用当前进阶HP/攻击事实，冻结加压与弱；保留房间代价五样本门槛。

原证据局：CA5KE8GFJ9X2；账本：silent-0231。

处置：waiting。已核A10加压力4→8、喷水15→19、弱后11/14及末轮差2血；当前进阶DB入口与房间五样本门槛已有，缺覆甲完整减层条件和联合生产重放。

原件：silent-proposal-52f1e1bd2e7db0ed.original.md（SHA256 651f0bdcdb88c5cd511aae9b4744b0d60852b08a67d67d0bcb76d52bd5ce8376）。无新commit。

### silent-proposal-6dd8bbff876be528

原摘要：复验现有HIGH_VOLTAGE_POWER逐实体增长，当前进阶攻击从DB读；新召唤者不继承旧实体计数。

原证据局：5PM6JAQG6FNQ；账本：silent-0233, silent-0209。

处置：waiting。核到本局电击同最大HP23的连续观测力2→4、攻17→19、T4退场；现有HIGH_VOLTAGE路径不证明召唤代际持久身份，缺原移动输入冻结及另杀序完整后继。

原件：silent-proposal-6dd8bbff876be528.original.md（SHA256 48b2be77326bb54c99a17547f0499b91bca9816e1ff9f0761baded11ddeccde5）。无新commit。

### silent-proposal-578e415a259e6835

原摘要：核验静默沙虫同指纹SL实付血价、已建攻防与毒结算、候选及资源分账；证据不足保留原选择规则

原证据局：8JRE1C4H4Z2W；账本：silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016。

处置：waiting。已核沙虫同指纹T2原答/SL替换与实际3→15血价、10→17扣血；阶段快照已有，缺跨抽弃牌/生成/用药/重规划的整线执行归属和逐来源资源消费认证。

原件：silent-proposal-578e415a259e6835.original.md（SHA256 e13a77ede19196a05647125bcb3c4481ed36ddf98e9e7e2889817f10c9fa190a）。无新commit。

### silent-proposal-c0767768bf6a7ab1

原摘要：全败SL替换与覆盖重放应分列同轮资源代价及未执行续步；先实现事实核验，禁止探索或惩罚系数缺受控胜局证据。

原证据局：YF0LXT1QSTGG；账本：silent-0079。

处置：waiting。已核实验体同指纹T1替换实付0→9血价、45→38扣血及未打防御续步；缺覆盖重放至真实续步/终止的候选归属和受控整战后继，不拟探索惩罚。

原件：silent-proposal-c0767768bf6a7ab1.original.md（SHA256 28e9d34c33097cb3858c0f92f68f34b6204fc8a6880ffda62e6cbb510c7546cb）。无新commit。

### silent-proposal-a46bdb7fe711d79a

原摘要：实验体候选区分阶段、已建能力与已兑现毒/挡收益；零毒触媒和后取得敏捷不预支，动作排序调整证据不足。

原证据局：YF0LXT1QSTGG；账本：silent-0021, silent-0027, silent-0028, silent-0085。

处置：waiting。当前阶段事实字段已在live；核到111→212清旧毒/力及末轮18血23挡对44死亡，仍缺能力建立、弃牌重规划、阶段身份与施毒/结毒/消耗附伤/敏捷取得顺序的联合执行校准。

原件：silent-proposal-a46bdb7fe711d79a.original.md（SHA256 eb929b3084fc0d0026276fcaf148aac938a284f89c40176600b248999450cdb6）。无新commit。

### silent-proposal-1044224808015e5c

原摘要：核验A10双蟹B2零胜并列的SL换线血价，分列当轮损失、输出与成长；缺独立胜线时保留原行为，不以零差宣称安全。

原证据局：XP2SL33HT0D9；账本：silent-0079。

处置：waiting。核到双蟹同指纹T3实损9→14、扣血24→27，零胜候选并列不是安全认证；缺同抽序/药瓶落点/总预算的完整配对后继和独立时间后移验证，不拟血价参数。

原件：silent-proposal-1044224808015e5c.original.md（SHA256 4e864f92eb146261d320cdac4a721859b4c960e4d9522e27bafa8e6ab15159d5）。无新commit。

### silent-proposal-7cbc6005db712ba9

原摘要：用本角色日志核验双蟹朝向、临时减力、船夹板T2格挡与能力实际兑现；补缺失条件参考，保留原出牌权重和未验证条件。

原证据局：XP2SL33HT0D9；账本：silent-0021, silent-0005, silent-0007, silent-0063, silent-0065, silent-0241, silent-0242。

处置：waiting。已核普通镣铐0→−9→0、T2轮初14挡及T4背向57/弱后28/6挡现场；局部模型与观测消费者已有，缺完整候选中的联合传播和逐来源收益消费认证，不将部分实现标整项duplicate。

原件：silent-proposal-7cbc6005db712ba9.original.md（SHA256 f6d851dba9b1b5b9765030c0d2f66f074d4ba4ed203f7dcf5bc6c9639fa73291）。无新commit。

### silent-proposal-c59f592f1427a67e

原摘要：核实静默临时减力/轮初挡与已建能力兑现，分列同盘SL原答/替换/实际血价；缺完整胜线时保留规则并后移验证

原证据局：YF0LXT1QSTGG, XP2SL33HT0D9；账本：silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242。

处置：waiting。六局只作本批锚点；缺原101局审计范围内的整线执行归属、路线/休息/药水逐来源消费和受控后继，不能以本批局部核实关闭宽提案或父要求。

原件：silent-proposal-c59f592f1427a67e.original.md（SHA256 81f2b4019e4218efea09382a1f6781a412e3090205b8b4d8568ce9b9396a5dd2）。无新commit。


# Silent策略提案批次核验报告

本批十项全部waiting；没有足够证据完成新策略实现或整项duplicate登记。
已核live祖先的现有子项继续保留；缺证不等于否定原经验，也不把本轮提证当正式发布/自然消费/收益。

- task=strategy-proposal，character=silent，batch=20261022-014302-s2-strategy-proposal。
- base=9de36dba3bc3c113cecaa3efa522d7abfe03f9de；初始git status干净，git merge --no-edit main返回Already up to date，HEAD未改变。
- 本批learn.json角色、工作树、六run集合及十proposal_ids匹配；reason=proposal；没有research_request、implementation_request或proposal_repair。
- 普通专题入口notes/strategy-research-silent.json绑定旧20261010批次，不适用于本批；未读取另一专题替代身份。
- 完整阅读README、最新STATE-2026-10-19、decision-log末尾、learning-protocol和learning-code-proposals。
  STATE停点与较新decision-log恢复记录并存，未据旧停点操作运行环境。
- 模型档位没有取得本线程原生turn_context回执，未改配置或宣称已验证档位；未派下级、未联网、未运行play。

## 1. 来源局与冻结输入

| 局号 | 已结束 | 角色/进阶 | 最终层/胜负 | decisions/states/Jev |
|---|---|---|---|---|
| DUZUBAJ3A8GP | 2026-10-07T06:57:27.794Z | SILENT/A10 | F30/False | 602/623/84 |
| 5PM6JAQG6FNQ | 2026-10-07T06:21:09.408Z | SILENT/A10 | F39/False | 638/660/92 |
| CA5KE8GFJ9X2 | 2026-10-07T05:17:57.587Z | SILENT/A10 | F13/False | 265/282/58 |
| 8JRE1C4H4Z2W | 2026-10-07T08:17:09.498Z | SILENT/A10 | F33/False | 659/676/139 |
| YF0LXT1QSTGG | 2026-10-07T09:15:57.174Z | SILENT/A10 | F48/False | 1065/1091/269 |
| XP2SL33HT0D9 | 2026-10-07T10:10:37.387Z | SILENT/A10 | F33/False | 712/730/169 |

六局均为10月7日历史已结束Silent A10失败局。runs.jsonl原字节已回读，详run-outcomes.json。
运行配置六局均dirty，记录的commit不能复原当时刷新的monster-db/move-model等实际输入；
当前代码、当前知识JSON或题面未来估计不能冒充历史加载的数据库。
原提案十份均实读并SHA匹配；已回收旧路径的六份从保留副本恢复到本批scratch，
不改原路径、不把缺文件视为缺证据；original-proposals-manifest.json保留原路径、读到的副本路径、字节数与SHA。
assigned-proposals.json按add/update逐行折叠，proposal-history.json保留全部对应历史。

| 提证入口/流 | 冻结字节切点 | 冻结前缀SHA256 | 选中行数 |
|---|---|---|---|
| v6-evidence/v6-build | 64735263 | 7c343906b18bd1e49023255f76f332af4c692526fb5dfe26dffb0de28ed055d9 | 0 |
| v6-evidence/jev-prompts | 2503631522 | ed3c9b867de0fc54395447e57af52efc09231c00a84a20ed928d663a88f9eece | 811 |
| v6-evidence/decisions | 3493444253 | bbc00ddfdf09d52b887bd9502d7d2504dc4f8594d4638994e06a26f206cb42fc | 3941 |
| v6-evidence/run-config | 2505848 | 3ef7db83d5902fe63120733a339510329e81edc4fb871b28e3e9a42728e41490 | 6 |
| evidence/states | 15460282195 | 1783ed98dd61b92b8ed29ef27968d80c62b1c3d9ea0905c56932b19b3f0c828a | 4062 |
| evidence/decisions | 3493762173 | c7a1a62a73f7c180525c308d0556cab3e3211e8070ded4a30989114319c03b7e | 3941 |
| evidence/sl-attempts | 53569039 | fa63c6d3e2c16904272628a4314d0f3296b3028c75552e73a823079361717dab | 38 |
| evidence/run-config | 2505848 | 3ef7db83d5902fe63120733a339510329e81edc4fb871b28e3e9a42728e41490 | 6 |
| evidence/run-plans | 10474185 | b37e0dd77dad7725a38dd41f86e70bad3482dfd8a8e9331a6fad5ff68764611f | 33 |
| evidence/brain | 1257387732 | aa02ccd5d6ad3de63c1a975adb21aaee82d8e844438de03f9805dd3cf4422266 | 188 |
| evidence/v6-build | 64735263 | 7c343906b18bd1e49023255f76f332af4c692526fb5dfe26dffb0de28ed055d9 | 0 |
| evidence/jev-prompts | 2503839215 | 9b7522593481ee188ba004bc2899144f8fcd41a6702ebf7391ca30c0870c74a6 | 811 |

摘要、v6专用提证、通用提证是分别冻结的切点，未互相覆盖或伪造同一SHA。
完整清单以两个evidence-manifest.json为准，逐行出处含source_size、offset、bytes、SHA256及identity。
通用入口共选4062 states、3941 decisions、38 sl-attempts、6 run-config、33 run-plans、188 brain；
后两者是机械提取范围，除本报告明确引用内容外不声称模型完整审阅。
原run-plans使用run字段，states使用state.run_id/fingerprint.run；不靠正文提及或时间邻近建立所属局。

源流保留的全局异常：states 2条invalid_json、3464条unknown_identity；decisions 2条invalid_json、
1934条unknown_identity及1527条无直接run身份的unmatched_decision_id；Jev 1条invalid_json。
这些是整个冻结源的异常，未擅自归入本批或记作本角色失败。无冻结尾行截断；缺失字段、坏行和未知身份不补零。
提证内容仓库回执pending_host_seal=true/deferred_errno=18仍保留：本地证据文件及原字节核验有效，
本任务未代宿主封存ACK或声称对象已正式封存。

## 2. V6与Jev分账、完整阅读范围

v6-build源文件存在，冻结64735263字节/682行，六局均no_match（0个匹配行）。
本批无法读取不存在的本局V6 raw row；不能把其他局的V6行借来建立本局结论。
六run-config有Jev enabled=true/context=v1，但没有V6字段；这是历史未记录，不是显式V6 off。
entries、jev_answer、fallback、unknown均无法就本批计算，记“不适用/未知”，不写为零；
没有V6采用、执行成功或收益的证据。本批只沿普通原始证据流程继续。

Jev共811行，全部为显式run_id且精确decision_id与本批decisions原行相联；
全部有request和answers字段，全部缺error字段。本批未见非空error记录，但“error字段缺失”
不证明服务总无错误。request/answers/错误与执行闸/result/后继严格分账。
完整审阅原题含state、全部选项、抽序/前次尝试、答案及限制，共10题：

| decision原行 | 局号/层/回合 | Jev原行 | 完整原题/答案 | 后继 |
|---|---|---|---|---|
| 267379 | CA5KE8GFJ9X2/F13/T4 | 26720 | 是 | states 273261—273263 |
| 268385 | 5PM6JAQG6FNQ/F38/T3 | 26868 | 是 | states 274308—274313 |
| 268427 | 5PM6JAQG6FNQ/F39/T4 | 26875 | 是 | states 274351—274358 |
| 268893 | DUZUBAJ3A8GP/F27/T5 | 26930 | 是 | states 274834—274839 |
| 270216 | 8JRE1C4H4Z2W/F33/T2 | 27175 | 是 | states 276208—276212 |
| 270282 | 8JRE1C4H4Z2W/F33/T2 | 27194 | 是 | states 276274—276278 |
| 271309 | YF0LXT1QSTGG/F48/T1 | 27478 | 是 | states 277327—277337 |
| 271348 | YF0LXT1QSTGG/F48/T1 | 27484 | 是 | states 277366—277373 |
| 271499 | YF0LXT1QSTGG/F48/T4 | 27509 | 是 | states 277517—277519 |
| 272195 | XP2SL33HT0D9/F33/T1 | 27671 | 是 | states 278231—278236 |

coverage.json逐一列出全部811题及完整阅读标志；剩余801题只做身份/字段索引，未完整阅读，
原因是本批按十原提案选择上述机制、换线及阶段关键窗口，其余不用于新增游戏结论或收益。
另外6个decisions/state窗口（270264、271495、271982、271992、272040、272213）核实实际动作与状态，
未把它们相应Jev题面算作完整阅读；尤其T3配对不据此评价所有候选或模型。
本轮不是“最后五条”覆盖，也不声称完整覆盖本局全部问题。
若工具输出曾截断，已补读268385的plan6/7/8、270282的previous_attempts、
271309的known_draws以后正文及plan1/2；原完整问题文件仍保留。
272213的题面仅保存未完整阅读，仍列未读；保存不等于阅读。

audit.py用run_id+observed_ts+fingerprint精确找到16个唯一观测起点，再保留同轮后继及下一轮边界；
下一轮动作不计入前轮执行。每个chain-*.json记录chosen/result/gate_reject/selection_dispatch等，
历史缺字段明确写missing，不当闸门通过。本批聚焦原始回读351行，
另存focused-raw.evidence.jsonl；其中199个机制帧，
均重读原offset/bytes并核SHA与parsed row相同。不是把全部states灌入模型。
历史原题中嵌入的药水或旧经验摘要仅作为“当时题面包含什么”保留，未搬用其外角色统计、
正文提及局或未核机制为本批知识。

## 3. 逐问题的采用、执行与后果

1. CA5KE8GFJ9X2 F13 T4，decision267379/Jev26720选plan1打击；chosen为card_index2/target0、
   result=completed，states273261→273262敌28→22，随后273263力量4→8、下一轮19攻。
   题面enemy_threat_next=15与实见19分列；不据历史dirty输入断定当前仍有同一bug。
   原始全F13窗口也保留弱后14及末轮死亡，完整需损4与实际仅扣2不混算。
2. 5PM6JAQG6FNQ F38 T3，268385/Jev26868选plan10；题面plan1（35伤/损3）未实际执行。
   chosen药瓶、后续冒泡/猎杀者/下注及结束；states274308—274313从61→31，
   电击23→18→15且力2→4、攻17→19，召唤者仍活；不能宣称换杀序必保血或救下一战。
3. 同局F39 T4，268427/Jev26875选plan1；两步法按状态敏捷−4→−2→0，防御5挡；
   失落降至2血后毒死，274358玩家力量−4→0、HP19→5、遗忘仍活64血。
   后续再次抢夺窗口另见mechanism-frames；没有观察到本批遗忘死亡返敏，逐来源返还未知。
4. DUZUBAJ3A8GP F27 T5，268893/Jev26930选plan2。首次chosen生存者仅result=pending(unstable)，
   268894选择完成、后续防御/迷雾结束，不能单凭pending称未执行。
   states274834—274839污染0→6→12→18、卡牌挡8→17，迷雾使毒7→13，敌93→80，
   HP46→37；下一玩家轮无污染。历史候选预测本轮7伤/余毒6，实际毒结13/余12；
   迷雾子项已有20b0451修复，不把此历史差异重报为新实现或推出少打技能。
5. 8JRE1C4H4Z2W F33首/三试T2，270216/270282指纹逐字相同；Jev均plan1。
   第三次sl_explore把尖啸换打击，reason明确未试线均更差仍探索。
   第三次原/替预测死亡0/24与5/24，损血估计均47；不是同死率。
   首次题面只有8样本（1/8与2/8），不把第三次24样本倒填首次。
   states276208—276212实损3/扣10；276274—276278实损15/扣17。
   这是同存档相关配对，多12血换7伤；原线最终胜利未知，不拟禁止探索或全局血价常数。
   第二试T5只核实际状态249→224/25→21与临时减力恢复，不把护栏候选差记实际收益。
6. YF0LXT1QSTGG F48第二/三试T1，271309/271348指纹逐字相同、Jev均plan5。
   第三次SL替成plan4所示较短线；两者24/24全死、后损封顶27仍有即时0/10与54/36差。
   第二试states277327—277337实际HP27→27、敌111→66；第三试277366—277373实际27→18、
   敌111→73。故实际多9损、少7扣，不拿候选54/36作实扣。
   第三试271354另题结束回合，第二试271315亦有重规划；最初候选的所有续步不能自动视为执行。
   原提案F33重打胜例及第四试T5未完成替线保留为限制，本轮没有完整重读其题面，不计本轮新验证。
7. 同局末试阶段，277512→277513由旧阶段4血4毒到新阶段212血、旧敌力/毒不沿用；
   271495换线经下注重抽后，271499/Jev27509实际只选触媒+。
   277517→277518建立ACCELERANT2、敌197且无毒；277519下一轮敌仍197/无毒、攻击44，HP18。
   末轮23挡后第三小刀才增敏，37扣与生存缺口须分账，未读所有候选不推能力排序。
   当前snapshot已有实现；不把触媒零毒观察误写为该牌永远无价值或阶段/持有预测已全面校准。
8. XP2SL33HT0D9 F33末试T1，272195/Jev27671原答plan4、SL换plan2，B2为0/0差0、se0；
   实际278231—278236扣敌34、损10并获1永久力量；chosen最初背刺completed、匕首后pending/选择completed，
   不能把三步候选当无重规划完整轮。
   首试271982精确同指纹状态链278018—278023实扣25/损2；T3原/替链另核实扣24/27、损9/14，
   但其完整Jev问题未读，结论限实际资源配对，不推候选最优或整战因果。
   本批末试T2轮初14挡、镣铐−9、T3恢复；T4朝向57→38、虚弱38→28，来源不同。
   “B2差0”没有消除付血和成长取舍；没有独立完整胜线，不拟系数。

完整数值与原行参考以chain-*.json、mechanism-frames.json及focused-raw为准。
state没有稳定实体代际ID时只称同窗口可追踪的实体，不跨召唤/退场重排index作身份保证。
前后HP变化包含实际结算，不把SL重置当回血；毒尚存与已结算、过量伤害与本体净扣分列。

## 4. 当前源码子项及十项处置

实际live上下文：0cd3629d3a7f3a3bcacd22fa0a4206acc4d81e78；source-proof.json逐项运行merge-base --is-ancestor验证。

| 实际live祖先源码 | 核实范围 | 不代表 |
|---|---|---|
| 20b04517393708c73912326bb35d8448d1b3f77e | Silent HAZE普通4/升级6现场值接入施毒模型 | 火花/污染/技能收益联合重放已齐 |
| aad2700abed6dff1d66e87fb36aaa6fedb39adf3 | 实验体当前帧HP/毒/已建能力/持有组件事实 | 逐候选跨阶段预测与实际执行校准 |
| 9d8278702dbc581b5015ba7ec9a70dc0fb94cccb | 当前选择审计模块的既有源码历史入口 | 整线重规划后完成、实际收益闭环 |
| 1698adc96ba434a46942321e0237b70657e625b2、0e4fe4df89a06682468e0e4716c12126e76369d5 | SL候选本轮资源/沙坑比较 | 原线/替线实战配对、完整科学父要求完成 |
| 66283dd9982bdd7f480da7a4d9bfefea0572a9ac | 既有HP护栏候选审计所在源码历史 | 候选省血自动等于实际省血 |

源码已核combat-plan接线调用；audit字段明确execution=unverified、actual_turn=null或pending_dispatch。
本轮不以测试旧模块或读到接线代替所有消费者验收，不把上述任一子项作为整个十提案的implemented_commit。
HIGH_VOLTAGE共享growth路径存在，仅凭数组成员不能复原历史初始化与逐代际实体路径。

### silent-proposal-c20b5139dd0dff71

来源：DUZUBAJ3A8GP；原账本：silent-0168。

处置：waiting。迷雾施毒子项20b04517393708c73912326bb35d8448d1b3f77e已核为live祖先；F27 T5实毒13与历史候选7分账，仍缺历史加载移动表下火花增长、污染消失及技能毒挡的联合消费者重放。

既有原文、证据边界和回退要求保留，不改提案原文或另造重复id。

### silent-proposal-ae9e692d680e3819

来源：5PM6JAQG6FNQ；原账本：silent-0183, silent-0005。

处置：waiting。F39 T4两步法使敏捷−4→−2→0，失落死后力量−4→0已核；遗忘死亡返敏、逐来源归还及另一目标顺序完整后继未获本批验证。

既有原文、证据边界和回退要求保留，不改提案原文或另造重复id。

### silent-proposal-52f1e1bd2e7db0ed

来源：CA5KE8GFJ9X2；原账本：silent-0231。

处置：waiting。F13 T4预测下轮威胁15而T5实见8力19攻击，不能用当前刷新的DB冒充历史dirty输入；缺实际A10移动表及加压/覆甲联合重放，未验证其他减层条件。

既有原文、证据边界和回退要求保留，不改提案原文或另造重复id。

### silent-proposal-6dd8bbff876be528

来源：5PM6JAQG6FNQ；原账本：silent-0233, silent-0209。

处置：waiting。F38 T3/T4电击2→4力量、17→19攻击及退场窗口已核；缺历史实际初始化模板、跨召唤代际稳定实体身份与连续消费者重放，不据未打出的35伤/损3线规定杀序。

既有原文、证据边界和回退要求保留，不改提案原文或另造重复id。

### silent-proposal-578e415a259e6835

来源：8JRE1C4H4Z2W；原账本：silent-0005, silent-0006, silent-0018, silent-0079, silent-0019, silent-0020, silent-0021, silent-0125, silent-0023, silent-0027, silent-0046, silent-0016。

处置：waiting。F33首/三试T2已核同指纹、原答/SL/实打3→15血价及10→17输出；现有候选审计非整轮执行证明，F17 T6、末试T11及跨重规划完整验收未齐。

既有原文、证据边界和回退要求保留，不改提案原文或另造重复id。

### silent-proposal-c0767768bf6a7ab1

来源：YF0LXT1QSTGG；原账本：silent-0079。

处置：waiting。F48第二/三试T1同指纹已核、实损0→9且实扣45→38；候选资源比较已有live子项，覆盖重放全续步归属、F33胜例与独立后移整战对照未联合复核。

既有原文、证据边界和回退要求保留，不改提案原文或另造重复id。

### silent-proposal-a46bdb7fe711d79a

来源：YF0LXT1QSTGG；原账本：silent-0021, silent-0027, silent-0028, silent-0085。

处置：waiting。F48末试T4触媒2建立而零毒、T5仍零毒及44攻击已核；aad2700abed6dff1d66e87fb36aaa6fedb39adf3只是当前帧快照，逐候选跨阶段预测/抽弃切断/实际执行校准未齐。

既有原文、证据边界和回退要求保留，不改提案原文或另造重复id。

### silent-proposal-1044224808015e5c

来源：XP2SL33HT0D9；原账本：silent-0079。

处置：waiting。F33末试T1已核Jev原答plan4、SL换plan2、实损10/扣34/得1力量，与首试同指纹实损2/扣25分列；T3配对仅核决策及状态，缺受控随机后继和独立完整胜线，不拟血价系数。

既有原文、证据边界和回退要求保留，不改提案原文或另造重复id。

### silent-proposal-7cbc6005db712ba9

来源：XP2SL33HT0D9；原账本：silent-0021, silent-0005, silent-0007, silent-0063, silent-0065, silent-0241, silent-0242。

处置：waiting。已核F33末试T2轮初14挡、镣铐−9与次轮恢复、T4朝向57→38及虚弱38→28；A1/A6首证、升级/额外条件和全部消费者未在本批联合验收。

既有原文、证据边界和回退要求保留，不改提案原文或另造重复id。

### silent-proposal-c59f592f1427a67e

来源：YF0LXT1QSTGG, XP2SL33HT0D9；原账本：silent-0005, silent-0006, silent-0019, silent-0020, silent-0021, silent-0028, silent-0027, silent-0079, silent-0046, silent-0085, silent-0060, silent-0063, silent-0065, silent-0062, silent-0039, silent-0013, silent-0011, silent-0023, silent-0018, silent-0087, silent-0241, silent-0242。

处置：waiting。原提案101局、22次减力、50帧船夹板是独立分母；本批六局只能支持局部状态核验，未重核这些历史分母及全部消费者，不把两末战各六尝试当十二独立局。

既有原文、证据边界和回退要求保留，不改提案原文或另造重复id。


## 5. 验证、登记与交接

本次无生产源码/知识改动，fixes=[]、merged=null，没有新提交、eval版本或规则通知；
tsc/vitest/cases均null，未运行、不称通过。撤源码失败/恢复通过不适用；原始字节核验不是这些代码测试。
铁甲及未观察进阶保持原行为。没有合入故不运行live锁内刷新、合并、测试和发布流程。
新增只是一条本批核验账本silent-0563，经根learner/ledger.py add、status=proposed、
by=learner:strategy-proposal；不修改原账本claim/status、不标shipped，不重复加十个提案id。
十项proposal_results由本批最终JSON交原调度器登记waiting，不手改专用队列。
本次没有新游戏机制异议或反证：已核历史预测差、现有子项和原待办边界分别保留；
未关闭其他学习要求、未代其他角色ACK。

运维交接路径：
- proposal：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261022-014302-s2/learner/runs/20261022-014319-4c9af37f-babb-4137-bb0a-7f8d5e6e87fd-strategy-proposal/proposal.md
- report：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261022-014302-s2/learner/runs/20261022-014319-4c9af37f-babb-4137-bb0a-7f8d5e6e87fd-strategy-proposal/report.md
- 逐项结果：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261022-014302-s2/learner/runs/20261022-014319-4c9af37f-babb-4137-bb0a-7f8d5e6e87fd-strategy-proposal/proposal-results.json
- 原始证据清单：v6-evidence/evidence-manifest.json、evidence/evidence-manifest.json；
  回读审计：raw-verification.json；逐题覆盖：coverage.json。

限制：完整题目仅10/811；六个额外窗口仅核原决策及实际状态；原101局/22次/50帧独立历史分母未扩展重核；
没有受控的整场另一线或后移新局验证；历史dirty数据库实际加载内容未恢复；
V6本批无匹配而配置无显式字段；旧缺字段/坏行/未知身份和对象宿主封存pending保留。

最终机械核验：gitleaks全scratch扫描退出0、报告空数组；git status --porcelain为空、HEAD仍为完整base。
351行原字节回读包括252 states、77 decisions、10 Jev、6 run-config、6 runs；16个起点均唯一。
全部811个Jev索引均有精确本批decision出处；10/801完整阅读/未完整阅读分账。无生产代码测试或发布。

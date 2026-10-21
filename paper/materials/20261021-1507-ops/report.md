# Silent十项策略提案本批核验报告

记录时间：2026-10-21T14:59:02+08:00。task=strategy-proposal，character=silent，batch=20261021-144302-strategy-proposal。

十项原提案全部保留waiting：原日志支持部分状态变换和当轮端点，但尚不能证明原提案完整实现，亦没有足够证据拟合新预算、血价、SL阈值、启动权重或固定杀序。本批没有源码/正式知识改动、提交、live合入、eval版本或shipped；铁甲行为保持等价。

## 身份与基线

开工git status干净，HEAD=3646de6b78ff34612a02c4bd0855e26b4310ae55；普通提案执行git merge --no-edit main，Already up to date，base保持。learn.json只读取本批：task/character/worktree匹配，reason=proposal，十proposal_ids，无research_request/implementation_request/proposal_repair；根牌组大小请求绑定另一旧批，本批不承接专题、不扩展队列。dispatch-identity.json保存实际绑定。没有下级agent。

先读README、STATE-2026-10-19、decision-log末尾、learning-protocol及learning-code-proposals。STATE的早期停机段与后续恢复段同时保留；本批不操作STOP、对局或账号。六局runs原行均SILENT/A10且ended非空，均为2026-10-07结束的失败局：VLZ F45、8JRE F33、CA5 F13、5PM F39、61E F28、DUZU F30。独立局数6；重打不增加分母。运行版本带dirty，不凭Git提交复原全部历史知识和随机池。

## 提证、冻结与覆盖

按指定根evidence_summary入口先生成evidence-summary.json；它的complete_raw_evidence=false，有限最后五条只用于定位，没有当完整覆盖。然后按指定extract_evidence命令提V6/Jev/decisions/config，并经同一入口补states、SL、plans、runs和brain。各自独立冻结切点；摘要与后提证的源字节增长保留，未覆盖旧文件。

| 流 | 冻结source_size字节 | 所属原行数 |
|---|---:|---:|
| states | 15230337179 | 3432 |
| sl-attempts | 52543312 | 29 |
| run-plans | 10368353 | 33 |
| runs | 404616 | 6 |
| v6-build | 64678849 | 0 |
| jev-prompts | 2393457643 | 579 |
| decisions | 3319873633 | 3306 |
| run-config | 2421441 | 6 |
| brain | 1210787877 | 183 |

audit.py逐行seek原文件，核offset/bytes/SHA256、JSON对象及冻结上界，共7574原行通过，raw-verification.json保存结果。mechanical原字节读回不等模型逐题精读。states仅向模型展示23个固定帧的事实及九个决策的有界后继，未整份输出states流。23项固定原帧事实断言通过，fact-checks.json；这是证据检查，不是生产tsc/vitest或收益试验。

V6-build在64678849字节切点共扫描660行，本六局无匹配；entries、jev_answer、fallback、unknown均无本批可归属原行，保持不适用/缺流语义，不能计作这些指标的零结果。六份历史run-config没有V6字段，不能补写显式off，也不能当作on。局发生在V6引入以前；本批不验证V6正式发布、下一局消费或自然收益。

Jev流本批579行，按原始显式run_id并与decisions精确decision_id/指纹身份核对；不是凭正文提及、邻近时间或question_id相似字符串归局。所有579行的关联decision原SHA均核同。原请求内夹带的旧角色统计只保留作历史题面，不读其源知识、不把它们纳入Silent验证。

完整读了下列九题的完整request、answers/error及相关chosen/result/gate_reject/selection_dispatch与后续states；question-<decision_line>.txt保存完整原行对象和引用。question-audit.json保存逐动作派发字段、前后状态及各自原始引用。

| 局号 | 窗口 | decisions原行 | 精确decision_id | Jev原行 |
|---|---|---:|---|---:|
| VLZ6CCT8AQ0A | F43 T1 | 269706 | f1233b3d-ee2c-4c00-ab16-d6aafe1dcb68 | 27083 |
| VLZ6CCT8AQ0A | F43 T1 | 269707 | 1255c12e-9a86-457f-8d27-77861f95b4d6 | 27084 |
| VLZ6CCT8AQ0A | F45 T1 | 269748 | 04b5c1fd-fc69-4e01-9c6b-c2417cd16d31 | 27093 |
| 8JRE1C4H4Z2W | F33 T2 | 270282 | a0a63fc0-828b-477c-9705-72c7e45ee4c3 | 27194 |
| 5PM6JAQG6FNQ | F39 T2 | 268455 | 397711ec-b2e8-4554-a868-d1db0bf143b8 | 26880 |
| 61E2QS63Y9WU | F17 T6 | 267612 | 843bd895-a24b-4a17-837e-b818e1857689 | 26756 |
| 61E2QS63Y9WU | F23 T4 | 267696 | bd5b1482-9eea-493f-b159-aa1eb3bc5a1a | 26771 |
| CA5KE8GFJ9X2 | F13 T4 | 267379 | fa69876c-94f5-4915-a951-1d462efb0537 | 26720 |
| DUZUBAJ3A8GP | F30 T5 | 269068 | 48174eb3-a1e5-4db0-ac76-35377a0fd18e | 26966 |

其余570个Jev请求只做机械原字节及身份核验，未完整精读题面：包括索引中的d269754、d269770、d270216、d270264；本批对它们只核原decision指定字段/部分事实，不声称完整题面覆盖。d269755为代码动作，没有对应Jev原请求，不能把无匹配当请求失败。question-coverage.json逐条列全部579题的原引用、是否完整精读及未读原因：范围受本批十提案关键窗口约束，没有据未读题作策略结论；不是任取最后五题。

全源无效行计数为states2、decisions2、Jev1、brain2，不能据此说属于六局。所有提证切点incomplete_lines=0，但各流保留有限gap_refs，不能当全体缺口清单。states有3422个unknown_identity；decisions有1934个unknown_identity和1485个unmatched_decision_id，均不凭正文补归本批，缺失不是零。原始身份信息及计数在各manifest中。

## 九题与后继事实

- VLZ F43 T1：d269706原答plan1，先派神化，s275679→275680能量7→5；同牌序d269707重问plan1，预测43伤/损14→51伤/损13，s275687实际敌254→203、玩家90→77。后抽毒雾为升级3毒；这证实局部升级与即时端点，不能推出整场胜因或“持有即施放”。F43整战90→33仍付57血。
- VLZ F45 T1：d269748原答plan4不含神化，chosen先打勒紧；MC为1/12样本707ms，horizon1/samples1/best=null，题面明确fallback而非后续预测，不等确定死亡。后继d269754才喝CURE_ALL；s275728→275729为1→2能量、HP67不变、抽必备工具/生存者。后续代码重规划并打二牌，不能把p0样本里抽到猎杀者/萎靡当真实执行，亦不能把第一问算成喝药选择。
- 8JRE F33第三试T2：Jev原答plan1，SL替换尖啸为打击。原sl_explore保留0/24与5/24死亡样本及“已知原路失败，未试线均更差仍探索”的理由；进一步损失都封顶47不是同死率。与首试d270216指纹同，原观测整轮端点玩家分别-3/-15、敌-10/-17（paired-sl-endpoints.json），多12血仅多7敌净扣；没有保持原线至胜利的反事实。d270264的护栏在rationale，结构hp_guard不存在，不把无字段当无护栏。
- CA5 F13 T4末题：Jev选打击，d267379派发完成，s273261→273262敌28→22；到T5力4→8、同招19，末虚弱14攻对2血10挡。其他帧确认0→4→8力、11→15→19与弱后11/14；本局没有正敏捷施放样本，不补计划中的步法。
- 61E F17 T6：Jev选防御/尖啸/防御，逐牌后挡3/6，玩家56→48，毒使敌67→34；负2敏捷下两防御各3。临时减力恢复与后续23→24意图分开记录；首试获胜不能给另一SL线作因果证明。
- 61E F23 T4：原答plan3，猎杀者本体再杀灭；本体76→41、幻象14→2、玩家25→10，总敌净扣47含幻象12，本体仅35。幻象仍存活并攻击，不能把47全归本体或说全员退场。另一focus的39伤/零损只有推演。
- 5PM F39第二试T2：原答plan7，实际冒泡先付1能，s274379→274380目标35血/0毒不变；随后防御、防御、打击及其他被动/敌轮结算另账，到s274384玩家29→8。不能将全轮扣血都归冒泡，也不能由此拟合统一启动权重。
- DUZU F30末试T5：原答plan1且逐动作完成；甲虫力2→-4→4，意图20→14→22，临时减力没有关闭成长。题面17挡/甲虫62血与实际s275017的22挡、s275018的59血不符；不能把“整轮数字exact”当已校准事实，详questions.json。先前三试T6在d268989/269017/269045结果明确not dispatched/SL reloaded；末试d269073完成，不能把前三预测判死算作三次已执行死亡。

九题chosen对应的result均completed；本批3306条历史decision里3301条有decision_id/chosen，另5条缺失；gate_reject、selection_dispatch、selection_audit均未出现，hp_guard结构字段也未出现。不存在字段不是已验证未拒绝/已完整执行/收益为零。每题后继是独立原始观测，抽牌、重问、选择、SL或换战不能被跨过来认证完整候选。

resource-observations.json保留VLZ全部有战斗观测层的首末资源，以及F39/40/42/44窗口；胜局没有省略。末段原状态：F35 83/95→67/89，F36 67→56，F37 56→33；F39事件33→26，F40休息26/89→57/94，F42 57/94→90/99，F43胜90→33、药槽0从FIRE变CURE_ALL，F44休息33/99→67/104，F45 67→0。槽位变化的领取、使用与回血不混算；本批无留药或营火另一选择的受控赢局。

## 源码与逐项处置

只读live快照=5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532。八个精确路径中七个base/live blob相同，hand/loop不同；完整blob和最后来源提交的live祖先核验在source-verification.json。同blob不保证main最后提交为live祖先：card-model最后main提交e2103b3a9b5fdd524508fa28e5dd64ec7f63eb46仍非该live快照祖先，没有将它写成implemented。

已读神化plain/upgraded配对、turn-solver的unknown属性组合与已知牌升级传播；silent-selection-audit记录预测三阶段，silent-selection-dispatch明确scope=single_action_receipt、whole_plan_executed=null、state_effect_verified=false；离线selection-execution也保留actual_full_candidate_result=null。局部live来源a46239a29c3109ff9f69224ad77128d9929d3e9a、df528ddf14da72f9973e13444f45ee7c3917a67c、9d8278702dbc581b5015ba7ec9a70dc0fb94cccb、fdaf787a372880b0438e73bcac7e6d2168b038ed、a32050fbce4c2863f640468c2dbf378fc9157074均核为该live祖先；这不是本批提交，也不满足宽提案全部职责。

| silent-proposal-89354805ee4d7e77 | VLZ6CCT8AQ0A F35/F43 T1、F43 T2、F45 T1 | silent-0237、silent-0238 | 已有神化局部升级传播；缺跨抽牌、选牌、药水、SL及换战的实际施放持续身份与完整消费者校准，未知属性组合仍保留unknown。 |
| silent-proposal-f2bfceddb1898dca | VLZ6CCT8AQ0A F45 T1/T5；F35–45资源链 | silent-0106、silent-0019、silent-0201 | 缺完整模型下同起点、同随机池、同总预算的分阶段MC配对及成熟度曲线；707ms单题不能确定新预算、留药或集火规则。 |
| silent-proposal-283a164780d11e69 | 同首项 | silent-0237、silent-0238 | 与首项同源，但完整实际施放追踪及未覆盖升级交互仍缺，局部实现不能将整项登记duplicate。 |
| silent-proposal-ebbfe3b97548756d | VLZ6CCT8AQ0A F43 T1、F45 T1/T5（只覆盖部分机制） | silent-0005、silent-0016、silent-0049、silent-0071、silent-0143、silent-0046、silent-0053、silent-0027、silent-0011、silent-0021、silent-0106、silent-0204、silent-0020、silent-0019 | 九题仅复核十五机制中的部分现场值，缺全部属性、升级、期限与战斗/路线/休息消费者联合校准。 |
| silent-proposal-e5b87be50f28f311 | 8JRE1C4H4Z2W F33 首/第三试T2；第二试T5仅字段复核 | silent-0079、silent-0021、silent-0125、silent-0018 | 已有候选三阶段与单动作回执；缺跨抽牌、选择、重问、药水、SL的完整候选持续归属和本局全过程生产校准。 |
| silent-proposal-49632bc4878fb597 | CA5KE8GFJ9X2 F13 T3–5；完整题面为T4末问 | silent-0005、silent-0231 | 本局未提供正敏捷施放样本；缺同一冻结生产调用中力量、正负敏捷、虚弱与蚌独立成长四路径联合校准。 |
| silent-proposal-66532328a585941f | 5PM6JAQG6FNQ F39 第二试T2 | silent-0021、silent-0009 | 无毒冒泡的耗能与局部无效已核；缺同HP、牌组、药水及完整抽序下不同启动顺序的整场配对，不能拟合启动权重。 |
| silent-proposal-43a76a31ba7bdcfa | 61E2QS63Y9WU F17 T6 | silent-0030、silent-0027 | 负敏捷双防御与毒端点已核；缺同起始HP、构筑、抽序的另一完整SL线路和冻结生产整战配对，不能改SL范围或阈值。 |
| silent-proposal-5264153a4a4b0e5c | 61E2QS63Y9WU F23 T4 | silent-0039、silent-0209 | 本体线47总敌净扣/损15兑现但幻象仍存；缺召唤、航行、复现、退场全链校准和另一focus完整后继。 |
| silent-proposal-bddfa690a84e03d0 | DUZUBAJ3A8GP F30 首/末试T5–6 | silent-0128、silent-0079 | 临时减力恢复加成长已核；缺失血唤醒、眩晕接续与当前进阶成长的完整生产校准和同抽换序后继；另保留历史题面/实盘偏差待定位。 |

原Markdown、账本、层/回合、反例、拟验证行为与回退都在proposal.md及原件；code_proposals为十个原CLI id，不另建重复id。implementation_domains=[]，因为本批无实际实现。原提案等待并非发布失败，也不能凭局部源码登记duplicate/implemented。

## 异议、记录与检查

questions.json保存一项有界不同结论：历史题面“当轮exact”在DUZU窗口不成立；不直接推断当前生产模型仍有同一缺陷，不写新公式。影响原silent-0128/0079及bddfa提案，待先定位完整状态变换。请ops沿既有链告watcher再告Roy；本批没有自行改根请求/learn.json或代填ACK，尚无送达回执，不把报告落盘称为已通知。

仅经根learner/ledger.py update追加本批报告/提案链接与核验限制，by=learner:strategy-proposal；不重复添加已有证据、不改claim/status/version，不将历史shipped降为proposed或本批标为shipped。CLI输入、输出及实际原行读回另存本目录。没有新经验条目，不宣称正式知识入库。

未改生产源码，撤源码失败/恢复通过不适用；tsc/vitest/cases均null，未运行生产测试、不借用历史测试成功。无提交故不做空提交、live刷新、merge锁发布或eval编号；没有新的规则上线双通知或decision-log上线记录。source-diff.patch为空，HEAD保持base，工作树检查见final-verification.json。只读外部日志，不联网、不运行play、不推送、不改其他角色知识或运维prompt。

保留执行局限与初稿：最初合并输出正常Already up to date；一次题面索引脚本因5条decision缺decision_id触发KeyError，随后用显式存在ID集合处理。几次工具输出被截断，完整请求另存原引用，并分题/补读缺失的plan7/plan8与压缩事实重读；未把截断输出当完整覆盖。历史原提案七路径不可见，按Git原字节找到同SHA保存件；materialize七次均因persistent runtime retained拒绝，未恢复原路径，本批直接读取scratch的同SHA原字节副本，失败回执保留，不当证据不存在。未观察的升级组合、完整候选身份、生产校准、未选整场反事实仍未知。

运维交付：proposal=/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-144302/learner/runs/20261021-144321-10ba93cc-0974-41e4-a6d6-ec03316756ce-strategy-proposal/proposal.md；report=/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-144302/learner/runs/20261021-144321-10ba93cc-0974-41e4-a6d6-ec03316756ce-strategy-proposal/report.md；机器处置=result.json。无需合入的记录型批次可以结束，十项waiting及相关科学父要求保持开放。

最终读回：根ledger CLI退出0，26条本批追加均按实际offset/bytes/SHA回读；更新未写status/claim/version/evidence等字段。十项proposal_results集合与本批派发精确一致。gitleaks对本批目录扫描约153.53MB退出0、发现0；完整log与空JSON报告保留。HEAD仍为3646de6b78ff34612a02c4bd0855e26b4310ae55，git status及diff为空，未提交/合入/发布。

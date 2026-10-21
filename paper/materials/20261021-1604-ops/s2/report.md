# 静默策略提案核证报告

本批完成十个已领取提案的有界复核，全部保留 waiting。未形成有充分验证的新策略修改：局部确定公式已有子实现，原提案剩余的联合校准、候选完整后继和独立验证仍缺。没有源码/知识修改、提交、合入或发布；不将提证、首场胜利、CLI提案登记或旧实现存在当作自然采用和通关收益。

## 身份、基线与材料

batch=`20261021-154302-s2-strategy-proposal`；task=strategy-proposal；character=silent。初始HEAD为`85f99b4757beef925010e857adafc9f081b37396`且干净；只读取本批派发记录后确认 proposal_ids 恰十个，无 research_request/implementation_request/proposal_repair。普通专题请求绑定另一批次，条件不匹配，未读取其work_spec或扩题。按普通流程快进main后本报告base为`757b23b2ab3d7e6fdd087e4722df31bd87eeb73f`，保持此HEAD，tracked工作树干净；空二进制差异保留于`working-tree.patch`。

先读README、最新STATE-2026-10-19、decision-log末尾、学习协议及代码提案闭环；STATE旧停点按其后续追加及当前决定理解。此次不涉及Jev拿牌的在途方向，不启动对局、网络、子agent或模拟池。

`run-verification.json`逐行核实十个锚点均silent且ended非空；SADL为A7，F4为A9，其余A10，不混算。原提案明确涉及的额外1913SE84AXQF、Q6M2Y34MWKRE、NHA2KW0RB7VP为A10，K3676LU8B0UH为A1，四局也由supplement/runs原文逐项核实，不冒称本批新增完局。全部来源属于silent；旧提示中夹带的其他角色统计仅是原题文本，不计为本角色验证。

十份原Markdown全部按队列proposal_sha256读回。六个原exp路径已不存在，未据此认定原文丢失；从根目录保留的原件副本恢复到本批scratch，SHA逐字节一致。原路径和保留来源见`proposal-readback.json`、`proposal-readback-more.json`与`proposal-integrity.json`。未修改原提案、根请求、队列或历史复盘。

## 冻结与原始归属

先运行指定root/evidence_summary.py，再运行本树extract_evidence.py指定的v6-build/jev-prompts/decisions/run-config；另提取states/sl-attempts/run-plans/runs，四个补充局独立提取。日志持续追加，因此摘要、主提取与补提取切点不同，各自保持原manifest，不覆盖旧截点或以时间接近补所属局。

下表为实际读取的manifest；source_size、逐流SHA、逐行offset/bytes/SHA和identity原件均保存。Jev归属只用显式run_id与fingerprint.run，或decisions原行精确decision_id索引；完整原题中的局号引用不建立归属。

| 流 | 冻结字节 | 源SHA256 | 本批选入行数 |
|---|---:|---|---:|
| v6-evidence/v6-build | 64678849 | f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da | 0 |
| v6-evidence/jev-prompts | 2404513635 | ae37f90839eafe92ea4248854643a024489360ad392767b9d79b378c3ac95fb1 | 1838 |
| v6-evidence/decisions | 3341330168 | 5e4782934691bf457871c3796a722675a07ed7f5701894a224b0cdd44caa49f7 | 6982 |
| v6-evidence/run-config | 2427471 | 5010c3c2220d471b61da6efd2d61b83686a449b5cef134d1aa322fe010d225f8 | 10 |
| evidence/states | 15256459276 | e056981d080bc855454d74678a46970dc3c6ca1264a0550746512a84c4c1bf39 | 7277 |
| evidence/sl-attempts | 52695564 | 15116d9c62b8a733093b48cfd79572c95e0d00adacce83d89a2c8e44ef1c4e7b | 60 |
| evidence/run-plans | 10382170 | 346c42250ee0c50f88c7e8ac62a5a6974bedd10b277d6114b5e46bba86ffb1db | 57 |
| evidence/runs | 405092 | e1687cfaa8a026126aaf06f4798d156cf06a269dd4e7a628a9ed36fe0570943b | 10 |
| supplement/decisions | 3342174778 | 22cbf13dad9817357b0659ea8f2400694a1d121ddaf8acd5f3b380c82edcae95 | 1918 |
| supplement/states | 15257425593 | 12a60cc56938b5e4c45df1c256d879fd0ba35873787e90168d4662ed22224e46 | 1980 |
| supplement/jev-prompts | 2405214043 | 44a4759ac2b3ba25babfe863c00b6f8591111c30486cb1111ab1ed1abaef8ce9 | 378 |
| supplement/sl-attempts | 52695564 | 15116d9c62b8a733093b48cfd79572c95e0d00adacce83d89a2c8e44ef1c4e7b | 12 |
| supplement/runs | 405650 | 2f7ac743901ec076e61a3f2fbe7f8c51e85d8b1cffa2f11cd4e35de8a03072ef | 4 |

主提取源存在2条非法decisions、1条非法Jev、2条非法states；均在各manifest保留具体位置，不能将未知身份强归本批。decisions还有1934条unknown_identity和1488条unmatched_decision_id（全源扫描口径），不是本批的失败分母；有限末五条缺口引用不当完整清单。所用77个动作均由原始字节SHA重新seek核验，状态按同run、精确observed_ts和fingerprint匹配，均唯一，再检查同run后继帧；未把时间相近作为run归属。

共享对象发布回执含pending_host_seal=true/deferred_errno=18；本批普通只读证据文件与其SHA在工作树内有效，不能称宿主对象封存已经完成。

## V6与Jev的实际覆盖

v6-build流存在，但十局均no_match，选入0行；entries、jev_answer、fallback、unknown没有本批可读值，均为未知，不将它们填成0条失败或0收益。十份历史run-config有明确本角色/进阶/code，均无V6字段，不能据此断言V6 off或on。未借后期其他局V6行补证。

本批Jev1838行均有request/answers，没有error字段；只能说已选入原文没有记录error，不能把历史缺失字段视为全链零故障。6982条本批decisions的fallback字段均非true；gate_reject/selection_dispatch字段全部缺失，报告未知，不从字段缺失推断没有拒绝或选择派发。

模型完整读取五份请求（本批四份、补充一份），覆盖六个question对象；完整state/criteria/答案均读到末尾，没有截断代读：

| decision原行 | run/层/回合 | Jev原行 | offset / bytes | SHA256 |
|---|---|---:|---|---|
| 227273 | SADL3CGYTGSR F8 T1 | 16704 | 253547669 / 7382 | fa21b6665ba2f630a027671c6986ae02ccda1816f2e0e4c87c8a5b7dd5278d4a |
| 275383 | TXZ6RVMQA09D F48 T6 | 28446 | 408363978 / 22496 | a015a10c1b6ebe22b83de4f4283722cca8f793592e4bc884bf92347f85adcfa9 |
| 275960 | WQZVENQ7DTRP F33 T9 | 28663 | 411318455 / 23573 | 6aedf346cf59d60184539cf175cc9084ae8af94159ca249a61a1ffd9fe3b9b90 |
| 276103 | WQZVENQ7DTRP F33 T11 | 28746 | 412804665 / 16270 | e4a2d30d5ccfa92f921ea19244df77764013d6c7ac6aa827ba5f5cca10380df3 |
| 276676 | Q6M2Y34MWKRE F8 T4 | 28859 | 414539106 / 13320 | b109257cd3740c3074e6bc8a40210539461169c6d8027e9999e45c36495a0d99 |

除此之外，本批46份和补充17份Jev原行按精确decision_id关联、原字节复核并保存；其中未在上表的58份只做机械字段/动作核对，未声称模型完整读题。其他题也保留在抽取原件：本批1834份、补充377份未完整阅读，逐个decision_id及原因在`question-coverage.json`与`supplement-coverage.json`的not_fully_model_read_decision_ids，包含已机械核验但未全文阅读的题。之所以有界，是本批只处置指定十项固定窗口，不重做原109/110局全史或将每题都解释为策略证据；这些未读题不贡献新机制/收益结论。`questions/276161.json`仅冻结定位，未冒称完整阅读。

## 核证结果与反例

1. TXZ6RVMQA09D，silent-0228/0255：F48第二/第三次T6同48HP、敌460HP。Jev原答plan6为冒泡+带毒刺击，第三次decision275383的sl_explore明确换冒泡+羽化，275384执行羽化、275385结束，result均completed。states281479→281484原线48→45、敌460→424；281535→281539替线48→48、敌460→433：少损3也少扣9。完整题列出了plan2同样零损但36伤、plan3有羽化未知等候选，不能只选两线数字便证明最优。SL原行972/973为predicted_death且真实reload成功；974首胜end_hp=4；975第二战died。states281563/564奖励/地图4HP、281565开场4HP/0能量、281566 GAME_OVER 0HP，TEST_SUBJECT仍111HP。首胜不等连战收益，缺固定后续抽序/生成/药栏的两战胜线。

2. WQZVENQ7DTRP，silent-0079/0018：F33第二/第三次T9精确fingerprint相同。decisions275894/275960的Jev均答plan2；后者sl_explore改为plan1，真实首动是飞镖。两完整题面与sl_explore都分列13损/24伤与22损/39伤；states282075→282079为26→13、184→160，282144→282148为26→4、184→145。两线都全败模拟并不表示相同血价或必败。反向约束是末次T7（decision276139，部分读题）：26HP敌245，执行逃离后该轮21挡、末沙坑5，下一轮22HP敌221；原T7线26HP敌221、沙坑少一轮。多付4血有延时，故不能由T9代价推出总保血或禁逃离。末试states282351/366/367显示9HP、敌132→81后25毒至56、玩家死亡；先被攻击还是沙坑内部致死仍未知。SL979—983为预测死亡/reload，984为真实died，不把六试当六局。

3. 狡诈容量，silent-0030/0257/0258：九个有饮用局42次（TXZ无狡诈饮用），全部从chosen=use_potion、expect.potion.id取样，不从正文提及取样。48个主审计动作中这些42次均唯一前态/后态，逐次核药瓶减少1、HP/能量/敌HP与挡不变、新增SHIV为upgraded且基础Damage6。结果37次加3、2次加2、3次加0。WQ第五次T11 decisions276102/103/104对应states282292—296，8→10→10→10，第二/第三瓶实耗但不添；第六次276161/162/163为5→8→10→10。完整读过276103的两问题：play答p1，survival答lethal；chosen=potion1且result completed，状态确实满手不添。完整题没把容量量化并不等于今天仍漏模型。实际后续旧局仍死，不能说穿插出刀能救局；保留/跨弃牌/生成后的完整重规划消费者联合验证仍未齐。

4. Q6M2Y34MWKRE，silent-0261等：F8 T4完整原请求plan1写紧勒+突然一拳+生存者19伤、1损，Jev答plan1。decisions276676—680与states282887—892核敌103→95（紧勒8）、95→85（8+2）、技能完成弃牌85→83、三毒83→80；实23，HP34→33。selected_deck_card与普通出牌分开，不把选择动作本身当额外牌。此局原源码有低估，现live已含紧勒子实现；本批不重修或据旧差额声称当前仍漏。仍未复核原109局所有药水/反伤/重接与阈值组合，也没有新的收益对照。

5. 补充资源与分源，silent-0019/0020/0044等：1913的F17胜后14HP、F24未回血、F28后61HP、F29胜后46HP并经F30保持46、F31死亡；Q6 F7休36→57、F8胜后2、F9 T2由2到0，见supplement-turn-boundaries的精确引用。1913 decision276559弃磨蚀前后能量3不变，建立1敏捷/4荆棘；不是付费施放。没有完整提前喝药/留药候选实打，不把后场死倒推另一选择可赢。未重算69/70个A10历史资源分母，不复用原文统计当本批新验证。

6. NHA/K367，silent-0079/0264/0265等：NHA第1次T1原线states283391—397从30到29，14挡、跨轮净扣8；第5/6次decisions277248—252/277272—276在同首手被SL覆盖回响线，states283478—483/283502—507从30到23，8挡、跨轮净扣24。两边未杀一侧，多16输出同时多损6，完整原候选跨弃牌重规划，不能取第一题当最终计划。NHA普通X1萎靡实给−2力/2弱；K367 A1 F30 T2带毒刺击后目标毒0→8；只是既有油灯分支支持。蟹朝向取整、其他手数/脆弱/能量全部夹具与后继校准未完成，本批不推广。K367 A1不计A10验证。

这些结论与原经验/提案的范围一致，未发现需要新增科学异议的反证；旧报告保留的未知与反例继续有效，没有将等待或排队当通知送达、角色ACK或父要求关闭。

## 已有源码及本批处置

读取当时live=`5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532`。核实际祖先：狡诈容量`6403fdcdadc803a092beb5165a068e22bf51c412`；王室猛毒入口`e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a`；紧勒`5c7105ff0294466da8319f2934beda05c6040794`。相似旧候选`15ea09ad75a421d4bd65a820c187c8ee188186c8`和`fc7042d1df0626e9e726f4bc912d9c6f626d908f`不是该live祖先，明确不使用它们登记实现。六个相关生产文件与本报告base/live字节相同，见`source-comparison.json`、`live-subimplementations.json`。以上仅子实现证据，不足将下列宽提案整体标duplicate或implemented。

| 原ID | 账本 | 本批处置与缺口 |
|---|---|---|
| silent-proposal-92920295a648b540 | silent-0228,silent-0255 | waiting：已核T6少损3/少伤9及首胜4血、F49开场死；缺固定后继抽序、生成牌及药栏的完整两战配对与独立校准，不能调整SL/终局阈值。 |
| silent-proposal-a327449c331efbc1 | silent-0079,silent-0018 | waiting：已核T9多15伤付9血及T7付4血延长沙坑反例；缺完整受控后继和独立胜负验证，不能将饱和死亡统计拟成固定血价门槛。 |
| silent-proposal-a099e89437e942bb | silent-0030,silent-0257,silent-0258 | waiting：42次容量及既有live子实现已核；保留、跨弃牌、穿插用药与SL恢复的联合消费者验收及整战收益未齐，不能关闭整条提案。 |
| silent-proposal-47910f82a1fdd98f | silent-0018,silent-0019,silent-0020,silent-0021,silent-0025,silent-0079,silent-0198,silent-0228,silent-0255 | waiting：四血开场损失已有live实现且原局入口死亡已核；无小血瓶以外组合、药栏和SL双向血价的完整两战联合校准仍缺。 |
| silent-proposal-f1374df72d8e6a25 | silent-0019,silent-0020,silent-0050,silent-0253 | waiting：已补核1913胜后46血接F31、Q6胜后2血接F9死亡；缺提前/留药候选的完整后继与可辨识的终局价值验证。 |
| silent-proposal-38a49e6c97f31eea | silent-0006,silent-0011,silent-0025,silent-0044,silent-0050,silent-0064,silent-0133,silent-0253,silent-0259,silent-0261,silent-0262 | waiting：Q6紧勒19预测/23实伤、1913弃磨蚀与现成live紧勒子实现已核；原109局药水衰减、重接/反伤/阈值的全部指定夹具及联合消费者验证未覆盖。 |
| silent-proposal-ef0e38a5dbd3bc07 | silent-0019,silent-0020,silent-0021 | waiting：已核实际休息/锻造与两条连续资源链；未重验原109局独立分母和未走路线反事实，缺可支持修改路线/资源权重的验证。 |
| silent-proposal-7f820c02d39bfaea | silent-0079 | waiting：已核NHA第5/6次完整T1替换及多16伤多损6血；无完整可赢后继、存活推进对照和独立样本，不改饱和SL门槛。 |
| silent-proposal-04b6b430759815ed | silent-0005,silent-0006,silent-0021,silent-0011,silent-0065,silent-0264,silent-0079,silent-0133,silent-0169,silent-0189,silent-0013,silent-0053,silent-0162,silent-0265 | waiting：已核K367首毒4到8及NHA X1萎靡实减2力/2弱；未联合覆盖朝向取整、全部手数/脆弱/能量夹具和逐来源消费者，不推广子公式。 |
| silent-proposal-9952ee8e8df9a0fe | silent-0019,silent-0020,silent-0065,silent-0264,silent-0079 | waiting：已核NHA饱和换线血价；原110局路线/营火/事件/SL恢复分母与完整候选后继未重验，不能拟新终局或留药参数。 |

未来验证仍须按run和时间分组，SL同局同组；先固定原题/候选/生成牌/药栏与完整后继，再以独立本角色新完局作验证。已提供的原策略候选与预期行为、反例、回退保存在同ID原Markdown和本批proposal.md。本批没有足够证据拟新药价、SL门槛或终局权重，故无玩法回退提交可做；已有规则/其他角色保持原字节。

## 交付与检查

抽取、audit.py、supplement_audit.py正常退出；42次容量断言、77个原decision与精确前后state的原字节校验通过。227组所需状态窗口只读取结构化边界及必要原字段，未向模型灌整局states。数据断言不是tsc/vitest，更不是候选策略撤源码验证。未改生产源码，所以撤源码失败/恢复通过、tsc、vitest、cases均不适用（JSON=null），未执行无关全套测试，也没有提交、合入、版本或shipped。

没有新机制/策略项，未重复新增账本或提案ID；已有账本折叠值保留在ledger-before.json，十条实际CLI原ID在result.json逐项链接。既有shipped条目不降级，宽提案waiting交原调度器消费；没有手改根账本/队列。未改运维prompt或启动/停止对局。不发布科学入库或消费者采用声明。

初稿定位曾因原exp路径失效、对无decision_id行直接索引而报错；已分别用同SHA原件与显式字段筛选解决，初次失败不当成源日志缺失或代码测试失败。原会话工具回执保留，派发记录未改。模型档位未获得独立原生turn_context回执，本报告不冒称已核档位生效。

提案绝对路径：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-154302-s2/learner/runs/20261021-154306-5d8bdc95-44e6-4cf8-86a7-976bc37c0427-strategy-proposal/proposal.md`。
报告绝对路径：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-154302-s2/learner/runs/20261021-154306-5d8bdc95-44e6-4cf8-86a7-976bc37c0427-strategy-proposal/report.md`。
机器回报：`result.json`；逐文件最终指纹：`artifacts.json`。本批只在授权scratch落盘，退出前另核HEAD与tracked零差异；不为报告制造提交或合入。

最终核验：十项proposal_results与派发集合精确一致、CLI report_links通过、HEAD未变且tracked工作树干净。gitleaks退出0，扫描约4.80MB文档/小文件未检出；显式1MB单文件上限跳过大型原始证据和部分分析JSON，不声称全材料密钥扫描。命令与跳过清单在gitleaks.log，扫描回报gitleaks.json。

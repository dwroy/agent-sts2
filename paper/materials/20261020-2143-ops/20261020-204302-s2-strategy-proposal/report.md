# Silent策略提案证据复核报告

记录时间：2026-10-20T21:00:44+08:00。

结论：十个派发提案均waiting，保留现有行为。没有源码、知识、任务模板或参数修改，没有提交/live合入/eval版本，也没有本批生产测试、发布、下一局采用或自然收益主张。逐项提案、账本、具体缺数和验证方法见proposal.md；原始身份、冻结切点、逐行offset/bytes/SHA及读题覆盖清单均在本目录。

## 任务身份与工作树

本批为普通队列消费：根learn.json的task=strategy-proposal、character=silent、reason=proposal、工作树及十个proposal_ids匹配；没有research_request、implementation_request、proposal_repair。不领取其他提案。根notes/strategy-research-silent.json仍绑定旧20261010专题，不满足本批条件，不套用纯研究口径。

开工git status为空，HEAD与report.base均为e42b11dbe8ea41fc4f709427eed1ce539e17701c；git merge --no-edit main返回Already up to date。已读README、最新STATE-2026-10-19、decision-log末尾、学习协议、代码提案闭环和保留说明。独立执行，无下级agent。未改模型/账号/config/权限；没有读取本学习者的原生turn_context/请求回执，因此不声称实际high档位已核生效。历史对局大脑配置不是本学习者回执。

十份原提案的登记SHA全部核同。原exp路径失效的八份从留存20261017-091302-s2-strategy-proposal归档仅提取精确Markdown，逐文件bytes/SHA与原登记及归档manifest均匹配；未重建旧树或展开整仓。recovered-proposals.json记录归档/member/清单出处，另外两份按原路径核同。91cc原文与20b9原文相同部分复用阅读，完整检查其分母修正diff；旧错误原文保留。本次产物均在忽略的本批scratch内。

## 结束身份及证据分母

十个锚点各有一条SILENT且ended非空的runs原行，全部按offset/bytes/SHA回读核同，原文在run-identity.json。runs冻结390048字节，前缀SHA256为98c9c099307362326bbbf64d0ad174ef89cd46be7a45f9734c107c3c34928065。进阶分别记，A3/A4/A6/A7不算A10策略验证。

| 局号 | 进阶 | 结束层/胜负 | decisions | states | Jev匹配 | 完整读题行 |
|---|---:|---|---:|---:|---:|---:|
| K2JAGKVJAWZJ | A10 | F46/负 | 722 | 814 | 160 | 1 |
| 10GPK5XGHCK3 | A3 | F48/胜 | 986 | 1020 | 318 | 0 |
| UJ0K3G10609Y | A10 | F48/负 | 913 | 958 | 221 | 0 |
| 79UCJ0K6R9C1 | A10 | F14/负 | 235 | 243 | 89 | 2 |
| 9YBKCNBFP0X5 | A4 | F48/负 | 1035 | 1065 | 233 | 1 |
| UACFSW4VDDLD | A6 | F48/负 | 1202 | 1236 | 193 | 0 |
| 4Y94N8RDPGPM | A7 | F48/胜 | 693 | 719 | 129 | 0 |
| TCFAHJ9K19VY | A10 | F17/负 | 476 | 489 | 88 | 0 |
| UMVLWER4CD98 | A10 | F48/负 | 1165 | 1202 | 266 | 0 |
| TXZ6RVMQA09D | A10 | F49/负 | 762 | 840 | 171 | 0 |

机械扫描8189条decisions、8586条states、1868条Jev匹配行，不等模型逐题逐帧阅读。完整阅读4/1868条Jev原行，共5个问题（T11含play/survival），其余1864条未完整读题。question-coverage.json逐行记录精确decision_id、原始ref、是否完整阅读和具体未读理由，不用最后五条代全覆盖。10G/UJ/UAC/4Y/TCF/UMV本次仅核身份、配置和机械事实计数，不声称其问题/机制重验；TX另核续战边界，未完整读其Jev题面。选题围绕原派发提案的感染、环、铁心和饱和探索窗口，其他题本批不作游戏判断。

另为原派发6353/9e5d/20b9/91cc/f35a中的具体证据补核9R916WW0V65N与T0DGVABPV60U；两局先以runs原行核为已结束Silent A10，仅补25个state和2个decision窗口，未冒称两局全局或13局分母重验，未扩充十锚点。supplement-manifest.json保存结束身份和同一冻结前缀SHA，原行在supplement-states/decisions.jsonl。补充窗口先从原报告定位行号，再沿原日志机械流式定位offset、bytes、SHA并拒绝错误身份；正文/时间/相似question_id不建立所属局。

## 冻结流、原文关联与缺失

根evidence_summary、指定V6四流extract和默认八流extract均完成退出0；实际读取两个manifest。两次公共四流切点和前缀/输出SHA一致。各evidence.jsonl保留逐行offset/bytes/SHA、source_size、显式身份和decisions精确关联出处。所用原始行按这些位置回读并比对解析对象。

| 流 | 冻结字节 | 冻结前缀SHA256 | 本批匹配 | 无效/截断 |
|---|---:|---|---:|---|
| states | 14718684631 | `4169a0922f5b4c700a56eabf6283d7ada026b4f71b82e8ace11f426d198e3716` | 8586 | 2/0 |
| decisions | 2967844963 | `8d339ded386f895656fc2f166ac65e8a3a61dd837781720da98d1dec37f45c25` | 8189 | 2/0 |
| sl-attempts | 49894916 | `f681c8043c5df36b2ca99051d0a7bdbd1a337cc9e6346b96f6fbddd269ae1c64` | 61 | 0/0 |
| run-config | 2240582 | `80ac2f7d9030022fa59a5f5861eccfea3a9423e873bb3ddac6d9d7c921406d40` | 10 | 0/0 |
| run-plans | 10120201 | `13d26e121b50e4b14405327d22328245f5c846f315ce95ed2d38032053b68ed1` | 66 | 0/0 |
| brain | 1117125269 | `c731a1a300e41868ff996bfe9d08b13476f83788e0223f9b2f68368d6ccc5df3` | 410 | 2/0 |
| v6-build | 64622743 | `d9d6b2891dc95f42d8081c74fe22fe1cf73eea92d323ba2c08b7943a70f58c54` | 0 | 0/0 |
| jev-prompts | 2181673141 | `bc7b6d70b2cdccdf3943d9be85511be62155797836c15dfb84989d67ac1f81cb` | 1868 | 1/0 |

v6-build文件存在，十局均no_match，原始匹配流为空；不是全源文件missing。没有可读的本批entries、jev_answer、fallback、unknown四类行，四类内容均未知，不用空匹配补零、不从后来局借证。十条run-config均Jev enabled=true/context=v1、没有V6字段，显式V6 off与on均无法证实。不能由无匹配推关掉V6，更不能称本批正式V6发布/消费。

1868条Jev匹配行均显式run_id及fingerprint.run相容，并由decisions原始decision_id精确核关联；均有answers，error字段在选中行中未记录。全源另有1条Jev invalid_json无法归属，不据此记本批网络错误，也不因选中行无error断言所有请求或动作成功。全源decisions另有2条无效行、unknown_identity=1934/unmatched_decision_id=1395；states有2条无效及3332条unknown_identity；brain有2条无效。原gap_refs保留，不能挪入本批，也不能把未知身份计零失败。所有已冻结流incomplete_lines=0只说明该切点无半行，不保证历史对局/早期SL完整。

本批8189条decisions均没有gate_reject和selection_dispatch字段，记历史未记录；不能改写成false、无拒绝或派发已成功。chosen、result、rationale/SL覆盖与后继state分别核。extract的content回执pending_host_seal=true/deferred_errno=18，表示沙箱跨文件系统封存待宿主；本地字节核同不冒称宿主封存完成。

历史完整题面含potion_experience.data中的其他角色旧统计；本次仅作为原请求字节保全，明确不将其作为Silent事实、参数或支持分母，不查询其他角色库。题面内其他历史经验、所谓“exact”及预测数都不是本批实盘结论。

## 完整问题、答案、实际动作与后果

以下四条request/state/questions所有候选、answers及原元数据均完整读取；原行在raw-questions/，没有截断替代。四条decisions的questions/answers与对应请求逐对象核同，输入state以已核显式run + observed_ts + 完整fingerprint匹配唯一帧。时间只核输入状态，不用于归属局号。selected-cases.json保留完整原执行和首个后继state；state-windows.json保留102条相关原帧，不表示模型完整阅读102份原始state。

| Jev原行 | 精确decision_id | decision原行 | 输入state原行 | Jev offset/bytes/SHA256 |
|---:|---|---:|---:|---|
| 14670 | bfd3072e-b498-43c9-9231-90b7015bcb2c | 217711 | 222008 | 229241722/26741/`fece12cebc68ca3b6103ce99cf4fbdbc08f9db80ad9098e35075cf5b6dc95088` |
| 31081 | 531c7dee-53ae-4094-8604-5446733ee1a9 | 286120 | 292785 | 447467116/12458/`e08d72eb672624cb9c014f6941cad50d1531e06a050368b1d9d61ffe2b8fa3ff` |
| 31268 | 16b7f3b6-06b0-4839-8d82-34a90a97f362 | 286709 | 293457 | 450284153/12323/`f326ea29d4945f248aa5caa3235746e2c7bce512e4496b41a4f14a8de541650c` |
| 31272 | 22489efa-45e1-48a1-97db-9be938ff4633 | 286715 | 293463 | 450323649/6368/`c2fc949337b8effa42912b1ea6b5180b0382115284495f47406f2b13fc7dcec8` |

1. 79UC F14T10，J31268：两条牌线及两个未模拟毒瓶选项完整；两牌线各8/8短推演死，Jev选plan2、confidence .85。D286709—286712实际坚韧之环、偏折、致命毒药至#1、结束均completed。S293457—293460为13HP、挡0→7→13、敌#1毒0→5；S293461 T11为2HP/7挡。两感染的6持牌伤与敌9+9使13挡后实际损11，吻合所选线当轮血价，但全败样本不证明实盘必死，未模拟毒瓶选项也不是0伤害或0价值。

2. 79UC F14T11，J31272：完整play四选项和survival四选项；题面明确毒瓶未模拟、饮后重算。Jev选p0→e0、confidence .55，survival=lethal、.95。D286715实饮completed，S293463→293464目标8HP不变、毒4→10，药槽清空，玩家仍2HP/7挡；D286716结束completed，S293465玩家0HP、目标仍8HP/10毒。三感染9伤先吃完7挡并扣尽2HP，未出现毒结算。这只证明该已见窗口，不能推出提前一轮喝药可胜或新药价。

3. K2 F27T2，J31081：完整三方案；区别包括本轮饮铁心、后轮可饮和整战不饮。Jev选plan1、.95；D286120—286124依次中和/两打击/铁心/结束，均completed。首动作中和不等药已饮；D286123与S292788→292789才证明饮用：57HP不变、原挡仍0，覆甲从无到7、药槽清空。S292790 T3仍57HP/0挡、覆甲6。不能把药直接记为即时7挡，不能用3.4/4.6/9.5预测血价代实盘配对或拟持有门槛。

4. 9Y A4 F48第6试T7，J14670：六候选及全部五次previous_attempts完整读取。Jev选plan1（偏折/防御/毒/打击）、.76；D217711实际chosen却是REND，rationale/sl_explore明确改撕碎/防御/打击。D217711—217714均completed。S222008—222011为21HP、挡0→1→8→9、聚合体126→111→102；S222012 T8为8HP，聚合体95/女王298。第4试同入口S221909—221914实际17挡、21→16HP、聚合体110/女王292。末试多损8、总净扣敌38对旧29；女王反多剩6HP。完整题面的候选伤害27/28和当前原帧29/38分列，不能把题面当精确实伤。两线rollout都24/24死，SL的覆盖不是Jev自选，也不是已证胜率收益。后继行动/分配改变，A4局不验证A10固定探索排序或杀序。

## 机制、资源及补充窗口

79UC普通环：S293426→293427实0→5挡，power=2；S293431 T3及293432 T4各5挡，剩余次数递减/消失。T10的施放7与T11轮初7已在上文核。该局T2无敏捷、T10有2敏捷，不把5/7混成恒定值；当前窗口没有升级/重放/叠层以及跨SL恢复的施放快照证据。

79UC赢战链按实际状态：F2/3/4各56进出；F6 56→47；F8 47→7；F9休息7→28；F11休息28→49；F12赢战49→30；F13休息30→51；F14以51入场至死亡。boundary-audit.json逐房保留首末原始ref，营火各实回21。没有实到未来F17或另一线路，不能把未来火堆当当前资源，也不从净损40推毛伤40或由失败拟路线安全线。

K2来源口径机械复核：brain=48且engine均codex；decisions中codex=71，其余code=491、jev=160；states=814、run-plans=7，和原勘误一致。71不是独立脑调用次数，code桶不能把原runs里的jev-plan205漏当无动作。provenance-counts.json保留计数。没有定位一个实际消费错误计数的源码，不为计数勘误制造策略提交。

TX F48末S281564 MAP为4HP空药，下一S281565 F49初帧仍4HP空药，S281566可操作前已0HP；首战开始也有60→56的两帧。只确认这些入口/出口差，来源效果不能由差值补造。9R补读S295422→295424为F48结束12/74空药接F49仍12/74空药，前战能力已清空；S295546—295551三刀各扣8、第三刀敏捷5→6且旧挡仍0，撕咬再扣10，最终玩家死亡、两敌余207+361=568。缺复活事件/剩余充能真值，未假设尾巴仍可用；没有留药、改线同条件完整后继。

T0补读首/末F48T2输入S296424/S296633均38HP、敌86/111和同手；首段小刀后扫腿+15挡并带毒刺击，S296428 T3仍38HP；末段小刀后速行者、带毒刺击、提前狡诈添三刀，最终旧挡0，S296642 T3为26HP。D289584/289585记录SL覆盖，后者理由含“every untried line dies more often ... known to fail”，实际速行者completed。原首试药尚在、末试T2已饮，后继手牌也变，所以多12HP损失和多20净扣不能都因果归单张换线；首试后来也没有整战胜线。本批未完整读取这两条补充decision所关联的Jev请求，不把其内嵌题目或数字计为完整读题覆盖。

9R/T0和同局多次SL均不算新增独立局验证。13支持局55试5赢/真正重打12场54试4赢是91cc原冻结勘误，本批没有重算13局，保留其限定身份，不能用本次一局局部状态升级可信度。

## 当前消费者与十项处置

source-audit.json保留本基线八个相关源码叶的Git blob及文件SHA。核对时live为64c218a04ebe029fdda0b5f25025302ebf2a4124；2e6fa2e5c68be70efb2ee87bee58f2cb3128bfb2（持牌伤先于毒）和b831407a8ed13bcb9b5359b0d3e1ae84624d5571（螺线窄模型）均为实际live祖先。当前turn-solver.ts:3340起确实先付持牌代价再决定能否结毒，card-model的heldPenaltyOf从渲染文本读伤；double-boss-start已有资源接续框架和观测毒入口。存在源码/祖先不等完整宽提案implemented/duplicate，也不等自然采用或收益。历史run-config全部dirty，当前源码不是当时完整代码与知识联合快照。

- `silent-proposal-650ea306e8627f9e`：waiting。原始流复核K2为48条Codex脑调用、71条Codex决策；未定位消费错误计数的源码，关联四宽机制提案未全部完成消费者认证，计数勘误不等整项实现。

- `silent-proposal-60e68d681e861d1c`：waiting。79UC持牌伤先于毒的窄路径已有live祖先2e6fa2e5c68be70efb2ee87bee58f2cb3128bfb2；普通毒瓶、头骨/制品及其他入口组合缺固定消费者验证，不能整项duplicate。

- `silent-proposal-9aa48a84227bcdb5`：waiting。79UC已核赢战和营火实际HP链、饮药仅加毒的当步后果；未走路线及不同饮药时点缺同条件完整后继和按局留出，不能拟路线或药价。

- `silent-proposal-7cfd0f9b6b0fbbda`：waiting。79UC普通环5/7挡及后继轮初挡已核；缺跨重问/SL恢复的施放额度、剩余次数联合入口与升级/叠层/重放组合消费者验证，保留现行为。

- `silent-proposal-e6f9cb57c1204036`：waiting。遵循原combat/potion领域更正；更正本身无独立源码实现，原毒药组合消费者缺口仍在，不把terminal误标签当终局规则改动。

- `silent-proposal-6353ffbadaaac619`：waiting。补核9R以12/74空药从F48接F49并末T2实死；复活独立事件/剩余充能真值、固定血药/后继抽弃/种子的两战配对及独立留出仍缺。

- `silent-proposal-9e5d50fdd7bf1fbd`：waiting。9R与TX实际接续资源有原帧；缺受控保药/改线两战结果、复活真值及独立留出，已有联合框架不等药水持有价/终局HP参数学习完成。

- `silent-proposal-20b9df170d51b280`：waiting。9R末T2三刀各8、第三刀敏捷5到6而旧挡不倒补已核；宽机制的阶段/魂缚/冰晶/滚石等组合消费者未逐项认证，9Y的A4换线血价也不能验证A10单因转胜。

- `silent-proposal-91cc7fd647077569`：waiting。保留13支持局55试5赢、真正重打12场54试4赢的原冻结勘误；本批只补核9R局部，不重算完整13局，未定位消费旧固定分母的源码。

- `silent-proposal-f35a311b35f2b12a`：waiting。补核T0首末T2同38血入口，末试少挡并提前饮狡诈后实损12；原首试也非整战胜线，药时点/后继抽弃同变，缺正确模型下固定条件整战配对与独立留出。

原提案id全部复用，不另add重复id，不直接修改code-proposals队列或根learn.json。逐项proposal_results.json和result.json交原调度器消费；等待项留队，未关闭学习父要求。账本只经根ledger.py追加本次报告/提案链接和复核说明，不改旧claim/evidence/status/version、不重复增加支持局、不标shipped。具体执行回执及保护字段读回另存本目录。

没有生产代码变化，撤源码失败/恢复通过不适用；tests固定为tsc=null、vitest=null、cases=null，不复用历史测试绿灯。离线审计/原字节校验不是生产tsc/vitest。没有提交，不触发提交前gitleaks；没有合入或版本号、规则实际变更双通知。不运行play、不推送、不操作STOP、不停对局、不修改运维prompt或其他角色知识。最终HEAD仍为base，工作树干净。

历史题面含跨角色统计的限制随本报告交运维沿ops→watcher→Roy原链处理；本任务没有投递/确认回执，不把报告落盘或排队说成已送达，不代填ACK。原科学要求、缺数据和未完成项继续保留。

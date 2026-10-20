# Silent十项策略提案证据复核

记录时间：2026-10-20T23:57:12+08:00；批次20261020-234301-strategy-proposal。

结论：十项全部waiting；本批未形成足以修改策略的新增证据，未改源码、知识或参数。fixes=[]、merged=null，tsc/vitest/cases均null。没有提交、合入或新增发布版本，不声称本批已入库、下一局采用或自然收益。

## 身份与输入

开工git status为空；HEAD=34a4d78b914a9a758b5757e30a3035aa18109314。按普通任务执行git merge --no-edit main，回执Already up to date，HEAD未改变。实际learn.json本批为task=strategy-proposal、character=silent、reason=proposal、工作树吻合，领取十个proposal_ids，无research_request/implementation_request，见dispatch-snapshot.json。根notes/strategy-research-silent.json属于20261010旧专题，批次/工作树不匹配；本批未读取其work_spec或manifest、未转专题，也未读取其他角色知识。

五局runs.jsonl原行均为SILENT/A10、ended非空且victory=false：NHA F33、P74 F23、G33 F48、RC61 F33、BTS F31。runs.evidence.jsonl保留各行offset/bytes/SHA及身份出处。run-config各一行，原code均dirty，原运行SHA见原行；不以当前源码冒认当时dirty树。run-config没有V6字段，不能补成显式off；历史V6无匹配与显式off分开记录。

已读README、最新STATE-2026-10-19、decision-log末尾、learning-protocol、learning-code-proposals及保留文档。最新STATE中的旧停止状态由更晚decision-log接续，未操作STOP、游戏或其他在途任务。仅从本角色五局及十原提案学习。历史题面内已有跨角色统计只作为原请求字节保全，明确不作Silent事实、样本、分母或参数；未向其他角色取证。

## 冻结与完整性

先运行指定根evidence_summary入口，得到evidence-summary.json（32826字节，SHA256 768de69219fbaab927fb09848fc29e2f4a4cc0d7b93671de4a83dc4d51aa47eb）。摘要仅作索引，没有将最后五条当完整覆盖。随后运行指定extract_evidence --streams v6-build jev-prompts decisions run-config；另外用同一入口提取states/sl-attempts/runs/run-plans/fight-plans。两个evidence-manifest.json分别保留真实冻结source_size、源前缀SHA、逐行引用、身份/缺失统计。流间切点分别冻结，不将先后切点伪成单一时间快照。

| 流 | 冻结字节 | NHA/P74/G33/RC61/BTS选中行数 |
|---|---:|---|
| v6-build | 64650823 | 0/0/0/0/0（各no_match） |
| jev-prompts | 2205542104 | 123/70/143/147/139 |
| decisions | 3009694178 | 584/395/850/674/635 |
| run-config | 2258666 | 1/1/1/1/1 |
| states | 14770296666 | 602/410/879/694/653 |
| sl-attempts | 50161407 | 7/5/8/7/4 |
| runs | 391561 | 1/1/1/1/1 |
| run-plans | 10142178 | 5/3/6/7/5 |
| fight-plans | 2233957 | 0/0/0/0/0（各no_match） |

V6流在本切点存在且扫描616行、本批严格身份零匹配；故entries/jev_answer/fallback/unknown均没有本批可读原行，不解释成各值为零，也不拿现代V6题面替代旧局。Jev本批622条均call=ask、带answers、未见error字段；仅为字段存在性统计，不表示622条均逐题完成科学核验。匹配decisions行中fallback=true为0；gate_reject/selection_dispatch字段均不存在，不能将历史未落盘字段写成“已核无闸拒”。

全源decisions有2个invalid JSON、1934个unknown_identity及1404个unmatched_decision_id；states有2个invalid JSON及3341个unknown_identity；Jev有1个invalid JSON；这些均不据正文或时间邻近归到本五局。每流incomplete_lines=0是本切点扫描结果，不代表历史从无缺帧。有限gap_refs只有最后5个定位入口，计数不是5，未知身份不能计入角色分母。内容发布回执pending_host_seal/deferred_errno=18原样保留：本地有真实证据文件且重读SHA通过，不冒称宿主已完成共享对象封存。

## 原始题面覆盖

完整实读5题（每局1题），包括整个request.state、questions所有合法选项、answers/错误有无、decision chosen/result及相关SL覆盖；对这5个精确decision_id另扫描冻结decisions全前缀，仅匹配到原5行，无额外gate_reject/selection_dispatch事件；因此记“本冻结原日志没有对应事件记录”，不升称执行闸完整性。保存exact-decision-events.json。全部622条Jev与其decisions原行按offset/bytes/SHA重新seek核验，并核run_id/fingerprint.run/精确decision_id身份一致；不使用question_id相似、正文提及或时间近邻归属。

实际完整阅读列表如下，全部decision_id和请求原文见fully-read-cases.json；每题完整SHA与关联决策原始引用见question-coverage.json。

| 局/窗口 | decisions行 | Jev行 / offset / bytes | 答案与实际执行 |
|---|---:|---|---|
| NHA F33第五试T1 | 277250 | 28972 / 416210591 / 24771 | Jev选plan4斗篷（0.40）；SL覆盖成plan1回响，chosen卡索引2；completed。后继277251/252与states283480–283483核30→23血。 |
| G33 F48首试T1 | 277909 | 29076 / 417753541 / 21500 | Jev选plan2闪亮先手（0.68），chosen闪亮；后继277910–277915执行余像、防御等。states284162–284171见先闪亮、后余像1层；后续喝能力药/选余像为另两题，仅读动作链，未冒称本题已执行药水候选。 |
| P74 F23末试T3弃牌 | 278543 | 29198 / 419812798 / 6166 | Jev选card2精确切击（0.52），chosen option_index=2、completed；states284817→284818确实移除，不能把原零损计划沿用。 |
| RC61 F33第三试T4 | 279117 | 29312 / 421659333 / 18915 | Jev选plan1（0.20），SL换成plan3刺击碾碎爪，首动作毒雾相同；279118确认改目标。生存者后无手牌，279121末攻击未派发而先SL恢复，不能记实死。 |
| BTS F31 T3抽弃后 | 279854 | 29484 / 424384425 / 21420 | Jev选plan2防御+两刀石虫（0.86），3/4样本胜；279855–279857完成，states286166–286170核损7，T4另线后286174实死。 |

其余617条逐条保留身份/原字节核验和未全文阅读标记，原因：本批只对十原提案作有界关键窗口复核，没有全题逐样本重放；未完整读者不作新规则或收益证据。按局完整阅读/未完整阅读为NHA 1/122、P74 1/69、G33 1/142、RC61 1/146、BTS 1/138。selected-cases.json另含11个初定位候选，其中6个只索引，不能误当11题完整覆盖；唯一完整覆盖清单为fully-read-cases.json及question-coverage.json。

## 后果、反例及知识边界

模型只读有界状态和结构化事实，未将整份states灌入上下文。state-windows-raw.jsonl保留131行原始窗口及完整哈希出处，state-windows.json是同131行的资源/手牌/敌人投影；另mechanism-window-raw.jsonl为P74 F17 T1/T2/T8及次轮15行原始核验。

P74：F22 states284730–284766核129血主怪、幻象复活、53血进场至奖励9血，再以9血空药进F23；没有补药/回血的原帧，不以赢战当零消耗。主怪最终归零中间帧仍缺，不能用奖励帧推算每个结算来源。F23末T3：原278542安排生存者→紧勒卵→毒雾→精确切击，预测损0；弃精确后278544改紧勒丝，states284820为1血16挡、石16+卵8来袭，284821卵毒后仍2血、石眩晕而玩家死亡。精确切击牌面7随手牌变化，不能把7当另分支整线恒伤。首试卵更早结束、第三试原线不同，不是同盘保留线控制；没有保贪婪整战实打胜线。F17普通触媒1层、火焰182→181/滑溜8→7，T2毒12→10但HP180→178，T8无攻击44→21；仅限已观察来源，不扩大一般喝药规则。

RC61：原T1 states285315–285321同52血，先两打击+刺击，药后16挡，次轮48血、爪189，净敌减30；末T1 states285491–285497以触媒换一打击，药后12挡，次轮44血、爪196，净敌减23。确有7伤/4HP差，后轮行动及抽弃未控，同局SL不算独立局。两T1的完整Jev题面本批未实读，因此不声称对其所有候选做过当前模型验证。第三试T4原279117题面预告后继打击转火箭，但states285414–285415从生存者+打击变空手，57来袭仍在；279121未派发末动作、285416已回T1。这个历史可达性窄根因已有live修复，不能再由旧预测拟合新阈值。

NHA：完整题面所有选项24/24死，plan4和plan1仍有即时血价/输出差；Jev答plan4，实际SL覆盖和后继回执支持“答案不等执行”。states283480–283483的30→23只对应这一请求后的执行窗口；未把旧提案全T1净扣24与本题面dmg20混成同一测量边界。没有同后继胜线或另路线保药对照，保持规则。

G33：首题候选余像先手与闪亮先手，预测挡18/10、伤75/107；实线先闪亮再建立余像1，后续能力药另题。未执行的余像先手不得当收益。BTS：抽弃前279852和重算后279854不是同完整线；后者plan2/plan4并列且3/4胜，实线完成后21→14血、甲虫力量2→4，末轮22攻击、5牌挡+1覆甲、14HP实死、虫剩13。不能用一次死亡把75%判为纯bug或强制先杀甲虫。

## 当前实现与逐项处置

受核live=75c4a1b9611b2566425e4aa14472c4d1c81673f2。e784dd9f043bf87c29109573f48975f9903280d3（投斧首牌身份）、bf423c173d3be348a4ad714e1d26516df619ff41（普通生存者唯一余牌消费）及66283dd9982bdd7f480da7a4d9bfefea0572a9ac（含现有选择事实接线）均核为实际live祖先。六个受查源码文件与本工作树SHA逐一相同，具体见source-proof.json，不把六文件字节等价推广到整树或自然采用。

现selection已有discardPlanFacts的后继/预测失效信息及survivorDiscardFacts的保留手牌、费用快照，并明确不推演伤害/胜负。它们不是四弃牌分支的完整联合求解，也不是能力长期价值和整战收益验证。因此两个原提案的窄子项已经有实现，但十个复合原id均不满足整体implemented/duplicate，逐项保留waiting。完整原文/账本/缺口见proposal.md及proposal-results.json。

- **silent-proposal-9952ee8e8df9a0fe**；账本silent-0019,silent-0020,silent-0065,silent-0264,silent-0079；waiting：NHA2KW0RB7VP F33 T1原题Jev选斗篷，SL实际改回响且30→23血；完整抽弃分支和整战后继未受控，没有独立A10留出验证，不能由全败饱和拟合新SL/终局门槛。
- **silent-proposal-47be799a87af03be**；账本silent-0205；waiting：P74C04AEPL1F F23末T3弃精确切击后1血16挡对24来袭实死；现live已有计划失效提示和保留手牌快照，但四合法弃牌分支的动态伤害、触发、费用及剩血联合推演仍未核齐。
- **silent-proposal-3a5274da3c42672a**；账本silent-0039,silent-0196,silent-0013,silent-0180,silent-0224,silent-0227,silent-0027,silent-0011,silent-0006；waiting：P74C04AEPL1F F22可核53→9血赢战并以9血空药入F23；主怪最终归零中间帧仍缺，缺当前模型逐来源差额及跨战保药实打对照，不能改药水或目标规则。
- **silent-proposal-bc4b92d590f2c4ce**；账本silent-0092,silent-0023,silent-0021,silent-0057,silent-0205,silent-0079,silent-0266；waiting：投斧首牌身份子项已有live祖先e784dd9f043bf87c29109573f48975f9903280d3；G33HU22H2543 F48首题/实线与P74末弃牌已核，但动态弃牌分支、整线归属和能力长期兑现尚未联合验证，父提案保持waiting。
- **silent-proposal-f52fbbab4dccc3b4**；账本silent-0019,silent-0020,silent-0090,silent-0069,silent-0039,silent-0064；waiting：G33HU22H2543/P74C04AEPL1F原提案资源链保留；本批核女王首题和P74获胜战→终战真实入口，仍无同条件另路线、保药完整后继或消费者校准，观察耗血不足以制定路线/SL血价规则。
- **silent-proposal-10f37c0edd3d24a6**；账本silent-0006,silent-0011,silent-0027,silent-0046,silent-0013,silent-0180,silent-0196,silent-0255,silent-0198,silent-0204,silent-0069；waiting：P74 F17 T1/T2/T8原帧支持滑溜下火焰扣1、临时减力及普通触媒分账；缺当前生产模型的逐样本完整轨迹及隔离的新确定数值失配，未重标机制或药水参数。
- **silent-proposal-3f82387e2e179703**；账本silent-0079,silent-0027,silent-0065,silent-0080,silent-0088；waiting：RC61MFQM63Y6 F33首/末T1原帧核30→23扣敌、4→8损血；同局后继不同，缺受控整战与独立A10时间留出，T4朝向的旧唯一余牌根因已有修复，不能据此再拟合SL排序。
- **silent-proposal-aee21084c991abd3**；账本silent-0128；waiting：BTSRF7JL1W1Y F31 T3实际重算题选plan2、3/4胜1/4死，后续T4实死；抽弃前后不是同一整线，缺逐样本轨迹和确定模型失配，一次死亡不足重标概率、成长或焦点权重。
- **silent-proposal-df37594e9b12debf**；账本silent-0021,silent-0027,silent-0057,silent-0065,silent-0079,silent-0176,silent-0205,silent-0268；waiting：唯一余牌弃除子项已有live祖先bf423c173d3be348a4ad714e1d26516df619ff41；RC61 F33第三试T4空手/仍57来袭后SL未派发末攻击，其他多选可达性、最终朝向与整战SL收益仍未联合核齐。
- **silent-proposal-42e81c83b2e1e56b**；账本silent-0019,silent-0020；waiting：RC61MFQM63Y6原路线/实际回复/SL恢复分账保留；缺同条件路线、锻造及保药完整后继与消费者验证，本批未重算原73局历史统计，不能从未来营火投影偏差推定新策略。

## 验证、记录与后续

没有生产源码或知识变化，因此未跑tsc/vitest、未做撤源码/恢复试验、未提交，不编造测试成功。审计原字节核验不是生产测试。临时audit.py两次启动错误及修正保留audit-startup-failures.txt，最终审计rc=0；不将该rc当游戏模型准确性或收益。未重算原提案70/72/73局统计，未重跑模拟池、dataset、模型/API或游戏；原限制与失败保留。

账本只经根learner/ledger.py update追加32个既有条目的本批报告/提案链接，by=learner:strategy-proposal；不新增支持局、不改claim/evidence/status/version，不将已有历史shipped状态当本批上线，不降改历史状态。无新代码提案主题，不重复CLI创建id，继续使用十个真实CLI原id；结果由调度器消费proposal_results，不直接改队列/learn.json/请求。

结束前核git status为空、HEAD仍原base、source.diff零字节。保留scratch和失败材料，未删自身工作树。无合入故不制造eval编号、上线记录或Roy规则变更双通知。后续需补每项所列具体分支、当前执行模型轨迹和独立Silent新局验证；等待不关闭原提案或科学父要求。资料泄漏扫描与最终机械检查结果见final-verification.json。

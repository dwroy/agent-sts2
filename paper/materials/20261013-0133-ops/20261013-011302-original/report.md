# 静默猎手策略批次回报

时间：2026-10-13T01:26:02+08:00；batch：20261013-011302-strategy-proposal。

**结论：十个派发提案全部waiting，无新源码、知识改动、提交、合入、eval版本或shipped登记。** 已有实现仅覆盖原提案子项；剩余缺数据逐项保留，不能用局部实现关闭整项。

## 身份及基线

工作树：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-011302`。report.base=`fbc02e018011d28cd6ef74664878ff4369358cc9`。开工git status干净；普通批次执行`git merge --no-edit main`，返回Already up to date。本批learn.json为task=strategy-proposal、character=silent、reason=proposal、state=running，proposal_ids恰为下列十项，无research_request或implementation_request。普通专题根请求绑定旧批20261010-150327，不匹配本批，按领取队列处理。未读另一专题替代身份，未改请求、learn.json、租约或旧父请求。

## 原始证据与身份

| 局号 | 进阶 | 决策 | 状态 | SL原记录 | 终层 | 历史源码 |
|---|---:|---:|---:|---:|---:|---|
| VLZ6CCT8AQ0A | 10 | 699 | 729 | 2 | 45 | ac321b1f+dirty |
| 8JRE1C4H4Z2W | 10 | 659 | 676 | 7 | 33 | b0f41f03+dirty |
| CA5KE8GFJ9X2 | 10 | 265 | 282 | 0 | 13 | 33f02a6f+dirty |
| 5PM6JAQG6FNQ | 10 | 638 | 660 | 7 | 39 | f56da22b+dirty |
| 61E2QS63Y9WU | 10 | 443 | 462 | 7 | 28 | 03d50f0b+dirty |
| DUZUBAJ3A8GP | 10 | 602 | 623 | 6 | 30 | 93298980+dirty |

六条runs记录唯一且角色SILENT、A10，决策数与runs完全相等；六局均失败。总计3306决策、3432状态、29 SL记录，共6767原行。逐行保存原全局行号、字节偏移、长度、SHA256，并按原文件seek读回验证，未重写logs。SL记录数含其他已保存战斗，不等于失败尝试数。所有历史code都带dirty，不能用其短提交号冒称历史完整执行树。

## 核实端点与反例

- `silent-proposal-89354805ee4d7e77`；账本silent-0237, silent-0238。VLZ6CCT8AQ0A F35 T1、F43 T1/T2、F45 T1；states 275564→275565、275679→275680/275687、275728→275732；decisions 269706/269707、269754/269755。 F35实付2能量并升级剩余已观测牌；F43原候选43伤/14损，施放后51伤/13损，与整轮端点一致。F45持有神化但最后弃掉，未获得该升级。普通升级、后续抽牌传播和参考字段已有实际live源码。 反例/限制：F43施放后仍整场损57；F45未施放而败，两场起点不同，不能证明必打或转胜。
- `silent-proposal-f2bfceddb1898dca`；账本silent-0106, silent-0019, silent-0201。VLZ6CCT8AQ0A F43终态、F44休息、F45 T1/T4/T5；decisions 269748、269754、269770；states 275728→275729、末轮端点见turn-observed-endpoints.json。 T1首题CURE_ALL为707ms、1/12，rollout为horizon1/samples1/best=null；后题12/12但盘面已改变。实喝只见HP67不变、能量1→2、手牌1→3。T4少损线实际13损/24伤；31损/32伤线未实打。 反例/限制：1/12和12/12不是同状态、同模型覆盖、同随机输入的配对试验；全败或best=null也不等于确定实盘必死。
- `silent-proposal-283a164780d11e69`；账本silent-0237, silent-0238。与89354805ee4d7e77同源的VLZ6CCT8AQ0A F35/F43/F45；经验silent-apotheosis-combat-upgrades，账本silent-0237/0238。 原经验提案的Markdown SHA已核；与postmortem神化提案共享同一观察，不另算独立样本、不另建提案id。 反例/限制：经验已经有代码链接或部分升级实现，不证明施放生命周期及未知组合全部实现。
- `silent-proposal-ebbfe3b97548756d`；账本silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。VLZ6CCT8AQ0A F43 T1—T5、F45 T1/T3/T4/T5；包括神化、步法、勒紧、口红、现场覆甲、临时减力、触媒与休息资源。原15条经验及14个账本id见原提案。 F45 T4已核13损/24伤；T5末前32HP/20挡、已减力后的攻击14+11+34=59，显示攻击减挡39而HP端点最多损32，三敌结算后仍未死。现场期限与已结算/未来毒应分列；已有事实与观测消费者不能代替整个机制包验收。 反例/限制：单轮相符或持有能力不代表整场持续收益；零血截断的净损不是未截断伤害。该包跨进阶历史分母不能当作一次联合机制实验。
- `silent-proposal-e5b87be50f28f311`；账本silent-0079, silent-0021, silent-0125, silent-0018。8JRE1C4H4Z2W F33首试/第三次T2（decisions270216/270282，同fingerprint）、第二次T5（270264）、末试T11；另F17 T6。 T2两线实损3/15、扣10/17，确证多12血价、多7当轮伤；第三次SL替换并非Jev原答。T5原候选16损/43伤、护栏后4损/25伤。末试T11为5HP/22挡对37攻，实损端点封顶5而显示攻击减挡15。当前消费者已有候选、派发、相邻观测、终局子项。 反例/限制：首试与第三次都在T7判死；末试多保血延到T11仍败，不能认定所有防御换线错误，也无原线完整获胜反事实。
- `silent-proposal-49632bc4878fb597`；账本silent-0005, silent-0231。CA5KE8GFJ9X2 F13 T1—T5，核心T5；末轮2HP/10挡对14攻击，终态0HP。原账本silent-0005/0231。 来源局观察两次加压后的力量0→4→8，喷水11→15→19；虚弱后11/14仍保留成长。计划中的步法没有取得，不能补正敏捷。 反例/限制：当前虚弱不取消独立成长；末轮10挡与14攻之间的4是显示需求，端点实际只损2。
- `silent-proposal-66532328a585941f`；账本silent-0021, silent-0009。5PM6JAQG6FNQ F39末试T2；decision268455、states274379→274380；反例F33胜场。 未建立毒雾且目标无毒时，咕嘟冒泡实付1能（5→4）、玩家HP29不变、敌方端点不变。拥有组件不能记成已建立输出。 反例/限制：同局F33已建立雾3/触媒1/群蛇4并赢，但敌人、资源和生存条件也改变；不是同盘启动顺序对照。
- `silent-proposal-43a76a31ba7bdcfa`；账本silent-0030, silent-0027。61E2QS63Y9WU F17 T5/T6；states273502→273504→273508；T6防御decisions267612/267614、states273504→273505及273506→273507。 吸取后玩家力量2消失、敏捷−2，敌力量2；T6两防御各3挡（0→3、3→6），毒17+16使敌67→34。该战首试60HP进场、七轮赢，不能套其他局失败。 反例/限制：已观察毒不依赖当前负敏捷这一端点事实，不证明任一SL重打可救活或扩大名单必有收益。
- `silent-proposal-5264153a4a4b0e5c`；账本silent-0039, silent-0209。61E2QS63Y9WU F23 T3/T4/T5；核心states273593→273596，T4本体76→41、幻象14→2，玩家净损15。 两次航行后力量0→3→6；T4当轮合扣47而幻象仍剩2并攻击，直到T5才退场。当前净扣不能直接等同敌方退场。 反例/限制：focus幻象39伤/零损候选没有完整实打后继，不能据其当轮值宣称整战更好。
- `silent-proposal-bddfa690a84e03d0`；账本silent-0128, silent-0079。DUZUBAJ3A8GP F30 T1—T6，四次尝试；核心末试T6为1HP/16挡对22攻击、终态0HP，SL原记录914—917。 睡3/2/1后T4自然醒，后续力量2→4、攻击22；四次均败。原冻结输入与消费者都保留，不用四次尝试扩大独立局分母。 反例/限制：末试T4较首试多扣3敌HP却多损2玩家HP，不能单按敌血替换全败排序。自然醒不构成提前唤醒眩晕链的对照。

## 逐项处置

| 派发CLI id | 状态 | 具体缺数据理由 |
|---|---|---|
| silent-proposal-89354805ee4d7e77 | waiting | 普通升级子项已有live实现；仍缺跨重规划、SL、重启的实际施放生命周期绑定及未知升级、自动动作和属性组合的交互证据，整项不能记duplicate。 |
| silent-proposal-f2bfceddb1898dca | waiting | 缺同状态、同模型覆盖、同随机输入和同总预算的配对收益曲线；707ms与异盘1/12、12/12不足校准预算、留药、护栏或目标规则。 |
| silent-proposal-283a164780d11e69 | waiting | 同源普通升级子项已有live实现；施放生命周期、未知费用、跨轮副效应和自动动作组合仍缺证据，不把同源关系当整个提案duplicate。 |
| silent-proposal-ebbfe3b97548756d | waiting | 本批仅核了原来源局端点和已有源码子项；口红、覆甲、临时减力恢复与未来毒的跨轮联合调用、全部15条经验的逐项消费者证明仍不完整，不能关闭整包。 |
| silent-proposal-e5b87be50f28f311 | waiting | 已有消费者能读预测、派发与观测端点；仍缺逐次重规划的机械原因、完整候选执行和能力分源后继，且缺同盘获胜反事实，不能校准HP护栏、SL或终局阈值。 |
| silent-proposal-49632bc4878fb597 | waiting | 来源局没有正敏捷联合样本；缺力量、敏捷、虚弱和跨轮成长四路径的完整共同调用验证，不据当轮吻合添加统一保血或输出权重。 |
| silent-proposal-66532328a585941f | waiting | 缺同入口HP、构筑和完整抽序下不同启动顺序的整场对照及可复现收益函数；无毒空打不足拟合启动阈值。 |
| silent-proposal-43a76a31ba7bdcfa | waiting | 缺吸取跨轮联合模型验证及同入口HP、构筑、完整抽序下可救活的SL替线；不能据首试胜利修改SL范围。 |
| silent-proposal-5264153a4a4b0e5c | waiting | 缺A10召唤、航行、再起和索引变化的完整跨轮调用链及另一focus的整场后继；旧召唤实现不能证明新增成长或固定杀序收益。 |
| silent-proposal-bddfa690a84e03d0 | waiting | 缺提前唤醒后眩晕接续的配对及同抽序完整获胜替线；自然醒、成长与16挡对22攻不足校准输出血价或杀序。 |

各项原来源、账本、证据、反例、预期、验证、时间切分与回退详见同目录proposal.md。没有另造提案id或经验；不重复复盘，不领取其他队列项。

## 已有live源码子项证明

核验时live=`33f42aee34175987601615b14fc4f08f52dd3c8d`，见source-proof.json。下列11个commit均已执行merge-base --is-ancestor核实，不是本批提交：

| 实际live祖先源码commit | 子项 |
|---|---|
| 772b839f8ada31664cb764ea9ad3bdb03da27f64 | Model observed Silent Apotheosis upgrades |
| f516592fff557ef02c8ece43433706358c3f7fe6 | Propagate the observed Silent Apotheosis Accelerant upgrade |
| a11dd870b09f3f1b67fcb5d6c08af6573fd809e0 | 重放神化萎靡限定修正和静默经验12.4原增量 |
| 3aa6c03a83c5cdcdea29c43e3caa130bcce9bd17 | ops: replay checked Silent Apotheosis candidate facts |
| 45161a51c2c6b7e4a499b13cf749c4108193bbf5 | Expose observed simulation scope in Silent combat choices |
| a8b1f8be153fe4f3a34146117546c2178f2e446b | Integrate repaired legacy learning deltas and bounded continuation adapter |
| bade647f9fe4c9103b40e2f26b26296692ad24b7 | Integrate tested dispatch audit and fixed-data workflow repairs |
| 6f3f783941270ac182237c46068097ff67e85907 | Integrate learner offline selection execution audit |
| 80308cd88457ea2d9559a3ebfa41527265c361d2 | ops: 集成学习者相邻观测离线审计子项 |
| 8698c581dac6c7e957f50a381586960a6d0c9b57 | 集成静默现场事实及离线观测两项原学习者增量 |
| 04921bd785ac6838066522f91ea0bb6ab95cb6a1 | ops: integrate terminal audit and potion-reference source increments |

16个相关源码路径冻结了HEAD blob、工作文件SHA、live blob、live SHA和最近live路径commit；10个字节相等，另6个仅42行历史注释Roy/Dai署名替换，逐行核验见source-comment-difference-proof.json及main-live-source-difference.patch。没有冒称全树SHA一致，也未擅改这些既存差异。离线消费者使用的selection-execution/observation/terminal三个文件与此live提交逐字节相同；这不是live运行会话或大脑自然读取验收。

## 既有离线消费者核验

输入完全来自本批冻结原行，node --import tsx直接运行既有消费者，不调用LLM、网络、游戏或刷新知识JSON。

| 局号 | 有ID的决策 | 候选分段 | 新题截断 | 相邻观测端点 | 完整候选实证 | 实际最优线实证 |
|---|---:|---:|---:|---:|---:|---:|
| VLZ6CCT8AQ0A | 699 | 99 | 22 | 77 | 0 | 0 |
| 8JRE1C4H4Z2W | 659 | 113 | 31 | 264 | 0 | 0 |
| CA5KE8GFJ9X2 | 264 | 41 | 14 | 0 | 0 | 0 |
| 5PM6JAQG6FNQ | 638 | 83 | 16 | 202 | 0 | 0 |
| 61E2QS63Y9WU | 442 | 63 | 11 | 127 | 0 | 0 |
| DUZUBAJ3A8GP | 599 | 77 | 13 | 189 | 0 | 0 |

3301条有ID决策均通过observed_ts+fingerprint唯一状态绑定；476候选分段中107次被新题截断，859个相邻观测端点可读。全部完整候选结果与实际最优线字段仍为null；这是消费者能力和输入证据边界，不能据零个已证明结果推断原选择全错或全对。8JRE末试终局可读5→0HP以及37−22=15显示攻击减挡；VLZ/CA无attempt终局保持unknown。毒、回血、敌方退出、SL恢复及生成牌等未被归因给单卡或原候选。

首轮消费者因5条map/route-change诊断记录缺decision_id而拒绝：CA行267143，61行267517，DUZ行268789/268818/268864。保留consumer-probe.initial-failure.log。修正仅在本批输入适配器排除这些非派发诊断行，原3306决策及全部字节/偏移不变，consumer-exclusions-*.json保存排除原件；原_line保留，跨过滤间隙不伪造相邻观测。六局重放随后exit0，完整输入、输出、汇总与日志都保存。

## 验证、失败与限制

verify-evidence.py通过23组原字节及数据断言，见evidence-checks.json和verify-evidence.log；属于离线证据核验，非tsc/vitest或新源码因果红绿。首轮把Buff意图的null total_damage求和而失败，保留verify-evidence.initial-failure.log；修正为明确只核显示Attack数值，Buff原件不改。

状态索引首稿误取state包装外层run_id，3432条索引曾为null；states-provenance.initial-null.json保留。analyze.py改为state.run_id后角色/局号/原字节核验全部通过。另一次形状探测遇到战斗入口空手牌导致IndexError，后续分析不假定入口手牌非空；一次署名差异检查漏认/**注释前缀，修正后全部42行通过。这些是本批临时分析脚本问题，不是游戏或生产源码失败。

未修改生产源码，因此撤源码失败/恢复通过不适用；tsc=null、vitest=null、cases=null，未运行沙箱全套，不冒报成功。没有commit，未做live合入、版本分配或上线通知，无需回退源码。没有把调度批完成、已有经验或离线可读冒称完整学习父要求已完成、自然采用或胜率提升。

全部推断限定为这六局A10观察；同局帧/SL相关，无独立盲测。预算未同盘同随机输入；原候选后缀未完整核实；其他focus、药水时机与完整获胜替线仍缺证据。本批未发现新的机制矛盾或需要新增异议通知的结论，旧反例和未知均沿原提案保留，不代填ops/watcher/Roy确认。

## 账本及材料

仅通过根目录learner/ledger.py update给26个既有silent账本条目追加本批proposal/report链接及逐项waiting说明；不重复增加历史证据，不改变原claim/status/version/effect，不将6个既有shipped条目降级，也不登记新shipped。实际CLI输入/输出、追加记录及前后核验保存ledger-updates.json、ledger-update.log、ledger-after-verification.json。

主要材料：proposal.md、dispatch-proposals.json、proposal-history.json、原十份*.original.md、run-identity.json、lessons-selected.json、*-indexed.jsonl、*-provenance.json、selected-state-boards.json、turn-observed-endpoints.json、action-observed-endpoints.json、consumer-inputs/、consumer-output-*.json、consumer-summary.json、source-proof.json、evidence-checks.json、result.json。完整材料SHA在artifact-manifest.json；最后工作树/源码/知识检查在final-verification.json。

gitleaks 8.30.1对本批材料目录执行dir扫描，启用100%脱敏，exit0、无泄露，实际扫描320494884字节；见gitleaks.log及gitleaks.json。分析修正和工具失败摘录另见analysis-corrections.txt。所有材料位于本批被git忽略的learner/runs目录，工作树保持干净。

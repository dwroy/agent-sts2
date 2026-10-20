# 静默十项策略提案：原始证据与处置报告

记录时间：2026-10-21T00:28:06+08:00。task=strategy-proposal；character=silent；batch=20261021-001302-strategy-proposal。

十项原提案均为waiting。没有新增足够证据支持的规则或当前源码缺陷可直接实现；已存在的窄实现不关闭整项。源码和正式知识零修改，fixes=[]、merged=null，无提交、发布号或shipped。运维逐项消费proposal-results.json；提案正文为同目录proposal.md。

## 开工、派发与范围

初始git status干净，HEAD及实际base均为2fb9ef1f26df9adfb04d68a409a8060bab7038c3。已读README、STATE-2026-10-19、decision-log末尾、learning-protocol、learning-code-proposals。本批learn.json对应task/character/worktree/runs正确，reason=proposal，明确领取十个proposal_ids，无proposal_repair、research_request或implementation_request。普通专题根请求绑定另一旧batch，本批不承接专题、不借另一请求替代。git merge --no-edit main返回Already up to date。未派下级agent、改账号/模型配置或联网；未核本线程原生turn_context，不自行宣称推理档位实际回执。

六个runs原始行均为SILENT、A10、已结束；六局均败，结束时间2026-10-07T05:17:57.587Z至08:17:09.498Z。局号/结束原行offset、bytes、SHA在evidence-summary.json各outcomes.ref。SL尝试不扩独立局分母。本批只从这六局及相关Silent提案/账本读取事实，不读取其他角色私有知识。没有新增独立时间后置样本，近期V6自然局不在本批派发证据范围。

十份原提案逐项读取并保存原字节。三份原路径存在；七份旧工作树路径不存在，从已保留的20261019-224304批次原文副本取回，全部实际SHA与专用队列add原行的proposal_sha256一致。原路径不存在不表示证据不存在。proposal-inputs.json保留原路径、副本出处、队列原行定位与实际SHA；ledger-inputs.json保存26个相关本角色账本条目的初始读取快照与原行定位。未新增重复提案id，未改原Markdown。

## 冻结提证与身份边界

先运行指定根evidence_summary.py，摘要SHA=e2f166e3dab08065006529a67fe787fcba7768a0e1f159306515ec52d2f9e5ff；摘要仅作索引。随后按指定命令分别提取v6-evidence四流和默认evidence八流。两个manifest均已读取，source_size、source_sha256、逐行offset/bytes/SHA、identity来源及完整扫描计数全部保留，未覆盖旧截点或拿最后五条当完整覆盖。

| 流 | 默认提证冻结source_size字节 | 六局所属原行 |
|---|---:|---:|
| states | 14779792526 | 3432 |
| decisions | 3014585841 | 3306 |
| sl-attempts | 50161407 | 29 |
| run-config | 2276751 | 6 |
| run-plans | 10145552 | 33 |
| brain | 1129621410 | 183 |
| v6-build | 64655258 | 0 |
| jev-prompts | 2209044221 | 579 |

四流V6专项与默认提证对这些流的切点相同：v6-build=64655258、jev-prompts=2209044221、decisions=3014585841、run-config=2276751。脚本逐一seek回原日志核验579条Jev请求、3306条决策、6条配置及3432条状态的bytes/SHA和JSON原行，共7323条，退出0。题面/决策原文保存在提证文件；question-audits.jsonl保存八题完整原请求、逐步原决策与后继状态定位；模型仅读取选定窗口及结构化事实，没有整份states灌入上下文。

身份采用显式run_id/state.run_id、fingerprint.run和decisions精确decision_id关联，冲突拒收；未由正文提及、question_id相似或时间相邻建立所属局。579条请求均为显式run身份，并同时有精确决策身份出处。未知身份仅按源流manifest保留；decisions全源unknown_identity=1934、unmatched_decision_id=1413不当作六局的行为或缺失计数。全源states/decisions/brain各有2条无效JSON，jev-prompts有1条；这些全源无效行不归因本六局，也不当成零错误。所选7323条原文均可逐字节读回。扫描末尾不完整行数均0，仅限已冻结切点。

提证文件因跨设备硬链接errno18保留pending_host_seal=true；原字节及输出SHA已在本树保留，宿主封存未完成不冒称已封存。初次查询队列误输出全部历史update导致终端截断，后改为逐id的add与最后update；截断的是展示，原文件未改。早先一次只读查找不存在的learner/selection-execution.ts后，已核实际路径learner/lib/selection-execution.ts；没有运行错误路径的消费者或借历史测试。

## V6与Jev分别解释

v6-build在冻结切点对六局均为no_match，文件存在且全源623行；这不等于六局有零条知识、采用率为零或V6故障。六份历史run-config均没有V6配置字段，不能倒填当前默认开关，亦不能把历史无字段改写为显式off。entries、jev_answer、fallback、unknown在六局没有对应V6原行，均保留不可判断；不按0统计。没有匹配V6问题可进一步读题或证明采用。

Jev请求按局为VLZ 136、8JRE 139、CA5 58、5PM 92、61E 70、DUZU 84，共579；全部完整request.questions与精确decisions.questions相等，answers也579/579相等，匹配请求error非空0。这个0仅描述已归属原行的error字段，不证明系统没有其他错误。579条对应决策均无结构gate_reject与selection_dispatch字段；字段缺失不是闸门从未拒绝或整方案成功执行的证据。chosen和result逐题保留，接口completed只代表动作回执，pending不当已生效。

## 完整题面阅读覆盖与执行后果

以下八道完整request（含上下文、全部候选、风险/未知、旧经验文本）、answers及对应chosen/result已实际读取；没有以摘要代替这些原文。每题的原Jev行和决策行完整offset/bytes/SHA、identity关联及状态ref在question-coverage.json和question-audits.jsonl。

| 局、窗口 | 精确decision_id | 原决策行 | 原答与实盘边界 |
|---|---|---:|---|
| CA5KE8GFJ9X2 F13 T4 | fa69876c-94f5-4915-a951-1d462efb0537 | 267379 | plan1打击；敌28→22，T5成长继续；T5走代码least-loss，无本轮Jev题。 |
| 61E2QS63Y9WU F23 T4 | bd5b1482-9eea-493f-b159-aa1eb3bc5a1a | 267696 | plan3本体线；猎杀者/杀灭后T5玩家25→10、本体76→41、幻象14→2；另一零损候选未实打。 |
| 5PM6JAQG6FNQ F39 T2 | 397711ec-b2e8-4554-a868-d1db0bf143b8 | 268455 | plan7先冒泡；相邻帧能量5→4、玩家29不变、两敌35/72且无毒；后续整轮净扣不能归空打一步。 |
| DUZUBAJ3A8GP F30 T5 | 48174eb3-a1e5-4db0-ac76-35377a0fd18e | 269068 | plan1末试；原题17挡，实际防御9后蜃景到22挡，HP仍1；T6继续代码least-loss，保留历史偏差。 |
| VLZ6CCT8AQ0A F43 T1 | 1255c12e-9a86-457f-8d27-77861f95b4d6 | 269707 | 神化后plan1；原行派发一拳、两打击、勒紧、尖啸及火焰药水；后继玩家90→77、敌254→203。 |
| VLZ6CCT8AQ0A F45 T1 | 04b5c1fd-fc69-4e01-9c6b-c2417cd16d31 | 269748 | plan4不打神化；MC1/12、707ms，rollout退化horizon1/samples1/best=null；随后重新提药水题。 |
| VLZ6CCT8AQ0A F45 T1 | 1bb372a9-4fce-4c82-b60f-70d23e4be75d | 269754 | p0喝痊愈药水；12样本是预测，实HP67不变、能1→2，抽工具/生存者；后续弃神化，升级未兑现。 |
| 8JRE1C4H4Z2W F33 T2 | a0a63fc0-828b-477c-9705-72c7e45ee4c3 | 270282 | 原答plan1尖啸被SL换plan2打击；0/24与5/24死亡样本分别保留；实T2损15/扣17。 |

未逐题语义阅读的另外571条全部列于question-coverage.json，semantic_read=false并给出原因；脚本读取完整JSON并核对题答/身份，不将它们计为已作游戏语义审查。它们包括非选定发现窗口、其他尝试/重问及本次十提案之外的问题；本批只定位验证既有问题，没有重做六局全量策略研究。未进一步分析这些问题不表示没有价值或无错误；完整原文保留，可据精确ref继续。run-plans/brain/sl-attempts已提取，但本批没有逐条语义审查33/183/29行，不据此新增路线、药水存量或跨战因果结论。所有未读范围明确保留，不称579题全面科学验收。

八题原文的旧potion_experience.data包含未按角色分列的历史统计，另有DeepSeek计划、经验提示与预测语句。它们只用于还原当时题面，未采为Silent事实、独立分母或收益依据，未读取其指向的其他角色知识。召唤怪提示中的目标建议也不是本批受控实战结论。原文存在、Jev回答、接口接受、整候选执行、正式发布、下一局消费及自然收益分别记录，本批没有后四者的新证据。

## 固定原帧核验与已有源码

check_facts.py从本次原行执行20项确定性事实断言，退出0，fact-checks.json/first.log保留：神化耗能及升级差值、F43 51净扣/13损、药水真实抽牌及能量、末轮59攻击/32血/20挡、MC成熟度、SL同指纹及实际端点、冒泡局部无效、族母负敏捷和毒端点、幻象未退场及甲虫17/22挡偏差。它们是数据核验，不是生产tsc/vitest或源码负控，tests字段仍为null。

8JRE首/第三试T2的原观测指纹完全相同：首试47→44、敌326→316；第三试47→32、敌326→309。因此该窗口多损12血、多扣7敌血。原答与SL替换分开，二者均未提供另一完整胜线；所有相关尝试仍属一局，不能拟合血价或把0/24和5/24说成同死亡率。此前历史17挡/实22挡差异保留，但没有在当前源码上重现相同缺陷，不据旧dirty运行树直接修新源码。

只读实际live快照=4528a751f17e341a97e7ff70295ec9fba0c947e9。11个相关源码/离线审计路径的base/live blob均相同；9个最近基线路径提交为该live祖先，card-model.ts与rollout.ts最近基线提交e2103b3a9b5fdd524508fa28e5dd64ec7f63eb46不是该live祖先，字节相同不等于整来源提交已合入。逐路径blob、文件SHA和祖先检查见source-verification.json。

神化当前已有已观察升级配对、同线/已知后抽传播与未知标记；silent-apotheosis-reference仍明确actual_cast_this_fight=null。turn-solver对重放、弱/脆弱等未验证组合保留unknown。离线selection-execution当前源码也明确完整候选结果恒不认证；本批没有运行该消费者，不借前批消费者输出冒称本批成功。已有实现只能说明这些窄能力存在，不证明十个复合提案已全部实现。

## 逐项处置

| 原id | 账本 | 结果及剩余缺口 |
|---|---|---|
| silent-proposal-89354805ee4d7e77 | silent-0237, silent-0238 | waiting：已存在神化升级传播窄实现；缺本战实际施放的持续身份、跨抽弃/选择/药水/SL读回及未知属性组合校准，不能关闭整项。 |
| silent-proposal-f2bfceddb1898dca | silent-0106, silent-0019, silent-0201 | waiting：缺完整模型下同起点、同随机池、同总预算的MC配对和成熟度曲线；707ms退化题与后续12样本题不是受控预算实验，不能据此改药价、预算或目标规则。 |
| silent-proposal-283a164780d11e69 | silent-0237, silent-0238 | waiting：与原神化模型提案同源，但实际施放持续身份和未知升级交互仍缺；经验发布或题意重复不构成完整源码duplicate。 |
| silent-proposal-ebbfe3b97548756d | silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019 | waiting：十五子项仍缺属性/升级联动、状态期限与战斗/路线/休息消费者联合固定校准；本批局部状态端点和已有源码不能覆盖整项。 |
| silent-proposal-e5b87be50f28f311 | silent-0079, silent-0021, silent-0125, silent-0018 | waiting：原答与SL替换已核，历史gate_reject/selection_dispatch及结构护栏字段未落盘；缺跨抽弃、重问、选择、药水和SL的完整候选持续归属，不能由文字和completed补造完整执行。 |
| silent-proposal-49632bc4878fb597 | silent-0005, silent-0231 | waiting：CA5仅支持现场力量、弱与成长；本局无实际正敏捷建立，四条路径缺同一冻结生产调用联合校准，不拟合统一血价权重。 |
| silent-proposal-66532328a585941f | silent-0021, silent-0009 | waiting：已核无毒冒泡耗1能且无施毒；缺同HP/牌组/药水/完整抽序下不同启动顺序的受控整战对照及收益函数，不拟合启动优先级。 |
| silent-proposal-43a76a31ba7bdcfa | silent-0030, silent-0027 | waiting：负敏捷双防御各3与毒端点已核；缺同起始HP/构筑/完整抽序的另一完整SL线路及生产整战配对，不改变SL阈值。 |
| silent-proposal-5264153a4a4b0e5c | silent-0039, silent-0209 | waiting：本体线47净扣/15损兑现，幻象仍2血；另一目标序未实打，召唤代际、成长、复现和退场全链校准未齐，不强制首杀。 |
| silent-proposal-bddfa690a84e03d0 | silent-0128, silent-0079 | waiting：保留末试题面17挡/实得22挡的历史偏差；未证当前源码同一缺陷，缺唤醒/眩晕/成长全链校准与同抽换序完整后继，不拟合固定杀序或血价。 |

每项证据局号/层/回合、旧规则、预期行为、反例、验证及回退见proposal.md及十份原Markdown。未新增代码提案id，code_proposals填十个原CLI id；implementation_domains=[]表示本批没有实际实现领域，不否认原提案所涉combat/potion/sl/structure。

## 台账、验证与交付边界

已先date，再经根learner/ledger.py update追加26个相关Silent账本的where.proposal及note，by=learner:strategy-proposal，CLI退出0。只添加本批proposal/report链接，不重复追加证据、不改变claim/status/version/first_run/asc/effect；原shipped不降为proposed。本批没有新知识或新提案需要另建status=proposed条目。ledger-updates.jsonl、ledger-update.log及ledger-verification.json保存实际记录；没有直接改账本、提案队列或标shipped，十项处置交原调度器消费。

没有生产源码提交，所以撤源码失败/恢复通过不适用；未运行tsc/vitest，tests={tsc:null,vitest:null,cases:null}，不借旧绿灯或数据断言冒报0。没有启动live合入流程、改eval版本/行为/运维prompt/STOP或运行play，没有推送；所有角色行为保持原样。无需规则上线双通知。交付材料gitleaks扫描及最终HEAD/干净检查见final-verification.json；没有新提交可做提交前扫描。

原运行码均带dirty，未重建当时完整源码、知识与随机池；本批数据复核和当前源码字节比较不证明历史模型完整正确，更不证明修改阈值有收益。原提案、失败、未知和父要求继续保留，报告完成和排队不是学习正式入库、真实采用或父要求关闭。

运维提案：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-001302/learner/runs/20261021-001308-f6c72f7a-046e-42e0-a85d-aa26c0d78c36-strategy-proposal/proposal.md

报告：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-001302/learner/runs/20261021-001308-f6c72f7a-046e-42e0-a85d-aa26c0d78c36-strategy-proposal/report.md

最终机器回报：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261021-001302/learner/runs/20261021-001308-f6c72f7a-046e-42e0-a85d-aa26c0d78c36-strategy-proposal/result.json

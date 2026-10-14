# 静默猎手策略提案消费报告

本批十个指定提案逐项处置为 **waiting**。有证据的局部机制保留，已有子实现按实际live祖先核实；整项所需的动态分支、联合模型回放、完整候选归属或受控量化证据尚不齐全。本批没有源码／知识／参数修改、提交、合入、行为发布、经验shipped或自然采用声明。

任务：strategy-proposal。角色：silent。批次：20261014-100836-s2-strategy-proposal。
完整base／当前工作树HEAD：`935059cc107780c1e4c9f8846ea84a5b123a3ffb`。
报告真实绝对路径：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-100836-s2/learner/runs/20261014-100856-strategy-proposal/report.md`。
提案交运维路径：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-100836-s2/learner/runs/20261014-100856-strategy-proposal/proposal.md`。

## 身份与范围

已读README、最新STATE-2026-10-12、decision-log末尾、learning-protocol、learning-code-proposals和learning-requests。本批learn行的task／character／worktree／runs正确，reason=proposal，带十个proposal_ids，无research_request／implementation_request／proposal_repair；普通专题请求绑定的是其他批次，不匹配。本批按普通消费流程执行，`git merge --no-edit main` 返回 Already up to date，HEAD未变。不套用纯研究完成字段，不扩领其他队列，不派下级agent。

十份原Markdown指纹与原add行逐项相等。使用原CLI输入经code_proposals add逐项读回原十个id；预先重算每项身份相等后才调用，均退出0，未创建新id。原提案正文、原来源任务、旧请求／历史回执／旧状态保留。CLI读回原件在`code-proposals-cli.json`，原队列记录和正文副本在`queue-original.json`及各`<id>.original.md`。

## 冻结证据与消费者

只分析这五个派发局；runs.jsonl逐局确认SILENT／A10，均victory=false。历史code分别为b8ca9311+dirty、fd4c8e52+dirty、710dc4dc+dirty、0d6c1a82+dirty、6ad5584f+dirty，未声称复原历史dirty树。没有读取其他角色知识、运行play、调用LLM／网络、安装依赖或操作对局。

| 局号 | 原状态 | 原决策 | 原SL记录 | 消费者输入与真实退出码 |
| --- | ---: | ---: | ---: | --- |
| NHA2KW0RB7VP | 602 | 584 | 7 | 完整输入0 |
| P74C04AEPL1F | 410 | 395 | 5 | 完整输入1；保原行号F22/F23的89决策有界输入0 |
| G33HU22H2543 | 879 | 850 | 8 | 完整输入0 |
| RC61MFQM63Y6 | 694 | 674 | 7 | 完整输入0 |
| BTSRF7JL1W1Y | 653 | 635 | 4 | 完整输入0 |

总3238状态、3138决策、31SL、5runs、5config，共6417原行。`source-lines.json`保存文件／原行号／offset／bytes／SHA256／局号；material-check.py对全部原行seek读回、SHA及角色局号一致，输出原件在material-check.stdout.txt。34项固定数值核验逐actual／expected相等，见material-checks.json；这是素材检查，不是源码tsc／vitest／撤码测试。

P74原第278271行缺decision_id，完整消费者真实拒绝，原stderr保留；未补ID、未跨缺行续链。限定F22/F23输入没有这个缺行，保留全部原始行号，不能冒称全局消费者成功。通过的四全量加一限定输入共2832动作、465题段；1000相邻区间可见、1832未知，459整轮窗口含141可核端点／318未知。消费者始终将完整候选结果保留null；这表示该消费者未认证，不能推为没有任何完整线路执行，也不能把整轮净差归因某个候选。31SL记录不是31独立局。消费者输出、各stderr和真实rc见consumer-status.json／consumer-summary.json。

主要数值：NHA F33同首手斗篷／回响线14／8挡，净损1／7、敌HP净减8／24；RC F33两T1题面指纹相等，16／12挡、损4／8、扣爪30／23，普通触媒确建1层。P74 F17火焰药实扣1且滑溜减1、尖啸后双击2、次轮恢复30；F22 T4实损24、下一轮9血；F23末T3生存者后1血16挡、来袭24，实际弃精确切击，卵毒后仍2血、末页0血。BTS F31睡3→2→1→消失、力量0→2→4，末T4已有5牌挡及1覆甲，22攻击减挡算术为16；不能把14血归零的净损冒作完整入伤14。G33 F48末T8余像2层、末挡12、来袭31，女王毒端点扣42、聚合体仍存活。每项原行和证据范围在proposal.md／material-checks.json。

## 已有实现与本批处置

源码核对冻结live头`9c18d0bbe4dc9017f1297b5757410d7123347a72`；这是核验快照，live可由其他owner继续推进。十二个相关文件分别记录base／live Git blob与SHA256。combat-plan、card-model、turn-solver、rollout、rollout-live五叶字节不同，差异原件各存`.base-live.patch`；没有泛称两树完全等价，也未覆盖任何live刷新。

以下是核实为该live快照祖先的已有子实现，不是本批提交：

- 投斧首牌重放身份：`e784dd9f043bf87c29109573f48975f9903280d3`。
- 普通生存者无绷带单弃消费：`bf423c173d3be348a4ad714e1d26516df619ff41`。
- 弃牌候选保留手牌与能量事实：`4b0823f519f1b724d6cff2b1cd50b74146dc4a9d`。
- 滑溜毒HP上限／层数消费：`9c19ce71a149300442b01adcfa50df543bc8a7f1`。
- 当前discardPlanFacts所在集成源码：`5b56a452bb9be14d620b368ec46974c1b57901ca`；原f34700874c9f48b614991f769532115a0f24f27b不是本快照live祖先，两者分列，不用旧支线冒认实际部署。
- 当前资源差额／审计的集成记录：`66283dd9982bdd7f480da7a4d9bfefea0572a9ac`与`e75438488df159b2e8e9d3458cf219b39aadd933`；其消费者仅证明各字段可读和观测端点范围，未关闭累计收益／完整归属要求。

source-verification.json保存实际ancestor检查及文件指纹。当前弃牌快照明确不推演伤害、格挡、剩血或胜负；计划提示只标后继可能取消。精确切击的旧7伤随手牌变化而不能直接沿用。现有SL资源差额字段明确标current_turn_prediction／unverified，不替代实盘分账。因此不能以这些子项把任何本批宽提案整体标duplicate。

十项逐一的局号／层／回合／原账本id、原行为／预期目标、反例／缺数据、验证方法和回退边界完整保存proposal.md；最终逐项结果保存result.json。所有十项均waiting，不伪造源码commit。规则门槛没有改动；证据充分的机制端点与待联合验证的消费者缺口分开保留。

## 验证、限制与记录

生产tsc=null、vitest=null、cases=null；本批无源码实现，未运行生产测试，没有撤源码失败／恢复通过记录。没有提交／合入／新eval版本。不存在本批实际上线，因此没有部署双通知、shipped登记或清理自身工作树。材料和CLI检查不能记为生产测试成功。原账本只经根ledger.py追加note／where／by，不覆盖原claim、status、version、first_run、prior或已有子机制shipped；追加后的实际读回验收另见本报告末尾。

缺口分别是动态弃牌分支模型与弃后牌面；原在线移动表、抽牌池、召唤／复活联合输入；跨重规划完整候选归属；逐来源累计能力／毛伤／复活增血；SL恢复、实际回血、实际喝药及下一战入口的连续分账；同条件后置完整对照。没有以五局全败拟新血价、安全血线、固定殺序、能力优先级、留药或SL阈值。未产生新自由参数或胜率提升估计；原历史大样本聚合未在本批重算。后续需按run分组SL，并另冻结时间后置的新静默局，不能把重复消费本批证据当独立验证。旧学习父要求不会因本报告结束而关闭。

首次调度查询的筛选条件过宽，输出了外层容器；随后改为精确本batch键，本批结论只取本行，未领取／更改其他任务。首次状态抽取错取顶层run_id导致零状态计数，随后改为state.run_id并完整重新冻结及逐原字节核验，未使用零计数推结论。tsx CLI的IPC管道受沙箱EPERM拒绝，原stderr保留；改用同一个已安装tsx的Node import loader后运行上述真实消费者，无扩权限或源码修改。初次素材抽取过长的显示截断只影响工具显示，原冻结数据完整保存；补用有界数值抽取核对。上述过程材料保留，不当作策略失败或代码修复。

## 最终实际验收

32条账本追加经原物理行／offset／bytes／SHA逐一读回，均只有op／id／ts／by／note／where，无status、claim、version、first_run、asc、prior或evidence改写。根ledger.py check真实退出0。十个原CLI读回均0，逐id处置齐全。Gitleaks只扫描本批scratch，redact开启，真实退出0、报告为空数组。源码／全部knowledge及HEAD保持原base，git status --porcelain为空。最终JSON见result.json，验收原件见final-integrity.json；没有源码测试、提交、合入或发布。

补核29个营火选择均有相邻原状态端点，见rest-observed-resources.json／rest-summary.json。逐局已观察正HP净差合计为：NHA2KW0RB7VP 120；P74C04AEPL1F 42；G33HU22H2543 133；RC61MFQM63Y6 105；BTSRF7JL1W1Y 42。这些是各自原观测区间的净差，未合入SL恢复，不能作为路线干预、未来营火承诺或单动作因果；旧历史大样本分母没有重算。

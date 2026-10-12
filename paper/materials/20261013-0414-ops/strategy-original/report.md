# 静默猎手十项策略提案逐项处置

批次：20261013-033546-strategy-proposal；角色：silent；六个派发局均A10。
完整基线：b2e6b586440c56ea13ed2f41779ac5fc38304a4e。开工工作树干净，普通批次git merge --no-edit main返回Already up to date。
本批reason=proposal，只有下列10个已领取proposal_ids，无proposal_repair、research_request或implementation_request。普通专题根请求绑定其他旧批次，不匹配本批；没有将普通队列改作专题，也没有修改请求、调度、租约或领取额外提案。

结论：10项完整提案均waiting。本批没有找到证据充分、尚未实现、可独立验证的新策略改动。已观察并已实现的子项注明真实live源码祖先；未观察组合、完整候选收益与反事实保持未知，不以局部源码关闭整个提案。不建立重复id，不新增经验知识。

只依据这六局的原日志、本角色原提案/账本/已有复核材料及本角色代码路径；没有读取或搬用其他角色知识。已读README、最新STATE、decision-log末尾、learning-protocol与learning-code-proposals。保留原历史及反例。

## 原始证据核验

| 局号 | 决策 | 状态 | SL记录 | 终层 | 历史代码 |
|---|---:|---:|---:|---:|---|
| CA5KE8GFJ9X2 | 265 | 282 | 0 | 13 | 33f02a6f+dirty |
| 61E2QS63Y9WU | 443 | 462 | 7 | 28 | 03d50f0b+dirty |
| 5PM6JAQG6FNQ | 638 | 660 | 7 | 39 | f56da22b+dirty |
| DUZUBAJ3A8GP | 602 | 623 | 6 | 30 | 93298980+dirty |
| VLZ6CCT8AQ0A | 699 | 729 | 2 | 45 | ac321b1f+dirty |
| 8JRE1C4H4Z2W | 659 | 676 | 7 | 33 | b0f41f03+dirty |

六条runs记录唯一且为SILENT A10。原3306决策、3432状态、29 SL记录，共6767条，逐条按根logs原偏移读回，核字节长度/SHA/局号及状态角色/进阶。旧011302同id材料仅提供原索引，结论及当前源码/消费者重新核对。原记录未改，索引和原字节保存在本批scratch；SL记录数不当作独立对局数。历史code均带dirty，没有复原完整历史执行树，当前源码不能代替历史实际加载模型/知识输入。

原十份Markdown SHA均与队列一致；同源神化两id分别处理。verify-endpoints.py复用已读的确定性核验脚本，以本批新读回输入通过23组数据/字节断言；additional-endpoint-facts.json另保存神化四次付能、负敏捷双防御、召唤未退场及甲虫血价端点。机械证据核验不是tsc/vitest、新源码红绿或效果测试。

## 逐项结果

| 派发CLI id | 状态 | 具体未实现理由 |
|---|---|---|
| silent-proposal-89354805ee4d7e77 | waiting | 普通升级传播已有live源码；仍缺跨重规划、SL与重启的实际施放生命周期，以及未知升级、自动动作和属性组合证据，不能关闭整项。 |
| silent-proposal-f2bfceddb1898dca | waiting | 缺同状态、同模型覆盖、同随机输入和同总预算的配对收益曲线；异盘1/12与12/12、707ms不能校准预算、留药、HP护栏或目标规则。 |
| silent-proposal-283a164780d11e69 | waiting | 同源普通升级子项已在live；实际施放生命周期、未知费用、跨轮副效应和自动动作组合仍缺完整验证，同源链接不能将整项登记duplicate。 |
| silent-proposal-ebbfe3b97548756d | waiting | 已核本局分源端点和既有机制路径；仍缺口红、覆甲、临时减力恢复与未来毒的联合跨轮调用验证及15条经验逐项消费者证明，不能关闭整包。 |
| silent-proposal-e5b87be50f28f311 | waiting | 候选差与单动作回执已有live子项；仍缺逐次机械重规划原因、跨抽弃牌完整执行归属和能力分源后继，不能认证整套审计或校准HP/SL阈值。 |
| silent-proposal-49632bc4878fb597 | waiting | 来源局正敏捷样本为0；缺力量、敏捷、虚弱与跨轮成长四路径的完整共同调用证据，不能据当轮吻合校准统一权重。 |
| silent-proposal-66532328a585941f | waiting | 缺同入口HP、构筑与完整抽序下不同启动顺序的整场对照和可复现收益函数；无毒目标空放只确认局部代价，不足拟合启动阈值。 |
| silent-proposal-43a76a31ba7bdcfa | waiting | 缺吸取跨轮联合模型验证及同入口HP、构筑、完整抽序下可救活的SL替线；本局首试胜利不足修改SL范围或换线偏好。 |
| silent-proposal-5264153a4a4b0e5c | waiting | 缺A10召唤、航行、复起与索引变化的完整跨轮调用验证及另一focus全程后继；旧召唤子项不足证明成长组合或固定首杀收益。 |
| silent-proposal-bddfa690a84e03d0 | waiting | 缺提前唤醒后眩晕接续的配对证据和同抽序完整获胜替线；自然醒及当前攻防端点不足校准输出血价或固定杀序。 |

每项证据层/回合、原账本id、反例、旧/预期行为、验证、时间切分与回退均在proposal.md逐项保存。没有将当前进阶首样本规则混成房间五样本规则，也没有改变铁甲行为。

## 已有live子项源码

实际核验切点live=0751319737989d6a9940d608914448e8f0f15056。下列11个提交均通过merge-base --is-ancestor，且每个实际涉及源码路径；都是历史已上线子项，非本批实现提交：

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

source-proof.json保存16路径的本批HEAD blob、工作文件SHA、live blob/SHA；10路径逐字节相等，其余6路径仅既有Roy/Dai署名差异。差异patch和源码原字节.txt副本均在source-snapshots/，没有把差异清零或冒报全树相同。三份离线消费者源码与该实际live提交相等；这不证明运行大脑自然读取或采用。

## 既有消费者固定输入读回

以本批核原字节的六局输入，直接运行现有auditSelectionExecution；无LLM、网络、游戏或刷新的知识JSON。五条map/route-change诊断缺decision_id，单独原件保存；剩3301条有ID决策用于消费者，原3306条都保留。原_line不改，过滤间隙不伪造相邻观测。

| 局号 | 有ID决策 | 候选段 | 新题截断 | 完整候选结果实证 | 实际最优线实证 |
|---|---:|---:|---:|---:|---:|
| VLZ6CCT8AQ0A | 699 | 99 | 22 | 0 | 0 |
| 8JRE1C4H4Z2W | 659 | 113 | 31 | 0 | 0 |
| CA5KE8GFJ9X2 | 264 | 41 | 14 | 0 | 0 |
| 5PM6JAQG6FNQ | 638 | 83 | 16 | 0 | 0 |
| 61E2QS63Y9WU | 442 | 63 | 11 | 0 | 0 |
| DUZUBAJ3A8GP | 599 | 77 | 13 | 0 | 0 |

476候选段中107段被新题截断。完整候选结果和实际最优线均仍为null；这是消费者及证据范围限制，不是476次错误选择，更不能由净HP或completed单动作回执推候选完整执行。六局原输入/排除原件/全部输出/摘要/log均落盘。

## 本次失败、模型与验证口径

verify-input.py初次假定consumer顶层有run_id而KeyError，已保留verify-input.initial-failure.log；读取实际run/states/decisions结构后修正身份核验，原日志和索引不变，后续6767条及consumer原字段核验通过。早期一次将带行号前缀的indexed行整行当JSON导致Extra data；一次只读路径探测将learner/lib路径误写为learner直下导致sed不存在，均未修改生产文件，后续按实际结构/路径核对。这些是临时分析问题，不是代码或游戏失败。

原生线程01a1319d-6bac-73c1-b7bb-b52bb50e9ea4的turn_context实际为gpt-6.1-sol/xhigh，工作树匹配；任务文本要求high，本批宿主已使用xhigh，差异如实保存runtime-model-observation.json，未修改或另起运行会话。service_tier在该原生记录为null，不能仅凭默认配置证明普通档。

没有生产源码或知识修改、提交、live合入、版本分配或shipped登记。撤源码失败/恢复通过不适用；tests={"tsc":null,"vitest":null,"cases":null}。没有运行沙箱全套，证据/消费者核验不冒报为代码测试成功。未发规则上线通知，没有量化/入库父要求完成、自然采用或胜率提升声明。未发现新增机制异议或旧知识冲突，旧提案反例与未知完整保留。

## 登记与交付

只通过根learner/ledger.py update向26个既有silent账本追加本批proposal/report链接与逐项waiting说明；不重复历史证据、不改claim/status/version/effect、不降级已shipped条目，不新建重复账本或提案。CLI输入、输出和前后限定核验保存本目录。专用队列最终处置由本批proposal_results交调度器；本批没有自行写队列状态。

提案绝对路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-033546/learner/runs/20261013-033559-strategy-proposal/proposal.md。
报告绝对路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-033546/learner/runs/20261013-033559-strategy-proposal/report.md。
固定证据/消费者的详细范围见raw-verification.json、evidence-checks.json、consumer-input-binding.json、consumer-summary.json；本批材料SHA见artifact-manifest.json，终态HEAD/零差异见final-verification.json。工作树保持干净。

最终限定核验：26条本批ledger CLI追加均已读回；claim/status/version/effect/evidence与CLI前一致，报告链接存在。另5组补充端点断言通过，记录于additional-evidence-checks.json。gitleaks 8.30.1对本批材料目录扫描约309.34MB，exit0、0泄漏，输出启用100%脱敏；保留gitleaks.log/json。以上不计作生产源码测试，最终tests三项仍为null。

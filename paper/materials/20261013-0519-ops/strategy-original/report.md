# 静默猎手十项策略提案处置报告

本批10项均waiting，没有发现证据充分、尚未实现且可独立验证的新策略改动。没有源码/知识修改、提交、live合入、发布号或shipped登记。原提案及具体缺证保持，未关闭学习/量化父要求。

批次20261013-044302-strategy-proposal；完整base=3061b18d2222fb1c754d07465cf2b7d9303b9008。开工树干净；先读README、最新STATE、decision-log末尾、学习协议及代码提案闭环，核普通队列身份后同步main，结果Already up to date。根专题属于另一旧批次，本批无research_request或implementation_request，不转作专题。

## 证据与处置

| 局号 | 决策 | 状态 | SL记录 | 历史code |
|---|---:|---:|---:|---|
| CA5KE8GFJ9X2 | 265 | 282 | 0 | 33f02a6f+dirty |
| 61E2QS63Y9WU | 443 | 462 | 7 | 03d50f0b+dirty |
| 5PM6JAQG6FNQ | 638 | 660 | 7 | f56da22b+dirty |
| DUZUBAJ3A8GP | 602 | 623 | 6 | 93298980+dirty |
| VLZ6CCT8AQ0A | 699 | 729 | 2 | ac321b1f+dirty |
| 8JRE1C4H4Z2W | 659 | 676 | 7 | b0f41f03+dirty |

唯一6条runs均SILENT A10。原3306决策、3432状态、29 SL记录共6767条逐字SHA读回，旧索引仅用于定位。本批固定输入由重新核对的原行构造，保留原_line；5条缺decision_id的map/route-change诊断另存，不伪造连续观测。SL记录不是独立对局数。历史code带dirty，未复原历史完整执行树，当前源码/经验不能冒作当时实际加载。
原帧23组断言和16组补充断言通过：包括四次普通神化付能、同序51伤/13损、同盘SL多12血换7伤、冒泡无毒空打少1能、负敏捷两防御各3、幻象未退场、甲虫恢复成长与末轮完整血价。详情见evidence-checks.json、additional-evidence-checks.json及端点材料；这是机械证据核验，非生产测试。

| 原派发id | 状态 | 具体缺证 |
|---|---|---|
| silent-proposal-89354805ee4d7e77 | waiting | 普通神化升级传播已有live实现；本战实际施放标记仍为空，缺跨重规划/SL/重启生命周期、未知升级和自动动作/属性组合的完整验证，不能关闭整项。 |
| silent-proposal-f2bfceddb1898dca | waiting | 缺同状态、同模型覆盖、同随机输入和同总预算的配对收益/样本稳定性曲线；异盘1/12与12/12或707ms不能校准预算、留药、HP护栏或目标规则。 |
| silent-proposal-283a164780d11e69 | waiting | 与89354805同源的普通升级子项已在live；原提案还要求实际施放/覆盖分账，未知费用、跨轮副效应及自动动作组合缺完整验证，同源经验链接不能关闭整项。 |
| silent-proposal-ebbfe3b97548756d | waiting | 已核分源端点与现有机制路径；仍缺口红、覆甲、临时减力恢复、未来毒联合跨轮调用验证及原15条经验逐项消费者证明，不能用局部公式关闭整包。 |
| silent-proposal-e5b87be50f28f311 | waiting | 候选差、单动作回执与相邻观测已有live子项；仍缺逐次机械重规划原因、跨抽弃牌的完整执行归属和能力分源后继，不能认证整套审计或校准HP/SL阈值。 |
| silent-proposal-49632bc4878fb597 | waiting | 来源局关键战正敏捷样本不足；缺力量、敏捷、虚弱及独立成长四路径的共同冻结调用与跨轮验证，当前蚌端点吻合不足校准统一保血/输出权重。 |
| silent-proposal-66532328a585941f | waiting | 缺同入口HP、构筑和完整抽序下不同启动顺序的整场对照及可复现收益函数；无毒目标空打只确认1能局部代价，不能拟合启动阈值。 |
| silent-proposal-43a76a31ba7bdcfa | waiting | 已核吸取、负敏捷挡与毒继续结算；缺完整联合跨轮模型调用和同入口HP/构筑/抽序下可救活的SL替线，本局首试胜利不足改变SL范围或偏好。 |
| silent-proposal-5264153a4a4b0e5c | waiting | 已核实体各长三力与幻象余2仍攻击；缺A10召唤/航行/复起/索引变化的完整跨轮调用和另一focus实打后继，不能从旧召唤子项推出固定首杀收益。 |
| silent-proposal-bddfa690a84e03d0 | waiting | 已核自然醒和恢复成长端点；缺提前唤醒/眩晕接续的配对证据及同抽完整获胜替线，四试均败不足校准输出血价或固定杀序。 |

每项局号/层/回合、既有账本、反例、旧/预期行为、拟合限制、验证和回退均见proposal.md。只读silent经验六相关条目作为原链接现状，不以扩展后的历史计数或新案例替代本批证据，不搬用其他角色知识。未新增机制结论或修改铁甲行为。

## 已有源码与固定消费者

源码核验切点live=2ccc01768229b0735ebb255abbbbbc7f4f337fd3。11个已存在源码提交逐一核实际live祖先和源码路径；这些都是历史子项，本批未把它们登记为10项完整implemented/duplicate。source-proof.json保存完整提交、16路径blob/SHA及原字节.txt副本，10路径逐字节相等，其余6路径的现有Roy/Dai署名差异另存patch，保留现场。

| live祖先源码 | 子项说明 |
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

直接调用现有auditSelectionExecution，以固定6局原输入读回，无LLM、网络、游戏或刷新知识JSON。

| 局号 | 有ID决策 | 候选段 | 新题截断 | 观测端点区间 | 完整候选结果认证 |
|---|---:|---:|---:|---:|---:|
| VLZ6CCT8AQ0A | 699 | 99 | 22 | 77 | 0 |
| 8JRE1C4H4Z2W | 659 | 113 | 31 | 264 | 0 |
| CA5KE8GFJ9X2 | 264 | 41 | 14 | 0 | 0 |
| 5PM6JAQG6FNQ | 638 | 83 | 16 | 202 | 0 |
| 61E2QS63Y9WU | 442 | 63 | 11 | 127 | 0 |
| DUZUBAJ3A8GP | 599 | 77 | 13 | 189 | 0 |

总476候选段、107新题截断；完整候选结果与实际最优线字段全部仍null。消费者主动保留未认证边界，这不是476次错误选择或没有任何完整实打的证明。端点观测也不自动证明单卡因果。零血净损是截断结果，显示攻击减挡只作完整需求算术参考。相同推演值与无法比较分别核，不删合法选项。

## 验证口径、登记与交付

首次tsx CLI消费者因沙箱listen IPC socket EPERM退出1，原件保存在consumer.initial-failure.log；改用同权限Node --import现有tsx loader，原冻结输入与消费者源码不变，退出0。该失败不当游戏/算法错误，不冒称完整tsc/vitest。两次只读定位用不存在的learner/lib/selection-execution-audit.ts及agent/src/memory/turn.ts路径返回不存在，后续按实际路径核对，无生产修改。proposal初稿将VLZ末轮结束行手写成269777，读回原端点后更正为269779；初稿另存proposal.initial-draft.txt，原证据字节未改。
没有生产源码修改，撤源码失败/恢复通过不适用；未运行tsc/vitest或test-sandbox.sh，tests固定为{"tsc":null,"vitest":null,"cases":null}，不制造测试成功、版本或合入。merge=live步骤因无源码提交不启动，merged=null。未运行play，不停对局、不推送、不修改运维prompt。
只经根learner/ledger.py update给26个既有silent账本追加本批proposal/report链接及waiting说明，不重复历史证据、不改claim/status/version/effect。已shipped/retired状态保留，不以子项状态代替完整策略提案完成。专用队列状态交proposal_results，由调度器处理；不直接写队列或根请求。
没有新规则实际上线，故无规则双通知；原反例和缺证完整保留，未发现新增异议或与旧知识冲突，不强行支持原假设。所有临时材料仅在本批scratch；无相关新代码提案，不创建重复CLI id，code_proposals沿10个原id。implementation_domains为空，表示本批未实现源码。
本批材料密钥扫描、ledger CLI读回及最终HEAD/零差异证据在gitleaks.log/json、ledger-verification.json、final-verification.json；它们不计作游戏代码测试。

提案绝对路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-044302/learner/runs/20261013-044330-strategy-proposal/proposal.md
报告绝对路径：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-044302/learner/runs/20261013-044330-strategy-proposal/report.md

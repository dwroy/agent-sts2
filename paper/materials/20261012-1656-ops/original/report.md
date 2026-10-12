# 本批策略提案处置报告

时间：2026-10-12T16:50:36+08:00。batch：20261012-164302-s2-strategy-proposal。

十个原ID均保留waiting：现有证据可核局面和已上线子项，尚不能验收原提案全范围或启用新策略。本批无生产源码/知识改动、提交、合入或版本，未登记implemented、duplicate或shipped。

base：`ae5eb284f46d15914acb137fee57ee6ed99b7b3f`；开工工作树干净，合main后未变化。派发身份见dispatch.json；原十项文本SHA见assigned-proposals.json及原文副本。运维交接提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261012-164302-s2/learner/runs/20261012-164316-strategy-proposal/proposal.md`。

## 实盘验证

六局唯一SILENT/A10身份已核；限定房间共1062状态、1043决策，逐原始字节核SHA，四组配对同指纹与端点独立计算通过。详见raw-evidence-manifest.json、verify_evidence.py、paired-observations.json、mechanism-facts.json。

| 证据局/层/回合 | 原/替实损 | 原/替敌净扣 | 原决策行 |
|---|---:|---:|---|
| 8JRE1C4H4Z2W F33 T2 | 3 / 15 | 10 / 17 | 270216 / 270282 |
| YF0LXT1QSTGG F48 T1 | 0 / 9 | 45 / 38 | 271309 / 271348 |
| XP2SL33HT0D9 F33 T3 | 9 / 14 | 24 / 27 | 271992 / 272040 |
| XP2SL33HT0D9 F33 T1 | 2 / 10 | 25 / 34 | 271982 / 272195 |

这些是观察差，不是固定未来抽序的整战单变量对照。污染技能也产生毒/弱/挡，力量成长与后继改变必须同时保留；六次SL仍是一局。失落返力不证明所有属性来源归还；同类敌人index重排不提供持久实例ID；覆甲时序尚未隔离全部触发。

## 当前消费者与已存在源码

用本批从原日志重新生成的固定JSON运行现有audit-selection.ts，三次exit0；不是tsc/vitest、源码红绿或策略效果测试，也未读取刷新知识JSON。8JRE有66段/21次重问替代，YF52/22，XP58/22；所有完整候选结果仍为null。末轮实际净损5/18/11均保留；沙虫显示37−22=15、实验体44−23=21另列，双蟹混合非攻击意图null导致总攻击参考仍未知。具体消费者输出与统计见consumer-exits.json、consumer-summary.json和各局consumer.json。

核验live快照：`460725771eec2081ee531fe7922b3cb82d7a45ef`。下列源码提交均为该live祖先，只证明所列文件/有限子项，不能据此关闭十个综合提案。当前工作树与live在两求解文件中合计仅四处注释署名差异，原样保留；完整diff与blob证据见source-main-live.patch、source-proof.json。

| 文件 | 实际live祖先源码提交 | 本树/live/source blob |
|---|---|---|
| `agent/src/reflex/silent-selection-audit.ts` | `05cd292c6f01bb31e406473d3a9843e659d62b93` | 相同 |
| `agent/src/reflex/silent-selection-dispatch.ts` | `bade647f9fe4c9103b40e2f26b26296692ad24b7` | 相同 |
| `agent/src/reflex/silent-sl-resource-comparison.ts` | `a8b1f8be153fe4f3a34146117546c2178f2e446b` | 相同 |
| `agent/src/reflex/silent-phase-current.ts` | `8698c581dac6c7e957f50a381586960a6d0c9b57` | 相同 |
| `learner/lib/selection-execution.ts` | `04921bd785ac6838066522f91ea0bb6ab95cb6a1` | 相同 |
| `learner/lib/selection-observation.ts` | `8698c581dac6c7e957f50a381586960a6d0c9b57` | 相同 |
| `learner/lib/selection-terminal.ts` | `04921bd785ac6838066522f91ea0bb6ab95cb6a1` | 相同 |
| `agent/src/knowledge/monster-db.ts` | `4ed3c72df30f27b881da637aebf528b97440e0bb` | 相同 |
| `agent/src/knowledge/room-costs.ts` | `295a90aef9eb6f5b267490294f7733806419c45a` | 相同 |
| `agent/src/reflex/rollout.ts` | `a11dd870b09f3f1b67fcb5d6c08af6573fd809e0` | 仅四处注释署名差异（两文件合计） |
| `agent/src/reflex/turn-solver.ts` | `a11dd870b09f3f1b67fcb5d6c08af6573fd809e0` | 仅四处注释署名差异（两文件合计） |

首个当前进阶HP/攻击观测读取与房间代价五样本门槛已存在；本批未改变。现有选线审计、SL资源预测差、当前阶段事实、端点与终局观察均只覆盖其明确字段，未认证完整候选收益。

## 十项处置

各项完整证据、层/回合、全部账本ID、反例、预期行为和待补验证见proposal.md；本表列主要账本与具体阻塞。

| 原ID | 主要账本 | 处置 |
|---|---|---|
| `silent-proposal-c20b5139dd0dff71` | silent-0168 | waiting：当前逐技能污染及火花增长路径已有；缺联合毒/弱/弃牌的固定源码重放与完整替线后继，不能据9点净损启用少打技能规则。 |
| `silent-proposal-ae9e692d680e3819` | silent-0183 | waiting：缺遗忘死亡返敏、多来源同属性及临时增减混合归还帧；现帧总属性不能替代来源账本，不能验收完整返还模型或固定击杀序。 |
| `silent-proposal-52f1e1bd2e7db0ed` | silent-0231 | waiting：首样本读取及房间代价五样本门槛已存在；覆甲独立触发、时序及历史移动表实际输入未齐，不能据单局扩写完整模型或固定房间成本。 |
| `silent-proposal-6dd8bbff876be528` | silent-0233 | waiting：高电压增长路径已有；缺稳定实例标识和同种重复召唤对照，不能验收新旧实体隔离全范围或推出固定击杀顺序。 |
| `silent-proposal-578e415a259e6835` | silent-0079 | waiting：选择/派发/死亡端点子项已有live源码；66段中21段被重问替代，完整候选兑现及跨重规划资源归因仍未验证。 |
| `silent-proposal-c0767768bf6a7ab1` | silent-0079 | waiting：覆盖重放及弃牌后整候选完成未证实，缺受控完整胜线；已有预测差与端点审计不足支持新增探索禁令或惩罚系数。 |
| `silent-proposal-a46bdb7fe711d79a` | silent-0021 | waiting：本帧已建/持有/零毒与终局端点已有实现；分阶段累计已结算伤害和完整候选归因仍未验收，不能据此调整排序。 |
| `silent-proposal-1044224808015e5c` | silent-0079 | waiting：成长及后继同时变化，缺独立完整胜线；同轮血价差不足启用零胜并列时固定低损血优先。 |
| `silent-proposal-7cbc6005db712ba9` | silent-0241 | waiting：完整候选联合验收及额外触发未完成；末轮实损11已有消费者覆盖，混合意图null仍未知，不据此补零或改排序。 |
| `silent-proposal-c59f592f1427a67e` | silent-0021 | waiting：两局110段中44段被重问替代；完整能力收益、恢复链及候选资源归因未齐，现有审计子项不能关闭综合提案。 |

## 测试、记录与限制

fixes=[]；merged=null；源码提交、游戏版本均无。没有生产变更，不运行tsc/vitest或撤源码红绿，三字段均null，不用0冒报通过。仅核验原始数据、现有离线消费者和live祖先来源；gitleaks材料扫描与最终HEAD/干净状态见final-verification.json。

不重复code_proposals add，不覆盖原文或原队列历史。只经根ledger CLI补本报告链接与原ID处置说明，不重复累计旧局证据、不改claim/prior/version/status；这是已有项目的链接更新，没有新proposed条目或shipped登记。特别保留silent-0021/0079等先前已上线的有限范围状态，不因父提案waiting降级。精确CLI输入、回执及写入后审核见ledger-update-input.jsonl、ledger-update-receipt.txt、ledger-update-verification.json。

保留的操作问题：首次身份断言把日志大写SILENT与小写silent直接比较而失败，随后按角色键小写规范重新从runs读取，六局唯一身份均通过；该失败不是游戏证据冲突或代码测试失败。早期探索的不存在路径与终端输出截断没有用于结论；后续按实际文件及限定字段读取。30条账本初始浅合并快照另存initial，正式快照按ledger.apply累积，不丢历史证据。

没有增加或发布策略，因此无需制造规则上线通知、eval版本或合入记录。所有临时材料均在本批scratch；未运行play、联网、读其他角色知识或修改运维prompt。不能声称全历史覆盖、历史dirty源码复原、完整候选执行或胜率收益。待新证据按原十ID继续派发。

完整机器结果：[report.json](report.json)。

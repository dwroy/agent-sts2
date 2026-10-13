# 20261014-014302-strategy-proposal 回报

记录时间：2026-10-14 02:01:19 CST。本批十项均waiting，fixes=[]、merged=null。未改源码/知识、无提交/版本/shipped。停止原因包括实际29文件合入冲突及逐项尚缺的消费者/受控数据；不把已核机制说成无证据。
完整40位base：`6e78ec08cd7eb641b8ccd8f4c466bad8a7319058`。只读live截点：`7e04d9a42dd6080a8d3716dd165e44d4b30c458d`。
交运维提案：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-014302/learner/runs/20261014-014334-strategy-proposal/proposal.md；完整逐项证据、层/回合、账本、旧/新行为、反例、验证和回退见该文件。原十提案Markdown逐字节副本与原JSON绑定保留。

## 原始证据核验

从logs/runs.jsonl核派发及原提案引用局角色，未借其他角色知识。五局从全局原日志核原行、字节offset/length、SHA256，并保存verified-states.jsonl、verified-decisions.jsonl及两个manifest；五局共3,010决策和3,236状态，分别PD9 1017/1125、L2 442/447、ZTRG 594/607、K2 722/814、79UC 235/243。
没有将十个派发锚点或原经验全史数量当实际本次全量分析。旧dirty代码没有完整快照，当前live不冒认当时源码。

直接读回：PD9 F48进58→胜后10、F49进10空药，末32挡/两凋萎各12/23来袭，玩家3→0、敌250→244；滚石50未兑现。L2末T8只有攻击，昏眩限制后精密瞄准129→113、玩家17→0，不能报漏打防御。ZTRG末T14 4血/6挡死亡、神官58血，17次实际饮用与新药来源分列。K2零毒升级蜃景耗1能/16挡不变，普通8毒/2敏加10挡；K2毒药42→48/HP54不变，79UC毒药4→10/HP8不变且感染先死。关键帧摘要见key-state-facts.json，原SHA见manifest。

## 限定离线消费者与失败保留

既有learner/audit-selection.ts仅消费冻结JSON，不写游戏或知识。初用tsx CLI因沙箱listen EPERM失败，五份原stderr及rc1保留；随后用Node原tsx loader直接加载同一入口，不降低沙箱权限。初输入缺消费者要求的run对象而拒绝，失败原件保持，后补真实runs.jsonl行。
全局原五局中PD9两条、L2一条、K2两条没有decision_id，严格全局输入校验分别rc1；没有编造id、排序掩盖或放宽校验。原始完整输入及三份失败保留。只对其身份完整的目标战斗生成有界输入：PD9 F48/F49 306决策/374状态、L2 F17 285/286、K2 F33/F46 160/206，各同一入口exit0。ZTRG 594/607与79UC 235/243完整原局输入exit0。两种覆盖不能混称五局全量消费者通过。

五份有效限定输出共1,580动作、394候选段、298轮窗口；180轮有观测端点、118轮unknown，394候选段全部未证完整执行。ZTRG69、PD9限定43、L2限定51、K2限定17有端点，79UC全部42轮unknown（原尝试身份等边界未核）。这些是窗口/动作数量，不是独立局、候选完整执行数或胜率样本。
ZTRG首试F17T10整轮神官130→109净扣21，候选局部扣3另记；末试T13神官73血/玩家4血不变。重复敌类型、目标重排、实际未截断伤害和candidate因果仍未知。详见consumer-summary.json、bounded-consumer-summary.json和各audit.json。

初次决策筛选仅查看前700字节导致漏行，保留header-filter两份原件后按完整原行及顶层run_id修正；首次79UC末端切点少一条、PD9状态开头少六帧均已从相邻原字节补齐，并与runs计数核同。原断言失败及补取过程见extraction-correction.json。一次将kin frames列表误当字典读取返回AttributeError，后按实际列表读取；不属于生产失败。

## 已部署子项核对

以下每项均核实际live祖先，固定live字节和本地比较见live-source-verification.json。只证明子项存在，不作为十项implemented/duplicate凭证。

| 文件 | 真实live源码祖先 | 与本地字节相同 |
|---|---|---|
| agent/src/reflex/silent-kin-progress.ts | `7e5cd982d40054e751bb0096e403e3cf7cf50ba0` | True |
| agent/src/reflex/silent-selection-audit.ts | `05cd292c6f01bb31e406473d3a9843e659d62b93` | True |
| agent/src/reflex/silent-selection-dispatch.ts | `bade647f9fe4c9103b40e2f26b26296692ad24b7` | True |
| agent/src/reflex/silent-demon-potion.ts | `8bb53d6342b7e9a2adf96de231b53c36eaa943de` | True |
| agent/tests/silent-upgraded-mirage-zero.test.ts | `d2afe7f39a512c89ae3576056ae86e95bcf05e60` | True |
| learner/lib/selection-execution.ts | `9b87d54f097d84521152e6cca8d6072af8140394` | True |
| learner/lib/selection-observation.ts | `8698c581dac6c7e957f50a381586960a6d0c9b57` | True |
| learner/lib/selection-turn.ts | `9b87d54f097d84521152e6cca8d6072af8140394` | True |
| learner/audit-selection.ts | `6f3f783941270ac182237c46068097ff67e85907` | True |
| agent/src/reflex/potion-cost.ts | `e1a467e18a0dfa8d99046a24ff4c0e1af59278c8` | False |

potion-cost.ts与本地字节不同，已直接从固定live读核no_table/no_value/worthless、holdHp=null及错误来源分列；未把本地文件当部署版本。升级蜃景零毒子项源d2afe、当前同族事实源7e5cd、候选快照05cd、首动作回执bade、离线完整轮入口9b87均不关闭对应宽父项。非双bossCRUSHER/WRIGGLER毒药加6仍未进现有知识恶魔/双boss条件入口，局部机制证据充分，实施受本次合入冲突阻塞。

## 十项结果

| 原id | 状态 | 具体阻塞/缺数据 |
|---|---|---|
| silent-proposal-c2888032d1337388 | waiting | 十五账本关联机制尚缺全部已核组合的固定生产消费者回放，不能将几个已有子模型登记整项duplicate；本次29文件合入冲突阻止补齐实现。 |
| silent-proposal-042ee2299084b528 | waiting | 缺实际血药来源完整进入连续boss、路线和休息消费者的固定联合读回及未选整场对照；现有子接口不足以整项duplicate，本次合入另有29文件冲突。 |
| silent-proposal-8cd3db3bad5f34f1 | waiting | 缺在线持续候选身份、完整执行判定及原线整场结果，不能将有限全死或局部省血改成SL必死/权重规则；新增追踪实现另受29文件合入冲突阻塞。 |
| silent-proposal-43fe170707574455 | waiting | 当前同族快照子项已存在；跨帧实体/退场身份和构筑组件实际兑现的消费者链尚未完成，不能整条duplicate。新增追踪受29文件合入冲突阻塞。 |
| silent-proposal-3f5a665dca133a8c | waiting | 缺候选到整轮实际路径的持续绑定和可比原线整场反事实；已有候选审计/单动作回执/端点观测不能整项duplicate。源码补齐受29文件合入冲突阻塞。 |
| silent-proposal-0b8ef30de463f317 | waiting | 未完成实际取得/SL恢复/持续层进入药水消费者的完整联合回放；缺晚喝或留药整战受控结果，不能拟合持有价和时点。现有no_table分源只覆盖子项；合入有29文件冲突。 |
| silent-proposal-5367449b857450a7 | waiting | 缺暂减力、脆弱、覆甲、铜钹随机/限伤及刀扇容量联动的全部固定生产调用；不能整包duplicate或推广固定附伤。新增实现受29文件合入冲突阻塞。 |
| silent-proposal-9b8890c2649a2734 | waiting | 缺护栏原线、晚喝铁心、未走路线的完整同条件对照，以及资源事实到路线/休息消费者的连续读回。与其他追踪子项同源不构成整项duplicate；合入另被29文件冲突阻塞。 |
| silent-proposal-645ff7b72e0b9991 | waiting | 升级零毒和感染子项已在live，但短推演收益/尾端贡献到完整候选执行的联合消费者校核仍缺；无替代整场受控胜线，整项不能duplicate。补充实现受29文件合入冲突阻塞。 |
| silent-proposal-68ef2857229d1287 | waiting | 非双boss两组当步加6证据充分、当前覆盖仍缺；本批29文件合入冲突阻止实施。条件入口到题面/短推演和感染先结算的固定消费者验证未完成，未核交互及饮用时机整战结果仍未知。 |

## 自测、记录和交付边界

无源码改动，撤源码失败/恢复通过、tsc、vitest、新增cases均不适用，tests全部null；既有离线消费者的exit0不冒报源码自测或完整套件通过。合入null、提交无、版本无，无需发布和规则双通知。29冲突的只读merge-tree不是实际合入失败或源码测试失败。
账本只经根learner/ledger.py CLI追加本批核验/报告链接，by=learner:strategy-proposal；不新造经验/提案id，不回退旧shipped状态、不标新shipped，队列等待由调度器消费原十proposal_results。原父量化要求不因报告结束而关闭。本批没有新游戏规则或与旧经验相冲突的新结论，原反例仍保留。
实际learner_launch原生启动参数为gpt-6.1-sol、xhigh、default；题面写high，启动器实际配置保留，无改账号/权限或另开模型。
安全扫描、账本CLI及最终工作树验收结果见acceptance.json和final-checks.md。本批首次scratch扫描和末次自有交付扫描的真实退出码分别保存，不将未运行测试记0。

机器回报：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-014302/learner/runs/20261014-014334-strategy-proposal/report.json。

# 静默策略队列本批完整报告

## 结论及派发身份

本批十个提案逐项复核完成，全部waiting；没有新增生产源码、知识、提交、合入、eval版本或shipped登记。已存在的有限审计/事实子项与未完成的完整执行、实体归属、累计收益和策略校准分开交付。量化学习父要求继续开放，报告交付不关闭父要求。

task=strategy-proposal，character=silent，batch=20261013-074302-s2-strategy-proposal。
learn.json本批task/character/worktree/runs和十个proposal_ids逐字核对；reason=proposal，未带research_request、implementation_request或proposal_repair。
普通根deck-size请求绑定另一旧批及工作树，不匹配本批；本批按已领取十id执行，没有读取其他专题代替身份、没有领取其余队列，也没有写根请求或learn.json。
git status初始干净；git merge --no-edit main返回Already up to date；完整base=800bc5eba27cffe6643e79642c3d2698eec10f27。
只读捕获live=79ae8287baef2892db9f1c69b8f8ce144286ee03。后续live移动不能改变本次证据出处；源码副本均为.txt。

模型核验限制：本沙箱进程祖先只有codex及shell，未暴露模型/推理/服务档白名单参数；没有可用的原生请求配置读回接口。runtime-identity.json记录native_request_model_verified=null；没有修改模型设置、账号、权限或用默认值冒报实际运行模型。历史六局脑日志的high是历史记录，不改写成当前会话运行凭证。

## 原始证据与样本边界

| 文件 | 本批原始行数 |
|---|---:|
| runs.jsonl | 6 |
| states.jsonl | 4062 |
| decisions.jsonl | 3941 |
| fight-plans.jsonl | 0 |
| sl-attempts.jsonl | 38 |
| run-config.jsonl | 6 |
| brain.jsonl | 188 |
| codex-calls.jsonl | 188 |


共8429条原始记录按各文件捕获字节切点、物理行号、offset、bytes和逐行SHA256保存。重新seek原日志核对全部行与本地副本逐字相同。原日志只读。
states角色来自state.run_id/state.run.character_id；没有按不存在的顶层run_id漏掉状态帧。runs.jsonl六条唯一记录全部SILENT/A10，均于2026-10-07完局且最终失败，历史运行code均带dirty。各局源码、知识与移动表不是当前源码快照，未复原整个dirty运行树。
六局对应复盘段落的原字节、offset与SHA256另存lesson-manifest.json；没有追加第二份历史复盘。每条原提案Markdown指纹全部核对，保存原件。
本批目标窗口1062状态帧、1043决策，按原observed_ts和fingerprint回连，193个分层/尝试/回合组。它们是取证范围，不是1062个独立实验。各机制按其本项来源局计样本；同存档多个SL仍只计一个独立局。
fight-plans无本批记录，run-config的fight_plan=off；不将缺记录视作读取失败，也不捏造完整计划执行率。

## 同指纹配对与事实结论

| 本角色证据 | 原/替尝试 | 实损 | 本体净扣 | 已核边界 |
|---|---|---|---|---|
| 8JRE1C4H4Z2W F33 T2 | 1/3 | 3/15 | 10/17 | 多12血、多7净扣；五轮0/24与5/24死亡不是同死率 |
| YF0LXT1QSTGG F48 T1 | 2/3 | 0/9 | 45/38 | 多9血、少7净扣；截断防御续步 |
| XP2SL33HT0D9 F33 T3 | 1/2 | 9/14 | 24/27 | 多5血、多3净扣；后轮路线仍有变化 |
| XP2SL33HT0D9 F33 T1 | 1/6 | 2/10 | 25/34 | 多8血、多9净扣，替线另取得1力量 |

四组完整fingerprint字符串逐字相同，哈希及原决策行在same-fingerprint-pairs.json；原决策/候选/实际动作另存paired-decision-references.json和target-decisions.json。
血与敌本体净差取首次所选动作前至下一玩家轮，含已经结算的毒、遗物等；不是卡牌动作直伤，也不是逐来源独立归因。没有跨阶段用净差伪造输出，没有把未结算毒或候选差额算实际收益。
YF F33第二次SL实胜余20血，是“统一禁止探索”的明确反例；YF F48六次全败与XP六次全败不能推导所有探索无效。沙虫末次换防御多存活轮但仍败、XP末次T2零损而T4/T5仍死亡，说明当轮保血也不等于整战胜利。
目前只有样本内同轮资源差，缺共同后继完整胜线与后置独立验证，因此不能拟血价比例、持续价值权重或把零胜率差当安全保证。

本批还重新核实污染/火花、蚌加压与弱、电击成长、失落返力、实验体换阶段零毒触媒、敏捷取得时序、双蟹临时减力与朝向、轮初挡、匕首雨16/20及最后毒3+7。
所有明确数字连到原状态行，31项固定证据完整性/算术核对结果保存evidence-verification.json；这是原证据核对，不是生产求解器回放、红绿测试或tsc/vitest。
实体raw字段只有index、enemy_id及现场属性，没有稳定实例ID；同名新召唤与旧实体的归属不能由index重排推定。
混合意图的total_damage=null保持未知，不改成0；覆甲现场序列不能单独推导减层条件，轮初14挡不能由单帧推导全部额外触发条件。

## 已有源码及实际live祖先

| 已存在有限子项 | 捕获live源码祖先 | 本批判断 |
|---|---|---|
| silent-selection-audit.ts | 05cd292c6f01bb31e406473d3a9843e659d62b93 | 原答/SL前后候选；actual_turn=null |
| silent-selection-dispatch.ts | bade647f9fe4c9103b40e2f26b26296692ad24b7 | 单动作回执；whole_plan_executed=null，state_effect_verified=false |
| silent-hp-guard-audit.ts | a8b1f8be153fe4f3a34146117546c2178f2e446b | 护栏前后预测；actual_outcome=null |
| silent-phase-current.ts | 8698c581dac6c7e957f50a381586960a6d0c9b57 | 现场持有/已建/毒事实；poison_damage_already_dealt=null |
| silent-sl-resource-comparison.ts | a8b1f8be153fe4f3a34146117546c2178f2e446b | 同轮候选预测资源差；execution=unverified |
| silent-sl-comparison.ts | a8b1f8be153fe4f3a34146117546c2178f2e446b | 候选/抽牌重规划参考；actual_turn_result=null |
| monster-db.ts | 4ed3c72df30f27b881da637aebf528b97440e0bb | moveDamageAt/monsterHpAt当前进阶首样本读取；不需房间五样本 |
| room-costs.ts | 295a90aef9eb6f5b267490294f7733806419c45a | MEASURED_ROOM_MIN_N=5，房间代价不降门槛 |


捕获live的combat-plan.ts在3946/4140/4233/4294/4424/4467/4568有相关事实/比较/审计接线；hand/loop.ts的1457有首动作回执接线。每个子项祖先以源码实际live路径的git log与merge-base验证，不把main来源提交自动当live实现。
基础monster-db、八个专用辅助及room-costs等逐blob比对在source-provenance.json；共享combat-plan/turn-solver/rollout/rollout-live/card-model/passive-pieces/hand/loop有base/live差异，未用base测试代验live。
这些源码证明预测/现场事实/单动作回执已存在；其明确null/unverified字段也说明没有整轮执行或累计伤害归因。广义提案要求还包含联合模型、完整后继或消费者读回，因此没有任何原id可整体登记implemented/duplicate。

## 十项处置

| 原CLI提案 | 主题 | 状态 |
|---|---|---|
| silent-proposal-c20b5139dd0dff71 | 感染棱柱技能污染 | waiting |
| silent-proposal-ae9e692d680e3819 | 抢夺与返还的实体归属 | waiting |
| silent-proposal-52f1e1bd2e7db0ed | 下水道蚌成长与当前进阶事实 | waiting |
| silent-proposal-6dd8bbff876be528 | 电击机器人成长及召唤身份 | waiting |
| silent-proposal-578e415a259e6835 | 沙虫SL、HP护栏与成长执行审计 | waiting |
| silent-proposal-c0767768bf6a7ab1 | 实验体全败并列的实际血价 | waiting |
| silent-proposal-a46bdb7fe711d79a | 实验体分阶段毒与能力兑现 | waiting |
| silent-proposal-1044224808015e5c | 双蟹零胜率探索的血价与成长 | waiting |
| silent-proposal-7cbc6005db712ba9 | 双蟹朝向、临时减力和轮初挡 | waiting |
| silent-proposal-c59f592f1427a67e | 二十条经验的机制与SL资源整包 | waiting |


逐项证据层/回合、原账本id、旧/拟行为、已覆盖范围、反例、具体缺数据、验证与回退见本目录proposal.md；proposal-results.json逐项保存等待原因。
只处理本批派来的十个CLI id。没有新id、没有 implemented_commit、没有把研究请求id填成代码提案。

## 账本与实现状态

本批只经根learner/ledger.py update追加相关30条既有silent账本的proposal/report链接及复核范围说明，输入与CLI输出分别保存ledger-updates.jsonl、ledger-update.out、ledger-update.err。
不创建重复机制账本，不重写evidence、claim、prior、历史复盘、旧状态或version；已proposed的旧待验项保持proposed，旧shipped状态不由本学习者重新登记。没有将任何条目标shipped。
不直接改code-proposals.jsonl；逐项proposal_results交原调度器机械追加waiting。无需再用code_proposals.py add重复已有原id。

fixes=[]，merged=null，implementation_domains=[]；审查题目领域为combat/sl/structure，但本次没有实际代码实现。
撤生产源码失败/恢复通过：未运行，未改源码；不能填成功。tsc、vitest、cases均null，未借其他批成功结果。无代码提交，因此未运行提交前gitleaks、未新建Co-Authored-By提交、未推动live或执行上线流程，未新增游戏版本。没有运行play、网络或LLM调用，没有读取其他角色知识、凭据或游戏二进制。

初始取证曾搜索不存在的core/log.ts、eye/decision.ts、sim/room-costs.ts及单数knowledge/room-cost.ts，原诊断记录保留；随后定位hand/loop.ts及复数knowledge/room-costs.ts，source-provenance.initial.json保留首稿。不是生产代码失败，没有据此派新bug或报测试失败。

## 后续工作与实际消费者

每项沿原proposal/owner等待新局补证；本批不发明受控胜局，不把旧来源局重复当新独立数据。需要的新信息分别是移动表冻结输入、稳定召唤/抢夺来源身份、完整重规划执行链、逐来源累计能力收益与后置独立策略验证。
经验入库与大脑实际采用由原experience-update/消费者验收链继续核对。当前原六局发生于后续源码上线前，不能用它们证明新增审计消费者已读回，也不能从代码已合入推导策略收益。二十经验整包及量化父要求仍开放，报告不宣称live经验沉淀或大脑采用完成。

最终交付proposal：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-074302-s2/learner/runs/20261013-074326-strategy-proposal/proposal.md。
最终交付report：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-074302-s2/learner/runs/20261013-074326-strategy-proposal/report.md。
完整JSON：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-074302-s2/learner/runs/20261013-074326-strategy-proposal/result.json；最终身份、材料SHA与工作树检查另存final-verification.json。

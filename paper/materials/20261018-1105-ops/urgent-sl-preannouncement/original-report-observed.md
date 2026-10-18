# Silent 战斗 Jev 预留、SL 重试预算和四次上限

授权：Roy 2026-10-18，经 Claude 紧急指派；docs/human-pace-plan.md 第2节 / 678104758。实现仅在实际 Silent 角色的现有 H1/SL 入口生效。独立工作树 `.worktrees/sl-retry-budget-20261018`，基线 `b155d00a36080418149e63d2f21b491d34d7f40a`。没有启动真实对局、模型、研究、观察器或游戏模拟，没有改账号、home、模型、强度、知识或运维 prompt。

三项实现如下：

|项目|旧行为|新行为|
|---|---|---|
|Jev 预留|B2仅有原约1秒余量，solver/rollout没有统一保护Jev的窗口；可在请求前耗尽父预算|每个战斗回合保护3秒。真实planner和其全部solver/B2/rollout读取同一受保护计算余量，观察到的闲时预计算及thief计算也受保护；普通/精英/Boss均适用|
|SL重试回合|实际循环统一选retry种类，即10秒，Boss也被缩为10秒|根据实际战斗类型选择：Boss60秒、精英15秒、普通10秒，首试和重试一致；精确输入缓存仍复用|
|Silent SL次数|Boss默认最多6次，总上限还受配置影响|所有既有SL门槛统一最多4次（首试1、重试3）；配置原本更少时不增加。其他角色原配置、次数和路径保持|

预留以整个回合为单位，跨卡牌步骤、重问共享；Jev实际等待会消耗这3秒预留，后续步骤不会重新获得3秒，也不会把60秒变为63秒。B2原有额外1秒收尾余量和rollout本身100ms余量保留；算满时B2实际worker截止不超过Boss回合的56秒，普通/精英分别同原父预算保护。实际Jev阶段退出计算作用域，能使用完整剩余时间；其真正超时沿现有候选兜底，正常已接受回答不被计算截止改成默认候选。既有无Jev模式、执行闸、L0直接动作、严格回答规则、故障分类和SL判死/读档不变。

`HUMAN_PACE_BUDGETS.retry=10000` 仅保留兼容历史工具/测试接口；实际 Silent 循环不再因为 `slEnv` 选择它。也没有把通用 `SL_BOSS_RETRIES=5` 改小而影响其他角色，实际上限在controller按当前state角色实施；各门槛的日志/提示maxAttempts来自实际四次上限。原生role入口和三类SL门槛均有固定回归，避免只改默认配置却不改变实际运行。

日志仍为decision-budget-v1，新增 jev_reserve_ms、jev_actual_ms、jev_reserved_remaining_ms、computation_remaining_ms，以及combat_computation阶段。计算截止与整个回合耗尽分开记录。L2独立90秒和shadow独立记账保持，旧C1/C2、R394采样/无差别早停、种子、精确缓存、候选、排名、SL判定及药水规则均不修改。

原始记录核对还纠正了上一份报告的错误分母：`per-fight.csv` 的 first_attempt_jev_deadline 使用 `not(sl_attempt or0)`，错误地把实际首试 `sl_attempt=1` 排除。原CSV/原报告保持原字节，此处独立更正，并将更正明确交付Roy和ops。五场78次截止中，首试为7次，重试为71次；不能据旧字段写成全部在重试。

|F17局号|全部截止|首试=1|重试≥2|有Jev限时阶段|无Jev阶段的预算分支默认|
|---|---:|---:|---:|---:|---:|
|0NMF36KX3F7Y|20|1|19|13|7|
|9W38TRGPJW9Q|32|3|29|19|13|
|NRZAYVRMM7M0|20|3|17|18|2|
|KCA04Q3SEYTF|4|0|4|3|1|
|KRLPMR0FWVZE|2|0|2|2|0|
|合计|78|7|71|55|23|

因此也不能把所有78次描述成“未调用Jev”：55条已进入Jev限时阶段，但其答复未被接受；23条走了请求前预算耗尽分支。Jev阶段存在不认证服务端已经收到请求或生成答案。真实首试7次截止也说明预留需要覆盖首试和普通/精英，而不只是放宽SL Boss重试。

逐原行复核1356条五场F17预算记录，覆盖281个回合时钟组，包括105条非combat标签但共享同回合预算的选择记录；1251条combat记录与原CSV分母一致。每条原日志均按原offset/bytes/SHA回seek核验，没有以压缩摘要替代原行。`five-fights-budget-records.jsonl`、`five-fights-schedule.json`、`five-fights-correction.json` 保存数据与推导；旧五局原范围未扩大到另造失败或新样本。

离线核对调用本工作树的真实DecisionBudget、withCombatComputation、withinDecisionBudget和战斗预算类型函数，只回放时钟，不调用模型或模拟游戏。按原首次候选前的计算耗时重放，并另做算满57秒的边界：

|局号|新上限内的重试候选回合（attempt2–4）|原耗时回放的最少Jev余量|算满计算份额时Jev余量|
|---|---:|---:|---:|
|0NMF|17|50.434秒|3秒|
|9W38|18|50.052秒|3秒|
|NRZA|20|50.125秒|3秒|
|KCA0|19|50.872秒|3秒|
|KRLP|23|50.470秒|3秒|
|合计|97/97有时间|最低50.052秒|97/97为3秒|

原attempt5/6的96个回合在新上限下不可达，明确标为不执行，没有填它们的“新JeV回答”；没有候选问题的L0回合也不强制模型。旧71次重试截止中55次在保留的attempt2–4，16次位于取消的attempt5/6。复算采用观察到的耗时需求和协作截止契约，新预算下实际采样/选择/耗时会变化，不能把静态时钟回放报为自然API接受、保证网络在3秒内答复，或断言旧五局会过F17/F33。完整结果见 five-fights-clock-replay.json、replay.ts、replay.log。

固定验证：首轮4文件20项通过；最终5文件34项通过（重叠子集，不能相加）。覆盖普通10/精英15/Boss60的首试和重试、跨步骤共享/不重复加时、Jev SDK真实入口拿到3秒并在真实限时触发取消、B2实际worker截止、三个SL门槛及其他角色原六次路径、真实runLoop在重试Boss算满计算份额后仍实际请求Jev且接受回答。所有传输/SDK均为固定内存替身，未访问网络或游戏。最终八叶固定SHA见source-before-check.json；完整沙箱和交源终局在下方补记。

交原ops要求：本次是Roy明确批准的Silent规则变更，必须独立发布并在原live锁内正式核号，保留并行知识/校准/R394及全部历史。双通知逐项列旧/新规则、授权678104758、五场原行及固定检查、预期恢复Jev机会及限制、回退。实际最终live精确树宿主只沿原通道请求一次，不借源端或旧树绿。撤销时仅反向本八叶增量，保其他知识/发布/历史；实际行为回退另编号。source WT待实际交付/检查后由原retention登记，不提前删除或关闭H0/0332/human-pace等宽父。

另附 per-fight-first-attempt-corrected.csv：原442场仅重算 first_attempt_questions / first_attempt_jev_deadline 两列，75行有更正；所有其他单元格逐项保持。其输入仍是原冻结小表，不冒本轮重核全部历史原行；本轮独立回seek覆盖所指五场1356行。旧CSV不重写，详 csv-first-attempt-correction-receipt.json。

# F48 联合评估 shadow 实现

Roy 2026-10-16 22:19 经 Claude 明确授权现在实现，覆盖原 joint-design.md “先等0332”的实施顺序建议。原父 roy-20261016-global-build 和 owner 会话不变，没有 Codex goal、新学习父、模型或自然观察。

## 数据流和隔离

新模块 `agent/src/sim/f48-joint-shadow.ts` 只汇总现有返回值，不导入或调用 runner、worker、求解器、游戏接口或模型。B2 在既有 runLines 和排序完成后汇总，只有 simLog 读取新字段；B3 在既有 compareOptions 完成后汇总，withBossSim 只把结果写入 record，不加到 simFacts、题目、指令或排序。原胜率/HP/S shadow、C1/C2、SL、用药及预算都保持。

入口限定 Silent、当前 F48；其他角色不构造记录。已有接口/观察模型不适用的进阶或输入没有 continuation 时，只记 existing_continuous_computation_unavailable，不建立新模型或补模拟。B2/B3 都写 `boss_sim.f48_joint_shadow`，schema 为 f48-joint-shadow-v1、mode=shadow、delivered=false；后者表示未交给决策消费者，并非宣称已经上线。

每条 B2 原候选以 line:<原索引> 保留身份；B3 保留原 option key，基准为 @current。候选输入/执行计划/既有顺序、原输入和后场观察分布各有 SHA；seed manifest 取实际返回的 G1a seed，不用数组位置冒充配对。运行代码、知识、局号、SL 试次沿所属 run-config/decision 关联，未捕获的身份不倒填。

## 资源、结局和 unknown

复用 continuous-boss-result-v1 的真实样本 `firstResources`、`secondEntry`、`openingHpLoss` 与两战 flags，不重新运行或重算第二场。F48 获胜样本分别汇总 HP 的 n/min/p10/p50/p90、占用药槽 key 组合、剩余复活对象组合、已记录开场损失与模拟 F49 入场 HP；F49 capped/timeUp 不从有效 F48 出口分布里删除。

药槽保留 POTION:id:slot，重复瓶不合并；剩余复活对象不恢复。汇总器仅核对已返回的入场扣除一次，不重新扣血或授予奖励。G1a 未返回的 maxHP、物理已用药槽、按战分开的实际复活使用和开场充能均为 null，奖励/过场、实际第二场开场和未建模资源均写 unknown。日志中的资源组合是现有模型返回的子集，不冒充完整真实药带。

firstWon 却缺资源、非正/非有限 HP、转入资源不一致、重复 seed、未完成或缺样本，都保留原因并压住数值概率。0332 抛错时保留现有独立封套引用，联合记录 continuous=null、status=unknown。原 G1a 分母和原始计数不改；安全 trace 最多三条，不让无效资源进入数值 trace。原接口在无首战胜样本时的条件率/联合 null 约定保持。

F49 已完成结局与其返回的少量出口资源单列；模拟胜负、资源持有、实际使用和整局实盘结果不同字段，实盘结果为 unknown。F49 始终 low_trust，production_calibration、joint_calibration 和 joint_S 始终 unknown，不使用单战 Platt 校准联合率。

## 配对和预算

以第一条既有候选作固定参考，同 seed 配对；两边首战都获胜时还必须是同一 F49 变体。记录完整对数、各边未匹配数、原 seed manifest、联合胜负差向量。只有全原计划样本可完整配对且两个 G1a 联合率均有定义时，才记录 raw 差均值与样本标准差/√n；不足两对或缺口一律 null。MC 标准误只描述冻结模拟的抽样误差，不是当前生产或真实胜率校准。

C2 提前停止和 worker range 保持；短前缀不填失败、不补样本。B3 缓存 key 不加日志条件，不因新增记录打破原 memo；旧 memo 没有日志时记 unknown，不重算。已有 memo 的额外日志可关闭读取，不影响其他角色。

## 固定验证及历史失败

最终固定检查：生产 tsc0；7 文件 63 项通过，20.94s，nice19/maxWorkers2。覆盖同 HP 中位数却不同逐样本联合结果、重复药槽/已用复活不恢复、已扣开场损失、缺资源/0/NaN、F49 capped/timeUp、无首战胜、配对乱序/变体不符/重复 seed、C2 300/1000 不等前缀、旧 memo 不补算、B2/B3 实际日志入口、C1 故障引用、Silent 题面不变与 Ironclad/其他角色等价。

初次夹具用不同 now 函数对象比较 worker 请求导致五项失败；统一固定时钟对象后通过。C2 夹具首次没有并列优胜者，原算法合法在300一起停止，与写定1000的预期不符；改成原 C2 固定同率双优胜者/变化基线场景，未改生产算法或放宽断言。两次失败日志及后续通过均保留。唯一新源 sandbox full1：454 文件中 453 过、1 失败，4203 项过、1 失败；Vitest 483.45s，含 tsc 的入口总487.861s。唯一旧 ops-herdr.test.ts 的 fake learner 用例 line232 预期4 panes实3；该例全套耗时28.559s、固定进程sleep20s，与自然退出相容但不冒称已定位根因。保原 full1/log SHA199165268916636de86e9ca9319db4236215b5fcbe6e8dee21f705be6a81be71。未变原题单worker补验1过26未选rc0（题内5.54s、Vitest7.12s），未到paths补验11项0；不改任何断言/时限/排除，不重未变全套。原ops处置请求已实际运输，待其本人核原件接受组合依据后再提交精确源；补验不将原full1改成全套0。

## 发布与停止

源在 `.worktrees/codex-f48-joint-shadow-20261016`，基线59bab95ae含已发布R373诊断，0332根修复仍未完成。只交这七叶给原ops持既有live锁窄集成，保知识刷新、记录/index、R371/R372/R373。编号由ops按实际性质核，不能借任何旧树绿；实际新组合仍走原唯一宿主通道。

本次只交实现、固定检查和源。自然局验收等待0332根修复通过验收后Claude另派，不启动新局、监听、探针或G2/G3/G5等阶段，不宣称自然采用、联合率校准或收益。

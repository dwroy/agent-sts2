# G1a 连续 Boss 结果与资源接口

这是原 roy-20261016-global-build / G1a 的实现说明，owner 为既有 watcher 原生线程。工作树 global-build-g1a-interface-20261016，基于 main6476cb0d；源码待本次 full 完成后提交并交原 ops。知识来源仅为原学习者六局端点契约和已上线 continuation 实现，不新增机制、参数或对局。

复用 continuationInput、fightSample 和原 B2/B3/C2 runner，增加 continuous-boss-result-v1。第一战胜的每条样本仍使用其实际剩余 HP、物理药槽与未用复活资源进入原次战模板，使用原确定种子和第二 Boss 分布。原非正胜利 HP/缺资源异常继续走 C1，不补资源，不修原0332模型。当前问题 payload、排序、校准、采样/C2完成判定及其他角色行为不变。

接口把首战、在首胜条件下的次战、联合原始模拟结果分开。每个结果同时给 wins/samples/unknown/value/reason；缺请求样本、截断、缺资源以及首胜条件分母为零均保留 null 和原因。旧现有 win/win_cal 字段保持不动；新接口不把两个独立单场概率相乘。联合 calibration.status 和 S.status 均为 unknown，S.value=null，不使用单战 Platt 或单战 S 平均。

每条线/每个候选最多记录原顺序前三条确定种子样本。firstResources 是模拟首战结束后资源，secondEntry 是原 helper 构造的第二战入口，openingHpLoss 仅记录原已实现扣除；两者不使用均值 HP。药水以含槽位的 key 分开，已耗 Fairy/其他复活资源不恢复。资源记录只覆盖模拟已捕获的 HP/药槽/复活；奖励后状态、实际第二战可操作时状态和未观察开场效果仍为 unknown，不能称整个真实端点已建模。

B2 在 boss_sim.lines[*].continuous 记录；B3 在 boss_sim.continuous.base/options 记录。结果通过既有 worker 样本序列化、汇总和 C2 memo 保留，没有额外战斗采样或模型调用。G2 可在既定依赖满足后消费此结构，当前仅增加日志。

固定验收沿原 silent-double-boss.test.ts：两场各20HP独立获胜而同样本8HP连战死亡；不同样本8/18HP分别构造6/16HP入口；重复药槽与已用复活不恢复；请求缺样本、次战截断、缺资源、无首胜及空样本保持unknown；序列worker/选项汇总保留资源与联合S未知。新增夹具初次复用旧20HP计划导致第二样本仍8HP，已改为对30HP测试输入重新求解计划，生产断言/时限未改，原失败 native 字节保留。检查原件见interface-validation/checks.json与初次失败档，tsc0/focused12通过，full运行中。

原ops沿已有通道窄集成精确六叶；诊断接口本身不改变游戏行为，不另造行为号。知识行为独立V5-R368与原G4R367保持。仅本次新源码需按规则检查，不重复G1c源full或旧模拟。待实际集成、组合树宿主检查和新自然消费者后验收；旧RQ记录只作baseline，不借绿/借消费者。

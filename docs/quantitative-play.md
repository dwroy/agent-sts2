# 量化计算与校准接口

Roy于2026-10-11批准完整量化升级，并强调游戏随机性造成单次模拟误差。通用计算层不提供游戏知识；机制、核心组件及完整组合的资格条件由学习者依据本角色原帧验证。任务入口：`notes/core-cycle-quantitative-learning-request.json`。

## 模块与调用

`reflex/turn-solver`继续提供当回合状态转移。`quantitativeTurnFacts`把已有费用余量、伤害、格挡、HP与计划动作数送入战斗候选的同一facts入口。动作数不包括自动重放，不等于施放效果次数或完整组合次数。输出为条件模型预测，依赖原机制覆盖；不新增评分或必死判据。

`sim/build-sim`保留原预算、样本随机种子与比较策略，在Silent已有构筑入口启用`quantitativeFightFacts`。只读既有样本，不多跑一次模拟，不改变候选及排名。奖励拿/跳、购买/删牌、升级/变换、休息和事件沿已有`withBossSim`调用接收量化分布；按牌分组的选择也有对应输出。其他角色保留原题面。模拟失败、样本不足等原门槛保持。

构筑题的`quantitative_fight`给出紧凑分布；`boss_sim.quantitative`日志保留完整均值、标准差、标准误、p10/p50/p90、胜/死/截断数量、成对差及未知项。hand已有decision_id、fingerprint、chosen、请求/问答和SL记录负责绑定身份；完整量化schema版本不替代run-config的实际源码/知识版本。战斗候选事实保存在既有题面日志中。

`quantitative-calibration`接收学习者从实际决策、动作和状态提取的匹配记录。必须同角色、进阶、局、SL尝试、决策/指纹、实际采用方案、指标、窗口、模型版本，且观察完整、执行未偏离。未采用方案没有真实反事实；缺帧、重规划、跨SL数据不填零。按角色/进阶/模型/指标/窗口分组计算偏差、MAE、RMSE及经验80%区间覆盖率，重复预测去重。单次超出区间不自动产生bug；持续偏差需结合机制证据排查。

## 随机性口径

- p10–p90：当前模拟结果的经验分布，反映结果波动，不保证真实游戏有80%覆盖。
- meanSe：模拟均值的蒙特卡洛标准误，不是下一次游戏结果的预测误差；单样本为null。标准误为0也不能证明模型无偏或不存在稀有事件。
- 胜率区间：原始成功数的Wilson近似95%区间，0胜/全胜不会变成确定结论。未包含机制偏差、校准参数误差、策略/杀怪顺序选择效应，也不是经过Platt映射的真实胜率区间。
- 配对差只用双方完成的同一随机样本身份。相同seed降低比较噪声，不保证不同动作后每个随机事件仍一一对应。
- 模拟截止仍记录capped；已模拟回合不是完整战斗时长。胜局回合以wins为分母。超时完成样本可能带选择偏差，必须结合timed_out检查，增加样本也不能修复模型错误。

## 离线复用

在agent目录运行`node_modules/.bin/tsx tools/quantitative.ts`，stdin一份JSON，stdout返回一份JSON；无网络、无play、不读游戏或知识文件。

```json
{"method":"uniform-hand","deck":20,"draw":5,"components":2,"turns":12}
```

均匀手牌模型返回0.05263158每手概率、约0.63158期望合格手牌数。它只计算到手：所有组件唯一、每回合手牌边缘分布均匀、指定手数；不证明支付、触发、存活或合法完成。线性期望不要求不同回合独立，但不能由此推出首次启动时间分布。

```json
{"method":"cycle-bound","energy":3,"cycleCost":1,"resetCost":1,"actions":100,"componentActions":1}
```

在固定费用、每次完整组合后一次回流动作、无额外资源变化的抽象前提下，`k*cycleCost+(k-1)*resetCost<=energy`且`k*componentActions+k-1<=actions`，返回资源上界2。它不证明组合可达；零费无能量上界返回null，仍受动作上界限制，不能证明无限。

其他method：`samples`传values；`paired`传base/option数组，每项`{sample,value}`；`calibration`传`{prediction,observation}`的rows，字段见类型定义。损血差为option−base，没有自动“更好”判定。

## 仍归学习者的交付

通用接口不等于原请求完成。报告所有命题/反例的coverage、逐张循环/组合资格和资源约束、实际首次启动与完整组合次数、条件经验、未覆盖选择/路线调用及真实校准，仍由ops绑定学习批次完成。未提供经过证据验证的组合定义时，complete_combinations明确为null。抽象模型固定测试不充当Silent游戏验证；自然局读取、采用与收益分开登记，不能因文件存在或测试通过标记全部消化。

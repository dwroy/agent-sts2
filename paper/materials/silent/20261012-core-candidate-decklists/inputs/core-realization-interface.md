# 静默有限窗口量化接口

此接口续办 `roy-20261011-silent-core-cycle-quantitative-learning`，沿原三个提案0376/0385/0021。只扩展Silent A10生产事实，不改求解评分、药价、SL规则或候选。冻结证据为L704TLETMZBM F48第3试T3、KV0JHNJCKXLS F33第6试T1、54G5683J0E5S F33第1试T5—9；原A7复制毒药证据只用于限制，不外推A10机制。

`traceSteps(solver, steps)`复用turn-solver同一个play/resolveEffects，回放已经选择的线，记录每个手动动作真正支付、效果重放次数、前后能量/HP/挡/毒/已建能力、实际弃牌和池离场。相同手位但牌ID/升级不同拒绝绑定。结果`complete=false`是不可重放后缀；保留合法前缀，完整费用为null。抽入身份未知、选择未完成和机制未知另列，不把自动重放当多次支付。

`coreRealization`生成`quantitative_turn.realization`，由combat-plan原factsOf同时送入brain/Jev题面。一次规划内按Plan对象缓存，状态变化后沿原重规划重建，不新增轮询。手动施放与效果结算分开；`established_before`来自当前状态，`modeled_after_actions`只描述动作后模型状态。`nextTurnBlock`如原模型未提供则null，未实现夜魇目标/副本的跨轮机制，不凭牌名补公式；有三张副本而未施时不增敏捷。

`captureCore`仅在现有Silent A10 build比较中打开。rollout只回放各轮已选线，不改变搜索、随机流或策略；它消耗同一预算，实际完成样本数可能减少。boss-sim将逐轮轨迹汇成`coreWindow`；跨两场战斗当前不拼组合身份，保留原血药转移并将合并组合窗口置未知。真实构筑题面使用compact结果，完整各牌统计在既有boss_sim日志保存。

`coreWindow`给出公开策略下各牌首次施放、手动次数、重放效果次数、累计支付。首次施放不是所有方案的最早可达启动，分母只含真正施放样本。原四核心分开：仅“杂技、下注各完成一次真实弃牌且已建3点绷带”的具名双组件分支可计数；一次重放或九弃不是九套，跨轮可配对，次数不证明回流闭合。其余弃牌分支、毒防、叠敏多挡、刀轴全套仍缺归属链，保持null，不能以这个具名分支代替原四签名全部完成。

样本按随机身份配对，输出有效/缺失分母、均值、标准差、p10/p50/p90与均值SE；缺帧/未知模型不填零。完整轨迹的“没有施放该牌”才可计0。capped、死亡和胜利保留，后继伤害仅统计至少模拟到第二轮的样本。区间是模型样本波动，不是校准后的游戏区间；增加样本不能修复机制遗漏。

在agent目录用`node_modules/.bin/tsx tools/quantitative.ts`，stdin一份JSON，stdout一份JSON：

- `{"method":"realization","solver":<固定SolverInput>,"steps":[...]}`：当前线的费用和状态转移。
- `{"method":"fight-window","input":<固定RolloutInput>,"seed":29,"maxTurns":3,"scripts":false}`：复用原模拟器，明确传手牌/抽弃堆、既有效果、能量、模型/窗口。未知抽序按原固定seed采样；耗尽牌不重新放进可抽池。此工具不读知识或调用LLM。
- `{"method":"extract-calibration","logs":{"contiguous":true,"decisions":[...],"states":[...],"sources":[{"run":"...","commit":"完整40位干净源码"}]}}`：从原日志选择已采用题面，自动匹配首个完成动作的能量/HP/挡结果。调用者必须先验证连续原字节范围/SHA和实际run-config源码，不能给历史dirty局填当前HEAD。缺连续范围、角色/进阶/SL/状态指纹/采用不同、选择未完或跨回合均排除；后缀改线不伪作原方案实际结果。确定点预测没有经验区间，覆盖率null。整回合/整场和药水选择自动提取尚未支持。
- `uniform-hand`、`cycle-bound`、`samples`、`paired`、`calibration`保留[原通用接口](quantitative-play.md)。抽象公式的条件和反例保留原57项coverage，不能变成最佳牌数或无限打法。

固定消费者测试包括真实combat-plan、SerialDeckRunner→compareOptions→compact、五个原帧端点、同seed策略等价和日志拒绝规则。KV0实际封抽状态保留/跳/从抽堆删一张/加同一已观察牌，在一回合8配对样本下输出相同；该窗口全部截断，不说明下一轮或整战增删牌无收益，金币成本也未在战斗状态模拟。

自然局读取、采用和收益须由原ops效果链在发布后分别核验。本批历史回放只是模型固定验算，不是本版本前瞻校准，更不是通关因果证明。

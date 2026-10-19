# V6 W0 复用接口盘点

基线 main 18e9ab630；请求 roy-20261019-v6。以下是软件接口和风险，不是游戏知识。W0/W1不改变决策路径。

| 模块/接口 | 当前契约 | V6后续改动点 | 风险/保留边界 |
|---|---|---|---|
| sim/human-pace-direction.ts：directionInventories / evaluateDirections | Silent核心变体、60秒预算、目标轮分；当前血量/牌组加组件 | W3改角色目录、理想补齐与20/100配对样本 | 不直接搬用Act2临时目标/S不可排序；未知不能零填 |
| sim/human-pace-comparison.ts：directionStart / compareDirectionBatch | 克隆库存、syntheticBossStart、同池比较；模型缺失拒绝或标记partial | W3同方向take/skip等规则补齐、远期进场HP | 当前HP不是远期HP；遗物缺失不保证相消；不另起池 |
| sim/human-pace-card-shadow.ts：卡牌shadow构造/只读输出 | 现有动作后观察，不接管实际决策 | W5增Jev题，shadow仅记建议 | 执行闸、动作身份、原题面与原路径不可因off改变 |
| sim/human-pace-observer.ts：HumanPaceShadow | Silent限定，construction+全局池加载，复查触发，写H2日志 | W3/W4角色通用、方向权重/触发 | 不把旧shadow已交付当作V6路由上线 |
| sim/global-build.ts / global-build-facts.ts：globalBossTargets / globalBuildFacts | 角色实际目标频率、可信门槛、阶段汇总 | W3全部目标与有序连战、偏差方向标签 | 旧门槛挡掉Act3；权重分母与缺失项要显式保留 |
| sim/build-sim.ts：compareOptions | 共享种子与基准、去重、顺序试探、配对差与SE、前缀预算 | W3分层缓存/降级及新条目 | 小样本order选择偏差、缓存必须含模型/种子/补齐清单；partial不是满样本 |
| sim/build-sim-pool.ts / boss-sim-pool.ts | 现有runner、worker队列与deadline | W3复用并测角色/幕耗时 | 禁建第二套模拟器；背景≤4 nice；当前不跑全量回放 |
| sim/build-sim-facts.ts：BuildSimSetup / buildSimFacts | 当前Boss题事实、runner/db/mm注入、异常记录 | W3投影入口与独立模型来源 | 合成开场/实际T1/校准不是同口径；不扩大可信承诺 |
| sim/build-sim-pool-worker.ts / boss-start.ts | 固定输入样本执行、合成开场、未建模清单 | W3输入哈希/审计；知识修理由学习者 | 不填未经学习的遗物、机制或数值 |
| sim/continuous-boss-result.ts：continuousBossResult | 同轨迹F48胜后才接F49；缺失资源unknown | W3连续胜率/配对差 | 不能乘独立胜率；须带失败/截尾样本 |
| sim/double-boss-start.ts：withDoubleBossStart | 依据本角色分布建有序后继，转移残血/药水/复活 | W3保留连续资源契约 | 禁复原消耗品或满血；F49单战不能冒充连胜 |
| sim/route-projection.ts：projectPath | 路线进场HP与危险线；缺数据null | W3本幕HP；W4 T5 | 远期HP须角色进阶历史，不能生搬当前HP |
| construction/types.ts / adapter.ts | Component/Requirement、constructionState、角色模板 | W1格式引用；W3机会/补齐 | 候选≠已验证；cap与多选any/count/distinct不能丢 |
| memory/run-plan.ts：parseRunPlan / runPlanTrigger | want/avoid/remove、elites/rest、Silent construction复查层 | W4方向权重与覆盖、T1–T7、软上限 | 旧parse容错，不应静默接受非法V6答案；幕初/T5/T7保留 |
| hand/screens/pick.ts：buildPickDecision | 牌/删牌/升级选项、follow-up与brain事实 | W5拿牌，W7删牌/升级 | choice key、skip与执行身份不改；off逐字节 |
| hand/screens/reward.ts：planReward | 奖励顺序、空药槽直接领、满槽抛弃路由 | W5/W6 Jev入口 | 保留空槽直接领取，不把shop/rest提前迁移 |
| hand/screens/potion-discard.ts：discardableSlots / discardVariant / optionQuestions / continueAfterDiscard | 逐槽noul与先弃后选、重读状态 | W6结构化药水条目/兜底 | 不替换战斗用药规则，不绕执行闸 |
| hand/screens/shop.ts：planShop / parseShopPlan | 一次性商店大脑计划、预算/库存合法性 | W7买牌/药/删牌独立开关 | 金币/先后顺序/选项身份必须守恒 |
| hand/screens/rest.ts / oneshot.ts | rest/smith、联动后续选择 | W7独立rest开关 | 实际回血与升级不在W1计算 |
| reflex/jev/decision-projection.ts：projectSilentCombatDecision | 已有短英文战斗投影及审计证据 | W8挂reflex、统一数值/枚举与标签修正 | W1不动题面；unknown不补0；铁甲/Regent无知识不回退Silent |
| knowledge/files.ts / construction/data.ts / brain/knowledge.ts | 角色解析、角色路径、已有知识渲染缓存 | W1独立新格式加载器，W2内容，W8消费者 | 新加载器必须显式角色；不借全局默认或其他角色；共享需独立证据 |
| eye/run-config.ts / core/util/jsonl.ts / eye/loop.ts | 白名单配置哈希与安全落日志、每局记录 | W1配置快照/懒创建日志骨架；W5真实消费者 | off不能改原配置哈希/题面或创建日志；日志失效不能导致动作变化 |

W1只实现schema/显式校验、受限predicate、配置/日志/知识加载API，不产生方向、词表成员或经验内容。W2学习派发、W3模拟和W4–W8消费需Claude继续指派。当前需要Roy决定的事项仅是后续恢复运行/校准与学习角色，不阻塞W1。

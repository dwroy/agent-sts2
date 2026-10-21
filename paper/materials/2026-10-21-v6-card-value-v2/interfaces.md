本合同对应拿牌 v2 候选，基于 main 492ac69f998801d0b42e6982ef972ed9992051bf。只接 Silent 严格战后奖励选牌；事件、商店、Neow、满槽药水、休息和其他角色保持既有路径。V6_BUILD=off 或 V6_CARD_DECIDER!=jev 时不读取 opening-value.json，不替换原题面或行为。W8 cardPickReflex 挂点未改。

`knowledge/characters/silent/opening-value.json` 是模型包，不是手填机制或牌值。`opening-value.ts` 的 `loadOpeningModel(path, character)` 校验角色、大小、有限数值、树结构 / 数量 / 深度、误差和分布，失败返回 null；不跨角色回退。`predictOpening(model, input, encounter, kind)` 返回 `{hp_loss,win,turns}`。hp_loss 截在 0..当前 HP，turns 至少 1。`OpeningInput` 含 hp/max_hp/max_energy/ascension/act/floor/deck/relics/potions；每张牌为公开帧的真实牌面字段。

`CardValueRuntime(knowledgeDir, record?)` 每 run_id 首次调用时只读加载模型和正式核心卡；局内不跟随文件更新。`supports(env)` 当前只支持 Silent；`evaluate(env)` 对其他角色返回 undefined，对 Silent 总返回 `CardValueTable`（缺模型的各项为 unknown）。构造器的 record 回调接收完整表，生产写 `logs/v6-card-value.jsonl`，不把原始树或完整组合 metrics 塞进模型题面。

`CardValueTable` 的主要字段为：

| 字段 | 含义 |
|---|---|
| schema/model_id/fingerprint | card-value-v2 / 训练模型身份 / 状态指纹 |
| options[] | id、card、known、saved_hp、error、rank、tier、next_boss_saved_hp、next_boss_error、advances、targets、unknown |
| options[].targets[] | 敌人 ID、战斗类别、act/floor、观察分母 n/runs、weight/count、hp_loss/win/turns、saved_hp/error |
| cores[] | direction/combo、missing、unknown，以及后续 Boss 的 act/id/hp_loss/error/n/runs |
| route | selected_route 或历史条件剩余场数的来源标签，及三类场数 |
| labels | 观察策略偏差、错误尺度、跨幕条件预测、连战缺失、any_of 选择等限制 |
| telemetry | 提供方 elapsed_ms、cache_hits |

指纹覆盖实际牌面 / 升级、HP / maxHP、能量、遗物、占用药水、进阶、层幕、候选、可见 Boss、路线和模型 ID。每局至多 16 项缓存，返回副本防调用者改坏缓存；模型文件局内删除 / 修改不改变当前快照。

当前幕已知要求有本幕 Boss 结果，并且候选和所需分布 / 剩余场数没有 unknown。新牌面不在训练 support、未见 Boss、未知 permanentCardGain、缺模型均不装成零；安全门沿用已知至少 2 项且比例至少 50%。`cardValueKnown(table,id)` 供 `constructionQuestion` 使用，未知 / Jev 错误仍走原大脑。只有大脑也不可用时才用 reference_rank 作末级代码选择；全未知优先第一个合法非 skip，不以 skip 作默认。

生产 `V6ProjectionRuntime` 追加第六个可选参数 `CardValueRuntime`，并开放同步 `evaluateCardValue(env)`。它检查开关、brain-fallback 和严格 postCombatCardReward；不满足或未注入返回 undefined，供既有 mock / 其他角色继续 evaluateCard 旧接口。生产实例由 `productionV6Projection` 注入；runLoop 在严格战后题先取 v2，只有 undefined 才调旧提供方。有效 v2 不进入 sim 工厂。Silent CARD=jev 时旧 A/B 战斗模拟后台不启动；CARD=brain / 其他角色的旧后台和只读 getter 保留。未改 W3 模拟实现、projection-input 或旧 P / expected_win 算式。

`DecisionEnv.v6CardValue?: CardValueTable|null` 是单题消费字段；undefined 表示旧接口，null / 全未知表示 v2 不可用，交安全门。`buildV6CardPick` 在 v2 存在时不依赖独立方向计划初始化；各候选的 `criteria` 给 current_act_HP_saved/prediction_error/reference_rank、近幕末独立 next_act_boss_HP_saved/next_boss_error 与档位，最多两条推进组合各两个后续 Boss。候选身份、公开牌面和既有小脑经验保留在 state；完整原始表仅审计。仍走 Nova Decisions 的 choice.criteria，5,000 ms 预算与现有有界函数不改。

调用 / 复现入口保留在 shadow.mts 和 shadow-extra.mts。前者已有 60 次持久配额记录，不再执行；后者为离线-only，不含请求分支。真实循环回归在 tests/v6-card-value-loop.test.ts，先用真实战斗帧建立来源，再走 runLoop 奖励流程，而非只直接调用提供方。测试 mock 模型回答和动作传输，未发真实动作。

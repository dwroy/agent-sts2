# W7 消费合同

入口仍为 agent/src/v6/prompt-summary.ts 的 boundedV6Jev(state, questions)；内部 boundV6State 负责裁剪。W7 的 buildV6RoomDecision 已调用，无需改商店/休息路由。完整输出继续按既有审计入口记录。

有 projections 的选项最小结构：

```json
{
  "facts": {"kind":"buy_card","id":"example","upgraded":false,"price":1},
  "resources_after": {"gold":0},
  "comparison": {
    "weighted_chain": {"delta":{"mean":0.02,"se":0.001,"n":20},"tier":"better","known_mass":1},
    "current_boss": {"delta":null,"tier":"unknown","known_mass":0.25}
  },
  "projections": [{"direction_id":"R","combo_id":"example","target_id":"example","availability":{"take":0.6,"skip":0.5},"availability_change":0.1,"opening":{"Wk":"evaluated","W0":"opening unknown"}}],
  "unknown_reasons": ["provider_reason"]
}
```

以上仅结构示例，不是游戏经验。weighted_chain/current_boss 分别来自同 option_id 的 table.target_mixtures clearance/current_gate；档位沿用 v6DeltaTier 与既有配置，缺配对统计保持 unknown。leading projections 由调用者既有 prioritize 排序决定，先大脑概率再期望。没有投影的选药条目仍保留其身份、持有价值/比较/药槽等 facts。

state 子限额 22,000 B，总请求 24,000 B，大脑 V6 部分 64,000 字符；请求问题候选在 choice.criteria 中，所有候选键和 noul 题保留。prompt_budget 记录删除共享表、移除组合行和 options.secondary_and_combo_details 的计数，含实际前后体积；该项计数表示压缩到最小摘要的选项数，不是删除/置空选项数。

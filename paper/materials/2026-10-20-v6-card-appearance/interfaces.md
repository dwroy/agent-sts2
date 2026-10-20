# W2.2 出现概率表接口（2026-10-20）

生产接口冻结；提交号待完整检查及合入后在 report.md 登记。

- TS 导出：`agent/src/v6/appearance.ts` 的 `v6AppearanceSchema`、`V6Appearance`、`V6AppearanceCard`、`V6RemainingOpportunity`、`V6AppearanceSource`、`V6OpportunityKind`。
- 历史包：`V6HistoryPack.data.appearance?: V6Appearance`，内部 `schema="v6-appearance-v1"`。追加可选字段；旧包缺字段保持原字节与摘要，不能以旧供给表、MC、W0 或其他角色补值。
- 生产生成：`knowledge/builders/refresh-v6-history.py` 在现有每局结束刷新链的原始状态扫描中调用 `appearance_stats.AppearanceCollector`；同一份 SHA/字节冻结边界、同一次原子发布。对局中只读开局历史包，不扫日志。

主概率：`cards[]` 键为 `source: "reward"|"shop"`、`rarity`、`card_id`。`probability=appearances/n` 是全部代码版本与进阶合并的观察实测率，**供 W3 主计算使用**。分母 `n` 是该来源全部完整机会，不是“已出现该稀有度的机会”，也不是槽位数。`n_runs` 为独立局数；`se` 为按局聚类误差；`wilson95` 为独立机会假设下的参考区间。`n=0` 时概率为 null 并给 `unknown_reason`；有分母但未出现为实测 0，不宣称不可能。

`upgraded_appearances` 是其中至少出现一次升级版本的机会数（`<=appearances`），不是另外一类机会；同屏同牌多张、基础与升级同时出现，都只给该牌的 `appearances` 加一次。需要多份牌时不能把“至少一份”的概率当作多份联合概率，不能凭此表假设独立。

`probability_a10`、`regression_se`、`regression_reason` 仅附列；`ascension_offsets[]` 在每个稀有度内共用一个进阶加性偏移，牌/来源设固定截距。不能识别或线性概率越界时 null，不能补零或替代合并主概率。

剩余次数：`remaining[]` 键为 `from_floor`、`target_floor`、`kind: "reward"|"shop"|"upgrade"|"remove"`。查 **精确目标层**，用 `median`；区间为 `from_floor < opportunity.floor < target_floor`，当前已展示选项由调用方处理，不重复计算。`distribution[{count,n}]`、`samples[{run_id,count}]` 保留原始计数；未抵达/缺目标帧进 `censored_run_ids`，缺中间层/该类证据进 `incomplete_run_ids`，未知后续不补零。`n=0` 则 `median=null`。不存在的目标层、来源、稀有度或牌均 unknown，不作近邻、其他幕、其他来源或 MC 回退。目标层来自历史实际 Boss 遭遇证据。

证据：`runs[]` 保留实际进阶、版本、结束时间和原始 runs.jsonl 字节范围/SHA；`strata[]` 保留来源分母、独立局号及排除数；`evidence{path,bytes,sha256,records}` 指向冻结审计 JSONL，逐条保留机会原始选项和各层首帧的 states.jsonl 字节范围/SHA。包内来源清单同时封存 appearance 输入身份；正式包无需在运行时打开审计文件。

限制必须传递给题面/decision_evidence（机器标签位于 `labels`，中文解释在 `limitations`）：

- `duplicate_cards_count_once_per_opportunity`：单机会至少一份；不同牌的联合出现、每次奖励只能选一张的冲突均未建模。
- `upgraded_and_base_share_card_identity`：升级与基础共享身份，升级出现另计，不能再加一次牌出现率。
- `upgraded_offer_does_not_grant_upgrade_opportunity`：升级奖励不增加升级机会；`upgrade` 只计显式启用的 SMITH 服务。
- `upgrade_targets_and_reward_upgrade_conflicts_unmodeled`：尚未建模升级对象可用性、与拿牌/休息回血的互斥；`remove` 只计显式 available 且未 used 的商店服务。未记录的事件升级/删牌不推测。
- `gold_and_purchase_affordability_unmodeled`：商店库存出现不等于买得起；金币、价格、未来金币增长未建模。
- `opportunity_counts_are_observed_not_guaranteed`：剩余机会只反映首试历史实际路线，逐层有帧仍可能漏同层奖励/服务，有幸存与路线选择偏差。

首试截止及层回退后不新增独立样本；同局同层商店只取首次库存；奖励按同局同层完整选项签名去重，完全相同的独立再奖励可能合并。未按引擎或已接受题面筛选。本任务不改变 W3 运行时公式、游戏规则或学习者正式构筑知识。

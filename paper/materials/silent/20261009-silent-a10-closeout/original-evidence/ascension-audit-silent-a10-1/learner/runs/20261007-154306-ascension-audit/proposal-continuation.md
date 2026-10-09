# D2：F48胜利后的资源有续战价值（已有实现的独立核证）

角色 silent；实际观察 A10；来源任务 ascension-audit；实现任务 strategy-proposal；领域 structure/combat/potion/terminal；账本 silent-0228。其已有 proposed 和上线去向原样保留，本次不登记 shipped。

JMH5C51RLN4E F48第五次60/60进入，T13前10/60、战后8/60（states L243459、L243531、L243532），随后MAP L243533与F49沙漏T1 L243534均8/60。9TG1RP5LFAAK F48第二次84/84进入（L244290），T16前19/84、战后17/84（L244371—244372），MAP L244373与F49女王T1 L244374均17/84；毒药水仍在同一槽，原战斗敏捷/毒雾/余像不延续，开场仅见遗物力量1。两个REWARD的rewards/card_options/alternatives均为空，gold不变；中间无营火、回血或新药水。

旧规则：把F48胜利作为整局目标，boss药水持有成本一律0，终局资源没有第二场价值。所需行为：条件于本角色已观察 LEVEL_10/幕3/F48 连战目标，保留同一模拟样本实际余量，重新开场；第二场身份在入场前未知，不能读取本局隐藏未来。

本次只读live已部分实现：agent/src/knowledge/double-boss.ts:46—61将模型限制到silent/A10/幕3及实际LEVEL_10；agent/src/reflex/potion-cost.ts:59—63允许首Boss续战价，现仅毒药水；agent/src/sim/boss-sim.ts:310—326传递样本实际HP、余药和余复活；agent/src/sim/double-boss-start.ts:20—27用已观察Boss分布重建开场；agent/src/reflex/combat-plan.ts:3038及:3180接入续战目标；agent/src/sim/boss-lines.ts:194、:787提供未校准两战模拟。源码 e1a467e18a0dfa8d99046a24ff4c0e1af59278c8 是实际live祖先。登记implemented，后续任务按duplicate核验。

反例/范围：A9 G403VCZ3BH1B F48第二次战后18/90，states L240514实际is_victory=true；单Boss目标仍适用。A10两场第二Boss均实际败；第一场赢不等于整局赢，不能把SL截断当死亡或独立样本。未观测的中间回血遗物、其他药水持有价及复活消耗跨场效果未知。

拟合/时间切分：此次不重拟合曲线或毒药水价。live知识声明4局模型，当前审计只独立核前2局；后2局不是本任务原始证据，8192模拟及参数未由本次重新运行/校准。当前十局可按结束时间前5/后5分组保留，将来修改要按整局切分，SL不得跨训练/验证分组。当前全部来源局早于实现，不能作为上线后改善证据。

验证/预期影响：保持现有受角色与实测effect限制的资源传递；保留无证据领域未知和低信度标记。期望避免把首战保命与全局终局混同，不量化通关提升。不得把未校准模拟当必死或新增SL触发。回退：后续数值变更可只撤模型/续战价，保留路线后场未知及原判官；不回滚不相干角色。既有授权 Roy-2026-10-07-learning。

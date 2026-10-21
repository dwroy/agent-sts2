# 候选提案：分开首抽数量、具体起手与随机药表示；缺无戒及同药后继对照时保留机制/药价待证。

适用角色仅 Silent、已观察 A10；实战为V5、多版本/脏数据现场，回放固定cf3372505b85e8df72e99cb9b5455c9f42b25e1a。不得外推铁甲、其他角色或未观察进阶。来源任务issue-4-elite-calibration，批次issue-4-elite-calibration-20261021-104312，父要求silent-elite-simulation-pessimism-20261021。本轮只草稿，ledger未新增、CLI未调用、无实现任务批次，不填写伪造登记ID。所有下一步由原ops单点安排；本轮预算新MC=0、真实模型=0、测试=null。

状态：waiting；local_key只是scratch目录索引，不是正式提案ID。

- MPWMW6P91U0B-f11-fight5（Silent A10/F11/T1可行动），logs/states.jsonl offset=14382639873 bytes=29189 SHA256=d3a29762ec8b7f9ebe94d70425992a75d2449dd28b5ccf36dc8b3e2b8c533cd9
- 0NMF36KX3F7Y-f9-fight5（Silent A10/F9/T1可行动），logs/states.jsonl offset=14114959665 bytes=30299 SHA256=6b4e898c22862a17b71e43fad9bb43c2d99adf05967d21c55ddbdbeb60db6719
- 76VEDXJJ2PFL-f8-fight5（Silent A10/F8/T1可行动），logs/states.jsonl offset=14467283240 bytes=28062 SHA256=45675a04d54de92ca8264c8fef0118abfa65781dbddba4f3e4454ecaa49a459d
- BXU0CKWKH2RU-f15-fight6（Silent A10/F15/T1可行动），logs/states.jsonl offset=13982412226 bytes=31630 SHA256=bf0e4a71065bc5800dd13a5a6955b26e4333583753e2d828346a889a331e0c1c

旧行为：合成首抽5/6/7，实际手牌7/8/9；53场全持蛇戒，51场差2、另两场带BOOMING_CONCH差4，FIGHT_START_RELICS无蛇戒ID。CHOICE/DRAW药被合成入口剔除，真实开场helper却可携randomPotions。拟新行为：先按原帧明确各开场分量覆盖/未知；为有实见条件的蛇戒首抽建立候选+2规则并保留未隔离限制，海螺差4另留条件未知，随机药使用相同表示合同或显式unknown，不能把“可算”当“可靠”。当前只准备候选，不改抽牌参数、药水价格或上线。药水实际收益与跨战持有价值复用silent-proposal-c51468c5e8ba6668，不重复造同类资源定价项。

固定回归：53场抽数逐一保留，51差2与两场海螺差4分开；MPW F11T1实饮POWER_POTION并打ABRASIVE的原前缀；0NMF实际首轮喝SHIP但合成仍会在后续喝，反证“完全不用药”；无药BXU低死亡残差和无药76VED F8高残差同时回归。撤源负控：移除蛇戒不能依本材料继续+2；缺药水生成原件则结果标unknown而非假定同生成。补现有已核规则需要原owner提供撤戒固定输入，合成无戒只作程序负控，不算实盘机制证据。

独立留出：新Silent A10按run、真实开始时间后留至少8局，不与本53场混合；必须等待具有可隔离首抽条件/药水生成后继的新证据，否则waiting。最小下一步不需MC：4个T1实际前缀每个最多3个动作、≤12转换；抽牌或随机选择无已知原后继即停止，1进程nice19/ionice3、≤10分钟。将来要量化药/抽牌贡献时ops原单点另批固定同输入一分量对照，不重用历史死亡率拟+2或药价。预计消费者：合成开场/A标签与独立校准，不动CARDbrain/REFLEXoff。回退：撤回已证条件下的开场子改动、保留原始未建模标签与正式药价。局限：无不持戒实战负控，无药反事实；不能报告因果收益。

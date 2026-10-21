# 候选提案：核开场能力首见统计的条件和分母一致性；拒绝将稀疏受施加能力直接当本角色A10天生能力。

适用角色仅 Silent、已观察 A10；实战为V5、多版本/脏数据现场，回放固定cf3372505b85e8df72e99cb9b5455c9f42b25e1a。不得外推铁甲、其他角色或未观察进阶。来源任务issue-4-elite-calibration，批次issue-4-elite-calibration-20261021-104312，父要求silent-elite-simulation-pessimism-20261021。本轮只草稿，ledger未新增、CLI未调用、无实现任务批次，不填写伪造登记ID。所有下一步由原ops单点安排；本轮预算新MC=0、真实模型=0、测试=null。

状态：waiting；local_key只是scratch目录索引，不是正式提案ID。

- JKDUL0AL0TW6-f9-fight4（Silent A10/F9/T1可行动），logs/states.jsonl offset=13797057638 bytes=31823 SHA256=aefb730b443d16f7938accc8e8a396dc2f58baaaccd0674fdcfd1bcec6d20763
- MPWMW6P91U0B-f11-fight5（Silent A10/F11/T1可行动），logs/states.jsonl offset=14382639873 bytes=29189 SHA256=d3a29762ec8b7f9ebe94d70425992a75d2449dd28b5ccf36dc8b3e2b8c533cd9
- BXU0CKWKH2RU-f15-fight6（Silent A10/F15/T1可行动），logs/states.jsonl offset=13982412226 bytes=31630 SHA256=bf0e4a71065bc5800dd13a5a6955b26e4333583753e2d828346a889a331e0c1c
- 0NMF36KX3F7Y-f9-fight5（Silent A10/F9/T1可行动），logs/states.jsonl offset=14114959665 bytes=30299 SHA256=6b4e898c22862a17b71e43fad9bb43c2d99adf05967d21c55ddbdbeb60db6719
- 9W38TRGPJW9Q-f8-fight4（Silent A10/F8/T1可行动），logs/states.jsonl offset=14154531099 bytes=30844 SHA256=1fcf43936ce56dae15338e7791d8d7ebdf47a8de08349bfff5b5cc3732d818d9

旧行为：bossOpening把common首见回合统计在“出现过该power且本角色encounter有局”的进阶内相加，除该部分Silent局分母；随后startAmountAt跨进阶带入A10。PHROG七战合成有MANGLE10/STRANGLE2，原A10 T1只有INFESTED4；BYRDONIS三战多MANGLE5。初始incoming相同并不能排除该输入错误。

拟新行为：先输出每项天生能力候选的角色/进阶/原首帧身份、首动作前后条件、独立局分子分母及跨阶估计；缺同条件分母和源角色身份则unknown，不无条件继承首见能力。只在本角色本进阶核证的固定窗口提供原开场能力，不硬编码“所有PHROG永久为零”，不修改0.8门槛反推目标。普通紧勒真实逐牌触发沿原silent-proposal-04cbbf6b3a547aea/1b9e29122364fa68核边界；它们的接线已实现/duplicate身份不等于本开场选择问题实现，不重复造普通紧勒bug。

固定回归：七PHROG与三BYRDONIS的真实T1能力投影；INFESTED/VITAL_SPARK/TERRITORIAL等原帧能力不能误删。固定源码common首见/角色分母推导见component-findings.json，公共统计只用于定位程序，不作为本角色机制验证。撤源负控：删除A10原首帧证据即降unknown；给定一个有真实紧勒的既有提案固定帧必须仍保留效果，负控沿原owner核源，本轮不借其局号统计。独立留出：后续至少8个新Silent A10独立局，覆盖遇到目标与未目标精英，按新run冻结不调门槛；未获得前waiting。

最小下一步：10个既有T1转换+2个条件负控，0MC、1进程≤10分钟；保持其他开场分量原样。如还需量化单项影响，另由ops冻结预算，不由本报告启动。预计消费者：prepareElite→v6ProjectionStart→bossOpening及A原始可信度；不直接修改拿牌排序。误差/限制：额外STRANGLE在原文本表示玩家打牌令敌失血，去掉可能使模拟更悲观；MANGLE效果方向也不从标签补值。本提案是输入准确性，不承诺降低残差或收益。回退：还原限定的选择逻辑/条件数据，保留unknown与诊断原件，不回退已有紧勒接线子实现。

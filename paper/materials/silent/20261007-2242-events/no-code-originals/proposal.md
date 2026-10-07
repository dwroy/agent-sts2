# 静默猎手策略提案逐项核证与处置

记录时间：2026-10-07 22:23:06 +0800（先执行date）。角色silent；授权Roy-2026-10-07-learning。来源任务依各原提案，当前实现任务strategy-proposal。

实际调度batch为20261007-221303-strategy-proposal；任务指定scratch尾号221304，按指定路径保存。无proposal_repair。本轮只消费该batch的10个id，原文逐项读完并核对SHA256全部一致。

10个指定来源局和4个派发提案额外来源局全部经runs.jsonl核为SILENT；额外局仅用于派发id自身的证据。未使用其他角色知识，未新增机制常数或权重。

本轮没有新增源码。阶段事实与痊愈药水在末核时已有实际live祖先，列duplicate；其余8项列waiting，保留原行为和所有旧提案。没有将已发布经验、未合入源码或局部子机制算作整项实现。

拟合与切分：本批只核已保存的发现/回归样本，不拟合药价、输出/保血权重、SL阈值或启动顺序。SL重试按run分组，不扩大独立局数；本次核证不是盲测，后续独立同角色完局才可作时间后移验证。

共用事实限制：仅核本角色实际状态与动作；怪物HP/伤害保持当前进阶数据库原逻辑与首样本口径，房间代价5样本门槛未改。选择、预算和参考排名不变。

## silent-proposal-4cc200cc9747f4a8

来源任务：ascension-audit；实现任务：strategy-proposal；原请求领域：structure, terminal, combat。

账本：silent-0228。原经验：原提案未指定经验id。

证据局号/层/回合：JMH5C51RLN4E A10 F48 T13胜后奖励/地图→F49 T1；9TG1RP5LFAAK A10 F48 T16胜后奖励/地图→F49 T1。

完整旧规则、新行为、反例、样本/时间切分、验证和回退：[原提案](silent-proposal-4cc200cc9747f4a8.original.md)。本轮仅追加处置，不重写历史复盘。

本轮处置：duplicate。阶段事实已由既有源码6f2b90a3实现；本轮末核该40位源码提交为实际live祖先。F48首Boss已败、本幕未结束、F49当前敌人与过期raw boss id已分列；没有新增源码或再次上线。

实际live祖先源码commit：`6f2b90a311644960fcfd1e2b7a4ce96fb41d65b4`。

预期与验证：复核上述保存的本角色帧、候选和源码；证据不足部分维持旧规则，补齐该项具体缺失后再冻结同盘验证。不承诺整场转胜。

回退：本轮无源码可回退；已有实现只引用既有独立commit及原回退方案。原经验、账本、提案和失败历史保留，未将任何条目标为shipped。

## silent-proposal-89354805ee4d7e77

来源任务：postmortem；实现任务：strategy-proposal；原请求领域：combat, structure。

账本：silent-0237, silent-0238。原经验：原提案未指定经验id。

证据局号/层/回合：VLZ6CCT8AQ0A A10 F35 T1、F43 T1/T2、F45 T1。

完整旧规则、新行为、反例、样本/时间切分、验证和回退：[原提案](silent-proposal-89354805ee4d7e77.original.md)。本轮仅追加处置，不重写历史复盘。

本轮处置：waiting。VLZ F35/F43的手牌升级与同牌序51伤/13损证据成立；重新对照原日志的729个状态帧均无战内piles。缺可冻结的各堆卡实例/升级状态、完整确定抽牌输入及未知升级/附魔差值，无法验证整项同方案和后续抽牌传播。保留神化未建模，不因未施放而增加必打规则。

预期与验证：复核上述保存的本角色帧、候选和源码；证据不足部分维持旧规则，补齐该项具体缺失后再冻结同盘验证。不承诺整场转胜。

回退：本轮无源码可回退；已有实现只引用既有独立commit及原回退方案。原经验、账本、提案和失败历史保留，未将任何条目标为shipped。

## silent-proposal-f2bfceddb1898dca

来源任务：postmortem；实现任务：strategy-proposal；原请求领域：combat, potion。

账本：silent-0106, silent-0019, silent-0201。原经验：原提案未指定经验id。

证据局号/层/回合：VLZ6CCT8AQ0A A10 F43 T1—T5、F44休息、F45 T1/T4/T5。

完整旧规则、新行为、反例、样本/时间切分、验证和回退：[原提案](silent-proposal-f2bfceddb1898dca.original.md)。本轮仅追加处置，不重写历史复盘。

本轮处置：waiting。成熟度展示子项已有实际live祖先45161a51；改变MC先行/最低非药预算、药价或目标偏好仍缺同总预算同盘随机样本的受控比较、神化覆盖修复后的结果和另一focus完整实打，不能从707ms单题或未实打高伤线拟合参数。

预期与验证：复核上述保存的本角色帧、候选和源码；证据不足部分维持旧规则，补齐该项具体缺失后再冻结同盘验证。不承诺整场转胜。

回退：本轮无源码可回退；已有实现只引用既有独立commit及原回退方案。原经验、账本、提案和失败历史保留，未将任何条目标为shipped。

## silent-proposal-283a164780d11e69

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：combat, structure。

账本：silent-0237, silent-0238。原经验：silent-apotheosis-combat-upgrades。

证据局号/层/回合：VLZ6CCT8AQ0A A10 F35 T1、F43 T1/T2、F45 T1。

完整旧规则、新行为、反例、样本/时间切分、验证和回退：[原提案](silent-proposal-283a164780d11e69.original.md)。本轮仅追加处置，不重写历史复盘。

本轮处置：waiting。与89354805ee4d7e77属于同一神化缺口的经验链接；同样缺战内牌堆/确定抽牌复合输入和未知升级差值。两份提案不是两份源码实现，经验已发布也不能代替实际live源码。

预期与验证：复核上述保存的本角色帧、候选和源码；证据不足部分维持旧规则，补齐该项具体缺失后再冻结同盘验证。不承诺整场转胜。

回退：本轮无源码可回退；已有实现只引用既有独立commit及原回退方案。原经验、账本、提案和失败历史保留，未将任何条目标为shipped。

## silent-proposal-ebbfe3b97548756d

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：combat, structure。

账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。原经验：silent-strength-weak-observation, silent-footwork-block, silent-gorget-plating, silent-vajra-opening-strength, silent-sparkling-rouge-turn-three, silent-fasten-defend-extra-block, silent-piercing-wail-temporary-strength, silent-malaise-x-debuff, silent-accelerant-triggers, silent-noxious-fumes-growth, silent-deck-burst-observation, silent-three-knights-output-buffer-observation, silent-stone-humidifier-rest-growth, silent-rest-buffer-observation, silent-route-hp-observation。

证据局号/层/回合：VLZ6CCT8AQ0A A10 F43 T1/T3/T4/T5、F44休息、F45 T3/T5及全局资源链。

完整旧规则、新行为、反例、样本/时间切分、验证和回退：[原提案](silent-proposal-ebbfe3b97548756d.original.md)。本轮仅追加处置，不重写历史复盘。

本轮处置：waiting。复合提案覆盖14账本/15经验；当前升级勒紧子项已有实现，但神化传播仍未实现，且缺逐击属性、持续毒、成长与资源共同冻结的完整调用输入/源码对照。路线、休息、focus无同盘完整反事实，已有单个机制不能证明整个提案完成。

预期与验证：复核上述保存的本角色帧、候选和源码；证据不足部分维持旧规则，补齐该项具体缺失后再冻结同盘验证。不承诺整场转胜。

回退：本轮无源码可回退；已有实现只引用既有独立commit及原回退方案。原经验、账本、提案和失败历史保留，未将任何条目标为shipped。

## silent-proposal-7ef28c3cb0160972

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：potion, combat, structure。

账本：silent-0240, silent-0239。原经验：silent-cure-all-energy-draw。

证据局号/层/回合：T082DRCUHRRD A0 F6 T1及F33 T1；10GPK5XGHCK3 A3 F3 T2；VN7RQJMJEFMX A6 F37 T1；VLV17NUSFS61 A7 F39 T1；UMVLWER4CD98 A10 F48 T2（含SL同局重复）；P5HT1272P5SB A10 F8 T1；YLYLZWHA0GKU A10 F39 T1；VLZ6CCT8AQ0A A10 F45 T1。逐次14条见cure-history-verified.json。

完整旧规则、新行为、反例、样本/时间切分、验证和回退：[原提案](silent-proposal-7ef28c3cb0160972.original.md)。本轮仅追加处置，不重写历史复盘。

本轮处置：duplicate。8局14次饮用核得HP增0、能量+1、手牌+2；已有CURE_ALL模型9f0babde及覆盖/MC样本用时/并列展示45161a51均为实际live祖先，固定模型调用一致。满手、时机和预算变更缺对照，保留原行为，按原提案允许的一致模型处置为重复实现。

实际live祖先源码commit：`45161a51c2c6b7e4a499b13cf749c4108193bbf5`。

预期与验证：复核上述保存的本角色帧、候选和源码；证据不足部分维持旧规则，补齐该项具体缺失后再冻结同盘验证。不承诺整场转胜。

回退：本轮无源码可回退；已有实现只引用既有独立commit及原回退方案。原经验、账本、提案和失败历史保留，未将任何条目标为shipped。

## silent-proposal-e5b87be50f28f311

来源任务：postmortem；实现任务：strategy-proposal；原请求领域：combat, sl。

账本：silent-0079, silent-0021, silent-0125, silent-0018。原经验：原提案未指定经验id。

证据局号/层/回合：8JRE1C4H4Z2W A10 F33首/三试T2、第二试T5、末试T11，以及F17 T6。

完整旧规则、新行为、反例、样本/时间切分、验证和回退：[原提案](silent-proposal-e5b87be50f28f311.original.md)。本轮仅追加处置，不重写历史复盘。

本轮处置：waiting。8JRE同指纹首/三试T2实打多12血换7伤已记录；原日志缺Jev原答→HP护栏→SL替换→实际派发及重规划的统一候选标识和完整原始调用输入。不能由理由文本补造机器阶段链；也缺另一完整胜线，不改既有探索/护栏选择。

预期与验证：复核上述保存的本角色帧、候选和源码；证据不足部分维持旧规则，补齐该项具体缺失后再冻结同盘验证。不承诺整场转胜。

回退：本轮无源码可回退；已有实现只引用既有独立commit及原回退方案。原经验、账本、提案和失败历史保留，未将任何条目标为shipped。

## silent-proposal-49632bc4878fb597

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：combat。

账本：silent-0005, silent-0231。原经验：silent-strength-weak-observation。

证据局号/层/回合：CA5KE8GFJ9X2 A10 F13 T1—T5，关键T5。

完整旧规则、新行为、反例、样本/时间切分、验证和回退：[原提案](silent-proposal-49632bc4878fb597.original.md)。本轮仅追加处置，不重写历史复盘。

本轮处置：waiting。CA5 F13 T5支持弱没有取消独立成长；本轮核32个相关原帧。缺力量、敏捷、弱与独立成长四路径同时冻结的实际调用输入/源码对照，未取得的步法不能当敏捷样本；不凭子项提交证明复合经验全部实现。

预期与验证：复核上述保存的本角色帧、候选和源码；证据不足部分维持旧规则，补齐该项具体缺失后再冻结同盘验证。不承诺整场转胜。

回退：本轮无源码可回退；已有实现只引用既有独立commit及原回退方案。原经验、账本、提案和失败历史保留，未将任何条目标为shipped。

## silent-proposal-66532328a585941f

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：combat, structure。

账本：silent-0021, silent-0009。原经验：silent-deck-burst-observation。

证据局号/层/回合：5PM6JAQG6FNQ A10 F39末次T2；F33建立组件后胜利作为不同局面的限制。

完整旧规则、新行为、反例、样本/时间切分、验证和回退：[原提案](silent-proposal-66532328a585941f.original.md)。本轮仅追加处置，不重写历史复盘。

本轮处置：waiting。5PM F39 T2向无毒失落打冒泡零效果的原帧已核；缺同起始HP/构筑/抽序下不同启动顺序的整场胜负对照及可复现收益函数，不能以持有组件或另一个F33胜局拟合启动阈值。

预期与验证：复核上述保存的本角色帧、候选和源码；证据不足部分维持旧规则，补齐该项具体缺失后再冻结同盘验证。不承诺整场转胜。

回退：本轮无源码可回退；已有实现只引用既有独立commit及原回退方案。原经验、账本、提案和失败历史保留，未将任何条目标为shipped。

## silent-proposal-43a76a31ba7bdcfa

来源任务：experience-update；实现任务：strategy-proposal；原请求领域：combat, sl。

账本：silent-0030, silent-0027。原经验：silent-lagavulin-siphon-poison-sl。

证据局号/层/回合：61E2QS63Y9WU A10 F17 T5吸取、T6负敏捷/毒；首试获胜不是SL对照。

完整旧规则、新行为、反例、样本/时间切分、验证和回退：[原提案](silent-proposal-43a76a31ba7bdcfa.original.md)。本轮仅追加处置，不重写历史复盘。

本轮处置：waiting。61E F17 T5/T6吸取、负敏捷和毒的原帧已核；缺同起始HP/构筑/完整已知抽序下可救活的另一完整SL线路。本局首试胜不能支持调整SL范围、阈值或换线偏好。

预期与验证：复核上述保存的本角色帧、候选和源码；证据不足部分维持旧规则，补齐该项具体缺失后再冻结同盘验证。不承诺整场转胜。

回退：本轮无源码可回退；已有实现只引用既有独立commit及原回退方案。原经验、账本、提案和失败历史保留，未将任何条目标为shipped。

# 静默猎手本批代码提案逐项复核

记录时间：2026-10-08 03:11:50 +0800。任务scratch：20261008-025837-strategy-proposal；调度batch：20261008-025836-strategy-proposal。

完整base：1a7884c9a76a9bbe5deed9b4488164a45b3acfc5；固定源码核验live：d17f38562a4bc1ae3d2a7c4b0a9c294e764ef665。六局均为SILENT A10；只消费本次proposal_ids，proposal_repair未派发。

十份原稿已逐份读取并复制，SHA256与队列一致。重新从只读logs抽取3432帧、3306决策，六局原始状态SHA256与014012任务一致；原经验19项和本角色账本26项已保存快照。本批没有新增源码，不登记implemented/duplicate/shipped；以下均waiting。

没有拟合策略参数。原帧属于发现与复核样本，不称盲测；重打按局号计，未来拟合必须用结束时间后移的独立本角色完局验证。神化已经观察到的纯数值差值不需要整场获胜反事实，整体传播缺口与策略胜负结论分开记录。怪物当前进阶首样本供给、房间代价五样本门槛及其他角色行为均未改变。

## silent-proposal-89354805ee4d7e77：神化升级传播

角色silent/A10；来源任务postmortem；实现任务strategy-proposal；原领域：combat, structure。

证据局号/层/回合：VLZ6CCT8AQ0A F35T1、F43T1—2、F45T1。账本：silent-0237, silent-0238。原经验：未指定。

原提案及完整旧/新行为：[silent-proposal-89354805ee4d7e77.md](silent-proposal-89354805ee4d7e77.md)，原保存路径：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md。

本次已核事实：F35能量7→5、防御5→8、匕首雨5→7；F43突然一拳9/1弱→11/2弱、勒紧4→6、尖啸6→8；同序列实际51伤/13损，场外deck不变。

反例和限制：F43虽施放仍损57；F45未施放而败，敌人及资源不同，不能推出必打规则。

处置waiting：缺未知升级/附魔的逐卡转换及跨抽弃完整覆盖验证；当前模型无APOTHEOSIS接线，UpgradeDelta缺勒紧、临时减力、毒雾与触媒字段。已观察差值可供限定模型开发，但未覆盖部分保持未知，不能将局部模型认作整体完成。

预期行为与验证方法：按已观察转换实现本战升级状态、未知标记、后续抽弃传播；F35开发、F43同牌序验收、F45未知边界核验，不拟合固定优先级。

本次保留旧行为；没有源码、行为版本或合入可报告。预期影响限于对应事实/审计覆盖，不承诺整场转胜。下一次实现须独立提交、固定撤源码失败/恢复通过、原沙箱入口和锁内合后检查；实际改变行为再按授权双通知Roy。回退用实际实现提交，证据、原稿与失败历史保留。

## silent-proposal-f2bfceddb1898dca：随机药水预算与血价

角色silent/A10；来源任务postmortem；实现任务strategy-proposal；原领域：combat, potion。

证据局号/层/回合：VLZ6CCT8AQ0A F43T1—5、F44、F45T1/T4—5。账本：silent-0106, silent-0019, silent-0201。原经验：未指定。

原提案及完整旧/新行为：[silent-proposal-f2bfceddb1898dca.md](silent-proposal-f2bfceddb1898dca.md)，原保存路径：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md。

本次已核事实：F43胜损57、F44补34到67；F45首问707ms/1个MC样本，长程降至1轮1样本。T4实际少损线24伤/13损。

反例和限制：未打的攻击线32伤/31损没有整场结局；同局F17/F33首试胜，不支持统一弃用推演。

处置waiting：成熟度展示子项已是live祖先45161a51c2c6b7e4a499b13cf749c4108193bbf5；缺相同总预算、固定随机输入的MC分配对照与候选稳定性曲线，且神化传播仍未覆盖。单次用时不足以拟合预算或药水血价。

预期行为与验证方法：同盘同总预算做受控MC实验，保存样本、best、退化及覆盖缺口；先分离神化漏算，不改变留药或目标顺序。

本次保留旧行为；没有源码、行为版本或合入可报告。预期影响限于对应事实/审计覆盖，不承诺整场转胜。下一次实现须独立提交、固定撤源码失败/恢复通过、原沙箱入口和锁内合后检查；实际改变行为再按授权双通知Roy。回退用实际实现提交，证据、原稿与失败历史保留。

## silent-proposal-283a164780d11e69：神化经验实现链接

角色silent/A10；来源任务experience-update；实现任务strategy-proposal；原领域：combat, structure。

证据局号/层/回合：VLZ6CCT8AQ0A F35T1、F43T1—2、F45T1。账本：silent-0237, silent-0238。原经验：silent-apotheosis-combat-upgrades。

原提案及完整旧/新行为：[silent-proposal-283a164780d11e69.md](silent-proposal-283a164780d11e69.md)，原保存路径：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md。

本次已核事实：与89354805同一机制事实；原经验silent-apotheosis-combat-upgrades与账本0237/0238已关联。

反例和限制：同一局的多次施放不扩独立样本；F45未施放不能作为施放失效反例。

处置waiting：与89354805相同的完整升级传播缺口；保留经验来源链。已有升级勒紧子项不等于神化的状态变换已实现。

预期行为与验证方法：沿神化专属提案去重实现与验证；保留两条来源任务链接。

本次保留旧行为；没有源码、行为版本或合入可报告。预期影响限于对应事实/审计覆盖，不承诺整场转胜。下一次实现须独立提交、固定撤源码失败/恢复通过、原沙箱入口和锁内合后检查；实际改变行为再按授权双通知Roy。回退用实际实现提交，证据、原稿与失败历史保留。

## silent-proposal-ebbfe3b97548756d：攻防、持续输出及资源分账

角色silent/A10；来源任务experience-update；实现任务strategy-proposal；原领域：combat, structure。

证据局号/层/回合：VLZ6CCT8AQ0A F43T1/T3—5、F44、F45T3/T5。账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。原经验：silent-strength-weak-observation, silent-footwork-block, silent-gorget-plating, silent-vajra-opening-strength, silent-sparkling-rouge-turn-three, silent-fasten-defend-extra-block, silent-piercing-wail-temporary-strength, silent-malaise-x-debuff, silent-accelerant-triggers, silent-noxious-fumes-growth, silent-deck-burst-observation, silent-three-knights-output-buffer-observation, silent-stone-humidifier-rest-growth, silent-rest-buffer-observation, silent-route-hp-observation。

原提案及完整旧/新行为：[silent-proposal-ebbfe3b97548756d.md](silent-proposal-ebbfe3b97548756d.md)，原保存路径：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md。

本次已核事实：F43已建勒紧6、触媒2；F45勒紧4/触媒1/雾未建。F45T5四段83来袭减至59，32血20挡仍差7血；三个敌人均未退场。

反例和限制：持有两雾不代表已建立群体毒；赢F43仍损57。

处置waiting：升级勒紧子项5e80e683daa08ae2569733b3b541cb523d7fe861已是live祖先；14账本/15经验的请求缺升级、持续输出与资源共同冻结的复合验收，不能以子项关闭整体。

预期行为与验证方法：分别冻结当前属性、能力建立时点、毒结算、临时减力期限和资源链，发现确定数值缺口才补模型，不设统一攻防权重。

本次保留旧行为；没有源码、行为版本或合入可报告。预期影响限于对应事实/审计覆盖，不承诺整场转胜。下一次实现须独立提交、固定撤源码失败/恢复通过、原沙箱入口和锁内合后检查；实际改变行为再按授权双通知Roy。回退用实际实现提交，证据、原稿与失败历史保留。

## silent-proposal-e5b87be50f28f311：SL与HP护栏阶段审计

角色silent/A10；来源任务postmortem；实现任务strategy-proposal；原领域：combat, sl。

证据局号/层/回合：8JRE1C4H4Z2W F33首/三试T2、二试T5、末试T11；F17T6。账本：silent-0079, silent-0021, silent-0125, silent-0018。原经验：未指定。

原提案及完整旧/新行为：[silent-proposal-e5b87be50f28f311.md](silent-proposal-e5b87be50f28f311.md)，原保存路径：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md。

本次已核事实：首/三试T2观测指纹相同；原/替线实损3/15、扣10/17。已有decision_id、journal.choice、首步派发和SL尝试号。

反例和限制：末试省血线延至T11仍败；F17T6抽牌后重规划，候选省血量不等于实际整轮省血。

处置waiting：缺按同一观测关联的原答、护栏后、SL后候选快照及重规划分段的完整固定执行前缀，无法验收请求的端到端审计或拟合阈值。chosen_order实际是击杀顺序label；单敌无值正常，不能据此声称出牌顺序缺失。

预期行为与验证方法：先恢复可核候选身份、替换差值、分段执行边界；补审计时保持选择等价，改变SL/护栏阈值须另有按局分组的后置验证。

本次保留旧行为；没有源码、行为版本或合入可报告。预期影响限于对应事实/审计覆盖，不承诺整场转胜。下一次实现须独立提交、固定撤源码失败/恢复通过、原沙箱入口和锁内合后检查；实际改变行为再按授权双通知Roy。回退用实际实现提交，证据、原稿与失败历史保留。

## silent-proposal-49632bc4878fb597：力量、虚弱与成长分项

角色silent/A10；来源任务experience-update；实现任务strategy-proposal；原领域：combat。

证据局号/层/回合：CA5KE8GFJ9X2 F13T1/T3/T5。账本：silent-0005, silent-0231。原经验：silent-strength-weak-observation。

原提案及完整旧/新行为：[silent-proposal-49632bc4878fb597.md](silent-proposal-49632bc4878fb597.md)，原保存路径：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md。

本次已核事实：原帧力量0/4/8及喷水11/15/19成立，虚弱后11/14；计划步法未取得。

反例和限制：虚弱没有关闭后续加压；缺敏捷实测，不补计划收益。

处置waiting：该局未取得步法，缺力量、敏捷、虚弱和独立成长共同冻结的完整调用及源码对照，不能把现有属性子项认领为复合提案已完成。

预期行为与验证方法：分项验证当前属性、每击修正和成长；不给统一保血或输出权重。

本次保留旧行为；没有源码、行为版本或合入可报告。预期影响限于对应事实/审计覆盖，不承诺整场转胜。下一次实现须独立提交、固定撤源码失败/恢复通过、原沙箱入口和锁内合后检查；实际改变行为再按授权双通知Roy。回退用实际实现提交，证据、原稿与失败历史保留。

## silent-proposal-66532328a585941f：构筑启动兑现

角色silent/A10；来源任务experience-update；实现任务strategy-proposal；原领域：combat, structure。

证据局号/层/回合：5PM6JAQG6FNQ F39末试T2；F33T1—2。账本：silent-0021, silent-0009。原经验：silent-deck-burst-observation。

原提案及完整旧/新行为：[silent-proposal-66532328a585941f.md](silent-proposal-66532328a585941f.md)，原保存路径：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md。

本次已核事实：F39向无毒目标打冒泡，能量5→4、29HP及敌状态不变；持有雾没有建立。

反例和限制：同局F33建雾3/触媒1/群蛇4后胜，敌人和生存条件也改变。

处置waiting：缺相同血量、构筑及抽序下不同启动顺序的完整结局和可复现收益函数；F33胜与F39败不能拟合启动阈值。

预期行为与验证方法：先把持有、计划、实际已建能力分账；启动或构筑权重需受控整场验证。

本次保留旧行为；没有源码、行为版本或合入可报告。预期影响限于对应事实/审计覆盖，不承诺整场转胜。下一次实现须独立提交、固定撤源码失败/恢复通过、原沙箱入口和锁内合后检查；实际改变行为再按授权双通知Roy。回退用实际实现提交，证据、原稿与失败历史保留。

## silent-proposal-43a76a31ba7bdcfa：吸取、负敏捷与SL

角色silent/A10；来源任务experience-update；实现任务strategy-proposal；原领域：combat, sl。

证据局号/层/回合：61E2QS63Y9WU F17T5—7。账本：silent-0030, silent-0027。原经验：silent-lagavulin-siphon-poison-sl。

原提案及完整旧/新行为：[silent-proposal-43a76a31ba7bdcfa.md](silent-proposal-43a76a31ba7bdcfa.md)，原保存路径：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md。

本次已核事实：吸取后敏捷−2、双防御各3合6挡，17毒继续结算；60HP首试七轮胜。

反例和限制：首试胜不提供另一可救活SL线路，负敏捷也没有关闭毒。

处置waiting：缺相同起始资源、完整抽序和另一可救活SL线路；本次首试获胜不足以改变SL范围或换线偏好。

预期行为与验证方法：冻结吸取、负敏捷、毒逐次结算；SL规则变更另用完整同盘对照验证。

本次保留旧行为；没有源码、行为版本或合入可报告。预期影响限于对应事实/审计覆盖，不承诺整场转胜。下一次实现须独立提交、固定撤源码失败/恢复通过、原沙箱入口和锁内合后检查；实际改变行为再按授权双通知Roy。回退用实际实现提交，证据、原稿与失败历史保留。

## silent-proposal-5264153a4a4b0e5c：召唤与各实体成长

角色silent/A10；来源任务experience-update；实现任务strategy-proposal；原领域：combat。

证据局号/层/回合：61E2QS63Y9WU F23T1—5，重点T4—5。账本：silent-0039, silent-0209。原经验：silent-obscura-summon-growth。

原提案及完整旧/新行为：[silent-proposal-5264153a4a4b0e5c.md](silent-proposal-5264153a4a4b0e5c.md)，原保存路径：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md。

本次已核事实：新召幻象21HP；航行后力量3再6。T4本体线实扣47/损15，次轮幻象2HP仍存活攻击。

反例和限制：幻象focus的39伤/零损仅是未实打候选；本局未再复活。

处置waiting：缺A10召唤、航行、复活的完整组合调用与另一目标序后续实打；敌HP审计3f69541b5d3259dac94d3395bfe3da47936b4de9只覆盖子项，不证明完整目标排序请求完成。

预期行为与验证方法：按当前进阶及各实体身份验证召唤/成长/退场；保留全部目标选项，相同推演并列。

本次保留旧行为；没有源码、行为版本或合入可报告。预期影响限于对应事实/审计覆盖，不承诺整场转胜。下一次实现须独立提交、固定撤源码失败/恢复通过、原沙箱入口和锁内合后检查；实际改变行为再按授权双通知Roy。回退用实际实现提交，证据、原稿与失败历史保留。

## silent-proposal-bddfa690a84e03d0：熟睡甲虫醒来与成长

角色silent/A10；来源任务experience-update；实现任务strategy-proposal；原领域：combat。

证据局号/层/回合：DUZUBAJ3A8GP F30T1—6（四试）。账本：silent-0128, silent-0079。原经验：silent-slumbering-beetle-wake-growth。

原提案及完整旧/新行为：[silent-proposal-bddfa690a84e03d0.md](silent-proposal-bddfa690a84e03d0.md)，原保存路径：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md。

本次已核事实：睡3/2/1后T4醒来，T5力2、T6力4和22攻；末试16挡1HP不足覆盖6穿透。

反例和限制：末试T4多扣3敌血同时多损2玩家血，四试均败。

处置waiting：当前进阶后轮伤害子项c7578f37608526591edd86041cee5a28c3894fee已是live祖先；缺睡眠、受击眩晕、醒来的完整组合验收，以及同抽同资源的完整获胜对照，不能拟合血价或固定首杀。

预期行为与验证方法：分别冻结睡眠、眩晕与成长状态；模型确定性验证与策略胜负对照分别登记。

本次保留旧行为；没有源码、行为版本或合入可报告。预期影响限于对应事实/审计覆盖，不承诺整场转胜。下一次实现须独立提交、固定撤源码失败/恢复通过、原沙箱入口和锁内合后检查；实际改变行为再按授权双通知Roy。回退用实际实现提交，证据、原稿与失败历史保留。

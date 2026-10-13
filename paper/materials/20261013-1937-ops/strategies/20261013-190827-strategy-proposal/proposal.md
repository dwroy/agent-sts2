# 本批十项原提案：证据核验与处置

batch=20261013-190827-strategy-proposal；角色silent；仅A10六派发局。base=75fdaa6a9517515b1b2383bbcc9430efe3a61ca1。
本批没有research_request或implementation_request；根专题绑定别批，不能替代本批。未领取其他提案，不建立重复id。

所有原提案均waiting；现有子项保留。本次未定位足以新增策略参数或宣称完整实现的已核源码差额。
以下是原提案的剩余范围及可验证条件，不把证据不足写成已验证游戏规则。

## silent-proposal-89354805ee4d7e77：神化升级传播及施放分账

来源：postmortem → strategy-proposal；原文件：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md。
账本：silent-0237、silent-0238。
证据局号/层/回合：VLZ6CCT8AQ0A A10 F35/F43/F45 T1。
本批核验：states275564→275565实付2能、防御5→8、打击7→10；decisions269706/269707同后续序列43伤/14损→51伤/13损，states275679→275687实际兑现51伤/13损。F45 states275728→275732药水、出牌及弃牌后的能力只有勒紧4、触媒1，不能按持有预支升级。
反例与限制：F43实际打过仍净损57；F45未打而败的敌人、抽牌、血药不同，不是神化的胜负反事实。
处置：waiting。已观察升级与候选事实有live子项；actual_cast_this_fight仍为null，缺成功施放跨抽牌、药水、选择中断及换战/SL/重启的完整身份与消费者验证，不能关闭原提案。
现有live子项源码祖先：b2805be4ba44b7375c7908d873889372cc3cfe6c、f98a929f24901c20efed462b29591e25ebb85451、a11dd870b09f3f1b67fcb5d6c08af6573fd809e0
预期行为与验证方法：保持已观察升级表与未知标记。下一步需要以成功派发和后继状态联合绑定本战施放，明确中断、SL、换战和恢复的未知/重置语义；固定原帧覆盖动作失败、状态缺帧和未知升级，撤接线失败/恢复通过后再运行生产自测。无需由本局拟合必打优先级。
拟合与切分：本批六局只作发现样本内复核，尝试不扩独立局分母；没有新的独立时间后移验证局，不拟合阈值/胜率。
预期影响：现阶段仅留下可追溯的剩余条件，实际策略收益未知。本次无规则变化；后续若实现，按实际源码提交回退并保留原证据，实上线后通知Roy。

## silent-proposal-f2bfceddb1898dca：三骑士预算及药水参考

来源：postmortem → strategy-proposal；原文件：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md。
账本：silent-0106、silent-0019、silent-0201。
证据局号/层/回合：VLZ6CCT8AQ0A A10 F43/F45 T1/T4/T5。
本批核验：decisions269748药水MC707ms、1/12样本，rollout horizon1、samples1、best=null；269754局部药水抽样12/12。states275728→275729为67HP不变、能量1→2、手牌1→3。269770实际选择24伤/13损线；states275754为32HP、20挡对59攻击，完整需损39、差7。
反例与限制：269770中的32伤/31损攻击线未实打；best=null退化与明确全败并列不同，707ms不是可直接推广的预算常量。
处置：waiting。缺模型覆盖一致、冻结抽牌池/种子的同起点同总预算MC对照和候选稳定性曲线；现有成熟度展示已有，单题707ms不足修改预算、留药价格或HP护栏。
现有live子项源码祖先：9952a11811a6a73f12e0f86a8b6ec49db3cae18c、04921bd785ac6838066522f91ea0bb6ab95cb6a1
预期行为与验证方法：保持当前预算、药价和护栏。后续在已覆盖模型下冻结同一状态、牌池、移动输入与种子，比较现行分配和分阶段分配的成熟度/候选稳定性；不得把时钟退化当确定死亡或将药水局部样本当整场胜率。
拟合与切分：本批六局只作发现样本内复核，尝试不扩独立局分母；没有新的独立时间后移验证局，不拟合阈值/胜率。
预期影响：现阶段仅留下可追溯的剩余条件，实际策略收益未知。本次无规则变化；后续若实现，按实际源码提交回退并保留原证据，实上线后通知Roy。

## silent-proposal-283a164780d11e69：神化经验来源链

来源：experience-update → strategy-proposal；原文件：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md。
账本：silent-0237、silent-0238。
证据局号/层/回合：VLZ6CCT8AQ0A A10 F35/F43/F45 T1。
本批核验：与89354805ee4d7e77同一组升级原帧；原Markdown、experience来源、silent-0237/0238链接均保留，原文SHA与队列一致。
反例与限制：同题、同局或经验已发布均不等于整项源码完成；不把同源两提案当两个独立样本。
处置：waiting。与原神化提案同源且经验链有效；完整实际施放、中断和重置追踪未验收，不能凭语义重复或局部升级实现登记整项duplicate。
现有live子项源码祖先：b2805be4ba44b7375c7908d873889372cc3cfe6c、f98a929f24901c20efed462b29591e25ebb85451
预期行为与验证方法：与89354805ee4d7e77共同验证施放身份与消费者边界，保持此experience来源id，不再建重复提案或重复补历史复盘。
拟合与切分：本批六局只作发现样本内复核，尝试不扩独立局分母；没有新的独立时间后移验证局，不拟合阈值/胜率。
预期影响：现阶段仅留下可追溯的剩余条件，实际策略收益未知。本次无规则变化；后续若实现，按实际源码提交回退并保留原证据，实上线后通知Roy。

## silent-proposal-ebbfe3b97548756d：十五机制及持续资源宽提案

来源：experience-update → strategy-proposal；原文件：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md。
账本：silent-0005、silent-0016、silent-0049、silent-0071、silent-0143、silent-0046、silent-0053、silent-0027、silent-0011、silent-0021、silent-0106、silent-0204、silent-0020、silent-0019。
证据局号/层/回合：VLZ6CCT8AQ0A A10 F43 T1—T5、F45 T1/T3/T5；F44营火。
本批核验：F43的升级与即时结算、F45现场勒紧4/触媒1/末轮覆甲0已核。F45末轮尖啸后四攻击段合59而完整需损39；不能将临时减力预支为持续存活。linked-silent-experience.json保存原15条关联及本角色当前经验原文，支持分母不并成同一实验。
反例与限制：F43胜战仍损57、F4433→67回复后F45仍败；没有另一focus或休息/锻造/留药的完整条件匹配结果。覆甲原账本当前已明确按实际剩层，不添加旧已纠正的固定4挡结论。
处置：waiting。十五机制涉及不同状态期限与资源消费者；尚缺逐项完整冻结调用/持续资源对照，单独神化、减力或当前轮字段不能证明宽提案全部实现。
现有live子项源码祖先：b2805be4ba44b7375c7908d873889372cc3cfe6c、05cd292c6f01bb31e406473d3a9843e659d62b93、a8b1f8be153fe4f3a34146117546c2178f2e446b
预期行为与验证方法：保持已观察子式，按十五子项逐一冻结输入与生命周期，分别核当前牌挡/属性/毒结算/临时减力恢复/现场覆甲及真实回复，再核持续资源消费者。没有机制覆盖或同盘收益证据时保持未知，不设置安全血线、focus或路线权重。
拟合与切分：本批六局只作发现样本内复核，尝试不扩独立局分母；没有新的独立时间后移验证局，不拟合阈值/胜率。
预期影响：现阶段仅留下可追溯的剩余条件，实际策略收益未知。本次无规则变化；后续若实现，按实际源码提交回退并保留原证据，实上线后通知Roy。

## silent-proposal-e5b87be50f28f311：SL与护栏执行审计

来源：postmortem → strategy-proposal；原文件：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md。
账本：silent-0079、silent-0021、silent-0125、silent-0018。
证据局号/层/回合：8JRE1C4H4Z2W A10 F33 首/第三试T2、第二试T5；F17 T6。
本批核验：decisions270216/270282 fingerprint逐字相同；原线与SL替线本轮3损/10伤对15损/17伤，sl-attempts首/第三试T2→T3实际损3/15。270282 rollout死亡0/24与5/24不同。270264护栏候选16损/43伤→4损/25伤，不能把整轮候选当首动作完成。
反例与限制：末次更长生存仍败，不能笼统认定所有防御换线错误。F33终态是前五试predicted_death、末试died；不是六次完整死亡结算，也不是六个独立局。
处置：waiting。首动作派发回执已在live；仍缺跨抽牌、选择、药水、重问续步与末端状态的完整候选归属，不能用single_action_receipt证明整个方案实打。
现有live子项源码祖先：05cd292c6f01bb31e406473d3a9843e659d62b93、bade647f9fe4c9103b40e2f26b26296692ad24b7、a8b1f8be153fe4f3a34146117546c2178f2e446b
预期行为与验证方法：保留Jev、护栏、SL选择及首次回执；后续将候选身份连续关联实际动作前缀，在每次中断显式结束候选完整执行资格，另记实际玩家净HP/敌实体血/未结算毒。固定重放本局同盘与F17重规划，验证敌index重排和SL恢复不计回血，不修改探索/护栏门槛。
拟合与切分：本批六局只作发现样本内复核，尝试不扩独立局分母；没有新的独立时间后移验证局，不拟合阈值/胜率。
预期影响：现阶段仅留下可追溯的剩余条件，实际策略收益未知。本次无规则变化；后续若实现，按实际源码提交回退并保留原证据，实上线后通知Roy。

## silent-proposal-49632bc4878fb597：力量、弱、敏捷与成长

来源：experience-update → strategy-proposal；原文件：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md。
账本：silent-0005、silent-0231。
证据局号/层/回合：CA5KE8GFJ9X2 A10 F13 T1/T3/T5。
本批核验：states273237/273252/273263同JET_MOVE为0力11伤、4力15伤、8力19伤；273268弱后14、玩家2HP/10挡，完整需损4、差2。实际步法未建立；不能从构筑计划补敏捷事实。
反例与限制：弱的当前减伤不关闭后续加压，最后死亡也不是弱失效的机制反例。
处置：waiting。源局核实力量、弱与成长但未实际建立步法；仍缺四路径联动的完整冻结消费者对照，不能用一份敏捷子项提交关闭整条复合经验。
现有live子项源码祖先：b2805be4ba44b7375c7908d873889372cc3cfe6c
预期行为与验证方法：保留现场属性公式，将负/正敏捷与每击力量、弱及成长输入分开，跨本角色帧核完整消费者；不据这局设统一保血/输出权重。
拟合与切分：本批六局只作发现样本内复核，尝试不扩独立局分母；没有新的独立时间后移验证局，不拟合阈值/胜率。
预期影响：现阶段仅留下可追溯的剩余条件，实际策略收益未知。本次无规则变化；后续若实现，按实际源码提交回退并保留原证据，实上线后通知Roy。

## silent-proposal-66532328a585941f：组件持有与实际启动

来源：experience-update → strategy-proposal；原文件：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md。
账本：silent-0021、silent-0009。
证据局号/层/回合：5PM6JAQG6FNQ A10 F39末试T2；同局F33。
本批核验：decisions268455、states274379→274380：向无毒THE_LOST打BUBBLE_BUBBLE，能量5→4、敌状态不变；F39末试没有建立毒雾。
反例与限制：同局F33建立组件且赢，与F39敌人/存活资源一起改变，不能据此隔离启动价值。
处置：waiting。无毒空放只确认本次1能量代价；缺同HP、构筑、药水及抽序下不同启动顺序的完整对照和收益函数，不能拟合启动或构筑权重。
现有live子项源码祖先：本次不为整案指定implemented_commit；现有泛用公式不构成整项实现证明。
预期行为与验证方法：保持持有/计划/已建立分账，冻结同起点与可活后轮，比较真实启动顺序的完整结果。不能把已有组件当已兑现持续输出，不能从空放直接规定整战最佳顺序。
拟合与切分：本批六局只作发现样本内复核，尝试不扩独立局分母；没有新的独立时间后移验证局，不拟合阈值/胜率。
预期影响：现阶段仅留下可追溯的剩余条件，实际策略收益未知。本次无规则变化；后续若实现，按实际源码提交回退并保留原证据，实上线后通知Roy。

## silent-proposal-43a76a31ba7bdcfa：族母吸取、负敏捷、毒与SL

来源：experience-update → strategy-proposal；原文件：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md。
账本：silent-0030、silent-0027。
证据局号/层/回合：61E2QS63Y9WU A10 F17 T5/T6/T7。
本批核验：states273502→273504玩家力2→0、敏0→−2、敌力0→2；273505/273507双防御总挡3/6，各加3；273504→273508敌67→34，17+16毒继续净扣33。
反例与限制：本局首试赢；没有相同起始资源及完整抽序的另一SL胜线。saved clean抽序在T4洗牌中断。
处置：waiting。吸取、负敏捷与毒分项观察成立；缺同起始资源、完整抽序和当前进阶移动输入的受控SL换线结果，首试胜不足改变SL范围或偏好。
现有live子项源码祖先：本次不为整案指定implemented_commit；现有泛用公式不构成整项实现证明。
预期行为与验证方法：保持当前吸取与毒事实和SL规则。后续完整冻结当前进阶移动、同抽与起始血药，验证吸取→牌挡→毒的整场接续，再讨论换线收益。
拟合与切分：本批六局只作发现样本内复核，尝试不扩独立局分母；没有新的独立时间后移验证局，不拟合阈值/胜率。
预期影响：现阶段仅留下可追溯的剩余条件，实际策略收益未知。本次无规则变化；后续若实现，按实际源码提交回退并保留原证据，实上线后通知Roy。

## silent-proposal-5264153a4a4b0e5c：胧光怪召唤及各实体成长

来源：experience-update → strategy-proposal；原文件：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md。
账本：silent-0039、silent-0209。
证据局号/层/回合：61E2QS63Y9WU A10 F23 T2/T3/T4/T5。
本批核验：states273583/273589/273596本体和幻象力量分别0/3/6；273593→273596幻象14→2仍存活，玩家25→10实损15，本体76→41。
反例与限制：focus幻象39伤/零损只是未实打候选；不能冒称其后继必胜或规定固定首杀。
处置：waiting。缺A10航行、幻象与复生联动的完整冻结模拟调用及另一focus后继；已观察当前成长或旧召唤子项不证明目标排序收益。
现有live子项源码祖先：本次不为整案指定implemented_commit；现有泛用公式不构成整项实现证明。
预期行为与验证方法：保留各实体HP/意图与全部目标选项，冻结召唤/航行/复生的联合输入和状态顺序；同推演值并列，再验证不同focus完整后继。
拟合与切分：本批六局只作发现样本内复核，尝试不扩独立局分母；没有新的独立时间后移验证局，不拟合阈值/胜率。
预期影响：现阶段仅留下可追溯的剩余条件，实际策略收益未知。本次无规则变化；后续若实现，按实际源码提交回退并保留原证据，实上线后通知Roy。

## silent-proposal-bddfa690a84e03d0：熟睡甲虫睡眠、醒来与成长

来源：experience-update → strategy-proposal；原文件：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md。
账本：silent-0128、silent-0079。
证据局号/层/回合：DUZUBAJ3A8GP A10 F30 T1—T6，四尝试。
本批核验：states274906睡层3；274923 T4醒、274929 T5力2、274934 T6力4和22攻击。末试对应275007/275013/275018仍继续成长。
反例与限制：四次未获胜实际为3次predicted_death后重载、1次died；T6 saved clean抽序均在洗牌处中断。末试更高扣血也付更多玩家血，不足拟合血价。
处置：waiting。缺睡眠、醒来/眩晕接续与当前进阶成长的完整历史调用依赖及同抽换序完整对照；四次未获胜不足拟合血价或固定杀序。
现有live子项源码祖先：本次不为整案指定implemented_commit；现有泛用公式不构成整项实现证明。
预期行为与验证方法：保持现场睡层与当前进阶数据，冻结唤醒、眩晕、临时减力恢复、增力及同伴退场的整场接续；不把重新排列候选当已有救活胜线。
拟合与切分：本批六局只作发现样本内复核，尝试不扩独立局分母；没有新的独立时间后移验证局，不拟合阈值/胜率。
预期影响：现阶段仅留下可追溯的剩余条件，实际策略收益未知。本次无规则变化；后续若实现，按实际源码提交回退并保留原证据，实上线后通知Roy。

## 审计边界

原Markdown十份均核登记SHA，全部账本来自silent；未改原提案、原经验、原复盘或专用队列。没有发现需要新增登记的游戏结论，不经add再造id。
b2805be4/f98a929f/a11dd870等仅证明已有限实现的子项为实际live祖先；不能记整项duplicate/implemented，更不能替运维标shipped。
各项共同的规则是保留全部合法选项、模型相同值并列，不规定必打牌、固定focus、SL阈值或路线/留药价格；无关角色未修改。

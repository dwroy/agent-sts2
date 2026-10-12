# 静默策略提案逐项核验

记录时间：2026-10-13T06:53:55+08:00。批次：20261013-064302-strategy-proposal。角色：silent。
base：`e0d25c8991758f846edad1e2f641112ff4a9dc72`。普通队列任务，main合并结果Already up to date；没有research_request/implementation_request，不接管旧专题。

本批十项均waiting，无新源码、参数、经验库、提交、live合入或发布。原id与Markdown字节保持。缺口是完整提案的验收范围，不将已存在子项冒称未实现，也不将它们冒称整个提案完成。

## 证据与范围

六派发局均已从runs.jsonl核为SILENT/A10。全部原始来源局日志只读冻结；重点结论来自下面列出的关键帧，不声称逐局全决策打法均已评估。SL尝试不是独立局，终态未结算不补未来毒/伤害。怪物原帧血量/攻击与本角色A10数据库选取保存，未用其他角色知识或预训练事实补结论。

固定证据和可追溯材料：evidence/保留原JSONL与每条原行号、字节偏移、长度、SHA；runs.json/runs-index.json、六份*.lessons.md/lessons-index.json、十份*.original.md/proposal-history.json/proposals.json、ledger-before.json、linked-experience.json、monster-db-selected.json。

## 已存在实现与未覆盖边界

- 神化普通传播：`772b839f8ada31664cb764ea9ad3bdb03da27f64`，已核为实际live祖先，仅证明对应子项。
- 神化触媒传播：`f516592fff557ef02c8ece43433706358c3f7fe6`，已核为实际live祖先，仅证明对应子项。
- 神化萎靡传播：`b2805be4ba44b7375c7908d873889372cc3cfe6c`，已核为实际live祖先，仅证明对应子项。
- 持有/候选神化分列：`30ec2425012eea75f41226b31d8180b1abb837bc`，已核为实际live祖先，仅证明对应子项。
- 模拟成熟度原增量：`45161a51c2c6b7e4a499b13cf749c4108193bbf5`，已核为实际live祖先，仅证明对应子项。
- 候选审计当前源码：`9d8278702dbc581b5015ba7ec9a70dc0fb94cccb`，已核为实际live祖先，仅证明对应子项。
- 单动作派发回执：`fdaf787a372880b0438e73bcac7e6d2168b038ed`，已核为实际live祖先，仅证明对应子项。
- SL候选对照当前源码：`66283dd9982bdd7f480da7a4d9bfefea0572a9ac`，已核为实际live祖先，仅证明对应子项。

核对live：`e42018c10c8ddda4225ccd273e824425dbd94250`。source-manifest.json保存16个源码路径的base/live SHA与祖先关系；其中7份有原字节差异，完整补丁为base-live-source.diff.patch。90条增删内容均精确对应Roy→Dai的署名替换，只描述这7份所查路径，不宣称整棵树等价。源码副本用.txt保存。

神化表已有本角色A10普通神化、已核升级牌对及后续牌堆传播；unknown费用、附魔和属性组合继续保留未知。silent-apotheosis-reference.ts明确actual_cast_this_fight=null；silent-selection-audit.ts保留actual_turn=null，silent-selection-dispatch.ts保留state_effect_verified=false、whole_plan_executed=null。它们诚实区分候选与执行，但不等于完整原审计请求已验收。silent-phase-current.ts只覆盖实验体F48特定现场，silent-kin-progress.ts只覆盖F17特定实体，不能用这些窄展示证明本批失落/胧光怪/三骑士的完整消费者链。

## silent-proposal-89354805ee4d7e77

来源：postmortem → strategy-proposal；原提案 `/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md`；SHA256 `ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d`。
证据：VLZ6CCT8AQ0A，A10，F35 T1 / F43 T1 / F45 T1。账本：silent-0237, silent-0238。
核实：states275564→275565耗2能；decisions269706/269707同后序43/14→51/13，states275679→275687实际扣51/损13；F45神化未兑现。
反例/限制：F43虽打神化仍全战损57；F45不同牌序未打而败，不能归因必打或必胜。
旧行为/预期：按静默已观测帧补齐神化在同线及后续抽牌中的升级传播，并区分持有、施放与模型覆盖；无整场转胜保证。 不在本批加新权重、硬顺序或强制动作；保留原合法选项。
处置：waiting。普通神化及已观察升级已有live子项；本战实际施放字段仍为null，缺跨重规划、SL、进程重启的施放归属，以及未知费用/附魔/自动动作组合的冻结校验，不能关闭整项。
验证方法：只用保存的固定原帧；补齐上述缺口后冻结各牌/各敌/各资源完整调用输入、同盘随机流及动作前缀，对照原线和提议线。确定性状态变换逐步核对，规则收益按run_id分组且以时间后置独立同角色完局验证。原局均已用于发现，不能称盲测；新增源码须撤源码失败、恢复通过及原沙箱入口自测。
拟合/回退：本批不拟合阈值或收益常数；无新生产源码可回退。未来实现各自记实际源码commit和规则开关，回退对应提交并保留失败历史；实际上线后按原流程双通知Roy。

## silent-proposal-f2bfceddb1898dca

来源：postmortem → strategy-proposal；原提案 `/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md`；SHA256 `fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26`。
证据：VLZ6CCT8AQ0A，A10，F45 T1/T4/T5。账本：silent-0106, silent-0019, silent-0201。
核实：decisions269748药水1/12耗707ms、horizon1/best=null；269754药水12/12，起点已经变。269770低损线24伤/13损与攻击线32伤/31损。
反例/限制：未实打T4高伤线；未知神化效果和异盘预算不得归于MC常量。
旧行为/预期：核验三骑士全败候选的即时血价、击杀缺口与药水MC预算成熟度；先做同盘预算实验，缺对照时保留原护栏、留药与目标规则。 不在本批加新权重、硬顺序或强制动作；保留原合法选项。
处置：waiting。诊断展示已有live；F45两题起点和模型覆盖不同，1/12、707ms与12/12不是同盘配对实验。缺同状态、随机流、模型覆盖及总预算下的候选稳定性/收益曲线，不改MC分配、留药或focus。
验证方法：只用保存的固定原帧；补齐上述缺口后冻结各牌/各敌/各资源完整调用输入、同盘随机流及动作前缀，对照原线和提议线。确定性状态变换逐步核对，规则收益按run_id分组且以时间后置独立同角色完局验证。原局均已用于发现，不能称盲测；新增源码须撤源码失败、恢复通过及原沙箱入口自测。
拟合/回退：本批不拟合阈值或收益常数；无新生产源码可回退。未来实现各自记实际源码commit和规则开关，回退对应提交并保留失败历史；实际上线后按原流程双通知Roy。

## silent-proposal-283a164780d11e69

来源：experience-update → strategy-proposal；原提案 `/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md`；SHA256 `78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637`。
证据：VLZ6CCT8AQ0A，A10，F35 T1 / F43 T1/T2 / F45 T1。账本：silent-0237, silent-0238。
核实：与89354805ee4d7e77同源，原经验silent-apotheosis-combat-upgrades；只保存原Markdown/指纹，不新建同义id。
反例/限制：场外deck与战内升级分账，尚不能由持有确认施放生命周期。
旧行为/预期：神化已观察升级进入同方案与后续抽牌，保留未知边界，不定必打规则 不在本批加新权重、硬顺序或强制动作；保留原合法选项。
处置：waiting。同源神化升级已有live子项；经验关联不能证明本战实际施放、未知卡及跨轮组合已经全部覆盖，保留原id等待完整生命周期验证。
验证方法：只用保存的固定原帧；补齐上述缺口后冻结各牌/各敌/各资源完整调用输入、同盘随机流及动作前缀，对照原线和提议线。确定性状态变换逐步核对，规则收益按run_id分组且以时间后置独立同角色完局验证。原局均已用于发现，不能称盲测；新增源码须撤源码失败、恢复通过及原沙箱入口自测。
拟合/回退：本批不拟合阈值或收益常数；无新生产源码可回退。未来实现各自记实际源码commit和规则开关，回退对应提交并保留失败历史；实际上线后按原流程双通知Roy。

## silent-proposal-ebbfe3b97548756d

来源：experience-update → strategy-proposal；原提案 `/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md`；SHA256 `08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2`。
证据：VLZ6CCT8AQ0A，A10，F43 T1—T5 / F45 T1—T5。账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。
核实：原15经验逐条见原提案；本次确认勒紧升级6、F43净扣/损血与原始资源帧保留。
反例/限制：15条包含不同机制/样本，不能拿一局若干端点当各子式独立因果实验。
旧行为/预期：逐源验证当前攻防、毒触发与持续资源，不从持有或单轮减力预支整场收益 不在本批加新权重、硬顺序或强制动作；保留原合法选项。
处置：waiting。当前力量/敏捷/毒子公式与若干分源展示已有实现；缺原15条经验逐项的联合跨轮消费者验证，尤其口红、现场覆甲、暂减力恢复和未来毒期限，不用一组端点关闭全部范围。
验证方法：只用保存的固定原帧；补齐上述缺口后冻结各牌/各敌/各资源完整调用输入、同盘随机流及动作前缀，对照原线和提议线。确定性状态变换逐步核对，规则收益按run_id分组且以时间后置独立同角色完局验证。原局均已用于发现，不能称盲测；新增源码须撤源码失败、恢复通过及原沙箱入口自测。
拟合/回退：本批不拟合阈值或收益常数；无新生产源码可回退。未来实现各自记实际源码commit和规则开关，回退对应提交并保留失败历史；实际上线后按原流程双通知Roy。

## silent-proposal-e5b87be50f28f311

来源：postmortem → strategy-proposal；原提案 `/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md`；SHA256 `5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709`。
证据：8JRE1C4H4Z2W，A10，F33 首试/第三试T2、第二试T5、末试T11；F17 T6。账本：silent-0079, silent-0021, silent-0125, silent-0018。
核实：decisions270216/270282指纹完全相同。states276208→276212损3/扣10，对276274→276278损15/扣17；第三试记录死亡0/24对5/24，不能称同死率。276433为5HP/22挡对37，实扣5是零血截断、完整需损15。
反例/限制：末次较多防御延至T11仍死，反对一律认定保血替换错误；F17抽牌后重规划，候选差不能当实际因果收益。
旧行为/预期：静默A10同盘SL以12血换7伤重犯：补齐Jev原答、HP护栏、SL换线及重规划的候选代价与实际成长兑现审计；单局不足以改阈值，保留现行为并独立验证。 不在本批加新权重、硬顺序或强制动作；保留原合法选项。
处置：waiting。原答/护栏/SL候选及单动作回执已有live；actual_turn和whole_plan_executed仍未知，缺机械重规划原因、抽弃/生成/药水续步归属及分源能力兑现全链。单动作返回不能证明整线已执行。
验证方法：只用保存的固定原帧；补齐上述缺口后冻结各牌/各敌/各资源完整调用输入、同盘随机流及动作前缀，对照原线和提议线。确定性状态变换逐步核对，规则收益按run_id分组且以时间后置独立同角色完局验证。原局均已用于发现，不能称盲测；新增源码须撤源码失败、恢复通过及原沙箱入口自测。
拟合/回退：本批不拟合阈值或收益常数；无新生产源码可回退。未来实现各自记实际源码commit和规则开关，回退对应提交并保留失败历史；实际上线后按原流程双通知Roy。

## silent-proposal-49632bc4878fb597

来源：experience-update → strategy-proposal；原提案 `/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md`；SHA256 `aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2`。
证据：CA5KE8GFJ9X2，A10，F13 T1/T3/T5。账本：silent-0005, silent-0231。
核实：states273237/273252/273263敌力0/4/8；273268为2HP、10挡、弱后14攻击，完整需损4；273269死。
反例/限制：关键战没有正敏捷，不能补一个计划中的步法样本；虚弱未取消独立加压成长。
旧行为/预期：把当前属性、每击修正、弱与成长分项验证，不增加统一保血或输出权重。 不在本批加新权重、硬顺序或强制动作；保留原合法选项。
处置：waiting。CA5 F13已核力量0→4→8及弱后11/14，关键战无正敏捷样本；缺力量、敏捷、弱、独立成长四路径共同冻结的调用对照和跨轮验证，不校准统一血价权重。
验证方法：只用保存的固定原帧；补齐上述缺口后冻结各牌/各敌/各资源完整调用输入、同盘随机流及动作前缀，对照原线和提议线。确定性状态变换逐步核对，规则收益按run_id分组且以时间后置独立同角色完局验证。原局均已用于发现，不能称盲测；新增源码须撤源码失败、恢复通过及原沙箱入口自测。
拟合/回退：本批不拟合阈值或收益常数；无新生产源码可回退。未来实现各自记实际源码commit和规则开关，回退对应提交并保留失败历史；实际上线后按原流程双通知Roy。

## silent-proposal-66532328a585941f

来源：experience-update → strategy-proposal；原提案 `/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md`；SHA256 `56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831`。
证据：5PM6JAQG6FNQ，A10，F39 第二试T2；首试T4与末试T4。账本：silent-0021, silent-0009。
核实：decision268455先打冒泡；states274379→274380能5→4、失落35HP不变、仍0毒。274351首试已建毒雾3，而274391末试未建。
反例/限制：同局F33组件曾建立并获胜；敌人、入口、组件一起改变，不能推启动优先级因果。
旧行为/预期：持有/计划/已建立分账；如提构筑或启动权重，先做实盘兑现与受控整场验证。 不在本批加新权重、硬顺序或强制动作；保留原合法选项。
处置：waiting。5PM F39末试冒泡对零毒目标只消耗1能已核，首试另有毒雾建立；缺同入口HP、构筑和抽序的启动顺序受控整场结果及可复现收益函数，不拟合启动阈值。
验证方法：只用保存的固定原帧；补齐上述缺口后冻结各牌/各敌/各资源完整调用输入、同盘随机流及动作前缀，对照原线和提议线。确定性状态变换逐步核对，规则收益按run_id分组且以时间后置独立同角色完局验证。原局均已用于发现，不能称盲测；新增源码须撤源码失败、恢复通过及原沙箱入口自测。
拟合/回退：本批不拟合阈值或收益常数；无新生产源码可回退。未来实现各自记实际源码commit和规则开关，回退对应提交并保留失败历史；实际上线后按原流程双通知Roy。

## silent-proposal-43a76a31ba7bdcfa

来源：experience-update → strategy-proposal；原提案 `/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md`；SHA256 `f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c`。
证据：61E2QS63Y9WU，A10，F17 T5/T6/T7。账本：silent-0030, silent-0027。
核实：states273502→273504玩家力2→0、敏0→-2、敌力0→2；273505/273507两防御各3；273504→273508敌67→34、17+16毒结算。
反例/限制：这场首试最终赢；并无另一同盘SL胜线可比较，不能把别局失败搬来修改阈值。
旧行为/预期：冻结吸取、负敏捷与毒的分项事实；任何SL范围或换线偏好需完整同盘验证。 不在本批加新权重、硬顺序或强制动作；保留原合法选项。
处置：waiting。61E F17吸取、负敏捷双防御及17+16毒结算已核，首试获胜；缺同HP/构筑/完整抽序的另一SL全程线路和完整冻结模拟输入，不据首试胜改SL范围或阈值。
验证方法：只用保存的固定原帧；补齐上述缺口后冻结各牌/各敌/各资源完整调用输入、同盘随机流及动作前缀，对照原线和提议线。确定性状态变换逐步核对，规则收益按run_id分组且以时间后置独立同角色完局验证。原局均已用于发现，不能称盲测；新增源码须撤源码失败、恢复通过及原沙箱入口自测。
拟合/回退：本批不拟合阈值或收益常数；无新生产源码可回退。未来实现各自记实际源码commit和规则开关，回退对应提交并保留失败历史；实际上线后按原流程双通知Roy。

## silent-proposal-5264153a4a4b0e5c

来源：experience-update → strategy-proposal；原提案 `/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md`；SHA256 `b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02`。
证据：61E2QS63Y9WU，A10，F23 T2/T3/T4/T5。账本：silent-0039, silent-0209。
核实：273583召唤21HP幻象；273589力3、273596双方力6；273593→273596玩家25→10、合敌90→43，幻象14→2仍活。
反例/限制：focus幻象39伤/零损只是候选，未实打；不能由47净扣推断退场或整场最优。
旧行为/预期：复验已有召唤和各实体成长；保留所有目标选项，相同推演值并列，不强制首杀。 不在本批加新权重、硬顺序或强制动作；保留原合法选项。
处置：waiting。61E F23已核召唤及双方航行力3→6，T4扣47、损15而幻象仍2HP；另一39伤零损候选未实打。缺当前A10召唤/航行联合模拟输入、逐步消费者对照及另一目标序后继，不规定首杀。
验证方法：只用保存的固定原帧；补齐上述缺口后冻结各牌/各敌/各资源完整调用输入、同盘随机流及动作前缀，对照原线和提议线。确定性状态变换逐步核对，规则收益按run_id分组且以时间后置独立同角色完局验证。原局均已用于发现，不能称盲测；新增源码须撤源码失败、恢复通过及原沙箱入口自测。
拟合/回退：本批不拟合阈值或收益常数；无新生产源码可回退。未来实现各自记实际源码commit和规则开关，回退对应提交并保留失败历史；实际上线后按原流程双通知Roy。

## silent-proposal-bddfa690a84e03d0

来源：experience-update → strategy-proposal；原提案 `/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md`；SHA256 `b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780`。
证据：DUZUBAJ3A8GP，A10，F30 四试T1—T6，重点末试T4/T5/T6。账本：silent-0128, silent-0079。
核实：末试274991/274998/275003睡3/2/1，275007已醒；275007/275013/275018力0/2/4。275022为1HP、16挡对22；275023敌剩32，完整需损6而实扣1。
反例/限制：首试T4→T5敌86→74、玩家5→3；末试86→71、玩家5→1，多扣3却多损2血。四次同局失败不是四独立局。
旧行为/预期：按当前进阶、睡眠/眩晕/成长分别验证；不把未知换线胜率或固定杀序写成规则。 不在本批加新权重、硬顺序或强制动作；保留原合法选项。
处置：waiting。DUZ F30四试均败，已核睡3/2/1→醒、力0/2/4及末轮1HP+16挡对22；缺唤醒/眩晕/成长联合模拟输入、同抽改线完整结果与兑现代价校准，四次同局失败不能拟合输出血价。
验证方法：只用保存的固定原帧；补齐上述缺口后冻结各牌/各敌/各资源完整调用输入、同盘随机流及动作前缀，对照原线和提议线。确定性状态变换逐步核对，规则收益按run_id分组且以时间后置独立同角色完局验证。原局均已用于发现，不能称盲测；新增源码须撤源码失败、恢复通过及原沙箱入口自测。
拟合/回退：本批不拟合阈值或收益常数；无新生产源码可回退。未来实现各自记实际源码commit和规则开关，回退对应提交并保留失败历史；实际上线后按原流程双通知Roy。

## 本批验证和交付

原日志逐字核验6806条，另runs6条角色/索引已保存；24项关键帧算术核验通过。这是证据一致性检查，不是tsc/vitest、生产回归、撤源码实验或整场策略收益验证。
无源码修改，tsc/vitest/cases均null，撤源码失败/恢复通过不适用。没有新提案id、源码commit、合入commit或release_id，不标implemented/duplicate/shipped。学习账本只经根ledger CLI追加本报告及原提案链接，保留旧claim/status/version与并行历史，不把原shipped经验状态倒写成proposed，也不重复添加同一原证据。

临时分析失误及原件：初次队列读取误把稀疏update当完整add而KeyError(character)，已改为逐行fold；单帧采样未处理非战斗combat=null而TypeError，已用combat or {}纠正。原游戏日志未改；这两项不是生产缺陷。完整材料与结果保存在本批scratch。

最终记录：26个相关账本条目经根ledger CLI追加链接并读回，原claim/status/version保持。正式账本快照用根ledger.py fold，保留字典覆盖的原采集初稿。根账本检查450项/0问题，密钥扫描0发现；批次身份、源码快照及工作树干净均已核实。本批无源码测试或发布。

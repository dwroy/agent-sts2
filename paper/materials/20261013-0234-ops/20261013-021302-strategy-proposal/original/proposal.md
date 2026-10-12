# 静默策略提案逐项复核

记录时间：2026-10-13T02:26:13+08:00。本批：20261013-021302-strategy-proposal；角色silent、观察进阶A10；base `17111a11e2870392a7cb11f57d64fb5865ddf9bf`。

仅处理宿主领取的10个原CLI id，不创建新id，不把同源/子项实现当作整项完成。所有处置为waiting；下面是原提案的本批补充验证计划，不改原提案正文或当前游戏规则。

来源局：VLZ6CCT8AQ0A, 8JRE1C4H4Z2W, CA5KE8GFJ9X2, 5PM6JAQG6FNQ, 61E2QS63Y9WU, DUZUBAJ3A8GP。原六局记录均为SILENT/A10，原运行源码均保留dirty标记；当前源码定位不能复原当时dirty全树。

## silent-proposal-89354805ee4d7e77：神化升级传播及施放分账

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md。

账本：silent-0237, silent-0238。来源任务：postmortem；实现任务：strategy-proposal；本批不标shipped。

证据：VLZ6CCT8AQ0A A10 F35/F43 T1、F43 T2—5、F45 T1—5；F35/F43实际支付2能量，剩余已覆盖牌升级，场外deck逐字不变。

反例与限制：F43施放后仍损57血；F45未施放而败，敌人、抽牌和资源不同，不构成神化导致胜负的配对。

旧行为与已存在子项：普通神化转换、已观察普通/升级对子、后续抽牌传播已有源码；silent-apotheosis-reference实际施放字段仍为null，未知牌和属性/自动动作组合保留unknown。

预期行为：保持当前有限覆盖；后续实现应绑定实际施放、战斗/SL/重启生命周期，只传播已核实升级，不用固定加分或持有状态代替施放。

验证方法：冻结F35/F43施放前后及F45未施放帧，核实费用、后继升级、不可重复累加与场外deck不变；再补跨重规划/SL/重启的实际事件归属及未知组合对照。

拟合与切分：本批不拟合常数/阈值。冻结六局为发现/复核样本，不是盲测；按run_id而非SL尝试计独立分母。后续证据须来自本角色独立新局，观察进阶以实际局号核对。

处置：waiting。普通升级传播已有live子项；仍缺跨重规划、SL、重启的实际施放归属，以及未知升级和自动动作/属性组合证据，不能关闭整项。

回退：本批无新源码或规则需回退。未来实现须按其真实源码commit回退，保留原提案、经验、账本和失败历史；只在实际live之后登记版本并通知Roy。

## silent-proposal-f2bfceddb1898dca：三骑士药水预算与全败候选

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md。

账本：silent-0106, silent-0019, silent-0201。来源任务：postmortem；实现任务：strategy-proposal；本批不标shipped。

证据：VLZ6CCT8AQ0A A10 F45 T1：随机药水707ms、1/12样本，rollout horizon=1、samples=1、best=null；T4全败候选，实际少损线24伤/13损；T5为32血20挡对59攻。

反例与限制：后续问药水达到12/12时起点/手牌和执行已改变；F17/F33较成熟推演并获胜。T4高伤线未实打，不可把少8伤判成败因。

旧行为与已存在子项：rollout-live已显示spentMs、elapsedMs、horizon、samples、degraded，并把1-turn退化与可比较best分开。

预期行为：保留预算、留药、HP护栏及目标规则；同盘实验应在相同模型覆盖、随机输入和总预算下比较候选稳定性，诊断字段不能替代收益曲线。

验证方法：固定F45 T1与较成熟F17/F33局面；冻结知识/覆盖和随机输入，配对比较现有分配与分阶段分配的样本/收益/耗时，记录未知覆盖。

拟合与切分：本批不拟合常数/阈值。冻结六局为发现/复核样本，不是盲测；按run_id而非SL尝试计独立分母。后续证据须来自本角色独立新局，观察进阶以实际局号核对。

处置：waiting。缺同状态、同模型覆盖、同随机输入和同总预算的配对收益曲线；707ms与异盘1/12、12/12不能校准预算、留药、护栏或目标规则。

回退：本批无新源码或规则需回退。未来实现须按其真实源码commit回退，保留原提案、经验、账本和失败历史；只在实际live之后登记版本并通知Roy。

## silent-proposal-283a164780d11e69：神化经验的同源实现链接

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md。

账本：silent-0237, silent-0238。来源任务：experience-update；实现任务：strategy-proposal；本批不标shipped。

证据：VLZ6CCT8AQ0A A10 F35/F43 T1与F43 T2—5；与89354805ee4d7e77同源，经验silent-apotheosis-combat-upgrades，独立局分母不重复增加。

反例与限制：当前经验包含本批未核实的其他局/升级版本，不能用经验总支持数证明本批已验证这些交互。F45未施放的败局不证明必打规则。

旧行为与已存在子项：已观察普通升级传播与神化候选参考有实际live源码，但同源提案仍有未完成边界。

预期行为：沿原id共享普通神化证据；保留未知费用、自动动作与跨轮交互，不另建重复提案或标整包duplicate。

验证方法：共用F35/F43固定帧，逐项核对真实施放/生命周期与覆盖；其他版本只在其证据被独立核实后纳入，不借同源关系扩认证范围。

拟合与切分：本批不拟合常数/阈值。冻结六局为发现/复核样本，不是盲测；按run_id而非SL尝试计独立分母。后续证据须来自本角色独立新局，观察进阶以实际局号核对。

处置：waiting。同源普通升级子项已有live实现；实际施放生命周期、未知费用、跨轮副效应和自动动作组合仍缺完整验证，同源关系不等于整项duplicate。

回退：本批无新源码或规则需回退。未来实现须按其真实源码commit回退，保留原提案、经验、账本和失败历史；只在实际live之后登记版本并通知Roy。

## silent-proposal-ebbfe3b97548756d：十五条攻防、毒与持续资源的整包验证

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md。

账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。来源任务：experience-update；实现任务：strategy-proposal；本批不标shipped。

证据：VLZ6CCT8AQ0A A10 F43 T1—5与F45 T3—5；F43敏捷4/勒紧6与逐牌挡分源；F45覆甲逐步消失，末轮20挡对59攻，需损39/差7，各敌均未击杀。

反例与限制：持有两张毒雾没有在末战建立；普通触媒与升级触媒结算不同。赢战资源损耗和末战失败不能推定另一个focus/营火选择必胜。

旧行为与已存在子项：普通/升级毒触发、属性、专属挡、覆甲及候选参考各有既有路径；单独路径或经验active/shipped状态不能证明15条经验共同调用已完整验证。

预期行为：保持现行为；持有、建立、已结算与未来收益分列，按本帧实际属性/敌血/攻击段和当前资源计算，不预支永久减力或开场覆甲。

验证方法：对原15条经验逐项冻结消费者输入和本批实际出牌前缀；联合检查口红T3、覆甲期限、临时减力恢复、毒逐次结算与资源链，保留未知。

拟合与切分：本批不拟合常数/阈值。冻结六局为发现/复核样本，不是盲测；按run_id而非SL尝试计独立分母。后续证据须来自本角色独立新局，观察进阶以实际局号核对。

处置：waiting。已核原来源局端点和既有子项；仍缺口红、覆甲、临时减力恢复与未来毒的跨轮联合调用验证及15条经验逐项消费者证明，不能关闭整包。

回退：本批无新源码或规则需回退。未来实现须按其真实源码commit回退，保留原提案、经验、账本和失败历史；只在实际live之后登记版本并通知Roy。

## silent-proposal-e5b87be50f28f311：SL、HP护栏与重规划审计

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md。

账本：silent-0079, silent-0021, silent-0125, silent-0018。来源任务：postmortem；实现任务：strategy-proposal；本批不标shipped。

证据：8JRE1C4H4Z2W A10 F33首/三试T2指纹相同；实损/扣血为3/10与15/17，增12血价只增7敌本体扣血。第二试T5护栏候选少18伤/省12血；F17 T6抽牌后重规划；末试F33 T11死亡。

反例与限制：末试T2多防御比第四/第五次省3血少10伤，延至T11仍败；不支持一律否定防御替换。六次尝试仍是一局。

旧行为与已存在子项：候选answer/before_sl/after_sl、HP护栏、SL比较与单步派发回执已有live源码；actual_turn/whole_plan_executed仍为null，派发成功不是状态效果或整线执行认证。

预期行为：保留选择结果；未来审计须把候选、首次派发、真实状态后继和机械重规划原因逐一绑定，并按源记录能力建立、零血截断与完整需求。

验证方法：固定首/三试T2、第二试T5、F17 T6与末试T11；逐次核对生成/抽弃/药水/SL/护栏的候选中断原因与动作身份，缺帧保持未知。

拟合与切分：本批不拟合常数/阈值。冻结六局为发现/复核样本，不是盲测；按run_id而非SL尝试计独立分母。后续证据须来自本角色独立新局，观察进阶以实际局号核对。

处置：waiting。候选及单步派发子项已有；原日志仍缺逐次机械重规划原因、候选完整执行标记和能力分源后继，不能验证整套审计或校准HP/SL阈值。

回退：本批无新源码或规则需回退。未来实现须按其真实源码commit回退，保留原提案、经验、账本和失败历史；只在实际live之后登记版本并通知Roy。

## silent-proposal-49632bc4878fb597：力量、敏捷、虚弱与成长的共同调用

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md。

账本：silent-0005, silent-0231。来源任务：experience-update；实现任务：strategy-proposal；本批不标shipped。

证据：CA5KE8GFJ9X2 A10 F13 T2—5；加压后力4/8，喷水15/19，虚弱后11/14；本局正敏捷状态帧为0，计划中的步法未取得/建立。

反例与限制：虚弱不取消后续加压；缺正敏捷的来源局不能用计划或其他属性提交补成正敏捷实证。末轮2血10挡需损4。

旧行为与已存在子项：逐击力量和当前属性相关模型存在；一个步法或虚弱源码子项不足以证明完整复合经验。

预期行为：保持当前属性与成长分源；不增加统一输出/保血权重。

验证方法：冻结本局F13前缀、当前A10移动数据与负/无属性帧；新增本角色正敏捷共同调用证据后再联合核四路径，不能改用其他角色数据。

拟合与切分：本批不拟合常数/阈值。冻结六局为发现/复核样本，不是盲测；按run_id而非SL尝试计独立分母。后续证据须来自本角色独立新局，观察进阶以实际局号核对。

处置：waiting。来源局没有正敏捷样本；缺力量、敏捷、虚弱和跨轮成长四路径的完整共同调用证据，不据当轮吻合添加统一权重。

回退：本批无新源码或规则需回退。未来实现须按其真实源码commit回退，保留原提案、经验、账本和失败历史；只在实际live之后登记版本并通知Roy。

## silent-proposal-66532328a585941f：组件持有与启动兑现

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md。

账本：silent-0021, silent-0009。来源任务：experience-update；实现任务：strategy-proposal；本批不标shipped。

证据：5PM6JAQG6FNQ A10 F39末试T2：未建立毒雾、敌无毒，冒泡消耗1能量而敌人状态逐字不变；F33 T3已建毒雾3/触媒1/群蛇4。

反例与限制：F33胜局与F39败局的敌人、组件和存活窗口一起改变；零毒空放只证明当步没有作用。

旧行为与已存在子项：能力/毒读取和若干有限场景的持有/已建字段已有；不等于本条宽构筑经验的受控完整收益验证。

预期行为：继续分列持有、到手、支付、建立和后继；不按该败局给启动阈值、核心优先级或删牌规则。

验证方法：同入口HP、构筑、完整抽序与随机后继下比较不同启动前缀，记录整场资源/伤挡，未知覆盖和未实打后继不当0收益。

拟合与切分：本批不拟合常数/阈值。冻结六局为发现/复核样本，不是盲测；按run_id而非SL尝试计独立分母。后续证据须来自本角色独立新局，观察进阶以实际局号核对。

处置：waiting。缺同入口HP、构筑和完整抽序下不同启动顺序的整场对照及可复现收益函数；零毒空放不足拟合启动阈值。

回退：本批无新源码或规则需回退。未来实现须按其真实源码commit回退，保留原提案、经验、账本和失败历史；只在实际live之后登记版本并通知Roy。

## silent-proposal-43a76a31ba7bdcfa：族母吸取、负敏捷与SL范围

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md。

账本：silent-0030, silent-0027。来源任务：experience-update；实现任务：strategy-proposal；本批不标shipped。

证据：61E2QS63Y9WU A10 F17 T5—6：玩家力2→0、敏0→−2，敌力0→2；T6两防御各加3挡，已建毒17/16继续结算。

反例与限制：本局首试60血进场七轮获胜，没有同入口血量/构筑/抽序下可救活的失败替线。

旧行为与已存在子项：当前负敏捷、毒与能力读取已存在；仍不能由当轮两防御或首试胜利证明吸取整场联合路径/SL收益。

预期行为：保留SL范围与换线规则；吸取改变的力量、敏捷、敌力及毒逐项冻结，不用毒制胜观察替代完整SL反事实。

验证方法：固定T5→T6吸取、两防御、毒与临时减力恢复的共同调用；若改SL范围，另需同入口资源/完整抽序下可复现的整场替线。

拟合与切分：本批不拟合常数/阈值。冻结六局为发现/复核样本，不是盲测；按run_id而非SL尝试计独立分母。后续证据须来自本角色独立新局，观察进阶以实际局号核对。

处置：waiting。缺吸取跨轮联合模型验证及同入口HP、构筑、完整抽序下可救活的SL替线；首试胜利不足修改SL范围。

回退：本批无新源码或规则需回退。未来实现须按其真实源码commit回退，保留原提案、经验、账本和失败历史；只在实际live之后登记版本并通知Roy。

## silent-proposal-5264153a4a4b0e5c：胧光怪召唤、成长与目标序

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md。

账本：silent-0039, silent-0209。来源任务：experience-update；实现任务：strategy-proposal；本批不标shipped。

证据：61E2QS63Y9WU A10 F23 T2—5；双方力量0→3→6。T4到T5本体净扣合47、玩家损15；幻象剩2仍在场，不能把推进本体当击杀幻象。

反例与限制：focus幻象39伤/零损候选未实打；另一目标顺序的整场资源和后继未知。

旧行为与已存在子项：既有召唤测试核A0/A9HP与A0攻击、召唤/防重复路径；没有直接证明本批A10航行/复起/索引变化的全链消费。

预期行为：保留所有目标和相同推演值并列；召唤、成长、临时退场与最终终战分列，不写固定首杀规则。

验证方法：冻结本批A10移动/召唤输入，按enemy_id核新增、航行、复起、索引重排及实际前缀；另一focus用同盘完整后继对照后才评价收益。

拟合与切分：本批不拟合常数/阈值。冻结六局为发现/复核样本，不是盲测；按run_id而非SL尝试计独立分母。后续证据须来自本角色独立新局，观察进阶以实际局号核对。

处置：waiting。缺本批A10召唤、航行、复起与索引变化的完整跨轮调用验证及另一focus整场后继；旧召唤子项不足证明新成长或固定杀序收益。

回退：本批无新源码或规则需回退。未来实现须按其真实源码commit回退，保留原提案、经验、账本和失败历史；只在实际live之后登记版本并通知Roy。

## silent-proposal-bddfa690a84e03d0：熟睡甲虫唤醒与后段成长

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md。

账本：silent-0128, silent-0079。来源任务：experience-update；实现任务：strategy-proposal；本批不标shipped。

证据：DUZUBAJ3A8GP A10 F30 T1—6，四次同局尝试；首试睡3/2/1后T4自然醒，T5力2，T6力4/攻击22。

反例与限制：四试皆败；末试T4比首试多扣3敌血但多损2玩家血，不能仅按敌血定输出血价。自然醒不证明提前唤醒/眩晕接续。

旧行为与已存在子项：睡眠、暂减力恢复与成长路径已有；当轮22攻和16挡端点不能认证提前唤醒及完整整战。

预期行为：保持当前选择；按A10现场睡层、眩晕和成长分别验证，不指定固定目标序或重试必胜。

验证方法：固定自然醒路径与临时减力到期帧；补同抽序提前唤醒/眩晕后的完整后继与获胜替线，四次尝试按一个run_id分组。

拟合与切分：本批不拟合常数/阈值。冻结六局为发现/复核样本，不是盲测；按run_id而非SL尝试计独立分母。后续证据须来自本角色独立新局，观察进阶以实际局号核对。

处置：waiting。缺提前唤醒后眩晕接续的配对及同抽序完整获胜替线；自然醒、成长与当轮挡攻端点不足校准输出血价或杀序。

回退：本批无新源码或规则需回退。未来实现须按其真实源码commit回退，保留原提案、经验、账本和失败历史；只在实际live之后登记版本并通知Roy。

## 既有源码的实际live引用

核对时live HEAD：`3f7eba0ef0c8f29bc2fbf21c8fb81d7a3cac55ee`。15份定位源码/已有测试文件均核实工作文件等于live提交内容，并保存基线原字节.txt；完整路径、SHA和祖先校验见source-verification.json。这里只证明已有子项，没有声称本批运行测试或完整提案duplicate。

- `agent/src/reflex/silent-apotheosis.ts`：实际live祖先 `a11dd870b09f3f1b67fcb5d6c08af6573fd809e0`。
- `agent/src/reflex/silent-apotheosis-reference.ts`：实际live祖先 `3aa6c03a83c5cdcdea29c43e3caa130bcce9bd17`。
- `agent/src/reflex/silent-selection-audit.ts`：实际live祖先 `05cd292c6f01bb31e406473d3a9843e659d62b93`。
- `agent/src/reflex/silent-selection-dispatch.ts`：实际live祖先 `bade647f9fe4c9103b40e2f26b26296692ad24b7`。
- `agent/src/reflex/silent-hp-guard-audit.ts`：实际live祖先 `a8b1f8be153fe4f3a34146117546c2178f2e446b`。
- `agent/src/reflex/silent-sl-comparison.ts`：实际live祖先 `a8b1f8be153fe4f3a34146117546c2178f2e446b`。

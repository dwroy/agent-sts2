# 静默猎手本批10项策略请求核验

记录时间：2026-10-14T11:34:41+08:00

本批普通proposal队列；没有research_request/implementation_request，不承接其他专题或提案。开工HEAD 530d786d85f192fe5977f88e1f8d065507f8264b，干净；按任务合main后base=a32d1efb3330adbc88073e79cbfc694de2bb042c。不提交源码/知识，不合live、不造版本、implemented、duplicate或shipped。

只核六个派发SILENT A10局和本角色经验；原提案/原复盘不改写。已证数值不等于完整联动已实现；无相同资源和完整抽序的受控支线，不拟合血价、MC预算、留药、SL或构筑/启动权重。原26账本和10代码提案沿原id，不新建重复项。

所有回归/开发帧已被观察，不称盲测；局内重打相关，不能扩成独立局。未来独立本角色完局按结束时间后置，机制校准、模型覆盖和策略胜负分别验收。所有本批行为保持现状，无关角色和未观察进阶等价。

本批没有新源码可回退；保留原日志、提案、账本、抽取初稿与失败说明。后续若实现，须撤码失败/恢复通过、固定沙箱入口、实际live祖先提交与唯一发布号，再按原授权双通知；本次不冒称已完成这些步骤。

## silent-proposal-89354805ee4d7e77

原题：按静默已观测帧补齐神化在同线及后续抽牌中的升级传播，并区分持有、施放与模型覆盖；无整场转胜保证。

角色/进阶：silent / A10。证据：VLZ6CCT8AQ0A F35T1、F43T1/T5、F45T1。账本：silent-0237, silent-0238。

原来源任务：postmortem；实现任务：strategy-proposal；本批：20261014-111301-strategy-proposal。

实盘/消费者核对：s275564→275565核实2费、5→8挡、7→10伤及每击5→7；s275701→275703核实猛扑后FREE_SKILL_POWER=1、生存者免费得15挡。当前升级函数接受16种已观察模板，POUNCE/PREDATOR/REFLEX仍返回null；6个实际状态参考的actual_cast_this_fight仍为null。

反例与范围：F35与F43施放后的胜战仍损血；F45未施放并败，敌人与资源不同，不能归因胜负。

预期行为：仅对已证模板传播升级；持有、候选、模拟升级、实际施放分别展示，未知保持未知；不加必打神化规则。

验证方法：以s275564/275565、s275701/275703及后续抽牌固定输入验证真实卡模型→同线→后轮与身份接续；未记录的堆/实例不能补造。

处置：**waiting**。数值子机制已有实证；缺猛扑减费、猎杀者延迟抽牌、本能反应弃牌触发与神化传播的完整冻结生产配对，以及跨抽牌/选择/药水/SL/换战/接续的实际施放持续身份；原完整请求未实现。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md；SHA256：ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d（与登记相等）。

## silent-proposal-f2bfceddb1898dca

原题：核验三骑士全败候选的即时血价、击杀缺口与药水MC预算成熟度；先做同盘预算实验，缺对照时保留原护栏、留药与目标规则。

角色/进阶：silent / A10。证据：VLZ6CCT8AQ0A F45T1/T4/T5、F43→F44→F45。账本：silent-0106, silent-0019, silent-0201。

原来源任务：postmortem；实现任务：strategy-proposal；本批：20261014-111301-strategy-proposal。

实盘/消费者核对：d269748与d269754原题保留药水退化/成熟度；末T5 s275748开场32HP，s275755敌意图14+11+34=59、玩家终态0；三敌仍21/80/77HP。九个固定证据断言不构成预算实验。

反例与范围：F17/F33首试胜；T4少损线24伤/13损与32伤/31损是候选比较，未实打替代攻击线。

预期行为：保留成熟度、每敌击杀缺口和当轮血价事实；未得到受控对照前保持现有时间分配、药价和目标选项。

验证方法：冻结原题状态/随机输入，在相同总预算下比较候选稳定性和完整覆盖；局内样本不能作独立胜率样本。

处置：**waiting**。缺相同起点、模型覆盖、总预算和固定随机池下现有/分阶段MC配对、样本成熟度及候选稳定性曲线；没有神化覆盖补齐后的同题对照，不能据707ms或一败拟新预算、血价或持药参数。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md；SHA256：fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26（与登记相等）。

## silent-proposal-283a164780d11e69

原题：神化已观察升级进入同方案与后续抽牌，保留未知边界，不定必打规则

角色/进阶：silent / A10。证据：VLZ6CCT8AQ0A F35T1、F43T1/T5、F45T1。账本：silent-0237, silent-0238。

原来源任务：experience-update；实现任务：strategy-proposal；本批：20261014-111301-strategy-proposal。

实盘/消费者核对：原经验链独立保存且正文SHA匹配；与89354805共享机制，但其原经验请求同样要求真实施放/后续传播和消费者验收。

反例与范围：持有神化的F45仍未施放；不能把经验已发布或题面出现字段算实际采用。

预期行为：沿原经验/账本与原神化请求实现，保留独立来源链，不另建重复id。

验证方法：复用神化冻结矩阵，并分别验证经验→实际题面→候选→执行→后继链。

处置：**waiting**。缺原经验所要求的实际施放持续身份和三种未接入模板的升级交互配对；共享问题和已有子源码不能证明整项duplicate。

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md；SHA256：78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637（与登记相等）。

## silent-proposal-ebbfe3b97548756d

原题：逐源验证当前攻防、毒触发与持续资源，不从持有或单轮减力预支整场收益

角色/进阶：silent / A10。证据：VLZ6CCT8AQ0A F43T1—5、F45T3—5、F35—44资源链。账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。

原来源任务：experience-update；实现任务：strategy-proposal；本批：20261014-111301-strategy-proposal。

实盘/消费者核对：原15条子经验均保留；s275748与s275755确认临时减力后的四段总攻击59、三敌未退场。神化函数16模板接收仅为升级子域；原资源/路线与状态期限不能由它代验。

反例与范围：已建立成长仍可能死亡；单次减力不代表永久停止成长，回血不能保证boss胜利。

预期行为：按当前属性逐击/逐牌与已建立状态核事实，保持现场覆甲；资源按已到达、实际回复和后续投影分账，不拟合路线/休息硬线。

验证方法：给15子项逐路建立固定生产调用矩阵；重复升级、毒触发次数、临减到期与路线消费者分别验收，不拼接无身份的状态。

处置：**waiting**。缺15条机制逐项的完整属性组合、升级联动、状态期限及资源/路线消费者冻结验收；本批端点及已有子公式不覆盖整组。

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md；SHA256：08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2（与登记相等）。

## silent-proposal-e5b87be50f28f311

原题：静默A10同盘SL以12血换7伤重犯：补齐Jev原答、HP护栏、SL换线及重规划的候选代价与实际成长兑现审计；单局不足以改阈值，保留现行为并独立验证。

角色/进阶：silent / A10。证据：8JRE1C4H4Z2W F33首/第三试T2、第二试T5、F17T6。账本：silent-0079, silent-0021, silent-0125, silent-0018。

原来源任务：postmortem；实现任务：strategy-proposal；本批：20261014-111301-strategy-proposal。

实盘/消费者核对：d270216/d270282指纹相同；现有整轮消费者读回首试净损3/敌净扣10，第三试净损15/敌净扣17。d270282同题原/替换预测0/24与5/24死；首试d270216本身是8样本、1/8死，不能混成24样本。

反例与范围：末次防御换线延至T11仍败；反对一概否定防御替换，也不证明一律保血。

预期行为：继续分列Jev原答、护栏、SL、派发与观测；实付12血只多7当轮敌净扣，保留责任分账，不由它定统一比例。

验证方法：用原两套T2、d270264及F17T6验证完整候选身份和中断边界；同盘后续抽序缺失时保持未知。

处置：**waiting**。缺抽牌、选择、药水和重规划后的完整候选持续归属、未选原线及完整独立后继；113个片段的actual_full_candidate_result均为null，不能用整轮端点关闭整条审计或改SL血价。

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md；SHA256：5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709（与登记相等）。

## silent-proposal-49632bc4878fb597

原题：把当前属性、每击修正、弱与成长分项验证，不增加统一保血或输出权重。

角色/进阶：silent / A10。证据：CA5KE8GFJ9X2 F13T1/T3/T5。账本：silent-0005, silent-0231。

原来源任务：experience-update；实现任务：strategy-proposal；本批：20261014-111301-strategy-proposal。

实盘/消费者核对：s273237/273252/273263：蚌力量0/4/8与同招攻击11/15/19；s273257/273269弱后11/14仍成长。终态0HP不能以净扣2代替完整入伤。

反例与范围：虚弱没有取消下一次加压；计划中的步法没有取得，不能补正敏捷。

预期行为：当前属性、逐击修正和独立成长分项；其他角色/未观察进阶不扩展。

验证方法：按原帧冻结四路生产输入与当前进阶移动事实，分别校准当前伤挡和后轮；本局消费者因旧attempt缺失而没有可认证整轮，不能造零损失。

处置：**waiting**。本局无正敏捷实证，且没有逐击力量、正负敏捷、虚弱及独立成长四路可唯一分源的完整冻结生产校准/后继；不据局部端点加统一保血或输出权重。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md；SHA256：aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2（与登记相等）。

## silent-proposal-66532328a585941f

原题：持有/计划/已建立分账；如提构筑或启动权重，先做实盘兑现与受控整场验证。

角色/进阶：silent / A10。证据：5PM6JAQG6FNQ F39末试T2、F33建立能力战。账本：silent-0021, silent-0009。

原来源任务：experience-update；实现任务：strategy-proposal；本批：20261014-111301-strategy-proposal。

实盘/消费者核对：d268455、s274379→274380：BUBBLE_BUBBLE对无毒THE_LOST，能量5→4，敌35/72HP与无毒状态不变；两能力均未建立。原F33建立雾/触媒/群蛇后胜为反例范围。

反例与范围：F33启动后胜与F39未启动败的敌人和生存资源不同，不能归因完整组合。

预期行为：持有、到手、实际支付、已建立和后继兑现分别记；不把计划或库存当持续输出。

验证方法：保持局号分组，以同资源/完整抽序比较启动线路，组件资格与整场收益独立验收。

处置：**waiting**。缺同HP、牌组、药水和完整抽序下另一启动/构筑顺序的整场对照及可复现收益函数；不能拟合启动阈值或固定组件加分。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md；SHA256：56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831（与登记相等）。

## silent-proposal-43a76a31ba7bdcfa

原题：冻结吸取、负敏捷与毒的分项事实；任何SL范围或换线偏好需完整同盘验证。

角色/进阶：silent / A10。证据：61E2QS63Y9WU F17T5/T6。账本：silent-0030, silent-0027。

原来源任务：experience-update；实现任务：strategy-proposal；本批：20261014-111301-strategy-proposal。

实盘/消费者核对：s273503→273504：玩家力2→0、敏0→−2、敌力0→2；T6负敏捷防御与毒推进分别核。原局首试胜，不产生另一SL线。

反例与范围：首试60血七轮胜不支持同抽重打的固定偏好，负敏捷不能扣减技能毒。

预期行为：保留吸取与负属性、毒的分项事实，SL策略保持现状。

验证方法：固定当前进阶移动和抽序，逐轮校准力敏/毒与另一完整后继；没有未执行支线就写未知。

处置：**waiting**。缺A10吸取、负敏捷、毒与后继移动的完整冻结生产整战配对，以及同资源/完整抽序下另一完整SL线；不由首试胜利更改SL范围或阈值。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md；SHA256：f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c（与登记相等）。

## silent-proposal-5264153a4a4b0e5c

原题：复验已有召唤和各实体成长；保留所有目标选项，相同推演值并列，不强制首杀。

角色/进阶：silent / A10。证据：61E2QS63Y9WU F23T3—5。账本：silent-0039, silent-0209。

原来源任务：experience-update；实现任务：strategy-proposal；本批：20261014-111301-strategy-proposal。

实盘/消费者核对：s273589→273596记录敌力3→6；T4幻象14→2仍15攻击，主体76→51；T5才出现退场。敌名单变化不作为同一实例毛伤。

反例与范围：39伤/零损的幻象focus候选未实打，不能当整战胜线。

预期行为：保留所有目标选项，实际同值并列；主体、幻象和成长单列。

验证方法：冻结召唤/成长脚本及真实实体范围，分别核退场和另一目标序完整后继；enemy_id仅类型，复现不能凭索引拼接。

处置：**waiting**。缺A10召唤、航行增力、幻象复现/退场的完整生产调用校准及另一focus完整后继；已有召唤子源码不能登记整项duplicate或规定首杀。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md；SHA256：b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02（与登记相等）。

## silent-proposal-bddfa690a84e03d0

原题：按当前进阶、睡眠/眩晕/成长分别验证；不把未知换线胜率或固定杀序写成规则。

角色/进阶：silent / A10。证据：DUZUBAJ3A8GP F30四试T3—6。账本：silent-0128, silent-0079。

原来源任务：experience-update；实现任务：strategy-proposal；本批：20261014-111301-strategy-proposal。

实盘/消费者核对：s274919睡1→s274923醒/18攻；s274929力2/20攻，尖啸后−4/14，s274934恢复至4/22。末试s275007→275012甲虫多扣3，玩家后轮只余1而最终死。

反例与范围：末试T4多扣3敌血却多损2玩家血；未得到胜利线路，不能只优化敌剩血。

预期行为：睡层/醒来/眩晕/临减恢复/成长分别核当前进阶，SL与目标偏好保持现状。

验证方法：固定醒来与眩晕后继、原尝试抽序和同条件替代线；终局净HP、完整需损与未结毒分列。

处置：**waiting**。缺当前A10睡眠、伤害唤醒、眩晕接续、独立成长的完整冻结生产校准及同抽换序完整后继；四败不够拟合输出血价或固定杀序。

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md；SHA256：b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780（与登记相等）。

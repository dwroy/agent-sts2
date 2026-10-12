# 静默猎手十项策略提案逐项处置

批次：20261013-033546-strategy-proposal；角色：silent；六个派发局均A10。
完整基线：b2e6b586440c56ea13ed2f41779ac5fc38304a4e。开工工作树干净，普通批次git merge --no-edit main返回Already up to date。
本批reason=proposal，只有下列10个已领取proposal_ids，无proposal_repair、research_request或implementation_request。普通专题根请求绑定其他旧批次，不匹配本批；没有将普通队列改作专题，也没有修改请求、调度、租约或领取额外提案。

结论：10项完整提案均waiting。本批没有找到证据充分、尚未实现、可独立验证的新策略改动。已观察并已实现的子项注明真实live源码祖先；未观察组合、完整候选收益与反事实保持未知，不以局部源码关闭整个提案。不建立重复id，不新增经验知识。

只依据这六局的原日志、本角色原提案/账本/已有复核材料及本角色代码路径；没有读取或搬用其他角色知识。已读README、最新STATE、decision-log末尾、learning-protocol与learning-code-proposals。保留原历史及反例。

## 1. 神化升级传播及实际施放

提案：silent-proposal-89354805ee4d7e77；来源：postmortem；实现任务：strategy-proposal。
账本：silent-0237、silent-0238。
原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md；SHA256：ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d。原文另保存在silent-proposal-89354805ee4d7e77.original.md，未修改。

证据局号/层/回合：VLZ6CCT8AQ0A，F35 T1、F43 T1/T2、F45 T1。原states275564→275565、275679→275680/275687；decisions269598、269706/269707、269754/269755。

支持及旧行为核验：本次从原日志读回四次神化动作（F35/36/37/43 T1），各付2能；F43整轮端点实损13、敌HP合减51。普通升级对子、同线和已知后续抽牌传播已有源码772b839f、f516592f、a11dd870；持有/候选/模拟覆盖参考已有3aa6c03a。actual_cast_this_fight仍明确为null，不能由模拟字段认定实际施放。

反例与未知：F43施放后仍整场损57；F45持有而弃掉。不同敌人和资源不能证明神化必打或转胜；未知费用、附魔和自动施放不由这些普通对子外推。

处置：waiting。普通升级传播已有live源码；仍缺跨重规划、SL与重启的实际施放生命周期，以及未知升级、自动动作和属性组合证据，不能关闭整项。

预期后续行为及验证：逐次绑定动作、后继观测及战斗/尝试身份；普通升级不得重复累加，场外deck不变，未知对子保留unknown。新增生命周期实现需覆盖重新规划、SL恢复和重启，不用持有或候选代替实际施放。

拟合与时间切分：本轮不拟合常量、阈值或优先级。本局属于发现/固定回归材料，不能称盲测；未来独立静默局按结束时间后移验证，按run_id分组，同存档尝试不跨发现/验证集合。未知保持未知，其他角色/未观察进阶保持等价。

预期影响与回退：本轮没有新增对局行为或源码可回退；预期后续实现只处理上述实际缺口，不承诺胜率。新增代码必须撤源码失败/恢复通过、原沙箱入口测试，实际live合入后使用真实源码commit回退并按授权通知Roy，保留全部原记录。

## 2. 三骑士药水预算与当轮血价

提案：silent-proposal-f2bfceddb1898dca；来源：postmortem；实现任务：strategy-proposal。
账本：silent-0106、silent-0019、silent-0201。
原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md；SHA256：fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26。原文另保存在silent-proposal-f2bfceddb1898dca.original.md，未修改。

证据局号/层/回合：VLZ6CCT8AQ0A，F43末态、F44休息、F45 T1/T4/T5；decisions269748、269754、269770；states275728→275729。

支持及旧行为核验：原提案首题记录MC707ms、1/12及horizon1/samples1/best=null；后题12/12在改变的盘面。实喝CURE_ALL的HP67不变、能量1→2、手牌1→3。F45 T4本次端点核实13损/24伤，31损/32伤候选没有实打。simulation_reference已有45161a51，明确把not_compared和tied、当轮时钟与后续抽样分列。

反例与未知：药水中文名不能推成回血；同局其他胜战与本战的模型成熟度不同，1/12和12/12不能充作同盘配对收益。全败样本不证明实盘必死。

处置：waiting。缺同状态、同模型覆盖、同随机输入和同总预算的配对收益曲线；异盘1/12与12/12、707ms不能校准预算、留药、HP护栏或目标规则。

预期后续行为及验证：固定相同状态、随机输入、覆盖及总预算，比较分阶段MC与现分配的收益/稳定性。补齐模型后再比较，不设707ms派生常量；保留药水选项和原规则。

拟合与时间切分：本轮不拟合常量、阈值或优先级。本局属于发现/固定回归材料，不能称盲测；未来独立静默局按结束时间后移验证，按run_id分组，同存档尝试不跨发现/验证集合。未知保持未知，其他角色/未观察进阶保持等价。

预期影响与回退：本轮没有新增对局行为或源码可回退；预期后续实现只处理上述实际缺口，不承诺胜率。新增代码必须撤源码失败/恢复通过、原沙箱入口测试，实际live合入后使用真实源码commit回退并按授权通知Roy，保留全部原记录。

## 3. 神化经验同源提案补链

提案：silent-proposal-283a164780d11e69；来源：experience-update；实现任务：strategy-proposal。
账本：silent-0237、silent-0238。
原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md；SHA256：78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637。原文另保存在silent-proposal-283a164780d11e69.original.md，未修改。

证据局号/层/回合：VLZ6CCT8AQ0A，F35/F43/F45；经验silent-apotheosis-combat-upgrades，与89354805ee4d7e77共享silent-0237/0238及同一局。

支持及旧行为核验：原Markdown SHA78e23dae已核，经验source_task链接真实；普通升级子项同上一项。四次施放来自一局，不作为四个独立验证局。

反例与未知：同源经验已保存或已有子项源码，不等于实际生命周期、未知费用和跨轮交互全覆盖。

处置：waiting。同源普通升级子项已在live；实际施放生命周期、未知费用、跨轮副效应和自动动作组合仍缺完整验证，同源链接不能将整项登记duplicate。

预期后续行为及验证：沿原神化id和证据实现剩余子项，复用固定夹具，不另建重复提案；同源两个id各自保留明确处置。

拟合与时间切分：本轮不拟合常量、阈值或优先级。本局属于发现/固定回归材料，不能称盲测；未来独立静默局按结束时间后移验证，按run_id分组，同存档尝试不跨发现/验证集合。未知保持未知，其他角色/未观察进阶保持等价。

预期影响与回退：本轮没有新增对局行为或源码可回退；预期后续实现只处理上述实际缺口，不承诺胜率。新增代码必须撤源码失败/恢复通过、原沙箱入口测试，实际live合入后使用真实源码commit回退并按授权通知Roy，保留全部原记录。

## 4. 十五条机制与资源分源验证

提案：silent-proposal-ebbfe3b97548756d；来源：experience-update；实现任务：strategy-proposal。
账本：silent-0005、silent-0016、silent-0049、silent-0071、silent-0143、silent-0046、silent-0053、silent-0027、silent-0011、silent-0021、silent-0106、silent-0204、silent-0020、silent-0019。
原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md；SHA256：08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2。原文另保存在silent-proposal-ebbfe3b97548756d.original.md，未修改。

证据局号/层/回合：VLZ6CCT8AQ0A，F43 T1—T5、F45 T1/T3/T4/T5及F44休息；原提案15条经验、14个账本id均保持。

支持及旧行为核验：本次核F45 T5末前32HP/20挡，已减力显示攻击59，攻击减挡39而玩家HP端点最多损32；敌人仍存活。F43升级和F45普通卡、当前覆甲、属性、触媒及已建立毒须分源。现有逐击模型、模拟成熟度与观测端点消费者是子项，没有把各自支持局数合成联合实验。

反例与未知：持有两雾不等于本战建立；临时减力不保证后轮相同威胁，开场覆甲不能延用至后段。F43胜损57而休息后F45仍败，不能拟合硬安全线。

处置：waiting。已核本局分源端点和既有机制路径；仍缺口红、覆甲、临时减力恢复与未来毒的联合跨轮调用验证及15条经验逐项消费者证明，不能关闭整包。

预期后续行为及验证：固定实见升级、逐击力量、逐牌敏捷、勒紧专属挡、毒触发及当前覆甲；分离当前收益、恢复期限与后续投影。逐项证明生产调用与固定实盘数值，不能用单个机制提交替整包。

拟合与时间切分：本轮不拟合常量、阈值或优先级。本局属于发现/固定回归材料，不能称盲测；未来独立静默局按结束时间后移验证，按run_id分组，同存档尝试不跨发现/验证集合。未知保持未知，其他角色/未观察进阶保持等价。

预期影响与回退：本轮没有新增对局行为或源码可回退；预期后续实现只处理上述实际缺口，不承诺胜率。新增代码必须撤源码失败/恢复通过、原沙箱入口测试，实际live合入后使用真实源码commit回退并按授权通知Roy，保留全部原记录。

## 5. 沙虫原答、护栏、SL与重规划审计

提案：silent-proposal-e5b87be50f28f311；来源：postmortem；实现任务：strategy-proposal。
账本：silent-0079、silent-0021、silent-0125、silent-0018。
原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md；SHA256：5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709。原文另保存在silent-proposal-e5b87be50f28f311.original.md，未修改。

证据局号/层/回合：8JRE1C4H4Z2W，F33首/第三次T2（decisions270216/270282）、第二次T5（270264）、末试T11；F17 T6抽牌重规划反例。

支持及旧行为核验：本次两T2指纹全等；原线与SL替线分别实损3/15、扣10/17，确证多12血换7当轮伤。末试T11是5HP/22挡对37攻击，端点损5，显示攻击减挡15。现有selection_audit、hp_guard、selection_dispatch以及离线相邻/终局消费者已上线。

反例与未知：首/三试均T7判死；末试保血延至T11仍败，不证明所有防御换线错误。抽牌后新题会截断旧候选，不能把预测省血当实付省血；也不能把0/24和5/24说成同死率。

处置：waiting。候选差与单动作回执已有live子项；仍缺逐次机械重规划原因、跨抽弃牌完整执行归属和能力分源后继，不能认证整套审计或校准HP/SL阈值。

预期后续行为及验证：固定首/三试T2、第二试T5、F17 T6与末试T11，保留原答/护栏/SL/派发差值及候选截断。后续需真正完整动作链与独立验证局，不能由完成单动作或整轮净HP推定候选完整执行。

拟合与时间切分：本轮不拟合常量、阈值或优先级。本局属于发现/固定回归材料，不能称盲测；未来独立静默局按结束时间后移验证，按run_id分组，同存档尝试不跨发现/验证集合。未知保持未知，其他角色/未观察进阶保持等价。

预期影响与回退：本轮没有新增对局行为或源码可回退；预期后续实现只处理上述实际缺口，不承诺胜率。新增代码必须撤源码失败/恢复通过、原沙箱入口测试，实际live合入后使用真实源码commit回退并按授权通知Roy，保留全部原记录。

## 6. 属性、虚弱与成长联合验证

提案：silent-proposal-49632bc4878fb597；来源：experience-update；实现任务：strategy-proposal。
账本：silent-0005、silent-0231。
原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md；SHA256：aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2。原文另保存在silent-proposal-49632bc4878fb597.original.md，未修改。

证据局号/层/回合：CA5KE8GFJ9X2，F13 T1—T5，核心T5；silent-0005/0231。

支持及旧行为核验：原提案力量0→4→8与喷水11→15→19、弱后11/14保持。本次F13正敏捷观测帧0，DEXTERITY仅0；末轮2HP/10挡对14攻、终态0。monster-db当前进阶HP/伤害从首样本读取；room-costs门槛仍5，二者未混用。

反例与未知：虚弱没有关闭下一次加压；计划步法没有取得，不能补正敏捷样本。显示需损4而端点只损2，不能把零血截断损失当完整伤害。

处置：waiting。来源局正敏捷样本为0；缺力量、敏捷、虚弱与跨轮成长四路径的完整共同调用证据，不能据当轮吻合校准统一权重。

预期后续行为及验证：将四路径各自实见来源、期限、移动表和当前进阶冻结成共同调用夹具；不得因本局没有正敏捷而伪造联合实测，不增加统一保血/输出权重。

拟合与时间切分：本轮不拟合常量、阈值或优先级。本局属于发现/固定回归材料，不能称盲测；未来独立静默局按结束时间后移验证，按run_id分组，同存档尝试不跨发现/验证集合。未知保持未知，其他角色/未观察进阶保持等价。

预期影响与回退：本轮没有新增对局行为或源码可回退；预期后续实现只处理上述实际缺口，不承诺胜率。新增代码必须撤源码失败/恢复通过、原沙箱入口测试，实际live合入后使用真实源码commit回退并按授权通知Roy，保留全部原记录。

## 7. 启动与持有组件分账

提案：silent-proposal-66532328a585941f；来源：experience-update；实现任务：strategy-proposal。
账本：silent-0021、silent-0009。
原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md；SHA256：56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831。原文另保存在silent-proposal-66532328a585941f.original.md，未修改。

证据局号/层/回合：5PM6JAQG6FNQ，F39末试T2（decision268455、states274379→274380）；同局F33胜场为反例。

支持及旧行为核验：本次核无毒目标上的BUBBLE_BUBBLE实付1能、敌端点不变；本战未建立毒雾。持有/计划/已建立必须分开。

反例与未知：F33雾3/触媒1/群蛇4已建立并赢，但敌人、资源、生存条件也变化，不是同盘启动顺序对照。空放局部代价不证明一种组件顺序必胜。

处置：waiting。缺同入口HP、构筑与完整抽序下不同启动顺序的整场对照和可复现收益函数；无毒目标空放只确认局部代价，不足拟合启动阈值。

预期后续行为及验证：冻结同入口、完整抽序及不同启动顺序的整场后继；当前有毒/无毒条件按现场事实计算，不能新增持有组件固定优先级。

拟合与时间切分：本轮不拟合常量、阈值或优先级。本局属于发现/固定回归材料，不能称盲测；未来独立静默局按结束时间后移验证，按run_id分组，同存档尝试不跨发现/验证集合。未知保持未知，其他角色/未观察进阶保持等价。

预期影响与回退：本轮没有新增对局行为或源码可回退；预期后续实现只处理上述实际缺口，不承诺胜率。新增代码必须撤源码失败/恢复通过、原沙箱入口测试，实际live合入后使用真实源码commit回退并按授权通知Roy，保留全部原记录。

## 8. 吸取、负敏捷、毒与SL

提案：silent-proposal-43a76a31ba7bdcfa；来源：experience-update；实现任务：strategy-proposal。
账本：silent-0030、silent-0027。
原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md；SHA256：f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c。原文另保存在silent-proposal-43a76a31ba7bdcfa.original.md，未修改。

证据局号/层/回合：61E2QS63Y9WU，F17 T5/T6；states273502→273504→273508、decisions267612/267614。

支持及旧行为核验：T6已观察敏捷−2、敌力量2；两防御各实增3挡，毒17+16使敌67→34。本战首试60HP七轮获胜，当前负属性和毒端点不从另一角色补入。

反例与未知：首试获胜不证明某失败存档可由SL救活；没有另一同入口、同构筑、同抽序的完整胜线，不能扩大SL范围或写换线偏好。

处置：waiting。缺吸取跨轮联合模型验证及同入口HP、构筑、完整抽序下可救活的SL替线；本局首试胜利不足修改SL范围或换线偏好。

预期后续行为及验证：冻结吸取前后属性和毒触发，核完整跨轮实际调用；SL策略要另有同盘完整替线及后移独立验证。保留既有名单和阈值。

拟合与时间切分：本轮不拟合常量、阈值或优先级。本局属于发现/固定回归材料，不能称盲测；未来独立静默局按结束时间后移验证，按run_id分组，同存档尝试不跨发现/验证集合。未知保持未知，其他角色/未观察进阶保持等价。

预期影响与回退：本轮没有新增对局行为或源码可回退；预期后续实现只处理上述实际缺口，不承诺胜率。新增代码必须撤源码失败/恢复通过、原沙箱入口测试，实际live合入后使用真实源码commit回退并按授权通知Roy，保留全部原记录。

## 9. 召唤、航行与退场进度

提案：silent-proposal-5264153a4a4b0e5c；来源：experience-update；实现任务：strategy-proposal。
账本：silent-0039、silent-0209。
原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md；SHA256：b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02。原文另保存在silent-proposal-5264153a4a4b0e5c.original.md，未修改。

证据局号/层/回合：61E2QS63Y9WU，F23 T3/T4/T5；T4 states273593→273596，decisions267696—267698。

支持及旧行为核验：本次T4核玩家25→10，本体76→41、幻象14→2，共扣47但幻象仍活且攻击；该轮后力量3→6。既有Obscura召唤子项与当前成长字段不提供另一focus全程结果。

反例与未知：focus幻象的39伤/零损候选没有完整实打后继；敌类型、当前index不等于稳定跨帧实体ID，不能把净扣当已退场或指定固定首杀。

处置：waiting。缺A10召唤、航行、复起与索引变化的完整跨轮调用验证及另一focus全程后继；旧召唤子项不足证明成长组合或固定首杀收益。

预期后续行为及验证：用本角色当前进阶实见移动表冻结召唤/成长/复起链；全部目标保留，相同推演值并列。另focus需完整后继才能验证收益，不由局部省血推整战获胜。

拟合与时间切分：本轮不拟合常量、阈值或优先级。本局属于发现/固定回归材料，不能称盲测；未来独立静默局按结束时间后移验证，按run_id分组，同存档尝试不跨发现/验证集合。未知保持未知，其他角色/未观察进阶保持等价。

预期影响与回退：本轮没有新增对局行为或源码可回退；预期后续实现只处理上述实际缺口，不承诺胜率。新增代码必须撤源码失败/恢复通过、原沙箱入口测试，实际live合入后使用真实源码commit回退并按授权通知Roy，保留全部原记录。

## 10. 熟睡甲虫醒来及成长血价

提案：silent-proposal-bddfa690a84e03d0；来源：experience-update；实现任务：strategy-proposal。
账本：silent-0128、silent-0079。
原Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md；SHA256：b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780。原文另保存在silent-proposal-bddfa690a84e03d0.original.md，未修改。

证据局号/层/回合：DUZUBAJ3A8GP，F30 T1—T6，四次尝试；末试T6 decisions269073—269077、states275018→275023。

支持及旧行为核验：自然睡3/2/1后T4醒，后续力量2→4、22攻击。末试T6末前1HP/16挡，终态0。T4首/末试甲虫净扣12/15、玩家实损2/4，多3扣血同时多2血价。

反例与未知：四次均败仍只一局；自然醒没有提供提前唤醒后的眩晕接续对照。更低敌HP不证明完整胜线或最优血价。

处置：waiting。缺提前唤醒后眩晕接续的配对证据和同抽序完整获胜替线；自然醒及当前攻防端点不足校准输出血价或固定杀序。

预期后续行为及验证：按当前进阶分别核睡眠消失、眩晕接续、临时减力恢复及独立成长；完整同抽序替线后再比较排序，不以四次失败拟合固定权重。

拟合与时间切分：本轮不拟合常量、阈值或优先级。本局属于发现/固定回归材料，不能称盲测；未来独立静默局按结束时间后移验证，按run_id分组，同存档尝试不跨发现/验证集合。未知保持未知，其他角色/未观察进阶保持等价。

预期影响与回退：本轮没有新增对局行为或源码可回退；预期后续实现只处理上述实际缺口，不承诺胜率。新增代码必须撤源码失败/恢复通过、原沙箱入口测试，实际live合入后使用真实源码commit回退并按授权通知Roy，保留全部原记录。

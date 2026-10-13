# 静默猎手：本批十项原提案的证据核验与处置

记录时间：2026-10-14 03:24:25 CST（写入前已执行 date）。
任务：strategy-proposal；角色：silent；batch：20261014-031301-strategy-proposal。
基线：26179538ad5b7caacd2f27ab307fb06e3aff7345。
本批仅消费 learn.json 指定的十个原 id。没有 research_request、implementation_request 或 proposal_repair，不承接任何其他专题。普通专题条件不匹配：reason=proposal，且存在 proposal_ids；根 deck-size 请求仍绑定另一批，不读其研究正文。开工 git status 为空；git merge --no-edit main 返回 Already up to date。

十份原 Markdown 均存在，原字节 SHA256 全部匹配专用队列。已在本目录保存各 id 的 .original.md，不修改原文或新建重复 id。提案和证据定位详 dispatched-proposals.json、frozen-states.jsonl、frozen-decisions.jsonl、run-and-sl-evidence.json。原账本的官方折叠快照为 ledger-official-before.json；ledger-before.json 是开工时的简化字段快照，不作为完整折叠账本使用。

## 证据范围及共同限制

只核本批六局，runs.jsonl 全部为 SILENT、A10、败局。原始决策 3306 条、状态 3432 帧。冻结记录附原物理行号及包含换行的原行 SHA256，正文解析后保存；冻结 JSONL 自身的 SHA 与原日志行 SHA 是不同口径。当前知识只读 knowledge/characters/silent/experience.json 的原提案关联条目；没有将这些条目较宽的适用范围当作本批跨进阶验证。

| 局号 | 原决策 | 状态 | 关联候选片段 | 可观察整轮端点 |
|---|---:|---:|---:|---:|
| CA5KE8GFJ9X2 | 265 | 282 | 41 | 0 |
| 61E2QS63Y9WU | 443 | 462 | 63 | 14 |
| 5PM6JAQG6FNQ | 638 | 660 | 83 | 25 |
| DUZUBAJ3A8GP | 602 | 623 | 77 | 28 |
| VLZ6CCT8AQ0A | 699 | 729 | 99 | 10 |
| 8JRE1C4H4Z2W | 659 | 676 | 113 | 44 |

原选择审计 CLI 库第一次处理完整输入退出 1：CA5 的路线变更行267143没有 decision_id。逐局检查还发现61E2行267517、DUZU行268789/268818/268864同样缺 id；三局完整输入均不满足入口约束，另三局完整输入满足。没有重复 id 或观测时间倒退。原失败 audit-evidence.log、五条原记录和 audit-input-validity.json 全部保留。仅从有界动作审计输入排除这五条 map/route-change 非动作记录，保留原行号间隙，不编造身份、不改时间或排序；其余3301条决策全部唯一匹配原观测时间和指纹，有界运行 exit0，生成六份 audit-<局号>.json。

共关联476个候选片段、121个整轮观测端点；413个轮窗口因首轮、尝试号空、结束或中间边界不可核仍为 unknown。现有库把 actual_full_candidate_result、actual_uncapped_hp_loss 和因果归属保留 null。这不是“实打完整候选零次”的频率结论，也不是121次候选已认证执行：它只说明该审计输出不能提供完整候选认证。普通走廊的 sl_attempt=null 导致工具无法认证整轮，不抹去原始前后帧本身可观察的数值。

verify-evidence.py 的35项原帧/数字/分母检查通过，proof.json 保存逐项数值与来源 SHA。这是证据核验，未运行新生产源码测试。没有未选线的完整实打结果；SL尝试仍按原局计，不扩大独立样本数。所有帧均属于发现/复核样本，不能称独立盲测。运行版本的 +dirty 源码未冻结，不能用今天的 live 重建当时精确执行树。

## 1. silent-proposal-89354805ee4d7e77：神化升级传播及实际施放

账本 silent-0237、silent-0238；来源 postmortem，原 Markdown SHA ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d。证据 VLZ6CCT8AQ0A F35/F43/F45 T1。

F43 decisions269706/269707、states275679/275680/275687核实：神化派发身份为APOTHEOSIS，能量7→5；五张已观察可升级手牌变升级；同后续牌序原预测43伤/14损、重问51伤/13损，轮端点254→203敌血、90→77玩家血。T2毒雾已升级。F45仍持有神化，药水后生存者阶段手牌2→0，不能由持有预支本战已升级。

当前 silent-apotheosis.ts 已有本局观察配对，card-model/turn-solver/rollout 有同线及后续传播，silent-apotheosis-reference.ts 仍明确 actual_cast_this_fight=null。局部源文件与实际live祖先字节对应见 source-readback.json。原提案同时要求实际施放、持续身份及未知覆盖分账，不能以存在升级函数关闭整项。

反例：F43施放仍损57，F45未施放败，敌人、资源和牌序不同，无整场因果对照。预期增量应只记录可核施放、覆盖和生命周期，不规定必打。验证需固定成功派发及后帧、抽牌、选择、药水、SL恢复、换战、进程接续的输入，确保不把持有、弃置或旧尝试当施放；缺这些持续身份链，本批 waiting。无新代码或回退对象。

## 2. silent-proposal-f2bfceddb1898dca：药水与非药候选的预算比较

账本 silent-0106、silent-0019、silent-0201；来源 postmortem，原 SHA fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26。证据 VLZ F43/F44资源接续及F45 T1/T4/T5。

decisions269748的药水MC耗707ms；后续horizon=1、samples=1、best=null，不能当全败并列。269754记录12个当轮药水样本，实际派发CURE_ALL，不能将中位样本当真实抽牌。269770的所选线24伤/13损；原攻击候选32伤/31损未实打。states275754/275755核实末轮32血20挡，三敌攻击14/11/34合59，完整未挡39、差7，终态各21/80/77血，无减员。

当前 simulation_reference 已分列预算、抽样范围和并列；药水参考保留持有价值未知。旧诊断展示子项不证明预算方案已校准。反例：F17/F33原实战获胜，不能一律弃用推演；较少损线与高伤线也没有长期受控比较。预期比较同起点、同模型覆盖、同总预算、同固定随机输入池下的MC先行和分阶段预算；验证候选稳定性、样本随预算曲线及未知覆盖。缺冻结整场输入和这一配对实验，waiting；不设新预算、药价、护栏或focus常量。

## 3. silent-proposal-283a164780d11e69：神化经验来源的独立链接

账本 silent-0237、silent-0238；来源 experience-update，经验 silent-apotheosis-combat-upgrades；原 SHA 78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637。

支持、反例、预期行为及验证与第1项相同，证据仍为VLZ F35/F43/F45，不重复扩大分母。这是已登记的独立经验来源 id，同源不是完整实现证明。保留经验链及原id，不新增重复提案；实际施放与SL/换战/接续消费者缺口未闭合，waiting。

## 4. silent-proposal-ebbfe3b97548756d：十五条机制及资源分项

账本 silent-0005/0016/0049/0071/0143/0046/0053/0027/0011/0021/0106/0204/0020/0019；来源 experience-update，十五个经验 id 和原 SHA 08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2 保存于派发快照。

VLZ F43 T1/T2/T4/T5和F45 T3/T5支持来源分账。已核F43勒紧升级与T2后续牌升级、F45临时减力后59攻击及三敌残血。当前属性、能力、毒、现场覆甲及候选诊断各有既有实现；本批未发现可以由这些帧隔离出的新增数值差额。原任务要求十五项逐一验证生产调用、期限及路线/休息消费者，不能把其中神化或减力一项当全覆盖。

反例与限制：F43获胜仍付57血，F44休息后F45败；回血有效不保证下一战胜利，也无改线/锻造对照。预期按每子项冻结手牌、力量/敏捷/减益、毒逐结算、覆甲、药水及休息输入，分别比对实际生产消费者和状态期限。缺这份完整逐子项验收矩阵和路线/休息输入，本项waiting，保留现规则，不关闭任何父经验要求。

## 5. silent-proposal-e5b87be50f28f311：SL换线血价与实际执行审计

账本 silent-0079、silent-0021、silent-0125、silent-0018；来源 postmortem，原 SHA 5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709。证据8JRE1C4H4Z2W F33各尝试T2/T5/T11及原提案F17 T6。

decisions270216/270282指纹逐字相同。states276208→276212的首试T2损3/扣10，276274→276278的第三次T2损15/扣17，额外12血换7本轮伤。第三次同一问题原答/SL替换的预测死亡0/24与5/24，未来损血都封顶47，不是同死率。末试T2的276386→276390损0/扣0，是保血存在不同取舍的反例。第二试T5端点276255→276259损4/扣25，保留一次重问，不把原答冒泡线16损/43伤归给实际执行。

现有源码已保存候选原答/SL前后、HP护栏预测和单动作回执。此次复用的离线库关联本局113候选片段、44整轮端点，但不认证整条候选。预期下一增量为在线持续候选身份、准确中断原因、派发后状态与能力建立时点；回执 completed/stable 不能直接置完整执行为true。缺该在线全生命周期消费者与固定全链输入，waiting。六尝试一局，未得原线整场胜利对照，不改探索偏好或护栏阈值。

## 6. silent-proposal-49632bc4878fb597：力量、敏捷、虚弱与独立成长

账本 silent-0005、silent-0231；来源 experience-update补链，经验 silent-strength-weak-observation；原 SHA aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2。证据CA5KE8GFJ9X2 F13 T1/T3/T5。

states273263/273268/273269核末轮力量8，19攻击经虚弱为14，双防御合10，玩家2血而完整需损4，死亡后敌仍16。当前现场读数支持按属性分项；本局未建立步法或正敏捷，不能拿这场反填敏捷收益。预期四路径各自固定输入并比较生产模型，保持成长与暂时虚弱分开。缺同一证据边界内四路径完整冻结生产调用验收，waiting；不把已有步法子修复登记为整个复合经验duplicate，不改统一输出或保血权重。

## 7. silent-proposal-66532328a585941f：持有、计划与已建立的输出

账本 silent-0021、silent-0009；来源 experience-update补链，经验 silent-deck-burst-observation；原 SHA 56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831。证据5PM6JAQG6FNQ F39第二次T2。

decision268455派发BUBBLE_BUBBLE到THE_LOST；states274379/274380能量5→4，而目标35血/0挡/0毒均不变。只证实本次无毒空打和1能量代价。同局F33已建立成长并胜，资源、敌人和构筑条件也不同，不能据此证明早启毒必胜。预期持续记录持有/计划/建立及已结算输出；若改启动权重，固定HP、构筑、药水、完整抽序后比较启动顺序与整场收益。缺这一受控后继和收益函数，waiting，不拟合启动阈值。

## 8. silent-proposal-43a76a31ba7bdcfa：族母吸取、毒与SL边界

账本 silent-0030、silent-0027；来源 experience-update补链，经验 silent-lagavulin-siphon-poison-sl；原 SHA f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c。证据61E2QS63Y9WU F17 T5/T6。

states273504→273508，玩家当前敏捷−2，两防御牌在此属性下提供的格挡与既有覆甲分账；敌本体67→34，17+16毒结算净扣33。本战SL回执首试七轮获胜、末48血，不是重打救回。预期完整冻结吸取移动、玩家负属性、毒触发与进阶数据的消费者；改SL范围须相同起始资源与完整抽序的可比较后继。缺完整进阶移动调用验收及另一完整SL线路，waiting，不因本场获胜拟合SL阈值。

## 9. silent-proposal-5264153a4a4b0e5c：召唤、成长与目标退场

账本 silent-0039、silent-0209；来源 experience-update补链，经验 silent-obscura-summon-growth；原 SHA b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02。证据61E2QS63Y9WU F23 T1/T4/T5。

states273593→273596支持T4合扣47、玩家25→10，幻象14→2仍存活；两实体力量3→6。原focus幻象的39伤/零损候选未实打，不能写成后续获胜或保39血。原本局没有再次复生的独立观测。预期冻结召唤/航行/复生联动生产输入，保留所有focus并列交模型选择，按实际新名单再算。缺A10全联动调用验收及另一focus的完整后继，waiting，不规定先杀谁。

## 10. silent-proposal-bddfa690a84e03d0：熟睡、醒来与当前进阶成长

账本 silent-0128、silent-0079；来源 experience-update补链，经验 silent-slumbering-beetle-wake-growth；原 SHA b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780。证据DUZUBAJ3A8GP F30各尝试T4/T6。

首/末试T4完整观测端点分别损2/扣23和损4/扣26；末试有重问，不把SL替换候选单独认定为全轮唯一原因。states275022/275023核末轮1血16挡对力量4的22攻击，完整需损6、差5，毒/反伤后甲虫仍32血。四次同局相关尝试均未赢；前3次判死读档、末次实死，不能全部写成已执行致死结算。预期固定当前A10移动/成长、熟睡解除与眩晕接续全链，保留未知换线胜率。缺这一全链消费者核验和同抽换序的完整可比较后继，waiting，不拟合血价或固定杀序。

## 源码、上线和后续验证边界

source-readback.json 保存8个相关文件的最后源码提交、SHA、live祖先关系与同字节读回；核验时live为bc8ac5b44a6acae03dec148f552790009df3a4c2。这些是已有子项的来源，不是本批实现提交，也不够给上述宽提案标duplicate。本批未编辑生产源码、任务模板、知识或版本；无源码提交、撤码失败/恢复通过、tsc/vitest或live合入。tests固定null，fixes=[]，merged=null。全部十id均有具体waiting原因。

新实现仍须用固定证据验证生产消费者，撤掉对应源码时失败、恢复后通过，再按原沙箱及live流程验收；这条是未来验证方法，本批不填成功回执。未实施新规则，因此不发送旧/新规则上线通知、不制造release_id、不登记shipped。已支持的瞬时观察与旧账本保持，不追加重复复盘；本批通过原ledger CLI只追加提案/报告追溯链接和处置说明，保留旧claim/status/version。原队列状态由调用方依据最终proposal_results接续，父要求保持开放。

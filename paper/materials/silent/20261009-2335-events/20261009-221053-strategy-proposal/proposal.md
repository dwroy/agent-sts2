# 静默猎手 A10 策略提案逐项复验及神化触媒有限实现

来源任务和实现任务：strategy-proposal / 20261009-221053；任务scratch：20261009-221059-strategy-proposal。全部六局均由runs.jsonl核实为SILENT A10。授权：Roy-2026-10-07-learning；本任务独立完成，不派下级agent。

## 本次实现的有限子提案

新账本：silent-0351（proposed，by=learner:strategy-proposal）；关联既有账本silent-0237、silent-0238、silent-0027。父提案89354805、283a1647仍按宽请求保存waiting。

证据只有VLZ6CCT8AQ0A：F43T1 states275679/275680施放神化；F43T4 states275698手中触媒+的Accelerant动态值2、cost1；275699实际建立ACCELERANT_POWER2、能量2→1；275699→275700敌177→144，12毒按12+11+10净扣33。F43T5 states275705→275706，16毒按16+15+14使121→76，净扣45。F45T5 states275750普通触媒Accelerant1、cost1；该战未施放神化，提供同局普通端配对。F43战外deck的触媒仍普通，不把战内升级写成永久升级。

旧规则：静默A10神化只有八组固定配对；普通触媒经过模拟升级仍未升级/known=false，效果仍为额外1次，因此同序已知12毒只算23，不能表示实见升级后的33。

新行为：只对静默A10、费用1、动态值/基础值/附魔值均为1的普通触媒，在已建神化路径上转换为额外2次。通过现有UpgradeDelta的poisonExtraTriggers差值进入当前手牌、已知后续抽牌和后续轮牌堆；已升级牌不再叠加。现场直接打普通触媒仍1，未施放神化不预支升级。未知值、改费、重放、附魔、其他角色/进阶沿原边界；不删合法选项、不设必打牌/固定杀序，不改药水、SL、终局权重或预算。

拟合方法：不拟合常数，仅读同局已观察普通/升级端与毒逐次减层。开发/验证都是这局发现样本内的确定性核验，不能称盲测。F43施放并赢而F45未施放并败，敌人与资源不同，不能证明神化导致整战胜负。无独立同盘整场反事实；其余卡升级真值、属性/重放复合仍未知，父提案继续等待。

验证：固定JSON保存配对与两次真实毒扣。同线、已知抽牌和跨轮用例是从已观察原帧组合出的固定输入，实盘神化在T1、触媒在T4，不冒称实盘同回合同打或整场反事实；33/45来自原T4/T5结算。确定性回放验证同线33/45、已知抽牌、后续牌堆和跨轮持续；隔离刷新知识；普通触媒/无毒、改费/改值/附魔/重放及其他角色/进阶控制。撤掉两份生产源码：7例中5失败2通过；恢复：新7例与既有神化6例、勒紧6例、毒8例，共4文件27例通过。失败和恢复日志均保留。完整沙箱结果另见report.md；不调LLM/网络。

预期影响：改善神化候选对已观察触媒升级的数值供给，不承诺胜率。铁甲及未观察进阶保持等价，新增差值只从silent/A10的配对分支产生。回退：回退本次独立源码提交，恢复八配对及未知标记；保留原日志、提案、账本和测试失败历史。若实际上线，按授权双通知Roy并交运维核实shipped；学习者不标shipped。

## 本批10项处置

只消费batch.json列出的10个id；无proposal_repair。全部原Markdown已保存，并核账本角色和证据；3329条原始保存记录逐offset/逐行与只读日志核对相同。两个已实现子项源码772b839f8ada31664cb764ea9ad3bdb03da27f64和45161a51c2c6b7e4a499b13cf749c4108193bbf5均核实际live祖先，不据此关闭更宽父提案。

### silent-proposal-89354805ee4d7e77

证据：VLZ6CCT8AQ0A / F35T1、F43T1—T5、F45T1—T5。账本：silent-0237, silent-0238。来源：postmortem → strategy-proposal。

处置：waiting。八组配对源码772b839f已核实际live祖先，本批补触媒第九组。原提案仍缺其余卡牌升级真值、重放/属性组合和持有/施放/覆盖的完整题面审计，保留waiting，不把有限实现登记为整个提案完成。

原提案、反例、验证及回退：本目录silent-proposal-89354805ee4d7e77.original.md（保存原件，未改历史复盘）。

### silent-proposal-f2bfceddb1898dca

证据：VLZ6CCT8AQ0A / F45T1、T4—T5。账本：silent-0106, silent-0019, silent-0201。来源：postmortem → strategy-proposal。

处置：waiting。成熟度子项45161a51已核实际live祖先。仍缺同盘、同总预算、固定种子的MC先行/分阶段曲线和候选稳定性对照，缺另一focus与留药的整场实打；707ms不支持新预算常量。

原提案、反例、验证及回退：本目录silent-proposal-f2bfceddb1898dca.original.md（保存原件，未改历史复盘）。

### silent-proposal-283a164780d11e69

证据：VLZ6CCT8AQ0A / F35T1、F43T1—T5、F45T1—T5。账本：silent-0237, silent-0238。来源：experience-update → strategy-proposal。

处置：waiting。与89354805为同一神化请求，经验链接已有；本批补触媒传播但整项仍缺其他升级真值与完整持有/施放题面审计，不用局部实现关闭原经验的宽请求。

原提案、反例、验证及回退：本目录silent-proposal-283a164780d11e69.original.md（保存原件，未改历史复盘）。

### silent-proposal-ebbfe3b97548756d

证据：VLZ6CCT8AQ0A / F43T1—T5、F45T3—T5、F44休息。账本：silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。来源：experience-update → strategy-proposal。

处置：waiting。毒、勒紧、临时减力等已有子模型，本批进一步固定核验触媒。仍缺全部持续能力/临时属性期限、实体贡献和资源链在统一冻结调用中的复验，缺未选focus/营火/启动的整场对照；不统一拟合血价。

原提案、反例、验证及回退：本目录silent-proposal-ebbfe3b97548756d.original.md（保存原件，未改历史复盘）。

### silent-proposal-e5b87be50f28f311

证据：8JRE1C4H4Z2W / F33首/三试T2、第二试T5、末试T11；F17T6。账本：silent-0079, silent-0021, silent-0125, silent-0018。来源：postmortem → strategy-proposal。

处置：waiting。原保存记录已与只读日志核对。原dirty完整树未保存；仍缺覆盖原答→HP护栏→SL换线→首次派发→各次重规划的统一生命周期固定输入，以及保留原线的完整胜局和后置独立验证；不调护栏/SL阈值。

原提案、反例、验证及回退：本目录silent-proposal-e5b87be50f28f311.original.md（保存原件，未改历史复盘）。

### silent-proposal-49632bc4878fb597

证据：CA5KE8GFJ9X2 / F13T1—T5，末轮T5。账本：silent-0005, silent-0231。来源：experience-update → strategy-proposal。

处置：waiting。原帧再核加压力0→4→8、喷水11→15→19与末轮弱后14。仍缺力量/敏捷/弱/独立成长四条路径的统一冻结调用对照，步法子模型不能证明整个请求；不凭死亡拟合攻防权重。

原提案、反例、验证及回退：本目录silent-proposal-49632bc4878fb597.original.md（保存原件，未改历史复盘）。

### silent-proposal-66532328a585941f

证据：5PM6JAQG6FNQ / F33T1—T2；F39末试T2。账本：silent-0021, silent-0009。来源：experience-update → strategy-proposal。

处置：waiting。建立毒雾与未建立时的证据来自不同战斗，仍缺同血量/构筑/抽序的不同启动顺序完整结果和可复现收益函数，不能从F33胜/F39败定启动阈值。

原提案、反例、验证及回退：本目录silent-proposal-66532328a585941f.original.md（保存原件，未改历史复盘）。

### silent-proposal-43a76a31ba7bdcfa

证据：61E2QS63Y9WU / F17T5—T6。账本：silent-0030, silent-0027。来源：experience-update → strategy-proposal。

处置：waiting。原帧再核吸取后力2→0、敏0→−2、敌力0→2、双防御各3及17+16毒。仍缺同血量/构筑/完整已知抽序的另一可救活SL线路；单局首试胜利不支持扩大SL范围。

原提案、反例、验证及回退：本目录silent-proposal-43a76a31ba7bdcfa.original.md（保存原件，未改历史复盘）。

### silent-proposal-5264153a4a4b0e5c

证据：61E2QS63Y9WU / F23T1—T5，关键T4。账本：silent-0039, silent-0209。来源：experience-update → strategy-proposal。

处置：waiting。原帧再核航行力0→3→6、实打本体线47伤/15损及幻象余2。仍缺A10召唤/成长的统一冻结调用链和另一目标序的后续实打，未选39伤零损线不能登记整战胜线或强制首杀。

原提案、反例、验证及回退：本目录silent-proposal-5264153a4a4b0e5c.original.md（保存原件，未改历史复盘）。

### silent-proposal-bddfa690a84e03d0

证据：DUZUBAJ3A8GP / F30T1—T6，四次同局尝试。账本：silent-0128, silent-0079。来源：experience-update → strategy-proposal。

处置：waiting。原帧再核睡眠递减、T4醒来、T5力2、T6恢复成长到4/攻击22。仍缺睡眠/眩晕接续/当前进阶成长的完整冻结调用对照及同抽不同排序的完整赢线；四次失败是一局，不用于拟合新血价。

原提案、反例、验证及回退：本目录silent-proposal-bddfa690a84e03d0.original.md（保存原件，未改历史复盘）。

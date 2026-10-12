# 静默本批提案：神化候选事实分账与十项原提案处置

角色 silent，已观察 A10；batch 20261012-134303-strategy-proposal；来源六局与十个ID严格按dispatch.json，非研究/实现专项。基线8711917187c7c9253699a30c8fedeba75369e1ea，普通main合并Already up to date。

## 本次实现的有限范围

来源原silent-proposal-89354805ee4d7e77与silent-proposal-283a164780d11e69，账本silent-0237/0238；原postmortem与experience-update → strategy-proposal，不登记重复ID。
VLZ6CCT8AQ0A F35T1 states275564→275565、F43T1 275679→275680记录手牌升级；F43原同序列神化后51伤/13损。F45T1 states275722→275732中牌组持有神化而本轮未建立升级，药水后续重规划与弃牌不能预支成施放。729状态/699决策按原偏移逐条比较原JSON且保存SHA，六个来源runs.jsonl均为SILENT/A10。

旧题面已有牌名、候选及unknown_cards，但没有独立表示持有、候选施放与模拟升级的结构。新增apotheosis_reference，仅在silent/A10且持有/候选涉及神化时，列牌组/手牌份数、candidate/potion_median/unsimulated来源、候选神化次数、模拟是否应用升级、整条候选unknown_cards。本战实际施放无跨动作证明时为null，缺牌表为null，未模拟候选的计划/模拟/缺口为null。空缺口不认证全部后继升级。普通和v1 Jev均接入，未修改选项集合、数值、排序、HP/药水/SL规则及resolve动作。

反例：F43施放后仍损57，F45未施放而败，不构成胜负因果。F45药水中位样本不能当实际抽牌。新查REFLEX的F37T4手动施放抽3与普通牌组抽2确实不同，但普通费用3、升级手牌费用0及F45虚无差异未隔离；没有把3→0硬编码为升级。PREDATOR下一回合抽2、POUNCE下一技能费用还有额外效果，本批不以伤害差掩盖未验收效果。该未采用初稿保存在unverified-reflex-pair.initial.json。

此子项预期帮助Jev辨别当前事实与条件预测，效果未知；未核自然局采用、跨动作实际施放或brain消费者，不关闭两个父ID。只用发现样本固定验收，不拟合常数，没有独立盲测。后续按run_id做时间后移验证，不把一局六次SL当六样本。铁甲及其他未观察范围返回空字段，原行为等价。

## 验证与回退

固定原帧测试：F43前后持有/手牌/模拟分列，F45药水中位样本与未模拟null边界；off/v1真实题面逐选项比较，去掉新增事实后数值/选项相等、每项resolve结果相等；缺表/无持有/其他角色/进阶边界。撤掉combat-plan实际接线应使消费者测试失败，恢复通过；随后原test-sandbox入口。原代码副本只用.txt；不调LLM/网络、不依赖刷新知识、不运行play。

回退为revert本次源码提交，保留原提案、失败日志、账本、夹具和经验。实际合入后才登记eval版本并双通知Roy；完整父项仍waiting，由ops核实限定子项是否shipped。没有实际合入不能登记implemented。

## 逐项证据与剩余边界

### silent-proposal-89354805ee4d7e77

原件SHA256 `ab6488e1b2e17415061c372d3efa10dbba468de2574f784088e1a967358df76d`；证据VLZ6CCT8AQ0A / VLZ F35/F43/F45 T1；账本silent-0237, silent-0238。

本批实现Jev题面持有/手牌/候选施放/模拟覆盖分账；实际施放仍需跨动作状态核对，brain消费者未接，完整父项未闭环。REFLEX费用3与0/虚无差异未隔离，PREDATOR后继抽牌及POUNCE后继技能费用未联合验证，不扩大升级表。

### silent-proposal-f2bfceddb1898dca

原件SHA256 `fc9f3dfdb7df5f99a57ff6c1a7e7f08f9e5e6514dde8cd1013e04995d912eb26`；证据VLZ6CCT8AQ0A / VLZ F45 T1/T4/T5；账本silent-0106, silent-0019, silent-0201。

VLZ F45T1的707ms、1/12样本仍只是一题；缺覆盖一致、固定随机输入及同总预算下的配对收益曲线、排名稳定性，不能据此改预算或留药价格。

### silent-proposal-283a164780d11e69

原件SHA256 `78e23dae4213fa5b07bda1a0799bbbe0c94567c889db235b40560f523608e637`；证据VLZ6CCT8AQ0A / VLZ F35/F43/F45 T1；账本silent-0237, silent-0238。

与89354805ee4d7e77同源；本批仅补Jev候选事实子项，未核本战实际施放及brain消费，不能将完整经验提案登记duplicate。剩余升级的费用/附加效果缺隔离验证。

### silent-proposal-ebbfe3b97548756d

原件SHA256 `08eaeed02365ece6b99ec54adb8ead6688d7323d6f59f30c1cb5996f41c552e2`；证据VLZ6CCT8AQ0A / VLZ F43 T1–T5/F45 T3–T5；账本silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019。

十五主题尚缺逐源属性、期限、逐实体与整条资源链的联合消费者验收；已有有限神化/端点子项不覆盖全部。未选focus/休息缺同盘整场对照，不拟合血价。

### silent-proposal-e5b87be50f28f311

原件SHA256 `5e713a9a6a50830d4ff7c2aba1c2af90487cc8d03e4881555257b43161632709`；证据8JRE1C4H4Z2W / 8JRE F33首/三试T2、第二试T5、末试T11/F17T6；账本silent-0079, silent-0021, silent-0125, silent-0018。

预测审计、离线能力端点、单步派发已有live源码；前批终局83512ddcd在本批开始时尚非live祖先，运维后续已实际合入3a20d222；本批不重复实现；完整候选执行及全部重规划链仍缺验收，真实净HP不作为单卡因果。

### silent-proposal-49632bc4878fb597

原件SHA256 `aac4fddf0f24862a3fb8e289d000a312358c3bb9ee3d624602bf755d0b5409a2`；证据CA5KE8GFJ9X2 / CA5 F13 T5；账本silent-0005, silent-0231。

CA5 F13可核加压0→4→8和喷水11→15→19，虚弱仍不停止成长；该来源没有正敏捷配对帧，力量/逐击/敏捷/虚弱/独立成长的联合调用验收不足，不新增统一权重。

### silent-proposal-66532328a585941f

原件SHA256 `56a0a04049f43aa425242d11caa305a1bb869fc6b4fc38d0138e9f6edad44831`；证据5PM6JAQG6FNQ / 5PM F39 T2（反例F33）；账本silent-0021, silent-0009。

5PM F39T2空打冒泡与F33已建雾/触媒/群蛇是不同局面；缺同入口、同抽序完整启动比较及可复现收益函数，在线持有/计划/建立全链尚未验收。

### silent-proposal-43a76a31ba7bdcfa

原件SHA256 `f4a38e2d7ee0b5d205a3168cc58dfec442046d7be3a89701054b3dcb7fdf0a6c`；证据61E2QS63Y9WU / 61E F17 T5–T6；账本silent-0030, silent-0027。

61E F17T5吸取后负敏捷、T6双防御各3与17+16毒可核；缺联合生产调用验收，SL改线另缺相同HP/构筑/抽序的完整另线，不把首试胜利当SL阈值依据。

### silent-proposal-5264153a4a4b0e5c

原件SHA256 `b32fb321d95e941c095993cdde0d011354c689718ffe2a3b2428fe68c444ec02`；证据61E2QS63Y9WU / 61E F23 T4–T5；账本silent-0039, silent-0209。

61E F23航行0→3→6、T4幻象存活至T5可核；召唤/航行/逐实体/索引重排尚未联合固定验收，39伤零损focus候选未实打，不能规定首杀。

### silent-proposal-bddfa690a84e03d0

原件SHA256 `b9f90f13d558011142b4bfc459efdfd4680dd297206c182c9c48d86f4c32e780`；证据DUZUBAJ3A8GP / DUZ F30 T4–T6；账本silent-0128, silent-0079。

DUZ F30睡眠自然醒和后段成长可核；本来源缺提前唤醒/STUNNED接续配对及同抽完整另线，四试失败不足校准输出血价或全死排序。

各原提案的反例、时间切分与后续验证原文均按队列SHA核对，保存在本目录十份.original.md；未复制其他角色知识。源码/测试/合入的最终状态见report.md，不将本草案当上线凭证。

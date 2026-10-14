# 本批十项提案逐项复核

核验时间：2026-10-14T08:19:27+08:00。

角色：静默猎手。来源任务和原Markdown保持，独立实现任务为strategy-proposal/20261014-080351-strategy-proposal。仅处理dispatch.json的10个原ID；未新增提案ID或领取其他队列。

普通队列身份核对通过；research_request/implementation_request均缺省。起始HEAD为f4a6d1a347effe33b353d12ad3938ee67b3f2d5b，按任务合main后base为b6ad94734eb8bee9f201cfcd4f3fa46eb0088035。无专题身份，不套用纯研究。

方法：先核runs.jsonl角色，再按冻结历史offset读取原states/decisions并逐SHA读回。六关键局3346状态/3189决策；9局42饮、三局17油灯窗口独立回原日志。SL尝试归同一个run，不把局部同盘样本当独立胜率样本。既有学习账本/经验只作追溯，当前JSON的新增历史未重新核验或借用为新规则。

本批没有足够新增证据支持策略参数修改。所有处置waiting。已实现源码子项可核，但原整项缺口保持。假设、支持和反例如下；未执行候选、未到节点及未控制后继均记未知。

## silent-proposal-08eaa60bcc449852：赢战耗药与下一战结转

既有账本：silent-0019、silent-0020。

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-214301-experience-update/proposal-resources.md；SHA256=4d080ad9b9f1c93bff7bf169d59add7d863db358ca7e05ba10d95cdfb6b31016，原字节副本为silent-proposal-08eaa60bcc449852.original.md。

证据、支持与反例：KEN58SH9SLZ6 A10 F3 T2/F4 T1/F5 T2/F11 T1、T2/F15 T1共7次饮用；六赢战净损0/3/0/37/6/0合46。F12回复26→53、上限76→81；F16回复46→75、上限81→86。

本批结论/未知：七次饮用及两次真实回复已按原帧核验；缺同资源、同牌序的未饮用或留药到boss完整对照，无法校准持药价格或固定留药阈值。

旧规则保留；预期行为及验证：保留当前用药价值；验证7次动作及回复分账。后续需以较早独立局拟合、较晚新局验证完整资源链，SL按同局归组。

拟合/切分：本批不拟阈值或自由参数。完整对照按独立局和开始时间分组，SL和同盘回合不得跨训练/验证。局部机制/资源核验不等于整战因果或通关改善。

处置：waiting；当前行为保持。回退：本批无新实现可撤；既有发布与失败历史保持。后续若实现，只撤对应独立源码提交，按原沙箱/live流程验证及通知。

## silent-proposal-92920295a648b540：SL首胜与连续通关

既有账本：silent-0228、silent-0255。

原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-214301-postmortem/proposal-sl-continuation-validation.md；SHA256=f9d04951c404f2d568d492c633e8baeb7ca5b4bee6826e20e9d5c2348c739bbf，原字节副本为silent-proposal-92920295a648b540.original.md。

证据、支持与反例：TXZ6RVMQA09D A10 F48第二/三试T6均48血、敌460血；完整当轮损3/0、敌净扣36/27。第三试T10首boss赢后4血，F49从4血到0血，未到可操作帧。

本批结论/未知：TX三试已核；T6少损3也少扣9，后续生成/抽序改变，首胜4血后开场死亡。缺保持后轮条件的连续通关替线，不能据此改SL资格或终局权重。

旧规则保留；预期行为及验证：现有连战与候选比较继续使用；校验首战、后战、SL恢复分别结算。需要同抽序完整后继及时间留出胜负对照。

拟合/切分：本批不拟阈值或自由参数。完整对照按独立局和开始时间分组，SL和同盘回合不得跨训练/验证。局部机制/资源核验不等于整战因果或通关改善。

处置：waiting；当前行为保持。回退：本批无新实现可撤；既有发布与失败历史保持。后续若实现，只撤对应独立源码提交，按原沙箱/live流程验证及通知。

## silent-proposal-a327449c331efbc1：沙虫双截止与SL血价

既有账本：silent-0079、silent-0018。

原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-221303-postmortem/sl-tradeoff-proposal.md；SHA256=e52c156a500b9e5f9d35e7b7e6922a91ee893b16576bc7d11f14e179c2e6a925，原字节副本为silent-proposal-a327449c331efbc1.original.md。

证据、支持与反例：WQZVENQ7DTRP A10 F33第二/三试T9同指纹，26血、敌184血；原线13损/24净扣，替线22损/39净扣。第二/六试T7同扣24，损0/4，结束前沙坑4/5、次轮3/4。

本批结论/未知：WQ同盘T9多15输出付9血，T7付4血延长沙坑一轮；六试均未通关。缺两条截止边界的完整受控后继和独立胜局，无法拟固定血伤交换阈值或探索筛选。

旧规则保留；预期行为及验证：保留当前探索与严格必死判断；现有比较已列血价、毒与沙坑预测。下一证据需同时保留攻击截止/沙坑截止和完整续轮。

拟合/切分：本批不拟阈值或自由参数。完整对照按独立局和开始时间分组，SL和同盘回合不得跨训练/验证。局部机制/资源核验不等于整战因果或通关改善。

处置：waiting；当前行为保持。回退：本批无新实现可撤；既有发布与失败历史保持。后续若实现，只撤对应独立源码提交，按原沙箱/live流程验证及通知。

## silent-proposal-a099e89437e942bb：狡诈容量、出刀穿插与保留

既有账本：silent-0030、silent-0257、silent-0258。

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-cunning-capacity.md；SHA256=e02b6c6c93defbea23d60a515bf17be3c1c6ac3d3b47dd0e6da647cea92910c2，原字节副本为silent-proposal-a099e89437e942bb.original.md。

证据、支持与反例：本提案9局42饮逐次回原日志：37次添3、2次添2、3次添0；新增均小刀升级/基础伤6，饮用当步HP与能量不变、药槽消耗。WQZVENQ7DTRP F33第五/六试T11连续饮用2/0/0与3/2/0。

本批结论/未知：狡诈3/2/0生成、每步手位和饮用/出刀穿插模拟已有live祖先6403fdcdadc803a092beb5165a068e22bf51c412；原要求还缺完整穿插派发、跨轮计划妥当保留和SL恢复的消费者证据，不能将整个宽项登记duplicate。

旧规则保留；预期行为及验证：生成公式保持；固定已有夹具核容量/力量/虚弱，完整消费者验收须经过饮用→新手牌重读→出刀→再饮及存档恢复，收益仍待整战证据。

拟合/切分：本批不拟阈值或自由参数。完整对照按独立局和开始时间分组，SL和同盘回合不得跨训练/验证。局部机制/资源核验不等于整战因果或通关改善。

处置：waiting；当前行为保持。回退：本批无新实现可撤；既有发布与失败历史保持。后续若实现，只撤对应独立源码提交，按原沙箱/live流程验证及通知。

## silent-proposal-47910f82a1fdd98f：开场血价、连战与SL资源

既有账本：silent-0018、silent-0019、silent-0020、silent-0021、silent-0025、silent-0079、silent-0198、silent-0228、silent-0255。

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-223544-experience-update/proposal-continuation-sl.md；SHA256=d4ff2c80c60bdac273fbce918109b0a4634484006ec7e3b6b4516b9afede51bd，原字节副本为silent-proposal-47910f82a1fdd98f.original.md。

证据、支持与反例：TXZ6RVMQA09D A10 F43/45/46/48从70/52/62/60到首个可操作66/48/58/56；F49从4到0、无可操作帧。WQ F33 T9血价差9及T7沙坑差1分别保留。

本批结论/未知：无血瓶开场4血和连战接续已有live祖先e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a；宽要求缺SL血价、留药、路线预算的受控后继，以及小血瓶/回血/复活未知组合顺序。

旧规则保留；预期行为及验证：现有已观察分支保持；未来固定组合分别核开场资源与SL恢复，不从4血死亡外推未知组合、路线权重或放宽SL。

拟合/切分：本批不拟阈值或自由参数。完整对照按独立局和开始时间分组，SL和同盘回合不得跨训练/验证。局部机制/资源核验不等于整战因果或通关改善。

处置：waiting；当前行为保持。回退：本批无新实现可撤；既有发布与失败历史保持。后续若实现，只撤对应独立源码提交，按原沙箱/live流程验证及通知。

## silent-proposal-f1374df72d8e6a25：退出价值与持续/临时药价

既有账本：silent-0019、silent-0020、silent-0050、silent-0253。

原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-224302-postmortem/proposal-resource-value.md；SHA256=df1e14ed2c6b4b31c1dcbd1bd373702cff34a58332d4aab60f7e31dc44b395a0，原字节副本为silent-proposal-f1374df72d8e6a25.original.md。

证据、支持与反例：Q6M2Y34MWKRE A10 F2实际56→44，敏捷T3才喝；F7休36→57，F8赢后2，F9 T2死亡。1913SE84AXQF A10 F24锻造40→40、F28休40→61、F29赢61→46、F31入口46。

本批结论/未知：Q6早喝敏捷双防御为未完整执行候选；实线F8退出2血，1913路线将预计回血改锻造，条件不同。缺隔离机制误差、同预算完整后继及未用/早用/留药的受控对照。

旧规则保留；预期行为及验证：保留药价和终局阈值；评估必须分清候选预测/实际退出/后继入口及持续/临时效应，不能将未来营火记为已回血。

拟合/切分：本批不拟阈值或自由参数。完整对照按独立局和开始时间分组，SL和同盘回合不得跨训练/验证。局部机制/资源核验不等于整战因果或通关改善。

处置：waiting；当前行为保持。回退：本批无新实现可撤；既有发布与失败历史保持。后续若实现，只撤对应独立源码提交，按原沙箱/live流程验证及通知。

## silent-proposal-38a49e6c97f31eea：紧勒与多机制分源

既有账本：silent-0006、silent-0011、silent-0025、silent-0044、silent-0050、silent-0064、silent-0133、silent-0253、silent-0259、silent-0261、silent-0262。

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-mechanisms.md；SHA256=6a07471e9049744900d49529a939a7014fb686810a0d7983e6c35eb65b5e8cb0，原字节副本为silent-proposal-38a49e6c97f31eea.original.md。

证据、支持与反例：Q6M2Y34MWKRE A10 F8 T4紧勒103→95，突然一拳95→85，生存者弃牌完成85→83，再结3毒到80；1913SE84AXQF A10 F31 T4中段重接25、旧毒/力量不沿用，20血承受攻击后死亡。

本批结论/未知：普通无挡紧勒已有live祖先5c7105ff0294466da8319f2934beda05c6040794；再生/临时敏捷有既有模型。原多机制要求仍缺再生、荆棘、增益、重接等联合消费者重放及隔离机制误差后的整战验证。

旧规则保留；预期行为及验证：已证普通紧勒保持；当前只核原始Q6逐牌链及1913兑现时点。新组合/升级/重放按其自身已证范围，不借本批普通样本外推。

拟合/切分：本批不拟阈值或自由参数。完整对照按独立局和开始时间分组，SL和同盘回合不得跨训练/验证。局部机制/资源核验不等于整战因果或通关改善。

处置：waiting；当前行为保持。回退：本批无新实现可撤；既有发布与失败历史保持。后续若实现，只撤对应独立源码提交，按原沙箱/live流程验证及通知。

## silent-proposal-ef0e38a5dbd3bc07：精英胜后连续血价和实际回复

既有账本：silent-0019、silent-0020、silent-0021。

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-234302-experience-update/proposal-resources.md；SHA256=d37416e85fd4f9331fc5f652f5838eae9b528a76fe45b9c10aac07acfd572da5，原字节副本为silent-proposal-ef0e38a5dbd3bc07.original.md。

证据、支持与反例：1913SE84AXQF A10 F24锻造不回血，F28实际回21，F29赢战又损15，F31入口46；Q6M2Y34MWKRE A10 F7回21，F8精英胜损55至2，F9走廊死。

本批结论/未知：实际休息/锻造/胜战损血链已核，但缺另选营火、前序事件血价、早用药或改路线的完整受控结果；两败不能拟路线血价、未来营火保障或能力终局权重。

旧规则保留；预期行为及验证：沿实际动作传递HP和药栏，保持现值。后续需独立局、同路线条件的完整节点序列和预算校准，未到营火及未兑现能力保留未知。

拟合/切分：本批不拟阈值或自由参数。完整对照按独立局和开始时间分组，SL和同盘回合不得跨训练/验证。局部机制/资源核验不等于整战因果或通关改善。

处置：waiting；当前行为保持。回退：本批无新实现可撤；既有发布与失败历史保持。后续若实现，只撤对应独立源码提交，按原沙箱/live流程验证及通知。

## silent-proposal-7f820c02d39bfaea：死亡饱和的SL即时代价

既有账本：silent-0079。

原Markdown：/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem/proposal-saturated-sl.md；SHA256=bee54fe85711a177349f927c21f184b7112308ead5c74708b8f3b0b183ecf105，原字节副本为silent-proposal-7f820c02d39bfaea.original.md。

证据、支持与反例：NHA2KW0RB7VP A10 F33第一/第五/第六试T1同30血、两敌合408；原线1损/敌净扣8，替线与重放7损/敌净扣24，次轮两侧都活，六试全败。净扣含抱抱先生次轮自动伤，不能全算牌伤。

本批结论/未知：NHA替线多16净扣付6血、两敌均活、六试全败；现有live候选/资源比较已记录预测差额。缺独立成对后继胜负与同预算饱和排序校准，不能把局部差额当探索收益。

旧规则保留；预期行为及验证：保留生产探索门槛；分列即时损血、敌本体/毒、实际击杀和续轮，把第五与第六试重放视为同局数值复现。

拟合/切分：本批不拟阈值或自由参数。完整对照按独立局和开始时间分组，SL和同盘回合不得跨训练/验证。局部机制/资源核验不等于整战因果或通关改善。

处置：waiting；当前行为保持。回退：本批无新实现可撤；既有发布与失败历史保持。后续若实现，只撤对应独立源码提交，按原沙箱/live流程验证及通知。

## silent-proposal-04b6b430759815ed：油灯首次消费与动态子公式

既有账本：silent-0005、silent-0006、silent-0021、silent-0011、silent-0065、silent-0264、silent-0079、silent-0133、silent-0169、silent-0189、silent-0013、silent-0053、silent-0162、silent-0265。

原Markdown：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-004303-experience-update/proposal-mechanisms.md；SHA256=188d4daee0970bba6b59aa7c3498d9da76ef31aac4a42c69be2a86192cadab58，原字节副本为silent-proposal-04b6b430759815ed.original.md。

证据、支持与反例：K3676LU8B0UH A1 F30 T2/F38 T1带毒刺击4→8；SADL3CGYTGSR A7 F45 T1毒药5→10；NHA2KW0RB7VP A10多个首毒和六次蟹首萎靡，共三局17直接窗口。NHA持有油灯501帧字段恒同、stack=null。

本批结论/未知：三局17窗口支持已观察首次放大；油灯字段不表示是否已消费，缺跨动作/新战/SL追踪及未见负面组合的消费者验证。精确切击5/6手和蟹朝向分别已有live祖先8b9bacbebb20eaaa1133a9945da6c7abfcda745d、ec29ea34b919344b707e57ba472ea210f9c39d62，不代表油灯及能力兑现整项完成。

旧规则保留；预期行为及验证：保留未证分支，不将每次施毒翻倍。后续需明确首次消费身份、目标制品、X值/升级、重放和SL恢复的完整固定输入；其他组合仍未知。

拟合/切分：本批不拟阈值或自由参数。完整对照按独立局和开始时间分组，SL和同盘回合不得跨训练/验证。局部机制/资源核验不等于整战因果或通关改善。

处置：waiting；当前行为保持。回退：本批无新实现可撤；既有发布与失败历史保持。后续若实现，只撤对应独立源码提交，按原沙箱/live流程验证及通知。

## 实际live祖先的既有源码子项

只读核验live快照：cc82ef5cbc3c14a304a70229b72fb39b17f60f13。

|子项|实际祖先源码commit|
|---|---|
|cunning_generation_and_capacity|6403fdcdadc803a092beb5165a068e22bf51c412|
|ordinary_strangle|5c7105ff0294466da8319f2934beda05c6040794|
|royal_poison_opening|e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a|
|sl_current_turn_resource_comparison|5604982e13890e0e2bc8bf8246272e8267321c0b|
|sl_candidate_forecast_comparison|c769739b97389fdc978b6515b83a38e3cd900f67|
|precise_cut_five_six_hand|8b9bacbebb20eaaa1133a9945da6c7abfcda745d|
|crusher_facing|ec29ea34b919344b707e57ba472ea210f9c39d62|

完整文件blob/祖先判断见live-source-verification.json；base与该live快照的这些源差异仅Roy/Dai注释文字，见base-live-source-diff.patch。这七个子项没有被冒报为本批实现或整个宽项duplicate。

## 验证与交付

原日志唯一3394状态行、3189决策行、29条SL行SHA读回通过；另17油灯直接窗口回原帧通过。九个当轮成对观测、KEN六赢战合46净损、7饮和2实际回复、Q6/1913资源链断言通过。以上为证据材料核验，未运行或声称源码tsc/vitest通过。

分析初稿访问无chosen的诊断决策行出现KeyError；原analysis-first-failure.stderr保留。恢复为跳过无动作诊断行后原同一帧与相同断言通过。初稿将沙坑从玩家powers读取，实际在敌方powers；最终记录明确结束前4/5与次轮3/4，不将缺字段当不存在。原帧和旧日志未改。

源码撤掉失败/恢复通过：本批未改源码，不适用。tsc=null，vitest=null，cases=null。无需live合入、版本或shipped登记；未推送、未运行play。31个原账本只经根目录ledger.py追加本批提案/报告追溯，不改旧claim/status/version/evidence。无新学习条目或代码提案ID。

材料：dispatch.json、claimed-proposals.json、all-authorized-runs.json、source-references.json、raw-readback-verification.json、paired-turn-observations.json、resource-chains.json、ken-drinks.json、cunning-observations.json、lamp-window-verification.json、lamp-field-observation.json、live-source-verification.json、proposal-results.json及report.json。

根要求、原经验入库和消费者收益仍沿各自既有任务验收；本批处置不会关闭它们。

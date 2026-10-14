# 静默猎手策略提案逐项核验

时间：2026-10-14T18:57:47+08:00。批次：20261014-184301-strategy-proposal；来源任务/实现任务：strategy-proposal。

本批仅处理已领取的十个原ID，不新增重复提案。角色silent；四局均已结束、实际A10。没有research_request或implementation_request，普通专题请求绑定其他批次，不承接专题；`git merge --no-edit main`返回Already up to date。base与HEAD保持 `a43decfe89e60877dea41d91157d4b32dbc989b8`。

结论：十项宽提案均waiting。若干窄子项已经是实际live祖先，不能重复实现，也不能因此把宽提案整体记duplicate。未发现本批证据足以支持的新策略参数；没有源码修改、提交、合入或新版本。当前没有重现新的合入冲突，旧批冲突不是本批waiting理由。

原Markdown、队列、账本及runs身份已冻结。提案保存正文SHA逐项相等；4489原日志行按offset/bytes/SHA、所属局身份和冻结source_size逐一核验。全部游戏结论只来自这四局及其既有本角色记录，不使用其他角色知识。

下列“已核live子项”只证明实际源码祖先，不表示整项implemented或账本shipped。所有领域保持原行为；没有授权范围以外的架构修改。

## silent-proposal-f54e8de2381c1250

来源：/home/dw/Projects/agent-sts2/learner/runs/20261008-051302-postmortem/proposal-guard.md；原文SHA256 `db780eb4b443cc8fdfb17237293f186588b1b010347160b24d1d22291ae8c5ce`。

账本：silent-0125。

证据：MTQ0EUBJ3R6T F11T1；决策282138—282140、状态288592—288597；另F23 SL。

本批核实：同题候选14/6损、14/16伤，原答plan6与护栏plan1已能唯一定位；实际净损6、敌净降20。选牌后立即重问，T2实际还有3毒，不能把20归原无毒完整候选或认定连续反弹预测错误。

处置：waiting。候选/派发/重问追溯已有live实现；历史选牌中断后缺完整候选执行身份及实际线可比推演，无法认证实线排名。原actual_turn=null的保守语义本身不是bug。

预期行为及后续验证：只保留原答、最终候选、重问与实际观测分列；不调整8HP护栏。下一独立同角色局须有完整计划步身份、连续帧及同题可比预测后再评估归属。

反例/限制：原文限定与失败样本全部保留；相关SL不当独立局，候选预测不当已执行实值。

已核live子项：候选离线执行链 `6f3f783941270ac182237c46068097ff67e85907`；候选单动作派发回执 `bade647f9fe4c9103b40e2f26b26296692ad24b7`；包含重问的轮窗口 `9b87d54f097d84521152e6cca8d6072af8140394`

回退：本批未改源码或参数，无需行为回退；保存原始日志、失败和未知，不覆盖旧提案。

## silent-proposal-763a4b9d9f17b815

来源：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-053105-experience-update/proposal-mechanisms.md；原文SHA256 `989dcea2a0dd5cad05d276157131dec57fdb9d17b2bdab66cbd25f32e0e9ad39`。

账本：silent-0005, silent-0006, silent-0011, silent-0013, silent-0044, silent-0046, silent-0053, silent-0080, silent-0087, silent-0189, silent-0214, silent-0222, silent-0235, silent-0253。

证据：7X0W3U8TVA2A F30T3/F31T1,T13；MTQ0EUBJ3R6T F20T3、F23T3；原十四机制范围按保存原文。

本批核实：普通蛇咬三帧当前模型均8毒/2费，已在live祖先d385591；旧“8毒尚未合入”不是本批理由。磨蚀当前模型1敏捷/4荆棘/0即时挡。MTQ末试19挡、10→2，与27需求分开。

处置：waiting。上述窄子项已有实现；原十四项跨直接施毒修饰、持续能力及临时增益边界，仍缺全部组合到实际后继/资源归属的冻结消费者校准，不能以四个窄入口核对覆盖整包，也不从dirty历史推断完整原模型。

预期行为及后续验证：保留已核公式与未观察组合的未知；后续逐项用连续原帧校准卡模型→求解器→后轮撤回，不能再以普通蛇咬8毒为未实现子项。

反例/限制：原文限定与失败样本全部保留；相关SL不当独立局，候选预测不当已执行实值。

已核live子项：普通蛇咬8毒预览 `d385591f37cf2d09a032e3d3b998c4ff5ee5636e`；持牌损血候选事实 `05cd292c6f01bb31e406473d3a9843e659d62b93`；奇巧上下文与窄毒药输入 `8bb53d6342b7e9a2adf96de231b53c36eaa943de`

回退：本批未改源码或参数，无需行为回退；保存原始日志、失败和未知，不覆盖旧提案。

## silent-proposal-19a5cff2094e2d8f

来源：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-053105-experience-update/proposal-sl.md；原文SHA256 `7bf15ce1f8fd2291d52b8d24fc89de1fe613e8fd9812d31621f9cd48c8e2d57d`。

账本：silent-0021, silent-0064, silent-0079, silent-0133, silent-0125。

证据：MTQ0EUBJ3R6T F23T3—T5；7X0W3U8TVA2A F31T1—T13；账本0021/0064/0079/0133/0125。

本批核实：MTQ T3实际19挡损8，T5先处理毒素后才终死；7X0多次接续需区分已出现血池和活体局部血量。阶段入口、候选资源和严格终态已有子项。

处置：waiting。同抽失败线和有限推演没有提供受控完整胜线；暂死/恢复/终局的完整因果及修正输入到实际整战终结尚缺，不能改SL或终局权重，也不能整项duplicate。

预期行为及后续验证：仍分列持牌先结、当前能否终结、实际后续接续及SL截断；未来需要同种子完整成对战斗，保存预测误差与真实结局。

反例/限制：原文限定与失败样本全部保留；相关SL不当独立局，候选预测不当已执行实值。

已核live子项：暂死与接续敌体入口 `7e5cd982d40054e751bb0096e403e3cf7cf50ba0`；SL候选资源对比 `a8b1f8be153fe4f3a34146117546c2178f2e446b`；严格终态观测 `04921bd785ac6838066522f91ea0bb6ab95cb6a1`

回退：本批未改源码或参数，无需行为回退；保存原始日志、失败和未知，不覆盖旧提案。

## silent-proposal-3540bf4360bf80af

来源：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-053105-experience-update/proposal-resources.md；原文SHA256 `58181f916f63872302d0ab2342b349e5de205083aa365151b8f4bcb79c1b63ce`。

账本：silent-0019, silent-0020, silent-0243。

证据：MTQ0EUBJ3R6T F17→18、F19/F20→F23，7X0W3U8TVA2A F17→18/F30→31。

本批核实：MTQ19→59与7X0的28→61是已到幕间回复；MTQ F19/F20赢战仍消耗血，未到F24不能当F23已有回血。当前resource_chain保留进入、退出、重启及未分类结果。

处置：waiting。离线资源观测不等于路线/休息题面已逐源读回；缺入房与开场补血、营火、实饮及SL恢复到对应题面的端到端校核和可比替路线，不能改安全血线。

预期行为及后续验证：后续把各次来源与实际到达节点链接到原路线/休息消费者，先验事实覆盖，再另验择路收益；本批不新增阈值。

反例/限制：原文限定与失败样本全部保留；相关SL不当独立局，候选预测不当已执行实值。

已核live子项：资源链源码及实际live祖先见source-audit.json；不声称路线题面已有完整分源。

回退：本批未改源码或参数，无需行为回退；保存原始日志、失败和未知，不覆盖旧提案。

## silent-proposal-0ea5c0b9c030fdd6

来源：/home/dw/Projects/agent-sts2/learner/runs/20261008-054302-postmortem/proposal-sloth-potion.md；原文SHA256 `ed57d3f8b54f0d056efe2e488a4dca2c2b32a7062433c636e71a51b395663391`。

账本：silent-0274, silent-0247, silent-0027, silent-0016。

证据：KFRDELW2TH2P F33六试T7；决策282864/282899/282933/282968/283001/283035，末状态289533—289538。

本批核实：六次当前奇巧helper均显示剩余名额上界2、能量3、continuation_verified=false。三个手动动作后爆发确被SLOTH锁住且剩1能量；六次窄毒药当前输入均6，末实际43+42=85、敌仍74。

处置：waiting。名额提示和本组合毒药6已有live实现；完整合法后继/对象收益兑现仍明确未验证，缺换对象/顺序与提前饮毒整战对照，不能将宽提案整体标重复或宣称改善胜率。

预期行为及后续验证：保留全部选项及当前窄条件；新增可执行序列须经固定原帧和后继资源共同校准，不固定选防御或一律提前喝药。

反例/限制：原文限定与失败样本全部保留；相关SL不当独立局，候选预测不当已执行实值。

已核live子项：奇巧上下文与窄毒药输入 `8bb53d6342b7e9a2adf96de231b53c36eaa943de`

回退：本批未改源码或参数，无需行为回退；保存原始日志、失败和未知，不覆盖旧提案。

## silent-proposal-f915ec544ab94b6e

来源：/home/dw/Projects/agent-sts2/learner/runs/20261008-054302-postmortem/proposal-sl-tradeoff-guard.md；原文SHA256 `2339e1598f60a64fa1db9be3ebe3cecfe7057ff323c14f15341ccce85b15de98`。

账本：silent-0079, silent-0125。

证据：KFRDELW2TH2P F12T1决策282578/282579；F33首/第3试T6状态289339/289345/289414/289420。

本批核实：同盘初15HP、敌228/36毒/3覆甲；两线净损6/12、敌HP下降83/93。F12斗篷生成牌后下一条重问，原0损完整护栏候选未执行。

处置：waiting。断点与资源端点审计已有；候选重问后身份不能重建成完整执行，缺同种子整战胜负校准。多10输出且多损6、两线均败，不足以拟合新的保血权重。

预期行为及后续验证：保留局部血价与候选失效断点，完整线未知继续为空；后续整战成对回放再评估排序。

反例/限制：原文限定与失败样本全部保留；相关SL不当独立局，候选预测不当已执行实值。

已核live子项：候选离线执行链 `6f3f783941270ac182237c46068097ff67e85907`；SL候选资源对比 `a8b1f8be153fe4f3a34146117546c2178f2e446b`；包含重问的轮窗口 `9b87d54f097d84521152e6cca8d6072af8140394`

回退：本批未改源码或参数，无需行为回退；保存原始日志、失败和未知，不覆盖旧提案。

## silent-proposal-8fb51933639faf90

来源：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-061302-experience-update/proposal-mechanisms.md；原文SHA256 `540a529f428b0c342abb969c3d040446149db3d7fb4f855b23f4b950462a64ab`。

账本：silent-0005, silent-0006, silent-0027, silent-0189, silent-0276, silent-0277, silent-0278。

证据：KFRDELW2TH2P F28T2；F33六次T2/T4/T5/T6/T7，原账本0005/0006/0027/0189/0276/0277/0278。

本批核实：本组合六次T7毒药均加6且当步不扣HP；窄毒药入口已在live，不再沿用旧“只有双boss”描述。覆甲现场层和牌挡必须分源，不能从7→2推固定每轮减1。

处置：waiting。本批核实的窄药效不能补出覆甲完整减层触发条件及未知修饰组合；七项药效/能力的跨回合联合消费者尚无充分隔离校准，保留原规则。

预期行为及后续验证：按当前层/已建立能力和真实施放时点比较；后续补逐击和完整后轮帧，不推留药价、提前饮用胜率或统一优先级。

反例/限制：原文限定与失败样本全部保留；相关SL不当独立局，候选预测不当已执行实值。

已核live子项：奇巧上下文与窄毒药输入 `8bb53d6342b7e9a2adf96de231b53c36eaa943de`；持牌损血候选事实 `05cd292c6f01bb31e406473d3a9843e659d62b93`

回退：本批未改源码或参数，无需行为回退；保存原始日志、失败和未知，不覆盖旧提案。

## silent-proposal-b3bc0eb09211af6c

来源：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-061302-experience-update/proposal-sl-selection.md；原文SHA256 `f3279ab3f48180d287e7ad57c0a1484e56ed48910772aac748dd6faf32185bf9`。

账本：silent-0021, silent-0079, silent-0102, silent-0247, silent-0274。

证据：KFRDELW2TH2P F12T1、F33六试T7、首/第3试T6及末T7终局。

本批核实：奇巧选中爆发未等于施放；当前名额/窄药效子项可读回。T6局部输出93对83、损12对6；末T7结毒后敌仍74、玩家终死。

处置：waiting。缺合法后继到真实终结的完整链、替对象及提前饮毒的受控整战结果；有限模拟或敌余血更少不证明更安全，不据此拟合终局价值。

预期行为及后续验证：保留当前严格必死边界和随机未知；候选比较只作同题预测，后续实战校准须分赢、SL截断和实死。

反例/限制：原文限定与失败样本全部保留；相关SL不当独立局，候选预测不当已执行实值。

已核live子项：奇巧上下文与窄毒药输入 `8bb53d6342b7e9a2adf96de231b53c36eaa943de`；SL候选资源对比 `a8b1f8be153fe4f3a34146117546c2178f2e446b`；严格终态观测 `04921bd785ac6838066522f91ea0bb6ab95cb6a1`

回退：本批未改源码或参数，无需行为回退；保存原始日志、失败和未知，不覆盖旧提案。

## silent-proposal-fdc3a505fe5e1a55

来源：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-061302-experience-update/proposal-resources.md；原文SHA256 `9591f8717f33da220db658aaa746a04412cd9b324bb60fbb2f9a376a0796ea75`。

账本：silent-0019, silent-0020, silent-0243。

证据：KFRDELW2TH2P F29→F30/F31→F32→F33，幕间、营火与SL重启；账本0019/0020/0243。

本批核实：赢战也消耗后续入场HP；离线链保留20个战斗窗口及86个资源变化，未知退出/未分类结果没有自动补胜负。营火、幕间、小血瓶、SL恢复不可合成同一种回血。

处置：waiting。缺这些来源逐项进入当时路线/休息题面并读回的完整冻结对照，以及可比替路线/休息对锻造的整场结果，不能从六次回血仍败拟合阈值。

预期行为及后续验证：保留现场HP和已到回复；补消费者来源链接与真实下一房入口后再评估，未到节点不预支。

反例/限制：原文限定与失败样本全部保留；相关SL不当独立局，候选预测不当已执行实值。

已核live子项：资源链源码及实际live祖先见source-audit.json；不声称路线题面已有完整分源。

回退：本批未改源码或参数，无需行为回退；保存原始日志、失败和未知，不覆盖旧提案。

## silent-proposal-5a95725089f53cd8

来源：/home/dw/Projects/agent-sts2/learner/runs/20261008-064304-postmortem/proposal-resource-bloodprice.md；原文SHA256 `802a23c7d736197db33e3c57daf42eb9064bc4b2ee56fc2f5733b3fdd73fcdb7`。

账本：silent-0019, silent-0079, silent-0005, silent-0016, silent-0087, silent-0027, silent-0030。

证据：GXNKW8X1XYJP F35/F38/F40/F42/F44→F45；F45第2/末试T2—T3，状态290160/290165/290201/290206/290212—290214。

本批核实：同2HP开场后分别3/13HP、0/7带挡，末线连枷多8HP。精灵原槽usage=Automatic后空，不能记主动饮用；末T3毒药有显式请求。least-loss负2和实死一致。

处置：waiting。药槽、相邻端点和整轮审计已有live子项；仍缺逐击复活瞬时帧/完整入伤、自动消耗的完整因果及完整候选执行归属。两实线均败，不能把局部多10HP当整战收益。

预期行为及后续验证：保持原权重、护栏、SL和药水策略；后续补原槽身份、逐击帧与完整计划步，分别统计自动消耗、主动请求、新获、丢弃和SL恢复。

反例/限制：原文限定与失败样本全部保留；相关SL不当独立局，候选预测不当已执行实值。

已核live子项：相邻药槽观测 `cf72bd21148059f111f760cc98a727369e34a47e`；包含重问的轮窗口 `9b87d54f097d84521152e6cca8d6072af8140394`；候选单动作派发回执 `bade647f9fe4c9103b40e2f26b26296692ad24b7`

回退：本批未改源码或参数，无需行为回退；保存原始日志、失败和未知，不覆盖旧提案。

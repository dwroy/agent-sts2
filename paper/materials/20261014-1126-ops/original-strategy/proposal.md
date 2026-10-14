# 静默猎手本批原提案处置与8毒蛇咬模型补齐

本批：20261014-104302-s2-strategy-proposal；角色silent，观察范围A10。只处理dispatch.json中的10个原ID；无research_request/implementation_request，不承接其他专题、提案或父请求。开工HEAD 31bddcc5fa17f56331238ca95f0e99dbc1ec7484，按普通任务合main后基线e1a5917174ea62adbba6c3d5ce82014a7dd507f4；原始日志和三个dirty历史源码身份保持。游戏事实只来自本批三局原帧。

## 本次有充分证据的原提案子项

原ID：silent-proposal-763a4b9d9f17b815（十四项机制组合中的普通蛇咬预览）；账本silent-0087，来源experience-update/20261008-053105-experience-update，实现strategy-proposal/20261014-104302-s2-strategy-proposal。沿用Roy-2026-10-07-learning，不新建重复代码提案。

证据7X0W3U8TVA2A：F30T3 decisions281940/states288388→288389，敌HP68不变，毒10→18，能量2→0；F31T1 decisions281955/states288404→288405，前段HP50不变、毒0→8，能量5→3；F31T13 decisions282020/states288469→288470，前段HP12不变、毒0→8，能量2→0。三张实际所打普通蛇咬均显示base/enchanted=7,current=8,is_modified=true,was_just_upgraded=false，2费，保留/给予8层中毒；三现场都持有SNECKO_SKULL。一个相关局的三次施放，不当作三局独立收益样本。原字节绑定见source-manifest.json；生产固定输入见agent/tests/silent-snakebite-preview-evidence.json。

旧行为：modelHandCard只接受普通PoisonPower.current=7或已有升级10预览；本局8预览变成unknown/flatValue=7，未把实加8毒送入求解器。新行为：只在silent A10、普通2费、固定目标/费用/文本及上述单一动态变量指纹匹配时读取现场8，不额外加头骨1，不从7推定未来8，不补升级/重放/免费/未知文本或其他角色。原7及原升级10分支保持。完整SL、药价及终局规则不调整。

反例与限制：本局三次加毒均未立即扣敌HP；F31最后1血/14挡仍失败，施毒并不等于胜利。普通预览7、其他等级/角色、不同动态值/文本/附魔都是适用边界；不把本项扩为所有毒牌的通用头骨模型，不推modifier-dependent神化升级。历史dirty源码无法完整复原。模型固定回放中的主动隔离结算不冒充历史整轮实值。

验证：7个固定回归覆盖三次实际预览/药效、生产modelHandCard→replaySteps消费、原7、其他角色/等级/未知形状及神化升级留未知。撤回新增源码分支须有4项失败，恢复后7项及已有普通/神化蛇咬回归通过；全部结果保留固定日志。代码提交前按沙箱入口跑tsc/vitest并扫描gitleaks，实际live合入后才登记版本/双通知。回退只逆向本次独立源码提交，不覆盖原7/10分支、知识刷新或原日志。

该子项完成不等同原十四项组合已完成；原ID最终仍按缺失的联合消费者及未观察条件处置，不以局部实现标整包duplicate/implemented。其余原提案亦逐项保留缺证范围。

## 十个派发ID、关联账本与待验证范围

### silent-proposal-0802f69b28d25079

来源：postmortem；领域：combat,potion,sl；证据局：MTQ0EUBJ3R6T；账本：silent-0079,silent-0019,silent-0044,silent-0080,silent-0253,silent-0011,silent-0214,silent-0189,silent-0046,silent-0222,silent-0243,silent-0262。

原文：/home/dw/Projects/agent-sts2/learner/runs/20261008-051302-postmortem/proposal-sl.md；已核SHA256=79e1696de63d19810eb442ee3afa83dd5795f1693f4c9f4a48433fef014e3596。

处置依据：MTQ F23T3同盘多6即时净扣/多损8已核；四试整战执行归属、受控成对完整赢线及独立留出不足，不能拟合新SL权重或药水门槛。

### silent-proposal-f54e8de2381c1250

来源：postmortem；领域：combat；证据局：MTQ0EUBJ3R6T；账本：silent-0125。

原文：/home/dw/Projects/agent-sts2/learner/runs/20261008-051302-postmortem/proposal-guard.md；已核SHA256=db780eb4b443cc8fdfb17237293f186588b1b010347160b24d1d22291ae8c5ce。

处置依据：MTQ F11T1候选14/6损、14/16伤已核；弃连续反弹后重问迷雾，实际20净扣不能归原plan1，缺完整候选认证与实线可比排名。

### silent-proposal-763a4b9d9f17b815

来源：experience-update；领域：combat,potion；证据局：7X0W3U8TVA2A,MTQ0EUBJ3R6T；账本：silent-0005,silent-0006,silent-0011,silent-0013,silent-0044,silent-0046,silent-0053,silent-0080,silent-0087,silent-0189,silent-0214,silent-0222,silent-0235,silent-0253。

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-053105-experience-update/proposal-mechanisms.md；已核SHA256=989dcea2a0dd5cad05d276157131dec57fdb9d17b2bdab66cbd25f32e0e9ad39。

处置依据：本次补普通8毒蛇咬子项；十四机制的联合固定消费者、头骨直接施毒/药水边界及未知修饰条件仍未完整验收，不关闭整包。

### silent-proposal-19a5cff2094e2d8f

来源：experience-update；领域：combat,potion,sl,terminal；证据局：7X0W3U8TVA2A,MTQ0EUBJ3R6T；账本：silent-0021,silent-0064,silent-0079,silent-0133,silent-0125。

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-053105-experience-update/proposal-sl.md；已核SHA256=7bf15ce1f8fd2291d52b8d24fc89de1fe613e8fd9812d31621f9cd48c8e2d57d。

处置依据：7X F31暂死/重接与MTQ全败探索分别可观测；缺修正模拟输入到完整实际终局的受控回放及反事实，全败样本不能证明实盘必死。

### silent-proposal-3540bf4360bf80af

来源：experience-update；领域：structure；证据局：7X0W3U8TVA2A,MTQ0EUBJ3R6T；账本：silent-0019,silent-0020,silent-0243。

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-053105-experience-update/proposal-resources.md；已核SHA256=58181f916f63872302d0ab2342b349e5de205083aa365151b8f4bcb79c1b63ce。

处置依据：MTQ F19/F20赢战耗血、F24未达以及7X资源转移已核；缺回血/药水/SL逐源进入路线与休息的全消费者读回及可比改线结果。

### silent-proposal-0ea5c0b9c030fdd6

来源：postmortem；领域：combat,potion,structure；证据局：KFRDELW2TH2P；账本：silent-0274,silent-0247,silent-0027,silent-0016。

原文：/home/dw/Projects/agent-sts2/learner/runs/20261008-054302-postmortem/proposal-sloth-potion.md；已核SHA256=ed57d3f8b54f0d056efe2e488a4dca2c2b32a7062433c636e71a51b395663391。

处置依据：KFR奇巧名额/能量事实及窄毒药6子项已有；完整后继明确未验证，缺换目标合法序列到实际收益兑现及提前饮用整战对照。

### silent-proposal-f915ec544ab94b6e

来源：postmortem；领域：combat,sl,structure；证据局：KFRDELW2TH2P；账本：silent-0079,silent-0125。

原文：/home/dw/Projects/agent-sts2/learner/runs/20261008-054302-postmortem/proposal-sl-tradeoff-guard.md；已核SHA256=2339e1598f60a64fa1db9be3ebe3cecfe7057ff323c14f15341ccce85b15de98。

处置依据：KFR F12生成小刀即重问，完整护栏线未实打；F33同盘多10伤多损6、两线仍败，缺完整绑定/同条件整战校准。

### silent-proposal-8fb51933639faf90

来源：experience-update；领域：combat,potion；证据局：KFRDELW2TH2P；账本：silent-0005,silent-0006,silent-0027,silent-0189,silent-0276,silent-0277,silent-0278。

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-061302-experience-update/proposal-mechanisms.md；已核SHA256=540a529f428b0c342abb969c3d040446149db3d7fb4f855b23f4b950462a64ab。

处置依据：KFR窄毒药6已覆盖，旧仅双boss限制不沿用；七项能力/药效联合消费者、覆甲完整减层触发及未知修饰条件仍缺隔离验证。

### silent-proposal-b3bc0eb09211af6c

来源：experience-update；领域：combat,sl,terminal,structure；证据局：KFRDELW2TH2P；账本：silent-0021,silent-0079,silent-0102,silent-0247,silent-0274。

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-061302-experience-update/proposal-sl-selection.md；已核SHA256=f3279ab3f48180d287e7ad57c0a1484e56ed48910772aac748dd6faf32185bf9。

处置依据：KFR合法奇巧后继到真实终结的全链、替对象/提前饮毒/完整护栏替线整战反事实缺失；不由敌余血更少拟合终局权重。

### silent-proposal-fdc3a505fe5e1a55

来源：experience-update；领域：structure；证据局：KFRDELW2TH2P；账本：silent-0019,silent-0020,silent-0243。

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-061302-experience-update/proposal-resources.md；已核SHA256=9591f8717f33da220db658aaa746a04412cd9b324bb60fbb2f9a376a0796ea75。

处置依据：KFR赢战血价/幕间回复与SL恢复分源；缺路线/休息题面逐源消费者读回及可比休息/锻造/替路线整战结果。


## 本批最终实际状态

源码子项提交7ec8096e441313fc50ab669cde512e3781a194f5；固定撤码4失败/3通过，恢复18通过；指定绝对TMPDIR的完整沙箱tsc0/vitest3810通过。live锁内刷新提交cf683f1dba35fd8bb5f664ab86d3d241e3d93bbd保留；17记录/论文冲突导致预检停止、未启动merge。本补丁未上线/无版本/未标shipped，10原提案仍waiting。详本目录report.md与result.json。

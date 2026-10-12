# 静默猎手：升级刀刃之舞生成模型边界

来源任务：20261013-034301-postmortem／postmortem。实现任务：strategy-proposal。账本：silent-0450。领域combat。授权：Roy-2026-10-07-learning。实现目标silent已观察A10；先验/最早证据另有同角色A0，不外推其他角色、未观察进阶、自动或重放组合。

主证据4ATPGGUBWG8L：F21奖励d368579拿升级刀刃之舞；F28 T3 s379481／482已知牌文添加4张小刀、Cards=4。d368647 plan2“匕首雨+→刀刃之舞+”却报cards_drawn4，量化动作把BLADE_DANCE记draws4、draw_budget4、unknownHand4。该候选未实际执行，不能说本局实际抽了四牌或直接因此致死。原抽取/偏移/SHA在evidence-manifest.json和相应JSON。

旧代码定位（本次只读live b21fd57c87bd1b6b1226bc1a76b011447637dd7b）：agent/src/reflex/card-model.ts:970限定未升级、Cards=3及普通文本；:980剩余Cards走抽牌；:1033普通生成三SHIV。agent/src/reflex/turn-solver.ts:1771还把升级bladeDance列未验证生成。card-model和turn-solver的当前blob与本局启动f791ed9源码相同，完整dirty数据树未复原。fix-queue未列此升级边界；silent-0324／S1.blade-dance1修的是普通版，不覆盖升级。

最早/prior核对：同角色首局C48LLXBGKXQ9 F9 T1 d205445已把升级牌报cards_drawn4，s209369的实际文本为添4小刀。F12 T5 s209437→209438中原四手牌的一张升级舞离手，三旧牌保留，新增四SHIV，能量3→2；随后第二升级舞也有四刀入手。该首局尚未有本角色学习，prior=no、first_run回溯C48。原件在prior-C48-decisions-index.txt、prior-C48-states-index.txt及prior-C48-upgrade-generation.json；不修改旧0324结论来声称其升级范围已上线。

拟行为：在已观察升级文本/角色/进阶门槛下，将Cards=4作为生成数，而非抽牌；复用普通生成模型的现有手牌保留、真实容量、牌去向、费用及后继重规划。不把生成当自动出牌，也不把4刀的名义伤害立即扣敌血。先以这组A10真实手牌输入验证已知生成身份、既有普通牌分支不退化；A10实际施放、容量边界、柔嫩逐刀后继仍需单列缺证，不能从A0的一次生成假定所有A10组合已隔离验证。必要时先消除假的抽牌、把尚无足够证据的生成边界标未知，等待新局，不维持明知假的抽4。

样本/时间切分：C48提供早期明确生成和先验，本局只验证升级误读仍在及当前现场文本；按局分开，不将116旧候选或26生成帧当独立局。固定回放主证据候选与A0早期完整前后帧，保留原旧模型作为负对照；新的A10实际生成作为留出，不凭候选本身增加机制置信度。

验证：升级题不得再生成fake drawBudget/unknownHand4；普通版生成三、已知真实手牌容量和后继选择保持正确；铁甲战士和未观察条件行为等价；重放/自动/封抽/多刀柔嫩等未覆盖时显式未知。实现后按固定沙箱自测和原live流程合入，预期修复题面及候选机制真实性，胜负收益未知。回退revert独立升级分支提交，保留普通版旧修复、原失败、账本及报告。实际合入后登记版本和双通知；当前pending，不提供implemented_commit，不冒称已修复。

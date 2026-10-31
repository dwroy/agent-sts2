# 静默A10感染棱柱单行动数字核验与原提案接续

来源任务：20261023-174301-strategy-proposal，learner-batch:c4c03399-a890-493b-b218-a06d706abad1。本批为普通任务，未领取proposal_ids/proposal_repair，未绑定专题或实现请求。只选择fix-queue-v4.md已有silent-0579核验；原代码提案silent-proposal-08f9b6f1658b5d7b、账本silent-0579/0168，沿用原ID，不新增同题提案、不改原文。

## 已核证据与拟交付行为

HD6BM39PYL21，Silent/A10/F27/T6，一个独立自然对局。

- 完整原题d476130b-6d77-4b70-abfb-6c95e470efe2：c5防御8挡，incoming_damage_after_this=5；技能原文同时明确获得6污染。Jev选c5，confidence=.87；survival仍选lethal，confidence=.91、probability=.93。decisions第497860行chosen为play_card/index5，result=completed，gate_reject和selection_dispatch均未记录，不补成成功闸或整线回执。
- 后继原states第516545→516546行：同run、同T6，手牌移除防御，能量4→3、挡0→8、污染0→6、敌方当前攻击意图13→19，玩家HP仍为10。已知当前攻击分量19−8=11，原题少计6。11是当时意图下的攻击分量，不是实际扣血或完整回合净损。
- 完整原题ab4dd43c-ba3b-4105-a9eb-6835016b52f0：蛇咬+候选仍写11；Jev选c0->e0，confidence=.12，survival=lethal。decisions第497861行chosen为play_card/index0/target0，completed；两回执字段同样缺失。states第516546→516547行：能量3→1、污染6→12、意图19→25、敌毒11→21，HP10、挡8均不变。当前攻击分量25−8=17，再少计6。
- states第516552行GAME_OVER：HP0、敌HP22；不能据题面修正推导另一选择本可获胜。两题及共有开卷对象完整核读，后者包含external:spire-codex资料，但本结论仅使用本系统现场字段及后继，不采用其外部数值来补机制或进阶范围。

逐行source_size、offset、bytes、SHA、identity/decision_ref在question-*.json、selected-decisions.json、selected-states.json、verified-refs.json；均独立seek原logs核SHA，非引用旧报告代替原文。v6-evidence和evidence各自的冻结切点保留，不混写。

旧行为：现有单行动incomingAfter只从旧incoming扣新挡与留手损失，加牌自伤。预期行为沿原提案：在已核Silent A10条件下计入所选技能造成的新污染，防御数字5→11、后续蛇咬11→17；无法覆盖的交互保留未知。候选不删选项，不给牌/药水/SL/终局增加固定禁用阈值。铁甲及未观察A11必须保持等价。

## 本批处置：waiting

原20261023-154301批已有三叶候选，ops冻结staged tree=1794ba1c37aadd6fc14a8c2d7de359fe8e3695de；本次只读核三个实际文件SHA与原host-check-handoff.json完全相同。原交接明确要求“不重复学习/新模型，只由原ops协调原宿主完整检查”。source_commit=null、完整沙箱历史45失败且无终局回执，尚无可认作live祖先的修复提交；本批核live的combat.ts仍为旧算式。因此不能登记duplicate/implemented/shipped，也不另写第二份修复或借用原定向9过作本批测试。

原owner补齐精确组合完整检查exit0、实际源码提交、live发布和消费者回执后才能改变处置。本批只补原账本追溯，不改变提案领取/请求状态。

## 反例、验证与限制

防御题Jev已判断lethal，是数字错误未必改变危险判断的直接反例；没有本场受控胜线，不断言修正提高胜率。两次技能不是两个独立局样本，不新增support/repeat分母。KUHYZBFFLALU的49层原入口43/73、空药，T8奖励19/73且终局is_victory=true，仅限制“空药/此入口必败”的泛化，不推出通用安全HP线；GAME_OVER摘要的HP0与战后19分别保留，不能把摘要HP0当死亡。

固定回归、撤码失败/恢复通过和完整沙箱交原已有候选继续；本批未更改生产源码/知识/任务模板，不跑tsc/vitest，不制造测试、提交、eval版本或合入。原三叶负控/定向结果仅作为原交接记录。未来自然Silent A10的同条件样本可作时间后移验证，须固定代码与输入、保留反例；A11不外推，不拟合新参数。

若原候选后续发布发生问题，仅回退实际窄发布的源码提交，保留本批及原候选的日志、账本与失败。当前本批没有可回滚代码。原科学父要求、量化收益及自然消费均保持开放。

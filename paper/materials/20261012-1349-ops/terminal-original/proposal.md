# 本批策略提案与处置

记录时间：2026-10-12T13:24:37+08:00

角色 silent，六个派发来源局均由原 runs.jsonl 唯一行核为 A10。本批普通 proposal 队列，不承接纯研究或量化实现请求；初始树干净，merge main 已是最新。基线 c425b7b7b36f4a7ca1532ca62a6b8dd7d1da2216。只处理 dispatch.json 中十个原ID，保存原Markdown并逐个SHA一致；没有新建重复ID。

## 本次有限实现：终局观测配对

沿原 silent-proposal-e5b87be50f28f311 第3/4项实现，不新增策略参数。账本 silent-0079、silent-0021；来源任务 postmortem/20261007-164302，当前实现任务 strategy-proposal/20261012-131301。

直接证据：8JRE1C4H4Z2W F33第6次T11，原 decisions 270441→270442，states 276433→276434，末次结束回合完成后 run/finalize 的 sl_attempt=null、sl_reloads=5不变。前帧玩家5血22挡、敌154血/显示37攻击；结束页玩家0血、敌130血。冻结原字节偏移与SHA见 raw-verification.json、terminal-fixed-input.json，测试夹具只取这些原字段。

旧工具的普通相邻区间要求同尝试、COMBAT/CARD_SELECTION端点，所以本已记录的结束页被排除；且仅segments输出动作会遗漏没有plan-choice的代码结束回合。本次加 observed_actions 和独立 terminal_observation：只有已核失败局的连续结束回合/最终结束页，决策与状态各自原行号连续、相同局/层/轮/重载、唯一匹配且时间吻合才记录净HP端点。普通SL边界不放宽。

输出实际净损5、敌方净扣24；37−22=15仅是显示攻击减当前挡的算术参考，actual_uncapped_damage仍null，不把显示参考当完整真实入伤。结束页能力清理不解释为持续效果到期；同型多敌、名单/上限变化不给实例归因。所有未确认派发、缺帧、跨SL、结束时间不符保持unknown。离线工具不接游戏、不改变任何在线角色选择。

反例与限制：本局首/三试T2同盘实付3/15血、实扣10/17只验证不同执行结果，不证明可胜；F17T6重问后的结果不能归给初候选；末次T11终局只有零血截断净损，不能观察截断后的总伤；五次提前SL缺终态，禁止补造。同一局六次尝试仍n=1。

验证：精确原帧固定测试覆盖正例与pending/拒绝/跨SL/缺帧/重复帧/非零血/结束时间/名单变化反例。撤原生产接线使指定用例1失败（19跳过），恢复20通过；初轮四个相关测试文件51通过。沙箱完整与离线CLI结果另见report，未把发现样本叫盲测。没有拟合，后续独立完局才可评估自然采用与策略效果。回退本次源码提交即可，保留全部冻结证据和失败记录。

## 十项原提案逐项核验

### silent-proposal-89354805ee4d7e77

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-apotheosis.md。来源任务：postmortem；实现任务 strategy-proposal。
证据：VLZ6CCT8AQ0A F35T1、F43T1/T2、F45T1。账本：silent-0237、silent-0238。
本批处置：waiting。神化升级传播与萎靡子项已有live源码；仍缺在线事实中持有、实际施放、每个候选覆盖的完整联合验收。未观察的升级/属性交互保留unknown，不规定必打。
验证/预期行为：只允许由原帧支持的事实进入模型或审计；有固定生产调用后逐项比较，所有候选保持。未知/未选分支不作已实现或胜线。回退与限制沿原文，当前无足够证据修改相关策略参数。

### silent-proposal-f2bfceddb1898dca

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-154302-postmortem/proposal-budget-and-clock.md。来源任务：postmortem；实现任务 strategy-proposal。
证据：VLZ6CCT8AQ0A F45T1/T4/T5。账本：silent-0106、silent-0019、silent-0201。
本批处置：waiting。707ms/1-of-12是旧题的一次预算观测；缺覆盖相同、固定随机输入、同总预算下的配对曲线及排名稳定性，不能据此改预算或药水价格。
验证/预期行为：只允许由原帧支持的事实进入模型或审计；有固定生产调用后逐项比较，所有候选保持。未知/未选分支不作已实现或胜线。回退与限制沿原文，当前无足够证据修改相关策略参数。

### silent-proposal-283a164780d11e69

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-apotheosis.md。来源任务：experience-update；实现任务 strategy-proposal。
证据：VLZ6CCT8AQ0A F35T1、F43T1、F45T1。账本：silent-0237、silent-0238。
本批处置：waiting。与89354805ee4d7e77同源；升级子项已上线，但持有/施放/候选覆盖消费者仍未闭环，不将父项整体登记duplicate。
验证/预期行为：只允许由原帧支持的事实进入模型或审计；有固定生产调用后逐项比较，所有候选保持。未知/未选分支不作已实现或胜线。回退与限制沿原文，当前无足够证据修改相关策略参数。

### silent-proposal-ebbfe3b97548756d

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261007-164302-experience-update/proposal-mechanisms-and-resources.md。来源任务：experience-update；实现任务 strategy-proposal。
证据：VLZ6CCT8AQ0A F43T1—T5、F45T1—T5。账本：silent-0005、silent-0016、silent-0049、silent-0071、silent-0143、silent-0046、silent-0053、silent-0027、silent-0011、silent-0021、silent-0106、silent-0204、silent-0020、silent-0019。
本批处置：waiting。十五主题仍需逐源贡献、期限、逐实体及整条执行资源链的联合消费者验收；单个神化或终局审计子项不覆盖全项。未选focus/休息没有同盘整场对照。
验证/预期行为：只允许由原帧支持的事实进入模型或审计；有固定生产调用后逐项比较，所有候选保持。未知/未选分支不作已实现或胜线。回退与限制沿原文，当前无足够证据修改相关策略参数。

### silent-proposal-e5b87be50f28f311

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261007-164302-postmortem/proposal-combat-sl-audit.md。来源任务：postmortem；实现任务 strategy-proposal。
证据：8JRE1C4H4Z2W F33第1/3次T2、第2次T5、第6次T11；F17T6。账本：silent-0079、silent-0021、silent-0125、silent-0018。
本批处置：waiting。本批实现末次T11终局观测子项；预测审计、单步回执、能力端点已有live源码。完整候选执行、各类重规划和全链审计尚未全部验收，父项仍waiting；此为工程验收范围，不要求先有获胜反事实。
验证/预期行为：只允许由原帧支持的事实进入模型或审计；有固定生产调用后逐项比较，所有候选保持。未知/未选分支不作已实现或胜线。回退与限制沿原文，当前无足够证据修改相关策略参数。

### silent-proposal-49632bc4878fb597

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-strength-weak-observation.md。来源任务：experience-update；实现任务 strategy-proposal。
证据：CA5KE8GFJ9X2 F13T1—T5。账本：silent-0005、silent-0231。
本批处置：waiting。已核加压0→4→8和喷水11→15→19；本来源无正敏捷配对，尚缺力量/逐击/敏捷/虚弱/独立成长联合固定消费者验收，不新增统一血价权重。
验证/预期行为：只允许由原帧支持的事实进入模型或审计；有固定生产调用后逐项比较，所有候选保持。未知/未选分支不作已实现或胜线。回退与限制沿原文，当前无足够证据修改相关策略参数。

### silent-proposal-66532328a585941f

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-deck-burst-observation.md。来源任务：experience-update；实现任务 strategy-proposal。
证据：5PM6JAQG6FNQ F33、F39末次T2。账本：silent-0021、silent-0009。
本批处置：waiting。持有/计划/建立仍缺完整在线消费者验收；改变启动或构筑权重另缺同入口、同抽序的完整比较及可复现收益函数。空打冒泡的一次观测不足拟合阈值。
验证/预期行为：只允许由原帧支持的事实进入模型或审计；有固定生产调用后逐项比较，所有候选保持。未知/未选分支不作已实现或胜线。回退与限制沿原文，当前无足够证据修改相关策略参数。

### silent-proposal-43a76a31ba7bdcfa

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lagavulin-siphon-poison-sl.md。来源任务：experience-update；实现任务 strategy-proposal。
证据：61E2QS63Y9WU F17T5—T7。账本：silent-0030、silent-0027。
本批处置：waiting。吸取后负敏捷及毒的联合生产调用尚未完成本批固定验收；改SL阈值或偏好缺相同入口HP/构筑/抽序下完整另一线路，首试胜利不补这个反事实。
验证/预期行为：只允许由原帧支持的事实进入模型或审计；有固定生产调用后逐项比较，所有候选保持。未知/未选分支不作已实现或胜线。回退与限制沿原文，当前无足够证据修改相关策略参数。

### silent-proposal-5264153a4a4b0e5c

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md。来源任务：experience-update；实现任务 strategy-proposal。
证据：61E2QS63Y9WU F23T2—T5。账本：silent-0039、silent-0209。
本批处置：waiting。召唤、航行、逐实体成长及索引重排尚缺联合固定消费者验收；未选focus幻象只有候选，无后继实打，不规定固定首杀。
验证/预期行为：只允许由原帧支持的事实进入模型或审计；有固定生产调用后逐项比较，所有候选保持。未知/未选分支不作已实现或胜线。回退与限制沿原文，当前无足够证据修改相关策略参数。

### silent-proposal-bddfa690a84e03d0

原提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md。来源任务：experience-update；实现任务 strategy-proposal。
证据：DUZUBAJ3A8GP F30四次尝试T1—T6。账本：silent-0128、silent-0079。
本批处置：waiting。已核睡眠自然醒与后段成长；本来源缺提前唤醒/STUNNED接续配对帧及同抽完整另一线路，四次失败不校准输出血价或全死排序。
验证/预期行为：只允许由原帧支持的事实进入模型或审计；有固定生产调用后逐项比较，所有候选保持。未知/未选分支不作已实现或胜线。回退与限制沿原文，当前无足够证据修改相关策略参数。

## 复核材料与边界

十份原Markdown的SHA全部匹配。原始复核覆盖 VLZ 699决策/729状态、8JRE F33连续232决策/232状态，以及CA5/61E/5PM/DUZ各282/462/660/623状态；前四局状态区间SHA与保存清单一致，VLZ逐原偏移对象一致。核查关键楼层/回合，不把保存全局状态数量称为全局逐机制验收。
已有live祖先：dc0e6080cb20c508d94c006648cc3edf0188d306（能力/净HP端点）、07192e6faf1da89c2719e22b3e0c280617795f22（手牌与观测区间）、b2805be4ba44b7375c7908d873889372cc3cfe6c（神化萎靡子项）；逐项祖先核验见 existing-source-ancestry.json。这些只证明子项，不关闭父提案。
不改经验库、怪物数据库、在线求解器、药水/SL/终局权重；其他角色保持等价。没有量化专题产出、不冒称大脑已采用。不新增eval版本或shipped，实际合入由后续记录说明。

## 本批最终交付与合入回执

2026-10-12T13:40:43+08:00：源码 83512ddcd2c70fd9b983dc38524ff25c8970c1d3 已提交。完整沙箱tsc0、335文件3356项通过；撤接线1败/恢复20过，CLI终局子项通过。根账本26条提案链接及2条源码链接均经CLI追加，未标shipped。

锁内先保存刷新提交 05a9d85fb3e11d5100d658094df83c1bda649f7d，本次五路径与刷新知识零交集；三方预检9个共享记录文件冲突，停止而未实际merge，原两份脏notes字节保持。merged=null、无新eval版本。原e5b父提案仍waiting，有限终局子项待运维沿原链兜底；其余九项保持具体缺证据/未完成联合验收原因。详细源、失败、测试、冲突与回退材料见report.md及live-merge-result.json。

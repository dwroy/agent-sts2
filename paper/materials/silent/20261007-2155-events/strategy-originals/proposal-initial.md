# 本批策略提案与逐项处置

角色 silent；本批 20261007-203653-strategy-proposal，scratch 20261007-203654-strategy-proposal；来源 ascension-audit / postmortem / experience-update；实现 strategy-proposal。授权 Roy-2026-10-07-learning。基线 main 合并后 37e54b08304f3af5a9d664eee42049de96756551。

## 实现：F48首Boss与F49当前Boss事实（4cc200cc9747f4a8）

账本 silent-0228。已核原帧 JMH5C51RLN4E A10 F48奖励/地图 states L243532—243533→F49 T1 L243534；9TG1RP5LFAAK A10 F48奖励/地图 L244372—244373→F49 T1 L244374。两局地图都有首Boss r14c3已访问及第二Boss r15c3待访问；F49敌人分别AEONGLASS和QUEEN/TORCH_HEAD_AMALGAM，raw boss_id仍TEST_SUBJECT_BOSS。资源仍8/17HP。原提案Markdown和指纹、账本原行、六原帧均保存本目录。

旧行为：F48奖励解释成本幕结束；F49构筑/运行计划/时钟仍显示TEST_SUBJECT；floors_to_act_boss未知。新行为：只门控silent、A10、第三幕、LEVEL_10效果、F48/F49；分列first_boss_defeated、observed_remaining_boss_nodes（无地图为null）、current_boss、原boss_id及stale、act_complete。F48首战结束后F49距离1、身份未知，跳过刚结束首战模拟；F49据实际敌人确认AEONGLASS/QUEEN并读取当前进阶冻结数据库事实，未知遭遇不套首Boss。runPlanInput使用同样事实，不改原始state。F49非战斗结束状态act_complete保留未知，无F49胜局证据。

反例/边界：F48正在战斗并未击败；无LEVEL_10、其他角色、A9/A11、其他幕维持原事实；未知F49敌人不猜。较晚9TG不同Boss为时间后置验证，但两局均已用于发现，不冒称盲测。结构条件不拟合参数；怪物事实仍从当前进阶首样本读取，房间代价5样本门槛未变。

验证：从六原帧取实际被消费字段，保存固定agent/tests/silent-boss-phase-states.json；空模板和固定同进阶monster-db夹具，不依赖刷新数据、不联网/调用LLM。集成验证buildFacts、runPlanInput、bossClockJson、withBossSim跳过与原state保全；撤生产改动重现旧事实，应失败，恢复应通过，再按原入口自测。无关角色保持等价。本次只改给模型的阶段/身份事实，不改血量、药水、权重和行动选项，无胜率承诺。回退独立本项源码提交，保留0163/连战功能、原始证据与账本。

## 其余派发提案

共10项，逐项原文保存在silent-proposal-*.original.md，所有原路径sha256均核对通过。后续处置与源码/实盘核验写report.md；重复项必须有实际live源码祖先，缺数据明确waiting，不用经验提交代替源码实现。

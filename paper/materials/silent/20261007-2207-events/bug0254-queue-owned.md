
## 2026-10-07 22:10 学习闭环新增非阻塞统计 bug（TXZ6RVMQA09D）

- [ ] **silent-0254：无出牌决策的死亡战斗漏记，death_fight误用上一胜战**。学习者定位ops/report.py:130以COMBAT决策开窗口，:337/:380取fights[-1]归因。静默A10 TXZ6RVMQA09D：runs.jsonl:587及自动局报误写F48 AEONGLASS，states:281563是F48胜后奖励4/62；281565—281566为F49 TEST_SUBJECT #C65开场4→0、敌111/111；本场0出牌/0COMBAT决策，只有275405 GAME_OVER finalize，22攻击未执行。证据和原始报告见learner/runs/20261007-214301-postmortem/bug-death-fight.md及本轮归档。
- 本局正常结束，此项只影响战斗窗口和死因统计，按普通纯工具fix-batch排队，不按卡死修对局。沿学习者建议用同run状态流补无动作死亡窗口，保持SL尝试、实际死亡房间/敌人和可观察失血来源，未知敌攻击不补；固定验证本局F48胜后→F49开场死亡，并保持普通死亡/胜局口径。原logs/旧runs/旧自动局报只读，历史勘误留在可追溯派生或追加记录。首证/prior/observed沿原CLI，不把机制0255或已测阶段事实0251当0254修复，不重复派游戏规则提案。

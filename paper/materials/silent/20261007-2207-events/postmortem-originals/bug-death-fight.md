# 新统计bug：无COMBAT决策的新死亡战斗漏记

证据TXZ6RVMQA09D、SILENT A10、账本silent-0254、来源postmortem/20261007-214301-postmortem。建议调用方派纯工具fix-batch；本任务未派agent或实现代码。

runs.jsonl:587及唯一自动局报误写死于F48永世沙漏AEONGLASS，实际states:281563 F48奖励、4/62；281565—281566 F49实验体#C65 TEST_SUBJECT、4→0、敌111/111，22攻击未执行。没有F49战斗动作决策，只有275405 GAME_OVER finalize。

当前只读live 734c08608055167fd220800439dbf7407cff6e57的ops/report.py:130以COMBAT决策开窗口，:337与:380从fights[-1]写死因，漏掉首帧开场死亡。notes/fix-queue.md未找到同项。下一任务应通过同run状态流建立或补充无动作窗口，保留SL尝试、GAME_OVER实际敌人ID/中文名、死亡房间和自动失血来源，不能只从最后出牌敌人归因，也不能在没有证据时伪造敌攻击数。

固定验证用本局F48胜后→F49自动死亡，另保留现有普通死亡与胜局行为。logs/只读，旧runs和旧自动局报不直接覆盖，历史纠错留在可追溯派生数据／追加记录。无新增游戏知识或玩法规则。此为纯统计bug，不通过策略提案队列另重复派游戏规则实现；最终bugs回报交调用方。

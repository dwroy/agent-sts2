# 中间结果保留说明

只读路径查找曾用错目录，rg退出2，原错误为：
- rg: .worktrees/live/agent/src/decisions/combat-plan.ts: No such file or directory (os error 2)
- rg: .worktrees/live/agent/src/sim/turn-solver.ts: No such file or directory (os error 2)
随后通过rg --files定位实际reflex/目录；这是抽取过程的路径错误，不是游戏代码bug。

draft-v1.md曾把F49末试T2题面伤害20误写17，并误把T3题面22解释为只算聚合体；这两处均在实际追加之前核对计划criteria及毒／反伤后改正。draft-prefix／middle／suffix／end、draft-v1、最终draft-v2及抽取脚本全部保留。notes/lessons.md只用append-section.sh中的一次cat追加draft-v2，原文没有改写；没有需要追加的正文勘误。

追加后第一遍关键数字rg使用带空格的current_hp模式，没有命中紧凑JSON；管道末端Python正常退出，不能据此视为已核数字。第二遍改为允许空白的模式，19个关键源帧均命中，输出保存在post-append-numbers.txt；随后再grep了正文的F48/3与F49/6资源及逐回合向量。

所有CLI登记均成功，无实现、合入、推送或上线；历史dirty源码、整场反事实、路线投影与时钟数据缺项保留在正式复盘和提案中。

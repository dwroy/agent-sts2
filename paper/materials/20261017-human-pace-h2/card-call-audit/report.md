# 25MF 拿牌调用核查

结论：33次是33个实际待选拿牌界面，分布在25个楼层；其中8层各有两组不同候选。不是同一问题重问或重复原生调用。

原生33个question_id，32 answered、1 aborted（F43限时兜底）；大脑记录33条，reasks=0，32条attempts=1、1条attempts=0；33条实际决策均completed，reasked=0、reused_answer=0。

同层两组分别为F19、20、31、35、37、38、39、43。每组第一题实际拿牌后，第二题牌组规模+1、候选集合不同。这里只确认两个实际奖励机会，不由开发推断奖励加倍的机制。

复用H1既有完整冻结输入，不新增SQL、对局、模型或模拟。每个原始决策/帧/原生调用的offset、len、SHA及冻结截点见result.json和引用的H1 manifest。r1最近observed时刻匹配到了尚未展开卡牌奖励的帧，保留result-r1-nearest-observed-state.json；最终按同一决策日志时间选择实际题面帧，原SHA均复核，不改原记录。

“平时约20次”是这次指派中的比较值；本核查未建立新的历史控制窗口，不能从33题直接归因策略或胜率。

复算：nice -n19 python3 paper/materials/20261017-human-pace-h2/card-call-audit/audit-25mf.py。

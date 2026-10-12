# HAZE 施毒字段接线的纯 bug 修复

来源任务：fix-batch 20261007-173847；实现任务链接：strategy-proposal；角色 silent，实际核实 A10。账本 silent-0234，首证 T082DRCUHRRD A0 F46 T4，当前量化证据 DUZUBAJ3A8GP A10 F27 T4/T5。原复盘保存在 paper/materials/silent/20261007-1531-events/lessons-original.md。本学习者已流式核对当前局 623 个状态帧并保存 haze-observed-frames.json。

旧行为：已有 all 目标的施毒及回合末结算路径，但 HAZE 没有输出 poison。新行为：仅 silent 中实见的普通 PoisonPower=4、升级 PoisonPower=6 版本输出 poison 字段，复用原全体目标、Artifact 和减层路径。F27 T4 的 2→8 和 T5 的 7→13 都有施放帧与下回合扣血帧，不把即时施毒算为即时伤害。普通版本 F6 T1 的两目标施毒见同局复盘和日志牌帧。

无数值拟合或策略阈值；固定回归覆盖上述结算、多目标、Artifact、后续轮一次消费、其他角色及未见施毒变量不变。不读自动刷新知识，无 LLM/网络。反例与限制：其他角色、未见升级参数及未观察交互维持旧行为；没有同场整战反事实，不声称能转胜。不修改药水、SL、打法偏好或终局规则。

撤源码失败、恢复通过及原沙箱入口自测结果见本批报告。回退：revert 本批 HAZE 源码提交。授权仅为既有学习闭环，不作为游戏事实。

已自测源码提交：20b04517393708c73912326bb35d8448d1b3f77e；本批每次提交前原沙箱入口退出0。实际合入事实以本批 report.md 为准；未合入不登记 implemented/shipped。

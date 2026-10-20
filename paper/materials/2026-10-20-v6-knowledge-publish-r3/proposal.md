# R3 已验收出牌观察信号发布链

来源任务 v6-knowledge-publish，原研究 v6-reflex-distill-r3，批次 v6-knowledge-publish-r3-20261020-033408，请求 roy-20261019-v6，账本 silent-0532。角色 Silent；数值仅已观察 A10。授权来自本次冻结 authorization-original.md，不把授权当游戏证据。

旧行为：正式19条方案描述tag，无R3观察HP值。新行为：正式85条combat_line记忆，其中78条为实际完成且完整序列匹配的预存计划，到相邻下一轮ready帧的条件观察净HP损失；7条继续tag。只注释候选，不改变求解器、药水、SL或终局价值算法，不将观察均值当方案收益。17个旧同ID升级、2个旧tag只更新版本、66条追加。实际值、n、独立局G、误差、窗口、删失、反例和各条证据局/层/回合详 signal-audit.json、metrics.json 及原 statistics.json 的SHA关联。

本任务不拟合。保留原全历史/近期、first/including_sl四口径340行；19条单局不填SE=0，7条无完整计划HP结果不补数，340优先级未知。原代码/条件/版本选择偏差与无反事实限制不变。逐条原字节检查及范围列 raw-checks.json，抽核含高低损失反例，不删除负效应。示例 N9GKED3PMEV3 F17 T2 的净HP损失 -4；这只是该窗口的实际净回血，不能当某张牌因果疗效。

验证：原reflex固定CLI、正式loadV6Knowledge、原状态/计划predicate及combatEntryAudit、方向/拿牌/商店/休息固定题；未调用模拟/在线模型/游戏，不执行动作。正式244条经验原字节不变；核心主统计不变，只追加反向reflex链接。消费者signal/label/confidence/来源已按字段核回；n/design/method/G/删失仍在审计侧表，未冒已送达Jev。商店/休息题面按现有体积限制裁剪，不能称17个组合全部上屏。

回退：由ops在原live锁内仅恢复本次三个知识叶到发布前Git对象（before-manifest及source_commit），保留同期其他知识/源码；不整体回退、不恢复游戏或修改STOP。实际live/发布号和收益由原ops核实。本任务未请求另派实现批，现有消费者已经合main，原父要求未关闭。

登记使用真实 source_task=v6-knowledge-publish；若既有CLI不接受该任务名，保留原失败并交原owner处理，绝不伪装experience-update或手写提案队列。

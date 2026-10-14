# V5-S 首批实现边界与接续

本批交付 P0 离线基线工具和 P1 准备度 shadow。父请求 `roy-20261014-s-decision` 仍开放，不能以本批测试或报告关闭。

P1 在既有 B3 样本完成后作纯汇总，不重新模拟，不改 mandatory-completion、不增删候选；缓存身份纳入 readiness 开关，避免无字段旧缓存覆盖新模式。Silent 默认shadow只记决策日志；实际brain payload另计，shadow不冒称消费者送达。符号失败/归属未知、低可信分别保留原始数与闸因。

后续实现的三个技术边界：

- P2 选项对“最好选项”的标准误必须直接来自同身份配对样本。现有 `OptionSim.diff` 是相对当前牌组，不能用两个 `calSe` 相减/当独立量合并来冒充选项之间的配对标准误。商店、按卡删除/升级与单选题的答案路径要分别接校验器，不能只给新schema字段而漏掉实际validate/reask。
- P3 需要B2样本组审计与整组eligibility，保留wonLoss回退、HP/SL/药水护栏。当前4000条通过全属于一个B3冻结题，不是所有Boss或B2已通过的证据。
- P4 须在combat-plan构造英文短题面与并列组，不再把旧完整题面交日志层补裁剪。缺少SE不是零SE，也不证明并列；明确保留未知。原ablation样本用于对照和限定分析，不以选择过的32题推总体收益。full→tiebreak的规则变更、自然两局token验收和各阶段编号仍由原ops逐阶段核实。

本批不会启动play、重启当前局、改ops prompt、改其他space或读取游戏二进制。源/部署检查、原失败、自然shadow与后续发布分别记录。

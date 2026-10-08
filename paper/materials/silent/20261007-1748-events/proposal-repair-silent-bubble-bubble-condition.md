# silent-bubble-bubble-condition

角色：silent；本次已观察进阶：A10。
来源任务：experience-update / 20261007-153133-experience-update；代码实现任务：strategy-proposal；本次补链batch：20261007-170244-strategy-proposal。
关联原经验：silent-bubble-bubble-condition；原经验源码：7453c2ccf67a132e17d2f6c9bfc7fb8f13b56d7a。
学习账本：silent-0010、silent-0009；仅CLI更新proposed及链接，不标shipped。

证据局号/层/回合：5PM6JAQG6FNQ / F39 / T2。
失落35血无毒，冒泡前后敌血/毒不变，能量5→4；F38 T3已有3毒时实际补9至12。
原复盘：notes/lessons.md对应局号原段和已有追加勘误；未重写历史。原始核验：本目录evidence-manifest.json、verified-evidence.jsonl。

反例和范围限制：无毒空打仍是合法动作；其他目标有毒不能替代当前目标前置条件。

旧规则/现状与预期代码行为：复用 poisonRequiresExisting 的逐目标前置条件；保留选项，不新增强制禁打或评分权重。
现有实现源码：f6c5504a73b2ee3702812a5217dfcda8b14e18aa；已核为live实际祖先。现生产接线与本次base逐blob相同，见live-source-verification.json。

拟合及时间切分：仅核上述本角色实盘局面，不拟合新权重。此条本批为一个独立来源局，SL尝试不扩分母；未来新局作时间后置验证。原经验较宽asc范围和历史支持数不能当作本批跨进阶验证。
验证方法：冻结该局面手牌、能力、当前进阶敌人HP/伤害/移动表及实际出牌前缀，逐步比对毒/挡/玩家血/敌本体血。新增实现必须撤生产源码时失败、恢复通过，再跑原沙箱入口；不能调LLM/网络或依赖刷新JSON。
本次只做补链；已实现子项辅以8文件50例既有固定测试确认，existing-fixed-cases.log；没有为waiting条目冒报红绿或已验证实现。
预期影响：使这条经验有可消费、可追溯的代码请求或实际已有实现证明。本次不改变任何角色对局行为，不承诺整战转胜。
回退：本次没有生产代码需要回退；链接历史按CLI追加保留，后续实现须用自己的源码commit回退并通知Roy。
规则授权：Roy-2026-10-07-learning仅提供修改权限，不提供游戏事实；本次rule_changes=false。

本次处置：duplicate。复用 poisonRequiresExisting 的逐目标前置条件；保留选项，不新增强制禁打或评分权重。

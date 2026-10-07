# silent-bronze-scales-per-hit-thorns

角色：silent；本次已观察进阶：A10。
来源任务：experience-update / 20261007-153133-experience-update；代码实现任务：strategy-proposal；本次补链batch：20261007-170244-strategy-proposal。
关联原经验：silent-bronze-scales-per-hit-thorns；原经验源码：7453c2ccf67a132e17d2f6c9bfc7fb8f13b56d7a。
学习账本：silent-0129；仅CLI更新proposed及链接，不标shipped。

证据局号/层/回合：DUZUBAJ3A8GP / F30 / T6。
铜鳞建3荆棘，T4丝虫两击反6、甲虫单击反3；T6毒8和反3合11。
原复盘：notes/lessons.md对应局号原段和已有追加勘误；未重写历史。原始核验：本目录evidence-manifest.json、verified-evidence.jsonl。

反例和范围限制：玩家死亡后仍可有反伤结算；11不是11毒。

旧规则/现状与预期代码行为：逐击、完整格挡、死亡结算分开冻结；只有实际攻击才能兑现反伤，不修改药水代价。
当前没有经过本次核实的完整live实现证明。缺数据/验证：缺本次死亡/多攻击者边界的完整固定求解输入及敌方逐步结算验证，通用retaliate字段存在不等于所有边界已验证。

拟合及时间切分：仅核上述本角色实盘局面，不拟合新权重。此条本批为一个独立来源局，SL尝试不扩分母；未来新局作时间后置验证。原经验较宽asc范围和历史支持数不能当作本批跨进阶验证。
验证方法：冻结该局面手牌、能力、当前进阶敌人HP/伤害/移动表及实际出牌前缀，逐步比对毒/挡/玩家血/敌本体血。新增实现必须撤生产源码时失败、恢复通过，再跑原沙箱入口；不能调LLM/网络或依赖刷新JSON。
本次只做补链；已实现子项辅以8文件50例既有固定测试确认，existing-fixed-cases.log；没有为waiting条目冒报红绿或已验证实现。
预期影响：使这条经验有可消费、可追溯的代码请求或实际已有实现证明。本次不改变任何角色对局行为，不承诺整战转胜。
回退：本次没有生产代码需要回退；链接历史按CLI追加保留，后续实现须用自己的源码commit回退并通知Roy。
规则授权：Roy-2026-10-07-learning仅提供修改权限，不提供游戏事实；本次rule_changes=false。

本次处置：waiting。缺本次死亡/多攻击者边界的完整固定求解输入及敌方逐步结算验证，通用retaliate字段存在不等于所有边界已验证。

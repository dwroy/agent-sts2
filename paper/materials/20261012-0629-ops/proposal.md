# 静默A10：向Jev披露当帧已见召唤分支的推演缺口

记录时间：2026-10-12 06:17:17 CST。来源与实现任务均为strategy-proposal，批次20261012-061302-strategy-proposal。普通tick批次，无指定proposal_ids、无专题或implementation_request；基线358d6c7b11e51c07d4f63615935af78e81d83c0f，merge main无增量。

## 证据与账本

- 177AS39M1UPW / SILENT A10 / F5 T3：原始states s360523—527，decisions d350461。中和／打击／扫腿实际执行，玩家11HP保持；结束前旧目标6HP，呼援者14HP，另一目标21HP。下一轮见新的19/19同类体，两只9攻；原题下一轮威胁9，实际18。关联silent-0411、silent-0410。
- P33MKRP6S4Q4 / SILENT A10 / F39 T1→T2：s360354—360365、d350300。155HP组装师显示FABRICATE_MOVE/Summon；当轮净扣31到124，玩家6HP保持；新增21HP噪音和19HP电击。T2旧电击13→7后退场，T3另见24HP噪音、19HP电击和121HP组装师。不能把同类型新体视作旧带毒个体。关联silent-0347、silent-0348。
- 反例：P33MKRP6S4Q4 F8 T3→T4 s359724—359728同样CALL_FOR_BACKUP_MOVE后新增18HP体，s359734在T5进入REWARD。发生召唤不等于必败，不能推出必须先杀呼援者。
- 34条原始JSONL记录按既有复盘偏移回读logs并逐条比较，保存原字节、长度、偏移、SHA256于本目录evidence-manifest.json。十个派发局在runs.jsonl均为SILENT/A10；研究支持仅上述两局，不按SL或逐帧数量增加独立样本。

## 当前实现与限定新行为

当前boardRolloutInput只把ILLUSION_MOVE装入活体summons，并排除已存在的同类型。既有simulation_reference只提示一般未建模风险，没有指出当前这两个具体召唤分支。已有原提案silent-proposal-febf716b9ff8e85f和silent-proposal-cb4bc6134cca07c7包含完整召唤模型、弃牌等更宽目标；本次不把它们整体报implemented。

本次有限交付：仅silent、实际A10、仍活着且HP>0的FABRICATOR/FABRICATE_MOVE或TWO_TAILED_RAT/CALL_FOR_BACKUP_MOVE，且当前意图含Summon时，在现有Jev simulation_reference中列出槽位、敌ID、招式以及未覆盖增援的具体范围。数字、所有选项、参考排序、并列、解析器、自动动作与SL保持原样；Jev得到针对当前场景的限制说明。其他角色与未观察进阶保持完全相同。只表明当前模型缺口，不推定召唤一定兑现；死亡前清场、未知血量/数量/周期/顺序都不补常量。没有召唤标记的局面继续沿原通用限制文本。

## 假设、反例与未知

核验后支持的结论是“现有后续推演没有覆盖这两种当前可见召唤”，不是“先杀召唤者更好”。两局和重复尝试不足以拟合增援分布、攻击阈值或新排序；本批没有完整未召唤反事实、修后自然局或胜率收益。完整历史运行dirty树未恢复，本次差异定位针对已登记base。固定验证数据只取本角色原帧，不读刷新知识，也不将A6/A3参数搬入A10。

## 验证、预期影响和回退

冻结两局原帧；检验事实入口、当前召唤/不同招式/空意图/敌已死/其他角色/其他进阶。由实际boardRolloutInput确认相关summons缺失，防止将来补模后陈旧提示静默保留。Jev旧题面与v1题面均验证，停用新事实后逐项比较完整选项及解析结果，确保没有数值/排序变化。撤消费者源码应失败，恢复应通过；随后跑原test-sandbox.sh与gitleaks。

预期让Jev能辨认未覆盖增援的参考数字；实际采用和收益未知。回退独立源码提交，保留原simulation_reference、账本和证据。自测合入live成功后才登记版本与双通知；未合入不报上线。限定账本为silent-0423，既有0347/0348/0410/0411仅关联而不关闭；CLI提案ID、提交与验证结果见report.md及CLI回执。

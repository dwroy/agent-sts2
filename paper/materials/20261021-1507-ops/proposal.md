# 本批十项策略提案的证据处置

记录时间：2026-10-21T14:59:02+08:00。角色silent，观察进阶A10；来源/实现任务strategy-proposal，批次20261021-144302-strategy-proposal。base=3646de6b78ff34612a02c4bd0855e26b4310ae55。

本批只消费十个既有CLI id；不新增重复提案、不覆盖原Markdown。十项均waiting，未拟合策略参数、未改任何角色行为。

| 原提案id | 本批核验窗口 | 既有账本 | 处置与缺证 |
|---|---|---|---|
| silent-proposal-89354805ee4d7e77 | VLZ6CCT8AQ0A F35/F43 T1、F43 T2、F45 T1 | silent-0237、silent-0238 | 已有神化局部升级传播；缺跨抽牌、选牌、药水、SL及换战的实际施放持续身份与完整消费者校准，未知属性组合仍保留unknown。 |
| silent-proposal-f2bfceddb1898dca | VLZ6CCT8AQ0A F45 T1/T5；F35–45资源链 | silent-0106、silent-0019、silent-0201 | 缺完整模型下同起点、同随机池、同总预算的分阶段MC配对及成熟度曲线；707ms单题不能确定新预算、留药或集火规则。 |
| silent-proposal-283a164780d11e69 | 同首项 | silent-0237、silent-0238 | 与首项同源，但完整实际施放追踪及未覆盖升级交互仍缺，局部实现不能将整项登记duplicate。 |
| silent-proposal-ebbfe3b97548756d | VLZ6CCT8AQ0A F43 T1、F45 T1/T5（只覆盖部分机制） | silent-0005、silent-0016、silent-0049、silent-0071、silent-0143、silent-0046、silent-0053、silent-0027、silent-0011、silent-0021、silent-0106、silent-0204、silent-0020、silent-0019 | 九题仅复核十五机制中的部分现场值，缺全部属性、升级、期限与战斗/路线/休息消费者联合校准。 |
| silent-proposal-e5b87be50f28f311 | 8JRE1C4H4Z2W F33 首/第三试T2；第二试T5仅字段复核 | silent-0079、silent-0021、silent-0125、silent-0018 | 已有候选三阶段与单动作回执；缺跨抽牌、选择、重问、药水、SL的完整候选持续归属和本局全过程生产校准。 |
| silent-proposal-49632bc4878fb597 | CA5KE8GFJ9X2 F13 T3–5；完整题面为T4末问 | silent-0005、silent-0231 | 本局未提供正敏捷施放样本；缺同一冻结生产调用中力量、正负敏捷、虚弱与蚌独立成长四路径联合校准。 |
| silent-proposal-66532328a585941f | 5PM6JAQG6FNQ F39 第二试T2 | silent-0021、silent-0009 | 无毒冒泡的耗能与局部无效已核；缺同HP、牌组、药水及完整抽序下不同启动顺序的整场配对，不能拟合启动权重。 |
| silent-proposal-43a76a31ba7bdcfa | 61E2QS63Y9WU F17 T6 | silent-0030、silent-0027 | 负敏捷双防御与毒端点已核；缺同起始HP、构筑、抽序的另一完整SL线路和冻结生产整战配对，不能改SL范围或阈值。 |
| silent-proposal-5264153a4a4b0e5c | 61E2QS63Y9WU F23 T4 | silent-0039、silent-0209 | 本体线47总敌净扣/损15兑现但幻象仍存；缺召唤、航行、复现、退场全链校准和另一focus完整后继。 |
| silent-proposal-bddfa690a84e03d0 | DUZUBAJ3A8GP F30 首/末试T5–6 | silent-0128、silent-0079 | 临时减力恢复加成长已核；缺失血唤醒、眩晕接续与当前进阶成长的完整生产校准和同抽换序后继；另保留历史题面/实盘偏差待定位。 |

旧规则、拟实现行为与反例以十份原提案为准：本批保存assigned-proposals.json、proposal-original-recovery.json及七份original.md；三个仍存在的原件已核原SHA。七份原路径缺失的材料在基线Git中找到逐字节相同保存件并存本批scratch；按精确路径调用materialize返回rc=1、persistent runtime retained，未恢复原路径，失败回执保留；没有把路径不可见当作证据不存在。

神化保持“持有/已打出/已覆盖升级”分账；预算保持退化与完整推演分账；SL与护栏保持原答、替换和后继结果分账；不加入必打神化、统一保血权重、固定启动或目标顺序。原授权Roy-2026-10-07-learning提供改规则权限，不提供游戏事实。

验证方案：原始offset/bytes/SHA回读已完成；未来源码实现仍须固定原局面、当前进阶敌人数据库输入与抽序，实际消费者逐步比对并作撤源码失败/恢复通过及原沙箱检查。先补确定状态变换、身份与期限，再在相同随机池/预算下比较策略；按run_id划分后续时间验证，不能把六局历史发现样本或同局SL尝试当盲测/独立局。

反例与限制：神化F43施放仍付57血、F45未施放败不证明必打；沙虫不同防御换线有不同代价但无胜局反事实；族母首试胜不能推广SL阈值；胧光另一目标仅推演；无毒冒泡局部无效不决定构筑启动权重；三虫同序列当轮预测存在偏差，见questions.json原文。未读题目、未校准的机制及后继保持未知。

预期影响：本批仅提高可追溯性，不宣称已入库、下一局消费或自然收益。回退：无生产源码可回退；保留原记录，后续实现使用自己的源码提交、实际live版本及双通知。完整证据解释见report.md；队列状态只由调用方按proposal_results消费。

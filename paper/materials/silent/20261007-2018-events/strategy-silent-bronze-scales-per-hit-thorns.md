# silent-bronze-scales-per-hit-thorns 本批复核

记录时间：2026-10-07T20:08:34+08:00。角色：silent；仅本批已观察A10。
来源任务：experience-update / 20261007-153133-experience-update；实现/补链任务：strategy-proposal / 20261007-200254-strategy-proposal。
原经验源码：7453c2ccf67a132e17d2f6c9bfc7fb8f13b56d7a；原CLI id：silent-proposal-fcfc3568c08fd6da。
账本：silent-0129。证据：DUZUBAJ3A8GP F30 T6。

核实事实：铜鳞建3荆棘，T4丝虫两击反6、甲虫单击反3；T6毒8和反3合11。
反例及限制：玩家死亡后仍可有反伤结算；11不是11毒。
旧规则/现状与预期行为：逐击、完整格挡、死亡结算分开冻结；只有实际攻击才能兑现反伤，不修改药水代价。
本次处置：waiting。缺本次死亡/多攻击者边界的完整固定求解输入及敌方逐步结算验证，通用retaliate字段存在不等于所有边界已验证。
实际live祖先源码commit：无；未登记已有实现。

原Markdown和CLI输入分别保存在silent-bronze-scales-per-hit-thorns.original.md、silent-bronze-scales-per-hit-thorns.registration.json，原链接/指纹不覆盖。
四局原始状态重新按偏移和SHA核对2027帧，566帧原证据逐对象相等，见evidence-verification.json。
样本：本项本批单一来源局，SL不增加独立局数，不拟合权重或阈值；未来新局作时间后置验证。
验证：已有实现仅核明确子项及固定测试；waiting须补齐上列完整冻结输入/对照后独立实现，撤源码失败、恢复通过及原沙箱入口不可省略。
当前进阶怪物事实第一样本起读取，房间代价五样本门槛保留；选项全部保留、同值并列。没有改脑/战斗执行分工。
预期影响：补齐来源和逐项处置；本次没有对局行为改动，不承诺整战能获胜。
回退：本次无生产源码需要回退；现有源码若要回退用上述实际commit，CLI补链/勘误追加保留。
Roy-2026-10-07-learning仅为授权，本次rule_changes=false；无关角色及未观察范围保持。

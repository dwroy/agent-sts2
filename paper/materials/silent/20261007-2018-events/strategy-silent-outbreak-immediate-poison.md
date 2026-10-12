# silent-outbreak-immediate-poison 本批复核

记录时间：2026-10-07T20:08:34+08:00。角色：silent；仅本批已观察A10。
来源任务：experience-update / 20261007-153133-experience-update；实现/补链任务：strategy-proposal / 20261007-200254-strategy-proposal。
原经验源码：7453c2ccf67a132e17d2f6c9bfc7fb8f13b56d7a；原CLI id：silent-proposal-8ce59566787877de。
账本：silent-0037。证据：5PM6JAQG6FNQ F39 T4。

核实事实：普通毒性爆发给9毒立即结算，22/48→13/39，两敌残8毒，遗忘10挡不变。
反例及限制：残8不是直接给予8；结束毒与荆棘3必须另记。
旧规则/现状与预期行为：复用 poisonNow：先加毒、立即结算并保留减层后的毒，再与结束结算分账。
本次处置：duplicate。复用 poisonNow：先加毒、立即结算并保留减层后的毒，再与结束结算分账。
实际live祖先源码commit：f6c5504a73b2ee3702812a5217dfcda8b14e18aa。

原Markdown和CLI输入分别保存在silent-outbreak-immediate-poison.original.md、silent-outbreak-immediate-poison.registration.json，原链接/指纹不覆盖。
四局原始状态重新按偏移和SHA核对2027帧，566帧原证据逐对象相等，见evidence-verification.json。
样本：本项本批单一来源局，SL不增加独立局数，不拟合权重或阈值；未来新局作时间后置验证。
验证：已有实现仅核明确子项及固定测试；waiting须补齐上列完整冻结输入/对照后独立实现，撤源码失败、恢复通过及原沙箱入口不可省略。
当前进阶怪物事实第一样本起读取，房间代价五样本门槛保留；选项全部保留、同值并列。没有改脑/战斗执行分工。
预期影响：补齐来源和逐项处置；本次没有对局行为改动，不承诺整战能获胜。
回退：本次无生产源码需要回退；现有源码若要回退用上述实际commit，CLI补链/勘误追加保留。
Roy-2026-10-07-learning仅为授权，本次rule_changes=false；无关角色及未观察范围保持。

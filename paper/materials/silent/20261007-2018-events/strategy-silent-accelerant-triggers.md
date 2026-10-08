# silent-accelerant-triggers 本批复核

记录时间：2026-10-07T20:08:34+08:00。角色：silent；仅本批已观察A10。
来源任务：experience-update / 20261007-153133-experience-update；实现/补链任务：strategy-proposal / 20261007-200254-strategy-proposal。
原经验源码：7453c2ccf67a132e17d2f6c9bfc7fb8f13b56d7a；原CLI id：silent-proposal-26221dcf765fd913。
账本：silent-0027。证据：61E2QS63Y9WU F17 T5。

核实事实：普通触媒1下19毒扣19+18=37；T7的22毒按余34血截断结束。
反例及限制：触媒自身不施毒；毒次数不等层数倍乘，超出剩血部分不算本体实扣。
旧规则/现状与预期行为：复用 poisonExtraTriggers，每次结算后减1并按现有敌限制截断。
本次处置：duplicate。复用 poisonExtraTriggers，每次结算后减1并按现有敌限制截断。
实际live祖先源码commit：f6c5504a73b2ee3702812a5217dfcda8b14e18aa。

原Markdown和CLI输入分别保存在silent-accelerant-triggers.original.md、silent-accelerant-triggers.registration.json，原链接/指纹不覆盖。
四局原始状态重新按偏移和SHA核对2027帧，566帧原证据逐对象相等，见evidence-verification.json。
样本：本项本批单一来源局，SL不增加独立局数，不拟合权重或阈值；未来新局作时间后置验证。
验证：已有实现仅核明确子项及固定测试；waiting须补齐上列完整冻结输入/对照后独立实现，撤源码失败、恢复通过及原沙箱入口不可省略。
当前进阶怪物事实第一样本起读取，房间代价五样本门槛保留；选项全部保留、同值并列。没有改脑/战斗执行分工。
预期影响：补齐来源和逐项处置；本次没有对局行为改动，不承诺整战能获胜。
回退：本次无生产源码需要回退；现有源码若要回退用上述实际commit，CLI补链/勘误追加保留。
Roy-2026-10-07-learning仅为授权，本次rule_changes=false；无关角色及未观察范围保持。

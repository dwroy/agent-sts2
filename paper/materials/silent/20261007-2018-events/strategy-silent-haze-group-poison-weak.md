# silent-haze-group-poison-weak 本批复核

记录时间：2026-10-07T20:08:34+08:00。角色：silent；仅本批已观察A10。
来源任务：experience-update / 20261007-153133-experience-update；实现/补链任务：strategy-proposal / 20261007-200254-strategy-proposal。
原经验源码：7453c2ccf67a132e17d2f6c9bfc7fb8f13b56d7a；原CLI id：silent-proposal-1c51f79f5b69bf37。
账本：silent-0235。证据：DUZUBAJ3A8GP F27 T4。

核实事实：普通F6 T1两小啃兽各4毒/1弱；升级F27 T4毒2→8、本体仍101，结束扣8到93留7；T5再7→13。
反例及限制：迷雾施放当步不是直接伤害，污染血价另算；它不是轮初毒雾。
旧规则/现状与预期行为：提案：仅静默已观察普通4/1、升级6/2把PoisonPower接入现有群体施毒和结束结算，弱与污染各自保留，不增加药水/SL规则。
本次处置：duplicate。实际live已将普通4/升级6施毒接入群体施毒、逐目标Artifact及回合末结算；虚弱与污染仍分账。
实际live祖先源码commit：20b04517393708c73912326bb35d8448d1b3f77e。

原Markdown和CLI输入分别保存在silent-haze-group-poison-weak.original.md、silent-haze-group-poison-weak.registration.json，原链接/指纹不覆盖。
四局原始状态重新按偏移和SHA核对2027帧，566帧原证据逐对象相等，见evidence-verification.json。
样本：本项本批单一来源局，SL不增加独立局数，不拟合权重或阈值；未来新局作时间后置验证。
验证：已有实现仅核明确子项及固定测试；waiting须补齐上列完整冻结输入/对照后独立实现，撤源码失败、恢复通过及原沙箱入口不可省略。
当前进阶怪物事实第一样本起读取，房间代价五样本门槛保留；选项全部保留、同值并列。没有改脑/战斗执行分工。
预期影响：补齐来源和逐项处置；本次没有对局行为改动，不承诺整战能获胜。
回退：本次无生产源码需要回退；现有源码若要回退用上述实际commit，CLI补链/勘误追加保留。
Roy-2026-10-07-learning仅为授权，本次rule_changes=false；无关角色及未观察范围保持。

# silent-afterimage-per-card-block 本批复核

记录时间：2026-10-07T20:08:34+08:00。角色：silent；仅本批已观察A10。
来源任务：experience-update / 20261007-153133-experience-update；实现/补链任务：strategy-proposal / 20261007-200254-strategy-proposal。
原经验源码：7453c2ccf67a132e17d2f6c9bfc7fb8f13b56d7a；原CLI id：silent-proposal-e7e09b65a704bfff。
账本：silent-0023。证据：CA5KE8GFJ9X2 F2 T1/T2。

核实事实：F2 T1在已有13挡时打出余像，挡仍13，AFTERIMAGE_POWER=1；T2四次后续出牌使挡0→1→7→8→9，防御本身5挡与逐牌被动1挡分账。
反例及限制：F13蚌战没有余像，不能沿用F2的被动挡。
旧规则/现状与预期行为：复用 afterImage：建立本身不触发自己，后续出牌/重放补挡并在新战重新读取。
本次处置：duplicate。复用 afterImage：建立本身不触发自己，后续出牌/重放补挡并在新战重新读取。 原silent-0007账本为药瓶毒伤，另以silent-0023追加余像语义勘误链接，旧记录不覆盖。
实际live祖先源码commit：e0541ebc4a8786250d08869731fa07d303c0c8b8。

原Markdown和CLI输入分别保存在silent-afterimage-per-card-block.original.md、silent-afterimage-per-card-block.registration.json，原链接/指纹不覆盖。
四局原始状态重新按偏移和SHA核对2027帧，566帧原证据逐对象相等，见evidence-verification.json。
样本：本项本批单一来源局，SL不增加独立局数，不拟合权重或阈值；未来新局作时间后置验证。
验证：已有实现仅核明确子项及固定测试；waiting须补齐上列完整冻结输入/对照后独立实现，撤源码失败、恢复通过及原沙箱入口不可省略。
当前进阶怪物事实第一样本起读取，房间代价五样本门槛保留；选项全部保留、同值并列。没有改脑/战斗执行分工。
预期影响：补齐来源和逐项处置；本次没有对局行为改动，不承诺整战能获胜。
回退：本次无生产源码需要回退；现有源码若要回退用上述实际commit，CLI补链/勘误追加保留。
Roy-2026-10-07-learning仅为授权，本次rule_changes=false；无关角色及未观察范围保持。

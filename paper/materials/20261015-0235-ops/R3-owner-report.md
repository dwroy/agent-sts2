# 原R3 owner接口确认回执

时间：2026-10-15T02:35:00+08:00。原父批 `20261014-061302-fix-batch`、线程 `01a13753-c032-73f0-aa3f-ddc0e14809cd`。本人实际读取契约、原报告/两反例及项目内watcher回执，契约及原报告/反例SHA均匹配；watcher回执SHA为 `ffaecb0899a78da5ea7b96d057fd72b0111573472665c9d27418d2631442a62d`。完整读取来源SHA和字段表见 interface-confirmation.json。

同意契约的机械接口边界，没有实质接口异议：traceSteps仅当前回合；knownTop仅有证、匹配且未越过clean/exact/乱序边界的前缀；simulateFight只强制首轮Plan、后轮policy；maxTurns=1配captureCore只是限定单轮。必须传真实非空Plan、核动作/目标及policyTurns=0，并分列敌方阶段、回合末与下轮启动端点。known/complete和遥测不是物理正确、真实伤害或完整整战证据。

现有字段可供逐动作run/floor/attempt/turn/decision身份、原件offset/bytes/SHA/observed_ts/回执、当前手牌槽位/卡ID/升级/动态费用及合法目标、选择候选/回执、已记录抽牌前缀、入口牌组/遗物/药水及前后资源快照。槽位不是持久实例ID；重复牌、敌人移位和不唯一选择后继仍unknown。draws.order/clean/broke及可选inserted/topped/picked/offTop是既有快照导出的记录，不能替代完整物理原抽序；牌堆展示仅作成员多重集。新增手牌的抽牌/生成因果、完整弃牌/耗尽序列、真实支付/退款、有效回血/复活、未封顶同窗敌伤和完整实际S缺证时均null。尤其旧drinks.effective_hp_gain字段实际是净HP变化，不能因命名充作独立有效回血。

ESCAPE_PLAN的新增NEUTRALIZE/格挡2→3与模型draw0/格挡6差异、POISONED_STAB能量1→1与模型0差异仍保持原限定结论。已读watcher回执中其读取及Roy原生告知的记录；本人不代填Roy或其他角色ACK，不修改原prepared-only通知。

后继连续强制动作接口及实际事件账仍pending，由原watcher adapter owner实现，本人未重复实现或执行实验。不得用逐轮实帧重置、policy、netHP或capped hpLoss充整战。原输入5ffbb294…、R346/473b…、16局10:6、旧失败和B2撤可信/B3低可信/Queen反证不变；R347/R348未替换。若两holdout反例参与改模型，原6局不再称未见验证，原划分保留并另冻独立后继窗口。

本次仅写此目录两份本人回执；production_changes=false、new_experiments=0、API_calls=0、parent_closed=false，无merge/源码/知识/账本/冻结输入/现有报告变更，无commit或测试宣称。宽R3/P1/P2继续。

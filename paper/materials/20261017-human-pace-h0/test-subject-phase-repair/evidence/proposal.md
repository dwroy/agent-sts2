# H0/r1：实验体A10换相能力状态窄修

同请求roy-20261017-human-pace-h0/revision1，原050119 owner/thread 01a1415e-a511-7131-be7c-a2dc691c847f；不是新父或新revision。Roy-2026-10-07-learning及本H0授权允许依据本角色实盘修正模型，自测后自行live，不需要新的审批。

旧经验silent-test-subject-phase-reset描述换相清敌力/激怒/旧毒，机制本身已有真实证据。本H0冻结原帧另外核JMH5C51RLN4E A10 F48第5试T4→T5/T7→T8、UJ0K3G10609Y第6试T5→T6、YZWV37N2MU6N首试T5→T6/T8→T9：111→212时ENRAGE_POWER3消失、PAINFUL_STABS_POWER1出现；212→313时痛苦刺击消失，NEMESIS/INTANGIBLE出现。独立源3局，不按窗口/SL累计独立支持；第二次换相只在其中2局有后继。原offset/len/SHA及原帧在validation-phase-2/test-subject-phase-power-plan.json与原raw/windows目录，未扩大日志cut。

冻结model86f9bd67和当前live的enemyDown只换HP/revives并清strength/weak/poison，仍继承base.enrage、base.woundsPerHit和这两个原powers；laterTurnSim也保留这两个字段，后续solver继续给Skill附加第一相激怒、不能恢复正确的痛苦刺击输入。这是原帧能力集合与可审计源码的状态转移不一致，不是由高leak拟合出来的倍率。

候选修正仅SILENT/A10/TEST_SUBJECT，真实adapter辨认ADAPTABLE1和111血ENRAGE3或212血PAINFUL1/无ENRAGE后置标志。whole-fight内部还要求111→212或212→313及同静态字段，换相时把enrage置0、woundsPerHit置1/0并替换这两个power元数据。既有清血/毒/Strength/Nemesis流程保持；其他角色/未见进阶/未知HP或能力签名/短rollout沿原路径。不加新Wound入牌堆规则；已存在WOUND_COST和所有权重/费用/药水/保血/SL阈值不改。未验证的完整资源轨迹与联合率保持未知。

原481验证继续在不可变86f9bd67对象完成，作为新生产源对象的修前基线，不能热替模块。新对象先保存两源码叶、276输入SHA/241编译模块、二元隔离探针和实际B2/T1/pre构造。新修直接涉及2调参key和29验证key，原107/481切分、Platt方法、200次、588全行seed与四闸不动；先算受影响调参再冻结训练Platt，再只算29验证，其余已完成v2预测须有角色/输入谓词及编译隔离证明才复用。旧7e1193/旧full不重算；不以验证标签拟合或降低门槛。

登记此稿时固定probe、源码sandbox、新组合sandbox与新校准尚未执行，未称实现或上线。计划固定测试必须观察旧模型后继能力残留/后续Skill加力与修后差异，保other-role/A9/无标志/非目标等价；实际原始rc和源码、输入、发布树另记。source全套入口bash tools/test-sandbox.sh含tsc，锁内保存刷新/重叠预检，保H1/0332与其他发布后实际live组合再测，生产消费者读回经验后登记独立版本；正式号/host/shipped由ops核。

预期只修正这些已见状态下的后继模型，不保证六Boss全部过闸、整战穿透比因果改善或自然胜率增加。回退仅撤本H0新增flag/阶段字段更新和相关限定经验，保原纸鹤修复/R381、H1预算/其他源码与知识刷新；实际行为回退另登记唯一版本。source_task=experience-update为本H0经验环节，target_task=strategy-proposal仍本H0实施，不另派重复研究。

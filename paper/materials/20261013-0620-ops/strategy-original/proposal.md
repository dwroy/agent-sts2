# 静默猎手本批十项原提案复核

记录时间：2026-10-13T06:13:46+08:00。批次：20261013-060422-strategy-proposal。基线：652f39b79f7c07ae70e7988d920f134d32362243。

本批是已领取队列的普通策略任务。已逐项读取并核SHA256的原Markdown保存在original-01.md至original-10.md；不新建重复提案，不把子项实现登记为整项implemented/duplicate。结论只限本角色已观察A10和派发六局，不能外推其他角色、进阶或借用预训练游戏知识。

| 派发 id | 证据局/层/回合 | 既有账本 | 处置及缺口 |
|---|---|---|---|
| silent-proposal-366288801d9150d9 | 751FN9QM9MHQ / F17 T2、T7、T13 | silent-0079, silent-0176 | waiting：751 F17 T2/T7/T13同盘血价已核；已有候选及首次派发诊断，缺抽弃重问后的整轮执行归属、保持后继一致的整战支线，不能定探索门槛。 |
| silent-proposal-85929bdfc8a3fc1b | 751FN9QM9MHQ / F13 T3；F17 T7、T13、T17 | silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176 | waiting：751 F13 T3的plan5仅整战无药模型参考；持牌/持药未知已有live诊断，缺实际不喝、留药整战与抽弃重问后的药水收益归属。 |
| silent-proposal-efd9f83ee9e1a6dc | 751FN9QM9MHQ / F17 T2、T7、T13；六次尝试 | silent-0079, silent-0176 | waiting：751六次相关尝试均未胜；现有SL字段仍是候选预测及单步回执，缺完整实际分账、受控完整支线和后期独立验证。 |
| silent-proposal-131042659448ae74 | 751FN9QM9MHQ / F13 T3；F17 T3、T5、T7、T17 | silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176 | waiting：力量、敏捷、毒、荆棘与呼唤分项支持已核；现有栏不证明联合收益或确定敌伤，缺实际无药/留药整战及续问后的联合归属。 |
| silent-proposal-990f054036609447 | KV0JHNJCKXLS / F33 T1、T4、T5、T8 | silent-0102, silent-0019, silent-0020 | waiting：KV0 F33 T5删毒净扣36→29、两线零损，T1删攻击净扣28→14也未省血；毒和回血同帧，缺完整实测来源分账及同后继整战对照。 |
| silent-proposal-e18d3f18e6cac2a0 | YQL8RZ8BWN1E / F17 T9—10；L9SGRBB5R698 / F17 T14；PU80F84P6HPN / F17 T17 | silent-0017, silent-0250, silent-0011, silent-0027, silent-0046 | waiting：巨兽本体/自爆及占位血说明已有live实现；原占位血仍作同轮参考排序，缺改序的受控完整后继和独立验证，不能直接归零并称改善。 |
| silent-proposal-9733bb80f445aeae | YQL8RZ8BWN1E / F17 T9—10；L9SGRBB5R698、PU80F84P6HPN / F17 | silent-0017, silent-0019, silent-0020, silent-0250 | waiting：YQL F17 T10喝毒后毒2→8而血26/挡13/来袭41不变；缺提前喝、不喝、留药及阶段参考改序的完整对照，不能拟药水或终局权重。 |
| silent-proposal-c51468c5e8ba6668 | KEN58SH9SLZ6 / F3 T2、F4 T1、F5 T2、F11 T1—2、F15 T1、F17 T1 | silent-0019 | waiting：KEN七次饮用和六次75/86空药栏入口已核；随机选牌、发光水重问后的整轮收益归属不全，缺F15不喝或留药到boss的完整支线。 |
| silent-proposal-86a7db08d1a31976 | KEN58SH9SLZ6 / F17 T2、T5、T8—10、T12—13 | silent-0079, silent-0021, silent-0125, silent-0005, silent-0176 | waiting：KEN F17 T10多损6仅多扣2、T5省2却把步法延到T9已核；缺受控能力后继及后期独立局验证，不拟统一血价或关闭探索。 |
| silent-proposal-e282a9131b99129a | KEN58SH9SLZ6 / F17 T2、T5、T8—10、T12—13 | silent-0021, silent-0079, silent-0125, silent-0176 | waiting：已有候选、持牌和首次派发子项；完整actual_turn仍空，缺续问后执行链归属、保持后继一致的整战与独立后期验证，不能将子项当整项完成。 |

旧行为与拟议行为：SL仍允许在未强制notWorseOnly时探索模拟更差的未试线；药水仍沿现行持有价值和候选规则；巨兽SL仍按原存活轮数及原占位血作同轮参考排序。原提案希望获得可审计的候选/最终线、实际血价与输出、能力建立及敌回血/阶段分账，再在证据支持后研究改序或跨战药水价值。已有候选和本帧诊断无需重复实现；本批局部实际差额不等于完整续问执行归属或受控整战效果，故保留当前规则与所有合法选项。

支持与反例：751的T2/T7增加输出同时增加损血，T13省6血同时少扣6；KEN的T10多损6仅多扣2，T5反向省2血却把步法建立从T5延到T9；KV0的T5减少输出未省血；PU80的巨兽第五次获胜，但多处后续不同，不把它归因于单步或新参考排序。YQL本体结束后加6毒没有改变该帧自爆41。详见analysis.json和report.md。

验证方法：七对原始指纹及观测字段一致性、逐帧HP与敌HP净差、七次药水槽位消失、六次boss入口与步法建立时点、原SL结果逐行核对。完整反事实需要相同后继、明确随机输入、抽弃续问实际链和后期独立局；冻结局只作核验，相关SL不拆成训练/验证独立样本。没有规则参数拟合，没有模型/网络/对局调用。

预期行为：本批不改变决策，仅保存真实局部成本、反例及逐项待证条件供原队列续派；没有通关率提升结论。未改源码，无需回退代码；原提案、失败记录、账本历史与现行规则保留。仅经根ledger CLI追加报告链接，不改旧claim/status/version，不标shipped。

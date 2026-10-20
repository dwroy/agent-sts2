# 静默猎手本批提案核验

写前已运行date：2026-10-21T00:53:43+08:00。batch=20261021-003744-strategy-proposal。
结论：十项均waiting；无生产源码或知识改动，fixes=[]、merged=null。基线为完整提交 cc87015b78fa3f430e7a344d2edb01bc59e148dd。本批只追加证据与处置报告，原提案及父要求继续开放。
## 十项原提案逐项处置

| 原提案id | 原账本 | 证据局/层/回合及未实现原因 |
| --- | --- | --- |
| silent-proposal-366288801d9150d9 | silent-0079, silent-0176 | 751 F17 T2/T7实际血价已复核；现有预测拆项不等整轮实际来源联合验收，缺确定抽弃牌后的受控完整后继及独立局验证，不能拟合额外失血阈值。 |
| silent-proposal-85929bdfc8a3fc1b | silent-0019, silent-0021, silent-0005, silent-0007, silent-0129, silent-0176 | 751 F13 T3只有实际饮药分支；plan3后续7/8会喝，plan5才是整战无药模型参考。缺实打无药整战及留肌肉药到F17的分支，持有价未知不填0。 |
| silent-proposal-efd9f83ee9e1a6dc | silent-0079, silent-0176 | 原经验更新提案与366288801d9150d9同源但职责独立；缺整轮实际成本联合验收、确定弃牌及受控整战，不能用部分诊断或重复文字冒充实际实现。 |
| silent-proposal-131042659448ae74 | silent-0019, silent-0020, silent-0021, silent-0005, silent-0006, silent-0007, silent-0046, silent-0129, silent-0176 | 九类经验的逐来源收益、路线/休息与跨战留药联合验证未齐；原提案历史分母未在本批六局内重新验证，已有局部事实不关闭宽项。 |
| silent-proposal-990f054036609447 | silent-0102, silent-0019, silent-0020 | KV F33 T5删毒实扣36→29且两线当轮都零损；缺完整毛伤/回血/成长归属和保持后继政策的整战对照，不能把少输出称为保血收益。 |
| silent-proposal-e18d3f18e6cac2a0 | silent-0017, silent-0250, silent-0011, silent-0027, silent-0046 | YQL F17 T10残壳毒2→8但血26/挡13/自爆41不变；L9/PU的占位血排序原行已核，阶段展示已有，改序及提前用药仍缺受控整战和完整资源验收。 |
| silent-proposal-9733bb80f445aeae | silent-0017, silent-0019, silent-0020, silent-0250 | 巨兽阶段和当前药水观察已有窄实现；缺SL排序、用药及路线休息联合验证，PU的Stun占位帧也不能直接当当前自爆伤害，宽项不能整项duplicate。 |
| silent-proposal-c51468c5e8ba6668 | silent-0019 | KEN七次饮药槽位与续步已核，技能药真实选斗篷而非中位示例逃脱；缺全部随机收益归属、不喝及留药到Boss的受控整场对照。 |
| silent-proposal-86a7db08d1a31976 | silent-0079, silent-0021, silent-0125, silent-0005, silent-0176 | KEN F17同盘T10多损6仅多2伤，T5省2血同时未建立敏捷；缺能力后续收益完整归属、受控后继及独立局验证，不定统一6血/2伤准入规则。 |
| silent-proposal-e282a9131b99129a | silent-0021, silent-0079, silent-0125, silent-0176 | KEN原题/JeV原答/SL替线及续步已区分，现有selection审计仍是预测或单动作回执；缺整轮来源联合验收、受控整战及时间留出验证。 |

这些id来自本批proposal_ids，没有另领队列或新建重复id。十份original.md均按原队列SHA验证；其中五份原exp路径已缺失，从上一普通批保留副本逐字节核同恢复到本批scratch，来源/字节数/SHA见proposal-recovery.json。复用只用于原提案文本，不用旧摘要代原始实盘证据。

旧规则保留：不改变更差B2未试线准入、HP护栏、药水持有价、SL参考排序及终局判定。没有依据设置固定额外失血、留药或最少失血优先门槛。预计收益未知；本批没有可回退的新行为。

验证要求：先对齐原答、护栏、SL替换、每次抽弃牌/选牌/药水后的续问与真实结算，保留阶段、回血及SL恢复分账；后继政策或抽序改变不作单步因果。若拟合参数，以独立整局按时间切分，既有六次SL仍是一局，另需时间靠后的独立验证，不用其他角色补样本。纯诊断无需先证明胜率，但已存在的局部诊断不重复实现，剩余整轮联合验收没有在本批完成。

本批核验台账：silent-0539，经根目录learner/ledger.py add追加、show --json实际读回，status=proposed，by=learner:strategy-proposal；不代十项提案实现或原账本shipped。

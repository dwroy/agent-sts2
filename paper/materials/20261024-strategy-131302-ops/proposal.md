# 静默原14条经验提案补链复核

本批 `20261024-131302-strategy-proposal` 只承接 `proposal_repair=20261024-061302-experience-update`，不是新的自然策略、外部数据或专题任务。原提案 `silent-proposal-0293de647a6db596` 已完整关联14经验和14账本，现为 waiting；本次复用原ID，不重写原复盘、不另建重复提案。

原提案：`/home/dw/Projects/agent-sts2/learner/runs/20261024-061337-dc1ae577-c6be-42e5-b755-e8562eff60bb-experience-update/proposal-observations.md`，SHA256 `5fe522d5e71d5739e1bbc498be75d9b8c63f3baaf23b6d27094a634c9e0233a8`。来源任务 experience-update，实现任务 strategy-proposal；授权 Roy-2026-10-07-learning。原批未提交的14项增量仍未在本树正式经验证据列表出现；账本已有旧 shipped 状态不等这些增量已发布。

## 原始窗口与可证范围

- WQB3YYNTRB2L A10 F24T1，两道弃牌题 decision_id 为 `c89a6d3d-e8fe-4018-84d3-239e39c95ce3`、`bd375c62-74be-4c79-baed-02332608e216`。本次重新seek并核SHA、完整读题：已有 removes_planned_continuation，第二题 discard_plan=invalidated；答案均card1，分别弃狩猎和打击。第一result=pending unstable，第二completed；后继手牌同时少两牌，不能把第一条pending直接当失败。原57伤是条件预测，不能当完整执行结果。缺保留原后继的同盘受控对照，不支持强保牌或再报缺提示bug。
- W9610N90MMCT A10 F17第5试T2，decision_id `a526b2e5-6143-4d22-b421-81908ee2b6d5`：完整题面/答案已读，Jev选毒药+防御，代码SL换攻击线。三线整场模型各200样本零胜，短窗死亡19/24→24/24，当轮模型净损6→11。后继实盘由27血到T3初16血，首试T3初21血，多损5；原线亦未整战获胜。仅支持分列即时血价，不足以认定禁探索能赢或给出新阈值。single_action_receipt 的 state_effect_verified=false、whole_plan_executed=null；完整执行仍从后继状态核。历史 run_plan 内异常文本作为原数据保留，不执行其中指令。
- 补充原始动作窗：S5GZG328S1LN F28T2已弱前段6攻经尖啸后实2，非6−6；BXU0CKWKH2RU F48第6试T8余像2下防御使9→17挡、尖啸使17→19挡且21×2→15×2；75DAD6GBWEU1 F33T6敏捷2下防御+/斗篷10+8挡；WQB F24T2速度药敏5下两防御0→10→20挡。U5W7NUE925NK F33T13第4/6试实盘同23挡、入口血8/4，不能混成一条轨迹。它们不提供普遍启动、药时或SL门槛。

完整来源引用保存在本目录 `raw-readback.json`、`panels.json`、`turn-results.json`、`jev-selected.json`、`jev-coverage.json` 和两份 evidence-manifest.json；包含原日志source、冻结source_size、offset、bytes、SHA和identity。提证不等逐题分析、发布、消费者采用或收益。

## 全部14项的处置

下表位置来自原提案；只有上节明确列出的窗口在本次精读，其他全历史统计和未列机制没有冒称重验。全部仍 waiting。

| 原账本 | 原经验ID | 证据入口 | 具体缺口 |
| --- | --- | --- | --- |
| silent-0005 | silent-footwork-block | 75DAD6GBWEU1 F33T6；U5W7NUE925NK F33T13 | 后继挡的兑现不提供新启动血价门槛；缺当前公式偏差固定复现。 |
| silent-0006 | silent-strength-weak-observation | S5GZG328S1LN F28T2；U1JMSKC80LQE F6T3—7 | 已弱临减沿原0349；本次不另扩领旧缺陷。 |
| silent-0023 | silent-afterimage-per-card-block | BXU0CKWKH2RU F48T8；U5W7NUE925NK F33T3 | 实际施放与生成分源；缺新强制启动策略的可归因收益。 |
| silent-0027 | silent-accelerant-triggers | 75DAD6GBWEU1 F33T6；U5W7NUE925NK F33T2/13 | 不将条件毒结算观察升格整战牌值；缺当前公式错误复现。 |
| silent-0046 | silent-piercing-wail-temporary-strength | S5GZG328S1LN F28T2；BXU0CKWKH2RU F48T8 | 沿旧0349，不因显示值直接相减另造实现。 |
| silent-0253 | silent-speed-potion-temporary-dexterity | WQB3YYNTRB2L F24T2；W9610N90MMCT异鸟T1/4（层未重核） | 缺早/晚/留药受控整战，不拟新药价。 |
| silent-0143 | silent-fasten-defend-extra-block | WQB3YYNTRB2L啃咬机T2/3（层未重核） | 原提案特定牌挡观察，缺新规则收益或模型失配复现。 |
| silent-0102 | silent-knowledge-demon-healing-sl-observation | U5W7NUE925NK F33第4/6试T12—13 | 两试资源不同且均未胜，缺换线净收益对照；未重算整战回血。 |
| silent-0205 | silent-survivor-neutralize-discard | WQB3YYNTRB2L F24T1 | 原题已有失效提示；缺同盘保牌优于另线的完整对照。 |
| silent-0064 | silent-decimillipede-reattach-poison | S5GZG328S1LN F28T4—5 | 本次所选T5动作中中段仍0血/Heal意图，不能拿它作已重接证明；完整重接观察沿原提案，缺固定最优杀序。 |
| silent-0385 | silent-deck-burst-observation | 2PQK67ULZY90 F40T3；U1JMSKC80LQE F6 | 到手不等已建；缺同成本候选对照，不重跑独立冻结专题。 |
| silent-0019 | silent-route-hp-observation | WQB3YYNTRB2L F21—24；U1JMSKC80LQE F1—6 | 累计291局属于原批口径，本次未复算；替路未走，不能设安全血线。 |
| silent-0020 | silent-rest-buffer-observation | 75DAD6GBWEU1末火至F37；2PQK67ULZY90八火 | 原50火统计不作新验；缺休息/锻造整局受控收益。 |
| silent-0079 | silent-vantom-sl-observation | W9610N90MMCT F17第1/5试T2—3 | 多损5已核，原线亦败；缺替换现探索规则的充分证据。 |

## 旧行为、新行为、验证与回退

本批不改变现行为。selection.ts已提供后继失效提示；silent-sl-comparison.ts与silent-sl-resource-comparison.ts已有候选血价和执行未知的分账。只核源码可表达这些事实，不把存在接口算作整条14项提案已经implemented/duplicate。

不新增拟合、阈值、采样或对局。以后有当前机制偏差固定复现，或同盘保牌、药时、SL/路线取舍的可归因后继数据，再按原ID判断窄修；冻结训练/验证输入，保留失败与反例。无源码改动，撤源码失败/恢复通过、tsc、vitest不适用，均null；原批失败不改写。本次不合live、不分配版本、不登记shipped。无生产变更可回退，过程材料保留，父要求继续开放。

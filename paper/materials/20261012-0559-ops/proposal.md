# 本批静默策略提案与逐项处置

批次20261012-051302-s2-strategy-proposal；base=e16f507d706cf7abbcd664a64609fe578684e329。开工git status干净，main同步Already up to date。learn.json角色/工作树/10个ID一致，没有research_request或implementation_request；普通专题请求绑定另一批，本批只消费已领取ID。自己执行，不派下级。

## 有限实现：同族当前敌血与预测进度分账

沿原ID silent-proposal-43fe170707574455，原账本silent-0021/0012/0046；新限定账本silent-0422（proposed；CLI回执ledger-add-result.txt）。来源postmortem/20261008-084303，实施任务为本批strategy-proposal，授权Roy-2026-10-07-learning。原提案/经验/账本历史保持，不经add制造重复代码提案ID。

证据ZTRGYYMLR8SC/SILENT A10 F17末试：s292332 T1三敌62/63/199合324，神官只有199；s292357→292358 T5群伤前14/50/161合225、后7/43/154合204，三敌仍在。s292356 T5尖啸6现场力0/-3/-3，s292359 T6已恢复6/3/3。s292362 T6首信徒还有1HP，s292363 T7首帧它已不在，旧index0被63上限的另一个信徒复用；神官2→1，再于T9变0。没有T6首信徒0HP原帧，不写精确击杀时点。13固定帧逐字与只读logs匹配，offset/length/SHA保存在夹具及raw-source-proof.json。

旧行为：题面已有逐敌HP及模型enemyHpAfter，但没有全部活敌与神官/信徒HP合计的结构化分账、现场临时力摘要，以及候选中仍存活多少目标的同口径汇总；不能把原代码说成完全没有敌血。
新行为：仅silent A10 F17且现场只有已见KIN_PRIEST/KIN_FOLLOWER、完整有效HP/序号/能力数组时，补kin_current_board与普通候选kin_modelled_progress。全部血/神官血/信徒血分别列出，当前力量与尖啸直接取原帧；尖啸6只提示已观察的暂减边界，不推未来攻击。候选逐敌行缺失或重复则合计为null，不以缺行当已击杀。当前序号只匹配当前候选，不持久追认实体。未知牌/抽牌重问标记保留；随机药水中位数不冒充普通确定候选。

两个Jev题面均接线，原选项键、顺序及原数值排名保持。总HP不是必需击杀伤害或安全时钟，不要求先杀哪一个。没有新增血量/伤害常数、权重、药价、护栏/SL阈值，怪物数据源和房间5样本门槛不变。铁甲/其他角色、A9/A11、其他层/敌人保持原消费者输出。

反例与未知：群伤减21血而零退场，反对把AOE存在视作即时清场；序号复用反对跨帧按index认实体；本局六次全败，另一集火顺序、更多永久成长及持药线未有受控整战胜利。原宽项的跨帧身份/精确区间、已取得与计划想要能力的贯通仍未完成，不能以这一个事实子项关闭整项。
拟合与切分：不拟合参数。13帧来自同一局，发现/固定回归集，不当13独立样本或胜率验证；后续自然完局留出效果观察。批次10个锚点均为SILENT，含A6/A7/A10，不把调度锚点统称A10；实际本子项证据仅ZTRG A10。

验证：首轮7失败来自随机药水elapsed_ms等价比较，且Vitest setup先导入的两个消费者绕过局部fs隔离，错误带入默认经验/估值输出；失败日志kin-first.log隔离保留，未用于规则结论。随后显式替换两个消费者为空、固定MC时钟，断言真实题面不含经验/估值。定向16例过；撤combat-plan生产接线后两种题面消费者2失败/14过，恢复后相关3文件49例过。完整沙箱结果和合入实况见report。旧角色默认测试数据不作为本角色证据。
预期影响：Jev可区分已经看见的血量、当前暂减力和模型预测的退场数量；没有自然采用或胜率提升证据。回退：逆向本次四文件净补丁，保留原件、账本、并行刷新和历史失败。不修改运维prompt；实际live上线后才登记版本和双通知Roy，由ops核实shipped。

## 10项逐项处置

### silent-proposal-c65a44568c4d2975

原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261008-075540-strategy-proposal/proposal.md；SHA256=691dfd5d58f72f6e4c43c2210b86fa83732b229e09e4c1c5a44138238a08104b（已核相同）。

原账本：silent-0211, silent-0209。证据：CA5KE8GFJ9X2 A10 F9 T2/T3/T4。

已核/预期：六原帧按原字节核实；现场7层在后轮接回已由2409776edff7eda2dd7a21992ae56726e53d4b0d实现且为实际live祖先。固定12例随本批相关回归通过。

处置：duplicate。限制与反例：仅复用本项跨轮胆小7；同轮多次触发与另一击杀顺序不属本有限提案，不据此关闭其他宽项。

### silent-proposal-c2888032d1337388

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-075539-experience-update/proposal-mechanisms.md；SHA256=4f60d9af2120759b9d20815cdc88450bfe5410c216bd24e834280f120742bd5c（已核相同）。

原账本：silent-0005, silent-0006, silent-0011, silent-0016, silent-0023, silent-0024, silent-0027, silent-0049, silent-0083, silent-0094, silent-0133, silent-0222, silent-0253, silent-0276, silent-0282。证据：PD9AYQVMLQW6 A10 F35 T3—T8/F49末T10；L2TSFU62Z57Z A10 F6 T2/F14/F17。

已核/预期：重新核原日志与已存提取2179状态中的PD9/L2两局、相关决策；15机制已有部分模型，不重算原122局历史统计。

处置：waiting。限制与反例：15机制联合消费者回归尚未完成；滚石力量修正、覆甲完整减层没有隔离样本，药水时点缺整战受控对照。

### silent-proposal-042ee2299084b528

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-075539-experience-update/proposal-resources.md；SHA256=696540b4102ca32821760af92fca2f6ec189f83b8f80e7de4bf175bb2f7d2039（已核相同）。

原账本：silent-0019, silent-0020, silent-0021, silent-0090, silent-0228, silent-0239, silent-0243。证据：PD9AYQVMLQW6 A10 F35—F49/F48 T6；L2TSFU62Z57Z A10 F14/F17。

已核/预期：PD9 F49六次10HP空药接续与原帧一致；e1a467e18a0dfa8d99046a24ff4c0e1af59278c8为live祖先，已有连续boss资源模拟。

处置：waiting。限制与反例：实际路线/休息/事件/SL恢复和已取得能力的统一消费者仍缺；未走路线与首战少损血的配对结果、连续战时钟校准不足。

### silent-proposal-8cd3db3bad5f34f1

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-075539-experience-update/proposal-sl-trace.md；SHA256=370e09576ca99e86a3a141546425e28111d2160606576aa6a4c3820cf404bfda（已核相同）。

原账本：silent-0021, silent-0133, silent-0222, silent-0228, silent-0239。证据：L2TSFU62Z57Z A10 F17第2—6试T2/T3；PD9AYQVMLQW6 F49末T7—T10。

已核/预期：候选护栏和SL阶段审计已有a8b1f8be153fe4f3a34146117546c2178f2e446b；范围/并列/未知参考45161a51c2c6b7e4a499b13cf749c4108193bbf5均为live祖先。

处置：waiting。限制与反例：候选到最终执行、抽牌重问及整轮实损的统一关联仍缺工程验收；旧局缺完整原线反事实，不能把待派发当实打，不能用0赢改SL必死边界。

### silent-proposal-43fe170707574455

原文：/home/dw/Projects/agent-sts2/learner/runs/20261008-084303-postmortem/proposal-combat-progress.md；SHA256=6998cd559e0899056005231af7bbadd3d271513733f6ca28a5f65638e9a9f122（已核相同）。

原账本：silent-0021, silent-0012, silent-0046。证据：ZTRGYYMLR8SC A10 F17末试T1/T5/T6/T7/T9。

已核/预期：本批限定事实子项见上文；同族当前总敌血、神官/信徒分账、现场尖啸/力量与候选逐敌汇总已实现，保留全部候选。

处置：waiting。限制与反例：宽项仍缺跨帧稳定实体及缺帧退场区间、计划want与已建立能力的统一消费；另一个目标顺序无整战受控结果。当前序号会重排，不能拿本帧汇总代替完整退场追踪。

### silent-proposal-3f5a665dca133a8c

原文：/home/dw/Projects/agent-sts2/learner/runs/20261008-084303-postmortem/proposal-guard-sl-trace.md；SHA256=223f0fdd623ff185e4b476a528e5a70a3ce5e99d5733ae5354139ffcd9ac5523（已核相同）。

原账本：silent-0125。证据：ZTRGYYMLR8SC A10 F11 T3/F17首T10及末T13。

已核/预期：三次原HP护栏决策和13次SL重放的原口径保留；当前silentHpGuardAudit、silentSelectionAudit仅记预测/待派发，实际字段null。

处置：waiting。限制与反例：缺局部候选到完整实打的统一关联及抽牌打断、失败出口验收；缺护栏原线整场对照，不修改8/24/0阈值。

### silent-proposal-0b8ef30de463f317

原文：/home/dw/Projects/agent-sts2/learner/runs/20261008-084303-postmortem/proposal-potion-plating.md；SHA256=ac20c158f9134f0c139a7a3886d3c26fbb542517b3ebf2e1c2c8078e228cbeb8（已核相同）。

原账本：silent-0013, silent-0277。证据：ZTRGYYMLR8SC A10 F6 T3/F11 T1/F14 T1/F17末T2—T9/T14。

已核/预期：已核607原状态/594决策及17饮药；现场挡与覆甲已有分源，未加载0价不能推成药水实际0价值。

处置：waiting。限制与反例：取得/饮用/丢弃/SL恢复的完整来源与加载快照仍缺统一消费者；晚喝/留药整战对照与完整减层隔离不足，不改变持有价或饮用门槛。

### silent-proposal-5367449b857450a7

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-085641-experience-update/proposal-mechanisms.md；SHA256=2bbe2e854ce6bdb95609f800eb8434cdb05b6be963cfc8ec1870d81d65aee062（已核相同）。

原账本：silent-0012, silent-0013, silent-0046, silent-0149, silent-0277, silent-0284。证据：ZTRGYYMLR8SC A10 F11 T1/F17末T5/T7/T14；其余沿原提案七局。

已核/预期：本批直接核同族尖啸当前0/-3/-3到下一玩家轮6/3/3；临时减力不当永久。原铜钹107动作未重算，保留单弃/滑溜同现反例。

处置：waiting。限制与反例：刀扇多目标隔离、铜钹多弃/随机目标/减伤交互数据不足，整组消费者未验收；本次现场展示不补机制公式或跨战能力。

### silent-proposal-9b8890c2649a2734

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-085641-experience-update/proposal-trace.md；SHA256=ddafc2fed623f77ca9c28eff1309aedb8f1f746e3714756f5b71ee5eb1d97f57（已核相同）。

原账本：silent-0012, silent-0019, silent-0020, silent-0021, silent-0125。证据：ZTRGYYMLR8SC A10 F11 T3/F17首T10及末T13—T14，F3—F16资源链。

已核/预期：六次同场68HP入场、17饮药与三护栏原记录可核；六胜房净损51/三休63及新增7/SL恢复10保留原复盘，不重复登记支持分母。

处置：waiting。限制与反例：资源来源—候选—实执行—整轮出口统一链缺工程验证；未走路线、晚喝铁心、护栏原线没有受控结果，不能称局部省血为整场因果。

### silent-proposal-645ff7b72e0b9991

原文：/home/dw/Projects/agent-sts2/learner/runs/20261008-094302-postmortem/proposal-combat-observed-payoff.md；SHA256=55cd7445ba3ac32ef6bff153a908a5b729ea6dc7939b84be7ba6712080cd5ace（已核相同）。

原账本：silent-0010, silent-0106, silent-0021, silent-0286。证据：K2JAGKVJAWZJ A10 F46 T1/T6；79UCJ0K6R9C1 A10 F14 T3/T6/T10/T11。

已核/预期：10固定原帧按SHA核实；5e0f884586521220d451b717c29b99e7876d6244为live祖先，升级零毒蜃景有限子项已有覆盖，本批21例相关回归通过。

处置：waiting。限制与反例：升级正毒与倍率交互仍未核；短推演尾端贡献及感染联合消费者未完整验收，空过替代线未实打，不能关闭整个宽项或拟合长期权重。

## 执行配置核实

宿主本批learner_launch实际命令为Codex gpt-6-astra、model_reasoning_effort=xhigh、service_tier=default。题面要求high；会话内没有重启或改模型配置能力，本批未降低强度、未切Fast、不派下级。该实际差异单列，不能冒称按high启动。

## 最终实现与合入实况

源码d1713559f2d237a04b681ec6497ce0c8798ae0f0；限定账本silent-0422。完整沙箱首轮导入扫描临时目录竞态1失败保留，原入口单worker复验tsc0、318文件3152例+paths 11例，共3163例通过，gitleaks0。live锁内知识刷新无改动/无重叠，四个记录冲突停止：notes/for-roy.md、ops/inbox-dev.md、paper/materials/decision-log.md、paper/materials/learning/ledger.jsonl。live前后85e70e03a4f1aa0191296441db457511e1dd8406不变，原静默回测记录未覆盖。未合入/未上线/无版本/无shipped。首次工具沙箱启动竞态及一次成功重试见sandbox-launch-race.txt。最终逐项处置见report.md。

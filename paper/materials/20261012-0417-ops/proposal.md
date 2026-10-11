# 本批静默策略提案与处置

批次：20261012-034302-s2-strategy-proposal。工作树干净开工，普通提案消费，research_request/implementation_request均无；仅领取本批10个ID。`git merge --no-edit main`为Already up to date，base=`8bda0c7660712eada94d9225e2cc2e52b65631e5`。不派下级、不联网、不运行play，游戏结论仅来自silent已核原件。

## 有限实现：升级蜃景零毒施放

沿原ID `silent-proposal-645ff7b72e0b9991`，原账本silent-0010/0106/0021/0286，本批限定账本silent-0419（proposed）；不另建重复代码提案。来源postmortem/20261008-094302，独立实现任务为本批strategy-proposal。Roy-2026-10-07-learning仅为权限依据。

K2JAGKVJAWZJ A10 F46 T1，states 293158→293159，字节9078930779→9078976943：原生升级MIRAGE，Self、1费、CalculationBase=0/CalculationExtra=1/CalculatedBlock=0，三敌零毒；能量1→0、挡16→16、敌HP108/97/89不变。旧模型因0挡且未覆盖升级版，给未建模牌flatValue=5，复核原decisions 286431后澄清：含药水、后空翻和爆发重放的plan1显示lasting_value约10；单打蜃景的plan2/3显示约5。本批只移除单次匹配施放的5，重放仍在未验证范围；不把原提案引用的10误当单打值，也不冒认dirty历史源码。原提案不改，初稿保留proposal-first-draft.txt。

新行为：仅silent/A10/匹配原文与三项变量的升级版挂条件标记；求解器到实际施放时再检查存活敌全零毒、无现场或本轮新增敏捷/脆弱/双挡修正、费用1且单次手动出牌。本次施放移除flatValue加分并不再标未建模；牌的基础模型保持unknown，若同方案先施毒、先加敏、费用变化或重放，保留旧行为。没有实现升级正毒公式、没有删除候选、没有改目标偏好或药水/SL门槛。

反例：同局F46 T6普通蜃景在8毒/2敏捷、抑制下实加10挡；不能把整类牌视为零价值。79UCJ0K6R9C1 F14 T3的0/8赢和约76%尾端估计不能等同实赢，未实打替线不证明空过必错。该局T6/T10/T11感染实损32/11/2，末轮先被感染杀死、8HP/10毒敌不扣血；当前结算已有覆盖，只回归不新造bug。

拟合与切分：不拟合参数；K2和79原帧为发现/回归集，同局不同回合不是独立统计样本。其他角色和A9/A11/未知角色、其他变量与修饰组合保留旧行为。未来自然同角色完局才用于前瞻效果观察，本次不宣称胜率提升。

验证：10个夹具原帧逐字对照日志，保存offset/length/SHA。新21条固定回归与既有普通蜃景/持牌毒/胆小相关测试组成4文件51例；撤card-model.ts及turn-solver.ts至base后2条失败，恢复51例通过。首轮目标类型门未命中导致2条失败的日志保留。沙箱整套结果与实际合入另见report，不把定向通过冒报整套或上线。

预期减少这一条件下虚构长期收益；不改变未知组合。回退只逆向本批有限源码与对应测试净补丁，保留原件/账本/并行变更。只有实际合入live后才发布版本与Roy双通知，shipped交运维核实。

## 逐项处置

### silent-proposal-c65a44568c4d2975

原文：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261008-075540-strategy-proposal/proposal.md

原文SHA256：`691dfd5d58f72f6e4c43c2210b86fa83732b229e09e4c1c5a44138238a08104b`（本批已核相同）；原账本：silent-0211, silent-0209。

证据：CA5KE8GFJ9X2 A10 F9 T2/T3/T4；silent-0211/0209。六原帧逐字核对，目标0依次28→21、21→15、15→9，每轮攻击后挡0→7。

已核与预期行为：当前boardRolloutInput只在silent A10给observedGardenerSkittish；rollout后轮仅PHANTASMAL_GARDENER、SKITTISH_POWER=7接回。固定4文件51例中包含已有12条胆小回归。实际live祖先源码2409776edff7eda2dd7a21992ae56726e53d4b0d完整覆盖这个有限提案，不重复实现。

处置：duplicate。反例、缺证及未完成范围：同轮多次非致死触发及另一杀序整场结果不属于本有限提案；不把复用本项当宽项246daedaa3021847完成。

### silent-proposal-c2888032d1337388

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-075539-experience-update/proposal-mechanisms.md

原文SHA256：`4f60d9af2120759b9d20815cdc88450bfe5410c216bd24e834280f120742bd5c`（本批已核相同）；原账本：silent-0005, silent-0006, silent-0011, silent-0016, silent-0023, silent-0024, silent-0027, silent-0049, silent-0083, silent-0094, silent-0133, silent-0222, silent-0253, silent-0276, silent-0282。

证据：PD9AYQVMLQW6 A10 F35 T3—T8/F49末T10；L2TSFU62Z57Z A10 F6 T2/F14/F17；原账本15项见下面清单。

已核与预期行为：当前有逐牌敏捷、余像、逐击反伤、毒结算、持牌伤害、仪式及滚石路径；本批逐字核PD9 1125状态/1017决策、L2 447状态/442决策。确认PD9末3HP/32挡/4敏，F49六次仍10HP空药入场，不能继承F48已建能力。

处置：waiting。反例、缺证及未完成范围：15机制联合消费者并未由原提案一一验收；滚石力量修正与覆甲完整减层无隔离证据，不能把已有单项公式当整组duplicate，也不由本批复核两局冒认原122局全史重算。工程缺口和缺机制隔离分开保留。

### silent-proposal-042ee2299084b528

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-075539-experience-update/proposal-resources.md

原文SHA256：`696540b4102ca32821760af92fca2f6ec189f83b8f80e7de4bf175bb2f7d2039`（本批已核相同）；原账本：silent-0019, silent-0020, silent-0021, silent-0090, silent-0228, silent-0239, silent-0243。

证据：PD9AYQVMLQW6 A10 F35—F49，F48 T6；L2TSFU62Z57Z A10 F14/F17；silent-0019/0020/0021/0090/0228/0239/0243。

已核与预期行为：实际六次F49均10HP空药；现有e1a467e18a0dfa8d99046a24ff4c0e1af59278c8已是live祖先，提供连续boss资源模拟，不能再报无接续。

处置：waiting。反例、缺证及未完成范围：真实路线节点、want能力未取得、休息/事件回血和SL恢复尚缺本提案统一固定消费者核验；模拟时钟未校准，未走路线或首战少损血的配对结果缺失。保留追踪工程缺口，不据局部已有功能关闭宽项或重拟路线阈值。

### silent-proposal-8cd3db3bad5f34f1

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-075539-experience-update/proposal-sl-trace.md

原文SHA256：`370e09576ca99e86a3a141546425e28111d2160606576aa6a4c3820cf404bfda`（本批已核相同）；原账本：silent-0021, silent-0133, silent-0222, silent-0228, silent-0239。

证据：L2TSFU62Z57Z A10 F17第2—6试T2/T3，PD9AYQVMLQW6 F49末T7—T10；silent-0021/0133/0222/0228/0239。

已核与预期行为：a8b1f8be153fe4f3a34146117546c2178f2e446b已有silentSelectionAudit和silentHpGuardAudit；实际分别保存候选阶段与待派发动作，actual_turn/actual_outcome仍null。45161a51c2c6b7e4a499b13cf749c4108193bbf5已分列范围、样本、并列和未知。

处置：waiting。反例、缺证及未完成范围：原答→护栏→SL撤回→抽牌重问→全轮实付血/输出的统一关联仍缺；旧局没有可填造的原线完整反事实，不能把pending_dispatch当已执行或把有限0赢当全死。保留追踪工程缺口及策略缺证两种原因。

### silent-proposal-43fe170707574455

原文：/home/dw/Projects/agent-sts2/learner/runs/20261008-084303-postmortem/proposal-combat-progress.md

原文SHA256：`6998cd559e0899056005231af7bbadd3d271513733f6ca28a5f65638e9a9f122`（本批已核相同）；原账本：silent-0021, silent-0012, silent-0046。

证据：ZTRGYYMLR8SC A10 F17六试，末T7/T9/T14；silent-0021/0012/0046。

已核与预期行为：已核本局607状态/594决策与原日志一致，六次入场68HP、末T14为4HP/6挡。当前enemySims及候选enemyHpAfter提供按序号敌HP/减力，未找到本提案所需跨帧实体退场与want/已建立统一记录。

处置：waiting。反例、缺证及未完成范围：完整实体身份/缺帧退场边界与计划消费回归未补齐，这是工程缺口；改变目标顺序另缺同资源完整胜线。不得把T7首帧消失写成已观测T6零血，不加固定集火规则。

### silent-proposal-3f5a665dca133a8c

原文：/home/dw/Projects/agent-sts2/learner/runs/20261008-084303-postmortem/proposal-guard-sl-trace.md

原文SHA256：`223f0fdd623ff185e4b476a528e5a70a3ce5e99d5733ae5354139ffcd9ac5523`（本批已核相同）；原账本：silent-0125。

证据：ZTRGYYMLR8SC F11 T3、F17首T10/末T13；silent-0125。

已核与预期行为：核到3条HP guard和17次真实饮药；现有guard审计保存预测省血和damage差，selection审计保存before_sl/after_sl/待派发动作，但两者的实盘整轮结果均未知。

处置：waiting。反例、缺证及未完成范围：缺局部候选到最终实打整轮的统一键、抽牌打断及失败出口回放；旧13次SL重放不能当13次独立Jev选择，局部省10/少24不能作实得因果。阈值变更另缺原线整场对照，保持现行8/24/0。

### silent-proposal-0b8ef30de463f317

原文：/home/dw/Projects/agent-sts2/learner/runs/20261008-084303-postmortem/proposal-potion-plating.md

原文SHA256：`ac20c158f9134f0c139a7a3886d3c26fbb542517b3ebf2e1c2c8078e228cbeb8`（本批已核相同）；原账本：silent-0013, silent-0277。

证据：ZTRGYYMLR8SC F6 T3/F11 T1/F14 T1/F17末T2—T9/T14；silent-0013/0277。

已核与预期行为：本局六次F17均68HP及相同两瓶药，实饮17次；已见牌挡、覆甲与药水持有价加载来源分别有代码。单看未加载时0价说明不足以认定没有本角色数据。

处置：waiting。反例、缺证及未完成范围：取得/饮用/丢弃/SL恢复的完整来源链与实际加载快照尚未在统一消费者验收；覆甲精确减层、晚喝/留药整场对照缺失，不修改持有价与饮用阈值，不能拿部分分源模型关闭宽项。

### silent-proposal-5367449b857450a7

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-085641-experience-update/proposal-mechanisms.md

原文SHA256：`2bbe2e854ce6bdb95609f800eb8434cdb05b6be963cfc8ec1870d81d65aee062`（本批已核相同）；原账本：silent-0012, silent-0013, silent-0046, silent-0149, silent-0277, silent-0284。

证据：ZTRGYYMLR8SC F11 T1、F17末T5/T7/T14；另原提案铜钹七局限定证据保留；silent-0012/0013/0046/0149/0277/0284。

已核与预期行为：临时减力、脆弱和覆甲已有局部模型；原提案铜钹记录为单张弃牌多次配对，7次滑溜同现减1，不是普遍固定3。本批不重算旧107动作或推广其随机分布。

处置：waiting。反例、缺证及未完成范围：刀扇原例为单敌，缺多目标隔离；铜钹多弃、随机目标与减伤交互缺独立数据，尚无整组生产消费者回归。保留已覆盖事实，不能整项duplicate或由单次反伤推出药水最佳时点。

### silent-proposal-9b8890c2649a2734

原文：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-085641-experience-update/proposal-trace.md

原文SHA256：`ddafc2fed623f77ca9c28eff1309aedb8f1f746e3714756f5b71ee5eb1d97f57`（本批已核相同）；原账本：silent-0012, silent-0019, silent-0020, silent-0021, silent-0125。

证据：ZTRGYYMLR8SC F11 T3/F17首T10/末T13—T14及F3—F16资源链；silent-0012/0019/0020/0021/0125。

已核与预期行为：本批核六次68HP入boss、三条护栏和17饮药原件；沿原账本保留六胜房净损51/三休63与新获7/SL恢复10的复盘分账，不重写历史复盘。

处置：waiting。反例、缺证及未完成范围：统一资源来源—候选—实执行—整轮出口尚缺完整回归；未走路线、晚喝铁心或护栏原线没有受控结果。局部追踪子项a8b1f8be已上线不足以关闭宽项，工程缺口不伪装成仅等新局。

### silent-proposal-645ff7b72e0b9991

原文：/home/dw/Projects/agent-sts2/learner/runs/20261008-094302-postmortem/proposal-combat-observed-payoff.md

原文SHA256：`55cd7445ba3ac32ef6bff153a908a5b729ea6dc7939b84be7ba6712080cd5ace`（本批已核相同）；原账本：silent-0010, silent-0106, silent-0021, silent-0286。

证据：K2JAGKVJAWZJ A10 F46 T1/T6；79UCJ0K6R9C1 A10 F14 T3/T6/T10/T11；silent-0010/0106/0021/0286及本批silent-0419。

已核与预期行为：本批实现升级零毒蜃景有限分支；普通版8毒/2敏+10挡保留；感染32/11/2损与末轮毒未结先死固定回放通过。撤两源码失败2/21，恢复相关4文件51例通过。现有simulation_reference保留实赢/死亡/范围/未知；不改变排名权重。

处置：waiting。反例、缺证及未完成范围：父提案仍要求当前收益、地平线实赢/死亡和尾端估计贡献全链联合展示/消费，尚未逐消费者验收；空过替线缺完整实打结果，升级正毒和倍率未核。本次有限源码提交即便合入，也不把宽提案整项implemented。

## 材料及验证限制

`raw-source-proof.json`逐字核验PD9/L2/ZTR共2179状态与2053决策；`raw-mirage-verification.json`核10帧，`reuse-proof.json`核胆小6帧及4个实际live祖先。`own-runs.json`核27个被派提案证据局和锚点的角色元数据；只查身份不等全部实帧分析。其他历史机制统计明确沿原提案保留，不冒称本次重算。`assigned-proposals.json`和`proposal-history.json`保存本批10项原身份与历史，根请求与队列未手改。

## 最终交付补记

有限源提交`5e0f884586521220d451b717c29b99e7876d6244`；原沙箱tsc/vitest退出0，315文件3101例加fork1文件11例，共3112例。锁内live预检9冲突，未合入、未发布、无版本或shipped；具体冲突及每ID最终状态见report.md/report.json。

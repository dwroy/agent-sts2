# 本批十个原提案的证据核验与处置

批次：20261014-164302-s2-strategy-proposal；角色：silent；普通已领取队列任务，不承接其他专题或其他ID。

基线：`f2e63a4085672b2948f6a7ff2c10b4da651da09a`。本批仅核已有提案，不新增或替换原ID。所有原Markdown SHA与专用队列相符，副本保存为对应`.original.md`。

## silent-proposal-51fa8bc34774f72d

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261008-064304-postmortem/proposal-dampen-identity.md
原文 SHA256：`f84a6264bc2846c4e90323039a66b6a3a7104b3503431f942af68601951e1a67`。来源任务：postmortem；本批实现任务：strategy-proposal/20261014-164302-s2-strategy-proposal。

关联账本：silent-0279, silent-0280。领域：combat, sl, structure。

证据位置：GXNKW8X1XYJP F45T2→T3；ZE8F192FKX24 F42T3—4。

处置：**waiting**。四次假插牌记录和旧升级键作差路径已核；八局11窗口虽基础ID总数守恒，仍缺纯改标瞬时帧、物理副本唯一身份及同帧插牌/洗牌/恢复的完整抽序证明，不能安全延长已知前缀。

预期行为：只在唯一身份和纯改标均可证时更新版本，混副本、真实插入、洗牌和恢复歧义继续断序；战内/场外版本分账。

验证方法与重派条件：补充单纯留堆改标、出口恢复和并发抽插洗负例的独立原帧；用DrawTracker实入口验证不造inserted且歧义仍断序。

反例及边界：同局SL不是独立样本；候选不等于执行，净HP不等于未截断伤害；未观察角色/进阶/组合不外推。无完整反事实时不宣称替线胜。未新增阈值或拟合；原局只作诊断，之后独立本角色局作留出验证。本批无源码变更，无源码回退对象；未来窄实现仅revert实际净补丁，保留原证据、刷新数据和并行记录。

## silent-proposal-29b7b36dffbcb017

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-071205-experience-update/proposal-mechanisms.md
原文 SHA256：`40866aa3c6ee72a028bee5c911c168ddb017fa740833376b7bf6dab1f7dca7eb`。来源任务：experience-update；本批实现任务：strategy-proposal/20261014-164302-s2-strategy-proposal。

关联账本：silent-0005, silent-0006, silent-0011, silent-0016, silent-0021, silent-0027, silent-0030, silent-0087, silent-0278。领域：combat, potion, terminal。

证据位置：GXNKW8X1XYJP F33T1—6、F45T1—3；原提案关联同角色历史。

处置：**waiting**。毒雾、触媒已建与未建的局部事实已核；覆甲逐来源减层、阻毒/加量及未结算负例的完整联合帧仍不足，提前毒药或先能力的整战配对未执行，不能据此改药水或终局规则。

预期行为：按已建立能力和实际结算计入，现场力量/敏捷/覆甲分别取值；未建立与未结算不预支。

验证方法与重派条件：固定原始状态与实际动作，分来源验证9关联机制；未见组合留未知，另收后期独立本角色局核预测与实际。

反例及边界：同局SL不是独立样本；候选不等于执行，净HP不等于未截断伤害；未观察角色/进阶/组合不外推。无完整反事实时不宣称替线胜。未新增阈值或拟合；原局只作诊断，之后独立本角色局作留出验证。本批无源码变更，无源码回退对象；未来窄实现仅revert实际净补丁，保留原证据、刷新数据和并行记录。

## silent-proposal-2631859b524e0652

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-071205-experience-update/proposal-dampen.md
原文 SHA256：`3bd609ffdd19ea3102ba54d0d9cc52d0c59953dba5ad70fe1036f2e7570c482d`。来源任务：experience-update；本批实现任务：strategy-proposal/20261014-164302-s2-strategy-proposal。

关联账本：silent-0280。领域：combat, sl, structure。

证据位置：八原关联局魔法骑士抑制窗口；详见dampen-windows.json的逐行位置。

处置：**waiting**。八局11次抑制窗口的基础ID守恒已复核，但均包含跨轮变化且存在同ID多副本；缺物理身份及完整抽序，已发布战内普通版本经验不能替代SL身份修复。

预期行为：现场普通版本与场外升级分账，只有唯一守恒配对才改抽序键；不影响已建立能力。

验证方法与重派条件：保存11窗口各牌区版本计数与重复ID，追加唯一副本/纯改标正例和同帧真插入/洗回负例后验证SL消费者。

反例及边界：同局SL不是独立样本；候选不等于执行，净HP不等于未截断伤害；未观察角色/进阶/组合不外推。无完整反事实时不宣称替线胜。未新增阈值或拟合；原局只作诊断，之后独立本角色局作留出验证。本批无源码变更，无源码回退对象；未来窄实现仅revert实际净补丁，保留原证据、刷新数据和并行记录。

## silent-proposal-b13fda1dfeb37927

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-071205-experience-update/proposal-resources-sl.md
原文 SHA256：`04c480d08ee3896bc39bf68b6cec7a06bfc86829401ca776030a9b823c4984da`。来源任务：experience-update；本批实现任务：strategy-proposal/20261014-164302-s2-strategy-proposal。

关联账本：silent-0019, silent-0020, silent-0079, silent-0243。领域：combat, potion, sl, terminal, structure。

证据位置：GXNKW8X1XYJP F35/38/40/42/44/45，末战T2→T3。

处置：**waiting**。赢战97→84→66→41、营火41→71及精英71→5已核；末战仍缺复活逐击未截断伤害、原线完整执行和替路线/早用药整场对照，不能把局部净血或模拟分母改成终局权重。

预期行为：预测、实际净HP、饮药、SL恢复及复活分源，沿真实节点接续资源。

验证方法与重派条件：已有离线消费者仅验证端点；需完整连续资源路径、唯一候选/重问父子身份及原线/替线实际出口，净差不归因策略。

反例及边界：同局SL不是独立样本；候选不等于执行，净HP不等于未截断伤害；未观察角色/进阶/组合不外推。无完整反事实时不宣称替线胜。未新增阈值或拟合；原局只作诊断，之后独立本角色局作留出验证。本批无源码变更，无源码回退对象；未来窄实现仅revert实际净补丁，保留原证据、刷新数据和并行记录。

## silent-proposal-d7b8d36cf3d0303d

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261008-071302-postmortem/proposal-survivor-discard.md
原文 SHA256：`5a1880920741718dd2508044d240ac63c67569f881689efb85ca286b4bc27909`。来源任务：postmortem；本批实现任务：strategy-proposal/20261014-164302-s2-strategy-proposal。

关联账本：silent-0268。领域：combat。

证据位置：PD9AYQVMLQW6 F49第6试T10，states291336—291342、decisions284707—284711。

处置：**waiting**。普通单弃窄修复bf423c173d3be348a4ad714e1d26516df619ff41已是live祖先；原新增凋萎仍在终局按数量附加，多选单弃保留未知，缺能从原开场贯通新增实体、选择完成及32挡/24持伤/23攻击的完整生产回放，不能将旧唯一余牌用例关闭整项。

预期行为：普通单弃与绷带收益解耦；未知选择须重读，不预扣未知凋萎，新增状态牌与选择完成后的余像另计。

验证方法与重派条件：已有实帧核8/18/19/31/32挡及2/3/3/3/2凋萎；需生产模型贯通生成身份和选择边界。真实32挡仍需损15，3血死亡，不声称修复转胜。

反例及边界：同局SL不是独立样本；候选不等于执行，净HP不等于未截断伤害；未观察角色/进阶/组合不外推。无完整反事实时不宣称替线胜。未新增阈值或拟合；原局只作诊断，之后独立本角色局作留出验证。本批无源码变更，无源码回退对象；未来窄实现仅revert实际净补丁，保留原证据、刷新数据和并行记录。

## silent-proposal-c873d6543c414f92

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261008-074302-postmortem/proposal-control-trace.md
原文 SHA256：`6b1f8de019e4e4af3ed55d07c0b8d7ecc2902637e244b866f7c320cfa42e1a0d`。来源任务：postmortem；本批实现任务：strategy-proposal/20261014-164302-s2-strategy-proposal。

关联账本：silent-0125, silent-0005, silent-0044, silent-0253。领域：combat, potion, sl, structure。

证据位置：L2TSFU62Z57Z F17，第2—6试T2/T3。

处置：**waiting**。九次护栏、四次T2被SL撤回及四次T3抽牌重问已核；live单动作回执和离线93片段/441动作仍不认证完整候选，缺在线稳定候选ID、实际前缀/重问父子链及药水恢复归属全链。

预期行为：逐阶段保存原答、支配、护栏、SL和重问，候选与实线分账；饮药/弃药/新得/恢复分别记录。

验证方法与重派条件：现有audit-selection入口已读回，完整候选字段保持null；需要原始唯一候选链与全线出口再验十次饮药/五次恢复，不调现有护栏或药价。

反例及边界：同局SL不是独立样本；候选不等于执行，净HP不等于未截断伤害；未观察角色/进阶/组合不外推。无完整反事实时不宣称替线胜。未新增阈值或拟合；原局只作诊断，之后独立本角色局作留出验证。本批无源码变更，无源码回退对象；未来窄实现仅revert实际净补丁，保留原证据、刷新数据和并行记录。

## silent-proposal-dfbf51502f30c9b1

原提案：/home/dw/Projects/agent-sts2/learner/runs/20261008-074302-postmortem/proposal-ringing-terminal.md
原文 SHA256：`b05bf09cf80e5f6d21801f79db38f3853f5af4a466bb256ca139299045556282`。来源任务：postmortem；本批实现任务：strategy-proposal/20261014-164302-s2-strategy-proposal。

关联账本：silent-0021, silent-0133, silent-0222, silent-0049, silent-0020。领域：combat, terminal。

证据位置：L2TSFU62Z57Z F17末试T6、T8。

处置：**waiting**。T6打击/侧步候选7伤但侧步未建模，结束0伤；三线各1200模拟均零胜，五轮死亡14/24对11/24。缺同抽序完整替线、侧步兑现与独立后期验证，不据即时7伤改终局排序。

预期行为：记录当轮兑现输出、已跨阈值与一牌额度；剩能量和待兑现成长不当已获输出。

验证方法与重派条件：已核168→159清力量/横冲直撞及T8一牌后四牌BlockedByHook；须完整受控替线及HP价才允许规则变化。

反例及边界：同局SL不是独立样本；候选不等于执行，净HP不等于未截断伤害；未观察角色/进阶/组合不外推。无完整反事实时不宣称替线胜。未新增阈值或拟合；原局只作诊断，之后独立本角色局作留出验证。本批无源码变更，无源码回退对象；未来窄实现仅revert实际净补丁，保留原证据、刷新数据和并行记录。

## silent-proposal-c2888032d1337388

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-075539-experience-update/proposal-mechanisms.md
原文 SHA256：`4f60d9af2120759b9d20815cdc88450bfe5410c216bd24e834280f120742bd5c`。来源任务：experience-update；本批实现任务：strategy-proposal/20261014-164302-s2-strategy-proposal。

关联账本：silent-0005, silent-0006, silent-0011, silent-0016, silent-0023, silent-0024, silent-0027, silent-0049, silent-0083, silent-0094, silent-0133, silent-0222, silent-0253, silent-0276, silent-0282。领域：combat, potion, terminal。

证据位置：PD9AYQVMLQW6 F35T3—8、F48/F49；L2TSFU62Z57Z F6T2—3/F14/F17，原提案18关联局。

处置：**waiting**。现场敏捷、余像、仪式增长及临敏/荆棘局部端点已核；覆甲完整减层、力量与滚石、换战/未结算组合仍无充分联合原帧。已有若干子模型和诊断不足以将15账本宽项记duplicate；本次没有重现旧29文件合入冲突。

预期行为：力每击、敏每牌、余像/覆甲分源，换战能力重建；不预支未触发滚石或未建立毒能力。

验证方法与重派条件：已核固定局部端点，下一步需按原15账本逐入口完整原帧及组合负例验证；未知机制留空，不因旧提案文字猜新bug或重拟药时。

反例及边界：同局SL不是独立样本；候选不等于执行，净HP不等于未截断伤害；未观察角色/进阶/组合不外推。无完整反事实时不宣称替线胜。未新增阈值或拟合；原局只作诊断，之后独立本角色局作留出验证。本批无源码变更，无源码回退对象；未来窄实现仅revert实际净补丁，保留原证据、刷新数据和并行记录。

## silent-proposal-042ee2299084b528

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-075539-experience-update/proposal-resources.md
原文 SHA256：`696540b4102ca32821760af92fca2f6ec189f83b8f80e7de4bf175bb2f7d2039`。来源任务：experience-update；本批实现任务：strategy-proposal/20261014-164302-s2-strategy-proposal。

关联账本：silent-0019, silent-0020, silent-0021, silent-0090, silent-0228, silent-0239, silent-0243。领域：combat, potion, terminal, structure。

证据位置：PD9AYQVMLQW6 F48胜后→F49；L2TSFU62Z57Z F13—17。

处置：**waiting**。PD9首boss58→10后以10血空槽进入下一boss、L2赢F14仍耗20已核；现有double-boss接口有同样本资源接续，但缺实际血药/复活全链对路线/休息消费者的联合校准及未选整场对照，不能据接口存在关闭宽项。

预期行为：同幕下一boss使用首战实际剩余资源，未来营火/商店/能力不预支；真实路线与计划文字分列。

验证方法与重派条件：保留当前四局数据模型，需真实连续boss/路线/休息的固定联合读回和独立校准；未来恢复与SL资源恢复分别验，不凭相关性调路线血线。

反例及边界：同局SL不是独立样本；候选不等于执行，净HP不等于未截断伤害；未观察角色/进阶/组合不外推。无完整反事实时不宣称替线胜。未新增阈值或拟合；原局只作诊断，之后独立本角色局作留出验证。本批无源码变更，无源码回退对象；未来窄实现仅revert实际净补丁，保留原证据、刷新数据和并行记录。

## silent-proposal-8cd3db3bad5f34f1

原提案：/home/dw/Projects/agent-sts2/.worktrees/exp/learner/runs/20261008-075539-experience-update/proposal-sl-trace.md
原文 SHA256：`370e09576ca99e86a3a141546425e28111d2160606576aa6a4c3820cf404bfda`。来源任务：experience-update；本批实现任务：strategy-proposal/20261014-164302-s2-strategy-proposal。

关联账本：silent-0021, silent-0133, silent-0222, silent-0228, silent-0239。领域：combat, sl, terminal, structure。

证据位置：L2TSFU62Z57Z F17T2/T3/T6/T8；PD9AYQVMLQW6 F48/F49。

处置：**waiting**。阶段预测、单动作回执和离线相邻端点已有源码；四局457片段/2801动作的完整候选结果全部null，仍缺在线候选持续身份、重问全线执行及原线完整反事实；有限全死样本不能据此改SL必死边界。

预期行为：保留原答、护栏和SL变更前后预测、实际前缀、重问及实线出口，限定模拟样本/覆盖。

验证方法与重派条件：原位离线读回已完成，仅150整轮端点/311未知轮；需在线完整链及独立实局验证，不将未知候选字段填零或净伤归因候选。

反例及边界：同局SL不是独立样本；候选不等于执行，净HP不等于未截断伤害；未观察角色/进阶/组合不外推。无完整反事实时不宣称替线胜。未新增阈值或拟合；原局只作诊断，之后独立本角色局作留出验证。本批无源码变更，无源码回退对象；未来窄实现仅revert实际净补丁，保留原证据、刷新数据和并行记录。

[watcher] C7 / V6-R446 原文核同，向 Roy 转达两项 confidence 新赋值及状态差异；不代 ACK。

核 ops 原评论6385736803、watcher-roy-handoff.json、学习者223228原 report / strategy-candidates / evidence-ledger，再与发布前像、源3f7310a5、行为df8c9029和实际live487ce589逐项对比：backflip、sucker-punch的confidence确由学习者0.25赋为0.30；footwork仍0.30。五个原候选仅归档引用路径转换后与源/行为/live完全相同，三项更新的全部旧evidence和evidence_detail_ref均原样保留。这是学习者描述性赋值，不能解读为校准结果、自然采用或收益提高。

须补充精确差异：backflip顶层evidence_status由unassessed→conflict，sucker-punch由conflict→unassessed；后者旧conflict仍完整保留于evidence_detail_ref.evidence_status，不能把“旧conflict保留”说成顶层状态未变。footwork顶层新增conflict。原账本的4YPG/CLA89局部失败和外部反向组合反证保留。sucker-punch顶层状态变化的依据留给原学习者/ops说明，本角色未修改游戏知识或自行解释消除冲突。

已在本会话明确向Roy转达上述差异，并追加本角色通知到notes/for-roy.md及ops/inbox-dev.md；记录不代表Roy已读或ACK。原watcher-roy-handoff及学习通知ACK均未改。1完整剧本消费者、5原card_pick捕获/结果回放、自然采用/独立收益及科学父仍开放；固定查询读回不代这些验收。本轮仅核原文与发布一致性，无新full/模型/游戏/tick或行为发布。

证据：paper/materials/20261024-issue51-c7-confidence-integrator/verification.json（逐项旧/新confidence、顶层与附件状态、原证据保留检查、原件SHA）；原通知/回退沿20261024-issue51-mixed-c7-ops/rule-change-notice.json。

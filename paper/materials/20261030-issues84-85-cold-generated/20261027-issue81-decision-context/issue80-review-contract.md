# #80 待审知识最小契约（供 #81 固定夹具对齐；未发布）
每维交 summary.md、tables.json、candidate-entries.json、coverage.json、conflicts.json、evidence-refs.jsonl、commands.json。
candidate-entries.json = {schema: "issue80-review-candidates-v1", issue:80, dimension, status:"review-only", entries:[...] }。
entry必需：id（issue80候选命名空间）, dimension, triggers（选牌/商店/升级/删牌/开局/幕复核/Boss入场/路线/营火/用药/事件）, conditions（角色/进阶/版本/幕/Boss/可观测构筑条件）, summary, rule_candidate, confidence, denominators, evidence_refs, counterexamples, limitations, conflicts_with。
evidence_ref分别标own_run或external_aggregate；前者真实run_id/层/窗口offset,length,SHA，后者来源URL/数据版本/筛选/样本和冻结SHA。不造局号、floor0、因果收益、来源独立性或已采用。
conflicts保留旧条目原ID、原知识版本/原证据及新证据，不替换原件。coverage列全部总体、实际统计行数、成功/排除/未知分母、版本与自有独立局/SL尝试分账。tables各表列固定分层和缺值；不可只报显著/正结果。
交付后停下等ops汇总、主管核及Roy审阅；不得写生产知识/数据库/账本、提交/合并/main/live、调用admit/finish/seal/publisher、改开关、运行play或派后继。

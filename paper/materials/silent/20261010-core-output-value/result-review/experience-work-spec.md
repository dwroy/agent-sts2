# 已完成三项专题的合并经验沉淀

唯一入库请求沿用 `roy-20261010-silent-core-reuse-experience-integration`，本次为 scope revision 2。关联 Roy 的牌组规模、能量利用与核心循环、复制及有限回合核心输出三个已完成专题。继承用户“如果没有可以让学习者学习入库”以及论文留痕、后续效果跟踪授权，不重跑历史研究，也不为三个报告各造一条重复经验。

入口为现有 `experience-update`。`notes/experience-integration-silent.json` 是现行请求；核对 request_id、scope_revision、dispatch_runs 和本批绑定。入口的九个局号只作典型案例锚点，完整来源是下列已完成报告、各自冻结输入和原始证据，不把九局作为全历史分母。

1. 核心输出：`20261010-205441-strategy-proposal`；本目录 `report.md` SHA256 `9c47fea393bdc79c64b388ef8210bfe3ff4cdc6360efbe6b60e892b4153d37fd`，204 局 input SHA `574484f2634437308d0d42aa5b916a28d471a940155dedcedb630cd5ca23be74`；账本 `silent-0385`，提案 `silent-proposal-3dae3ca702a14057`。
2. 能量与循环：`20261010-164301-strategy-proposal`；`paper/materials/silent/20261010-core-reuse-value/result-review/report.md` SHA `d9bae12a25666791bb44969777f0a24b656209639a2e201e3a388e7020b30d7f`，201 局 input SHA `c8560fe798ff37b7b97c2d370736d57157e544d60e700b979f81657c888ce3b2`；账本 `silent-0376`，提案 `silent-proposal-9e1bc1225fae0e30`。原 revision 1 的 pending 请求与工作说明留原字节，由此同请求承接，不另派一批。
3. 牌组规模：`20261010-150327-strategy-proposal`；`paper/materials/silent/20261010-core-output-value/prior-deck-size-report.md` SHA `425472888f736d115f77ab81b1dc8ef2a5b59481bdb030d3b5b05ecc3c926a69`，195 局 input SHA `f816d243230b8e629a9d1ce1a1de42df445a20c978db400b4090de52c1dcc1f3`；账本 `silent-0374`。相关旧提案只关联，按实际 CLI 状态去重。

先核原件 SHA、角色、进阶、首试与 SL、实际大脑来源以及每份报告自己的分母。来源统计有重叠，不能相加为独立样本。具体结论和条目文字由学习者从本角色证据判断，讨论材料中的推理不是已验证知识。

按报告建议核实能否形成一条少量综合经验，覆盖成型后的增牌/跳过/移除/替代、可活的有限回合中实际兑现与资源代价、永久副本/次轮生成/当前轮重放/能力后继的区别；与既有机制和四核心条目去重。核对最新报告提出的 `54G5683J0E5S` 步法复制后跨轮施放证据是否应补入已有 `silent-nightmare-next-turn-copies`，不另建同机制，不把局部支持扩展为复制必选、统一最佳张数、固定配比或 A10 稳定通关。保留到手未施、副本未到即死、支付/额度/封抽/生存的限制；窗口相关性不作因果概率，缺反事实不报收益。数量约一条综合项加必要旧项修订，最终拆合由证据决定。

开工保存当前 live 经验版本/SHA/条目，机械保留更新后的已有知识，禁止旧 main/exp 库覆盖 live。先核 exp 租约及旧未合入批次；不动运行中的批次、不清暂存、不改历史失败/rc/报告。主任务原先的合入冲突仍按正常运维兜底流程，不能把新的研究派发冒称解除旧冲突。

交付逐项 `silent-0374/0376/0385 → 最终经验 ID 或合并/不采纳理由 → 提案 → 源提交 → 实际 live/版本`。已有候选、提案和旧四核心不重复登记；新增/更新经验按现有 `ledger.py`、`code_proposals.py` CLI 和 `check-experience` 核验。保存 before/after、失败原件、自测记录；走原自测、合入 live、版本与双通知及外部完整检查。源码行为调整仍由原提案链承担，本次不重做研究或扩展架构。

固定上下文渲染检查大脑知识前缀确实包含最终条目，保存原文及 SHA；渲染、实际进程读取、自然采用、效果分别记录。发布后把最终条目原文交 Roy，并关联 `paper/materials/discussions/2026-10-10-core-cycle-and-marginal-card-value.md` 和 `paper/materials/silent/20261010-core-output-value/knowledge-gap-review/effect-followup.json`。后续自然局按同角色/进阶/真实成功大脑/实际版本分层，每 20 独立局跟踪首次启动、同长有限窗口实际兑现/伤害/能耗/生存与漏斗，首试和 SL 最终分开；少于 20 局写实际分母，未采用/无收益/反例与同期变化照实保留。不运行 play、不增加定时器，不改 ops prompt 或对局参数。

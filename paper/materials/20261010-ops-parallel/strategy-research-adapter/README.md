# 请求绑定的策略专题纯报告入口

2026-10-10 补齐，基线 main `83db965f5d022e96b3be3e07d65559b7b23db2ae`。本次只适配基础设施，不提供游戏结论，不派发任务，不修改请求/learn.json/队列或旧失败，不合入 main/live，不 push。实际整合、派发及回报由主 ops 依次处理。

原 `no_change` 只接受 proposal_ids 或 proposal_repair；已有手动 strategy-proposal 即使产出合法纯研究报告，也会被正常完成函数标为 failed。原入口 8 项固定对照有 2 失败；增加真实基线与全冻结清单覆盖约束后，同一最终测试套件回放原源码有 3 失败。新入口专项 8 项通过，旧学习闭环 24 项和 Fast 启动回归 8 项通过。原始日志及源码保留。

生产变化只有 `ops/proposal_dispatch.py` 与 `learner/tasks/strategy-proposal.md`；另加 Python 固定测试及 Vitest 桥接。仅 reason=ops 且完全无 proposal 字段的本角色策略批可匹配根目录 `notes/strategy-research-<character>.json`。启动可以承接 pending/batch=null 的短交接窗口，最终只接受 running 且精确绑定实际批号、真实工作树、角色、任务及派发锚点集合的请求。普通手动、提案和补链保持原通道。

验收检查授权 Roy、实际 work_spec/input_manifest SHA、manifest 身份、所有 required_sections 的 true、非空结论/限制、真实工作树内 Markdown 报告、完整40位 base、HEAD==base、干净工作树、无合入/修复及未执行测试 null。请求另保存派发前真实 dispatch_base：必须是 HEAD 祖先，两者之间实际执行源码、模板、验证输入和所有角色 knowledge 零差异；notes/paper 等记录快进可以通过，提交源码或知识再自报新 base 被拒绝。

report.runs 是本批入口锚点；covered_runs 是实际分析清单，exclusions 为未分析局的逐局原因，两者无重复/交集且并集精确等于全部冻结局。evidence_runs 只能来自 covered_runs。全部证据不足可逐局排除、保留未知及非空限制，不能伪造证据或冒称全历史支持。根请求必须在实际派发前填 dispatch_base，并在派发返回后立即把 batch 与 state 绑定；此补丁不代替 ops 写状态。

`source-diff.patch` 与原源码/模板是旧新实现留痕，红绿日志保存真实输出；一次命令前沙箱 glob 预检失败另存 `tool-preflight-failure.txt`，没有当作代码失败或测试执行。完整固定沙箱实际 exit 0：主套 263 文件 / 2664 例，paths 补套 1 文件 / 11 例，总 264 文件 / 2675 例；tsc 通过。主套开始 14:02:17，耗时 1086.05 秒，paths 开始 14:20:24。全套启动后继续收紧了 Python 验收与固定测试，最终源另外通过 8 项专项、24 项旧闭环和 Vitest 桥接；未把启动时的全套冒称最终不可变源快照。实际结果写 `validation.json`。源提交为 `b3b690aac31413ad89adee45c0f260e84898f805`，提交前 gitleaks exit 0。材料另提交，主 ops 负责后续整合。

机械验收只能证明请求/范围/报告身份及纯报告基线，不能证明游戏结论充分。实质候选、支持反例与限制仍由主 ops 核实，经验沉淀交后续原 experience-update；本次不制造游戏版本、shipped 或消费者已采用结论。

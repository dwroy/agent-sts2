# #79 主管裁定后的正文/证据合并输入

接 [79/6538878551](https://github.com/dwroy/agent-sts2/issues/79#issuecomment-6538878551) 及 ops [6538990674](https://github.com/dwroy/agent-sts2/issues/79#issuecomment-6538990674)。本轮先核实际 main 为 `39e48ce9d09248b86c0eec1bf2339c4b453ec253`。原工程 r2 `3942304a` 已批准，由原集成员与 #77 规范化成固定 source `1ca2c625519a796679beb7051bb37fc8ec3e1493`；本轮不改该源码、请求、检查或在途批次。原 r2 另保留引用 `issue-79-engineering-r2-3942304a`。

## 已完成的机械步骤

只读原库的指定 `K1-753af285…` 和 182334 原候选/批准/报告/result/去向产物，核前后 SHA 不变。针对主管点名的两条策略，以该 K1 的对象为底，仅复制原候选相对 K533 修改的 `strategy/evidence/batch_supplements/prior_texts`；逐字段证明当前值仍等于原 base，因此没有覆盖当前并行正文/证据。其他非分级字段保持当前对象字节；原候选的 version 不机械套到当前修订，留给重判/审批 owner 明确修订身份。

去除 confidence、formal_publication、grading 及其相关派生字段、evidence_type、prior_strategy，未从任一方选取置信度、档位或正式状态。去分级后的固定内容 SHA：

| ID | content SHA256 |
| --- | --- |
| silent-route-hp-observation | 5adde8b951bade4ab309b433be7c743a221cb612771b47b35a622e2eff4a10f2 |
| silent-brain-poison-footwork-realization-review | 401e79a837826674a552db10ce7368870ac4c2ca0590b26677459263cfc98ebf |

完整可复核输入在原树 `.artifacts/issue79/reconciliation-20261031/regrading-input.json`；文件 SHA 见 [content-manifest.json](content-manifest.json)。它是 `issue79-regrading-input-v1`，不是可发布 K1 candidate。对应两条分类只准备原 evidence/rationale 差量，target 身份不变，最终 target SHA 明确为空，等待分级后计算。另两项原无冲突新增（新策略及其分类）记录在 preserved_unconflicted_changes 中，最终续接必须原样带回，不能因处理两条冲突就丢掉原批新增 ID。

[prepare.mjs](prepare.mjs) 可重放：输入原路径绑定、主管原文及 SHA、已核编译模块目录；只读原 runtime，仅允许写本树 .artifacts 子目录。两次执行结果一致，原件前后 SHA 核同；未写生产库/控制、未重开模型、未伪造 wrapper。

## 分级回执尚未生成

实际运行了当前 main 的原 `agent/tools/grade-strategies.ts`，未 mock、未篡改旧 checkpoint/authority。工具绑定旧完整文档 SHA、173 条原修订及 #85 固定检查点，针对合并后的正文/证据拒绝 `unapproved or mismatched frozen input`，exit1、无输出候选，见 [grader-rejection.json](grader-rejection.json)。这是实测的旧分级器拒绝回执，**不是新分级回执**。

不能以替换 checkpoint SHA、复制旧 B+/B− 或套旧 confidence 冒重新判定。新 grade/类型/分母/置信度和正式状态须由原 #85 链依据新固定对象重判并留真实回执。请求必须绑定上述两个 content SHA、原证据/反证与授权，返回最终完整对象及 SHA、分级依据/回执、正式状态证明；有异议或证据不足保持限制，不为原批结束强行升档。

[approval-request.json](approval-request.json) 仅列待件和原新链指针，明确 pending，尚未生成新的 source approval 或最终分类 target；不能交发布器当批准文件。

## 到件后仍需核的受理入口

当前 #73 `admit-continuation` 只接受原候选相对 current 的无同对象冲突差量，不接受另一个经重判的替代对象参数。主管批准了合法处置方向，但不能仅靠新增审批 JSON 让旧 API 自动接收不同完整对象，更不能修改原 ID 对应 candidate body/digest 或手写 DB 关系来绕过。原 report/candidate/approval 保留。

新 #85 回执到齐后，原 #79/ops 链需明确核收带双代审批/原候选/指定 current 的显式 reviewed successor 合同，再计算最终两条分类 target SHA、新审批原件并以原 ID 鲜核受理。现冻结的 #77/#79 工程合批继续原线，不热改；若需要受理源码后继，另交固定差量，不拿新文件冒已有功能。实际发布、唯一完成事件、wrapper 监督和生产工具读回均未在本轮发生。

204303 按 [20/6524090002](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6524090002) 留原集成员/ops 运营链，不归本项返工。原开放科学父项和限制保留。

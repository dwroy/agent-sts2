# 大脑预算失败留证（#70）

现有总预算、查询/作答保留时间、同引擎、严格格式、初始计划与旧计划复用校验、router 重问和服务恢复合同保持。这里修复取消时的证据丢失及查询失控后的重复查询，不调整游戏知识或策略。

## 故障与修复

原局 `4Q6S5ZUKHJH7` 的固定七题全部耗尽 300 秒。外层失败行记录 attempts=0、tool_calls=[]，对应 17 次原生尝试中却有 7 个 dynamicToolCall 完成事件。原始事件只能证明原生工具流程终态，不能证明某个知识 ID/版本的实际返回或采用。三次空白失控的原输出都没有完成必需的初始 run_plan，旧守卫拒收正确。

原 router 用 Promise.race 先返回超时/预算失败，KnowledgeAgent 随后的 catch 才附工具列表；Codex 失败也不返回 BrainAnswer，因此外层不能依赖该返回值统计真实尝试。原 server_requests 还累计 app-server 整个生命周期，不能用其长度代表本次尝试的调用次数。

现在每题共用一个进程内 BrainEvidence，原生尝试在 turn/start 前登记，工具桥在执行前、返回时分别登记。router 在取消边界直接读取快照，不等异步 cleanup 改写异常。服务端请求列表按单次 turn 切片。工具请求保留 question/run、attempt、JSON-RPC request ID、native call/thread/turn ID、实际输入/返回、用时与终态。未知返回保留 null/pending；allowlist 拒绝、桥接失败与执行完成分别记录。重复 call ID 返回同一结果，不重新执行；冲突和错 turn 拒绝。

知识查询遇到失控/停滞时，直接由原 KnowledgeAgent 转入保留作答阶段，传入本题已完成工具的原输入和完整返回，关闭工具能力。不先在查询 harness 内重开一次查询。非知识历史适配器的 stall retry 行为保持；无工具作答阶段与 router 原重问上限保持。初始计划缺失仍失败，已有计划可合法复用，不接纳缺字段 JSON 或生成替代计划。

生产知识模式收到 abort 时，停止自己的 app-server，跳过取消后的 turn/start/control RPC 等待；保留原 3 秒 TERM→KILL 上限，等待期间 ref 原 child，确认原子进程退出后才启动后继 harness。新题等待前题 cleanup 结算，不重叠复用 MCP 状态；撤销的旧 host 无权使用新题预算。准备阶段在 usage/catalog/thread 返回后复核取消，取消后不再提交新模型 turn。历史非知识模式保留原 interrupt/revert 及物理探针计数路径。

## 日志合同

- `brain.jsonl` 仍是一条当时判定；`evidence` 是写行时的不可变快照。attempts 按同题累计已登记真实原生尝试计数；同题多条失败/恢复行按 question_id + attempt id 去重，不把累计值相加。失败行也可含已完成工具及已取得的 native_receipt。attempt status、cleanup=pending、工具 output=null/pending 都是明确未知，不能据此声称零查询或已完成清理。
- 同目录新增 `brain-evidence.jsonl`，schema=`brain-evidence-v1`，以同题 question_id/run_id 和 sequence 追加 attempt/tool/cancellation。题结束后的真实工具返回和 cleanup 仍追加，不回填旧行、不重发原题、不重跑工具。`journal_write_failed=true` 表示持久写入失败；进程内快照仍保留已知证据，不能冒称完整持久化。
- attempt.status 是本地调用结局；native_status 只取真实收到的 turn/completed.status，未收到就为 null。cleanup=finished 只证明本地清理已结算，不证明远端生成或工具资料已被采用。
- `native_receipt.context_line` 保存匹配本线程、本 turn 的原始 turn_context 行，`sha256` 精确覆盖该行 UTF-8 字节、不含换行；在 revert/delete 前留证。摘要和原始行一起存在新日志中，可独立读回实际模型/effort，不用请求配置代实际回执。原行缺失时仍为 null，不从当前服务补旧记录。
- 工具完成表示本地工具桥取得了返回；不代表后端模型已经消费或最终动作采用。异步工具未返回时，原行的 pending 仍保留，后继事件才可补充新证据。

日志仅由进程落盘，不是模型题面。不给模型提供 evidence 对象、日志路径或新的查询/写入权限。原日志、原失败和后继环境线索保持分账。

## 发布与验收

本项生产叶为 `agent/src/brain/evidence.ts`、`types.ts`、`run-profile.ts`、`router.ts`、`engines/{codex,codex-session,knowledge-agent,native-receipt}.ts`、`tools/knowledge-mcp.ts`；新文件须随同一固定组合部署。ROOT/LIVE 同步相关测试/固定原例。无新依赖、预算/开关/账号/模型/联网改动；铁甲战士的游戏知识、出牌与价值规则等价，知识 harness 的失败留证/取消修复通用。

集成员沿唯一最终组合入口检查。ops 沿自然边界发布并分配适用 release_id，本开发不写 live/STOP 或预编号。下一正常生产题核工具请求→实际返回→回执→计划/动作和耗时；若自然失败，核新日志的取消、真实尝试和后继 cleanup/晚到工具事件。没有工具的正常题不强迫查询。现场不得为验收另开模型探针或游戏。

回退精确恢复本批生产叶（新 evidence.ts 随部署回退），保留所有新旧日志/原生证据和知识绑定。预算、计划守卫和知识版本无需回退。服务首输出慢、无输出及空白生成的后端原因仍未知；另一个 ops 请求的 429 不归因到原七题。离线与进程夹具通过不等于后端变快、自然采用或胜率改善。

固定材料与原始偏移/SHA见 `paper/materials/20261025-issue70-brain-budget/`。动态工具的 request/response/completed 及 turn 取消语义参考[官方 app-server 文档](https://learn.chatgpt.com/docs/app-server)；原生产样本和本地固定协议夹具仍是本次适配的直接证据。

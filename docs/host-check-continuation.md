# 宿主定向补验

用于已有 `learner-recheck` 的原失败、超时或新增受影响测试续验。不改变原批次完成状态、`checks`、`fallback_checks`、`checks_pending` 或 Git 历史；通过结果仅代表所选测试，不能作为完整套件通过或专题验收完成。

运维先在代码实际集成后冻结清单，再经原 broker 调用：

```sh
bash ops/codex-ops-do.sh learner-recheck '<原批次>:<清单SHA256>'
```

清单是 UTF-8 JSON，放在原调度器 `learner` 目录的 `<原批次>.continuation-<清单SHA256>.json`。SHA 按原始文件字节计算。只接受已登记的写入批次及其原工作树；该批次或同树新拥有者仍运行、已有补验持锁时拒绝。broker 的新参数校验在下一次 wake 加载源码后生效。

清单字段全部必填，多余字段拒绝：

- `schema`：1。
- `batch`、`task`、`worktree`：必须与原调度记录相同。
- `original`：原登记检查的 `merged`、`tree`、`log_sha256` 和 `coverage`。`coverage` 用 `ops/learner_check_continuation.py` 的 `coverage(log_bytes)` 提取，保留文件名、失败用例全名及原文件/用例总数；不能手工声称已通过。原日志必须仍在该批次的登记检查目录，SHA 不变。
- `live`：当前实际提交 `commit` 及 `tree`，均为完整 40 位 SHA。锁内前后核对，源码/测试输入有未提交改动也拒绝。
- `sources`：原检查引用的全部源码提交，加本轮修复源码；每项必须是当前 live 祖先。
- `inputs`：所选 `agent/tests/*.test.ts` 及发生变化的已映射依赖，每项为 `{"path":"agent/tests/example.test.ts","source":"完整提交SHA"}`。`source` 必须在 `sources` 内，文件必须与该提交的 blob 一致，防止用祖先关系冒称被回退的实现仍存在。
- `selection`：最多 16 个文件，每项 `{"file":"tests/example.test.ts","tests":["describe名称 it名称"],"reason":"failed"}`。`tests` 是完整用例名，按字面值转义和首尾锚定，不是可执行正则或 shell；空数组表示整个文件。`failed` 只能选原失败用例；`unrun` 需要完整文件清单或明确超时记录，摘要缺少逐文件覆盖时拒绝；`affected` 要有测试文件或代码内明确映射的依赖变更。已通过的同树补验范围不会因换清单 SHA 再跑。
- `receipts`：可为空；每项 `{"path":"paper/materials/.../receipt.json","sha256":"64位SHA"}`，绑定量化框架等已有源码/覆盖回执。只读固定后缀的项目材料，不执行其中命令。

执行始终使用固定的本地 TypeScript/Vitest 入口、`nice`、单 fork worker；禁止自选命令、排除项、预算或环境设置。总执行期限保持现有宿主检查的 3600 秒。记录标准错误、逐段结果和 Vitest JSON，区分断言失败、超时、权限限制、未执行选择与源码漂移。原路径不自动重跑完整套件，不自动回滚。

结果写成 `<原批次>.supplement-<清单SHA>.json/.log` 和独立 Vitest JSON，并经原 `learner-checks` 发完成事件。重复已完成请求返回原结果；中断的 `running` 回执保留且拒绝自动重跑，由原拥有者据已保存分段结果核查续办。完整检查入口的普通 `<批次>` 参数仍适用于其他未验证改动。

本次待宿主验收的两文件四用例：

- `tests/brain-codex-session.test.ts`：`the play process's end the exit fixture selects a model advertised by its fake catalog`；`the play process's end the server does not keep the process alive; at exit the process removes its thread's files`。
- `tests/ops-codex.test.ts`：`broker requests allows only the listed actions with clean arguments`；`broker requests every action is implemented by ops/codex-ops-actions.sh and listed by ops/codex-ops-do.sh`。

两文件都有本轮已集成修复/依赖变更时使用 `affected`，不追加其余已过 324 个文件。量化专题新增测试另列受影响项、源码快照和原覆盖回执；入口交付不等于这些测试已经在宿主通过。

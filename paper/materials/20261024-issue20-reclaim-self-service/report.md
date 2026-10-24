# #20 回收常见情况自理补交

来源：[Roy/Claude 评论6378554518](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6378554518)。基于当时 main `946dcfb39`，源码 `a467b14ed6a493eaae40b0a40bc9c18fd9796eff`，分支 `issue-20-reclaim-self-service`。私有 kit 无差量；影响 live 启动：否。

原五分钟回收 tick 自理缺文件等待、终态补封存及可证明的工作树/过程副本保留门。文件缺失前两轮 queued，第三轮起 retained、本地报告；纯缺证不满足第4点的收件箱条件，不把三轮超期直接发给 ops。计数持久化，成功/其他保留门后重置。

终态批次缺 seal 时，核唯一 scheduler 结束行/rc、完整批次摘要、宿主进程视图、原监督和原生进程均退出、原生绑定/末回合、产物和处置权、原 pane/空输入。自动 seal 单列 scheduler-recovery / owner_birth=null，旧 wrapper 缺 birth 可由独立证据证明退出，原回执不改写；已有 wrapper 摘要/输出 SHA 不能矛盾。封存前及关闭前重复核证，随后仍用原 sending/读回/host 释放，uncertain 不重关。缺原生身份/产物原件不能凭空重建。

分配的 ops 工作树仅在 HEAD 已不同于原基线、功能代码逐叶进入实际 main/live、分支仍在且原 owner/进程/请求/归档门通过后自动结算；可接受精确叶子集成。初始分配、未发布报告、脏树、活动者、常驻实例等保留。过程副本缺 batch.report 时可以原 out 最终任务回报 + learner_launch 的 cwd/task/scratch 补证明归属，仍只压缩原三类可恢复副本，不改变任务成功/入库或父要求。

绑定失败且原生仍活、回执/进程/产物矛盾、关闭回执不确定才请求 ops，原真实故障兜底保留。新增只读 report 的半开时间窗，分别给出确已写收件箱提醒、自动关闭并读回的 tab、去重异常介入请求；介入请求不冒作人工已处理。旧动作不倒填，未知发送与全局失败 notice 分列。

验证为 production tsc0、四个 Vitest 定向文件分组通过（合计7个包装/合同项；Python子用例101/18/20，不与包装重复累加）。最初四文件为3过1败，缺证判断过宽时误把原生完成矛盾/恢复证明缺 provenance 当成等待；收窄为仅文件缺失走三轮后，学习 tab 单文件1项通过。ops 树又补精确叶子/未发布报告边界，worktree 单文件1项通过。另两文件输入未再变，复用同轮原通过。不是一次完整组合全绿；完整检查由集成员按原队列协调。nice19、单worker，无 full/新调度/模型/生产 tab 操作。

`initial-contract-failure.log` 保留旧通知语义断言与新规则不符的初次失败；`initial-fixture-failure.log` 保留测试方法插入位置错误（NameError）并已修正；`initial-directed-failure.log.gz` 保留上述实际分类失败。回执与输入SHA见 checks.json，不删除旧失败。发前源码patch gitleaks0。

改动文件（含测试与说明）：

- `agent/tests/learner-tabs.test.ts`
- `agent/tests/worktree-retention.test.ts`
- `agent/tests/worktree-storage.test.ts`
- `docs/github-issues-workflow.md`
- `docs/learner-retention.md`
- `docs/learner-tab-reclamation.md`
- `ops/learner_tabs.py`
- `ops/tests/test_learner_tabs.py`
- `ops/tests/test_worktree_retention.py`
- `ops/tests/test_worktree_storage.py`
- `ops/worktree_retention.py`
- `ops/worktree_storage.py`
- `paper/materials/decision-log.md`

部署与验收：交原集成员沿原队列核验，三个生产 Python 叶子同批更新，原 wrapper/stall/日志/锁/开关保留。ops 记实际部署T及源码SHA，再沿 docs/learner-tab-reclamation.md 的 `report --since T --until T+24h` 读真实一天，另核独立 failure notice 和不确定发送；本开发没有操作任何生产回收，没有代验收。回退本次三生产叶子差量即可，保留新封存/journal/原件；旧 adapter 会保留未知 authority，不把新证明伪装为旧证明。

带尾空行的三份原始Vitest日志以mtime=0的gzip原字节保存，开发本地raw也保留；解压SHA与压缩件SHA见checks.json，不改写原失败或绿回执。

# 学习者产物回收

Roy 2026-10-13 要求：学习入库后回收过程遗留数据。原调度器的 learn tick 和完整检查结束时启动一个 `nice 19` 回收进程，每轮最多处理四批；不新增定时器，不启动模型，不改变对局或学习者权限。

普通学习者成功退出并完成原批次登记后，启动器释放该 checkout 的租约，自动提交本批回收请求到 `retention/requests/<batch>.json`。回收器优先处理这些请求，再处理历史积压；退出只是申请，仍须实际入库、完整检查及无活动 owner 才能删除。不依赖模型手动删文件，也不需要 ops 手动派清理。

实际源码发布必须已进入本实例的 main/live，原完整检查通过且原日志有完成摘要，才清理成功批次。复盘须先进入已完整检查的本角色经验库；仅有复盘、报告或进程退出不算入库。带原线程接续/研究要求、运行中、未发布、缺检查、失败退出、lost、rejected、未解决审计及脏工作树都保留。历史 merged=null/state=failed 但 rc=0 的兜底批次只在实际源码和后补完整检查都已验证时可回收；其原失败状态不改。

入库批次的 scratch 先压缩到本实例 `ops/codex-ops/retention/archives/<batch>.tar.gz`，逐文件核 SHA256 并读回压缩包，写持久清单后才删除原过程副本。小型报告、提案、JSON 清单和分析脚本仍留在原路径；完整过程材料可按批次恢复。归档不提交 Git，避免再被每个工作树复制。原对局 logs/data、经验库、账本、源码提交和分支、原生会话及 learner 事件流、out/err/完整检查原件不删。

独立且干净的已完成普通修复/策略工作树同时回收整个 checkout，分支保留。报告型批次没有入库结论时，只回收可由 Git 重建的 checkout，所有待证 scratch 原字节保留；不关闭提案或量化父项。共享 exp 和主检出不移除，只按已绑定的已入库 scratch 回收。原 request/thread 工作树保持，包含已完成但以后可增加 revision 的请求。租约、进程 cwd、实例根、路径与软链接边界在删除前复核；不读取凭据文件或跟随依赖软链接。

```bash
nice -n 19 python3 ops/learner_retention.py plan --limit 8
nice -n 19 python3 ops/learner_retention.py sweep --apply --limit 8
nice -n 19 python3 ops/learner_retention.py restore --batch <准确批次号>
```

`plan` 不删除。`last-sweep.json` 记录实际回收和保留原因，每批清单记录归档、校验、分支及空间变化。中断的归档不会自动重复删除；可显式恢复后核查。恢复拒绝被改动的现存证据、被移动的原分支、篡改的归档和运行中的 owner；独立工作树会恢复原分支 checkout。`CODEX_OPS_RETENTION=off` 可暂停自动回收，已保存的分支和归档仍保留。

每轮上限只计算可回收的批次。仍待入库、仅保留过程材料的报告不占这四个名额，避免较新的待证报告阻塞更早已完成的批次。

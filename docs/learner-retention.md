# 完成验收与现场回收

Roy 2026-10-13 要求：学习入库后回收过程遗留数据。原调度器的 learn tick 和完整检查结束时启动一个 `nice 19` 回收进程，每轮最多处理四批；不新增定时器，不启动模型，不改变对局或学习者权限。

所有学习任务成功退出并完成原批次登记后，启动器释放该 checkout 的租约，自动提交本批回收请求到 `retention/requests/<batch>.json`。回收器优先处理这些请求，再处理历史积压；退出只是申请，仍须实际入库、完整检查及无活动 owner 才能删除。不依赖模型手动删文件，也不需要 ops 手动派清理。专门研究、进阶验收和有父要求的任务也登记请求，但未完成的接续和入库门禁继续暂缓，记录实际原因。

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

## 运维、开发工作树和可重建缓存

同一回收进程会使用每轮剩余名额回收已发布且无活动进程的独立运维和开发工作树，总上限仍为四个。旧 `ops-*` 工作树须干净、至少闲置一小时、整个 HEAD 已进入本实例 main/live，且没有原请求或学习 owner 占用。新分配的运维工作树不能以初始 HEAD 已存在于 main 为由删除，必须取得下面的完成回执。live、exp、角色常驻实例、运行中、未提交、未发布、被锁定或有未完成要求的工作树始终保留。

开发或运维完成一个功能时，先跑项目要求的检查并实际合入 main/live，然后登记原源码和两个发布提交。程序逐项比对原源码与发布树的执行代码、校验文件和知识叶子的 Git 对象，允许保留来源分支的精确叶子集成；原请求的未完成范围不能被这个工作树回执关闭。登记后原调度 tick 自动清理，手动 sweep 也经过同一门禁：

```bash
nice -n 19 python3 ops/worktree_retention.py complete --workspace <工作树名> \
  --source <原源码完整SHA> --main-commit <实际main提交SHA> --live-commit <实际live提交SHA>
nice -n 19 python3 ops/worktree_retention.py plan --limit 4
nice -n 19 python3 ops/worktree_retention.py restore --workspace <工作树名>
```

唯一的忽略文件先归档、逐文件 SHA 校验并读回，原路径保留报告及原始 jsonl/out/err/log，体积大的过程副本可以恢复。只丢弃可重建的 Python 字节码、TypeScript 构建缓存及 checkout 副本；保留源分支。依赖、logs/data 只接受指向本实例原目录的已知软链接，绝不跟随删除共享目标。凭据名、陌生链接和未知文件暂缓。中断在删除前可重用原校验归档，删除后可重新投影原证据；修改过或新增的证据不会被恢复覆盖。结果在 `retention/last-worktree-sweep.json` 和 `retention/worktree-archives/` 持久记录。

## 新工作树的分配

新的普通学习和进阶验收工作树使用 `ops/worktree_checkout.py`，其他新功能和运维工作树也使用同一入口：

```bash
nice -n 19 python3 ops/worktree_checkout.py "$PWD" "$PWD/.worktrees/<功能名>" HEAD
```

分配前检查剩余字节和 inode，失败不启动模型；分配过程失败只回收本次尚未启动的副本，保留失败回执和来源分支。工作树默认不展开 `paper/data/history/` 的重复统计快照，其原件仍在 main 和 Git 历史中。牌组知识、复盘证据、最新统计表和任务输入保持可读。需要旧统计快照时按原提交从 Git 读取，或在该工作树显式扩展 sparse checkout。不能把 sparse 排除当作删除历史。

标准闭环是：任务结束登记 → 原范围验收和实际发布 → 归档校验 → 复核 owner/进程/租约和共享发布锁 → 回收现场 → 持久回执；任一门禁未满足，原调度器记录原因并继续重试，不派新的清理模型。原对局、token/费用原件、知识库、版本、学习账本、原生会话及失败证据不属于可丢弃现场。

实际删除和恢复必须在宿主进程视图中执行；沙箱只看得到自身进程，不能据此判断其他 owner 已退出。CLI 检出这种视图就拒绝删除，原调度器仍在宿主中自动执行。固定临时仓库用例独立验证回收函数，不操作生产目录。

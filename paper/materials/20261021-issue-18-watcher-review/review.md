# #18 watcher 核验

2026-10-21。仅核验，不执行回收、不删绑定、不改准入代码。

原 inventory SHA256 `b01d732d4cf04c4f04e659415ac376f951e657643bae9c2eef7c78848cb3633c`、plan SHA256 `a928d91f7de9e64bf80b180fe2e3e7692d9e59cf742ef30075a4cf7bd166a0b8` 均与 ops receipt 一致。JSON/TSV 336 行逐字段对应、路径唯一；315 个注册项 = main 1 + 顶层 254 + 嵌套 60，另有 21 个未注册顶层目录。顶层 275 = 保留 219 + 待补证 56 + 可回收 0，总计 141.20 GiB。嵌套 60 项不另加体积；du 是各 checkout 毛占用，不能当净释放量。

独立以 `worktree_retention.reclaim(..., False)` 对原顶层注册清单重新准入，保护/未注册路径只核元数据；没有调用会覆盖原 last-worktree-sweep 的 CLI plan。11:38:00 结束，0 项通过，首个阻挡条件分组与原表一致。`readonly-admission.json` 保存逐路径结果。核验初始注册及顶层目录集合与原快照一致；随后为 #8 分配了新的独立集成工作树，因此本清单是原快照，不能冒称行动时的实时全集。

## 219 项保留的主要原因

| 首个阻挡条件 | 项数 | GiB |
| --- | ---: | ---: |
| dirty | 76 | 45.87 |
| 实例绑定文件存在 | 72 | 28.53 |
| HEAD 未同时到 main/live | 65 | 27.84 |
| live / regent-climb 保护 | 2 | 23.78 |
| 活进程 | 3 | 0.66 |
| 原要求或 continuation 引用 | 1 | 0.18 |

这是首个阻挡条件，不能推断只有这一道门。65 个未发布项中 62 个 HEAD 已在 main、未在 live，3 个两边均未在；不得据此宣称学习完成或清掉未发布来源。

72 个绑定文件全部同 SHA `29c911f682b0e74ad4941f9d1673782b2de1fce2b5047adf25f23e92b354a213`，都是受版本控制且等于各自 HEAD 的 `ops/instance-binding.json`。当前 `checked_tree` 和 ops 盘点均按文件存在就保护。这证明有共同历史文件，不能证明 72 个 checkout 分别是独立运行实例；也不能反向推断它们全已空闲。

dirty 的两个大样本：`v6-refresh-legacy-incremental-20261020`（23.18 GiB）状态 15587 项全为未跟踪，主要是 `.artifacts/legacy-benchmark/`；`v6-refresh-background-incremental-20261020`（3.59 GiB）46761 项全为未跟踪，主要是 `.artifacts/refresh-benchmark/`。只检查状态和路径，没有读原始数据。它们含独有研究/检查材料，不能拿“全是 ??”当可删证明；先由原 owner 分类保存并 SHA 回读，能使用现有 storage 协议的另出精确非删除计划，无须放宽唯一产物保留要求。

## 56 项补证

未注册/证据投影目录 21；无显式 workspace 验收 20；scratch 未绑定原 report 6；未核实 ingestion 或 settled outcome 6；已分配 ops 工作树缺显式 complete 3。按原 owner/来源/原调度器补证，不补造完成回执、不清绑定绕过。

## 供 Roy 决定的准入判定修正方案（未实施）

仅修正“继承的实例文件 = 当前运行实例”的过宽判定，不放宽 dirty、未发布、原始证据、owner 或续跑保护：

1. live、regent-climb、exp 等显式保护名单保持；真实实例以原调度器/实例登记中的精确工作树、独立 runtime/session、宿主实际进程及绑定身份共同核验，字段缺失/冲突/宿主视图不可用一律保留。
2. 对仅继承公共受跟踪绑定文件的候选，逐项保存 HEAD、文件 SHA/来源与“不属于当前实例”的证据，文件保留原样；只有身份排除成立，才继续现有其余准入检查。不能只比较 PID、只查 Linux cwd、删文件或统一把 72 项放行。
3. 由开发另交固定数据测试与精确候选计划，watcher 再审。若 Roy 批准，只授权实施上述判定修正，不授权任何树删除。

当前结论：通过盘点核验，**本轮删除授权为 0**。不运行全局 `sweep --apply`；它可能包含复核后才符合条件的工作树或中断恢复项。未来非零批次先冻结具体 name/HEAD/owner/证据清单，再由原调度器使用已有 `sweep --workspace <name> --apply` 的定点路径及原锁逐项核验，每批最多 4；不能用本次 0 项计划覆盖之后的新候选。父要求与 #18 保持未完成。

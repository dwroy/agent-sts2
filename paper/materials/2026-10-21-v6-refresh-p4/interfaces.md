# P4 公共刷新增量接口与运输边界

2026-10-21，原 v6-w8。沿用 2026-10-20 原交付的接口，追加 reducer 检查点和序列化训练行缓存。统计定义、数据来源和正式知识不变。

## 启用、锁及后台顺序

`knowledge/builders/refresh.sh` 设置 `STS2_REFRESH_CACHE_DIR=<ops-root>/ops/legacy-refresh-cache`；未设置仍走原始生成器。`RunCache` 按日志绝对路径分区，原始前缀字节 SHA 通过后，只解析新完整行。缓存可以删除重建，不是知识文件。

report 启动的普通刷新、fight-value、费用与每十局漏斗共用 `ops/knowledge-refresh.lock`，锁在后台取得。下一局读取上一份完成包，准入不等待统计锁。子进程 nice 19 / ionice 3，BLAS/OMP 线程 1，DuckDB 1，LogDB 同步最多 2；不叠加后台大任务。历史包发布继续在 `ops/live-merge.lock` 内原子替换。

## monster 原归约器检查点

`legacy_incremental.FightCheckpoints` 只作用于精确的 `build-monster-db.Builder` 类型，其他子类不误用全局归约状态。`objects` 中保存无 pickle 的 JSON 压缩对象；`monster-checkpoints.json` 只保存候选 offset，不是权威状态。

边界为 EOF 及最近两条局身份各自的首个原始 offset；此前边界可以查找，只有代码和内容身份匹配才恢复。键包含实现摘要、日志路径、全部前缀行的 offset/bytes/SHA、机制输入、机制失败状态、前缀涉及局的总结和结束回合证据。保存发生在原 `finish()` 前，保留尚未关账的战斗、等待地图结算顺序、统计计数和 Mechanics；不保存外部 runs 映射或实例方法。

旧行改写/截断、旧局总结或结束回合证据改变、机制/实现改变均不能沿用受影响前缀；从更早的匹配边界或原归约器开始。缺失/损坏对象按缓存 miss 重建；坏 stamp 不应导致刷新失败。目标是减少旧局的统计归约，不绕过源字节验证。

原 `legacy-refresh-cache-v1` timing 的 `phases` 追加 `{name:"monster-prefix", resumed_bytes, source_bytes}`；这项是字节计数，没有 seconds，不能当作耗时或与其他阶段时间相加。

## fight-value 训练行与产物

有 `RowBuilder.replay_cached_rows()` 的提取器按原局段缓存已输出文本、rows/fights/by_asc 增量。命中时按原顺序写出文本和计数，不再执行旧战斗 commit。缓存键额外含 character；仍保留所有 carry、机制状态及跨局关闭顺序。新增或变化局段沿原提取器计算。

产品缓存只在 training rows、这些行实际使用的 choice/decider、树参数、实现和 move-model、全部输出 SHA 相同才复用。**新增相关训练样本仍批量拟合并执行原交叉验证**；在线学习属于另一种估计器，本次未引入。

## 组合指标的旧三叶依赖

`68c03b61a` 与原 `88c861525` 内容相同：`combo_metrics.py`、`build-combo-metrics.py`、`test_combo_metrics.py`。availability 按局贡献缓存；先决条件结果以局身份分区、保留实际 TS 词条求值；新局不扫描未变化的旧局 state 列表。首试/SL、unknown、来源和原总体归约不变，不改 W3 的构筑评估或安全门。

## 精确运输与完整验收

- 新四叶 source `5e04a021ab96dde4c0d97afa35a5645622ed99f5`；父 `68c03b61ae982bfa8c22b408c1caf68bbd8677ba`；tree `81c69058ad4eee01eec19f1b620495924556a4ce`。
- 起点 `5056cf4b6de4ebdb0576ac0ae1f1648f1d606c0f`。旧 26 叶出自 `e16464f87`，已在 main，实际 live 未采用。不能 cherry-pick 整个 e164（含旧记录快照），不能运父/整 main。
- `checks/source-manifest.json` 为 29 叶唯一列表：source SHA/blob、实际 R407 Git 前像及只读工作字节、旧 26/3/4 的所属层。`checks/minimal-transport.patch` 以 R407 `a7d07949efb03278a62050ca39447941309b4b7e` 为前像，仅包含这 29 叶。
- `ops/tests/test_disk_admission.py` 的较新 infra 断言已保留；运输差异仅补 autoplay 夹具依赖。若实际目标又漂移，保非重叠新内容，重新冻结真正联合输入，不能把旧叶后像覆盖较新 live。
- `checks/transport-proof.json` 证明该 patch 在隔离私有 index 中可应用且 29 叶后像逐字相同；不代表该组合已 tsc/full 或已上线。
- 仅 ops 单点完整检查；保持原阈值、短主盘 TMPDIR、nice 19、≤2 进程。通过后按已授权流程窄合 main，并在局终 STOP 发布窗上线。原定向绿不代新联合 full。

生产验收需区分：后台进程成功、包原子发布、后继局实际加载、样本进入指标以及 CPU/回合预算影响。单个 exit0 或当前 main 有代码不能替代这些读回。

复现脚本位于 `checks/reproduction/`，保存的是原执行脚本。脚本原放置点为功能树 `.artifacts/`，从自身路径定位工作树；复现时须放回该位置或显式调整 WT，不能从材料目录直接运行并误写其他路径。固定输入引用位于 `checks/benchmark/`，生产文件均只读，不应以当前日志替代冻结输入。

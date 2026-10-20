# 局后公共生成器增量缓存接口

2026-10-20。这是可删除、可重建的统计中间缓存，不是游戏知识，不改变原生成器的统计定义。

## 调用与并发

- `knowledge/builders/refresh.sh` 设置 `STS2_REFRESH_CACHE_DIR=<ops-root>/ops/legacy-refresh-cache`。未设置时，公共生成器走原始全量提取路径。
- 正常刷新与 fight-value 原有的 `<ops-root>/ops/knowledge-refresh.lock` 保留。由 `ops/report.py` 启动的费用汇总、每十局漏斗归档也先取得同一锁，后台重任务串行。准入与对局不取得这个锁。
- 每个生成器子步骤使用 `nice -n 19 ionice -c 3`；OMP、OpenBLAS、MKL、NumExpr 的线程数均为 1。药水表与漏斗的 DuckDB 查询线程数为 1；现有 LogDB 同步仍为自身的两个线程，不与本链路其他统计重任务叠加。
- 后台发布仍沿用上一交付的原子替换与 `last_completed_packet` 策略；本改动不修改 W3 构筑评估和安全门。

## 公共生成器

`knowledge/builders/legacy_incremental.py` 的 `context(path)` 根据环境变量和原始日志绝对目录，返回 `RunCache`，或在未开启/文件缺失时返回 `None`。目录为 `<STS2_REFRESH_CACHE_DIR>/<logs-path-token前16位>/`。

- `rows.sqlite` 复用 `incremental_evidence.FrozenLogIndex`：记录原始行的 offset、line、bytes、SHA256、run identity 和损坏原因；按源文件完整行前缀冻结。
- 每次检查已缓存原始前缀的字节 SHA256；仅追加部分做 JSON 解析。截断或改写重建该流。不能用 mtime 代替证据校验。
- `objects/**.json.gz` 是带内容摘要的 JSON 包；包含提取器、身份规则与实现摘要、按局原始行摘要、角色与进阶参数、所需外部输入。损坏重提取；没有 pickle。
- 战斗按原始连续局段缓存，键额外带入打开中的战斗、等待地图结算状态、结束回合证据和机制状态；重放原 `commit`，保留交错局与首试/SL 次序。每段只携带该局及原打开战斗涉及的等待状态；其他局的等待状态不重复序列化，等待队列顺序单独保存。
- 升级牌面保存原始证据 offset/SHA、独立 payload 和原始牌组位置；最终众数、独立样本与牌面归并仍由原生成器完成。
- 药水 SQL 按局缓存，键包含六张 LogDB 表的该局行数、原始证据摘要和提取/视图实现摘要；保留原角色过滤与 NULL 归属。冷建将所有未命中分区合为一次 SQL 查询，单局失效只查该局；避免按局重复扫描全表。MC 原始观察先合并，再做原平均/中位归约，不平均各局均值。
- `product-*.json` 只在训练行、这些行实际使用的 choice flags/decider 计数、树参数、代码/机制输入和所有产物摘要都一致时复用 fight-value 训练产物。追加训练窗口外的决定不触发拟合；新增训练行或相关选择改变仍执行原批量拟合，没有把模型替换为在线训练。
- 进程结束追加 `timing.jsonl`，`schema=legacy-refresh-cache-v1`：`seconds`、`sources`、`stats`、`phases[{name,seconds,bytes,rows}]`、`extractions[name]{seconds,hits,misses}`。阶段时间可能包含于总时间，不能相加重复计算。

## 报告与费用

- `eval/jsonl_cache.py:JsonlCache`：SQLite 存储精简事实，按原始日志路径与实现 revision 校验。仅解析新增完整行；原前缀改写、截断、实现变更或事实损坏会重建。`decoded/reused` 可读作本实例统计。
- `ops/report_log_cache.py`：`decisions(path, run_id=None)` 返回原报告相同的 `(run_id,recs,tail)`；`plans(path,run_id)` 返回 `(原始行号,原始记录)`。缓存只存选择所需的头部和原始引用，读回时再次校验原始行 SHA；旧格式无 run 的 GAME_OVER 仍按原规则归属，不推测身份。
- `last_run(path)` 保留 autoplay 原来对全部 mode 的最后非空 fingerprint run 选择；`decisions()` 保留报告只取 play 的规则，两者不混用。autoplay 的局号查找复用头部缓存。
- 报告缓存目录 `<原始日志根>/ops/report-log-cache`；费用缓存 `<root>/ops/component-cost-cache`。缓存不存 Jev/大脑题面正文。费用仍做全体精简事实上的去重、订阅分摊与来源分类，以处理迟到回执；第二次解析完整 brain 日志已移除。
- `report_log_cache.states(path,run_id,wanted)` 从 `<日志根>/ops/report-state-cache` 的完整后台索引读取本局及指定时间戳的原始状态。`refresh.sh` 的 `report-state-index` 负责冷建索引；前台遇到尚未建好或正被后台占用的索引，立即沿原文本筛选路径读取。已有索引只解析新增完整行，原前缀 SHA 校验保留。独立非阻塞锁避免冷建索引阻塞报告，状态缓存和决定/计划缓存使用不同数据库。原文本预筛选、外局同时间戳覆盖顺序及无动作的战斗帧均保持。

`refresh-step.py` 在原 `knowledge-refresh-step-v1` 收据追加实际 nice、子进程 user/system CPU 秒、峰值 RSS KiB 和开始/结束负载；不记录命令行或环境值。墙钟耗时与 CPU 耗时分列，用于区分计算与资源等待。

## 验收边界

固定数据覆盖冷/热等价、单局追加只失效该局、交错战斗、首试/SL、众数与名称平局、药水 SQL/MC/商店、改写/截断/损坏缓存、未完成尾行、原始行号、费用去重和共享后台锁。实际耗时、完整检查及自然对局并行测量另记报告；中断样本不得充当测量结果。

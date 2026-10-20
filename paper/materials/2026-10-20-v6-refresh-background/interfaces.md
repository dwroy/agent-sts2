# 局后后台刷新与增量缓存接口

本次不改游戏知识、组合定义、指标口径或英文题面；“构筑评估”只用于中文记录。

- `ops/report.py::refresh_knowledge(character)` 始终以 `nice -n 19`、独立 session 派出原有刷新命令，不再等待子进程；旧的 `REFRESH_WAIT=1` 也不恢复等待。返回 `status=background, admission_wait=false, exit=null, history_policy=last_completed_packet`，以及两个 worker PID 和可读到的上一份历史包 `{cutoff, generated_at, sha256}`。这是派出回执，不代表计算或发布成功。
- `ops/report_run.py` 接受上述派出状态；`ops/autoplay.sh` 不再设置等待变量。报告及局号入账仍按原流程完成，后台失败不删旧包。
- `knowledge/builders/refresh.sh` 用 `ops/knowledge-refresh.lock` 串行统计任务，不持有 `ops/live-merge.lock` 做长计算。每步通过 `refresh-step.py` 向 `ops/refresh-timing.jsonl` 追加 `knowledge-refresh-step-v1`：名称、开始/结束、秒数、退出码、worker PID；不记录环境或密钥。
- `refresh-v6-history.py` 在 `ops/codex-ops/v6-refresh/<character>/cache/` 保存可重建缓存；原 receipt 和逐次中间产物保留。`refresh.lock` 防止同角色并发更新；只有最后校验与原子替换需要短暂取得 `ops/live-merge.lock`。正式核心卡在计算期间变化或已有更新截止时间的包时不覆盖，保留原包和失败回执。
- 新增 `incremental_evidence.py::FrozenLogIndex`：SQLite 保存四个原始流的行号、原始字节范围、SHA、局号和坏行原因；不复制整份日志。每次核原前缀 SHA，只解析新增的完整 JSON 行；修改/截短前缀重建，半行尾失败。缓存对象为带身份与内容校验和的 gzip JSON，损坏即重算；缓存不构成新的证据。
- 按局缓存冻结帧、Boss 入场、出现概率观察、越界排除、标准化状态，以及每个组合的首试/含 SL 贡献。键含实现 SHA、实际原始行 SHA、角色和相关定义；新增一局不让旧局因全局日志增长而失效。合并已有贡献后重新执行原来的分布、误差、回归与收缩汇总，避免改变统计口径。组合或求值器变更会失效相关缓存。
- `build-combo-metrics.py --cache-dir <directory>` 为可选参数；不用时保留原有全量路径。stdout 增加 `timings` 与 `incremental`；后者含 `decoded_rows, indexed_rows, rebuilt_streams, cache_hits, cache_misses`。`combo-prerequisites.mts` 按原始帧 SHA、条件和实现 SHA 缓存结果，每次仍核原始字节 SHA，命中不重复解析状态与求值。stdout 给出命中/未命中数。
- `v6ProjectionInputs` 可选第三参数 `onSnapshot(row)`，每局冻结时调用一次；生产写 `logs/v6-history-snapshots.jsonl`，schema 为 `v6-history-snapshot-v1`。行含 `run_id, character, status, loaded_at, policy=last_completed_packet`；成功加载另含 `cutoff, generated_at, content_sha256, age_ms`。`age_ms` 相对证据截止时间，不是文件修改时间。开关 off 不读文件、不写此日志。
- 历史包格式仍为 `v6-frozen-history-v1`，字段名不变。原始引用 offset 接受安全整数范围，修复已有 1 GB 限制拒绝真实日志的问题；超出安全整数仍拒绝。

增量边界：原始前缀仍全部读字节核 SHA，汇总分布/回归仍合并全部局贡献；最终输出文件完整重写并原子发布。旧 `monster-db/card-upgrades/outcome/room-costs/boss-damage/fight-value/construction-opportunities` 生成器的统计算法没有在本补丁中改写，仍会全量计算，但已退出下一局等待链并有逐步计时。`logdb sync` 沿用已有增量。未派学习任务，未运行模拟、对局或真实模型请求。

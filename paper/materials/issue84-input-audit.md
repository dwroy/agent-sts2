# #84 实施前输入边界核查

本次接续仍在原树、原方案提交 `52ba46cf9` 上，只读核代码；没有新增主管批准评论。下列是实现前的工程事实，不是准入或发布回执。

## producer 入口及特殊依赖

| producer | 已定位入口 | 必须处理的依赖边界 |
|---|---|---|
| monster-db | `knowledge/builders/build-monster-db.py` | characters、refresh_publish、legacy_incremental；缓存 fight 提取沿原方法 |
| card-upgrades | `knowledge/builders/build-card-upgrades.py` | refresh_publish、legacy_incremental 的卡牌增量路径 |
| outcome | `knowledge/builders/build-outcome-stats.py` | characters、refresh_publish、legacy_incremental → builders/incremental_evidence → learner/evidence_identity；没有 agent/src 输入 |
| construction-opportunities | `knowledge/builders/build-construction-opportunities.py` | refresh_publish、legacy_incremental；直接读取 LogDB frames Parquet；game-data 是数据输入 |
| room-costs | `knowledge/builders/build-room-costs.py` | characters、refresh_publish、legacy_incremental 的 room 路径 |
| boss-damage | `knowledge/builders/build-boss-damage.py` | characters、refresh_publish、legacy_incremental；原 grep 子进程不是 TS 模型导入 |
| potion-equivalents | `knowledge/builders/refresh-potion-equivalents.sh` → `build-potion-equivalents.py` | 原 shell cadence；实际读取 potion-values.ts/card-model.ts 文本；LogDB query/sync/extract/views.sql/component_usage；保留真实 TS 输入，不能按“Python producer”排除 |
| v6-history | `knowledge/builders/refresh-v6-history.py` | learner evidence_identity/history_boundary/appearance_stats/incremental_evidence；build-combo-metrics.py/combo_metrics/combo_pooled；两条 combo MTS 与 build-v6-history.py → agent/tools/v6/freeze-history.ts 的实际导入闭包 |
| fight-value | `knowledge/builders/build-fight-value.py all` | 动态 spec_from_file_location 导入 build-monster-db.py；characters 与 legacy_incremental；注释提到的 TS 消费者不是导入 |
| silent-boss-calibration | `agent/tools/boss-sim/refresh-silent.py` | ROOT 当前入口、content_store、character_extract、silent_calibration、report、pinned_silent 及真实模拟入口；原 model_fingerprint 本身会读全部 agent/src 和 boss-sim 源码，需保留其科学冻结规则 |
| move-model | `knowledge/builders/build-move-model.py` | 原 stdlib 顶层脚本；原始 states 是数据 |
| event-pages | `knowledge/builders/build-event-pages.py` | 子进程 agent/tools/logdb/query.py 的实际依赖与 views.sql，不能只解析静态 Python imports |
| opening-value | `knowledge/builders/build-fight-value.py` 的 opening 分支 → `opening_value.py` | 没有 build-opening-value.py；不是 refresh_driver 的现有周期步骤，不借本修复新增周期 |

该表只是入口和特殊边，不冒完整受测闭包或具体方法 SHA。所有 producer 共用的实际 ROOT refresh_step/Store/control/验证器还须在批准后的实现中独立列来源，不能从 LIVE 缺失 ops 叶推算。

## LogDB 补算的等价约束

`agent/tools/logdb/views.sql` 的 `runs` 是 runs_raw 与 frames 的 FULL JOIN，包含未结束局，且补出字段；不能直接替换 outcome 的 `read_runs()`。应取 `runs_raw` 的原日志 off/len，恢复原结束局行，并维持原按顺序后行覆盖的规则。decisions 和 frames/state_index 同样用原 off/len 读取完整行，保留原事件/休息匹配、名字第一次出现顺序和非战斗帧筛选。

query.py 默认会 sync，默认行数 200 且有 CELL_CAP；补算必须使用显式冻结和不截断的索引读取，不能拿默认 JSON 显示接口输出当完整数据集。raw 路径与 LogDB 索引范围/源绑定、截止线和 SHA 需逐项核实；新增游戏中的追加数据不能混进已冻结输入。

## 告警接线及检查约束

`ops/codex-ops.sh tick stall` 已是五分钟观察入口，能承接无刷新周期的12小时水位检查；不新设调度。refresh_driver 的 `step()` 目前只覆盖子程序返回，准入拒绝必须在外层实际 run 生命周期写终态。

`agent/tools/test-sandbox.sh` 支持 `SANDBOX_WORKERS=1`；其默认值为4，后续检查不能沿默认运行。原脚本同时包含 npx、with-temp 和 forks/threads 包装，执行前还需核实际进程链符合本单最多两个进程的限制；不以单worker文字声明代进程核验。

## 继续条件

实现仍待 #84/6497894010 要求的主管方案批准，或 Roy 明确批准/撤销该前置。重复的“轮到你/请接着做”提醒本身不伪造主管批准回执。获批后恢复原树和线程，沿 `issue84-fixed-producer-plan.md` 实现；未获批前保留本次工程核查材料，不改 main/live/STOP/control、不跑生产补算或模型、不改 review。

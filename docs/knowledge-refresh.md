# 局间知识刷新

#40 只改变计算、调度与发布方式，不增添游戏机制或策略知识。`knowledge/builders/refresh.sh` 保留原入口；`ops/report.py` 只在实际 live 含 `refresh_driver.py` 时传 `--all`，一个后台 worker 串行完成普通刷新与 fight-value，报告线程不等待。main 已合而 live 尚未发布时沿用原来两个调用，避免向旧入口传新参数。

## 增量与等价范围

- `FrozenLogIndex` 共用旧 SQLite 索引。设备/inode、路径、已完成换行前缀及 SHA 决定是否续接。轮转、截断、旧前缀改写都重建并记录原因。设备/inode/size/mtime_ns/ctime_ns 全部不变时复用已验证的索引，其他情况下仍校验旧前缀 SHA；没有用 mtime 单独替代证据身份。
- fight-value 保存原 `RowBuilder` 的 open/pending 状态、计数和训练行稳定前缀位置；只给原 reducer 喂新增帧。旧 EOF 的临时结论不作为稳定前缀，下次重写这段尾部。已有终局摘要修订、影响旧未定战斗的摘要晚到、实现/角色/游戏数据变化、检查点损坏、训练行被改写都回退重建。角色筛选、SL 尝试、战斗闭合顺序和原全量语义保留；正在进行的局只沿用原有 EOF 暂定口径，不计入“已结束局”训练分母。
- card-upgrades 保存原聚合器的见证去重集合、Counter 插入顺序、完整牌面/原 offset/SHA 和坏行列表。只处理新增帧；冷缓存、日志身份变化或校验失败从头重建。模式平票顺序、原始证据路径与字节 SHA 保持。
- monster-db、room-costs、outcome、boss-damage、construction 和 potion 沿用现有的分局/分段缓存及原 reducer。monster-db 仍回放缓存中的战斗统计，避免重新解释全部旧原始帧；未改其公式、阈值和角色范围。
- 同一冻结换行前缀的 fight-value rows、模型 JSON、gates JSON、card-upgrades、怪物统计应与全量一致。训练报告只允许运行耗时行不同；V6 包原有 cutoff/generated_at、运行回执时间/路径、缓存命中数、inode/stat、索引代号等审计字段仍随执行变化。这些字段不能用作收益结论。

## 训练周期

`all` 每次抽取，但默认每 **10 个本角色新增已结束 run_id** 才训练。`FIGHT_VALUE_TRAIN_EVERY=N` 或 builder 的 `--train-every N` 可配置，N 必须为正。另有 `refresh.sh --all --idle --character silent`：仅供 ops 已核实的空闲训练边界，有未训练新局时提前训练；不自动把每局之间的短暂空档当空闲。显式 builder `train` 强制训练。

首次没有训练回执、缺失或损坏任何上次训练产物时先建立一次完整模型。之后未达周期时保留上一版模型、gates 和报告。训练只写临时目录，三份文件完成后才在各自目标目录准备临时文件；短时持发布锁分别 rename。训练失败不修改旧文件、不推进训练回执。维持原消费者逐文件原子读取契约，未引入跨三文件的读事务；不把发布锁宣称为消费者的多文件快照锁。

回执位于训练 rows 旁的 `*.training.json`，记录已训练的本角色 run_id 与完整输出 SHA。这些都是可重建 data，不提交 Git。

## 队列与锁

执行顺序：#20 heavy admission（`other`，低于 ops/integrator/learner）→ `knowledge-refresh.lock` 计算 worker → 各步骤自身缓存锁 → 仅发布时 `live-merge.lock`。计算不持 live 锁。沿 #38 的规则，检查方拿不齐全部锁时须先释放已持锁，再排队；禁止持 live 锁等待 knowledge worker。没有新增调度循环，也不抢占已有重任务。

入口动态使用运行根的 `ops/board_heavy.py` / `queued_argv`。#20 尚未部署时明确打印 `legacy: issue-20 adapter not deployed`，开关 off 时打印 `disabled`；都继续原串行 worker，不能把它们称为重任务队列已启用。**#40 的生产优先级验收依赖 #20 准入、精确 kit 安装及 heavy.enabled 实际开启。**

合入 #20 与 #40 的 `ops/report.py` 时注意：新 combined 刷新由 driver 自己只入队一次，保留 #20 的成本统计排队和 ablation 改动，不在 report 外层再次包 combined 刷新（单槽时嵌套入队会自等）。旧 live 兼容分支按 #20 原逻辑入队，待统一发布后消失于实际路径。

## 耗时与剩余复杂度

| 步骤 | 本次后仍需的工作 | 随日志增长的估算 |
|---|---|---|
| fight-value 抽取 | 新帧解析、原 reducer carry、训练行小文件稳定前缀复制 | 解析 O(新增帧)，训练行校验/复制 O(已有训练行)；变动日志的旧前缀 SHA 仍 O(旧字节数) |
| fight-value 训练 | 原算法、全训练行拟合，每 N 局一次 | 单次与原训练相同；摊销约原训练时间/N，不承诺端到端提速倍数 |
| card-upgrades | 新见证解析、累计去重状态读写、聚合输出 | O(新增帧 + 累计唯一见证)，不再逐局回放全部见证 |
| monster-db | 分段缓存命中、已完成战斗统计回放 | O(累计战斗统计)；暂不持久化整 Builder 的机制全局状态，以保留闭合、跨局与反例语义。原背景约150s可作同负载基准，战斗统计翻倍时回放部分约翻倍，非实测预测 |
| v6-history | 原分局缓存、包组装、冻结源前后完整 SHA 检查 | 摘要 O(累计样本)，严格校验 O(日志字节数)；原背景约270s，翻倍日志时校验部分约翻倍。此次不放宽冻结证据校验 |
| logdb / potion / catalog | 原增量同步/分区缓存、原降频药水表；目录重建只读较小发布数据 | 不是新增的 states 全库 JSON 解析；catalog 仍随发布源/条目数线性增长，生成与 fsync 在发布锁外 |

背景数字来自 #40（最近10次约33分钟刷新、fight-value约960s、card-upgrades约460s），不是本次测量。正在跑的新局会继续追加日志，因此源 stat 变化仍可能触发再次前缀校验；不承诺每周期严格只读一次旧前缀。首次部署会因实现身份改变重建缓存；该次必须与后续暖缓存刷新分列。

## 上线与自然读回

开发树不跑生产刷新、不运行 play、不改 live/STOP。集成员做最终组合完整检查；ops 沿自然边界发布。

1. #20 的 `ops/report.py` 与本文的合入边界核对完，确认 combined 不重复入队；启用后的摘要中刷新应排在 ops 上线检查后。未部署/开关关闭的旧路径单列。
2. 精确发布 driver、全部修改过的 builder、三个新 helper 与 report 兼容入口；不能只带 shell 或只带 helper。报告端读取实际 live 文件决定 argv。影响下一局启动参数：本 issue 不修改启动脚本或决策参数；report 后处理路径随实际 live builder 发布切换。
3. 读回 `ops/refresh-timing.jsonl`：step-v1 的分步时长和失败码，cycle-v1 的 worker 等待/持有/总时长及 failed_steps；读回 `ops/refresh-publication-timing.jsonl`：按 step、PID 分列 live 锁等待和实际持有秒数。worker 持有时间不是发布锁持有时间。`origin_pid` 对应报告端返回的 worker PID，`cycle` 贯穿分步、缓存和发布回执；`queue_wait_seconds` 单列 heavy 等位，`wall_seconds` 包含等位，`seconds` 从进入 worker 阶段开始。
4. 读回 `ops/legacy-refresh-cache/*/timing.jsonl`：prefix_bytes_read、decoded_rows、重建原因、fight-value/card-upgrades 的 processed_frames/from_offset；核角色独立训练周期、模型 SHA 和下一局实际读到的完整模型。自然首发、暖缓存、触发训练的局分别列出，与背景同口径比较。
5. 保留首轮失败与所有旧发布/科学父项。本次固定测试不替代自然对局时长、队列启用或读者实读验收；本 issue 到这些回执完成前保持开放。

回退时由 ops 停止接收本刷新版本的新任务，等原 worker 自然退出，再回退相关源码组合及 report 兼容路径；保留日志、训练数据、旧完整模型与全部回执。增量缓存可改目录重建，不删除原始证据，不把回退称为学习经验失效。

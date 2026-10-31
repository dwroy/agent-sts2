# #58/#60 运行接收与迁移准备

本稿只准备执行合同。C5 原事务、原对局、STOP、原 full owner 不动；未创建生产数据库、启用 runtime、停止学习或执行迁移。

## 顺序与当前检查

1. 原 C5 worker1487883/birth28580454完成自己的自然终态、原报告、知识写入、生产工具读回与 release。
2. #58 固定660b2e50c，独立 anchor8a5b8be6/treecfb6ad71、22源码/合同叶，原集成员唯一 full1704895/birth28720005。只接其终态及实际集成回执，不由ops重集成/full。C5之后就绪源码58优先，不被后续普通内容候选挤占。
3. #60 固定5d7bc13c3，20源码/合同叶，已独立核验末次进阶修正；下一批，不加进已经启动的58检查、不让58等待。组合通过/集成后才接自己的自然源码窗口和迁移。
4. 后续纯内容走届时唯一有效知识入口；D/C3旧候选保留，不能并行启动另一旧Git知识发布器。

01:22只读诊断：原局UVEXNP9HCMAY，Silent A10/F17/T9，COMBAT，62/70HP；C5 01:01前缀后新增71,968字节/118动作，01:22:00仍end_turn，01:21:46 Jev选择1.15秒。worker实际pidfd等1198864退出，再等1198875与原autoplay1245890的report/自然退出；当前没有整局terminal/report完成证据。详见original-run-progress.json。观察到真实动作推进，未触发任何停止/恢复操作。

## #58 必要运行验收

- 固定代码/发布号：实际live行为提交、22叶SHA、实际注册工具清单和发送系统提示SHA分别留证；开发固定快照不代生产提示。
- 新自然脑题：能力说明来自该角色实际ToolDef/name/inputSchema；Silent按实际15项核，最终无工具阶段与重问阶段撤下说明；没有固定策略/rk查询前置。
- 原logs/brain.jsonl、logs/run-plans.jsonl及logs/decisions.jsonl逐题关联question/run/floor；run_plan_merge/plan_update的reused、updated、checkpoint与实际落盘/下一题读回分列。
- 未变路线、省略/null/keep时核原计划保持及后继消费；plan_facts/next_rest/candidate_routes的依赖复用与实际失效字段分别核。不能仅按答案变短或查询变少宣称省计算。
- 若自然发生改线，再核大脑结合当前情况的收益理由、route/build独立更新和受影响部分重算。未遇改线、冷恢复或SL不造场景；这些与#50达标线、长期胜率父要求继续留runtime。
- 使用原brain-agent-report.ts逐题报告作为索引，最终核原JSONL与原生请求；报告accepted不是落盘/采用，未知字段保留null。

## #60 最终冻结与旧发布器停写边界

当前观察不是最终冻结：实际live白名单只有8文档/764条或文档修订；开发隔离9文档/765含main中的external/sts2fun/builds-v1/archetypes.json，当前live没有该叶，现有策略无archetype触发。main与live策略集合相同、序列不同。迁移必须以实际有效生产来源和原字节为准，不能直接导入开发9/765或把main独有几何变成生产知识。

- 最终切点在C5结算及#60组合通过后，重新记录实际pre60代码（已含58）、源码发布号、实际知识来源、白名单各叶原字节/SHA/版本/证据/confidence/冲突及引用。C5的新ID/更新/反证必须包含；此时的条目数重新计算，不预报成772或沿用本稿764。
- 已发布白名单：common/shared-experience.json；各角色experience、strategy-entries、reflex、reflex-vocab、build-cores、direction-cards；外部archetypes只在确属已发布实际来源时纳入。不存在的叶不从main、报告、测试几何或pending目录补出。
- 原knowledge-refresh/live写锁只用于短冻结/源码与配置发布，不持锁等对局或模型。数据库候选发布用SQLite自己的串行事务，不再获取live-merge。
- 已知旧writer：C5原Python/Git发布器必须先完整结算；D004302/C3004756等旧知识发布尚未开始，排在新源码优先级后，切换后不得再作为有效Git发布器执行；旧任务仍按原合同完成并保留产物，不热改prompt/批次/HEAD。
- 核当时learn.json实际旧writer/租约与refresh任务。迁移短窗口不允许旧writer修改有效迁移叶；DuckDB、日志、Parquet和非迁移统计保留。不用STOP、批量kill或长期全局drain替代此边界。
- 唯一有效源切到runtime快照后，旧JSON只作保留的回退/引用来源。常规内容进入runtime候选；代码改动继续原研发源通道，未知/反证/提案义务不绕过。

## 宿主与运行环境

已读本轮只读内存SQLite元数据：Node v22.23.3/SQLite3.51.3、JSON及FTS5可用，保留node:sqlite实验性警告。Python3.46.1不作WAL运行库；未装包或升级共享Node/Python。data位于宿主ext4(/dev/sdd)，本次观察余241,176,219,648字节，原磁盘准入规则不改。data/knowledge-runtime被/data规则忽略，当前未创建。

切换前须确认STS2_KNOWLEDGE_RUNTIME能在原新局、原调度/launcher及完成/recheck三端一致生效。#60 run.sh读取本项目ops/production-runtime.sh，launcher和ops/knowledge_runtime.complete读取环境变量；只给run.sh设置或给broker客户端加前缀，不能据此推定父调度/完成回调已经继承。此操作入口交原#60 owner确认；如需小接线，留60下一批，不阻58。不得通过改共享home、账号、服务档或热改在途环境处理。

## 导入、真实最小单元与读回

以下命令是从已部署agent目录执行的清单，变量只在最终实际切点赋值；当前不执行。TASK_FROZEN是最终有效叶冻结目录，TASK_RUNTIME是宿主本地忽略目录，TASK_CODE是已核实际live代码，TASK_MIGRATION_ID由冻结清单指纹生成；TASK_BASE/TASK_VERSION均从真实CLI返回读取，不手填。

```bash
nice -n 19 node --import tsx tools/knowledge-runtime.ts init --runtime "$TASK_RUNTIME"
nice -n 19 node --import tsx tools/knowledge-runtime.ts import --runtime "$TASK_RUNTIME" --knowledge "$TASK_FROZEN" --id "$TASK_MIGRATION_ID" --source "$TASK_SOURCE"
nice -n 19 node --import tsx tools/knowledge-runtime.ts current --runtime "$TASK_RUNTIME"
nice -n 19 node --import tsx tools/knowledge-runtime.ts verify --runtime "$TASK_RUNTIME" --version "$TASK_BASE" --knowledge "$TASK_FROZEN"
nice -n 19 node --import tsx tools/knowledge-runtime.ts backup --runtime "$TASK_RUNTIME" --destination "$TASK_BACKUP"
```

先在隔离目录以同一冻结输入import/verify，再在生产目录执行并逐叶原字节回读。开发fixture和数据库创建均不代验收。

首个真实单元优先复用D004302六条已学习事件文字策略；六个不可加载event rk不混入。原batch/source/input SHA、核验过的destination_files和候选对象完整保留。export实际DB基线的完整策略文档，只追加六个原对象，其余内容不改；不以旧Git完整文档替换DB新版本。原引用产物继续受续接保护，避免为了换归档路径破坏artifact精确匹配。

```bash
nice -n 19 node --import tsx tools/knowledge-runtime.ts complete --runtime "$TASK_RUNTIME" --candidate "$TASK_CANDIDATE" --id "$TASK_BATCH" --code "$TASK_CODE" --approval "$TASK_APPROVAL"
nice -n 19 node --import tsx tools/knowledge-runtime.ts status --runtime "$TASK_RUNTIME" --id "$TASK_BATCH"
```

必须先以真实TASK_BASE形成knowledge-candidate-v1文件；本稿不造K1版本或候选文件。相同ID/相同body再回调只得同一发布；未知结果先status/current。CAS冲突不更改同ID/body强投，交原owner保原件形成可审计修订。CLI、原完成状态、账本与通知分别留真实回执，不把旧done重写为新模型完成。

生产tools正例/错误角色/错误进阶/不匹配题型与原返回语义、24KB/来源SHA核回；数据库query耗时与完整tools分列，原kb_reflex约197ms瓶颈不掩盖。自然新局绑定代码+K1/snapshot，读原run-config和实际工具/只读消费者，原局恢复必须回原binding，缺绑定不取latest。

首次真实自然绑定、实际新条目消费者命中、采用/收益分别待证。只读绑定或固定tools通过不冒自然命中；没有实际机会就保留pending，不能强制查询、模型、tick、测试局或重启旧学习。

## 回退

- 回退代码是最终实际pre60 live提交，必须含58及C5；当前R446只是观察值，不能在未来直接拿它回退而丢58/C5。
- 知识回退用rollback切旧K1，只影响新绑定；在途原局保持其已绑定版本，后续候选/修订/失败不删除。
- 用SQLite一致性backup，不复制活动sqlite文件冒备份；损坏原DB/WAL原样保留，restore到新宿主目录、完整性/快照逐叶核验后自然边界切目录。
- 恢复旧发布器时先结清本owner发布门，再在自然边界撤下runtime/snapshot配置、恢复最终preSQLite原字节；只有一个有效知识入口，旧产物与科学父/通知ACK继续保留。

```bash
nice -n 19 node --import tsx tools/knowledge-runtime.ts rollback --runtime "$TASK_RUNTIME" --version "$TASK_OLD_VERSION" --request "$TASK_ROLLBACK_REQUEST"
nice -n 19 node --import tsx tools/knowledge-runtime.ts restore --backup "$TASK_BACKUP" --runtime "$TASK_NEW_RUNTIME"
```

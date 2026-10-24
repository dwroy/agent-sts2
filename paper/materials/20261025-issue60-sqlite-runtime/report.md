# #60 工程交付

基线 `ebe5bfc38d80694f6ec5a4f2e0c8ebf0bb2c3bf5`。本批没有运行 play、修改 live/STOP、写生产数据库、修改游戏知识或关闭其他会话；没有增加依赖或升级共享环境。源码范围及 SHA 见 `source-inputs.json`；固定提交在 #60 交付评论给出。运行模型启动参数与原生生效验收分账，本报告不代核原生档位。

实现 schema v1、候选合同 v1、知识版本 `K1-<SHA256>`：SQLite/WAL、逐条 JSON 修订、关系索引/FTS5、来源/证据关系、幂等候选、格式/范围/反证/完整引用检查、基线 CAS、快照先持久化后事务发布、按运行绑定、版本回滚及一致性备份恢复。使用现有 Node v22.23.3 内置 SQLite 3.51.3，写库前验证官方 WAL-reset 修复版本；没有使用宿主 Python SQLite 3.46.1 写运行库。

读取兼容层只接管第一阶段已迁文档：经验、共享经验、文字策略、rk、vocab/core/direction 与已固定的流派几何。工具公共名称、入参、来源/反证/confidence、匹配、分页与大小限制沿原消费者。旧文件保留；原日志、冻结证据与 DuckDB/Parquet 统计不迁、不改角色证据分母。默认 off 的知识/对局路径保持等价；运行配置只在启用时增加知识版本和绑定。

已接原 launcher 与 `finish_write_batch/recheck_write_batch`：新自然内容任务从正式数据库基线产 scratch 候选，原完成回调校验/发布，不制造知识 Git commit/main-live 合并或完整源码测试。经验→代码提案义务复用原库；外部/回刷继续核原生与冻结源，每个变化须等于原 artifact。代码任务继续原研发链。发布失败/不明进入 awaiting_review，保存原 rc/候选/每次尝试，由同 ID recheck 收敛；不重启模型。原源码发布锁不参与数据事务。

`ops/run.sh` 有默认关闭的自然边界接线：新单局分配启动 key，实际 run-config 关联局号/源码/知识版本；重启从该局旧日志恢复原 key，缺失时暂缓，不能误取 latest。进程固定不可变快照，发布只影响下一新绑定。没有热切生产。

## 迁移与性能

固定基线真实数据导入 **9 文档 / 765 条修订 / 10,156,395 字节**，逐文件读回原字节/SHA 一致。包括 232 铁甲、8 Regent、245 Silent 正式/退休经验，114 策略、160 rk、4 core，以及 vocab 与固定几何文档；共享经验文件当前0条。没有把 pending 或旧失败转成正式知识，没有抬高 confidence。原文档自身版本、证据、反证、附件与全部引用保持。

最终数据库热查询 P95 0.32–4.49ms，连接冷 P95 3.17ms，写事务内另一连接读 P95 2.31ms；1万条固定样本的两字/三字/别名 P95 28.42/40.28/3.63ms。最终快照策略工具 P95 9.63ms、rk工具 P95 197.19ms。最终计时见 `benchmark.json`，早期测量完整保留在 `benchmark-first.json`；入口为 `agent/tools/knowledge-runtime-benchmark.ts`，仅临时隔离库，包含真实规模、1万条格式夹具、热查询、连接冷启动、写事务内另一连接读旧版、快照 tools。冷启动不含清 OS 页缓存，双连接是单进程交错，不冒称独立 CPU 写者压测。计时边界不含 LLM/网络。

数据库查询与工具整体时间分列。`kb_reflex` 的原消费者会反复解析并严格验证约8MB core 引用，首次基线测得工具 P95 约287ms，超过50ms初始目标；这不是 SQLite 查找时间。该瓶颈明确保留，本阶段不改变引用校验语义或将其冒称为整体大脑提速。自然读写并发和真实局耗时由 ops 在部署后复核。

## 检查

生产范围加 runtime CLI/新测试的独立类型配置 `agent/tsconfig.knowledge-runtime.json` 已通过。它包含生产 tsconfig 的全部 src/learner，另检查本项 tools，避免把未修改分析工具的额外类型错误混为本项结果。

固定测试覆盖重复回调/重启、ID冲突、两个候选生产者CAS、读者原子可见性、busy保留与续接、缺引用、角色/进阶隔离、scope/反证删除拒绝、发布中断、回滚、备份恢复、原tools正/负例与大小限制、真实默认加载路径/版本来源、学习提示以及原冻结artifact限定。Python固定测试覆盖完成分流、源变更拒绝、超时保留、经验代码提案门、新局key与同局恢复。最终汇总 `checks.json`：生产 tsc 和 runtime tsc 均0；定向4文件30项、paths单fork11项、Python6项及 bash语法全部通过。沙箱组合首轮634文件中633过，5856项过/1项失败：check-imports缺稀疏省略的历史 results.jsonl。沿原 materialize 精确恢复 HEAD blob b84d95c5185941eec143cbcf2966d5770309cca5（211076字节）后，原失败项已纳入30项复验并通过，原失败日志保留。大组合启动早于末次边界校正，最终源码另经类型与定向复验；没有冒称新跑了一轮完整 main/live 组合。为遵守进程限制，采用 test-sandbox.sh 同一排除名单、直接node/一个线程worker，paths另单fork；未扩大排除。原输出保留在本目录检查日志。

额外全 `tsconfig.tools.json` 尝试失败，报在未修改的 boss-loss-backtest、boss-sim/pairs、combat-latency-replay、deepseek replay、double-boss/validate 等分析工具中；没有把这次失败改写成通过。本项独立 CLI/生产范围类型检查通过。原完整组合检查仍由集成员按届时有效交付队列核验，不以这些定向检查代 main/live 组合证据。

## 交给 ops 的开放项

完整命令、候选合同、权限/事务边界、原批次兼容、切换/回退/恢复步骤见 `docs/knowledge-runtime.md`。原角色先核旧在途发布器和冻结来源，再在自然边界启用；开发没有替 ops 启用配置、停止学习、重放批次或强 tick。

尚未完成生产最小闭环：复用一个合法未发布候选或下一原自然单元，实际产候选→事务入库→发布→当前生产tools读回→自然局消费；重复回调只一版本与自然重启恢复亦须实际核收。还需原owner以真实知识版本登记对应账本/消费者去向；固定测试不代账本 shipped、其他角色ACK或自然收益。runtime批次现场仍走原保守 retention 门，缺实际发布/父要求证明时保留，不扩授权自动删除。

#27/#28/#48/#50/#51原父要求、反证/异议通知、未发布候选、旧失败和长期学习收益全部继续开放。工程交付等待 review；真实运行验收由 runtime/ops 接续，不占用开发会话长期观察。

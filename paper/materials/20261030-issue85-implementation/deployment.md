# #85 发布交接

> r1 完整正文方案已被6513713188退回，不可按r1请求集成。当前精简视图的交付、部署后像与验收见 `../20261030-issue85-compact/`；此处K1候选、schema迁移/回退顺序继续有效。

本件为工程源码、正常 K1 候选和固定离线验收；不是生产部署回执。主管检查点批复为 [6512932583](https://github.com/dwroy/agent-sts2/issues/85#issuecomment-6512932583)，批准 A 2 / B+ 105 / B− 66 并将 68 条机制事实改为 null。旧检查点的机制数值支持分是历史材料，实际候选以最新批复转换，不回写旧检查点。

## 发布组合和映射

`deployment-map.json` 逐叶记录本次 ROOT/LIVE 运行源码与 ROOT-only 工具/检查配置的原 Git blob、实际 LIVE 读到的前像、交付后像、模式。集成员须按实际组合补齐队列 `runtime_install_paths` 和消费者，前像不同先核差量，不拿本报告直接覆盖。所有 `agent/src/` 叶均要同时在 ROOT 和 LIVE 应用；`agent/tools/grade-strategies.ts` 是 ROOT-only 的离线构造工具；测试与 `agent/tsconfig.knowledge-runtime.json` 只进 ROOT 检查。正式 JSON 不从 Git 的 116 条文件发布。

本轮新增两项能力：SQLite schema 5 允许策略 confidence 为 SQL NULL；原生 Codex/dsh 发送前持久预留曝光，KnowledgeAgent 查询、作答和重问均沿此入口，Codex 原生重试每次重建题面。默认关闭的旧入口和 Ironclad 不加游戏知识。

本单会改变 `agent/src/`。#84 仍在开发；现有 outcome 宽读源码指纹会受影响，不能承诺它不受影响。实际上线必须与 #84 的 producer 准入/显式依赖闭包核对，沿原唯一发布事务处理受影响生产者，不改 control 强行通过，也不重复提交已失败的 outcome request。队列请求仅交工程源码；知识候选走正常 K1 通道。#84 的请求 ID 尚未交付，因此不伪造 `--depends`；本依赖由集成员在冻结发布组合时落实。

## ops 顺序

1. 核固定交付分支/完整 HEAD、适用检查、ROOT/LIVE 叶映射及 #84 准入安排。唯一完整回归归原集成员；本地沙箱排除单不冒充该回执。
2. 在现有 K→L 发布锁与自然开局边界内，先用**原 schema 4 可读工具**对生产 runtime 做备份并读回 SHA、当前 K1、绑定与完整性；保留旧源码和原映射。运行中的旧局仍绑原 K1，不重启、不改 STOP。
3. 部署匹配的 ROOT/LIVE 源码后，第一次正常 writable `KnowledgeStore` 会在单事务迁移 4→5；原修订、发布成员、数值历史和局绑定原样保留。失败整笔回滚；只读消费者不会偷偷迁移。
4. 核 current 仍为 `K1-0725587f50e671013f48f93e6c3e6b7f27d3d05638c40f33b460c9aeda7c7c46`，候选 `candidate.json` SHA 见 `replay-summary.json`。若已推进，保留冲突并从新正式库对账/构造新 ID，不用旧 Git JSON 覆盖，也不篡改已冻结候选 base。
5. 用原 `agent/tools/knowledge-runtime.ts` 的 `submit --candidate ...` → `validate --id issue85-grading-v1` → `publish --id issue85-grading-v1`，每步保存回执。候选只改 Silent 策略文档与它的 classification 目标 SHA；正常 CAS 拒绝并发 current 漂移。隔离库同候选发布值应为 `K1-753af285189835e26c864fe38d6cf5550eab1399158bbb68ce8f73ce078e7fec`。
6. 从已绑新 K1 的实际消费者读回 173 条、A/B+/B−=2/105/66、机制 null=68、B− 不进正文、原件全文 SHA/offset，并查曝光账本和实际脑日志。每题最多4、总8000字节；普通策略保位仍受完整前缀预算约束，`ordinary_reservation` 区分 expanded/budget_limited；首条超大为0正文，不跳过它填后项。
7. ops 按实际行为发布分配 release_id，追加版本/decision-log、for-roy 与 inbox-dev 规则变更通知。交付尚未执行这些生产记录。
8. 原 ops 接上线后30个自然局，按固定 R458/R459 口径保 F33/F48/F49 分母和注入分布；不启动实验局，不把离线次数冒自然采用或收益。#83 战斗回合入口仍不在本单。

## 曝光和回退

日志目录的 `decision-knowledge-exposure/<sha256(run_id)>.jsonl` 是运行账本，不是临时缓存。新原生题面先独占创建锁、检查账本、预留并 fsync，再发模型；失败不退额，局号＋条目 ID 跨 K1/进程/SL 共用3次上限。账本含 question_id、phase、delivery_id、K1、IDs、信封 SHA。缺身份、坏账本、忙锁或写失败只给引用，不补猜计数；不自动删陈旧锁。native 厂商内部透明重传不在本地可观测发送边界内；工具主动全文查询不计默认注入。

不删除或重置这些曝光文件；恢复原线程/原局时沿原 logsDir 继续。若 logsDir 迁移，必须一并保留该局账本，否则不能放行正文。协议不把已有默认正文截断成摘要；全文工具仍受绑定 K1、角色/进阶及本题形式触发约束。

仅回退本次知识可用原 `rollback --version <旧K1> --request <新回退ID>`，原局绑定不变，schema5源码仍可读旧版本。若回退旧源码（旧 reader 不识别 schema5），必须同时在原锁下恢复迁移前 schema4备份和匹配源码；先保存 schema5 后续发布/绑定/候选与曝光账本，不覆盖丢掉新历史。旧库恢复会丢掉备份后的元数据，因此有后续写入时由 ops 对账或前向修复，不能直接回拷掩盖。隔离测试覆盖 schema4 迁移中断回滚、数值历史、null读回和 K1回滚；未对生产库实施任何迁移/发布/回退。

## 复现

先通过旧库只读 `export --version <上述base> --destination <新文件>` 与 `backup --destination <新文件>` 得到固定输入。构造命令（在 agent/，现有 tsx，不安装依赖）：

```bash
nice -n 19 node --import tsx tools/grade-strategies.ts BASE_FILES ../paper/materials/20261030-issue85-grading/assessments.json ../paper/materials/20261030-issue85-implementation/authority.json UNUSED_CANDIDATE
nice -n 19 node --import tsx ../paper/materials/20261030-issue85-implementation/replay.mjs BASE_FILES FROZEN_WINDOW UNUSED_OUTPUT READONLY_SCHEMA4_BACKUP
```

候选输出用 wx，不覆写不同交付；生成器先核173条冻结文件 SHA/原 ID、版本和授权，再做完整库 `validateDocuments` 与 `validateUpdate`。重放在新隔离目录 restore 只读备份，不连接生产写口；原 K1 成员/字节读回不变，候选重建相等，173条全文逐字拼接等于规范化存储原件。失败探针及修正经过见 `report.md`，不删除历史。

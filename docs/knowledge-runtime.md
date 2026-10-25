# SQLite 知识 runtime（#60）

#72 的 schema4追加独立整局构筑研究存储/索引和 `kb_build_research`，不改变旧K1/策略/rk或可执行规则；schema3仍可读旧工具。原owner核源后发布、完整结构分页、自然采用与回退合同见[整局构筑研究](build-research.md)。

本模块把已发布经验、文字策略、rk 与必要的 vocab/core/流派几何引用移到宿主本地 SQLite。候选合同版本为 **1**；#62 追加的类型投影使用 schema **2**，旧库事务升级、覆盖和工具合同见[类型化查询](knowledge-typed-tools.md)。知识版本仍是 `K1-<SHA256>`，与源码发布号、条目自身版本分开。默认不启用，不修改生产数据库、live、STOP 或在途批次。

数据目录使用本实例已忽略的 `data/knowledge-runtime/`，不能放在 Git 知识目录、Windows `/mnt/<盘符>` 或网络共享盘。部署者核宿主挂载类型、容量与备份目的地；路径检查拒绝常见 Windows/WSL 共享挂载，不能据此证明任意自定义挂载都是本地盘。DuckDB、Parquet、原日志与冻结证据位置保持原用途。

当前 Node v22.23.3 的内置 `node:sqlite` 实测 SQLite 3.51.3，包含 JSON 与 FTS5，无新增包；Python 3.46.1 不作为此运行库。每次打开数据库都检查 WAL-reset 修复版本：3.51.3+、3.50.7 backport、3.44.6 backport；不接受中间未修复分支。依据 [SQLite WAL/reset 说明](https://www.sqlite.org/wal.html#walresetbug)、[JSON](https://www.sqlite.org/json1.html)、[FTS5](https://www.sqlite.org/fts5.html)。Node 内置 SQLite 仍发实验性 API 警告；生产升级 Node 时重新核版本和固定检查，不升级共享 Node/Python。

## 存储与发布合同

`agent/src/knowledge/runtime/schema.ts` 定义固定表：候选、发布、文档、逐条修订、发布成员、检索词、证据、事件、运行绑定；`typed-schema.ts` 定义 schema 2 业务扩展。角色/类型/进阶/显式游戏版本/来源/冲突状态有固定字段；实体、别名、多值分类、题型和精确进阶列表有关系索引；每条完整原 JSON 独立保存。旧 `query` 保留三字以上 FTS5、短词 `instr`；生产类型工具以短词 grams 主键索引替代范围正文扫描，不漏掉“启动”“路线”。未知游戏版本保留未知，证据版本不能冒充条目适用版本。查询结果是检索候选；实际条件仍由原消费者判断。

候选形状如下。`files` 是本批实际改变文档的完整 JSON **字符串**，包含原文档头和所有保留条目；其他文档继承精确基线。不是把全库作为单条 payload。

```json
{
  "schema": "knowledge-candidate-v1",
  "id": "原登记batch ID",
  "base": "K1-完整64位SHA256",
  "character": "silent",
  "source": "原任务或external:来源标识",
  "files": {"characters/silent/experience.json": "完整文档JSON字符串"}
}
```

角色只能提交本角色文档；公共经验用 `character=common`，继续验证通用性来源格式。`migration` 仅供初次导入，完成回调拒绝此身份。pending、未知路径、日志和源码不在候选范围。

提交按 ID 和内容指纹去重；同 ID 换内容拒绝。原生失败/审计失败仍留原状态与原件。格式校验复用策略、公共经验、V6 schema 与完整发布内的 rk→vocab/core/combo/direction 引用检查。常规更新不能删除已发布条目、旧证据、反证、来源附件，不能静默扩大 scope；需要调整这些内容时交原 owner 判断，原候选保留，不以自动猜测替代证据审查。

校验、快照 IO 和索引数据准备不持写事务。发布先写所有快照文件、校验 SHA 并 fsync，再在 `BEGIN IMMEDIATE` 中写修订、发布、事件及当前指针；CAS 必须仍等于候选基线。竞争者失败保留候选，不能自动把旧完整文档覆盖新库。WAL、FULL 同步、5s busy timeout；busy/超时保留原 ID，先 `status` 查实际结果再重试。已提交而回执丢失时不会再造版本；未提交事务回滚。磁盘上准备完但未发布的孤立快照无读可见性，重试核 SHA 后复用，不在此阶段自动清理历史。

知识发布不拿 `ops/live-merge.lock`，不修改 Git main/live，不触发完整源码回归。源码变动仍沿原研发通道。角色权限由调用入口分开：学习者只读正式库并写 scratch 候选；完成回调/ops 是唯一写者；大脑只有固定快照路径和只读 tools，不打开写库。该分工不冒充不同 Unix 账号的强隔离，不改变现有账号或共享权限。

## 命令入口

从 `agent/` 用现有 Node 执行（运维依原进程限额运行，加 `nice -n 19`）：

```bash
node --import tsx tools/knowledge-runtime.ts init --runtime "$ROOT/data/knowledge-runtime"
node --import tsx tools/knowledge-runtime.ts import --runtime "$RUNTIME" --knowledge "$FROZEN" --id "$MIGRATION_ID" --source "$SOURCE_ID"
node --import tsx tools/knowledge-runtime.ts current --runtime "$RUNTIME"
node --import tsx tools/knowledge-runtime.ts verify --runtime "$RUNTIME" --version "$VERSION" --knowledge "$FROZEN"
node --import tsx tools/knowledge-runtime.ts export --runtime "$RUNTIME" --version "$VERSION" --character "$CHARACTER" --destination "$SCRATCH/published.json"
node --import tsx tools/knowledge-runtime.ts submit --runtime "$RUNTIME" --candidate "$SCRATCH/knowledge-candidate.json"
node --import tsx tools/knowledge-runtime.ts validate --runtime "$RUNTIME" --id "$BATCH"
node --import tsx tools/knowledge-runtime.ts publish --runtime "$RUNTIME" --id "$BATCH"
node --import tsx tools/knowledge-runtime.ts status --runtime "$RUNTIME" --id "$BATCH"
node --import tsx tools/knowledge-runtime.ts query --runtime "$RUNTIME" --version "$VERSION" --character silent --kind experience --ascension 10 --text 路线 --limit 20 --offset 0
node --import tsx tools/knowledge-runtime.ts rollback --runtime "$RUNTIME" --version "$OLD_VERSION" --request "$UNIQUE_ROLLBACK_ID"
node --import tsx tools/knowledge-runtime.ts backup --runtime "$RUNTIME" --destination "$BACKUP"
node --import tsx tools/knowledge-runtime.ts restore --backup "$BACKUP" --runtime "$NEW_RUNTIME"
```

`export` 输出路径→原 JSON 字符串的映射，拒绝覆盖既有输出。query 另支持 `--entity`（ID/名称别名）、`--category`、`--source`、`--evidence-status`、`--game-version`；limit 1–100，offset 0–10000，正文最多200字。SQL 值全部绑定，不接收模型 SQL。原 tools 的名称、参数、相关性、分页、24KB限制不变。

backup 使用 SQLite 一致性备份 API，不能只复制正在使用的 `.sqlite` 文件。restore 只写新目录，核完整性并从数据库历史重建/逐叶核验快照；不覆盖原运行库。回滚只切有效知识版本，保留后续候选、修订、发布记录和已绑定运行。重复 rollback request 不再次切换。

## 学习与完成回调

由 ops 在新任务自然启动边界启用下节的本地控制文件，程序向原调度/launcher 传递 `STS2_KNOWLEDGE_RUNTIME`；不向已运行模型添加该变量。`learner/lib/knowledge-runtime.ts` 为已登记、未带代码实现/专门研究/提案修复身份的 `experience-update`、`strategy-proposal` 附加本合同，令内容任务 `merge=no`、scratch 位于本树 `learner/runs/`。模型必须从数据库基线取正式内容，不能拿旧 Git 经验覆盖新知识；最终报告带 `knowledge_candidate` 绝对路径、原 base、`commit=null`、`merged=null`、`code_proposals` 与空 `implementation_domains`。

`ops/learner_checks.py` 在原完成入口调用 `ops/knowledge_runtime.py`。程序核原 batch/角色、scratch、干净 Git 树和不变 HEAD，再复用代码提案登记与经验→代码提案义务检查。纯知识不要求源码 commit；需要实现出牌/药水/SL/终局规则的仍形成原提案，不能借候选执行代码。外部/回刷继续通过原 `report_proof` 的冻结来源、原生消费、逐 ID 去向与真实产物核验，每个变化必须等于原已核 artifact；新增引用文档由原 owner 另审，不能用一个候选夹带未核内容。

成功记录 `knowledge_publication`（知识版本/源码/候选SHA）、`knowledge_attempts`，发 `knowledge-done` 事件。原外部/回刷 dispositions 继续进入原 reconcile，不重置 owner/失败/退役证据。发布失败或结果不明时保留 `knowledge_pending`、`state=awaiting_review` 与实际原 rc，避免通用失败重试新开模型；由原 `recheck` 入口以同 ID 查询/续接。数据发布事实不代账本 shipped/生产读回/自然收益或父要求验收；原 ledger 和通知沿原 owner、原 CLI 更新，不代其他角色 ACK。

未附带 runtime 候选的旧批次仍走原通道，防止热改在途合同。ops 最终切换前须完成原在途发布的结算和停写边界，禁止两套发布器同时被宣称为有效知识源。

## 调度、学习完成与新局的统一配置入口

`ops/production-runtime.sh` 只由新局脚本读取，单独在其中 export 或给 broker 客户端加前缀，不能证明父调度已继承。正式接线使用本实例忽略目录中的 **`ops/codex-ops/knowledge-runtime.json`**（有 `CODEX_OPS_DIR` 时是该目录下同名文件）。由原 ops 在源码组合/迁移通过、旧写者结算后的自然切点原子写入；开发不创建生产控制文件。示例路径须替换为本实例绝对根：

```json
{
  "schema": "knowledge-runtime-control-v1",
  "root": "/absolute/project-root",
  "enabled": true,
  "runtime_dir": "/absolute/project-root/data/knowledge-runtime"
}
```

缺文件为默认关闭；原显式环境调用在无控制文件时继续可用。有控制文件时新自然入口以该文件为准；`enabled=false` 关闭新入口。必须绑定实际实例根，目录在该实例解析后的 `data/` 子目录内，不能选 data 根本身。解析器拒绝未知字段、损坏 JSON、异根、越界路径、symlink/非普通控制文件及超4KB内容；不执行配置文本、不创建目录或打开数据库。项目自有挂载/容量/WAL库与迁移核验仍按原 ops 门执行。

原调用链现在明确如下：

- 父调度：`ops/codex-ops-learn.py` 的原 `tick/dispatch/write/boss-check` CLI 在原 handler/状态事务之前只读解析配置，更新该进程的环境；即使原 shell 调度循环长期存在，每个自然 Python 入口仍会重读，不需要修改共享服务或账号。`status/request-merge/core-notify` 保持原检查/通知路径，不因控制文件损坏而失去检查入口。损坏配置在需要准入的入口返回78，不启动任务。
- 启动与完成：原 `learner_jobs.start_learner` 的 setsid、Herdr命令宿主和原生TUI三种传递路径本已继承/白名单传递 `STS2_*`，无需改宿主或 wrapper。父进程传下 runtime 目录、实例根、控制 SHA 和来源标识；原 wrapper → `learner_entry.py` → launcher 继续继承同一份选择。普通写批次与复盘派发在启动前选择配置，将完整 `knowledge-runtime-selection-v1` 写入原 batch 的 `knowledge_runtime`，连同原注册事务落盘/fsync；包含 enabled/disabled、directory、root、control SHA 和来源。`finish/recheck` 不在新进程入口重读当前控制来选库；有 runtime 候选时必须从原 batch 的持久记录恢复，并仅在该回调作用域内设置环境，随后还原调用者环境。因此即使新进程未继承旧环境、控制已切 B/disabled/损坏，也先沿原 A 查询同 ID 真实结果。关闭状态同样持久保存，不能热转为新 runtime。旧无此记录且无 runtime 候选的报告沿原合同；若声称 runtime 候选却缺原绑定或身份冲突，则 held/awaiting_review，不猜目录、不按当前控制补填旧记录。
- 新局：原 `ops/run.sh` 在读取原 production-runtime 后、游戏准入前调用相同解析器，从同一控制文件取得目录与 SHA，再沿原单局 `launch` 绑定。既有游戏进程不重读；同局恢复仍核原日志 binding。新自然入口关闭配置不改变已启动模型/游戏的环境，切换前必须沿原发布/写者边界结算，不能用控制开关当作停止在途任务。

控制原文 SHA 以 `STS2_KNOWLEDGE_RUNTIME_CONTROL_SHA256` 传递，实例根和来源分别为 `STS2_KNOWLEDGE_RUNTIME_ROOT` / `STS2_KNOWLEDGE_RUNTIME_SOURCE`。launcher 的原 `learner_launch.knowledge_runtime`、完成回报 `knowledge_publication.runtime_control_sha256`、新局 `knowledge.runtime_control_sha256` 都记录该 SHA，供 ops 对照实际父进程/原回执；不记录全环境、凭据或共享 home。仅配置存在或这些字段出现仍不代真实生产继承/自然消费验收。

只读预检（输出安全 shell export/unset，不启用配置、不打开 DB）：

```bash
nice -n 19 python3 ops/knowledge_runtime_env.py --root "$ROOT" --state-dir "$ROOT/ops/codex-ops"
```

固定测试覆盖原 CLI main 的 handler 前选择、关闭/缺失、错误配置暂缓、三种原启动传递、shell 引号路径、dispatch_write 持久化选择、fresh-process A→B/A→disabled 回查、原 disabled/未捕获→enabled 不重绑及下一自然入口采用新值。另有 `ops/tests/knowledge_runtime_recheck_probe.py` 使用编译后的真实 CLI 与独立 Node/SQLite 进程，在隔离 A/B 库实际提交后模拟丢失结果，再清空继承环境恢复 finish/recheck：同 ID 回到 A 原版本，A仅迁移+一次发布/B仅迁移，通知不重复。该 probe 只固定 Git 身份，不模拟 SQLite 发布。所有夹具不执行生产 tick、模型、游戏或打开生产库。真实三端 SHA/代码/知识版本、原生学习产物与自然局读回仍由原 ops 在部署后核收。

## 自然边界切换与回退

1. 原 ops 先记录旧源码、有效知识来源/叶 SHA、未结批次、旧发布器和回退点。等原自然事务退锁；冻结当前已发布叶与来源身份到忽略目录，明确 Git SHA 与未提交刷新字节的不同。不能把在途/pending当已发布，不停止学习或强 tick。
2. 使用隔离目录运行 import/verify。逐文件原字节一致意味着 ID、内容、证据、反证、confidence、范围、文件自身版本和引用全部一致。旧源文件保留。部署经组合检查通过的代码后，在生产本地目录重复同一冻结输入的导入和校验；实际目录与时间由 ops 记录。
3. 在自然新局边界绑定版本。`bind --runtime "$RUNTIME" --run "$RUN_KEY" --code "$CODE_SHA"` 返回持久运行绑定与已核 snapshot。`launch` 带相同参数及 `-- <原命令> [原参数]` 可关闭数据库句柄后启动只读消费者，注入 `STS2_KNOWLEDGE_SNAPSHOT`、`STS2_KNOWLEDGE_VERSION`、`STS2_KNOWLEDGE_RUN_KEY`。本开发会话不执行 play。原 `ops/run.sh` 在 runtime 变量存在时自动接此包装：复用原状态读取，主菜单/角色选择/已结束局分配唯一启动会话 key，run-config 将实际局号与版本/key关联；同局重启从原 run-config 恢复 key，缺失/损坏时退出78保留现场，不重新取 latest。`launch` 只包装原单局命令，不改变游戏准入或扩展局数。
4. 快照只接管已迁文档；对局统计、原日志、旧资料和非迁移知识仍沿原文件消费者。进程启动时捕获快照，后续发布不热切；原 rk/vocab/core 与流派几何从同一快照读取。#62 类型 tools 根据该快照的 K1 打开原 SQLite 的只读连接，不取 latest；库/版本不可用时报错，不退到文件或其他版。run-config 写 `knowledge.runtime_version` 并保留实际 `code`；经验查询来源另带知识版本和叶 SHA。自定义隔离 knowledgeDir 不被生产环境重定向。
5. 在新任务自然启动时启用 runtime 候选合同，复用一个合法未发布候选或下一原自然学习单元。实际完成候选→校验→发布→当前生产 tools 正/负例读回→自然局读取，记录代码/知识版本和原请求 ID。重复投递同 ID 核仅一发布。不能用本报告的格式夹具、固定 tools 测试或注册参数代此验收。
6. 数据回退用 rollback 切旧知识版，仅影响下一新绑定；已有局继续原绑定。源码回退/恢复旧发布器只在自然边界取消 snapshot/runtime 配置并核旧文件来源，防止同时使用两个有效通道。数据库损坏则先保留原库/WAL/失败材料，用 backup restore 到新目录核验，再沿原实例自然边界切目录；不抹去候选和原失败。

生产最小闭环、新局/重启自动绑定的真实日志与原父要求均由 ops 在切换时实际读回。工程交付不关闭这些运行验收项。


#66 追加 schema3 显式分类元数据、候选与空因反馈；schema1/2原修订和K1保持。当前 reader/升级、分类操作和诊断口径以[显式知识分类合同](knowledge-classification.md)为准。

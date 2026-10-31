# #86 知识数据 SQLite 统一入库方案（待主管批准，未实施）

本次仅交清点、选型、schema、切换/对照/回滚及三批计划。依据 [#86 原件](https://github.com/dwroy/agent-sts2/issues/86)，截止 **2026-10-31 15:36:54 CST**；本树基线 `39e48ce9d09248b86c0eec1bf2339c4b453ec253`。生产、锁协议、共享配置、main/live 和当前唯一检查均未改，未运行游戏、刷新、迁移、完整检查或模型。下文所有新表、开关和命令接口都是设计，不是已有能力或已获实施批准。

建议选择**独立 stats.sqlite + 保留正式知识 knowledge.sqlite**，统一只读资源接口：高频 A 类和固定模型/聚合进 stats，已审经验/策略及 B 类文本资源进 K1；D1 历史与运营记录保留原身份。先完成 A 类全部写读迁移和对应准入核收，再在同一批准批次收窄 strict/K；不通过排除整个 knowledge 目录来跳过未迁的数据或其中代码。

## 1. 清点口径与实测存量

清点脚本 [audit.py](audit.py) 只读取本树 Git/代码及生产文件元数据，写本材料目录；完整逐文件表 [files.tsv](files.tsv) / [files.json](files.json) 共 **603 行**，每行有 A/B/C 分类、路径、生产者、消费者、频率、目标通道、基线大小/SHA、LIVE 观察大小。代码字面命中和路径路由证据在 [grep-evidence.json](grep-evidence.json)。手工核了通用路径拼接、递归枚举和动态 artifact 调用，不能把“文件名没有字面命中”解释为无人读取。代码注释命中不单独当作实际调用证据。

[summary.json](summary.json) 固定了观察时间、基线及 LIVE `fc9b1bb7f9d0fe4c44567b1c51b7f4f077f0c81e`。LIVE 数字是运行期间非原子的只读观察，**不能作为迁移冻结输入**。缺失的稀疏文件仍有 Git 原件，不以大小 0 冒称没有数据。下列 bytes 均为逻辑字节，不是磁盘占用，目录含历史快照，不能直接相加当作可释放空间。

| 类 | 跟踪文件数 | 本树字节 | LIVE 可见字节 | 范围 |
|---|---:|---:|---:|---|
| A | 232 | 37,714,546 | 52,565,611 | 统计、catalog/敌人派生片、检查报告 |
| B | 237 | 25,566,082 | 22,594,462 | 正式知识/模型/草稿；含运行时可读 lessons 原件 |
| C | 134 | 86,373,005 | 1,775,714 | 外部聚合与自有构筑统计；多数在 LIVE 稀疏检出中未展开 |
| D | 0（忽略目录） | 见下表 | 不借 Git 推定 | learning-runtime、logdb |

`knowledge/builders/`、`knowledge/schemas/`、投影 SQL 是代码/schema，不作为知识数据迁入。C 类 3 份 README 是说明文档，不是知识正文；SQL/README 的引用要随数据位置更新，但不把源码存成可执行数据库 payload。未来新增路径须在资源类型注册及依赖审计中显式声明，不能自动按任意目录导入。

### A：第 1 批必须整体覆盖的路径

表中相对 `knowledge/`；角色文件逐个身份及大小见 files.tsv。这里的角色数是现存文件数，不承诺无数据角色有统计。实际生产者均由 `refresh_driver.py` 原节拍调度，不增加刷新频率、训练范围或模型规则。

| 文件/目录 | 数量；LIVE bytes | 写者及频率 | 实际读者/间接消费者 |
|---|---:|---|---|
| `common/monster-db.json` | 1；2,539,696 | `build-monster-db.py`，局后 | `knowledge/monster-db.ts`、`mechanics.ts`、`reflex/combat-plan.ts`、`sim/boss-start.ts`、`combo-simulation.mts`、检查器 |
| `common/move-model.json` | 1；37,636 | 同上 `--move-model-out`；显式 `build-move-model.py` | `knowledge/move-model.ts`、`reflex/rollout-live.ts`、`sim/boss-start.ts`、`build-fight-value.py`、combo-simulation |
| `common/card-upgrades.json` | 1；66,809 | `build-card-upgrades.py`，局后 | `knowledge/card-upgrades.ts` → `sim/build-sim-facts.ts`、`thief-card-value.ts` |
| `characters/*/monster-records.json` | 2；1,544,165 | `build-monster-db.py`，局后 | `monster-db.ts` 合并本角色记录、`sim/global-build-pool.ts`、检查器 |
| `characters/*/outcome-stats.json` | 2；697,162 | `build-outcome-stats.py` / `outcome_logdb.py`，局后 | `knowledge/experience.ts`、`outcome-facts.ts`、`sim/boss-clock.ts`、拿牌/事件/营火入口 |
| `characters/*/room-costs.json` | 2；65,857 | `build-room-costs.py`，局后 | `knowledge/room-costs.ts`、`sim/boss-clock.ts`、`route-projection.ts`、统计提示 |
| `characters/*/boss-damage.json` | 2；116,216 | `build-boss-damage.py`，局后 | `sim/boss-clock.ts`、`eval/boss-clock-recompute.ts` |
| `characters/*/potion-equivalents.json` | 2；170,784 | `refresh-potion-equivalents.sh` → builder，局后 | `knowledge/potion-equivalents.ts`、`reflex/potion-cost.ts`/combat-plan/thief、V6 direction/potion entries |
| `characters/*/{fight-value,fight-value-gates}.json` | 4；426,515 | `build-fight-value.py all`，原 `--all`/训练门 | `reflex/fight-value.ts`、`reflex/rollout.ts` |
| `characters/silent/construction-opportunities.json` | 1；5,634,050 | 同名 builder，Silent 局后 | `construction/data.ts`、`v6/projection-input.ts`、`refresh-v6-history.py` |
| `characters/silent/v6-history.json` | 1；37,727,714 | `refresh-v6-history.py` → history/combo，原方法门 | `sim/v6-history-pack.ts`、`ops/report.py`、原依赖校验 |
| `catalog.json` | 1；171,627 | `build-catalog.py`，刷新末步 | `knowledge/catalog.ts`、`query-sources.ts`、render/data 的校验 |
| `common/enemies/*/mechanics-observed.json` | 105；3,043,971 | catalog 从 monster-db 机械分片 | `catalog.ts:fragment/readCompatibleKnowledgeText` |
| `common/enemies/*/model-observed.json` | 105；69,866 | catalog 从 move-model 机械分片 | 同上 |
| `common/enemies/_legacy-meta.json` | 1；206,821 | catalog，保原根字段和顺序 | 同上，缺旧 common 文件时重建兼容视图 |
| `notes/monster-db-check.md` | 1；46,722 | `monster-db-check.py`，局后 | 人工检查；未发现 agent/src 实际读取。检查结果进入本轮 stats 记录，正文导出到忽略目录，停止写 Git 报告路径 |

重要缺口：`ops/learning_runtime_data.py:OUTPUTS` 已列出 13 类 producer，但**不含 catalog、210 片 observed、_legacy-meta 和检查报告**。`build-catalog.py` 还有“只在不存在时创建 curated stub”的动作；第 1 批把创建 stub 转成待处理候选/缺失状态，不能让高频 stats writer 自动成为正式 B 类写者。原已有 stub 字节保留，由第 2 批搬迁；迁移不生成规则。

### B：第 2 批及现有 K1 分界

| 文件/目录 | 现存数量/本树大小 | 写者/节拍 | 读者与去向 |
|---|---:|---|---|
| `characters/*/experience.json`、`common/shared-experience.json` | 3 + 1；603,185 B | 原角色/公共学习者，K1 候选回调 | `experience.ts`、`shared-experience.ts`、Jev experience、query-guidance/render；保原 K1，不再重复从 Git 初始化 |
| `silent/strategy-entries.json` | 1；574,676 B | Silent 原候选发布 | `strategy-entries.ts`、`brain/decision-knowledge.ts`、`tools/query-guidance.ts`；**SQLite 为正式源** |
| `silent/{reflex,reflex-vocab,build-cores}.json` | 3；8,932,142 B | 原学习者/K1 发布 | `v6/knowledge.ts`、`reflex/jev/combat-entries.ts`、reflex 工具；history builder 也读 core，必须同版依赖 |
| `characters/*/boss-trust.json` | 2；191,407 B | Silent `agent/tools/boss-sim/refresh-silent.py` / `silent_calibration.py` 原 cadence；Ironclad 原发布 | `sim/boss-trust.ts`、boss-lines/build-sim-facts/thief-card-value、V6/ops；固定校准归 stats，审批和 tune/val 不变 |
| `common/open-book.json`、`silent/open-book.json` | 2；1,276,262 B | `build-open-book.py`、`ops/open_book_refresh.py`/原候选 | `knowledge/open-book.ts`；保 K1 正式版本与来源 |
| `silent/opening-value.json` | 1；328,668 B | `opening_value.py extract/train`，显式冻结训练 | `v6/card-value.ts`；stats，保原训练门，不加每局训练 |
| `silent/{double-boss,construction-support,construction-templates}.json` | 3；28,348 B | 原角色学习/发布 | `knowledge/double-boss.ts`、`construction/support.ts`/data、V6 projection；K1 新资源 |
| `ironclad/{jev-hints,sl-elites}.json` | 2；11,900 B | 原角色学习/发布 | `knowledge/jev-hints.ts`、render，`sl/elites.ts` → controller；K1 新资源，不改任何规则 |
| `ironclad/{ds-handbook.md,ironclad-guide.md}` | 2；44,444 B | 历史知识显式发布 | config 的 handbookFile 和 render/data 的动态 guideFileName → old-knowledge；K1 原 UTF-8 字节，不套 JSON-only validator |
| `common/enemies/*/{mechanics,model}.json` | 210；65,308 B | 首次空 stub/后续学习者维护 | `catalog.ts` 递归查询；K1 新资源。空 rules 不代表无机制，不启新规则解释器 |
| `common/event-pages.json` | 1；13,929 B | `build-event-pages.py`，显式原固定方法 | `knowledge/event-pages.ts`；stats，属于 B 中固定产物，不并入任意学习候选 |
| `silent/pending/*` | 5；371,357 B | 原学习任务/原 owner | 原 learner、`catalog.ts` 递归可达；迁入 **drafts 命名空间**，保原查询权限/未发布状态，不混入正式 K1 tools |
| `notes/lessons.md` 的运行时视图 | 1；本树13,124,456 B、LIVE10,152,836 B | 历史复盘追加；新 postmortem 已走运营库 | `render/data.ts:loadPostmortems` → `kb_postmortem`、experience cases、旧 prefix；读运营库的固定修订集合。原 Markdown 作为历史报告保留，不再作为运行时依赖 |

`notes/` 其他报告、交接、普通文档不迁。`lessons.md` 是“运行时读取必须迁”的特例，只迁消费者及原文字节视图，不删除历史报告。缺失/歧义 run 前缀、章节顺序、重复章节、角色隔离和缺文案行为必须保持。

只读实际核查 [k1-readback.json](k1-readback.json)：当前 **K1-753af285189835e26c864fe38d6cf5550eab1399158bbb68ce8f73ce078e7fec**，schema5，12 份文档；策略正文 **173 条**且 release_entries 也是173，Git 与 LIVE 各116条。DB/Git/LIVE SHA 分别 `e8bef3d8…` / `089fc649…` / `7cadbbef…`，均不同。因此“文件与库同名”不代表同一版本，禁止覆盖库、拼并条数或把 Git 缺的57条当新知识重复发布。迁移基线取正式发布及实际未迁文件的联合清单；冲突留证逐资源裁定。

K1 另有不在跟踪文件里的 `characters/silent/classification.json`（31,873 B），必须保留；`direction-cards.json`、`decision-context.json`、`build-research.json` 是代码已有候选能力，当前 K1 文件表未出现，保留缺失身份，未来走既有验证。schema/table 并不等于已发布文档。

### C/D：第 3 批，不搬原始日志、缓存和玩家标识

| 路径/形态 | 写者 → 读者 | 处置 |
|---|---|---|
| `knowledge/external/sts2fun/silent-a10.json`（1,775,714 B） | `eval/sts2fun_stats.py` → `brain/tools/external-stats-tools.ts:load` | 聚合进 stats；该 load 直接 join/readFile，**绕过 knowledgeFile**，须显式切换且保原固定SHA/16KB分页及分母 |
| `knowledge/external/sts2fun/builds-v1/`（8份数据/说明，17,500,349 B） | `sts2fun_build_stats.py` → `strategy-archetypes.ts` 的 archetypes；`external_stock_source.py` 动态 artifact；eval 查询 | archetypes 已在 K1，保原固定SHA；其余派生聚合入 stats。timeline/matchups/combinations/boss-semantics/representative-timelines 与 manifest 按整份冻结包关联 |
| `knowledge/external/sts2fun/decision-fields-v1/`（3份，41,599,356 B） | `sts2fun_decision_fields.py` → build_stats_view/verify_own_build_stats、原外部来源流程 | statistics/manifest 入 stats；投影 SQL 是代码。未发现独立 agent/src 的 statistics.json 直接读，不冒已消费 |
| `characters/silent/build-statistics-v1/`（122份，25,497,586 B，含114份 games） | `eval/own_build_stats.py` → verify_own_build_stats/build_stats_view、external_stock_cli run-index、catalog 递归 | 自有冻结统计进 stats 的 self 域；保 run/attempt/SL/进阶/独立分母，不能因目录和外部相邻而归外部证据 |
| `data/external/{sts2fun,open-book,spire-codex,…}` | 原下载/project/build-db 流水线 → 外部 stock、学习、eval | 原下载、响应头、冻结缓存和失败继续文件；只把已核安全投影/知识与来源索引入库。保 #82 tombstone、partial、许可/版本/白名单；不重抓、不导入玩家标识 |
| `data/game-data.json` | `knowledge/index.ts:loadKnowledge` 的 mod collection/cache → agent 知识加载、多个 builder/eval | 原响应可继续缓存；运行时使用的固定 collection 资源入 stats 参考域，绑定 mod/game版本与SHA。新 mod 目录缺失时保原合法采集/验证流程，不能静默读错版 |
| `data/fight-value-rows*.jsonl` | `build-fight-value.py extract` → 原 train/验证 | 中间训练行保文件/冻结SHA，模型与gates已入 A；没有运行时读取训练行的证据，不塞进大脑知识 |
| `data/learning-runtime/` | `ops/learning_runtime_store.py`：**learning.sqlite + 不可变 data-snapshots/**；原完成回调/固定 producer → 调度、learner、D1绑定 | 已是 SQLite+JSON快照，不是待搬的1.3G JSON原件。运营 records/证据/失败/提案链接留原库；固定数据与读接口迁 stats，D1旧发布/绑定保持可查。第3批核历史/备份与重复对象，不自动删除旧库/快照 |
| `data/logdb/` | `agent/tools/logdb/sync.py`：**Parquet分片 + manifest偏移 + DuckDB查询视图**；extract/views → logs_query、eval、builders | 继续原形态，不整库转 SQLite；把派生知识/模型入 stats，provenance 指向原分片/offset/SHA/抽取版本。原帧/费用/日志证据留存 |

本次主运行根元数据：knowledge-runtime **547,930,385 B**（DB329,469,952 B）；learning-runtime **1,380,416,155 B**（DB196,427,776 B，快照1,183,987,881 B）；logdb **71,119,004 B / 3,001文件**；external **16,745,647,127 B / 6,559文件**。这些不是压缩后空间或回收收益承诺。data/game-data为626,168 B；两份fight-value训练行为24,871,823 / 27,044,688 B。只读巡检未见额外LIVE独有知识文件。

忽略目录按来源继续分账，均不因入库而自动转为正式知识：

| C源目录 | 文件数 / bytes | 原写读链与迁移范围 |
|---|---:|---|
| `data/external/sts2fun` | 3 / 13,984,628,726 | 原公开数据缓存 → `eval/sts2fun_stats.py`、build projection/build stats/decision-fields → external stock/学习；仅安全聚合及提炼物入库 |
| `data/external/spire-codex` | 6,299 / 2,708,697,149 | `eval/spire_codex_download.py` → projection.py / spire_codex.py → 离线查询/学习/Boss校准；原下载/失败/墓碑/partial与敏感源留原处，不复制玩家标识入库 |
| `data/external/open-book` | 244 / 1,354,282 | `ops/open_book_refresh.py` → `build-open-book.py` → 忽略catalog overlay；`knowledge/open-book.ts`在未绑定K1时可直接读overlay。正式运行绑定K1时不启overlay，迁移必须保持该优先级、revision门和缺失队列，不能用较新overlay覆盖正式K1 |
| `data/external/issue51-own-506-freeze-20261024` | 11 / 43,520,830 | 原自有冻结单元 → stock来源核验/学习；保原冻结SHA与owner，仅迁来源索引/已提炼物，不重分母 |
| `data/external/issue54-safe-cache` | 2 / 7,446,140 | 原安全投影缓存 → `external_stock_source.py`动态artifact消费；原缓存保持、派生知识入库 |
| `data/external/issue54-decision-cache-v3` | 0 / 0 | 当前空目录；不据此造数据或关闭来源要求 |

目录计数只是本次观察；完整子目录、LogDB各表大小和额外C文件元数据均在 summary.json。open-book的pending/conflicts是运行反馈，不是已发布知识；保原队列权限与去重，将运行可读catalog资源纳入固定版本。

[d1-readback.json](d1-readback.json) 显示当前 D1-37135be5…，28次发布、160个绑定、DELETE journal；manifest有22个资源，但 [control-readback.json](control-readback.json) 显示**只启用 postmortem 和 outcome refresh**。seed里有22个文件不等于22个已迁写读。`runtime-data.ts` 仅路由显式 managed_paths，K1优先级由 `runtime-paths.ts` 在 D1之后选择，其他仍读 Git。不得以“现有D1已具备”宣称A完成。

## 2. 存储选型和权限

| 候选 | 收益 | 成本/决定 |
|---|---|---|
| 把 A/B/C 全塞现有 knowledge.sqlite | 一库事务容易；复用 K1发布/版本/快照 | 当前 documents/候选是 JSON-only、路径/角色/语义验证有限；大统计高频写会挤正式知识写者，且不能把任意模型/Markdown混进策略候选。**不选** |
| **独立 stats.sqlite，复用K1的存储做法/公共基础层** | 频繁统计与正式知识分开；保K1校验/发布者，A先交；原D1可明确续接 | 要显式绑定K1+stats+运营视图；不能声称跨库原子提交。**选择**，下面以不可变元组解决 |

拟放本实例已忽略、本地 Linux data 目录 `data/knowledge-runtime/stats.sqlite`；运营库仍在原 learning-runtime。stats writer 使用现有 Node22 内置 `node:sqlite`，打开前沿 `sqlite-version.ts` 核 WAL-reset 修复（现合同3.51.3+或已核backport），WAL/FULL/外键/有界busy。不安装包、不升级共享Node/Python；Python生产者只把有界 staging 输出交原写入入口，**旧宿主Python不直接写新WAL库**。

WAL允许读写并行但每库仍只有一个writer；长计算、校验、索引准备和JSON导出均不占发布写事务。同一物理库的提交原子；两个WAL库即使ATTACH也不能作为整组原子事务使用，这是SQLite限制，见 [SQLite WAL](https://sqlite.org/wal.html)。因此不尝试“先切一半指针，随后补另一库”。

学习者只读正式库、写scratch候选；原完成回调拥有正式K1写权；原固定方法refresh入口拥有stats写权。B中的已审文字/数据资源扩展K1类型注册与schema后进入正常候选/验证；校准、opening-value和event-pages保持固定方法通道；pending为独立未发布草稿。JSON入库不授权执行新算子，不改变角色/来源/可信度/反证/独立分母。

## 3. Schema 草案和事务单位

以下是逻辑表草案，不在本轮执行SQL。K1现有schema5、全部历史版本/修订/事件/候选/运行绑定不重编号；为非JSON资产追加表及显式资源类型，旧工具继续读原 typed tables。

```sql
-- stats.sqlite: raw bytes are authoritative; indexes are rebuildable projections.
asset_objects(sha256 PRIMARY KEY, bytes BLOB NOT NULL, byte_length, media_type);
stats_candidates(request PRIMARY KEY, digest, base_version, method_set_sha,
                 input_cut_json, manifest_json, state, failure_json);
stats_releases(version PRIMARY KEY, parent, request UNIQUE,
               manifest_sha UNIQUE, manifest_json, provenance_json, created_at);
stats_members(version REFERENCES stats_releases, resource_key, object_sha REFERENCES asset_objects,
              producer_id, method_sha, source_kind, source_character, character,
              game_version, ascension_scope_json, dependency_json, PRIMARY KEY(version,resource_key));
stats_rows(version, resource_key, json_pointer, entity_id, act, ascension,
           payload_json, PRIMARY KEY(version,resource_key,json_pointer));
CREATE INDEX stats_lookup ON stats_rows(version,resource_key,entity_id,act,ascension);
stats_current(singleton PRIMARY KEY, version REFERENCES stats_releases);
stats_events(request, event_ordinal, state, detail_json, PRIMARY KEY(request,event_ordinal));
legacy_data_versions(original_d1 PRIMARY KEY, original_manifest_sha, original_runtime_id,
                     stats_version, receipt_sha);

-- Existing K1 database: additive asset extension; formal candidate validators remain.
knowledge_assets(version REFERENCES releases, resource_key, object_sha,
                 media_type, character, publication_state, validator_id,
                 PRIMARY KEY(version,resource_key));
knowledge_asset_objects(sha256 PRIMARY KEY, bytes BLOB, byte_length, media_type);
draft_revisions(owner, task, resource_key, revision_sha, bytes BLOB,
                evidence_json, PRIMARY KEY(owner,task,resource_key,revision_sha));

-- Bundle registry in stats: immutable identities, no cross-DB commit claim.
consumer_bundles(bundle_sha PRIMARY KEY, k1_version, stats_version,
                 operational_view_sha, game_catalog_sha, capabilities_sha,
                 dependency_sha, json_export_manifest_sha, ready_receipt_sha);
run_asset_bindings(run_key PRIMARY KEY, bundle_sha REFERENCES consumer_bundles,
                   code_sha, backend, character, original_run_key, control_sha);
```

实际DDL须有NOT NULL/CHECK/外键和唯一性约束：SHA是64位hex；资源key为注册相对逻辑名，禁止绝对路径、`..`、链接、任意SQL；媒体类型与验证器匹配；正式/草稿分开；角色及来源不能由目录搬迁变更。原 JSON/Markdown **逐字节保存**，索引只派生，不能把序列化后相等当原SHA相等。完整资源可按version/key取回；37MB history冷加载一次缓存，热点统计可用索引按entity/act查询；不在每次出牌解析全库。

新 stats 完整快照拟用 **S1-<manifest SHA256>**，避免把新资源合同伪装成旧D1；原D1/K1号均保留。旧D1→S1只记映射与来源，**不重写旧run-config、旧回执、旧id**。schema版本与内容号、游戏版本、源码release_id独立。K1资产扩展时由新manifest schema产生新发布，保留旧K1读取/回退能力，禁止原版本号下补对象。

### 一次 refresh / 发布只产生一版

1. 在原K刷新worker互斥下，捕获原request、方法票/代码身份、K1依赖和输入cut；所有producer写**忽略目录staging**，不再写LIVE知识目录。Python builder对输入也用固定资源接口，不能临时读正在变化的Git副本。按方法声明保留原日志完整行边界、抽样/训练切分和独立角色分母，不强求所有旧builder改成同一统计时间口径。
2. `--all` 的全部被选统计、catalog及派生观察片构成同一个候选；显式 `--only-producer` 只替换该producer闭包，其余成员继承base。catalog描述stats/K1资产时同时记录其确切来源版本；跨域引用不回读latest。**不逐producer推进全局current**。
3. 全部原检查成功、方法与输入/依赖未漂移后，先准备对象/索引和对应JSON回退导出，hash/fsync核收；可提前入库不可见staging对象。失败保留逐步产物和失败事件，current不动，不能让一轮成功半套可见。
4. 一个短 `BEGIN IMMEDIATE`：核 request幂等、base CAS、方法准入世代、所有对象/索引齐全；插release/members/事件及CAS current，再COMMIT。候选同ID同内容返回原版，同ID换内容拒绝；忙/超时先status读真实结果，不造新ID重试。准备文件不能拿可见current当成功。
5. 正式B候选同样整批一次K1发布，仍走原审批/证据/能力门。stats发布不顺便提升级别、不改正式策略。旧D1 producer journal/原事务在自然结算后才逐入口切换；未知旧事务保留，不通过新schema“修复”掉失败。

## 4. 读路径、固定版本与局间切换

拟引入 `KnowledgeResources` 只读接口（readBytes/readJson/list/query；参数是固定bundle+注册资源key）。所有运行时调用最终从SQLite对象/索引查询，缓存key至少含 **库身份、bundle、角色、资源SHA**；不能沿用仅路径/mtime的缓存。

| 必须修改的入口 | 切换内容 |
|---|---|
| `knowledge/files.ts`、`runtime-paths.ts`、`runtime-data.ts` | 路径字符串API逐步改为资源读取；单纯把knowledgeFile指到另一个JSON目录不算最终迁库 |
| `knowledge/query-sources.ts`、catalog/readCompatibleKnowledgeText、render/data | 从固定版本取得原字节/SHA及来源；catalog枚举、兼容片段、exists/stat语义也迁入，不再扫描Git目录 |
| knowledge各loader、`reflex/rollout-live.ts`、fight-value/rollout、`sim/boss-start.ts`/boss-clock/boss-trust/global-build-pool/v6-history-pack | 替换直接readFile/readJson和模块初始化缓存；保持缺文件/坏格式/未知语义及Ironclad行为 |
| `v6/knowledge.ts`、projection-input/card-value、construction data/support | 核各叶和core/history依赖同版；无对应角色不能借别的角色值 |
| `brain/tools/external-stats-tools.ts`、strategy-archetypes、open-book overlay、旧guide/handbook及kb_postmortem | 覆盖绕过knowledgeFile的join、配置文件名、动态guide名、lessons读取；保工具合同、排序、分页与字节上限，保open-book已绑定K1时不用overlay的优先级 |
| builders、eval、ops/report及校准 | 共同使用固定输入导出/只读桥接；CLI研究的显式knowledgeDir/fixture继续隔离，不能被生产环境劫持 |
| `eye/run-config.ts`、`ops/run.sh`、runtime launch/learner持久选择 | 保存/恢复原bundle和backend；SL/进程恢复/worker thread传播同一身份，不重取latest |

run-config拟追加 `knowledge.assets = {schema, bundle_sha, backend, k1_version, stats_version, operational_view_sha, game_catalog_sha, capabilities_sha, control_sha}`，同时保原源码、K1/D1历史字段。新局准备器短事务读current并校验引用的K1、stats、运营完成记录集合及core/history/game-data依赖；必要时CAS重试形成**验证过的不可变元组**。指针可各自继续发布，绑定元组不变；不能长期持读事务覆盖整局以免WAL持续增长。

库/版本/能力缺失或SHA不符时明确失败；不能自动切JSON或latest掩盖故障。只有显式 `backend=json` 的bundle才走镜像，且也固定同一manifest；原在途局仍用原合同。新发布B使history依赖不匹配时，继续可用的已核兼容bundle或暂缓新bundle，不把错版数据硬塞进新局，也不因一次无效candidate把正常已绑定对局停下。

局中完成：输入冻结/导入新库、全量校验、JSON回退镜像、源码候选与适用检查、能力/方法票、下一局bundle及rollback bundle全部就绪。局间只按Roy原 game-admission/publication 事务核“仍是准备的代码/开关/bundle”，原子切小控制指针并读回，随后放行开局；准备缺一项就**不占这个发布边界，原配置照常开下一局**。不在局间导入37MB、补做全量检查或等待K长刷新。

## 5. 对照与延迟验收（不是本轮已通过）

对照输入必须是同一次有效源cut：正式已发布叶取K1，已启用D1路径取D1，其余取经原writer边界核实的最新实际文件，分别保存SHA和来源；不能用Git HEAD替换LIVE脏的统计。在隔离副本上导入，对照旧读器和新资源接口，原件保留。

| 验收层 | 方法及通过条件 |
|---|---|
| 逐文件/逐值 | 全量清单按原始字节、JSON key/类型/值/顺序、null/缺失、Markdown、引用与SHA逐项核同；全catalog及210片、所有角色/分母/反证/限制、数组次序均覆盖。浮点/序列化变化不设宽容门掩盖差异 |
| 实际消费者 | 固定决策题面同时跑旧/新loader及查询工具，核输出、候选排序、prompt字节/预算、sim输入与确定性输出；随机模拟固定原seed，多轮不启动Jev/脑API。覆盖Silent/Ironclad、其他角色空库、A0/A10、boss/路线/药水/SL、prefix/工具两入口 |
| 生产并行shadow | 正式仍走旧读器，后台在相同bundle字节比较新读器；预先保存字节才比较，不能两次各读latest。只记录差异与耗时，不增加对局动作、不改变学习内容。自然样本未出现的入口用固定fixture补核但不冒自然采用 |
| 原子/恢复 | 在每个producer失败、catalog失败、对象落盘后/commit前/commit后回执丢失、磁盘不足、busy、CAS竞争、旧方法票失效、进程退出等点注入。任何读者只读完整旧版/新版；同ID只发布一次；旧局/SL/重启保持原版 |
| 锁与strict | 在隔离合同测试中令refresh持K、统计连续发布：merge检查/fast配置发布不得申请K或因数据变化漂移；代码/配置变化仍被strict抓到。不能只测“未调用某函数”或直接排除knowledge全目录 |

本轮只测现有JSON读取基线，[json-baseline.json](json-baseline.json)：Node22.23.3、nice19、单进程、每项21次，固定本树Git文件；未清OS缓存，单位ms：

| 数据 | bytes | read+JSON.parse p50 | p95 |
|---|---:|---:|---:|
| monster-db | 2,403,278 | 21.619 | 25.611 |
| Silent room-costs | 33,360 | 0.161 | 0.264 |
| Silent v6-history | 26,089,041 | 241.735 | 265.699 |
| Git策略文件116条 | 574,676 | 2.730 | 4.712 |

这些是重复文件读取的局部基线，**不是37MB生产history、当前K1的173条策略、完整决策时延或SQLite对照结论**。本轮没有实现迁移，所以不声称“延迟已不变”。实施后用冻结生产大小与题面，在同机nice19/≤2进程、原heavy准入下做同题配对交替测量，至少200题（不足则全部且注明）、每题≥5轮；分别给首次连接/冷加载、进程缓存命中、工具查询、完整决策CPU段的p50/p95/p99、RSS/字节/样本数，保留每次原始测量及失败。

建议通过门：逐题值/行为零差异；缓存热点无逐次SQL/JSON全量读取；配对决策CPU段p95与p99比旧路径增量的95%上界不大于测量分辨噪声（先用旧→旧配对确定，封顶1ms）；启动/冷载单列不得把成本藏到局间。若样本/噪声无法证明不劣，保留旧路径、补固定测量，不宣称通过。主管可在批准时收紧门；任何实质回归先优化索引/缓存，不能放宽游戏超时或用外部模型耗时掩盖。

## 6. 回退：一个显式backend开关，原件可恢复

每个可切换bundle先生成同manifest的只读 **JSON兼容镜像** 到忽略数据目录，逐字节核SHA/fsync并留下 ready 回执；它是DB的派生导出，不是第二个有效writer。原生产快照、最新未迁文件和D1历史在切换前分别备份。删除Git跟踪不删除这些恢复原件。

切回时原ops在自然局间只把拟议 `assets.backend=sqlite` 改为 **json**（同一已核bundle），不重新导出、不git checkout旧脏数据、不重启当前局。旧/新代码都必须已经支持该backend和外置镜像；否则没有“一键回退”资格，不能上线。stats库坏或新stats连接不可用时回退读取不允许先打开坏库取manifest，指针/镜像有独立已核本地回执。开关作用于本单逐批迁移的资源及其list/query接口；本来已走K1数据库的173条策略/typed tools仍保原正式通道，不以这个开关退回Git116条。原K1数据库自身故障继续原K1恢复合同，不冒称本单JSON回退可修复全部既有数据库故障。

stats新发布只有在本版JSON镜像也就绪时才可被新局选中；出错保留上一ready bundle。数据回退选上一ready bundle也不需要回滚代码；代码本身回退按原合并队列/局间规则，使用已备配套code+bundle，不能假定任意历史代码认识新路径。进入局的绑定和原批完成回调永远沿原选择，不热改。

数据库一致性备份使用 [SQLite Backup API](https://sqlite.org/backup.html) / 原已核入口，不能只cp在线`.sqlite`而漏WAL；恢复到新目录核integrity/对象/全部版本/引用后再切。D1/运营库的旧副本、失败、原回执、日志与研究不自动清理；后续空间治理仍交原retention和owner门。

## 7. strict、K与 #68 的收口条件

**当前不改任何锁或policy。** #68第一批K保管继续原计划，DataSeal第二批暂停。迁库后CodeSeal仍建议保留：精确覆盖代码、配置、方法声明、schema、运行依赖和固定检查输入；数据身份改记bundle/版本/SHA，不需要用数据字节冻结整个源码发布窗口。CodeSeal实现范围待主管另定，不夹进本方案实施。

第1批A实际核收时，同批改 producer输出、读者、方法依赖和队列分类：代码方法声明不再把统计正文当源码依赖，而是记录输入资源/版本合同；仍保 #84 精确ROOT/LIVE闭包、方法准入票/终态检查/CAS和 #57 game-admission，不把数据入库当方法审批。正在运行的旧方法worker绑定原代码/方法，不能混读半套已换代码；工程采用后失去有效准入的旧候选只留失败/待重算，不阻塞合并去等它完成。

代码扫描目前发现的K消费者至少有：`ops/publication_gate.py:source_locks`（`board_queue_records.py`及`board_queue_checks.py`调用）、`.agents/queue-workspace.json:sync_lock`、`.agents/board.yaml:guard_locks`、`ops/board_resources.py`、`ops/board_heavy.py`、`ops/report.py`、`ops/learner_supervisor_close.py`，另有部署的board-kit适配器。实施时逐一核实际用途：合并/发布/fast/资源就绪判断/会话收尾不再凭refresh持K拒绝；只让原refresh worker拿K防重入。不能只改source_locks而保留queue sync_lock造成暗中串行，也不能私改kit或跳过其原owner。原heavy资源槽/完整检查唯一性不因去K而增加并发容量；“不争K”不承诺忽略CPU/内存/磁盘准入。

第1批后A数据不再受Git跟踪，strict排除的是经资源登记核收的A精确路径；B/C仍未迁的冻结知识叶继续原保护，不能先宣称所有数据退出strict。B正式K1发布已不拿源码锁；其Git旧副本只作未切读者兼容，不能再就地更新。**只有A全部易变文件已退出源码写入、且实际合并/fast不再依赖K的验收通过，才能宣布锁冲突主体解除**；若剩余写者仍可能改strict输入，本批不得交“已解锁”。最终B/C实际迁完才全部只核代码/配置。

以下人工接力规则在入库批次核收后标注 **“由入库取代”**；本方案提交不让它们提前失效：

| 原件 | 现阶段 | 替代条件 |
|---|---|---|
| [77/6496035933](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6496035933) | 原K接力继续 | A迁库+队列/发布K消费者全部切换，原owner登记实际生效时间/源码 |
| [82/6511764132](https://github.com/dwroy/agent-sts2/issues/82#issuecomment-6511764132) | 同上 | 同上 |
| [82/6513930571](https://github.com/dwroy/agent-sts2/issues/82#issuecomment-6513930571) | 同上 | 同上 |
| [77/6539468421](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6539468421) | 原7ee4bcec/c0075dfa顺序与正在执行的事务保持 | 旧事务先自然结算；新批按实际已批准入库合同，不改写旧environment失败/回执 |

## 8. 三批实施计划与每批验收

| 批次 | 交付及先后 | 队列/退出条件 |
|---|---|---|
| **1：A** | stats schema/只读接口、原D1基线接入、新S1整轮候选；全部A输出改staging、catalog/observed/报告同事务；所有A读者/依赖/固定方法准入、run-config/backend/镜像；最后精确退Git/strict及K消费者 | 独立固定HEAD+保留分支+部署图+回退图走原合并队列；在原集成员安排的唯一组合检查核生产/runtime/live tsc、host/consumers/full与新定向；ops自然局间切，收实际refresh→完整S1→新局读取、旧局不变、refresh并行merge/fast无K冲突。未迁B/C不冒完成 |
| **2：B** | 扩K1资产/文本及draft域；直接FS/guide/handbook/SL/Jev/construction、运营复盘读者切换；校准/event/opening-value保持固定方法；保现有173策略/K1-only分类；精确退Git | 新独立批次，验证各角色与Ironclad等价、旧K1向后读/回退、草稿不晋升、原知识候选/校准/运营消费者真实读回；不等待科学收益父项才交工程，也不因工程通过关科学父 |
| **3：C/D** | 外部安全投影与自有build统计入库、game-data运行资源切换、外部stock/eval动态路径；核D1历史/运营导出/来源映射及备份，LogDB/原缓存保留 | 第三批走同队列，核原许可/版本/SHA/partial/tombstone和独立分母；全清单重新扫描证明所有运行知识读DB、tracked仅代码/schema/文档。历史库/快照回收另走retention，不用迁移删除替代验收 |

每批准备尽量局中完成，资源 nice19、≤2进程，无 npm install，无 play、STOP/PAUSE、账号/共享服务修改。新实现只能在主管批准后于本树继续；不抢7ee4bcec等在途唯一检查，不自行submit/tick/安装生产。每批交付只准备固定源码请求，由原集成员/ops按队列和自然边界采用，实际行为编号由ops核实际发布事实，方案不分配编号。

## 9. 审阅停点与仍待实施的验证

请主管审阅本方案的独立stats库选择、S1/K1/运营视图不可变绑定、A整轮原子发布、JSON镜像回退及分批边界。批准前停在本材料；当前工程代码零改动，不需占tsc/vitest唯一检查。

已完成的是603文件清点/代码读写路径核对、K1与D1短只读事务、控制范围读回、JSON局部基线和材料自检。未完成的是SQLite真实消费者对照/全量冻结导入/延迟不劣/故障恢复/组合检查/生产切换与自然验收；这些不能由本方案、schema草案或文档评审替代。对D1历史、缺失稀疏C文件和B冲突的处置必须沿实际源及原owner，迁移不会增加知识可信度或关闭学习要求。

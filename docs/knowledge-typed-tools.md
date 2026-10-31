# 类型化知识查询（#62）

此项在 #60 的 K1 不可变发布、候选、证据、运行绑定上追加 schema 2。统计仍走 DuckDB；开发只在隔离目录核验，不更新生产控制、数据库、live 或 STOP。工程组合检查由集成员串行核收，真实学习入库及自然局继续由 ops 接。

当前实际宿主 Node 22.23.3 提供带 WAL-reset 修复的内置 SQLite 3.51.3。工具模块直接引用 `node:sqlite`，本组合不支持历史 Node20；没有新增依赖或升级共享 Node。发布器和只读连接都核 SQLite 修复版本。

## 源、类型、原 ID 与覆盖边界

| 已发布源 | 类型 / 扩展表 | 原 ID |
|---|---|---|
| `characters/<角色>/experience.json`、`common/shared-experience.json` | experience / experience_details | `id` |
| `characters/<角色>/strategy-entries.json` | strategy / strategy_details | `id` |
| `characters/<角色>/reflex.json` | reflex / reflex_details | `id` |
| `characters/<角色>/build-cores.json` | core / core_details；combo / combo_details | `direction`；`combos[].id`，保留父 direction |
| `characters/<角色>/direction-cards.json` | direction / core_details | `id`（旧合同，不冒充 build-core） |
| `characters/<角色>/reflex-vocab.json` | vocab / vocab_details | `dimensions.<维度>[].id`，同 ID 不同维度分开 |
| `common/open-book.json`、`characters/<角色>/open-book.json` | fact / fact_details | `kind` + `id`，原中文名、aliases、facts 与公开来源 |
| `external/sts2fun/builds-v1/archetypes.json` | 保留原 documents/revisions 与冻结快照 | `$document`，几何模型不当作已验证流派知识 |

`business_items` 外键关联原修订，保存类型、原 ID、父 ID、角色/公共范围、状态、明确游戏版本和逐条原 JSON；各业务表有明确字段、CHECK 和索引。`item_terms` 存实体、别名、类别、题型和多值主题；`item_links` 存原经验/rk/core/combo/tag 关系；`item_evidence` 保留原支持、反证、来源和 SHA。没有游戏版本/可信度/状态的原文仍未知，不能从证据版本或候选格式推定已验证。

主题 `startup / boss / double_boss / build_route / climb_route` 只来自原条目明确的 `topics` 数组，允许多选。同一知识只存一个类型投影；不按主题复制、不用中文关键词或 ID 猜分类。现有条目没有主题时保持未知，主题无命中不能推出知识不存在。V6 严格合同未提供的主题字段不由本次开发填入。

没有迁移：pending、草稿、原日志/证据附件文件、其他攻略；monster-db/move-model/card-upgrades/event-pages 等原模型和统计；外部聚合、DuckDB/Parquet。它们仍沿原消费者。原 Git 正式 open-book 可作为新覆盖源；忽略目录的可刷新 overlay 不自动导入，须原 owner 固定已发布字节及出处再核准。覆盖清单按实际输入逐路径/类型/原 ID 列出，源 SHA 和逐条等价核验见交付材料，不用开发夹具充知识。

## 升级、发布与回退

schema 1→2 在 `BEGIN IMMEDIATE` 内建表并从所有已有修订回填；失败连 DDL 一起回滚。原 documents/revisions、K1、候选、发布、事件、run_bindings 不改；重复打开不重复回填。只读大脑不升级、不取 latest，缺 schema/版本时报错，不回落 Git 或另一版本。原局仍绑定旧 K1，新局才绑定新版本；回滚保留后续候选/修订/运行记录。

先由 ops 沿原 publication-admission 自然边界备份、核唯一 writer，再运行原 `init --runtime ...` 触发升级，核 schema=2 与既有 K1/条数/ID/证据。旧 K1 没有 open-book 文档时不自动换版；新实体工具查询返回该版无事实。需要扩覆盖时，原 owner 固定已发布源，用只增加缺失文档的显式命令：

```bash
node --import tsx tools/knowledge-runtime.ts extend --runtime "$RUNTIME" \
  --base "$BOUND_BASE" --knowledge "$FROZEN_PUBLISHED" --id "$REQUEST_ID" --source "$SOURCE"
```

`extend` 忽略基线已有文档，只把缺失已覆盖文档加入候选；它不能用旧 Git 数据覆盖已更新 runtime。CAS、校验、同 ID 幂等、备份恢复沿原发布器。普通学习候选更新同时投影新修订，不要求重学；嵌套 combo/card/vocab 的证据与反证亦不能删除。

数据回退沿原 `rollback`，仅改变下一新绑定。源码回退到只认 schema 1 的 #60 代码时，不能直接打开升级库：保留 schema 2 原库及全部候选/历史，恢复升级前一致性 backup 到新目录，沿自然边界核来源、writer、控制及新局。不能复制活动 SQLite 主文件覆盖原库。已经启动的局保持原绑定；恢复 schema 2 后可继续读其历史。

## tools 与查询

保留 `kb_experience` 的 theme/id/keyword/relevant、`kb_strategies` 的 query/limit/offset、`kb_reflex` 的 query/applies_to、`kb_open_book` 的 query/category。增加可选 entity/topic；原无分页工具增加 limit/offset。绑定 SQLite 时另开放 `kb_build_cores / kb_build_combos / kb_vocab`，仍只有结构化参数；无任意 SQL、路径、角色或版本参数。旧文件模式保持原读取，不能静默忽略新增索引筛选。

```json
{"tool":"kb_experience","input":{"relevant":true,"entity":"原实体ID","limit":3}}
{"tool":"kb_strategies","input":{"query":"路线","offset":0,"limit":3}}
{"tool":"kb_reflex","input":{"query":"*","applies_to":"card_pick"}}
{"tool":"kb_open_book","input":{"query":"原中文名或别名","category":"cards"}}
{"tool":"kb_build_combos","input":{"query":"*","entity":"原卡牌ID"}}
```

真实 ToolDef 先验证参数；固定 SQL 绑定当前 K1、运行角色和进阶，先用类型/角色、发布成员、实体关系/FTS 索引召回，再复用原经验 relevance/appliesAt、策略 trigger/流派判断和 rk 构筑题过滤。内部单次索引游标取尽，之后才动态判断、排序及输出分页；不会把前100条不适用当作无匹配，也避免反复 OFFSET 排序。短中文单字/双字使用 `item_grams` 主键索引，三字及以上用 FTS5 trigram。原 source、支持/反证、限制和条目自身版本留在返回原文，另附 K1、路径、原叶 SHA、修订和原 ID。

按 K1 缓存只读连接、已解析条目、静态召回和 fact 来源清单；解析/召回各限16/8MiB序列化字节，召回最多64个过滤组合，连接最多8个绑定。无需每次解析校验整个 core/vocab/rk 库；HP/牌组/题型和动态条件仍每题判断。核心工具返回预存的 `core_summary`，以 combo 原 ID 关联证据；组合工具返回 `combo_summary`，保留 cards/prerequisites/evidence/fits/原可信度，明确省略完整 metrics。摘要另存 `tool_payload`，避免每次从 DB 传输大段 metrics；完整 JSON 保留在 payload、原修订及 export。摘要不冒充原文全文或已满足 predicate。每次输出≤24KB，过大单条明确计 oversized_skipped，next_offset 继续，不截断证据。自然采用和收益另验。

角色隔离对铁甲同样适用：经验只取铁甲与正式公共经验，不读取静默专属内容。绑定 SQLite 后开卷工具也按公共+当前角色取数；旧开卷加载器固定附带的静默专属100条不再对铁甲开放。这是按本 issue 跨角色隔离验收收窄只读知识面，不修改铁甲的游戏规则、参数或执行代码；实际行为影响仍由 ops 核自然调用。

CLI 只读诊断另有 `typed-query --runtime ... --version ... --character ... --type experience --text 路线`，支持 `--entity/--topic/--category/--ascension/--limit/--offset`。诊断和固定工具回放不代生产真实调用。


#66 追加 schema3 显式分类元数据、候选与空因反馈；schema1/2原修订和K1保持。当前 reader/升级、分类操作和诊断口径以[显式知识分类合同](knowledge-classification.md)为准。

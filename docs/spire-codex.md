# Spire Codex 离线回放接入（#82）

本入口只做外部证据的下载、去标识与查询，不提炼游戏知识，不接大脑、战斗或生产学习派发。来源为 [Spire Codex](https://spire-codex.com)，接口以 [OpenAPI](https://spire-codex.com/openapi.json) 为准；公开使用边界见 [条款](https://spire-codex.com/terms) 和 [开发者文档](https://spire-codex.com/developers)。2026-10-28 核得开发者页的无 key 额度为 15 次/分钟，比 issue 引用的旧条款 60–120 次/分钟严格；本工具串行、请求间隔至少 4.1 秒，遇 429 按 Retry-After 退避，不配置账号或 key。分页导出另有 120 credits/小时限制，本工具直接取 manifest 的静态文件，不反复请求动态全库导出。

## ops 首次执行与恢复

在已核收代码的运行根使用现有 `data/logdb-venv/bin/python`（DuckDB 1.5.6），不装依赖。以下是交接命令，开发会话不执行全量：

```bash
nice -n 19 data/logdb-venv/bin/python eval/spire_codex.py download
nice -n 19 data/logdb-venv/bin/python eval/spire_codex.py project
nice -n 19 data/logdb-venv/bin/python eval/spire_codex.py build-db
nice -n 19 data/logdb-venv/bin/python eval/spire_codex.py audit
nice -n 19 data/logdb-venv/bin/python eval/spire_codex.py report
```

默认根为忽略目录 `data/external/spire-codex/`；全局参数 `--root` 必须放子命令前。下载最多一个 Python 和一个 curl 进程；DuckDB 仅一线程、内存上限 512MB，按有界 JSON 批量插入。没有 daemon、cron、自动模型或新生产入口。下载/project/build-db 共享非阻塞 `intake.lock`，忙则失败保留；curl 继承同一锁 FD，父进程中断后原下载仍在时，新 writer 继续被拒绝。query 仅打开已经发布的 DuckDB 文件，重建临时库完成后原子换名。

默认下载 v0.111.0 完整静态导出，并按 manifest 全部 build 枚举 Silent A10 回放；最后补一次不限 build 的扫描，覆盖每日 manifest 尚未登记的新 build。只取回放可以加 `--no-export`；指定回放版本为 `--version v0.111.0`，额外导出用可重复的 `--export-version`（提供时覆盖默认）。这些显式子集不得冒称全版本完成。`--max-pages N` 限制本次列表请求数，返回 `complete=false` 时仍有工作；同参数重跑继续原 cycle、原 shard/page，完整 cycle 之后再重跑从第一页重新扫描。新一轮对已有回放按 ETag/Last-Modified 条件重验：304复用，200重新核文件；同一 cycle 的重复 run 直接复用已校验字节。来源没有 HTTP 验证器时必须重新获取，不能声称已有字节永不变化。列表不是稳定快照，新上传/删除可能移动页边界；后续整轮重扫修复漂移，不能把一次遍历冒称某个时刻的事务快照。

不依赖 `total`、`total_pages` 或短页判终，必须翻到空页。`total_is_lower_bound` 可以在小于 10000 时成立，只作为来源限制保留。build 达 10000 时细分 `win=true` / `win=false` 并逐行核对实际胜负；若接口不认某个分片值或子片仍饱和，明确失败并保留游标，不报全量完成。始终保留全部下载状态，不能为了绕过限速、游标错误或来源失败换 IP、账号、API 或页镜像。

HTTP 下载以 `.part`、Range、If-Range 与 ETag/Last-Modified 接续；200 表示从头替换，206 必须匹配 Content-Range 和既有验证器。请求前保存 inflight 的 URL/追加偏移；中断留下的 `.chunk` 和响应头在同一锁内恢复，追加中断先回到已登记偏移，完整且已固定对象可直接核 SHA 后完成。没有验证器的未固定对象从头重取。导出目标带 manifest SHA，终态同时核压缩字节数和 SHA256；校验不符保留原件并失败，不进入学习缓存。接到失败状态或中断时原参数重跑；不要手改 private-index、salt、manifest SHA 或原 receipt。每个完成文件的 `.receipt.json` 保存来源 URL、原始/解析 URL、下载时间、字节、SHA 和 manifest 是否核过。原始文件可能含玩家标识，回执 URL 也可能含 raw run_hash，均只留忽略目录。

同一URL返回新字节时，先把旧raw和原收据精确保存在原目标目录的 `revisions/<旧SHA>/`，再替换当前文件；新收据的 `previous_revision` 给出相对原目标父目录的旧文件/收据路径与SHA。原始文件与收据均用原inode的独立链接保留，后继写入只原子换名；旧归档若校验不符会拒绝覆盖当前原件。`report.downloaded.total_bytes` 是当前索引对象字节，不包含历史修订、元数据和重复校验传输量。

### 列表存在但回放缺失（#82 / 6499780647）

只有已验证的列表行所指回放接口，返回 404 且完整响应为 `{"detail":"Replay not found"}`（或精确纯文本 `Replay not found`），才记墓碑后继续。响应新增字段、不同正文、非零 curl 返回码、字节长度不符、其他接口或跳转后的 404 均不适用；429、超时、5xx 继续原退避/失败合同，SHA/字节校验失败继续停止，不能归为缺失。

私有 `private-index.json.tombstones` 按原 run_hash 保留同一墓碑及历次观察，保存 cycle、分片、页、1-based页内序号、列表SHA、响应时间、curl rc、头/体SHA和精确副本路径。副本在 `raw/tombstones/`，与原chunk/headers/journal均不进入学习输入。新响应按 curl 结束时间记账；旧版失败journal在冻结头的Content-Length与完整正文一致时离线接收，时间使用响应头文件mtime，未知curl rc记null，来源原因仍未知。原失败原件保留，不补造成功回执。

按 [#82/6513078786](https://github.com/dwroy/agent-sts2/issues/82#issuecomment-6513078786)，仅对旧journal没有curl rc、冻结404没有Content-Length、正文精确匹配“Replay not found”的这一类不完整旧证据，增加私有根目录共用的一次受控重取额度。仍须是本轮实际列表里的原回放URL；已知curl失败、长度不符、其他正文/接口/跳转不适用。请求前复制旧正文、响应头、journal及已有part到 `raw/legacy-404-rechecks/`，保存SHA、原长度/mtime；先持久写 `legacy-404-recheck.json` 绑定URL/cycle/下载参数和开始时间，再发一次完整GET。新头/体副本、SHA、HTTP状态、curl rc和完成时间独立保存，旧失败不覆盖。无论新结果如何都不循环、退避或跟随跳转。记录已开始但结果不明时也消耗额度，重启只停下报主管，不能再请求或手改额度。

受控结果仅rc0且完整的精确404进入墓碑；rc0的200走原长度/SHA验证和回执发布。其他结果保留原游标并停止。完成响应后、墓碑或成功索引提交前中断，重启校验冻结证据并完成原结果，不重新请求；根目录第二条旧失败或新cycle不能另领额度。该额度不改变正常下一完整cycle对既有墓碑的自然重查规则。此处接续只由原ops在小批合入并核ROOT字节后执行，开发固定测试不运行生产下载，不重下已核782及导出，不更换盐、分片或游标。

同轮按去重的 run 计已处理记录（已核成功与墓碑的并集）；旧索引由 `checked_cycle` 读回已核成功，不倒填请求。按 [#82/6515600192](https://github.com/dwroy/agent-sts2/issues/82#issuecomment-6515600192)，CLI `--max-tombstone-ratio` 默认 `0.10`，仅接受有限的 `[0,1]` 数值，累计比例**严格超过**才停，恰好10%可继续；使用精确有理数比较。连续≥5个新处理run为墓碑仍停止。此外，同一 build/win/page 已处理≥10个不同run，墓碑占比≥50%即停；成功行也检查此门，因此第10行成功后恰好5/10仍停止。每行先持久保存再检查；连续性跨页/分片/重启保存，新成功归零，同轮重复行和重读页前缀不重复计数、不重置连续性。触发后同参数接续在任何网络请求前拒绝；不手改计数/游标绕过。

墓碑同轮不再请求（包括列表重复、重启和索引提交前中断）；下一次完整扫描遇到该run才自然再查一次，仍缺失沿用原墓碑并追加观察，成功则解除active标记，保留历史。未完成cycle固定原versions/shards/page和已核manifest导出，不因每日manifest变化重建分片或重下导出；原导出损坏明确停止。ops沿原参数从第1/40分片第8页恢复，页面前缀已核回放直接复用，冻结且完整的原404可离线转墓碑。开发不改生产索引/游标，不启动下载。

墓碑独立于成功，既不造零值也不纳入统计分母。active墓碑即使有旧成功raw，也不进当前回放投影/表；同run整局导出行也排除，安全导出缓存按加盐可用性修订重新寻址，旧缓存与raw原样保留。`report.replay_availability` 和 download结果单列本轮 `tombstones`、`processed_records`、`tombstone_ratio`、`consecutive_tombstones` 及跨轮 `active_tombstones`；这些是采集覆盖口径，不是游戏胜率/首试分母。墓碑头、体、ID和位置仅留私有目录，公开验收只写数量/比例及限制。

`download` 与 `report.replay_availability.pages` 按页列出版本、win分片、页、已处理数、墓碑数和比例。去重所需run键仅存在私有cycle中。旧索引只有墓碑位置，没有历史成功行的页归属：这些页标 `counts_scope=legacy_tombstones_only`，`processed_records/tombstone_ratio=null`，不虚构分母，也不据此触发页门；恢复页逐行核实后按 `observed_rows` 去重累计，尚未重读的原墓碑数单列 `legacy_tombstones_not_recounted`。累计分母和连续数继续从原索引精确读取。

首次只下载 v0.111.0 导出，保持同版本研究优先。下表为 2026-10-27 manifest 的冻结压缩体积，运行时仍以新 manifest 为准；旧版本本次不自动取，需研究单元明确版本后再用 `--export-version` 显式增加，不能混入同版本分母：

| 版本 | 压缩字节 | 本次安排 |
| --- | ---: | --- |
| v0.111.0 | 1,257,325,731 | 默认，文件必须按 manifest SHA 核过 |
| v0.110.1 / v0.110.0 | 252,259,423 / 3,069,012 | 需要前版本对照时优先考虑，分版本研究 |
| v0.109.1 / v0.109.0 | 93,715,281 / 164,187,716 | 暂缓；有版本限定的问题再取 |
| v0.108.0 | 254,224,005 | 暂缓 |
| v0.107.1 / v0.107.0 | 2,577,691,395 / 289,278,018 | 暂缓，前者约为当前版本两倍体积 |

RC 和更早版本不在本次默认导出范围；其回放仍沿全版本列表下载并保留 build。表中体积不是下载完成或文件 SHA 已验证的回执。

## 原始与学习缓存边界

| 路径 | 用途 | 学习者可读 |
| --- | --- | --- |
| `raw/`、`private-index.json` | 原 API 列表、回放、整局导出、下载索引/分页状态及用于文本脱敏的私有标识值 | 否 |
| `private-salt` | 32 字节随机盐，0600，跨增量保持 | 否 |
| `cache/replays/run_*.json` | v3白名单投影，每局事件与战斗索引；以版本和加盐输入修订寻址 | 是，按精确 manifest 引用 |
| `cache/exports/*.jsonl` | 单人 Silent A10 整局导出的安全投影 | 是 |
| `cache/replays.duckdb` | 上述投影重建的分析库 | 是，只读 |
| `cache/projection.json`、`database.json` | 安全分母、排除计数、版本、SHA 与审计 | 是 |

入口先按事件类型选字段，再按 cards/options/enemies 等嵌套结构选字段；没有兜底透传 JSON。username、player_token、steam_id、discord_id、玩家对象、账号、平台、真实时间、mods/harmony 及未知字段不进缓存；原 run_hash、seed 只用于私有输入，改成分域 HMAC-SHA256 稳定 `run_id`、`seed_id`。同盐可对齐回放与导出、同种子；它们不是玩家 ID，不能统计独立玩家数。已知标识的文本回显在 label/desc/selectable_reason/reason 中脱敏；角色、卡牌等有明确游戏语义的标识保留白名单原值，避免玩家名恰好等于SILENT或卡ID时破坏游戏字段。rng_state 不进入学习缓存；原始证据保留。盐丢失会改变稳定 ID，必须恢复原盐，不能混合两套缓存。

v3 的 `projection.json.replays/exports` 保存精确路径和 SHA；旧生成文件继续保留，但建库只读取当前 manifest，不用目录 glob。版本、输入字节或元数据变更生成新的寻址文件，只有全部成功后才原子发布新 manifest。原样重跑复用已批准且 SHA 核同的投影；损坏文件从原始证据重建，建库发现坏 SHA 拒绝替换旧 DB。已有缓存时盐丢失或改变会明确失败；不能生成新盐后把两个身份体系混在一起。开发期v1/v2原件保留，首次正式核收使用v3，旧分类/脱敏缓存不作为v3验证结果。

下载覆盖 Silent A10 列表的全部玩家数；当前逐回合投影仅支持单人，`exclusions.multiplayer_not_projected` / `unknown_player_count` 与 `raw_replay_count`、实际 `replay_count` 分列。损坏 NDJSON、缺 header、角色/进阶/版本漂移等错误直接失败，不静默跳过。旧版本保留原 build 分账，不能推定机制相同。未知事件只记 `unsupported_events` 数量，不透传未知名称或内容；当前白名单见 `eval/spire_codex_projection.py`，扩大 schema 需升级投影版本并重建缓存。审计递归拒绝玩家标识字段；它是白名单投影后的复核，不是给原始文件开权限。

## 当前 cycle 的部分安全投影（#82 / 6515844478）

未完成cycle必须显式 `project --partial`；随后沿同一根顺序 `build-db`、`audit`、`report`。开发验收使用原树隔离输出，原生产raw和盐只读引用，冻结索引按原字节复制；不执行下载，不改原失败、once、盐或游标。收录条件是当前cycle的 `checked_cycle`、完整raw存在且SHA一致、无在途part/chunk/journal、不在active墓碑中，并通过原单人SILENT A10及header/index版本相等校验。

部分模式将旧cycle、缺raw、在途、SHA不符、缺header、build不一致逐项记排除原因；build不一致不改任一侧版本、不补别名、不作为另一个版本的已核回放。其他解析、隐私或投影错误仍失败。当前1208局冻结输入里71局的列表build是 `v0.111.0`，回放header是 `0.1.0`，这是真实证据冲突；隔离它们仅能提供可信子集，不能宣称已解决上游版本语义。完整模式仍拒绝该冲突，恢复收录须另交主管裁决。

投影、数据库、audit与report都携带 `partial: true`、收录数、排除原因和 `cutoff_cursor`（分片序号/总数/页）。投影另绑定输入索引SHA；DB绑定精确投影receipt SHA，report拒绝读取与新投影不匹配的旧DB。部分整局导出也只收已通过回放校验的run，不借静态全库导出扩大部分样本。只从当前精确manifest或DB消费，不glob历史文件；#83只读安全cache/查询结果，不读raw/private-index/salt。全量完成后仍须按原全量合同重建并核收，部分结果不代全量完成。

建库保持单线程及512MB限制，在临时库内按回放提交；JSON入库批次至多5000行，并按1MiB编码字节分批（单行不拆分），整局导出分批提交。全部表和视图完成后才原子替换正式库。中途失败不替换上一份正式库或数据库收据，后继报告仍检查投影收据绑定，不能把旧DB冒充新范围。

## 表与读档口径

| 表/视图 | 含义 |
| --- | --- |
| `runs` | 版本、角色/进阶、API 胜负、capture_status、原始缺前缀标记、终局牌组/遗物、来源 SHA |
| `export_runs` | manifest 完整导出中的单人 Silent A10；details 另存逐节点安全 history；与回放按 salted run_id 关联，不相加当独立局 |
| `combats` | encounter、floor、act、原 attempt_id、attempt_kind、result、turns、hp_lost 与开始/终止行 |
| `turns` | 玩家回合号、最近观察的能量、手牌、意图；显式来源快照优先，否则 `hand_basis=observed_draws_partial`，不能冒完整手牌 |
| `plays` | 同回合按文件物理行排序的 play_order、卡 ID、目标、实际 cost_paid、升级；原 play_index 等另存 details |
| `potions` | 每条 potion 事件及目标；只数 kind=potion_used 才是实际使用，不把 got/start 再计一次 |
| `decisions` | 全部已记录选项、所选/结果事件；用 segment/decision_id 对齐，不跨读档拼接；缺 outcome 保留空数组 |
| `events` | 全部白名单事件，包括抽牌/伤害/格挡/能力/药水/决策/地图；line 为解析后的1-based事件序号（若输入有空行，和物理行不同），不拿 s 去重 |
| `first_combats`、`first_plays` | 默认首次战斗统计入口；重试和未知单列 |

`attempt_id` 不是每场战斗的独立重试序号。冻结回放中在 F8 从 0 读档到 1、2，F9 的首次战斗也沿用 2。因此保留原值，以同一 run 下 `(combat_id,floor,act)` 的出现历史分类：完整前缀的新战斗是 first；同战斗再次出现且 attempt_id 改变或有 resume 证据是 retry；缺前缀、缺/负编号、未观察前次但已指向该战斗的 resume、重复同编号且无读档证据是 unknown。`observed_attempt_ordinal` 只数已观察段，`after_run_reload` 单列此前整局是否已有读档，不能把它当这场战斗重试。

resume/header/remap 在战斗中出现会关闭旧段并标记 boundary，remap 另保留卡实例映射；不将前后段的出牌、手牌或决策混在一起。被读档中止的首次战斗仍计入首次分母，结果为 null、missing_end=true，不能通过只选有 combat_end 的场次抬高首次胜率。`first_combats` 不代表“整局从未 SL”；统计纯无读档局还须核全局事件、after_run_reload 与 run capture_status。API win 是上传记录胜负，terminal_reason 可能是 left_run；两者各自保留，不互相改写，也不推导无 SL 胜利。

意图是当时记录的显示值，能量为最近事件值，缺失为 null；观察抽牌集合仅部分还原，不推算隐藏牌、伤害或机制。整局导出的 history 仅留安全列；缺动作前 HP、未记录决策和重试前像不补值。终局牌组只能描述终局，不能回填早期构筑。本接入不证明玩家数、来源代表性、因果效应、学习产出或胜率提升。

与自有 logdb 对照时保留 `source/build_id/character/ascension/attempt_kind`，不直接合并两套 run_id。字段对照如下，定义未对齐的项分账：

| 外部表 | 自有 logdb | 对照限制 |
| --- | --- | --- |
| runs.win | runs.victory | 上传胜负与本系统原局终态分账，首试/SL不互相替代 |
| combats.floor/act/turns | fights.floor/act/turns | 外部为事件摘要，自有为原始帧聚合，缺帧和中止分别保留 |
| combats.encounter | fights.encounter | 外部是遭遇ID；自有是怪物ID排序拼接，不能只凭字符串不同判断不同Boss，也不凭开发知识写别名 |
| combats.hp_lost | fights.hp_loss/net_hp_loss | 外部原值为hp_lost_total，自有分别是帧内HP差/房后净HP差；回血、自损等未对齐时不混算 |
| plays.card_id/target/play_order | decisions.card_id/target_index/off | 按来源原顺序对齐；实例/目标编号各局独立，不跨库直接join |
| potions.kind=potion_used | decisions.action=use_potion | got/start单列，不重复当使用次数 |

## 查询与验收

query 只接一条 SELECT，关闭 DuckDB 外部访问、禁写、默认最多 200 行。以下 Boss ID 是查询参数示例，实际取来源 encounter，开发不维护游戏知识映射：

```bash
nice -n 19 data/logdb-venv/bin/python eval/spire_codex.py query \
  "SELECT encounter,attempt_kind,count(*) FROM combats GROUP BY 1,2 ORDER BY 1,2"
nice -n 19 data/logdb-venv/bin/python eval/spire_codex.py boss-plays TEST_BOSS --fights 10
```

`boss-plays` 用参数绑定 encounter，取 API 胜局中 result=`victory` 的完整战斗，默认 first；`--attempt-kind retry` 单查重试，`all` 显式包含所有已记录类型。最多返回10000条出牌，`truncated=true` 时不冒完整序列。实际使用时把示例 `TEST_BOSS` 换为来源 encounter ID；冻结格式样本已分别读回 THE_KIN_BOSS、KNOWLEDGE_DEMON_BOSS、AEONGLASS_BOSS、QUEEN_BOSS，但不能把四场样本冒成八Boss全量覆盖。

ops 首次完整执行后回 #82：原始/安全回放总局数、胜局数、v0.111 分母，逐 Boss 的 first/retry/unknown/中断场次与首次比例；下载总字节、各导出 manifest SHA/bytes 核对结果、cache audit；按实际 encounter 对 issue 点名八个 Boss 逐项读回，并给出指定 Boss 前十场胜局逐回合出牌。`report` 给可重算基础表；未下载、分片失败或子集运行不能把缺记录当零场。工程交付与这个 runtime 验收分账。

回退仅移除本次三个 eval 模块和测试入口，保留 raw/索引/盐/原始 receipt 与科学父项；不触碰 live、STOP、生产库、知识、账号、配额或其他会话。集成部署范围为 ROOT 上的离线脚本/文档/固定测试，LIVE 源叶为零。定向检查：

```bash
nice -n 19 data/logdb-venv/bin/python -B eval/tests/test_spire_codex.py
```

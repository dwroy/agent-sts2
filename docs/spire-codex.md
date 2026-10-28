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

默认根为忽略目录 `data/external/spire-codex/`；全局参数 `--root` 必须放子命令前。下载最多一个 Python 和一个 curl 进程；DuckDB 仅一线程、内存上限 512MB。没有 daemon、cron、自动模型或新生产入口。下载/project/build-db 共享非阻塞 `intake.lock`，忙则失败保留；query 仅打开已经发布的 DuckDB 文件，重建临时库完成后原子换名。

默认下载 v0.111.0 完整静态导出，并按 manifest 全部 build 枚举 Silent A10 回放；最后补一次不限 build 的扫描，覆盖每日 manifest 尚未登记的新 build。只取回放可以加 `--no-export`；指定回放版本为 `--version v0.111.0`，额外导出用可重复的 `--export-version`（提供时覆盖默认）。这些显式子集不得冒称全版本完成。`--max-pages N` 限制本次列表请求数，返回 `complete=false` 时仍有工作；同参数重跑继续原 cycle、原 shard/page，完整 cycle 之后再重跑从第一页重新扫描，只下载新增或本地校验失败的 run。列表不是稳定快照，新上传/删除可能移动页边界；后续整轮重扫修复漂移，不能把一次遍历冒称某个时刻的事务快照。

不依赖 `total`、`total_pages` 或短页判终，必须翻到空页。`total_is_lower_bound` 可以在小于 10000 时成立，只作为来源限制保留。build 达 10000 时细分 `win=true` / `win=false` 并逐行核对实际胜负；若接口不认某个分片值或子片仍饱和，明确失败并保留游标，不报全量完成。始终保留全部下载状态，不能为了绕过限速、游标错误或来源失败换 IP、账号、API 或页镜像。

HTTP 下载以 `.part`、Range、If-Range 与 ETag/Last-Modified 接续；200 表示从头替换，206 必须匹配 Content-Range。没有验证器的未固定对象从头重取。导出目标带 manifest SHA，终态同时核压缩字节数和 SHA256；校验不符保留原件并失败，不进入学习缓存。接到失败状态或中断时原参数重跑；不要手改 private-index、salt、manifest SHA 或原 receipt。每个完成文件的 `.receipt.json` 保存来源 URL、原始/解析 URL、下载时间、字节、SHA 和 manifest 是否核过。原始文件可能含玩家标识，回执 URL 也可能含 raw run_hash，均只留忽略目录。

## 原始与学习缓存边界

| 路径 | 用途 | 学习者可读 |
| --- | --- | --- |
| `raw/`、`private-index.json` | 原 API 列表、回放、整局导出、下载索引与分页状态 | 否 |
| `private-salt` | 32 字节随机盐，0600，跨增量保持 | 否 |
| `cache/replays/run_*.json` | 白名单投影，每局事件与战斗索引 | 是 |
| `cache/exports/*.jsonl` | 单人 Silent A10 整局导出的安全投影 | 是 |
| `cache/replays.duckdb` | 上述投影重建的分析库 | 是，只读 |
| `cache/projection.json`、`database.json` | 安全分母、排除计数、版本、SHA 与审计 | 是 |

入口先按事件类型选字段，再按 cards/options/enemies 等嵌套结构选字段；没有兜底透传 JSON。username、player_token、steam_id、discord_id、玩家对象、账号、平台、真实时间、mods/harmony 及未知字段不进缓存；原 run_hash、seed 只用于私有输入，改成分域 HMAC-SHA256 稳定 `run_id`、`seed_id`。同盐可对齐回放与导出、同种子；它们不是玩家 ID，不能统计独立玩家数。已知原始标识的文本回显也会脱敏。rng_state 不进入学习缓存；原始证据保留。盐丢失会改变稳定 ID，必须恢复原盐，不能混合两套缓存。

下载覆盖 Silent A10 列表的全部玩家数；当前逐回合投影仅支持单人，`exclusions.multiplayer_not_projected` 与 `raw_replay_count`、实际 `replay_count` 分列。损坏 NDJSON、缺 header、角色/进阶/版本漂移等错误直接失败，不静默跳过。旧版本保留原 build 分账，不能推定机制相同。未知事件只记 `unsupported_events` 数量，不透传未知名称或内容；当前白名单见 `eval/spire_codex_projection.py`，扩大 schema 需升级投影版本并重建缓存。审计递归拒绝玩家标识字段；它是白名单投影后的复核，不是给原始文件开权限。

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
| `events` | 全部白名单事件，包括抽牌/伤害/格挡/能力/药水/决策/地图；line 为原文件 1-based 行，不拿 s 去重 |
| `first_combats`、`first_plays` | 默认首次战斗统计入口；重试和未知单列 |

`attempt_id` 不是每场战斗的独立重试序号。冻结回放中在 F8 从 0 读档到 1、2，F9 的首次战斗也沿用 2。因此保留原值，以同一 run 下 `(combat_id,floor,act)` 的出现历史分类：完整前缀的新战斗是 first；同战斗再次出现且 attempt_id 改变或有 resume 证据是 retry；缺前缀、缺/负编号、未观察前次但已指向该战斗的 resume、重复同编号且无读档证据是 unknown。`observed_attempt_ordinal` 只数已观察段，`after_run_reload` 单列此前整局是否已有读档，不能把它当这场战斗重试。

resume/header 在战斗中出现会关闭旧段并标记 boundary，remap 保留卡实例映射；不将前后段的出牌、手牌或决策混在一起。被读档中止的首次战斗仍计入首次分母，结果为 null、missing_end=true，不能通过只选有 combat_end 的场次抬高首次胜率。`first_combats` 不代表“整局从未 SL”；统计纯无读档局还须核全局事件、after_run_reload 与 run capture_status。API win 是上传记录胜负，terminal_reason 可能是 left_run；两者各自保留，不互相改写，也不推导无 SL 胜利。

意图是当时记录的显示值，能量为最近事件值，缺失为 null；观察抽牌集合仅部分还原，不推算隐藏牌、伤害或机制。整局导出的 history 仅留安全列；缺动作前 HP、未记录决策和重试前像不补值。终局牌组只能描述终局，不能回填早期构筑。本接入不证明玩家数、来源代表性、因果效应、学习产出或胜率提升。

## 查询与验收

query 只接一条 SELECT，关闭 DuckDB 外部访问、禁写、默认最多 200 行。以下 Boss ID 是查询参数示例，实际取来源 encounter，开发不维护游戏知识映射：

```bash
nice -n 19 data/logdb-venv/bin/python eval/spire_codex.py query \
  "SELECT encounter,attempt_kind,count(*) FROM combats GROUP BY 1,2 ORDER BY 1,2"
nice -n 19 data/logdb-venv/bin/python eval/spire_codex.py query \
  "WITH chosen AS (SELECT c.combat_key FROM first_combats c JOIN runs r USING(run_id) WHERE r.win AND c.encounter='TEST_BOSS' AND c.result='win' ORDER BY c.combat_key LIMIT 10) SELECT p.* FROM first_plays p JOIN chosen USING(combat_key) ORDER BY combat_key,turn,play_order" --limit 10000
```

ops 首次完整执行后回 #82：原始/安全回放总局数、胜局数、v0.111 分母，逐 Boss 的 first/retry/unknown/中断场次与首次比例；下载总字节、各导出 manifest SHA/bytes 核对结果、cache audit；按实际 encounter 对 issue 点名八个 Boss 逐项读回，并给出指定 Boss 前十场胜局逐回合出牌。`report` 给可重算基础表；未下载、分片失败或子集运行不能把缺记录当零场。工程交付与这个 runtime 验收分账。

回退仅移除本次三个 eval 模块和测试入口，保留 raw/索引/盐/原始 receipt 与科学父项；不触碰 live、STOP、生产库、知识、账号、配额或其他会话。集成部署范围为 ROOT 上的离线脚本/文档/固定测试，LIVE 源叶为零。定向检查：

```bash
nice -n 19 data/logdb-venv/bin/python -B eval/tests/test_spire_codex.py
```

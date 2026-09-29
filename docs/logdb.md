# 日志库（DuckDB 分析库）

V4 知识库里的「日志库」（docs/v4-architecture.md §3）：把 logs/*.jsonl 派生成可以用 SQL 查的表，给复盘、学习者、大脑（`logs_query` 工具）和知识构建脚本用。2026-09-29 Dai 定：用 DuckDB。

## 1. 设计

- **JSONL 保持原样**，是唯一的原始记录；日志库只读它，不写。
- **派生库**在 `.cache/logdb/`（`.cache` 软链到 jev-sts2/.cache，所有工作树共用），随时可以整个删掉重建（`sync.py --reset`，全量约 30 秒）。
- **增量同步** `tools/logdb/sync.py`：`manifest.json` 记每个源文件已处理到的字节偏移；每次只读新追加的**完整行**（没写完的最后一行留到下次），每行变成一行紧凑的记录（`tools/logdb/extract.py`），写成 Parquet 分片 `.cache/logdb/<表>/part-<源>-<起>-<止>.parquet`（zstd）。分片写完不再改；同一个源连着 8 个以上小于 16 MB 的小分片时合并成一个新分片，旧的删掉。
- **重建条件**（只重建出问题的那个源）：记录的偏移超过文件大小（被截断）、偏移前一个字节不是换行（文件被改写）、首行哈希变了（文件被换掉）、源文件没了、或者这个源的抽取器版本（`extract.VERSIONS`）变了。启动时还会删掉 manifest 里没有的分片（上次同步中途死掉留下的）。
- **不抢对局的资源**：sync 把自己设成 `nice 19` + `ionice -c3`，DuckDB 只用 2 个线程、内存上限 2 GB。
- **并发**：同时只有一个 sync（`sync.lock`，query.py 顺带的同步拿不到锁就跳过）；查询持共享读锁，sync 只在删除/替换分片的那一刻持排他锁，所以查询不会看到一半替换的表。
- **key 不进库**：进库的自由文本（rationale、模型的简短理由、计划摘要、chosen）都过 `scrub()`，像 key 的串（`sk-…`、`Bearer …`、`api_key: …`）换成 `[REDACTED]`；问题、推理、memory 原文不进库，只存长度和源文件字节偏移。
- **表 = Parquet 上的视图**：`tools/logdb/views.sql`（`${DB}` 由 query.py 换成库目录）。存储的只有「一行 JSONL 一行记录」的五张表；fights / turns / floors / runs 每次查询时从 frames 现算，所以永远和原始数据一致，改口径只要改 SQL。
- **每张表有一个零行分片** `part-0-empty.parquet`，带表的全部列，视图靠它绑定列（各分片按列名合并）。`extract.TABLES` 里表的列变了时，sync 重写这个零行分片（旧分片不动，新列在旧分片上是 NULL），所以给一个源加列不用重建另一个源。

## 2. 用法

```bash
# 一次性：Python 环境（只装 duckdb）。本机 python3 没有 ensurepip，用 --without-pip + uv 装：
python3 -m venv --without-pip .cache/logdb-venv
~/.local/bin/uv pip install --python .cache/logdb-venv/bin/python duckdb
# （有 ensurepip 的机器：python3 -m venv .cache/logdb-venv && .cache/logdb-venv/bin/pip install duckdb）

P=.cache/logdb-venv/bin/python
$P tools/logdb/sync.py                 # 增量同步（首次就是全量）
$P tools/logdb/query.py "SELECT ascension, count(*), count(*) FILTER (WHERE victory) FROM runs GROUP BY 1 ORDER BY 1"
$P tools/logdb/query.py --json "..."   # {"columns","types","rows","row_count","truncated","ms"}；出错 {"error"}
$P tools/logdb/query.py --schema       # 所有表和视图的字段
$P tools/logdb/query.py --raw states 3888720492   # 按字节偏移取一行原始 JSONL（state_index.off、decisions.off …）
```

- query.py 默认先做一次增量同步（`--no-sync` 关掉）；只接受**一条只读语句**（SELECT / WITH / FROM / DESCRIBE / SUMMARIZE / EXPLAIN），默认最多返回 200 行（`--max-rows`），30 秒超时（`--timeout`）。连接锁死：不能读写库目录以外的文件、不能装/加载扩展、不能改设置。
- 环境变量：`LOGDB_DIR`（库目录）、`LOGDB_LOGS`（日志目录）、`LOGDB_PYTHON`（TS 工具用的 Python）。
- **`logs_query` 工具**（src/tools/logs-query.ts，在 `buildTools` 里）：输入 `{sql, max_rows?}`（默认 50 行，最多 200），子进程跑 `query.py --json --no-sync`，30 秒超时，子进程环境里不带任何 key，返回文本表；description 里列了表和主要字段。工具不同步，靠对局后的同步或 query.py 保持新鲜。
- 测试：`.cache/logdb-venv/bin/python tests/logdb_test.py`（没有 duckdb 时只跑抽取器测试，其余跳过）；vitest 的 tests/logdb.test.ts 会调它，并测 `logs_query`（假脚本；有 venv 时再对样本库实跑）。样本在 tests/logdb-data/（`make-fixture.py` 生成）。
- 评估指标脚本 tools/eval/metrics.py 建在这个库上，见 docs/eval.md。

## 3. 表

时间都是 UTC（日志里的 `Z` 时间去掉时区）。`off` / `len` 是这一行在源文件里的字节偏移和长度。

### 存储的表（一行 JSONL 一行）

**frames** ← states.jsonl（每个决策背后的状态，加上 `observed` 帧）：`off, len, ts, observed_ts, observed, fingerprint, screen, session, run_id`（`run_unknown` 记为 NULL）`, in_combat, turn, character, ascension, act`（`act_id + 1`）`, floor, hp, max_hp, gold, boss_id, deck`（卡 id 列表，升级过的带 `+`）`, deck_size, relics, potions`（持有的药水 id）`, potion_slots`；战斗中：`player_hp, block, energy, cards_played`（本回合已出牌数）`, player_powers [{id, amount}], enemies [{idx, id, hp, max_hp, block, alive, move, intent_dmg, minion}]`（`intent_dmg` = 意图伤害 × max(1, 段数)，显示值，已含力量/虚弱/易伤）`, incoming`（活着的敌人 intent_dmg 之和）；地图屏：`map_row, map_col, map_node`（当前节点类型）`, map_avail [{idx, row, col, type}]`；`event_id`；结算屏：`go_victory, go_floor`。

**decisions** ← decisions.jsonl：`off, len, ts, observed_ts, mode, screen, session, run_id`（没有时取 fingerprint 里的 run）`, floor, turn, label, label_head`（label 第一段）`, decider`（jev / deepseek / code / code-fallback / claude；09-24 最早 365 行为 NULL）`, action, option_index, card_index, target_index, card_id`（出牌时按 fingerprint 的手牌解析）`, potion_id`（喝药/弃药时按药水槽解析）`, chosen`（JSON 文本）`, questions`（问题名）`, options`（第一个问题的选项 key）`, choice, probabilities`（JSON 文本）`, confidence, fallback, reasked, no_jev, reused_answer, hp, max_hp, gold`（来自 fingerprint）`, input_tokens, output_tokens, cache_hit_tokens, reasoning_tokens, latency_plan_ms, latency_jev_ms, latency_action_ms, latency_deepseek_ms`；rollout：`rollout_available, rollout_best, rollout_tied`（并列最优的方案列表）`, rollout_best_chosen, rollout_best_added, rollout_saturated, rollout_lines, rollout_horizon, rollout_samples, rollout_degraded`（降级项个数）`, rollout_ms`；升级 DeepSeek：`escalated, esc_jev_choice, esc_jev_confidence, esc_deepseek_choice`；`ds_choice, ds_effort, ds_latency_ms, ds_tokens`（DeepSeek 自己决定或升级时）`, jev_context, jev_hints, route_review`（outcome）`, rationale, result`。

**runs_raw** ← runs.jsonl（结束了的局）：`run_id, ended, victory, floor, character, ascension, code, decisions, jev_calls, deepseek_calls, claude_calls, tokens, ds_tokens_in, ds_tokens_out, ds_cache_hit, deciders`（JSON 文本）`, death_fight`（致死怪物中文名列表）`, arm`。

**llm_calls_raw** ← deepseek-reasoning.jsonl（`src = 'deepseek-reasoning'`，`engine = 'deepseek'`）和 brain.jsonl（`src = 'brain'`，V4 路由器 src/brain/router.ts 的 `BrainLogRow`，一行一个问题）：`src, off, len, ts, run_id`（brain 行 2026-09-30 M2 起带 run_id，和 decisions.jsonl 同值；更早的行不带，靠 llm_calls 按时间归局）`, label, label_head, engine, model, effort`（brain 行没有）`, guide`（brain：`system_sha`）`, input_tokens`（brain：`usage.inputTokens`，含缓存命中和缓存写入）`, cache_hit_tokens, output_tokens, reasoning_tokens, cost_usd, latency_ms, attempts`（brain：模型调用次数，含补问；报错为 0）`, tool_calls`（次数）`, fallback_from`（回退前失败的引擎名）`, options`（选项 key）`, choice, reason`（简短理由）`, question_chars, reasoning_chars, memory_chars`（brain：各段长度之和，和 v3 的 memoryChars 一样）`, answer_chars, parse_error`（brain：没有答案也没有引擎错误，即答案解析或校验失败）；只有 brain 行有的：`cache_write_tokens, system_chars, reasks, fallback_kind`（quota / rate_limit / timeout …）`, error_kind, error`（过 scrub，最多 500 字）。

**run_plans** ← run-plans.jsonl：`off, len, ts, run_id, floor, trigger, version, archetype, summary, want, avoid, input_tokens, output_tokens, cache_hit_tokens, reasoning_tokens, latency_ms, effort, error`。

### 视图（查询时现算）

**runs**：每个在日志里出现过的局。`run_id, ascension, character, started`（第一帧）`, ended`（runs.jsonl，否则最后一帧）`, floor`（runs.jsonl 的终层，否则最高层）`, max_floor, max_act, finished`（在 runs.jsonl 里）`, victory`（**胜负看它**：runs.jsonl 的 victory；没结束的局取结算帧，没有就是 NULL）`, death_fight, death_encounter`（死在的那场战斗的遭遇）`, death_room, code`（代码版本）`, decisions, jev_calls, deepseek_calls, claude_calls, tokens, ds_tokens_in, ds_tokens_out, ds_cache_hit, deciders, arm, frames`。

**floors**：每局每层一行。`run_id, floor, act, ascension, room_node`（Monster / Elite / Boss / Unknown / RestSite / Shop / Treasure / Ancient）`, node_src`（map：本层地图帧上的当前节点；choice：上一层选的节点，死在的房间和 boss 用它）`, entry_hp, entry_max_hp, entry_gold, entry_deck_size, entry_potions, entry_src`（进房 = 上一层最后一个地图帧，没有就取上一层最后一帧）`, exit_hp, exit_max_hp, exit_gold, exit_deck_size, exit_potions, exit_src`（出房 = 本层第一个地图帧：战斗、燃烧之血、事件、休息、喝药都已算进去；死在本层记 0 HP；都没有取本层最后一帧）`, hp_loss`（进房减出房，负数是回血）`, died, crossed_act, had_combat, event_id, first_ts, last_ts, first_off, frames`。

**fights**：每场战斗一行。一局的 COMBAT 帧按日志顺序切段：同一幕同一层连续的 COMBAT 帧是一场；出现不在战斗中的帧（奖励、地图、结算）就结束；战斗中别的屏幕（战斗里的选牌）既不结束也不算它的帧。`run_id, fight_no`（局内第几场）`, ascension, character, act, floor, encounter`（第一帧敌人 id 排序后用 + 连起来，和 monster-db 的遭遇 key 一样）`, monsters, room_node, room`（hallway / elite / boss / unknown_room）`, entry_hp`（第一帧）`, max_hp, last_hp`（最后一个战斗帧）`, post_hp`（战后第一帧，含战后回血）`, turns, outcome`（won / died：结算帧看 is_victory，否则战后血量 > 0；都没有但 runs.jsonl 说死在这层就是 died）`, hp_loss`（entry_hp − last_hp，死了是 entry_hp；和 monster-db 的 hp_loss_won 同口径）`, net_hp_loss`（entry_hp − post_hp）`, potions_in`（进场时带的药水）`, potions_used, potions_n, cards_played`（出牌次数）`, relics, deck_size, first_ts, last_ts, first_off, last_off, frames`。

**turns**：每场每回合一行，取这回合第一帧和最后一帧。`run_id, fight_no, ascension, act, floor, encounter, room, turn, start_hp, start_block, start_energy, intent_damage`（回合开始时活着的敌人显示的攻击总和）`, enemies_alive, enemy_hp, end_hp, end_block, hp_lost`（本回合开始到下回合开始的掉血，含自伤和敌人回合；最后一回合到战斗最后血量，死了是全部）`, enemy_turn_hp_lost`（本回合最后一帧到下回合开始）`, last_turn, cards_played`（出的牌 id，来自 decisions）`, cards_n, potions_used, potions_n, start_powers, first_ts, first_off, frames`。

**llm_calls**：llm_calls_raw 加上所属的局：自己带 run_id 就用它，否则取调用时间之前最近开始的那局（容差 3 秒：每局第一问 Neow 比第一帧早几毫秒记下），而且调用不晚于那局最后一帧 15 分钟；另加 `total_tokens` 和 `duplicate`：brain.jsonl 里引擎是 deepseek、而 deepseek-reasoning.jsonl 在它的时间窗（行时间减 latency 再前后各 2 秒）内有同 label 的行——路由器的 DeepSeek 引擎不带工具时跑的是 v3 的客户端，同一次调用两个文件都记（辅助视图 `llm_call_dups`）。**数调用和 token 时去掉 `duplicate`**（deepseek-reasoning 那行留着）。

**state_index**：`off, len, ts, observed, run_id, act, floor, turn, screen, fingerprint` → 点查原始状态（`query.py --raw states <off>`，或者自己 seek）。

辅助视图：`fight_frames`（frames 加 `is_combat, fight_start, fight_no`）、`fight_actions`（战斗中的出牌/喝药/结束回合决策，按 ts 对到帧）、`map_choices`（每层地图上选的节点）、`floor_rooms`、`run_deaths`、`run_spans`。

## 4. 口径和已知限制

- 帧只在决策点记（加少量 observed 帧），所以「回合开始血量」是这回合第一个记下的帧，「最后血量」是最后一个战斗帧；敌人死亡时的伤害（瀑布巨兽爆炸）会出现在 post_hp 里而不在 last_hp。
- `act` 取状态里的 `act_id + 1`（boss 打完后的地图帧已经是下一幕）；room-costs.json 按层号分幕（1–17 / 18–33 / 34+），和它对比时用层号。
- 房间类型和 monster-db.json 有 18 个遭遇差 1–2 场（hallway ↔ unknown_room，精英 1 场）：monster-db 用战后下一个地图帧的节点，没有就按怪物类型猜；这里用本层地图帧，没有就用上一层选的节点。死在问号房里的战斗 monster-db 记成走廊，本库记 unknown_room；战后没有本层地图帧时 monster-db 会拿到下一层的节点，本库不会。遭遇的场次、胜率、掉血都一样。
- deepseek-reasoning.jsonl 从 09-28 11:03 起才有 token（usage）；更早的调用 token 为 NULL（对应决策行的 ds_tokens 里有总数）。label 从 09-24 08:42 起才有。
- decisions 的 card_id / potion_id 靠 fingerprint 解析，fingerprint 里没有就是 NULL（turns.cards_played 里去掉，cards_n 照算）。
- brain.jsonl 按 src/brain/router.ts 实际写的 `BrainLogRow` 抽取（2026-09-29 核对，`VERSIONS["brain"]` = 2；样本 tests/logdb-data/brain.jsonl 按真实格式生成，对照过 v4-brain 冒烟实验的 20 行真实记录）。路由器不写 effort；run_id 从 2026-09-30（M2）起写（抽取器本来就读，不用改版本）；usage 是这个问题所有模型调用（含补问）的合计。离线回放、学习者如果也写 logs/brain.jsonl，会按时间归到附近的局，看 label 和时间区分。
- 改了抽取器（extract.py）要把对应源的 `VERSIONS` 加 1；改视图（views.sql）不用重建。

## 5. 正确性核对（2026-09-29，354 局）

- A8/A9 各幕走廊（Monster）掉血：n、死亡数、中位、p75、p90、均值和 room-costs.json（同一份日志现跑）**完全一致**（A9：一幕 n=266 中位 2；二幕 n=120 中位 9；三幕 n=11 中位 15）。
- monster-db.json 的 encounters：761 个「遭遇 × 进阶」的场次、有结果场次、胜率、死亡局数、赢局掉血/净掉血/回合中位数**全部一致**；战斗总数 4809、各进阶场次一致。房间类型的差异见 §4。
- runs.jsonl 354 局、胜 9 局（A9 55 局 0 胜）和 runs 视图的 finished / victory 一致；runs 视图另有 4 局只在 states 里（09-24 的 3 局中途断了没写 runs.jsonl，1 局正在打），1 局只在 runs.jsonl 里（states.jsonl 开始记录之前结束）。
- llm_calls 的局归属：五类决策问题的 3908 次调用，3907 次在同一局里找得到同 label 的决策（剩 1 次附近没有决策）。

## 6. 性能（2026-09-29 晚，对局同时在跑）

| 项目 | 数值 |
|---|---|
| JSONL 总量 | 4.31 GB（states 3.89 GB、decisions 214 MB、deepseek-reasoning 202 MB、其余 < 4 MB） |
| 库大小 | 11 MB（frames 5.6 MB、decisions 4.2 MB、llm_calls 0.7 MB） |
| 首次全量同步 | 30.4 秒（states 23.4 秒），峰值内存 0.56 GB |
| 增量同步：无新数据 | 0.04 秒 |
| 增量同步：一局新数据（48 层，states 26.6 MB） | 0.35 秒 |
| 视图全表计数 | fights 0.3 秒、turns 0.4 秒、runs 0.3 秒、floors 0.04 秒 |
| 对照：现有构建脚本扫一遍 | build-room-costs 4.2 秒、build-monster-db 25.9 秒 |

## 7. 例子

```sql
-- A9 打含熟睡甲虫的遭遇：进场血量和结果
SELECT run_id, floor, encounter, room, entry_hp, max_hp, outcome, hp_loss FROM fights
WHERE ascension = 9 AND list_contains(monsters, 'SLUMBERING_BEETLE') ORDER BY first_ts;

-- 每局二幕第一个休息点之前的战斗数和掉血
WITH first_rest AS (SELECT run_id, min(floor) AS rest_floor FROM floors WHERE act = 2 AND room_node = 'RestSite' GROUP BY run_id)
SELECT f.run_id, r.rest_floor, count(*) AS fights, sum(f.net_hp_loss) AS net_hp_loss
FROM fights f JOIN first_rest r USING (run_id) WHERE f.act = 2 AND f.floor < r.rest_floor GROUP BY ALL;

-- 按 label 统计 DeepSeek 调用的 token 和耗时
SELECT label, count(*) AS calls, sum(input_tokens) AS input, sum(cache_hit_tokens) AS cache_hit, sum(output_tokens) AS output,
       median(latency_ms) AS med_ms, quantile_cont(latency_ms, 0.9) AS p90_ms
FROM llm_calls WHERE engine = 'deepseek' GROUP BY label ORDER BY calls DESC;

-- 一个回合的原始状态
SELECT off FROM state_index WHERE run_id = '5LRZ7HJ7YGSY' AND floor = 48 AND screen = 'COMBAT' ORDER BY off LIMIT 1;
-- 然后：query.py --raw states <off>
```

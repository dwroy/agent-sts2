-- Log database views (docs/logdb.md). ${DB} stands for the database directory (.cache/logdb); query.py
-- substitutes it. Stored tables are Parquet shards written by tools/logdb/sync.py, one row per JSONL line;
-- fights, turns, floors and runs are derived here from them on every query, so they are never stale.

-- ---------------------------------------------------------------- stored tables

-- One row per logs/states.jsonl line (the state behind each decision, plus observed frames).
CREATE OR REPLACE VIEW frames AS SELECT * FROM read_parquet('${DB}/frames/*.parquet', union_by_name = true);
-- One row per logs/decisions.jsonl line.
CREATE OR REPLACE VIEW decisions AS SELECT * FROM read_parquet('${DB}/decisions/*.parquet', union_by_name = true);
-- One row per logs/runs.jsonl line (finished runs).
CREATE OR REPLACE VIEW runs_raw AS SELECT * FROM read_parquet('${DB}/runs_raw/*.parquet', union_by_name = true);
-- One row per model call: logs/deepseek-reasoning.jsonl (src 'deepseek-reasoning') and logs/brain.jsonl (src 'brain').
CREATE OR REPLACE VIEW llm_calls_raw AS SELECT * FROM read_parquet('${DB}/llm_calls_raw/*.parquet', union_by_name = true);
-- One row per logs/run-plans.jsonl line.
CREATE OR REPLACE VIEW run_plans AS SELECT * FROM read_parquet('${DB}/run_plans/*.parquet', union_by_name = true);
-- One row per logs/run-config.jsonl line: the configuration a run was played with (src/telemetry/run-config.ts; a
-- second row for a run only when a restarted process ran it with another configuration).
CREATE OR REPLACE VIEW run_config AS SELECT * FROM read_parquet('${DB}/run_config/*.parquet', union_by_name = true);

-- Where each raw state is in logs/states.jsonl (query.py --raw states <off>).
CREATE OR REPLACE VIEW state_index AS
SELECT off, len, ts, observed, run_id, act, floor, turn, screen, fingerprint FROM frames;

-- ---------------------------------------------------------------- rooms

-- The map node chosen on each floor's map screen, i.e. the room of floor + 1 (the last choice on the floor).
CREATE OR REPLACE VIEW map_choices AS
WITH chosen AS (
  SELECT d.run_id, d.floor, d.off AS d_off, list_filter(f.map_avail, n -> n.idx = d.option_index)[1] AS node
  FROM decisions d
  JOIN frames f ON f.ts = d.ts AND f.run_id = d.run_id AND f.screen = 'MAP'
  WHERE d.action = 'choose_map_node' AND d.run_id IS NOT NULL
)
SELECT run_id, floor, arg_max(node, d_off) AS node
FROM chosen WHERE node IS NOT NULL
GROUP BY run_id, floor;

-- The room type of each floor: the current node on the floor's map screens (shown after the room, same act),
-- else the node chosen on the floor before (the room a run died in, a boss). Types: Monster, Elite, Boss,
-- Unknown (question mark), RestSite, Shop, Treasure, Ancient.
CREATE OR REPLACE VIEW floor_rooms AS
WITH first_act AS (
  SELECT run_id, floor, arg_min(act, off) AS act FROM frames WHERE run_id IS NOT NULL AND floor IS NOT NULL GROUP BY run_id, floor
),
visited AS (
  SELECT f.run_id, f.floor, arg_max(f.map_node, f.off) AS node
  FROM frames f JOIN first_act a ON a.run_id = f.run_id AND a.floor = f.floor AND a.act = f.act
  WHERE f.screen = 'MAP' AND f.map_node IS NOT NULL
  GROUP BY f.run_id, f.floor
)
SELECT coalesce(v.run_id, c.run_id) AS run_id, coalesce(v.floor, c.floor + 1) AS floor,
       coalesce(v.node, c.node.type) AS node,
       CASE WHEN v.node IS NOT NULL THEN 'map' ELSE 'choice' END AS node_src
FROM visited v
FULL JOIN map_choices c ON c.run_id = v.run_id AND c.floor + 1 = v.floor;

-- ---------------------------------------------------------------- fights

-- Combat frames cut into fights, per run in log order: a fight is a stretch of COMBAT frames on one act and
-- floor; a frame that is not in combat (reward, map, game over) ends it. In-combat frames of other screens
-- (a card selection inside a fight) neither end it nor count as its frames. fight_no numbers the fights
-- of a run (1, 2, ...); the frames after a fight up to the next one carry its number with is_combat = false.
CREATE OR REPLACE VIEW fight_frames AS
WITH g AS (
  SELECT *, (screen = 'COMBAT' AND enemies IS NOT NULL AND floor IS NOT NULL) AS is_combat
  FROM frames
  WHERE run_id IS NOT NULL
),
h AS (
  SELECT * FROM g WHERE is_combat OR screen = 'GAME_OVER' OR NOT coalesce(in_combat, false)
),
s AS (
  SELECT *,
    CASE WHEN is_combat AND (lag(is_combat) OVER w IS DISTINCT FROM true OR lag(floor) OVER w IS DISTINCT FROM floor
                             OR lag(act) OVER w IS DISTINCT FROM act) THEN 1 ELSE 0 END AS fight_start
  FROM h WINDOW w AS (PARTITION BY run_id ORDER BY off)
)
SELECT *, CAST(sum(fight_start) OVER (PARTITION BY run_id ORDER BY off ROWS UNBOUNDED PRECEDING) AS INTEGER) AS fight_no
FROM s;

-- The actions taken during each fight's turns (play_card / use_potion decisions, on the frame they were made on).
CREATE OR REPLACE VIEW fight_actions AS
WITH keyed AS (
  SELECT DISTINCT run_id, ts, fight_no, turn FROM fight_frames WHERE is_combat AND fight_no > 0
)
SELECT k.run_id, k.fight_no, k.turn, d.off, d.ts, d.action, d.card_id, d.potion_id, d.decider, d.label
FROM decisions d
JOIN keyed k ON k.run_id = d.run_id AND k.ts = d.ts
WHERE d.action IN ('play_card', 'use_potion', 'end_turn');

CREATE OR REPLACE VIEW fights AS
WITH ff AS (SELECT * FROM fight_frames WHERE fight_no > 0),
c AS (
  SELECT run_id, fight_no,
    arg_min(act, off) AS act, arg_min(floor, off) AS floor, arg_min(ascension, off) AS ascension, arg_min(character, off) AS character,
    min(off) AS first_off, max(off) AS last_off, min(ts) AS first_ts, max(ts) AS last_ts, count(*) AS frames,
    arg_min({'hp': coalesce(player_hp, hp), 'max_hp': max_hp, 'potions': potions, 'relics': relics, 'deck_size': deck_size}, off) AS entry,
    arg_max(coalesce(player_hp, hp), off) AS last_hp,
    max(turn) AS turns,
    arg_min(enemies, off) FILTER (WHERE len(enemies) > 0) AS first_enemies
  FROM ff WHERE is_combat
  GROUP BY run_id, fight_no
),
closer AS (
  SELECT run_id, fight_no, arg_min({'screen': screen, 'hp': hp, 'victory': go_victory}, off) AS close
  FROM ff WHERE NOT is_combat
  GROUP BY run_id, fight_no
),
drunk AS (
  SELECT run_id, fight_no,
    list(potion_id ORDER BY off) FILTER (WHERE action = 'use_potion') AS potions_used,
    count(*) FILTER (WHERE action = 'use_potion') AS potions_n,
    count(*) FILTER (WHERE action = 'play_card') AS cards
  FROM fight_actions
  GROUP BY run_id, fight_no
),
base AS (
  SELECT c.*, closer.close,
    CASE
      WHEN closer.close.screen = 'GAME_OVER' THEN CASE WHEN closer.close.victory THEN 'won' ELSE 'died' END
      WHEN closer.close.hp IS NOT NULL THEN CASE WHEN closer.close.hp <= 0 THEN 'died' ELSE 'won' END
      WHEN r.run_id IS NOT NULL AND r.floor = c.floor AND NOT r.victory AND len(r.death_fight) > 0 THEN 'died'
    END AS outcome
  FROM c
  LEFT JOIN closer USING (run_id, fight_no)
  LEFT JOIN runs_raw r ON r.run_id = c.run_id
)
SELECT
  b.run_id, b.fight_no, b.ascension, b.character, b.act, b.floor,
  array_to_string(list_sort([e.id FOR e IN b.first_enemies]), '+') AS encounter,
  [e.id FOR e IN b.first_enemies] AS monsters,
  fr.node AS room_node,
  CASE fr.node WHEN 'Monster' THEN 'hallway' WHEN 'Elite' THEN 'elite' WHEN 'Boss' THEN 'boss'
               WHEN 'Unknown' THEN 'unknown_room' WHEN 'Event' THEN 'unknown_room' END AS room,
  b.entry.hp AS entry_hp, b.entry.max_hp AS max_hp, b.last_hp,
  b.close.hp AS post_hp,
  b.turns, b.outcome,
  b.entry.hp - CASE WHEN b.outcome = 'died' THEN 0 ELSE b.last_hp END AS hp_loss,
  CASE WHEN b.close.hp IS NOT NULL THEN b.entry.hp - b.close.hp WHEN b.outcome = 'died' THEN b.entry.hp END AS net_hp_loss,
  b.entry.potions AS potions_in,
  coalesce(list_filter(d.potions_used, p -> p IS NOT NULL), []) AS potions_used,
  coalesce(d.potions_n, 0) AS potions_n,
  coalesce(d.cards, 0) AS cards_played,
  b.entry.relics AS relics, b.entry.deck_size AS deck_size,
  b.first_ts, b.last_ts, b.first_off, b.last_off, b.frames
FROM base b
LEFT JOIN floor_rooms fr ON fr.run_id = b.run_id AND fr.floor = b.floor
LEFT JOIN drunk d ON d.run_id = b.run_id AND d.fight_no = b.fight_no
WHERE b.first_enemies IS NOT NULL;

-- ---------------------------------------------------------------- turns

-- One row per turn of a fight, from the first and last combat frame logged in it. hp_lost = HP at this
-- turn's first frame minus HP at the next turn's first frame (our own HP costs and the enemies' turn); on
-- the last turn minus the fight's last HP (0 when the run died). intent_damage = the alive enemies' shown
-- attack at the turn's first frame (damage x hits, after Strength/Weak/Vulnerable as displayed).
CREATE OR REPLACE VIEW turns AS
WITH t AS (
  SELECT run_id, fight_no, turn,
    arg_min(act, off) AS act, arg_min(floor, off) AS floor, arg_min(ascension, off) AS ascension,
    min(off) AS first_off, min(ts) AS first_ts, count(*) AS frames,
    arg_min({'hp': coalesce(player_hp, hp), 'block': block, 'energy': energy, 'incoming': incoming, 'enemies': enemies,
             'powers': player_powers}, off) AS s,
    arg_max({'hp': coalesce(player_hp, hp), 'block': block, 'enemies': enemies}, off) AS e
  FROM fight_frames
  WHERE is_combat AND fight_no > 0 AND turn IS NOT NULL
  GROUP BY run_id, fight_no, turn
),
n AS (
  SELECT t.*, lead(t.s.hp) OVER (PARTITION BY run_id, fight_no ORDER BY turn) AS next_hp FROM t
),
acts AS (
  SELECT run_id, fight_no, turn,
    list(card_id ORDER BY off) FILTER (WHERE action = 'play_card') AS cards,
    count(*) FILTER (WHERE action = 'play_card') AS cards_n,
    list(potion_id ORDER BY off) FILTER (WHERE action = 'use_potion') AS potions,
    count(*) FILTER (WHERE action = 'use_potion') AS potions_n
  FROM fight_actions GROUP BY run_id, fight_no, turn
)
SELECT
  n.run_id, n.fight_no, n.ascension, n.act, n.floor, f.encounter, f.room, n.turn,
  n.s.hp AS start_hp, n.s.block AS start_block, n.s.energy AS start_energy,
  n.s.incoming AS intent_damage,
  CAST(len(list_filter(n.s.enemies, x -> x.alive)) AS INTEGER) AS enemies_alive,
  CAST(list_sum([x.hp FOR x IN n.s.enemies IF x.alive]) AS INTEGER) AS enemy_hp,
  n.e.hp AS end_hp, n.e.block AS end_block,
  CASE WHEN n.next_hp IS NOT NULL THEN n.s.hp - n.next_hp
       WHEN f.outcome = 'died' THEN n.s.hp
       ELSE n.s.hp - f.last_hp END AS hp_lost,
  CASE WHEN n.next_hp IS NOT NULL THEN n.e.hp - n.next_hp END AS enemy_turn_hp_lost,
  n.next_hp IS NULL AS last_turn,
  coalesce(list_filter(a.cards, c -> c IS NOT NULL), []) AS cards_played,
  coalesce(a.cards_n, 0) AS cards_n,
  coalesce(list_filter(a.potions, p -> p IS NOT NULL), []) AS potions_used,
  coalesce(a.potions_n, 0) AS potions_n,
  n.s.powers AS start_powers,
  n.first_ts, n.first_off, n.frames
FROM n
JOIN fights f ON f.run_id = n.run_id AND f.fight_no = n.fight_no
LEFT JOIN acts a ON a.run_id = n.run_id AND a.fight_no = n.fight_no AND a.turn = n.turn;

-- ---------------------------------------------------------------- floors

-- The floor a run died on (its GAME_OVER frame, else runs.jsonl).
CREATE OR REPLACE VIEW run_deaths AS
SELECT coalesce(g.run_id, r.run_id) AS run_id, coalesce(g.floor, r.floor) AS floor
FROM (SELECT run_id, arg_max(go_floor, off) AS floor FROM frames WHERE screen = 'GAME_OVER' AND go_victory = false AND run_id IS NOT NULL GROUP BY run_id) g
FULL JOIN (SELECT run_id, floor FROM runs_raw WHERE victory = false) r ON r.run_id = g.run_id;

-- One row per floor of a run. entry = the room's entry state: the last map frame of the floor before (the
-- map screen the room was chosen on), else that floor's last frame; exit = the first map frame of this
-- floor (after the room: fight, heal relics, event, rest, potions drunk in it), else 0 HP when the run
-- died here, else the floor's last frame. hp_loss = entry_hp - exit_hp (negative = healed).
CREATE OR REPLACE VIEW floors AS
WITH per AS (
  SELECT run_id, floor,
    arg_min(act, off) AS act, arg_min(ascension, off) AS ascension,
    min(off) AS first_off, min(ts) AS first_ts, max(ts) AS last_ts, count(*) AS frames,
    arg_max({'hp': hp, 'max_hp': max_hp, 'gold': gold, 'deck_size': deck_size, 'potions': len(potions), 'act': act}, off) AS last_frame,
    arg_min({'hp': hp, 'max_hp': max_hp, 'gold': gold, 'deck_size': deck_size, 'potions': len(potions), 'act': act}, off) FILTER (WHERE screen = 'MAP') AS first_map,
    arg_max({'hp': hp, 'max_hp': max_hp, 'gold': gold, 'deck_size': deck_size, 'potions': len(potions), 'act': act}, off) FILTER (WHERE screen = 'MAP') AS last_map,
    count(*) FILTER (WHERE screen = 'COMBAT') AS combat_frames,
    arg_max(event_id, off) AS event_id
  FROM frames
  WHERE run_id IS NOT NULL AND floor IS NOT NULL AND hp IS NOT NULL
  GROUP BY run_id, floor
),
chain AS (
  SELECT per.*,
    lag(floor) OVER w AS prev_floor, lag(last_map) OVER w AS prev_last_map, lag(last_frame) OVER w AS prev_last_frame
  FROM per WINDOW w AS (PARTITION BY run_id ORDER BY floor)
),
shaped AS (
  SELECT c.*,
    CASE WHEN c.prev_floor = c.floor - 1 THEN coalesce(c.prev_last_map, c.prev_last_frame) END AS entry,
    CASE WHEN c.prev_floor = c.floor - 1 AND c.prev_last_map IS NOT NULL THEN 'map'
         WHEN c.prev_floor = c.floor - 1 THEN 'frame' END AS entry_src,
    d.floor IS NOT NULL AS died,
    CASE WHEN c.first_map IS NOT NULL THEN 'map' WHEN d.floor IS NOT NULL THEN 'death' ELSE 'frame' END AS exit_src
  FROM chain c
  LEFT JOIN run_deaths d ON d.run_id = c.run_id AND d.floor = c.floor
)
SELECT
  s.run_id, s.floor, s.act, s.ascension, r.node AS room_node, r.node_src,
  s.entry.hp AS entry_hp, s.entry.max_hp AS entry_max_hp, s.entry.gold AS entry_gold,
  s.entry.deck_size AS entry_deck_size, s.entry.potions AS entry_potions, s.entry_src,
  CASE s.exit_src WHEN 'map' THEN s.first_map.hp WHEN 'death' THEN 0 ELSE s.last_frame.hp END AS exit_hp,
  CASE WHEN s.exit_src = 'map' THEN s.first_map.max_hp ELSE s.last_frame.max_hp END AS exit_max_hp,
  CASE WHEN s.exit_src = 'map' THEN s.first_map.gold ELSE s.last_frame.gold END AS exit_gold,
  CASE WHEN s.exit_src = 'map' THEN s.first_map.deck_size ELSE s.last_frame.deck_size END AS exit_deck_size,
  CASE WHEN s.exit_src = 'map' THEN s.first_map.potions ELSE s.last_frame.potions END AS exit_potions,
  s.exit_src,
  s.entry.hp - CASE s.exit_src WHEN 'map' THEN s.first_map.hp WHEN 'death' THEN 0 ELSE s.last_frame.hp END AS hp_loss,
  s.died,
  CASE WHEN s.entry IS NOT NULL THEN s.entry.act IS DISTINCT FROM s.act END AS crossed_act,
  s.combat_frames > 0 AS had_combat, s.event_id,
  s.first_ts, s.last_ts, s.first_off, s.frames
FROM shaped s
LEFT JOIN floor_rooms r ON r.run_id = s.run_id AND r.floor = s.floor;

-- ---------------------------------------------------------------- runs

-- Every run seen in the logs: runs.jsonl for finished runs (victory, final floor, code version, death
-- fight names), the frames for the rest (start time, highest floor; runs still going or cut off have
-- finished = false and victory NULL). death_encounter = the encounter of the fight the run died in.
-- The configuration columns come from the run's first run-config.jsonl row (the setup it started with; NULL for
-- runs from before that log): cfg_code / cfg_branch / cfg_worktree (the process's checkout), brain_engine,
-- brain_by_prefix, brain_fallback, brain_label, knowledge_prefix, prefix_sha, prefix_tokens_deepseek, jev_model,
-- jev_context, target_ascension, config_sha; config_rows = its rows (0: not recorded), config_changed = a restart
-- ran it with another configuration.
CREATE OR REPLACE VIEW runs AS
WITH cfg AS (
  SELECT * FROM run_config WHERE run_id IS NOT NULL QUALIFY row_number() OVER (PARTITION BY run_id ORDER BY off) = 1
),
cfg_n AS (
  SELECT run_id, count(*) AS config_rows, count(DISTINCT config_sha) > 1 AS config_changed
  FROM run_config WHERE run_id IS NOT NULL GROUP BY run_id
),
fr AS (
  SELECT run_id, min(ts) AS started, max(ts) AS last_seen, max(floor) AS max_floor, max(act) AS max_act,
    arg_max(character, off) AS character, arg_max(ascension, off) AS ascension, count(*) AS frames,
    arg_max(go_victory, off) AS go_victory
  FROM frames WHERE run_id IS NOT NULL
  GROUP BY run_id
),
death AS (
  SELECT run_id, arg_max(encounter, first_off) AS death_encounter, arg_max(room, first_off) AS death_room
  FROM fights WHERE outcome = 'died'
  GROUP BY run_id
)
SELECT
  coalesce(r.run_id, fr.run_id) AS run_id,
  coalesce(r.ascension, fr.ascension) AS ascension,
  coalesce(r.character, fr.character) AS character,
  fr.started, coalesce(r.ended, fr.last_seen) AS ended,
  coalesce(r.floor, fr.max_floor) AS floor, fr.max_floor, fr.max_act,
  r.run_id IS NOT NULL AS finished,
  coalesce(r.victory, fr.go_victory) AS victory,
  r.death_fight, d.death_encounter, d.death_room,
  r.code, r.decisions, r.jev_calls, r.deepseek_calls, r.claude_calls, r.tokens,
  r.ds_tokens_in, r.ds_tokens_out, r.ds_cache_hit, r.deciders, r.arm, fr.frames,
  c.code AS cfg_code, c.branch AS cfg_branch, c.worktree AS cfg_worktree, c.brain_engine, c.brain_by_prefix, c.brain_fallback,
  c.brain_label, c.knowledge_prefix, c.prefix_sha, c.prefix_tokens_deepseek, c.jev_model, c.jev_context, c.target_ascension,
  c.config_sha, coalesce(n.config_rows, 0) AS config_rows, coalesce(n.config_changed, false) AS config_changed
FROM runs_raw r
FULL JOIN fr ON fr.run_id = r.run_id
LEFT JOIN death d ON d.run_id = coalesce(r.run_id, fr.run_id)
LEFT JOIN cfg c ON c.run_id = coalesce(r.run_id, fr.run_id)
LEFT JOIN cfg_n n ON n.run_id = coalesce(r.run_id, fr.run_id);

-- ---------------------------------------------------------------- model calls

CREATE OR REPLACE VIEW run_spans AS
SELECT run_id, min(ts) AS started, max(ts) AS last_seen FROM frames WHERE run_id IS NOT NULL GROUP BY run_id;

-- brain.jsonl rows that repeat a deepseek-reasoning.jsonl call: the router's DeepSeek engine without tools runs
-- v3's client, which logs the call there as well (same label, a few ms before the router's row; with a re-ask,
-- both calls fall inside the row's latency). The deepseek-reasoning rows are the ones counted.
CREATE OR REPLACE VIEW llm_call_dups AS
SELECT DISTINCT b.off
FROM llm_calls_raw b
JOIN llm_calls_raw d ON d.src = 'deepseek-reasoning' AND d.label = b.label
  AND d.ts BETWEEN b.ts - to_milliseconds(coalesce(b.latency_ms, 0)) - INTERVAL 2 SECOND AND b.ts + INTERVAL 2 SECOND
WHERE b.src = 'brain' AND b.engine = 'deepseek';

-- Model calls with the run they were made in: the call's own run_id, else the run whose frames surround
-- its time (the latest run started before it, if the call is within 15 minutes of that run's last frame).
-- A run's first question (the Neow event) is logged a few ms before the run's first frame, hence the 3 s.
-- duplicate: a brain.jsonl row for a call deepseek-reasoning.jsonl also logged (llm_call_dups); leave it out
-- when counting calls or tokens.
CREATE OR REPLACE VIEW llm_calls AS
SELECT c.* EXCLUDE (run_id),
  coalesce(c.run_id, CASE WHEN c.ts <= s.last_seen + INTERVAL 15 MINUTE THEN s.run_id END) AS run_id,
  coalesce(c.input_tokens, 0) + coalesce(c.output_tokens, 0) AS total_tokens,
  (c.src = 'brain' AND c.off IN (SELECT off FROM llm_call_dups)) AS duplicate
FROM llm_calls_raw c
ASOF LEFT JOIN run_spans s ON c.ts + INTERVAL 3 SECOND >= s.started;

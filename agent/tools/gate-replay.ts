/**
 * V4 M3 acceptance for the execution gate's identity check (src/act/identity.ts): logged actions replayed through
 * the current gate. Only reports; nothing is changed.
 *
 * 1. stale: the drinks of a Jev line cut short (combat/plan-potion, "drinking X from the Jev-chosen line before
 *    re-planning"; C batch ef5eb16 removed that code path). Each drink is checked as a step of its line: the potion
 *    and target the line chose, the line's turn, and the board the line expected before the drink: the line-start
 *    hand less the cards the chosen option's "plays" puts before the drink, and the line-start living enemies.
 * 2. shifted: line steps whose target index held another enemy than when their line was chosen (NEVM F23 T2), found
 *    with the frames table, each checked as a step of its line (the target and the living enemies the line chose).
 * 3. lines: logged line steps (combat/plan-continue) replayed through the current planner from the decision that
 *    started the line (the logged option, found again by its "plays"): each step as the new code stamps it, gated on
 *    its logged board. Its false refusals are the gate's false refusals on line steps.
 * 4. single: other dispatched actions, stamped on their logged board and gated on it, and on another logged read with
 *    the same fingerprint when there is one (the fingerprint leaves out the floor and most screen contents, so such a
 *    read can be another board; those are classified by hand from the printed reasons).
 *
 * Rows come from the log database (data/logdb via tools/logdb/query.py: read-only, no sync); decision rows and
 * states are read by byte offset (states.jsonl is never read whole).
 *
 * Usage: nice npx tsx tools/gate-replay.ts [--out experiments/gate-replay] [--lines 100] [--single 100]
 *        [--since 2026-09-29T09:40:00] [--until 2026-09-29T15:50:00] [--rollout]
 * --since/--until (UTC) bound the samples of 3 and 4 (the logs keep growing: a bound keeps a sample the same).
 * Without --rollout the live rollout facts are off (faster; the lines offered are the same, only their facts differ).
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { gate } from "../src/act/gate.js";
import { handSignatureOf, livingEnemiesOf, wireIntent, withExpect, type ActionExpect } from "../src/act/identity.js";
import { loadConfig } from "../src/config.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { noteScreenChange } from "../src/loop.js";
import type { ActionRequest } from "../src/mod/client.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv, type ScreenMemory } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { asArray, asRecord, bool, num, numOrNull, str } from "../src/util/json.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const outDir = arg("out", fromRoot("experiments/gate-replay"));
const lineSample = Number(arg("lines", "100"));
const singleSample = Number(arg("single", "100"));
const since = arg("since", "2026-09-29T09:40:00");
const until = arg("until", "2100-01-01T00:00:00");
rolloutLiveOptions.enabled = process.argv.includes("--rollout");

type Raw = Record<string, unknown>;
const config = loadConfig({} as NodeJS.ProcessEnv);
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");

/* ---- logs ------------------------------------------------------------------------------------------------ */

/** One read-only query over the log database (no sync: the running game's own sync keeps it fresh). */
function query(sql: string, maxRows = 20_000): Raw[] {
  const out = execFileSync(fromRoot("data/logdb-venv/bin/python"), [fromRoot("agent/tools/logdb/query.py"), "--json", "--no-sync", "--max-rows", String(maxRows), "--timeout", "300", sql], { encoding: "utf8", maxBuffer: 512 << 20 });
  const json = JSON.parse(out) as { columns?: string[]; rows?: unknown[][]; error?: string; truncated?: boolean };
  if (json.error) throw new Error(`${json.error}\n${sql}`);
  if (json.truncated) throw new Error(`query truncated at ${maxRows} rows`);
  return (json.rows ?? []).map((row) => Object.fromEntries((json.columns ?? []).map((column, i) => [column, row[i]])));
}

const files = { states: openSync(fromRoot("logs/states.jsonl"), "r"), decisions: openSync(fromRoot("logs/decisions.jsonl"), "r") };
function lineAt(fd: number, off: unknown, len: unknown): Raw {
  const buffer = Buffer.alloc(Number(len));
  readSync(fd, buffer, 0, Number(len), Number(off));
  return JSON.parse(buffer.toString("utf8")) as Raw;
}
const stateAt = (off: unknown, len: unknown): GameState => parseGameState(asRecord(lineAt(files.states, off, len)["state"]));
const decisionAt = (off: unknown, len: unknown): Raw => lineAt(files.decisions, off, len);

/** The state of each decision row: state_index rows are written with the decision's ts (non-observed). */
const STATES = "(SELECT run_id, ts, min(off) AS off, arg_min(len, off) AS len FROM state_index WHERE observed IS NULL GROUP BY 1, 2)";

function env(state: GameState, screenMemory: ScreenMemory): DecisionEnv {
  return {
    state,
    knowledge,
    brief: buildRunBrief(state, knowledge),
    screenMemory,
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    shopDiscardPotions: [],
    jevContext: config.jevContext,
  };
}

/** The option a logged combat question played: an escalator's (or its guard's) pick, else Jev's. */
function playedKey(row: Raw): string | null {
  const escalation = asRecord(row["escalation"]);
  const key = str(escalation["used_choice"]) || str(escalation["choice"]) || str(asRecord(asRecord(row["answers"])["plan"])["choice"]);
  return key || null;
}

/** The "plays" of an option of a logged combat question. */
function playsOf(row: Raw, key: string): string | null {
  const text = asRecord(asRecord(asRecord(row["questions"])["plan"])["criteria"])[key];
  if (typeof text !== "string") return null;
  try {
    return str(asRecord(JSON.parse(text))["plays"]) || null;
  } catch {
    return null;
  }
}

/** Living enemies "index -> enemy_id" of a board. */
function enemyIds(state: GameState): Map<number, string> {
  return new Map(
    asArray(asRecord(state.raw["combat"])["enemies"])
      .map(asRecord)
      .filter((enemy) => enemy["is_alive"] !== false)
      .map((enemy) => [num(enemy["index"]), str(enemy["enemy_id"])] as [number, string]),
  );
}

function potionAt(state: GameState, slot: number | undefined): string | null {
  const entry = asArray(asRecord(state.raw["run"])["potions"]).map(asRecord).find((potion) => numOrNull(potion["index"]) === slot);
  return entry && bool(entry["occupied"]) ? str(entry["potion_id"]) || null : null;
}

interface Result {
  set: string;
  run: string;
  floor: unknown;
  turn: unknown;
  ts: unknown;
  label: string;
  chosen: unknown;
  ok: boolean | null;
  kind?: string;
  reason: string;
  expected?: ActionExpect;
  note?: string;
}
const results: Result[] = [];
const push = (result: Result): void => {
  results.push(result);
};

/* ---- 1. stale drinks of a cut-short line ------------------------------------------------------------------ */

function staleDrinks(): void {
  const rows = query(`
    WITH drinks AS (
      SELECT off, len, run_id, floor, turn, ts FROM decisions
      WHERE label = 'combat/plan-potion' AND rationale LIKE 'drinking % from the Jev-chosen line before re-planning%'),
    starts AS (
      SELECT d.off AS d_off, max(c.ts) AS start_ts FROM drinks d
      JOIN decisions c ON c.run_id = d.run_id AND c.floor = d.floor AND c.turn = d.turn AND c.ts < d.ts
        AND c.label LIKE 'combat/plan-choice%' AND c.result LIKE 'completed%'
      GROUP BY d.off)
    SELECT d.off AS d_off, d.len AS d_len, d.run_id, d.floor, d.turn, d.ts,
      c.off AS c_off, c.len AS c_len, sd.off AS sd_off, sd.len AS sd_len, sc.off AS sc_off, sc.len AS sc_len
    FROM drinks d
    LEFT JOIN starts st ON st.d_off = d.off
    LEFT JOIN decisions c ON c.run_id = d.run_id AND c.ts = st.start_ts AND c.label LIKE 'combat/plan-choice%'
    LEFT JOIN ${STATES} sd ON sd.run_id = d.run_id AND sd.ts = d.ts
    LEFT JOIN ${STATES} sc ON sc.run_id = c.run_id AND sc.ts = c.ts
    ORDER BY d.ts`);
  for (const row of rows) {
    const base = { set: "stale", run: str(row["run_id"]), floor: row["floor"], turn: row["turn"], ts: row["ts"], label: "combat/plan-potion" };
    if (row["c_off"] === null || row["sd_off"] === null || row["sc_off"] === null) {
      push({ ...base, chosen: null, ok: null, reason: "skipped: line start or a state not found" });
      continue;
    }
    const drink = decisionAt(row["d_off"], row["d_len"]);
    const start = decisionAt(row["c_off"], row["c_len"]);
    const s0 = stateAt(row["sc_off"], row["sc_len"]);
    const sd = stateAt(row["sd_off"], row["sd_len"]);
    const chosen = asRecord(drink["chosen"]) as unknown as ActionRequest;
    const key = playedKey(start);
    const plays = key ? playsOf(start, key) : null;
    const name = /^drinking (.+?) from the Jev-chosen line/.exec(str(drink["rationale"]))?.[1];
    const items = (plays ?? "").split(", then ");
    const at = name ? items.indexOf(`potion ${name}`) : -1;
    if (!plays || at < 0) {
      push({ ...base, chosen, ok: null, reason: `skipped: the drink "${name ?? "?"}" is not in the line's plays (${plays ?? "no plays"})` });
      continue;
    }
    // The hand the line expected before the drink: the line-start hand less the cards it plays before it.
    let hand = asArray(asRecord(s0.raw["combat"])["hand"]).map(asRecord);
    let unmatched: string | null = null;
    for (const item of items.slice(0, at)) {
      if (item.startsWith("potion ")) continue;
      const card = item.split(" -> ")[0]!;
      const found = hand.findIndex((entry) => str(entry["name"]) === card);
      if (found < 0) {
        unmatched = card;
        break;
      }
      hand = hand.filter((_, i) => i !== found);
    }
    if (unmatched) {
      push({ ...base, chosen, ok: null, reason: `skipped: the line's card ${unmatched} is not in the line-start hand` });
      continue;
    }
    const expectedHand = hand.map((card) => `${str(card["card_id"])}${bool(card["upgraded"]) ? "+" : ""}`).sort().join(",");
    const potion = potionAt(s0, chosen.option_index);
    const target = chosen.target_index === undefined || chosen.target_index === null ? undefined : enemyIds(s0).get(chosen.target_index);
    const expect: ActionExpect = {
      from: "line",
      ...(potion ? { potion: { id: potion } } : {}),
      ...(target ? { target: { id: target } } : {}),
      ...(s0.turn !== null ? { turn: s0.turn } : {}),
      hand: expectedHand,
      enemies: livingEnemiesOf(s0.raw),
    };
    const result = gate(sd, { ...chosen, expect });
    push({ ...base, chosen, ok: result.ok, reason: result.reason, expected: expect, ...(result.kind ? { kind: result.kind } : {}), note: `line: ${plays}; actual hand ${handSignatureOf(sd.raw)}; enemies ${livingEnemiesOf(sd.raw)}` });
  }
}

/* ---- 2. line steps aimed at an index that holds another enemy now -------------------------------------------- */

function shiftedTargets(): void {
  const rows = query(`
    WITH steps AS (
      SELECT off, len, run_id, floor, turn, ts, target_index FROM decisions
      WHERE label = 'combat/plan-continue' AND target_index IS NOT NULL AND result LIKE 'completed%'),
    starts AS (
      SELECT s.off AS s_off, max(c.ts) AS start_ts FROM steps s
      JOIN decisions c ON c.run_id = s.run_id AND c.floor = s.floor AND c.turn = s.turn AND c.ts < s.ts
        AND c.label LIKE 'combat/%' AND c.label <> 'combat/plan-continue' AND c.result LIKE 'completed%'
      GROUP BY s.off),
    frames1 AS (SELECT run_id, ts, any_value(enemies) AS enemies FROM frames WHERE observed IS NULL GROUP BY 1, 2)
    SELECT s.off AS s_off, s.len AS s_len, s.run_id, s.floor, s.turn, s.ts, s.target_index,
      sc.off AS sc_off, sc.len AS sc_len, ss.off AS ss_off, ss.len AS ss_len
    FROM steps s JOIN starts st ON st.s_off = s.off
    JOIN frames1 f0 ON f0.run_id = s.run_id AND f0.ts = st.start_ts
    JOIN frames1 f1 ON f1.run_id = s.run_id AND f1.ts = s.ts
    JOIN ${STATES} sc ON sc.run_id = s.run_id AND sc.ts = st.start_ts
    JOIN ${STATES} ss ON ss.run_id = s.run_id AND ss.ts = s.ts
    WHERE list_filter(f0.enemies, e -> e.idx = s.target_index AND e.alive)[1].id
      IS DISTINCT FROM list_filter(f1.enemies, e -> e.idx = s.target_index AND e.alive)[1].id
    ORDER BY s.ts`);
  for (const row of rows) {
    const step = decisionAt(row["s_off"], row["s_len"]);
    const s0 = stateAt(row["sc_off"], row["sc_len"]);
    const sk = stateAt(row["ss_off"], row["ss_len"]);
    const chosen = asRecord(step["chosen"]) as unknown as ActionRequest;
    const target = enemyIds(s0).get(chosen.target_index!);
    // The step as its line meant it: the enemy at that index and the living enemies when the line was chosen (the
    // card or potion as it is now).
    const intent = withExpect(sk, { ...chosen, expect: { from: "line", ...(target ? { target: { id: target } } : {}), enemies: livingEnemiesOf(s0.raw) } });
    const result = gate(sk, intent);
    push({ set: "shifted", run: str(row["run_id"]), floor: row["floor"], turn: row["turn"], ts: row["ts"], label: str(step["label"]), chosen, ok: result.ok, reason: result.reason, ...(result.kind ? { kind: result.kind } : {}), expected: intent.expect, note: str(step["rationale"]).slice(0, 160) });
  }
}

/* ---- 3. line steps through the current planner ---------------------------------------------------------------- */

function lineSteps(): void {
  const rows = query(`
    WITH steps AS (
      SELECT off, run_id, floor, turn, ts FROM decisions
      WHERE label = 'combat/plan-continue' AND action IN ('play_card', 'use_potion') AND result LIKE 'completed%'
        AND ts >= TIMESTAMP '${since.replace("T", " ")}' AND ts < TIMESTAMP '${until.replace("T", " ")}'),
    starts AS (
      SELECT s.off AS s_off, max(c.ts) AS start_ts FROM steps s
      JOIN decisions c ON c.run_id = s.run_id AND c.floor = s.floor AND c.turn = s.turn AND c.ts < s.ts
        AND c.label LIKE 'combat/%' AND c.label <> 'combat/plan-continue'
      GROUP BY s.off),
    chains AS (
      SELECT s.off AS s_off, s.run_id, s.floor, s.turn, s.ts,
        list(x.label ORDER BY x.ts) AS labels, list(x.result ORDER BY x.ts) AS results,
        list(x.off ORDER BY x.ts) AS offs, list(x.len ORDER BY x.ts) AS lens,
        list(sx.off ORDER BY x.ts) AS soffs, list(sx.len ORDER BY x.ts) AS slens
      FROM steps s JOIN starts st ON st.s_off = s.off
      JOIN decisions x ON x.run_id = s.run_id AND x.ts >= st.start_ts AND x.ts <= s.ts
      LEFT JOIN ${STATES} sx ON sx.run_id = x.run_id AND sx.ts = x.ts
      GROUP BY ALL)
    SELECT * FROM chains
    WHERE labels[1] LIKE 'combat/plan%' AND len(list_filter(labels[2:], l -> l <> 'combat/plan-continue')) = 0
      AND len(list_filter(results, r -> r NOT LIKE 'completed%')) = 0 AND len(list_filter(soffs, o -> o IS NULL)) = 0
    ORDER BY hash(s_off) LIMIT ${Math.max(lineSample * 3, 50)}`);
  let taken = 0;
  for (const row of rows) {
    if (taken >= lineSample) break;
    const offs = asArray(row["offs"]);
    const lens = asArray(row["lens"]);
    const soffs = asArray(row["soffs"]);
    const slens = asArray(row["slens"]);
    const base = { set: "lines", run: str(row["run_id"]), floor: row["floor"], turn: row["turn"], ts: row["ts"], label: "combat/plan-continue" };
    const memory = createScreenMemory("COMBAT");
    const start = decisionAt(offs[0], lens[0]);
    const s0 = stateAt(soffs[0], slens[0]);
    noteScreenChange(memory, s0);
    let planned;
    try {
      planned = planCombatTurn(env(s0, memory));
    } catch (error) {
      push({ ...base, chosen: null, ok: null, reason: `skipped: planner failed on the line start (${error instanceof Error ? error.message.slice(0, 120) : String(error)})` });
      continue;
    }
    const loggedFirst = asRecord(start["chosen"]);
    if (planned?.kind === "ask") {
      const key = playedKey(start);
      const plays = key ? playsOf(start, key) : null;
      const criteria = asRecord(asRecord((planned.jevView?.questions ?? planned.questions)["plan"])["criteria"]);
      const again = Object.entries(criteria).find(([candidate, text]) => {
        if (!candidate.startsWith("plan") || typeof text !== "string") return false;
        try {
          return str(asRecord(JSON.parse(text))["plays"]) === plays;
        } catch {
          return false;
        }
      })?.[0];
      if (!again) {
        push({ ...base, chosen: null, ok: null, reason: `skipped: the logged line is not offered by the current planner (${plays ?? "no plays"})` });
        continue;
      }
      const resolved = planned.resolve({ plan: { type: "choice", choice: again, probabilities: { [again]: 1 }, confidence: 1, raw: {} } } as AnswerSet);
      if (JSON.stringify(wireIntent(resolved.intent ?? { action: "" })) !== JSON.stringify(loggedFirst)) {
        push({ ...base, chosen: null, ok: null, reason: `skipped: the current planner plays ${JSON.stringify(resolved.intent)} first, logged ${JSON.stringify(loggedFirst)}` });
        continue;
      }
      resolved.apply?.();
    } else if (planned?.kind === "act") {
      if (JSON.stringify(wireIntent(planned.intent)) !== JSON.stringify(loggedFirst)) {
        push({ ...base, chosen: null, ok: null, reason: `skipped: the current planner plays ${JSON.stringify(planned.intent)} first, logged ${JSON.stringify(loggedFirst)}` });
        continue;
      }
      planned.apply?.();
    } else {
      push({ ...base, chosen: null, ok: null, reason: "skipped: no decision on the line start" });
      continue;
    }
    // The line's later steps, each on its logged board: the step the planner makes there, stamped and gated.
    let outcome: Result | null = null;
    for (let i = 1; i < offs.length; i += 1) {
      const logged = decisionAt(offs[i], lens[i]);
      const state = stateAt(soffs[i], slens[i]);
      noteScreenChange(memory, state);
      const decision = planCombatTurn(env(state, memory));
      if (decision?.kind !== "act" || decision.label !== "combat/plan-continue") {
        outcome = { ...base, chosen: logged["chosen"], ok: null, reason: `skipped: step ${i}: the current planner does not continue the line here (${decision?.label ?? "none"})` };
        break;
      }
      const intent = withExpect(state, decision.intent);
      if (JSON.stringify(wireIntent(intent)) !== JSON.stringify(logged["chosen"])) {
        outcome = { ...base, chosen: logged["chosen"], ok: null, reason: `skipped: step ${i}: the current planner plays ${JSON.stringify(wireIntent(intent))}, logged ${JSON.stringify(logged["chosen"])}` };
        break;
      }
      const result = gate(state, intent);
      if (!result.ok || i === offs.length - 1) {
        outcome = { ...base, chosen: logged["chosen"], ok: result.ok, reason: result.reason, expected: intent.expect, ...(result.kind ? { kind: result.kind } : {}), note: `step ${i} of ${offs.length - 1}` };
        break;
      }
    }
    if (outcome) {
      push(outcome);
      if (outcome.ok !== null) taken += 1;
    }
  }
}

/* ---- 4. other dispatched actions ------------------------------------------------------------------------------ */

const SINGLE_ACTIONS = [
  "play_card",
  "use_potion",
  "end_turn",
  "choose_map_node",
  "claim_reward",
  "choose_reward_card",
  "select_deck_card",
  "choose_event_option",
  "choose_rest_option",
  "buy_card",
  "buy_relic",
  "buy_potion",
  "choose_treasure_relic",
  "discard_potion",
];

function singleActions(): void {
  const per = Math.ceil(singleSample / SINGLE_ACTIONS.length);
  const rows = query(`
    WITH picked AS (
      SELECT off, len, run_id, floor, turn, ts, action, label,
        row_number() OVER (PARTITION BY action ORDER BY hash(off)) AS n
      FROM decisions
      WHERE action IN (${SINGLE_ACTIONS.map((action) => `'${action}'`).join(", ")}) AND label <> 'combat/plan-continue'
        AND label <> 'combat/plan-potion' AND result LIKE 'completed%' AND mode = 'play'
        AND ts >= TIMESTAMP '${since.replace("T", " ")}' AND ts < TIMESTAMP '${until.replace("T", " ")}')
    SELECT p.*, s.off AS s_off, s.len AS s_len,
      (SELECT arg_min(o.off, abs(epoch(o.ts) - epoch(p.ts))) FROM state_index o
        WHERE o.run_id = p.run_id AND o.fingerprint = si.fingerprint AND o.off <> s.off AND abs(epoch(o.ts) - epoch(p.ts)) < 600) AS o_off,
      (SELECT arg_min(o.len, abs(epoch(o.ts) - epoch(p.ts))) FROM state_index o
        WHERE o.run_id = p.run_id AND o.fingerprint = si.fingerprint AND o.off <> s.off AND abs(epoch(o.ts) - epoch(p.ts)) < 600) AS o_len
    FROM picked p JOIN ${STATES} s ON s.run_id = p.run_id AND s.ts = p.ts
    JOIN state_index si ON si.off = s.off
    WHERE p.n <= ${per}
    ORDER BY p.action, p.ts`);
  for (const row of rows.slice(0, singleSample)) {
    const logged = decisionAt(row["off"], row["len"]);
    const state = stateAt(row["s_off"], row["s_len"]);
    const chosen = asRecord(logged["chosen"]) as unknown as ActionRequest;
    const intent = withExpect(state, chosen);
    const here = gate(state, intent);
    const base = { set: "single", run: str(row["run_id"]), floor: row["floor"], turn: row["turn"], ts: row["ts"], label: str(logged["label"]), chosen };
    push({ ...base, ok: here.ok, reason: here.reason, expected: intent.expect, ...(here.kind ? { kind: here.kind } : {}) });
    if (row["o_off"] !== null && row["o_off"] !== undefined) {
      const other = stateAt(row["o_off"], row["o_len"]);
      const there = gate(other, intent);
      push({ ...base, set: "single-same-fingerprint", ok: there.ok, reason: there.reason, expected: intent.expect, ...(there.kind ? { kind: there.kind } : {}), note: `other read at floor ${other.run?.floor ?? "?"} (decided at floor ${state.run?.floor ?? "?"})` });
    }
  }
}

/* ---- run ------------------------------------------------------------------------------------------------------ */

const started = Date.now();
staleDrinks();
shiftedTargets();
lineSteps();
singleActions();
closeSync(files.states);
closeSync(files.decisions);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "results.jsonl"), results.map((result) => JSON.stringify(result)).join("\n") + "\n");
const sets = [...new Set(results.map((result) => result.set))];
for (const set of sets) {
  const rows = results.filter((result) => result.set === set);
  const checked = rows.filter((result) => result.ok !== null);
  const refused = checked.filter((result) => result.ok === false);
  const kinds = refused.reduce<Record<string, number>>((acc, result) => ({ ...acc, [result.kind ?? "?"]: (acc[result.kind ?? "?"] ?? 0) + 1 }), {});
  const runs = new Set(checked.map((result) => result.run)).size;
  console.log(`${set}: ${rows.length} rows, ${checked.length} checked (${runs} runs), ${refused.length} refused ${JSON.stringify(kinds)}, ${rows.length - checked.length} skipped`);
  for (const result of refused.slice(0, 5)) console.log(`  ${result.run.slice(0, 4)} F${String(result.floor)} T${String(result.turn)} ${result.label}: ${result.reason.slice(0, 220)}`);
}
console.log(`${((Date.now() - started) / 1000).toFixed(0)} s`);

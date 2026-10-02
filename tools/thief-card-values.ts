/**
 * THIEF_COST offline (docs/thief.md §7, notes/thief-cost-report.md): the HP value of every stolen card in the logged A8+
 * Thieving Hopper fights, as the live loop would compute it (src/sim/thief-card-value.ts) on the first logged frame
 * after the theft: that frame's deck, HP and act boss, the fight's first frame for the card (the deck diff), the run's
 * route plan as logged by then (the decision rows' route_plan) for the boss-entry HP. No model is called.
 *
 * --control CARD_ID,...: the sanity check instead (every --every-th fight): each named card (a starter Strike, Defend)
 * valued as if it were the stolen one on the same board (the deck with one more copy vs without it), to
 * <out>/card-controls.jsonl.
 *
 * Usage: npx tsx tools/thief-card-values.ts [--out experiments/thief-cost] [--workers 8] [--limit N] [--budget-ms 15000]
 *        npx tsx tools/thief-card-values.ts --control STRIKE_IRONCLAD,DEFEND_IRONCLAD [--every 3]
 * Output: <out>/card-values.jsonl (one row a fight: the card, boss, rates, value, timing; the 7 escapes marked) and a line
 * a fight on stdout. The live budget is 15 s with up to 24 workers; offline the machine shares its cores with a live game,
 * so fewer workers (8) and the same budget: the sample counts are lower than live, the timing is said per fight.
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv, type ScreenMemory } from "../src/project/types.js";
import type { RoutePlan } from "../src/screens/route-plan.js";
import { BuildSimPool } from "../src/sim/build-sim-pool.js";
import { cardValueText, thiefCardValue, THIEF_CARD_BUDGET_MS, type ThiefCardValue } from "../src/sim/thief-card-value.js";
import { missingCardKeys, noteFightStart } from "../src/strategy/thief.js";
import { asArray, asRecord, str } from "../src/util/json.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const outDir = arg("out", "experiments/thief-cost");
const workers = Number(arg("workers", "8"));
const limit = Number(arg("limit", "100000"));
const budgetMs = Number(arg("budget-ms", String(THIEF_CARD_BUDGET_MS)));
const only = arg("only", "");
const control = arg("control", "").split(",").filter(Boolean);
const every = Number(arg("every", "3"));
const PY = ".cache/logdb-venv/bin/python";

type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(PY, ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

const statesFd = openSync("logs/states.jsonl", "r");
const decisionsFd = openSync("logs/decisions.jsonl", "r");
function lineAt(fd: number, off: number, len: number): Row {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return JSON.parse(buffer.toString("utf8")) as Row;
}

const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

function envOf(state: GameState, memory: ScreenMemory): DecisionEnv {
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: memory, thresholds: config.thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
  };
}

/** The run's last route plan logged before `ts` (the decision rows' route_plan, as journal-replay takes it). */
function routePlanBefore(run: string, ts: string): RoutePlan | null {
  const rows = query(`SELECT off, len FROM decisions WHERE run_id = '${run}' AND ts < '${ts}' AND label LIKE 'map/%' ORDER BY ts DESC LIMIT 40`);
  for (const row of rows) {
    const decision = lineAt(decisionsFd, Number(row["off"]), Number(row["len"]));
    const plan = decision["route_plan"];
    if (plan && typeof plan === "object" && !Array.isArray(plan)) return plan as unknown as RoutePlan;
  }
  return null;
}

export interface CardValueRow extends ThiefCardValue {
  run: string;
  floor: number;
  turn: number;
  escaped: boolean;
  deckSize: number;
  hpNow: number;
  text: string;
  wallMs: number;
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const pool = new BuildSimPool(workers);
  const fights = query("SELECT run_id, floor, turns, outcome, first_ts FROM fights WHERE ascension >= 8 AND list_contains(monsters, 'THIEVING_HOPPER') AND turns >= 2 ORDER BY first_ts");
  const escapes = new Set(
    query(
      "SELECT f.run_id, f.floor FROM fights f WHERE f.ascension >= 8 AND list_contains(f.monsters, 'THIEVING_HOPPER') AND f.turns >= 2 AND NOT EXISTS (SELECT 1 FROM decisions d WHERE d.run_id = f.run_id AND d.floor = f.floor AND d.rationale LIKE 'claiming SpecialCard (取回%')",
    ).map((row) => `${String(row["run_id"])}:${String(row["floor"])}`),
  );
  const out = join(outDir, control.length > 0 ? "card-controls.jsonl" : "card-values.jsonl");
  if (!only) writeFileSync(out, "");
  let index = -1;
  console.log(`${fights.length} Hopper fights (turns >= 2), ${escapes.size} escapes; ${workers} workers, budget ${budgetMs} ms`);
  let n = 0;
  for (const fight of fights) {
    if (n >= limit) break;
    const run = String(fight["run_id"]);
    const floor = Number(fight["floor"]);
    if (only && !only.split(",").includes(run)) continue;
    index += 1;
    if (control.length > 0 && index % every !== 0) continue;
    const states = query(`SELECT off, len, ts, turn, screen, observed FROM state_index WHERE run_id = '${run}' AND floor = ${floor} AND screen = 'COMBAT' ORDER BY off`);
    const first = states[0];
    if (!first) continue;
    const memory = createScreenMemory("COMBAT");
    noteFightStart(memory, parseGameState(lineAt(statesFd, Number(first["off"]), Number(first["len"]))["state"] as Record<string, unknown>));
    // The first frame the theft shows in (the loop computes the value on the first state it reads after it).
    let at: { state: GameState; row: Row } | null = null;
    for (const row of states) {
      if (Number(row["turn"] ?? 0) < 2) continue;
      const state = parseGameState(lineAt(statesFd, Number(row["off"]), Number(row["len"]))["state"] as Record<string, unknown>);
      const missing = missingCardKeys(memory, state);
      if (missing && missing.length === 1) {
        at = { state, row };
        break;
      }
    }
    if (!at) {
      console.log(`${run} F${floor}: no frame with exactly one card missing`);
      continue;
    }
    n += 1;
    const stolen = missingCardKeys(memory, at.state)![0]!;
    const plan = routePlanBefore(run, String(at.row["ts"]));
    if (plan) memory.routePlan = plan;
    for (const card of control.length > 0 ? control.map((id) => ({ id, upgraded: false, name: knowledge.card(id)?.name ?? id })) : [stolen]) {
    const t0 = Date.now();
    const value = await thiefCardValue(envOf(at.state, memory), card, { runner: pool, budgetMs });
    const row: CardValueRow = {
      ...value,
      run,
      floor,
      turn: Number(at.row["turn"]),
      escaped: escapes.has(`${run}:${floor}`),
      deckSize: asArray(asRecord(at.state.run?.raw)["deck"]).length + 1,
      hpNow: at.state.run?.current_hp ?? 0,
      text: cardValueText(value),
      wallMs: Date.now() - t0,
    };
    writeFileSync(out, `${JSON.stringify(row)}\n`, { flag: "a" });
    console.log(`${run} F${floor}${row.escaped ? " ESCAPED" : ""} [${str(row.status)}] ${row.text} (${(row.wallMs / 1000).toFixed(1)} s)`);
    }
  }
  await pool.close();
  closeSync(statesFd);
  closeSync(decisionsFd);
  console.log(`${n} fights; wrote ${out}`);
}

void main();

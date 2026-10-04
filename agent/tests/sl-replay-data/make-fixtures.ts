/**
 * Fixtures for tests/sl-replay-plays.test.ts (SL_RETRY_EXPLORE_REPLAY_PLAYS, SL_RETRY_EXPLORE_REPLAY_DEVIATE, docs/sl.md
 * §11.2): J4S28FRQKD7G F33 (碾碎者 + 火箭), where attempts 3, 4 and 6 stopped replaying attempt 2's path at T2's first board
 * ("attempt 2's line is not among the options") and attempt 6 then played attempt 4's whole fight again.
 *
 * - j4s28-a3-t2.json: attempt 3's board at T2's first question (its frame behind the logged decision), the known draws there
 *   as the live controller had them (rows 1-2's draws checked against attempt 3's frames up to the board, SL_RETRY_KNOWN_INSERTS,
 *   _TOP and _PICKS on), the decision as logged (Jev's answer, the replay's record).
 * - j4s28-f33-rows.json: the fight's six rows of logs/sl-attempts.jsonl as written live.
 * - game-data.json (the mod's collections trimmed to what the board references) and pinned-knowledge.json (the knowledge
 *   files the planner reads, from REV, trimmed to these enemies).
 * Reads the logs once, run by hand from the repo root: npx tsx tests/sl-replay-data/make-fixtures.ts. The tests read only
 * the files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

import { parseGameState } from "../../src/mod/schema.js";
import { createSlLog } from "../../src/sl/attempts.js";
import { checkKnown, DrawTracker, knownOrderOf } from "../../src/sl/draws.js";
import { fromRoot } from "../../src/core/paths.js";

const REV = "6bd48a9";
const DIR = fromRoot("agent/tests/sl-replay-data");
const RUN = "J4S28FRQKD7G";
const FLOOR = 33;
const BOARD = { name: "j4s28-a3-t2", attempt: 3, ts: "2026-10-03T12:31:26.493" };
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(fromRoot("data/logdb-venv/bin/python"), [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][] };
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}
const fd = openSync(fromRoot("logs/states.jsonl"), "r");
const decisionsFd = openSync(fromRoot("logs/decisions.jsonl"), "r");
function rawAt(file: number, off: number, len: number): Row {
  const buffer = Buffer.alloc(len);
  readSync(file, buffer, 0, len, off);
  return JSON.parse(buffer.toString("utf8")) as Row;
}
const tsOf = (value: unknown) => String(value).replace(/Z$/, "").replace(/(\.\d{3})\d*$/, "$1");
const split = <T extends Row>(rows: T[]): T[][] => {
  const out: T[][] = [];
  let prev: number | null = null;
  for (const row of rows) {
    const turn = Number(row["turn"]);
    if (prev === null || turn < prev) out.push([]);
    out[out.length - 1]!.push(row);
    prev = turn;
  }
  return out;
};

const log = createSlLog(fromRoot("logs/sl-attempts.jsonl"));
const rows = log.readRun(RUN).filter((row) => row.floor === FLOOR);
writeFileSync(`${DIR}/j4s28-f33-rows.json`, JSON.stringify(rows, null, 1));

const frames = split(query(`SELECT off, len, ts, turn, observed FROM state_index WHERE run_id = '${RUN}' AND floor = ${FLOOR} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL ORDER BY off`));
const decisions = query(`SELECT off, len, ts FROM decisions WHERE run_id = '${RUN}' AND floor = ${FLOOR} AND screen = 'COMBAT' AND turn IS NOT NULL ORDER BY off`);
const decisionMeta = decisions.find((row) => tsOf(row["ts"]) === BOARD.ts);
if (!decisionMeta) throw new Error(`no decision at ${BOARD.ts}`);
const decision = rawAt(decisionsFd, Number(decisionMeta["off"]), Number(decisionMeta["len"]));
const { known } = knownOrderOf(rows.filter((row) => row.attempt < BOARD.attempt));
const tracker = new DrawTracker({ inserts: true, tops: true, picks: true });
let state: Row | null = null;
for (const row of frames[BOARD.attempt - 1]!) {
  const at = rawAt(fd, Number(row["off"]), Number(row["len"]))["state"] as Row;
  tracker.observe(parseGameState(at));
  if (tsOf(row["ts"]) === BOARD.ts && row["observed"] !== true) {
    state = at;
    break;
  }
}
if (!state) throw new Error(`no frame at ${BOARD.ts}`);
const check = known ? checkKnown(known, tracker) : null;
const out = {
  source: `${RUN} F${FLOOR} attempt ${BOARD.attempt} T${String(decision["turn"])} ${BOARD.ts}Z ${String(decision["label"])}`,
  decision: { label: decision["label"], answers: decision["answers"], rationale: decision["rationale"], chosen: decision["chosen"], sl_explore: decision["sl_explore"] },
  state,
  knownDraws: check?.ok && check.keys.length > 0 ? { cards: check.keys, names: check.names, attempts: known!.attempts, ...(check.exact !== undefined ? { exact: check.exact } : {}) } : null,
};
writeFileSync(`${DIR}/${BOARD.name}.json`, JSON.stringify(out, null, 1));
closeSync(fd);
closeSync(decisionsFd);

const cards = new Set<string>(), monsters = new Set<string>(), powers = new Set<string>(), relics = new Set<string>(), potions = new Set<string>();
const run = state["run"] as Row;
const combat = (state["combat"] ?? {}) as Row;
for (const c of run["deck"] as Row[]) cards.add(String(c["card_id"]));
for (const c of (combat["hand"] ?? []) as Row[]) cards.add(String(c["card_id"]));
const view = ((state["agent_view"] as Row)["combat"] ?? {}) as Row;
for (const pile of ["draw", "discard", "exhaust"]) for (const line of (view[pile] ?? []) as Row[]) for (const id of (line["card_ids"] ?? []) as string[]) cards.add(id);
for (const e of (combat["enemies"] ?? []) as Row[]) {
  monsters.add(String(e["enemy_id"]));
  for (const p of (e["powers"] ?? []) as Row[]) powers.add(String(p["power_id"]));
}
for (const p of (((combat["player"] ?? {}) as Row)["powers"] ?? []) as Row[]) powers.add(String(p["power_id"]));
for (const r of (run["relics"] ?? []) as Row[]) relics.add(String(r["relic_id"]));
for (const p of (run["potions"] ?? []) as Row[]) if (p["potion_id"]) potions.add(String(p["potion_id"]));
const gd = (JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, Row[]> }).collections;
const subset = {
  cards: gd["cards"]!.filter((c) => cards.has(String(c["id"]))),
  monsters: gd["monsters"]!.filter((m) => monsters.has(String(m["id"]))),
  relics: gd["relics"]!.filter((r) => relics.has(String(r["id"]))),
  potions: gd["potions"]!.filter((p) => potions.has(String(p["id"]))),
  powers: gd["powers"]!.filter((p) => powers.has(String(p["id"]))),
  events: [],
  characters: gd["characters"]!.filter((c) => c["id"] === "IRONCLAD"),
};
writeFileSync(`${DIR}/game-data.json`, JSON.stringify(subset));
const load = (name: string) => JSON.parse(execFileSync("git", ["show", `${REV}:src/knowledge/${name}`], { encoding: "utf8", maxBuffer: 1 << 28 })) as Row;
const db = load("monster-db.json"), mm = load("move-model.json"), pe = load("potion-equivalents.json");
const keep = (key: string) => key.split("+").some((part) => monsters.has(part));
const pinned = {
  "monster-db.json": {
    meta: db["meta"],
    bosses: Object.fromEntries(Object.entries((db["bosses"] ?? {}) as Row).filter(([key]) => keep(key))),
    encounters: Object.fromEntries(Object.entries(db["encounters"] as Row).filter(([key]) => keep(key))),
    monsters: Object.fromEntries(Object.entries(db["monsters"] as Row).filter(([key]) => monsters.has(key))),
  },
  "move-model.json": Object.fromEntries(Object.entries(mm).filter(([key]) => monsters.has(key))),
  "experience.json": load("experience.json"),
  "boss-damage.json": load("boss-damage.json"),
  "potion-equivalents.json": { ...Object.fromEntries(Object.entries(pe).filter(([key]) => key !== "potions")), potions: Object.fromEntries(Object.entries(pe["potions"] as Row).filter(([key]) => potions.has(key))) },
};
writeFileSync(`${DIR}/pinned-knowledge.json`, JSON.stringify(pinned));
console.log(`${out.source}; known ${out.knownDraws ? out.knownDraws.cards.length : "none"}; ${rows.length} rows; ${subset.cards.length} cards, ${subset.monsters.length} monsters, ${subset.powers.length} powers, ${subset.relics.length} relics, ${subset.potions.length} potions`);

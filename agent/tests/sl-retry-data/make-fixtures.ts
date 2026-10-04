/**
 * Fixtures for tests/sl-retry.test.ts (SL_RETRY_KNOWN_DRAWS, SL_RETRY_COMPUTE; docs/sl.md §10): logged SL retry boards.
 *
 * For each board below: the state behind the first planning decision of that turn in that attempt (logs/states.jsonl,
 * found through the log DB), the known draws there (the earlier attempts' frames through src/sl/draws.ts's tracker,
 * checked against this attempt's frames up to the board, as the live controller does), and the fight's earlier rows of
 * logs/sl-attempts.jsonl (the previous_attempts block). Also game-data.json (the mod's collections trimmed to what the
 * boards reference) and pinned-knowledge.json (the knowledge files the planner reads, from REV's data, trimmed to these
 * enemies). Reads the logs once, run by hand from the repo root: npx tsx tests/sl-retry-data/make-fixtures.ts. The tests
 * read only the files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

import { parseGameState } from "../../src/hand/mod/schema.js";
import { createSlLog } from "../../src/sl/attempts.js";
import { checkKnown, DrawTracker, knownOrderOf } from "../../src/sl/draws.js";
import { fromRoot } from "../../src/core/paths.js";

const REV = "3488dc5";
const DIR = fromRoot("agent/tests/sl-retry-data");
const BOARDS: { name: string; run: string; floor: number; attempt: number; turn: number }[] = [
  { name: "vnkn-f25-a2-t1", run: "VNKN9952ZNA0", floor: 25, attempt: 2, turn: 1 },
  { name: "vnkn-f25-a2-t3-pact", run: "VNKN9952ZNA0", floor: 25, attempt: 2, turn: 3 },
  { name: "jw92-f48-a2-t3-offering", run: "JW925EDF9ZTQ", floor: 48, attempt: 2, turn: 3 },
  { name: "vnkn-f33-a2-t4-shrug", run: "VNKN9952ZNA0", floor: 33, attempt: 2, turn: 4 },
];
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(fromRoot("data/logdb-venv/bin/python"), [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][] };
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}
const fd = openSync(fromRoot("logs/states.jsonl"), "r");
function raw(off: number, len: number): Row {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Row;
}
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

const cards = new Set<string>(), monsters = new Set<string>(), powers = new Set<string>(), relics = new Set<string>(), potions = new Set<string>();
const log = createSlLog(fromRoot("logs/sl-attempts.jsonl"));
for (const board of BOARDS) {
  const frames = split(query(`SELECT off, len, ts, turn, observed FROM state_index WHERE run_id = '${board.run}' AND floor = ${board.floor} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL ORDER BY off`));
  const decisions = split(query(`SELECT ts, turn, label, decider, rationale FROM decisions WHERE run_id = '${board.run}' AND floor = ${board.floor} AND turn IS NOT NULL ORDER BY ts`));
  const records = frames.slice(0, board.attempt - 1).map((attempt) => {
    const tracker = new DrawTracker();
    for (const row of attempt) tracker.observe(parseGameState(raw(Number(row["off"]), Number(row["len"]))));
    return tracker.record;
  });
  const { known } = knownOrderOf(records.map((draws, i) => ({ attempt: i + 1, draws })));
  const decision = decisions[board.attempt - 1]!.find((row) => Number(row["turn"]) === board.turn && PLANNING.test(String(row["label"])))!;
  const tracker = new DrawTracker();
  let state: Row | null = null;
  for (const row of frames[board.attempt - 1]!) {
    const at = raw(Number(row["off"]), Number(row["len"]));
    tracker.observe(parseGameState(at));
    if (row["ts"] === decision["ts"] && row["observed"] !== true) {
      state = at;
      break;
    }
  }
  const check = known ? checkKnown(known, tracker) : null;
  const rows = log.readRun(board.run).filter((row) => row.floor === board.floor && row.attempt < board.attempt);
  const out = {
    source: `${board.run} F${board.floor} attempt ${board.attempt} T${board.turn} ${String(decision["ts"])}Z ${String(decision["label"])}`,
    decision: { label: decision["label"], decider: decision["decider"], rationale: decision["rationale"] },
    state,
    knownDraws: check?.ok ? { cards: check.keys, names: check.names, attempts: known!.attempts } : null,
    rows,
  };
  writeFileSync(`${DIR}/${board.name}.json`, JSON.stringify(out, null, 1));
  const s = state as Row;
  const run = s["run"] as Row;
  const combat = (s["combat"] ?? {}) as Row;
  for (const c of run["deck"] as Row[]) cards.add(String(c["card_id"]));
  for (const c of (combat["hand"] ?? []) as Row[]) cards.add(String(c["card_id"]));
  const view = ((s["agent_view"] as Row)["combat"] ?? {}) as Row;
  for (const pile of ["draw", "discard", "exhaust"]) for (const line of (view[pile] ?? []) as Row[]) for (const id of (line["card_ids"] ?? []) as string[]) cards.add(id);
  for (const e of (combat["enemies"] ?? []) as Row[]) {
    monsters.add(String(e["enemy_id"]));
    for (const p of (e["powers"] ?? []) as Row[]) powers.add(String(p["power_id"]));
  }
  for (const p of (((combat["player"] ?? {}) as Row)["powers"] ?? []) as Row[]) powers.add(String(p["power_id"]));
  for (const r of (run["relics"] ?? []) as Row[]) relics.add(String(r["relic_id"]));
  for (const p of (run["potions"] ?? []) as Row[]) if (p["potion_id"]) potions.add(String(p["potion_id"]));
  console.log(`${board.name}: ${out.source}; known ${out.knownDraws ? out.knownDraws.cards.length : "none"}; ${rows.length} earlier row(s)`);
}
closeSync(fd);

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
console.log(`${BOARDS.length} boards; ${subset.cards.length} cards, ${subset.monsters.length} monsters, ${subset.powers.length} powers, ${subset.relics.length} relics, ${subset.potions.length} potions`);

/**
 * Fixtures for tests/sl-explore-whole.test.ts (SL_RETRY_EXPLORE_WHOLE, docs/sl.md §11.8): logged SL retry boards of
 * PW7Y9EWUW8SB F48 (Test Subject), where the deviation's turn ended as a failed attempt's after a draw.
 *
 * For each board below: the state behind that decision (logs/states.jsonl through the log DB), the known draws there as the
 * live controller had them (the earlier rows' draws, checked against this attempt's frames up to the board with
 * SL_RETRY_KNOWN_INSERTS, _TOP and _PICKS on), the plays already made that turn (controller actionPlay over this attempt's
 * dispatched decisions of the turn before it: the summary's text and the turn record's canon), the decision as logged, and
 * the fight's earlier rows of logs/sl-attempts.jsonl (as written then: every attempt with its turn record), and all six
 * rows of the fight (pw7y-f48-rows.json). Also
 * game-data.json (the mod's collections trimmed to what the boards reference) and pinned-knowledge.json (the knowledge
 * files the planner reads, from REV, trimmed to these enemies). Reads the logs once, run by hand from the repo root:
 * npx tsx tests/sl-explore-whole-data/make-fixtures.ts. The tests read only the files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

import type { ActionRequest } from "../../src/mod/client.js";
import { parseGameState } from "../../src/mod/schema.js";
import { createSlLog } from "../../src/sl/attempts.js";
import { actionPlay } from "../../src/sl/controller.js";
import { checkKnown, DrawTracker, knownOrderOf } from "../../src/sl/draws.js";

const REV = "e0fa69b";
const DIR = "tests/sl-explore-whole-data";
/** The decisions by their logged time (attempt counted from the fight's first turn going back). */
const BOARDS: { name: string; run: string; floor: number; attempt: number; ts: string }[] = [
  // Attempt 3 T1, the deviation point: Jev's Blood Wall, Pommel Strike+, Stomp (attempts 1 and 2: Blood Wall, Rampage,
  // Pommel Strike+, Stomp), played as answered; Pommel Strike+ drew.
  { name: "pw7y-a3-t1-deviation", run: "PW7Y9EWUW8SB", floor: 48, attempt: 3, ts: "2026-10-02T23:32:59.365" },
  // Attempt 3 T1 after Pommel Strike+'s draw: code's "only distinct line" Rampage, Stomp ended the turn as attempts 1-2's.
  { name: "pw7y-a3-t1-replan", run: "PW7Y9EWUW8SB", floor: 48, attempt: 3, ts: "2026-10-02T23:33:02.081" },
  // Attempt 4 T2, the deviation point: Jev's line (attempt 2's) replaced by one opening with Battle Trance+, which draws.
  { name: "pw7y-a4-t2-deviation", run: "PW7Y9EWUW8SB", floor: 48, attempt: 4, ts: "2026-10-02T23:35:04.380" },
  // Attempt 4 T2 after Battle Trance+'s draw: code's "only distinct line" played attempts 2-3's whole turn again.
  { name: "pw7y-a4-t2-replan", run: "PW7Y9EWUW8SB", floor: 48, attempt: 4, ts: "2026-10-02T23:35:06.387" },
];
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(".cache/logdb-venv/bin/python", ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][] };
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}
const fd = openSync("logs/states.jsonl", "r");
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
const tsOf = (value: unknown) => String(value).replace(/Z$/, "").replace(/(\.\d{3})\d*$/, "$1");

const cards = new Set<string>(), monsters = new Set<string>(), powers = new Set<string>(), relics = new Set<string>(), potions = new Set<string>();
const log = createSlLog("logs/sl-attempts.jsonl");
for (const board of BOARDS) {
  const frames = split(query(`SELECT off, len, ts, turn, observed FROM state_index WHERE run_id = '${board.run}' AND floor = ${board.floor} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL ORDER BY off`));
  const decisions = split(query(`SELECT ts, turn, label, decider, rationale, chosen, result FROM decisions WHERE run_id = '${board.run}' AND floor = ${board.floor} AND screen = 'COMBAT' AND turn IS NOT NULL ORDER BY ts`));
  const mine = decisions[board.attempt - 1]!;
  const decision = mine.find((row) => tsOf(row["ts"]) === board.ts)!;
  if (!decision) throw new Error(`${board.name}: no decision at ${board.ts}`);
  const rows = log.readRun(board.run).filter((row) => row.floor === board.floor && row.attempt < board.attempt);
  const { known } = knownOrderOf(rows);
  const tracker = new DrawTracker({ inserts: true, tops: true, picks: true });
  const byTs = new Map<string, Row>();
  let state: Row | null = null;
  for (const row of frames[board.attempt - 1]!) {
    const at = raw(Number(row["off"]), Number(row["len"]));
    tracker.observe(parseGameState(at));
    if (row["observed"] !== true) byTs.set(tsOf(row["ts"]), at);
    if (tsOf(row["ts"]) === board.ts && row["observed"] !== true) {
      state = at;
      break;
    }
  }
  if (!state) throw new Error(`${board.name}: no frame at ${board.ts}`);
  const check = known ? checkKnown(known, tracker) : null;
  // The plays already made this turn: the dispatched decisions of the turn before this one (completed or pending: the loop
  // notes both), as the controller notes them.
  const played = { canon: [] as string[], text: [] as string[] };
  for (const row of mine) {
    if (Number(row["turn"]) !== Number(decision["turn"]) || tsOf(row["ts"]) >= board.ts || !/^(?:completed|pending)/.test(String(row["result"] ?? ""))) continue;
    const at = byTs.get(tsOf(row["ts"]));
    const intent = JSON.parse(String(row["chosen"])) as ActionRequest;
    const play = at ? actionPlay(parseGameState(at), intent) : null;
    if (play) {
      played.canon.push(play.canon);
      played.text.push(play.text);
    }
  }
  const out = {
    source: `${board.run} F${board.floor} attempt ${board.attempt} T${String(decision["turn"])} ${board.ts}Z ${String(decision["label"])}`,
    decision: { label: decision["label"], decider: decision["decider"], rationale: decision["rationale"], chosen: decision["chosen"] },
    state,
    knownDraws: check?.ok && check.keys.length > 0 ? { cards: check.keys, names: check.names, attempts: known!.attempts, ...(check.inserted && check.inserted.keys.length > 0 ? { added: { cards: check.inserted.keys, names: check.inserted.names } } : {}), ...(check.exact !== undefined ? { exact: check.exact } : {}) } : null,
    played,
    rows,
  };
  writeFileSync(`${DIR}/${board.name}.json`, JSON.stringify(out, null, 1));
  const s = state;
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
  console.log(`${board.name}: ${out.source}; known ${out.knownDraws ? out.knownDraws.cards.length : "none"}; played ${played.text.join(", ") || "nothing"}; ${rows.length} earlier row(s)`);
}
closeSync(fd);
// The fight's six rows (attempts 1-6, as written live): exploreTarget's wasted deviations (attempts 3 and 4).
writeFileSync(`${DIR}/pw7y-f48-rows.json`, JSON.stringify(log.readRun("PW7Y9EWUW8SB").filter((row) => row.floor === 48), null, 1));

const gd = (JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, Row[]> }).collections;
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

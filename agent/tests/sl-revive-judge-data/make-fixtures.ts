/**
 * Fixtures for tests/sl-revive-judge.test.ts (ops 2026-10-03, ET3V5177HXSY F48, the Aeonglass: the Lizard Tail fired at T10's
 * start unseen, the judge said "a revive is left" at T13 with nothing left, died with 5 retries unused; docs/sl.md §2.7). For
 * each board below, the logged state (logs/states.jsonl, found through the log DB by run, floor and timestamp) into
 * boards.json, its agent_view cut to the combat part (the judge reads the piles there), and game-data.json (the mod's
 * collections trimmed to what the boards reference). Reads the logs once, run by hand from the repo root:
 * npx tsx tests/sl-revive-judge-data/make-fixtures.ts. The tests read only the files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { fromRoot } from "../../src/core/paths.js";

const DIR = fromRoot("agent/tests/sl-revive-judge-data");
const BOARDS: { name: string; run: string; floor: number; ts: string; why: string }[] = [
  { name: "et3v_f33_t5_end", run: "ET3V5177HXSY", floor: 33, ts: "2026-10-03T16:01:51.611000", why: "F33 T5 end_turn: 11 HP, no block, the Crusher's 23, Fairy in a Bottle and Lizard Tail held: the Fairy fired (a 0 HP frame, the belt empty), T6 opened at 24 = 30% of 80" },
  { name: "et3v_f48_t8_end", run: "ET3V5177HXSY", floor: 48, ts: "2026-10-03T16:17:32.568000", why: "F48 T8 end_turn: 32 HP + 7 block against the Aeonglass's 21x2, the tail unused, Beating Remnant: 20 lost, T9 at 12" },
  { name: "et3v_f48_t9_end", run: "ET3V5177HXSY", floor: 48, ts: "2026-10-03T16:17:38.823000", why: "F48 T9 end_turn: 12 HP + 7 block, no attack shown, two held Wither+2 (9 each), Crimson Mantle 7: 18 - 7 left 1, the Mantle's 1 at T10's start took it" },
  { name: "et3v_f48_t10_start", run: "ET3V5177HXSY", floor: 48, ts: "2026-10-03T16:17:45.582000", why: "F48 T10's first state: 37 of 74 (the tail's 50%), Mantle block 7" },
  { name: "et3v_f48_t13_end", run: "ET3V5177HXSY", floor: 48, ts: "2026-10-03T16:18:16.464000", why: "F48 T13 end_turn: 7 HP + 7 block, three held Wither+4 (15 each), the Aeonglass's 36, nothing to play or drink, the tail spent at T10: the first Wither killed us" },
  { name: "et3v_f48_game_over", run: "ET3V5177HXSY", floor: 48, ts: "2026-10-03T16:18:17.776000", why: "F48 T13 GAME_OVER (defeat), two Withers left in hand" },
  { name: "y8e0_f48_t3_end", run: "Y8E0KK4L7JBL", floor: 48, ts: "", why: "" },
  { name: "rjzg_f31_t7_end", run: "RJZGFGNYK56W", floor: 31, ts: "2026-10-03T15:17:11.737000", why: "F31 T7 end_turn: 19 HP, no block, the Fairy held: back at 24, the next turn at 4" },
  { name: "yql8_f31_t4_end", run: "YQL8D59999AX", floor: 31, ts: "2026-09-29T02:50:53.773000", why: "F31 T4 end_turn: 10 HP + 10 block, the Fairy held: back at 26 (30% of 87), the next turn at 11" },
  { name: "jr66_f48_t8_end", run: "JR66CJ9T8H7W", floor: 48, ts: "2026-09-25T16:29:23.994000", why: "F48 T8 end_turn (least-loss): 2 HP, no block, two Fairies held: one fired, back at 31 (30% of 104), the next turn at 12" },
  { name: "9xzx_f33_t7_end", run: "9XZX4ZJ1ZKUA", floor: 33, ts: "2026-09-25T03:17:30.562000", why: "F33 T7 end_turn (least-loss, A2, before SL): 5 HP + 17 block against 26, Beating Remnant and Crimson Mantle up, nothing to play or drink: died" },
];
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

// Y8E0 F48 T3's end (14 HP against the Torch Head Amalgam's 12x3: 2 -> 0 -> 40 -> 28), as tests/lizard-tail-data has it.
const Y8E0_T3_END = 5695347663;

const cards = new Set<string>(), monsters = new Set<string>(), powers = new Set<string>(), relics = new Set<string>(), potions = new Set<string>();
const states: Record<string, Row> = {};
const notes: Record<string, string> = {};
for (const board of BOARDS) {
  const frame = board.name === "y8e0_f48_t3_end"
    ? query(`SELECT off, len, ts FROM state_index WHERE off = ${Y8E0_T3_END}`)[0]
    : query(`SELECT off, len, ts FROM state_index WHERE run_id = '${board.run}' AND floor = ${board.floor} AND ts = '${board.ts}' AND NOT coalesce(observed, false) ORDER BY off LIMIT 1`)[0];
  if (!frame) throw new Error(`${board.name}: no frame at ${board.ts}`);
  const state = raw(Number(frame["off"]), Number(frame["len"]));
  const view = (state["agent_view"] ?? {}) as Row;
  state["agent_view"] = { combat: view["combat"] ?? null };
  const ts = String(frame["ts"]);
  const decision = query(`SELECT label, action, result FROM decisions WHERE run_id = '${board.run}' AND floor = ${board.floor} AND ts = '${ts}'`)[0] ?? {};
  states[board.name] = state;
  const why = board.why || "F48 T3 end_turn: 14 HP, no block, the Torch Head Amalgam's 12x3, the tail held: 2 -> 0 -> 40 -> 28, T4 opened at 28";
  notes[board.name] = `${board.run} F${board.floor} ${ts}Z ${String(decision["label"] ?? "-")} -> ${String(decision["action"] ?? "-")}: ${why}`;
  const run = state["run"] as Row;
  const combat = (state["combat"] ?? {}) as Row;
  for (const c of (run["deck"] ?? []) as Row[]) cards.add(String(c["card_id"]));
  for (const c of (combat["hand"] ?? []) as Row[]) cards.add(String(c["card_id"]));
  const pileView = ((state["agent_view"] as Row)["combat"] ?? {}) as Row;
  for (const pile of ["draw", "discard", "exhaust"]) for (const line of (pileView[pile] ?? []) as Row[]) for (const id of (line["card_ids"] ?? []) as string[]) cards.add(id);
  for (const e of (combat["enemies"] ?? []) as Row[]) {
    monsters.add(String(e["enemy_id"]));
    for (const p of (e["powers"] ?? []) as Row[]) powers.add(String(p["power_id"]));
  }
  for (const p of (((combat["player"] ?? {}) as Row)["powers"] ?? []) as Row[]) powers.add(String(p["power_id"]));
  for (const r of (run["relics"] ?? []) as Row[]) relics.add(String(r["relic_id"]));
  for (const p of (run["potions"] ?? []) as Row[]) if (p["potion_id"]) potions.add(String(p["potion_id"]));
  console.log(`${board.name}: ${notes[board.name]!.slice(0, 140)}`);
}
closeSync(fd);
// Powers the tests put on edited boards.
for (const id of ["REGEN_POWER", "THORNS_POWER"]) powers.add(id);
writeFileSync(
  `${DIR}/boards.json`,
  JSON.stringify({ source: "Logged boards as the mod sent them (logs/states.jsonl; agent_view cut to its combat part). ops 2026-10-03: ET3V5177HXSY F48 died with 5 retries unused, the judge saying \"a revive is left\" with the tail already spent.", notes, states }),
);
const data = JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, Row[]> };
const keep: Record<string, Set<string>> = { cards, monsters, powers, relics, potions };
const trimmed: Record<string, Row[]> = { events: [], characters: (data.collections["characters"] ?? []).filter((entry) => entry["id"] === "IRONCLAD") };
for (const [kind, ids] of Object.entries(keep)) trimmed[kind] = (data.collections[kind] ?? []).filter((entry) => ids.has(String(entry["id"])));
writeFileSync(`${DIR}/game-data.json`, JSON.stringify(trimmed));
console.log(`wrote ${Object.keys(states).length} boards; game data: ${Object.entries(trimmed).map(([kind, rows]) => `${kind} ${rows.length}`).join(", ")}`);

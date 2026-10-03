/**
 * Fixtures for tests/sl-inferno-judge.test.ts (ops 2026-10-03, C4F14F3XPN0N F33 attempt 5: two Infernos took 2 HP at T7's
 * start, the judge had counted 1). For each board below, the state behind that logged decision (logs/states.jsonl, found
 * through the log DB) into boards.json, and game-data.json (the mod's collections trimmed to what the boards reference).
 * Reads the logs once, run by hand from the repo root: npx tsx tests/sl-inferno-judge-data/make-fixtures.ts. The tests read
 * only the files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

const DIR = "tests/sl-inferno-judge-data";
const BOARDS: { name: string; run: string; floor: number; ts: string; why: string }[] = [
  { name: "c4f1_a5_t6_end", run: "C4F14F3XPN0N", floor: 33, ts: "2026-10-03T14:46:07.201000", why: "attempt 5 T6 end_turn: 14 HP + 9 block against the Knowledge Demon's 21, two Inferno+ (18), nothing playable, no potion; the enemy turn left 2 HP and T7's start took them (the judge: the mod does not flag)" },
  { name: "c4f1_a5_t7", run: "C4F14F3XPN0N", floor: 33, ts: "2026-10-03T14:46:12.047000", why: "attempt 5 T7, the least-loss decision (Anger): 2 HP against 36, a state shown before Inferno's 2 came; the play failed, the run was over" },
  { name: "c4f1_a1_t6_end", run: "C4F14F3XPN0N", floor: 33, ts: "2026-10-03T14:38:15.604000", why: "attempt 1 T6 end_turn: 16 HP + 9 block against 21, two Inferno+: 4 left, 2 after T7's start (lived)" },
  { name: "c4f1_a2_t6_end", run: "C4F14F3XPN0N", floor: 33, ts: "2026-10-03T14:40:18.964000", why: "attempt 2 T6 end_turn: 17 HP + 9 block against 21, two Inferno+: 5 left, 3 after T7's start (lived)" },
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

const cards = new Set<string>(), monsters = new Set<string>(), powers = new Set<string>(), relics = new Set<string>(), potions = new Set<string>();
const states: Record<string, Row> = {};
const notes: Record<string, string> = {};
for (const board of BOARDS) {
  const frame = query(`SELECT off, len FROM state_index WHERE run_id = '${board.run}' AND floor = ${board.floor} AND ts = '${board.ts}' AND NOT coalesce(observed, false) ORDER BY off LIMIT 1`)[0];
  if (!frame) throw new Error(`${board.name}: no frame at ${board.ts}`);
  const state = raw(Number(frame["off"]), Number(frame["len"]));
  const decision = query(`SELECT label, action, result FROM decisions WHERE run_id = '${board.run}' AND floor = ${board.floor} AND ts = '${board.ts}'`)[0] ?? {};
  states[board.name] = state;
  notes[board.name] = `${board.run} F${board.floor} ${board.ts}Z ${String(decision["label"])} -> ${String(decision["action"])} (${String(decision["result"]).slice(0, 60)}): ${board.why}`;
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
  console.log(`${board.name}: ${notes[board.name]!.slice(0, 120)}`);
}
closeSync(fd);
// Powers the tests put on edited boards (Thorns, Vulnerable, Poison, Demon Form, Rolling Boulder, Vigor).
for (const id of ["THORNS_POWER", "VULNERABLE_POWER", "POISON_POWER", "DEMON_FORM_POWER", "ROLLING_BOULDER_POWER", "VIGOR_POWER", "CRIMSON_MANTLE_POWER"]) powers.add(id);
writeFileSync(`${DIR}/boards.json`, JSON.stringify({ source: "C4F14F3XPN0N F33 (A9, Knowledge Demon) boards as the mod sent them (logs/states.jsonl); ops 2026-10-03: attempt 5 died at T7's start to two Infernos' 2 HP with the last retry unused.", notes, states }));

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
console.log(`${BOARDS.length} boards; ${subset.cards.length} cards, ${subset.monsters.length} monsters, ${subset.powers.length} powers, ${subset.relics.length} relics, ${subset.potions.length} potions`);

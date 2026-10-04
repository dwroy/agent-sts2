/**
 * Fixtures for tests/sl-any-draw.test.ts (SL_JUDGE_ANY_DRAW, docs/sl.md §2.3): logged boards where the turn planner sees
 * every line die and a playable card draws. For each board below, the state behind that logged decision (logs/states.jsonl,
 * found through the log DB); also game-data.json (the mod's collections trimmed to what the boards reference) and
 * pinned-knowledge.json (the knowledge files the planner reads, from REV, trimmed to these enemies and potions). Reads the
 * logs once, run by hand from the repo root: npx tsx tests/sl-any-draw-data/make-fixtures.ts. The tests read only the
 * files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { fromRoot } from "../../src/core/paths.js";

const REV = "124fef7";
const DIR = fromRoot("agent/tests/sl-any-draw-data");
const BOARDS: { name: string; run: string; floor: number; ts: string; why: string }[] = [
  { name: "r764-f33-t10-offering", run: "R764HJWMJQ3V", floor: 33, ts: "2026-10-02T18:12:43.122000", why: "5 HP + 3 block against the Knowledge Demon's 24, only Offering (lose 6 HP) in hand: vetoed as a draw, died with 6 attempts unused" },
  { name: "njsz-f25-t9-battle-trance", run: "NJSZDS6U5X9G", floor: 25, ts: "2026-09-27T15:01:30.198000", why: "Battle Trance drew Perfected Strike (18 in the pile, 6 in the deck entry) and Sword Boomerang + Perfected Strike killed the Beetle: a draw saved us" },
  { name: "24uz-f17-t12-shrug", run: "24UZ3PZNLKTQ", floor: 17, ts: "2026-09-27T23:26:41.309000", why: "Shrug It Off draws; with the whole draw pile in hand every line still dies (the turn's end: dead)" },
  { name: "w5pt-f33-t9-no-draw", run: "W5PTC48C3B1H", floor: 33, ts: "2026-10-01T07:35:36.759000", why: "Battle Trance in hand after an earlier one (No Draw): nothing can be drawn; died" },
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

const cards = new Set<string>(), monsters = new Set<string>(), powers = new Set<string>(), relics = new Set<string>(), potions = new Set<string>();
for (const board of BOARDS) {
  const frame = query(`SELECT off, len FROM state_index WHERE run_id = '${board.run}' AND floor = ${board.floor} AND ts = '${board.ts}' AND NOT coalesce(observed, false) ORDER BY off LIMIT 1`)[0];
  if (!frame) throw new Error(`${board.name}: no frame at ${board.ts}`);
  const state = raw(Number(frame["off"]), Number(frame["len"]));
  const decision = query(`SELECT label, decider, rationale FROM decisions WHERE run_id = '${board.run}' AND floor = ${board.floor} AND ts = '${board.ts}'`)[0] ?? {};
  writeFileSync(`${DIR}/${board.name}.json`, JSON.stringify({ source: `${board.run} F${board.floor} ${board.ts}Z ${String(decision["label"])}: ${board.why}`, decision, state }, null, 1));
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
  console.log(`${board.name}: ${board.run} F${board.floor} ${String(decision["label"])}`);
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
    ...Object.fromEntries(Object.entries(db).filter(([key]) => !["bosses", "encounters", "monsters"].includes(key))),
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

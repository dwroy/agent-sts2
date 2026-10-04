/**
 * Fixtures for tests/sl-early-planner.test.ts (SL_RELOAD_EARLY, SL_JUDGE_KNOWN_DRAWS, SL_RETRY_KNOWN_INSERTS; docs/sl.md §2,
 * §10): logged boards where the turn planner finds every line dying (or, for the insertions, a retry board; and the end_turn
 * boards of TMNFVW6DRQ20 F48 T8, 7DXAW0ZBDFHP F23 T7 and Y3XT9EBS7U8B F48 T7 for the judge's own count: held cards, Stone
 * Calendar, Beating Remnant).
 *
 * For each board below: the state behind that logged decision (logs/states.jsonl, found through the log DB), and with
 * `known` the draws the fight's own frames show up to it (src/sl/draws.ts's tracker, SL_RETRY_KNOWN_INSERTS on, the fight
 * taken as its own retry as tools/sl-retry-replay.ts --mode deaths does): the next cards, the cards added at random places
 * still in the pile, the exactly known part. Also game-data.json (the mod's collections trimmed to what the boards
 * reference) and pinned-knowledge.json (the knowledge files the planner reads, from REV's data, trimmed to these enemies
 * and potions). Reads the logs once, run by hand from the repo root: npx tsx tests/sl-early-data/make-fixtures.ts. The
 * tests read only the files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

import { parseGameState } from "../../src/hand/mod/schema.js";
import { checkKnown, DrawTracker, knownOrderOf } from "../../src/sl/draws.js";
import { fromRoot } from "../../src/core/paths.js";

const REV = "26a50b1";
const DIR = fromRoot("agent/tests/sl-early-data");
const BOARDS: { name: string; run: string; floor: number; ts: string; known?: boolean; why: string }[] = [
  { name: "p57h-f22-t5-certain", run: "P57H9Z324EEW", floor: 22, ts: "2026-09-27T10:26:39.483000", why: "every line dies, nothing left to chance: early reload" },
  { name: "90jg-f17-t12-true-grit", run: "90JG88HCJ6XV", floor: 17, ts: "2026-09-27T02:18:59.997000", why: "True Grit's random exhaust in the hand" },
  { name: "z7d7-f28-t6-gamblers-brew", run: "Z7D7J1RUUJ61", floor: 28, ts: "2026-09-27T13:56:30.883000", why: "a random potion (Gambler's Brew) held" },
  { name: "5bxm-f31-t6-pommel", run: "5BXMTT63VBBA", floor: 31, ts: "2026-09-26T21:51:10.841000", known: true, why: "Pommel Strike draws: unknown on the first attempt, the fight's own draws known on a retry" },
  { name: "ejxc-f33-t2-frantic", run: "EJXCAQ56PWLK", floor: 33, ts: "", known: true, why: "the Insatiable's Frantic Escape added to the pile: the known order kept, the added cards at random places" },
  { name: "tmnf-f48-t8-wither", run: "TMNFVW6DRQ20", floor: 48, ts: "2026-10-02T09:55:36.889000", why: "the end_turn the judge missed: a held Wither+'s 9 the mod does not count (15 HP + 28 block against 19x2)" },
  { name: "7dxa-f23-t7-calendar", run: "7DXAW0ZBDFHP", floor: 23, ts: "2026-09-25T14:33:42.014000", why: "Stone Calendar's 52 at the end of T7 killed both enemies (3 HP + 13 block against 38, flagged lethal): won" },
  { name: "y3xt-f48-t7-remnant", run: "Y3XT9EBS7U8B", floor: 48, ts: "2026-09-28T19:39:33.092000", why: "Beating Remnant: 55 HP, 33 on the plain count, 18 lost (2 lost earlier in the turn)" },
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
  // The fight's first attempt (the turn never going back before the board).
  const frames = query(`SELECT off, len, ts, turn, observed FROM state_index WHERE run_id = '${board.run}' AND floor = ${board.floor} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL ORDER BY off`);
  let ts = board.ts;
  if (!ts) {
    // The Insatiable board: the first planning decision of T2.
    const decision = query(`SELECT ts FROM decisions WHERE run_id = '${board.run}' AND floor = ${board.floor} AND turn = 2 AND label LIKE 'combat/plan%' ORDER BY ts LIMIT 1`)[0]!;
    ts = String(decision["ts"]);
  }
  const all = new DrawTracker({ inserts: true });
  for (const row of frames) all.observe(parseGameState(raw(Number(row["off"]), Number(row["len"]))));
  const { known } = knownOrderOf([{ attempt: 1, draws: all.record }]);
  const tracker = new DrawTracker({ inserts: true });
  let state: Row | null = null;
  for (const row of frames) {
    const at = raw(Number(row["off"]), Number(row["len"]));
    tracker.observe(parseGameState(at));
    if (row["ts"] === ts && row["observed"] !== true) {
      state = at;
      break;
    }
  }
  if (!state) throw new Error(`${board.name}: no frame at ${ts}`);
  const check = board.known && known ? checkKnown(known, tracker) : null;
  const decision = query(`SELECT label, decider, rationale FROM decisions WHERE run_id = '${board.run}' AND floor = ${board.floor} AND ts = '${ts}'`)[0] ?? {};
  const out = {
    source: `${board.run} F${board.floor} ${ts}Z ${String(decision["label"])}: ${board.why}`,
    decision,
    state,
    knownDraws: check?.ok && check.keys.length > 0 ? { cards: check.keys, names: check.names, attempts: [1], ...(check.inserted ? { added: { cards: check.inserted.keys, names: check.inserted.names } } : {}), ...(check.exact !== undefined ? { exact: check.exact } : {}) } : null,
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
  console.log(`${board.name}: ${out.source}; known ${out.knownDraws ? `${out.knownDraws.cards.length} (added ${out.knownDraws.added?.cards.length ?? 0}, exact ${out.knownDraws.exact ?? "all"})` : "none"}`);
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

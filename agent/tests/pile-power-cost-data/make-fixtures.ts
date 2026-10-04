/**
 * Fixtures for tests/pile-power-cost.test.ts (Spiked Gauntlets' +1 on the Powers modelled off the hand): the logged board
 * where G1Z0X3WBH4XQ F36 T1 was asked with a Swift Potion drink at 1 energy (its samples drew the pile's Powers and played
 * Inflame at the deck's 1; the pile shows it at 2), as tests/logged.ts's boards are ({source, decision, state}), and
 * game-data.json: the mod's collections trimmed to what the board references. Reads the logs once, run by hand from the
 * repo root: npx tsx tests/pile-power-cost-data/make-fixtures.ts. The tests read only the files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { fromRoot } from "../../src/core/paths.js";

const DIR = fromRoot("agent/tests/pile-power-cost-data");
const BOARDS = [{ name: "g1z0-f36-t1-swift-potion", run: "G1Z0X3WBH4XQ", ts: "2026-09-26T17:41:27.420" }];
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(fromRoot("data/logdb-venv/bin/python"), [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "1000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][] };
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}
const fd = openSync(fromRoot("logs/states.jsonl"), "r");
const cards = new Set<string>(), monsters = new Set<string>(), powers = new Set<string>(), relics = new Set<string>(), potions = new Set<string>();
for (const board of BOARDS) {
  const frame = query(`SELECT off, len FROM frames WHERE run_id = '${board.run}' AND ts = TIMESTAMP '${board.ts}' AND coalesce(observed, false) = false`)[0];
  const decision = query(`SELECT label, decider, rationale, chosen FROM decisions WHERE run_id = '${board.run}' AND ts = TIMESTAMP '${board.ts}'`)[0];
  if (!frame || !decision) throw new Error(`${board.name}: no frame or decision at ${board.ts}`);
  const buffer = Buffer.alloc(Number(frame["len"]));
  readSync(fd, buffer, 0, Number(frame["len"]), Number(frame["off"]));
  const state = (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Row;
  writeFileSync(`${DIR}/${board.name}.json`, JSON.stringify({ source: `${board.run} ${board.ts}Z ${String(decision["label"])}`, decision, state }, null, 1));
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
  console.log(`${board.name}: ${String(decision["label"])} ${String(decision["rationale"]).slice(0, 80)}`);
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
console.log(`${subset.cards.length} cards, ${subset.monsters.length} monsters, ${subset.relics.length} relics, ${subset.potions.length} potions, ${subset.powers.length} powers`);

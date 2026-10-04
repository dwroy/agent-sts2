/**
 * Fixtures for tests/inferno-planner.test.ts (Inferno's start-of-turn loss per copy on the combat planner: strategy/start-loss.ts,
 * turn-solver Sim.infernos, rollout SimPlayer.infernoCopies). For each board below, the state behind that logged decision
 * (logs/states.jsonl, found through the log DB) with the decision's label and rationale; game-data.json (the mod's collections
 * trimmed to what the boards reference); pinned-knowledge.json (the knowledge files the planner reads, from REV, trimmed to
 * these enemies and potions). Reads the logs once, run by hand from the repo root:
 * npx tsx tests/inferno-planner-data/make-fixtures.ts. The tests read only the files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { fromRoot } from "../../src/core/paths.js";

/** v4 before the per-copy count (its knowledge data). */
const REV = "02e2ca8";
const DIR = fromRoot("agent/tests/inferno-planner-data");
const BOARDS: { name: string; run: string; floor: number; ts: string; why: string }[] = [
  { name: "c4f1-f33-a5-t6", run: "C4F14F3XPN0N", floor: 33, ts: "2026-10-03T14:46:02.965000", why: "attempt 5 T6's first plan: 15 HP, two Inferno+ up (18) and Hellraiser, the Knowledge Demon's Slap 21 next; Breakthrough, Defend, Pillage+ was played (14 HP + 9 block), the enemy turn left 2 and T7's start took them" },
  { name: "c4f1-f33-a1-t6", run: "C4F14F3XPN0N", floor: 33, ts: "2026-10-03T14:38:11.394000", why: "attempt 1 T6's first plan: 17 HP, two Inferno+ up (18); T7's start took 2 (4 -> 2 HP)" },
  { name: "jgjs-f24-t2-second", run: "JGJS7QE62GLD", floor: 24, ts: "2026-09-25T11:17:28.001000", why: "T2's least-loss at 16 HP against the Spiny Toad: one Inferno up (6), the second in the hand; it was played and the fight lost on T2" },
  { name: "a8en-f33-t6", run: "A8ENYFR4ZWKG", floor: 33, ts: "2026-09-30T03:58:45.684000", why: "T6's plan-choice at 34 HP, two Infernos up (18), the Knowledge Demon (won): the rollout's later turns lose 2 a turn" },
];
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(fromRoot("data/logdb-venv/bin/python"), [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][] };
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

function main(): void {
  const fd = openSync(fromRoot("logs/states.jsonl"), "r");
  const raw = (off: number, len: number): Row => {
    const buffer = Buffer.alloc(len);
    readSync(fd, buffer, 0, len, off);
    return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Row;
  };
  const cards = new Set<string>(), monsters = new Set<string>(), powers = new Set<string>(), relics = new Set<string>(), potions = new Set<string>();
  for (const board of BOARDS) {
    const frame = query(`SELECT off, len FROM state_index WHERE run_id = '${board.run}' AND floor = ${board.floor} AND ts = '${board.ts}' AND NOT coalesce(observed, false) ORDER BY off LIMIT 1`)[0];
    if (!frame) throw new Error(`${board.name}: no frame at ${board.ts}`);
    const state = raw(Number(frame["off"]), Number(frame["len"]));
    const decision = query(`SELECT label, decider, action, result, rationale FROM decisions WHERE run_id = '${board.run}' AND floor = ${board.floor} AND ts = '${board.ts}'`)[0] ?? {};
    const out = { source: `${board.run} F${board.floor} ${board.ts}Z ${String(decision["label"])}: ${board.why}`, decision, state };
    writeFileSync(`${DIR}/${board.name}.json`, JSON.stringify(out, null, 1));
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
    console.log(`${board.name}: ${out.source.slice(0, 140)}`);
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
}

main();

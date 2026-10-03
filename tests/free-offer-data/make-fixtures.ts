/**
 * Fixtures for tests/free-offer.test.ts (a card choice for this turn whose card is free this turn, selection.ts
 * freeOfferSource): logged card-selection boards, as tests/logged.ts's boards are ({source, decision, state}) plus the
 * decision that opened the screen (`opened`: the last use_potion / play_card of the run before it, its potion or card id as
 * the log DB resolved it, and its own state for the boards that test the loop's note of it), and game-data.json: the mod's
 * collections trimmed to what the boards reference. Reads the logs once, run by hand from the repo root:
 * npx tsx tests/free-offer-data/make-fixtures.ts. The tests read only the files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

const DIR = "tests/free-offer-data";
const BOARDS = [
  // Skill Potion: Battle Trance (0), Eager-ish 15 block (3), Armaments (1); code asked, the 3-cost card scored -6 for its cost.
  { name: "5lrz-f28-t2-skill-potion", run: "5LRZ7HJ7YGSY", ts: "2026-09-29T14:19:11.625", openedState: false },
  // Spiked Gauntlets: the Colorless Potion's two Powers (3 printed) cost 1 this turn, Discovery 0.
  { name: "ve97-f48-t5-colorless-potion", run: "VE975EGP2G3V", ts: "2026-09-27T01:42:34.991", openedState: true },
  // ... and the Discovery it gave, played: its Powers at 1, Molten Fist 0.
  { name: "ve97-f48-t5-discovery", run: "VE975EGP2G3V", ts: "2026-09-27T01:42:42.070", openedState: true },
  { name: "yn4e-f33-t5-liquid-memories", run: "YN4ETG9Z8ERN", ts: "2026-09-26T20:41:40.899", openedState: false },
  // Not free: Droplet of Precognition (the same screen as Liquid Memories'), Seeker Strike.
  { name: "v6tw-f33-t4-droplet", run: "V6TW9MJ385P2", ts: "2026-09-29T12:46:47.858", openedState: false },
  { name: "r1qj-f33-t2-seeker-strike", run: "R1QJUBVBSSB2", ts: "2026-10-02T15:41:49.860", openedState: false },
];
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(".cache/logdb-venv/bin/python", ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "1000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][] };
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}
const fd = openSync("logs/states.jsonl", "r");
function stateAt(off: number, len: number): Row {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Row;
}
const cards = new Set<string>(), monsters = new Set<string>(), powers = new Set<string>(), relics = new Set<string>(), potions = new Set<string>();
function collect(state: Row): void {
  const run = state["run"] as Row;
  const combat = (state["combat"] ?? {}) as Row;
  for (const c of run["deck"] as Row[]) cards.add(String(c["card_id"]));
  for (const c of (combat["hand"] ?? []) as Row[]) cards.add(String(c["card_id"]));
  for (const c of (((state["selection"] ?? {}) as Row)["cards"] ?? []) as Row[]) cards.add(String(c["card_id"]));
  const view = ((state["agent_view"] as Row)["combat"] ?? {}) as Row;
  for (const pile of ["draw", "discard", "exhaust"]) for (const line of (view[pile] ?? []) as Row[]) for (const id of (line["card_ids"] ?? []) as string[]) cards.add(id);
  for (const e of (combat["enemies"] ?? []) as Row[]) {
    monsters.add(String(e["enemy_id"]));
    for (const p of (e["powers"] ?? []) as Row[]) powers.add(String(p["power_id"]));
  }
  for (const p of (((combat["player"] ?? {}) as Row)["powers"] ?? []) as Row[]) powers.add(String(p["power_id"]));
  for (const r of (run["relics"] ?? []) as Row[]) relics.add(String(r["relic_id"]));
  for (const p of (run["potions"] ?? []) as Row[]) if (p["potion_id"]) potions.add(String(p["potion_id"]));
}
for (const board of BOARDS) {
  const frame = query(`SELECT off, len FROM frames WHERE run_id = '${board.run}' AND ts = TIMESTAMP '${board.ts}' AND coalesce(observed, false) = false`)[0];
  const decision = query(`SELECT label, decider, rationale, chosen, option_index FROM decisions WHERE run_id = '${board.run}' AND ts = TIMESTAMP '${board.ts}'`)[0];
  const opened = query(`SELECT d.ts, d.action, coalesce(d.potion_id, d.card_id) AS id, d.option_index, d.card_index, d.floor, d.turn, f.off, f.len FROM decisions d JOIN frames f ON f.run_id = d.run_id AND f.ts = d.ts AND coalesce(f.observed, false) = false
    WHERE d.run_id = '${board.run}' AND d.ts < TIMESTAMP '${board.ts}' AND d.action IN ('use_potion', 'play_card') ORDER BY d.ts DESC LIMIT 1`)[0];
  if (!frame || !decision || !opened) throw new Error(`${board.name}: no frame, decision or opening action at ${board.ts}`);
  const state = stateAt(Number(frame["off"]), Number(frame["len"]));
  collect(state);
  const openedRow: Row = { ts: opened["ts"], action: opened["action"], id: opened["id"], option_index: opened["option_index"], card_index: opened["card_index"], floor: opened["floor"], turn: opened["turn"] };
  if (board.openedState) {
    openedRow["state"] = stateAt(Number(opened["off"]), Number(opened["len"]));
    collect(openedRow["state"] as Row);
  }
  writeFileSync(`${DIR}/${board.name}.json`, JSON.stringify({ source: `${board.run} ${board.ts}Z ${String(decision["label"])}`, decision, opened: openedRow, state }, null, 1));
  console.log(`${board.name}: ${String(decision["label"])} after ${String(opened["action"])} ${String(opened["id"])}`);
}
closeSync(fd);
const gd = (JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, Row[]> }).collections;
const subset = {
  cards: gd["cards"]!.filter((c) => cards.has(String(c["id"]))),
  monsters: gd["monsters"]!.filter((m) => monsters.has(String(m["id"]))),
  relics: gd["relics"]!.filter((r) => relics.has(String(r["id"]))),
  potions: gd["potions"]!.filter((p) => potions.has(String(p["id"])) || ["POWER_POTION", "ATTACK_POTION", "SKILL_POTION", "COLORLESS_POTION", "LIQUID_MEMORIES", "DROPLET_OF_PRECOGNITION"].includes(String(p["id"]))),
  powers: gd["powers"]!.filter((p) => powers.has(String(p["id"]))),
  events: [],
  characters: gd["characters"]!.filter((c) => c["id"] === "IRONCLAD"),
};
writeFileSync(`${DIR}/game-data.json`, JSON.stringify(subset));
console.log(`${subset.cards.length} cards, ${subset.monsters.length} monsters, ${subset.relics.length} relics, ${subset.potions.length} potions, ${subset.powers.length} powers`);

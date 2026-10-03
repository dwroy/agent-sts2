/**
 * Fixtures for tests/sl-judge-bounds.test.ts (ops 2026-10-04, X80AD9MHAKZW F42, the Soul Nexus: "not certain: Ripple Basin (no
 * attack played): its block is not counted here" at T4, T5 and T6, died on attempt 1 with 3 retries unused; and the judge's
 * other refusals bounded, docs/sl.md §2). For each board below, the logged state (logs/states.jsonl, found through the log
 * DB by run and timestamp) into boards.json, its agent_view cut to the combat part (the judge reads the piles there), and
 * game-data.json (the mod's collections trimmed to what the boards reference). Reads the logs once, run by hand from the
 * repo root: npx tsx tests/sl-judge-bounds-data/make-fixtures.ts. The tests read only the files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

const DIR = "tests/sl-judge-bounds-data";
const BOARDS: { name: string; run: string; ts: string; why: string }[] = [
  { name: "x80a_f42_t4_end", run: "X80AD9MHAKZW", ts: "2026-10-03T17:41:23.267000", why: "F42 T4 end_turn (A9, Soul Nexus 46): 37 HP, no block, Plating 6, no Attack played: Ripple Basin's 4, 36 lost, T5 at 1" },
  { name: "x80a_f42_t5_end", run: "X80AD9MHAKZW", ts: "2026-10-03T17:41:31.866000", why: "F42 T5 end_turn: 1 HP + 12 block, Plating 5, Flame Barrier, 19 shown: Ripple Basin's 4, none lost, T6 at 1" },
  { name: "x80a_f42_t6_end", run: "X80AD9MHAKZW", ts: "2026-10-03T17:41:43.368000", why: "F42 T6 end_turn (least-loss): 1 HP + 25 block, Plating 4, Ripple Basin, 46 shown, Anger playable: died, 3 retries left" },
  { name: "7048_f17_t11_end", run: "7048QYLLYJLS", ts: "2026-09-27T03:10:10.667000", why: "F17 T11 end_turn (A8, the Giant's husk blast 39): 9 HP + 23 block, Ripple Basin, Dexterity 1: died" },
  { name: "z2h3_f17_t11_end", run: "Z2H318ZMMAD0", ts: "2026-09-24T15:02:24.738000", why: "F17 T11 end_turn: 1 HP + 13 block against 13x2, Stampede with three Strikes (3 each) in hand: died" },
  { name: "lmta_f17_t7_end", run: "LMTA6JC86RCC", ts: "2026-09-28T09:44:18.519000", why: "F17 T7 end_turn (A8): 2 HP + 10 block against 24, a Stampede card held (a Power not played): died" },
  { name: "fp35_f42_t5_end", run: "FP35WY2JXL4W", ts: "2026-10-03T05:28:19.585000", why: "F42 T5 end_turn (A9): 20 HP + 6 block against the Axebot's 19x2, Forgotten Soul, Ascender's Bane held: died" },
  { name: "p4zd_f37_t9_end", run: "P4ZDR744B9JC", ts: "2026-09-25T18:11:21.944000", why: "F37 T9 end_turn: 16 HP, no block, the 1-HP Axebot's 20, Parrying Shield (needs 10 block): died" },
  { name: "g1z0_f48_t7_end", run: "G1Z0X3WBH4XQ", ts: "2026-09-26T17:49:24.853000", why: "F48 T7 end_turn: 15 HP + 5 block against 29, Tungsten Rod, a Fairy held: the Fairy fired, T8 at 29" },
  { name: "g1z0_f48_t9_end", run: "G1Z0X3WBH4XQ", ts: "2026-09-26T17:49:52.651000", why: "F48 T9 end_turn: 3 HP + 8 block, two held Wither+2 (9 each), Tungsten Rod, Mummified Hand, nothing playable: died" },
  { name: "bg4w_f17_t6_end", run: "BG4W9DSX99DA", ts: "2026-09-24T11:59:18.809000", why: "F17 T6 end_turn: 8 HP + 13 block, two held Beckons (6 each), Aggression up: died" },
  { name: "l34t_f48_t7_end", run: "L34T7HND7EL8", ts: "2026-09-26T15:22:31.383000", why: "F48 T7 end_turn (least-loss): 24 HP + 8 block against 29, a held Wither+2, Inferno, Mummified Hand, only Attacks to play: died" },
  { name: "z3df_f48_t8_end", run: "Z3DFG85QDRCD", ts: "2026-09-30T13:59:15.938000", why: "F48 T8 end_turn (least-loss, A8): 13 HP + 16 block, Plating 2, against 10x3, Crimson Mantle's 1 at T9's start, Juggernaut 8: died" },
  { name: "vqkx_f48_t7_end", run: "VQKX9AD1YHKS", ts: "2026-09-28T15:22:53.559000", why: "F48 T7 end_turn (A8): 2 HP + 16 block, no attack shown, Regret held with four cards: died" },
  { name: "vc4l_f23_t2_end", run: "VC4LRL945UEF", ts: "2026-09-25T10:53:16.937000", why: "F23 T2 end_turn (least-loss): 17 HP, no block, against 8x2, Beating Remnant, Inferno: 1 left, Inferno's 1 at T3's start: died" },
  { name: "ynmb_f17_t9_start", run: "YNMB8X87UEH1", ts: "2026-09-27T07:11:15.031000", why: "F17 T9's first state (A8): 6 HP, Bread and Beating Remnant held" },
  { name: "ynmb_f17_t9_end", run: "YNMB8X87UEH1", ts: "2026-09-27T07:11:17.660000", why: "F17 T9 end_turn (least-loss): 6 HP + 5 block against 11, nothing lost this turn, Beating Remnant: died" },
  { name: "d4jg_f33_t5_end", run: "D4JGCNEL40VL", ts: "2026-09-24T06:46:45.029000", why: "F33 T5 end_turn (A0, Kaiser Crab): 7 HP + 11 block, Plating 3, the Crusher's 21 from behind, the Rocket (12 HP) killed by Howl from Beyond at the end of the turn: the Crusher hit for 20, lived at 1" },
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
  const frame = query(`SELECT off, len, ts FROM state_index WHERE run_id = '${board.run}' AND ts = '${board.ts}' AND NOT coalesce(observed, false) ORDER BY off LIMIT 1`)[0];
  if (!frame) throw new Error(`${board.name}: no frame at ${board.ts}`);
  const state = raw(Number(frame["off"]), Number(frame["len"]));
  const view = (state["agent_view"] ?? {}) as Row;
  state["agent_view"] = { combat: view["combat"] ?? null };
  const decision = query(`SELECT label, action FROM decisions WHERE run_id = '${board.run}' AND ts = '${board.ts}'`)[0] ?? {};
  states[board.name] = state;
  notes[board.name] = `${board.run} ${board.ts}Z ${String(decision["label"] ?? "-")} -> ${String(decision["action"] ?? "-")}: ${board.why}`;
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
// What the tests put on edited boards: a Power card, Iron Wave, the relics and powers they add.
for (const id of ["INFLAME", "IRON_WAVE", "DEMON_FORM"]) cards.add(id);
for (const id of ["BUFFER_POWER", "INTANGIBLE_POWER", "JUGGERNAUT_POWER", "STAMPEDE_POWER", "INFERNO_POWER", "AGGRESSION_POWER"]) powers.add(id);
for (const id of ["ORNAMENTAL_FAN", "CHARONS_ASHES", "BREAD", "MUMMIFIED_HAND", "RIPPLE_BASIN"]) relics.add(id);
writeFileSync(
  `${DIR}/boards.json`,
  JSON.stringify({ source: "Logged boards as the mod sent them (logs/states.jsonl; agent_view cut to its combat part). ops 2026-10-04: X80AD9MHAKZW F42 died on attempt 1 with 3 retries unused, the judge refusing for Ripple Basin's block.", notes, states }),
);
const data = JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, Row[]> };
const keep: Record<string, Set<string>> = { cards, monsters, powers, relics, potions };
const trimmed: Record<string, Row[]> = { events: [], characters: (data.collections["characters"] ?? []).filter((entry) => entry["id"] === "IRONCLAD") };
for (const [kind, ids] of Object.entries(keep)) trimmed[kind] = (data.collections[kind] ?? []).filter((entry) => ids.has(String(entry["id"])));
writeFileSync(`${DIR}/game-data.json`, JSON.stringify(trimmed));
console.log(`wrote ${Object.keys(states).length} boards; game data: ${Object.entries(trimmed).map(([kind, rows]) => `${kind} ${rows.length}`).join(", ")}`);

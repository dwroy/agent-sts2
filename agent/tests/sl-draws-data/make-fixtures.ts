/**
 * Fixtures for tests/sl-draws-offtop.test.ts (SL_RETRY_KNOWN_OFF_TOP, SL_RETRY_KNOWN_HAND_ORDER, docs/sl.md §10.2): the logged
 * combat frames of the fights below, every attempt (split where the turn goes back), cut down to what the draw tracker reads
 * (the turn and screen, the hand's cards in order, the piles' listing, the deck, the belt, a selection's prompt); and the
 * fight's rows of logs/sl-attempts.jsonl where it has them (their live `draws`). The maker checks that the cut frames give the
 * tracker the same record as the whole ones, under the old and the new options. Reads the logs once, run by hand from the
 * repo root: npx tsx tests/sl-draws-data/make-fixtures.ts [name ...] (the names: only those fixtures). The tests read only the
 * files it writes. Since 2026-10-04 a frame also keeps the cards played this turn and a selection's kind (SL_RETRY_KNOWN_HAND_ORDER's
 * hand exits read them); the fixtures written before (rntvat-f38, p68p-f25, h1fa-f2, vtre-f2, c4f1-f33) do not have them.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

import { parseGameState } from "../../src/mod/schema.js";
import { DrawTracker, type DrawTrackerOptions } from "../../src/sl/draws.js";
import { fromRoot } from "../../src/core/paths.js";

const DIR = fromRoot("agent/tests/sl-draws-data");
/** The fights (and the turns kept of them: all when absent). */
const FIGHTS: { name: string; run: string; floor: number; turns?: number; why: string }[] = [
  { name: "rntvat-f38", run: "RNTVAT76BPV0", floor: 38, why: "Distilled Chaos (精炼混沌) plays the pile's top 3: attempt 1 on T2 (positions 11-13), attempt 2 on T1 (6-8); 4 attempts" },
  { name: "p68p-f25", run: "P68P7CDJRDH3", floor: 25, turns: 2, why: "T1: Shrug It Off played from 防御, 挑衅, 耸肩无视, 打击 drew Shrug It Off (the hand 防御, 打击, 耸肩无视)" },
  { name: "h1fa-f2", run: "H1FAYT87VH2Q", floor: 2, turns: 3, why: "T2: Havoc (破灭) plays the top card (打击) and exhausts it" },
  { name: "vtre-f2", run: "VTREB5A9XWS7", floor: 2, turns: 2, why: "T1: Cascade (倾泻) plays the top 2 (打击, 进阶之灾)" },
  { name: "c4f1-f33", run: "C4F14F3XPN0N", floor: 33, turns: 6, why: "T4 in attempts 1-3 and 5: Hellraiser (地狱狂徒) plays a Strike as it is drawn, among T4's draws" },
  { name: "rjzg-f33", run: "RJZGFGNYK56W", floor: 33, turns: 6, why: "T4 in attempts 1-4 and 6: Pommel Strike (剑柄打击) played from the hand drew the deck's other Pommel Strike (the hand's order shows it); 6 attempts" },
  { name: "m6p7-f29", run: "M6P7KAWMF6BC", floor: 29, turns: 2, why: "T1: Pommel Strike played from the hand's end (旋风斩, 剑柄打击) drew the other Pommel Strike: the hand looks the same" },
  { name: "vbhz-f20", run: "VBHZ77A3N496", floor: 20, turns: 1, why: "T1: Battle Trance played from the hand's end drew Battle Trance, One-Two Punch, Strike" },
  { name: "jw92-f12", run: "JW925EDF9ZTQ", floor: 12, turns: 2, why: "T1: a hand selection replaced Strike and Defend (to the discard pile) and drew Defend, Omnislice" },
];
const names = process.argv.slice(2);
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
const asRow = (value: unknown): Row => (value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {});
const pick = (from: Row, keys: string[]): Row => Object.fromEntries(keys.filter((key) => key in from).map((key) => [key, from[key]]));

/** A frame as the draw tracker reads it (the deck: on an attempt's first frame only, the one the tracker reads it on). */
function cut(state: Row, first: boolean): Row {
  const run = asRow(state["run"]);
  const combat = asRow(state["combat"]);
  const view = asRow(asRow(state["agent_view"])["combat"]);
  // A pile line up to its cost ("打击*2 [1费]"): the name, the count and the upgrade mark are all the tracker reads of it.
  const pile = (name: string) => (Array.isArray(view[name]) ? (view[name] as Row[]).map((entry) => ({ line: String(entry["line"] ?? "").replace(/^([^\]]*\]).*$/s, "$1"), card_ids: entry["card_ids"] })) : undefined);
  return {
    ...pick(state, ["state_version", "run_id", "screen", "session", "in_combat", "turn", "available_actions"]),
    run: {
      ...pick(run, ["floor", "act_id", "current_hp", "max_hp"]),
      potions: ((run["potions"] ?? []) as Row[]).map((entry) => pick(entry, ["index", "potion_id", "name"])),
      ...(first ? { deck: ((run["deck"] ?? []) as Row[]).map((entry) => pick(entry, ["card_id", "upgraded"])) } : {}),
    },
    combat: {
      hand: ((combat["hand"] ?? []) as Row[]).map((entry) => pick(entry, ["index", "card_id", "name", "upgraded"])),
      player: { ...pick(asRow(combat["player"]), ["current_hp", "max_hp", "block", "energy", "cards_played_this_turn"]), powers: ((asRow(combat["player"])["powers"] ?? []) as Row[]).map((entry) => pick(entry, ["power_id", "amount"])) },
      enemies: ((combat["enemies"] ?? []) as Row[]).map((entry) => pick(entry, ["index", "enemy_id", "name", "current_hp", "is_alive"])),
    },
    agent_view: { combat: Object.fromEntries(["draw", "discard", "exhaust"].flatMap((name) => (pile(name) ? [[name, pile(name)!]] : []))) },
    ...(state["selection"] ? { selection: pick(asRow(state["selection"]), ["kind", "prompt"]) } : {}),
  };
}

const OPTIONS: DrawTrackerOptions[] = [
  { inserts: true, tops: true, picks: true },
  { inserts: true, tops: true, picks: true, offTop: true, handOrder: true },
  { inserts: true, tops: true, picks: true, offTop: true, handOrder: true, handExits: false },
];
const attemptsRows = readFileSync(fromRoot("logs/sl-attempts.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line) as Row);
for (const fight of FIGHTS) {
  if (names.length > 0 && !names.includes(fight.name)) continue;
  const frames = query(`SELECT off, len, turn FROM state_index WHERE run_id = '${fight.run}' AND floor = ${fight.floor} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL ORDER BY off`);
  const attempts: Row[][] = [];
  const whole: Row[][] = [];
  let prev: number | null = null;
  for (const row of frames) {
    const turn = Number(row["turn"]);
    if (fight.turns !== undefined && turn > fight.turns) continue;
    if (prev === null || turn < prev) {
      attempts.push([]);
      whole.push([]);
    }
    prev = turn;
    const state = raw(Number(row["off"]), Number(row["len"]));
    whole[whole.length - 1]!.push(state);
    attempts[attempts.length - 1]!.push(cut(state, attempts[attempts.length - 1]!.length === 0));
  }
  // The cut frames give the tracker what the whole ones do, under both options.
  attempts.forEach((cutFrames, i) => {
    for (const options of OPTIONS) {
      const a = new DrawTracker(options);
      const b = new DrawTracker(options);
      for (const state of whole[i]!) a.observe(parseGameState(state));
      for (const state of cutFrames) b.observe(parseGameState(state));
      if (JSON.stringify(a.record) !== JSON.stringify(b.record)) throw new Error(`${fight.name} attempt ${i + 1}: the cut frames track otherwise`);
    }
  });
  const rows = attemptsRows.filter((row) => row["run_id"] === fight.run && row["floor"] === fight.floor).map((row) => pick(row, ["run_id", "floor", "attempt", "result", "draws"]));
  writeFileSync(`${DIR}/${fight.name}.json`, JSON.stringify({ source: `${fight.run} F${fight.floor}${fight.turns !== undefined ? ` T1-T${fight.turns}` : ""}`, why: fight.why, attempts, rows }));
  console.log(`${fight.name}: ${attempts.length} attempt(s), ${attempts.reduce((n, list) => n + list.length, 0)} frames, ${rows.length} row(s)`);
}
closeSync(fd);

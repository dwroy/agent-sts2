/**
 * Fixtures for tests/sl-explore-gaps.test.ts (SL_RETRY_EXPLORE_REPLAY_ORDER, _TARGET_TURN, _REARM, _ANCHOR; docs/sl.md
 * §11.14-11.16), as written live:
 * - abcj-rows.json: ABCJ0TZ6MD06 F48 (永世沙漏), its six rows of logs/sl-attempts.jsonl. Attempt 1 lived to T10 (the boss at
 *   211 of 535), attempt 2 to T8; attempts 3-6 all took attempt 2's path; attempt 4's replay left it at T4 (attempt 2's turn
 *   played in another order) and played T5's excluded line again.
 * - abcj-a4-t4.json, abcj-a4-t5.json: attempt 4's boards at T4's and T5's first question (their frames behind the logged
 *   decisions), the known draws there as the controller has them now (rows 1-3's draws, every tracker switch on, checked
 *   against attempt 4's frames up to the board), the decision as logged.
 * - abcj-a1-t7.json: attempt 1's board at T7's first question, the known draws there as attempt 3 would have them on attempt
 *   1's path (rows 1-2's draws checked against attempt 1's frames up to the board): with them code plays its own line there.
 * - akk0-rows.json: AKK09TEEEXKD F17 (瀑布巨兽), its six rows: attempts 3 and 5 deviated at T10 and still ended the turn with
 *   attempt 2's plays (differs false), then played attempt 2's fight on to its death.
 * - 3b4k-rows.json: 3B4K4UDQ56B9 F48, its six rows: attempt 4's T4 deviation wrote differs true, its turn attempts 2-3's but
 *   for the plain Twin Strike (SL_RETRY_EXPLORE_WASTED). p68p-rows.json: P68P7CDJRDH3 F48, attempt 5's T1 deviation played
 *   attempt 1's whole T1 (another order), a turn that did not pass the point's board.
 * - game-data.json (the mod's collections trimmed to what the ABCJ boards reference) and pinned-knowledge.json (the knowledge
 *   files the planner reads, from REV, trimmed to its enemies).
 * Reads the logs once, run by hand from the repo root: npx tsx tests/sl-explore-gaps-data/make-fixtures.ts. The tests read
 * only the files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

import { parseGameState } from "../../src/hand/mod/schema.js";
import { createSlLog } from "../../src/sl/attempts.js";
import { checkKnown, DrawTracker, knownOrderOf } from "../../src/sl/draws.js";
import { fromRoot } from "../../src/core/paths.js";

const REV = "1bd1ff1";
const DIR = fromRoot("agent/tests/sl-explore-gaps-data");
const RUN = "ABCJ0TZ6MD06";
const FLOOR = 48;
/** Each board: the attempt whose frame it is, and the attempt whose known draws are checked against those frames (`view`). */
const BOARDS = [
  { name: "abcj-a4-t4", attempt: 4, view: 4, ts: "2026-10-04T02:25:05.462" },
  { name: "abcj-a4-t5", attempt: 4, view: 4, ts: "2026-10-04T02:25:15.707" },
  { name: "abcj-a1-t7", attempt: 1, view: 3, ts: "2026-10-04T02:18:39.977" },
];
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(fromRoot("data/logdb-venv/bin/python"), [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][] };
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}
const fd = openSync(fromRoot("logs/states.jsonl"), "r");
const decisionsFd = openSync(fromRoot("logs/decisions.jsonl"), "r");
function rawAt(file: number, off: number, len: number): Row {
  const buffer = Buffer.alloc(len);
  readSync(file, buffer, 0, len, off);
  return JSON.parse(buffer.toString("utf8")) as Row;
}
const tsOf = (value: unknown) => String(value).replace(/Z$/, "").replace(/(\.\d{3})\d*$/, "$1");
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

const log = createSlLog(fromRoot("logs/sl-attempts.jsonl"));
const rows = log.readRun(RUN).filter((row) => row.floor === FLOOR);
writeFileSync(`${DIR}/abcj-rows.json`, JSON.stringify(rows, null, 1));
writeFileSync(`${DIR}/akk0-rows.json`, JSON.stringify(log.readRun("AKK09TEEEXKD").filter((row) => row.floor === 17), null, 1));
writeFileSync(`${DIR}/3b4k-rows.json`, JSON.stringify(log.readRun("3B4K4UDQ56B9").filter((row) => row.floor === 48), null, 1));
writeFileSync(`${DIR}/p68p-rows.json`, JSON.stringify(log.readRun("P68P7CDJRDH3").filter((row) => row.floor === 48), null, 1));

const frames = split(query(`SELECT off, len, ts, turn, observed FROM state_index WHERE run_id = '${RUN}' AND floor = ${FLOOR} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL ORDER BY off`));
const decisions = query(`SELECT off, len, ts FROM decisions WHERE run_id = '${RUN}' AND floor = ${FLOOR} AND screen = 'COMBAT' AND turn IS NOT NULL ORDER BY off`);
const states: Row[] = [];
for (const board of BOARDS) {
  const meta = decisions.find((row) => tsOf(row["ts"]) === board.ts);
  if (!meta) throw new Error(`no decision at ${board.ts}`);
  const decision = rawAt(decisionsFd, Number(meta["off"]), Number(meta["len"]));
  const { known } = knownOrderOf(rows.filter((row) => row.attempt < board.view));
  const tracker = new DrawTracker({ inserts: true, tops: true, picks: true, offTop: true, handOrder: true });
  let state: Row | null = null;
  for (const row of frames[board.attempt - 1]!) {
    const at = rawAt(fd, Number(row["off"]), Number(row["len"]))["state"] as Row;
    tracker.observe(parseGameState(at));
    if (tsOf(row["ts"]) === board.ts && row["observed"] !== true) {
      state = at;
      break;
    }
  }
  if (!state) throw new Error(`no frame at ${board.ts}`);
  states.push(state);
  const check = known ? checkKnown(known, tracker) : null;
  const out = {
    source: `${RUN} F${FLOOR} attempt ${board.attempt} T${String(decision["turn"])} ${board.ts}Z ${String(decision["label"])}${board.view !== board.attempt ? `, known draws as attempt ${board.view} would have them` : ""}`,
    decision: { label: decision["label"], answers: decision["answers"], rationale: decision["rationale"], chosen: decision["chosen"], sl_explore: decision["sl_explore"] ?? null },
    state,
    knownDraws: check?.ok && check.keys.length > 0 ? { cards: check.keys, names: check.names, attempts: known!.attempts, ...(check.inserted && check.inserted.keys.length > 0 ? { added: { cards: check.inserted.keys, names: check.inserted.names } } : {}), ...(check.exact !== undefined ? { exact: check.exact } : {}) } : null,
  };
  writeFileSync(`${DIR}/${board.name}.json`, JSON.stringify(out, null, 1));
  console.log(`${out.source}; known ${out.knownDraws ? out.knownDraws.cards.length : "none"}`);
}
closeSync(fd);
closeSync(decisionsFd);

const cards = new Set<string>(), monsters = new Set<string>(), powers = new Set<string>(), relics = new Set<string>(), potions = new Set<string>();
for (const state of states) {
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
}
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
console.log(`${rows.length} rows; ${subset.cards.length} cards, ${subset.monsters.length} monsters, ${subset.powers.length} powers, ${subset.relics.length} relics, ${subset.potions.length} potions`);

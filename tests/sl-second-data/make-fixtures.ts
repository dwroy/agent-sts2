/**
 * Fixtures for tests/sl-explore-second.test.ts (SL_RETRY_EXPLORE_KEY_COUNTERS, SL_RETRY_EXPLORE_SECOND, docs/sl.md §11.12–13):
 * 7TQFLQBKRE4S F33 (碾碎者 + 火箭) and F39 (猫头鹰法官), as written live.
 * - 7tqf-f33-t4.json: the first frame of T4 in attempts 2 and 3 (logs/states.jsonl through the log DB), the same plays before
 *   them; the board keys differed only by 开心小花's counter (0 against 3) and attempt 3's replay stopped there.
 * - 7tqf-rows.json: the run's rows of logs/sl-attempts.jsonl for F33 and F39.
 * Reads the logs once, run by hand from the repo root: npx tsx tests/sl-second-data/make-fixtures.ts. The tests read only the
 * files it writes.
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readSync, writeFileSync } from "node:fs";

import { createSlLog } from "../../src/sl/attempts.js";

const DIR = "tests/sl-second-data";
const RUN = "7TQFLQBKRE4S";
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
const frames = query(`SELECT off, len, ts, turn FROM state_index WHERE run_id = '${RUN}' AND floor = 33 AND screen = 'COMBAT' AND turn IS NOT NULL AND NOT coalesce(observed, false) ORDER BY off`);
const attempts: Row[][] = [];
let prev: number | null = null;
for (const row of frames) {
  const turn = Number(row["turn"]);
  if (prev === null || turn < prev) attempts.push([]);
  prev = turn;
  attempts[attempts.length - 1]!.push(row);
}
const firstOf = (attempt: number, turn: number) => {
  const row = attempts[attempt - 1]!.find((frame) => Number(frame["turn"]) === turn)!;
  return { ts: row["ts"], state: raw(Number(row["off"]), Number(row["len"])) };
};
writeFileSync(`${DIR}/7tqf-f33-t4.json`, JSON.stringify({ source: `${RUN} F33 T4, the first frame of attempts 2 and 3`, attempt2: firstOf(2, 4), attempt3: firstOf(3, 4) }));
closeSync(fd);
const rows = createSlLog("logs/sl-attempts.jsonl").readRun(RUN).filter((row) => row.floor === 33 || row.floor === 39);
writeFileSync(`${DIR}/7tqf-rows.json`, JSON.stringify(rows, null, 1));
console.log(`${attempts.length} attempts at F33; ${rows.length} rows`);

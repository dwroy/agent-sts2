/**
 * Offline evaluation of SL_RETRY_KNOWN_OFF_TOP and SL_RETRY_KNOWN_HAND_ORDER (docs/sl.md §10.2): every logged fight of
 * logs/sl-attempts.jsonl, its frames (logdb state_index, read from logs/states.jsonl by offset) split into attempts where
 * the turn goes back, each attempt's draws tracked again under four trackers: "old" (SL_RETRY_KNOWN_INSERTS, _TOP and
 * _PICKS on, as live), "offtop" (+ SL_RETRY_KNOWN_OFF_TOP), "hand" (+ SL_RETRY_KNOWN_HAND_ORDER) and "new" (both). For
 * attempt k from the 2nd, the known order from attempts 1..k-1 under the same tracker (knownOrderOf), then attempt k's frames
 * one by one with checkKnown: the cards predicted ahead on each frame against the cards that came off the pile in the next
 * step (the attempt's own record under that tracker, within its clean part; a place of unknown order by its cards). No
 * model is called, nothing is written outside --out; logs are read only.
 *
 * Per attempt and tracker: `known` (the known order's length when the attempt starts: what the console's "attempt k knows
 * the first N draws" says), `checked` / `wrong` (the draws a prediction on the state before covered, compared with what
 * came; `wrong` must be 0), `covered` (checked and right), `skipped` (a step that also took a card by choice or added one
 * to the pile: what is next changed, not compared), `off` (why checkKnown stopped, if it did). Rows also say each attempt's live row (clean, broke) next to the old tracker's offline record, to show the
 * offline frames reproduce it.
 *
 * Usage: npx tsx tools/sl-draws-replay.ts [--attempts logs/sl-attempts.jsonl] [--states logs/states.jsonl]
 *          [--fights RUN:FLOOR,...] [--out experiments/sl-draws]
 * Output: <out>/draws.jsonl (one row per fight, attempt and tracker), <out>/events.jsonl (every step off the top or read by
 * the hand's order, with its frame), a summary on stdout.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { parseGameState, type GameState } from "../src/mod/schema.js";
import { baseKey, checkKnown, DrawTracker, knownOrderOf, type DrawTrackerOptions, type SlDraws } from "../src/sl/draws.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const ATTEMPTS = arg("attempts", "logs/sl-attempts.jsonl");
const STATES = arg("states", "logs/states.jsonl");
const outDir = arg("out", "experiments/sl-draws");
const only = arg("fights", "");
const PY = process.env["LOGDB_PYTHON"] ?? ".cache/logdb-venv/bin/python";
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(PY, ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "500000", "--timeout", "300", sql], { encoding: "utf8", maxBuffer: 1 << 29 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

const fd = openSync(STATES, "r");
function stateAt(off: number, len: number): GameState {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return parseGameState((JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>);
}

/** A fight's frames split into attempts (the turn going back: an SL reload or a restart). */
function attemptsOf(run: string, floor: number): GameState[][] {
  const frames = query(`SELECT off, len, turn FROM state_index WHERE run_id = '${run}' AND floor = ${floor} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL ORDER BY off`);
  const out: GameState[][] = [];
  let prev: number | null = null;
  for (const row of frames) {
    const turn = Number(row["turn"]);
    if (prev === null || turn < prev) out.push([]);
    out[out.length - 1]!.push(stateAt(Number(row["off"]), Number(row["len"])));
    prev = turn;
  }
  return out;
}

const TRACKERS: { name: string; options: DrawTrackerOptions }[] = [
  { name: "old", options: { inserts: true, tops: true, picks: true } },
  { name: "offtop", options: { inserts: true, tops: true, picks: true, offTop: true } },
  { name: "hand", options: { inserts: true, tops: true, picks: true, handOrder: true } },
  { name: "new", options: { inserts: true, tops: true, picks: true, offTop: true, handOrder: true } },
];

function track(frames: GameState[], options: DrawTrackerOptions): SlDraws {
  const tracker = new DrawTracker(options);
  for (const frame of frames) tracker.observe(frame);
  return tracker.record;
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  const rows = readFileSync(ATTEMPTS, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Row);
  const fights = new Map<string, Row[]>();
  for (const row of rows) {
    const key = `${String(row["run_id"])}:${Number(row["floor"])}`;
    if (only && !only.split(",").includes(key)) continue;
    fights.set(key, [...(fights.get(key) ?? []), row]);
  }
  const out: Row[] = [];
  const events: Row[] = [];
  const totals = new Map<string, { attempts: number; known: number; covered: number; checked: number; wrong: number; skipped: number }>();
  for (const [key, live] of fights) {
    const [run, floor] = [key.split(":")[0]!, Number(key.split(":")[1])];
    const attempts = attemptsOf(run, floor);
    if (attempts.length === 0) continue;
    const records = new Map(TRACKERS.map((tracker) => [tracker.name, attempts.map((frames) => track(frames, tracker.options))]));
    // The steps the new rules read differently, with their frames (the new tracker's record says where).
    attempts.forEach((_, k) => {
      const record = records.get("new")![k]!;
      for (const step of record.offTop ?? []) events.push({ fight: key, attempt: k + 1, kind: "off_top", ...step });
      const old = records.get("old")![k]!;
      const hand = records.get("hand")![k]!;
      if (hand.clean > old.clean && !(record.offTop ?? []).length) events.push({ fight: key, attempt: k + 1, kind: "hand_order", old_clean: old.clean, old_broke: old.broke, clean: hand.clean, broke: hand.broke });
    });
    attempts.forEach((frames, k) => {
      const liveRow = live.find((row) => Number(row["attempt"]) === k + 1);
      const liveDraws = liveRow?.["draws"] as SlDraws | undefined;
      for (const { name, options } of TRACKERS) {
        const recs = records.get(name)!;
        const own = recs[k]!;
        const base = { fight: key, attempt: k + 1, attempts: attempts.length, tracker: name, clean: own.clean, broke: own.broke, order: own.order.length, ...(name === "old" && liveDraws ? { live_clean: liveDraws.clean, live_broke: liveDraws.broke } : {}) };
        if (k === 0) {
          out.push(base);
          continue;
        }
        const { known, reason } = knownOrderOf(recs.slice(0, k).map((draws, i) => ({ attempt: i + 1, draws })));
        const tracker = new DrawTracker(options);
        // Each prediction against the next step's draws (what the planner of that state used it for): the places that came
        // off the pile in the step, within the attempt's clean part; a step that also took a card by choice or added one to
        // the pile changes what is next, so it is not compared (`skipped`).
        let prev: { from: number; keys: string[]; picks: number; inserts: number } | null = null;
        let checked = 0;
        let wrong = 0;
        let skipped = 0;
        const wrongs: Row[] = [];
        let off: string | null = null;
        for (const frame of frames) {
          tracker.observe(frame);
          const record = tracker.record;
          const picks = record.picked?.length ?? 0;
          const inserts = record.inserted?.length ?? 0;
          const to = Math.min(record.order.length, record.clean);
          if (prev && prev.keys.length > 0 && to > prev.from) {
            const span = Math.min(to, prev.from + prev.keys.length);
            if (picks !== prev.picks || inserts !== prev.inserts) skipped += span - prev.from;
            else {
              for (let at = prev.from; at < span; at += 1) {
                const predicted = prev.keys[at - prev.from]!;
                const block = (record.offTop ?? []).find((step) => step.cards.length > 1 && step.at <= at && at < step.at + step.cards.length);
                const ok = block ? block.cards.some((card) => baseKey(card) === baseKey(predicted)) : baseKey(record.order[at]!) === baseKey(predicted);
                checked += 1;
                if (!ok) {
                  wrong += 1;
                  if (wrongs.length < 5) wrongs.push({ turn: frame.turn, at, predicted, came: block ? block.cards : record.order[at] });
                }
              }
            }
          }
          let keys: string[] = [];
          if (known && off === null) {
            const check = checkKnown(known, tracker);
            if (!check.ok) off = check.reason;
            else keys = check.keys.slice(tracker.topped.keys.length);
          }
          prev = { from: record.order.length, keys, picks, inserts };
        }
        const covered = checked - wrong;
        out.push({ ...base, known: known?.keys.length ?? 0, ...(known?.unordered ? { unordered: known.unordered } : {}), known_reason: reason, covered, checked, wrong, skipped, ...(wrongs.length > 0 ? { wrongs } : {}), off });
        const total = totals.get(name) ?? { attempts: 0, known: 0, covered: 0, checked: 0, wrong: 0, skipped: 0 };
        total.attempts += 1;
        total.skipped += skipped;
        total.known += known?.keys.length ?? 0;
        total.covered += covered;
        total.checked += checked;
        total.wrong += wrong;
        totals.set(name, total);
      }
    });
  }
  writeFileSync(join(outDir, "draws.jsonl"), out.map((row) => JSON.stringify(row)).join("\n") + "\n");
  writeFileSync(join(outDir, "events.jsonl"), events.map((row) => JSON.stringify(row)).join("\n") + (events.length > 0 ? "\n" : ""));
  process.stdout.write(`${fights.size} fights; attempts from the 2nd, per tracker: known (sum of the known order's length at each attempt's start), covered (draws predicted on the state before they came, and right), checked / wrong (predictions compared with the next step's draws), skipped (steps that also took a card by choice or added one)\n`);
  for (const [name, total] of totals) process.stdout.write(`  ${name.padEnd(7)} attempts ${total.attempts}  known ${total.known}  covered ${total.covered}  checked ${total.checked}  wrong ${total.wrong}  skipped ${total.skipped}\n`);
  // The attempts whose numbers differ between old and new.
  const byAttempt = new Map<string, Row[]>();
  for (const row of out) byAttempt.set(`${String(row["fight"])}#${Number(row["attempt"])}`, [...(byAttempt.get(`${String(row["fight"])}#${Number(row["attempt"])}`) ?? []), row]);
  for (const [id, list] of byAttempt) {
    const old = list.find((row) => row["tracker"] === "old")!;
    const neu = list.find((row) => row["tracker"] === "new")!;
    if (old["known"] === neu["known"] && old["covered"] === neu["covered"] && old["clean"] === neu["clean"]) continue;
    process.stdout.write(`  ${id.padEnd(18)} clean ${String(old["clean"])} -> ${String(neu["clean"])}; known ${String(old["known"] ?? "-")} -> ${String(neu["known"] ?? "-")}; covered ${String(old["covered"] ?? "-")} -> ${String(neu["covered"] ?? "-")}; wrong ${String(neu["wrong"] ?? "-")}${old["broke"] !== neu["broke"] ? `; old broke ${String(old["broke"])}` : ""}\n`);
  }
}

main();

/**
 * Combat decision latency, offline (2026-10-04, V4.6 boss turns "thinking" 20-40 s): logged SL boss boards planned again by
 * the live planner path (planCombatTurn) with the live config, each stage timed. No model is called, nothing is played, and
 * nothing is written outside --out.
 *
 * The boards: a fight's planning decisions (combat/plan-choice and the other fresh plans of a turn) of the attempts asked,
 * from the log DB's state_index offsets into logs/states.jsonl (read-only). On an attempt after the first the SL env is the
 * live controller's (controller.ts envFor): the previous attempts' rows (logs/sl-attempts.jsonl), SL_RETRY_SHOW_SIM, the known
 * draws (knownOrderOf over the earlier rows' draws, checked against this attempt's frames by a DrawTracker with the live
 * switches) and SL_RETRY_COMPUTE. The explore env (SL_RETRY_EXPLORE) is left out: it picks lines, not how long they take.
 *
 * Per decision: the planner's wall time and its stages (the random potions' Monte Carlo, the 5-turn rollout, B2), the
 * rollout's horizon / samples / cut, B2's samples, pairs and time per simulated fight on this machine now.
 *   --b2 off | serial | pool   B2 out; in this thread (the CPU rules: one process, one thread); or a pool of --workers.
 *   --b2-deadline MS           B2's question deadline (default the live 25 s; serial: checked between samples).
 *   --b2-samples N             B2's samples a line (default the live ones: 600, 1200 on a retry).
 *   --clock real | frozen      frozen: every budget runs its whole schedule (deterministic; B2 to --b2-samples); the
 *                              stages' own times then read 0 (their clocks are frozen), the planner's wall time is real.
 *   --cache on | off           the SL retry compute memo (src/sim/compute-memo.ts, SL_RETRY_MEMO), default off; every row
 *                              carries the decision's digest (digestOf: the question, Jev's view, every answer's resolution
 *                              and log less the wall clock's numbers): with --clock frozen, the two arms must be equal.
 *   --export DIR [--export-only]  each board as {run, floor, attempt, ts, sl, state} for tools/bench-board.ts.
 *   --ballast-mb N             that much retained heap first (a long-running process's GC cost; 2026-10-04: ~10-20%).
 *
 * Usage: nice -n 10 npx tsx tools/combat-latency-replay.ts --run V8N5C1DCXYN8 --floor 17 [--attempts 1,6] [--turns 1]
 *          [--first-only] [--b2 serial] [--b2-deadline 25000] [--b2-samples N] [--clock real] [--cache on] [--out FILE.jsonl]
 * The identity proof of 2026-10-04 (docs/sl.md §10.6): --turns 99 --b2 serial --b2-samples 8 --clock frozen, --cache off
 * then on, for V8N5C1DCXYN8:17, AKK09TEEEXKD:17, RJZGFGNYK56W:33, J4S28FRQKD7G:33, RNTVAT76BPV0:38.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv, type SlEnv } from "../src/project/types.js";
import { planCombatTurn, thiefTrace } from "../src/screens/combat-plan.js";
import { bossLinesOptions, releaseBossLinesPool, type BossLineSim } from "../src/sim/boss-lines.js";
import { computeMemoOptions, currentComputeMemo } from "../src/sim/compute-memo.js";
import { createSlLog, previousAttemptsJson, type SlAttemptRow } from "../src/sl/attempts.js";
import { RETRY_COMPUTE } from "../src/sl/controller.js";
import { checkKnown, DrawTracker, knownOrderOf } from "../src/sl/draws.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

type Row = Record<string, unknown>;
const PY = fromRoot("data/logdb-venv/bin/python");
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;

const run = arg("run", "V8N5C1DCXYN8");
const floor = Number(arg("floor", "17"));
const attemptsAsked = arg("attempts", "").split(",").filter(Boolean).map(Number);
const maxTurn = Number(arg("turns", "1"));
const firstOnly = flag("first-only");
const b2 = arg("b2", "serial") as "off" | "serial" | "pool";
const b2Deadline = Number(arg("b2-deadline", String(bossLinesOptions.deadlineMs)));
const b2Samples = arg("b2-samples", "") ? Number(arg("b2-samples", "")) : null;
const clock = arg("clock", "real") as "real" | "frozen";
const cache = arg("cache", "off") === "on";
const out = arg("out", "");
/** --export DIR: each board as {run, floor, attempt, ts, sl, state} (tools/bench-board.ts reads it); --export-only: no planning. */
const exportDir = arg("export", "");
const exportOnly = flag("export-only");

function query(sql: string): Row[] {
  const text = execFileSync(PY, [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(text) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

const fd = openSync(fromRoot("logs/states.jsonl"), "r");
function stateAt(off: number, len: number): GameState {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return parseGameState((JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>);
}

const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

/** The decision env as the loop builds it (loop.ts), on a fresh screen memory (the turn's budgets unspent). */
function envOf(state: GameState, sl: SlEnv | undefined): DecisionEnv {
  return {
    state,
    knowledge,
    brief: buildRunBrief(state, knowledge),
    screenMemory: createScreenMemory("COMBAT"),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    shopDiscardPotions: [],
    jevContext: "v1",
    buildDecider: "deepseek",
    ...(sl ? { sl } : {}),
    thiefFacts: config.thiefFacts,
    thiefCost: config.thiefFacts && config.thiefCost,
    mechRules: config.mechRules,
    mechMoveRules: config.mechMoveRules,
    mechDeathMove: config.mechDeathMove,
    sandpitStart: config.sandpitStart,
  };
}

/** The live controller's tracker (controller.ts newTracker with the live SL_RETRY_KNOWN_* switches). */
function newTracker(): DrawTracker {
  const sl = config.sl;
  if (sl.retryKnownInserts !== true) return new DrawTracker();
  const more = { ...(sl.retryKnownPicks === true ? { picks: true } : {}), ...(sl.retryKnownOffTop === true ? { offTop: true } : {}), ...(sl.retryKnownHandOrder === true ? { handOrder: true } : {}) };
  return sl.retryKnownTop === true ? new DrawTracker({ inserts: true, tops: true, ...more }) : new DrawTracker({ inserts: true, ...more });
}

interface Timed {
  ts: string;
  attempt: number;
  turn: number;
  label: string;
  logged: { label: string; d_ms: number | null; rollout_ms: number | null; b2_ms: number | null; b2_samples: number | null };
  known: number;
  kind: string;
  plannerMs: number;
  mcMs: number;
  rollout: { ms: number; horizon: number; samples: number; degraded: string[]; lines: number } | null;
  b2: { ms: number; samples: number; requested: number; timedOut: boolean; lines: number; orders: number; pairs: number; msPerSim: number | null; workers: number } | null;
  otherMs: number;
  /** SL retry compute memo hits on this decision (the rollout's, B2's), and whether each came from it. */
  memo: { hits: number; rollout: boolean; b2: boolean };
  digest: string;
}

/** --ballast-mb N: that much retained heap of small objects first (a long-running live process's heap; the GC's cost). */
const ballast: unknown[] = [];

function main(): void {
  const ballastMb = Number(arg("ballast-mb", "0"));
  for (let i = 0; i < ballastMb * 4096; i += 1) ballast.push({ id: i, name: `card ${i}`, tags: [i, i + 1], at: { x: i } });
  rolloutLiveOptions.enabled = true;
  if (clock === "frozen") {
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    bossLinesOptions.now = () => 0;
  }
  bossLinesOptions.enabled = b2 !== "off";
  bossLinesOptions.serial = b2 === "serial";
  bossLinesOptions.deadlineMs = b2Deadline;
  bossLinesOptions.turnBudgetMs = Math.max(bossLinesOptions.turnBudgetMs, b2Deadline);
  if (b2 === "pool") bossLinesOptions.workers = Number(arg("workers", "1"));
  computeMemoOptions.enabled = cache;
  thiefTrace.enabled = true;

  const rows: SlAttemptRow[] = createSlLog(fromRoot("logs/sl-attempts.jsonl"))
    .readRun(run)
    .filter((row) => row.floor === floor)
    .sort((a, b) => a.attempt - b.attempt);
  if (rows.length === 0) throw new Error(`no SL rows for ${run} F${floor}`);
  const frames = query(`SELECT off, len, ts, turn, observed FROM state_index WHERE run_id = '${run}' AND floor = ${floor} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL ORDER BY off`);
  const decisions = query(`SELECT ts, observed_ts, turn, label, latency_jev_ms FROM decisions WHERE run_id = '${run}' AND floor = ${floor} AND turn IS NOT NULL ORDER BY ts`);
  // The logged numbers of each decision (decisions.jsonl rows of the fight: rollout.ms, boss_sim.ms), by ts.
  const loggedRows = new Map<string, Row>();
  const raw = execFileSync("grep", ["-F", `"run_id":"${run}"`, fromRoot("logs/decisions.jsonl")], { encoding: "utf8", maxBuffer: 1 << 30 });
  for (const line of raw.split("\n")) {
    if (!line) continue;
    const row = JSON.parse(line) as Row;
    if (row["floor"] === floor) loggedRows.set(String(row["ts"]), row);
  }
  const asked = attemptsAsked.length > 0 ? attemptsAsked : rows.map((row) => row.attempt);
  const results: Timed[] = [];
  for (const attempt of asked) {
    const row = rows.find((r) => r.attempt === attempt);
    if (!row) continue;
    const from = Date.parse(row.started_at);
    const to = Date.parse(row.ended_at);
    const within = (ts: unknown) => {
      const t = Date.parse(String(ts).replace(" ", "T") + (String(ts).endsWith("Z") ? "" : "Z"));
      return t >= from && t <= to;
    };
    const mine = frames.filter((f) => within(f["ts"]));
    const earlier = rows.filter((r) => r.attempt < attempt);
    const { known } = attempt > 1 ? knownOrderOf(earlier) : { known: null };
    const tracker = newTracker();
    const firsts = new Set<number>();
    const pending = new Map<string, Row>();
    for (const d of decisions) {
      const turn = Number(d["turn"]);
      if (!within(d["ts"]) || turn > maxTurn || !PLANNING.test(String(d["label"]))) continue;
      if (firstOnly && firsts.has(turn)) continue;
      firsts.add(turn);
      pending.set(String(d["ts"]), d);
    }
    for (const frame of mine) {
      const state = stateAt(Number(frame["off"]), Number(frame["len"]));
      tracker.observe(state);
      const decision = frame["observed"] === true ? undefined : pending.get(String(frame["ts"]));
      if (!decision) continue;
      pending.delete(String(frame["ts"]));
      let sl: SlEnv | undefined;
      let knownN = 0;
      if (attempt > 1) {
        const check = known ? checkKnown(known, tracker) : null;
        const knownDraws =
          check?.ok && check.keys.length > 0
            ? { cards: check.keys, names: check.names, attempts: [...known!.attempts], ...(check.inserted && check.inserted.keys.length > 0 ? { added: { cards: [...check.inserted.keys], names: [...check.inserted.names] } } : {}), ...(check.exact !== undefined ? { exact: check.exact } : {}) }
            : undefined;
        knownN = knownDraws?.cards.length ?? 0;
        sl = {
          attempt,
          maxAttempts: row.max_attempts,
          previousAttempts: previousAttemptsJson(earlier, attempt, row.max_attempts, { knownDraws: true }),
          showSim: config.sl.retryShowSim,
          ...(knownDraws ? { knownDraws } : {}),
          compute: { ...RETRY_COMPUTE, ...(b2Samples !== null ? { bossSimSamples: b2Samples } : {}) },
        };
      } else if (b2Samples !== null) {
        bossLinesOptions.samples = b2Samples;
      }
      if (exportDir) {
        const name = `${run}-F${floor}-a${attempt}-T${Number(decision["turn"])}-${String(decision["ts"]).replace(/[^0-9]/g, "").slice(8, 17)}.json`;
        writeFileSync(`${exportDir}/${name}`, JSON.stringify({ run, floor, attempt, ts: decision["ts"], sl: sl ?? null, state: state.raw }));
      }
      if (!exportOnly) results.push(timeOne(state, sl, attempt, decision, knownN, loggedRows));
    }
  }
  closeSync(fd);
  releaseBossLinesPool();
  if (out) writeFileSync(out, results.map((r) => JSON.stringify(r)).join("\n") + "\n");
}

function timeOne(state: GameState, sl: SlEnv | undefined, attempt: number, decision: Row, known: number, loggedRows: Map<string, Row>): Timed {
  let sim: BossLineSim | null = null;
  bossLinesOptions.onSim = (s) => {
    sim = s;
  };
  thiefTrace.last = null;
  const hitsBefore = currentComputeMemo()?.hits ?? 0;
  const t0 = performance.now();
  let planned: Decision | null = null;
  try {
    planned = planCombatTurn(envOf(state, sl));
  } catch (error) {
    console.log(`  planner error: ${error instanceof Error ? error.message : String(error)}`);
  }
  const plannerMs = Math.round(performance.now() - t0);
  // (A new fight's memo starts its count again: never below 0.)
  const memoHits = Math.max(0, (currentComputeMemo()?.hits ?? 0) - hitsBefore);
  const trace = thiefTrace.last as typeof thiefTrace.last;
  const rollout = trace?.rollout?.available ? trace.rollout : null;
  const mcMs = Math.round((trace?.mcShown ?? []).reduce((sum, mc) => sum + mc.ms, 0));
  const done = sim as BossLineSim | null;
  const b2Run = done && done.available ? done.run : null;
  const pairs = b2Run ? done!.byPlan.size * (b2Run.orders + 1) : 0;
  const ts = String(decision["ts"]);
  const loggedTs = ts.replace(" ", "T").replace(/(\.\d{3})\d*$/, "$1") + (ts.endsWith("Z") ? "" : "Z");
  const logged = loggedRows.get(loggedTs) ?? {};
  const lr = (logged["rollout"] ?? {}) as Row;
  const lb = (logged["boss_sim"] ?? {}) as Row;
  const dMs = logged["observed_ts"] ? Date.parse(String(logged["ts"])) - Date.parse(String(logged["observed_ts"])) : null;
  const rolloutMs = rollout ? Math.round(rollout.elapsedMs) : 0;
  const b2Ms = b2Run ? b2Run.elapsedMs : 0;
  const result: Timed = {
    ts: loggedTs,
    attempt,
    turn: Number(decision["turn"]),
    label: planned?.label ?? "none",
    logged: { label: String(decision["label"]), d_ms: dMs, rollout_ms: (lr["ms"] as number | undefined) ?? null, b2_ms: (lb["ms"] as number | undefined) ?? null, b2_samples: (lb["samples"] as number | undefined) ?? null },
    known,
    kind: planned?.kind ?? "none",
    plannerMs,
    mcMs,
    rollout: rollout ? { ms: rolloutMs, horizon: rollout.result.horizon, samples: rollout.result.samples, degraded: rollout.result.degraded, lines: rollout.result.lines.length } : null,
    b2: b2Run
      ? { ms: b2Ms, samples: b2Run.samples, requested: b2Run.requested, timedOut: b2Run.timedOut, lines: done!.byPlan.size, orders: b2Run.orders, pairs, msPerSim: b2Run.samples > 0 ? Math.round((b2Ms * Math.max(1, b2Run.workers)) / (b2Run.samples * pairs) * 10) / 10 : null, workers: b2Run.workers }
      : null,
    otherMs: plannerMs - rolloutMs - b2Ms - mcMs,
    memo: { hits: memoHits, rollout: rollout?.memo !== undefined, b2: b2Run?.memo !== undefined },
    digest: digestOf(planned),
  };
  console.log(
    `${run} F${floor} a${attempt} T${result.turn} ${result.logged.label} -> ${result.label} | planner ${plannerMs} ms: mc ${mcMs}, rollout ${rolloutMs}${rollout ? ` (h${rollout.result.horizon} x${rollout.result.samples}${rollout.result.degraded.length ? ` cut: ${rollout.result.degraded.join(", ")}` : ""})` : ""}, b2 ${b2Ms}${result.b2 ? ` (${result.b2.samples}/${result.b2.requested} x ${pairs} pairs, ${result.b2.msPerSim} ms a fight a thread)` : ""}, other ${result.otherMs}${result.memo.hits > 0 ? ` | memo:${result.memo.rollout ? " rollout" : ""}${result.memo.b2 ? " b2" : ""}` : ""} | known ${known} | logged: d ${dMs} rollout ${result.logged.rollout_ms} b2 ${result.logged.b2_ms} (${result.logged.b2_samples})`,
  );
  return result;
}

/**
 * The whole decision as Jev and the loop see it (tools/sl-retry-identity.ts digestOf): the question, Jev's view, and every
 * answer's resolution (each option at 0.9 and 0.3, no answer, a bad answer) with its log row, digested. Left out: the
 * wall clock's own numbers (the log's `timing`; a rollout / B2 log's `ms`, `memo`, and B2's sims done), which differ run
 * to run and between a memo hit and a run; with the clocks frozen (--clock frozen) everything else must be identical.
 */
function digestOf(decision: Decision | null): string {
  let view: unknown = decision ?? null;
  if (decision && decision.kind === "ask") {
    const ask = decision as AskDecision;
    const keys = Object.keys(((ask.questions["plan"] as { criteria?: Record<string, unknown> } | undefined)?.criteria) ?? {});
    const pick = (key: string, confidence: number): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;
    const res = (answers: AnswerSet) => {
      const { apply: _apply, ...rest } = ask.resolve(answers);
      return rest;
    };
    view = {
      label: ask.label, state: ask.state, questions: ask.questions, jevView: ask.jevView ?? null,
      resolved: Object.fromEntries([...keys.map((key) => [key, res(pick(key, 0.9))]), ...keys.map((key) => [`${key}@0.3`, res(pick(key, 0.3))]), ["none", res({} as AnswerSet)], ["bad", res(pick("nope", 0.9))]]),
    };
  }
  const CLOCK = new Set(["timing", "memo", "sims_done", "pairs"]);
  const text = JSON.stringify(view, function (this: Record<string, unknown>, key, value) {
    if (typeof value === "function") return undefined;
    if (CLOCK.has(key)) return undefined;
    // A rollout / B2 log's own wall time (with the clocks frozen it reads 0 either way; kept out for real-clock runs).
    if (key === "ms" && this && ("horizon" in this || "requested" in this || "reason" in this)) return undefined;
    return value;
  });
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

main();

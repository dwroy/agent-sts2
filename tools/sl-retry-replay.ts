/**
 * Offline evaluation of SL_RETRY_KNOWN_DRAWS and SL_RETRY_COMPUTE (docs/sl.md §10, notes/sl-retry-report.md). No model is
 * called and nothing is written outside --out: each fight's logged frames (the log DB's state_index offsets into
 * logs/states.jsonl, read-only) go through the SL draw tracker (src/sl/draws.ts) as the live controller reads them, and
 * the fight's planning decisions are planned again by the current code on their logged boards, as an SL retry (env.sl
 * set) in four variants: off (the question as V4.3 asked it), draws (the known draw order), compute (RETRY_COMPUTE's
 * samples and time) and both.
 *
 * --mode retries: the logged fights played more than once from their room-entry save (VNKN9952ZNA0 F25 attempts 2-3,
 *   JW925EDF9ZTQ F48 and VNKN9952ZNA0 F33 attempt 2): the known order is what the earlier attempts drew (draws.ts
 *   knownOrderOf), checked against this attempt's draws frame by frame (checkKnown), every turn's first planning decision.
 * --mode deaths: the logged A8+ boss and listed-fight (sl-elites.json) deaths, the fights SL would retry: the fight's own
 *   observed draw order taken as "known from attempt 1", the first planning decision of T1..--turns (default 3).
 *
 * Per decision and variant: the decision (ask / act), the question's best line (rollout_best: B2's where B2 ranks, else the
 * 5-turn rollout's), the rollout's own best and its numbers (expected further HP loss, dead samples, win chance), the shown
 * lines that no sample dies on, the planning time, the rollout's horizon and samples and B2's samples.
 * --clock frozen (default): the rollout, the random potions and B2 run their whole schedules (deterministic); real: the
 * live budgets (the timing runs). --b2 off leaves B2 out (it is then the rollout's ranking for every boss); B2 on runs its
 * pool with --workers threads (default 8: a live game shares the machine).
 *
 * --inserts on (SL_RETRY_KNOWN_INSERTS): the draw tracker keeps the known order through cards added to the pile at random
 *   places, and the known draws carry the added cards (the samples place them at random); off (default): as before.
 *
 * Usage: npx tsx tools/sl-retry-replay.ts --mode deaths|retries [--out experiments/sl-retry] [--turns 3] [--b2 on|off]
 *          [--clock frozen|real] [--variants off,draws,compute,both] [--shard i/n] [--limit N] [--workers 8]
 *          [--since 2026-09-30] [--rooms boss,elite,hallway] [--tag name] [--inserts on|off]   (deaths: fights from that date / in those rooms)
 * Output: <out>/<mode>[-<shard>].jsonl, one row per decision; a line per decision on stdout.
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv, type SlEnv } from "../src/project/types.js";
import { planCombatTurn, thiefTrace } from "../src/screens/combat-plan.js";
import { bossLinesOptions, releaseBossLinesPool, type BossLineSim } from "../src/sim/boss-lines.js";
import { createSlLog, previousAttemptsJson, type SlAttemptRow } from "../src/sl/attempts.js";
import { RETRY_COMPUTE } from "../src/sl/controller.js";
import { checkKnown, DrawTracker, knownOrderOf, type KnownOrder, type SlDraws } from "../src/sl/draws.js";
import { loadSlElites } from "../src/sl/elites.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import type { Plan } from "../src/strategy/turn-solver.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const mode = arg("mode", "deaths") as "deaths" | "retries";
const outDir = arg("out", "experiments/sl-retry");
const maxTurn = Number(arg("turns", mode === "retries" ? "99" : "3"));
const b2 = arg("b2", "off") === "on";
const clock = arg("clock", "frozen") as "frozen" | "real";
const variants = arg("variants", "off,draws,compute,both").split(",") as Variant[];
const [shardAt, shardOf] = arg("shard", "0/1").split("/").map(Number) as [number, number];
const limit = Number(arg("limit", "100000"));
const workers = Number(arg("workers", "8"));
/** --mode deaths: only fights from this date on (ISO, e.g. 2026-09-30); --rooms boss,elite,...: only these rooms. */
const since = arg("since", "");
const roomsOnly = arg("rooms", "");
/** SL_RETRY_KNOWN_INSERTS for the tracker (the record and the check). */
const inserts = arg("inserts", "off") === "on";
const newTracker = (): DrawTracker => (inserts ? new DrawTracker({ inserts: true }) : new DrawTracker());
const STATES = "logs/states.jsonl";
const PY = ".cache/logdb-venv/bin/python";
/** Labels of a fresh plan of the turn (not a committed line's next step). */
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;
/** The fights played more than once from their room-entry save (logs/sl-attempts.jsonl and a turn going back to 1). */
const RETRIES: { run: string; floor: number }[] = [
  { run: "VNKN9952ZNA0", floor: 25 },
  { run: "JW925EDF9ZTQ", floor: 48 },
  { run: "VNKN9952ZNA0", floor: 33 },
  // The Queen and the Torchhead Amalgam: all six attempts played the same line and died on T5 (V4.3 live, 2026-10-02).
  { run: "XSPHCB4GUSEU", floor: 48 },
];
/** --fights RUN:FLOOR,...: only these fights; --attempts N: retries mode, attempts 2..N only. */
const fightsOnly = arg("fights", "");
const maxAttempt = Number(arg("attempts", "99"));

/** off2 / draws2 / compute2 / both2: the same on other random numbers (the rollout's seed salted): the sampling noise of a choice. */
type Variant = "off" | "draws" | "compute" | "both" | "off2" | "draws2" | "compute2" | "both2";
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(PY, ["tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
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

const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

function envOf(state: GameState, sl: SlEnv): DecisionEnv {
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
    sl, thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  };
}

/** A line's plays as the question writes them ("A -> X, B"; "end turn"). */
function playsOf(plan: Plan): string {
  return plan.steps.map((step) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", ") || "end turn";
}

function criteriaOf(decision: Decision | null): [string, Row][] {
  if (!decision || decision.kind !== "ask") return [];
  const criteria = ((decision as AskDecision).questions["plan"] as { criteria: Record<string, string | null> } | undefined)?.criteria ?? {};
  return Object.entries(criteria).map(([key, text]) => [key, JSON.parse(String(text ?? "{}")) as Row]);
}

const normal = (plays: unknown) => String(plays ?? "").replace(/, then /g, ", ").replace(/^nothing \(end the turn now\)$/, "end turn");

interface Arm {
  kind: string;
  label: string;
  /** The question's rollout_best option (B2's best where B2 ranks): its plays; null when tied or none. */
  best: string | null;
  /** The rollout's own best line and its numbers; the shown lines tied for the best (then no best). */
  rolloutBest: string | null;
  tied: string[];
  firstStep: string | null;
  hpLoss: number | null;
  deaths: number | null;
  samples: number | null;
  horizon: number | null;
  win: number | null;
  /** The question's best line's rollout numbers (the same as the rollout's best unless B2 ranks). */
  bestHpLoss: number | null;
  bestDeaths: number | null;
  /** Shown lines no sample dies on (within the horizon), and how many lines were shown; their plays, in order. */
  surviving: number;
  shown: number;
  shownPlays: string[];
  /** Every shown line's rollout numbers by plays. */
  lines: Record<string, { hpLoss: number; deaths: number; samples: number; win: number }>;
  degraded: string[];
  rolloutMs: number | null;
  /** B2's question: its best, samples, and the highest raw / calibrated win rate of any line (a low-trust boss: shown, not ranked). */
  b2: { best: string | null; samples: number; ms: number; lowTrust: boolean; maxWin: number; maxCalibrated: number } | null;
  knownUsed: number;
  ms: number;
  error?: string;
}

/** The planner's last trace, read through a function (a read right after the reset would narrow to null). */
function traced(): typeof thiefTrace.last {
  return thiefTrace.last;
}

function arm(state: GameState, sl: SlEnv): Arm {
  thiefTrace.enabled = true;
  thiefTrace.last = null;
  let sim: BossLineSim | null = null;
  bossLinesOptions.onSim = (s) => {
    sim = s;
  };
  const t0 = performance.now();
  let decision: Decision | null = null;
  let error: string | undefined;
  try {
    decision = planCombatTurn(envOf(state, sl));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const ms = Math.round(performance.now() - t0);
  const trace = traced();
  const rollout = trace?.rollout?.available ? trace.rollout : null;
  const lineOf = (plan: Plan | null | undefined) => (plan && rollout ? rollout.byPlan.get(plan) ?? null : null);
  const best = criteriaOf(decision).find(([, row]) => row["rollout_best"] === true);
  const bestPlays = best ? normal(best[1]["plays"]) : null;
  const shown = trace?.shown ?? [];
  const bestPlan = bestPlays ? shown.find((plan) => playsOf(plan) === bestPlays) ?? null : null;
  const rb = lineOf(rollout?.best);
  const bl = lineOf(bestPlan) ?? (bestPlan === null ? rb : null);
  const lines: Arm["lines"] = {};
  for (const plan of shown) {
    const line = lineOf(plan);
    if (line) lines[playsOf(plan)] = { hpLoss: Math.round(line.hpLoss * 10) / 10, deaths: line.deaths, samples: line.samples, win: Math.round(line.winProb * 1000) / 1000 };
  }
  const simDone = sim as BossLineSim | null;
  return {
    kind: decision?.kind ?? "none",
    label: decision?.label ?? "",
    best: bestPlays,
    rolloutBest: rollout?.best ? playsOf(rollout.best) : null,
    tied: rollout ? rollout.tied.map(playsOf) : [],
    firstStep: decision?.kind === "act" ? `${decision.intent.action}:${decision.intent.card_index ?? decision.intent.option_index ?? ""}` : bestPlan ? playsOf({ ...bestPlan, steps: bestPlan.steps.slice(0, 1) }) : null,
    hpLoss: rb ? Math.round(rb.hpLoss * 10) / 10 : null,
    deaths: rb?.deaths ?? null,
    samples: rb?.samples ?? null,
    horizon: rb?.horizon ?? null,
    win: rb ? Math.round(rb.winProb * 1000) / 1000 : null,
    bestHpLoss: bl ? Math.round(bl.hpLoss * 10) / 10 : null,
    bestDeaths: bl?.deaths ?? null,
    surviving: shown.filter((plan) => (lineOf(plan)?.deaths ?? 1) === 0).length,
    shown: shown.length,
    shownPlays: criteriaOf(decision).filter(([key]) => /^plan\d+$/.test(key)).map(([, row]) => normal(row["plays"])),
    lines,
    degraded: rollout?.result.degraded ?? [],
    rolloutMs: rollout ? Math.round(rollout.elapsedMs) : null,
    b2:
      simDone && simDone.available
        ? {
            best: simDone.best ? playsOf(simDone.best) : null,
            samples: simDone.run.samples,
            ms: simDone.run.elapsedMs,
            lowTrust: simDone.lowTrust !== null,
            maxWin: Math.max(0, ...[...simDone.byPlan.values()].map((line) => line.result.winProb)),
            maxCalibrated: Math.max(0, ...[...simDone.byPlan.values()].map((line) => line.calibrated)),
          }
        : null,
    knownUsed: sl.knownDraws?.cards.length ?? 0,
    ms,
    ...(error ? { error } : {}),
  };
}

/** The line a logged decision played: the rationale's plan text (tools/thief-facts-replay.ts playedOf). */
function playedOf(rationale: string): string | null {
  const jev = /chose plan \d+\/\d+ \((.*?)\)(?: with confidence|; plan)/.exec(rationale);
  if (jev) return jev[1]!;
  const code = /^(?:code plan \([^)]*\)|lethal|every simulated line dies; [^:]*|mod says ending the turn is lethal, solver disagrees; not ending it|code plan [^;]*is over the HP guard bound; playing) ?:? ?(.*?)(?:; hp [-+]| \(| \[|$)/.exec(rationale);
  return code ? code[1]!.trim() : null;
}

/** A fight's frames split into attempts (the turn going back), with each attempt's planning decisions. */
function attemptsOf(run: string, floor: number): { frames: Row[]; decisions: Row[] }[] {
  const frames = query(`SELECT off, len, ts, turn, screen, observed FROM state_index WHERE run_id = '${run}' AND floor = ${floor} AND screen IN ('COMBAT', 'CARD_SELECTION') AND turn IS NOT NULL ORDER BY off`);
  const decisions = query(`SELECT ts, turn, label, decider, rationale FROM decisions WHERE run_id = '${run}' AND floor = ${floor} AND turn IS NOT NULL ORDER BY ts`);
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
  const f = split(frames);
  const d = split(decisions);
  return f.map((frames, i) => ({ frames, decisions: d[i] ?? [] }));
}

function recordOf(frames: Row[]): SlDraws {
  const tracker = newTracker();
  for (const row of frames) tracker.observe(stateAt(Number(row["off"]), Number(row["len"])));
  return tracker.record;
}

interface Target {
  run: string;
  floor: number;
  encounter: string;
  room: string;
  attempt: number;
  known: KnownOrder | null;
  frames: Row[];
  decisions: Row[];
  rows: SlAttemptRow[];
}

function evaluate(target: Target, out: string): void {
  const tracker = newTracker();
  const firsts = new Map<number, Row>();
  for (const decision of target.decisions) {
    const turn = Number(decision["turn"]);
    if (turn > maxTurn || firsts.has(turn) || !PLANNING.test(String(decision["label"]))) continue;
    firsts.set(turn, decision);
  }
  const pending = new Map([...firsts.values()].map((decision) => [String(decision["ts"]), decision]));
  for (const row of target.frames) {
    const state = stateAt(Number(row["off"]), Number(row["len"]));
    tracker.observe(state);
    const decision = row["observed"] === true ? undefined : pending.get(String(row["ts"]));
    if (!decision) continue;
    pending.delete(String(row["ts"]));
    const check = target.known ? checkKnown(target.known, tracker) : null;
    const known =
      check?.ok && check.keys.length > 0
        ? { cards: check.keys, names: check.names, attempts: [...target.known!.attempts], ...(check.inserted ? { added: { cards: check.inserted.keys, names: check.inserted.names } } : {}), ...(check.exact !== undefined ? { exact: check.exact } : {}) }
        : undefined;
    const previous = target.rows.filter((r) => r.floor === target.floor && r.attempt < target.attempt);
    const prevOf = (knownNote: boolean) =>
      previous.length > 0
        ? previousAttemptsJson(previous, target.attempt, previous[0]!.max_attempts, knownNote ? { knownDraws: true } : {})
        : { note: "offline evaluation (tools/sl-retry-replay.ts): the fight's own logged draws taken as attempt 1's" };
    const base: SlEnv = { attempt: target.attempt, maxAttempts: previous[0]?.max_attempts ?? 4, previousAttempts: prevOf(false), showSim: false };
    const draws: SlEnv = { ...base, previousAttempts: prevOf(true), ...(known ? { knownDraws: known } : {}) };
    const envs: Record<Variant, SlEnv> = {
      off: base,
      draws,
      compute: { ...base, compute: { ...RETRY_COMPUTE } },
      both: { ...draws, compute: { ...RETRY_COMPUTE } },
      off2: base,
      draws2: draws,
      compute2: { ...base, compute: { ...RETRY_COMPUTE } },
      both2: { ...draws, compute: { ...RETRY_COMPUTE } },
    };
    const arms: Partial<Record<Variant, Arm>> = {};
    for (const variant of variants) {
      rolloutLiveOptions.seedSalt = variant.endsWith("2") ? ":noise" : undefined;
      arms[variant] = arm(state, envs[variant]);
    }
    rolloutLiveOptions.seedSalt = undefined;
    const result = {
      run: target.run,
      floor: target.floor,
      encounter: target.encounter,
      room: target.room,
      attempt: target.attempt,
      turn: Number(decision["turn"]),
      logged: { label: String(decision["label"]), decider: String(decision["decider"]), rationale: String(decision["rationale"] ?? "").slice(0, 300), played: playedOf(String(decision["rationale"] ?? "")) },
      known: check ? (check.ok ? { ok: true, next: check.keys.length, names: check.names.slice(0, 12), ...(check.inserted ? { added: check.inserted.keys.length } : {}) } : { ok: false, reason: check.reason }) : null,
      inserts,
      drawn: tracker.record.order.length,
      clock,
      b2,
      arms,
    };
    writeFileSync(out, `${JSON.stringify(result)}\n`, { flag: "a" });
    const a = (v: Variant) => {
      const x = arms[v];
      return x ? `${v}: ${x.kind} best ${x.best ?? "-"} [${x.hpLoss ?? "-"} hp, dead ${x.deaths ?? "-"}/${x.samples ?? "-"}] ${x.ms} ms${x.error ? ` ERROR ${x.error}` : ""}` : "";
    };
    console.log(`${target.run} F${target.floor} a${target.attempt} T${result.turn} ${target.encounter} known ${check?.ok ? check.keys.length : check ? `off (${check.reason})` : "-"}\n   ${variants.map(a).join("\n   ")}`);
  }
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  rolloutLiveOptions.enabled = true;
  if (clock === "frozen") {
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    bossLinesOptions.now = () => 0;
  }
  bossLinesOptions.enabled = b2;
  bossLinesOptions.workers = workers;
  const tag = arg("tag", "");
  const out = join(outDir, `${mode}${tag ? `-${tag}` : ""}${shardOf > 1 ? `-${shardAt}` : ""}${clock === "real" ? "-real" : ""}${b2 ? "-b2" : ""}.jsonl`);
  writeFileSync(out, "");
  const slRows = createSlLog("logs/sl-attempts.jsonl");
  const elites = loadSlElites();
  const ids = elites.elites.flatMap((elite) => elite.enemy_ids);
  const fights =
    mode === "retries"
      ? RETRIES.map((fight) => ({ ...fight, encounter: "", room: "" }))
      : query(
          `SELECT run_id, floor, encounter, room FROM fights WHERE ascension >= 8 AND outcome = 'died' AND (room = 'boss' OR list_has_any(monsters, [${ids.map((id) => `'${id}'`).join(", ")}]))${since ? ` AND first_ts >= '${since}'` : ""}${roomsOnly ? ` AND room IN (${roomsOnly.split(",").map((room) => `'${room}'`).join(", ")})` : ""} ORDER BY first_ts`,
        ).map((row) => ({ run: String(row["run_id"]), floor: Number(row["floor"]), encounter: String(row["encounter"]), room: String(row["room"]) }));
  let n = 0;
  fights.forEach((fight, index) => {
    if (index % shardOf !== shardAt || n >= limit) return;
    if (fightsOnly && !fightsOnly.split(",").includes(`${fight.run}:${fight.floor}`)) return;
    n += 1;
    const attempts = attemptsOf(fight.run, fight.floor);
    if (attempts.length === 0) return;
    const records = attempts.map((attempt) => recordOf(attempt.frames));
    const rows = slRows.readRun(fight.run);
    const encounter = fight.encounter || (rows.find((row) => row.floor === fight.floor)?.encounter ?? "");
    const room = fight.room || (rows.find((row) => row.floor === fight.floor)?.fight_kind ?? "");
    if (mode === "deaths") {
      // The fight's own draws as attempt 1's: the order up to its first reshuffle or other break.
      const record = records[0]!;
      const known: KnownOrder | null = record.clean > 0 ? { keys: record.order.slice(0, record.clean), names: record.names.slice(0, record.clean), attempts: [1] } : null;
      evaluate({ run: fight.run, floor: fight.floor, encounter, room, attempt: 2, known, frames: attempts[0]!.frames, decisions: attempts[0]!.decisions, rows: [] }, out);
      return;
    }
    for (let k = 1; k < Math.min(attempts.length, maxAttempt); k += 1) {
      const { known } = knownOrderOf(records.slice(0, k).map((draws, i) => ({ attempt: i + 1, draws })));
      evaluate({ run: fight.run, floor: fight.floor, encounter, room, attempt: k + 1, known, frames: attempts[k]!.frames, decisions: attempts[k]!.decisions, rows }, out);
    }
  });
  closeSync(fd);
  releaseBossLinesPool();
  console.log(`wrote ${out}`);
}

main();

/**
 * B2 (Dai 2026-09-30, docs/boss-sim.md §11): in a boss fight, every line Jev is shown (plan lines, potion lines, the
 * random potions' "drink now" lines) is played to the fight's end by the whole-fight simulator (boss-sim.ts), all on the
 * same seeds, each under its best kill order. The question then carries each line's calibrated win rate, its paired
 * difference to the best line (± standard error), the HP lost in the samples won, the turns to the end and the turn the
 * losing samples die on; the best line (rollout_best) is the one with the highest simulated win rate (lines within
 * BOSS_LINES_TIE_SE standard errors tied), then the least HP lost in the samples won (median; V4.2). Jev still picks the
 * line each turn: the simulation only
 * adds numbers and, every few turns, a fight plan summarised from the best line's winning samples; code never plays the
 * plan. Bosses the simulator is known to get wrong (LOW_TRUST_BOSSES) keep the 5-turn rollout's ranking, and their
 * numbers and plan go to the decision log only, not to Jev's question (V4.2, Dai 2026-10-01).
 *
 * Time: the planner is synchronous, so the samples run on a pool of worker threads (BossLinesPool) that the planner's
 * thread waits on (Atomics.wait on a shared counter; replies read with receiveMessageOnPort). The pool is built at the
 * fight's first question and kept for the fight. Each question gets a deadline (BOSS_LINES_DEADLINE_MS, and what is left
 * of the turn's BOSS_LINES_TURN_BUDGET_MS); past it the samples every line has finished are used and their count shown.
 *
 * Switch: BOSS_SIM_LINES=off (bossLinesOptions.enabled) leaves the question and its ranking as they were before B2.
 */

import { availableParallelism } from "node:os";
import { MessageChannel, receiveMessageOnPort, Worker, type MessagePort } from "node:worker_threads";

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import type { ScreenMemory } from "../project/types.js";
import type { JsonValue } from "../util/json.js";
import type { CardModel } from "../strategy/card-model.js";
import type { PotionMcSource } from "../strategy/potion-mc.js";
import type { KillOrder, RolloutInput } from "../strategy/rollout.js";
import { boardRolloutInput, fightMetaOf, fightRelicsOf } from "../strategy/rollout-live.js";
import type { Plan, SolverInput } from "../strategy/turn-solver.js";
import {
  BOSS_SIM_DAMAGE_SCALE,
  BOSS_SIM_HP_SCALE,
  BOSS_SIM_MAX_TURNS,
  BOSS_SIM_MAX_WORKERS,
  BOSS_SIM_POLICY_NODES,
  BOSS_SIM_POTION_HOLD,
  BOSS_SIM_THREAT,
  calibratedWinProb,
  compareLines,
  fightOrders,
  fightSample,
  quantile,
  sampleSeed,
  slimInput,
  summarizeLine,
  tableHoldHp,
  type BossSimLineResult,
  type FightSampleResult,
  type LineComparison,
} from "./boss-sim.js";
import { LOW_TRUST_B2 } from "./boss-trust.js";
import { claimSimCores, leaveSimCores } from "./sim-pools.js";

/** Samples per line (docs/boss-sim.md §8: 600 give a paired win-rate standard error of ~1-2 points). */
export const BOSS_LINES_SAMPLES = 600;
/** One question's wall-clock limit for the samples. */
export const BOSS_LINES_DEADLINE_MS = 25_000;
/** A turn's limit over its questions (a re-plan after a draw asks again): Dai's 20-30 s a boss turn. */
export const BOSS_LINES_TURN_BUDGET_MS = 30_000;
/** Less than this left of the turn's budget: no simulation for this question. */
export const BOSS_LINES_MIN_MS = 3_000;
/**
 * Worker threads (BOSS_SIM_WORKERS; V4.2: 20, was 12; the live runs keep the other cores). A boss fight's questions
 * never run with B3's build questions, and the two pools never hold workers at once (sim-pools.ts).
 */
export const BOSS_LINES_WORKERS = 20;
export const BOSS_LINES_SEED = 7;
/** Win rates within this many paired standard errors of the top one are tied (then the least HP lost when won decides). */
export const BOSS_LINES_TIE_SE = 2;

/**
 * The ranking's second criterion (V4.2, Dai 2026-10-01): the median HP lost in the samples won, the number the question
 * shows (it was the mean over every sample, a death counting all our HP). A line with no winning sample comes last.
 */
export function wonLoss(line: BossSimLineResult): number {
  return line.hpLossWon?.median ?? Infinity;
}
/** The fight plan is shown on turn 1 and every this many turns after. */
export const BOSS_LINES_PLAN_EVERY = 3;
/** An action goes into the fight plan when at least this share of the best line's winning samples take it. */
export const BOSS_LINES_PLAN_SHARE = 0.5;

function envWorkers(): number | null {
  const n = Number(process.env["BOSS_SIM_WORKERS"]);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

/** The switch (BOSS_SIM_LINES=off) and test hooks. `serial`: run the samples in this thread (tests; no deadline inside a sample). */
export const bossLinesOptions: {
  enabled: boolean;
  /**
   * BOSS_SIM_LOW_TRUST: when a low-trust boss's fight is simulated. "retry" (default, Dai 2026-10-02): only on an SL retry,
   * where SL_RETRY_SHOW_SIM shows its numbers; on a first attempt its numbers only went to the decision log, at up to 25 s
   * a question and most of the machine's cores (Kaiser Crab 80-150 s a fight before it was trusted), which cut the same
   * question's rollout. "always": as before (simulated for the log on every question).
   */
  lowTrust: "retry" | "always";
  samples: number;
  deadlineMs: number;
  turnBudgetMs: number;
  minMs: number;
  workers: number;
  seed: number;
  serial: boolean;
  now: (() => number) | null;
  /** Called with every question's result (tools/boss-sim/b2-lines.ts reads the lines' samples). */
  onSim: ((sim: BossLineSim) => void) | null;
  /** The potions' held value for the sim policy's hold (default: the potion table, boss-sim tableHoldHp). */
  holdHp: ((potionId: string, input: RolloutInput) => number | null) | null;
} = {
  enabled: process.env["BOSS_SIM_LINES"] !== "off",
  lowTrust: process.env["BOSS_SIM_LOW_TRUST"] === "always" ? "always" : "retry",
  samples: BOSS_LINES_SAMPLES,
  deadlineMs: BOSS_LINES_DEADLINE_MS,
  turnBudgetMs: BOSS_LINES_TURN_BUDGET_MS,
  minMs: BOSS_LINES_MIN_MS,
  workers: envWorkers() ?? BOSS_LINES_WORKERS,
  seed: BOSS_LINES_SEED,
  serial: false,
  now: null,
  onSim: null,
  holdHp: null,
};

/**
 * Bosses whose simulated numbers stay out of Jev's question (the 5-turn rollout keeps ranking the lines; the decision
 * log keeps the numbers), and why: B4's criteria on each boss's validation numbers from turn 1 (docs/boss-sim.md §13),
 * the data file src/sim/boss-trust.json that tools/boss-sim/trust.py writes (boss-trust.ts LOW_TRUST_B2).
 */
export const LOW_TRUST_BOSSES: Record<string, string> = LOW_TRUST_B2;

/** The boss of a fight by its enemies' ids (the encounter's key in LOW_TRUST_BOSSES and the monster DB's bosses). */
export function bossKeyOf(enemyIds: string[]): string | null {
  const ids = new Set(enemyIds);
  if (ids.has("CRUSHER") || ids.has("ROCKET")) return "KAISER_CRAB";
  if (ids.has("KIN_PRIEST")) return "THE_KIN";
  if (ids.has("QUEEN")) return "QUEEN";
  const known = ["AEONGLASS", "CEREMONIAL_BEAST", "KNOWLEDGE_DEMON", "LAGAVULIN_MATRIARCH", "SOUL_FYSH", "TEST_SUBJECT", "THE_INSATIABLE", "VANTOM", "WATERFALL_GIANT"];
  return known.find((id) => ids.has(id)) ?? null;
}

/** A live fight's low-trust reason by the state's enemies (null: a boss the simulator is trusted on, or no known boss). */
export function lowTrustOfState(state: GameState): string | null {
  const enemies = (state.raw["combat"] as { enemies?: unknown } | null | undefined)?.enemies;
  const ids = Array.isArray(enemies) ? enemies.map((e) => String((e as Record<string, unknown> | null)?.["enemy_id"] ?? "")) : [];
  const boss = bossKeyOf(ids);
  return boss ? (LOW_TRUST_BOSSES[boss] ?? null) : null;
}

// ---------------------------------------------------------------- input

export interface BossSimInputArgs {
  state: GameState;
  knowledge: Knowledge;
  memory: ScreenMemory;
  /** This turn's solver input as the rollout gets it (the random potions' expected-value cards in the hand). */
  solver: SolverInput;
  /**
   * Base draw and discard piles (rollout-live's); `drawTop` (SL_RETRY_KNOWN_DRAWS): the pile's known top cards in draw order,
   * as indices into `draw` (RolloutInput.piles.drawTop: every sample draws them first); `drawAdded` (SL_RETRY_KNOWN_INSERTS):
   * cards added to the pile at random places (RolloutInput.piles.drawAdded).
   */
  piles: { draw: CardModel[]; discard: CardModel[]; drawTop?: number[]; drawAdded?: number[] };
  /** The random potions held (potion-mc sources): sampled anew each later turn. */
  randomPotions: PotionMcSource[];
}

/** The whole-fight input of a live board: the rollout's (rollout-live boardRolloutInput, fightMetaOf) plus the turn relics and random potions. */
export function bossSimInput(args: BossSimInputArgs): RolloutInput {
  const meta = fightMetaOf(args.state, args.knowledge, args.memory);
  const { handBase, ...board } = boardRolloutInput(args.state, args.knowledge, args.solver, meta.asc);
  const runRaw = (args.state.run?.raw ?? {}) as Record<string, unknown>;
  return {
    ...board,
    plans: [],
    piles: { draw: args.piles.draw, discard: args.piles.discard, handBase, ...(args.piles.drawTop && args.piles.drawTop.length > 0 ? { drawTop: args.piles.drawTop, ...(args.piles.drawAdded && args.piles.drawAdded.length > 0 ? { drawAdded: args.piles.drawAdded } : {}) } : {}) },
    meta: { ...meta, kind: "boss" },
    mm: {},
    model: null,
    gates: null,
    fightRelics: fightRelicsOf(runRaw, args.solver.turn ?? meta.t),
    ...(args.randomPotions.length > 0 ? { randomPotions: args.randomPotions.map((source) => ({ ...source, cost: 0 })) } : {}),
  };
}

// ---------------------------------------------------------------- the synchronous worker pool

/** Messages to a worker (boss-lines-worker.ts). */
export type LinesWorkerRequest =
  | { type: "input"; job: number; input: RolloutInput; pairs: { plan: Plan | null; order: KillOrder | null }[]; maxTurns: number }
  | { type: "run"; job: number; tasks: [pair: number, sample: number, seed: number][] }
  | { type: "drop"; job: number };
export type LinesWorkerReply = { job: number; results: [pair: number, sample: number, result: FightSampleResult][] } | { job: number; error: string };

export interface PairsRun {
  /** outcomes[pair][sample]: undefined for a sample not finished by the deadline. */
  outcomes: (FightSampleResult | undefined)[][];
  /** Sample indices every pair finished (the common random numbers the lines are compared on). */
  complete: number[];
  timedOut: boolean;
  elapsedMs: number;
  workers: number;
}

interface PoolWorker {
  worker: Worker;
  port: MessagePort;
  busy: boolean;
}

/**
 * Worker threads the planner's (synchronous) thread waits on. Built once for a fight (a worker loads the solver in
 * ~0.4 s) and reused; close() when the fight is over. One run at a time. Starting its workers releases B3's build pool
 * (sim-pools.ts); a build pool starting releases this one.
 */
export class BossLinesPool {
  readonly size: number;
  private workers: PoolWorker[] = [];
  private readonly signal = new SharedArrayBuffer(8);
  private readonly flag = new Int32Array(this.signal);
  private job = 0;

  constructor(size = bossLinesOptions.workers) {
    this.size = Math.max(1, Math.min(BOSS_SIM_MAX_WORKERS, availableParallelism() - 2, Math.floor(size)));
  }

  private start(): PoolWorker[] {
    if (this.workers.length > 0) return this.workers;
    // TypeScript when this module is (tsx, vitest): the worker loads through tsx too.
    const ts = import.meta.url.endsWith(".ts");
    const url = new URL(ts ? "./boss-lines-worker.ts" : "./boss-lines-worker.js", import.meta.url);
    claimSimCores(this, "boss-lines", () => {
      if (shared === this) shared = null;
      void this.close();
    });
    for (let k = 0; k < this.size; k += 1) {
      const { port1, port2 } = new MessageChannel();
      const worker = new Worker(url, { workerData: { port: port2, signal: this.signal }, transferList: [port2], ...(ts ? { execArgv: ["--import", "tsx"] } : {}) });
      worker.unref();
      port1.unref();
      this.workers.push({ worker, port: port1, busy: false });
    }
    return this.workers;
  }

  /** Every (pair, sample) to the fight's end, sample-major, until done or `deadlineMs` of wall clock. */
  run(input: RolloutInput, pairs: { plan: Plan | null; order: KillOrder | null }[], samples: number, seed: number, deadlineMs: number, now: () => number = () => performance.now()): PairsRun {
    const started = now();
    const workers = this.start();
    const job = (this.job += 1);
    Atomics.store(this.flag, 1, job);
    const tasks: [number, number, number][] = [];
    for (let i = 0; i < samples; i += 1) for (let pair = 0; pair < pairs.length; pair += 1) tasks.push([pair, i, sampleSeed(seed, i)]);
    const chunk = Math.max(1, Math.ceil(tasks.length / (workers.length * 8)));
    const chunks: [number, number, number][][] = [];
    for (let k = 0; k < tasks.length; k += chunk) chunks.push(tasks.slice(k, k + chunk));
    const outcomes: (FightSampleResult | undefined)[][] = pairs.map(() => new Array<FightSampleResult | undefined>(samples));
    for (const w of workers) w.worker.postMessage({ type: "input", job, input, pairs, maxTurns: BOSS_SIM_MAX_TURNS } satisfies LinesWorkerRequest);
    let pending = chunks.length;
    let error: string | null = null;
    const give = (w: PoolWorker) => {
      const next = chunks.shift();
      if (!next) return;
      w.busy = true;
      w.worker.postMessage({ type: "run", job, tasks: next } satisfies LinesWorkerRequest);
    };
    for (const w of workers) if (!w.busy) give(w);
    let timedOut = false;
    while (pending > 0 && error === null) {
      const seen = Atomics.load(this.flag, 0);
      let got = false;
      for (const w of workers) {
        for (let msg = receiveMessageOnPort(w.port); msg; msg = receiveMessageOnPort(w.port)) {
          got = true;
          w.busy = false;
          const reply = msg.message as LinesWorkerReply;
          if (reply.job === job) {
            if ("error" in reply) error = reply.error;
            else {
              for (const [pair, i, result] of reply.results) outcomes[pair]![i] = result;
              pending -= 1;
            }
          }
          if (error === null) give(w);
        }
      }
      if (pending === 0 || error !== null) break;
      const left = deadlineMs - (now() - started);
      if (left <= 0) {
        timedOut = true;
        break;
      }
      if (!got) Atomics.wait(this.flag, 0, seen, Math.min(left, 250));
    }
    // Done or given up: the workers skip what is left of this job (they check the job slot between samples).
    Atomics.store(this.flag, 1, 0);
    for (const w of workers) w.worker.postMessage({ type: "drop", job } satisfies LinesWorkerRequest);
    if (error !== null) throw new Error(`boss-lines worker: ${error}`);
    const complete: number[] = [];
    for (let i = 0; i < samples; i += 1) if (outcomes.every((row) => row[i] !== undefined)) complete.push(i);
    return { outcomes, complete, timedOut, elapsedMs: Math.round(now() - started), workers: workers.length };
  }

  /** Workers running now (0 before the first run and after close()). */
  get live(): number {
    return this.workers.length;
  }

  async close(): Promise<void> {
    const workers = this.workers;
    this.workers = [];
    leaveSimCores(this);
    await Promise.all(workers.map((w) => w.worker.terminate()));
  }
}

let shared: BossLinesPool | null = null;

/** The fight's pool (built on the first boss question). */
export function bossLinesPool(): BossLinesPool {
  return (shared ??= new BossLinesPool());
}

/** Out of the boss fight: the workers go (a no-op without a pool). */
export function releaseBossLinesPool(): void {
  const pool = shared;
  shared = null;
  if (pool) void pool.close();
}

/** The same runs in this thread (tests, tools): a deadline is checked between samples. */
export function runPairsSerial(input: RolloutInput, pairs: { plan: Plan | null; order: KillOrder | null }[], samples: number, seed: number, deadlineMs = Infinity, now: () => number = () => performance.now()): PairsRun {
  const started = now();
  const outcomes: (FightSampleResult | undefined)[][] = pairs.map(() => new Array<FightSampleResult | undefined>(samples));
  let timedOut = false;
  for (let i = 0; i < samples && !timedOut; i += 1) {
    for (let pair = 0; pair < pairs.length; pair += 1) {
      if (now() - started > deadlineMs) {
        timedOut = true;
        break;
      }
      outcomes[pair]![i] = fightSampleOf(input, pairs[pair]!, sampleSeed(seed, i));
    }
  }
  const complete: number[] = [];
  for (let i = 0; i < samples; i += 1) if (outcomes.every((row) => row[i] !== undefined)) complete.push(i);
  return { outcomes, complete, timedOut, elapsedMs: Math.round(now() - started), workers: 0 };
}

/** One (line, order) sample, as the worker runs it. */
function fightSampleOf(input: RolloutInput, pair: { plan: Plan | null; order: KillOrder | null }, seed: number): FightSampleResult {
  return fightSample(input, pair.plan, seed, BOSS_SIM_MAX_TURNS, true, pair.order);
}

// ---------------------------------------------------------------- lines, best orders, ranking

export interface LinesResult {
  /** Per line (the order given): its numbers under its best kill order. */
  lines: (BossSimLineResult & { order: string | null })[];
  /** Samples every line finished, and how many were asked for. */
  samples: number;
  requested: number;
  timedOut: boolean;
  elapsedMs: number;
  workers: number;
  /** Kill orders compared per line (besides the solver's own targets). */
  orders: number;
}

/** The sim's input for these options (boss-sim slimInput at the B1.5 settings). */
export function linesInput(input: RolloutInput, holdHp = bossLinesOptions.holdHp ?? tableHoldHp): RolloutInput {
  return slimInput(input, BOSS_SIM_POLICY_NODES, BOSS_SIM_DAMAGE_SCALE, BOSS_SIM_HP_SCALE, BOSS_SIM_THREAT, BOSS_SIM_POTION_HOLD, holdHp);
}

/**
 * Every line under the solver's own targets and each kill order (fightOrders), on the same seeds, in one run; per line
 * the numbers of its best order (win rate, then the least HP lost when won, as the ranking). Only the samples
 * every (line, order) finished count, so all lines are compared on the same samples.
 */
export function runLines(
  input: RolloutInput,
  lines: Plan[],
  opts: { samples: number; seed: number; deadlineMs: number; serial?: boolean; now?: () => number; holdHp?: (potionId: string, input: RolloutInput) => number | null },
): LinesResult {
  const orders = fightOrders(input);
  const pairs = lines.flatMap((plan) => [null, ...orders].map((order) => ({ plan, order })));
  const slim = linesInput(input, opts.holdHp);
  const now = opts.now ?? (() => performance.now());
  const run = opts.serial ? runPairsSerial(slim, pairs, opts.samples, opts.seed, opts.deadlineMs, now) : bossLinesPool().run(slim, pairs, opts.samples, opts.seed, opts.deadlineMs, now);
  const per = orders.length + 1;
  const out = lines.map((_, li) => {
    let pick: (BossSimLineResult & { order: string | null }) | null = null;
    for (let k = 0; k < per; k += 1) {
      const pair = li * per + k;
      const res = { ...summarizeLine(li, run.complete.map((i) => run.outcomes[pair]![i]!)), order: k === 0 ? null : orders[k - 1]!.label };
      if (!pick || res.winProb > pick.winProb || (res.winProb === pick.winProb && wonLoss(res) < wonLoss(pick))) pick = res;
    }
    return pick!;
  });
  return { lines: out, samples: run.complete.length, requested: opts.samples, timedOut: run.timedOut, elapsedMs: run.elapsedMs, workers: run.workers, orders: orders.length };
}

export interface LinesRank {
  /** Index of the best line: the top win rate's tie group (within tieSe paired standard errors), then the least HP lost when won. */
  best: number;
  /** Lines whose numbers are the best's (win % and median HP lost when won, to one decimal): two or more, no single best. */
  tied: number[];
  /** Each line against the best (paired), null for the best itself. */
  vsBest: (LineComparison | null)[];
  /** Each line's win rate tied with the top one (within tieSe standard errors). */
  winTied: boolean[];
}

/**
 * B2's ranking (Dai): the whole-fight win rate first, ties within `tieSe` standard errors, then the least `second`
 * (wonLoss, the HP lost when won; the acceptance tool also ranks by the pre-V4.2 mean HP lost to compare).
 */
export function rankLines(lines: BossSimLineResult[], tieSe = BOSS_LINES_TIE_SE, eligible: (i: number) => boolean = () => true, second: (line: BossSimLineResult) => number = wonLoss): LinesRank {
  const idx = lines.map((_, i) => i).filter(eligible);
  if (idx.length === 0) return { best: -1, tied: [], vsBest: lines.map(() => null), winTied: lines.map(() => false) };
  let top = idx[0]!;
  for (const i of idx) {
    const a = lines[i]!;
    const b = lines[top]!;
    if (a.winProb > b.winProb || (a.winProb === b.winProb && second(a) < second(b))) top = i;
  }
  const winTied = lines.map((line, i) => {
    if (!idx.includes(i)) return false;
    if (i === top) return true;
    const c = compareLines(line, lines[top]!);
    return c.winDiff >= -tieSe * c.winSe && !(c.winSe === 0 && c.winDiff < 0);
  });
  let best = top;
  for (const i of idx) {
    if (!winTied[i]) continue;
    const a = lines[i]!;
    const b = lines[best]!;
    if (second(a) < second(b) || (second(a) === second(b) && a.winProb > b.winProb)) best = i;
  }
  const shown = (line: BossSimLineResult) => `${Math.round(line.winProb * 1000)}|${Math.round(second(line) * 10)}`;
  const tied = idx.filter((i) => winTied[i] && shown(lines[i]!) === shown(lines[best]!));
  return { best, tied: tied.length >= 2 ? tied : [], vsBest: lines.map((line, i) => (i === best ? null : compareLines(line, lines[best]!))), winTied };
}

// ---------------------------------------------------------------- texts

const pct = (x: number) => Math.round(x * 100);
const pts = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : "±"}${Math.abs(Math.round(x * 100))}`;

/** The most common value of a count table (the earliest on ties). */
function modeOf(counts: Record<number, number>): number | null {
  let best: number | null = null;
  for (const [key, n] of Object.entries(counts)) if (best === null || n > (counts[best] ?? 0) || (n === counts[best] && Number(key) < best)) best = Number(key);
  return best;
}

/** One line's whole-fight fact, e.g. "win 62% (vs the best line −3 ± 2 pts), HP lost when won median 18, ~6 turns to win; ...; 600 samples". */
export function lineSimText(line: BossSimLineResult, calibrated: number, vs: LineComparison | null, run: Pick<LinesResult, "samples" | "requested" | "timedOut">, turnNow: number, flags: { best: boolean; winTied: boolean; lowTrust: string | null }): string {
  const vsText = vs === null ? (flags.lowTrust ? "the simulation's best line" : "the best line") : `vs the ${flags.lowTrust ? "simulation's " : ""}best line ${pts(vs.winDiff)} ± ${Math.max(1, Math.round(vs.winSe * 100))} pts${flags.winTied ? ", tied on win rate" : ""}`;
  const won = line.hpLossWon ? `HP lost when won median ${Math.round(line.hpLossWon.median)}` : "no winning sample";
  const turns = line.turnsWon ? `, ~${Math.round(line.turnsWon.median)} turn${Math.round(line.turnsWon.median) === 1 ? "" : "s"} to win (this one included)` : "";
  const death = modeOf(line.deathTurns);
  const dies = line.deaths > 0 && death !== null ? `; the losing samples die most often on T${turnNow + death - 1} (dead in ${pct(line.deaths / Math.max(1, line.samples))}%)` : "";
  const capped = line.capped > 0 ? `; ${line.capped} unfinished after ${BOSS_SIM_MAX_TURNS} turns` : "";
  const n = run.timedOut ? `${run.samples} of ${run.requested} samples (time limit)` : `${run.samples} samples`;
  const order = "order" in line && typeof (line as { order?: unknown }).order === "string" ? `; later turns kill ${(line as unknown as { order: string }).order}` : "";
  return `${flags.lowTrust ? "low confidence: " : ""}win ${pct(calibrated)}% (${vsText}), ${won}${turns}${dies}${capped}${order}; ${n}`;
}

/** Names for card ids in a plan (the input's own cards; a potion by its id). */
function namesOf(input: RolloutInput): { card: (id: string) => string } {
  const cards = new Map<string, string>();
  for (const card of [...input.solver.hand, ...input.piles.draw, ...input.piles.discard]) if (!cards.has(card.cardId)) cards.set(card.cardId, card.name);
  const potion = (id: string) => input.solver.hand.find((card) => card.cardId.startsWith(`${id}:`))?.name.replace(/^potion /, "") ?? id.split(":")[1]!.toLowerCase().replace(/_/g, " ");
  return { card: (id) => cards.get(id) ?? (id.startsWith("POTION:") ? potion(id) : id) };
}

/**
 * The fight plan from the best line's winning samples (all samples when fewer than 10 won): what at least
 * BOSS_LINES_PLAN_SHARE of them do, in fight turns. Powers played by then (the median turn), the turns the enemies hit
 * hardest and their incoming damage (V4.2: not the block the samples put up, which Jev read as advice), the enemies'
 * kill turns (several enemies), the potions drunk (median turn), and the turn the fight ends. One sentence; information
 * only.
 */
export function fightPlanText(input: RolloutInput, line: BossSimLineResult, turnNow: number): string | null {
  const won = line.outcomes.filter((o) => o.won);
  const base = won.length >= 10 ? won : line.outcomes;
  if (base.length === 0) return null;
  const share = (n: number) => n / base.length >= BOSS_LINES_PLAN_SHARE;
  const names = namesOf(input);
  const T = (rel: number) => `T${turnNow + rel - 1}`;
  const median = (xs: number[]) => Math.round(quantile(xs.slice().sort((a, b) => a - b), 0.5));
  const parts: string[] = [];
  // Powers: played in most samples, at their median turn.
  const powerTurns = new Map<string, number[]>();
  for (const o of base) {
    const firsts = new Map<string, number>();
    for (const [t, id] of o.powers ?? []) if (!firsts.has(id)) firsts.set(id, t);
    for (const [id, t] of firsts) powerTurns.set(id, [...(powerTurns.get(id) ?? []), t]);
  }
  const powers = [...powerTurns.entries()].filter(([, ts]) => share(ts.length)).map(([id, ts]) => ({ id, t: median(ts) })).sort((a, b) => a.t - b.t);
  if (powers.length > 0) {
    const last = powers[powers.length - 1]!.t;
    parts.push(`${powers[0]!.t === last ? T(last) : `${T(powers[0]!.t)}–${T(last)}`} play ${powers.map((p) => names.card(p.id)).join(", ")}`);
  }
  // The hardest hits: a turn whose mean attack (samples still fighting it) is at least 1.5x the fight's median turn
  // and a quarter of our HP now; only the incoming damage (the simulated play blocks less than ours on them, §6.2).
  const byTurn = new Map<number, number[]>();
  for (const o of base) o.incomingByTurn.forEach((inc, k) => byTurn.set(k + 1, [...(byTurn.get(k + 1) ?? []), inc]));
  const turns = [...byTurn.entries()].filter(([, inc]) => share(inc.length)).map(([t, inc]) => ({ t, inc: inc.reduce((s, x) => s + x, 0) / inc.length }));
  const typical = quantile(turns.map((x) => x.inc).sort((a, b) => a - b), 0.5);
  const hp = input.solver.player.hp;
  const big = turns.filter((x) => x.t > 1 && x.inc >= Math.max(1.5 * typical, 0.25 * hp) && x.inc >= 10).slice(0, 3);
  if (big.length > 0) parts.push(`${big.map((x) => T(x.t)).join(", ")} the enemies hit hardest (incoming ~${big.map((x) => Math.round(x.inc)).join(", ~")})`);
  // Kill turns, when there are several enemies (by board index: The Kin's two Followers apart).
  if (input.solver.enemies.filter((e) => e.hp > 0).length >= 2) {
    const killT = new Map<number, number[]>();
    for (const o of base) for (const [t, , index] of o.kills ?? []) killT.set(index, [...(killT.get(index) ?? []), t]);
    const kills = [...killT.entries()].filter(([, ts]) => share(ts.length)).map(([index, ts]) => ({ index, t: median(ts) })).sort((a, b) => a.t - b.t);
    const nameOf = (index: number) => input.solver.enemies.find((e) => e.index === index)?.name ?? `enemy ${index}`;
    if (kills.length > 0) parts.push(`kill ${kills.map((k) => `${nameOf(k.index)} ~${T(k.t)}`).join(", then ")}`);
  }
  // Potions drunk by most samples.
  const drinkT = new Map<string, number[]>();
  for (const o of base) {
    const firsts = new Map<string, number>();
    for (const [t, id] of o.drinks ?? []) if (!firsts.has(id)) firsts.set(id, t);
    for (const [id, t] of firsts) drinkT.set(id, [...(drinkT.get(id) ?? []), t]);
  }
  const drinks = [...drinkT.entries()].filter(([, ts]) => share(ts.length)).map(([id, ts]) => ({ id, t: median(ts), n: ts.length }));
  if (drinks.length > 0) parts.push(`drink ${drinks.map((d) => `${names.card(`POTION:${d.id}`)} ~${T(d.t)}`).join(", ")}`);
  const end = median(base.map((o) => o.turns));
  parts.push(won.length >= 10 ? `the boss dies ~${T(end)} (median of ${won.length} winning samples)` : `no plan wins in most samples: ${won.length}/${line.outcomes.length} won, the fight ends ~${T(end)}`);
  return parts.join("; ");
}

// ---------------------------------------------------------------- the live question

export interface LineSim {
  result: BossSimLineResult & { order: string | null };
  calibrated: number;
  vsBest: LineComparison | null;
  winTied: boolean;
  text: string;
}

export type BossLineSim =
  | { available: false; reason: string; ms: number }
  | {
      available: true;
      byPlan: Map<Plan, LineSim>;
      /** The ranking's best line and the lines tied for it (null / empty for a low-trust boss: information only). */
      best: Plan | null;
      tied: Plan[];
      /** Code's fallback: the best line drinking no potion, by the same ranking (null: none, or low trust). */
      bestDry: Plan | null;
      boss: string | null;
      lowTrust: string | null;
      run: LinesResult;
      plan: string | null;
      /** The lines in the ranking's order (the tied-on-win-rate group by HP lost, then the rest by win rate), for the log. */
      order: Plan[];
    };

export interface BossLineSimArgs extends BossSimInputArgs {
  /** Every line shown (plan lines, then the random potions' median lines). */
  lines: Plan[];
  /** Lines the ranking may pick (a line code added is shown; a random potion's line is Jev's to drink). */
  eligible?: (plan: Plan) => boolean;
  turn: number | null;
  drinks: (plan: Plan) => boolean;
  /** SL_RETRY_COMPUTE (docs/sl.md §10): the samples per line on a retried fight's question (default bossLinesOptions.samples). */
  samples?: number;
}

/**
 * Questions in a row whose run gave no sample (a worker pool that died: its workers never answer, so every question
 * would wait out its deadline): at this many the simulation is off for the rest of the fight.
 */
export const BOSS_LINES_MAX_FAILURES = 2;
let failed: { fight: string; count: number } = { fight: "", count: 0 };

/** The whole-fight numbers of a boss question's lines (never throws: unavailable with a reason). */
export function bossLineSim(args: BossLineSimArgs): BossLineSim {
  const now = bossLinesOptions.now ?? (() => performance.now());
  const started = now();
  const ms = () => Math.round(now() - started);
  try {
    if (args.lines.length === 0) return { available: false, reason: "no line", ms: ms() };
    // The turn's budget over its questions (a re-plan after a draw asks again).
    const fight = `${String(args.state.raw["run_id"] ?? "")}:${args.state.run?.floor ?? "?"}`;
    if (failed.fight === fight && failed.count >= BOSS_LINES_MAX_FAILURES) return { available: false, reason: `off for this fight: ${failed.count} questions in a row got no sample from the worker pool`, ms: ms() };
    const turnKey = `${fight}:${args.turn ?? "?"}`;
    const memo = args.memory.bossLines?.turn === turnKey ? args.memory.bossLines : { turn: turnKey, spentMs: 0 };
    const left = Math.min(bossLinesOptions.deadlineMs, bossLinesOptions.turnBudgetMs - memo.spentMs);
    if (left < bossLinesOptions.minMs) return { available: false, reason: `this turn's ${Math.round(bossLinesOptions.turnBudgetMs / 1000)} s for the simulation is spent`, ms: ms() };
    const input = bossSimInput(args);
    const boss = bossKeyOf(input.enemies.map((e) => e.id));
    const lowTrust = boss ? (LOW_TRUST_BOSSES[boss] ?? null) : null;
    let run: LinesResult;
    try {
      run = runLines(input, args.lines, { samples: args.samples ?? bossLinesOptions.samples, seed: bossLinesOptions.seed, deadlineMs: left, serial: bossLinesOptions.serial, now });
    } catch (error) {
      // A worker's error: the next question starts a new pool.
      releaseBossLinesPool();
      failed = { fight, count: failed.fight === fight ? failed.count + 1 : 1 };
      throw error;
    }
    args.memory.bossLines = { turn: turnKey, spentMs: memo.spentMs + run.elapsedMs };
    if (run.samples === 0) {
      releaseBossLinesPool();
      failed = { fight, count: failed.fight === fight ? failed.count + 1 : 1 };
      return { available: false, reason: `no sample finished within ${Math.round(left / 1000)} s`, ms: ms() };
    }
    failed = { fight, count: 0 };
    const eligible = (i: number) => (args.eligible ? args.eligible(args.lines[i]!) : true);
    const rank = rankLines(run.lines, BOSS_LINES_TIE_SE, eligible);
    const dryRank = rankLines(run.lines, BOSS_LINES_TIE_SE, (i) => eligible(i) && !args.drinks(args.lines[i]!));
    const turnNow = args.turn ?? 1;
    const start = turnNow <= 1 ? "start" : "mid";
    const byPlan = new Map<Plan, LineSim>();
    run.lines.forEach((line, i) => {
      const calibrated = calibratedWinProb(line.winProb, line.samples, start);
      const vsBest = rank.vsBest[i] ?? null;
      const winTied = rank.winTied[i] ?? false;
      byPlan.set(args.lines[i]!, { result: line, calibrated, vsBest, winTied, text: lineSimText(line, calibrated, rank.best === i ? null : vsBest, run, turnNow, { best: rank.best === i, winTied, lowTrust }) });
    });
    // The ranking as a full order: the lines tied with the top win rate by HP lost when won (the best first), then the rest by win rate.
    const key = (i: number): [number, number, number] => (rank.winTied[i] ? [0, wonLoss(run.lines[i]!), -run.lines[i]!.winProb] : [1, -run.lines[i]!.winProb, wonLoss(run.lines[i]!)]);
    const cmp = (x: number, y: number) => (x === y ? 0 : x < y ? -1 : 1);
    const order = run.lines.map((_, i) => i).sort((a, b) => cmp(key(a)[0], key(b)[0]) || cmp(key(a)[1], key(b)[1]) || cmp(key(a)[2], key(b)[2]) || a - b).map((i) => args.lines[i]!);
    const showPlan = args.turn === null || args.turn <= 1 || (args.turn - 1) % BOSS_LINES_PLAN_EVERY === 0;
    const plan = showPlan && rank.best >= 0 ? fightPlanText(input, run.lines[rank.best]!, turnNow) : null;
    const sim: BossLineSim = {
      available: true,
      byPlan,
      best: lowTrust || rank.best < 0 || rank.tied.length > 0 ? null : args.lines[rank.best]!,
      tied: lowTrust ? [] : rank.tied.map((i) => args.lines[i]!),
      bestDry: lowTrust || dryRank.best < 0 ? null : args.lines[dryRank.best]!,
      boss,
      lowTrust,
      run,
      plan,
      order,
    };
    bossLinesOptions.onSim?.(sim);
    return sim;
  } catch (error) {
    return { available: false, reason: `error: ${String(error).slice(0, 160)}`, ms: ms() };
  }
}

/** The HP guard's check (B2): `plan` wins less than `pick` in the simulation, beyond BOSS_LINES_TIE_SE standard errors. */
export function simWinsLess(sim: BossLineSim | null, plan: Plan, pick: Plan): boolean {
  const a = sim?.available ? sim.byPlan.get(plan) : undefined;
  const b = sim?.available ? sim.byPlan.get(pick) : undefined;
  if (!a || !b) return false;
  const c = compareLines(a.result, b.result);
  return c.winDiff < -BOSS_LINES_TIE_SE * c.winSe;
}

/** The question's note on the numbers (state.whole_fight_sim; a low-trust boss's question has none). */
export function simNote(sim: BossLineSim): string {
  if (!sim.available) return `whole-fight simulation unavailable (${sim.reason})`;
  const how = `each option's whole_fight_sim: that line this turn, then the simulator's own play to the fight's end, ${sim.run.samples} samples per line on the same random numbers (${sim.run.timedOut ? `cut from ${sim.run.requested} by the time limit, ` : ""}${(sim.run.elapsedMs / 1000).toFixed(1)} s); the win rate is calibrated on logged boss fights, the difference to the best line is paired (± standard error)`;
  return `${how}. rollout_best is the line with the highest simulated win rate (lines within ${BOSS_LINES_TIE_SE} standard errors of it count as tied), then the least HP lost when won (median); the 5-turn rollout's numbers stay for reference`;
}

/** The decision log's record (log.boss_sim). */
export function simLog(sim: BossLineSim, keyOf: (plan: Plan) => string | null, extra: Record<string, JsonValue> = {}): Record<string, JsonValue> {
  if (!sim.available) return { available: false, reason: sim.reason, ms: sim.ms, ...extra };
  const lines: Record<string, JsonValue> = {};
  for (const [plan, line] of sim.byPlan) {
    const key = keyOf(plan);
    if (!key) continue;
    lines[key] = {
      win: Math.round(line.result.winProb * 1000) / 1000,
      cal: Math.round(line.calibrated * 1000) / 1000,
      d: line.vsBest ? Math.round(line.vsBest.winDiff * 1000) / 1000 : 0,
      se: line.vsBest ? Math.round(line.vsBest.winSe * 1000) / 1000 : 0,
      loss: line.result.hpLoss.mean,
      won_loss: line.result.hpLossWon?.median ?? null,
      order: line.result.order,
    };
  }
  return {
    available: true,
    ms: sim.run.elapsedMs,
    samples: sim.run.samples,
    requested: sim.run.requested,
    timed_out: sim.run.timedOut,
    orders: sim.run.orders,
    workers: sim.run.workers,
    boss: sim.boss,
    low_trust: sim.lowTrust !== null,
    best: sim.best ? keyOf(sim.best) : null,
    tied: sim.tied.map((plan) => keyOf(plan) ?? "?"),
    ranked: sim.order.map((plan) => keyOf(plan) ?? "?"),
    lines,
    ...(sim.plan ? { plan: sim.plan } : {}),
    ...extra,
  };
}

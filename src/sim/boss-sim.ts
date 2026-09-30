/**
 * Whole boss fight simulator (milestone B1, Dai 2026-09-30): from a fight state, every sample plays the fight to its
 * end (the boss dead or we are) instead of the rollout's 5-turn window, so what decides a boss fight (a dozen turns of
 * play, whether the deck out-damages the boss) is simulated rather than extrapolated by the rollout's terminal estimate
 * or the boss clock. Not wired into play and not shown to Jev or DeepSeek (B2 / B3 will; docs/boss-sim.md).
 *
 * It is the rollout's own simulation (src/strategy/rollout.ts simulateFight): the same cards, piles, enemy move model,
 * status cards, potions (a held potion is a 0-energy card with its cost; 0 in a boss fight, potion-cost.ts) and the
 * turn solver as the policy, with no horizon, no terminal estimate and no time budget, plus the scripts a long fight
 * exposes (fightNextMove: the Beast's Plow, the Queen's Amalgam switch, the Matriarch's sleep, death and phase moves,
 * Multi Claw's growing hits).
 *
 * Per line (the start turn's play; B2 compares every candidate line of a turn): `samples` samples, sample i seeded by
 * sampleSeed(seed, i) whatever the line, so two lines (or two decks) are compared on common random numbers; each
 * enemy's moves come from its own stream (the same enemy moves for every line while the enemies' histories agree).
 * A sample stops at the fight's end or after `maxTurns` turns (capped: not a win, counted apart).
 *
 * Parallel: BossSimPool runs the (line, sample) pairs on worker threads (at most BOSS_SIM_MAX_WORKERS); every pair is
 * a pure function of the input, the line and its seed, so the pool's result equals runBossSim's (serial) exactly.
 */

import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";

import { simulateFight, type KillOrder, type RolloutInput } from "../strategy/rollout.js";
import type { Plan } from "../strategy/turn-solver.js";

/** The most turns a sample plays (the start turn included): logged A7-A9 boss fights ran 2-24 turns (median 9). */
export const BOSS_SIM_MAX_TURNS = 30;
/** Node cap of the policy's solver call each simulated turn (the rollout's fast policy). */
export const BOSS_SIM_POLICY_NODES = 1500;
export const BOSS_SIM_SAMPLES = 100;
export const BOSS_SIM_SEED = 1;
/**
 * The policy's damage weight scale (BossSimOptions.damageScale; 1 = the live planner's own weights). The logged boss
 * fights blocked more than the solver's best line does (at the same enemy attacks and about the same damage dealt, the
 * simulated turns let ~40% more HP through: docs/boss-sim.md); of 1, 0.7, 0.5 and 0.3, 0.5 forecast them best (Brier,
 * 422 fights from turn 1). Fitted on the backtest's own fights: one number, but in-sample.
 */
export const BOSS_SIM_DAMAGE_SCALE = 0.5;
/** Worker threads at most: the machine has 32 cores and the live runs keep some (Dai: at most 24). */
export const BOSS_SIM_MAX_WORKERS = 24;

export interface BossSimOptions {
  samples?: number;
  seed?: number;
  maxTurns?: number;
  policyNodes?: number;
  /** The whole-fight scripts (rollout.ts fightNextMove etc.; default true). False: the rollout's simulation without its horizon. */
  scripts?: boolean;
  /**
   * The policy's damage weight times this (turn-solver SolverInput.damageScale; default BOSS_SIM_DAMAGE_SCALE). The
   * solver's one-turn weights (a boss's damage 0.8 an HP) are the live planner's; the backtest measures which scale
   * plays the logged fights' way (docs/boss-sim.md).
   */
  damageScale?: number;
  /**
   * A kill order for every line's later turns (the rollout's KillOrder: the policy aims at its first group alive, with
   * ORDER_FOCUS_BONUS), null for the solver's own targets. B2 runs one per order on the same seeds, as the rollout does.
   */
  order?: KillOrder | null;
}

/** One sample of one line, played to the fight's end. */
export interface FightSampleResult {
  won: boolean;
  died: boolean;
  /** Stopped at maxTurns (or the policy had no line) with the fight still on: neither won nor lost. */
  capped: boolean;
  /** A time limit ended it unwon (the Battleworn Dummy; no boss has one). */
  timeUp: boolean;
  /** Turns played from the start state, the start turn included (1: the fight ended on it). */
  turns: number;
  /** HP lost from the start state to the fight's end: all of it (and the revives' HP) at a death. */
  hpLoss: number;
  /** Revives spent (Fairy in a Bottle, Lizard Tail). */
  revived: number;
  /** Potion ids drunk, in order. */
  drunk: string[];
  /** HP the enemies had left to take off at the end (0 when won): later phases, spawns, a reattaching segment. */
  enemyHpLeft: number;
  /**
   * Per turn played (index 0 = the start turn): HP lost, damage dealt, the enemies' attack shown (the living ones at the
   * end of our turn) and the HP it took through our block.
   */
  lossByTurn: number[];
  dmgByTurn: number[];
  incomingByTurn: number[];
  enemyLossByTurn: number[];
  policyTurns: number;
  policyNodes: number;
}

export interface Dist {
  mean: number;
  median: number;
  p25: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
}

export interface BossSimLineResult {
  /** Index of the line in the lines given. */
  line: number;
  samples: number;
  wins: number;
  deaths: number;
  capped: number;
  timeUps: number;
  winProb: number;
  /** HP lost to the fight's end over every sample (a death counts all our HP). */
  hpLoss: Dist;
  /** Over the won samples only; null without one. */
  hpLossWon: Dist | null;
  /** Turns to the fight's end over every sample (a capped sample counts maxTurns). */
  turns: Dist;
  turnsWon: Dist | null;
  /** The turn of death (from the start state, 1 = the start turn): count by turn, and its spread; null without a death. */
  deathTurns: Record<number, number>;
  deathTurn: Dist | null;
  /** Samples that drank each potion (by id). */
  potions: Record<string, number>;
  /** Mean HP the enemies had left in the samples not won. */
  enemyHpLeftUnwon: number | null;
  /**
   * Turn by turn (1 = the start turn): samples still fighting it, their mean HP lost and damage dealt that turn, and
   * the samples alive / won by its end. B2's per-turn plan reads this.
   */
  perTurn: { turn: number; fighting: number; loss: number; dmg: number; incoming: number; enemyLoss: number; alive: number; won: number }[];
  policyTurns: number;
  policyNodes: number;
  /** Per sample, by sample index (common random numbers: sample i of every line had the same seed). */
  outcomes: FightSampleResult[];
}

export interface BossSimResult {
  lines: BossSimLineResult[];
  samples: number;
  maxTurns: number;
  seed: number;
  policyNodes: number;
  scripts: boolean;
  damageScale: number;
  /** Worker threads used (0: serial). */
  workers: number;
  elapsedMs: number;
}

/** Sample i's seed, the same for every line and every deck compared under `seed` (common random numbers). */
export function sampleSeed(seed: number, i: number): number {
  return (Math.imul(seed >>> 0, 0x2c1b3c6d) + Math.imul(i + 1, 0x297a2d39)) >>> 0 || 1;
}

/** The input a sample needs, without what a whole fight never reads (the terminal's model, gates, move-model data, the plans, the clock). */
export function slimInput(input: RolloutInput, policyNodes = BOSS_SIM_POLICY_NODES, damageScale = BOSS_SIM_DAMAGE_SCALE): RolloutInput {
  const handSize = input.options?.handSize;
  return {
    ...input,
    plans: [],
    model: null,
    gates: null,
    mm: {},
    options: { policyNodes, ...(damageScale !== 1 ? { policyDamageScale: damageScale } : {}), ...(handSize !== undefined ? { handSize } : {}) },
  };
}

/** One sample of one line to the fight's end. `input` as slimInput makes it (options.policyNodes is the policy's cap). */
export function fightSample(input: RolloutInput, plan: Plan, seed: number, maxTurns = BOSS_SIM_MAX_TURNS, scripts = true, order: KillOrder | null = null): FightSampleResult {
  const { records, policyTurns, policyNodes } = simulateFight(input, plan, maxTurns, seed, scripts, order);
  const startHp = input.solver.player.hp;
  const lossCap = startHp + (input.solver.player.revives ?? []).reduce((sum, revive) => sum + revive.hp, 0);
  const last = records[records.length - 1];
  const won = last?.won === true;
  const died = last?.died === true;
  const timeUp = !won && !died && last?.timeUp === true;
  const lost = records.reduce((sum, r) => sum + r.loss, 0);
  const enemyHpLeft = won || !last ? 0 : last.hpLeft ? Object.values(last.hpLeft).reduce((sum, hp) => sum + hp, 0) : last.snap.E.reduce((sum, e) => sum + (e[5] ? Math.max(0, e[2]) : 0), 0);
  return {
    won,
    died,
    capped: !won && !died && !timeUp,
    timeUp,
    turns: records.length,
    hpLoss: died ? lossCap : Math.min(lossCap, Math.max(0, lost)),
    revived: records.reduce((sum, r) => sum + (r.revived ?? 0), 0),
    drunk: records.flatMap((r) => r.drunk ?? []),
    enemyHpLeft: Math.round(enemyHpLeft * 10) / 10,
    lossByTurn: records.map((r) => Math.round(r.loss * 10) / 10),
    dmgByTurn: records.map((r) => Math.round(r.dmg * 10) / 10),
    incomingByTurn: records.map((r) => r.snap.E.reduce((sum, e) => sum + (e[5] ? e[7] : 0), 0)),
    enemyLossByTurn: records.map((r) => Math.round(r.enemyPart * 10) / 10),
    policyTurns,
    policyNodes,
  };
}

/** Quantile with linear interpolation (numpy's default), of sorted values. */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const at = (sorted.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (at - lo);
}

export function dist(values: number[]): Dist {
  const sorted = values.slice().sort((a, b) => a - b);
  const r = (x: number) => Math.round(x * 100) / 100;
  return {
    mean: r(sorted.reduce((sum, x) => sum + x, 0) / Math.max(1, sorted.length)),
    median: r(quantile(sorted, 0.5)),
    p25: r(quantile(sorted, 0.25)),
    p75: r(quantile(sorted, 0.75)),
    p90: r(quantile(sorted, 0.9)),
    min: sorted[0] ?? NaN,
    max: sorted[sorted.length - 1] ?? NaN,
  };
}

function perTurnOf(outcomes: FightSampleResult[]): BossSimLineResult["perTurn"] {
  const longest = Math.max(0, ...outcomes.map((o) => o.turns));
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const out: BossSimLineResult["perTurn"] = [];
  for (let t = 1; t <= longest; t += 1) {
    const fighting = outcomes.filter((o) => o.turns >= t);
    out.push({
      turn: t,
      fighting: fighting.length,
      loss: r1(fighting.reduce((sum, o) => sum + (o.lossByTurn[t - 1] ?? 0), 0) / Math.max(1, fighting.length)),
      dmg: r1(fighting.reduce((sum, o) => sum + (o.dmgByTurn[t - 1] ?? 0), 0) / Math.max(1, fighting.length)),
      incoming: r1(fighting.reduce((sum, o) => sum + (o.incomingByTurn[t - 1] ?? 0), 0) / Math.max(1, fighting.length)),
      enemyLoss: r1(fighting.reduce((sum, o) => sum + (o.enemyLossByTurn[t - 1] ?? 0), 0) / Math.max(1, fighting.length)),
      alive: outcomes.filter((o) => !(o.died && o.turns <= t)).length,
      won: outcomes.filter((o) => o.won && o.turns <= t).length,
    });
  }
  return out;
}

/** A line's numbers from its samples (by sample index). */
export function summarizeLine(line: number, outcomes: FightSampleResult[]): BossSimLineResult {
  const won = outcomes.filter((o) => o.won);
  const dead = outcomes.filter((o) => o.died);
  const deathTurns: Record<number, number> = {};
  for (const o of dead) deathTurns[o.turns] = (deathTurns[o.turns] ?? 0) + 1;
  const potions: Record<string, number> = {};
  for (const o of outcomes) for (const id of new Set(o.drunk)) potions[id] = (potions[id] ?? 0) + 1;
  const unwon = outcomes.filter((o) => !o.won);
  return {
    line,
    samples: outcomes.length,
    wins: won.length,
    deaths: dead.length,
    capped: outcomes.filter((o) => o.capped).length,
    timeUps: outcomes.filter((o) => o.timeUp).length,
    winProb: outcomes.length > 0 ? won.length / outcomes.length : 0,
    hpLoss: dist(outcomes.map((o) => o.hpLoss)),
    hpLossWon: won.length > 0 ? dist(won.map((o) => o.hpLoss)) : null,
    turns: dist(outcomes.map((o) => o.turns)),
    turnsWon: won.length > 0 ? dist(won.map((o) => o.turns)) : null,
    deathTurns,
    deathTurn: dead.length > 0 ? dist(dead.map((o) => o.turns)) : null,
    potions,
    enemyHpLeftUnwon: unwon.length > 0 ? Math.round((unwon.reduce((sum, o) => sum + o.enemyHpLeft, 0) / unwon.length) * 10) / 10 : null,
    perTurn: perTurnOf(outcomes),
    policyTurns: outcomes.reduce((sum, o) => sum + o.policyTurns, 0),
    policyNodes: outcomes.reduce((sum, o) => sum + o.policyNodes, 0),
    outcomes,
  };
}

/** Line a against line b on the same samples (common random numbers): paired differences and their standard errors. */
export interface LineComparison {
  samples: number;
  /** a's win rate minus b's, and its standard error (paired: sample i of both had the same seed). */
  winDiff: number;
  winSe: number;
  /** a's mean HP lost to the fight's end minus b's (a death = all HP), and its standard error. */
  hpLossDiff: number;
  hpLossSe: number;
  /** Samples a won and b did not, and the other way round. */
  onlyA: number;
  onlyB: number;
}

/** B2 compares a turn's lines, B3 a deck with and without a card: the paired numbers of two lines' samples. */
export function compareLines(a: BossSimLineResult, b: BossSimLineResult): LineComparison {
  const n = Math.min(a.outcomes.length, b.outcomes.length);
  const paired = (f: (o: FightSampleResult) => number) => {
    const d = Array.from({ length: n }, (_, i) => f(a.outcomes[i]!) - f(b.outcomes[i]!));
    const mean = d.reduce((sum, x) => sum + x, 0) / Math.max(1, n);
    const variance = n > 1 ? d.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1) : 0;
    return { mean, se: Math.sqrt(variance / Math.max(1, n)) };
  };
  const win = paired((o) => (o.won ? 1 : 0));
  const loss = paired((o) => o.hpLoss);
  const r = (x: number) => Math.round(x * 10000) / 10000;
  let onlyA = 0;
  let onlyB = 0;
  for (let i = 0; i < n; i += 1) {
    if (a.outcomes[i]!.won && !b.outcomes[i]!.won) onlyA += 1;
    if (b.outcomes[i]!.won && !a.outcomes[i]!.won) onlyB += 1;
  }
  return { samples: n, winDiff: r(win.mean), winSe: r(win.se), hpLossDiff: r(loss.mean), hpLossSe: r(loss.se), onlyA, onlyB };
}

function settings(opts: BossSimOptions): Required<BossSimOptions> {
  return {
    samples: Math.max(1, Math.floor(opts.samples ?? BOSS_SIM_SAMPLES)),
    seed: opts.seed ?? BOSS_SIM_SEED,
    maxTurns: Math.max(1, Math.floor(opts.maxTurns ?? BOSS_SIM_MAX_TURNS)),
    policyNodes: opts.policyNodes ?? BOSS_SIM_POLICY_NODES,
    scripts: opts.scripts ?? true,
    damageScale: opts.damageScale ?? BOSS_SIM_DAMAGE_SCALE,
    order: opts.order ?? null,
  };
}

/** Every line to the fight's end, `samples` times each, in this thread. */
export function runBossSim(input: RolloutInput, lines: Plan[], opts: BossSimOptions = {}): BossSimResult {
  const started = performance.now();
  const s = settings(opts);
  const slim = slimInput(input, s.policyNodes, s.damageScale);
  const out = lines.map((plan, line) => summarizeLine(line, Array.from({ length: s.samples }, (_, i) => fightSample(slim, plan, sampleSeed(s.seed, i), s.maxTurns, s.scripts, s.order))));
  return { lines: out, samples: s.samples, maxTurns: s.maxTurns, seed: s.seed, policyNodes: s.policyNodes, scripts: s.scripts, damageScale: s.damageScale, workers: 0, elapsedMs: Math.round(performance.now() - started) };
}

/** Worker threads by default: the cores less 4, at most BOSS_SIM_MAX_WORKERS. */
export function defaultWorkers(): number {
  return Math.max(1, Math.min(BOSS_SIM_MAX_WORKERS, availableParallelism() - 4));
}

/** Messages to a worker (boss-sim-worker.ts). */
export type WorkerRequest =
  | { type: "input"; job: number; input: RolloutInput; lines: Plan[]; maxTurns: number; scripts: boolean; order: KillOrder | null }
  | { type: "run"; job: number; tasks: [line: number, sample: number, seed: number][] }
  | { type: "drop"; job: number };
export type WorkerReply = { job: number; results: [line: number, sample: number, result: FightSampleResult][] } | { job: number; error: string };

/**
 * A pool of worker threads running whole-fight samples. Reuse one pool for many runs (a worker's start-up, the solver
 * and the knowledge modules loading, is ~0.3 s); close() it when done. Runs are queued one at a time.
 */
export class BossSimPool {
  readonly size: number;
  private workers: Worker[] = [];
  private job = 0;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(size = defaultWorkers()) {
    this.size = Math.max(1, Math.min(BOSS_SIM_MAX_WORKERS, Math.floor(size)));
  }

  private start(): Worker[] {
    if (this.workers.length > 0) return this.workers;
    // The worker is TypeScript when this module is (tsx, vitest): it loads through tsx too.
    const ts = import.meta.url.endsWith(".ts");
    const url = new URL(ts ? "./boss-sim-worker.ts" : "./boss-sim-worker.js", import.meta.url);
    for (let k = 0; k < this.size; k += 1) {
      const worker = new Worker(url, ts ? { execArgv: ["--import", "tsx"] } : {});
      worker.unref();
      this.workers.push(worker);
    }
    return this.workers;
  }

  /** As runBossSim, on the pool's threads: the same numbers. */
  run(input: RolloutInput, lines: Plan[], opts: BossSimOptions = {}): Promise<BossSimResult> {
    const next = this.queue.then(() => this.runNow(input, lines, opts));
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async runNow(input: RolloutInput, lines: Plan[], opts: BossSimOptions): Promise<BossSimResult> {
    const started = performance.now();
    const s = settings(opts);
    const workers = this.start();
    const job = (this.job += 1);
    const tasks: [number, number, number][] = [];
    // Sample-major: the lines' samples of one seed go together (a chunk compares its lines on the same seeds).
    for (let i = 0; i < s.samples; i += 1) for (let line = 0; line < lines.length; line += 1) tasks.push([line, i, sampleSeed(s.seed, i)]);
    // Small chunks, handed out as workers free up (samples differ a lot in length: a quick death, a 25-turn win).
    const chunk = Math.max(1, Math.ceil(tasks.length / (workers.length * 6)));
    const chunks: [number, number, number][][] = [];
    for (let k = 0; k < tasks.length; k += chunk) chunks.push(tasks.slice(k, k + chunk));
    const results: FightSampleResult[][] = lines.map(() => new Array<FightSampleResult>(s.samples));
    const slim = slimInput(input, s.policyNodes, s.damageScale);
    const used = workers.slice(0, Math.min(workers.length, chunks.length));
    await new Promise<void>((resolve, reject) => {
      let pending = chunks.length;
      let failed = false;
      const give = (worker: Worker) => {
        const tasksOf = chunks.shift();
        if (tasksOf) worker.postMessage({ type: "run", job, tasks: tasksOf } satisfies WorkerRequest);
      };
      const cleanup = () => {
        for (const worker of used) {
          worker.off("message", handlers.get(worker)!);
          worker.off("error", errors.get(worker)!);
          worker.postMessage({ type: "drop", job } satisfies WorkerRequest);
        }
      };
      const handlers = new Map<Worker, (reply: WorkerReply) => void>();
      const errors = new Map<Worker, (error: Error) => void>();
      for (const worker of used) {
        const onMessage = (reply: WorkerReply) => {
          if (reply.job !== job || failed) return;
          if ("error" in reply) {
            failed = true;
            cleanup();
            reject(new Error(`boss-sim worker: ${reply.error}`));
            return;
          }
          for (const [line, i, result] of reply.results) results[line]![i] = result;
          pending -= 1;
          if (pending === 0) {
            cleanup();
            resolve();
          } else give(worker);
        };
        const onError = (error: Error) => {
          if (failed) return;
          failed = true;
          cleanup();
          reject(error);
        };
        handlers.set(worker, onMessage);
        errors.set(worker, onError);
        worker.on("message", onMessage);
        worker.on("error", onError);
        worker.postMessage({ type: "input", job, input: slim, lines, maxTurns: s.maxTurns, scripts: s.scripts, order: s.order } satisfies WorkerRequest);
        give(worker);
      }
    });
    return {
      lines: results.map((outcomes, line) => summarizeLine(line, outcomes)),
      samples: s.samples,
      maxTurns: s.maxTurns,
      seed: s.seed,
      policyNodes: s.policyNodes,
      scripts: s.scripts,
      damageScale: s.damageScale,
      workers: used.length,
      elapsedMs: Math.round(performance.now() - started),
    };
  }

  async close(): Promise<void> {
    const workers = this.workers;
    this.workers = [];
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}

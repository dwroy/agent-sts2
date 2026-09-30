/**
 * Whole boss fights for many decks at once, with a deadline (milestone B3, docs/boss-sim.md §11): a deck-building
 * question compares every option's deck (and HP) against the current one on the same seeds, within its time budget.
 *
 * A run is one base input (the synthetic pre-fight start, boss-start.ts) and K decks, each given as the top-level
 * fields it changes (the draw pile, the solver's HP or potions, relic fields), under every kill order. Sample i has
 * seed sampleSeed(seed, i) for every deck and order (common random numbers). Tasks go out sample-major (a block of
 * samples for every deck and order before the next block), so when the deadline comes every deck has about the same
 * samples done; `complete` lists the samples every deck finished, the ones a paired comparison can use.
 *
 * Two runners: SerialDeckRunner (this thread; tests, tools) and BuildSimPool (worker threads, reused for the whole
 * run: a worker's start-up is ~0.4 s). Every sample is a pure function of its input, order and seed, so both give the
 * same numbers for the samples they finish.
 */

import { Worker } from "node:worker_threads";

import type { KillOrder, RolloutInput } from "../strategy/rollout.js";
import { BOSS_SIM_MAX_TURNS, BOSS_SIM_MAX_WORKERS, defaultWorkers, fightSample, sampleSeed, slimInput, type FightSampleResult } from "./boss-sim.js";

/** Samples per task (one deck, one order): small enough that a deadline is kept to ~0.1 s. */
export const BUILD_SIM_BLOCK = 8;

export interface DeckRunRequest {
  /** The base input (not slimmed: slimInput is applied here, to the base and to every deck). */
  base: RolloutInput;
  /** Each deck as the top-level fields it changes over the base ({} = the base itself). */
  decks: Partial<RolloutInput>[];
  /** Per deck, the samples it runs: all (null / absent), or those with i % of === at (a mixture split over decks). */
  stripes?: ({ at: number; of: number } | null)[];
  /** Kill orders to run every deck under (null: the solver's own targets). */
  orders: (KillOrder | null)[];
  samples: number;
  seed: number;
  maxTurns?: number;
  scripts?: boolean;
  /** Milliseconds from the call after which no more tasks are started; the samples done by then are returned. */
  deadlineMs?: number;
  /** The clock (default performance.now); tests pass their own. */
  now?: () => number;
}

export interface DeckRunResult {
  /** outcomes[deck][order][sample], undefined where not run (the deadline, or outside the deck's stripe). */
  outcomes: (FightSampleResult | undefined)[][][];
  /** Samples every deck (whose stripe has it) finished under every order. */
  complete: number[];
  timedOut: boolean;
  elapsedMs: number;
  workers: number;
}

export interface DeckSimRunner {
  run(req: DeckRunRequest): Promise<DeckRunResult>;
  close?(): Promise<void>;
}

type Task = [deck: number, order: number, sample: number, seed: number];

/** The slimmed base and each deck's slimmed fields (only the fields it changes). */
export function slimDecks(base: RolloutInput, decks: Partial<RolloutInput>[]): { base: RolloutInput; decks: Partial<RolloutInput>[] } {
  const slimBase = slimInput(base);
  return {
    base: slimBase,
    decks: decks.map((deck) => {
      const keys = Object.keys(deck) as (keyof RolloutInput)[];
      if (keys.length === 0) return {};
      const slim = slimInput({ ...base, ...deck });
      return Object.fromEntries(keys.map((key) => [key, slim[key]])) as Partial<RolloutInput>;
    }),
  };
}

/** The tasks of a run in sample-major blocks, each block one task list per (deck, order). */
export function taskChunks(req: DeckRunRequest): Task[][] {
  const chunks: Task[][] = [];
  for (let from = 0; from < req.samples; from += BUILD_SIM_BLOCK) {
    const to = Math.min(req.samples, from + BUILD_SIM_BLOCK);
    for (let deck = 0; deck < req.decks.length; deck += 1) {
      const stripe = req.stripes?.[deck] ?? null;
      for (let order = 0; order < req.orders.length; order += 1) {
        const tasks: Task[] = [];
        for (let i = from; i < to; i += 1) if (!stripe || i % stripe.of === stripe.at) tasks.push([deck, order, i, sampleSeed(req.seed, i)]);
        if (tasks.length > 0) chunks.push(tasks);
      }
    }
  }
  return chunks;
}

/** The samples every deck finished under every order (a deck only counts for the samples of its stripe). */
export function completeSamples(req: DeckRunRequest, outcomes: (FightSampleResult | undefined)[][][]): number[] {
  const out: number[] = [];
  for (let i = 0; i < req.samples; i += 1) {
    let ok = true;
    for (let deck = 0; deck < req.decks.length && ok; deck += 1) {
      const stripe = req.stripes?.[deck] ?? null;
      if (stripe && i % stripe.of !== stripe.at) continue;
      for (let order = 0; order < req.orders.length && ok; order += 1) if (!outcomes[deck]![order]![i]) ok = false;
    }
    if (ok) out.push(i);
  }
  return out;
}

function emptyOutcomes(req: DeckRunRequest): (FightSampleResult | undefined)[][][] {
  return req.decks.map(() => req.orders.map(() => new Array<FightSampleResult | undefined>(req.samples)));
}

/** Every task in this thread, in the pool's order, stopping at the deadline. */
export class SerialDeckRunner implements DeckSimRunner {
  run(req: DeckRunRequest): Promise<DeckRunResult> {
    const now = req.now ?? (() => performance.now());
    const started = now();
    const { base, decks } = slimDecks(req.base, req.decks);
    const inputs = decks.map((deck) => ({ ...base, ...deck }));
    const outcomes = emptyOutcomes(req);
    const maxTurns = req.maxTurns ?? BOSS_SIM_MAX_TURNS;
    const scripts = req.scripts ?? true;
    let timedOut = false;
    for (const chunk of taskChunks(req)) {
      if (req.deadlineMs !== undefined && now() - started >= req.deadlineMs) {
        timedOut = true;
        break;
      }
      for (const [deck, order, i, seed] of chunk) outcomes[deck]![order]![i] = fightSample(inputs[deck]!, null, seed, maxTurns, scripts, req.orders[order] ?? null);
    }
    return Promise.resolve({ outcomes, complete: completeSamples(req, outcomes), timedOut, elapsedMs: Math.round(now() - started), workers: 0 });
  }
}

/** Messages to a worker (build-sim-worker.ts). */
export type BuildWorkerRequest =
  | { type: "batch"; batch: number; base: RolloutInput; decks: Partial<RolloutInput>[]; orders: (KillOrder | null)[]; maxTurns: number; scripts: boolean }
  | { type: "run"; batch: number; tasks: Task[] }
  | { type: "drop"; batch: number };
export type BuildWorkerReply = { batch: number; results: [deck: number, order: number, sample: number, result: FightSampleResult][] } | { batch: number; error: string };

/**
 * Worker threads for deck runs. Keep one for the whole game run (created on the first deck-building question) and
 * close() it at the end; runs are queued one at a time.
 */
export class BuildSimPool implements DeckSimRunner {
  readonly size: number;
  private workers: Worker[] = [];
  private batch = 0;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(size = defaultWorkers()) {
    this.size = Math.max(1, Math.min(BOSS_SIM_MAX_WORKERS, Math.floor(size)));
  }

  private start(): Worker[] {
    if (this.workers.length > 0) return this.workers;
    // The worker is TypeScript when this module is (tsx, vitest): it loads through tsx too.
    const ts = import.meta.url.endsWith(".ts");
    const url = new URL(ts ? "./build-sim-worker.ts" : "./build-sim-worker.js", import.meta.url);
    for (let k = 0; k < this.size; k += 1) {
      const worker = new Worker(url, ts ? { execArgv: ["--import", "tsx"] } : {});
      worker.unref();
      this.workers.push(worker);
    }
    return this.workers;
  }

  run(req: DeckRunRequest): Promise<DeckRunResult> {
    const next = this.queue.then(() => this.runNow(req));
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async runNow(req: DeckRunRequest): Promise<DeckRunResult> {
    const now = req.now ?? (() => performance.now());
    const started = now();
    const workers = this.start();
    const batch = (this.batch += 1);
    const chunks = taskChunks(req);
    const outcomes = emptyOutcomes(req);
    const { base, decks } = slimDecks(req.base, req.decks);
    const used = workers.slice(0, Math.min(workers.length, chunks.length));
    let timedOut = false;
    await new Promise<void>((resolve, reject) => {
      let pending = chunks.length;
      let finished = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const handlers = new Map<Worker, { message: (reply: BuildWorkerReply) => void; error: (error: Error) => void }>();
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        if (timer) clearTimeout(timer);
        for (const worker of used) {
          const h = handlers.get(worker)!;
          worker.off("message", h.message);
          worker.off("error", h.error);
          worker.postMessage({ type: "drop", batch } satisfies BuildWorkerRequest);
        }
        if (error) reject(error);
        else resolve();
      };
      const give = (worker: Worker) => {
        if (finished) return;
        if (req.deadlineMs !== undefined && now() - started >= req.deadlineMs) {
          timedOut = true;
          finish();
          return;
        }
        const tasks = chunks.shift();
        if (tasks) worker.postMessage({ type: "run", batch, tasks } satisfies BuildWorkerRequest);
      };
      if (chunks.length === 0) {
        resolve();
        return;
      }
      for (const worker of used) {
        const message = (reply: BuildWorkerReply) => {
          if (reply.batch !== batch || finished) return;
          if ("error" in reply) {
            finish(new Error(`build-sim worker: ${reply.error}`));
            return;
          }
          for (const [deck, order, i, result] of reply.results) outcomes[deck]![order]![i] = result;
          pending -= 1;
          if (pending === 0) finish();
          else give(worker);
        };
        const error = (err: Error) => finish(err);
        handlers.set(worker, { message, error });
        worker.on("message", message);
        worker.on("error", error);
        worker.postMessage({ type: "batch", batch, base, decks, orders: req.orders, maxTurns: req.maxTurns ?? BOSS_SIM_MAX_TURNS, scripts: req.scripts ?? true } satisfies BuildWorkerRequest);
        give(worker);
      }
      if (req.deadlineMs !== undefined) {
        timer = setTimeout(() => {
          timedOut = true;
          finish();
        }, Math.max(0, req.deadlineMs - (now() - started)));
      }
    });
    return { outcomes, complete: completeSamples(req, outcomes), timedOut, elapsedMs: Math.round(now() - started), workers: used.length };
  }

  async close(): Promise<void> {
    const workers = this.workers;
    this.workers = [];
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}

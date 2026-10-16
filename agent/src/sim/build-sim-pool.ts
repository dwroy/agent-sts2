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

import type { KillOrder, RolloutInput } from "../reflex/rollout.js";
import { BOSS_SIM_MAX_TURNS, BOSS_SIM_MAX_WORKERS, defaultWorkers, fightSample, sampleSeed, slimInput, type FightSampleResult } from "./boss-sim.js";
import { claimSimCores, leaveSimCores } from "./sim-pools.js";
import { sampleSchedule, type SampleRange } from "./sample-range.js";
import { ContinuationSampleError, type ContinuationFailure } from "./continuation-failure.js";

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
  /** Absolute [from,to) sample indices; omitted means the original full run. */
  range?: SampleRange;
  /** Original deck indices, so retained results and mixture stripes keep their identities. */
  activeDecks?: readonly number[];
  seed: number;
  maxTurns?: number;
  scripts?: boolean;
  /** Milliseconds from the call after which no more tasks are started; the samples done by then are returned. */
  deadlineMs?: number;
  /** Required live computations: reject a stalled worker, never return its partial sample set. */
  progressTimeoutMs?: number;
  onProgress?: import("./computation-wait.js").SimProgress;
  /** Opt-in telemetry; independent of the sampling clock and never sent to the solver. */
  diagnostics?: boolean;
  /** The clock (default performance.now); tests pass their own. */
  now?: () => number;
}

export interface DeckRunDiagnostics {
  queueMs: number;
  coldStart: boolean;
  preparationMs: number;
  firstReplyMs: number | null;
  chunksPlanned: number;
  chunksDispatched: number;
  chunksCompleted: number;
  outcomesCompleted: number;
}

export interface DeckRunResult {
  diagnostics?: DeckRunDiagnostics;
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
  const schedule = sampleSchedule(req.samples, req.decks.length, req.range, req.activeDecks);
  for (let from = schedule.from; from < schedule.to; from += BUILD_SIM_BLOCK) {
    const to = Math.min(schedule.to, from + BUILD_SIM_BLOCK);
    for (const deck of schedule.indices) {
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
  const schedule = sampleSchedule(req.samples, req.decks.length, req.range, req.activeDecks);
  for (let i = schedule.from; i < schedule.to; i += 1) {
    let ok = true, scheduled = false;
    for (const deck of schedule.indices) {
      if (!ok) break;
      const stripe = req.stripes?.[deck] ?? null;
      if (stripe && i % stripe.of !== stripe.at) continue;
      scheduled = true;
      for (let order = 0; order < req.orders.length && ok; order += 1) if (!outcomes[deck]![order]![i]) ok = false;
    }
    if (ok && scheduled) out.push(i);
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
    const chunks = taskChunks(req);
    const requested = chunks.reduce((n, c) => n + c.length, 0);
    let done = 0;
    for (const chunk of chunks) {
      if (req.deadlineMs !== undefined && now() - started >= req.deadlineMs) {
        timedOut = true;
        break;
      }
      for (const [deck, order, i, seed] of chunk) outcomes[deck]![order]![i] = fightSample(inputs[deck]!, null, seed, maxTurns, scripts, req.orders[order] ?? null);
      done += chunk.length;
      req.onProgress?.(done, requested);
    }
    return Promise.resolve({ outcomes, complete: completeSamples(req, outcomes), timedOut, elapsedMs: Math.round(now() - started), workers: 0 });
  }
}

/** Messages to a worker (build-sim-worker.ts). */
export type BuildWorkerRequest =
  | { type: "batch"; batch: number; base: RolloutInput; decks: Partial<RolloutInput>[]; orders: (KillOrder | null)[]; maxTurns: number; scripts: boolean; cancelled?: SharedArrayBuffer; streamResults?: boolean }
  | { type: "run"; batch: number; tasks: Task[] }
  | { type: "drop"; batch: number };
export type BuildWorkerReply = { batch: number; results: [deck: number, order: number, sample: number, result: FightSampleResult][]; partial?: boolean } | { batch: number; error: string; continuationFailure?: ContinuationFailure };

/**
 * Worker threads for deck runs. Keep one for the whole game run (its workers start on the first deck-building question)
 * and close() it at the end; runs are queued one at a time. B2's boss-line pool starting its workers (a boss fight)
 * releases these (sim-pools.ts): the next run starts them again, and starting them releases B2's.
 */
export class BuildSimPool implements DeckSimRunner {
  readonly size: number;
  private workers: Worker[] = [];
  private batch = 0;
  private queue: Promise<unknown> = Promise.resolve();
  /** Ends the run in flight (its samples so far are not returned: it rejects) when the workers go mid-run. */
  private abort: ((error: Error) => void) | null = null;

  constructor(size = defaultWorkers()) {
    this.size = Math.max(1, Math.min(BOSS_SIM_MAX_WORKERS, Math.floor(size)));
  }

  private start(): Worker[] {
    if (this.workers.length > 0) return this.workers;
    // The worker is TypeScript when this module is (tsx, vitest): it loads through tsx too.
    const ts = import.meta.url.endsWith(".ts");
    const url = new URL(ts ? "./build-sim-worker.ts" : "./build-sim-worker.js", import.meta.url);
    claimSimCores(this, "build", () => void this.close());
    for (let k = 0; k < this.size; k += 1) {
      const worker = new Worker(url, ts ? { execArgv: ["--import", "tsx"] } : {});
      worker.unref();
      this.workers.push(worker);
    }
    return this.workers;
  }

  run(req: DeckRunRequest): Promise<DeckRunResult> {
    sampleSchedule(req.samples, req.decks.length, req.range, req.activeDecks);
    const queued = performance.now();
    const started = (req.now ?? (() => performance.now()))();
    const next = this.queue.then(() => this.runNow(req, started, performance.now() - queued));
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async runNow(req: DeckRunRequest, started: number, queueMs: number): Promise<DeckRunResult> {
    const diagnosticStart = performance.now();
    const coldStart = this.workers.length === 0;
    const now = req.now ?? (() => performance.now());
    // Expired requests must not evict another pool or launch workers with no sample work to do.
    if (req.deadlineMs !== undefined && now() - started >= req.deadlineMs) {
      return { outcomes: emptyOutcomes(req), complete: [], timedOut: true, elapsedMs: Math.round(now() - started), workers: 0,
        ...(req.diagnostics ? { diagnostics: { queueMs: Math.round(queueMs), coldStart,
          preparationMs: Math.round(performance.now() - diagnosticStart), firstReplyMs: null,
          chunksPlanned: taskChunks(req).length, chunksDispatched: 0, chunksCompleted: 0, outcomesCompleted: 0 } } : {}) };
    }
    const workers = this.start();
    const batch = (this.batch += 1);
    // A queued drop cannot interrupt a worker's synchronous sample block.
    const cancelled = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
    const chunks = taskChunks(req);
    const requested = chunks.reduce((n, c) => n + c.length, 0);
    const outcomes = emptyOutcomes(req);
    const { base, decks } = slimDecks(req.base, req.decks);
    const used = workers.slice(0, Math.min(workers.length, chunks.length));
    const diagnostics: DeckRunDiagnostics = { queueMs: Math.round(queueMs), coldStart,
      preparationMs: Math.round(performance.now() - diagnosticStart), firstReplyMs: null,
      chunksPlanned: chunks.length, chunksDispatched: 0, chunksCompleted: 0, outcomesCompleted: 0 };
    let timedOut = false;
    await new Promise<void>((resolve, reject) => {
      let pending = chunks.length;
      let finished = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let progressTimer: ReturnType<typeof setTimeout> | null = null;
      const handlers = new Map<Worker, { message: (reply: BuildWorkerReply) => void; error: (error: Error) => void; exit?: (code: number) => void }>();
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        Atomics.store(cancelled, 0, 1);
        this.abort = null;
        if (timer) clearTimeout(timer);
        if (progressTimer) clearTimeout(progressTimer);
        for (const worker of used) {
          const h = handlers.get(worker)!;
          worker.off("message", h.message);
          worker.off("error", h.error);
          if (h.exit) worker.off("exit", h.exit);
          worker.postMessage({ type: "drop", batch } satisfies BuildWorkerRequest);
        }
        if (error) reject(error);
        else resolve();
      };
      const noteProgress = () => {
        if (req.progressTimeoutMs === undefined || finished) return;
        if (progressTimer) clearTimeout(progressTimer);
        progressTimer = setTimeout(() => finish(new Error("required build-sim worker made no progress; no partial result accepted")), req.progressTimeoutMs);
      };
      const give = (worker: Worker) => {
        if (finished) return;
        if (req.deadlineMs !== undefined && now() - started >= req.deadlineMs) {
          timedOut = true;
          finish();
          return;
        }
        const tasks = chunks.shift();
        if (tasks) {
          diagnostics.chunksDispatched += 1;
          worker.postMessage({ type: "run", batch, tasks } satisfies BuildWorkerRequest);
        }
      };
      if (chunks.length === 0) {
        resolve();
        return;
      }
      this.abort = finish;
      for (const worker of used) {
        const message = (reply: BuildWorkerReply) => {
          if (reply.batch !== batch || finished) return;
          if ("error" in reply) {
            finish(reply.continuationFailure
              ? new ContinuationSampleError(`build-sim worker: ${reply.error}`, reply.continuationFailure)
              : new Error(`build-sim worker: ${reply.error}`));
            return;
          }
          diagnostics.firstReplyMs ??= Math.round(performance.now() - diagnosticStart);
          diagnostics.outcomesCompleted += reply.results.length;
          req.onProgress?.(diagnostics.outcomesCompleted, requested);
          if (reply.results.length > 0) noteProgress();
          for (const [deck, order, i, result] of reply.results) outcomes[deck]![order]![i] = result;
          // A completed sample is usable before the rest of its block finishes.
          if (reply.partial) return;
          diagnostics.chunksCompleted += 1;
          pending -= 1;
          if (pending === 0) finish();
          else give(worker);
        };
        const error = (err: Error) => finish(err);
        const exit = req.progressTimeoutMs === undefined ? undefined
          : (code: number) => finish(new Error(`required build-sim worker exited (${code}); no partial result accepted`));
        handlers.set(worker, { message, error, ...(exit ? { exit } : {}) });
        worker.on("message", message);
        worker.on("error", error);
        if (exit) worker.on("exit", exit);
        worker.postMessage({ type: "batch", batch, base, decks, orders: req.orders, maxTurns: req.maxTurns ?? BOSS_SIM_MAX_TURNS, scripts: req.scripts ?? true, cancelled: cancelled.buffer as SharedArrayBuffer, streamResults: true } satisfies BuildWorkerRequest);
      }
      // Attach every handler before a zero remaining budget can finish the batch.
      for (const worker of used) give(worker);
      noteProgress();
      if (req.deadlineMs !== undefined && !finished) {
        timer = setTimeout(() => {
          timedOut = true;
          finish();
        }, Math.max(0, req.deadlineMs - (now() - started)));
      }
    }).catch(async (error: unknown) => {
      // A dead/stalled worker must not remain in the reusable pool for the next required attempt.
      if (req.progressTimeoutMs !== undefined) await this.close();
      throw error;
    });
    return { outcomes, complete: completeSamples(req, outcomes), timedOut, elapsedMs: Math.round(now() - started), workers: used.length, ...(req.diagnostics ? { diagnostics } : {}) };
  }

  /** Workers running now (0 before the first run and after close()). */
  get live(): number {
    return this.workers.length;
  }

  async close(): Promise<void> {
    this.abort?.(new Error("build-sim pool released mid-run"));
    const workers = this.workers;
    this.workers = [];
    leaveSimCores(this);
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}

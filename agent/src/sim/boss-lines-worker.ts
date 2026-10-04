/**
 * A BossLinesPool worker (src/sim/boss-lines.ts, B2): keeps each job's input and (line, kill order) pairs, runs the
 * (pair, sample, seed) tasks it is sent with fightSample, and posts the results on its own port, then bumps the shared
 * counter so the planner's thread, waiting synchronously (Atomics.wait), wakes up. A task of a job no longer current
 * (the shared job slot changed: the planner's deadline passed) is skipped. No clock, no files, no model calls.
 */

import { parentPort, workerData, type MessagePort } from "node:worker_threads";

import type { KillOrder, RolloutInput } from "../reflex/rollout.js";
import type { Plan } from "../reflex/turn-solver.js";
import { fightSample, type FightSampleResult } from "./boss-sim.js";
import type { LinesWorkerReply, LinesWorkerRequest } from "./boss-lines.js";

const { port, signal } = workerData as { port: MessagePort; signal: SharedArrayBuffer };
const flag = new Int32Array(signal);
const jobs = new Map<number, { input: RolloutInput; pairs: { plan: Plan | null; order: KillOrder | null }[]; maxTurns: number }>();

function reply(message: LinesWorkerReply): void {
  port.postMessage(message);
  Atomics.add(flag, 0, 1);
  Atomics.notify(flag, 0);
}

parentPort!.on("message", (msg: LinesWorkerRequest) => {
  if (msg.type === "input") {
    jobs.set(msg.job, { input: msg.input, pairs: msg.pairs, maxTurns: msg.maxTurns });
    return;
  }
  if (msg.type === "drop") {
    jobs.delete(msg.job);
    return;
  }
  const job = jobs.get(msg.job);
  if (!job) {
    reply({ job: msg.job, results: [] });
    return;
  }
  try {
    const results: [pair: number, sample: number, result: FightSampleResult][] = [];
    for (const [pair, i, seed] of msg.tasks) {
      // The planner gave up on this job (its deadline): the rest of the chunk is not needed.
      if (Atomics.load(flag, 1) !== msg.job) break;
      const { plan, order } = job.pairs[pair]!;
      results.push([pair, i, fightSample(job.input, plan, seed, job.maxTurns, true, order)]);
    }
    reply({ job: msg.job, results });
  } catch (error) {
    reply({ job: msg.job, error: String(error instanceof Error ? error.stack ?? error.message : error).slice(0, 2000) });
  }
});

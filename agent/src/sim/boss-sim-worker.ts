/**
 * A BossSimPool worker (src/sim/boss-sim.ts): keeps each job's input and lines, runs the (line, sample, seed) tasks it
 * is sent with fightSample and posts the results back. Nothing else: no clock, no files, no model calls.
 */

import { parentPort } from "node:worker_threads";

import type { KillOrder, RolloutInput } from "../reflex/rollout.js";
import type { Plan } from "../reflex/turn-solver.js";
import { fightSample, type WorkerReply, type WorkerRequest } from "./boss-sim.js";

const jobs = new Map<number, { input: RolloutInput; lines: (Plan | null)[]; maxTurns: number; scripts: boolean; order: KillOrder | null }>();

parentPort!.on("message", (msg: WorkerRequest) => {
  if (msg.type === "input") {
    jobs.set(msg.job, { input: msg.input, lines: msg.lines, maxTurns: msg.maxTurns, scripts: msg.scripts, order: msg.order });
    return;
  }
  if (msg.type === "drop") {
    jobs.delete(msg.job);
    return;
  }
  const job = jobs.get(msg.job);
  let reply: WorkerReply;
  try {
    if (!job) throw new Error(`no input for job ${msg.job}`);
    reply = { job: msg.job, results: msg.tasks.map(([line, i, seed]) => [line, i, fightSample(job.input, job.lines[line] ?? null, seed, job.maxTurns, job.scripts, job.order)]) };
  } catch (error) {
    reply = { job: msg.job, error: String(error instanceof Error ? error.stack ?? error.message : error).slice(0, 2000) };
  }
  parentPort!.postMessage(reply);
});

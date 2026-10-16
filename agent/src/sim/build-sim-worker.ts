/**
 * A BuildSimPool worker (src/sim/build-sim-pool.ts, milestone B3): keeps each batch's base input and its decks (each a
 * few top-level fields over the base: the draw pile, the solver's HP or potions, relic fields) and the kill orders,
 * runs the (deck, order, sample, seed) tasks it is sent with boss-sim fightSample and posts the results back.
 * Checks the parent's cancellation flag between samples: no clock, files, or model calls.
 */

import { parentPort } from "node:worker_threads";

import type { KillOrder, RolloutInput } from "../reflex/rollout.js";
import { fightSample } from "./boss-sim.js";
import type { BuildWorkerReply, BuildWorkerRequest } from "./build-sim-pool.js";
import { continuationFailureOf, type ContinuationFailure } from "./continuation-failure.js";

interface Batch {
  base: RolloutInput;
  decks: Partial<RolloutInput>[];
  inputs: Map<number, RolloutInput>;
  orders: (KillOrder | null)[];
  maxTurns: number;
  scripts: boolean;
  cancelled?: Int32Array;
  streamResults?: boolean;
}

const batches = new Map<number, Batch>();

function inputOf(batch: Batch, deck: number): RolloutInput {
  let input = batch.inputs.get(deck);
  if (!input) {
    input = { ...batch.base, ...(batch.decks[deck] ?? {}) };
    batch.inputs.set(deck, input);
  }
  return input;
}

parentPort!.on("message", (msg: BuildWorkerRequest) => {
  if (msg.type === "batch") {
    // A running pre-deployment parent may create a fresh worker from the updated file.
    batches.set(msg.batch, { base: msg.base, decks: msg.decks, inputs: new Map(), orders: msg.orders, maxTurns: msg.maxTurns, scripts: msg.scripts, ...(msg.cancelled ? { cancelled: new Int32Array(msg.cancelled) } : {}), streamResults: msg.streamResults });
    return;
  }
  if (msg.type === "drop") {
    batches.delete(msg.batch);
    return;
  }
  const batch = batches.get(msg.batch);
  let reply: BuildWorkerReply;
  let task: ContinuationFailure["task"];
  try {
    if (!batch) throw new Error(`no input for batch ${msg.batch}`);
    const results: Extract<BuildWorkerReply, { results: unknown }>["results"] = [];
    for (const [deck, order, i, seed] of msg.tasks) {
      task = [deck, order, i, seed];
      // A sample already running stays whole; cancelled work produces no synthetic outcome.
      if (batch.cancelled && Atomics.load(batch.cancelled, 0)) break;
      const result: typeof results[number] = [deck, order, i, fightSample(inputOf(batch, deck), null, seed, batch.maxTurns, batch.scripts, batch.orders[order] ?? null)];
      // Opt in so a pre-deployment parent still receives exactly one reply per block.
      if (batch.streamResults) parentPort!.postMessage({ batch: msg.batch, results: [result], partial: true } satisfies BuildWorkerReply);
      else results.push(result);
    }
    reply = { batch: msg.batch, results };
  } catch (error) {
    const failure = continuationFailureOf(error);
    reply = { batch: msg.batch, error: String(error instanceof Error ? error.stack ?? error.message : error).slice(0, 2000),
      ...(failure ? { continuationFailure: { ...failure, ...(task ? { task } : {}) } } : {}) };
  }
  parentPort!.postMessage(reply);
});

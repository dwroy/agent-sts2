/**
 * A BuildSimPool worker (src/sim/build-sim-pool.ts, milestone B3): keeps each batch's base input and its decks (each a
 * few top-level fields over the base: the draw pile, the solver's HP or potions, relic fields) and the kill orders,
 * runs the (deck, order, sample, seed) tasks it is sent with boss-sim fightSample and posts the results back.
 * Nothing else: no clock, no files, no model calls.
 */

import { parentPort } from "node:worker_threads";

import type { KillOrder, RolloutInput } from "../strategy/rollout.js";
import { fightSample } from "./boss-sim.js";
import type { BuildWorkerReply, BuildWorkerRequest } from "./build-sim-pool.js";

interface Batch {
  base: RolloutInput;
  decks: Partial<RolloutInput>[];
  inputs: Map<number, RolloutInput>;
  orders: (KillOrder | null)[];
  maxTurns: number;
  scripts: boolean;
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
    batches.set(msg.batch, { base: msg.base, decks: msg.decks, inputs: new Map(), orders: msg.orders, maxTurns: msg.maxTurns, scripts: msg.scripts });
    return;
  }
  if (msg.type === "drop") {
    batches.delete(msg.batch);
    return;
  }
  const batch = batches.get(msg.batch);
  let reply: BuildWorkerReply;
  try {
    if (!batch) throw new Error(`no input for batch ${msg.batch}`);
    reply = {
      batch: msg.batch,
      results: msg.tasks.map(([deck, order, i, seed]) => [deck, order, i, fightSample(inputOf(batch, deck), null, seed, batch.maxTurns, batch.scripts, batch.orders[order] ?? null)]),
    };
  } catch (error) {
    reply = { batch: msg.batch, error: String(error instanceof Error ? error.stack ?? error.message : error).slice(0, 2000) };
  }
  parentPort!.postMessage(reply);
});

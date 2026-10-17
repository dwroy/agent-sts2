/** In-process worker protocol: no real worker, network or refreshed knowledge input. */
import { EventEmitter } from "node:events";
import { afterEach, expect, it, vi } from "vitest";
import * as rollout from "../src/reflex/rollout.js";
import { BuildSimPool, type BuildWorkerRequest } from "../src/sim/build-sim-pool.js";
import { continuationFailureOf } from "../src/sim/continuation-failure.js";
import { board } from "./boss-sim-fixture.js";
const fake = vi.hoisted(() => ({ workers: [] as any[], port: null as any, replies: [] as any[] }));
vi.mock("node:worker_threads", async () => {
  const { EventEmitter } = await import("node:events");
  fake.port = new EventEmitter();
  fake.port.postMessage = (reply: unknown) => fake.replies.push(reply);
  return { parentPort: fake.port, Worker: class extends EventEmitter {
    messages: BuildWorkerRequest[] = [];
    constructor() { super(); fake.workers.push(this); }
    unref() {}
    postMessage(message: BuildWorkerRequest) { this.messages.push(message); }
    async terminate() { return 0; }
  } };
});
import "../src/sim/build-sim-worker.js";
afterEach(() => { vi.restoreAllMocks(); fake.workers.length = 0; fake.replies.length = 0; });

it("carries a full failure through the actual worker handler and pool rejection despite the 2000-character stack limit", async () => {
  const input = board({ bossHp: 12 });
  input.continuation = { variants: [{ boss: "SECOND", count: 1, input: board() }], potions: [], source: "synthetic", limitation: "not historical reproduction" };
  const trajectory = rollout.simulateFight(input, null, 5, 17);
  vi.spyOn(rollout, "simulateFight").mockReturnValue({ ...trajectory, records: trajectory.records.map((row, i, rows) => i !== rows.length - 1 ? row : {
    ...row, won: true, died: false, resources: { hp: -2, revives: [], drunkKeys: ["POTION:BLOCK_POTION:0"] },
  }) });
  const pool = new BuildSimPool(1);
  const pending = pool.run({ base: input, decks: [{}], orders: [null], samples: 1, seed: 17, maxTurns: 5 });
  const caught = pending.catch((error: unknown) => error);
  await vi.waitFor(() => expect(fake.workers).toHaveLength(1));
  const worker = fake.workers[0]!;
  const batch = worker.messages.find((message: BuildWorkerRequest) => message.type === "batch")!;
  const task = worker.messages.find((message: BuildWorkerRequest) => message.type === "run")!;
  fake.port.emit("message", batch);
  fake.port.emit("message", task);
  const reply = fake.replies.at(-1)!;
  expect(reply.error.length).toBeLessThanOrEqual(2000);
  expect(reply.continuationFailure).toMatchObject({ schema: "continuation-failure-v1", capture: "complete", task: task.tasks[0] });
  expect(reply.continuationFailure.payload.length).toBeGreaterThan(2000);
  worker.emit("message", structuredClone(reply));
  const error = await caught;
  expect(continuationFailureOf(error)).toEqual(reply.continuationFailure);
  expect((error as Error).message).toContain("nonpositive-hp");
  await pool.close();
});

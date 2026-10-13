import { afterEach, describe, expect, it, vi } from "vitest";
import type { RolloutInput } from "../src/reflex/rollout.js";
import type { BuildWorkerReply, BuildWorkerRequest } from "../src/sim/build-sim-pool.js";

const fixed = vi.hoisted(() => ({
  handle: null as ((message: BuildWorkerRequest) => void) | null,
  reply: vi.fn(),
  sample: vi.fn(),
  workers: [] as Array<{ messages: BuildWorkerRequest[]; emit: (event: string, reply: BuildWorkerReply) => void }>,
}));

vi.mock("node:worker_threads", async () => {
  const { EventEmitter } = await import("node:events");
  return {
    parentPort: { on: (_event: string, handle: typeof fixed.handle) => { fixed.handle = handle; }, postMessage: fixed.reply },
    Worker: class extends EventEmitter {
      messages: BuildWorkerRequest[] = [];
      constructor() { super(); fixed.workers.push(this); }
      unref() {}
      postMessage(message: BuildWorkerRequest) { this.messages.push(message); }
      terminate() { return Promise.resolve(0); }
    },
  };
});
vi.mock("../src/sim/boss-sim.js", () => ({
  BOSS_SIM_MAX_TURNS: 30, BOSS_SIM_MAX_WORKERS: 24, defaultWorkers: () => 1,
  fightSample: fixed.sample, sampleSeed: (seed: number, i: number) => seed + i,
  slimInput: (input: RolloutInput) => input,
}));
vi.mock("../src/sim/sim-pools.js", () => ({ claimSimCores: vi.fn(), leaveSimCores: vi.fn() }));

const { BuildSimPool } = await import("../src/sim/build-sim-pool.js");
await import("../src/sim/build-sim-worker.js");
const input = {} as RolloutInput;
const outcome = { won: true, hpLoss: 0 };
const pools: InstanceType<typeof BuildSimPool>[] = [];

afterEach(async () => {
  for (const pool of pools.splice(0)) await pool.close();
  vi.useRealTimers();
  fixed.sample.mockReset();
  fixed.reply.mockReset();
  fixed.workers.splice(0);
});

function workerBatch(batch: number, cancelled: Int32Array) {
  fixed.handle!({ type: "batch", batch, base: input, decks: [{}], orders: [null], maxTurns: 30,
    scripts: true, cancelled: cancelled.buffer as SharedArrayBuffer });
}

function block(batch: number) {
  fixed.handle!({ type: "run", batch, tasks: Array.from({ length: 8 }, (_, i) => [0, 0, i, 100 + i]) });
}

describe("cancelled build simulation batches", () => {
  // 1269Y20SKHUM F37: warm order search timed out without a reply; comparison reused the same workers.
  it("signals cancellation at the deadline, ignores late replies and gives the next batch its own flag", async () => {
    vi.useFakeTimers();
    const pool = new BuildSimPool(1); pools.push(pool);
    const request = { base: input, decks: [{}], orders: [null], samples: 8, seed: 100, deadlineMs: 10 };
    const first = pool.run(request);
    await Promise.resolve();
    const worker = fixed.workers[0]!;
    const batch = worker.messages.find((message) => message.type === "batch")!;
    expect(batch.type).toBe("batch");
    if (batch.type !== "batch") throw new Error("missing fixed batch");
    expect(batch.cancelled).toBeInstanceOf(SharedArrayBuffer);
    const firstFlag = new Int32Array(batch.cancelled);
    expect(Atomics.load(firstFlag, 0)).toBe(0);
    await vi.advanceTimersByTimeAsync(10);
    expect(await first).toMatchObject({ complete: [], timedOut: true });
    expect(Atomics.load(firstFlag, 0)).toBe(1);
    expect(worker.messages).toContainEqual({ type: "drop", batch: batch.batch });

    const second = pool.run(request);
    await Promise.resolve();
    const next = worker.messages.filter((message) => message.type === "batch").at(-1)!;
    if (next.type !== "batch") throw new Error("missing next fixed batch");
    const nextFlag = new Int32Array(next.cancelled);
    expect(next.cancelled).not.toBe(batch.cancelled);
    expect(Atomics.load(nextFlag, 0)).toBe(0);
    worker.emit("message", { batch: batch.batch, results: [[0, 0, 0, outcome as never]] });
    worker.emit("message", { batch: next.batch, results: Array.from({ length: 8 }, (_, i) => [0, 0, i, outcome as never]) });
    expect(await second).toMatchObject({ complete: [0, 1, 2, 3, 4, 5, 6, 7], timedOut: false });
    expect(Atomics.load(nextFlag, 0)).toBe(1);
  });

  it("stops the old block after its current sample and leaves the next batch's seeds and results intact", () => {
    const cancelled = new Int32Array(new SharedArrayBuffer(4));
    workerBatch(101, cancelled);
    fixed.sample.mockImplementationOnce(() => { Atomics.store(cancelled, 0, 1); return outcome; });
    fixed.sample.mockReturnValue(outcome);
    block(101);
    expect(fixed.sample).toHaveBeenCalledTimes(1);
    expect(fixed.reply).toHaveBeenLastCalledWith({ batch: 101, results: [[0, 0, 0, outcome]] });

    workerBatch(102, new Int32Array(new SharedArrayBuffer(4)));
    block(102);
    expect(fixed.sample).toHaveBeenCalledTimes(9);
    expect(fixed.sample.mock.calls.slice(1).map((call) => call[2])).toEqual([100, 101, 102, 103, 104, 105, 106, 107]);
    expect(fixed.reply).toHaveBeenLastCalledWith({ batch: 102,
      results: Array.from({ length: 8 }, (_, i) => [0, 0, i, outcome]) });
    fixed.handle!({ type: "drop", batch: 101 });
    fixed.handle!({ type: "drop", batch: 102 });
  });

  it("does no sample work when cancellation arrives before the queued run starts", () => {
    const cancelled = new Int32Array(new SharedArrayBuffer(4));
    workerBatch(103, cancelled);
    Atomics.store(cancelled, 0, 1);
    fixed.sample.mockReturnValue(outcome);
    block(103);
    expect(fixed.sample).not.toHaveBeenCalled();
    expect(fixed.reply).toHaveBeenLastCalledWith({ batch: 103, results: [] });
    fixed.handle!({ type: "drop", batch: 103 });
  });

  it("finishes a zero remaining phase budget before dispatching samples to any worker", async () => {
    const pool = new BuildSimPool(2); pools.push(pool);
    const result = await pool.run({ base: input, decks: [{}], orders: [null], samples: 16, seed: 100,
      deadlineMs: 0, now: () => 0 });
    expect(result).toMatchObject({ complete: [], timedOut: true });
    for (const worker of fixed.workers) {
      expect(worker.messages.some((message) => message.type === "run")).toBe(false);
      const batch = worker.messages.find((message) => message.type === "batch")!;
      if (batch.type !== "batch") throw new Error("missing zero-budget batch");
      expect(Atomics.load(new Int32Array(batch.cancelled), 0)).toBe(1);
      expect(worker.messages).toContainEqual({ type: "drop", batch: batch.batch });
    }
  });

  it("keeps old running parents compatible with a freshly loaded worker", () => {
    fixed.handle!({ type: "batch", batch: 104, base: input, decks: [{}], orders: [null], maxTurns: 30,
      scripts: true });
    fixed.sample.mockReturnValue(outcome);
    block(104);
    expect(fixed.sample).toHaveBeenCalledTimes(8);
    expect(fixed.reply).toHaveBeenLastCalledWith({ batch: 104,
      results: Array.from({ length: 8 }, (_, i) => [0, 0, i, outcome]) });
    fixed.handle!({ type: "drop", batch: 104 });
  });
});

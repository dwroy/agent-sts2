import { afterEach, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { BuildSimPool, type BuildWorkerRequest } from "../src/sim/build-sim-pool.js";
import { board } from "./boss-sim-fixture.js";
import { fightSample, slimInput } from "../src/sim/boss-sim.js";

vi.mock("node:worker_threads", async (original) => ({
  ...await original<typeof import("node:worker_threads")>(),
  Worker: class extends EventEmitter {
    static instances: unknown[] = [];
    messages: BuildWorkerRequest[] = [];
    terminated = false;
    constructor() { super(); fakeWorkers.push(this); }
    unref() {}
    postMessage(message: BuildWorkerRequest) { this.messages.push(message); }
    async terminate() { this.terminated = true; return 0; }
  },
}));
interface FakeWorker extends EventEmitter { messages: BuildWorkerRequest[]; terminated: boolean }
const fakeWorkers: FakeWorker[] = [];
afterEach(() => { fakeWorkers.length = 0; vi.useRealTimers(); });
const request = () => ({ base: board({ bossHp: 12 }), decks: [{}], orders: [null], samples: 2, seed: 1, progressTimeoutMs: 50 });

it.each(["stall", "exit", "error"])("rejects %s without partial output and creates a fresh pool on retry", async (failure) => {
  vi.useFakeTimers();
  const pool = new BuildSimPool(1);
  const pending = pool.run(request());
  const rejected = expect(pending).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(0);
  const first = fakeWorkers[0]!;
  if (failure === "exit") first.emit("exit", 0);
  else if (failure === "error") first.emit("error", new Error("fixed worker failure"));
  else await vi.advanceTimersByTimeAsync(51);
  await rejected;
  expect(first.terminated).toBe(true);
  expect(pool.live).toBe(0);
  const retried = pool.run(request());
  await vi.advanceTimersByTimeAsync(0);
  const next = fakeWorkers[1]!;
  expect(next).not.toBe(first);
  const batch = next.messages.find((m) => m.type === "batch")!.batch;
  const outcome = fightSample(slimInput(board({ bossHp: 12 })), null, 1);
  // Actual sample progress, rather than total elapsed time, resets the watchdog.
  await vi.advanceTimersByTimeAsync(40);
  next.emit("message", { batch, partial: true, results: [[0, 0, 0, outcome]] });
  await vi.advanceTimersByTimeAsync(40);
  next.emit("message", { batch, results: [[0, 0, 1, outcome]] });
  expect(await retried).toMatchObject({ complete: [0, 1], timedOut: false });
  expect(next.listenerCount("exit")).toBe(0);
  await pool.close();
});

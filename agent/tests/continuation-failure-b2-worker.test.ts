/** Synthetic B2 protocol/consumer checks; no original YZW/RQ failure is reproduced. */
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deserialize } from "node:v8";
import { afterEach, expect, it, vi } from "vitest";
import * as rollout from "../src/reflex/rollout.js";
import { board } from "./boss-sim-fixture.js";
import { solveTurn } from "../src/reflex/turn-solver.js";
import { createScreenMemory } from "../src/memory/types.js";
import { bossLineSim, bossLinesOptions, BossLinesPool, releaseBossLinesPool, runLines, simLog, simNote, type BossLineSimArgs, type LinesWorkerRequest } from "../src/sim/boss-lines.js";
import { CONTINUATION_CAPTURE_BYTES, continuationFailureOf } from "../src/sim/continuation-failure.js";

const fake = vi.hoisted(() => ({ parent: null as any, activePort: null as any, signal: new SharedArrayBuffer(8), replies: [] as any[], requests: [] as any[], continuation: null as any }));
vi.mock("node:worker_threads", async () => {
  const { EventEmitter } = await import("node:events");
  fake.parent = new EventEmitter();
  return {
    parentPort: fake.parent,
    workerData: { signal: fake.signal, port: { postMessage: (reply: unknown) => {
      const copy = structuredClone(reply);
      fake.replies.push(copy);
      fake.activePort.queue.push({ message: copy });
    } } },
    MessageChannel: class {
      port1 = { queue: [] as unknown[], unref() {} };
      port2 = this.port1;
    },
    receiveMessageOnPort: (port: any) => port.queue.shift(),
    Worker: class {
      constructor(_url: unknown, private options: any) {}
      unref() {}
      postMessage(message: LinesWorkerRequest) {
        fake.requests.push(structuredClone(message));
        fake.activePort = this.options.workerData.port;
        if (message.type === "run") Atomics.store(new Int32Array(fake.signal), 1, message.job);
        fake.parent.emit("message", structuredClone(message));
      }
      async terminate() { return 0; }
    },
  };
});
vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(), knowledgeDataDirs: () => [],
}));
vi.mock("../src/reflex/rollout-live.js", async (original) => ({
  ...await original<typeof import("../src/reflex/rollout-live.js")>(),
  boardRolloutInput: () => ({ ...board({ bossHp: 12 }), ...(fake.continuation ? { continuation: fake.continuation } : {}), handBase: [] }),
  fightMetaOf: () => board({ bossHp: 12 }).meta, fightRelicsOf: () => ({}),
}));
import "../src/sim/boss-lines-worker.js";
const original = { ...bossLinesOptions };
const folders: string[] = [];
const folder = () => { const dir = mkdtempSync(join(tmpdir(), "continuation-b2-")); folders.push(dir); return dir; };
afterEach(() => {
  releaseBossLinesPool(); Object.assign(bossLinesOptions, original); vi.restoreAllMocks(); vi.unstubAllEnvs();
  fake.replies.length = 0; fake.requests.length = 0; fake.continuation = null;
  for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function invalidFirst(extra = "x".repeat(4000)) {
  const input = board({ bossHp: 12 });
  input.continuation = { variants: [{ boss: "SECOND", count: 1, input: board() }], potions: [], source: "synthetic", limitation: "not historical reproduction" };
  fake.continuation = input.continuation;
  const first = rollout.simulateFight(input, null, 5, 17);
  vi.spyOn(rollout, "simulateFight").mockReturnValue({ ...first, records: first.records.map((row, i, rows) => i !== rows.length - 1 ? row : {
    ...row, won: true, died: false, resources: { hp: -2, revives: [], drunkKeys: ["POTION:BLOCK_POTION:0"] }, traceMarker: extra,
  }) });
  return input;
}
function args(directory: string): BossLineSimArgs {
  const input = board({ bossHp: 12 });
  return { state: { raw: { run_id: "synthetic-B2-only" }, turn: 1, run: { floor: 1, ascension: 10, raw: { character_id: "SILENT" } } },
    knowledge: {}, memory: createScreenMemory("COMBAT"), solver: input.solver, piles: input.piles, randomPotions: [],
    lines: solveTurn(input.solver).plans.slice(0, 1), turn: 1, drinks: () => false, samples: 600, requiredComplete: true,
    failureDirectory: directory } as unknown as BossLineSimArgs;
}
function configure() { vi.stubEnv("SIM_ADAPTIVE", "off"); Object.assign(bossLinesOptions, { serial: false, workers: 1, now: () => 0 }); }

it("B2 actual worker and pool preserve line/order/sample/seed and full V8 replay bytes beyond the summary", async () => {
  configure(); const input = invalidFirst();
  const pool = new BossLinesPool(1);
  const plan = solveTurn(input.solver).plans[0]!;
  const order = { label: "synthetic-order", targets: [0] } as unknown as rollout.KillOrder;
  let caught: unknown;
  try { pool.run(input, [{ plan, order, lineIndex: 3, orderIndex: 2 }], 1, 17, Infinity); } catch (error) { caught = error; }
  const failure = continuationFailureOf(caught);
  expect(failure).toMatchObject({ capture: "complete", lineTask: { pair: 0, line: 3, order: 2, sample: 0 } });
  const request = fake.requests.find((msg) => msg.type === "run");
  expect(failure!.lineTask!.seed).toBe(request.tasks[0][2]);
  expect(fake.replies[0].error.length).toBeLessThanOrEqual(2000);
  expect(failure!.payload!.length).toBeGreaterThan(2000);
  expect(failure).toEqual(fake.replies[0].continuationFailure);
  const raw = Buffer.from(failure!.payload!, "base64");
  expect(createHash("sha256").update(raw).digest("hex")).toBe(failure!.sha256);
  const replay = deserialize(raw);
  expect(replay.input).toEqual(input);
  expect(replay.sample).toMatchObject({ plan, order, seed: request.tasks[0][2], maxTurns: 30, scripts: true });
  expect(replay.first).toMatchObject({ won: true, died: false, resources: { hp: -2, revives: [], drunkKeys: ["POTION:BLOCK_POTION:0"] } });
  expect(replay.first.failureTrajectory.at(-1)).toHaveProperty("resourceAudit");
  await pool.close();
});

it("B2 actual worker results and flattened identities remain usable for a legal fixed input", () => {
  configure(); const input = board({ bossHp: 12 });
  const lines = solveTurn(input.solver).plans.slice(0, 2);
  const result = runLines(input, lines, { samples: 2, seed: 17, deadlineMs: Infinity, now: () => 0, holdHp: () => null });
  expect(result).toMatchObject({ samples: 2, requested: 2, timedOut: false });
  expect(result.lines).toHaveLength(2);
  const pairs = fake.requests.find((msg) => msg.type === "input").pairs;
  expect(pairs.filter((pair: any) => pair.orderIndex === 0).map((pair: any) => pair.lineIndex)).toEqual([0, 1]);
  expect(fake.replies.every((reply) => !reply.error && !reply.continuationFailure)).toBe(true);
});

it("B2 actual worker/pool/consumer persist one immutable run/question envelope with C1 pending/pending/degraded and no numbers", () => {
  configure(); invalidFirst(); const dir = folder(); const a = args(dir);
  let saved: Buffer | undefined, path = "";
  for (let i = 1; i <= 3; i++) {
    const sim = bossLineSim(a), log = simLog(sim, () => "plan1");
    expect(sim).toMatchObject({ available: false, completion: { status: i < 3 ? "pending" : "degraded", attempts: i, samples: 0, requested: 600 } });
    expect(simNote(sim).length).toBeLessThan(220);
    expect(log.lines).toBeUndefined(); expect(log.samples).toBeUndefined(); expect(log.best).toBeUndefined();
    const ref = log.resource_failure as any;
    expect(ref).toMatchObject({ complete: true, status: i === 1 ? "saved" : "deduplicated" });
    path ||= ref.path; expect(ref.path).toBe(path);
    const raw = readFileSync(path); if (saved) expect(raw).toEqual(saved); else saved = raw;
    const envelope = JSON.parse(raw.toString());
    expect(envelope.question).toMatchObject({ run: "synthetic-B2-only", label: "combat/plan", lane: "boss-lines", question_key: sim.completion!.key });
    expect(envelope.sample.lineTask).toMatchObject({ pair: 0, line: 0, order: 0, sample: 0 });
    expect(JSON.stringify(log)).not.toContain(envelope.sample.payload);
    expect(simNote(sim)).not.toContain(ref.path); expect(simNote(sim)).not.toContain(envelope.sample.payload);
  }
  expect(readdirSync(dir)).toHaveLength(1);
  const changedTurn = bossLineSim({ ...a, turn: 2, state: { ...a.state, turn: 2 }, memory: createScreenMemory("COMBAT") });
  expect(changedTurn.resourceFailure!.path).not.toBe(path);
  const changedRun = bossLineSim({ ...a, state: { ...a.state, raw: { run_id: "different-synthetic-run" } }, memory: createScreenMemory("COMBAT") });
  expect(changedRun.resourceFailure!.path).not.toBe(path);
  expect(readdirSync(dir)).toHaveLength(2);
});

it.each(["oversize", "storage_failed"] as const)("B2 consumer explicitly reports %s without changing the computation or emitting payload/numbers", (mode) => {
  configure(); invalidFirst(mode === "oversize" ? "x".repeat(CONTINUATION_CAPTURE_BYTES + 100) : "fixed");
  const dir = folder(), a = args(mode === "storage_failed" ? join(dir, "not-directory") : dir);
  if (mode === "storage_failed") writeFileSync(a.failureDirectory!, "occupied");
  const sim = bossLineSim(a), log = simLog(sim, () => "plan1");
  expect(sim).toMatchObject({ available: false, completion: { status: "pending", samples: 0, requested: 600 } });
  expect(log.resource_failure).toMatchObject({ status: mode, complete: false });
  expect(JSON.stringify(log)).not.toContain('"payload":');
  expect(log.lines).toBeUndefined(); expect(log.samples).toBeUndefined();
});

it("plain B2 worker errors retain the old bounded unavailable result without a fabricated envelope", () => {
  configure(); vi.spyOn(rollout, "simulateFight").mockImplementation(() => { throw new Error("ordinary worker error " + "x".repeat(3000)); });
  const sim = bossLineSim(args(folder())), log = simLog(sim, () => "plan1");
  expect(sim).toMatchObject({ available: false, completion: { status: "pending", samples: 0 } });
  expect(sim.resourceFailure).toBeUndefined(); expect(log.resource_failure).toBeUndefined();
  expect(fake.replies[0].error.length).toBe(2000);
  expect(fake.replies[0].continuationFailure).toBeUndefined();
  expect(simNote(sim).length).toBeLessThan(220); expect(log.lines).toBeUndefined();
});

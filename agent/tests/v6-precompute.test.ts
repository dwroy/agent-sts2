import { expect, it, vi } from "vitest";
import { V6IdlePrecomputer } from "../src/sim/v6-precompute.js";
import { v6Config } from "../src/v6/config.js";
import type { V6ProjectionRequest, V6ProjectionTable } from "../src/sim/v6-projection.js";
function request(context = "context-a"): V6ProjectionRequest {
  return { config: v6Config({ V6_BUILD: "shadow" }), phase: "pick", character: "silent", ascension: 10, act: 1,
    baseline: { id: "skip", state: { cards: [], relics: [], hp: 40, maxHp: 60, gold: 0, floor: 5, cap: null } }, options: [],
    directions: [], weights: {}, targets: [], completionSources: [], seed: 1, modelVersion: "frozen", contextDigest: context,
    prepare: () => null, trust: () => ({ value: "unknown", labels: [] }) };
}
const table = { schema: "v6-projection-table-v1" } as V6ProjectionTable;
it("starts only in a sufficiently long explicit idle window and serializes foreground pool use", async () => {
  let finish!: (value: V6ProjectionTable) => void;
  const precompute = vi.fn((_request: V6ProjectionRequest) => new Promise<V6ProjectionTable>(resolve => { finish = resolve; }));
  const idle = new V6IdlePrecomputer({ precompute }), req = request(); idle.schedule(req);
  expect(await idle.runIdle({ contextDigest: req.contextDigest, isIdle: false, available_ms: 5000 })).toMatchObject({ status: "busy" });
  expect(await idle.runIdle({ contextDigest: req.contextDigest, isIdle: true, available_ms: 4999 })).toMatchObject({ status: "busy" });
  const background = idle.runIdle({ contextDigest: req.contextDigest, isIdle: true, available_ms: 5000 });
  await Promise.resolve(); expect(precompute).toHaveBeenCalledTimes(1);
  let acquired = false; const foreground = idle.acquireForeground().then(release => { acquired = true; return release; });
  await Promise.resolve(); expect(acquired).toBe(false);
  finish(table); expect((await background).status).toBe("computed"); const release = await foreground;
  idle.schedule(request("new"));
  expect((await idle.runIdle({ contextDigest: "new", isIdle: true, available_ms: 5000 })).status).toBe("busy");
  release(); release();
  const second = idle.runIdle({ contextDigest: "new", isIdle: true, available_ms: 5000 }); await Promise.resolve();
  finish(table); expect((await second).status).toBe("computed"); expect(precompute).toHaveBeenCalledTimes(2);
});
it("coalesces latest snapshots and discards results invalidated during an in-flight evaluation", async () => {
  let finish!: (value: V6ProjectionTable) => void;
  const precompute = vi.fn((_request: V6ProjectionRequest) => new Promise<V6ProjectionTable>(resolve => { finish = resolve; }));
  const idle = new V6IdlePrecomputer({ precompute }), old = request(); idle.schedule(old); old.baseline.state.hp = 1;
  const work = idle.runIdle({ contextDigest: "context-a", isIdle: true, available_ms: 5000 }); await Promise.resolve();
  expect(precompute.mock.calls[0]![0].baseline.state.hp).toBe(40);
  idle.schedule(request("b")); idle.schedule(request("c")); finish(table);
  expect((await work).status).toBe("discarded");
  const next = idle.runIdle({ contextDigest: "c", isIdle: true, available_ms: 5000 }); await Promise.resolve();
  expect(precompute.mock.calls[1]![0].contextDigest).toBe("c"); finish(table); expect((await next).status).toBe("computed");
});
it("does no computation when disabled or stale and recovers from a failed background computation", async () => {
  const precompute = vi.fn(async () => { throw new Error("fixed failure"); }), idle = new V6IdlePrecomputer({ precompute });
  expect(idle.schedule({ ...request(), config: v6Config({}) })).toBe("disabled");
  expect((await idle.runIdle({ contextDigest: "context-a", isIdle: true, available_ms: 5000 })).status).toBe("idle");
  idle.schedule(request()); expect((await idle.runIdle({ contextDigest: "other", isIdle: true, available_ms: 5000 })).status).toBe("stale");
  expect(precompute).not.toHaveBeenCalled(); idle.schedule(request());
  await expect(idle.runIdle({ contextDigest: "context-a", isIdle: true, available_ms: 5000 })).rejects.toThrow("fixed failure");
  expect(idle.running).toBe(false); const release = await idle.acquireForeground(); release();
});

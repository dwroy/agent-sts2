import { afterEach, expect, it, vi } from "vitest";
import { V6ProjectionRuntime } from "../src/v6/projection-runtime.js";
import { V6CardResultsEngine } from "../src/sim/v6-card-results.js";
import { v6Digest } from "../src/sim/v6-completion.js";
import { board, env, setupOneshotTests } from "./oneshot-support.js";
import { request, FixedRunner } from "./v6-projection-fixture.js";
setupOneshotTests(); afterEach(() => vi.unstubAllEnvs());

function fixture() {
  vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_CARD_DECIDER", "jev");
  const e = env(board("xljq-f5-reward", "reward")), r = request(), runner = new FixedRunner();
  r.targets.push({ ...r.targets[0]!, id: "future", kind: "future", act: 2 });
  const prepare = vi.spyOn(r, "prepare"), card = new V6CardResultsEngine(runner, () => 0, 2);
  const evaluate = vi.spyOn(card, "evaluate"), precompute = vi.spyOn(card, "precompute");
  const create = vi.fn(() => ({ status: "ready", request: r }));
  const input = vi.fn(async () => ({ factory: { create }, situation: {} }));
  const context = vi.fn(() => ({ fingerprint: v6Digest([r.modelVersion, r.directions.map(d => d.signature)]) }));
  const legacy = { evaluate: vi.fn(), precompute: vi.fn() }, load = vi.fn(), record = vi.fn();
  const runtime = new V6ProjectionRuntime(legacy, load, undefined, input as never, { engine: card, context, record });
  const calls = () => [input.mock.calls.length, create.mock.calls.length, context.mock.calls.length,
    prepare.mock.calls.length, evaluate.mock.calls.length, precompute.mock.calls.length, runner.calls.length,
    load.mock.calls.length, record.mock.calls.length, legacy.evaluate.mock.calls.length, legacy.precompute.mock.calls.length];
  return { e, r, runtime, card, precompute, create, calls };
}

it("misses without loading inputs or starting any work, including while off", () => {
  const { e, runtime, calls } = fixture();
  expect(runtime.peekCompletedCore(e)).toBeNull(); expect(calls()).toEqual(Array(11).fill(0));
  vi.stubEnv("V6_BUILD", "off");
  expect(runtime.peekCompletedCore(e)).toBeNull(); expect(calls()).toEqual(Array(11).fill(0));
});

it("reads completed-core results and current missing counts without reading reward results or invoking providers", async () => {
  const { e, runtime, calls } = fixture();
  await runtime.startCardBackground(e, 100);
  Object.defineProperty(e, "v6CardResults", { get: () => { throw Error("reward table must not be read"); } });
  const before = calls(), snapshot = runtime.peekCompletedCore(e)!;
  expect(snapshot.long_term).toHaveLength(1);
  expect(snapshot.long_term[0]).toMatchObject({ target_id: "future", direction_id: "D", combo_id: "D:minimal", samples: 2 });
  expect(snapshot.progress).toEqual([{ direction: "D", combo: "D:minimal", missing_before: 1, missing_after: 1, advanced: 0 }]);
  expect(snapshot.targets.map(t => t.id)).toEqual(["future"]); expect(calls()).toEqual(before);
  snapshot.long_term[0]!.metrics.hp_loss!.mean = -999;
  snapshot.progress[0]!.missing_after = 0; snapshot.targets[0]!.boss = "mutated";
  const again = runtime.peekCompletedCore(e)!;
  expect(again.long_term[0]!.metrics.hp_loss!.mean).not.toBe(-999);
  expect(again.progress[0]!.missing_after).toBe(1); expect(again.targets[0]!.boss).not.toBe("mutated");
  expect(calls()).toEqual(before);
});

const changes: [string, (e: ReturnType<typeof env>) => void][] = [
  ["run", e => { e.state.raw.run_id = "another-run"; }],
  ["deck", e => { e.state.run!.raw.deck = [{ card_id: "A", upgraded: true }]; }],
  ["relic counter", e => { e.state.run!.raw.relics = [{ relic_id: "FIXED", stack: 2 }]; }],
  ["potions", e => { e.state.run!.raw.potions = [{ potion_id: "FIXED" }]; }],
  ["HP", e => { e.state.run!.current_hp!--; }],
  ["raw HP", e => { e.state.run!.raw.current_hp = 1; }],
  ["max HP", e => { e.state.run!.max_hp!++; }],
  ["floor", e => { e.state.run!.floor!++; }],
  ["act", e => { e.state.run!.raw.act_id = "1"; }],
  ["ascension", e => { e.state.run!.ascension!++; }],
  ["Boss", e => { e.state.run!.raw.boss_id = "OTHER"; }],
  ["route", e => { e.screenMemory.routePlan = { runId: "fixed", act: 1, path: [{ row: 8, col: 1, type: "Elite" }] } as never; }],
  ["visible map", e => { e.state.raw.map = { nodes: [{ row: 1, col: 1 }] }; }],
  ["knowledge object", e => { e.knowledge = { ...e.knowledge }; }],
  ["knowledge version", e => { e.knowledge.catalog = { modVersion: "different", fetchedAt: "fixed" }; }],
  ["temporary core", e => { e.screenMemory.runPlan = { v6: { ideal_overrides: { D: [{ id: "A" }] } } } as never; }],
];
it.each(changes)("invalidates %s changes without refreshing the factory or computing", async (_name, change) => {
  const { e, runtime, calls } = fixture(); await runtime.startCardBackground(e, 100);
  expect(runtime.peekCompletedCore(e)).not.toBeNull(); const before = calls();
  change(e); expect(runtime.peekCompletedCore(e)).toBeNull(); expect(calls()).toEqual(before);
});

it("keeps offers and direction weights independent of the completed-core cache", async () => {
  const { e, runtime, calls } = fixture(); await runtime.startCardBackground(e, 100);
  const before = calls(); e.state.raw.reward = { card_options: [{ card_id: "OTHER" }] };
  e.screenMemory.runPlan = { v6: { direction_weights: { D: 1 } } } as never;
  expect(runtime.peekCompletedCore(e)).not.toBeNull(); expect(calls()).toEqual(before);
  vi.stubEnv("V6_BUILD", "off"); expect(runtime.peekCompletedCore(e)).toBeNull(); expect(calls()).toEqual(before);
});

it("does not return an old model snapshot while the replacement model has no completed cache", async () => {
  const { e, r, runtime, precompute, calls } = fixture(); await runtime.startCardBackground(e, 100);
  expect(runtime.peekCompletedCore(e)).not.toBeNull(); r.modelVersion = "changed-model";
  let finish!: () => void;
  precompute.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  const work = runtime.startCardBackground(e, 100);
  await vi.waitFor(() => expect(precompute).toHaveBeenCalledTimes(2));
  const before = calls(); expect(runtime.peekCompletedCore(e)).toBeNull(); expect(calls()).toEqual(before);
  finish(); await work;
  expect(runtime.peekCompletedCore(e)).toBeNull();
});

it("clears old identity after the provider becomes unavailable", async () => {
  const { e, runtime, create, calls } = fixture(); await runtime.startCardBackground(e, 100);
  create.mockReturnValueOnce({ status: "unavailable" } as never); await runtime.startCardBackground(e, 100);
  const before = calls(); expect(runtime.peekCompletedCore(e)).toBeNull(); expect(calls()).toEqual(before);
});

it("preserves incomplete target coverage and explicit unknown reasons", async () => {
  const { e, r, runtime } = fixture();
  r.targets.push({ ...r.targets[1]!, id: "unavailable", unknown: "opening_unknown" });
  const prepare = r.prepare; r.prepare = (target, ...args) => target.id === "unavailable" ? null : prepare(target, ...args);
  await runtime.startCardBackground(e, 100);
  const snapshot = runtime.peekCompletedCore(e)!;
  expect(snapshot.targets.map(t => t.id)).toEqual(["future", "unavailable"]);
  expect(snapshot.long_term.find(row => row.target_id === "unavailable")!.metrics.hp_loss).toBeNull();
  expect(snapshot.unknown_reasons).toContain("opening_unknown");
  expect(snapshot.unknown_reasons).toContain("insufficient_samples");
});

import { compactProjection } from "../src/v6/prompt-summary.js";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { ensureDirectionPlan, v6Directions } from "../src/v6/direction-runtime.js";
import type { Brain } from "../src/brain/brain.js";
import { direction, weights, projection } from "./v6-fixtures.js";
import { board, env, setupOneshotTests } from "./oneshot-support.js";
import { coreFixture, comboProjection } from "./v6-direction-core-fixtures.js";
setupOneshotTests();
const dirs: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "v6-direction-")); dirs.push(dir);
  const own = join(dir, "characters", "silent"); mkdirSync(own, { recursive: true });
  writeFileSync(join(own, "build-cores.json"), JSON.stringify({ schema: "build-cores-v1", character: "silent", entries: [coreFixture(), coreFixture("TEST_B")] }));
  const raw = board("xljq-f5-reward", "reward"); Object.assign(raw["run"] as object, { character_id: "SILENT", ascension: 0, boss_id: "TEST_TARGET" });
  return { dir, log: join(dir, "plans.jsonl"), e: env(raw) };
}
it("asks once per room, publishes validated weights, restores plan and count across restart", async () => {
  vi.stubEnv("V6_BUILD", "on"); const { dir, log, e } = fixture();
  const askJson = vi.fn(async () => ({ json: { ...weights, potion_directions: [] } }));
  const brain = { askJson } as unknown as Pick<Brain, "askJson">;
  const first = await ensureDirectionPlan(e, brain, log, dir);
  expect(first?.stored).toBe(true); expect(askJson).toHaveBeenCalledTimes(1);
  expect(e.screenMemory.runPlan?.v6?.direction_weights).toEqual(weights.direction_weights);
  expect(first?.payload?.direction_evaluation).toHaveLength(8);
  expect(JSON.stringify(first?.payload)).toContain("unknown");
  await ensureDirectionPlan(e, brain, log, dir); expect(askJson).toHaveBeenCalledTimes(1);
  e.screenMemory.v6Planner = undefined; e.screenMemory.runPlan = undefined;
  await ensureDirectionPlan(e, brain, log, dir);
  expect(e.screenMemory.v6Planner?.scheduler.calls).toBe(1); expect(askJson).toHaveBeenCalledTimes(1);
  const measured = readFileSync(join(dir, "v6-build.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line));
  expect(measured.filter(r => r.stage === "brain")).toEqual([expect.objectContaining({ kind: "act", fallback: null, entries: [], triggers: [], elapsed_ms: expect.any(Number) })]);
  expect(measured.filter(r => r.stage === "trigger" && r.kind === "act")).toHaveLength(1);
  expect(readFileSync(log, "utf8")).toContain('"v6_brain_calls":1');
});
it("makes no request or output while off, and shadow does not install a new plan", async () => {
  const { dir, log, e } = fixture(); const brain = { askJson: vi.fn() } as unknown as Pick<Brain, "askJson">;
  vi.stubEnv("V6_BUILD", "off"); const before = JSON.stringify(e.screenMemory);
  expect(await ensureDirectionPlan(e, brain, log, dir)).toBeNull(); expect(JSON.stringify(e.screenMemory)).toBe(before);
  vi.stubEnv("V6_BUILD", "shadow"); const result = await ensureDirectionPlan(e, brain, log, dir);
  expect(result?.stored).toBe(false); expect(brain.askJson).not.toHaveBeenCalled(); expect(e.screenMemory.runPlan?.v6).toBeUndefined();
});
it("rejects an invalid answer without replacing the plan or retrying the frozen room", async () => {
  vi.stubEnv("V6_BUILD", "on"); const { dir, log, e } = fixture();
  const brain = { askJson: vi.fn(async () => ({ json: { ...weights, direction_weights: { TEST_A: 1 }, potion_directions: [] } })) } as unknown as Pick<Brain, "askJson">;
  await expect(ensureDirectionPlan(e, brain, log, dir)).rejects.toThrow("complete character catalog");
  expect(e.screenMemory.runPlan?.v6).toBeUndefined();
  await ensureDirectionPlan(e, brain, log, dir); expect(brain.askJson).toHaveBeenCalledTimes(1);
  const measured = readFileSync(join(dir, "v6-build.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line));
  expect(measured.filter(r => r.stage === "brain")).toEqual([expect.objectContaining({ fallback: "brain_request_failed", elapsed_ms: expect.any(Number) })]);
});
it("feeds actual potion fallback streaks into T6 without relying on unknown projection rows", async () => {
  vi.stubEnv("V6_BUILD", "on"); const { dir, log, e } = fixture();
  const brain = { askJson: vi.fn(async () => ({ json: { ...weights, potion_directions: [] } })) } as unknown as Pick<Brain, "askJson">;
  const entries = ["TEST_A", "TEST_B"].flatMap(direction_id => coreFixture(direction_id).combos.flatMap(c =>
    ["TEST_TARGET", "joint"].map(target_id => ({ ...projection, target_id, direction_id,
      combo_id: c.id, combo_source: "build-core-v1" as const, trust: "trusted" as const }))));
  e.v6DirectionEvaluation = { id: "fixture", entries };
  await ensureDirectionPlan(e, brain, log, dir);
  e.state.run!.floor += 1; e.screenMemory.v6JevFallbacks = 2; e.screenMemory.v6JevFallbackRun = String(e.state.raw["run_id"]);
  const result = await ensureDirectionPlan(e, brain, log, dir);
  expect(result?.result.triggers).toEqual(["T6"]); expect(brain.askJson).toHaveBeenCalledTimes(2);
});

it.each(["IRONCLAD", "SILENT", "DEFECT", "NECROBINDER", "REGENT"])("%s off preserves planner bytes and creates no logs", async character => {
  const { dir, log, e } = fixture(); Object.assign(e.state.run!.raw, { character_id: character });
  vi.stubEnv("V6_BUILD", "off"); const before = JSON.stringify(e.screenMemory);
  const brain = { askJson: vi.fn() } as unknown as Pick<Brain, "askJson">;
  expect(await ensureDirectionPlan(e, brain, log, dir)).toBeNull();
  expect(JSON.stringify(e.screenMemory)).toBe(before); expect(brain.askJson).not.toHaveBeenCalled();
  expect(() => readFileSync(log)).toThrow();
});
it("ignores legacy direction cards and reads build-core combos with brain overrides", async () => {
  vi.stubEnv("V6_BUILD", "on"); const { dir, e } = fixture();
  rmSync(join(dir, "characters", "silent", "build-cores.json"));
  writeFileSync(join(dir, "characters", "silent", "direction-cards.json"), JSON.stringify({ schema: "direction-cards-v1", character: "silent", entries: [direction] }));
  expect(v6Directions(e, dir)).toEqual([]);
});
it.each(["TEST_TARGET", "joint"])("keeps %s projections, fills missing targets and rejects invalid combos", async target_id => {
  vi.stubEnv("V6_BUILD", "on"); const { dir, log, e } = fixture();
  const entry = { ...comboProjection(), target_id };
  e.v6DirectionEvaluation = { id: "fixed", entries: [entry, { ...entry, combo_id: "UNKNOWN" }, { ...entry, combo_source: "brain" }] };
  const brain = { askJson: vi.fn(async () => ({ json: { ...weights, potion_directions: [] } })) } as unknown as Pick<Brain, "askJson">;
  const result = await ensureDirectionPlan(e, brain, log, dir);
  const rows = result?.payload?.direction_evaluation as Array<typeof entry>;
  expect(rows.filter(r => r.expected_win !== null)).toEqual([compactProjection(entry)]);
  expect(rows.some(r => r.combo_id === "UNKNOWN" || r.combo_source === "brain")).toBe(false);
  expect(rows).toHaveLength(8);
  expect(rows.filter(r => r.target_id === "joint")).toHaveLength(4);
  expect(rows.filter(r => r.target_id === "TEST_TARGET")).toHaveLength(4);
  expect(result?.result.triggers).toContain("T6");
  expect(readFileSync(join(dir, "v6-build.jsonl"), "utf8")).toContain('"expected_win":0.56');
  expect(v6Directions(e, dir)[0]?.combos).toContainEqual(expect.objectContaining({ source: "brain", id: "TEST_A:brain" }));
});
it("restores a brain combo before accepting its next projection after restart", async () => {
  vi.stubEnv("V6_BUILD", "on"); const { dir, log, e } = fixture();
  const brain = { askJson: vi.fn(async () => ({ json: { ...weights, checkpoint: Math.max(weights.checkpoint, e.state.run!.floor + 1), potion_directions: [] } })) } as unknown as Pick<Brain, "askJson">;
  await ensureDirectionPlan(e, brain, log, dir);
  e.state.run!.floor = 20; e.screenMemory.runPlan = undefined; e.screenMemory.v6Planner = undefined;
  const entry = { ...comboProjection("TEST_A:brain"), combo_source: "brain" as const };
  e.v6DirectionEvaluation = { id: "after-restart", entries: [entry] };
  const result = await ensureDirectionPlan(e, brain, log, dir);
  expect(result?.result.triggers).toContain("T7");
  expect(result?.payload?.direction_evaluation).toContainEqual(compactProjection(entry));
  expect(v6Directions(e, dir)[0]?.combos.filter(c => c.source === "brain")).toHaveLength(1);
  e.state.raw["run_id"] = "OTHER_RUN";
  expect(v6Directions(e, dir).every(s => s.combos.every(c => c.source !== "brain"))).toBe(true);
});

it("uses the provider target IDs without adding legacy boss or joint placeholders", async () => {
  vi.stubEnv("V6_BUILD", "on"); const { dir, log, e } = fixture();
  const target = "f48:FIXTURE_A:then:f49:FIXTURE_B";
  e.v6DirectionEvaluation = { id: "formal-provider", entries: [{ ...comboProjection(), target_id: target }],
    targets: [{ id: "f17:FIXTURE_CURRENT", kind: "current" }, { id: target, kind: "chain" }] };
  const brain = { askJson: vi.fn(async () => ({ json: { ...weights, potion_directions: [] } })) } as unknown as Pick<Brain, "askJson">;
  const result = await ensureDirectionPlan(e, brain, log, dir);
  const rows = result?.payload?.direction_evaluation as Array<ReturnType<typeof comboProjection>>;
  expect(new Set(rows.map(r => r.target_id))).toEqual(new Set(["f17:FIXTURE_CURRENT", target]));
  expect(rows).toHaveLength(8);
  expect(rows.filter(r => r.expected_win !== null)).toHaveLength(1);
});

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { ensureDirectionPlan } from "../src/v6/direction-runtime.js";
import type { Brain } from "../src/brain/brain.js";
import { direction, weights } from "./v6-fixtures.js";
import { board, env, setupOneshotTests } from "./oneshot-support.js";
setupOneshotTests();
const dirs: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "v6-direction-")); dirs.push(dir);
  const own = join(dir, "characters", "silent"); mkdirSync(own, { recursive: true });
  writeFileSync(join(own, "direction-cards.json"), JSON.stringify({ schema: "direction-cards-v1", character: "silent", entries: [direction, { ...direction, id: "TEST_B" }] }));
  const raw = board("xljq-f5-reward", "reward"); Object.assign(raw["run"] as object, { character_id: "SILENT", ascension: 0 });
  return { dir, log: join(dir, "plans.jsonl"), e: env(raw) };
}
it("asks once per room, publishes validated weights, restores plan and count across restart", async () => {
  vi.stubEnv("V6_BUILD", "on"); const { dir, log, e } = fixture();
  const askJson = vi.fn(async () => ({ json: { ...weights, potion_directions: [] } }));
  const brain = { askJson } as unknown as Pick<Brain, "askJson">;
  const first = await ensureDirectionPlan(e, brain, log, dir);
  expect(first?.stored).toBe(true); expect(askJson).toHaveBeenCalledTimes(1);
  expect(e.screenMemory.runPlan?.v6?.direction_weights).toEqual(weights.direction_weights);
  expect(first?.payload?.direction_evaluation).toHaveLength(4);
  expect(JSON.stringify(first?.payload)).toContain("unknown");
  await ensureDirectionPlan(e, brain, log, dir); expect(askJson).toHaveBeenCalledTimes(1);
  e.screenMemory.v6Planner = undefined; e.screenMemory.runPlan = undefined;
  await ensureDirectionPlan(e, brain, log, dir);
  expect(e.screenMemory.v6Planner?.scheduler.calls).toBe(1); expect(askJson).toHaveBeenCalledTimes(1);
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
});

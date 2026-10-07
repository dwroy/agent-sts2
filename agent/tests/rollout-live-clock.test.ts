/** fix-queue-v4 2026-10-07 14:13: fixed-clock budget regressions, without generated knowledge. */
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { createScreenMemory } from "../src/memory/types.js";
import { liveRollout, ROLLOUT_BUDGET_MS, rolloutFacts, rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";
import { withRolloutFixtureClock } from "./rollout-clock-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed rollout budget references"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

afterEach(() => { vi.restoreAllMocks(); rolloutLiveOptions.now = null; });

function fixedArgs() {
  const input = board();
  const plan = replaySteps(input.solver, [])!;
  const state = parseGameState({
    state_version: 16, screen: "COMBAT", session: { mode: "singleplayer", phase: "run" }, in_combat: true,
    turn: 1, available_actions: [], run_id: "fixed-budget",
    run: { floor: 25, ascension: 10, current_hp: 70, max_hp: 80, act_id: "1", deck: [], relics: [], potions: [] },
    combat: { player: { powers: [] }, hand: [], enemies: [
      { index: 0, enemy_id: "TEST_BOSS", current_hp: 120, max_hp: 120, is_alive: true, powers: [] },
    ] },
  });
  return { state, knowledge: makeKnowledge({}, "cache"), memory: createScreenMemory("COMBAT"),
    solver: input.solver, plans: [plan], shown: [plan],
    piles: { draw: Array.from({ length: 10 }, (_, i) => card(i + 10, "TEST_ATTACK", { damage: 1 })), discard: [] },
    model: null, gates: null };
}

it("keeps the fixture budget assertion after a simulated wall-clock pause", () => {
  let wall = 0;
  vi.spyOn(performance, "now").mockImplementation(() => (wall += 10_000));
  const result = withRolloutFixtureClock(() => liveRollout(fixedArgs()));
  expect(result.available).toBe(true);
  expect(ROLLOUT_BUDGET_MS).toBe(1500);
  expect(result.elapsedMs).toBeLessThanOrEqual(ROLLOUT_BUDGET_MS + 300);
  if (result.available) expect(result.result.horizon).toBeGreaterThan(1);
});

it("keeps deadline degradation and the fallback facts under a controlled advancing clock", () => {
  const args = fixedArgs();
  const result = withRolloutFixtureClock(() => liveRollout(args), 400);
  expect(result.available).toBe(true);
  if (!result.available) return;
  expect(result.result.horizon).toBe(1);
  expect(result.best).toBeNull();
  expect(rolloutFacts(args.plans[0]!, result).rollout).toMatch(/^no rollout \(it ran past its time budget; a fallback, not a forecast\)/);
});

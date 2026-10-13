import { afterEach, expect, it, vi } from "vitest";
import { runTimeCapFixture } from "./loop-time-cap-fixture.js";
import { combatPayload, gameOverPayload, mapPayload } from "./scenarios.js";

afterEach(() => vi.restoreAllMocks());

it.each([0, 10_000])("keeps map and combat deadline assertions independent of a %ims host pause", async (pause) => {
  let wall = 0;
  vi.spyOn(Date, "now").mockImplementation(() => (wall += pause));
  const map = await runTimeCapFixture(mapPayload());
  expect(map.stats.stoppedBecause).toBe("time cap reached (0.005 min)");
  expect(map.elapsed).toBeLessThan(850);
  expect(map.elapsed).toBeGreaterThan(300);
  const fight = await runTimeCapFixture(combatPayload());
  expect(fight.stats.stoppedBecause).toContain("still in combat after the grace period");
  expect(fight.elapsed).toBeGreaterThanOrEqual(850);
  expect(fight.elapsed).toBeLessThanOrEqual(902);
  expect(map.stats.errors + fight.stats.errors).toBe(0);
  expect(map.stats.acts + fight.stats.acts).toBe(0);
});

it("stops at a safe point when the fight ends during the grace period", async () => {
  const result = await runTimeCapFixture(combatPayload(), { atMs: 500, payload: mapPayload() });
  expect(result.events.some((event) => event.type === "combat_end")).toBe(true);
  expect(result.stats.stoppedBecause).toBe("time cap reached (0.005 min)");
  expect(result.elapsed).toBeGreaterThanOrEqual(500);
  expect(result.elapsed).toBeLessThan(850);
});

it("bounds score-screen finalization by the same grace deadline", async () => {
  const ending = gameOverPayload();
  ending["available_actions"] = [];
  ending["game_over"] = { phase: "summary_animating", is_victory: false };
  const result = await runTimeCapFixture(combatPayload(), { atMs: 200, payload: ending });
  expect(result.stats.stoppedBecause).toContain("still finishing the run after the grace period");
  expect(result.elapsed).toBeGreaterThanOrEqual(850);
  expect(result.elapsed).toBeLessThanOrEqual(902);
});

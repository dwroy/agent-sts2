import { afterEach, expect, it, vi } from "vitest";
import { V6DirectionCache, directionDecisionPoint, directionFingerprint } from "../src/v6/direction-decision.js";
import type { Decision } from "../src/memory/types.js";
import { board, env } from "./oneshot-support.js";

afterEach(() => vi.unstubAllEnvs());

it.each(["reward/claim", "reward/proceed", "shop/open", "shop/buy", "shop/leave", "event/leave", "map/route-follow", "map/route-only", "rest/proceed"])("skips direction evaluation on execution step %s", label => {
  expect(directionDecisionPoint({ kind: "act", label } as Decision)).toBe(false);
});
it.each(["shop/buy", "shop/plan", "rest/plan", "map/route-plan", "map/route-review", "event/choose", "reward/card", "reward/potion-discard"])("retains real decision point %s", label => {
  expect(directionDecisionPoint({ kind: "ask", label } as Decision)).toBe(true);
});
it("retains code construction choices, but never an already planned step", () => {
  expect(directionDecisionPoint({ kind: "act", label: "rest/choose" } as Decision)).toBe(true);
  expect(directionDecisionPoint({ kind: "act", label: "rest/choose", plan: { ref: "p", step: 2, choice: "heal" } } as Decision)).toBe(false);
});
it("reuses a physical state across polls and invalidates every relevant changed input", async () => {
  vi.stubEnv("V6_BUILD", "on");
  const raw = board("xljq-f5-reward", "reward"), e = env(raw);
  const cache = new V6DirectionCache(), evaluate = vi.fn(async () => null);
  const key = () => directionFingerprint(e, "pick");
  const initial = key();
  await cache.get(initial, evaluate);
  e.state.state_version += 1; e.state.raw.timestamp = "later";
  await cache.get(key(), evaluate);
  expect(evaluate).toHaveBeenCalledTimes(1); // Unknown is cached, too.
  const mutations = [
    () => { e.state.run!.current_hp!--; },
    () => { e.state.run!.floor!++; },
    () => { e.state.run!.gold!++; },
    () => { (e.state.run!.raw.deck as unknown[]).push({ card_id: "TEST_CARD" }); },
    () => { (e.state.run!.raw.relics as unknown[]).push({ relic_id: "TEST_RELIC" }); },
    () => { e.state.run!.raw.potions = [{ potion_id: "TEST_POTION", index: 0 }]; },
    () => { (e.state.raw.reward as Record<string, unknown>).card_options = [{ card_id: "TEST_OFFER", index: 0 }]; },
    () => { e.screenMemory.routePlan = { path: [{ row: 3, col: 1 }] } as never; },
    () => { e.screenMemory.runPlan = { runId: String(e.state.raw.run_id), v6: { direction_weights: { TEST_A: 1 } } } as never; },
    () => { e.screenMemory.runPlan!.v6!.ideal_overrides = { TEST_A: ["TEST_CARD"] }; },
  ];
  let previous = initial;
  for (const mutate of mutations) {
    mutate(); const next = key(); expect(next).not.toBe(previous);
    await cache.get(next, evaluate); previous = next;
  }
  expect(directionFingerprint(e, "act")).not.toBe(key());
  expect(evaluate).toHaveBeenCalledTimes(mutations.length + 1);
});
it("does not invalidate when the direction scheduler merely remembers already visible cards", () => {
  const e = env(board("xljq-f5-reward", "reward")), first = directionFingerprint(e, "pick");
  e.screenMemory.v6Planner = { appearedCards: ["ARMAMENTS", "MOLTEN_FIST", "RUPTURE"] } as never;
  expect(directionFingerprint(e, "pick")).toBe(first);
});
it("does not cache failures and bounds reuse to recent contexts", async () => {
  const cache = new V6DirectionCache(), fail = vi.fn(async () => { throw new Error("provider failed"); });
  await expect(cache.get("failure", fail)).rejects.toThrow("provider failed");
  await expect(cache.get("failure", fail)).rejects.toThrow("provider failed");
  expect(fail).toHaveBeenCalledTimes(2);
  const evaluate = vi.fn(async () => 1);
  for (let i = 0; i < 9; i++) await cache.get(String(i), evaluate);
  await cache.get("0", evaluate); expect(evaluate).toHaveBeenCalledTimes(10);
});

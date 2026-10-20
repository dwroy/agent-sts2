import { afterEach, expect, it, vi } from "vitest";
import { measureExecutionSequences, fixedDirectionProvider } from "./v6-direction-fastpath-fixture.js";
import { board, FakeDeepSeek, play, setupOneshotTests } from "./oneshot-support.js";
import { mainMenuPayload } from "./scenarios.js";

setupOneshotTests();
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

it("claims all rewards and executes a complete shop plan without direction work between steps", async () => {
  const result = await measureExecutionSequences("on");
  expect(result.reward.errors).toBe(0); expect(result.shop.errors).toBe(0);
  expect(result.reward.rows.map(r => r.label)).toEqual(["reward/claim", "reward/claim", "reward/claim", "reward/proceed"]);
  expect(result.reward.calls).toEqual([]);
  expect(result.shop.rows.map(r => r.label)).toEqual(["shop/plan", "shop/buy", "shop/buy", "shop/buy", "shop/buy", "shop/buy", "shop/leave"]);
  expect(result.shop.calls).toHaveLength(0);
  expect(result.shop.brain_calls.map(c => c.label)).toEqual(["shop/plan"]); // One original V5 request.
  expect(result.reward.brain_calls).toHaveLength(0);
  for (const row of [...result.reward.rows, ...result.shop.rows.slice(1)]) {
    expect(Number(row.planner_ms ?? 0) + Number(row.pre_ms ?? 0)).toBeLessThan(1_000);
  }
});

it("off retains every execution action and question byte for byte and never calls the provider", async () => {
  const baseline = await measureExecutionSequences("off"), active = await measureExecutionSequences("on");
  expect(baseline.reward.calls).toEqual([]); expect(baseline.shop.calls).toEqual([]);
  const payloads = (rows: typeof active.shop.rows) => JSON.stringify(rows.map(({ label, chosen, questions }) => ({ label, chosen, questions })));
  expect(payloads(active.reward.rows)).toBe(payloads(baseline.reward.rows));
  expect(payloads(active.shop.rows)).toBe(payloads(baseline.shop.rows));
  expect(active.reward.actions).toEqual(baseline.reward.actions); expect(active.shop.actions).toEqual(baseline.shop.actions);
});

it("never pre-evaluates directions when a genuine card question repeats unchanged", async () => {
  vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_CARD_DECIDER", "off");
  vi.stubEnv("V6_DIRECTION_REPLAN", "on"); // Even the legacy helper flag cannot reintroduce a production ask.
  const provider = fixedDirectionProvider();
  const first = board("xljq-f5-reward", "reward"), second = structuredClone(first);
  second.state_version = Number(first.state_version) + 1;
  const result = await play([first, second, mainMenuPayload()], new FakeDeepSeek(() => "card0"),
    { runPlan: "off" }, { v6Projection: provider.runtime });
  expect(result.stats.errors).toBe(0);
  expect(result.records.filter(r => r.label === "reward/card")).toHaveLength(2);
  expect(provider.evaluate).not.toHaveBeenCalled();
});

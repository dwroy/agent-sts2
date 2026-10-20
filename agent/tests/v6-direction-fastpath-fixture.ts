import { vi } from "vitest";
import type { V6ProjectionRuntime } from "../src/v6/projection-runtime.js";
import { board, FakeDeepSeek, play, type Raw } from "./oneshot-support.js";
import { mainMenuPayload } from "./scenarios.js";

export function rewardClaims(): Raw[] {
  return [0, 1, 2, 3].map(claimed => {
    const raw = board("xljq-f5-reward", "reward");
    raw.state_version = Number(raw.state_version) + claimed;
    raw.available_actions = ["claim_reward", "collect_rewards_and_proceed"];
    raw.reward = { pending_card_choice: false, can_proceed: claimed === 3, card_options: [],
      rewards: [0, 1, 2].filter(i => i >= claimed).map(index => ({ index, reward_type: "Gold", description: "fixed reward", claimable: true })) };
    return raw;
  });
}

/** A frozen provider charges a deterministic wall-clock allowance without sim/model/game calls. */
export function fixedDirectionProvider(milliseconds = 0) {
  const calls: { screen: string; floor: number | null | undefined }[] = [];
  const evaluate = vi.fn(async (env: Parameters<V6ProjectionRuntime["evaluate"]>[0]) => {
    calls.push({ screen: env.state.screen, floor: env.state.run?.floor });
    if (milliseconds) vi.setSystemTime(Date.now() + milliseconds);
    return null;
  });
  return { calls, evaluate, runtime: { evaluate, context: async () => null, precompute: async () => null } as unknown as V6ProjectionRuntime };
}

export async function measureExecutionSequences(mode: "on" | "off", milliseconds = 0) {
  vi.stubEnv("V6_BUILD", mode);
  for (const key of ["V6_CARD_DECIDER", "V6_POTION_DECIDER", "V6_SHOP_DECIDER", "V6_REST_DECIDER"]) vi.stubEnv(key, "off");
  const rewardProvider = fixedDirectionProvider(milliseconds), shopProvider = fixedDirectionProvider(milliseconds);
  const rewardBrain = new FakeDeepSeek(() => "skip"), shopBrain = new FakeDeepSeek(() => "leave", () => ({
    plan: ["buy_card3", "buy_potion2", "buy_card4", "buy_card0", "buy_card2"], reason: "fixed plan" }));
  const rewards = await play([...rewardClaims(), mainMenuPayload()], rewardBrain,
    { runPlan: "off" }, { v6Projection: rewardProvider.runtime });
  const sequence = ["open", "after_card3", "after_potion2", "after_card4", "after_card0", "after_card2", "closed"].map(key => board("u6ru-f22-shop", key));
  const shop = await play([...sequence, mainMenuPayload()], shopBrain,
  { runPlan: "off" }, { v6Projection: shopProvider.runtime });
  const rows = (result: typeof rewards) => result.records.map(r => ({ label: r.label, chosen: r.chosen, questions: r.questions,
    planner_ms: (r.latency_ms as Raw)?.planner, pre_ms: (r.latency_ms as Raw)?.pre }));
  return { reward: { calls: rewardProvider.calls, brain_calls: rewardBrain.calls, rows: rows(rewards), actions: rewards.actions, errors: rewards.stats.errors },
    shop: { calls: shopProvider.calls, brain_calls: shopBrain.calls, rows: rows(shop), actions: shop.actions, errors: shop.stats.errors } };
}

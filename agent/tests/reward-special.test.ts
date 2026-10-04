/**
 * The stolen card's return (Thieving Hopper, 「取回你被偷走的牌。」) and the other special card that opens no choice (the
 * Lantern Key) are claimed before the card reward and still after a skipped one (reward.ts NO_CHOICE_SPECIAL_CARD; the
 * logged reward lists: Gold, Potion, SpecialCard, Card). Any other special card keeps the skip's protection.
 */

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv } from "../src/memory/types.js";
import { noChoiceSpecialCard, planReward } from "../src/hand/screens/reward.js";
import { baseState, testKnowledge } from "./scenarios.js";

const config = loadConfig({} as NodeJS.ProcessEnv);
const STOLEN = "取回你被偷走的牌。";
const LANTERN = "将灯火钥匙加入你的牌组。";

function rewardEnv(rewards: { reward_type: string; description: string }[], skipped = false): DecisionEnv {
  const raw = baseState("REWARD", {
    available_actions: ["claim_reward", "collect_rewards_and_proceed"],
    reward: { pending_card_choice: false, can_proceed: true, rewards: rewards.map((entry, index) => ({ index, ...entry, claimable: true })), card_options: [], alternatives: [] },
  });
  const state = parseGameState(raw);
  return {
    state,
    knowledge: testKnowledge,
    brief: buildRunBrief(state, testKnowledge),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory: { ...createScreenMemory("REWARD"), cardRewardSkipped: skipped },
    shopDiscardPotions: [],
  };
}

function intentOf(decision: Decision | null): unknown {
  return decision && decision.kind === "act" ? decision.intent : null;
}

describe("special card rewards that open no choice", () => {
  it("knows the stolen card's return and the Lantern Key, not another special card", () => {
    expect(noChoiceSpecialCard({ reward_type: "SpecialCard", description: STOLEN })).toBe(true);
    expect(noChoiceSpecialCard({ reward_type: "SpecialCard", description: LANTERN })).toBe(true);
    expect(noChoiceSpecialCard({ reward_type: "SpecialCard", description: "选择一张牌加入你的牌组。" })).toBe(false);
    expect(noChoiceSpecialCard({ reward_type: "Card", description: STOLEN })).toBe(false);
  });

  it("keeps the screen's order (gold first, as logged), the return before the card reward", () => {
    const logged = [
      { reward_type: "Gold", description: "14金币" },
      { reward_type: "Potion", description: "速度药水" },
      { reward_type: "SpecialCard", description: STOLEN },
      { reward_type: "Card", description: "将一张牌添加到你的牌组。" },
    ];
    expect(intentOf(planReward(rewardEnv(logged)))).toEqual({ action: "claim_reward", option_index: 0 });
    // Gold and potion taken: the return, then the card.
    expect(intentOf(planReward(rewardEnv(logged.slice(2))))).toEqual({ action: "claim_reward", option_index: 0 });
  });

  it("claims the return before a card reward listed ahead of it", () => {
    const decision = planReward(rewardEnv([{ reward_type: "Card", description: "将一张牌添加到你的牌组。" }, { reward_type: "SpecialCard", description: STOLEN }]));
    expect(intentOf(decision)).toEqual({ action: "claim_reward", option_index: 1 });
    expect(decision && decision.kind === "act" ? decision.rationale : "").toContain("SpecialCard (取回你被偷走的牌。)");
  });

  it("still claims the return after the card reward was skipped, and then advances", () => {
    expect(intentOf(planReward(rewardEnv([{ reward_type: "Card", description: "将一张牌添加到你的牌组。" }, { reward_type: "SpecialCard", description: STOLEN }], true)))).toEqual({ action: "claim_reward", option_index: 1 });
    expect(intentOf(planReward(rewardEnv([{ reward_type: "Card", description: "将一张牌添加到你的牌组。" }], true)))).toEqual({ action: "collect_rewards_and_proceed" });
  });

  it("keeps the skip's protection for a special card that may open a choice", () => {
    const decision = planReward(rewardEnv([{ reward_type: "Card", description: "将一张牌添加到你的牌组。" }, { reward_type: "SpecialCard", description: "选择一张牌加入你的牌组。" }], true));
    expect(intentOf(decision)).toEqual({ action: "collect_rewards_and_proceed" });
  });
});

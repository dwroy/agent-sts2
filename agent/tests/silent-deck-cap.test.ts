import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseGameState } from "../src/hand/mod/schema.js";
import { gate } from "../src/hand/act/gate.js";
import { buildFacts } from "../src/brain/build-facts.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { budgetedState, deckBudget, deckBudgetProblem, declaredCardGain, SILENT_DECK_CONSTRAINT } from "../src/memory/run-constraints.js";
import { planDecision } from "../src/hand/screens/index.js";
import { parseShopPlan } from "../src/hand/screens/shop.js";
import { baseState, testKnowledge } from "./scenarios.js";
import { knowledgeCharacter, setKnowledgeCharacter } from "../src/knowledge/files.js";

let previousCharacter: string;
// Replay the superseded V4 experiment explicitly; production V5 leaves it inactive.
beforeEach(() => { previousCharacter = knowledgeCharacter(); setKnowledgeCharacter("silent"); Object.defineProperty(SILENT_DECK_CONSTRAINT, "active", { value: true }); });
afterEach(() => { setKnowledgeCharacter(previousCharacter); Object.defineProperty(SILENT_DECK_CONSTRAINT, "active", { value: false }); });

function env(size: number, screen = "REWARD", extra: Record<string, unknown> = {}, character = "SILENT", runId = "CAPFIXTURE01"): DecisionEnv {
  const raw = baseState(screen, extra);
  raw["run_id"] = runId;
  const run = raw["run"] as Record<string, unknown>;
  run["character_id"] = character;
  run["deck"] = Array.from({ length: size }, (_, index) => ({ index, card_id: "STRIKE_R", name: "Strike", card_type: "Attack", upgraded: false, resolved_rules_text: "Deal damage.", energy_cost: 1 }));
  const state = parseGameState(raw);
  return { state, knowledge: testKnowledge, brief: buildRunBrief(state, testKnowledge), screenMemory: createScreenMemory(screen), thresholds: { act: 0.6, strong: 0.8 }, runStart: "auto", characterPreference: character, allowFtueModals: false, strictJev: true, shopDiscardPotions: [], buildDecider: "deepseek" };
}
const reward = { available_actions: ["choose_reward_card", "skip_reward_cards"], reward: { pending_card_choice: true, card_options: [{ index: 7, card_id: "ANGER", name: "Anger" }] } };

describe("Roy's Silent-only permanent deck cap", () => {
  it("allows 29 to 30, removes an over-cap reward, and dispatch also rejects it", () => {
    const below = env(29, "REWARD", reward);
    expect(deckBudgetProblem(below.state, { action: "choose_reward_card", option_index: 7 })).toBeNull();
    const full = env(30, "REWARD", reward);
    expect(gate(full.state, { action: "choose_reward_card", option_index: 7 }).ok).toBe(false);
    const result = planDecision(full);
    expect(result.kind).toBe("decision");
    if (result.kind === "decision") expect(result.decision).toMatchObject({ kind: "act", intent: { action: "skip_reward_cards" } });
  });
  it("leaves the in-flight run and all other characters unchanged", () => {
    for (const [character, runId] of [["SILENT", "Y82C2NV7WM2M"], ["REGENT", "CAPFIXTURE01"], ["IRONCLAD", "CAPFIXTURE01"]]) {
      const e = env(35, "REWARD", reward, character, runId);
      expect(deckBudget(e.state)).toBeNull();
      expect(budgetedState(e.state)).toBe(e.state);
      expect(deckBudgetProblem(e.state, { action: "choose_reward_card", option_index: 7 })).toBeNull();
      expect(buildFacts(e)).not.toHaveProperty("run_constraints");
    }
  });
  it("counts every permanent instance and exposes the remaining budget to the brain", () => {
    const facts = buildFacts(env(29));
    expect(facts.run_constraints).toMatchObject({ max_permanent_cards: 30, permanent_cards_now: 29, slots_remaining: 1 });
  });
  it("uses the existing observed two-card reward reference, rather than only counting the selected card", () => {
    const e = env(29, "REWARD", reward);
    (e.state.run!.raw as Record<string, unknown>)["relics"] = ["BING_BONG", "BOOK_OF_FIVE_RINGS", "PAELS_TOOTH"].map((relic_id) => ({ relic_id, stack: 1 }));
    expect(deckBudgetProblem(e.state, { action: "choose_reward_card", option_index: 7 })).toContain("29 + 2");
  });
  it("checks explicit event batches and duplication while keeping original option indices", () => {
    expect(declaredCardGain({ description: "将3张卡牌加入你的牌组。" })).toBe(3);
    expect(declaredCardGain({ description: "选择一张牌复制。" })).toBe(1);
    const e = env(29, "EVENT", { available_actions: ["choose_event_option"], event: { options: [{ index: 9, description: "将3张卡牌加入你的牌组。" }, { index: 2, description: "离开。" }] } });
    expect((budgetedState(e.state).raw["event"] as { options: unknown[] }).options).toEqual([{ index: 2, description: "离开。" }]);
    expect(gate(e.state, { action: "choose_event_option", option_index: 9 }).ok).toBe(false);
  });
  it("preserves upgrade/transform/removal and temporary combat selection at capacity", () => {
    for (const prompt of ["选择一张牌升级。", "选择一张牌移除。", "选择一张牌变化。"])
      expect(declaredCardGain({ description: prompt })).toBe(0);
    const e = env(30, "CARD_SELECTION", { in_combat: true, selection: { kind: "choose_card_select", prompt: "加入你的手牌", selected_count: 0 } });
    expect(deckBudgetProblem(e.state, { action: "select_deck_card", option_index: 0 })).toBeNull();
  });
  it("halts on observed overflow or an impossible required permanent selection", () => {
    expect(planDecision(env(31)).kind).toBe("blocked");
    const e = env(30, "CARD_SELECTION", { selection: { kind: "deck_add_select", prompt: "加入你的牌组", min_select: 1, max_select: 1, selected_count: 0 } });
    expect(planDecision(e).kind).toBe("blocked");
  });
  it("rejects unbounded permanent additions without treating them as zero", () => {
    const e = env(20, "EVENT", { event: { options: [{ index: 0, description: "将若干卡牌加入你的牌组。" }] } });
    expect(deckBudgetProblem(e.state, { action: "choose_event_option", option_index: 0 })).toContain("unknown");
  });
  it("checks the order of a multi-step shop plan, and repeated purchases cumulatively", () => {
    const extra = { available_actions: ["buy_card", "remove_card_at_shop", "close_shop_inventory"], shop: { is_open: true,
      cards: [{ index: 1, card_id: "ANGER", name: "Anger", price: 0, is_stocked: true, enough_gold: true }, { index: 2, card_id: "BASH", name: "Bash", price: 0, is_stocked: true, enough_gold: true }],
      relics: [], potions: [], card_removal: { available: true, used: false, price: 0, enough_gold: true, cards: [{ index: 0, card_id: "STRIKE_R" }] } } };
    const full = env(30, "SHOP", extra);
    expect(parseShopPlan({ plan: ["buy_card1", "remove:c0"] }, full)).toHaveProperty("invalid");
    expect(parseShopPlan({ plan: ["remove:c0", "buy_card1"] }, full)).toHaveProperty("steps");
    expect(parseShopPlan({ plan: ["buy_card1", "buy_card2"] }, env(29, "SHOP", extra))).toHaveProperty("invalid");
    expect(gate(full.state, { action: "buy_card", option_index: 1 }).ok).toBe(false);
  });
});

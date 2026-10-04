/**
 * Enchantments are named, never explained, by the game (FSPK F36: the event said only 「附魔：迅速2」 and
 * DeepSeek guessed "cost 3 -> 1"; it draws 2 on the first play). Every place an enchantment is named to
 * DeepSeek or Jev carries its measured effect, or "effect text unavailable".
 */

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { annotateEnchants, enchantEffect, enchantsNamed } from "../src/knowledge/enchant-text.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { deckEntries, describeDeck } from "../src/memory/deck.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv, type ScreenMemory } from "../src/memory/types.js";
import { planEvent } from "../src/hand/screens/event.js";
import { planSelection } from "../src/hand/screens/selection.js";
import { baseState, eventPayload, runPayload, testKnowledge } from "./scenarios.js";

const config = loadConfig({} as NodeJS.ProcessEnv);
type Raw = Record<string, unknown>;

function env(raw: Raw, screenMemory: ScreenMemory = createScreenMemory(String(raw["screen"]))): DecisionEnv {
  const state = parseGameState(raw);
  return {
    state, knowledge: testKnowledge, brief: buildRunBrief(state, testKnowledge), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", screenMemory, shopDiscardPotions: [],
  };
}

/** FSPK F36's Self-Help Book, as the mod sent it. */
const SELF_HELP_BOOK: Raw = {
  ...eventPayload(),
  run: runPayload({ floor: 36 }),
  event: {
    event_id: "SELF_HELP_BOOK", title: "自助书", description: "一本书。", is_finished: false,
    options: [
      { index: 0, text_key: "A", title: "随便读个一段", description: "选择一张技能牌[gold]附魔[/gold]：[purple]灵巧[/purple][blue]2[/blue]。", is_locked: false, is_proceed: false, will_kill_player: false, has_relic_preview: false },
      { index: 1, text_key: "B", title: "读完整本书", description: "选择一张能力牌[gold]附魔[/gold]：[purple]迅速[/purple][blue]2[/blue]。", is_locked: false, is_proceed: false, will_kill_player: false, has_relic_preview: false },
    ],
  },
};

describe("enchantment effects", () => {
  it("the measured ones, with the shown amount; an unmeasured one says so", () => {
    expect(enchantEffect("迅速", 2)).toBe("the first time the card is played, draw 2 cards (「第一次打出时抽2张牌」)");
    expect(enchantEffect("锋利", 2)).toBe("the card deals 2 more damage (per hit)");
    expect(enchantEffect("完美契合", null)).toBe("effect text unavailable");
  });

  it("annotateEnchants: game text with markup or without, once; an unfilled {EnchantmentName} is said to be unnamed", () => {
    const raw = "选择一张能力牌[gold]附魔[/gold]：[purple]迅速[/purple][blue]2[/blue]。";
    const once = annotateEnchants(raw);
    expect(once).toBe(`${raw.slice(0, -1)}（迅速2: the first time the card is played, draw 2 cards (「第一次打出时抽2张牌」)）。`);
    expect(annotateEnchants(once)).toBe(once);
    expect(annotateEnchants("选择一张牌附魔：完美契合。")).toContain("（完美契合: effect text unavailable）");
    expect(annotateEnchants("附魔[/gold]：[purple]{EnchantmentName}[/purple]")).toContain("enchantment not named by the game: effect text unavailable");
    expect(annotateEnchants("获得10点格挡。")).toBe("获得10点格挡。");
    expect(enchantsNamed(raw)).toEqual(["迅速2: the first time the card is played, draw 2 cards (「第一次打出时抽2张牌」)"]);
  });
});

describe("where an enchantment is named", () => {
  it("event options carry the effect; the enchant screen after it is told which enchantments the event named", () => {
    const memory = createScreenMemory("EVENT");
    const decision = planEvent(env(SELF_HELP_BOOK, memory)) as AskDecision;
    const criteria = decision.questions["pick"]!.type === "choice" ? decision.questions["pick"]!.criteria : {};
    expect(String(criteria["o1"])).toContain("迅速2: the first time the card is played, draw 2 cards");
    expect(String(criteria["o0"])).toContain("灵巧2: the card gives 2 more Block");
    // The enchant screen (its prompt names no enchantment) on the same floor.
    const select = baseState("CARD_SELECTION", {
      run: runPayload({ floor: 36 }),
      available_actions: ["select_deck_card"],
      selection: {
        kind: "deck_enchant_select", prompt: "[center]选择[blue]1[/blue]张牌来[purple]附魔[/purple]。[/center]", min_select: 1, max_select: 1, selected_count: 0, can_confirm: false,
        cards: [
          { index: 0, selected: false, card_id: "INFLAME", name: "Inflame", upgraded: false, card_type: "Power", energy_cost: 1, resolved_rules_text: "Gain 2 Strength.", dynamic_values: [] },
          { index: 1, selected: false, card_id: "BASH", name: "Bash", upgraded: false, card_type: "Attack", energy_cost: 2, resolved_rules_text: "Deal 8 damage.", dynamic_values: [] },
        ],
      },
    });
    const pick = planSelection(env(select, memory)) as AskDecision;
    // DeepSeek decides deck picks (BUILD_DECIDER=deepseek): its facts carry it too.
    const deepseek = planSelection({ ...env(select, memory), buildDecider: "deepseek" }) as AskDecision;
    expect(JSON.stringify(deepseek)).toContain("迅速2: the first time the card is played, draw 2 cards");
    expect(JSON.stringify(pick.state)).toContain("one of the event's: 灵巧2: the card gives 2 more Block | 迅速2: the first time the card is played, draw 2 cards");
    // Another floor: not this event's.
    const later = planSelection(env({ ...select, run: runPayload({ floor: 40 }) }, memory)) as AskDecision;
    expect(JSON.stringify(later.state)).toContain("not named by the game: effect text unavailable");
  });

  it("deck lines of an enchanted card name the enchantment and its effect (agent_view mods -> the matching deck copy)", () => {
    const raw = baseState("MAP", {
      run: runPayload({
        deck: [
          { index: 0, card_id: "INFLAME", name: "Inflame", upgraded: false, card_type: "Power", energy_cost: 1, resolved_rules_text: "Gain 2 Strength.", dynamic_values: [] },
          { index: 1, card_id: "INFLAME", name: "Inflame", upgraded: false, card_type: "Power", energy_cost: 1, resolved_rules_text: "Gain 2 Strength. 第一次打出时抽2张牌。", dynamic_values: [] },
        ],
      }),
      agent_view: {
        run: {
          deck: [
            { line: "Inflame [1费]：Gain 2 Strength.", card_ids: ["INFLAME"], keywords: [], mods: [] },
            { line: "Inflame [1费]：Gain 2 Strength. 第一次打出时抽2张牌。", card_ids: ["INFLAME"], keywords: ["附魔"], mods: ["Enchantment", "迅速"] },
          ],
        },
      },
    });
    const entries = deckEntries(parseGameState(raw), testKnowledge);
    expect(entries[0]!.enchant).toBeUndefined();
    expect(entries[1]!.enchant).toBe("迅速: the first time the card is played, draw N cards (「第一次打出时抽N张牌」)");
    expect(describeDeck(entries).split("\n")[1]).toMatch(/^Inflame \(Power, 1E\) \[enchanted 迅速: the first time the card is played, draw N cards/);
  });
});

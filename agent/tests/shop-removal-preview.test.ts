import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import { cardIdentity, deckCards, selectableCards, unlistedNote, unverifiedRemovalPreview } from "../src/hand/screens/oneshot.js";
import { parseShopPlan } from "../src/hand/screens/shop.js";
import { pendingPickStep, pickNotOfferedNote, planSelection } from "../src/hand/screens/selection.js";
import { baseState, runPayload } from "./scenarios.js";
import { env } from "./oneshot-support.js";

// Every input is fixed. No generated, continuously refreshed knowledge is part of this regression.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed shop preview"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const follow = { task: "remove" as const, count: 1, upTo: false, text: "" };
const deck = Array.from({ length: 34 }, (_, index) => ({ index,
  card_id: index === 33 ? "REGRET" : `FIXED_CARD_${index}`, name: index === 33 ? "悔恨" : `牌${index}`,
  card_type: "Skill", rarity: "Common", energy_cost: 1, is_upgraded: false,
  rules_text: "fixed", resolved_rules_text: "fixed" }));

function shop(character = "SILENT", ascension = 10) {
  return env(baseState("SHOP", { run_id: "9Z9H2EXKLF3T", in_combat: false,
    available_actions: ["remove_card_at_shop"],
    run: runPayload({ floor: 37, character_id: character, ascension, gold: 300, deck, relics: [], potions: [] }),
    shop: { is_open: true, card_removal: { available: true, used: false, enough_gold: true, price: 75 } } }));
}

function selection(reordered: boolean) {
  const original = shop();
  const preview = selectableCards(original.state, deckCards(original.state, original.knowledge), follow).preview;
  const actual = reordered ? [deck[33]!, ...deck.slice(0, 24)] : deck.slice(0, 25);
  const selected = env(baseState("CARD_SELECTION", { ...original.state.raw, screen: "CARD_SELECTION",
    available_actions: ["select_deck_card"],
    selection: { kind: "deck_card_select", prompt: "移除1张牌", cards: actual.map((card, index) => ({ ...card, index })) },
  }), original.screenMemory);
  selected.screenMemory.pendingPick = { ref: "fixed-shop", runId: "9Z9H2EXKLF3T", floor: 37,
    source: "shop", task: "remove", cards: [cardIdentity(deck[0]!)], names: ["牌0"], step: 2, selectionPreview: preview };
  return selected;
}

it("F37: does not reject the deck-index-33 target before observing the removal page", () => {
  const e = shop();
  const parsed = parseShopPlan({ plan: ["remove:c33"] }, e);
  expect(parsed).toHaveProperty("steps");
  const preview = selectableCards(e.state, deckCards(e.state, e.knowledge), follow);
  const note = unlistedNote(preview.unlisted, "remove", unverifiedRemovalPreview(e.state));
  expect(note).not.toHaveProperty("not_on_selection_screen");
  expect(note["selection_screen_prediction"]).toContain("尚未现场核实");
});

it("F37: pauses the original commitment and preserves both lists when the real page differs", () => {
  const e = selection(true);
  expect(pendingPickStep(e, "deck_card_select", "移除1张牌", 0, 1)).toBeNull();
  expect(e.screenMemory.pendingPick).toBeUndefined();
  expect(e.screenMemory.selectionPreviewMismatch).toMatchObject({ ref: "fixed-shop", name: "牌0" });
  expect(pickNotOfferedNote(e, "remove")["selection_preview_mismatch"]).toContain("REGRET");
  expect(planSelection(e)?.kind).toBe("ask");
});

it("an unchanged candidate multiset preserves the plan and uses the current page index", () => {
  const e = selection(false);
  const cards = (e.state.raw["selection"] as Record<string, any>)["cards"];
  cards[0].index = 17;
  expect(pendingPickStep(e, "deck_card_select", "移除1张牌", 0, 1)?.kind).toBe("act");
  const step = pendingPickStep(e, "deck_card_select", "移除1张牌", 0, 1);
  expect(step?.kind === "act" && step.intent).toEqual({ action: "select_deck_card", option_index: 17 });
});

it.each([["IRONCLAD", 10], ["SILENT", 9]])("preserves the previous %s A%i precheck", (character, ascension) => {
  expect(parseShopPlan({ plan: ["remove:c33"] }, shop(character, ascension))).toHaveProperty("invalid");
});

it("a genuinely absent target still falls back to the actual selection question", () => {
  const e = selection(false);
  e.screenMemory.pendingPick!.cards = [cardIdentity(deck[33]!)];
  e.screenMemory.pendingPick!.names = ["悔恨"];
  expect(pendingPickStep(e, "deck_card_select", "移除1张牌", 0, 1)).toBeNull();
  expect(e.screenMemory.pickNotOffered?.name).toBe("悔恨");
  expect(pickNotOfferedNote(e, "remove")["named_card_not_offered"]).not.toContain("deck order");
});

it("compares duplicate copies as a multiset instead of only comparing IDs", () => {
  const e = selection(false);
  const cards = (e.state.raw["selection"] as Record<string, any>)["cards"];
  cards.push({ ...cards[0], index: 25 });
  expect(pendingPickStep(e, "deck_card_select", "移除1张牌", 0, 1)).toBeNull();
  expect(e.screenMemory.selectionPreviewMismatch).toBeDefined();
});

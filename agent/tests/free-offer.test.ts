/**
 * A card choice for this turn whose card is free this turn (selection.ts freeOfferSource): the card potions' 1-of-3
 * offers, Liquid Memories' and Discovery's are scored at this turn's cost (card-model potionCardCost: 0, a Power 1 under
 * Spiked Gauntlets), not the printed one. The screen only says 「选择一张牌」; the loop's memory of the potion drunk or card
 * played (noteCardSource) and the state's running action tell where it comes from (logged boards, tests/free-offer-data).
 *
 * - 5LRZ F28 T2, Skill Potion: the 3-cost 15 block lost 6 points for a cost it does not pay; now code takes it (15 vs 9).
 * - VE97 F48 T5 (Spiked Gauntlets): the Colorless Potion's Powers at 1, its Skill at 0; Discovery's (the potion's card)
 *   offer the same, and only with the loop's memory (PlayCardAction alone also opens Seeker Strike's, not free).
 * - YN4E F33 T5, Liquid Memories: free with the memory; V6TW F33 T4, Droplet of Precognition (the same screen): not free.
 * - R1QJ F33 T2, Seeker Strike: not free. Without the memory (a restart), only a potion's 1-of-3 offer is taken as free.
 * - noteCardSource on the logged boards the drink and the play were decided on.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import type { ActionRequest } from "../src/hand/mod/client.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv, type ScreenMemory } from "../src/memory/types.js";
import { facingFightOf } from "../src/reflex/combat-plan.js";
import { freeOfferOptions, freeOfferSource, noteCardSource, planSelection } from "../src/hand/screens/selection.js";
import { potionCardCostOptions } from "../src/reflex/card-model.js";

type Raw = Record<string, unknown>;
interface Board { source: string; decision: Raw; opened: { action: "use_potion" | "play_card"; id: string; option_index: number | null; card_index: number | null; state?: Raw }; state: Raw }
const DATA = join(dirname(fileURLToPath(import.meta.url)), "free-offer-data");
const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const board = (name: string): Board => JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;
const config = loadConfig({} as NodeJS.ProcessEnv);

/** The board's env; `memo`: the loop's memory of what opened it (the logged opening action), or none (a restart). */
function envOf(fx: Board, memo: "logged" | "none" | ScreenMemory["cardSource"] = "logged"): DecisionEnv {
  const state = parseGameState(fx.state);
  const screenMemory = createScreenMemory(state.screen);
  if (memo === "logged") screenMemory.cardSource = { fight: facingFightOf(state), turn: state.turn ?? null, action: fx.opened.action, id: fx.opened.id };
  else if (memo !== "none") screenMemory.cardSource = memo;
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory, thresholds: config.thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: false, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "jev",
  };
}
const kindOf = (fx: Board): string => String((fx.state["selection"] as Raw)["kind"]);
/** Code's pick: the act's card, or the ask's deterministic fallback (its top score). */
function pickOf(decision: Decision | null): number | undefined {
  if (!decision) return undefined;
  if (decision.kind === "act") return decision.intent.option_index;
  return (decision as AskDecision).resolve({} as AnswerSet).intent?.option_index;
}
/** The candidates' costs as the question shows them. */
const costsOf = (decision: Decision | null): unknown[] => (((decision as AskDecision).state as Raw)["candidates"] as Raw[]).map((card) => card["cost"]);

afterEach(() => {
  freeOfferOptions.enabled = true;
  potionCardCostOptions.relics = true;
});

describe("a card potion's offer is scored at this turn's cost", () => {
  it("5LRZ F28 T2, Skill Potion: the 3-cost 15 block is taken (it was asked, Battle Trance on top)", () => {
    const fx = board("5lrz-f28-t2-skill-potion");
    expect(freeOfferSource(envOf(fx), kindOf(fx))).toBe("SKILL_POTION");
    const now = planSelection(envOf(fx))!;
    expect(now.kind).toBe("act");
    expect(pickOf(now)).toBe(1);
    expect(now.kind === "act" && now.rationale).toMatch(/scores 15 vs .* 9/);
    // No memory (a restart): a potion's 1-of-3 offer is free all the same.
    expect(freeOfferSource(envOf(fx, "none"), kindOf(fx))).toBe("a card potion");
    expect(pickOf(planSelection(envOf(fx, "none")))).toBe(1);
    // As before: asked, the printed costs shown, Battle Trance on top.
    freeOfferOptions.enabled = false;
    const before = planSelection(envOf(fx))!;
    expect(before.kind).toBe("ask");
    expect(pickOf(before)).toBe(0);
    expect(costsOf(before)).toEqual([0, 3, 1]);
  });

  it("VE97 F48 T5 (Spiked Gauntlets), Colorless Potion: its Powers at 1, its Skill at 0; the top pick changes", () => {
    const fx = board("ve97-f48-t5-colorless-potion");
    const now = planSelection(envOf(fx))! as AskDecision;
    expect(now.kind).toBe("ask");
    expect(costsOf(now)).toEqual([1, 0, 1]);
    expect(String(((now.state as Raw)["situation"] as Raw)["cost_this_turn"])).toMatch(/a Power costs 1: Spiked Gauntlets/);
    expect(pickOf(now)).toBe(0);
    freeOfferOptions.enabled = false;
    const before = planSelection(envOf(fx))!;
    expect(costsOf(before)).toEqual([3, 1, 3]);
    expect(pickOf(before)).toBe(1);
    expect(((before as AskDecision).state as Raw)["situation"]).not.toHaveProperty("cost_this_turn");
    // The relic's +1 off (tools only): every card at 0.
    freeOfferOptions.enabled = true;
    potionCardCostOptions.relics = false;
    expect(costsOf(planSelection(envOf(fx)))).toEqual([0, 0, 0]);
  });

  it("VE97 F48 T5, Discovery: free with the loop's memory (Powers 1, Molten Fist 0); without it, printed", () => {
    const fx = board("ve97-f48-t5-discovery");
    expect(fx.opened).toMatchObject({ action: "play_card", id: "DISCOVERY" });
    expect(freeOfferSource(envOf(fx), kindOf(fx))).toBe("DISCOVERY");
    expect(costsOf(planSelection(envOf(fx)))).toEqual([1, 0, 1]);
    // PlayCardAction alone also opens Seeker Strike's choice: no memory, no free offer.
    expect(freeOfferSource(envOf(fx, "none"), kindOf(fx))).toBeNull();
    expect(costsOf(planSelection(envOf(fx, "none")))).toEqual([2, 1, 1]);
    // A memory of another turn, or of a potion while a card is being played, is not this screen's.
    const state = parseGameState(fx.state);
    expect(freeOfferSource(envOf(fx, { fight: facingFightOf(state), turn: (state.turn ?? 0) - 1, action: "play_card", id: "DISCOVERY" }), kindOf(fx))).toBeNull();
    expect(freeOfferSource(envOf(fx, { fight: facingFightOf(state), turn: state.turn ?? null, action: "use_potion", id: "COLORLESS_POTION" }), kindOf(fx))).toBeNull();
  });

  it("Liquid Memories is free, Droplet of Precognition (the same screen) and Seeker Strike are not", () => {
    const memories = board("yn4e-f33-t5-liquid-memories");
    expect(freeOfferSource(envOf(memories), kindOf(memories))).toBe("LIQUID_MEMORIES");
    const now = planSelection(envOf(memories));
    expect(new Set(costsOf(now))).toEqual(new Set([0]));
    freeOfferOptions.enabled = false;
    const before = planSelection(envOf(memories));
    expect(costsOf(before)).toContain(3);
    expect(pickOf(now)).not.toBe(pickOf(before));
    freeOfferOptions.enabled = true;
    // Without the memory a pile pick (deck_card_select) is not taken as free: Droplet's is the same screen.
    expect(freeOfferSource(envOf(memories, "none"), kindOf(memories))).toBeNull();
    for (const name of ["v6tw-f33-t4-droplet", "r1qj-f33-t2-seeker-strike"]) {
      const fx = board(name);
      expect(freeOfferSource(envOf(fx), kindOf(fx))).toBeNull();
      const after = JSON.stringify(planSelection(envOf(fx)));
      freeOfferOptions.enabled = false;
      expect(JSON.stringify(planSelection(envOf(fx)))).toBe(after);
      freeOfferOptions.enabled = true;
    }
  });
});

describe("noteCardSource: the loop's memory of the potion drunk or card played", () => {
  it("names the logged drink's potion and the logged play's card, for this fight and turn; other actions leave it", () => {
    const potion = board("ve97-f48-t5-colorless-potion");
    const memory = createScreenMemory("COMBAT");
    const drinkState = parseGameState(potion.opened.state!);
    noteCardSource(memory, drinkState, { action: "use_potion", option_index: potion.opened.option_index! });
    expect(memory.cardSource).toEqual({ fight: facingFightOf(drinkState), turn: 5, action: "use_potion", id: "COLORLESS_POTION" });
    // The choice's own pick (and a re-sent one) leaves it: the offer keeps its source.
    noteCardSource(memory, parseGameState(potion.state), { action: "select_deck_card", option_index: 0 } as ActionRequest);
    expect(memory.cardSource?.id).toBe("COLORLESS_POTION");
    const discovery = board("ve97-f48-t5-discovery");
    const playState = parseGameState(discovery.opened.state!);
    noteCardSource(memory, playState, { action: "play_card", card_index: discovery.opened.card_index! });
    expect(memory.cardSource).toEqual({ fight: facingFightOf(playState), turn: 5, action: "play_card", id: "DISCOVERY" });
    // ... and what it notes is what the next choice reads.
    const env = envOf(discovery, memory.cardSource);
    expect(freeOfferSource(env, kindOf(discovery))).toBe("DISCOVERY");
  });
});

/** YQL8RZ8BWN1E A10 F17 T3, attempts 1/6; silent-0205. Frozen inputs, no refreshed knowledge. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import { noteScreenChange } from "../src/hand/loop.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planSelection } from "../src/hand/screens/selection.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import type { Step } from "../src/reflex/turn-solver.js";

const evidence = JSON.parse(readFileSync(new URL("./silent-discard-plan-evidence.json", import.meta.url), "utf8")) as {
  boards: { before: Record<string, unknown>; selection: Record<string, unknown>; after: Record<string, unknown>;
    reference: { hp_lost: number; damage_dealt: number; block_gained: number }; remaining: Step[] }[];
};
const knowledge = makeKnowledge({ cards: [] }, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

function env(at = 0): DecisionEnv {
  const board = evidence.boards[at]!;
  const state = parseGameState(structuredClone(board.selection));
  const memory = createScreenMemory("COMBAT");
  memory.combatPlan = { turn: 3, remaining: structuredClone(board.remaining), via: "jev", expectedHand: "",
    handLen: 4, selectionReference: structuredClone(board.reference) };
  noteScreenChange(memory, state);
  return { state, knowledge, screenMemory: memory, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn",
    shopDiscardPotions: [], buildDecider: "jev" };
}

function ask(e: DecisionEnv): AskDecision {
  const decision = planSelection(e);
  expect(decision?.kind).toBe("ask");
  return decision as AskDecision;
}
const context = (decision: AskDecision) => asRecord(asRecord(decision.state["situation"])["discard_plan"]);
const options = (decision: AskDecision) => Object.values(decision.questions["pick"]!.type === "choice"
  ? decision.questions["pick"]!.criteria : {}).map((value) => JSON.parse(value!) as Record<string, unknown>);
const answer = (choice: string) => ({ pick: { type: "choice" as const, choice, probabilities: { [choice]: 1 }, confidence: 1, raw: {} } });

describe("Silent's discard question retains the conditional continuation", () => {
  it.each([0, 1])("keeps every option and the observed prediction on frozen attempt %s", (at) => {
    const e = env(at);
    const decision = ask(e);
    expect(context(decision)).toMatchObject({ status: "available", original_full_plan_prediction:
      { hp_lost: 3, damage_dealt: 29, block_gained: 8 } });
    expect(asArray(context(decision)["remaining"])[0]).toMatchObject({ card_id: "PREDATOR", target: "瀑布巨兽" });
    expect(asRecord(asArray(context(decision)["remaining"])[0])["text"]).toContain("下个回合抽2张牌");
    expect(options(decision).map((option) => option["removes_planned_continuation"])).toEqual([false, false, false, true]);
    // Jev remains free to choose the planned card, with the canceled prediction identified in the record.
    const discard = decision.resolve(answer("card3"));
    expect(discard.intent).toMatchObject({ action: "select_deck_card", option_index: 3 });
    expect(discard.rationale).toContain("原整条预测失效");
    expect(decision.resolve(answer("card0")).rationale).not.toContain("原整条预测失效");
    noteScreenChange(e.screenMemory, parseGameState(evidence.boards[at]!.after));
    expect(e.screenMemory.combatPlan?.afterSelection).toBe(true);
    expect(asArray(asRecord(e.state.raw["combat"])["hand"])).toHaveLength(4);
  });

  it("a spare equivalent copy still fulfills one planned play", () => {
    const e = env();
    const cards = asArray(asRecord(e.state.raw["selection"])["cards"]).map(asRecord);
    cards.push({ ...cards[3], index: 4 });
    asRecord(e.state.raw["selection"])["cards"] = cards;
    expect(options(ask(e)).map((option) => option["removes_planned_continuation"])).toEqual([false, false, false, false, false]);
    e.screenMemory.pausedCombatPlan!.remaining.push({ ...e.screenMemory.pausedCombatPlan!.remaining[0]! });
    expect(options(ask(e)).slice(3).map((option) => option["removes_planned_continuation"])).toEqual([true, true]);
  });

  it("an upgraded or differently costed copy cannot replace the planned copy", () => {
    const e = env();
    const selection = asRecord(e.state.raw["selection"]);
    const cards = asArray(selection["cards"]).map(asRecord);
    selection["cards"] = [...cards, { ...cards[3], index: 4, upgraded: true }, { ...cards[3], index: 5, energy_cost: 1 }];
    expect(options(ask(e)).map((option) => option["removes_planned_continuation"])).toEqual([false, false, false, true, false, false]);
  });

  it("missing or already removed plans report unknown instead of inventing a commitment", () => {
    const e = env();
    e.screenMemory.pausedCombatPlan = undefined;
    expect(context(ask(e))["status"]).toBe("unknown");
    const missing = env();
    missing.screenMemory.pausedCombatPlan!.remaining[0]!.cardId = "UNOBSERVED";
    const decision = ask(missing);
    expect(context(decision)["status"]).toBe("unknown");
    expect(options(decision).every((option) => option["removes_planned_continuation"] === null)).toBe(true);
    expect(decision.resolve(answer("card3")).rationale).not.toContain("原整条预测失效");
  });

  it("does not show another turn's prediction", () => {
    const e = env();
    e.screenMemory.pausedCombatPlan!.turn = 2;
    expect(context(ask(e))).toEqual({ status: "unknown", reason: "没有本回合可核对的已选方案" });
  });

  it.each(["IRONCLAD", "SILENT_A9"])("preserves the legacy question for %s", (scope) => {
    const e = env();
    if (scope === "IRONCLAD") asRecord(e.state.run!.raw)["character_id"] = "IRONCLAD";
    else e.state.run!.ascension = 9;
    const decision = ask(e);
    expect(asRecord(decision.state["situation"])["discard_plan"]).toBeUndefined();
    expect(options(decision).every((option) => option["removes_planned_continuation"] === undefined)).toBe(true);
    expect(decision.questions["pick"]!.instructions).toBe("Which card should I choose?");
  });

  it("leaves non-discard selection screens unchanged", () => {
    const e = env();
    asRecord(e.state.raw["selection"])["prompt"] = "选择1张牌。";
    expect(asRecord(ask(e).state["situation"])["discard_plan"]).toBeUndefined();
  });
});

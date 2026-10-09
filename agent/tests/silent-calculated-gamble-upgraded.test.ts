/** AYTX5H4H69E3 SILENT A10 F45 T1, silent-0317: fixed raw hand pairs, without refreshed knowledge. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps, solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";
import evidence from "./silent-calculated-gamble-upgraded-evidence.json";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/"))
      throw Object.assign(new Error("ENOENT: fixed upgraded Gamble evidence"), { code: "ENOENT" });
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: evidence.deck.map((entry) => ({
  id: entry.card_id, type: entry.card_type,
})) }, "cache");
const models = (frame: keyof typeof evidence.frames) => evidence.frames[frame].hand
  .map((entry) => modelHandCard(entry, entry.index, knowledge, "silent", 10));
const step = (entry: CardModel, target = 1) => ({ cardIndex: entry.index, cardId: entry.cardId,
  name: entry.name, upgraded: entry.upgraded, ...(entry.target === "single" ? { target } : {}) });
function inputFor(frame: keyof typeof evidence.frames = "335768"): SolverInput {
  const observed = evidence.frames[frame];
  const input = board().solver;
  input.hand = models(frame);
  input.player = { hp: observed.player.current_hp, maxHp: observed.player.max_hp,
    energy: observed.player.energy, block: observed.player.block, weak: false,
    vulnerable: false, intangible: false, strengthNow: 1 };
  input.enemies = observed.enemies.map((enemy) => ({ index: enemy.index, name: enemy.name,
    hp: enemy.current_hp, maxHp: enemy.max_hp, block: enemy.block, vulnerable: 0, weak: 0,
    artifact: 0, intangible: false, attacks: enemy.intents.filter((intent) => intent.damage !== null)
      .map((intent) => ({ damage: intent.damage!, hits: intent.hits! })) }));
  return input;
}

it("discards the three old cards after the played upgrade leaves, without borrowing Dagger Spray", () => {
  const input = inputFor();
  const gamble = input.hand.find((entry) => entry.cardId === "CALCULATED_GAMBLE")!;
  const before = JSON.stringify(input);
  const plan = replaySteps(input, [step(gamble)])!;
  expect(plan.steps[0]!.discards).toEqual(["DEFEND_SILENT", "STRIKE_SILENT", "DAGGER_SPRAY"]);
  expect(plan.outcome).toMatchObject({ cardsDrawn: 3, damageDealt: 0, blockGained: 0, energyLeft: 1, hpLoss: 6 });
  for (const old of input.hand.filter((entry) => entry !== gamble)) {
    expect(replaySteps(input, [step(gamble), step(old)])).toBeNull();
  }
  expect(JSON.stringify(input)).toBe(before);
});

it("search never offers an old-hand suffix after the temporary upgrade", () => {
  const input = inputFor();
  const plans = solveTurn(input).plans;
  const gambling = plans.filter((plan) => plan.steps.some((s) => s.cardId === "CALCULATED_GAMBLE"));
  expect(gambling.length).toBeGreaterThan(0);
  for (const plan of gambling) {
    const at = plan.steps.findIndex((s) => s.cardId === "CALCULATED_GAMBLE");
    expect(plan.steps.slice(at + 1)).toEqual([]);
  }
  const printed = evidence.deck.find((entry) => entry.card_id === "CALCULATED_GAMBLE")!;
  expect(printed.upgraded).toBe(false);
  expect(input.hand.find((entry) => entry.cardId === "CALCULATED_GAMBLE")!.upgraded).toBe(true);
});

it("an explicitly known replacement draws only the new Strike, and the actual new frame can replan it", () => {
  const input = inputFor();
  const gamble = input.hand.find((entry) => entry.cardId === "CALCULATED_GAMBLE")!;
  input.knownTop = models("335769").map((entry, i) => ({ ...entry, index: 600 + i, key: `drawn${i}` }));
  const drawnStrike = input.knownTop.find((entry) => entry.cardId === "STRIKE_SILENT")!;
  const plan = replaySteps(input, [step(gamble), step(drawnStrike)])!;
  expect(plan.outcome).toMatchObject({ cardsDrawn: 3, damageDealt: 10, blockGained: 0, energyLeft: 0 });
  expect(plan.outcome.enemyHpAfter.find((enemy) => enemy.index === 1)!.hp)
    .toBe(evidence.frames["335770"].enemies.find((enemy) => enemy.index === 1)!.current_hp);
  const fresh = inputFor("335769");
  const strike = fresh.hand.find((entry) => entry.cardId === "STRIKE_SILENT")!;
  expect(replaySteps(fresh, [step(strike)])!.outcome).toMatchObject({ damageDealt: 10, energyLeft: 0 });
});

it("counts a full hand's unplayable card but leaves a potion slot available", () => {
  const input = inputFor();
  const gamble = input.hand.find((entry) => entry.cardId === "CALCULATED_GAMBLE")!;
  // Protocol controls for the existing whole-hand implementation, not new card or potion observations.
  const held = card(88, "FIXED_HELD", { type: "Curse", target: "self", playable: false });
  const potion = card(-1, "FIXED_POTION", { type: "Potion", target: "self", cost: 0, block: 7 });
  input.hand = [gamble, held, ...Array.from({ length: 8 }, (_, i) => card(100 + i, "FIXED_CARD")), potion];
  const plan = replaySteps(input, [step(gamble), step(potion)])!;
  expect(plan.outcome).toMatchObject({ cardsDrawn: 9, blockGained: 7 });
  expect(plan.steps[0]!.discards).toHaveLength(9);
  expect(plan.steps[0]!.discards).toContain("FIXED_HELD");
  expect(plan.steps[0]!.discards).not.toContain("FIXED_POTION");
});

it.each([["ironclad", 10], ["silent", 9], ["silent", null], ["", 10]] as const)
  ("preserves the old upgraded model for character=%s and ascension=%s", (character, ascension) => {
    const raw = evidence.frames["335768"].hand.find((entry) => entry.card_id === "CALCULATED_GAMBLE")!;
    const model = modelHandCard(raw, raw.index, knowledge, character, ascension);
    expect(model.discardsHand).toBeUndefined();
    expect(model.drawDiscardedHand).toBeUndefined();
    expect(model.known).toBe(false);
  });

it("keeps missing or changed upgrade text unknown and preserves the plain model", () => {
  const raw = evidence.frames["335768"].hand.find((entry) => entry.card_id === "CALCULATED_GAMBLE")!;
  for (const resolved_rules_text of ["", "保留。 丢弃1张手牌, 然后抽相同数量的牌。 消耗。"])
    expect(modelHandCard({ ...raw, resolved_rules_text }, raw.index, knowledge, "silent", 10).discardsHand)
      .toBeUndefined();
  expect(modelHandCard({ ...raw, upgraded: false }, raw.index, knowledge, "silent", 10))
    .toMatchObject({ discardsHand: true, drawDiscardedHand: true, known: true });
});

/** KFRDELW2TH2P F33 T7: fixed raw frames, no generated knowledge or model calls. */
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-demon-input-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planSelection } from "../src/hand/screens/selection.js";
import { handTrickSlothFacts } from "../src/hand/screens/silent-hand-trick-facts.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { facingFightOf, planCombatTurn } from "../src/reflex/combat-plan.js";
import { observedDemonPoison } from "../src/reflex/silent-demon-potion.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Silent frames only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const knowledge = makeKnowledge({ cards: evidence.selection.selection.cards.map((c) => ({
  id: c.card_id, name: c.name, type: c.card_type, cost: c.energy_cost,
  description: c.resolved_rules_text, description_raw: c.rules_text, vars: c.dynamic_values,
})) }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });
function env(raw: Raw): DecisionEnv {
  const state = parseGameState(raw);
  const memory = createScreenMemory(state.screen);
  memory.cardSource = { action: "play_card", id: "HAND_TRICK", fight: facingFightOf(state), turn: state.turn };
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: memory, shopDiscardPotions: [], buildDecider: "deepseek" };
}
function inputFor(raw: Raw): SolverInput {
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env(raw)); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the fixed board was not solved");
  return input;
}
const cloneSelection = (): Raw => structuredClone(evidence.selection);

it("the production question exposes the two remaining slots and still lets Jev choose either original target", () => {
  const raw = cloneSelection();
  const before = structuredClone(raw);
  const decision = planSelection(env(raw));
  if (decision?.kind !== "ask" || decision.questions.pick?.type !== "choice") throw new Error("expected Jev choice");
  expect(decision.deepseek).toBeUndefined();
  expect(Object.keys(decision.questions.pick.criteria).sort()).toEqual(["card0", "card1"]);
  for (const index of [0, 1]) {
    const key = `card${index}`;
    const facts = JSON.parse(decision.questions.pick.criteria[key]!).hand_trick_resources;
    expect(facts).toMatchObject({ remaining_manual_plays_upper_bound: 2, energy_now: 3,
      energy_sufficient_for_target_alone: true, continuation_verified: false });
    expect(facts.hand_now.map((c: Raw) => c.card_id)).toEqual(["DEFEND_SILENT", "BURST", "POISONED_STAB"]);
    expect(decision.resolve({ pick: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } }).intent)
      .toEqual({ action: "select_deck_card", option_index: index });
  }
  const burst = JSON.parse(decision.questions.pick.criteria.card1!).hand_trick_resources;
  expect(burst.target_requires_later_skill).toBe(true);
  expect(burst.other_manual_plays_that_exhaust_the_cap).toBe(evidence.locked.combat.player.cards_played_this_turn - 1);
  expect(evidence.locked.combat.hand[0]).toMatchObject({ card_id: "BURST", energy_cost: 1, unplayable_preventer_id: "SLOTH_POWER" });
  expect(evidence.locked.combat.player.energy).toBe(1);
  expect(raw).toEqual(before);
});

it.each([
  ["other character", (x: Raw) => { x.run.character_id = "IRONCLAD"; }],
  ["unobserved ascension", (x: Raw) => { x.run.ascension = 9; }],
  ["missing counter", (x: Raw) => { delete x.combat.player.cards_played_this_turn; }],
  ["earlier plays", (x: Raw) => { x.combat.player.cards_played_this_turn = 2; }],
  ["other cap", (x: Raw) => { x.combat.player.powers.find((p: Raw) => p.power_id === "SLOTH_POWER").amount = 4; }],
  ["different copy", (x: Raw) => { x.combat.hand[0].energy_cost = 0; }],
  ["ambiguous copy", (x: Raw) => { x.combat.hand[1].index = 0; }],
  ["other action", (x: Raw) => { x.combat.action_readiness.running_action_type = "UsePotionAction"; }],
] as const)("%s retains the old question", (_name, change) => {
  const raw = cloneSelection(); change(raw);
  const context = env(raw);
  expect(handTrickSlothFacts(context.state, true)).toBeNull();
  const withSource = JSON.stringify(planSelection(context));
  // Disable only this helper's gate, preserving source identity for unrelated consumers.
  context.screenMemory.cardSource!.id = "UNOBSERVED_SOURCE";
  expect(JSON.stringify(planSelection(context))).toBe(withSource);
});

it.each(["old turn", "old fight", "missing"])("%s Hand Trick source cannot add facts", (kind) => {
  const context = env(cloneSelection());
  if (kind === "missing") context.screenMemory.cardSource = undefined;
  else if (kind === "old turn") context.screenMemory.cardSource!.turn = 6;
  else context.screenMemory.cardSource!.fight = "old";
  expect(JSON.stringify(planSelection(context))).not.toContain("hand_trick_resources");
});

it("unknown target cost stays unknown rather than granting free energy", () => {
  const raw = cloneSelection();
  for (const c of [raw.selection.cards[1], raw.combat.hand[1]]) c.energy_cost = null;
  const facts = handTrickSlothFacts(parseGameState(raw), true)!.get(1) as Raw;
  expect(facts.target_energy_after_one_play).toBeNull();
  expect(facts.energy_sufficient_for_target_alone).toBeNull();
});

it("all six fixed drinks enter the actual solver as six poison, despite the spent manual play cap", () => {
  for (const pair of evidence.poison_pairs) {
    const raw: Raw = structuredClone(pair.before);
    const before = structuredClone(raw);
    const input = inputFor(raw);
    const potion = input.hand.find((c) => c.cardId === "POTION:POISON_POTION:1");
    expect(potion).toMatchObject({ poison: 6, known: true, damage: null });
    expect(input.player.maxPlays).toBe(0);
    const enemy = pair.before.combat.enemies[0]!;
    const next = pair.after.combat.enemies[0]!;
    const poison = (e: typeof enemy) => e.powers.find((p) => p.power_id === "POISON_POWER")!.amount;
    expect(poison(next) - poison(enemy)).toBe(6);
    expect(next.current_hp).toBe(enemy.current_hp);
    const plan = replaySteps(input, [{ cardIndex: potion!.index, cardId: potion!.cardId,
      name: potion!.name, upgraded: false, target: 0 }]);
    expect(plan).not.toBeNull();
    expect(raw).toEqual(before);
  }
});

it("the final fixed turn's two poison ticks match 159 to 74, without claiming survival", () => {
  const input = inputFor(structuredClone(evidence.locked));
  const potion = input.hand.find((c) => c.cardId === "POTION:POISON_POTION:1")!;
  const plan = replaySteps(input, [{ cardIndex: potion.index, cardId: potion.cardId, name: potion.name, upgraded: false, target: 0 }])!;
  expect(plan.outcome.damageDealt).toBe(evidence.locked.combat.enemies[0]!.current_hp - evidence.after_turn.combat.enemies[0]!.current_hp);
  expect(plan.outcome.damageDealt).toBe(85);
  expect(plan.outcome.hpLoss).toBe(22);
  expect(evidence.after_turn.combat.player.current_hp).toBe(0);
});

it.each([
  ["other character", (x: Raw) => { x.run.character_id = "IRONCLAD"; }],
  ["other ascension", (x: Raw) => { x.run.ascension = 9; }],
  ["new relic", (x: Raw) => { x.run.relics.push({ relic_id: "UNOBSERVED" }); }],
  ["missing relic data", (x: Raw) => { delete x.run.relics; }],
  ["new player modifier", (x: Raw) => { x.combat.player.powers.push({ power_id: "UNOBSERVED", amount: 1 }); }],
  ["unknown modifier without amount", (x: Raw) => { x.combat.player.powers[0] = { power_id: "UNOBSERVED" }; }],
  ["unobserved plating", (x: Raw) => { x.combat.player.powers.find((p: Raw) => p.power_id === "PLATING_POWER").amount = 7; }],
  ["artifact", (x: Raw) => { x.combat.enemies[0].powers.push({ power_id: "ARTIFACT_POWER", amount: 1 }); }],
  ["other enemy", (x: Raw) => { x.combat.enemies[0].enemy_id = "UNOBSERVED"; }],
] as const)("%s retains the previous unknown-potion input", (_name, change) => {
  const raw: Raw = structuredClone(evidence.locked); change(raw);
  expect(observedDemonPoison(parseGameState(raw))).toBeNull();
  expect(inputFor(raw).hand.some((c) => c.cardId.startsWith("POTION:POISON_POTION:"))).toBe(false);
});

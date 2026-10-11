/** XTSV1U9JD34T F49 T1, silent-0206: the observed drink, not a later-use policy. */
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import evidence from "./silent-ghost-potion-evidence.json" with { type: "json" };
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { modelPotion } from "../src/reflex/card-model.js";
import { replaySteps, solveTap, solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Ghost evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: evidence.state.run.deck.map((card) => ({ id: card.card_id, type: card.card_type })),
  monsters: [{ id: "TORCH_HEAD_AMALGAM", type: "Monster" }, { id: "QUEEN", type: "Boss" }] }, "cache");

function captured(character = "SILENT", ascension = 10, intangible = 0, hp = 23, heldLoss = false) {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  const raw: Record<string, any> = structuredClone(evidence.state);
  Object.assign(raw.run, { character_id: character, ascension, current_hp: hp });
  raw.combat.player.current_hp = hp;
  if (heldLoss) raw.combat.hand[0]!.resolved_rules_text = "不能被打出。在你的回合结束时，如果这张牌在你的手牌中，你失去30点生命。";
  // A playable zero-block control bypasses the pre-existing no-card emergency rule.
  // It adds no survival value; these controls test only the new model's decision path.
  if (hp <= 10) raw.combat.hand.push({ ...raw.combat.hand[0]!, index: 1, card_id: "DEFEND_SILENT", name: "fixed control",
    energy_cost: 1, playable: true, can_play_result: true, unplayable_reason: null, unplayable_reason_raw: null,
    unplayable_preventer_id: null, unplayable_preventer_type: null, rules_text: "获得0点格挡。", resolved_rules_text: "获得0点格挡。",
    dynamic_values: [{ name: "Block", base_value: 0, current_value: 0, enchanted_value: 0, is_modified: false, was_just_upgraded: false }] });
  if (intangible > 0) raw.combat.player.powers.push({ index: 1, power_id: "INTANGIBLE_POWER", name: "无实体", amount: intangible, is_debuff: false });
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (solver) => { input = solver; };
  try {
    const decision = planCombatTurn(env);
    expect(input).toBeDefined();
    return { input: input!, decision };
  } finally { solveTap.onSolve = null; }
}

afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); });

it("offers dry and observed Ghost lines with 10 and 0 HP loss, leaving the choice to Jev", () => {
  const { input, decision } = captured();
  const potion = input.hand.find((card) => card.cardId === "POTION:GHOST_IN_A_JAR:1")!;
  expect(potion).toMatchObject({ special: "intangible", cost: 0, type: "Potion" });
  expect(evidence.actual_after.powers.INTANGIBLE_POWER).toBe(1);
  expect(evidence.actual_after.enemies[0]!.intents[0]!.total_damage).toBe(1);
  const dry = replaySteps(input, [])!.outcome;
  const drink = replaySteps(input, [{ cardIndex: potion.index, cardId: potion.cardId, name: potion.name,
    upgraded: false, target: null, targetName: null }])!.outcome;
  expect(dry).toMatchObject({ hpLoss: 10, hpAfter: 13 });
  expect(drink).toMatchObject({ hpLoss: 0, hpAfter: 23, blockGained: 0, lasting: 0 });
  expect(solveTurn(input).plans.some((plan) => plan.steps.length === 0)).toBe(true);
  expect(decision?.kind).toBe("ask");
});

it("requires the explicit character observation instead of changing the global potion table", () => {
  expect(modelPotion("GHOST_IN_A_JAR", "Ghost", 0, [])).toBeNull();
  expect(modelPotion("GHOST_IN_A_JAR", "Ghost", 0, [], { enemyTargets: [], strength: 0, weak: false,
    observedGhostInAJar: true })).toMatchObject({ special: "intangible", type: "Potion" });
});

it("still asks Jev when the newly modelled Ghost is the only surviving line", () => {
  const { input, decision } = captured("SILENT", 10, 0, 10);
  expect(replaySteps(input, [])!.outcome.dies).toBe(true);
  expect(solveTurn(input).plans.some((plan) => !plan.outcome.dies)).toBe(true);
  expect(decision?.kind).toBe("ask");
});

it("does not turn an all-dying comparison into an automatic Ghost drink", () => {
  const { input, decision } = captured("SILENT", 10, 0, 10, true);
  expect(solveTurn(input).plans.every((plan) => plan.outcome.dies)).toBe(true);
  expect(decision?.kind).toBe("ask");
});

it.each([["IRONCLAD", 10, 0], ["SILENT", 9, 0], ["SILENT", 11, 0], ["SILENT", 10, 1], ["SILENT", 10, 2]])(
  "%s A%i with %i existing layers retains the unmodelled potion option", (character, ascension, layers) => {
    const { input, decision } = captured(character as string, ascension as number, layers as number);
    expect(input.hand.some((card) => card.cardId.startsWith("POTION:GHOST_IN_A_JAR:"))).toBe(false);
    expect(JSON.stringify(decision)).toContain("幽灵");
  },
);

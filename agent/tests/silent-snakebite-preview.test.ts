/** 7X0W3U8TVA2A A10 F30 T3 / F31 T1,T13, silent-0087; original proposal 763a4b9d9f17b815. */
import { expect, it } from "vitest";
import evidence from "./silent-snakebite-preview-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { applyApotheosisUpgrade, modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { board } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [{ id: "SNAKEBITE", type: "Skill" }] }, "cache");
const model = (raw: unknown, character = "silent", ascension: number | null = 10) =>
  modelHandCard(raw, 0, knowledge, character, ascension);

it.each(evidence.plays)("uses the exact eight-point preview at state $before.line without adding another bonus", (play) => {
  expect(model(play.card)).toMatchObject({ poison: 8, cost: 2, damage: null, flatValue: 0, known: true });
  expect(play.after.poison - play.before.poison).toBe(8);
  expect(play.after.enemy_hp).toBe(play.before.enemy_hp);
  expect(play.after.player_hp).toBe(play.before.player_hp);
  expect(play.before.energy - play.after.energy).toBe(2);
});

it("passes the observed preview into the turn solver and retains poison after settlement", () => {
  const play = evidence.plays[0]!;
  const input = board().solver;
  const snake = model(play.card);
  input.hand = [snake];
  input.player.energy = play.before.energy;
  input.enemies[0]!.hp = play.before.enemy_hp;
  input.enemies[0]!.poison = play.before.poison;
  input.enemies[0]!.attacks = [];
  const saved = JSON.stringify(input);
  const result = replaySteps(input, [{ cardIndex: snake.index, cardId: snake.cardId, name: snake.name,
    upgraded: false, target: 0 }])!;
  // This isolated settlement is a model check, not the historical whole-turn result.
  expect(result.outcome).toMatchObject({ damageDealt: play.after.poison, energyLeft: play.after.energy,
    unknownCards: [], enemyHpAfter: [{ hp: play.before.enemy_hp - play.after.poison,
      poison: play.after.poison - 1 }] });
  expect(JSON.stringify(input)).toBe(saved);
});

it("does not infer a modifier-dependent Apotheosis upgrade from the observed plain card", () => {
  const snake = model(evidence.plays[0]!.card);
  expect(snake.apotheosisUpgrade).toBeUndefined();
  expect(applyApotheosisUpgrade(snake).known).toBe(false);
});

it("preserves the previously supported ordinary seven-point preview", () => {
  const plain = structuredClone(evidence.plays[0]!.card);
  plain.dynamic_values[0]!.current_value = 7;
  plain.dynamic_values[0]!.is_modified = false;
  plain.resolved_rules_text = "保留。 给予7层中毒。";
  expect(model(plain)).toMatchObject({ poison: 7, known: true, cost: 2 });
});

it("keeps other characters, levels and unknown preview shapes on their prior model", () => {
  const raw = evidence.plays[0]!.card;
  for (const character of ["ironclad", "necrobinder", ""]) {
    expect(model(raw, character)).toMatchObject({ known: false, flatValue: 7 });
    expect(model(raw, character).poison).toBeUndefined();
  }
  for (const ascension of [null, 0, 9, 11]) expect(model(raw, "silent", ascension).poison).toBeUndefined();
  for (const altered of [
    { ...raw, upgraded: true }, { ...raw, energy_cost: 1 }, { ...raw, costs_x: true },
    { ...raw, star_cost: 1 }, { ...raw, star_costs_x: true },
    { ...raw, target_type: "Self" }, { ...raw, requires_target: false },
    { ...raw, enchantment: { id: "UNKNOWN" } },
    { ...raw, resolved_rules_text: raw.resolved_rules_text + " 重放。" },
    { ...raw, rules_text: raw.rules_text + " 未观察效果。" },
    { ...raw, dynamic_values: [{ ...raw.dynamic_values[0]!, base_value: 8 }] },
    { ...raw, dynamic_values: [{ ...raw.dynamic_values[0]!, enchanted_value: 8 }] },
    { ...raw, dynamic_values: [{ ...raw.dynamic_values[0]!, current_value: 9 }] },
    { ...raw, dynamic_values: [...raw.dynamic_values, { ...raw.dynamic_values[0]! }] },
  ]) expect(model(altered).poison).toBeUndefined();
});

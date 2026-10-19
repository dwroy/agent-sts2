/** HEMND3SMQYB8 A10 F48 T3; silent-0260/0261, fixed raw frames and no refreshed knowledge. */
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import evidence from "./silent-strangle-upgraded-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims, unmodelledEnemyPowers } from "../src/reflex/combat-plan.js";
import { replaySteps, type SolverInput } from "../src/reflex/turn-solver.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/"))
      throw Object.assign(new Error("ENOENT: fixed upgraded Strangle evidence"), { code: "ENOENT" });
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
const knowledge = makeKnowledge({ cards: evidence["308842"].state.run.deck.map((c) =>
  ({ id: c.card_id, type: c.card_type })) }, "cache");
function inputAt(line: keyof typeof evidence = "308842", character = "silent", ascension = 10): SolverInput {
  const s = evidence[line].state, p = s.combat.player;
  const power = (id: string) => p.powers.find((entry) => entry.power_id === id)?.amount ?? 0;
  return { hand: s.combat.hand.map((c, i) => modelHandCard(c, i, knowledge, character, ascension)),
    player: { hp: p.current_hp, maxHp: p.max_hp, block: p.block, energy: p.energy,
      weak: false, vulnerable: false, intangible: false, strengthNow: 0,
      dexterityNow: power("DEXTERITY_POWER"), poisonExtraTriggers: power("ACCELERANT_POWER") },
    enemies: enemySims(s.combat, ascension, character), fightKind: "boss", turn: s.turn,
    wither: { every: 6, played: 10 + p.cards_played_this_turn, damage: 3 } };
}
function play(input: SolverInput, ids: string[]) {
  return replaySteps(input, ids.map((id) => {
    const c = input.hand.find((entry) => entry.cardId === id)!;
    return { cardIndex: c.index, cardId: c.cardId, name: c.name, upgraded: c.upgraded,
      ...(c.target === "single" ? { target: 0 } : {}) };
  }))!.outcome;
}
it("the full observed line clears 79, including two completed three-HP triggers, and loses three HP", () => {
  const input = inputAt(), before = JSON.stringify(input);
  expect(input.hand.find((c) => c.cardId === "STRANGLE")!.strangle).toBe(3);
  expect(play(input, ["STRANGLE", "BUBBLE_BUBBLE", "ACCELERANT"])).toMatchObject({
    damageDealt: 79, hpLoss: 3, hpAfter: 49, energyLeft: 1, unknownCards: [] });
  expect(JSON.stringify(input)).toBe(before);
});
it("establishment does not count itself and intermediate replanning preserves the observed ending HP", () => {
  expect(play(inputAt(), ["STRANGLE"])).toMatchObject({ damageDealt: 23 });
  for (const [line, ids, damage] of [
    ["308843", ["BUBBLE_BUBBLE", "ACCELERANT"], 69],
    ["308844", ["ACCELERANT"], 66],
    ["308845", [], 63],
  ] as const) {
    const input = inputAt(line);
    expect(input.enemies[0]!.strangle).toBe(3);
    const result = play(input, [...ids]);
    expect(result).toMatchObject({ damageDealt: damage, hpLoss: 3, unknownCards: [] });
    expect(result.enemyHpAfter[0]!.hp).toBe(evidence["308847"].state.combat.enemies[0]!.current_hp);
  }
  expect(inputAt("308847").enemies[0]!.strangle).toBeUndefined();
});
it.each(["ironclad", ""])("%s keeps its prior line without Silent triggers", (character) => {
  expect(play(inputAt("308842", character), ["STRANGLE", "BUBBLE_BUBBLE", "ACCELERANT"]).damageDealt).toBe(73);
  expect(inputAt("308843", character).enemies[0]!.strangle).toBeUndefined();
});
it.each([0, 8, 11])("unobserved A%s keeps the prior upgrade model", (ascension) => {
  expect(inputAt("308842", "silent", ascension).hand[0]!.strangle).toBeUndefined();
  expect(inputAt("308843", "silent", ascension).enemies[0]!.strangle).toBeUndefined();
});
it("unverified follow-ups, replays, repeated establishment and reductions remain unknown", () => {
  const repeated = inputAt(); repeated.enemies[0]!.strangle = 3;
  expect(play(repeated, ["STRANGLE"]).unknownCards.some((s) => s.includes("紧勒"))).toBe(true);
  for (const change of [{ replay: 1 }, { cardId: "OTHER_POWER" }, { observedStrangleThreeFollowup: undefined }]) {
    const input = inputAt("308844"); Object.assign(input.hand.find((c) => c.cardId === "ACCELERANT")!, change);
    expect(play(input, [change.cardId ?? "ACCELERANT"]).unknownCards.some((s) => s.includes("紧勒"))).toBe(true);
  }
  for (const change of [{ block: 1 }, { artifact: 1 }, { intangible: true }, { hpLossCap: 1 }]) {
    const input = inputAt("308844"); Object.assign(input.enemies[0]!, change);
    expect(play(input, ["ACCELERANT"]).unknownCards).toContain("紧勒（有挡、减损或特殊交互未验证）");
  }
});
it("unknown texts, enchantments and stack amounts cannot acquire the observed marker", () => {
  const raw = evidence["308842"].state.combat.hand[0]!;
  for (const change of [{ rules_text: "unverified" }, { enchantment: { id: "UNKNOWN" } },
    { dynamic_values: raw.dynamic_values.map((v) => v.name === "StranglePower" ? { ...v, current_value: 4 } : v) }]) {
    expect(modelHandCard({ ...raw, ...change }, 0, knowledge, "silent", 10).strangle).toBeUndefined();
  }
  const enemy = structuredClone(evidence["308843"].state.combat.enemies[0]!);
  enemy.powers.find((p) => p.power_id === "STRANGLE_POWER")!.amount = 4;
  expect(unmodelledEnemyPowers(enemy, "silent", 10)).toContain("STRANGLE_POWER");
});

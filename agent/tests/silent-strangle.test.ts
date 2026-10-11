/** Q6 A10 F8 T4 and Y6 A0 F4 T1; silent-0260/0261, fixed original frames. */
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import evidence from "./silent-strangle-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { enemySims, unmodelledEnemyPowers } from "../src/reflex/combat-plan.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Strangle evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
afterEach(() => { solveTap.onSolve = null; });
const knowledge = makeKnowledge({ cards: [
  { id: "STRANGLE", type: "Attack" }, { id: "SUCKER_PUNCH", type: "Attack" },
  { id: "STRIKE_SILENT", type: "Attack" }, { id: "NEUTRALIZE", type: "Attack" },
  { id: "DEFEND_SILENT", type: "Skill" }, { id: "SURVIVOR", type: "Skill" },
  { id: "BACKFLIP", type: "Skill" }, { id: "DEADLY_POISON", type: "Skill" },
] }, "cache");
function inputAt(key: keyof typeof evidence, character = "silent"): SolverInput {
  const frame = evidence[key].state;
  const player = frame.combat.player;
  const power = (id: string) => player.powers.find((p) => p.power_id === id)?.amount ?? 0;
  return {
    hand: frame.combat.hand.map((entry, i) => modelHandCard(entry, i, knowledge, character, frame.run.ascension)),
    player: { hp: player.current_hp, maxHp: player.max_hp, block: player.block, energy: player.energy,
      weak: power("WEAK_POWER") > 0, vulnerable: power("VULNERABLE_POWER") > 0, intangible: false,
      strengthNow: power("STRENGTH_POWER") },
    enemies: enemySims(frame.combat, frame.run.ascension, character), fightKind: "elite", turn: frame.turn,
  };
}
function play(input: SolverInput, indices: number[] = []) {
  const steps = indices.map((index) => {
    const c = input.hand[index]!;
    return { cardIndex: c.index, cardId: c.cardId, name: c.name, upgraded: c.upgraded,
      ...(c.target === "single" ? { target: 0 } : {}) };
  });
  return replaySteps(input, steps)!;
}

it("Q6: Strangle and Survivor preserve the observed damage while the discard choice remains unresolved", () => {
  const result = play(inputAt("282887"), [1, 3, 6]).outcome;
  expect(result).toMatchObject({ damageDealt: 23, hpLoss: 1, hpAfter: 33, blockGained: 8 });
  expect(result.enemyHpAfter[0]!.hp).toBe(evidence["282892"].state.combat.enemies[0]!.current_hp);
  // The damage matches the observed completion, but this prefix has no selected discard.
  expect(result.unknownCards).toEqual(["弃牌选择未确定"]);
});
it("Y6: two seven-damage Strikes, nine-damage Strangle and Neutralize deal 29 with no HP lost", () => {
  const result = play(inputAt("210433"), [0, 1, 3, 6]).outcome;
  expect(result).toMatchObject({ damageDealt: 29, hpLoss: 0 });
  expect(result.enemyHpAfter[0]!.hp).toBe(evidence["210437"].state.combat.enemies[0]!.current_hp);
  expect(result.unknownCards).toEqual([]);
});
it("replanning from an existing two-stack power preserves the same ending HP", () => {
  const start = inputAt("282888");
  expect(start.enemies[0]!.strangle).toBe(2);
  expect(start.enemies[0]!.unmodelled).toBe(false);
  expect(play(start, [2, 5]).outcome).toMatchObject({ damageDealt: 15, hpLoss: 1 });
  expect(play(inputAt("282889"), [4]).outcome).toMatchObject({ damageDealt: 5, hpLoss: 1 });
  // The observed intermediate selection has not triggered; after completion only the end-turn poison remains.
  expect(evidence["282890"].state.combat.action_readiness.can_use_combat_actions).toBe(false);
  expect(evidence["282890"].state.combat.enemies[0]!.current_hp).toBe(85);
  expect(play(inputAt("282891")).outcome).toMatchObject({ damageDealt: 3, hpLoss: 1, unknownCards: [] });
  expect(inputAt("282892").enemies[0]!.strangle).toBeUndefined();
});
it("establishment itself causes no extra HP loss", () => {
  expect(play(inputAt("282887"), [1]).outcome.damageDealt).toBe(11);
});
it("later rollout turns drop an existing power rather than carrying it as a permanent damage bonus", () => {
  const input = board({ bossHp: 500 });
  input.solver.enemies[0]!.strangle = inputAt("282888").enemies[0]!.strangle;
  input.solver.hand = [card(0, "FIXED_STRIKE", { damage: 6 })];
  input.piles = { handBase: input.solver.hand, draw: [card(1, "FIXED_STRIKE", { damage: 6 })], discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const plan = play(input.solver, [0]);
  const seen: SolverInput[] = [];
  solveTap.onSolve = (value) => { seen.push(value); };
  const result = simulateFight(input, plan, 3, 1, false);
  // Both fixed Strikes are available in each later hand: twelve damage, without two extra losses per play.
  expect(result.records.map((record) => record.dmg)).toEqual([8, 12, 12]);
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.every((value) => value.enemies[0]!.strangle === undefined)).toBe(true);
});
it("unobserved enemy Block, Artifact and damage-reduction interactions are explicit", () => {
  for (const change of [{ block: 1 }, { artifact: 1 }, { reflect: true }, { intangible: true }, { hpLossCap: 1 }]) {
    const input = inputAt("282888");
    Object.assign(input.enemies[0]!, change);
    expect(play(input, [2]).outcome.unknownCards).toContain("紧勒（有挡、减损或特殊交互未验证）");
  }
});
it("repeated establishment and replay do not invent stacking or automatic triggers", () => {
  const repeated = inputAt("282887");
  repeated.enemies[0]!.strangle = 2;
  expect(play(repeated, [1]).outcome.unknownCards).toContain("紧勒（叠加、重放或自动出牌未验证）");
  const replayed = inputAt("282887");
  replayed.hand[1]!.replay = 1;
  expect(play(replayed, [1]).outcome.unknownCards).toContain("紧勒（叠加、重放或自动出牌未验证）");
});
it("other characters, unobserved ascensions and upgraded establishment preserve the prior result", () => {
  for (const character of ["ironclad", ""]) {
    expect(play(inputAt("282887", character), [1, 3, 6]).outcome.damageDealt).toBe(19);
    expect(inputAt("282888", character).enemies[0]!.strangle).toBeUndefined();
  }
  const input = inputAt("282887");
  const raw = evidence["282887"].state.combat.hand[1]!;
  for (const [entry, asc] of [[{ ...raw, upgraded: true }, 10], [raw, 8], [raw, null]] as const) {
    input.hand[1] = modelHandCard(entry, 1, knowledge, "silent", asc);
    expect(play(input, [1, 3, 6]).outcome.damageDealt).toBe(19);
  }
  const existing = evidence["282888"].state.combat;
  expect(enemySims(existing, undefined, "silent")[0]!.strangle).toBeUndefined();
  expect(unmodelledEnemyPowers(existing.enemies[0]!, "silent")).toContain("STRANGLE_POWER");
});
it("an upgraded or transformed copy cannot reuse the ordinary establishment marker", () => {
  for (const change of [{ upgraded: true }, { cardId: "TRANSFORMED_ATTACK" }]) {
    const input = inputAt("282887");
    Object.assign(input.hand[1]!, change);
    const result = play(input, [1, 3, 6]).outcome;
    expect(result.damageDealt).toBe(19);
    expect(result.unknownCards).toContain("紧勒（牌型或升级模板未验证）");
  }
});

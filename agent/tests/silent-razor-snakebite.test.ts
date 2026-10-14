/** W1YY8PEWGUF9 A10 F33 T10 / F45 T1; original proposal f8b3c984fcd0d2cd, silent-0477/0478. */
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-razor-snakebite-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { solveTap, traceSteps, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { board } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const { historicalKnowledgeFs } = await import("./historical-knowledge-fs.js");
  const fs = historicalKnowledgeFs(await original<typeof import("node:fs")>());
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Razor Tooth evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

const knowledge = makeKnowledge({ cards: [{ id: "SNAKEBITE", type: "Skill" }] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
const oldBoss = bossLinesOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  setMonsterDbForTests(null);
  rolloutLiveOptions.enabled = oldRollout;
  bossLinesOptions.enabled = oldBoss;
});

type Raw = Record<string, any>;
function inputFor(raw: Raw = structuredClone(evidence.plays[1]!.state)): SolverInput {
  // Isolate the recorded action, rather than pretending this is its complete historical turn/selection.
  raw.combat.hand = raw.combat.hand.filter((card: Raw) => card.card_id === "SNAKEBITE");
  raw.run.potions = [];
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the recorded Razor Tooth board was not solved");
  return input;
}
function step(input: SolverInput): Step {
  const card = input.hand[0]!;
  return { cardIndex: card.index, cardId: card.cardId, name: card.name, upgraded: card.upgraded,
    target: input.enemies[0]!.index, targetName: input.enemies[0]!.name };
}

it.each(evidence.plays)("matches the complete recorded action at source state $before.line through the production planner", (play) => {
  const input = inputFor(structuredClone(play.state));
  expect(input.player.observedRazorSnakebite).toBe(true);
  expect(input.hand[0]).toMatchObject({ observedRazorSnakebite: true, poison: 7, replay: 1 });
  const saved = JSON.stringify(input);
  const result = traceSteps(input, [step(input)]);
  expect(result.complete).toBe(true);
  expect(result.transitions[0]).toMatchObject({ payment: 2, effects: 2, after: {
    energy: play.expected.energy, hp: play.expected.hp, damage: 0,
    enemies: [{ hp: play.expected.enemy_hp, poison: play.expected.poison, artifact: 0 }],
  } });
  expect(result.transitions[0]!.after.unknown).not.toContain("剃刀牙蛇咬（此重放组合未验证）");
  expect(result.transitions[0]!.after.unknown).toEqual(play.state.run.floor === 33
    ? ["懒惰（重放名额边界未验证）"] : []);
  // Settlement is a separate model check; the source after-frame is before the enemy turn.
  expect(result.plan!.outcome.enemyHpAfter[0]).toMatchObject({
    hp: play.expected.enemy_hp - play.expected.poison, poison: play.expected.poison - 1,
  });
  expect(result.plan!.outcome.damageDealt).toBe(17);
  expect(JSON.stringify(input)).toBe(saved);
});

it("keeps the isolated seventeen-point settlement in the whole-fight consumer without inventing later upgrade rules", () => {
  const input = inputFor();
  const simulation = board();
  simulation.solver = input;
  simulation.piles = { handBase: input.hand, draw: [], discard: [] };
  simulation.enemies = [{ index: 0, id: "TEST_BOSS", move: "HIT", strength: 0, powers: {} }];
  simulation.tables = { TEST_BOSS: { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  simulation.meta = { ...simulation.meta, asc: 10, max_en: 5 };
  simulation.options = { handSize: 1 };
  input.enemies[0]!.attacks = [];
  const plan = traceSteps(input, [step(input)]).plan!;
  const saved = JSON.stringify(simulation);
  const later: SolverInput[] = [];
  solveTap.onSolve = (value) => { later.push(value); };
  const result = simulateFight(simulation, plan, 2, 1, false);
  solveTap.onSolve = null;
  expect(result.records[0]!.dmg).toBe(17);
  expect(later.length).toBeGreaterThan(0);
  expect(later.every((value) => value.player.observedRazorSnakebite === false)).toBe(true);
  const returned = later.find((value) => value.hand.some((card) => card.cardId === "SNAKEBITE"))!;
  expect(traceSteps(returned, [step(returned)]).plan!.outcome.unknownCards)
    .toContain("剃刀牙蛇咬（此重放组合未验证）");
  expect(JSON.stringify(simulation)).toBe(saved);
});

it.each(["ironclad", "necrobinder", "", "silent-A9", "silent-A11", "silent-missing-level", "no-relic"])(
  "preserves the previous input scope for %s", (scope) => {
    const raw: Raw = structuredClone(evidence.plays[1]!.state);
    if (scope === "no-relic") raw.run.relics = raw.run.relics.filter((relic: Raw) => relic.relic_id !== "RAZOR_TOOTH");
    else if (scope.startsWith("silent-")) raw.run.ascension = scope === "silent-A9" ? 9 : scope === "silent-A11" ? 11 : null;
    else raw.run.character_id = scope;
    const input = inputFor(raw);
    expect(input.player.observedRazorSnakebite).toBeUndefined();
    if (scope !== "no-relic") expect(input.hand[0]!.observedRazorSnakebite).toBeUndefined();
    const plain = structuredClone(input); delete plain.player.observedRazorSnakebite;
    expect(traceSteps(input, [step(input)])).toEqual(traceSteps(plain, [step(plain)]));
  });

it("refuses unseen raw powers and incomplete power lists", () => {
  for (const side of ["player", "enemy", "missing"] as const) {
    const raw: Raw = structuredClone(evidence.plays[1]!.state);
    if (side === "missing") delete raw.combat.player.powers;
    else (side === "player" ? raw.combat.player : raw.combat.enemies[0]).powers.push({ power_id: "UNOBSERVED_POISON_MODIFIER", amount: 1 });
    const input = inputFor(raw);
    expect(input.player.observedRazorSnakebite).toBe(false);
    const result = traceSteps(input, [step(input)]);
    expect(result.transitions[0]!.after.enemies[0]!.poison).toBe(14);
    expect(result.transitions[0]!.after.unknown).toContain("剃刀牙蛇咬（此重放组合未验证）");
  }
});

it("keeps legacy arithmetic and marks unobserved combinations instead of adding three unconditionally", () => {
  const base = inputFor();
  const variants: ((input: SolverInput) => void)[] = [
    (input) => { input.player.duplicate = 1; },
    (input) => { input.player.duplicateSkills = 1; },
    (input) => { input.player.firstCardReplay = true; },
    (input) => { input.player.envenom = 1; },
    (input) => { input.player.poisonExtraTriggers = 1; },
    (input) => { input.hand[0]!.cost = 1; },
    (input) => { input.hand[0]!.replay = 2; },
    (input) => { input.enemies[0]!.artifact = 1; },
    (input) => { input.enemies[0]!.poison = 1; },
    (input) => { input.enemies[0]!.intangible = true; },
    (input) => { input.enemies.push({ ...input.enemies[0]!, index: 1 }); },
  ];
  for (const alter of variants) {
    const input = structuredClone(base); alter(input);
    const legacy = structuredClone(input); delete legacy.player.observedRazorSnakebite;
    const current = traceSteps(input, [step(input)]).transitions[0]!.after;
    const previous = traceSteps(legacy, [step(legacy)]).transitions[0]!.after;
    expect(current.enemies).toEqual(previous.enemies);
    expect(current.energy).toBe(previous.energy);
    expect(current.unknown).toContain("剃刀牙蛇咬（此重放组合未验证）");
  }
});

it("requires the observed raw preview rather than inferring other upgrades or enchantments", () => {
  const raw = evidence.plays[1]!.card;
  for (const altered of [
    { ...raw, upgraded: true }, { ...raw, energy_cost: 1 }, { ...raw, costs_x: true },
    { ...raw, star_cost: 1 }, { ...raw, enchantment: { id: "UNOBSERVED" } },
    { ...raw, resolved_rules_text: "保留。给予7层中毒。" },
    { ...raw, resolved_rules_text: "保留。给予7层中毒。重放2。" },
    { ...raw, dynamic_values: [{ ...raw.dynamic_values[0]!, current_value: 8 }] },
  ]) expect(modelHandCard(altered, 0, knowledge, "silent", 10).observedRazorSnakebite).toBeUndefined();
});

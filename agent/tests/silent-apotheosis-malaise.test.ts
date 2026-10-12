import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-apotheosis-malaise-evidence.json";
import { makeKnowledge } from "../src/knowledge/index.js";
import { applyApotheosisUpgrade, modelHandCard, type CardModel } from "../src/reflex/card-model.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { describePlan, enemySims } from "../src/reflex/combat-plan.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board, card } from "./boss-sim-fixture.js";

// Only frozen Silent observations; no refreshed knowledge or network-backed model calls.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Malaise evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [{ id: "MALAISE", type: "Skill", keywords: ["Exhaust"] },
  { id: "APOTHEOSIS", type: "Skill" }, { id: "NEUTRALIZE", type: "Attack" }, { id: "NOXIOUS_FUMES", type: "Power" }] }, "cache");
beforeEach(() => setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }));
afterEach(() => { setMonsterDbForTests(null); solveTap.onSolve = null; });
// The deck supplies the plain values; the observed hand supplies targeting metadata.
const rawPlain = { ...evidence.upgraded, ...evidence.plain, index: 1 };
const plain = () => modelHandCard(rawPlain, 1, knowledge, "silent", 10);
const god = () => modelHandCard({ ...evidence.apotheosis, index: 0 }, 0, knowledge, "silent", 10);
const step = (entry: CardModel) => ({ cardIndex: entry.index, cardId: entry.cardId, name: entry.name,
  upgraded: entry.upgraded, ...(entry.target === "single" ? { target: 0 } : {}) });
const observedBoard = () => {
  const input = board().solver;
  const player = evidence.before.player;
  input.player = { hp: player.current_hp, maxHp: player.max_hp, energy: player.energy, block: player.block,
    weak: false, vulnerable: false, intangible: false, strengthNow: 1, endTurnBlock: 3 };
  input.enemies = enemySims(evidence.before, 10, "silent");
  return input;
};

it("matches the observed later draw and F43 T2 X=2 cast without changing the plain deck", () => {
  const base = plain(), saved = JSON.stringify(base);
  const upgraded = applyApotheosisUpgrade(base);
  const observed = modelHandCard(evidence.upgraded, 0, knowledge, "silent", 10);
  expect(upgraded).toMatchObject({ known: true, upgraded: true, special: "malaise", xCost: true,
    malaiseBonus: observed.malaiseBonus, text: observed.text });
  expect(upgraded.malaiseBonus).toBe(1);
  expect(applyApotheosisUpgrade(upgraded)).toEqual(upgraded);
  const input = observedBoard(); input.hand = [upgraded];
  const plan = replaySteps(input, [step(upgraded)])!;
  expect(plan.outcome).toMatchObject({ energyLeft: evidence.after.player.energy, hpLoss: 9 });
  expect(plan.outcome.hpLoss).toBe(evidence.before.player.current_hp - evidence.next_turn.player.current_hp);
  expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ hp: 198, weak: 6, strengthGained: -3 });
  expect(JSON.stringify(base)).toBe(saved);
  expect(rawPlain.upgraded).toBe(false);
});

it("propagates the bonus through the real same-line consumer using energy left after Apotheosis", () => {
  // A composition check using the observed pair, not an assertion that this exact line was played.
  const input = observedBoard(); input.player.energy = 4; input.hand = [god(), plain()];
  const saved = JSON.stringify(input);
  const plan = replaySteps(input, input.hand.map(step))!;
  expect(plan.outcome).toMatchObject({ apotheosisApplied: true, energyLeft: 0, hpLoss: 9 });
  expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ weak: 6, strengthGained: -3 });
  expect(plan.steps.at(-1)?.upgraded).toBe(true);
  expect(plan.outcome.unknownCards.some((text) => text.includes("萎靡"))).toBe(false);
  expect(describePlan(plan, input.player.hp).hp_lost).toBe(9);
  expect(JSON.stringify(input)).toBe(saved);
});

it("replays the actual full T2 sequence from existing Weak=1, retaining damage and HP facts", () => {
  const input = observedBoard(); input.player.energy = evidence.turn_start.player.energy;
  input.enemies = enemySims(evidence.turn_start, 10, "silent");
  input.hand = evidence.turn_start.hand.map((entry) => modelHandCard(entry, entry.index, knowledge, "silent", 10));
  const sequence = ["NEUTRALIZE", "NOXIOUS_FUMES", "MALAISE"].map((id) => step(input.hand.find((c) => c.cardId === id)!));
  const plan = replaySteps(input, sequence)!;
  expect(plan.outcome).toMatchObject({ energyLeft: 0, hpLoss: 9, damageDealt: 5 });
  expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ hp: 198, weak: 6, strengthGained: -3 });
});

it("upgrades an identified later draw before its X-cost dispatch", () => {
  const input = observedBoard(); input.player.energy = 4;
  const drawn = { ...plain(), index: 600, key: "drawn600" };
  const drawing = card(2, "FIXED_DRAW", { type: "Skill", target: "self", cost: 0, drawn: [drawn] });
  input.hand = [god(), drawing];
  const plan = replaySteps(input, [step(input.hand[0]!), step(drawing), step(drawn)])!;
  expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ weak: 6, strengthGained: -3 });
  expect(plan.outcome.hpLoss).toBe(9);
  expect(plan.steps.at(-1)?.upgraded).toBe(true);
});

it("carries the text-only upgrade through future rollout piles", () => {
  const input = board({ bossHp: 1000 });
  input.solver.hand = [god()]; input.solver.player.energy = 3;
  input.piles = { handBase: input.solver.hand, draw: [plain()], discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  const saved = JSON.stringify(input);
  const plan = replaySteps(input.solver, [step(input.solver.hand[0]!)])!;
  const records = simulateFight(input, plan, 3, 1, false).records;
  expect(records).toHaveLength(3);
  // Synthetic X=3 checks propagation into the existing X+1 consumer, not a new observed sample.
  expect(records[1]!.snap.E[0]![9].STRENGTH_POWER).toBe(-4);
  expect(records[2]!.snap.E[0]![9].STRENGTH_POWER).toBe(-4);
  expect(JSON.stringify(input)).toBe(saved);
});

it("the reread uses the shown intent once and keeps the local Weak correction out of later turns", () => {
  const input = observedBoard(); input.hand = [applyApotheosisUpgrade(plain())];
  const simulation = board(); simulation.solver = input;
  simulation.enemies = [{ index: 0, id: "SOUL_NEXUS", move: "MAELSTROM_MOVE", strength: 0, powers: { WEAK_POWER: 3 } }];
  simulation.tables = { SOUL_NEXUS: { moves: { MAELSTROM_MOVE: { damage: 7, hits: 4, strength: 0, block: 0 } },
    next: { MAELSTROM_MOVE: { MAELSTROM_MOVE: 1 } } } };
  simulation.piles = { handBase: input.hand, draw: [card(50, "FIXED_JUNK", { type: "Status", playable: false })], discard: [] };
  const later: SolverInput[] = []; solveTap.onSolve = (value) => { later.push(value); };
  const records = simulateFight(simulation, replaySteps(input, input.hand.map(step))!, 2, 1, false).records;
  expect(records[0]!.loss).toBe(9);
  expect(later.length).toBeGreaterThan(0);
  expect(later.every((value) => value.enemies.every((enemy) => enemy.weakMalaise === undefined))).toBe(true);
  input.hand = []; input.enemies = enemySims(evidence.after, 10, "silent");
  expect(replaySteps(input, [])!.outcome.hpLoss).toBe(9);
});

it("keeps other boards and unobserved modifiers on the existing damage path", () => {
  for (const [character, asc] of [["ironclad", 10], ["silent", 9], ["silent", 11], ["", 10]] as const) {
    expect(enemySims(evidence.before, asc, character)[0]?.weakMalaise).toBeUndefined();
  }
  for (const change of [
    { enemy_id: "UNKNOWN" }, { move_id: "UNKNOWN" }, { powers: [{ power_id: "WEAK_POWER", amount: 2 }] },
    { powers: [...evidence.before.enemies[0]!.powers, { power_id: "UNKNOWN", amount: 1 }] },
  ]) expect(enemySims({ ...evidence.before, enemies: [{ ...evidence.before.enemies[0], ...change }] }, 10, "silent")[0]?.weakMalaise).toBeUndefined();
  for (const change of [
    (value: SolverInput) => { value.player.vulnerable = true; },
    (value: SolverInput) => { value.player.surrounded = true; },
    (value: SolverInput) => { value.player.facing = 0; },
    (value: SolverInput) => { value.player.colossus = true; },
    (value: SolverInput) => { value.enemies[0]!.shrink = 1; },
    (value: SolverInput) => { value.enemies[0]!.attacks[0]!.damage = 6; },
    (value: SolverInput) => { value.enemies[0]!.attacks[0]!.hits = 3; },
    (value: SolverInput) => { value.player.energy = 1; },
  ]) {
    const variant = observedBoard(); variant.hand = [applyApotheosisUpgrade(plain())]; change(variant);
    const legacy = structuredClone(variant); delete legacy.enemies[0]!.weakMalaise;
    expect(replaySteps(variant, variant.hand.map(step))).toEqual(replaySteps(legacy, legacy.hand.map(step)));
  }
});

it("leaves ordinary play unchanged and rejects unobserved character, ascension and modified pairs", () => {
  const input = observedBoard(); input.hand = [plain()];
  expect(replaySteps(input, [step(input.hand[0]!)])!.outcome.enemyHpAfter[0]).toMatchObject({ weak: 5, strengthGained: -2 });
  for (const [character, ascension] of [["ironclad", 10], ["", 10], ["silent", 9], ["silent", 11], ["silent", null]] as const) {
    expect(modelHandCard(rawPlain, 1, knowledge, character, ascension).apotheosisUpgrade).toBeUndefined();
  }
  for (const change of [
    { costs_x: false }, { energy_cost: 1 }, { star_costs_x: true }, { star_cost: 1 },
    { dynamic_values: undefined }, { dynamic_values: [{ name: "UNKNOWN", current_value: 1 }] },
    { enchantment: { id: "UNKNOWN" } }, { rules_text: "UNKNOWN" },
    { resolved_rules_text: "敌人失去X点力量。给予X层虚弱。 消耗。 重放。" },
    { resolved_rules_text: "敌人失去X点力量。给予X层虚弱。 魂缚。 消耗。" },
  ]) {
    const model = modelHandCard({ ...rawPlain, ...change }, 1, knowledge, "silent", 10);
    expect(model.apotheosisUpgrade).toBeUndefined();
    expect(applyApotheosisUpgrade(model).known).toBe(false);
  }
});

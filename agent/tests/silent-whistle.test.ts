/** Q10YYQ5DUPJA SILENT A10 F48 T2/F49 final T5; silent-0471/0473. */
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-whistle-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { describePlan, enemySims, leastLossFactsOf, planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { rolloutDecision, simulateFight, type RolloutInput } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, solveTurn, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { judgeEndTurn } from "../src/sl/judge.js";
import { board } from "./boss-sim-fixture.js";

// Fixed evidence only: optional solver references must not load refreshing knowledge files.
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Whistle observations"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const knowledge = makeKnowledge({ cards: [
  { id: "WHISTLE", type: "Attack", keywords: ["Exhaust"] },
  ...["DEFEND_SILENT", "SNAKEBITE", "BUBBLE_BUBBLE", "BOUNCING_FLASK"].map((id) => ({ id, type: "Skill" })),
] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: Object.fromEntries(Object.entries(evidence.move_damage).map(([id, m]) =>
    [id, { moves: { [m.move]: { damage_by_asc: { "10": m.values } } } }])), bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
});
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function raw(line = "401065"): Raw {
  return structuredClone(evidence.frames[line as keyof typeof evidence.frames].state);
}
function inputFor(source = raw(), character = "silent", asc = 10): SolverInput {
  const player = source.combat.player;
  return {
    hand: source.combat.hand.map((c: Raw, i: number) => modelHandCard(c, i, knowledge, character, asc)),
    player: { hp: player.current_hp, maxHp: player.max_hp, block: player.block, energy: player.energy,
      weak: false, vulnerable: false, intangible: false, plating: 0 },
    enemies: enemySims(source.combat, asc, character), fightKind: "boss", turn: source.turn,
  };
}
function step(input: SolverInput, id: string): Step {
  const card = input.hand.find((c) => c.cardId === id)!;
  return { cardIndex: card.index, cardId: card.cardId, name: card.name, upgraded: card.upgraded,
    target: card.target === "single" ? 0 : null };
}
function line(input = inputFor()) {
  return replaySteps(input, [step(input, "WHISTLE"), step(input, "DEFEND_SILENT")])!;
}

it("replays the final T5 line: 23 expected HP loss becomes zero without claiming a fight win", () => {
  const input = inputFor();
  expect(line(input).outcome).toMatchObject({ hpLoss: 0, hpAfter: 5, dies: false, winsFight: false,
    blockGained: 13, energyLeft: 0, enemyHpAfter: [expect.objectContaining({ stunned: true, cardStunned: true })] });
  const legacy = { ...input, hand: input.hand.map((c) => ({ ...c, whistleStun: undefined })) };
  expect(line(legacy).outcome).toMatchObject({ hpLoss: 23, hpAfter: -18, dies: true });
  expect(raw("401068").combat.player.current_hp).toBe(5);
  expect(describePlan(line(input), 5)).toMatchObject({ hp_lost: 0, result: "survives with 5/5 HP before healing" });
  expect(describePlan(line(input), 5).card_stun).toContain("吹哨取消该目标本轮攻击");
});

it("keeps direct damage, the observed exhaust rider and end-turn poison separate", () => {
  const input = inputFor();
  const plan = line(input);
  // The old solver does not model Forgotten Soul's extra one damage; this patch must not invent or double it.
  expect(plan.outcome.damageDealt).toBe(35); // 33 direct + two poison, not the observed exhaust rider.
  expect(plan.outcome.enemyHpAfter[0]!.hp).toBe(113);
  expect(raw("401066").combat.enemies[0].current_hp).toBe(114); // 148 - 33 - one exhaust rider.
  expect(raw("401068").combat.enemies[0].current_hp).toBe(112); // two poison after that.
  expect(input.hand.find((c) => c.cardId === "WHISTLE")!.exhausts).toBe(true);
});

it("F48 starts after Echoing Slash: 23 Block, then a surviving actively stunned Aeonglass", () => {
  const input = inputFor(raw("400851"));
  const plan = replaySteps(input, [step(input, "WHISTLE")])!;
  expect(plan.outcome).toMatchObject({ hpLoss: 0, damageDealt: 10,
    enemyHpAfter: [expect.objectContaining({ hp: 493, block: 0, cardStunned: true })] });
  expect(raw("400852").combat.enemies[0].current_hp).toBe(492); // the separate one-point exhaust rider.
  expect(raw("400853").combat.enemies[0].move_id).toBe("EYE_LASERS_MOVE");
});

function rollout(source = raw()): RolloutInput {
  const input = board();
  input.solver = inputFor(source);
  input.solver.hand = input.solver.hand.filter((c) => ["WHISTLE", "DEFEND_SILENT"].includes(c.cardId));
  input.enemies = source.combat.enemies.map((e: Raw) => ({ index: e.index, id: e.enemy_id, move: e.move_id,
    strength: e.powers.find((p: Raw) => p.power_id === "STRENGTH_POWER")?.amount ?? 0,
    powers: Object.fromEntries(e.powers.map((p: Raw) => [p.power_id, p.amount])) }));
  const current = source.combat.enemies[0].move_id;
  const attack = input.solver.enemies[0]!.attacks[0]!;
  const observed = evidence.move_damage[source.combat.enemies[0].enemy_id as keyof typeof evidence.move_damage];
  const base = Number(Object.keys(observed.values.base_per_hit)[0]);
  input.tables = { [source.combat.enemies[0].enemy_id]: {
    moves: { [current]: { ...attack, damage: base, strength: 0, block: 0 }, STUNNED: { damage: 0, hits: 0, strength: 0, block: 0 } },
    next: { [current]: { [current]: 1 }, STUNNED: { [current]: 1 } },
  } };
  input.meta = { ...input.meta, asc: 10, t: source.turn, enc: source.combat.enemies[0].enemy_id };
  input.piles = { draw: [], discard: [], handBase: input.solver.hand };
  input.options = { handSize: 0, samples: 1, horizon: 2, k: 1, now: () => 0 };
  input.plans = [line(input.solver)];
  return input;
}

it("rollout returns to the recorded attack next turn and never repeats a free stun", () => {
  const input = rollout();
  for (const scripted of [false, true]) {
    const records = simulateFight(input, input.plans[0]!, 2, 1, scripted).records;
    expect(records).toHaveLength(2);
    expect(records[0]!.loss).toBe(0);
    expect(records[1]!.snap.E[0]![7]).toBe(36);
    expect(records[1]!.loss).toBe(36);
  }
});

it("a missing or incomplete stun successor reports unknown future damage", () => {
  for (const next of [{}, { STUNNED: {} }, { STUNNED: { MISSING_MOVE: 1 } }]) {
    const input = rollout();
    input.tables.TEST_SUBJECT!.next = next;
    const result = rolloutDecision(input);
    expect(result.unavailable).toContain("后续预测未知");
    expect(result.lines).toEqual([]);
    expect(result.samples).toBe(0);
  }
});

it("direct kills and phase kills do not transfer a stun into the next body", () => {
  for (const source of [raw(), raw("400851")]) {
    source.combat.enemies[0].current_hp = 1;
    source.combat.enemies[0].block = 0;
    const input = inputFor(source);
    const plan = replaySteps(input, [step(input, "WHISTLE")])!;
    expect(plan.outcome.enemyHpAfter[0]!.cardStunned).toBeUndefined();
    if (source.combat.enemies[0].enemy_id === "TEST_SUBJECT") expect(plan.outcome.winsFight).toBe(false);
  }
});

it("keeps unobserved targets, phases, powers and multiple enemies outside the stun model", () => {
  for (const patch of [
    { enemy_id: "UNOBSERVED_TARGET" }, { max_hp: 111 }, { move_id: "UNOBSERVED_MOVE" },
    { powers: [] },
    { powers: [{ power_id: "ARTIFACT_POWER", amount: 1 }] },
    { powers: [{ power_id: "INTANGIBLE_POWER", amount: 1 }] },
    { powers: [{ power_id: "UNOBSERVED_POWER", amount: 1 }] },
  ]) {
    const source = raw(); Object.assign(source.combat.enemies[0], patch);
    const plan = line(inputFor(source));
    expect(plan.outcome.enemyHpAfter[0]!.cardStunned).toBeUndefined();
    expect(plan.outcome.unknownCards).toContain("吹哨（此目标击晕未验证）");
  }
  const source = raw(); source.combat.enemies.push({ ...source.combat.enemies[0], index: 1 });
  expect(line(inputFor(source)).outcome.enemyHpAfter.every((e) => !e.cardStunned)).toBe(true);
});

it("keeps other roles, levels, upgrades, modified costs and new previews numerically equivalent", () => {
  for (const [character, asc] of [["ironclad", 10], ["", 10], ["silent", 9], ["silent", 11]] as const) {
    const input = inputFor(raw(), character, asc);
    expect(input.hand.find((c) => c.cardId === "WHISTLE")!.whistleStun).toBeUndefined();
    expect(line(input).outcome.hpLoss).toBe(23);
  }
  for (const patch of [{ upgraded: true }, { energy_cost: 1 }, { resolved_rules_text: "造成33点伤害。" },
    { enchantment: {} }, { star_cost: 1 }]) {
    const source = raw(); Object.assign(source.combat.hand.find((c: Raw) => c.card_id === "WHISTLE"), patch);
    expect(inputFor(source).hand.find((c) => c.cardId === "WHISTLE")!.whistleStun).toBeUndefined();
  }
  const discounted = inputFor(); discounted.hand.find((c) => c.cardId === "WHISTLE")!.cost = 0;
  expect(line(discounted).outcome.hpLoss).toBe(23);
});

it("the production planner no longer feeds a false all-lines-die verdict to early SL", () => {
  const state = parseGameState(raw());
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  const decision = planCombatTurn(env);
  expect(input).toBeDefined();
  expect(solveTurn(input!).plans.some((p) => !p.outcome.dies && p.steps.some((s) => s.cardId === "WHISTLE"))).toBe(true);
  expect(decision?.label).not.toBe("combat/least-loss");
  expect(leastLossFactsOf(decision)).toBeUndefined();
  // The end-turn judge sees the actual stunned frame, then the actual attacking frame on T6.
  expect(judgeEndTurn(parseGameState(raw("401067")), { label: "combat/end_turn", revives: [], knowledge }).certain).toBe(false);
  expect(raw("401068").combat.enemies[0].intents[0].total_damage).toBe(36);
});

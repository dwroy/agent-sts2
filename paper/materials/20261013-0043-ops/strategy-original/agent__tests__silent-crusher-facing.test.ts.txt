import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-crusher-facing-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests, type MonsterDb } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { describePlan, enemySims, facingFightOf, planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Silent facing evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
// The base is frozen from JLN/S9 A10 F33 T2's unmodified four-damage observation, not a refreshed JSON file.
const fixedDb: MonsterDb = { monsters: { CRUSHER: { moves: { ENLARGING_STRIKE_MOVE: {
  damage_by_asc: { "10": { base_per_hit: { "4": 1 }, hits: { "1": 1 } } },
} } } }, bosses: {}, encounters: {} };
const knowledge = makeKnowledge({ cards: [
  { id: "DASH", type: "Attack" }, { id: "SHIV", type: "Attack" },
  { id: "DEFEND_SILENT", type: "Skill" }, { id: "CLOAK_AND_DAGGER", type: "Skill" },
] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests(structuredClone(fixedDb)); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function inputFor(raw: Raw, facing = 0): SolverInput {
  const state = parseGameState(raw);
  const memory = createScreenMemory("COMBAT");
  memory.facing = facing; memory.facingFight = facingFightOf(state);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: memory, shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the observed board was not solved");
  return input;
}
function step(input: SolverInput, index: number, target = 1): Step {
  const c = input.hand.find((c) => c.index === index)!;
  return { cardIndex: c.index, cardId: c.cardId, name: c.name, upgraded: c.upgraded,
    target: c.target === "single" ? target : null };
}

it.each(evidence.pairs)("replays the actual turn-away action at states $lines with the observed combined attack", (pair) => {
  const input = inputFor(structuredClone(pair.before));
  expect(input.enemies[0]!.observedWeakFacingBase).toBe(1.5);
  const played = replaySteps(input, [step(input, pair.chosen.card_index)])!;
  const incoming = pair.after.combat.enemies.reduce((total, e) => total + e.intents.reduce((n, i) => n + (i.total_damage ?? 0), 0), 0);
  expect(incoming).toBe(22);
  const expected = incoming - pair.after.combat.player.block;
  expect(played.outcome.hpLoss).toBe(expected);
  expect(describePlan(played, input.player.hp).hp_lost).toBe(expected);
  expect(played.outcome.blockGained + input.player.block).toBe(pair.after.combat.player.block);
});

it("reproduces the two complete observed T2 exits at 15 and 16 block", () => {
  const first = inputFor(structuredClone(evidence.pairs[0]!.before));
  expect(replaySteps(first, [step(first, 0)])!.outcome.hpAfter).toBe(evidence.ends["283400"].run.current_hp);
  const second = inputFor(structuredClone(evidence.pairs[1]!.before));
  const played = replaySteps(second, [step(second, 1), step(second, 2)])!;
  expect(played.outcome.hpLoss).toBe(6);
  expect(played.outcome.hpAfter).toBe(evidence.ends["283422"].run.current_hp);
});

it("preserves no-turn predictions and the independent positive-Strength Weak pair", () => {
  const input = inputFor(structuredClone(evidence.pairs[0]!.before));
  expect(replaySteps(input, [])!.outcome.hpLoss).toBe(26);
  const front = evidence.controls.find((r) => r.ts === "2026-10-06T03:50:23.070Z")!;
  const back = evidence.controls.find((r) => r.ts === "2026-10-06T03:50:24.799Z")!;
  for (const entry of [front, back]) {
    expect(enemySims(entry.state.combat, 10, "silent")[0]!.observedWeakFacingBase).toBe(5.25);
  }
  expect(front.state.combat.enemies[0]!.intents[0]!.damage).toBe(5);
  expect(back.state.combat.enemies[0]!.intents[0]!.damage).toBe(7);
});

it("keeps unobserved modifiers, characters, levels and missing or estimated bases on the previous path", () => {
  const original: Raw = evidence.pairs[0]!.before;
  for (const change of [
    (r: Raw) => { r.run.character_id = "IRONCLAD"; },
    (r: Raw) => { r.run.ascension = 9; },
    (r: Raw) => { r.run.ascension = 11; },
    (r: Raw) => { r.combat.enemies[0].powers.push({ power_id: "SHRINK_POWER", amount: 3 }); },
    (r: Raw) => { r.combat.player.powers.push({ power_id: "VULNERABLE_POWER", amount: 1 }); },
    (r: Raw) => { r.combat.enemies[0].powers.find((p: Raw) => p.power_id === "WEAK_POWER").amount = 2; },
    (r: Raw) => { r.combat.enemies[1].is_alive = false; },
    (r: Raw) => { r.combat.enemies[0].move_id = "UNOBSERVED_MOVE"; },
  ]) {
    const raw = structuredClone(original); change(raw);
    expect(enemySims(raw.combat, raw.run.ascension, raw.run.character_id)[0]!.observedWeakFacingBase).toBeUndefined();
  }
  const shrink = evidence.controls.filter((r) => r.run === "LS8035TB32P3");
  expect(shrink.map((r) => r.state.combat.enemies[0]!.intents[0]!.damage)).toEqual([2, 4]);
  for (const r of shrink) expect(enemySims(r.state.combat, 10, "silent")[0]!.observedWeakFacingBase).toBeUndefined();
  for (const db of [{ monsters: {}, bosses: {}, encounters: {} }, {
    monsters: { CRUSHER: { moves: { ENLARGING_STRIKE_MOVE: { damage_by_asc: { "9": { base_per_hit: { "4": 1 }, hits: { "1": 1 } } } } } } }, bosses: {}, encounters: {},
  }]) {
    setMonsterDbForTests(db);
    expect(enemySims(original.combat, 10, "silent")[0]!.observedWeakFacingBase).toBeUndefined();
  }
});

it("does not reuse decision-turn precision after later simulated moves", () => {
  const input = board({ playerHp: 100, bossHp: 100 });
  input.solver.enemies[0]!.observedWeakFacingBase = 1.5;
  input.piles.draw = [card(0, "FIXED", { damage: 0 })];
  const seen: SolverInput[] = [];
  solveTap.onSolve = (value) => { seen.push(value); };
  try { simulateFight(input, null, 3, 1, false); } finally { solveTap.onSolve = null; }
  expect(seen.length).toBeGreaterThan(1);
  for (const turn of seen.slice(1)) expect(turn.enemies[0]!.observedWeakFacingBase).toBeUndefined();
});

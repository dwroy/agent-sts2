/** UJ0K3G10609Y A10 F48 attempt 6 T4/T7/T8, silent-0177/0178. Fixed evidence only. */
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { enemySims, planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";
import evidence from "./silent-tungsten-rod-evidence.json";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Tungsten Rod evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const knowledge = makeKnowledge({ cards: [
  { id: "AFTERIMAGE", type: "Power" }, { id: "DEFEND_SILENT", type: "Skill" },
  { id: "NIGHTMARE", type: "Skill" }, { id: "DEADLY_POISON", type: "Skill" },
  { id: "STRANGLE", type: "Attack" }, { id: "STRIKE_SILENT", type: "Attack" },
] }, "cache");
const originalRollout = rolloutLiveOptions.enabled;
beforeEach(() => { rolloutLiveOptions.enabled = false; });
afterEach(() => { rolloutLiveOptions.enabled = originalRollout; solveTap.onSolve = null; });

function observedInput(key: keyof typeof evidence, character = "SILENT", rod = true): SolverInput {
  const raw = structuredClone(evidence[key].state);
  raw.run.character_id = character;
  if (!rod) raw.run.relics = raw.run.relics.filter((relic) => relic.relic_id !== "TUNGSTEN_ROD");
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the observed board was not solved");
  return input;
}

it("F48 T7: the complete observed line survives at two HP after three reduced losses", () => {
  const input = observedInput("turn7-start");
  expect(input.player.tungstenRod).toBe(true);
  const indices = [0, 1, 3, 4];
  const steps = indices.map((index) => {
    const card = input.hand.find((entry) => entry.index === index)!;
    return { cardIndex: index, cardId: card.cardId, name: card.name, upgraded: card.upgraded,
      ...(card.target === "single" ? { target: 0 } : {}) };
  });
  const outcome = replaySteps(input, steps)!.outcome;
  expect(outcome).toMatchObject({ blockGained: 13, incomingAfterBlock: 27, hpLoss: 27, hpAfter: 2, dies: false });
  expect(outcome.unknownCards).toEqual([]);
  const { tungstenRod: _rod, ...player } = input.player;
  expect(replaySteps({ ...input, player }, steps)!.outcome).toMatchObject({ hpLoss: 30, hpAfter: -1, dies: true });
});

it("F48 T7 end: existing thirteen Block plus one Cloak Clasp Block reduces three penetrating hits", () => {
  expect(replaySteps(observedInput("turn7-end"), [])!.outcome)
    .toMatchObject({ incomingAfterBlock: 27, hpLoss: 27, hpAfter: 2, dies: false });
});

it("F48 T4 end: the observed single thirty damage hit costs fourteen HP", () => {
  expect(replaySteps(observedInput("turn4-end"), [])!.outcome)
    .toMatchObject({ incomingAfterBlock: 14, hpLoss: 14, hpAfter: 29, dies: false });
});

it("F48 T8 remains lethal and neither Ironclad nor a Silent without the relic gets the reduction", () => {
  // The live planner ends immediately with an empty hand; replay the fixed end board directly.
  const end = evidence["turn8-end"].state.combat;
  const input = observedInput("turn7-end");
  input.hand = [];
  input.player.hp = end.player.current_hp;
  input.player.block = end.player.block;
  input.enemies = enemySims(end);
  expect(replaySteps(input, [])!.outcome).toMatchObject({ incomingAfterBlock: 16, dies: true });
  for (const [character, rod] of [["IRONCLAD", true], ["SILENT", false]] as const) {
    const input = observedInput("turn7-end", character, rod);
    expect(input.player.tungstenRod).toBeUndefined();
    expect(replaySteps(input, [])!.outcome).toMatchObject({ hpLoss: 30, hpAfter: -1, dies: true });
  }
});

it("later rollout turns keep the enemy-hit reduction in their solver inputs", () => {
  const input = board({ bossHp: 1000 });
  input.solver.player.tungstenRod = observedInput("turn7-end").player.tungstenRod;
  input.solver.hand = [];
  input.piles = { handBase: [], draw: [], discard: [] };
  input.tables.TEST_BOSS = { moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const plan = replaySteps(input.solver, [])!;
  expect(simulateFight(input, plan, 3, 1, false).records.map((record) => record.loss)).toEqual([9, 9, 9]);
});

it("keeps unobserved loss interactions explicit instead of guessing their reduction order", () => {
  const base = observedInput("turn7-end");
  for (const change of [{ buffer: 1 }, { hpLossCap: 20 }, { intangible: true }, { endTurnHpLoss: 3 }, { startTurnHpLoss: 1 }]) {
    const player = { ...base.player, ...change };
    const result = replaySteps({ ...base, player }, [])!.outcome;
    const { tungstenRod: _rod, ...withoutRod } = player;
    expect(result.hpLoss).toBe(replaySteps({ ...base, player: withoutRod }, [])!.outcome.hpLoss);
    expect(result.unknownCards).toContain("钨合金棍（自身失血或其他减损交互未验证）");
  }
  // A self cost may consume Buffer without changing HP; the remaining enemy hits are still unverified.
  const cost = card(99, "SELF_COST", { type: "Skill", target: "self", validTargets: [], hpLoss: 1, cost: 0 });
  const input = { ...base, hand: [cost], player: { ...base.player, buffer: 1 } };
  const steps = [{ cardIndex: 99, cardId: cost.cardId, name: cost.name, upgraded: false }];
  const result = replaySteps(input, steps)!.outcome;
  const { tungstenRod: _rod, ...withoutRod } = input.player;
  expect(result.hpLoss).toBe(replaySteps({ ...input, player: withoutRod }, steps)!.outcome.hpLoss);
  expect(result.unknownCards).toContain("钨合金棍（自身失血或其他减损交互未验证）");
});

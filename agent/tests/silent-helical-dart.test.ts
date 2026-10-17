/** T0DGVABPV60U A10 F48 T2/T4; silent-0293. Fixed observations, no refreshed knowledge. */
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import evidence from "./silent-helical-dart-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { silentHelicalDart } from "../src/reflex/silent-helical-dart.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, traceSteps, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { board, card } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Helical Dart evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const rawAt = (line: number): Raw => structuredClone(evidence.frames.find((entry) => entry.line === line)!.state);
const knowledge = makeKnowledge({ cards: [
  ...rawAt(296655).run.deck.map((entry: Raw) => ({ id: entry.card_id, type: entry.card_type })),
  { id: "SHIV", type: "Attack" },
] }, "cache");
const oldRollout = rolloutLiveOptions.enabled, oldBoss = bossLinesOptions.enabled;
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; bossLinesOptions.enabled = oldBoss; });

function inputAt(line = 296655): SolverInput {
  const state = parseGameState(rawAt(line));
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false; bossLinesOptions.enabled = false;
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try {
    planCombatTurn({ state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
      runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
      screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [] });
  } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the frozen board did not reach the solver");
  return input;
}
function step(input: SolverInput, id: string, index?: number): Step {
  const c = input.hand.find((entry) => entry.cardId === id && (index === undefined || entry.index === index))!;
  return { cardIndex: c.index, cardId: c.cardId, name: c.name, upgraded: c.upgraded, target: c.target === "single" ? c.validTargets[0] : null };
}

it("reads only the observed Silent A10 single-enemy active relic and temporary amount", () => {
  expect(silentHelicalDart(parseGameState(rawAt(296655)))).toEqual({ temporary: 0 });
  expect(silentHelicalDart(parseGameState(rawAt(296641)))).toEqual({ temporary: 4 });
  for (const change of [
    (r: Raw) => { r.run.character_id = "IRONCLAD"; },
    (r: Raw) => { r.run.ascension = 9; },
    (r: Raw) => { r.run.relics = []; },
    (r: Raw) => { r.run.relics.find((x: Raw) => x.relic_id === "HELICAL_DART").is_melted = true; },
    (r: Raw) => { r.run.relics.push({ relic_id: "KUNAI" }); },
    (r: Raw) => { r.combat.enemies.push({ ...r.combat.enemies[0], index: 1 }); },
    (r: Raw) => { r.combat.player.powers.push({ power_id: "HELICAL_DART_POWER", amount: -1 }); },
    (r: Raw) => { r.combat.player.powers.push({ power_id: "FRAIL_POWER", amount: 1 }); },
  ]) {
    const raw = rawAt(296655); change(raw); expect(silentHelicalDart(parseGameState(raw))).toBeUndefined();
  }
});

it("reaches the real planner and isolates two later-card Block from the separate upgrade", () => {
  const input = inputAt();
  expect(input.player.helicalDart).toEqual({ temporary: 0 });
  const order = [step(input, "SHIV"), step(input, "DEFLECT"), step(input, "DEFEND_SILENT")];
  const trace = traceSteps(input, order);
  expect(trace.complete).toBe(true);
  expect(trace.transitions[0]!.after).toMatchObject({ dexterity: 4, block: 0 });
  expect(trace.transitions[1]!.after.block).toBe(8);
  expect(trace.plan!.outcome.blockGained).toBe(17);
  const prior = structuredClone(input); delete prior.player.helicalDart;
  expect(replaySteps(prior, order)!.outcome.blockGained).toBe(15);
  expect(replaySteps(input, [order[1]!, order[2]!, order[0]!])!.outcome.blockGained).toBe(15);
  const upgraded = inputAt(296659);
  const actual = upgraded.hand.find((c) => c.cardId === "DEFEND_SILENT" && c.upgraded)!;
  expect(replaySteps(upgraded, [step(upgraded, "DEFEND_SILENT", actual.index)])!.outcome.blockGained).toBe(12);
  expect(rawAt(296660).combat.player.block - rawAt(296659).combat.player.block).toBe(12);
});

it("counts each explicit upgraded Shiv once, without retroactive Block", () => {
  const input = inputAt(296638);
  const shivs = input.hand.filter((c) => c.cardId === "SHIV");
  expect(shivs).toHaveLength(3);
  expect(shivs.every((c) => c.observedHelicalShiv)).toBe(true);
  const trace = traceSteps(input, shivs.map((c) => step(input, "SHIV", c.index)));
  expect(trace.complete).toBe(true);
  expect(trace.transitions.map((t) => t.after.dexterity)).toEqual([2, 3, 4]);
  expect(trace.plan!.outcome).toMatchObject({ blockGained: 0, helicalDexterityGained: 3 });
  expect(rawAt(296641).combat.player.block).toBe(0);
});

it("retains unverified replay and altered templates as unknown", () => {
  const input = inputAt(); const shiv = input.hand.find((c) => c.cardId === "SHIV")!;
  shiv.replay = 1;
  const plan = replaySteps(input, [step(input, "SHIV"), step(input, "DEFLECT")])!;
  expect(plan.outcome.helicalDexterityGained).toBeUndefined();
  expect(plan.outcome.blockGained).toBe(7);
  expect(plan.outcome.unknownCards.join(",")).toContain("螺线飞镖");
  const raw = rawAt(296655).combat.hand[0];
  for (const patch of [{ enchantment: { id: "UNKNOWN" } }, { energy_cost: 1 }, { resolved_rules_text: "造成40点伤害。" }]) {
    expect(modelHandCard({ ...raw, ...patch }, 0, knowledge, "silent", 10).observedHelicalShiv).toBeUndefined();
  }
});

it.each([false, true])("fullFight=%s: expires only the entry/new temporary amount and retains Footwork", (fullFight) => {
  for (const [dexterity, temporary, playShiv] of [[4, 4, false], [4, 1, false], [3, 0, true]] as const) {
    const input = board({ bossHp: 500 });
    const raw = rawAt(296655).combat.hand[0];
    input.solver.hand = [modelHandCard(raw, 0, knowledge, "silent", 10)];
    input.solver.player = { ...input.solver.player, dexterityNow: dexterity, helicalDart: { temporary } };
    input.playerPowers = { DEXTERITY_POWER: dexterity, HELICAL_DART_POWER: temporary };
    input.piles = { handBase: input.solver.hand, discard: [], draw: [card(7, "DEFEND_SILENT", { cost: 0, type: "Skill", target: "self", block: 5 })] };
    input.plans = [];
    const plan = replaySteps(input.solver, playShiv ? [step(input.solver, "SHIV")] : [])!;
    const later: SolverInput[] = []; solveTap.onSolve = (value) => later.push(structuredClone(value));
    try { simulateFight(input, plan, 2, 1, fullFight); } finally { solveTap.onSolve = null; }
    expect(later[0]!.player.dexterityNow).toBe(dexterity - temporary);
    expect(later[0]!.player.helicalDart).toEqual({ temporary: 0 });
    expect(later[0]!.hand.find((c) => c.cardId === "DEFEND_SILENT")!.block).toBe(5 + dexterity - temporary);
  }
});

it("leaves other roles, levels and absent relics on their previous solver model", () => {
  const raw = rawAt(296655).combat.hand[0];
  for (const [character, ascension] of [["ironclad", 10], ["silent", 9], ["silent", 11]] as const) {
    expect(modelHandCard(raw, 0, knowledge, character, ascension).observedHelicalShiv).toBeUndefined();
  }
  const input = inputAt(); delete input.player.helicalDart;
  expect(replaySteps(input, [step(input, "SHIV"), step(input, "DEFLECT")])!.outcome.blockGained).toBe(7);
});

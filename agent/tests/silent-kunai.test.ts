/** 9R916WW0V65N A10 F49 T1/T2; silent-0085/0291. Fixed evidence; no model requests. */
import { afterEach, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import evidence from "./silent-kunai-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { silentKunai } from "../src/reflex/silent-kunai.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, traceSteps, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed Silent evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/knowledge/potion-equivalents.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/potion-equivalents.js")>(), heldPotionWorth: () => ({}),
}));

type Raw = Record<string, any>;
const rawAt = (line: number): Raw => structuredClone(evidence.frames.find((frame) => frame.line === line)!.row.state);
const step = (cardIndex: number, cardId: string, target?: number): Step => ({ cardIndex, cardId, name: cardId, upgraded: false, ...(target !== undefined ? { target } : {}) });
const oldRollout = rolloutLiveOptions.enabled, oldBoss = bossLinesOptions.enabled;
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; bossLinesOptions.enabled = oldBoss; });

function fixed() {
  const input = board({ bossHp: 500 }).solver;
  input.player = { ...input.player, energy: 4, dexterityNow: 0, kunai: { count: 2 } };
  input.hand = [card(0, "NEUTRALIZE", { cost: 0, damage: 4 }),
    card(1, "FOOTWORK", { cost: 1, type: "Power", target: "self", dexterity: 2 }),
    card(2, "DEFEND_SILENT", { type: "Skill", target: "self", block: 5 }),
    card(3, "DEFEND_SILENT", { type: "Skill", target: "self", block: 5 })];
  return input;
}

it("reads the observed transient stack three as a completed trigger, and refuses unknown identities or counters", () => {
  expect(silentKunai(parseGameState(rawAt(295534)))).toEqual({ count: 2 });
  expect(silentKunai(parseGameState(rawAt(295535)))).toEqual({ count: 0 });
  for (const change of [
    (r: Raw) => { r.run.character_id = "IRONCLAD"; },
    (r: Raw) => { r.run.ascension = 9; },
    (r: Raw) => { r.run.relics = []; },
    (r: Raw) => { r.run.relics.push({ relic_id: "HELICAL_DART" }); },
    (r: Raw) => { r.run.relics.find((x: Raw) => x.relic_id === "KUNAI").stack = null; },
    (r: Raw) => { r.run.relics.find((x: Raw) => x.relic_id === "KUNAI").is_melted = true; },
    (r: Raw) => { r.combat.player.attacks_played_this_turn = 1; },
  ]) {
    const raw = rawAt(295534); change(raw); expect(silentKunai(parseGameState(raw))).toBeUndefined();
  }
});

it("matches the isolated third-attack gain and never adds it to existing Block", () => {
  const input = fixed(); input.player.block = 23;
  const trace = traceSteps(input, [step(0, "NEUTRALIZE", 0)]);
  expect(trace.complete).toBe(true);
  expect(trace.transitions[0]!.after).toMatchObject({ dexterity: 1, block: 23 });
  expect(trace.plan!.outcome.kunaiDexterityGained).toBe(1);
  const observed = rawAt(295549);
  expect(observed.combat.player.powers.find((p: Raw) => p.power_id === "DEXTERITY_POWER").amount).toBe(6);
  expect(observed.combat.player.block).toBe(0);
});

it("gives only later Block cards the new Dexterity, alongside independently established Footwork", () => {
  const input = fixed();
  const later = replaySteps(input, [step(0, "NEUTRALIZE", 0), step(1, "FOOTWORK"), step(2, "DEFEND_SILENT"), step(3, "DEFEND_SILENT")])!;
  const earlier = replaySteps(input, [step(2, "DEFEND_SILENT"), step(0, "NEUTRALIZE", 0), step(1, "FOOTWORK"), step(3, "DEFEND_SILENT")])!;
  expect(later.outcome.blockGained).toBe(16);
  expect(earlier.outcome.blockGained).toBe(13);
  delete input.player.kunai;
  expect(replaySteps(input, later.steps)!.outcome.blockGained).toBe(14);
});

it("counts ordinary cards once, including multi-hit, and triggers on the sixth Attack", () => {
  const input = fixed(); input.player.kunai = { count: 0 };
  input.hand = Array.from({ length: 6 }, (_, i) => card(i, i === 0 ? "DAGGER_SPRAY" : "SHIV", { cost: 0, damage: 4, hits: i === 0 ? 2 : 1 }));
  const traced = traceSteps(input, input.hand.map((c) => step(c.index, c.cardId, 0)));
  expect(traced.transitions.map((t) => t.after.dexterity)).toEqual([0, 0, 1, 1, 1, 2]);
  expect(traced.plan!.outcome.kunaiDexterityGained).toBe(2);
});

it("keeps replay triggers unknown and preserves the previous Block calculation", () => {
  const input = fixed(); input.hand[0]!.replay = 1;
  const plan = replaySteps(input, [step(0, "NEUTRALIZE", 0), step(2, "DEFEND_SILENT")])!;
  expect(plan.outcome.kunaiDexterityGained).toBeUndefined();
  expect(plan.outcome.blockGained).toBe(5);
  expect(plan.outcome.unknownCards.join(",")).toContain("苦无");
});

it("carries Kunai Dexterity into the next turn, resets its count and starts a new fight from fresh input", () => {
  const input = board({ bossHp: 500 }); input.solver = fixed();
  input.piles = { handBase: input.solver.hand, discard: [], draw: [card(7, "DEFEND_SILENT", { cost: 0, type: "Skill", target: "self", block: 5 })] };
  input.playerPowers = {}; input.plans = [];
  const plan = replaySteps(input.solver, [step(0, "NEUTRALIZE", 0), step(1, "FOOTWORK")])!;
  const later: SolverInput[] = []; solveTap.onSolve = (value) => { later.push(value); };
  simulateFight(input, plan, 2, 1, false);
  expect(later[0]!.player.dexterityNow).toBe(3);
  expect(later[0]!.player.kunai).toEqual({ count: 0 });
  expect(later[0]!.hand.find((c) => c.cardId === "DEFEND_SILENT")!.block).toBe(8);
  expect(silentKunai(parseGameState(rawAt(295540)))).toEqual({ count: 0 });
  const fresh = fixed(); fresh.player.kunai = { count: 0 };
  expect(traceSteps(fresh, []).initial.dexterity).toBe(0);
});

it.each([false, true])("reaches the actual planner solver input from the frozen Silent board (v1=%s)", (v1) => {
  const raw = rawAt(295534), state = parseGameState(raw);
  const knowledge = makeKnowledge({ cards: raw.run.deck.map((c: Raw) => ({ id: c.card_id, type: c.card_type, name: c.name })), monsters: [{ id: "QUEEN", type: "Boss" }] }, "cache");
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; bossLinesOptions.enabled = false;
  let input: SolverInput | undefined; solveTap.onSolve = (value) => { input ??= value; };
  const question = planCombatTurn({ state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], ...(v1 ? { jevContext: "v1" } : {}) });
  expect(input!.player.kunai).toEqual({ count: 2 });
  const attack = input!.hand.find((c) => c.cardId === "NEUTRALIZE")!;
  const footwork = input!.hand.find((c) => c.cardId === "FOOTWORK")!;
  const defend = input!.hand.find((c) => c.cardId === "DEFEND_SILENT")!;
  const trace = traceSteps(input!, [
    { ...step(attack.index, attack.cardId, attack.validTargets[0]), upgraded: attack.upgraded },
    { ...step(footwork.index, footwork.cardId), upgraded: footwork.upgraded },
    { ...step(defend.index, defend.cardId), upgraded: defend.upgraded },
  ]);
  expect(trace.complete, JSON.stringify(trace.transitions.map((t) => ({ step: t.step, energy: t.after.energy })))).toBe(true);
  expect(trace.plan!.outcome.blockGained).toBe(8);
  expect(trace.transitions[0]!.after.dexterity).toBe(1);
  expect(question?.kind).toBe("ask");
  if (question?.kind === "ask") expect(JSON.stringify(question.questions)).toContain("kunai_dexterity_gained");
  if (question?.kind === "ask" && v1) expect(JSON.stringify(question.jevView)).toContain("permanent Dexterity (Kunai)");
});

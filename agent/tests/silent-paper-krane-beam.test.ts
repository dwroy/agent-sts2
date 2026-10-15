/** HLAWCGM3KHVB A10 F49 T3, silent-0469: one measured turn, not an independent win. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { describePlan, leastLossFactsOf, planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import * as turnSolver from "../src/reflex/turn-solver.js";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const isKnowledge = (path: unknown) => typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/");
  const read = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (isKnowledge(path)) throw Object.assign(new Error("ENOENT: fixed Paper Krane beam evidence"), { code: "ENOENT" });
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, existsSync: (path: Parameters<typeof fs.existsSync>[0]) => !isKnowledge(path) && fs.existsSync(path),
    readFileSync: read, default: { ...fs, readFileSync: read } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const frames = JSON.parse(readFileSync(new URL("./silent-paper-krane-beam-states.json", import.meta.url), "utf8")) as Raw[];
const frame = (line = 410804): Raw => structuredClone(frames.find((entry) => entry.line === line)!.state);
const knowledge = makeKnowledge({ cards: frames.flatMap((entry) => entry.state.run.deck.map((c: Raw) => ({ id: c.card_id, type: c.card_type }))) }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function envFor(raw: Raw): DecisionEnv {
  const state = parseGameState(raw);
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
}
function inputFor(raw = frame()): SolverInput {
  let captured: SolverInput | undefined;
  const done = Symbol("fixed beam input");
  const intercept = vi.spyOn(turnSolver, "solveTurn").mockImplementation((input) => { captured = input; throw done; });
  try { planCombatTurn(envFor(raw)); }
  catch (error) { if (error !== done) throw error; }
  finally { intercept.mockRestore(); }
  if (!captured) throw new Error("the fixed board did not reach the production solver");
  return captured;
}
function steps(input: SolverInput, actions: [string, number | null][]): Step[] {
  return actions.map(([id, target]) => {
    const c = input.hand.find((entry) => entry.cardId === id)!;
    return { cardIndex: c.index, cardId: id, upgraded: c.upgraded, name: c.name, target };
  });
}
const actions: [string, number | null][] = [["THE_HUNT", 1], ["SUCKER_PUNCH", 0], ["DEADLY_POISON", 1]];
function legacy(input: SolverInput): SolverInput {
  const old = structuredClone(input);
  for (const enemy of old.enemies) if (enemy.paperKraneNewWeak === "beam") delete enemy.paperKraneNewWeak;
  return old;
}

it("the complete recorded line matches the observed 7x3 intent, nine block and twelve HP loss", () => {
  const input = inputFor();
  const before = replaySteps(legacy(input), steps(input, actions))!;
  const after = replaySteps(input, steps(input, actions))!;
  expect(input.enemies[0]!.paperKraneNewWeak).toBe("beam");
  expect(input.hand.find((c) => c.cardId === "SUCKER_PUNCH")!.paperKraneWeak).toBe("suckerPunch");
  expect(before.outcome.hpLoss).toBe(18);
  expect(after.outcome).toMatchObject({ hpLoss: 12, hpAfter: 59, blockGained: 2 });
  expect(frame().combat.player.current_hp - frame(410808).combat.player.current_hp).toBe(12);
  expect(frame(410807).combat.player.block).toBe(9);
  expect(frame(410806).combat.enemies[0].intents[0]).toMatchObject({ damage: 7, hits: 3 });
  expect(after.outcome.damageDealt).toBe(before.outcome.damageDealt);
  expect(after.outcome.potionCost).toBe(before.outcome.potionCost);
  expect(describePlan(after, 88)).toMatchObject({ hp_lost: 12, result: "survives with 59/88 HP before healing" });
});

it.each([410805, 410806])("state %i replanning keeps the same endpoint without reducing existing Weak twice", (line) => {
  const input = inputFor(frame(line));
  const remaining = actions.slice(line - 410804);
  expect(replaySteps(input, steps(input, remaining))!.outcome.hpLoss).toBe(12);
  if (line >= 410806) expect(input.enemies[0]!.paperKraneNewWeak).toBeUndefined();
});

it("other roles, ascensions, relic states, moves and unobserved power combinations retain the old result", () => {
  for (const change of [
    (raw: Raw) => { raw.run.character_id = "IRONCLAD"; },
    (raw: Raw) => { raw.run.ascension = 9; },
    (raw: Raw) => { raw.run.ascension = 11; },
    (raw: Raw) => { raw.run.relics = raw.run.relics.filter((r: Raw) => r.relic_id !== "PAPER_KRANE"); },
    (raw: Raw) => { raw.run.relics.find((r: Raw) => r.relic_id === "PAPER_KRANE").is_melted = true; },
    (raw: Raw) => { delete raw.run.relics.find((r: Raw) => r.relic_id === "PAPER_KRANE").is_melted; },
    (raw: Raw) => { raw.combat.enemies[0].move_id = "UNOBSERVED"; },
    (raw: Raw) => { raw.combat.enemies[0].max_hp = 212; },
    (raw: Raw) => { raw.combat.enemies[0].intents[0].hits = 2; },
    (raw: Raw) => { raw.combat.enemies[0].intents[0].damage = 13; },
    (raw: Raw) => { raw.combat.enemies[0].powers.push({ power_id: "STRENGTH_POWER", amount: 1 }); },
    (raw: Raw) => { raw.combat.player.powers.find((p: Raw) => p.power_id === "VULNERABLE_POWER").amount = 98; },
  ]) {
    const raw = frame(); change(raw); const input = inputFor(raw);
    expect(input.enemies[0]!.paperKraneNewWeak).toBeUndefined();
    expect(replaySteps(input, steps(input, actions))).toEqual(replaySteps(legacy(input), steps(input, actions)));
  }
});

it("unobserved card previews, replay and modifiers do not receive the measured endpoint", () => {
  const original = inputFor();
  for (const change of [
    (input: SolverInput) => { input.player.vulnerable = false; },
    (input: SolverInput) => { input.player.colossus = true; },
    (input: SolverInput) => { input.enemies[0]!.shrink = 1; },
    (input: SolverInput) => { input.hand.find((c) => c.cardId === "SUCKER_PUNCH")!.enemyTempStrengthLoss = 1; },
    (input: SolverInput) => { input.hand.find((c) => c.cardId === "SUCKER_PUNCH")!.replay = 1; },
    (input: SolverInput) => { input.hand.find((c) => c.cardId === "SUCKER_PUNCH")!.upgraded = true; },
    (input: SolverInput) => { delete input.hand.find((c) => c.cardId === "SUCKER_PUNCH")!.paperKraneWeak; },
  ]) {
    const input = structuredClone(original); change(input);
    expect(replaySteps(input, steps(input, actions))).toEqual(replaySteps(legacy(input), steps(input, actions)));
  }
  const card = frame().combat.hand.find((c: Raw) => c.card_id === "SUCKER_PUNCH");
  for (const change of [{ rules_text: "unobserved" }, { upgraded: true }, { energy_cost: 0 }, { enchantment: { id: "UNKNOWN" } }]) {
    expect(modelHandCard({ ...card, ...change }, 0, knowledge, "silent", 10).paperKraneWeak).toBeUndefined();
  }
});

it("the live least-loss consumer sees the corrected loss on a fixed synthetic HP boundary", () => {
  // Derived boundary, not a claim that the observed game would have survived.
  const raw = frame(); raw.combat.player.current_hp = 14;
  raw.combat.hand = raw.combat.hand.filter((c: Raw) => c.card_id === "SUCKER_PUNCH"); raw.run.potions = [];
  const decision = planCombatTurn(envFor(raw));
  expect(decision?.label).not.toBe("combat/least-loss");
  expect(leastLossFactsOf(decision)).toBeUndefined();
  raw.run.relics = raw.run.relics.filter((r: Raw) => r.relic_id !== "PAPER_KRANE");
  const previous = planCombatTurn(envFor(raw));
  expect(previous?.label).toBe("combat/least-loss");
  expect(leastLossFactsOf(previous)).toBeDefined();
});

/** EBVT8UZM6P12 A10 F43 T1, silent-0469: two attempts in one run, not independent wins. */
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
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, solveTurn, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const isKnowledge = (path: unknown) => typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/");
  const read = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (isKnowledge(path)) throw Object.assign(new Error("ENOENT: fixed Paper Krane evidence"), { code: "ENOENT" });
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, existsSync: (path: Parameters<typeof fs.existsSync>[0]) => !isKnowledge(path) && fs.existsSync(path),
    readFileSync: read, default: { ...fs, readFileSync: read } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const frames = JSON.parse(readFileSync(new URL("./silent-paper-krane-states.json", import.meta.url), "utf8")) as Raw[];
const frame = (line = 399969): Raw => structuredClone(frames.find((entry) => entry.line === line)!.state);
const knowledge = makeKnowledge({ cards: frames.flatMap((entry) => entry.state.run.deck.map((c: Raw) => ({ id: c.card_id, type: c.card_type }))) }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
const cachedInputs = new Map<number, SolverInput>();
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function envFor(raw: Raw): DecisionEnv {
  const state = parseGameState(raw);
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
}
function inputFor(raw = frame()): SolverInput {
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(envFor(raw)); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the fixed board was not solved");
  return input;
}
function fixedInput(line = 399969): SolverInput {
  if (!cachedInputs.has(line)) cachedInputs.set(line, inputFor(frame(line)));
  return structuredClone(cachedInputs.get(line)!);
}
function step(input: SolverInput, id: string, target: number | null): Step {
  const c = input.hand.find((entry) => entry.cardId === id);
  if (!c) throw new Error("missing fixed card: " + id);
  return { cardIndex: c.index, cardId: id, upgraded: c.upgraded, name: c.name, target };
}
function recorded(input: SolverInput, last = false) {
  const actions: [string, number | null][] = last
    ? [["BACKSTAB", 1], ["PHANTOM_BLADES", null], ["STRIKE_SILENT", 1], ["SNAKEBITE", 1], ["MALAISE", 0], ["NEUTRALIZE", 1]]
    : [["BACKSTAB", 0], ["PHANTOM_BLADES", null], ["STRIKE_SILENT", 0], ["NEUTRALIZE", 0], ["DEFEND_SILENT", null], ["MALAISE", 2]];
  return replaySteps(input, actions.map(([id, target]) => step(input, id, target)))!;
}
function legacy(input: SolverInput): SolverInput {
  const old = structuredClone(input);
  for (const enemy of old.enemies) delete enemy.paperKraneNewWeak;
  return old;
}

it.each([[399969, 399976, false, 10, 8], [400002, 400009, true, 19, 16]] as const)(
  "state %i: the complete recorded line matches the observed HP loss", (start, end, last, oldLoss, loss) => {
    const input = fixedInput(start);
    const before = recorded(legacy(input), last), after = recorded(input, last);
    expect(before.outcome.hpLoss).toBe(oldLoss);
    expect(frame(start).combat.player.current_hp - frame(end).combat.player.current_hp).toBe(loss);
    expect(after.outcome).toMatchObject({ hpLoss: loss, hpAfter: 41 - loss });
    expect(after.outcome.damageDealt).toBe(before.outcome.damageDealt);
    expect(after.outcome.potionCost).toBe(before.outcome.potionCost);
    expect(describePlan(after, 96)).toMatchObject({ hp_lost: loss, result: `survives with ${41 - loss}/96 HP before healing` });
  },
);

it("replanning consumes already-reduced intents once, and new Malaise still reaches the shared outcome", () => {
  const input = fixedInput(399973);
  expect(input.enemies[0]!.paperKraneNewWeak).toBeUndefined();
  const line = replaySteps(input, [step(input, "DEFEND_SILENT", null), step(input, "MALAISE", 2)])!;
  expect(line.outcome).toMatchObject({ hpLoss: 8, hpAfter: 33, blockGained: 5 });
  expect(replaySteps(fixedInput(399975), [])!.outcome.hpLoss).toBe(8);
  const last = fixedInput(400006);
  expect(replaySteps(last, [step(last, "MALAISE", 0)])!.outcome).toMatchObject({ hpLoss: 16, hpAfter: 25 });
});

it.each([["IRONCLAD", 10], ["SILENT", 9], ["SILENT", 11], ["", 10]])(
  "%s A%i retains its previous result", (character, ascension) => {
    const raw = frame(400006); raw.run.character_id = character; raw.run.ascension = ascension;
    const input = inputFor(raw);
    expect(input.enemies.every((enemy) => enemy.paperKraneNewWeak === undefined)).toBe(true);
    expect(replaySteps(input, [step(input, "MALAISE", 0)]))
      .toEqual(replaySteps(legacy(input), [step(input, "MALAISE", 0)]));
    expect(replaySteps(input, [step(input, "MALAISE", 0)])!.outcome.hpLoss).toBe(19);
  },
);

it.each(["absent", "melted", "unknown"])("Paper Krane %s retains the previous result", (mode) => {
  const raw = frame(400006);
  if (mode === "absent") raw.run.relics = raw.run.relics.filter((r: Raw) => r.relic_id !== "PAPER_KRANE");
  else raw.run.relics.find((r: Raw) => r.relic_id === "PAPER_KRANE").is_melted = mode === "melted" ? true : undefined;
  const input = inputFor(raw);
  expect(replaySteps(input, [step(input, "MALAISE", 0)])!.outcome.hpLoss).toBe(19);
});

it("unobserved moves, targets, powers and multi-hit intents retain the previous path", () => {
  for (const change of [
    (raw: Raw) => { raw.combat.enemies[0].enemy_id = "UNOBSERVED"; },
    (raw: Raw) => { raw.combat.enemies[0].move_id = "UNOBSERVED"; },
    (raw: Raw) => { raw.combat.enemies[0].powers.push({ power_id: "UNOBSERVED", amount: 1 }); },
    (raw: Raw) => { raw.combat.enemies[0].intents[0].hits = 2; },
  ]) {
    const raw = frame(400006); change(raw); const input = inputFor(raw);
    expect(replaySteps(input, [step(input, "MALAISE", 0)]))
      .toEqual(replaySteps(legacy(input), [step(input, "MALAISE", 0)]));
  }
});

it("unobserved modifiers, temporary loss, replay and unverified Weak sources retain the previous path", () => {
  const input = fixedInput(400006);
  for (const change of [
    (x: SolverInput) => { x.player.vulnerable = true; },
    (x: SolverInput) => { x.player.surrounded = true; x.player.facing = 1; },
    (x: SolverInput) => { x.player.intangible = true; },
    (x: SolverInput) => { x.player.colossus = true; },
    (x: SolverInput) => { x.enemies[0]!.shrink = 1; },
    (x: SolverInput) => { x.hand.find((c) => c.cardId === "MALAISE")!.enemyTempStrengthLoss = 1; },
    (x: SolverInput) => { x.hand.find((c) => c.cardId === "MALAISE")!.replay = 1; },
    (x: SolverInput) => { x.hand.find((c) => c.cardId === "MALAISE")!.upgraded = true; },
    (x: SolverInput) => { delete x.hand.find((c) => c.cardId === "MALAISE")!.paperKraneWeak; },
  ]) {
    const variant = structuredClone(input); change(variant);
    expect(replaySteps(variant, [step(variant, "MALAISE", 0)]))
      .toEqual(replaySteps(legacy(variant), [step(variant, "MALAISE", 0)]));
  }
  const raw = frame(400006).combat.hand.find((c: Raw) => c.card_id === "MALAISE");
  expect(modelHandCard({ ...raw, rules_text: "unobserved" }, 0, knowledge, "silent", 10).paperKraneWeak).toBeUndefined();
});

it("the terminal search and live least-loss consumer see the corrected loss without changing SL thresholds", () => {
  // Synthetic HP boundary derived from the observed suffix; no claim of an actual rescued game.
  const raw = frame(400006); raw.combat.player.current_hp = 17;
  raw.combat.hand = raw.combat.hand.filter((c: Raw) => c.card_id === "MALAISE"); raw.run.potions = [];
  const input = inputFor(raw); input.hand = input.hand.filter((c) => c.cardId === "MALAISE");
  const newSolve = solveTurn(input), oldSolve = solveTurn(legacy(input));
  expect(newSolve.plans.some((p) => !p.outcome.dies && p.outcome.hpAfter === 1)).toBe(true);
  expect(oldSolve.plans.every((p) => p.outcome.dies)).toBe(true);
  const repaired = planCombatTurn(envFor(raw));
  expect(repaired?.label).not.toBe("combat/least-loss");
  expect(leastLossFactsOf(repaired)).toBeUndefined();
  raw.run.relics = raw.run.relics.filter((r: Raw) => r.relic_id !== "PAPER_KRANE");
  const previous = planCombatTurn(envFor(raw));
  expect(previous?.label).toBe("combat/least-loss");
  expect(leastLossFactsOf(previous)).toBeDefined();
});

it("later simulated turns discard the decision-turn certificate", () => {
  const first = fixedInput(400006);
  const simulation = board({ playerHp: 70 });
  first.player.hp = 70; first.player.endTurnBlock = 0;
  first.hand = first.hand.filter((c) => c.cardId === "MALAISE");
  simulation.solver = first;
  simulation.enemies = first.enemies.map((e) => ({ index: e.index, id: `FIXED_${e.index}`, move: "WAIT", strength: 0, powers: {} }));
  simulation.tables = Object.fromEntries(simulation.enemies.map((e) => [e.id, { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } }]));
  simulation.playerPowers = {};
  simulation.meta = { ...simulation.meta, asc: 10, max_en: 3 };
  simulation.piles = { handBase: first.hand, draw: Array.from({ length: 15 }, (_, i) => card(200 + i, "FIXED_JUNK", { type: "Status", playable: false })), discard: [] };
  const later: SolverInput[] = [];
  solveTap.onSolve = (value) => later.push(structuredClone(value));
  simulateFight(simulation, replaySteps(first, [step(first, "MALAISE", 0)])!, 2, 1, false);
  solveTap.onSolve = null;
  expect(later.length).toBeGreaterThan(0);
  expect(later.every((value) => value.enemies.every((enemy) => enemy.paperKraneNewWeak === undefined))).toBe(true);
});

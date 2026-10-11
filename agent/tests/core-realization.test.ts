/** L704TLETMZBM SILENT A10 F48 final T3/T4, learner ledger silent-0193/0194. Fixed observations only. */
import { readFileSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn, pileCardModels } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions, boardRolloutInput, fightMetaOf } from "../src/reflex/rollout-live.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { replaySteps, solveTap, solveTurn, type SolverInput } from "../src/reflex/turn-solver.js";
import { compareOptions } from "../src/sim/build-sim.js";
import { SerialDeckRunner } from "../src/sim/build-sim-pool.js";
import { coreRealization } from "../src/sim/core-realization.js";
import { quantitativeTurnFacts } from "../src/sim/quantitative-facts.js";
import { traceSteps } from "../src/reflex/turn-solver.js";
import { board, card, defend } from "./boss-sim-fixture.js";

vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const knowledge = makeKnowledge({ cards: [
  ...["DAGGER_THROW", "FLECHETTES", "NEUTRALIZE", "ECHOING_SLASH", "THE_HUNT", "POISONED_STAB", "STRIKE_SILENT"].map((id) => ({ id, type: "Attack" })),
  ...["SURVIVOR", "SHADOW_STEP", "ACROBATICS", "CALCULATED_GAMBLE", "LEG_SWEEP", "ADRENALINE", "BACKFLIP", "PIERCING_WAIL", "DEFEND_SILENT"].map((id) => ({ id, type: "Skill" })),
  { id: "FOOTWORK", type: "Power" }, { id: "ACCELERANT", type: "Power" }, { id: "GREED", type: "Curse" }, { id: "SHAME", type: "Curse" },
] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  rolloutLiveOptions.enabled = oldRollout;
  setMonsterDbForTests(null);
});

function observed(frame: number | string, character = "SILENT", held = true) {
  const raw = typeof frame === "number"
    ? JSON.parse(readFileSync(new URL("./silent-tough-bandages-state.json", import.meta.url), "utf8"))[frame].state as Raw
    : JSON.parse(readFileSync(new URL("./core-realization-observations.json", import.meta.url), "utf8"))[frame].before.state as Raw;
  raw.run.character_id = character;
  if (!held) raw.run.relics = raw.run.relics.filter((relic: Raw) => relic.relic_id !== "TOUGH_BANDAGES");
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  let decision;
  try { decision = planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the observed board was not solved");
  return { input, raw, state, decision, env };
}

function step(input: SolverInput, id: string, discards?: string[]) {
  const card = input.hand.find((entry) => entry.cardId === id)!;
  return { cardIndex: card.index, cardId: id, name: card.name, upgraded: card.upgraded,
    target: card.target === "single" ? 0 : null, ...(discards ? { discards } : {}) };
}


it("quantifies actual payment once and the two replay effects in the fixed L704 frame", () => {
  const { input, state } = observed(0);
  const steps = [step(input, "ACROBATICS", ["SHAME", "GREED"])];
  const trace = traceSteps(input, steps);
  expect(trace.complete).toBe(true);
  expect(trace.transitions[0]).toMatchObject({ payment: 1, effects: 2,
    before: { duplicateSkills: 2 }, after: { duplicateSkills: 1, blockGained: 6 } });
  const facts = quantitativeTurnFacts(state, trace.plan!, input);
  expect(facts).toMatchObject({ quantitative_turn: { realization: {
    energy_paid: 1, manual_plays: { ACROBATICS: 1 }, effect_resolutions: { ACROBATICS: 2 },
    actions: [{ block_gained: 6, effects: 2, draws: 5 }], complete_combinations: null,
  } } });
});

it("the real combat consumer supplies realization to its unchanged legal choices", () => {
  const { decision } = observed(0);
  expect(decision?.kind).toBe("ask");
  const criteria = (decision as any).questions.plan.criteria;
  const facts = Object.values(criteria).filter((v): v is string => typeof v === "string").map((v) => JSON.parse(v));
  expect(facts.length).toBeGreaterThan(1);
  expect(facts.every((f) => f.quantitative_turn.realization.model === "silent-realization-v1")).toBe(true);
  expect(facts.every((f) => f.quantitative_turn.complete_combinations === null)).toBe(true);
});

it("L704 Gamble reports nine real discards separately from one manual action", () => {
  const { input } = observed(1);
  const facts = coreRealization(input, [step(input, "CALCULATED_GAMBLE")]);
  expect(facts.actions[0]).toMatchObject({ cost: 0, block_gained: 27 });
  expect(facts.actions[0]!.discards).toHaveLength(9);
  expect(facts.manual_plays.CALCULATED_GAMBLE).toBe(1);
  expect(facts.complete_combinations).toBeNull();
});

it("fee shortage and exhausted reuse remain broken prefixes, not zero-valued legal plans", () => {
  const input = board().solver;
  input.hand = [card(0, "ADRENALINE", { type: "Skill", target: "self", cost: 0, energyGain: 1, exhausts: true })];
  const play = step(input, "ADRENALINE");
  const broken = coreRealization(input, [play, play]);
  expect(broken.complete_line).toBe(false);
  expect(broken.energy_paid).toBeNull();
  expect(broken.manual_plays.ADRENALINE).toBe(1);
  input.player.energy = 0;
  input.hand[0]!.cost = 1;
  expect(coreRealization(input, [play]).complete_line).toBe(false);
});

it("NO_DRAW retains independent energy and Block without counting imagined draws", () => {
  const input = board().solver;
  input.player.noDraw = true;
  input.hand = [card(0, "BACKFLIP", { type: "Skill", target: "self", block: 5, draw: 2 }),
    card(1, "ADRENALINE", { type: "Skill", target: "self", cost: 0, energyGain: 1, draw: 2, exhausts: true })];
  const facts = coreRealization(input, input.hand.map((c) => step(input, c.cardId)));
  expect(facts.actions.map((a) => a.draws)).toEqual([0, 0]);
  expect(facts.actions[0]!.block_gained).toBe(5);
  expect(facts.actions[1]!.energy_after - facts.actions[1]!.energy_before).toBe(1);
});

it("unobserved ascensions and other characters retain their previous fact envelope", () => {
  const { input, state } = observed(0);
  const plan = replaySteps(input, [])!;
  state.run!.ascension = 9;
  expect(quantitativeTurnFacts(state, plan, input).quantitative_turn).not.toHaveProperty("realization");
  (state.run!.raw as any).character_id = "IRONCLAD";
  expect(quantitativeTurnFacts(state, plan, input)).toEqual({});
});

it("does not trace a sampled or stale card merely because its hand index matches", () => {
  const input = board().solver;
  const wrong = { ...step(input, "STRIKE"), cardId: "DEADLY_POISON" };
  expect(traceSteps(input, [wrong])).toMatchObject({ complete: false, transitions: [] });
});

it("replays five frozen first-action endpoints, separating historical validation from prospective calibration", () => {
  const fixtures = JSON.parse(readFileSync(new URL("./core-realization-observations.json", import.meta.url), "utf8"));
  const audit: unknown[] = [];
  for (const [name, f] of Object.entries(fixtures) as [string, Raw][]) {
    const { input } = observed(name);
    const chosen = input.hand.find((c) => c.index === f.action.card_index)!;
    const facts = coreRealization(input, [{ ...step(input, chosen.cardId), target: f.action.target_index ?? null }]);
    expect(facts.complete_line, name).toBe(true);
    const expected = f.after.state.combat.player;
    audit.push({ name, source: { before: f.before.ts, after: f.after.ts, run: f.run, attempt: f.attempt, floor: f.floor },
      scope: "fixed_historical_replay_not_prospective_calibration", input, steps: [step(input, chosen.cardId)], result: facts, actual: expected });
    expect(facts.actions[0], name).toMatchObject({ energy_after: expected.energy, block_after: expected.block, hp_after: expected.current_hp });
    if (chosen.cardId === "BACKFLIP") expect(facts.actions[0]).toMatchObject({ draws: 0, block_gained: 5 });
    if (chosen.cardId === "FOOTWORK") expect(facts.modeled_after_actions.dexterity).toBe(7);
    if (name.startsWith("54G") && chosen.cardId === "NEUTRALIZE") {
      expect(input.hand.filter((c) => c.cardId === "FOOTWORK")).toHaveLength(3);
      expect(facts.established_before.dexterity).toBe(4);
      expect(facts.modeled_after_actions.dexterity).toBe(4);
      expect(facts.manual_plays.FOOTWORK).toBeUndefined();
    }
  }
  if (process.env.CORE_REPLAY_AUDIT) writeFileSync(process.env.CORE_REPLAY_AUDIT, JSON.stringify(audit, null, 2));
});

it("compares frozen KV0 keep/skip/remove/add draw-pile options within its observed NO_DRAW turn", async () => {
  const { input, state, env } = observed("KV0JHNJCKXLS-BACKFLIP");
  const { handBase, ...boardInput } = boardRolloutInput(state, knowledge, input, 10, {}, {});
  const ctx = { enemyTargets: input.enemies.map((e) => e.index), strength: input.player.strengthNow ?? 0, weak: input.player.weak };
  const draw = pileCardModels(state, knowledge, "draw", ctx);
  const discard = pileCardModels(state, knowledge, "discard", ctx);
  expect(draw.length).toBeGreaterThan(0);
  const base = { ...boardInput, plans: [], piles: { draw, discard, handBase },
    meta: fightMetaOf(state, knowledge, env.screenMemory), mm: {}, model: null, gates: null,
    options: { policyNodes: 80 }, captureResources: true };
  const options = [{ key: "keep", change: null }, { key: "skip", change: null },
    { key: "remove", change: { piles: { ...base.piles, draw: draw.slice(1) } } },
    { key: "add", change: { piles: { ...base.piles, draw: [...draw, { ...draw[0]!, key: "added-observed-copy", index: 9876 }] } } }];
  const serial = new SerialDeckRunner();
  const result = await compareOptions({ run: (req) => serial.run({ ...req, maxTurns: 1, scripts: false }) }, base, options, { samples: 8, seed: 29, quantitative: true });
  expect(result.samples).toBe(8);
  expect(result.options.map((o) => o.key)).toEqual(["keep", "skip", "remove", "add"]);
  expect(result.options.every((o) => o.quantitative !== undefined)).toBe(true);
  const values = result.options.map((o) => (o.quantitative as any).damage_hp.mean);
  expect(new Set(values).size).toBe(1);
  if (process.env.CORE_PAIRED_AUDIT) writeFileSync(process.env.CORE_PAIRED_AUDIT, JSON.stringify({
    evidence: "KV0JHNJCKXLS/A10/F33/attempt6/T1", scope: "当前封抽回合；不是下轮或整战增删收益", maxTurns: 1, seed: 29,
    removed: draw[0]!.cardId, added: draw[0]!.cardId, result }, null, 2));
});

it("a finite action cap stops free successors and hand capacity separates draw budget from arrivals", () => {
  const input = board().solver;
  input.player.maxPlays = 1;
  input.hand = [card(0, "ZERO_A", { cost: 0, damage: 1 }), card(1, "ZERO_B", { cost: 0, damage: 1 })];
  expect(coreRealization(input, input.hand.map((c) => step(input, c.cardId)))).toMatchObject({ complete_line: false, energy_paid: null, manual_plays: { ZERO_A: 1 } });
  input.player.maxPlays = null;
  input.hand = [card(0, "DRAW_FIXTURE", { type: "Skill", target: "self", draw: 3 }), ...Array.from({ length: 9 }, (_, i) => card(i + 1, "HELD", { playable: false }))];
  const facts = coreRealization(input, [step(input, "DRAW_FIXTURE")]);
  expect(facts.actions[0]).toMatchObject({ draws: 1, draw_budget: 3 });
  expect(facts.unknown.length).toBeGreaterThan(0);
});

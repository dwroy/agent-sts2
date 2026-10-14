/** T082DRCUHRRD F17 T12 / F19 T1; LRN0HPZ0FZS1 F48 T3 / LYBHQ1X230ZB F30 T1, silent-0296. */
import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard, type CardModel } from "../src/reflex/card-model.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, solveTurn, traceSteps, type SolverInput } from "../src/reflex/turn-solver.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { board } from "./boss-sim-fixture.js";

vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
const evidence = JSON.parse(readFileSync(new URL("./silent-escape-plan-evidence.json", import.meta.url), "utf8"));
const knowledge = makeKnowledge({ cards: [
  ...["ESCAPE_PLAN", "DEFEND_SILENT", "SURVIVOR", "BURST"].map((id) => ({ id, type: "Skill" })),
  ...["BECKON", "ASCENDERS_BANE"].map((id) => ({ id, type: "Status" })),
] }, "cache");
afterEach(() => {
  solveTap.onSolve = null;
  rolloutLiveOptions.enabled = true;
  bossLinesOptions.enabled = true;
  setMonsterDbForTests(null);
});
const model = (raw: unknown, ascension = 0, character = "silent") => modelHandCard(raw, 0, knowledge, character, ascension);
const step = (card: CardModel) => ({ cardIndex: card.index, cardId: card.cardId, name: card.name, upgraded: card.upgraded, target: null });

function inputOf(name: string): SolverInput {
  const frame = evidence[name];
  const input = board().solver;
  input.hand = [model(frame.escape, name === "a10_omission" ? 10 : 0)];
  input.player = { hp: frame.player.current_hp, maxHp: frame.player.max_hp, block: frame.player.block,
    energy: frame.player.energy, weak: false, vulnerable: false, intangible: false };
  // Isolate the observed draw/Block transition from the rest of the fight and its refreshed data.
  input.enemies[0]!.attacks = [];
  return input;
}

it("draws the observed Status at zero energy without granting conditional Block", () => {
  const input = inputOf("status_draw");
  const drawn = model(evidence.status_draw.drawn);
  input.knownTop = [drawn];
  const traced = traceSteps(input, [step(input.hand[0]!)]);
  expect(traced.complete).toBe(true);
  expect(traced.transitions[0]!.after).toMatchObject({ drawn: 1, block: evidence.status_draw.after_block });
  expect(traced.plan!.outcome).toMatchObject({ cardsDrawn: 1, blockGained: 0 });
});

it("grants the observed three Block only when the next known card is a Skill", () => {
  const input = inputOf("skill_draw");
  input.knownTop = [model(evidence.skill_draw.drawn)];
  const traced = traceSteps(input, [step(input.hand[0]!)]);
  expect(traced.transitions[0]!.after).toMatchObject({ drawn: 1, block: evidence.skill_draw.after_block });
  expect(traced.plan!.outcome).toMatchObject({ cardsDrawn: 1, blockGained: 3 });
});

it("uses a sampled card's type after the rollout adapter moves the draw into drawn", () => {
  for (const name of ["skill_draw", "status_draw"]) {
    const input = inputOf(name);
    input.hand[0] = { ...input.hand[0]!, draw: 0, drawn: [model(evidence[name].drawn)] };
    expect(replaySteps(input, [step(input.hand[0]!)])!.outcome).toMatchObject({
      cardsDrawn: 1, blockGained: name === "skill_draw" ? 3 : 0,
    });
  }
});

it("keeps unknown draws as draws without promising their conditional Block", () => {
  for (const name of ["a0_omission", "a10_omission"]) {
    const input = inputOf(name);
    const plan = replaySteps(input, [step(input.hand[0]!)])!;
    expect(plan.outcome).toMatchObject({ cardsDrawn: 1, blockGained: 0, escapePlanUnresolved: true, winsFight: false });
    expect(plan.outcome.unknownCards.join(" ")).toContain("抽入牌类型未知");
    expect(solveTurn(input).plans.some((candidate) => candidate.steps[0]?.cardId === "ESCAPE_PLAN" && candidate.outcome.cardsDrawn === 1)).toBe(true);
  }
});

it("does not plan later first-Block consumption or certify a poison win before an unknown draw resolves", () => {
  const input = inputOf("a10_omission");
  input.player.unmovableArmed = true;
  const defend = { ...model(evidence.skill_draw.drawn), index: 4, key: "defend4", block: 10 };
  input.hand.push(defend);
  input.player.energy = 1;
  input.enemies[0]!.poison = input.enemies[0]!.hp;
  expect(replaySteps(input, [step(input.hand[0]!), step(defend)])).toBeNull();
  expect(replaySteps(input, [step(input.hand[0]!)])!.outcome).toMatchObject({ winsFight: false, escapePlanUnresolved: true });
});

it("does not consume first-Block doubling on the observed non-Skill draw", () => {
  const input = inputOf("status_draw");
  input.player.unmovableArmed = true;
  input.knownTop = [model(evidence.status_draw.drawn)];
  const defend = { ...model(evidence.skill_draw.drawn), index: 4, key: "defend4", block: 10 };
  input.hand.push(defend);
  input.player.energy = 1;
  expect(replaySteps(input, [step(input.hand[0]!), step(defend)])!.outcome.blockGained).toBe(10);
});

it("exposes the observed zero-energy draw through the actual combat planner", () => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
  const state = parseGameState(JSON.parse(readFileSync(new URL("./silent-escape-plan-state.json", import.meta.url), "utf8")));
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  planCombatTurn(env);
  expect(input).toBeDefined();
  const escape = input!.hand.find((card) => card.cardId === "ESCAPE_PLAN")!;
  expect(escape).toMatchObject({ cost: 0, playable: true, draw: 1, escapePlan: true });
  expect(replaySteps(input!, [step(escape)])!.outcome).toMatchObject({ cardsDrawn: 1, blockGained: 0 });
});

it("leaves other characters, upgrades, levels and unobserved templates on the prior model", () => {
  const raw = evidence.skill_draw.escape;
  for (const card of [model(raw, 0, "ironclad"), model(raw, 1), model({ ...raw, upgraded: true }),
    model({ ...raw, energy_cost: 1 }), model({ ...raw, enchantment: { id: "UNOBSERVED" } })]) {
    expect(card.escapePlan).toBeUndefined();
    expect(card.draw).toBe(0);
    expect(card.block).toBe(3);
  }
});

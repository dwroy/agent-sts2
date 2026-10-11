/** RC61MFQM63Y6 F33 T4 / 53FLQ68CETW0 F2 T4, silent-0268/0205. Fixed raw frames. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, solveTurn, type SolverInput, type Step } from "../src/reflex/turn-solver.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__fixed_survivor_discard__/${name}`,
}));
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

const knowledge = makeKnowledge({ cards: [
  ...["STRIKE_SILENT", "POISONED_STAB", "NEUTRALIZE"].map((id) => ({ id, type: "Attack" })),
  ...["SURVIVOR", "ANTICIPATE", "DEFEND_SILENT"].map((id) => ({ id, type: "Skill" })),
  { id: "NOXIOUS_FUMES", type: "Power" },
] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function observed(frame: number, facing = 0) {
  const rows = JSON.parse(readFileSync(new URL("./silent-survivor-discard-state.json", import.meta.url), "utf8"));
  const row = rows.find((entry: { line?: number; offset: number }) => (entry.line ?? entry.offset) === frame);
  const raw = row.data.state;
  expect(raw.run.relics.some((entry: { relic_id: string }) => entry.relic_id === "TOUGH_BANDAGES")).toBe(false);
  const state = parseGameState(raw);
  const memory = createScreenMemory("COMBAT"); memory.facing = facing;
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: memory, shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("fixed frame was not solved");
  const step = (id: string, target: number | null = null): Step => {
    const model = input!.hand.find((entry) => entry.cardId === id)!;
    return { cardIndex: model.index, cardId: model.cardId, name: model.name, upgraded: model.upgraded, target, targetName: null };
  };
  return { input, step, raw };
}

it("removes the unique Strike and preserves the lethal 57 laser instead of promising 14 HP", () => {
  const { input, step } = observed(285414);
  expect(input.hand.find((entry) => entry.cardId === "SURVIVOR")?.survivorDiscard).toBe(true);
  expect(replaySteps(input, [step("SURVIVOR"), step("STRIKE_SILENT", 1)])).toBeNull();
  const plan = replaySteps(input, [step("SURVIVOR")])!;
  expect(plan.steps[0]?.discards).toEqual(["STRIKE_SILENT"]);
  expect(plan.outcome).toMatchObject({ blockGained: 7, hpLoss: 50, hpAfter: -5, dies: true });
  const plans = solveTurn(input).plans;
  expect(plans.filter((entry) => entry.steps[0]?.cardId === "SURVIVOR").every((entry) => entry.steps.length === 1)).toBe(true);
});

it("replays the first-attempt counterexample: the Strike is still discarded, but facing Rocket costs 31", () => {
  const { input, step } = observed(285339, 1);
  const plan = replaySteps(input, [step("SURVIVOR")])!;
  expect(plan.steps[0]?.discards).toEqual(["STRIKE_SILENT"]);
  expect(plan.outcome).toMatchObject({ blockGained: 7, hpLoss: 31, hpAfter: 14, dies: false });
});

it("leaves the A6 multi-choice discard unresolved and recomputes from the actual selected hand", () => {
  const { input, step } = observed(6921389921);
  expect(replaySteps(input, [step("SURVIVOR"), step("NEUTRALIZE", 0)])).toBeNull();
  const plan = replaySteps(input, [step("SURVIVOR")])!;
  expect(plan.outcome.blockGained).toBe(8);
  expect(plan.outcome.unknownCards).toContain("弃牌选择未确定");
  const after = observed(6921430812);
  expect(after.input.hand.some((entry) => entry.cardId === "NEUTRALIZE")).toBe(false);
  expect(replaySteps(after.input, [after.step("DEFEND_SILENT")])?.outcome.hpLoss).toBe(1);
});

it("retains Survivor's Block with an empty hand, a held card or an unknown discard choice", () => {
  const { input, step } = observed(285414);
  const survivor = input.hand.find((entry) => entry.cardId === "SURVIVOR")!;
  input.hand = [survivor];
  expect(replaySteps(input, [step("SURVIVOR")])!.outcome.blockGained).toBe(7);
  const held = modelHandCard({ card_id: "FIXED_CURSE", type: "Curse", playable: false, energy_cost: 0 }, 5, knowledge, "silent", 10);
  input.hand = [survivor, held];
  expect(replaySteps(input, [step("SURVIVOR")])!.steps[0]?.discards).toEqual(["FIXED_CURSE"]);
});

it("keeps other characters, unobserved ascensions, upgrades and other discard cards unchanged", () => {
  const raw = observed(285414).raw.combat.hand[0];
  for (const [character, ascension] of [["ironclad", 10], ["silent", 7], ["silent", null]] as const) {
    expect(modelHandCard(raw, 0, knowledge, character, ascension).survivorDiscard).toBeUndefined();
  }
  expect(modelHandCard({ ...raw, upgraded: true }, 0, knowledge, "silent", 10).survivorDiscard).toBeUndefined();
  for (const id of ["DAGGER_THROW", "ACROBATICS"]) {
    expect(modelHandCard({ ...raw, card_id: id }, 0, knowledge, "silent", 10).survivorDiscard).toBeUndefined();
  }
});

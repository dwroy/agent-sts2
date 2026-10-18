import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-potion-targets-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__fixed_potion_targets__/${name}`,
}));
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

// Types and text come only from this observed Silent deck, without a refreshed catalogue.
const knowledge = makeKnowledge({ cards: evidence.state.run.deck.map((card) => ({
  id: card.card_id, name: card.name, type: card.card_type, cost: card.energy_cost,
  description: card.resolved_rules_text, description_raw: card.rules_text, vars: card.dynamic_values,
})) }, "cache");
const oldRollout = rolloutLiveOptions.enabled, oldBoss = bossLinesOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false; bossLinesOptions.enabled = false;
});
afterEach(() => {
  setMonsterDbForTests(null);
  rolloutLiveOptions.enabled = oldRollout; bossLinesOptions.enabled = oldBoss;
});

function question(raw = structuredClone(evidence.state)) {
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"),
    shopDiscardPotions: [], jevContext: "off" };
  const decision = planCombatTurn(env);
  if (decision?.kind !== "ask" || decision.questions.plan?.type !== "choice") throw new Error("expected plan question");
  return { decision, criteria: decision.questions.plan.criteria };
}

it("67AFTXLWVN4L F38 T2 offers every legal target and dispatches the second Cubex by index", () => {
  const { decision, criteria } = question();
  expect(Object.keys(criteria).filter((key) => key.startsWith("p0"))).toEqual(["p0->e0", "p0->e1", "p0->e2"]);
  for (const target of [0, 1, 2]) {
    const key = `p0->e${target}`;
    expect(JSON.parse(String(criteria[key])).simulated).toContain("not simulated");
    expect(decision.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } }).intent)
      .toEqual({ action: "use_potion", option_index: 0, target_index: target });
  }
});

it("keeps sparse target indices, one/two-target lists and untargeted potions reachable", () => {
  for (const targets of [[2], [0, 2], [2, 7, 11, 19]]) {
    const raw = structuredClone(evidence.state);
    raw.run.potions[0]!.valid_target_indices = targets;
    const { criteria } = question(raw);
    expect(Object.keys(criteria).filter((key) => key.startsWith("p0"))).toEqual(targets.map((index) => `p0->e${index}`));
  }
  const raw = structuredClone(evidence.state);
  raw.run.potions[0]!.requires_target = false;
  raw.run.potions[0]!.valid_target_indices = [];
  expect(Object.keys(question(raw).criteria).filter((key) => key.startsWith("p0"))).toEqual(["p0"]);
});

it("reserves room for both potions' complete target sets alongside the kept plans", () => {
  const raw = structuredClone(evidence.state);
  raw.run.potions[1] = { ...raw.run.potions[0]!, index: 1 };
  const { decision, criteria } = question(raw);
  expect(Object.keys(criteria).filter((key) => key.startsWith("p") && !key.startsWith("plan")))
    .toEqual(["p0->e0", "p0->e1", "p0->e2", "p1->e0", "p1->e1", "p1->e2"]);
  expect(Object.keys(criteria).length).toBeLessThanOrEqual(10);
  const key = "p1->e2";
  expect(decision.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } }).intent)
    .toEqual({ action: "use_potion", option_index: 1, target_index: 2 });
});

it("leaves other roles and unobserved ascensions on the original two-target path", () => {
  for (const [character, ascension] of [["IRONCLAD", 10], ["SILENT", 9]] as const) {
    const raw = structuredClone(evidence.state);
    raw.run.character_id = character; raw.run.ascension = ascension;
    expect(Object.keys(question(raw).criteria).filter((key) => key.startsWith("p0"))).toEqual(["p0->e0", "p0->e1"]);
  }
});

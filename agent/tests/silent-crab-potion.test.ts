import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-crab-potion-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import * as potionFacts from "../src/reflex/silent-crab-potion.js";
import { judgeEndTurn } from "../src/sl/judge.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { solveTap, type SolverInput } from "../src/reflex/turn-solver.js";

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

type Raw = Record<string, any>;
const knowledge = makeKnowledge({ cards: [] }, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });
function env(raw: Raw): DecisionEnv {
  const state = parseGameState(raw);
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], buildDecider: "deepseek" };
}
function planned(raw: Raw) {
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  let decision;
  try { decision = planCombatTurn(env(raw)); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("the fixed board was not solved");
  return { input, decision };
}

it.each(evidence.pairs)("attempt $attempt T$turn: Jev sees the verified application and keeps every legal choice", (pair) => {
  const raw: Raw = structuredClone(pair.before);
  const before = structuredClone(raw);
  const { input, decision } = planned(raw);
  // Application-only evidence must not activate automatic all-die selection.
  expect(input.hand.some((c) => c.cardId.startsWith("POTION:POISON_POTION:"))).toBe(false);
  if (decision?.kind !== "ask" || decision.questions.play?.type !== "choice") throw new Error("expected original Jev choice");
  const criteria = decision.questions.play.criteria;
  const targetKeys = raw.run.potions[0].valid_target_indices.map((i: number) => `p0->e${i}`);
  expect(Object.keys(criteria).filter((key) => key.startsWith("p0") || key === "end_turn").sort())
    .toEqual([...targetKeys, "end_turn"].sort());
  for (const target of raw.run.potions[0].valid_target_indices) {
    const key = `p0->e${target}`;
    const facts = JSON.parse(criteria[key]!).observed_potion_effect;
    if (target === pair.target) {
      const a = raw.combat.enemies.find((e: Raw) => e.index === pair.target);
      const b = pair.after.combat.enemies.find((e) => e.index === pair.target)!;
      const poison = (e: Raw) => e.powers.find((p: Raw) => p.power_id === "POISON_POWER").amount;
      expect(facts).toMatchObject({ target_index: target, target_id: a.enemy_id, poison_added: 6,
        poison_before: poison(a), poison_after_application: poison(b), immediate_hp_damage: 0,
        immediate_block_damage: 0, whole_turn_simulated: false, survival_verified: false });
      expect(b.current_hp).toBe(a.current_hp);
      expect(b.block).toBe(a.block);
    } else expect(facts).toBeUndefined();
    expect(decision.resolve({ play: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } }).intent)
      .toEqual({ action: "use_potion", option_index: 0, target_index: target });
  }
  expect(pair.after.combat.player).toEqual(raw.combat.player);
  const baseline = vi.spyOn(potionFacts, "crabPoisonFacts").mockReturnValue({});
  try {
    const previous = planned(raw).decision;
    if (previous?.kind !== "ask" || previous.questions.play?.type !== "choice") throw new Error("expected baseline choice");
    expect(Object.keys(criteria)).toEqual(Object.keys(previous.questions.play.criteria));
    for (const key of Object.keys(criteria)) {
      const actual = JSON.parse(criteria[key]!);
      const old = JSON.parse(previous.questions.play.criteria[key]!);
      if (actual.observed_potion_effect) { delete actual.observed_potion_effect; actual.simulated = old.simulated; }
      expect(actual).toEqual(old);
    }
  } finally { baseline.mockRestore(); }
  expect(raw).toEqual(before);
});

it("the ordinary plan question also carries the application fact without changing its legal options", () => {
  // Synthetic survival control: only HP changes, not the observed potion modifiers.
  const raw: Raw = structuredClone(evidence.pairs[5]!.before);
  raw.run.current_hp = raw.run.max_hp = raw.combat.player.current_hp = raw.combat.player.max_hp = 1000;
  const decision = planned(raw).decision;
  if (decision?.kind !== "ask" || decision.questions.plan?.type !== "choice") throw new Error("expected plan question");
  const criteria = decision.questions.plan.criteria;
  expect(JSON.parse(criteria["p0->e0"]!).observed_potion_effect).toMatchObject({ poison_added: 6, whole_turn_simulated: false });
  expect(criteria["p0->e1"]).toBeDefined();
  expect(JSON.parse(criteria["p0->e1"]!).observed_potion_effect).toBeUndefined();
  const baseline = vi.spyOn(potionFacts, "crabPoisonFacts").mockReturnValue({});
  try {
    const previous = planned(raw).decision;
    if (previous?.kind !== "ask" || previous.questions.plan?.type !== "choice") throw new Error("expected baseline question");
    expect(Object.keys(criteria)).toEqual(Object.keys(previous.questions.plan.criteria));
    for (const key of Object.keys(criteria)) {
      const actual = JSON.parse(criteria[key]!);
      const old = JSON.parse(previous.questions.plan.criteria[key]!);
      if (actual.observed_potion_effect) { delete actual.observed_potion_effect; actual.simulated = old.simulated; }
      expect(actual).toEqual(old);
    }
    for (const key of ["p0->e0", "p0->e1"]) {
      const answer = { plan: { type: "choice" as const, choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } };
      expect(decision.resolve(answer).intent).toEqual(previous.resolve(answer).intent);
    }
  } finally { baseline.mockRestore(); }
});

it("the final poison-kill state still has an uncertain SL verdict, not a verified survival", () => {
  const pair = evidence.pairs[5]!;
  const raw: Raw = structuredClone(pair.before);
  raw.combat = structuredClone(pair.after.combat); raw.run.potions = structuredClone(pair.after.potions);
  const verdict = judgeEndTurn(parseGameState(raw), { label: "combat/end_turn", revives: [], knowledge });
  expect(verdict.certain).toBe(false);
  expect(evidence.death.combat.player.current_hp).toBe(0);
  expect(evidence.death.combat.enemies.map((e) => e.enemy_id)).toEqual(["ROCKET"]);
});

it.each([
  ["other character", (x: Raw) => { x.run.character_id = "IRONCLAD"; }],
  ["A9", (x: Raw) => { x.run.ascension = 9; }],
  ["A11", (x: Raw) => { x.run.ascension = 11; }],
  ["other floor", (x: Raw) => { x.run.floor = 32; }],
  ["new relic", (x: Raw) => { x.run.relics.push({ relic_id: "UNOBSERVED" }); }],
  ["missing relics", (x: Raw) => { delete x.run.relics; }],
  ["new power", (x: Raw) => { x.combat.player.powers.push({ power_id: "UNOBSERVED", amount: 1 }); }],
  ["missing powers", (x: Raw) => { delete x.combat.player.powers; }],
  ["different power amount", (x: Raw) => { x.combat.player.powers[0].amount = 4; }],
  ["duplicate power", (x: Raw) => { x.combat.player.powers[0] = x.combat.player.powers[1]; }],
  ["artifact", (x: Raw) => { x.combat.enemies[0].powers.push({ power_id: "ARTIFACT_POWER", amount: 1 }); }],
  ["missing enemy powers", (x: Raw) => { delete x.combat.enemies[0].powers; }],
  ["other enemy", (x: Raw) => { x.combat.enemies[0].enemy_id = "UNOBSERVED"; }],
  ["duplicate index", (x: Raw) => { x.combat.enemies[1].index = 0; }],
  ["dead part", (x: Raw) => { x.combat.enemies[0].is_alive = false; }],
  ["orb", (x: Raw) => { x.combat.player.orbs.push({ orb_id: "UNOBSERVED" }); }],
  ["pet", (x: Raw) => { x.combat.player.pets.push({ pet_id: "UNOBSERVED" }); }],
  ["missing pet data", (x: Raw) => { delete x.combat.player.pets; }],
] as const)("%s keeps the previous unmodelled potion path", (_name, change) => {
  const raw: Raw = structuredClone(evidence.pairs[5]!.before); change(raw);
  expect(potionFacts.crabPoisonFacts(parseGameState(raw), "POISON_POTION", 0)).toEqual({});
  const current = planned(raw).decision;
  const baseline = vi.spyOn(potionFacts, "crabPoisonFacts").mockReturnValue({});
  try { expect(JSON.stringify(planned(raw).decision)).toBe(JSON.stringify(current)); } finally { baseline.mockRestore(); }
  expect(planned(raw).input.hand.some((c) => c.cardId.startsWith("POTION:POISON_POTION:"))).toBe(false);
});

it("uses enemy and power identities instead of array order or a stored slot", () => {
  const raw: Raw = structuredClone(evidence.pairs[2]!.before);
  raw.run.relics.reverse(); raw.combat.player.powers.reverse(); raw.combat.enemies.reverse();
  for (const e of raw.combat.enemies) e.powers.reverse();
  expect(potionFacts.crabPoisonFacts(parseGameState(raw), "POISON_POTION", 1)).toMatchObject({ observed_potion_effect: { poison_added: 6, target_id: "ROCKET" } });
  expect(potionFacts.crabPoisonFacts(parseGameState(raw), "POISON_POTION", 0)).toEqual({});
  expect(potionFacts.crabPoisonFacts(parseGameState(raw), "OTHER_POTION", 1)).toEqual({});
  expect(potionFacts.crabPoisonFacts(parseGameState(raw), "POISON_POTION", null)).toEqual({});
});

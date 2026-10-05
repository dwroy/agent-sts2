/** UACFSW4VDDLD F48 attempt 6 T4 / silent-0100: fixed board, no LLM or refreshed knowledge. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { silentPhaseReference } from "../src/reflex/silent-phase-reference.js";
import { replaySteps, solveTap, type SolverInput } from "../src/reflex/turn-solver.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";

vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
vi.mock("../src/sim/boss-lines.js", async (original) => ({
  ...await original<typeof import("../src/sim/boss-lines.js")>(), lowTrustOfState: () => null,
}));

const rawBoard = () => JSON.parse(readFileSync(new URL("./silent-phase-window-state.json", import.meta.url), "utf8"));
const knowledge = makeKnowledge({ cards: [
  ...["STRIKE_SILENT", "DASH"].map((id) => ({ id, type: "Attack" })),
  ...["ADRENALINE", "DEFEND_SILENT", "ESCAPE_PLAN"].map((id) => ({ id, type: "Skill" })),
], monsters: [{ id: "TEST_SUBJECT", type: "Boss" }] }, "cache");
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
});
afterEach(() => {
  solveTap.onSolve = null;
  rolloutLiveOptions.enabled = true;
  bossLinesOptions.enabled = true;
  setMonsterDbForTests(null);
});

function observed() {
  const state = parseGameState(rawBoard());
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  const decision = planCombatTurn(env);
  solveTap.onSolve = null;
  if (!input) throw new Error("the observed board was not solved");
  const step = (cardIndex: number, cardId: string, target?: number) => ({ cardIndex, cardId, name: cardId, upgraded: false, target });
  const end = replaySteps(input, [step(1, "STRIKE_SILENT", 0)])!;
  const wait = replaySteps(input, [step(2, "DEFEND_SILENT"), step(3, "ESCAPE_PLAN")])!;
  return { state, decision, end, wait };
}

it("reports the observed four-HP phase end separately from waiting and does not call it a fight win", () => {
  const { state, end, wait } = observed();
  expect(end.outcome).toMatchObject({ damageDealt: 4, hpLoss: 0, winsFight: false });
  expect(wait.outcome.damageDealt).toBe(0);
  const facts = silentPhaseReference(state, [{ key: "plan1", plan: end }, { key: "plan4", plan: wait }]);
  expect(facts.get(end)).toMatchObject({ current_phase_ends: true, phase_end_min_loss: true });
  expect(facts.get(wait)).toMatchObject({ current_phase_ends: false, phase_end_reference: expect.stringContaining("plan1") });
  expect(facts.get(end)!.phase_end_reference).toContain("整场胜负未验证");
});

it("shows equal immediate phase-end losses as tied and keeps the input options untouched", () => {
  const { state, end, wait } = observed();
  const twin = { ...end, steps: [...end.steps] };
  const shown = [{ key: "plan1", plan: end }, { key: "plan2", plan: twin }, { key: "plan4", plan: wait }];
  const before = JSON.stringify(shown);
  const facts = silentPhaseReference(state, shown);
  expect(facts.get(end)!.phase_end_reference).toContain("plan1、plan2");
  expect(facts.get(twin)!.phase_end_reference).toContain("并列");
  expect(JSON.stringify(shown)).toBe(before);
});

it("does not infer phase completion from damage or missing outcomes, nor recommend a dying phase-end line", () => {
  const { state, end, wait } = observed();
  for (const outcome of [
    { ...end.outcome, dies: true },
    { ...end.outcome, winsFight: true },
    { ...end.outcome, enemyHpAfter: [] },
    { ...wait.outcome, damageDealt: 999 },
  ]) {
    expect(silentPhaseReference(state, [{ key: "p", plan: { ...end, outcome } }]).size).toBe(0);
  }
});

it("leaves other characters, final phases and multi-enemy boards unchanged", () => {
  const { end } = observed();
  for (const change of [
    (raw: ReturnType<typeof rawBoard>) => { raw.run.character_id = "IRONCLAD"; },
    (raw: ReturnType<typeof rawBoard>) => { raw.combat.enemies[0].powers = []; },
    (raw: ReturnType<typeof rawBoard>) => { raw.combat.enemies.push({ ...raw.combat.enemies[0], index: 1 }); },
  ]) {
    const raw = rawBoard(); change(raw);
    expect(silentPhaseReference(parseGameState(raw), [{ key: "p", plan: end }]).size).toBe(0);
  }
});

it("puts the phase facts on the actual Jev choice alongside the original plan numbers", () => {
  const { decision } = observed();
  expect(decision?.kind).toBe("ask");
  const ask = decision as AskDecision;
  const criteria = ask.questions.plan!.criteria!;
  const facts = Object.values(criteria).filter((value): value is string => typeof value === "string").map((value) => JSON.parse(value));
  expect(facts.some((value) => value.current_phase_ends === true && value.phase_end_min_loss === true && value.hp_lost === 0)).toBe(true);
  expect(facts.some((value) => value.current_phase_ends === false && value.phase_end_reference)).toBe(true);
});

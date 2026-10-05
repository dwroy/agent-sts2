/** 9YT51CK8RC39 F17 attempt 3/6 T5 / silent-0079/0080: fixed board and fixed long-horizon ties. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setMoveModelForTests } from "../src/knowledge/move-model.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { silentLossReference } from "../src/reflex/silent-loss-reference.js";
import { replaySteps, solveTap, type Plan, type SolverInput } from "../src/reflex/turn-solver.js";
import { bossLinesOptions, type BossLineSim, type BossLineSimArgs } from "../src/sim/boss-lines.js";
import { summarizeLine, type FightSampleResult } from "../src/sim/boss-sim.js";

vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  // No generated knowledge JSON, including import-time trust tables, is part of this fixture.
  knowledgeFile: (_dir: string, name: string) => `/__silent_tied_loss_fixed__/${name}`,
}));
vi.mock("../src/knowledge/monster-db.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/monster-db.js")>(),
  readMonsterDbJson: () => ({ monsters: {}, bosses: {}, encounters: {} }),
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
vi.mock("../src/reflex/rollout-live.js", async (original) => ({
  ...await original<typeof import("../src/reflex/rollout-live.js")>(),
  liveRollout: () => ({ available: false, reason: "固定测试未执行多轮推演", elapsedMs: 0 }),
}));
vi.mock("../src/sim/boss-lines.js", async (original) => ({
  ...await original<typeof import("../src/sim/boss-lines.js")>(),
  lowTrustOfState: () => null,
  bossLineSim: (args: BossLineSimArgs): BossLineSim => {
    // The observed question's whole-fight tie is input, not a claimed reproduction of its simulation.
    const sample: FightSampleResult = { won: false, died: true, capped: false, timeUp: false,
      turns: 8, hpLoss: 42, revived: 0, drunk: [], enemyHpLeft: 90,
      lossByTurn: [], dmgByTurn: [], incomingByTurn: [], enemyLossByTurn: [], policyTurns: 0, policyNodes: 0 };
    const lines = args.lines.map((_, i) => ({ ...summarizeLine(i, [sample]), order: null }));
    return { available: true, byPlan: new Map(args.lines.map((plan, i) => [plan, {
      result: lines[i]!, calibrated: 0.003, vsBest: null, winTied: true, text: "固定并列输入：无赢样本",
    }])), best: null, tied: args.lines, bestDry: args.lines[0]!, boss: "CEREMONIAL_BEAST", lowTrust: null,
    run: { lines, samples: 1, requested: 1, timedOut: false, elapsedMs: 0, workers: 0, orders: 0 },
    plan: null, order: args.lines };
  },
}));

const rawBoard = () => JSON.parse(readFileSync(new URL("./silent-tied-loss-state.json", import.meta.url), "utf8"));
const knowledge = makeKnowledge({ cards: [
  { id: "STRIKE_SILENT", type: "Attack" },
  ...["SURVIVOR", "DEFEND_SILENT", "ANTICIPATE"].map((id) => ({ id, type: "Skill" })),
], monsters: [{ id: "CEREMONIAL_BEAST", type: "Boss" }] }, "cache");
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  setMoveModelForTests({});
  rolloutLiveOptions.enabled = true;
  bossLinesOptions.enabled = true;
});
afterEach(() => {
  solveTap.onSolve = null;
  rolloutLiveOptions.enabled = true;
  bossLinesOptions.enabled = false;
  setMonsterDbForTests(null);
  setMoveModelForTests(null);
});

function observed(character = "SILENT", jevContext: "off" | "v1" = "off") {
  const raw = rawBoard(); raw.run.character_id = character;
  const state = parseGameState(raw);
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, jevContext, screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  const decision = planCombatTurn(env);
  solveTap.onSolve = null;
  if (!input) throw new Error("the observed board was not solved");
  const step = (cardIndex: number, cardId: string, target?: number) => ({ cardIndex, cardId, name: cardId, upgraded: false, target });
  const strike = step(0, "STRIKE_SILENT", 0);
  const anticipate = step(4, "ANTICIPATE");
  const survivor = step(2, "SURVIVOR");
  const defend = step(3, "DEFEND_SILENT");
  const plans = [
    replaySteps(input, [strike, anticipate, survivor, defend])!,
    replaySteps(input, [strike, step(1, "STRIKE_SILENT", 0), anticipate, survivor])!,
    replaySteps(input, [strike, survivor, defend])!,
  ];
  const shown = plans.map((plan, index) => ({ key: `plan${index + 1}`, plan }));
  return { state, decision, plans, shown };
}

it("replays the observed 3/12/7 HP costs and reports 0/9/4 extra within a long-horizon tie", () => {
  const { state, plans, shown } = observed();
  expect(plans.map((plan) => [plan.outcome.hpLoss, plan.outcome.damageDealt, plan.outcome.blockGained])).toEqual([
    [3, 6, 21], [12, 12, 12], [7, 6, 17],
  ]);
  const facts = silentLossReference(state, shown, plans);
  expect(plans.map((plan) => facts.get(plan)?.tied_hp_loss_extra)).toEqual([0, 9, 4]);
  expect(plans.map((plan) => facts.get(plan)?.tied_hp_loss_rank)).toEqual([1, 3, 2]);
  expect(facts.get(plans[2]!)?.tied_hp_loss_reference).toContain("即时损血不同不代表整场胜率不同");
});

it("puts the reference on the actual Jev question and retains its original options, damage and long-horizon ties", () => {
  for (const context of ["off", "v1"] as const) {
    const { decision } = observed("SILENT", context);
    expect(decision?.kind).toBe("ask");
    expect(decision?.label).toBe("combat/plan-choice");
    const ask = decision as AskDecision;
    const criteria = (context === "v1" ? ask.jevView!.questions : ask.questions).plan!.criteria!;
    const facts = Object.values(criteria).map((value) => JSON.parse(value!));
    // Without rollout-added lines, code offers two nondominated lines; the three-line slate is tested above.
    expect(facts).toHaveLength(2);
    expect(facts.map((value) => value.hp_lost)).toEqual([3, 12]);
    expect(facts.map((value) => value.damage_dealt)).toEqual([6, 12]);
    expect(facts.map((value) => value.tied_hp_loss_extra)).toEqual([0, 9]);
    expect(facts.every((value) => value.rollout_tied && value.whole_fight_sim === "固定并列输入：无赢样本")).toBe(true);
  }
});

it("marks all minimum-HP peers as tied without mutating or sorting the options", () => {
  const { state, plans } = observed();
  const twin = { ...plans[0]!, steps: [...plans[0]!.steps] };
  const shown = [{ key: "plan3", plan: plans[2]! }, { key: "plan1", plan: plans[0]! }, { key: "plan4", plan: twin }];
  const before = JSON.stringify(shown);
  const facts = silentLossReference(state, shown, shown.map((entry) => entry.plan));
  expect(facts.get(twin)).toMatchObject({ tied_hp_loss_extra: 0, tied_hp_loss_rank: 1 });
  expect(facts.get(twin)?.tied_hp_loss_reference).toContain("plan1、plan4");
  expect(facts.get(twin)?.tied_hp_loss_reference).toContain("并列");
  expect(facts.get(plans[2]!)?.tied_hp_loss_rank).toBe(3);
  expect(JSON.stringify(shown)).toBe(before);
});

it("does not compare options outside a long-horizon tie or incomplete and revived outcomes", () => {
  const { state, plans, shown } = observed();
  expect(silentLossReference(state, shown, []).size).toBe(0);
  expect(silentLossReference(state, shown, [plans[0]!]).size).toBe(0);
  expect(silentLossReference(state, shown, [plans[0]!, plans[2]!]).has(plans[1]!)).toBe(false);
  for (const change of [
    { hpLoss: NaN }, { cardsDrawn: 1 }, { unknownCards: ["未建模牌"] }, { dies: true },
    { revived: { names: ["复活"], sources: ["FIXED"], reviveHp: 10, hp: 10, ownLoss: 0 } },
  ]) {
    const uncertain: Plan = { ...plans[0]!, outcome: { ...plans[0]!.outcome, ...change } };
    expect(silentLossReference(state, [{ key: "a", plan: uncertain }, shown[2]!], [uncertain, plans[2]!]).size).toBe(0);
  }
});

it("compares a deterministic potion like any other line using net HP, with no held-value charge", () => {
  const { state, plans } = observed();
  const drink: Plan = { ...plans[0]!, steps: [{ cardIndex: -1, cardId: "FIXED_POTION", name: "固定药水", upgraded: false }],
    outcome: { ...plans[0]!.outcome, hpLoss: -2, hpAfter: 44, potionHeal: 5, potionCost: 99 } };
  const facts = silentLossReference(state, [{ key: "drink", plan: drink }, { key: "dry", plan: plans[0]! }], [drink, plans[0]!]);
  expect(facts.get(drink)).toMatchObject({ tied_hp_loss_rank: 1, tied_hp_loss_extra: 0 });
  expect(facts.get(plans[0]!)).toMatchObject({ tied_hp_loss_rank: 2, tied_hp_loss_extra: 5 });
});

it("leaves the other-character Jev question without the new facts", () => {
  const { state, decision, plans, shown } = observed("IRONCLAD");
  expect(silentLossReference(state, shown, plans).size).toBe(0);
  expect(decision?.kind).toBe("ask");
  const criteria = (decision as AskDecision).questions.plan!.criteria!;
  expect(Object.values(criteria).every((value) => !value!.includes("tied_hp_loss_"))).toBe(true);
});

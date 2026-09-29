/**
 * Options tied in the rollout as Jev reads them (Dai 2026-09-29; consistency review #6): when two or more shown
 * options have the same expected further HP loss (as shown, one decimal) and the same deaths as the best, none
 * is flagged rollout_best: each is tagged rollout_tied, the decision log names them, and choosing any of them
 * counts as choosing the rollout's best. Saturated boards keep their tie-break (enemy HP left, turns alive).
 */

import { describe, expect, it, vi } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import type { AskDecision } from "../src/project/types.js";
import type { LineEstimate } from "../src/strategy/rollout.js";
import type { Plan } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv } from "./logged.js";

/** The live rollout, with its first two shown lines forced into a tie (the fixture: the labels, not the numbers). */
const forceTie = { on: false };
vi.mock("../src/strategy/rollout-live.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/strategy/rollout-live.js")>();
  return {
    ...original,
    liveRollout: (args: Parameters<typeof original.liveRollout>[0]) => {
      const r = original.liveRollout(args);
      if (!forceTie.on || !r.available) return r;
      return { ...r, best: null, tied: args.shown.slice(0, 2), saturated: false };
    },
  };
});

const { pickRolloutBest, rolloutTies, sameShownResult, rolloutLiveOptions } = await import("../src/strategy/rollout-live.js");
const { planCombatTurn } = await import("../src/screens/combat-plan.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");

const line = (name: string, over: Partial<LineEstimate>): LineEstimate =>
  ({ plan: { steps: [], name } as unknown as Plan, value: -30, hpLoss: 10, wins: 0, deaths: 0, samples: 8, enemyHpLeft: 40, turnsSurvived: 5, ...over }) as LineEstimate;

describe("rollout ties (pure)", () => {
  it("the same numbers as shown: loss to one decimal and the share dead", () => {
    expect(sameShownResult(line("a", { hpLoss: 16.04 }), line("b", { hpLoss: 15.96 }))).toBe(true);
    expect(sameShownResult(line("a", { hpLoss: 16.04 }), line("b", { hpLoss: 16.06 }))).toBe(false);
    expect(sameShownResult(line("a", { deaths: 1 }), line("b", { deaths: 0 }))).toBe(false);
    // Wins and enemy HP left are not part of it.
    expect(sameShownResult(line("a", { wins: 8, enemyHpLeft: 0 }), line("b", { wins: 3, enemyHpLeft: 30 }))).toBe(true);
  });

  it("two shown lines tied with the best: no best, both tied (4LC3YKCZV218 F24 T1: plans 1-4 all 16, 0/8)", () => {
    const a = line("a", { value: -29.99, enemyHpLeft: 50 });
    const b = line("b", { value: -30, enemyHpLeft: 20 });
    const c = line("c", { hpLoss: 12, value: -32 });
    const shown = [a.plan, b.plan, c.plan];
    const picked = pickRolloutBest([a, b, c], 60);
    // Before: a value 0.01 higher (float noise under the same shown numbers) made `a` the best.
    expect(picked.best).toBe(a);
    // Enemy HP left (b's 20 vs a's 50) does not break it either.
    expect(rolloutTies(picked, [a, b, c], shown)).toEqual({ best: null, tied: [a, b] });
  });

  it("one shown line tied with an unshown one: it is the best, nothing is added", () => {
    const shownLine = line("shown", { value: -30.01 });
    const unshown = line("unshown", { value: -30 });
    const picked = pickRolloutBest([shownLine, unshown], 60);
    expect(picked.best).toBe(unshown);
    expect(rolloutTies(picked, [shownLine, unshown], [shownLine.plan])).toEqual({ best: shownLine, tied: [] });
    // Unshown lines tied among themselves only: the best one is added alone, as before.
    const other = line("other", { value: -30.02 });
    expect(rolloutTies(picked, [unshown, other, line("worse", { hpLoss: 14, value: -34 })], [])).toEqual({ best: unshown, tied: [] });
  });

  it("a clear best stays the best; a saturated board keeps its tie-break", () => {
    const best = line("best", { hpLoss: 8, value: -28 });
    const next = line("next", { hpLoss: 8.2, value: -28.2 });
    const picked = pickRolloutBest([best, next], 60);
    expect(rolloutTies(picked, [best, next], [best.plan, next.plan])).toEqual({ best, tied: [] });
    const dead = (name: string, left: number) => line(name, { hpLoss: 62, value: -102, deaths: 8, enemyHpLeft: left, turnsSurvived: 4 });
    const s1 = dead("s1", 120);
    const s2 = dead("s2", 150);
    const saturated = pickRolloutBest([s1, s2], 62);
    expect(saturated).toMatchObject({ best: s1, saturated: true });
    expect(rolloutTies(saturated, [s1, s2], [s1.plan, s2.plan])).toEqual({ best: s1, tied: [] });
  });
});

describe("tied options on Jev's question (a logged board, the rollout's tie forced)", () => {
  const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;

  it("both tagged rollout_tied naming the other, neither rollout_best, the log names them, choosing either counts as the best", () => {
    forceTie.on = true;
    potionMcOptions.now = () => 0;
    rolloutLiveOptions.budgetMs = 1e9;
    try {
      const decision = planCombatTurn(loggedEnv(logged("g8yy-f30-t3"), { jevContext: "v1" })) as AskDecision;
      expect(decision.kind).toBe("ask");
      for (const criteria of [decision.jevView!.questions["plan"]!.criteria!, decision.questions["plan"]!.criteria!] as Record<string, string>[]) {
        const facts = (key: string) => JSON.parse(criteria[key]!) as Record<string, unknown>;
        const keys = Object.keys(criteria).filter((key) => /^plan\d+$/.test(key));
        expect(keys.length).toBeGreaterThanOrEqual(3);
        expect(keys.filter((key) => facts(key)["rollout_best"] === true)).toEqual([]);
        expect(facts("plan1")["rollout_tied"]).toBe("tied for the best rollout numbers with plan2 (the same expected further HP loss and deaths); the rollout picks none of them");
        expect(facts("plan2")["rollout_tied"]).toMatch(/with plan1 \(/);
        expect(keys.filter((key) => facts(key)["rollout_tied"] !== undefined)).toEqual(["plan1", "plan2"]);
      }
      const log = (key: string) => decision.resolve(pick(key)).log!;
      expect(log("plan1").rollout).toMatchObject({ best: null, best_added: false, tied: ["plan1", "plan2"] });
      expect(log("plan1").rollout_best_chosen).toBe(true);
      expect(log("plan2").rollout_best_chosen).toBe(true);
      expect(log("plan3").rollout_best_chosen).toBe(false);
      expect(decision.resolve({} as AnswerSet).log?.rollout_best_chosen).toBeNull();
    } finally {
      forceTie.on = false;
      potionMcOptions.now = null;
      rolloutLiveOptions.budgetMs = 1500;
    }
  });
});

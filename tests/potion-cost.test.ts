/**
 * Potion cost (Dai 2026-09-30; src/strategy/potion-cost.ts): a potion drunk before the act boss is HP paid later, at
 * its held value in the potion table; 0 in a boss fight; deaths first, then the effective loss (HP + potions); a
 * "no potion this fight" line on every question with a potion to drink (not in a boss fight).
 * Fixed data only: the hand-written table tests/gkb-data/knowledge/potion-equivalents.json (A8/A9: Block Potion 7/8/9,
 * Fire Potion 5/4/4, Foul Potion held value 0, Poison Potion no value), hand-made solver inputs and logged boards.
 * Costs are off for the other test files (tests/setup-potion-cost.ts); this file switches them on.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadPotionEquivalents, potionWorthSource } from "../src/knowledge/potion-equivalents.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { hpGuardReplacement, planCombatTurn, potionCostContext } from "../src/screens/combat-plan.js";
import { modelPotion, type CardModel } from "../src/strategy/card-model.js";
import { potionCost, potionCostFact, potionCostFrom, potionCostOptions, potionCosts, withPotionCost } from "../src/strategy/potion-cost.js";
import { beatsDryLine, potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutDecision, type EnemyTable, type FightMeta, type LineEstimate, type RolloutInput } from "../src/strategy/rollout.js";
import { pickRolloutBest, rolloutLiveOptions, rolloutTies, sameShownResult } from "../src/strategy/rollout-live.js";
import { effectiveLoss, solveTap, solveTurn, weightsFor, type EnemySim, type Plan, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv } from "./logged.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const TABLE_DIR = join(HERE, "gkb-data", "knowledge");
const table = () => loadPotionEquivalents(TABLE_DIR);

beforeEach(() => {
  potionCostOptions.enabled = true;
  potionWorthSource.dir = TABLE_DIR;
});

afterEach(() => {
  potionCostOptions.enabled = false;
  potionWorthSource.dir = undefined;
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET;
  potionMcOptions.now = null;
  solveTap.onSolve = null;
});

const ROLLOUT_BUDGET = rolloutLiveOptions.budgetMs;

describe("potionCost(id, ascension, act, fightKind): the table's held value, only", () => {
  it("hallway and elite: the held value at this ascension and act (an elite is not discounted)", () => {
    expect(potionCostFrom(table(), "BLOCK_POTION", 8, 1, "monster").hp).toBe(7);
    expect(potionCostFrom(table(), "BLOCK_POTION", 8, 2, "monster").hp).toBe(8);
    expect(potionCostFrom(table(), "BLOCK_POTION", 9, 2, "elite").hp).toBe(10);
    expect(potionCostFrom(table(), "BLOCK_POTION", 9, 2, "elite").hp).toBe(potionCostFrom(table(), "BLOCK_POTION", 9, 2, "monster").hp);
    expect(potionCostFrom(table(), "FIRE_POTION", 9, 1, "unknown").hp).toBe(6);
    // An ascension the table does not have reads the nearest (A0 -> A8, A12 -> A9); an act past 3 is act 3.
    expect(potionCostFrom(table(), "FIRE_POTION", 0, 1, "monster").hp).toBe(5);
    expect(potionCostFrom(table(), "FIRE_POTION", 12, 1, "monster").hp).toBe(6);
    expect(potionCostFrom(table(), "BLOCK_POTION", 8, 4, "monster").hp).toBe(9);
    expect(potionCostFrom(table(), "BLOCK_POTION", 8, 2, "monster").source).toBe("A8 公式 n=20");
  });

  it("a boss fight costs 0", () => {
    const boss = potionCostFrom(table(), "BLOCK_POTION", 8, 2, "boss");
    expect(boss.hp).toBe(0);
    expect(boss.zero).toBe("boss");
    expect(boss.holdHp).toBe(8);
  });

  it("no conversion value: 0 and said so (not in the table, or no numbers for it); a held value of 0 is 0", () => {
    for (const id of ["POISON_POTION", "SOMEONE_ELSES_POTION"]) {
      const cost = potionCostFrom(table(), id, 8, 1, "monster");
      expect(cost.hp, id).toBe(0);
      expect(cost.zero, id).toBe("no_value");
    }
    expect(potionCostFrom(table(), "FOUL_POTION", 8, 1, "monster")).toMatchObject({ hp: 0, zero: "worthless" });
    expect(potionCostContext(potionCosts(["BLOCK_POTION", "POISON_POTION"], 8, 1, "monster"), "monster", false)["potion_cost_zero"]).toEqual(["毒药水: 0 (no conversion value in the potion table)"]);
  });

  it("no special case for a full belt or the cheapest potion: every held potion costs its value", () => {
    const costs = potionCosts(["BLOCK_POTION", "FIRE_POTION", "SWIFT_POTION"], 8, 1, "monster");
    expect([...costs.values()].map((cost) => cost.hp)).toEqual([7, 5, 4]);
  });

  it("reads the table Jev's facts read; switched off (POTION_COST=off) every cost is 0; a table that does not load costs 0", () => {
    expect(potionCost("BLOCK_POTION", 8, 1, "monster").hp).toBe(7);
    potionCostOptions.enabled = false;
    expect(potionCost("BLOCK_POTION", 8, 1, "monster")).toMatchObject({ hp: 0, zero: "off" });
    potionCostOptions.enabled = true;
    potionWorthSource.dir = join(HERE, "no-such-dir");
    expect(potionCost("BLOCK_POTION", 8, 1, "monster")).toMatchObject({ hp: 0, zero: "no_table" });
  });

  it("a potion card carries its cost; other cards and a 0 cost are untouched", () => {
    const costs = potionCosts(["BLOCK_POTION", "POISON_POTION"], 8, 1, "monster");
    expect(withPotionCost(modelPotion("BLOCK_POTION", "Block Potion", 0, [])!, costs).potionCost).toBe(7);
    const boss = potionCosts(["BLOCK_POTION"], 8, 1, "boss");
    expect("potionCost" in withPotionCost(modelPotion("BLOCK_POTION", "Block Potion", 0, [])!, boss)).toBe(false);
  });
});

/* ---- the solver ------------------------------------------------------------------------------------------ */

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
    draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...overrides,
  };
}
const strike = (i: number) => card(i, "STRIKE", { damage: 6 });
const defend = (i: number) => card(i, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 5 });
const blockPotion = (cost?: number): CardModel => ({ ...modelPotion("BLOCK_POTION", "Block Potion", 0, [])!, ...(cost ? { potionCost: cost } : {}) });
const drinks = (plan: Pick<Plan, "steps">) => plan.steps.some((step) => step.cardId.startsWith("POTION:"));
const key = (plan: Plan) => plan.steps.map((step) => `${step.cardId}@${step.target ?? "-"}`).join(">");

function solverInput(potion: CardModel, kind: SolverInput["fightKind"] = "monster", hp = 40): SolverInput {
  const player: PlayerSim = { hp, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
  const enemy: EnemySim = { index: 0, name: "Jaw Worm", hp: 44, maxHp: 44, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 11, hits: 1 }] };
  return { hand: [strike(0), strike(1), defend(2), potion], player, enemies: [enemy], fightKind: kind, turn: 1 };
}

describe("the solver: a line drinking a potion pays its cost at the HP weight", () => {
  it("the same line scores weights.hp x cost less, its outcome carries the cost; potion-free lines are unchanged", () => {
    const free = solveTurn(solverInput(blockPotion()));
    const costed = solveTurn(solverInput(blockPotion(7)));
    const hpWeight = weightsFor(solverInput(blockPotion(7))).hp;
    const byKey = new Map(free.plans.map((plan) => [key(plan), plan]));
    let compared = 0;
    for (const plan of costed.plans) {
      const before = byKey.get(key(plan));
      if (!before) continue;
      compared += 1;
      if (drinks(plan)) {
        expect(plan.outcome.potionCost).toBe(7);
        expect(plan.score).toBeCloseTo(before.score - hpWeight * 7, 6);
        expect(effectiveLoss(plan)).toBe(plan.outcome.hpLoss + 7);
      } else {
        expect(plan.score).toBe(before.score);
        expect("potionCost" in plan.outcome).toBe(false);
      }
    }
    expect(compared).toBeGreaterThan(3);
    expect(costed.plans.some(drinks)).toBe(true);
  });

  it("a boss fight (no cost on the card) scores exactly as before", () => {
    const costs = potionCosts(["BLOCK_POTION"], 8, 1, "boss");
    const input = solverInput(withPotionCost(modelPotion("BLOCK_POTION", "Block Potion", 0, [])!, costs), "boss");
    const before = solveTurn(solverInput(blockPotion(), "boss"));
    const after = solveTurn(input);
    expect(after.plans.map((plan) => [key(plan), plan.score])).toEqual(before.plans.map((plan) => [key(plan), plan.score]));
  });

  it("a drink that saves us from dying is still the line: death outweighs any cost", () => {
    const input = (cost?: number): SolverInput => ({ ...solverInput(blockPotion(cost), "monster", 8), hand: [strike(0), strike(1), strike(2), blockPotion(cost)] });
    const best = solveTurn(input(1000)).plans[0]!;
    expect(best.outcome.dies).toBe(false);
    expect(drinks(best)).toBe(true);
  });
});

/* ---- ranking: deaths, then the effective loss --------------------------------------------------------------- */

const line = (name: string, over: Partial<LineEstimate>): LineEstimate =>
  ({ plan: { steps: [], name, outcome: { hpLoss: 0 } } as unknown as Plan, value: -30, hpLoss: 10, potionCost: 0, laterDrinks: {}, wins: 8, deaths: 0, samples: 8, enemyHpLeft: 0, turnsSurvived: 5, leaderHpLeft: null, ...over }) as LineEstimate;

describe("the rollout's pick: fewest deaths first, then the effective loss (HP + potions at their cost)", () => {
  it("a cheaper dry line beats a drink whose saving is less than its cost", () => {
    const dry = line("dry", { hpLoss: 10, value: -10 });
    const drink = line("drink", { hpLoss: 6, potionCost: 7, value: -13 });
    expect(pickRolloutBest([drink, dry], 60).best).toBe(dry);
  });

  it("a drink that dies less often wins, whatever its cost (the value alone would pick the dry line)", () => {
    const dry = line("dry", { hpLoss: 12, deaths: 1, value: -20 });
    const drink = line("drink", { hpLoss: 14, potionCost: 12, deaths: 0, value: -26 });
    expect(pickRolloutBest([dry, drink], 60).best).toBe(drink);
    // Without a cost in play (a boss fight), the value decides as before.
    const bossDrink = line("drink", { hpLoss: 14, potionCost: 0, deaths: 0, value: -26 });
    expect(pickRolloutBest([dry, bossDrink], 60).best).toBe(dry);
  });

  it("equal effective loss and deaths read as tied", () => {
    const dry = line("dry", { hpLoss: 13, value: -13 });
    const drink = line("drink", { hpLoss: 6, potionCost: 7, value: -13 });
    expect(sameShownResult(dry, drink)).toBe(true);
    expect(sameShownResult(dry, line("x", { hpLoss: 6, potionCost: 0, value: -6 }))).toBe(false);
    const picked = pickRolloutBest([dry, drink], 60);
    expect(rolloutTies(picked, [dry, drink], [dry.plan, drink.plan])).toEqual({ best: null, tied: [dry, drink] });
  });

  it("boss: with no cost the ranking is the old one (value, then enemy HP left), deaths not moved first", () => {
    const a = line("a", { hpLoss: 10, deaths: 1, value: -15, enemyHpLeft: 30 });
    const b = line("b", { hpLoss: 20, deaths: 0, value: -20, enemyHpLeft: 10 });
    expect(pickRolloutBest([a, b], 60).best).toBe(a);
  });
});

/* ---- the rollout: later turns drink by the same cost; the no-potion line ---------------------------------- */

const META: FightMeta = { act: 1, t: 1, asc: 8, kind: "hallway", enc: "JAW_WORM", deck: { n: 10, atk: 5, skl: 4, pow: 1, junk: 0, dmg: 38, blk: 20, up: 0 }, relics: 1, max_en: 3 };
const TABLE: EnemyTable = {
  moves: { CHOMP: { damage: 11, hits: 1, strength: 0, block: 0 }, BELLOW: { damage: 0, hits: 1, strength: 3, block: 6 }, THRASH: { damage: 7, hits: 1, strength: 0, block: 5 } },
  next: { CHOMP: { BELLOW: 3, THRASH: 1 }, BELLOW: { THRASH: 2, CHOMP: 2 }, THRASH: { CHOMP: 1, BELLOW: 1 } },
};

function scenario(cost: number | undefined, noPotionOf?: (plans: Plan[]) => Plan): { input: RolloutInput; dry: Plan; copy: Plan | undefined } {
  const solver = { ...solverInput(blockPotion(cost), "monster", 60), enemies: [{ index: 0, name: "Jaw Worm", hp: 90, maxHp: 90, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 11, hits: 1 }] }] };
  const plans = solveTurn(solver).plans;
  const dry = plans.find((plan) => !drinks(plan))!;
  const copy = noPotionOf ? { ...noPotionOf(plans) } : undefined;
  const draw = [strike(10), strike(11), defend(12), defend(13), strike(14), defend(15), strike(16), defend(17)];
  let t = 0;
  return {
    dry,
    copy,
    input: {
      solver, plans, enemies: [{ index: 0, id: "JAW_WORM", move: "CHOMP", strength: 0, powers: {} }], tables: { JAW_WORM: TABLE },
      piles: { draw, discard: [], handBase: solver.hand }, meta: META, playerPowers: {}, potions: 1, mm: {}, model: null, gates: null,
      options: { budgetMs: 1e9, seed: 3, now: () => (t += 0.01), include: [dry], ...(copy ? { noPotionLine: copy } : {}) },
    },
  };
}

describe("rollout: the later turns drink by the same cost, and the value counts it", () => {
  it("free, the potion-free line's later turns drink the potion; at a high cost they never do", () => {
    const free = scenario(undefined);
    const freeDry = rolloutDecision(free.input).lines.find((entry) => entry.plan === free.dry)!;
    expect(Object.keys(freeDry.laterDrinks ?? {})).toEqual(["BLOCK_POTION"]);
    expect(freeDry.potionCost).toBe(0);
    const dear = scenario(1000);
    const dearDry = rolloutDecision(dear.input).lines.find((entry) => entry.plan === dear.dry)!;
    expect(dearDry.laterDrinks).toEqual({});
    expect(dearDry.potionCost).toBe(0);
  });

  it("a line's value has its drinks taken off (this turn's and the later turns' expected cost)", () => {
    const run = scenario(7);
    for (const entry of rolloutDecision(run.input).lines) {
      expect(entry.value).toBeCloseTo(-entry.hpLoss - (entry.potionCost ?? 0) - 40 * (1 - entry.winProb), 6);
      if (drinks(entry.plan)) expect(entry.potionCost).toBeGreaterThanOrEqual(7);
      const later = Object.values(entry.laterDrinks ?? {}).reduce((sum, n) => sum + n, 0);
      if (!drinks(entry.plan)) expect(entry.potionCost).toBeCloseTo((later / entry.samples) * 7, 6);
    }
  });

  it("the no-potion line: the same turn, no potion in any later turn, its own estimate", () => {
    const run = scenario(undefined, (plans) => plans.find((plan) => !drinks(plan))!);
    const lines = rolloutDecision(run.input).lines;
    const copy = lines.find((entry) => entry.plan === run.copy)!;
    expect(copy.noPotionFight).toBe(true);
    expect(copy.laterDrinks).toEqual({});
    expect(copy.potionCost).toBe(0);
    expect(copy.plan.steps).toEqual(run.dry.steps);
    // The base line (potions allowed later) drank in its later turns: they differ.
    expect(Object.keys(lines.find((entry) => entry.plan === run.dry)!.laterDrinks ?? {}).length).toBeGreaterThan(0);
  });
});

/* ---- Jev's question ---------------------------------------------------------------------------------------- */

const criteriaOf = (decision: Decision | null): Record<string, Record<string, unknown>> => {
  if (decision?.kind !== "ask") return {};
  const criteria = (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria!;
  return Object.fromEntries(Object.entries(criteria).map(([k, text]) => [k, JSON.parse(String(text)) as Record<string, unknown>]));
};

const plan = (name: string): Decision | null => {
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.budgetMs = 60_000;
  potionMcOptions.now = () => 0;
  return planCombatTurn(loggedEnv(logged(name), { jevContext: "v1" }));
};

describe("Jev's question: every option's potion cost, and the no-potion line", () => {
  it("hallway (N95W F19 T3, Block Potion 8 HP in act 2): every option states HP loss, potions, cost and total; one option is the no-potion line", () => {
    const decision = plan("n95w-f19-t3") as AskDecision;
    expect(decision.kind).toBe("ask");
    const criteria = criteriaOf(decision);
    const plans = Object.entries(criteria).filter(([k]) => /^plan\d+$/.test(k));
    for (const [k, facts] of plans) {
      expect(String(facts["potion_cost"]), k).toMatch(/^fight HP loss [\d.]+; potions used [\d.]+( \(.+\))?; potion cost [\d.]+ HP \(potion table, this act's held value(, later turns' drinks averaged over the samples)?\); total [\d.]+$/);
    }
    const drinking = plans.filter(([, facts]) => String(facts["plays"]).includes("potion "));
    expect(drinking.length).toBeGreaterThan(0);
    for (const [, facts] of drinking) expect(String(facts["potion_cost"])).toMatch(/this turn: 格挡药水 8 HP\); potion cost (8|[89]\.\d) HP/);
    const noPotion = plans.filter(([, facts]) => facts["no_potion_fight"] !== undefined);
    expect(noPotion.length).toBe(1);
    expect(String(noPotion[0]![1]["potion_cost"])).toMatch(/potions used 0; potion cost 0 HP/);
    // The no-potion line is the rollout's best here: the drink saves no HP it pays for (before: tied with it).
    expect(noPotion[0]![1]["rollout_best"]).toBe(true);
    const context = decision.state["potion_context"] as Record<string, unknown>;
    expect(String(context["potion_cost"])).toMatch(/HP paid later.*held value.*Ranked by deaths, then total\. Boss fights: 0\./);
    expect(JSON.stringify(context).length).toBeLessThan(900);
  }, 60_000);

  it("merged when the base line's own rollout drinks nothing later; its own option when it does (ETYC F19 T1: Blood Potion, no conversion value)", () => {
    const merged = criteriaOf(plan("n95w-f19-t3"));
    const tag = Object.values(merged).map((facts) => facts["no_potion_fight"]).filter(Boolean);
    expect(tag).toEqual(["the no-potion line: no potion this turn, and the rollout's later turns drink none either"]);
    const decision = plan("etyc-f19-t1-blood") as AskDecision;
    const own = criteriaOf(decision);
    const entries = Object.entries(own).filter(([, facts]) => facts["no_potion_fight"] !== undefined);
    expect(entries.length).toBe(1);
    const [ownKey, ownFacts] = entries[0]!;
    const base = /the same turn as (plan\d+)/.exec(String(ownFacts["no_potion_fight"]))?.[1];
    expect(base).toBeDefined();
    expect(own[base!]!["plays"]).toBe(ownFacts["plays"]);
    expect(ownKey).not.toBe(base);
    expect(String(ownFacts["rollout"])).toContain("(the no-potion line: its later turns drink no potion)");
    expect(String(own[base!]!["potion_cost"])).toMatch(/later turns: .+ in \d\/\d samples/);
    // A potion the table has no value for costs 0, said so on the question.
    expect((decision.state["potion_context"] as Record<string, unknown>)["potion_cost_zero"]).toEqual([expect.stringMatching(/: 0 \(no conversion value in the potion table\)$/)]);
  }, 90_000);

  it("rollout off: the base line is tagged, the fact says there is no rollout", () => {
    rolloutLiveOptions.enabled = false;
    const decision = planCombatTurn(loggedEnv(logged("n95w-f19-t3"), { jevContext: "v1" }));
    const criteria = criteriaOf(decision);
    const tagged = Object.values(criteria).filter((facts) => facts["no_potion_fight"] !== undefined);
    expect(tagged.map((facts) => facts["no_potion_fight"])).toEqual(["the no-potion line: no potion this turn (no rollout of the later turns)"]);
    expect(String(tagged[0]!["potion_cost"])).toMatch(/^this turn HP loss \(no rollout of the later turns\) [\d.]+; potions used 0; potion cost 0 HP/);
  }, 60_000);

  it("the switch off: the question is the one before the costs (no cost facts, no no-potion line)", () => {
    potionCostOptions.enabled = false;
    const criteria = criteriaOf(plan("n95w-f19-t3"));
    for (const facts of Object.values(criteria)) {
      expect(facts["potion_cost"]).toBeUndefined();
      expect(facts["no_potion_fight"]).toBeUndefined();
    }
  }, 60_000);
});

describe("a boss fight behaves as before (costs 0): the same options, scores and rollout pick", () => {
  it("RTF3 F17 T1 (Soul Fysh, Block Potion): costs on vs off", () => {
    const run = (on: boolean) => {
      potionCostOptions.enabled = on;
      const scores: number[][] = [];
      solveTap.onSolve = (_input, result) => scores.push(result.plans.map((entry) => entry.score));
      const decision = plan("rtf3-f17-t1-draw");
      solveTap.onSolve = null;
      return { decision, scores, criteria: criteriaOf(decision) };
    };
    const off = run(false);
    const on = run(true);
    expect(on.decision?.kind).toBe(off.decision?.kind);
    expect(on.scores).toEqual(off.scores);
    const view = (criteria: Record<string, Record<string, unknown>>) =>
      Object.fromEntries(Object.entries(criteria).map(([k, facts]) => [k, [facts["plays"], facts["rollout_best"] ?? null, facts["rollout_tied"] ?? null, facts["rollout"] ?? null]]));
    const strip = (criteria: Record<string, Record<string, unknown>>) => JSON.stringify(view(criteria)).replace(/ \(later turns may (use|drink) the potions still held[^)]*\)/g, "");
    expect(strip(on.criteria)).toEqual(strip(off.criteria));
    for (const facts of Object.values(on.criteria)) {
      expect(facts["no_potion_fight"]).toBeUndefined();
      if (facts["potion_cost"] !== undefined) expect(String(facts["potion_cost"])).toMatch(/potion cost 0 HP/);
    }
    if (on.decision?.kind === "ask") expect(String((on.decision.state["potion_context"] as Record<string, unknown>)["potion_cost"])).toMatch(/^boss fight: potions cost 0 here/);
  }, 120_000);
});

/* ---- the HP guard and the random potions use the same effective loss -------------------------------------- */

const outcomePlan = (hpLoss: number, potionCost = 0, drink = false): Plan =>
  ({ steps: drink ? [{ cardId: "POTION:BLOCK_POTION:0", name: "potion Block Potion", cardIndex: 100, target: null }] : [], score: 0, outcome: { hpLoss, winsFight: false, dies: false, damageDealt: 10, ...(potionCost > 0 ? { potionCost } : {}) } }) as unknown as Plan;

describe("the HP guard and the Monte Carlo compare HP lost plus the potions' cost", () => {
  it("HP guard: a drink line within the slack on HP but over it with its cost is replaced", () => {
    const dry = outcomePlan(10);
    const drink = outcomePlan(4, 12, true);
    // Slack 6: the drink's 4 HP is under 10 + 6, but 4 + 12 = 16 is not over it either; a 14 HP cost is.
    expect(hpGuardReplacement(drink, [drink, dry], 60, 6)).toBeNull();
    const dear = outcomePlan(4, 14, true);
    expect(hpGuardReplacement(dear, [dear, dry], 60, 6)).toBe(dry);
    // A dry line over the bound set by a costed drink line: the bound is the effective minimum.
    expect(hpGuardReplacement(outcomePlan(20), [outcomePlan(20), outcomePlan(4, 14, true)], 60, 6)).toBeNull();
  });

  it("Monte Carlo: a sample beats the potion-free line only by a margin after the potion's cost", () => {
    const dry = outcomePlan(10);
    expect(beatsDryLine(outcomePlan(6, 0, true), dry)).toBe(true);
    expect(beatsDryLine(outcomePlan(6, 3, true), dry)).toBe(false);
  });

  it("the fact without a rollout counts this turn's drinks at their cost", () => {
    const costs = potionCosts(["BLOCK_POTION"], 8, 2, "monster");
    expect(potionCostFact(outcomePlan(4, 8, true), null, costs)).toBe("this turn HP loss (no rollout of the later turns) 4; potions used 1 (this turn: 格挡药水 8 HP); potion cost 8 HP (potion table, this act's held value); total 12");
    const boss = potionCosts(["BLOCK_POTION"], 8, 2, "boss");
    expect(potionCostFact(outcomePlan(4, 0, true), { hpLoss: 9, potionCost: 0, laterDrinks: {}, samples: 8, horizon: 5 }, boss)).toBe("fight HP loss 9; potions used 1 (this turn: 格挡药水 0 (boss fight)); potion cost 0 HP (potion table, this act's held value); total 9");
  });
});

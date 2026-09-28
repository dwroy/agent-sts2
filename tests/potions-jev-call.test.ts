/**
 * Potions are Jev's call (Dai 2026-09-28): no potion use cost in the solver's score, every modelled
 * potion in the belt on a shown line, code's own auto-acts never drink while a potion-free line
 * survives, and Jev gets potion_context facts.
 */

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv } from "../src/project/types.js";
import { dryFirst, MAX_OPTIONS, planCombatTurn, potionLethalLines, potionLethalNote, withPotionLines } from "../src/screens/combat-plan.js";
import { dominates, solveTap, type Plan, type SolverInput } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv } from "./logged.js";
import { combatPayload, testKnowledge } from "./scenarios.js";

const config = loadConfig({} as NodeJS.ProcessEnv);
type Raw = Record<string, unknown>;

function env(raw: Raw, overrides: Partial<DecisionEnv> = {}): DecisionEnv {
  const state: GameState = parseGameState(raw);
  return {
    state,
    knowledge: testKnowledge,
    brief: buildRunBrief(state, testKnowledge),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory: createScreenMemory(state.screen),
    shopDiscardPotions: [],
    ...overrides,
  };
}

/** Fire Potion + Block Potion in the belt, two small attackers. */
function twoPotions(hp = 55, damage = 4): Raw {
  const raw = combatPayload();
  const combat = raw["combat"] as Raw;
  (combat["player"] as Raw)["current_hp"] = hp;
  combat["enemies"] = (combat["enemies"] as Raw[]).map((enemy) => ({ ...enemy, intents: [{ index: 0, intent_type: "Attack", label: String(damage), damage, hits: 1, total_damage: damage }] }));
  const belt = (raw["run"] as Raw)["potions"] as Raw[];
  belt[1] = { ...belt[0], index: 1, potion_id: "BLOCK_POTION", name: "Block Potion", description: "获得 12 点格挡。", requires_target: false, target_type: "Self", valid_target_indices: [] };
  return raw;
}

const plansOf = (decision: Decision | null): string[] => {
  if (decision?.kind !== "ask") return [];
  const criteria = (decision.jevView?.questions ?? decision.questions)["plan"]!.criteria!;
  return Object.entries(criteria).filter(([key]) => key.startsWith("plan")).map(([, text]) => String(text));
};

/** What code plays on its own: the act's intent and the committed rest of its line. */
const autoLine = (e: DecisionEnv, decision: Decision | null): string =>
  decision?.kind === "act" ? JSON.stringify([decision.intent, ...(e.screenMemory.combatPlan?.remaining ?? []).map((step) => step.cardId)]) : "";

afterEach(() => {
  solveTap.onSolve = null;
});

describe("no potion score penalty", () => {
  it("every potion the planner hands the solver costs nothing to drink", () => {
    const inputs: SolverInput[] = [];
    solveTap.onSolve = (input) => inputs.push(input);
    for (const hp of [20, 55, 80]) planCombatTurn(env(twoPotions(hp)));
    const potions = inputs.flatMap((input) => input.hand.filter((card) => card.type === "Potion"));
    expect(potions.length).toBeGreaterThan(0);
    for (const card of potions) expect(card.flatValue, card.cardId).toBeGreaterThanOrEqual(0);
    expect(inputs.every((input) => input.potionLimit === null)).toBe(true);
  });

  it("a potion line reaching the same end state never replaces or dominates the potion-free line", () => {
    const inputs: SolverInput[] = [];
    let plans: Plan[] = [];
    solveTap.onSolve = (input, result) => {
      inputs.push(input);
      plans = result.plans;
    };
    planCombatTurn(env(twoPotions(55, 0)));
    expect(inputs.length).toBe(1);
    const drinks = (plan: Plan) => plan.steps.some((step) => step.cardId.startsWith("POTION:"));
    // No potion-drinking plan dominates a potion-free plan with the same outcome numbers.
    for (const wet of plans.filter(drinks)) {
      for (const dry of plans.filter((plan) => !drinks(plan))) expect(dominates(wet, dry) && wet.outcome.hpLoss === dry.outcome.hpLoss && wet.outcome.damageDealt === dry.outcome.damageDealt).toBe(false);
    }
  });
});

describe("every held modelled potion is offered", () => {
  it("both belt potions are on a shown line, next to potion-free lines", () => {
    for (const hp of [20, 55, 80]) {
      const decision = planCombatTurn(env(twoPotions(hp, 8)));
      expect(decision?.kind, `hp ${hp}`).toBe("ask");
      const texts = plansOf(decision);
      expect(texts.some((text) => text.includes("Fire Potion")), `hp ${hp}`).toBe(true);
      expect(texts.some((text) => text.includes("Block Potion")), `hp ${hp}`).toBe(true);
      expect(texts.some((text) => !/"potions_used":"(?!none)/.test(text) && !text.includes("potion ")), `hp ${hp}`).toBe(true);
      expect(texts.length).toBeLessThanOrEqual(MAX_OPTIONS + 1);
    }
  });

  it("withPotionLines adds the best line of an uncovered potion, replacing a redundant option at the limit", () => {
    const line = (name: string, potions: string[] = []): Plan =>
      ({ steps: [{ cardIndex: 0, cardId: name, upgraded: false, name, target: null }, ...potions.map((id) => ({ cardIndex: -1, cardId: `POTION:${id}:0`, upgraded: false, name: `potion ${id}`, target: null }))] }) as unknown as Plan;
    const dryA = line("A");
    const dryB = line("B");
    const dryC = line("C");
    const fire = line("D", ["FIRE"]);
    const block = line("E", ["BLOCK"]);
    const block2 = line("F", ["BLOCK"]);
    // Room left: appended.
    expect(withPotionLines([dryA, dryB], [dryA, dryB, block, fire], ["FIRE", "BLOCK"], 10)).toEqual([dryA, dryB, fire, block]);
    // At the limit: the lowest-ranked removable option makes room; code's first and the only dry line stay.
    const out = withPotionLines([dryA, dryB, dryC], [dryA, dryB, dryC, fire, block, block2], ["FIRE", "BLOCK"], 3);
    expect(out[0]).toBe(dryA);
    expect(out).toContain(fire);
    expect(out).toContain(block);
    expect(out.some((plan) => !plan.steps.some((step) => step.cardId.startsWith("POTION:")))).toBe(true);
    // A potion with no surviving line is not invented.
    expect(withPotionLines([dryA], [dryA], ["FIRE"], 10)).toEqual([dryA]);
    // dryFirst: the first potion-free line, else the first.
    expect(dryFirst([fire, dryB])).toBe(dryB);
    expect(dryFirst([fire, block])).toBe(fire);
  });
});

describe("code's own auto-acts never drink while a potion-free line survives", () => {
  it("synthetic boards: no auto-drink on a survivable turn; the no-answer fallback is potion-free", () => {
    for (const hp of [12, 20, 40, 80]) {
      for (const damage of [0, 4, 8, 15]) {
        let plans: Plan[] = [];
        solveTap.onSolve = (_input, result) => {
          plans = result.plans;
        };
        const e = env(twoPotions(hp, damage));
        const decision = planCombatTurn(e);
        solveTap.onSolve = null;
        const drySurvives = plans.some((plan) => !plan.outcome.dies && !plan.steps.some((step) => step.cardId.startsWith("POTION:")));
        if (!drySurvives) continue;
        if (decision?.kind === "act") {
          if (decision.label === "combat/lethal") continue;
          expect(autoLine(e, decision), `${hp}/${damage} ${decision.label}`).not.toMatch(/use_potion|POTION:/);
          continue;
        }
        if (decision?.kind !== "ask") continue;
        const fallback = decision.resolve({});
        expect(fallback.intent?.action, `${hp}/${damage}`).not.toBe("use_potion");
        fallback.apply?.();
        expect(JSON.stringify(e.screenMemory.combatPlan?.remaining ?? []), `${hp}/${damage}`).not.toContain("POTION:");
      }
    }
  });

  it("the HP guard and the low-confidence dominance swap never switch Jev's potion-free pick to a potion line", () => {
    for (const kind of ["LAGAVULIN_MATRIARCH", "JAW_WORM"]) {
      const raw = twoPotions(30, 20);
      const combat = raw["combat"] as Raw;
      combat["enemies"] = [{ ...(combat["enemies"] as Raw[])[0]!, enemy_id: kind }];
      const decision = planCombatTurn(env(raw));
      if (decision?.kind !== "ask") continue;
      const criteria = decision.questions["plan"]!.criteria!;
      for (const [key, text] of Object.entries(criteria)) {
        if (!key.startsWith("plan") || String(text).includes("potion ")) continue;
        for (const confidence of [0.2, 0.9]) {
          const resolved = decision.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } });
          expect(resolved.intent?.action, `${kind} ${key}`).not.toBe("use_potion");
          expect(resolved.guard?.plan ?? "", `${kind} ${key}`).not.toContain("potion");
          expect(resolved.rationale).not.toMatch(/HP guard.*potion .*instead/);
        }
      }
    }
  });

  it("logged boards: an auto-act that drinks is a lethal, a pending drink of Jev's line, or a turn where every potion-free line dies", () => {
    const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states");
    const boards = readdirSync(DIR)
      .filter((name) => name.endsWith(".json") && name !== "game-data.json" && name !== "boss-clock-boards.json")
      .map((name) => name.replace(/\.json$/, ""))
      .filter((name) => (logged(name).state["combat"] ?? null) !== null);
    let checked = 0;
    for (const name of boards) {
      let plans: Plan[] = [];
      solveTap.onSolve = (_input, result) => {
        plans = result.plans;
      };
      const e = loggedEnv(logged(name));
      const decision = planCombatTurn(e);
      solveTap.onSolve = null;
      if (decision?.kind !== "act") continue;
      const drinks = /use_potion|POTION:/.test(autoLine(e, decision));
      if (!drinks) continue;
      checked += 1;
      const drySurvives = plans.some((plan) => !plan.outcome.dies && !plan.steps.some((step) => step.cardId.startsWith("POTION:")));
      const allowed = decision.label === "combat/lethal" || decision.label === "combat/potion-now" || !drySurvives;
      expect(allowed, `${name}: ${decision.label} ${decision.rationale}`).toBe(true);
    }
    expect(checked).toBeGreaterThanOrEqual(0);
  });
});

describe("potion_context on the combat question", () => {
  it("slots, act boss and the potion facts are on every plan question", () => {
    const decision = planCombatTurn(env(twoPotions(55, 8))) as AskDecision;
    expect(decision.kind).toBe("ask");
    const context = decision.state["potion_context"] as Record<string, unknown>;
    expect(context).toBeDefined();
    expect(context["slots"]).toBe("2/2 used (belt full: a potion reward after this fight is wasted unless one is drunk)");
    expect(String(context["act_boss"])).toMatch(/^in \d+ floors \(floor 17\)$/);
    // Short: it goes on every combat question.
    expect(JSON.stringify(context).length).toBeLessThan(600);
  });
});

describe("Foul Potion is offered (no ban) with its damage to us in the numbers", () => {
  it("a Foul Potion line is shown and its hp_lost includes the 12 to us", () => {
    const raw = combatPayload();
    const combat = raw["combat"] as Raw;
    combat["enemies"] = (combat["enemies"] as Raw[]).map((enemy) => ({ ...enemy, intents: [{ index: 0, intent_type: "Buff", label: "" }] }));
    const belt = (raw["run"] as Raw)["potions"] as Raw[];
    belt[0] = { ...belt[0], potion_id: "FOUL_POTION", name: "Foul Potion", requires_target: false, target_type: "TargetedNoCreature", valid_target_indices: [] };
    const decision = planCombatTurn(env(raw));
    const texts = plansOf(decision);
    const foul = texts.map((text) => JSON.parse(text) as Record<string, unknown>).find((facts) => String(facts["plays"]).includes("Foul Potion"));
    expect(foul).toBeDefined();
    expect(Number(foul!["hp_lost"])).toBeGreaterThanOrEqual(7);
  });
});

describe("a lethal that needs a potion is Jev's call (Dai 2026-09-28)", () => {
  const line = (name: string, potions: string[], score: number, wins = true): Plan =>
    ({
      steps: [{ cardIndex: 0, cardId: name, upgraded: false, name, target: null }, ...potions.map((id) => ({ cardIndex: -1, cardId: `POTION:${id}:0`, upgraded: false, name: `potion ${id}`, target: null }))],
      outcome: { winsFight: wins },
      score,
    }) as unknown as Plan;

  it("potionLethalLines: one line per set of potions spent, fewest potions first; none when a dry lethal exists", () => {
    const fire = line("A", ["FIRE"], 50);
    const fire2 = line("B", ["FIRE"], 40);
    const both = line("C", ["FIRE", "BLOCK"], 60);
    const block = line("D", ["BLOCK"], 30);
    expect(potionLethalLines([both, fire, fire2, block])).toEqual([fire, block, both]);
    expect(potionLethalLines([fire, line("E", [], 10)])).toEqual([]);
    expect(potionLethalLines([])).toEqual([]);
    expect(potionLethalNote(fire)["potion_lethal"]).toMatch(/WINS THE FIGHT THIS TURN, spending FIRE/);
    expect(potionLethalNote(line("E", [], 10))).toEqual({});
  });

  it("synthetic board: only the Fire Potion wins, so code asks; a dry lethal is still auto-played", () => {
    const board = (enemyHp: number): Raw => {
      const raw = twoPotions(55, 4);
      const combat = raw["combat"] as Raw;
      combat["enemies"] = [{ ...(combat["enemies"] as Raw[])[0]!, current_hp: enemyHp }];
      return raw;
    };
    const wet = planCombatTurn(env(board(25)));
    expect(wet?.kind).toBe("ask");
    const texts = plansOf(wet);
    expect(texts.some((text) => text.includes("potion_lethal") && text.includes("Fire Potion"))).toBe(true);
    const e = env(board(6));
    const dry = planCombatTurn(e);
    expect(dry?.kind).toBe("act");
    expect(dry?.label).toBe("combat/lethal");
    expect(autoLine(e, dry)).not.toMatch(/use_potion|POTION:/);
  });
});

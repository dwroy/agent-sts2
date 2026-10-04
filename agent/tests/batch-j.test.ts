/**
 * Fix batch J (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states/batch-j, out of the rollout-live / potion-mc sweeps), never the refreshing knowledge files.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { JEV_DATA_OVER_GUIDES, planCombatTurn } from "../src/screens/combat-plan.js";
import { DATA_OVER_GUIDES, DeepSeekClient, recoverRoute } from "../src/llm/deepseek.js";
import { parseGameState } from "../src/mod/schema.js";
import { modelPotion, type CardModel } from "../src/strategy/card-model.js";
import { ROLLOUT_BUDGET_MS, boardRolloutInput, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutDecision, type EnemyTable, type FightMeta, type RolloutInput } from "../src/strategy/rollout.js";
import { solveTap, solveTurn, turnOnlyDrink, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";
import { sendJson, startTestServer, type TestServer } from "./support.js";
import { knowledgeFile } from "../src/knowledge/files.js";

type Raw = Record<string, unknown>;

const KNOWLEDGE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "knowledge");

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index,
    key: `c${index}`,
    cardId,
    name: cardId,
    type: "Attack",
    upgraded: false,
    cost: 1,
    xCost: false,
    playable: true,
    target: "single",
    validTargets: [0],
    damage: null,
    hits: 1,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: false,
    special: null,
    known: true,
    flatValue: 0,
    heldPenalty: 0,
    text: "",
    ...overrides,
  };
}
const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, ...over });
const enemy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Dummy", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });
const META: FightMeta = { act: 1, t: 1, asc: 9, kind: "hallway", enc: "X", deck: { n: 10, atk: 0, skl: 10, pow: 0, junk: 0, dmg: 0, blk: 50, up: 0 }, relics: 1, max_en: 3 };
const strike = (i: number) => card(i, "STRIKE", { damage: 6, damageBase: 6 });
const idle = (i: number) => card(i, "NOTHING", { type: "Skill", cost: 0, target: "self", validTargets: [] });

/** One line's rollout (a fixed seed, no clock budget) over a deck of idle cards. */
function rolloutOne(solver: SolverInput, table: EnemyTable, extra: Partial<RolloutInput> = {}, draw: CardModel[] = Array.from({ length: 10 }, (_, i) => idle(10 + i))) {
  const plan = solveTurn(solver).plans.find((entry) => entry.steps.length === 0)!;
  let t = 0;
  return rolloutDecision({
    solver,
    plans: [plan],
    enemies: [{ index: 0, id: "X", move: "HIT", strength: 0, powers: {} }],
    tables: { X: table },
    piles: { draw, discard: [], handBase: solver.hand.map(() => null) },
    meta: META,
    playerPowers: {},
    potions: 0,
    mm: {},
    model: null,
    gates: null,
    options: { budgetMs: 1e9, seed: 1, horizon: 3, samples: 2, now: () => (t += 0.01) },
    ...extra,
  }).lines[0]!;
}

/** The plan options of a combat question, parsed. */
function planLines(decision: ReturnType<typeof planCombatTurn>): Raw[] {
  if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind}`);
  const question = decision.questions["plan"]!;
  return Object.values(question.type === "choice" ? question.criteria : {}).map((text) => JSON.parse(String(text)) as Raw);
}

describe("1. Dai 2026-09-29: \"攻略或手册和经验库、实测数据冲突时，以数据为准\" in DeepSeek's system prompt and Jev's combat question", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("DeepSeek: in the fixed part of the system prompt, ahead of the guide and handbook, the same bytes on every client", () => {
    expect(DATA_OVER_GUIDES).toMatch(/guide or the handbook conflicts with the experience base .* measured data .* go with the data/);
    const make = () => new DeepSeekClient({ apiKey: "k", baseUrl: "http://127.0.0.1:9", model: "m", timeoutMs: 1000, guideFile: knowledgeFile(KNOWLEDGE, "ironclad-guide.md"), handbookFile: knowledgeFile(KNOWLEDGE, "ds-handbook.md") });
    const prompt = make().systemPrompt;
    expect(prompt.split(DATA_OVER_GUIDES).length - 1).toBe(1);
    expect(prompt.indexOf(DATA_OVER_GUIDES)).toBeLessThan(prompt.indexOf("# Ironclad strategy guide"));
    expect(make().systemPrompt).toBe(prompt);
    // Without guide files the rule is still there (it is not part of the guide text).
    expect(new DeepSeekClient({ apiKey: "k", baseUrl: "http://127.0.0.1:9", model: "m", timeoutMs: 1000 }).systemPrompt).toContain(DATA_OVER_GUIDES);
  });

  it("Jev: the combat plan question carries it ahead of the advice (plain state and the v1 view)", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    expect(JEV_DATA_OVER_GUIDES).toMatch(/conflicts with the experience base .* measured data .* go with the data/);
    const decision = planCombatTurn(loggedEnv(logged("batch-j/ulqp-f6-t2-glowwater"), { jevContext: "v1" }));
    if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind}`);
    expect(decision.state["knowledge_rule"]).toBe(JEV_DATA_OVER_GUIDES);
    expect(decision.jevView?.state["knowledge_rule"]).toBe(JEV_DATA_OVER_GUIDES);
    const keys = Object.keys(decision.state);
    expect(keys.indexOf("knowledge_rule")).toBeLessThan(keys.indexOf("deepseek_plan") < 0 ? Infinity : keys.indexOf("deepseek_plan"));
  });
});
describe("2. Draw and discard piles both empty (Glowwater drew the whole deck): the rollout still runs (ULQPBK1211FG F6 T2: \"no draw/discard piles in the state\", Jev 0.18)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("the logged board (9 cards in hand, both piles empty): every line has rollout numbers", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const fx = logged("batch-j/ulqp-f6-t2-glowwater");
    const view = (fx.state["agent_view"] as Raw)["combat"] as Raw;
    expect(view["draw"]).toEqual([]);
    expect(view["discard"]).toEqual([]);
    const lines = planLines(planCombatTurn(loggedEnv(fx)));
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(String(line["rollout"])).not.toMatch(/unavailable/);
      expect(String(line["rollout"])).toMatch(/-turn rollout .*expected further HP loss/);
    }
  });
});

describe("3. Shuriken (+1 Strength per 3 Attacks in a turn) and Captain's Wheel (18 block at the start of turn 3) in the solver and the rollout (DHGT6Z3Q7VAP F33)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
    solveTap.onSolve = null;
  });

  it("solver, Shuriken: the 3rd Attack of the turn gives 1 Strength to the Attacks after it (and the fight); the count goes on from the Attacks already played", () => {
    const hand = [strike(0), strike(1), strike(2), strike(3)];
    const all = (shuriken?: PlayerSim["shuriken"]) => solveTurn({ hand, player: player({ energy: 4, ...(shuriken ? { shuriken } : {}) }), enemies: [enemy()], fightKind: "monster", turn: 1 }).plans.find((plan) => plan.steps.length === 4)!.outcome;
    expect(all().damageDealt).toBe(24);
    expect(all().strengthGained).toBe(0);
    // 6 + 6 + 6, then 7.
    expect(all({ every: 3, strength: 1, count: 0 })).toMatchObject({ damageDealt: 25, strengthGained: 1 });
    // Two Attacks already played this turn: the first Strike is the 3rd (6, then 7 + 7 + 7), the last the 6th.
    expect(all({ every: 3, strength: 1, count: 2 })).toMatchObject({ damageDealt: 27, strengthGained: 2 });
  });

  it("rollout, Shuriken: each later turn counts again from 0 (3 Strikes a turn: +1 a turn, never from the last turn's leftovers)", () => {
    const HIT: EnemyTable = { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const strikes = Array.from({ length: 15 }, (_, i) => strike(10 + i));
    const solver = (shuriken?: PlayerSim["shuriken"]): SolverInput => ({ hand: [], player: player({ energy: 3, ...(shuriken ? { shuriken } : {}) }), enemies: [enemy({ hp: 500, maxHp: 500 })], fightKind: "monster", turn: 1 });
    const plain = rolloutOne(solver(), HIT, {}, strikes);
    // Count 2 at the decision (no Attack played in the line): the later turns start at 0 again.
    const shur = rolloutOne(solver({ every: 3, strength: 1, count: 2 }), HIT, {}, strikes);
    expect(plain.perTurn.map((turn) => turn.dmg.mean)).toEqual([18, 18]);
    // Turn 2: 6 + 6 + 6 (+1 after); turn 3: 7 + 7 + 7.
    expect(shur.perTurn.map((turn) => turn.dmg.mean)).toEqual([18, 21]);
  });

  it("rollout, Captain's Wheel: 18 block at the start of fight turn 3 only (a decision on turn 2: the next turn's hit of 12 is blocked, the one after is not)", () => {
    const HIT: EnemyTable = { moves: { HIT: { damage: 12, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const solver: SolverInput = { hand: [], player: player({ hp: 60, energy: 3 }), enemies: [enemy({ hp: 500, maxHp: 500, attacks: [{ damage: 12, hits: 1 }] })], fightKind: "monster", turn: 2 };
    const without = rolloutOne(solver, HIT);
    const wheel = rolloutOne(solver, HIT, { relicBlock: [{ amount: 18, turn: 3 }] });
    expect(without.perTurn.map((turn) => turn.loss.mean)).toEqual([12, 12]);
    expect(wheel.perTurn.map((turn) => turn.loss.mean)).toEqual([0, 12]);
    // Already past turn 3: nothing.
    expect(rolloutOne({ ...solver, turn: 3 }, HIT, { relicBlock: [{ amount: 18, turn: 3 }] }).perTurn.map((turn) => turn.loss.mean)).toEqual([12, 12]);
  });

  it("the logged F33 T1 board (7 energy, 6 Attacks): Shuriken reaches the solver, and the logged six Attacks deal 112 as they did (96 shown then)", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const inputs: SolverInput[] = [];
    solveTap.onSolve = (input) => inputs.push(input);
    // The solver input is what is checked: no rollouts (a 7-energy board).
    const enabled = rolloutLiveOptions.enabled;
    rolloutLiveOptions.enabled = false;
    try {
      planCombatTurn(loggedEnv(logged("batch-j/dhgt-f33-t1-shuriken")));
    } finally {
      rolloutLiveOptions.enabled = enabled;
    }
    const input = inputs[0]!;
    expect(input.player.shuriken).toEqual({ every: 3, strength: 1, count: 0 });
    // Uppercut+, Unrelenting, Bash+, Sword Boomerang, Sword Boomerang+, Dismantle; no potion (the Ampoule's 20 apart:
    // 219 -> 137 and 209 -> 159 is 132 with it).
    const LOGGED = "UPPERCUT+>0,UNRELENTING>0,BASH+>1,SWORD_BOOMERANG>null,SWORD_BOOMERANG+>null,DISMANTLE>0";
    // The six cards only (the Strike and the Ampoule out: a smaller search).
    const hand = input.hand.filter((entry) => entry.cardId !== "STRIKE_IRONCLAD" && entry.type !== "Potion");
    expect(hand).toHaveLength(6);
    const six = (player: PlayerSim) =>
      solveTurn({ ...input, hand, player }).plans.find((plan) => plan.steps.map((step) => `${step.cardId}${step.upgraded ? "+" : ""}>${step.target}`).join(",") === LOGGED)!.outcome;
    const { shuriken: _s, ...without } = input.player;
    expect(six(without)).toMatchObject({ damageDealt: 96, strengthGained: 0 });
    expect(six(input.player)).toMatchObject({ damageDealt: 112, strengthGained: 2 });
  }, 60_000);

  it("the logged F33 T2 board: the Wheel reaches the rollout, and the next turn (fight turn 3) loses less with it", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const fx = logged("batch-j/dhgt-f33-t2-wheel");
    const inputs: SolverInput[] = [];
    solveTap.onSolve = (input) => inputs.push(input);
    planCombatTurn(loggedEnv(fx));
    solveTap.onSolve = null;
    expect(boardRolloutInput(parseGameState(fx.state), loggedKnowledge, inputs[0]!, 9).relicBlock).toEqual([{ amount: 18, turn: 3 }]);
    // By the line's plays (the rollout's best line, added when code did not show it, can differ with and without).
    const nextTurnLoss = (state: Raw) =>
      new Map(planLines(planCombatTurn(loggedEnv({ ...fx, state }))).filter((line) => typeof line["rollout_turns"] === "string").map((line) => [String(line["plays"]), Number(/; T2: hp -([\d.]+)/.exec(String(line["rollout_turns"]))![1])]));
    const run = fx.state["run"] as Raw;
    const noWheel = { ...fx.state, run: { ...run, relics: (run["relics"] as Raw[]).filter((relic) => relic["relic_id"] !== "CAPTAINS_WHEEL") } };
    const withWheel = nextTurnLoss(fx.state);
    const without = nextTurnLoss(noWheel);
    const both = [...withWheel.keys()].filter((plays) => without.has(plays));
    expect(both.length).toBeGreaterThan(2);
    for (const plays of both) expect(withWheel.get(plays), plays).toBeLessThan(without.get(plays)!);
  }, 60_000);
});

describe("4a. Stable Serum: the hand is kept at this turn's end and the next (RETAIN_HAND_POWER 2), in the rollout (66 questions: \"effect not simulated\"; DHGT6Z3Q7VAP F22, F33)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("modelled: a lasting drink with nothing this turn", () => {
    const serum = modelPotion("STABLE_SERUM", "稳定血清", 0, []);
    expect(serum).not.toBeNull();
    expect(serum!.special).toBe("retain_hand");
    expect(turnOnlyDrink(serum!)).toBe(false);
  });

  it("rollout: three Strikes held with no energy left come back on the next two turns (and are played), over a deck of idle cards", () => {
    const HIT: EnemyTable = { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const serum = modelPotion("STABLE_SERUM", "稳定血清", 0, [])!;
    const solver: SolverInput = { hand: [strike(0), strike(1), strike(2), serum], player: player({ energy: 0 }), enemies: [enemy({ hp: 500, maxHp: 500 })], fightKind: "monster", turn: 1 };
    const plans = solveTurn(solver).plans;
    const drink = plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId.startsWith("POTION:STABLE_SERUM"))!;
    const dry = plans.find((plan) => plan.steps.length === 0)!;
    expect(drink.outcome.lastingDrinks).toBe(1);
    const run = (plan: typeof drink) => {
      let t = 0;
      return rolloutDecision({
        solver,
        plans: [plan],
        enemies: [{ index: 0, id: "X", move: "HIT", strength: 0, powers: {} }],
        tables: { X: HIT },
        piles: { draw: Array.from({ length: 20 }, (_, i) => idle(10 + i)), discard: [], handBase: solver.hand.map(() => null) },
        meta: META,
        playerPowers: {},
        potions: 1,
        mm: {},
        model: null,
        gates: null,
        options: { budgetMs: 1e9, seed: 1, horizon: 3, samples: 2, now: () => (t += 0.01) },
      }).lines[0]!;
    };
    // Without it the Strikes go to the discard pile under 20 idle cards: turns 2 and 3 deal nothing.
    expect(run(dry).perTurn.map((turn) => turn.dmg.mean)).toEqual([0, 0]);
    // With it: turn 2 starts with the three Strikes (3 energy: 18).
    expect(run(drink).perTurn[0]!.dmg.mean).toBe(18);
  });

  it("the logged F22 T2 board: the Serum is a simulated line with rollout numbers, not \"effect not simulated\"", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const lines = planLines(planCombatTurn(loggedEnv(logged("batch-j/dhgt-f22-t2-serum"))));
    expect(lines.some((line) => /稳定血清/.test(String(line["plays"])) && /not simulated/.test(String(line["plays"])))).toBe(false);
    const serum = lines.filter((line) => /稳定血清/.test(String(line["plays"])));
    expect(serum.length).toBeGreaterThan(0);
    for (const line of serum) expect(String(line["rollout"])).toMatch(/-turn rollout .*expected further HP loss/);
  });
});

describe("4b. Entropic Brew (混沌药水): its option says what it does, random potions into its own slot and every empty one (22 questions \"effect not simulated\", CJ88575SQS6H, VSRG9P80R1ZB)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("the logged F17 T3 board (Brew and one empty slot): \"2 random potions\", re-planned with them; no \"effect not simulated\"", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const lines = planLines(planCombatTurn(loggedEnv(logged("batch-j/cj88-f17-t3-brew"))));
    const brew = lines.filter((line) => /混沌药水/.test(String(line["plays"])));
    expect(brew).toHaveLength(1);
    expect(String(brew[0]!["plays"])).toContain("(2 random potions: its own slot and the 1 empty one), then re-plan the turn with them");
    expect(String(brew[0]!["plays"])).not.toContain("not simulated");
    expect(String(brew[0]!["rollout"])).toMatch(/^not rolled out: the potions it gives are random/);
  });
});

describe("4c. Draw potions (Distilled Chaos, Glowwater, Gambler's Brew) when the piles are unknown or both empty: modelled, not \"effect not simulated\"", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  const ctx = { enemyTargets: [0], strength: 0, weak: false };

  it("modelPotion: both piles empty is a potion that draws nothing (Gambler's Brew: no change); no context at all is still null", () => {
    for (const id of ["DISTILLED_CHAOS", "GLOWWATER_POTION"]) {
      const potion = modelPotion(id, id, 0, [], { ...ctx, pilesEmpty: true });
      expect(potion, id).not.toBeNull();
      expect(potion!.generates, id).toBeUndefined();
    }
    expect(modelPotion("GAMBLERS_BREW", "GAMBLERS_BREW", 0, [], { ...ctx, pilesEmpty: true })).toMatchObject({ special: null });
    expect(modelPotion("GLOWWATER_POTION", "GLOWWATER_POTION", 0, [])).toBeNull();
    // Glowwater with nothing to draw: the hand is exhausted and nothing comes back.
    const glow = { ...modelPotion("GLOWWATER_POTION", "发光水", 0, [], { ...ctx, pilesEmpty: true })!, cost: 0 };
    const input: SolverInput = { hand: [strike(0), glow], player: player({ energy: 1, drawable: 0 }), enemies: [enemy()], fightKind: "monster", turn: 1 };
    const drink = solveTurn(input).plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId.startsWith("POTION:"))!;
    expect(drink.outcome.damageDealt).toBe(0);
  });

  /** The ULQP F6 T2 board (both piles empty) with a draw potion in the first slot. */
  const withPotion = (potionId: string, name: string, dropPiles = false) => {
    const fx = logged("batch-j/ulqp-f6-t2-glowwater");
    const run = fx.state["run"] as Raw;
    const slots = run["potions"] as Raw[];
    slots[0] = { ...slots[0], potion_id: potionId, name, description: "", occupied: true, usage: "CombatOnly", target_type: "AnyPlayer", can_use: true, can_discard: true };
    if (dropPiles) {
      const view = (fx.state["agent_view"] as Raw)["combat"] as Raw;
      delete view["draw"];
      delete view["discard"];
    }
    return fx;
  };

  it("the logged board with both piles empty: Distilled Chaos and Glowwater are lines of the solve (no \"not simulated\")", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    for (const [id, name] of [["DISTILLED_CHAOS", "蒸馏混沌"], ["GLOWWATER_POTION", "发光水"]] as const) {
      const inputs: SolverInput[] = [];
      solveTap.onSolve = (input) => inputs.push(input);
      try {
        const lines = planLines(planCombatTurn(loggedEnv(withPotion(id, name))));
        expect(lines.some((line) => String(line["plays"]).includes(name) && /not simulated/.test(String(line["plays"]))), id).toBe(false);
      } finally {
        solveTap.onSolve = null;
      }
      expect(inputs[0]!.hand.some((card) => card.cardId.startsWith(`POTION:${id}`)), id).toBe(true);
    }
  });

  it("the logged board with no piles in the state: Glowwater is priced by the deck's expected card (a line of the solve)", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const inputs: SolverInput[] = [];
    solveTap.onSolve = (input) => inputs.push(input);
    try {
      const lines = planLines(planCombatTurn(loggedEnv(withPotion("GLOWWATER_POTION", "发光水", true))));
      expect(lines.some((line) => /not simulated/.test(String(line["plays"])))).toBe(false);
    } finally {
      solveTap.onSolve = null;
    }
    const glow = inputs[0]!.hand.find((card) => card.cardId.startsWith("POTION:GLOWWATER_POTION"))!;
    expect(glow.generates).toBeDefined();
    expect(glow.generates!.name).toBe("an average draw");
  });
});

describe("5. Retaliation (Thorns, Flame Barrier) into Slippery (1 per hit, a stack each) and Hardened Shell (its cap on the enemy turn) (W6F4YXF3MT7A F17 Vantom, TQCZFBK7T09Y F11 Skulking Colony)", () => {
  const retaliatedOn = (over: Partial<EnemySim>, retaliate: number, hits: number) => {
    const input: SolverInput = { hand: [], player: player({ energy: 0, hp: 80, retaliate }), enemies: [enemy({ attacks: [{ damage: 4, hits }], ...over })], fightKind: "monster", turn: 1 };
    return solveTurn(input).plans.find((plan) => plan.steps.length === 0)!.outcome.retaliated;
  };

  it("solver, Slippery 2: three hits of Thorns 3 take 1 + 1 + 3 (and two stacks); without it 9", () => {
    expect(retaliatedOn({}, 3, 3)).toEqual([{ index: 0, amount: 9 }]);
    expect(retaliatedOn({ slippery: 2 }, 3, 3)).toEqual([{ index: 0, amount: 5, slipperyUsed: 2 }]);
    expect(retaliatedOn({ slippery: 5 }, 3, 3)).toEqual([{ index: 0, amount: 3, slipperyUsed: 3 }]);
  });

  it("solver, Hardened Shell 20: Flame Barrier 10 on three hits takes 20, not 30 (a fresh cap on the enemy turn)", () => {
    expect(retaliatedOn({ hpLossCap: 20 }, 10, 3)).toEqual([{ index: 0, amount: 20 }]);
    expect(retaliatedOn({ hpLossCap: 20 }, 3, 3)).toEqual([{ index: 0, amount: 9 }]);
  });

  it("rollout: the stacks retaliation takes are gone on the later turns (Thorns 3, one hit a turn, Slippery 2: 1 + 1 + 3 + 3)", () => {
    const HIT: EnemyTable = { moves: { HIT: { damage: 4, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const solver: SolverInput = { hand: [], player: player({ energy: 0, hp: 80, retaliate: 3 }), enemies: [enemy({ hp: 100, maxHp: 100, slippery: 2, attacks: [{ damage: 4, hits: 1 }] })], fightKind: "monster", turn: 1 };
    const plan = solveTurn(solver).plans.find((entry) => entry.steps.length === 0)!;
    let t = 0;
    const line = rolloutDecision({
      solver,
      plans: [plan],
      enemies: [{ index: 0, id: "X", move: "HIT", strength: 0, powers: { SLIPPERY_POWER: 2 } }],
      tables: { X: HIT },
      piles: { draw: Array.from({ length: 20 }, (_, i) => idle(10 + i)), discard: [], handBase: [] },
      meta: META,
      playerPowers: { THORNS_POWER: 3 },
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 1, horizon: 4, samples: 2, now: () => (t += 0.01) },
    }).lines[0]!;
    expect(line.enemyHpLeft).toBe(100 - (1 + 1 + 3 + 3));
  });
});

describe("6. A route review answered without \"route\": taken from the reasoning, and the system prompt's reply format names the extra fields (DHGT6Z3Q7VAP F9 rest/plan, F23 reward/card: \"the answer has no route\")", () => {
  let server: TestServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });

  // The logged reasoning tails (deepseek-reasoning.jsonl 12:53:57 and 13:03:58) and the F23 reason.
  const F9 = "If we heal to 59 now: elite at F12 ~84/86, boss ~80/86. Much safer.\n\nDecision: HEAL (o0). Route: keep.\n\nReason: 40% HP, two elites + boss ahead; plan assumes this heal; smith won't close the 14/turn damage gap.\n\nRoute_reason: keep plan, heal restores route viability.\n\nLet me write JSON.";
  const F23 = "I lean Headbutt+ for the damage and utility, given code's ranking and the damage gap. Final: card0, keep route.";
  const KEYS = ["keep", "p1", "p2"];

  it("recoverRoute: the last route the text settles on, a key of the question's routes", () => {
    expect(recoverRoute([F9], KEYS)).toEqual({ route: "keep", line: "Decision: HEAL (o0). Route: keep." });
    expect(recoverRoute([F23], KEYS)?.route).toBe("keep");
    expect(recoverRoute(["", "Headbutt+ adds needed 12 dmg; block can come later. Keep safe route."], KEYS)?.route).toBe("keep");
    expect(recoverRoute(['keep route for now... no: switch the route to p2, the elite while HP is up. {"route": "p2"}'], KEYS)?.route).toBe("p2");
    expect(recoverRoute(["Route: p9 would be nice"], KEYS)).toBeNull();
    expect(recoverRoute(["Decision: o0."], KEYS)).toBeNull();
    expect(recoverRoute([F9], [])).toBeNull();
  });

  it("DeepSeekClient.choose: the reply {choice, reason} with a route review in the state gets the reasoning's route (marked recovered); the system prompt asks for the extra fields", async () => {
    server = await startTestServer((req, res) => {
      req.on("data", () => undefined);
      req.on("end", () =>
        sendJson(res, 200, { choices: [{ message: { content: '{"choice": "o0", "reason": "40% HP with two elites and the Giant ahead"}', reasoning_content: F9 } }], usage: { prompt_tokens: 900, completion_tokens: 200 } }),
      );
    });
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000, reasoningEffort: "max" });
    expect(client.systemPrompt).toContain('plus every other field the question asks for (such as "route" and "route_reason" when it has a route review');
    const state = { route_review: { routes: { keep: { path: "Elite -> Boss" }, p1: { path: "Shop -> Boss" } } } };
    const answer = await client.choose(state, "Rest?", { o0: '{"option":"休息"}', "o1:c0": '{"option":"锻造"}' }, { label: "rest/plan" });
    expect(answer).toMatchObject({ choice: "o0", route: "keep", routeReason: 'recovered from the reasoning: "Decision: HEAL (o0). Route: keep."' });
    // No route block in the state: nothing is added.
    const plain = await client.choose({}, "Rest?", { o0: '{"option":"休息"}', "o1:c0": '{"option":"锻造"}' }, { label: "rest/plan" });
    expect(plain.route).toBeUndefined();
  });
});

describe("8. Self-Forming Clay in the rollout's later turns: the HP lost at a turn's start (Crimson Mantle, Inferno) gives block at the next (2VW5U020FUTV F17: SELF_FORMING_CLAY_POWER 3 at every turn start with the Mantle up)", () => {
  it("Mantle 7, Clay, 12 a turn: turn 3 starts with 7 + 3 (the turn-2 hit) + 3 (turn 2's Mantle loss) = 13 block and loses only the Mantle's 1", () => {
    const HIT: EnemyTable = { moves: { HIT: { damage: 12, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const solver: SolverInput = { hand: [], player: player({ hp: 60, energy: 3, clayBlock: 3, startTurnHpLoss: 1 }), enemies: [enemy({ hp: 500, maxHp: 500, attacks: [{ damage: 12, hits: 1 }] })], fightKind: "monster", turn: 1 };
    const plan = solveTurn(solver).plans.find((entry) => entry.steps.length === 0)!;
    let t = 0;
    const line = rolloutDecision({
      solver,
      plans: [plan],
      enemies: [{ index: 0, id: "X", move: "HIT", strength: 0, powers: {} }],
      tables: { X: HIT },
      piles: { draw: Array.from({ length: 20 }, (_, i) => idle(10 + i)), discard: [], handBase: [] },
      meta: META,
      playerPowers: { CRIMSON_MANTLE_POWER: 7 },
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 1, horizon: 3, samples: 2, now: () => (t += 0.01) },
    }).lines[0]!;
    // Turn 2: 7 + 3 block against 12 (2 lost) and the Mantle's 1 at turn 3's start; turn 3: 13 block, only the Mantle's 1.
    expect(line.perTurn.map((turn) => turn.loss.mean)).toEqual([3, 1]);
  });
});

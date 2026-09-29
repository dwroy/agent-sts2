/**
 * Fix batch I (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states/batch-i, out of the rollout-live / potion-mc sweeps), never the refreshing knowledge files.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { planCombatTurn } from "../src/screens/combat-plan.js";
import { noteScreenChange } from "../src/loop.js";
import { parseGameState } from "../src/mod/schema.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { planReward } from "../src/screens/reward.js";
import { annotatePlating } from "../src/knowledge/enchant-text.js";
import { fillPotionText } from "../src/knowledge/potion-values.js";
import { modelPotion, type CardModel } from "../src/strategy/card-model.js";
import { ROLLOUT_BUDGET_MS, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { solveTap, solveTurn, turnOnlyDrink, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import { rolloutDecision, type EnemyTable, type FightMeta } from "../src/strategy/rollout.js";
import { logged, loggedEnv } from "./logged.js";
import { DeepSeekClient } from "../src/llm/deepseek.js";
import { fillGuideFacts, giantKillRecord, setUnblockedSharesForTests, type GiantKillRow } from "../src/strategy/boss-clock.js";
import { ask, decide, env as oneshotEnv } from "./oneshot-support.js";
import { parseShopPlan } from "../src/screens/shop.js";
import { DISCARD_ANSWER_NOTE } from "../src/screens/potion-discard.js";

type Raw = Record<string, unknown>;

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

describe("1. Liquid Bronze: Thorns 3 for the rest of the fight, in the solver and the rollout (VTREB5A9XWS7 F19-F33, V6TW9MJ385P2: \"effect not simulated\")", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("modelled: Thorns 3, a lasting drink (never \"no effect\")", () => {
    const bronze = modelPotion("LIQUID_BRONZE", "流动铜液", 0, [], 0);
    expect(bronze).not.toBeNull();
    expect(bronze!.thorns).toBe(3);
    expect(turnOnlyDrink(bronze!)).toBe(false);
  });

  it("solver: the drink deals 3 back per enemy hit this turn (the outcome says to whom)", () => {
    const bronze = modelPotion("LIQUID_BRONZE", "流动铜液", 0, [], 0)!;
    const input: SolverInput = { hand: [bronze], player: player({ energy: 0 }), enemies: [enemy({ hp: 50, maxHp: 50, attacks: [{ damage: 4, hits: 3 }] })], fightKind: "monster", turn: 1 };
    const plans = solveTurn(input).plans;
    const drink = plans.find((plan) => plan.steps.length === 1)!;
    const dry = plans.find((plan) => plan.steps.length === 0)!;
    expect(drink.outcome.retaliated).toEqual([{ index: 0, amount: 9 }]);
    expect(dry.outcome.retaliated).toBeUndefined();
    expect(drink.score).toBeGreaterThan(dry.score);
  });

  it("rollout: the Thorns stay up on the later turns and wear the attacker down (3 hits of 4 a turn into 30 HP)", () => {
    const HIT: EnemyTable = { moves: { HIT: { damage: 4, hits: 3, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const defend = (i: number) => card(i, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 12, damage: null });
    const bronze = modelPotion("LIQUID_BRONZE", "流动铜液", 0, [], 0)!;
    const solver: SolverInput = { hand: [bronze], player: player({ energy: 0, hp: 80 }), enemies: [enemy({ hp: 30, maxHp: 30, attacks: [{ damage: 4, hits: 3 }] })], fightKind: "monster", turn: 1 };
    const plans = solveTurn(solver).plans;
    const drink = plans.find((plan) => plan.steps.length === 1)!;
    const dry = plans.find((plan) => plan.steps.length === 0)!;
    let t = 0;
    const result = rolloutDecision({
      solver,
      plans: [drink, dry],
      enemies: [{ index: 0, id: "X", move: "HIT", strength: 0, powers: {} }],
      tables: { X: HIT },
      piles: { draw: Array.from({ length: 10 }, (_, i) => defend(10 + i)), discard: [], handBase: [null] },
      meta: META,
      playerPowers: {},
      potions: 1,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 1, horizon: 4, samples: 4, now: () => (t += 0.01) },
    });
    const withThorns = result.lines.find((line) => line.plan === drink)!;
    const without = result.lines.find((line) => line.plan === dry)!;
    // 9 back a turn: 30 HP gone on the 4th enemy turn (turns 1-4), with only Defends in the deck.
    expect(withThorns.wins).toBe(4);
    expect(without.wins).toBe(0);
  });

  it("the logged F19 T1 board (VTRE, Thieving Hopper 19 x1): the drink is a simulated line, not \"effect not simulated\"", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const decision = planCombatTurn(loggedEnv(logged("batch-i/vtre-f19-t1-bronze")));
    if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind}`);
    const question = decision.questions["plan"]!;
    const lines = Object.values(question.type === "choice" ? question.criteria : {}).map((text) => JSON.parse(String(text)) as Raw);
    expect(lines.some((line) => /not simulated/.test(String(line["plays"])) && /流动铜液/.test(String(line["plays"])))).toBe(false);
    expect(lines.some((line) => /流动铜液/.test(String(line["plays"])) && line["simulated"] === undefined)).toBe(true);
  });
});

describe("2. Red Skull (+3 Strength at or below half HP) and Self-Forming Clay (3 block next turn per HP loss) in the solver and the rollout (VTREB5A9XWS7 F33, V6TW9MJ385P2 F33)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
    solveTap.onSolve = null;
  });

  const bleed = (i: number) => card(i, "BLEED", { type: "Skill", cost: 0, target: "self", validTargets: [], hpLoss: 3 });

  it("solver, Red Skull: an HP loss on our turn that takes us to half adds 3 to the Attacks after it; a heal back above takes it off", () => {
    const hand = [bleed(0), card(1, "STRIKE", { damage: 6, damageBase: 6 })];
    const input = (redSkull?: number, hp = 42): SolverInput => ({ hand, player: player({ hp, energy: 1, ...(redSkull ? { redSkull } : {}) }), enemies: [enemy()], fightKind: "monster", turn: 1 });
    const line = (plans: ReturnType<typeof solveTurn>["plans"]) => plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === "BLEED,STRIKE")!;
    expect(line(solveTurn(input(3)).plans).outcome.damageDealt).toBe(9);
    expect(line(solveTurn(input()).plans).outcome.damageDealt).toBe(6);
    // Already at half (the shown damage has it): no second +3.
    expect(line(solveTurn(input(3, 38)).plans).outcome.damageDealt).toBe(6);
    // A Blood Potion (20% of 80 = 16) from 38 to 54 takes it off.
    const blood = { ...modelPotion("BLOOD_POTION", "血液药水", 0, [], 0)!, cost: 0 };
    const healed: SolverInput = { hand: [blood, card(1, "STRIKE", { damage: 9, damageBase: 6 })], player: player({ hp: 38, energy: 1, redSkull: 3 }), enemies: [enemy()], fightKind: "monster", turn: 1 };
    const drinkFirst = solveTurn(healed).plans.find((plan) => plan.steps.length === 2 && plan.steps[0]!.cardId.startsWith("POTION:"))!;
    expect(drinkFirst.outcome.damageDealt).toBe(6);
  });

  it("solver, Self-Forming Clay: next turn's block is 3 per HP loss (ours, each enemy hit past block) plus what is owed", () => {
    const hand = [bleed(0)];
    const input = (over: Partial<PlayerSim>): SolverInput => ({ hand, player: player({ energy: 1, ...over }), enemies: [enemy({ attacks: [{ damage: 5, hits: 2 }] })], fightKind: "monster", turn: 1 });
    const plans = solveTurn(input({ clayBlock: 3, clayPending: 3 })).plans;
    const bleedLine = plans.find((plan) => plan.steps.length === 1)!;
    const endTurn = plans.find((plan) => plan.steps.length === 0)!;
    expect(endTurn.outcome.clayBlockNext).toBe(3 + 3 * 2);
    expect(bleedLine.outcome.clayBlockNext).toBe(3 + 3 * 3);
    // Block that stops a hit: no loss from it.
    expect(solveTurn(input({ clayBlock: 3, block: 5 })).plans.find((plan) => plan.steps.length === 0)!.outcome.clayBlockNext).toBe(3);
    expect(solveTurn(input({})).plans.find((plan) => plan.steps.length === 0)!.outcome.clayBlockNext).toBeUndefined();
  });

  const WAIT_META: FightMeta = { ...META, deck: { n: 10, atk: 10, skl: 0, pow: 0, junk: 0, dmg: 60, blk: 0, up: 0 } };
  const rollout = (solver: SolverInput, table: EnemyTable, draw: CardModel[]) => {
    const endTurn = solveTurn(solver).plans.find((plan) => plan.steps.length === 0)!;
    let t = 0;
    return rolloutDecision({
      solver,
      plans: [endTurn],
      enemies: [{ index: 0, id: "X", move: "HIT", strength: 0, powers: {} }],
      tables: { X: table },
      piles: { draw, discard: [], handBase: solver.hand.map(() => null) },
      meta: WAIT_META,
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 1, horizon: 2, samples: 2, now: () => (t += 0.01) },
    }).lines[0]!;
  };

  it("rollout, Red Skull: the enemy turn takes us to half, the next turn's Strikes deal 3 more each", () => {
    const HIT: EnemyTable = { moves: { HIT: { damage: 12, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const strikes = Array.from({ length: 10 }, (_, i) => card(10 + i, "STRIKE", { damage: 6, damageBase: 6 }));
    const run = (redSkull?: number) => rollout({ hand: [], player: player({ hp: 50, energy: 3, ...(redSkull ? { redSkull } : {}) }), enemies: [enemy({ hp: 500, maxHp: 500, attacks: [{ damage: 12, hits: 1 }] })], fightKind: "monster", turn: 1 }, HIT, strikes);
    // 3 energy, 3 Strikes on turn 2: 18, or 27 at 38/80 with Red Skull.
    expect(run().perTurn[0]!.dmg.mean).toBe(18);
    expect(run(3).perTurn[0]!.dmg.mean).toBe(27);
  });

  it("rollout, Self-Forming Clay: two hits taken give the next turn 6 block (10 lost becomes 4)", () => {
    const HIT: EnemyTable = { moves: { HIT: { damage: 5, hits: 2, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const junk = Array.from({ length: 10 }, (_, i) => card(10 + i, "NOTHING", { type: "Skill", cost: 0, target: "self", validTargets: [] }));
    const run = (clay: boolean) => rollout({ hand: [], player: player({ hp: 60, energy: 3, ...(clay ? { clayBlock: 3 } : {}) }), enemies: [enemy({ hp: 500, maxHp: 500, attacks: [{ damage: 5, hits: 2 }] })], fightKind: "monster", turn: 1 }, HIT, junk);
    expect(run(false).perTurn[0]!.loss.mean).toBe(10);
    expect(run(true).perTurn[0]!.loss.mean).toBe(4);
  });

  it("logged boards: the relics reach the solver (VTRE F33 T5 at 46/80: Offering then Strike gets Red Skull's 3; V6TW F33 T2: Clay's owed 3)", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const inputs: SolverInput[] = [];
    solveTap.onSolve = (input) => inputs.push(input);
    planCombatTurn(loggedEnv(logged("batch-i/vtre-f33-t5-red-skull")));
    const skull = inputs[0]!;
    expect(skull.player.redSkull).toBe(3);
    // Taunt, Frantic Escape, then Offering (6 HP: 46 -> 40, half of 80) before or after the Strike.
    const damage = (input: SolverInput, first: string, second: string) =>
      solveTurn(input).plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === `TAUNT,FRANTIC_ESCAPE,${first},${second}`)?.outcome.damageDealt;
    const { redSkull: _r, ...without } = skull.player;
    const plain = [damage({ ...skull, player: without }, "OFFERING", "STRIKE_IRONCLAD"), damage({ ...skull, player: without }, "STRIKE_IRONCLAD", "OFFERING")].filter((x) => x !== undefined);
    expect(plain.length).toBeGreaterThan(0);
    expect(new Set(plain).size).toBe(1);
    expect(damage(skull, "OFFERING", "STRIKE_IRONCLAD")! - plain[0]!).toBeGreaterThan(0);
    expect(damage(skull, "STRIKE_IRONCLAD", "OFFERING")).toBe(plain[0]);
    inputs.length = 0;
    planCombatTurn(loggedEnv(logged("batch-i/v6tw-f33-t2-clay")));
    expect(inputs[0]!.player).toMatchObject({ clayBlock: 3, clayPending: 3 });
  });
});

describe("3. Plating's decay is said with the card text (7YT0NJC2LEYQ F12 took Stone Armor as \"48 block over 12 turns\", QBCV838592ZQ F16 smithed it as 4 -> 6 a turn)", () => {
  it("the text gets the total each stack count gives (4: 10, 6: 21); other texts are unchanged", () => {
    const four = annotatePlating("获得[blue]4[/blue]层[gold]覆甲[/gold]。");
    expect(four).toContain("[Plating: block = stacks at your turn's end, then 1 stack less each turn;");
    expect(four).toContain("4 stacks 4+3+2+1 = 10 block in all, not 4 every turn]");
    expect(annotatePlating(four)).toBe(four);
    const smith = annotatePlating("获得4层覆甲。 -> 获得6层覆甲。");
    expect(smith).toContain("4 stacks 4+3+2+1 = 10 block");
    expect(smith).toContain("6 stacks 6+5+…+1 = 21 block in all, not the same every turn]");
    expect(annotatePlating("获得5点格挡。")).toBe("获得5点格挡。");
  });

  it("the logged F12 card reward: Stone Armor's option text carries the decay", () => {
    const env = loggedEnv(logged("batch-i/7yt0-f12-stone-armor-reward"));
    const decision = planReward(env);
    if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind}`);
    const question = decision.questions["pick"]!;
    const criteria = question.type === "choice" ? question.criteria : {};
    const armor = Object.values(criteria).map((text) => JSON.parse(String(text)) as Raw).find((option) => option["card"] === "岩石铠甲")!;
    expect(String(armor["text"])).toMatch(/^获得4层覆甲。/);
    expect(String(armor["text"])).toContain("4 stacks 4+3+2+1 = 10 block in all");
  });

  it("Heart of Iron's potion text (Plating 7) says it too", () => {
    expect(fillPotionText("HEART_OF_IRON", "获得[blue]{PlatingPower}[/blue]层[gold]覆甲[/gold]。")).toContain("7 stacks 7+6+…+1 = 28 block in all");
  });
});

describe("4. One-shot shop: a shopping list written into \"choice\" is taken (VTREB5A9XWS7 F6: judged \"no plan list\", 150.8 s of step-by-step questions)", () => {
  const shopDecision = () => decide(oneshotEnv(logged("batch-i/vtre-f6-shop").state));
  const resolveWith = (json: Record<string, unknown>) => ask(shopDecision()).deepseek.plan!.resolve(json);

  it("the logged reply {choice: \"buy_potion2, remove:c0, buy_card1\"}: the list is the plan, and the rationale says where it came from", () => {
    const e = oneshotEnv(logged("batch-i/vtre-f6-shop").state);
    const parsed = parseShopPlan({ choice: "buy_potion2, remove:c0, buy_card1", reason: "Block potion first" }, e);
    if ("invalid" in parsed) throw new Error(parsed.invalid);
    expect(parsed.steps.map((step) => step.key)).toEqual(["buy_potion2", "remove:c0", "buy_card1", "leave"]);
    expect(parsed.fromChoice).toBe(true);
    const out = resolveWith({ choice: "buy_potion2, remove:c0, buy_card1", reason: "Block potion first" });
    if ("invalid" in out) throw new Error(out.invalid);
    expect(out.intent).toMatchObject({ action: "buy_potion", option_index: 2 });
    expect(out.rationale).toContain('list read from the answer\'s "choice"');
    // A JSON list in "choice", or arrows between the steps, the same.
    expect(parseShopPlan({ choice: '["buy_potion2", "buy_card1"]' }, e)).toMatchObject({ steps: [{ key: "buy_potion2" }, { key: "buy_card1" }, { kind: "leave" }] });
    expect(parseShopPlan({ choice: ["buy_card1"] }, e)).toMatchObject({ steps: [{ key: "buy_card1" }, { kind: "leave" }] });
    expect(parseShopPlan({ choice: "buy_card1 -> buy_potion2" }, e)).toMatchObject({ steps: [{ key: "buy_card1" }, { key: "buy_potion2" }, { kind: "leave" }] });
  });

  it("still invalid: no list anywhere, or a \"choice\" that is not a list of real steps; a \"plan\" answer is as before", () => {
    const e = oneshotEnv(logged("batch-i/vtre-f6-shop").state);
    expect(parseShopPlan({ choice: "null", reason: "x" }, e)).toEqual({ invalid: 'no "plan" list in the answer' });
    expect(parseShopPlan({ reason: "x" }, e)).toEqual({ invalid: 'no "plan" list in the answer' });
    expect(parseShopPlan({ choice: "buy the block potion and remove a strike" }, e)).toMatchObject({ invalid: expect.stringMatching(/^unknown step/) });
    const plain = parseShopPlan({ plan: ["buy_card1"], choice: "whatever" }, e);
    expect(plain).toMatchObject({ steps: [{ key: "buy_card1" }, { kind: "leave" }] });
    expect("fromChoice" in plain).toBe(false);
  });
});

describe("5. Liquid Memories drunk mid-line: a combat frame before the \"put a card into your hand\" screen waits for it, the line is kept (batch H note, after 9729bdb)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  /** The 8KD7 F11 T2 drink frame with the drink done: the belt empty, the hand as it was (the card not taken yet). */
  const drunkFrame = () => {
    const fx = logged("batch-h/8kd7-f11-t2-drink");
    const run = fx.state["run"] as Raw;
    run["potions"] = (run["potions"] as Raw[]).map((slot) => (slot["potion_id"] === "LIQUID_MEMORIES" ? { ...slot, potion_id: null, name: null, occupied: false, can_use: false } : slot));
    fx.state["available_actions"] = ["end_turn", "play_card", "save_and_quit"];
    return fx;
  };

  it("Jev's \"Stone Armor, Liquid Memories, Bash+ from it\": the frame between the drink and the screen returns nothing and keeps the line (batch-h 3 plays it on after the screen)", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const env0 = loggedEnv(logged("batch-h/8kd7-f11-t2-ask"));
    const memory = env0.screenMemory;
    const ask0 = planCombatTurn(env0);
    if (ask0?.kind !== "ask") throw new Error(`expected an ask, got ${ask0?.kind}`);
    const question = ask0.questions["plan"]!;
    const criteria = question.type === "choice" ? question.criteria : {};
    const key = Object.keys(criteria).find((k) => /液态记忆/.test(String(JSON.parse(String(criteria[k]))["plays"])) && /痛击\+ from 液态记忆/.test(String(JSON.parse(String(criteria[k]))["plays"])))!;
    const chosen = ask0.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } } as AnswerSet);
    chosen.apply?.();
    const drink = planCombatTurn({ ...loggedEnv(logged("batch-h/8kd7-f11-t2-drink")), screenMemory: memory });
    expect(drink).toMatchObject({ kind: "act", intent: { action: "use_potion", option_index: 0 } });
    if (drink?.kind === "act") drink.apply?.();
    const line = memory.combatPlan;
    expect(line?.take).toBe("BASH+");
    // The frame before the screen: nothing to do yet, the line still there.
    const between = drunkFrame();
    noteScreenChange(memory, parseGameState(between.state));
    expect(planCombatTurn({ ...loggedEnv(between), screenMemory: memory })).toBeNull();
    expect(memory.combatPlan).toBe(line);
    expect(memory.potionTake).toMatchObject({ cardId: "BASH", upgraded: true });
    // Not forever: with no screen after the wait, the turn is planned again.
    memory.takeWaitSince = Date.now() - 60_000;
    expect(planCombatTurn({ ...loggedEnv(between), screenMemory: memory })).not.toBeNull();
    expect(memory.takeWaitSince).toBeUndefined();
  });
});

describe("6. The Giant's kill-turn record in the guides is filled from the fight data ({GIANT_KILLS_A8}, {GIANT_KILLS_A9}; was \"A8 27 场…A9 10 场赢 3\")", () => {
  const KNOWLEDGE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "knowledge");
  const row = (turn: number | null, won: boolean, extra: Partial<GiantKillRow> = {}): GiantKillRow => ({ turn, won, ...extra });
  // A fixed set (not the refreshing boss-damage.json).
  const a8 = [row(8, true), row(9, true), row(14, false), row(null, false)];
  const a9 = [row(7, true), row(9, false, { hp: 14, stacks: 41, run: "5NFG" }), row(12, false)];

  it("no hard-coded record left in the guides; the DeepSeek system prompt carries A8's and A9's as counted, three times each", () => {
    for (const name of ["ironclad-guide.md", "ds-handbook.md"]) {
      const text = readFileSync(join(KNOWLEDGE, name), "utf8");
      expect(text, name).not.toMatch(/A8 27 场|A9 10 场/);
      // Every line with A8's record has A9's too.
      const lines = text.split("\n").filter((line) => line.includes("{GIANT_KILLS_A8}"));
      expect(lines.length, name).toBeGreaterThan(0);
      for (const line of lines) expect(line, name).toContain("{GIANT_KILLS_A9}");
    }
    setUnblockedSharesForTests({ WATERFALL_GIANT: { unblocked_share: 0.3, fights: 7, turns: 70, kills: { "8": a8, "9": a9 } } });
    try {
      const a8Text = giantKillRecord(8, "zh");
      const a9Text = giantKillRecord(9, "zh");
      expect(a8Text).toContain("A8 4 场赢 2 场");
      expect(a9Text).toContain("A9 3 场赢 1 场");
      expect(fillGuideFacts("{GIANT_KILLS_A8}；{GIANT_KILLS_A9}")).toBe(`${a8Text}；${a9Text}`);
      const client = new DeepSeekClient({ apiKey: "k", baseUrl: "http://127.0.0.1:9", model: "m", timeoutMs: 1000, guideFile: join(KNOWLEDGE, "ironclad-guide.md"), handbookFile: join(KNOWLEDGE, "ds-handbook.md") });
      expect(client.systemPrompt).not.toMatch(/\{GIANT_KILLS_A[89]\}/);
      expect(client.systemPrompt.split(a8Text).length - 1).toBe(3);
      expect(client.systemPrompt.split(a9Text).length - 1).toBe(3);
    } finally {
      setUnblockedSharesForTests(null);
    }
  });
});

describe("7. \"solver says dead, mod says safe\" from cards held (Burn) is not a \"calc mismatch\" either (after 14520e0, which counted the enemy hits only)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("solver: the held Burns' damage is apart in the outcome", () => {
    const burn = (i: number) => card(i, "BURN", { type: "Status", cost: -1, playable: false, target: "none", validTargets: [], heldPenalty: 2 });
    const input: SolverInput = { hand: [burn(0), burn(1)], player: player({ hp: 3, energy: 0 }), enemies: [enemy({ attacks: [{ damage: 1, hits: 1 }] })], fightKind: "monster", turn: 1 };
    const end = solveTurn(input).plans.find((plan) => plan.steps.length === 0)!;
    expect(end.outcome.heldDamage).toBe(4);
    expect(end.outcome.incomingAfterBlock).toBe(5);
    expect(end.outcome.dies).toBe(true);
  });

  it("the logged K7G9 F45 T3 board (4 HP, four Burns held, no attack coming, mod says safe): the note names the Burns", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const fx = logged("batch-i/k7g9-f45-t3-burns");
    expect((fx.state["combat"] as Raw)["end_turn_will_kill_player"]).toBe(false);
    const decision = planCombatTurn(loggedEnv(fx));
    if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind}`);
    const question = decision.questions["plan"]!;
    const key = Object.keys(question.type === "choice" ? question.criteria : {}).find((k) => k.startsWith("plan"))!;
    const resolved = decision.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } } as AnswerSet);
    expect(resolved.rationale).not.toContain("calc mismatch");
    expect(resolved.rationale).toMatch(/\[ending now kills by what the mod's lethal flag does not count: \d+ HP lost in all, 0 of it the enemy hits after block, 8 damage from cards held \(Burn\)\]/);
  });
});

describe("8. The \"discard potion(s), then …\" answer note of rest sites and events is the shared DISCARD_ANSWER_NOTE (was a copy in each)", () => {
  it("rest.ts and event.ts use the constant; the sentence is written once, in potion-discard.ts", () => {
    const SCREENS = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "screens");
    const sentence = 'also needs "discard": [potion slot numbers from its discardable_potions] in your answer';
    expect(DISCARD_ANSWER_NOTE).toContain(sentence);
    for (const name of ["rest.ts", "event.ts"]) {
      const source = readFileSync(join(SCREENS, name), "utf8");
      expect(source, name).not.toContain(sentence);
      expect(source, name).toMatch(/discardNote = [^;]*\$\{DISCARD_ANSWER_NOTE\}/);
    }
  });
});

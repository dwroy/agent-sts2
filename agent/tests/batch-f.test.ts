/**
 * Fix batch F (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states), never the refreshing knowledge files.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { bossNote as journalBossNote } from "../src/project/run-journal.js";
import { bossMechanic, bossProfile, giantKillRecord, setUnblockedSharesForTests, type GiantKillRow } from "../src/strategy/boss-clock.js";
import { modelHandCard, type CardModel } from "../src/strategy/card-model.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";
import { planEvent, potionSlotsNeeded } from "../src/screens/event.js";
import { planRest, restHealHere } from "../src/screens/rest.js";
import { restedHp, restHealOf } from "../src/strategy/route-projection.js";
import { board as oneshotBoard, env as oneshotEnv } from "./oneshot-support.js";
import { createScreenMemory } from "../src/project/types.js";
import type { AnswerSet } from "../src/jev/answers.js";
import type { AskDecision } from "../src/project/types.js";
import { rolloutDecision, type EnemyTable, type FightMeta, type LineEstimate } from "../src/strategy/rollout.js";
import { boardRolloutInput, pickRolloutBest, rolloutTies } from "../src/strategy/rollout-live.js";
import { parseGameState } from "../src/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { exhaustedSinceTurnStart, turnStartAoe } from "../src/screens/combat-plan.js";
import { replayRun } from "../src/project/journal-replay.js";
import { solveTurn, type EnemySim, type Plan, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import { knowledgeFile } from "../src/knowledge/files.js";

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
const strike = (i: number, damage = 6) => card(i, "STRIKE_IRONCLAD", { name: "打击", damage, damageBase: damage });
const defend = (i: number) => card(i, "DEFEND_IRONCLAD", { name: "防御", type: "Skill", target: "self", validTargets: [], block: 5 });
const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, ...over });
const enemy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Dummy", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });
const META: FightMeta = { act: 1, t: 1, asc: 8, kind: "hallway", enc: "TEST_DUMMY", deck: { n: 2, atk: 2, skl: 0, pow: 0, junk: 0, dmg: 10, blk: 0, up: 0 }, relics: 0, max_en: 3 };
const WAIT: EnemyTable = { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } };
const fastClock = () => {
  let t = 0;
  return () => (t += 0.01);
};

describe("1. A saturated board ranks deaths first (CJ88575SQS6H F17 T2), then enemy HP left, before this turn's loss", () => {
  // Every line "expected further HP loss 50" = our HP, no sample won: saturated.
  const line = (name: string, turnLoss: number, over: Partial<LineEstimate>): LineEstimate =>
    ({
      plan: { steps: [], name, outcome: { hpLoss: turnLoss } } as unknown as Plan,
      value: -50 - 40,
      hpLoss: 50,
      wins: 0,
      deaths: 0,
      samples: 8,
      enemyHpLeft: 100,
      turnsSurvived: 5,
      leaderHpLeft: null,
      ...over,
    }) as LineEstimate;

  it("the logged question: plan1 (-2, dead 1/8) over plan2 (-14, dead 5/8, less enemy HP left)", () => {
    const plan1 = line("plan1", 2, { deaths: 1, enemyHpLeft: 97, turnsSurvived: 4.9 });
    const plan2 = line("plan2", 14, { deaths: 5, enemyHpLeft: 80, turnsSurvived: 4.6 });
    const picked = pickRolloutBest([plan1, plan2], 50);
    expect(picked).toMatchObject({ best: plan1, saturated: true });
    expect(rolloutTies(picked, [plan1, plan2], [plan1.plan, plan2.plan])).toEqual({ best: plan1, tied: [] });
    // Asked again (4/8 dead, plan1 now -0): the same.
    const again1 = line("plan1", 0, { deaths: 1, enemyHpLeft: 97 });
    const again2 = line("plan2", 14, { deaths: 4, enemyHpLeft: 80 });
    expect(pickRolloutBest([again2, again1], 50).best).toBe(again1);
  });

  it("the same deaths: the enemy HP left (the fight's progress), then this turn's loss (fix-queue-v4: CDR0Q6929CKR F33 T5)", () => {
    const blocks = line("blocks", 3, { deaths: 2, enemyHpLeft: 120 });
    const hits = line("hits", 9, { deaths: 2, enemyHpLeft: 90 });
    expect(pickRolloutBest([blocks, hits], 50).best).toBe(hits);
    const a = line("a", 5, { deaths: 2, enemyHpLeft: 90 });
    const b = line("b", 3, { deaths: 2, enemyHpLeft: 90.4 });
    expect(pickRolloutBest([a, b], 50).best).toBe(b);
  });

  it("lines equal on every key are tied, none is the best", () => {
    const a = line("a", 4, { deaths: 3, enemyHpLeft: 90 });
    const b = line("b", 4, { deaths: 3, enemyHpLeft: 90.4 });
    const worse = line("worse", 4, { deaths: 5, enemyHpLeft: 10 });
    const picked = pickRolloutBest([a, b, worse], 50);
    expect(picked).toEqual({ best: null, saturated: true, tied: [a, b] });
    expect(rolloutTies(picked, [a, b, worse], [a.plan, b.plan, worse.plan])).toEqual({ best: null, tied: [a, b] });
    // One of the tied lines shown: it is the best among what is shown.
    expect(rolloutTies(picked, [a, b, worse], [a.plan, worse.plan])).toEqual({ best: a, tied: [] });
  });
});

describe("2. Tests that plan logged boards have a timeout that holds under load (potion-mc, rollout-live)", () => {
  // Each such test runs code's full planner (and the rollout) over one or every board of tests/logged-states;
  // at vitest's default 5 s they timed out under load (potion-mc "the same twice" once; it takes 1.6 s alone).
  const TESTS = dirname(fileURLToPath(import.meta.url));
  const blocks = (file: string): { title: string; body: string; timeout: number | null }[] => {
    const lines = readFileSync(join(TESTS, file), "utf8").split("\n");
    const found: { title: string; body: string; timeout: number | null }[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const head = /^(\s*)it\("([^"]*)"/.exec(lines[i]!);
      if (!head) continue;
      const end = new RegExp(`^${head[1]}\\}(?:, ([\\d_]+))?\\);\\s*$`);
      let j = i + 1;
      while (j < lines.length && !end.test(lines[j]!)) j += 1;
      const timeout = end.exec(lines[j] ?? "")?.[1];
      found.push({ title: head[2]!, body: lines.slice(i, j + 1).join("\n"), timeout: timeout ? Number(timeout.replace(/_/g, "")) : null });
      i = j;
    }
    return found;
  };

  for (const file of ["potion-mc.test.ts", "rollout-live.test.ts"]) {
    it(`${file}: every test on logged boards has at least 30 s, a scan of every board at least 120 s`, () => {
      const onBoards = blocks(file).filter((block) => /\blogged\(|\bplan\(|BOARDS/.test(block.body));
      expect(onBoards.length).toBeGreaterThan(2);
      for (const block of onBoards) {
        expect(block.timeout, block.title).not.toBeNull();
        expect(block.timeout!, block.title).toBeGreaterThanOrEqual(/BOARDS/.test(block.body) ? 120_000 : 30_000);
      }
    });
  }
});

describe("3. Hand-written knowledge per ascension, as the data has it (experience update 2026-09-29.4)", () => {
  const KNOWLEDGE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "knowledge");
  const read = (name: string): string => readFileSync(knowledgeFile(KNOWLEDGE, name), "utf8");

  it("the Giant's early kill: A8's record at A8, A9's at A9 (killed by T10 1/3, both losses short of HP at the kill)", () => {
    // Batch G: the record comes from the fight data (boss-damage.json kills); here the 8 A9 fights of batch F's time.
    const row = (turn: number | null, won: boolean, extra: Partial<GiantKillRow> = {}): GiantKillRow => ({ turn, won, ...extra });
    const a8 = [...Array.from({ length: 15 }, (_, i) => row(8 + (i % 3), i < 13)), ...Array.from({ length: 7 }, (_, i) => row(13 + (i % 3), i < 5)), row(16, false), row(17, false), row(18, false), row(null, false), row(null, false)];
    const a9 = [row(7, true), row(9, false, { hp: 14, stacks: 41, run: "5NFG" }), row(10, false, { hp: 20, stacks: 44, run: "2ZCK" }), row(11, false), row(12, true), row(14, false), row(19, false), row(null, false)];
    setUnblockedSharesForTests({ WATERFALL_GIANT: { unblocked_share: 0.3, fights: 35, turns: 400, kills: { "8": a8, "9": a9 } } });
    try {
      expect(giantKillRecord(9, "zh")).toContain("T10 前击杀赢 1/3");
      expect(giantKillRecord(9, "zh")).toContain("击杀时只剩 14、20 血对 41、44 层");
      expect(giantKillRecord(8, "zh")).toContain("A8 27 场赢 18 场：T10 前击杀赢 13/15");
      const a9Note = journalBossNote("WATERFALL_GIANT_BOSS", 9)!;
      expect(a9Note).toContain("T10 前击杀赢 1/3");
      expect(a9Note).not.toContain("13/15");
      // Batch H: the block-needed record is counted from the kills' HP and stacks (these rows carry two); from A8 up
      // by ascension (2026-10-04, recordBand), the pooled A8/A9 text below A8.
      expect(a9Note).toContain("有击杀的巨兽战按所需格挡（层数 − HP）分：A8 没有记下击杀时 HP 的对局；A9 2 场中 ≤13 的 0 场赢 0，≥20 的 2 场赢 0");
      expect(journalBossNote("WATERFALL_GIANT_BOSS", 7)).toContain("A8/A9 有击杀的 2 场：所需格挡（层数 − HP）≤13 的 0 场赢 0，≥20 的 2 场赢 0");
      expect(journalBossNote("WATERFALL_GIANT_BOSS", 8)).toContain("13/15");
      const giant = bossProfile("WATERFALL_GIANT_BOSS")!;
      expect(bossMechanic(giant, 9)).toContain("killed by T10 1/3 won");
      expect(bossMechanic(giant, 9)).not.toContain("13/15");
      expect(bossMechanic(giant, 8)).toContain("killed by T10 13/15 won");
    } finally {
      setUnblockedSharesForTests(null);
    }
  });

  it("the guides: every A8 early-kill figure comes with A9's; Prism A9 losses; Entomancer deaths; the Kin as kin-priest-focus", () => {
    const handbook = read("ds-handbook.md");
    const guide = read("ironclad-guide.md");
    for (const [name, text] of [["ds-handbook", handbook], ["ironclad-guide", guide]] as const) {
      // Batch I: the kill-turn record is filled from the fight data (fillGuideFacts), A8's always with A9's.
      const lines = text.split("\n").filter((line) => line.includes("{GIANT_KILLS_A8}"));
      expect(lines.length, name).toBeGreaterThan(0);
      for (const line of lines) expect(line, name).toContain("{GIANT_KILLS_A9}");
      expect(text, name).not.toContain("13/15");
    }
    expect(handbook).not.toContain("多次掉 22~40 血");
    expect(handbook).toMatch(/感染棱柱.*A9 4 场赢 3，赢的 3 场掉 42、52、56/);
    expect(handbook).not.toContain("蜂群术士已经 3 次致死");
    expect(handbook).toContain("蜂群术士 A7–A9 已 9 次致死");
    expect(guide).not.toContain("长战先杀信徒（先杀左边）");
    expect(guide).not.toContain("先杀信徒能减少受到的伤害");
    expect(guide).toMatch(/Kin Priest.*单体伤害压神官/);
  });
});

describe("4a. Cloak Clasp: 1 Block at the end of the turn for each card still in hand (7MDJ256RY2UU)", () => {
  it("three cards held, 10 incoming: the end-turn line loses 7, not 10; played cards leave the count", () => {
    const hand = [defend(0), defend(1), strike(2)];
    const input = (clasp: boolean): SolverInput => ({
      hand,
      player: player({ energy: 0, ...(clasp ? { blockPerHeldCard: 1 } : {}) }),
      enemies: [enemy({ attacks: [{ damage: 10, hits: 1 }] })],
      fightKind: "monster",
      turn: 2,
    });
    expect(solveTurn(input(false)).plans[0]!.outcome.hpLoss).toBe(10);
    expect(solveTurn(input(true)).plans[0]!.outcome.hpLoss).toBe(7);
    // One energy: Defend (5) leaves two cards held: 10 - 5 - 2 = 3.
    const one = solveTurn({ ...input(true), player: player({ energy: 1, blockPerHeldCard: 1 }) }).plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId === "DEFEND_IRONCLAD")!;
    expect(one.outcome.hpLoss).toBe(3);
  });
});

describe("4b. Rolling Boulder: every start of turn hits every enemy for its amount, then 5 more (83FLGYXZG9QH, KYC0RYEN0NVW)", () => {
  const boulderRun = (powers: Record<string, number>, hp: number, turnStartAoeNow: number) => {
    const solver: SolverInput = { hand: [defend(0)], player: player({ energy: 0, turnStartAoe: turnStartAoeNow }), enemies: [enemy({ hp, maxHp: hp })], fightKind: "monster", turn: 2 };
    return rolloutDecision({
      solver,
      plans: solveTurn(solver).plans,
      enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
      tables: { TEST_DUMMY: WAIT },
      piles: { draw: [], discard: [defend(10), defend(11), defend(12), defend(13), defend(14)], handBase: [defend(0)] },
      meta: META,
      playerPowers: powers,
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 3, now: fastClock() },
    }).lines[0]!;
  };

  it("the board's power: 5 at the next start of turn, 10 at the one after (15 HP dies on the second, not the third)", () => {
    // combat-plan's start-of-turn AoE counts the power's amount (it was left out: 0).
    expect(turnStartAoe([], { powers: [{ power_id: "ROLLING_BOULDER_POWER", amount: 10 }] })).toBe(10);
    expect(turnStartAoe(["MERCURY_HOURGLASS"], { powers: [{ power_id: "ROLLING_BOULDER_POWER", amount: 5 }] })).toBe(8);
    const line = boulderRun({ ROLLING_BOULDER_POWER: 5 }, 15, 5);
    expect(line.winProb).toBe(1);
    expect(line.turnsToWin).toBe(2);
    // Mercury Hourglass alongside: 3 + 5, then 3 + 10.
    const both = boulderRun({ ROLLING_BOULDER_POWER: 5 }, 21, 8);
    expect(both.turnsToWin).toBe(2);
  });

  it("played in the line: the card's amount from the next start of turn on", () => {
    const boulder = card(0, "ROLLING_BOULDER", { type: "Power", target: "self", validTargets: [], cost: 0, powerAmount: 5, flatValue: 26 });
    const solver: SolverInput = { hand: [boulder], player: player({ energy: 3 }), enemies: [enemy({ hp: 15, maxHp: 15 })], fightKind: "monster", turn: 2 };
    const plays = solveTurn(solver).plans.find((plan) => plan.steps.some((step) => step.cardId === "ROLLING_BOULDER"))!;
    const result = rolloutDecision({
      solver,
      plans: [plays],
      enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
      tables: { TEST_DUMMY: WAIT },
      piles: { draw: [], discard: [defend(10), defend(11), defend(12), defend(13), defend(14)], handBase: [boulder] },
      meta: META,
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 3, now: fastClock() },
    });
    expect(result.lines[0]!.winProb).toBe(1);
    expect(result.lines[0]!.turnsToWin).toBe(2);
  });
});

describe("4c. Primal Force turns every Attack in hand into a Giant Rock (N01X6BBAYMHT)", () => {
  const primal = (i: number, upgraded = false) => card(i, "PRIMAL_FORCE", { type: "Skill", target: "self", validTargets: [], cost: 0, special: "primal_force", upgraded, known: true });

  it("Primal Force, then two Rocks (20 each) kill a 40-HP enemy the two Strikes (6 each) could not", () => {
    const input: SolverInput = { hand: [primal(0), strike(1), strike(2)], player: player({ energy: 2 }), enemies: [enemy({ hp: 40, maxHp: 40 })], fightKind: "monster", turn: 2 };
    const best = solveTurn(input).plans[0]!;
    expect(best.outcome.winsFight).toBe(true);
    expect(best.steps.map((step) => step.cardId)).toEqual(["PRIMAL_FORCE", "GIANT_ROCK", "GIANT_ROCK"]);
  });

  it("upgraded: Giant Rock+ 24, with this turn's Strength shown like the hand shows it; Skills stay", () => {
    const input: SolverInput = { hand: [primal(0, true), strike(1, 9), defend(2)], player: player({ energy: 1, strengthNow: 3 }), enemies: [enemy({ hp: 27, maxHp: 27 })], fightKind: "monster", turn: 2 };
    const best = solveTurn(input).plans[0]!;
    // 24 + 3 Strength = 27: a kill with one energy.
    expect(best.outcome.winsFight).toBe(true);
    expect(best.steps.map((step) => step.cardId)).toEqual(["PRIMAL_FORCE", "GIANT_ROCK"]);
  });

  it("the card model reads it (a known 0-cost Skill, not a flat nudge)", () => {
    const raw = { index: 0, card_id: "PRIMAL_FORCE", name: "原始力量", upgraded: false, energy_cost: 0, rules_text: "将手牌中的所有攻击牌变化为{IfUpgraded:show:巨石+|巨石}。", resolved_rules_text: "将手牌中的所有攻击牌变化为巨石。", dynamic_values: [], playable: true, target_type: "None", requires_target: false, valid_target_indices: [] };
    const model = modelHandCard(raw, 0, loggedKnowledge);
    expect(model).toMatchObject({ special: "primal_force", known: true, flatValue: 0 });
  });
});

describe("4d. Hellraiser: a Strike drawn on a later turn is played at once, free, at a random enemy (CJ88575SQS6H F17)", () => {
  const run = (hand: CardModel[], powers: Record<string, number>, plan?: (plans: Plan[]) => Plan) => {
    const solver: SolverInput = { hand, player: player({ energy: 0 }), enemies: [enemy({ hp: 30, maxHp: 30 })], fightKind: "monster", turn: 2 };
    const plans = solveTurn(solver).plans;
    const strikes = [10, 11, 12, 13, 14].map((i) => strike(i));
    return rolloutDecision({
      solver,
      plans: plan ? [plan(plans)] : plans,
      enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
      tables: { TEST_DUMMY: WAIT },
      piles: { draw: strikes, discard: [], handBase: hand },
      meta: META,
      playerPowers: powers,
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 7, now: fastClock() },
    }).lines[0]!;
  };

  it("up on the board: five Strikes drawn, all five hit (30), not the three 3 energy pays for (18)", () => {
    const up = run([defend(0)], { HELLRAISER_POWER: 1 });
    expect(up.winProb).toBe(1);
    expect(up.turnsToWin).toBe(2);
    const off = run([defend(0)], {});
    expect(off.turnsToWin).toBe(3);
  });

  it("played in the line: from the next turn's draw on", () => {
    const hellraiser = card(0, "HELLRAISER", { type: "Power", target: "self", validTargets: [], cost: 0, flatValue: 10 });
    const line = run([hellraiser], {}, (plans) => plans.find((plan) => plan.steps.some((step) => step.cardId === "HELLRAISER"))!);
    expect(line.turnsToWin).toBe(2);
  });
});

describe("4e. Biiig Hug: a Soot into the draw pile at every shuffle (CMUXQKE4UDJ4 F19-F22)", () => {
  const soot = card(90, "SOOT", { name: "煤灰", type: "Status", playable: false, target: "none" as CardModel["target"], validTargets: [], cost: -1 });
  const run = (onShuffle: CardModel | undefined) => {
    const solver: SolverInput = { hand: [], player: player({ energy: 0 }), enemies: [enemy({ hp: 12, maxHp: 12 })], fightKind: "monster", turn: 2 };
    return rolloutDecision({
      solver,
      plans: solveTurn(solver).plans,
      enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
      tables: { TEST_DUMMY: WAIT },
      piles: { draw: [], discard: [strike(10), strike(11)], handBase: [] },
      meta: META,
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      ...(onShuffle ? { onShuffle } : {}),
      options: { budgetMs: 1e9, seed: 11, handSize: 2, now: fastClock() },
    }).lines[0]!;
  };

  it("two Strikes shuffled in with a Soot: a 2-card draw misses one in some samples", () => {
    // Turn 2 (the first simulated one) draws 2 of the shuffled pile: both Strikes kill the 12-HP dummy.
    const plain = run(undefined);
    expect(plain.perTurn[0]!.won).toBe(plain.samples);
    const hug = run(soot);
    expect(hug.perTurn[0]!.won).toBeLessThan(hug.samples);
    expect(hug.perTurn[0]!.won).toBeGreaterThan(0);
  });

  it("the board's relic: the rollout input carries the Soot (and none without Biiig Hug)", () => {
    // The game data's Soot (the mod's cards collection; the fixture's subset has none).
    const data = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "logged-states", "game-data.json"), "utf8")) as Record<string, unknown[]>;
    const sootData = { id: "SOOT", name: "煤灰", description: "不能被打出。", description_raw: "", type: "Status", rarity: "Status", target: "None", cost: -1, is_x_cost: false, star_cost: null, is_x_star_cost: false, color: "status", damage: null, block: null, keywords: ["Unplayable"], tags: [], vars: [] };
    const knowledge = makeKnowledge({ ...data, cards: [...(data["cards"] ?? []), sootData] }, "cache");
    const fx = logged("kyc0-f28-t2-decimillipede");
    const solver: SolverInput = { hand: [], player: player(), enemies: [], fightKind: "monster", turn: 2 };
    const without = boardRolloutInput(parseGameState(fx.state), knowledge, solver, 9, {}, {});
    expect(without.onShuffle).toBeUndefined();
    const run = fx.state["run"] as Record<string, unknown>;
    run["relics"] = [...(run["relics"] as unknown[]), { index: 99, relic_id: "BIIIG_HUG", name: "大～抱抱" }];
    const withHug = boardRolloutInput(parseGameState(fx.state), knowledge, solver, 9, {}, {});
    expect(withHug.onShuffle?.cardId).toBe("SOOT");
    expect(withHug.onShuffle?.playable).toBe(false);
  });
});

describe("5. Thrash's random exhaust in the rollout takes an Attack, and grows by that Attack's shown damage (batch E note)", () => {
  it("Thrash with a Strike (6) and a 3-cost 20 in hand and a Defend: the Defend is never taken; the growth is 6 or 20", () => {
    const thrash = card(0, "THRASH", { damage: 4, damageBase: 4, hits: 2, special: "thrash" });
    const heavy = card(2, "HEAVY", { cost: 3, damage: 20, damageBase: 20 });
    const hand = [thrash, strike(1), heavy, defend(3)];
    const solver: SolverInput = { hand, player: player({ energy: 1 }), enemies: [enemy({ hp: 500, maxHp: 500 })], fightKind: "monster", turn: 2 };
    const plan = solveTurn(solver).plans.find((entry) => entry.steps.map((step) => step.cardId).join(",") === "THRASH")!;
    expect(plan.outcome.thrashRandom).toEqual([{ index: 0, strength: 0, least: 6 }]);
    const line = rolloutDecision({
      solver,
      plans: [plan],
      enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
      tables: { TEST_DUMMY: WAIT },
      piles: { draw: [], discard: [], handBase: hand },
      meta: META,
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 5, horizon: 2, now: fastClock() },
    }).lines[0]!;
    // Next turn (3 energy) draws the three cards left. The Strike taken: Thrash 2 x (4 + 6) = 20 (the 3-cost 20
    // does not fit after it); the 20 taken: Thrash 2 x 24 = 48 and the Strike 6 = 54. The Defend is always drawn.
    const next = line.perTurn[0]!;
    expect(next.dmg.max).toBe(54);
    expect(next.dmg.min).toBe(20);
  });
});

describe("6. End-of-turn ethereal exhausts: Feel No Pain's Block triggers Juggernaut; Dark Embrace draws (batch E note)", () => {
  const dazed = (i: number) => card(i, "DAZED", { type: "Status", playable: false, target: "none" as CardModel["target"], validTargets: [], cost: -1, ethereal: true });

  it("two Dazed held with Feel No Pain 3 and Juggernaut 5: 10 to the enemy at the end of the turn (a kill at 10 HP)", () => {
    const input = (juggernaut: number): SolverInput => ({
      hand: [dazed(0), dazed(1)],
      player: player({ energy: 0, feelNoPain: 3, juggernaut }),
      enemies: [enemy({ hp: 10, maxHp: 10, attacks: [{ damage: 20, hits: 1 }] })],
      fightKind: "monster",
      turn: 2,
    });
    const end = solveTurn(input(5)).plans[0]!;
    expect(end.outcome.winsFight).toBe(true);
    expect(end.outcome.hpLoss).toBe(0);
    // Without Juggernaut: the 6 Block of the two exhausts meets the 20.
    expect(solveTurn(input(0)).plans[0]!.outcome).toMatchObject({ winsFight: false, hpLoss: 14 });
  });

  it("Dark Embrace: the Dazed exhausted at the end of the turn draws a card the next turn no longer gets", () => {
    const run = (powers: Record<string, number>) => {
      const free = (i: number) => card(i, "STRIKE_IRONCLAD", { name: "打击", damage: 6, damageBase: 6, cost: 0 });
      const solver: SolverInput = { hand: [dazed(0)], player: player({ energy: 0 }), enemies: [enemy({ hp: 500, maxHp: 500 })], fightKind: "monster", turn: 2 };
      return rolloutDecision({
        solver,
        plans: solveTurn(solver).plans,
        enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
        tables: { TEST_DUMMY: WAIT },
        piles: { draw: [10, 11, 12, 13, 14].map(free), discard: [20, 21, 22, 23, 24].map(defend), handBase: [dazed(0)] },
        meta: META,
        playerPowers: powers,
        potions: 0,
        mm: {},
        model: null,
        gates: null,
        options: { budgetMs: 1e9, seed: 9, horizon: 2, now: fastClock() },
      }).lines[0]!;
    };
    // Without it the next turn draws the five free Strikes (30); with it one went to the discard pile first.
    expect(run({}).perTurn[0]!.dmg.min).toBe(30);
    const embrace = run({ DARK_EMBRACE_POWER: 1 }).perTurn[0]!;
    expect(embrace.dmg.mean).toBeLessThan(30);
    expect(embrace.dmg.min).toBe(24);
  });
});

describe("7. A full belt at an event: \"discard, then take it\" in Jev's mode too; enough slots for several potions (YQL8D59999AX F28)", () => {
  type Raw = Record<string, unknown>;
  const keysOf = (decision: AskDecision) => {
    const question = (decision.jevView?.questions ?? decision.questions)["pick"]!;
    return Object.keys(question.type === "choice" ? question.criteria ?? {} : {}).sort();
  };
  const pick = (key: string, discard?: number[]): AnswerSet => ({ pick: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: discard ? { discard } : {} } }) as AnswerSet;

  it("the slots an option needs: its potions less the slots it adds and the empty ones, at most the belt", () => {
    const belt = (occupied: boolean[]) => ({ potions: occupied.map((o, index) => ({ index, occupied: o })) });
    expect(potionSlotsNeeded("获得[blue]1[/blue]瓶随机[gold]罕见药水[/gold]。", belt([true, true]))).toBe(1);
    expect(potionSlotsNeeded("获得[blue]3[/blue]瓶[gold]污浊药水[/gold]。", belt([true, true]))).toBe(2);
    expect(potionSlotsNeeded("获得[blue]3[/blue]瓶[gold]污浊药水[/gold]。", belt([true, false, true]))).toBe(2);
    expect(potionSlotsNeeded("获得[blue]1[/blue]个药水栏位并获得[blue]2[/blue]瓶随机[gold]药水[/gold]。", belt([true, true]))).toBe(1);
    expect(potionSlotsNeeded("获得[blue]1[/blue]瓶随机[gold]罕见药水[/gold]。", belt([true, false]))).toBe(0);
    expect(potionSlotsNeeded("失去[red]13[/red]点最大生命。", belt([true, true]))).toBe(0);
  });

  it("Jev's question (no DeepSeek decider) has the discard options too, and Jev's pick of one takes the option after the discard", () => {
    const fx = logged("yql8-f28-potion-courier");
    const env = loggedEnv(fx);
    const decision = planEvent(env) as AskDecision;
    expect(decision.kind).toBe("ask");
    // Batch G: one variant per option; Jev names the slots in its per-slot questions.
    expect(keysOf(decision)).toEqual(["o0", "o0:discard", "o1", "o1:discard"]);
    const resolved = decision.resolve({ ...pick("o1:discard"), discard_p0: { type: "noul", noul: 0.1, raw: {} }, discard_p1: { type: "noul", noul: 0.9, raw: {} } } as AnswerSet);
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 1 });
    resolved.apply?.();
    ((fx.state["run"] as Raw)["potions"] as Raw[])[1] = { index: 1, occupied: false, can_discard: false };
    expect(planEvent({ ...loggedEnv(fx), screenMemory: env.screenMemory })).toMatchObject({ kind: "act", label: "event/after-discard", intent: { action: "choose_event_option", option_index: 1 } });
  });

  it("three potions into a full two-slot belt: \"discard both\" discards one, then the other, then takes the option", () => {
    const fx = logged("yql8-f28-potion-courier");
    const env = { ...loggedEnv(fx), buildDecider: "deepseek" as const };
    const decision = planEvent(env) as AskDecision;
    const resolved = decision.resolve(pick("o0:discard", [0, 1]));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 0 });
    resolved.apply?.();
    const potions = (fx.state["run"] as Raw)["potions"] as Raw[];
    potions[0] = { index: 0, occupied: false, can_discard: false };
    const second = planEvent({ ...loggedEnv(fx), buildDecider: "deepseek", screenMemory: env.screenMemory });
    expect(second).toMatchObject({ kind: "act", label: "event/discard-more", intent: { action: "discard_potion", option_index: 1 } });
    // Not landed yet: wait.
    expect(planEvent({ ...loggedEnv(fx), buildDecider: "deepseek", screenMemory: env.screenMemory })).toBeNull();
    potions[1] = { index: 1, occupied: false, can_discard: false };
    const take = planEvent({ ...loggedEnv(fx), buildDecider: "deepseek", screenMemory: env.screenMemory });
    expect(take).toMatchObject({ kind: "act", label: "event/after-discard", intent: { action: "choose_event_option", option_index: 0 } });
  });
});

describe("8. Rest-site facts for DeepSeek: a forced Elite within 3 nodes (7KDMKN16GD6B), Pantograph's boss-start heal (5NFGDU7BQPD3 F16)", () => {
  type Raw = Record<string, unknown>;
  const factsOf = (raw: Raw, memory = createScreenMemory("REST")) => {
    const decision = planRest(oneshotEnv(raw, memory, { oneshot: "off" })) as AskDecision;
    expect(decision.kind).toBe("ask");
    return ((decision.state as Record<string, unknown>)["facts"] as Record<string, Record<string, unknown>>)["rest_site"]!;
  };

  it("the rest before the boss with Pantograph: +25 at the boss's start, the entry HP both ways", () => {
    const raw = oneshotBoard("7b0d-f8-rest", "rest");
    const run = raw["run"] as Raw;
    run["floor"] = 16;
    run["current_hp"] = 40;
    run["max_hp"] = 80;
    expect(factsOf(raw)["boss_start_heal"]).toBeUndefined();
    run["relics"] = [...(run["relics"] as unknown[]), { index: 9, relic_id: "PANTOGRAPH", name: "缩放仪" }];
    const facts = factsOf(raw);
    // The board's HEAL text says 26 (its own max HP); the boss is the next floor (no remembered map: the floor rule).
    expect(String(facts["boss_start_heal"])).toBe(
      "Pantograph (缩放仪) heals 25 HP when the boss fight starts (up to max HP), and the next fight after this rest site is the act boss: resting here heals 26 (66/80) and enters the boss at 80/80; smithing (or any option that does not heal) enters it at 65/80. Resting's real heal for the boss: min(26, 80 - 40 - 25) = 15 HP.",
    );
    // Not before the boss: nothing.
    run["floor"] = 8;
    expect(factsOf(raw)["boss_start_heal"]).toBeUndefined();
  });

  it("every path meets an Elite within 3 nodes, no rest or shop before it: said (the code's own heal rule unchanged)", () => {
    const raw = oneshotBoard("7b0d-f8-rest", "rest");
    const run = raw["run"] as Raw;
    const floor = Number(run["floor"]);
    const memory = createScreenMemory("REST");
    const node = (row: number, col: number, type: string, children: [number, number][]) => ({ row, col, type, children: children.map(([r, c]) => ({ row: r, col: c })) });
    memory.lastMap = {
      runId: String(raw["run_id"]),
      floor: floor - 1,
      available: [{ row: 1, col: 0, type: "RestSite" }],
      nodes: [node(1, 0, "RestSite", [[2, 0], [2, 1]]), node(2, 0, "Monster", [[3, 0]]), node(2, 1, "Unknown", [[3, 0]]), node(3, 0, "Elite", [[4, 0]]), node(4, 0, "Monster", [])],
    };
    expect(factsOf(raw, memory)["forced_elite_ahead"]).toBe("every path meets an Elite within 3 nodes, with no rest site or shop before it");
    // A shop on one path: not forced.
    memory.lastMap.nodes[2] = node(2, 1, "Shop", [[3, 0]]);
    expect(factsOf(raw, memory)["forced_elite_ahead"]).toBeUndefined();
  });
});

describe("9b. Unrelenting's free Attack left at the end of the turn stays up into the next (FREE_ATTACK_POWER; 21TKTPL5D4A6 F3)", () => {
  it("the solver reports it; the rollout's next turn plays its 3-cost Attack free", () => {
    const unrelenting = card(0, "UNRELENTING", { cost: 2, damage: 12, damageBase: 12, special: "free_next_attack" });
    const solver: SolverInput = { hand: [unrelenting], player: player({ energy: 2 }), enemies: [enemy({ hp: 500, maxHp: 500 })], fightKind: "monster", turn: 2 };
    const plan = solveTurn(solver).plans.find((entry) => entry.steps.length === 1 && entry.steps[0]!.cardId === "UNRELENTING")!;
    expect(plan.outcome.freeAttacksLeft).toBe(1);
    const heavy = card(10, "HEAVY", { cost: 3, damage: 20, damageBase: 20 });
    const line = rolloutDecision({
      solver,
      plans: [plan],
      enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
      tables: { TEST_DUMMY: WAIT },
      piles: { draw: [heavy, strike(11), strike(12)], discard: [], handBase: [unrelenting] },
      meta: META,
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 2, horizon: 2, handSize: 3, now: fastClock() },
    }).lines[0]!;
    // Free: the 20 for nothing, then both Strikes (32); without the carry, the 20 alone takes the 3 energy.
    expect(line.perTurn[0]!.dmg.min).toBe(32);
  });
});

describe("9c. Eternal Feather: 3 HP for every 5 cards on entering a rest site, in the rest-heal estimates (981ae07/562215f)", () => {
  it("logged: deck 17 +9, 20 +12, 26 +15; a rest ahead heals it too, the rest site we are in already has it", () => {
    expect(restHealOf(["ETERNAL_FEATHER"], 17).enterHeal).toBe(9);
    expect(restHealOf(["ETERNAL_FEATHER"], 20).enterHeal).toBe(12);
    expect(restHealOf(["ETERNAL_FEATHER"], 26).enterHeal).toBe(15);
    expect(restHealOf(["ETERNAL_FEATHER"], 26).sources).toContain("Eternal Feather +15 HP on entering (26 cards)");
    // A later rest at 30/80 with 20 cards: +12 on entering, then 24: 66.
    expect(restedHp(30, 80, restHealOf(["ETERNAL_FEATHER"], 20)).hp).toBe(66);
    expect(restedHp(60, 80, restHealOf(["ETERNAL_FEATHER", "REGAL_PILLOW"], 20)).hp).toBe(80);
    // Without the relic, or on the rest site's own screen (no deck size): nothing more.
    expect(restHealOf(["REGAL_PILLOW"], 20).enterHeal).toBeUndefined();
    expect(restHealHere("", 80, ["ETERNAL_FEATHER"]).rest.enterHeal ?? 0).toBe(0);
  });
});

describe("9d. After a restart mid-turn, the exhaust baseline is the turn's first logged frame, not the first frame seen (0NZBAVFAT3JG F25 T1)", () => {
  it("the journal replay notes the turn's first frame; a card exhausted before the restart still counts (Evil Eye)", () => {
    const first = logged("0nzb-f25-t1-brand");
    const after = logged("0nzb-f25-t1-after-exhaust");
    // A fresh process sees only the frame after the exhaust: its pile is the baseline, nothing counted.
    expect(exhaustedSinceTurnStart(loggedEnv(after))).toBe(false);
    // With the run's logs replayed first (the turn's first frame was logged with its decision):
    const replay = replayRun({ runId: "0NZBAVFAT3JG", states: [{ ts: "2026-09-29T00:00:00.000Z", state: first.state as never }], decisions: [], runPlans: [] }, loggedKnowledge);
    expect(replay.turnStartExhaust).not.toBeNull();
    const env = loggedEnv(after);
    env.screenMemory.turnStartExhaust = replay.turnStartExhaust!;
    expect(exhaustedSinceTurnStart(env)).toBe(true);
  });
});

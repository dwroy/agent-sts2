/**
 * The V4.2/V4.3 A8 windows' queued code bugs (notes/fix-queue-v4.md, the second batch). One describe per fix, each on
 * the logged board of its evidence (tests/logged-states/fix2/, states.jsonl lines as the mod sent them) or the logged
 * numbers written into the test; the knowledge is the fixed test data (tests/logged-states/game-data.json, the fixture
 * monster DB), never the refreshing files; no model call, nothing written under logs/.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { BOSSES, bossLossPerTurn, SAI_BLOCK, turnBlockOf } from "../src/strategy/boss-clock.js";
import { parseGameState } from "../src/mod/schema.js";
import { calibratedWinProb, type FightSampleResult } from "../src/sim/boss-sim.js";
import { bossOpening, syntheticBossState } from "../src/sim/boss-start.js";
import { BUILD_SIM_CALIBRATION_SAMPLES } from "../src/sim/build-sim.js";
import { actBossDefeated, calibratedFloor, withBossSim } from "../src/sim/build-sim-facts.js";
import type { DeckRunRequest, DeckRunResult } from "../src/sim/build-sim-pool.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { modelHandCard, type CardModel } from "../src/strategy/card-model.js";
import { rolloutDecision, type EnemyTable, type FightMeta } from "../src/strategy/rollout.js";
import { relicBlockOf, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { solveTap, solveTurn, type EnemySim, type PlayerSim, type SolveResult, type SolverInput } from "../src/strategy/turn-solver.js";
import type { JsonValue } from "../src/util/json.js";
import { loggedEnv, loggedKnowledge } from "./logged.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { ask, decide, env, setupOneshotTests, type Raw } from "./oneshot-support.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states", "fix2");
/** A fresh copy of one logged state of a fixture file ({ source, states }). */
const fixture = (file: string, key: string): Raw => {
  const raw = JSON.parse(readFileSync(join(DIR, `${file}.json`), "utf8")) as { states: Record<string, Raw> };
  const state = raw.states[key];
  if (!state) throw new Error(`${file} has no state ${key}`);
  return state;
};

setupOneshotTests();
afterEach(() => {
  rolloutLiveOptions.enabled = true;
  solveTap.onSolve = null;
});

/** The solver's input and result for a logged combat board (the live planner, its rollout off). */
function solvedBoard(raw: Raw): { input: SolverInput; result: SolveResult } {
  let captured: { input: SolverInput; result: SolveResult } | null = null;
  solveTap.onSolve = (input, result) => {
    captured ??= { input, result };
  };
  rolloutLiveOptions.enabled = false;
  planCombatTurn(loggedEnv({ source: "", decision: { label: "", decider: "", chosen: null, rationale: "" }, state: raw }));
  if (!captured) throw new Error("the planner did not solve the board");
  return captured;
}

/** A plan's plays as "CARD>target,…" (no target: the card alone). */
const steps = (plan: { steps: { cardId: string; target: number | null }[] }) => plan.steps.map((step) => `${step.cardId}${step.target !== null ? `>${step.target}` : ""}`).join(",");

function card(index: number, cardId: string, over: Partial<CardModel> = {}): CardModel {
  return { index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0], damage: 6, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0, draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...over };
}
const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, ...over });
const dummy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Dummy", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });

describe("1. B3 right after an act boss: no simulation against the boss just killed (build-sim-facts:387)", () => {
  beforeAll(() => setMonsterDbForTests(FIXTURE_DB));
  afterAll(() => setMonsterDbForTests(null));
  /** A runner that records the calls and fails them (a simulation that ran shows up as the error). */
  const counting = () => {
    const calls: DeckRunRequest[] = [];
    return { calls, runner: { run: (request: DeckRunRequest) => (calls.push(request), Promise.reject(new Error("ran"))) } };
  };

  it("7PWU4CD3QCP3 F17 reward (the Ceremonial Beast dead, boss_id still its id): not simulated, said so, the clock kept", async () => {
    const raw = fixture("7pwu-f17-boss-reward", "reward");
    const e = env(raw);
    expect(actBossDefeated(e.state)).toBe(true);
    const before = decide(e);
    const { calls, runner } = counting();
    const { decision, record } = await withBossSim(before, e, { runner, samples: 8, db: FIXTURE_DB, mm: FIXTURE_MM });
    expect(calls).toHaveLength(0);
    expect(record).toMatchObject({ skipped: expect.stringContaining("next act's boss is not known"), boss: "CEREMONIAL_BEAST" });
    const facts = ask(decision).state["facts"] as Record<string, JsonValue>;
    const was = ask(before).state["facts"] as Record<string, JsonValue>;
    expect(String(facts["act_boss_sim"])).toContain("本幕 boss 已经打完");
    expect(facts["act_boss_clock"]).toEqual(was["act_boss_clock"]);
    // No option carries a boss_sim line, the instructions are as they were.
    const pick = ask(decision).questions["pick"];
    const pickBefore = ask(before).questions["pick"];
    expect(pick?.type === "choice" && pickBefore?.type === "choice" && pick.criteria).toEqual(pickBefore?.type === "choice" && pickBefore.criteria);
    expect(pick?.type === "choice" && pick.instructions).toBe(pickBefore?.type === "choice" && pickBefore.instructions);
  });

  it("the same board before the boss floor, or on the next act's first map (act_id moved on) still simulates", async () => {
    const earlier = fixture("7pwu-f17-boss-reward", "reward");
    (earlier["run"] as Raw)["floor"] = 16;
    // A boss the fixture monster DB has (it has no Ceremonial Beast), so the simulation gets as far as the runner.
    (earlier["run"] as Raw)["boss_id"] = "SOUL_FYSH_BOSS";
    expect(actBossDefeated(parseGameState(earlier))).toBe(false);
    const nextAct = fixture("7pwu-f17-boss-reward", "reward");
    (nextAct["run"] as Raw)["act_id"] = "1";
    expect(actBossDefeated(parseGameState(nextAct))).toBe(false);
    const inFight = fixture("7pwu-f17-boss-reward", "reward");
    inFight["in_combat"] = true;
    expect(actBossDefeated(parseGameState(inFight))).toBe(false);
    const e = env(earlier);
    const { calls, runner } = counting();
    const { record } = await withBossSim(decide(e), e, { runner, samples: 8, db: FIXTURE_DB, mm: FIXTURE_MM });
    expect(calls.length).toBeGreaterThan(0);
    expect(record).toMatchObject({ error: expect.stringContaining("ran") });
  });
});

describe("2. the low-win-rate note's floor is the calibration's, not a written number (build-sim-facts:458)", () => {
  beforeAll(() => setMonsterDbForTests(FIXTURE_DB));
  afterAll(() => setMonsterDbForTests(null));
  /** Every sample of every deck lost (the Crab / Test Subject questions of V4.2 sat at the floor on every option). */
  const lost = (): FightSampleResult => ({ won: false, died: true, capped: false, timeUp: false, turns: 5, hpLoss: 60, revived: 0, drunk: [], enemyHpLeft: 120, lossByTurn: [], dmgByTurn: [], incomingByTurn: [], enemyLossByTurn: [], policyTurns: 5, policyNodes: 0 });
  const losing = { run: (req: DeckRunRequest): Promise<DeckRunResult> => Promise.resolve({ outcomes: req.decks.map(() => req.orders.map(() => Array.from({ length: req.samples }, lost))), complete: Array.from({ length: req.samples }, (_, i) => i), timedOut: false, elapsedMs: 1, workers: 0 }) };

  it("0 wins read the map's floor (4.7% with the B5 \"pre\" map; the note said 约 8%, V4.2's live floor was 6.24%)", async () => {
    expect(calibratedFloor()).toBe(calibratedWinProb(0, BUILD_SIM_CALIBRATION_SAMPLES, "pre"));
    const raw = fixture("7pwu-f17-boss-reward", "reward");
    (raw["run"] as Raw)["floor"] = 16;
    (raw["run"] as Raw)["boss_id"] = "SOUL_FYSH_BOSS";
    const e = env(raw);
    const { decision, record } = await withBossSim(decide(e), e, { runner: losing, samples: 8, db: FIXTURE_DB, mm: FIXTURE_MM });
    const sim = (ask(decision).state["facts"] as Record<string, JsonValue>)["act_boss_sim"] as Record<string, JsonValue>;
    const floor = `${(calibratedFloor() * 100).toFixed(1)}%`;
    expect(String(sim["low_win_rate"])).toContain(`校准后的数不会低于 ${floor}`);
    expect(String(sim["low_win_rate"])).not.toContain("约 8%");
    // What the options read at 0 wins is that same floor.
    expect((record as Record<string, Record<string, number>>)["base"]!["win_cal"]).toBeCloseTo(calibratedFloor(), 4);
  });
});

describe("3. Pen Nib doubles the next Attack only, not every Attack shown (card-model dyn :182-190)", () => {
  it("GSG0Q5KP9AAU F33 T2 (stack 9, hand shown doubled): halved in the hand, the logged line deals 53, not 86", () => {
    const { input, result } = solvedBoard(fixture("gsg0-f33-t2-pen-nib", "t2"));
    expect(input.player.penNib).toBe(9);
    // Shown 20 / 22 / 40 / 40 / 22 (Strength 2, Strike Dummy +3, doubled): the game's single numbers.
    const shown = Object.fromEntries(input.hand.filter((c) => c.type === "Attack").map((c) => [c.cardId, c.damage]));
    expect(shown).toEqual({ DISMANTLE: 10, STRIKE_IRONCLAD: 11, CINDER: 20, HOWL_FROM_BEYOND: 20, BREAKTHROUGH: 11 });
    // Jev's logged pick, the Rocket at index 1: Dismantle 20 (the 10th, doubled), Strike 11, Breakthrough 11 to each.
    const line = result.plans.find((plan) => steps(plan) === "DISMANTLE>1,STRIKE_IRONCLAD>1,BREAKTHROUGH");
    expect(line?.outcome.damageDealt).toBe(53);
    expect(line?.outcome.attackPlays).toBe(3);
  });

  it("the doubled play is the one the count reaches: at 7 the third Attack this turn (the mod shows no doubling yet)", () => {
    const hand = [card(0, "STRIKE_A"), card(1, "STRIKE_B"), card(2, "BIG", { damage: 20 })];
    const solved = solveTurn({ hand, player: player({ penNib: 7 }), enemies: [dummy()], fightKind: "monster" });
    const big = (order: string) => solved.plans.find((plan) => steps(plan) === order)?.outcome.damageDealt;
    // Strike, Strike, Big: Big is the 10th (6 + 6 + 40); Big first: the second Strike is (20 + 6 + 12).
    expect(big("STRIKE_A>0,STRIKE_B>0,BIG>0") ?? big("STRIKE_B>0,STRIKE_A>0,BIG>0")).toBe(52);
    expect(solved.plans[0]!.outcome.damageDealt).toBe(52);
    // No Pen Nib: no doubling.
    expect(solveTurn({ hand, player: player(), enemies: [dummy()], fightKind: "monster" }).plans[0]!.outcome.damageDealt).toBe(32);
  });

  it("the rollout carries the count into the next turn (a Strike the 9th now, the next turn's the 10th)", () => {
    const strike = card(0, "STRIKE_IRONCLAD", { damageBase: 6 });
    const solver: SolverInput = { hand: [strike], player: player({ energy: 1, penNib: 8 }), enemies: [dummy({ hp: 18, maxHp: 18 })], fightKind: "monster", turn: 1 };
    const table: EnemyTable = { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } };
    const meta: FightMeta = { act: 1, t: 1, asc: 8, kind: "hallway", enc: "TEST_DUMMY", deck: { n: 2, atk: 2, skl: 0, pow: 0, junk: 0, dmg: 10, blk: 0, up: 0 }, relics: 0, max_en: 1 };
    const run = (penNib: number) => {
      const input = { ...solver, player: player({ energy: 1, penNib }) };
      const result = rolloutDecision({
        solver: input,
        plans: solveTurn(input).plans,
        enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
        tables: { TEST_DUMMY: table },
        piles: { draw: [card(1, "STRIKE_IRONCLAD", { damageBase: 6 })], discard: [], handBase: [strike] },
        meta,
        playerPowers: {},
        potions: 0,
        mm: {},
        model: null,
        gates: null,
        options: { budgetMs: 1e9, seed: 3, horizon: 3, samples: 2, now: (() => { let t = 0; return () => (t += 0.01); })() },
      });
      return result.lines.find((entry) => steps(entry.plan) === "STRIKE_IRONCLAD>0");
    };
    // 6 now, 12 next turn: 18, dead on turn 2 (counted from 8 again next turn, the count not carried, it lives at 6
    // and the third Strike kills it). From 7 the 10th is the third Strike: turn 3 too.
    expect(run(8)?.turnsToWin).toBe(2);
    expect(run(7)?.turnsToWin).toBe(3);
  });
});

describe("4. a card a power's hook locks is not playable for want of energy (card-model :595, Chains of Binding)", () => {
  it("4JGPCH3WX6JV F48 T2 at 0 energy: the Soulbound Rupture and Defend+ (preventer CHAINS_OF_BINDING_POWER) are locked; no Energy Potion for them", () => {
    const raw = fixture("4jgp-f48-t2-chains", "t2_zero");
    const hand = ((raw["combat"] as Raw)["hand"] as Raw[]).map((entry, i) => modelHandCard(entry, i, loggedKnowledge));
    expect(hand.map((card) => [card.cardId, card.playable])).toEqual([["RUPTURE", false], ["DEFEND_IRONCLAD", false]]);
    const { result } = solvedBoard(raw);
    // Logged pick: "potion 能量药水, 防御+" (plan 2/3); after the drink both read blocked_by_hook and the turn ended.
    expect(result.plans.some((plan) => plan.steps.some((step) => step.cardId === "DEFEND_IRONCLAD" || step.cardId === "RUPTURE"))).toBe(false);
    expect(result.plans.some((plan) => plan.steps.length > 1 && plan.steps.some((step) => step.cardId.includes("ENERGY_POTION")))).toBe(false);
    // After the drink the mod says so itself (blocked_by_hook): locked either way.
    const after = ((fixture("4jgp-f48-t2-chains", "t2_after_drink")["combat"] as Raw)["hand"] as Raw[]).map((entry, i) => modelHandCard(entry, i, loggedKnowledge));
    expect(after.every((card) => !card.playable)).toBe(true);
  });

  it("a card only short of energy stays in the search (energy gained this turn can pay for it)", () => {
    const raw = fixture("4jgp-f48-t2-chains", "t2_zero");
    const entry = { ...((raw["combat"] as Raw)["hand"] as Raw[])[1]!, unplayable_reason_raw: "EnergyCostTooHigh", unplayable_preventer_id: null, unplayable_preventer_type: null };
    expect(modelHandCard(entry, 1, loggedKnowledge).playable).toBe(true);
  });
});

describe("8. an X-cost Attack hitting X times hits X times (Skewer at 0 energy after Unrelenting+)", () => {
  it("ZRYR5WLG6E9K F39 T1: Skewer is X hits; the logged line deals 58 as it did (planned 70: one 8 x1.5 hit at X = 0)", () => {
    const raw = fixture("zryr-f39-t1-skewer", "t1");
    const skewer = ((raw["combat"] as Raw)["hand"] as Raw[]).find((entry) => entry["card_id"] === "SKEWER")!;
    const model = modelHandCard(skewer, 5, loggedKnowledge);
    expect([model.xCost, model.special, model.hits, model.damage]).toEqual([true, "whirlwind", 0, 8]);
    const { result } = solvedBoard(raw);
    // Unrelenting+ 20, Bash+ 10 (free), Molten Fist 10 x1.5, Strike 9 x1.5: 58, Skewer at 0 energy adding nothing; no
    // line from that start reads more (the logged plan with Skewer read 70).
    expect(result.plans.find((plan) => steps(plan) === "UNRELENTING>0,BASH>0,MOLTEN_FIST>0,STRIKE_IRONCLAD>0")?.outcome.damageDealt).toBe(58);
    expect(Math.max(...result.plans.filter((plan) => steps(plan).startsWith("UNRELENTING>0,BASH>0,MOLTEN_FIST>0")).map((plan) => plan.outcome.damageDealt))).toBe(58);
    // Skewer with energy left is X hits: at 3 energy alone, 3 x 8.
    const alone = solveTurn({ hand: [model], player: player(), enemies: [dummy()], fightKind: "monster" }).plans.find((plan) => steps(plan) === "SKEWER>0");
    expect(alone?.outcome.damageDealt).toBe(24);
  });
});

describe("6. Sai's 7 block every turn in the rollout, the boss sim and the boss clock (rollout-live relicBlockOf)", () => {
  const run = (): Raw => fixture("8d8d-f48-t1-sai", "t1")["run"] as Raw;
  const relicIds = (raw: Raw) => (raw["relics"] as Raw[]).map((relic) => String(relic["relic_id"]));

  it("8D8DZ9K680C2 F48 (the Queen): Sai's block on every turn from the logged relics; Captain's Wheel's turn 3 as before", () => {
    const block = relicBlockOf(run());
    expect(block.filter((b) => b.turn === 1)).toEqual([{ amount: SAI_BLOCK, turn: 1 }]);
    expect(block.filter((b) => b.amount === SAI_BLOCK).map((b) => b.turn)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    const wheel = { relics: [{ relic_id: "CAPTAINS_WHEEL" }] };
    expect(relicBlockOf(wheel)).toEqual([{ amount: 18, turn: 3 }]);
    expect(turnBlockOf(relicIds(run()))).toBe(7);
  });

  it("the whole-fight boss sim's turn 1 has it, and it is no longer listed as a relic the fight does not model", () => {
    const state = parseGameState(fixture("8d8d-f48-t1-sai", "t1"));
    // A boss the fixture monster DB has; the run's relics are the logged ones (no Anchor or other turn-1 block).
    const opening = bossOpening("SOUL_FYSH_BOSS", 8, FIXTURE_DB)!;
    const synth = syntheticBossState(state, loggedKnowledge, opening, 80, FIXTURE_DB, FIXTURE_MM);
    expect(((synth.state.raw["combat"] as Raw)["player"] as Raw)["block"]).toBe(SAI_BLOCK);
    expect(synth.relics.unmodelled).not.toContain("钗");
  });

  it("the rollout's later turns start with it: an enemy hitting 10 a turn costs 3 a turn, not 10", () => {
    const table: EnemyTable = { moves: { HIT: { damage: 10, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
    const meta: FightMeta = { act: 3, t: 1, asc: 8, kind: "boss", enc: "TEST_DUMMY", deck: { n: 1, atk: 0, skl: 1, pow: 0, junk: 0, dmg: 0, blk: 0, up: 0 }, relics: 0, max_en: 3 };
    const solver: SolverInput = { hand: [], player: player({ hp: 60, block: 7 }), enemies: [dummy({ hp: 500, maxHp: 500, attacks: [{ damage: 10, hits: 1 }] })], fightKind: "boss", turn: 1 };
    const lossWith = (relicBlock: { amount: number; turn: number }[]) =>
      rolloutDecision({
        solver,
        plans: solveTurn(solver).plans,
        enemies: [{ index: 0, id: "TEST_DUMMY", move: "HIT", strength: 0, powers: {} }],
        tables: { TEST_DUMMY: table },
        piles: { draw: [], discard: [], handBase: [] },
        meta,
        playerPowers: {},
        potions: 0,
        mm: {},
        model: null,
        gates: null,
        ...(relicBlock.length > 0 ? { relicBlock } : {}),
        options: { budgetMs: 1e9, seed: 3, horizon: 3, samples: 2, now: (() => { let t = 0; return () => (t += 0.01); })() },
      }).lines[0]!;
    // The decision turn has its 7 already (the state's block): 3 lost; each later turn another 3 with Sai, 10 without.
    const withSai = lossWith(relicBlockOf(run()));
    const without = lossWith([]);
    expect(withSai.perTurn.map((t) => t.loss.mean)).toEqual([3, 3]);
    expect(without.perTurn.map((t) => t.loss.mean)).toEqual([10, 10]);
  });

  it("the boss clock's HP loss a turn takes Sai's block off each attacking turn", () => {
    setMonsterDbForTests(FIXTURE_DB);
    try {
      const fysh = { ...BOSSES["SOUL_FYSH"]!, id: "SOUL_FYSH" };
      const plain = bossLossPerTurn(fysh, 8);
      const sai = bossLossPerTurn(fysh, 8, SAI_BLOCK);
      expect(sai.value).toBeLessThan(plain.value);
      expect(sai.value).toBeGreaterThanOrEqual(Math.max(0, plain.value - SAI_BLOCK) - 0.1);
      expect(sai.source).toMatch(/less 7 block a turn from Sai/);
      expect(bossLossPerTurn(fysh, 8, 0)).toEqual(plain);
    } finally {
      setMonsterDbForTests(null);
    }
  });
});

/**
 * Shrink on us (SHRINK_POWER, the act 1 Shrinker Beetle's: 「这个生物的攻击伤害减少30%」), A9 runs 13-15. The flag never came
 * on (combat-plan read `> 0`; on us the power is always -1), so the solver counted the hand's numbers (already shrunk by
 * the game) as they were and this turn's Strength, Body Slam and drawn cards at full; the rollout's later turns kept the
 * Shrink after the beetle died. Logged boards (tests/logged-states/shrink/, states.jsonl lines as the mod sent them) and
 * the fixed test data (tests/logged-states/game-data.json); no model call, nothing written under logs/.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { modelPotion, ourAttackScaled } from "../src/reflex/card-model.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { replaySteps, solveTap, type Plan, type SolveResult, type SolverInput, type Step } from "../src/reflex/turn-solver.js";
import { logged, loggedEnv } from "./logged.js";

type Raw = Record<string, unknown>;
const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states", "shrink");
/** A fresh copy of one logged state of a fixture file ({ source, states }). */
const fixture = (file: string, key: string): Raw => {
  const raw = JSON.parse(readFileSync(join(DIR, `${file}.json`), "utf8")) as { states: Record<string, Raw> };
  const state = raw.states[key];
  if (!state) throw new Error(`${file} has no state ${key}`);
  return state;
};
const env = (state: Raw) => loggedEnv({ source: "", decision: { label: "", decider: "", chosen: null, rationale: "" }, state });

afterEach(() => {
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = null;
  potionMcOptions.now = null;
  solveTap.onSolve = null;
});

/** The solver's input and result for a logged combat board (the live planner, its rollout off). */
function solvedBoard(raw: Raw): { input: SolverInput; result: SolveResult } {
  let captured: { input: SolverInput; result: SolveResult } | null = null;
  solveTap.onSolve = (input, result) => {
    captured ??= { input, result };
  };
  rolloutLiveOptions.enabled = false;
  planCombatTurn(env(raw));
  if (!captured) throw new Error("the planner did not solve the board");
  return captured;
}

/** These plays ("CARD>target,…", a potion as POTION:ID) on the solver input, as the solver scores them. */
function lineOf(input: SolverInput, key: string): Plan {
  const used = new Set<number>();
  const steps: Step[] = key.split(",").map((part) => {
    const [id, target] = part.split(">");
    const card = input.hand.find((entry) => !used.has(entry.index) && (entry.cardId === id || entry.cardId.startsWith(`${id}:`)));
    if (!card) throw new Error(`no ${id} in hand`);
    used.add(card.index);
    return { cardIndex: card.index, cardId: card.cardId, upgraded: card.upgraded, name: card.name, target: target === undefined ? null : Number(target), targetName: null };
  });
  const plan = replaySteps(input, steps);
  if (!plan) throw new Error(`${key} cannot be played`);
  return plan;
}
const hpAfter = (plan: Plan) => plan.outcome.enemyHpAfter.map((enemy) => [enemy.index, enemy.hp]);
const BEETLE = "缩小甲虫";

describe("1. our Shrink is read (SHRINK_POWER -1), the hand's numbers are marked as carrying it, the beetle as its source", () => {
  it("XC4TNGZU4KT9 F9 T3: shrunk, every damage card in hand marked (Strike 6 shown 4), the beetle shrinksUs", () => {
    const { input } = solvedBoard(fixture("xc4t-f9-t3-shrink", "t3"));
    expect(input.player.shrunk).toBe(true);
    const marked = input.hand.filter((card) => card.type !== "Potion" && card.damage !== null);
    expect(marked.map((card) => [card.cardId, card.damage, card.damageBase, card.shownShrunk])).toEqual([
      ["FIGHT_ME", 3, 5, true],
      ["BASH", 5, 8, true],
      ["SETUP_STRIKE", 4, 7, true],
      ["STRIKE_IRONCLAD", 4, 6, true],
    ]);
    expect(input.hand.find((card) => card.cardId === "STOKE")?.shownShrunk).toBeUndefined();
    expect(input.enemies.map((enemy) => [enemy.index, enemy.shrinksUs === true])).toEqual([
      [0, true],
      [1, false],
    ]);
  });

  it("the game's rounding: Weak and Shrink multiplied, rounded once; ×7/10 so 90 shrinks to 63", () => {
    expect(Math.floor(ourAttackScaled(90, false, true))).toBe(63);
    // The Magi Knight's 6 under Weak and Beetle Juice shown 3 (WY41FADPAGTW F42 T1), not floor(floor(4.5) × 0.7) = 2.
    expect(Math.floor(ourAttackScaled(6, true, true))).toBe(3);
    expect(ourAttackScaled(7, true, false)).toBe(5.25);
    expect(ourAttackScaled(7, false, false)).toBe(7);
  });
});

describe("2. XC4TNGZU4KT9 F9 T3: the logged line deals 14 and leaves the beetle at 2, as the game did (planned 16, a kill)", () => {
  it("Setup Strike > beetle, Fight Me > beetle, Weak Potion > Wurm: 4 + 2 x floor((5 + 3) x 0.7) = 14, beetle 16 -> 2, 24 lost (logged 33 -> 9)", () => {
    const { input, result } = solvedBoard(fixture("xc4t-f9-t3-shrink", "t3"));
    const plan = lineOf(input, "SETUP_STRIKE>0,FIGHT_ME>0,POTION:WEAK_POTION>1");
    expect(plan.outcome.damageDealt).toBe(14);
    expect(plan.outcome.kills).toEqual([]);
    expect(hpAfter(plan)).toEqual([
      [0, 2],
      [1, 58],
    ]);
    // The beetle's Stomp 14 + Fight Me's 1 Strength, the Wurm's 13 under the potion's Weak: 15 + 9.
    expect(plan.outcome.hpLoss).toBe(24);
    // No line kills the beetle this turn (14 is the most it can take): none says it does.
    expect(result.plans.some((entry) => entry.outcome.kills.includes(BEETLE))).toBe(false);
  });

  it("into Vulnerable it rounds once from the base: Bash 5, then Setup Strike floor(7 x 0.7 x 1.5) = 7 (not floor(4 x 1.5) = 6)", () => {
    const { input } = solvedBoard(fixture("xc4t-f9-t3-shrink", "t3"));
    // Logged under Shrink: Bash 8 shown 5 into Vulnerable dealt 8 (4V5T F2 T5), Strike 6 + Strength 2 shown 5 dealt 8.
    expect(lineOf(input, "BASH>0,SETUP_STRIKE>0").outcome.damageDealt).toBe(5 + 7);
    expect(lineOf(input, "BASH>0,STRIKE_IRONCLAD>0").outcome.damageDealt).toBe(5 + 6);
  });

  it("a potion is not an attack: Fire Potion hits the Wurm for its 20 while we are Shrunk", () => {
    const { input } = solvedBoard(fixture("xc4t-f9-t3-shrink", "t3"));
    const fire = modelPotion("FIRE_POTION", "Fire Potion", 1, [0, 1])!;
    const plan = lineOf({ ...input, hand: [...input.hand, { ...fire, index: 950, key: "fire" }] }, "POTION:FIRE_POTION>1");
    expect(plan.outcome.damageDealt).toBe(20);
  });
});

describe("3. the beetle killed mid-turn takes our Shrink with it (XC4TNGZU4KT9 F9 T4: the Strikes after Anger hit the Wurm for 9)", () => {
  it("Anger kills the beetle at 2, then each Strike is 6 + 3 Strength unshrunk: Wurm 58 -> 49 -> 40 (logged), 4 lost (logged 9 -> 5)", () => {
    const { input } = solvedBoard(fixture("xc4t-f9-t3-shrink", "t4"));
    expect(input.player).toMatchObject({ shrunk: true, strengthNow: 3 });
    const plan = lineOf(input, "ANGER>0,STRIKE_IRONCLAD>1,STRIKE_IRONCLAD>1,DEFEND_IRONCLAD");
    expect(plan.outcome.kills).toEqual([BEETLE]);
    expect(hpAfter(plan)).toEqual([
      [0, 0],
      [1, 40],
    ]);
    expect(plan.outcome.damageDealt).toBe(2 + 9 + 9);
    expect(plan.outcome.hpLoss).toBe(4);
    // With the beetle alive the same Strikes are shrunk: floor(9 x 0.7) = 6 each.
    expect(hpAfter(lineOf(input, "STRIKE_IRONCLAD>1,STRIKE_IRONCLAD>1"))).toEqual([
      [0, 2],
      [1, 46],
    ]);
  });

  it("a card's own hits keep the number it was played with: Breakthrough kills the beetle and still hits the Wurm shrunk (TYZH5GB5N2UL F15 T3)", () => {
    const { input } = solvedBoard(fixture("tyzh-f15-t3-inflame", "t3"));
    expect(hpAfter(lineOf(input, "INFLAME,BREAKTHROUGH"))[1]).toEqual([1, 32]);
  });
});

describe("4. Strength gained this turn while Shrunk is shrunk with the card, rounded once", () => {
  it("TYZH5GB5N2UL F15 T3: Inflame (+3), Breakthrough (9) to all: Wurm 46 -> 32 = 8 + Inferno 6, beetle (Vulnerable 2) 18 -> 0 = 12 + 6 (logged)", () => {
    const { input } = solvedBoard(fixture("tyzh-f15-t3-inflame", "t3"));
    expect(input.player).toMatchObject({ shrunk: true, strengthNow: 0, inferno: 6 });
    const plan = lineOf(input, "INFLAME,BREAKTHROUGH");
    expect(hpAfter(plan)).toEqual([
      [0, 0],
      [1, 32],
    ]);
    expect(plan.outcome.kills).toEqual([BEETLE]);
    // Inferno is not an attack: 6 to each (the Wurm's 14 = 8 + 6, not 8 + 4).
    expect(plan.outcome.damageDealt).toBe(18 + 14);
    // Logged: 54 -> 48 by the next turn.
    expect(plan.outcome.hpLoss).toBe(6);
  });

  it("UBLVBA0D1QXD F15 T3: Flex Potion (+5), Uppercut (13) > beetle 20 -> 8 = floor(18 x 0.7) (logged), Molten Fist kills it", () => {
    const { input } = solvedBoard(fixture("ublv-f15-t3-flex", "t3"));
    expect(hpAfter(lineOf(input, "POTION:FLEX_POTION,UPPERCUT>0"))[0]).toEqual([0, 8]);
    const plan = lineOf(input, "POTION:FLEX_POTION,UPPERCUT>0,MOLTEN_FIST>0");
    expect(plan.outcome.kills).toEqual([BEETLE]);
    expect(plan.outcome.damageDealt).toBe(20);
    // Logged: 52 -> 47 by the next turn (the Wurm alone).
    expect(plan.outcome.hpLoss).toBe(5);
  });
});

describe("5. Weak and Shrink both on us (the XC4T T3 board with Weak 1 added, its hand as the game shows it: floor(base x 0.75 x 0.7))", () => {
  /** The logged board with WEAK_POWER 1 on us and each Damage number Weak and Shrink, rounded once. */
  function weakBoard(): Raw {
    const raw = fixture("xc4t-f9-t3-shrink", "t3");
    const combat = raw["combat"] as Raw;
    const player = combat["player"] as Raw;
    player["powers"] = [...(player["powers"] as Raw[]), { index: 1, power_id: "WEAK_POWER", name: "虚弱", amount: 1, is_debuff: true }];
    for (const card of combat["hand"] as Raw[]) {
      for (const value of (card["dynamic_values"] ?? []) as Raw[]) {
        if (value["name"] === "Damage") value["current_value"] = Math.floor(ourAttackScaled(value["base_value"] as number, true, true));
      }
    }
    return raw;
  }

  it("the hand reads Strike 3, Setup Strike 3, Fight Me 2, Bash 4; Setup Strike's +3 then Strike: floor(9 x 0.525) = 4, not 3 + 2.1 -> 5", () => {
    const { input } = solvedBoard(weakBoard());
    expect(input.player).toMatchObject({ shrunk: true, weak: true });
    expect(input.hand.filter((card) => card.damage !== null && card.type !== "Potion").map((card) => [card.cardId, card.damage])).toEqual([
      ["FIGHT_ME", 2],
      ["BASH", 4],
      ["SETUP_STRIKE", 3],
      ["STRIKE_IRONCLAD", 3],
    ]);
    expect(lineOf(input, "SETUP_STRIKE>1,STRIKE_IRONCLAD>1").outcome.damageDealt).toBe(3 + 4);
    expect(lineOf(input, "SETUP_STRIKE>1,FIGHT_ME>1").outcome.damageDealt).toBe(3 + 2 * 4);
  });

  it("into Vulnerable: Bash 4, then Setup Strike floor(7 x 0.75 x 0.7 x 1.5) = 5 (not floor(3 x 1.5) = 4)", () => {
    const { input } = solvedBoard(weakBoard());
    expect(lineOf(input, "BASH>0,SETUP_STRIKE>0").outcome.damageDealt).toBe(4 + 5);
  });
});

describe("6. the rollout's later turns: shrunk once while the beetle lives, not at all after it dies", () => {
  /** Every solve of one planner decision with the rollout on (clocks frozen: the samples run to the end). */
  function allSolves(raw: Raw): { input: SolverInput; result: SolveResult }[] {
    const all: { input: SolverInput; result: SolveResult }[] = [];
    solveTap.onSolve = (input, result) => {
      all.push({ input, result });
    };
    rolloutLiveOptions.enabled = true;
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    planCombatTurn(env(raw));
    return all;
  }

  it("XC4T F9 T3: a later turn with the beetle alive is shrunk, its hand from the pile at base (unmarked): a Strike hits it for 4, not 2", () => {
    const solves = allSolves(fixture("xc4t-f9-t3-shrink", "t3"));
    const later = solves.filter(({ input }) => (input.turn ?? 0) > 3);
    expect(later.length).toBeGreaterThan(0);
    for (const { input } of later) {
      const beetle = input.enemies.find((enemy) => enemy.shrinksUs);
      expect(input.player.shrunk === true).toBe(beetle !== undefined && beetle.hp > 0);
    }
    const alive = later.find(({ input }) => input.player.shrunk && input.hand.some((card) => card.cardId === "STRIKE_IRONCLAD") && input.enemies.some((enemy) => enemy.shrinksUs && enemy.vulnerable === 0 && enemy.block === 0 && enemy.hp > 4));
    expect(alive).toBeDefined();
    const { input } = alive!;
    const strike = input.hand.find((card) => card.cardId === "STRIKE_IRONCLAD")!;
    expect(strike.shownShrunk).toBeUndefined();
    expect(strike.damage).toBe(6 + (input.player.strengthNow ?? 0));
    const beetle = input.enemies.find((enemy) => enemy.shrinksUs)!;
    expect(lineOf(input, `STRIKE_IRONCLAD>${beetle.index}`).outcome.damageDealt).toBe(Math.floor(((6 + (input.player.strengthNow ?? 0)) * 7) / 10));
  });

  it("XC4T F9 T4: Anger kills the beetle in every line, so every later turn is unshrunk (it stayed Shrunk for the fight before)", () => {
    const solves = allSolves(fixture("xc4t-f9-t3-shrink", "t4"));
    const later = solves.filter(({ input }) => (input.turn ?? 0) > 4);
    expect(later.length).toBeGreaterThan(0);
    expect(later.every(({ input }) => input.player.shrunk === false)).toBe(true);
  });
});

describe("7. no Shrink: the solver's plans are byte for byte those of v4 55e57d8", () => {
  // sha256 of JSON.stringify(every solve's plans) for one planner decision, rollout off (computed at 55e57d8 on the same
  // boards; CAPTURE=1 prints them). Weak with Strength (KYC0, V1MF), Weak with Howl from Beyond (G8YY), Inflame (77UJ).
  const GOLDEN: Record<string, string> = {
    "kyc0-f28-t2-decimillipede": "f955db4c8e88366fc51cb8625e804a25",
    "77uj-f33-t5": "7118df40cd12cae0ade24b94e4b6e2b1",
    "g8yy-f30-t2": "4385dc22db2d65213a6a286d18a8e44a",
    "v1mf-f33-t4": "10a2498801c901bce445df98236bdfa0",
  };

  it("four logged boards with Weak, Strength or Howl from Beyond", () => {
    const got: Record<string, string> = {};
    for (const name of Object.keys(GOLDEN)) {
      const plans: Plan[][] = [];
      solveTap.onSolve = (_input, result) => {
        plans.push(result.plans);
      };
      rolloutLiveOptions.enabled = false;
      planCombatTurn(loggedEnv(logged(name)));
      got[name] = createHash("sha256").update(JSON.stringify(plans)).digest("hex").slice(0, 32);
    }
    if (process.env["CAPTURE"] === "1") console.log(got);
    expect(got).toEqual(GOLDEN);
  });
});

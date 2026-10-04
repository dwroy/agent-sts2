/**
 * Fix batch D (notes/fix-queue.md, "From batch C … not fixed"): pure bugs in combat modelling. One describe
 * per fix; boards are synthetic or logged fixtures (tests/logged-states), never the refreshing knowledge files.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { AskDecision } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { solveTurn, type EnemySim, type Plan, type PlayerSim } from "../src/reflex/turn-solver.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";

type Raw = Record<string, unknown>;

afterEach(() => {
  rolloutLiveOptions.enabled = true;
});

/** A hand card as the mod sends it (the card's type and target come from the game data fixture). */
const handCard = (index: number, cardId: string, cost: number, vars: Record<string, number>, over: Raw = {}) =>
  modelHandCard(
    {
      index,
      card_id: cardId,
      name: cardId,
      upgraded: false,
      energy_cost: cost,
      playable: true,
      target_type: loggedKnowledge.card(cardId)?.target ?? "",
      requires_target: loggedKnowledge.card(cardId)?.target === "AnyEnemy",
      valid_target_indices: loggedKnowledge.card(cardId)?.target === "AnyEnemy" ? [0] : [],
      dynamic_values: Object.entries(vars).map(([name, value]) => ({ name, base_value: value, current_value: value })),
      ...over,
    },
    index,
    loggedKnowledge,
  );
const player = (energy: number): PlayerSim => ({ hp: 50, maxHp: 80, block: 0, energy, weak: false, vulnerable: false, intangible: false, strengthNow: 0 });
const worm = (hp: number): EnemySim => ({ index: 0, name: "Jaw Worm", hp, maxHp: 44, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 10, hits: 1 }] });
const ids = (plan: Plan | undefined): string[] => (plan?.steps ?? []).map((step) => step.cardId);

describe("One-Two Punch and Unrelenting in hand (only their powers were read, once played)", () => {
  it("One-Two Punch doubles the next Attack: One-Two Punch, Strike kills a 12-HP worm (was a 5-point unknown, Strike single)", () => {
    const punch = handCard(0, "ONE_TWO_PUNCH", 1, { Attacks: 1 });
    expect(punch).toMatchObject({ special: "double_next_attacks", nextAttacks: 1, known: true, flatValue: 0 });
    const solved = solveTurn({ hand: [punch, handCard(1, "STRIKE_IRONCLAD", 1, { Damage: 6 })], player: player(2), enemies: [worm(12)], fightKind: "monster" });
    expect(ids(solved.plans[0])).toEqual(["ONE_TWO_PUNCH", "STRIKE_IRONCLAD"]);
    expect(solved.plans[0]!.outcome).toMatchObject({ winsFight: true, damageDealt: 12 });
  });

  it("One-Two Punch+ (Attacks 2) doubles the next two Attacks", () => {
    const punch = handCard(0, "ONE_TWO_PUNCH", 1, { Attacks: 2 }, { upgraded: true });
    const solved = solveTurn({ hand: [punch, handCard(1, "STRIKE_IRONCLAD", 1, { Damage: 6 }), handCard(2, "STRIKE_IRONCLAD", 1, { Damage: 6 })], player: player(3), enemies: [worm(24)], fightKind: "monster" });
    expect(solved.plans[0]!.outcome).toMatchObject({ winsFight: true, damageDealt: 24 });
  });

  it("Unrelenting makes the next Attack free: Unrelenting then Bash on 2 energy (was: Bash unaffordable after it)", () => {
    const unrelenting = handCard(0, "UNRELENTING", 2, { Damage: 14 });
    expect(unrelenting.special).toBe("free_next_attack");
    const solved = solveTurn({ hand: [unrelenting, handCard(1, "BASH", 2, { Damage: 8, VulnerablePower: 2 })], player: player(2), enemies: [worm(22)], fightKind: "monster" });
    expect(ids(solved.plans[0])).toEqual(["UNRELENTING", "BASH"]);
    expect(solved.plans[0]!.outcome).toMatchObject({ winsFight: true, damageDealt: 22, energyLeft: 0 });
  });

  it("9Q7V F17 T14 (the board Jev was asked on): the One-Two Punch line shows Sword Boomerang doubled, killing the Giant into its 56 blast", () => {
    rolloutLiveOptions.enabled = false;
    const decision = planCombatTurn(loggedEnv(logged("9q7v-f17-t14-ask"))) as AskDecision;
    expect(decision.kind).toBe("ask");
    const lines = Object.values(decision.questions["plan"]!.criteria!).map((text) => JSON.parse(String(text)) as Record<string, unknown>);
    // Logged: plan 2/2 "连环拳" alone, an unknown card; the Boomerang it doubles was not in its numbers.
    expect(lines.find((line) => line["plays"] === "连环拳, then 飞剑回旋镖")).toMatchObject({ damage_dealt: 34, kills: "瀑布巨兽", result: expect.stringContaining("explodes for 56") });
    expect(lines.find((line) => line["plays"] === "飞剑回旋镖")).toMatchObject({ damage_dealt: 18 });
  });
});

describe("Waterfall Giant husk on its blast turn: damage into it is not shown as dealt (YQL8D59999AX F17 T8, \"dmg 88\")", () => {
  it("every line reads damage 0 and names the husk, not 999,999,889 HP", () => {
    rolloutLiveOptions.enabled = false;
    const fx = logged("yql8-f17-t8-husk");
    const decision = planCombatTurn(loggedEnv(fx));
    // The husk explodes for 35 at the end of this turn; the solver still scores only surviving it.
    expect(decision?.kind).toBe("ask");
    const lines = Object.values((decision as AskDecision).questions["plan"]!.criteria!).map((text) => JSON.parse(String(text)) as Record<string, unknown>);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.some((line) => /与我一战！/.test(String(line["plays"])))).toBe(true);
    for (const line of lines) {
      expect(line["damage_dealt"], String(line["plays"])).toBe(0);
      expect(String(line["enemies_after"]), String(line["plays"])).toMatch(/^瀑布巨兽 husk \(cannot be killed, it explodes/);
      expect(JSON.stringify(line)).not.toMatch(/9999999/);
    }
  });
});

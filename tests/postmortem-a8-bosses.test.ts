/**
 * Rules from the A8 post-mortems of VUV4, T86W, X8R8 and M9PL (notes/lessons.md): three act-1 boss
 * deaths in a row behind the clock with an unmodelled potion carried to the death, and an act-2 crab
 * fought on a deck estimate twice what it dealt. Replayed on the logged boards (tests/logged-states).
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { bossRaceTrade, measuredDamagePerTurn, planCombatTurn } from "../src/screens/combat-plan.js";
import { eventHpCost, eventHpGuard, eventOptionScore, planEvent } from "../src/screens/event.js";
import { rememberMap } from "../src/screens/rest.js";
import { averagePowerStrength, damageGap, expectedPlayTurn } from "../src/strategy/boss-clock.js";
import { isModelledPotion, modelPotion, upgradeCard, upgradeGain } from "../src/strategy/card-model.js";
import { cardRoles, damageRole } from "../src/strategy/card-value.js";
import { fightHpCost } from "../src/strategy/route-cost.js";
import { combatFit, potionOptionFit } from "../src/strategy/intent.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";

describe("boss clock: a power counts from its expected play turn (M9PL F32)", () => {
  it("a 28-card deck plays a drawn power around T4", () => {
    expect(expectedPlayTurn(28)).toBeCloseTo(3.8, 1);
    // Demon Form from ~T3.8 over the crab's 8 turns: ~4 Strength a turn on average, not 7.
    expect(averagePowerStrength(3, true, expectedPlayTurn(28), 8)).toBeCloseTo(4.1, 1);
    // Inflame: its 2 Strength for the turns after it is up.
    expect(averagePowerStrength(2, false, 3, 8)).toBeCloseTo(1.25, 2);
    expect(averagePowerStrength(3, true, 9, 8)).toBe(0);
  });

  it("the Demon Form + Exterminate deck no longer reads the crab gap as closed", () => {
    // Logged: "need 54 deck 53 gap 1"; the fight dealt 24.5 a turn.
    const gap = damageGap(parseGameState(logged("m9pl-f32-rest").state), loggedKnowledge)!;
    expect(gap.boss).toBe("KAISER_CRAB");
    expect(gap.deck).toBeLessThanOrEqual(46);
    expect(gap.gap).toBeGreaterThanOrEqual(8);
  });
});

describe("Pyre is energy, not Strength (T86W F9)", () => {
  it("does not fill the run plan's strength role", () => {
    expect(cardRoles("PYRE").has("strength")).toBe(false);
    expect(cardRoles("INFLAME").has("strength")).toBe(true);
    // Still scaling damage for the boss clock's gap bonus.
    expect(damageRole("PYRE")).toBe("scaling");
  });

  it("the game data says so", () => {
    const data = JSON.parse(readFileSync(new URL("./logged-states/game-data.json", import.meta.url), "utf8")) as { cards: { id: string; vars: { name: string }[] }[] };
    const vars = data.cards.find((card) => card.id === "PYRE")!.vars.map((entry) => entry.name);
    expect(vars).toEqual(["Energy"]);
  });
});

describe("The Kin: the guide DeepSeek reads agrees with the validator's minions-last rule (VUV4, X8R8)", () => {
  it("no longer tells DeepSeek to kill the followers first", () => {
    const guide = readFileSync(new URL("../src/knowledge/ironclad-guide.md", import.meta.url), "utf8");
    expect(guide).not.toMatch(/先杀信徒/);
    expect(guide).toMatch(/神官一死战斗就结束/);
  });
});

describe("event HP guard: a fight is an HP cost, and a small cost at high HP stays (VUV4 F13)", () => {
  const event = () => {
    const fx = logged("vuv4-f13-event");
    const env = loggedEnv(fx);
    const map = logged("vuv4-map-f12");
    rememberMap(env.screenMemory, parseGameState(map.state));
    return { fx, env };
  };

  it("the rest-and-fight option costs a hallway fight less what it heals", () => {
    const { fx } = event();
    const options = ((fx.state["event"] as Record<string, unknown>)["options"] as Record<string, unknown>[]).map((option) => String(option["description"]));
    expect(eventHpCost(options[0]!, { act: 1, hp: 80, maxHp: 80 })).toEqual({ hp: 8, maxHp: 0 });
    // 「回复24点生命。进入战斗。」 at full HP heals 0: an act-1 hallway fight's p75 cost of max HP.
    expect(eventHpCost(options[1]!, { act: 1, hp: 80, maxHp: 80 }).hp).toBe(Math.round(fightHpCost("Monster", 1) * 80));
    expect(eventHpCost(options[1]!, { act: 1, hp: 50, maxHp: 80 }).hp).toBe(0);
    expect(eventHpCost(options[1]!).hp).toBe(0);
  });

  it("the forced-elite guard scales with HP: 80/80 pays 8, 55/80 does not", () => {
    expect(eventHpGuard({ hp: 8, maxHp: 0 }, 80, 80, "Elite within 3 nodes", 13, 1)).toBeNull();
    expect(eventHpGuard({ hp: 8, maxHp: 0 }, 55, 80, "Elite within 3 nodes", 13, 1)).toMatch(/forced Elite/);
    expect(eventHpGuard({ hp: 8, maxHp: 0 }, 80, 80, "Boss", 16, 1)).toMatch(/forced Boss/);
  });

  it("the logged board: Trudge On (-8 HP, +77 gold) is no longer removed for the fight", () => {
    const { env } = event();
    // The remembered map has the forced elite 3 nodes out (F14 was a forced Phrog Parasite).
    const decision = planEvent(env)!;
    expect(JSON.stringify(decision)).not.toMatch(/only option left after the HP guard/);
    if (decision.kind === "ask") expect(Object.keys((Object.values(decision.questions)[0] as { criteria: Record<string, unknown> }).criteria)).toContain("o0");
    else expect(decision.intent).toEqual({ action: "choose_event_option", option_index: 0 });
    // The code fallback prefers it too: the fight heals nothing at full HP.
    const ctx = { hp: 80, maxHp: 80, forced: true, act: 1 };
    expect(eventOptionScore("获得[blue]77[/blue] [gold]金币[/gold]。失去[red]8[/red]点生命。", ctx)).toBeGreaterThan(eventOptionScore("回复[green]24[/green]点生命。[red]进入战斗[/red]。", ctx));
  });
});

/** The first action and every line of a combat decision (an act, or a question's options). */
function linesOf(decision: Decision | null): { act: string | null; options: Record<string, Record<string, unknown>> } {
  if (!decision) return { act: null, options: {} };
  if (decision.kind === "act") return { act: decision.rationale, options: {} };
  const question = Object.values((decision as AskDecision).questions)[0]!;
  if (question.type !== "choice") return { act: null, options: {} };
  return { act: null, options: Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, JSON.parse(value!) as Record<string, unknown>])) };
}

describe("card potions are lines the solver ranks (X8R8 F17 T8, M9PL F33 T3)", () => {
  it("the Attack Potion becomes a 0-cost attack card in hand", () => {
    const model = modelPotion("ATTACK_POTION", "攻击药水", 0, [], 4, { enemyTargets: [0], strength: 2, weak: false })!;
    expect(model.generates?.type).toBe("Attack");
    expect(model.generates?.cost).toBe(0);
    expect(model.generates?.damage).toBe(16);
    expect(model.generates?.validTargets).toEqual([0]);
    expect(isModelledPotion("SKILL_POTION")).toBe(true);
    expect(isModelledPotion("BLESSING_OF_THE_FORGE")).toBe(true);
  });

  it("X8R8 T8: the priest at 122 with Vulnerable after Bash+: code's line drinks the Attack Potion with Bludgeon", () => {
    // Logged: rank 1 "Bludgeon" 48, the potion only a bare "drink first" p0 (drunk T11 at 3 HP, 14 short).
    const { act, options } = linesOf(planCombatTurn(loggedEnv(logged("x8r8-f17-t8"))));
    const top = act ?? String(options["plan1"]?.["plays"] ?? "") + String(options["plan2"]?.["plays"] ?? "");
    expect(top).toMatch(/攻击药水/);
    expect(top).toMatch(/重锤/);
    for (const option of Object.values(options)) expect(String(option["plays"])).not.toMatch(/first, then re-plan/);
  });

  it("M9PL F33 T3: the Skill Potion is on labelled lines, not a bare pre-step", () => {
    const { act, options } = linesOf(planCombatTurn(loggedEnv(logged("m9pl-f33-t3"))));
    const drinking = act ? [act] : Object.values(options).filter((option) => String(option["plays"]).includes("技能药水")).map((option) => String(option["intent_fit"]));
    expect(drinking.length).toBeGreaterThan(0);
    for (const label of drinking) expect(label).not.toBe("undefined");
  });
});

describe("Blessing of the Forge is priced on the hand it upgrades (VUV4 F17 T4, T6)", () => {
  it("upgrades from the logged deltas: Strike +3, Defend +3", () => {
    const strike = { ...modelPotion("BLOCK_POTION", "x", 0, [], 0)!, type: "Attack", cardId: "STRIKE_IRONCLAD", damage: 6, block: 0 };
    expect(upgradeCard(strike).damage).toBe(9);
    const defend = { ...strike, type: "Skill", cardId: "DEFEND_IRONCLAD", damage: null, block: 5 };
    expect(upgradeCard(defend).block).toBe(8);
    expect(upgradeGain(defend, upgradeCard(defend))).toBe(3);
  });

  it("T6: 0 energy, one Defend in hand: not drunk (logged: drunk at Jev 0.01, one Defend upgraded)", () => {
    const decision = planCombatTurn(loggedEnv(logged("vuv4-f17-t6")));
    expect(JSON.stringify(decision)).not.toMatch(/熔炉的祝福/);
    expect(decision?.kind === "act" && decision.intent.action).not.toBe("use_potion");
  });

  it("T4: three Strikes to play: the Blessing line deals more than the dry one and is ranked like any line", () => {
    const { act, options } = linesOf(planCombatTurn(loggedEnv(logged("vuv4-f17-t4"))));
    if (act) {
      expect(act).toMatch(/熔炉的祝福/);
      expect(Number(/dmg (\d+)/.exec(act)?.[1])).toBeGreaterThan(18);
    } else {
      const forge = Object.values(options).find((option) => String(option["plays"]).includes("熔炉的祝福"));
      expect(String(forge?.["intent_fit"])).toMatch(/^fits|^costs/);
    }
  });
});

describe("a potion the solver does not simulate is still labelled (VUV4, X8R8: bare 'drink first' options)", () => {
  it("the X8R8 T8 board with an unmodelled potion: its option carries intent_fit", () => {
    const fx = logged("x8r8-f17-t8");
    const potions = ((fx.state["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[]);
    // Regeneration is not simulated (Gambler's Brew is since 77UJ/EN55).
    Object.assign(potions[0]!, { potion_id: "REGEN_POTION", name: "再生药水", description: "获得5层再生。" });
    const { options } = linesOf(planCombatTurn(loggedEnv(fx)));
    const drink = Object.entries(options).find(([key]) => /^p\d/.test(key));
    expect(drink).toBeDefined();
    expect(String(drink![1]["intent_fit"])).toMatch(/in no line's numbers/);
  });

  it("the label says what the potion is for under the intents", () => {
    const base = { objective: null, bossFight: true, bossClock: { need: 32, deck: 27 }, cheapestLoss: 0, hp: 40, useCost: 4 } as const;
    expect(potionOptionFit({ ...base, role: "damage" })).toMatch(/^fits the boss race/);
    expect(potionOptionFit({ ...base, role: "block", cheapestLoss: 15 })).toMatch(/^fits hp/);
    expect(potionOptionFit({ ...base, role: "block" })).toMatch(/^neutral/);
    expect(potionOptionFit({ ...base, role: "weak", bossFight: false, bossClock: null })).toMatch(/^costs the potion/);
  });
});

describe("only code's pick is labelled \"code's best line\" (M9PL F25 T2)", () => {
  // Logged: four options all "fits kill_fast: code's best line", code's pick shown 4th; the other three
  // scored above it (the pick beat the score-best line on every outcome), so scoreGap clamped to 0.
  const field = { minLoss: 14, maxDamage: 52, maxSetup: 1, slack: 5, best: { hpLoss: 14, damage: 52, setup: 1 } };
  const line = (over: Partial<Parameters<typeof combatFit>[2]>) => ({ hpLoss: 14, damage: 45, setup: 1, winsFight: false, focusDamage: null, ...over });
  it("a line scoring above code's pick says so", () => {
    expect(combatFit("kill_fast", "balanced", line({ codeTop: true, scoreGap: 0, damage: 52 }), field).label).toMatch(/code's best line/);
    const above = combatFit("kill_fast", "balanced", line({ scoreGap: -3.2 }), field).label;
    expect(above).not.toMatch(/code's best line under/);
    expect(above).toMatch(/near code's best line \(score \+3\.2/);
    expect(combatFit("kill_fast", "balanced", line({ scoreGap: 0 }), field).label).toMatch(/ties code's best line/);
  });

  it("the logged board: at most one option is code's best line", () => {
    const { options } = linesOf(planCombatTurn(loggedEnv(logged("m9pl-f25-t2"))));
    expect(Object.values(options).filter((option) => /code's best line under/.test(String(option["intent_fit"]))).length).toBeLessThanOrEqual(1);
  });
});

describe("boss race: the HP guard's keep is proportional to the race (M9PL F33, T86W F17)", () => {
  it("M9PL T3: 19 more damage for 6 HP against a crab needing ~58 a turn is kept (was swapped: under 20)", () => {
    // Second question: 58 damage -9 swapped for 39 damage -3; 61 HP, crab 348 left over 6 clock turns.
    expect(bossRaceTrade({ extraDamage: 19, extraLoss: 6, hp: 61, maxHp: 80, bossHpLeft: 348, needPerTurn: 58 })).toBe(true);
    // T4: 12 more damage for 7 HP is a fifth of a turn's need: swapped.
    expect(bossRaceTrade({ extraDamage: 12, extraLoss: 7, hp: 58, maxHp: 80, bossHpLeft: 348, needPerTurn: 58 })).toBe(false);
  });

  it("the HP allowed grows with what the damage is worth at our HP per boss HP", () => {
    // T86W T4: 33 more damage for 14 HP at 70 HP, 232 boss HP: worth ~10 HP, 8 by the max-HP share.
    expect(bossRaceTrade({ extraDamage: 33, extraLoss: 14, hp: 70, maxHp: 80, bossHpLeft: 232, needPerTurn: 26 })).toBe(false);
    expect(bossRaceTrade({ extraDamage: 33, extraLoss: 9, hp: 70, maxHp: 80, bossHpLeft: 232, needPerTurn: 26 })).toBe(true);
    // Late in a race the same damage buys more HP: 33 for 14 with the boss at 120.
    expect(bossRaceTrade({ extraDamage: 33, extraLoss: 14, hp: 70, maxHp: 80, bossHpLeft: 120, needPerTurn: 26 })).toBe(true);
  });
});

describe("this fight's damage a turn leaves out sleep turns (T86W F17 T4)", () => {
  it("T1-T3 asleep for 1 damage: T4 reads nothing measured, not 1/3 a turn", () => {
    expect(measuredDamagePerTurn({ hp: 233, turn: 1 }, 232, 4)).toBeCloseTo(1 / 3, 3);
    expect(measuredDamagePerTurn({ hp: 233, turn: 1, idle: [1, 2, 3] }, 232, 4)).toBeNull();
    // At T5 only the awake turn counts: 23 dealt (1 asleep, 22 on T4) is 23 a turn, not 5.75.
    expect(measuredDamagePerTurn({ hp: 233, turn: 1, idle: [1, 2, 3] }, 210, 5)).toBe(23);
  });

  it("the board records a turn that starts with the boss asleep", () => {
    const fx = logged("t86w-f17-t4");
    const enemy = ((fx.state["combat"] as Record<string, unknown>)["enemies"] as Record<string, unknown>[])[0]!;
    (enemy["powers"] as Record<string, unknown>[]).push({ power_id: "ASLEEP_POWER", amount: 1 });
    const env = loggedEnv(fx);
    planCombatTurn(env);
    expect(env.screenMemory.fightStart?.idle).toEqual([4]);
  });
});

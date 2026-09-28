/**
 * Combat fixes from the first two runs of the redesign (DeepSeek guides strategy and tempo, code gives facts
 * and a reference rank, Jev judges): notes/lessons.md, 99X7VX66AU71 and G8YYU94P2SBB. Each is replayed on
 * the logged board of the cited turn (tests/logged-states), with a unit check of the rule where one helps.
 * The plan-side fixes (6, 7, 11) are in postmortem-redesign-plans.test.ts.
 */

import { describe, expect, it } from "vitest";

import type { AskDecision, Decision } from "../src/project/types.js";
import { planCombatTurn, vambraceArmed } from "../src/screens/combat-plan.js";
import { modelHandCard, potionHeldValue, turnStartOnly } from "../src/strategy/card-model.js";
import { blockOnlyPower, potionStance, stanceOf } from "../src/strategy/intent.js";
import { bufferedLoss, solveTurn, type EnemySim, type PlayerSim } from "../src/strategy/turn-solver.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";

type Raw = Record<string, unknown>;

/** The plan options of a combat question: key -> parsed criteria. */
function optionsOf(decision: Decision | null): Record<string, Raw> {
  expect(decision?.kind).toBe("ask");
  const question = (decision as AskDecision).questions["plan"]!;
  if (question.type !== "choice") throw new Error("not a choice");
  return Object.fromEntries(Object.entries(question.criteria).filter(([key]) => /^plan\d+$/.test(key)).map(([key, value]) => [key, JSON.parse(value!) as Raw]));
}
const lines = (decision: Decision | null) => Object.values(optionsOf(decision));
const reference = (decision: Decision | null) => lines(decision).find((line) => /^same as reference/.test(String(line["reference"])))!;
const answer = (choice: string) => ({ plan: { type: "choice" as const, choice, confidence: 0.8, probabilities: {}, raw: {} } });

describe("1. Demon Form's Strength starts next turn (G8YY F30 T2)", () => {
  it("the rule: Strength in a 'start of your turn' sentence is none on play; Inflame's is", () => {
    expect(turnStartOnly("在你的回合开始时，获得{StrengthPower:diff()}点力量。", "StrengthPower")).toBe(true);
    expect(turnStartOnly("获得{StrengthPower:diff()}点力量。", "StrengthPower")).toBe(false);
    const fx = logged("g8yy-f30-t2");
    const hand = ((fx.state["combat"] as Raw)["hand"] as Raw[]).map((entry, index) => modelHandCard(entry, index, loggedKnowledge));
    const demon = hand.find((card) => card.cardId === "DEMON_FORM")!;
    expect(demon.strength).toBe(0);
    expect(demon.type).toBe("Power");
  });

  it("the logged line (Forgotten Ritual, Demon Form, Squash, Strike): 13 damage, no kill, -23 (it read 19, a Rock kill, -8)", () => {
    const decision = planCombatTurn(loggedEnv(logged("g8yy-f30-t2")));
    const demon = lines(decision).find((line) => /恶魔形态/.test(String(line["plays"])) && /压扁/.test(String(line["plays"])) && /打击/.test(String(line["plays"])))!;
    expect(demon).toBeDefined();
    expect(demon["damage_dealt"]).toBe(13);
    expect(demon["hp_lost"]).toBe(23);
    expect(demon["kills"]).toBeUndefined();
    expect(demon["strength_gained"]).toBeUndefined();
  });
});

describe("2. Vambrace doubles only the first card Block of a fight (G8YY F30 T3)", () => {
  it("armed while a Block card shows twice its own value; not once the numbers are plain", () => {
    const hand = ((logged("g8yy-f30-t3").state["combat"] as Raw)["hand"] as Raw[]);
    expect(vambraceArmed(["VAMBRACE"], hand, 1)).toBe(true);
    expect(vambraceArmed([], hand, 1)).toBe(false);
    const plain = hand.map((entry) => ({ ...entry, dynamic_values: ((entry["dynamic_values"] as Raw[]) ?? []).map((value) => (value["name"] === "Block" ? { ...value, current_value: Number(value["base_value"]) + 1 } : value)) }));
    expect(vambraceArmed(["VAMBRACE"], plain, 1)).toBe(false);
  });

  it("the solver: Defend 12 then Shrug It Off 18 shown is 12 + 9 against 33, -12 (the logged fact said -3)", () => {
    const card = (index: number, cardId: string, block: number): CardModel => ({
      index, key: `c${index}`, cardId, name: cardId, type: "Skill", upgraded: false, cost: 1, xCost: false, playable: true, target: "self", validTargets: [],
      damage: null, hits: 1, block, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
      draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "",
    });
    const enemy: EnemySim = { index: 0, name: "Rock", hp: 40, maxHp: 40, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 33, hits: 1 }] };
    const player = (armed: boolean): PlayerSim => ({ hp: 17, maxHp: 83, block: 0, energy: 2, weak: false, vulnerable: false, intangible: false, unmovableArmed: armed });
    // Defend first, as logged: Shrug It Off then gives its plain 9.
    const both = (armed: boolean) => solveTurn({ hand: [card(0, "DEFEND_IRONCLAD", 12), card(1, "SHRUG", 18)], player: player(armed), enemies: [enemy], fightKind: "monster" }).plans.find((plan) => plan.steps.length === 2 && plan.steps[0]!.cardId === "DEFEND_IRONCLAD")!;
    expect(both(true).outcome.hpLoss).toBe(12);
    expect(both(false).outcome.hpLoss).toBe(3);
  });

  it("the logged T3 board: the Pommel Strike -> Nectar line with Defend and Shrug It Off loses at least 9, not 3", () => {
    const line = lines(planCombatTurn(loggedEnv(logged("g8yy-f30-t3")))).find((entry) => /剑柄打击 -> 盛碗虫（蜜）/.test(String(entry["plays"])) && /防御/.test(String(entry["plays"])) && /耸肩无视/.test(String(entry["plays"])))!;
    expect(line).toBeDefined();
    expect(Number(line["hp_lost"])).toBeGreaterThanOrEqual(9);
  });
});

describe("3. Buffer: the solver starts from the Buffer up, and our own HP loss uses it first (99X7 F9 T3)", () => {
  it("the rule: each stack stops the next amount past the block", () => {
    expect(bufferedLoss([17], 0, 1)).toBe(0);
    expect(bufferedLoss([5, 17], 6, 1)).toBe(0);
    expect(bufferedLoss([5, 17], 0, 1)).toBe(17);
    expect(bufferedLoss([0, 17], 0, 0)).toBe(17);
  });

  it("the logged board after Lucky Tonic: the Strike line loses 0, Breakthrough 17 (its 1 HP uses up the Buffer), and says so", () => {
    const all = lines(planCombatTurn(loggedEnv(logged("99x7-f9-t3-draw"))));
    const strike = all.find((line) => String(line["plays"]) === "打击 -> 旧日雕像")!;
    const breakthrough = all.find((line) => String(line["plays"]) === "突破")!;
    expect(strike["hp_lost"]).toBe(0);
    expect(breakthrough["hp_lost"]).toBe(17);
    expect(String(breakthrough["uses_up_buffer"])).toMatch(/uses up 1 Buffer/);
    expect(String(reference(planCombatTurn(loggedEnv(logged("99x7-f9-t3-draw"))))["plays"])).toMatch(/^打击 -> 旧日雕像/);
  });

  it("a Lucky Tonic is worth the hit it stops (the potion's held value prices it)", () => {
    expect(potionHeldValue("LUCKY_TONIC")).toBeGreaterThan(0);
  });
});

describe("4. Powdered Demise: its damage is a fact on the line, on the kill-priority enemy (99X7 F17)", () => {
  it("T1: DeepSeek said drink it turn 1 on the priest; the line is offered and is the reference, damage_later counted", () => {
    const decision = planCombatTurn(loggedEnv(logged("99x7-f17-t1")));
    const demise = lines(decision).filter((line) => /消亡粉末/.test(String(line["plays"])));
    expect(demise.length).toBeGreaterThan(0);
    for (const line of demise) {
      expect(String(line["plays"])).toMatch(/消亡粉末 -> 同族神官/);
      expect(String(line["damage_later"])).toMatch(/^\+\d+ to 同族神官 over its next turns \(Demise 9 a turn\)/);
      expect(Number(line["damage_total"])).toBeGreaterThan(Number(line["damage_dealt"]));
    }
    expect(String(reference(decision)["plays"])).toMatch(/消亡粉末 -> 同族神官/);
    expect(String(reference(decision)["tempo"])).toMatch(/matches DeepSeek's potion plan: drinks 消亡粉末 now/);
  });

  it("T5/T6: never on a Kin Follower (a minion that leaves when the priest dies)", () => {
    for (const name of ["99x7-f17-t5", "99x7-f17-t6"]) {
      const plays = lines(planCombatTurn(loggedEnv(logged(name)))).map((line) => String(line["plays"]));
      expect(plays.some((text) => /消亡粉末 -> 同族神官/.test(text))).toBe(true);
      expect(plays.some((text) => /消亡粉末 -> 同族信徒/.test(text))).toBe(false);
    }
  });
});

describe("5. A chosen line's drink is drunk before the turn ends, even when the line is cut short (99X7 F17 T5/T6)", () => {
  for (const [name, end] of [["99x7-f17-t5", "99x7-f17-t5-end"], ["99x7-f17-t6", "99x7-f17-t6-end"]] as const) {
    it(`${name}: Jev's Demise line, then the board it was cut short on: the potion is drunk, not "end turn"`, () => {
      const env = loggedEnv(logged(name));
      const decision = planCombatTurn(env) as AskDecision;
      const [key] = Object.entries(optionsOf(decision)).find(([, line]) => /, then potion 消亡粉末 -> 同族神官$/.test(String(line["plays"])))!;
      const resolved = decision.resolve(answer(key));
      resolved.apply?.();
      expect(env.screenMemory.pendingDrinks?.steps.map((step) => step.cardId)).toEqual(["POTION:POWDERED_DEMISE:1"]);
      const later = loggedEnv(logged(end));
      later.screenMemory = env.screenMemory;
      const next = planCombatTurn(later);
      expect(next?.kind).toBe("act");
      if (next?.kind !== "act") return;
      expect(next.label).toBe("combat/plan-potion");
      const priest = ((later.state.raw["combat"] as Raw)["enemies"] as Raw[]).find((enemy) => enemy["enemy_id"] === "KIN_PRIEST")!;
      expect(next.intent).toEqual({ action: "use_potion", option_index: 1, target_index: priest["index"] });
      expect(later.screenMemory.pendingDrinks).toBeUndefined();
    });
  }
});

describe("9. Potions DeepSeek holds cost the reference rank about their worth; its latest word decides (99X7 F15/F17, G8YY F31)", () => {
  it("the stance of DeepSeek's words, this turn, at this HP", () => {
    expect(stanceOf("drink turn 1, ticks every turn on priest", 1, 0.9)).toBe("now");
    expect(stanceOf("drink turn 1, ticks every turn on priest", 5, 0.5)).toBe("now");
    expect(stanceOf("hold; T3/T7 Beam if block short, else kill push", 1, 0.9)).toBe("hold");
    expect(stanceOf("hold; T3/T7 Beam if block short, else kill push", 3, 0.9)).toBe("now");
    expect(stanceOf("Hold for Kin; emergency only if HP <35% or lethal incoming.", 2, 0.6)).toBe("hold");
    expect(stanceOf("Hold for Kin; emergency only if HP <35% or lethal incoming.", 2, 0.3)).toBe("now");
    expect(stanceOf("drink the Blood Potion now, never save it", 1, 0.13)).toBe("now");
  });

  it("F15 T2 hallway: the reference line keeps the Heart of Iron and the Demise held for Kin", () => {
    const decision = planCombatTurn(loggedEnv(logged("99x7-f15-t2")));
    expect(String(reference(decision)["plays"])).not.toMatch(/铁心药水|消亡粉末/);
    const iron = lines(decision).find((line) => /铁心药水/.test(String(line["plays"])))!;
    expect(String(iron["tempo"])).toMatch(/differs from DeepSeek's reserve: drinks a potion it holds for the act boss \(铁心药水: Hold for Kin/);
  });

  it("F17 T1 boss: the Colorless Potion held for the Beam turns is not in the reference line; a line drinking it says so", () => {
    const decision = planCombatTurn(loggedEnv(logged("99x7-f17-t1")));
    expect(String(reference(decision)["plays"])).not.toMatch(/无色药水/);
  });

  it("G8YY F31 T1: 'drink the Blood Potion now, never save it' is not labelled as a held potion", () => {
    const fx = logged("g8yy-f31-t1");
    const env = loggedEnv(fx);
    const stance = potionStance({ potionId: "BLOOD_POTION", name: "鲜血药水", text: "", run: fx.runPlan, fight: fx.fightPlan, turn: 1, hpFraction: 11 / 83, bossFight: false });
    expect(stance?.stance).toBe("now");
    const all = lines(planCombatTurn(env));
    const blood = all.filter((line) => /鲜血药水/.test(String(line["plays"])));
    expect(blood.length).toBeGreaterThan(0);
    for (const line of blood) {
      expect(String(line["tempo"])).not.toMatch(/DeepSeek's reserve|holds for the act boss/);
      expect(String(line["potion_facts"])).toMatch(/DeepSeek's latest word on it is to drink it now/);
    }
  });
});

describe("10. Tempo labels carry DeepSeek's specific instructions (G8YY F30, 99X7 F17 T3, G8YY F17 T4)", () => {
  const withoutVambrace = () => {
    const fx = logged("g8yy-f30-t1");
    const run = fx.state["run"] as Raw;
    run["relics"] = (run["relics"] as Raw[]).filter((relic) => relic["relic_id"] !== "VAMBRACE");
    return fx;
  };

  it("F30 T1 as logged (Vambrace unspent): no line fully blocks the Rock's 15 (10 + 4 at most), so none is credited with the stun", () => {
    const all = lines(planCombatTurn(loggedEnv(logged("g8yy-f30-t1"))));
    for (const line of all) expect(String(line["tempo"] ?? "")).not.toMatch(/fully blocks 盛碗虫（石）/);
  });

  it("F30 T1 with the shown blocks as the old solver read them: the Colossus line matches 'fully block its headbutt to stun it', the most-damage line differs", () => {
    const all = lines(planCombatTurn(loggedEnv(withoutVambrace())));
    const stun = all.find((line) => /巨像/.test(String(line["plays"])) && String(line["stuns"] ?? "").includes("盛碗虫（石）"))!;
    expect(stun).toBeDefined();
    expect(String(stun["tempo"])).toMatch(/^matches DeepSeek's plan: fully blocks 盛碗虫（石）'s attack: stunned/);
    const most = all.reduce((a, b) => (Number(b["damage_dealt"]) > Number(a["damage_dealt"]) ? b : a));
    expect(String(most["tempo"])).toMatch(/^differs from DeepSeek's plan \("Fully block its headbutt/);
    // The objective keyword is context under a specific instruction, not the match.
    expect(String(stun["tempo"])).toMatch(/\(objective: differs from DeepSeek's kill_fast/);
  });

  it("F30 T3: lines that stun (or kill) the Rock match, the rest differ", () => {
    for (const line of lines(planCombatTurn(loggedEnv(logged("g8yy-f30-t3"))))) {
      const tempo = String(line["tempo"]);
      if (line["stuns"] || String(line["kills"] ?? "").includes("盛碗虫（石）")) expect(tempo).toMatch(/^matches DeepSeek's plan/);
      else expect(tempo).toMatch(/^differs from DeepSeek's plan/);
    }
  });

  it("99X7 F17 T3 (the Beam turn, 'block Beam turns'): the lines leaving the least unblocked match, the most-damage one differs", () => {
    const all = lines(planCombatTurn(loggedEnv(logged("99x7-f17-t3"))));
    const least = Math.min(...all.map((line) => Number(line["hp_lost"])));
    for (const line of all) {
      if (Number(line["hp_lost"]) === least) expect(String(line["tempo"])).toMatch(/matches DeepSeek's plan: leaves \d+ of this turn's hits \(同族神官 beam\) unblocked/);
    }
    expect(all.some((line) => /differs from DeepSeek's plan \("Keep HP above 21, block Beam turns/.test(String(line["tempo"])))).toBe(true);
  });

  it("G8YY F17 T4 scale_then_kill: Shrug It Off + Feel No Pain is not 'most setup' (a block-only power DeepSeek did not name)", () => {
    const all = lines(planCombatTurn(loggedEnv(logged("g8yy-f17-t4"))));
    for (const line of all) {
      expect(String(line["tempo"] ?? "")).not.toMatch(/most setup|no line sets up more/);
      expect(String(line["reference"] ?? "")).not.toMatch(/more setup/);
    }
    expect(blockOnlyPower("每当有一张牌被消耗时，获得3点格挡。")).toBe(true);
    expect(blockOnlyPower("在你的回合开始时，获得3点力量。")).toBe(false);
  });
});


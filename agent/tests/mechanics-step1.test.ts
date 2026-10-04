/**
 * Stage 1 of the step-by-step upgrade (from the 910671b baseline): mechanics the turn solver computed
 * wrongly, ported from the redesign branch one at a time. Each is checked on the logged board of the
 * cited turn (tests/logged-states) where one exists, else on a small board. The checks are about what
 * the code computes (damage, block, HP lost), not about which line strategy then picks, and none depends
 * on move-model.json numbers.
 */

import { describe, expect, it } from "vitest";

import { drawablePileSize, enemySims, planCombatTurn, vambraceArmed } from "../src/reflex/combat-plan.js";
import { planSelection, thisTurnDamage } from "../src/hand/screens/selection.js";
import { modelHandCard, nextTurnOnly, turnStartOnly, type CardModel } from "../src/reflex/card-model.js";
import { bufferedLoss, solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/reflex/turn-solver.js";
import { combatOf, logged, loggedEnv, loggedKnowledge, type Logged } from "./logged.js";

type Raw = Record<string, unknown>;

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
    draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "",
    ...overrides,
  };
}
const strike = (index: number): CardModel => card(index, "STRIKE_IRONCLAD", { damage: 6 });
const defend = (index: number): CardModel => card(index, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], block: 5 });
const enemy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "E", hp: 50, maxHp: 50, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });
const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 40, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, ...over });

function powerOf(holder: Raw, id: string): number {
  const power = ((holder["powers"] as Raw[] | undefined) ?? []).find((entry) => entry["power_id"] === id);
  return power ? Number(power["amount"] ?? 1) : 0;
}

/** The logged board as solver input: hand, enemies, and the player facts these mechanics read. */
function boardInput(fx: Logged, over: Partial<PlayerSim> = {}): SolverInput {
  const combat = combatOf(fx);
  const p = combat["player"] as Raw;
  const hand = (combat["hand"] as Raw[]).map((entry, index) => modelHandCard(entry, index, loggedKnowledge));
  const drawable = drawablePileSize(fx.state);
  return {
    hand,
    enemies: enemySims(combat),
    fightKind: "monster",
    player: {
      hp: Number(p["current_hp"]), maxHp: Number(p["max_hp"]), block: Number(p["block"]), energy: Number(p["energy"]),
      weak: powerOf(p, "WEAK_POWER") > 0, vulnerable: powerOf(p, "VULNERABLE_POWER") > 0, intangible: false,
      strengthNow: powerOf(p, "STRENGTH_POWER"), feelNoPain: powerOf(p, "FEEL_NO_PAIN_POWER"),
      buffer: powerOf(p, "BUFFER_POWER"), duplicate: powerOf(p, "DUPLICATION_POWER"),
      ...(drawable !== undefined ? { drawable } : {}),
      ...over,
    },
  };
}
const plays = (plan: { steps: { name: string; targetName: string | null }[] }) => plan.steps.map((step) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", ");

describe("Fiend Fire counts the cards drawn earlier in its line (9VG8 F35 T6, eb6a670)", () => {
  it("22/80, Devoted Sculptor at 80: 'Offering+, Fiend Fire+' is a kill, and code plays it as the lethal (logged: shown as 4 hits, 44)", () => {
    const plans = solveTurn(boardInput(logged("9vg8-f35-t6"))).plans;
    const line = plans.find((plan) => plays(plan) === "祭品+, 恶魔之焰+ -> 虔诚雕刻师")!;
    expect(line).toBeDefined();
    expect(line.outcome.winsFight).toBe(true);
    const decision = planCombatTurn(loggedEnv(logged("9vg8-f35-t6")));
    expect(decision?.kind === "act" && decision.label).toBe("combat/lethal");
    if (decision?.kind === "act") expect(decision.rationale).toMatch(/祭品\+.*恶魔之焰\+/);
  });

  it("with the draw and discard piles empty, Offering draws nothing into the hand and Fiend Fire is no kill", () => {
    const fx = logged("9vg8-f35-t6");
    const view = (fx.state["agent_view"] as Raw)["combat"] as Raw;
    view["draw"] = [];
    view["discard"] = [];
    expect(drawablePileSize(fx.state)).toBe(0);
    const line = solveTurn(boardInput(fx)).plans.find((plan) => plays(plan) === "祭品+, 恶魔之焰+ -> 虔诚雕刻师")!;
    expect(line.outcome.winsFight).toBe(false);
  });

  it("a small board: 2 cards drawn first, Fiend Fire hits once per card left in hand, drawn ones included", () => {
    const draw2 = card(0, "DRAW2", { type: "Skill", target: "self", validTargets: [], cost: 0, draw: 2 });
    const fiend = card(1, "FIEND_FIRE", { special: "fiend_fire", damage: 7, cost: 2 });
    const input = (drawable: number) => ({ hand: [draw2, fiend, strike(2)], player: player({ drawable }), enemies: [enemy({ hp: 100 })], fightKind: "monster" as const });
    const damage = (drawable: number) => solveTurn(input(drawable)).plans.find((plan) => plays(plan) === "DRAW2, FIEND_FIRE -> E")!.outcome.damageDealt;
    expect(damage(10)).toBe(21);
    expect(damage(0)).toBe(7);
  });
});

describe("Demon Form's Strength starts next turn (G8YY F30 T2, 689ed43)", () => {
  it("the rule: Strength in a 'start of your turn' sentence is none on play; Inflame's is", () => {
    expect(turnStartOnly("在你的回合开始时，获得{StrengthPower:diff()}点力量。", "StrengthPower")).toBe(true);
    expect(turnStartOnly("获得{StrengthPower:diff()}点力量。", "StrengthPower")).toBe(false);
    const hand = (combatOf(logged("g8yy-f30-t2"))["hand"] as Raw[]).map((entry, index) => modelHandCard(entry, index, loggedKnowledge));
    const demon = hand.find((entry) => entry.cardId === "DEMON_FORM")!;
    expect(demon.strength).toBe(0);
    expect(demon.type).toBe("Power");
  });

  it("the logged line (Forgotten Ritual, Demon Form, Squash, Strike into the Rock): no Strength added this turn, no kill", () => {
    const plans = solveTurn(boardInput(logged("g8yy-f30-t2"))).plans;
    const line = plans.find((plan) => /恶魔形态/.test(plays(plan)) && /压扁 -> 盛碗虫（石）/.test(plays(plan)) && /打击 -> 盛碗虫（石）/.test(plays(plan)))!;
    expect(line).toBeDefined();
    expect(line.outcome.strengthGained).toBe(0);
    expect(line.outcome.kills).toEqual([]);
    expect(line.outcome.damageDealt).toBe(13);
  });
});

describe("Vambrace doubles only the first card Block of a fight (G8YY F30 T3, 689ed43)", () => {
  it("armed while a Block card shows twice its own value; not once the numbers are plain", () => {
    const hand = combatOf(logged("g8yy-f30-t3"))["hand"] as Raw[];
    expect(vambraceArmed(["VAMBRACE"], hand, 1)).toBe(true);
    expect(vambraceArmed([], hand, 1)).toBe(false);
    const plain = hand.map((entry) => ({ ...entry, dynamic_values: ((entry["dynamic_values"] as Raw[]) ?? []).map((value) => (value["name"] === "Block" ? { ...value, current_value: Number(value["base_value"]) + 1 } : value)) }));
    expect(vambraceArmed(["VAMBRACE"], plain, 1)).toBe(false);
  });

  it("the solver: Defend 12 then Shrug It Off 18 shown is 12 + 9 against 33, -12 (the logged fact said -3)", () => {
    const block = (index: number, cardId: string, amount: number) => card(index, cardId, { type: "Skill", target: "self", validTargets: [], block: amount });
    const both = (armed: boolean) =>
      solveTurn({ hand: [block(0, "DEFEND_IRONCLAD", 12), block(1, "SHRUG", 18)], player: player({ hp: 17, maxHp: 83, energy: 2, unmovableArmed: armed }), enemies: [enemy({ attacks: [{ damage: 33, hits: 1 }] })], fightKind: "monster" })
        .plans.find((plan) => plan.steps.length === 2 && plan.steps[0]!.cardId === "DEFEND_IRONCLAD")!;
    expect(both(true).outcome.hpLoss).toBe(12);
    expect(both(false).outcome.hpLoss).toBe(3);
  });
});

describe("Buffer: the solver starts from the Buffer up, our own HP loss uses it first (99X7 F9 T3, 689ed43)", () => {
  it("the rule: each stack stops the next amount past the block", () => {
    expect(bufferedLoss([17], 0, 1)).toBe(0);
    expect(bufferedLoss([5, 17], 6, 1)).toBe(0);
    expect(bufferedLoss([5, 17], 0, 1)).toBe(17);
    expect(bufferedLoss([0, 17], 0, 0)).toBe(17);
  });

  it("the logged board after Lucky Tonic: Strike loses 0, Breakthrough 17 (its 1 HP uses up the Buffer; logged: Breakthrough read -0)", () => {
    const plans = solveTurn(boardInput(logged("99x7-f9-t3-draw"))).plans;
    const strikeLine = plans.find((plan) => plays(plan) === "打击 -> 旧日雕像")!;
    const breakthrough = plans.find((plan) => plays(plan) === "突破")!;
    expect(strikeLine.outcome.hpLoss).toBe(0);
    expect(breakthrough.outcome.hpLoss).toBe(17);
    expect(breakthrough.outcome.bufferSpentBySelf).toBe(1);
  });
});

describe("Evil Eye doubles only after a card was exhausted this turn, earlier in the line included (Q97B F23 T3, ff428e0)", () => {
  const solve = (exhaustedThisTurn: boolean) =>
    solveTurn({
      hand: [card(0, "EVIL_EYE", { type: "Skill", target: "self", validTargets: [], block: 8 }), card(1, "OFFERING_LIKE", { type: "Skill", target: "self", validTargets: [], cost: 0, exhausts: true, flatValue: 1 })],
      player: player({ hp: 60, energy: 1, exhaustedThisTurn }),
      enemies: [enemy({ attacks: [{ damage: 30, hits: 1 }] })],
      fightKind: "monster",
    }).plans;
  const blockOf = (plans: ReturnType<typeof solve>, order: string) => plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === order)?.outcome.blockGained;

  it("an exhaust earlier in the line doubles it; one after it does not", () => {
    const plans = solve(false);
    expect(blockOf(plans, "OFFERING_LIKE,EVIL_EYE")).toBe(16);
    expect(blockOf(plans, "EVIL_EYE")).toBe(8);
  });

  it("an exhaust before this decision (or Toasty Mittens) doubles it from the first card", () => {
    expect(blockOf(solve(true), "EVIL_EYE")).toBe(16);
  });
});

describe("random hits are not counted as kills (S6AG F25 T6, H8LC F23 T5, e2b8a0e)", () => {
  it("Juggernaut's hit is not assumed to finish the 12-HP Parafright; the 20-block line ranks first", () => {
    const enemies = [enemy({ index: 0, name: "The Obscura", hp: 46, maxHp: 129, attacks: [{ damage: 10, hits: 1 }] }), enemy({ index: 1, name: "Parafright", hp: 12, maxHp: 21, attacks: [{ damage: 16, hits: 1 }] })];
    const hand = [
      card(0, "STOMP", { damage: 6, validTargets: [0, 1] }),
      card(1, "SHRUG_IT_OFF", { type: "Skill", target: "self", validTargets: [], block: 8 }),
      defend(2),
      card(3, "TRUE_GRIT", { type: "Skill", target: "self", validTargets: [], block: 7 }),
    ];
    const result = solveTurn({ hand, player: player({ hp: 13, maxHp: 86, juggernaut: 8 }), enemies, fightKind: "monster", turn: 6 });
    const ids = (plan: { steps: { cardId: string }[] }) => plan.steps.map((step) => step.cardId).sort().join(",");
    const gamble = result.plans.find((plan) => ids(plan) === "SHRUG_IT_OFF,STOMP");
    if (gamble) expect(gamble.outcome.hpLoss).toBe(18);
    expect(result.plans[0]!.outcome.hpLoss).toBeLessThanOrEqual(6);
    expect(result.plans[0]!.outcome.dies).toBeFalsy();
  });

  it("a random multi-hit goes where it kills least; a kill every split gives still counts", () => {
    const boomerang = card(0, "SWORD_BOOMERANG", { target: "random", validTargets: [], damage: 7, hits: 3 });
    const solve = (hps: number[]) =>
      solveTurn({ hand: [boomerang], player: player({ hp: 60, energy: 1 }), enemies: hps.map((hp, index) => enemy({ index, hp, attacks: [{ damage: 5, hits: 1 }] })), fightKind: "monster" })
        .plans.find((plan) => plan.steps.length > 0)!;
    expect(solve([40, 6]).outcome.hpLoss).toBe(10);
    expect(solve([10, 10]).outcome.hpLoss).toBe(5);
  });
});

describe("Tender on the player (LSWU F21 T5, Hunter Killer, 13aff99)", () => {
  it("each card played lowers this turn's Strength and Dexterity for the cards after it", () => {
    const hand = [strike(0), strike(1), strike(2)];
    const target = enemy({ hp: 18, attacks: [{ damage: 5, hits: 1 }] });
    expect(solveTurn({ hand, player: player(), enemies: [target], fightKind: "monster" }).plans[0]!.outcome.winsFight).toBe(true);
    const tender = solveTurn({ hand, player: player({ tender: 1 }), enemies: [target], fightKind: "monster" });
    expect(tender.plans.some((plan) => plan.outcome.winsFight)).toBe(false);
    expect(Math.max(...tender.plans.map((plan) => plan.outcome.damageDealt))).toBe(15);
    const blocks = solveTurn({ hand: [strike(0), defend(1), defend(2)], player: player({ tender: 1 }), enemies: [enemy({ attacks: [{ damage: 30, hits: 1 }] })], fightKind: "monster" });
    expect(Math.max(...blocks.plans.map((plan) => plan.outcome.blockGained))).toBeLessThanOrEqual(9);
  });

  it("the state's TENDER_POWER reaches the solver: a lethal at full Strength is no lethal under Tender", async () => {
    const { combatPayload, testKnowledge } = await import("./scenarios.js");
    const raw = combatPayload({ enemyHp: 13 }) as Raw;
    const combat = raw["combat"] as Raw;
    (combat["enemies"] as Raw[])[1]!["is_alive"] = false;
    (raw["run"] as Raw)["potions"] = [];
    const fx = (): Logged => ({ source: "", decision: { label: "", decider: "", chosen: null, rationale: "" }, state: raw });
    const before = planCombatTurn(loggedEnv(fx(), { knowledge: testKnowledge }));
    (combat["player"] as Raw)["powers"] = [{ index: 0, power_id: "TENDER_POWER", name: "Tender", amount: 3, is_debuff: true }];
    const after = planCombatTurn(loggedEnv(fx(), { knowledge: testKnowledge }));
    expect(before?.kind === "act" && before.label).toBe("combat/lethal");
    expect(after?.kind === "act" && after.label === "combat/lethal").toBe(false);
  });
});

describe("Duplication already up doubles the next card (11LC F17 T2, eb6a670)", () => {
  it("re-planned after the Duplicator: Bash+ gives Vulnerable 6; without DUPLICATION_POWER, 3", () => {
    const vulnerableAfterBash = (fx: Logged) =>
      solveTurn(boardInput(fx)).plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId === "BASH")!.outcome.enemyHpAfter[0]!.vulnerable;
    const fx = logged("11lc-f17-t2-dup");
    expect(vulnerableAfterBash(fx)).toBe(6);
    ((fx.state["combat"] as Raw)["player"] as Raw)["powers"] = [];
    expect(vulnerableAfterBash(fx)).toBe(3);
  });
});

describe("Relax: next turn's energy and draw are not this turn's (FN0H F33 T2, a9c3968)", () => {
  it("the rule, and the logged card: its Block is this turn's, its energy and draw are not", () => {
    expect(nextTurnOnly("下个回合，抽{Cards}张牌并获得{Energy:energyIcons()}。", "Energy")).toBe(true);
    expect(nextTurnOnly("获得{Energy:energyIcons()}。", "Energy")).toBe(false);
    const hand = (combatOf(logged("fn0h-f33-t2"))["hand"] as Raw[]).map((entry, index) => modelHandCard(entry, index, loggedKnowledge));
    const relax = hand.find((entry) => entry.cardId === "RELAX")!;
    expect(relax.energyGain).toBe(0);
    expect(relax.draw).toBe(0);
    expect(relax.block).toBeGreaterThan(0);
  });

  it("the logged 'Relax, Bash+' (3 energy) is not a line: Relax takes all the energy (logged: rank 1 at 13 damage, 0 dealt)", () => {
    const plans = solveTurn(boardInput(logged("fn0h-f33-t2"))).plans;
    expect(plans.some((plan) => plan.steps.map((step) => step.cardId).join(",") === "RELAX,BASH")).toBe(false);
  });
});

describe("Imbalanced: a fully blocked Rock Bowlbug is stunned for its next move (N95W F19 T3, 893ebbf)", () => {
  it("the enemy carries its next hit; 'Defend, Defend, True Grit' (17 block against Headbutt 15) stuns it, 'Defend, Defend, Strike' does not", () => {
    const fx = logged("n95w-f19-t3");
    const rock = enemySims(combatOf(fx)).find((entry) => entry.name === "盛碗虫（石）")!;
    expect(rock.imbalanced).toBeGreaterThan(0);
    const plans = solveTurn(boardInput(fx)).plans;
    const stun = plans.find((plan) => plays(plan) === "防御, 防御, 坚毅")!;
    const chip = plans.find((plan) => plays(plan) === "防御, 防御, 打击 -> 盛碗虫（石）")!;
    expect(stun.outcome.hpLoss).toBe(0);
    expect(stun.outcome.stuns).toEqual(["盛碗虫（石）"]);
    expect(stun.outcome.stunSaved).toBe(rock.imbalanced);
    expect(chip.outcome.stuns).toBeUndefined();
  });
});

describe("Entrench doubles the block up when played (RTF3 F17 T1, bd3c185)", () => {
  it("modelled with no flat unmodelled value; the solver doubles 12 block, 0 stays 0", () => {
    const hand = combatOf(logged("rtf3-f17-t1-draw"))["hand"] as Raw[];
    const index = hand.findIndex((entry) => entry["card_id"] === "ENTRENCH");
    const entrench = modelHandCard(hand[index]!, index, loggedKnowledge);
    expect(entrench.special).toBe("double_block");
    expect(entrench.flatValue).toBe(0);
    const played = (block: number) =>
      solveTurn({ hand: [{ ...entrench, index: 0, cost: 0 }], player: player({ hp: 60, block }), enemies: [enemy({ hp: 100, attacks: [{ damage: 30, hits: 1 }] })], fightKind: "monster" })
        .plans.find((plan) => plan.steps.some((step) => step.cardId === "ENTRENCH"));
    expect(played(12)?.outcome.blockGained).toBe(12);
    const atZero = played(0);
    if (atZero) expect(atZero.outcome.blockGained).toBe(0);
  });
});

describe("Pact's End deals nothing with fewer than 3 cards the exhaust pile can reach (9LSQ F17 T1, H1FA, 0110442)", () => {
  it("the rule, on the logged card", () => {
    const fx = logged("9lsq-f17-t1-attack-potion");
    const pact = ((fx.state["selection"] as Raw)["cards"] as Raw[]).find((entry) => entry["card_id"] === "PACTS_END")!;
    const model = modelHandCard(pact, 2, loggedKnowledge);
    expect(thisTurnDamage(model, { exhaustReach: 2 })).toBe(0);
    expect(thisTurnDamage(model, { exhaustReach: 3 })).toBeGreaterThan(0);
    expect(thisTurnDamage(model)).toBeGreaterThan(0);
  });

  it("the Attack Potion's card is not Pact's End with the exhaust pile empty (logged: Pact's End taken, never played)", () => {
    const decision = planSelection(loggedEnv(logged("9lsq-f17-t1-attack-potion")));
    if (decision?.kind === "act") expect(decision.intent).not.toEqual({ action: "select_deck_card", option_index: 2 });
    else expect(JSON.stringify(decision)).not.toMatch(/code: take 契约终结/);
  });
});

describe("Vital Spark: every Skill in the line adds Tainted to each enemy hit this turn (4LC3 F31 T7, Infested Prism)", () => {
  // VITAL_SPARK_POWER 4: "all Skill cards have Tainted 4"; TAINTED_POWER: extra attack damage this turn.
  // Logged: Whirlwind 6x3 -> 10x3 after Defend -> 14x3 after Shrug It Off; 17 HP + 13 Block, dead.
  it("17/80 vs Whirlwind 6x3: 'Ashen Strike, Defend, Shrug It Off' dies (logged: shown as -5, 12 HP left), and every line dies", () => {
    const fx = logged("4lc3-f31-t7-tainted");
    const input = boardInput(fx);
    expect(input.enemies[0]!.vitalSpark).toBe(4);
    expect(input.enemies[0]!.unmodelled).toBe(false);
    const plans = solveTurn(input).plans;
    const line = plans.find((plan) => plays(plan) === "灰烬打击 -> 感染棱柱, 防御, 耸肩无视")!;
    expect(line).toBeDefined();
    expect(line.outcome.hpLoss).toBe(14 * 3 - 13);
    expect(line.outcome.dies).toBe(true);
    // Shrug It Off alone: 10x3 against 8 Block.
    expect(plans.find((plan) => plays(plan) === "耸肩无视")!.outcome.hpLoss).toBe(22);
    expect(plans.every((plan) => plan.outcome.dies)).toBe(true);
    const decision = planCombatTurn(loggedEnv(fx));
    expect(decision?.kind === "act" && decision.label).toBe("combat/least-loss");
  });

  it("a small board: each Skill adds N to every hit this turn, an Attack adds nothing", () => {
    const prism = enemy({ hp: 60, maxHp: 60, vitalSpark: 2, attacks: [{ damage: 5, hits: 3 }] });
    const loss = (hand: CardModel[], line: string, target: EnemySim = prism) =>
      solveTurn({ hand, fightKind: "monster", player: player({ hp: 40 }), enemies: [target] }).plans.find((plan) => plays(plan) === line)?.outcome.hpLoss;
    expect(loss([defend(0)], "DEFEND_IRONCLAD")).toBe(7 * 3 - 5);
    expect(loss([defend(0), defend(1)], "DEFEND_IRONCLAD, DEFEND_IRONCLAD")).toBe(9 * 3 - 10);
    expect(loss([strike(0)], "STRIKE_IRONCLAD -> E")).toBe(15);
    expect(loss([strike(0), defend(1)], "STRIKE_IRONCLAD -> E, DEFEND_IRONCLAD")).toBe(7 * 3 - 5);
    // Weak already up: Tainted adds before Weak (logged T3: 3x3 shown, base 5; Tainted 2 -> 5x3, 4 -> 6x3).
    const weak = { ...prism, weak: 2, attacks: [{ damage: 3, hits: 3 }] };
    expect(loss([defend(0)], "DEFEND_IRONCLAD", weak)).toBe(5 * 3 - 5);
    expect(loss([defend(0), defend(1)], "DEFEND_IRONCLAD, DEFEND_IRONCLAD", weak)).toBe(6 * 3 - 10);
  });
});

describe("Terror Eel's Vigor is modelled: our hits are not cut to 80% (XLJQ6FPQAU7N F7 T3: predicted 26, dealt 33)", () => {
  it("VIGOR_POWER on the eel leaves it modelled, and a Strike deals its 6", () => {
    const eel = { index: 0, enemy_id: "TERROR_EEL", name: "骇鳗", current_hp: 132, max_hp: 150, block: 0, is_alive: true, move_id: "CRASH_MOVE",
      powers: [{ power_id: "SHRIEK_POWER", amount: 75 }, { power_id: "VIGOR_POWER", amount: 6 }],
      intents: [{ intent_type: "Attack", damage: 24, hits: 1 }] };
    const [sim] = enemySims({ enemies: [eel] });
    expect(sim!.unmodelled).toBe(false);
    const plans = solveTurn({ hand: [strike(0), strike(1), strike(2)], player: player({ hp: 54, maxHp: 91 }), enemies: [sim!], fightKind: "elite", turn: 3 }).plans;
    expect(Math.max(...plans.map((plan) => plan.outcome.damageDealt))).toBe(18);
  });
});

describe("Battleworn Dummy's turn limit (SK1USHSB1U7U F43: 144 of 150 in its 3 turns)", () => {
  const dummy = (limit: number) => ({ index: 0, enemy_id: "BATTLE_FRIEND_V2", name: "战斗好伙伴V2.0", current_hp: 150, max_hp: 150, block: 0, is_alive: true, move_id: "NOTHING_MOVE",
    powers: [{ power_id: "BATTLEWORN_DUMMY_TIME_LIMIT_POWER", amount: limit }], intents: [] });

  it("the power is modelled (no 80% cut) and gives the solver the turns left", () => {
    const [sim] = enemySims({ enemies: [dummy(3)] });
    expect(sim!.unmodelled).toBe(false);
    expect(sim!.timeLimit).toBe(3);
    const plans = solveTurn({ hand: [strike(0), strike(1), strike(2)], player: player(), enemies: [sim!], fightKind: "monster", turn: 1 }).plans;
    expect(Math.max(...plans.map((plan) => plan.outcome.damageDealt))).toBe(18);
  });

  it("on its last turn setup is worth nothing: two Strikes over Inflame + Strike", () => {
    const inflame = card(0, "INFLAME", { type: "Power", target: "self", validTargets: [], strength: 2, flatValue: 10 });
    const best = (limit: number) => {
      const [sim] = enemySims({ enemies: [dummy(limit)] });
      return solveTurn({ hand: [inflame, strike(1), strike(2)], player: player({ energy: 2 }), enemies: [sim!], fightKind: "monster", turn: 4 - limit }).plans[0]!.steps.map((step) => step.cardId);
    };
    expect(best(3)).toContain("INFLAME");
    expect(best(1)).toEqual(["STRIKE_IRONCLAD", "STRIKE_IRONCLAD"]);
  });
});

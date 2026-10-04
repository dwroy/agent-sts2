/**
 * The SL judge on our own HP loss at the next turn's start with two Infernos up (ops 2026-10-03, C4F14F3XPN0N F33, A9, the
 * Knowledge Demon). Inferno loses 1 HP at the start of our turn for each copy up; the power shows only the copies' damage
 * summed (two Inferno+: 18), and the judge counted 1 whatever the copies. Attempt 5 ended T6 at 14 HP + 9 block against 21,
 * nothing playable, no potion: the enemy turn left 2 HP, T7's start took them, and the judge had said "the mod does not
 * flag ending the turn as lethal", the last retry unused. The boards are the logged ones (tests/sl-inferno-judge-data,
 * make-fixtures.ts), some edited; the knowledge is the mod's collections trimmed to them (game-data.json there). No model
 * call, nothing under logs/ or .cache read, nothing written.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { judgeEndTurn, judgeLeastLossNow, LEAST_LOSS_LABEL, type DeathVerdict, type LeastLossFacts } from "../src/sl/judge.js";

type Raw = Record<string, unknown>;
const DATA = join(dirname(fileURLToPath(import.meta.url)), "sl-inferno-judge-data");
const FIXTURE = JSON.parse(readFileSync(join(DATA, "boards.json"), "utf8")) as { states: Record<string, Raw> };
const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")) as Record<string, unknown[]>, "cache");

const board = (key: string): Raw => {
  const raw = FIXTURE.states[key];
  if (!raw) throw new Error(`boards.json has no state ${key}`);
  return structuredClone(raw);
};
const combat = (raw: Raw) => raw["combat"] as Raw;
const player = (raw: Raw) => combat(raw)["player"] as Raw;
const demon = (raw: Raw) => (combat(raw)["enemies"] as Raw[])[0]!;
const powersOf = (entity: Raw) => entity["powers"] as Raw[];
const setPower = (entity: Raw, id: string, amount: number, debuff = false) => {
  const powers = powersOf(entity).filter((power) => power["power_id"] !== id);
  if (amount !== 0) powers.push({ index: powers.length, power_id: id, name: id, amount, is_debuff: debuff });
  entity["powers"] = powers;
};
const judge = (raw: Raw, label = "combat/end_turn"): DeathVerdict => judgeEndTurn(parseGameState(raw), { label, revives: [], knowledge });
const START = "then 2 HP lost at the next turn's start (Inferno x2)";
const T6_LETHAL = `21 incoming vs 14 HP + 9 block + 0 end-of-turn block, ${START}`;

describe("C4F14F3XPN0N F33 attempt 5 (A9): two Infernos take 2 HP at the next turn's start", () => {
  it("T6 end_turn: 14 HP + 9 block against 21, two Inferno+ (18), nothing playable, no potion: certain (rules)", () => {
    const raw = board("c4f1_a5_t6_end");
    expect(combat(raw)["end_turn_will_kill_player"]).toBe(false);
    expect(powersOf(player(raw)).find((power) => power["power_id"] === "INFERNO_POWER")?.["amount"]).toBe(18);
    const verdict = judge(raw);
    expect(verdict).toMatchObject({ certain: true, tier: "rules", startLoss: 2, ownCountDies: true, hp: 14, block: 9, endBlock: 0, incoming: 21 });
    expect(verdict.reason).toBe(`nothing left to play or drink; ${T6_LETHAL}`);
  });

  it("T6 end_turn in attempts 1 and 2 (16 and 17 HP + 9 block against 21: 4 and 5 left, 2 and 3 after T7's start): not certain", () => {
    for (const key of ["c4f1_a1_t6_end", "c4f1_a2_t6_end"]) {
      const verdict = judge(board(key));
      expect(verdict.certain).toBe(false);
      expect(verdict.reason).toBe("the mod does not flag ending the turn as lethal");
    }
  });

  it("T7's least-loss decision (2 HP against 36, a state shown before the start's loss came): certain at end_turn, no early reload with Hellraiser up", () => {
    const raw = board("c4f1_a5_t7");
    expect(judge(raw, LEAST_LOSS_LABEL)).toMatchObject({ certain: true, tier: "least-loss" });
    const facts: LeastLossFacts = { knownDraws: 0, drawsKnown: false, draws: false, line: ["愤怒 -> 知识恶魔"], chance: null };
    const early = judgeLeastLossNow(parseGameState(raw), { revives: [], facts, knownDrawsJudge: true, addedToPile: false, knowledge });
    expect(early.certain).toBe(false);
    expect(early.reason).toBe("not before the line is played: acting mid-turn without the planner: 地狱狂徒 (power)");
  });
});

describe("Inferno's copies, counted at the fewest the power's sum can be", () => {
  it("one copy (9): 1 HP at the next turn's start, 2 left: not certain, as before", () => {
    const raw = board("c4f1_a5_t6_end");
    setPower(player(raw), "INFERNO_POWER", 9);
    expect(judge(raw).reason).toBe("the mod does not flag ending the turn as lethal");
  });

  it("27 (three Inferno+): 3 HP; at 15 HP (3 left after the enemy turn) certain, at 16 not", () => {
    const raw = board("c4f1_a5_t6_end");
    setPower(player(raw), "INFERNO_POWER", 27);
    player(raw)["current_hp"] = 15;
    expect(judge(raw)).toMatchObject({ certain: true, tier: "rules", startLoss: 3 });
    expect(judge(raw).reason).toBe("nothing left to play or drink; 21 incoming vs 15 HP + 9 block + 0 end-of-turn block, then 3 HP lost at the next turn's start (Inferno x3)");
    player(raw)["current_hp"] = 16;
    expect(judge(raw).certain).toBe(false);
  });

  it("an Inferno listed with more damage a copy (InfernoPower 18): 18 may be one copy, so 1 HP: not certain", () => {
    const raw = board("c4f1_a5_t6_end");
    const deck = (raw["run"] as Raw)["deck"] as Raw[];
    const inferno = deck.find((card) => card["card_id"] === "INFERNO")!;
    (inferno["dynamic_values"] as Raw[])[0]!["current_value"] = 18;
    expect(judge(raw).reason).toBe("the mod does not flag ending the turn as lethal");
  });

  it("Crimson Mantle alone (its cost 1 at 7): counted as before, 2 left: not certain", () => {
    const raw = board("c4f1_a5_t6_end");
    setPower(player(raw), "INFERNO_POWER", 0);
    setPower(player(raw), "CRIMSON_MANTLE_POWER", 7);
    expect(judge(raw).reason).toBe("the mod does not flag ending the turn as lethal");
  });
});

describe("every enemy dying before the next turn's loss: no death", () => {
  // Hellraiser plays each Strike drawn at the turn's start, before the loss (attempt 1 T7: a Strike and Setup Strike played,
  // 4 HP at that state, 2 at the next). The bound on this board: Strength 6 + Toasty Mittens 1 + Setup Strike 3 = 10; Strike
  // x4 (6), Setup Strike (7), Pommel Strike (9), Twin Strike (5 x2) in the draw and discard piles: 64 + 17 + 19 + 30 = 130.
  // On every enemy: Inferno's sweep 18 and Mr Struggles' 7 (T7).
  const BOUND = "Inferno's sweep 18, 抱抱先生 7, Hellraiser's drawn Strikes up to 130 (7 in the draw and discard piles)";

  it("the demon at 155 (130 left after 25 on every enemy): Hellraiser's Strikes may kill it first: not certain", () => {
    const raw = board("c4f1_a5_t6_end");
    demon(raw)["current_hp"] = 155;
    const verdict = judge(raw);
    expect(verdict.certain).toBe(false);
    expect(verdict.reason).toBe(`only our own loss at the next turn's start makes it lethal (${START}), but every enemy may die before it (${BOUND})`);
  });

  it("the demon at 156: they cannot: certain; and at 155 without Hellraiser: certain", () => {
    const raw = board("c4f1_a5_t6_end");
    demon(raw)["current_hp"] = 156;
    expect(judge(raw)).toMatchObject({ certain: true, tier: "rules" });
    demon(raw)["current_hp"] = 155;
    setPower(player(raw), "HELLRAISER_POWER", 0);
    expect(judge(raw)).toMatchObject({ certain: true, tier: "rules" });
  });

  it("the demon Vulnerable (at 200): the Strikes up to 1.75 times 130 (228): not certain", () => {
    const raw = board("c4f1_a5_t6_end");
    setPower(demon(raw), "VULNERABLE_POWER", 2, true);
    const verdict = judge(raw);
    expect(verdict.certain).toBe(false);
    expect(verdict.reason).toContain("Hellraiser's drawn Strikes up to 228");
  });

  it("no Hellraiser, the demon at 30: its poison 5 with the 25 may kill it before our turn: not certain; without the poison: certain", () => {
    const raw = board("c4f1_a5_t6_end");
    setPower(player(raw), "HELLRAISER_POWER", 0);
    demon(raw)["current_hp"] = 30;
    setPower(demon(raw), "POISON_POWER", 5, true);
    expect(judge(raw).reason).toBe(`only our own loss at the next turn's start makes it lethal (${START}), but every enemy may die before it (their poison, Inferno's sweep 18, 抱抱先生 7)`);
    setPower(demon(raw), "POISON_POWER", 0);
    expect(judge(raw)).toMatchObject({ certain: true, tier: "rules" });
  });

  it("Mercury Hourglass (its {Damage} in the text: 3) on every enemy too: the demon at 158 not certain, at 159 certain", () => {
    const raw = board("c4f1_a5_t6_end");
    ((raw["run"] as Raw)["relics"] as Raw[]).push({ relic_id: "MERCURY_HOURGLASS", name: "水银沙漏", description: "在你的回合开始时，对所有敌人造成[blue]{Damage}[/blue]点伤害。" });
    demon(raw)["current_hp"] = 158;
    expect(judge(raw).reason).toBe(`only our own loss at the next turn's start makes it lethal (${START}), but every enemy may die before it (Inferno's sweep 18, 抱抱先生 7, 水银沙漏 3, Hellraiser's drawn Strikes up to 130 (7 in the draw and discard piles))`);
    demon(raw)["current_hp"] = 159;
    expect(judge(raw)).toMatchObject({ certain: true, tier: "rules" });
  });

  it("Brimstone (its Strength not given) with Hellraiser's Strikes: not certain; without Hellraiser: certain", () => {
    const raw = board("c4f1_a5_t6_end");
    ((raw["run"] as Raw)["relics"] as Raw[]).push({ relic_id: "BRIMSTONE", name: "硫磺", description: "在你的每个回合开始时，你获得[blue]{SelfStrength}[/blue]点[gold]力量[/gold]，所有敌人获得[blue]{EnemyStrength}[/blue]点[gold]力量[/gold]。" });
    expect(judge(raw).reason).toBe(`only our own loss at the next turn's start makes it lethal (${START}), and Hellraiser plays the Strikes drawn at the turn's start, and 硫磺 (relic) gives Strength then, its amount not given`);
    setPower(player(raw), "HELLRAISER_POWER", 0);
    expect(judge(raw)).toMatchObject({ certain: true, tier: "rules" });
  });

  it("History Course (plays the last Attack again at the turn's start): not certain", () => {
    const raw = board("c4f1_a5_t6_end");
    ((raw["run"] as Raw)["relics"] as Raw[]).push({ relic_id: "HISTORY_COURSE", name: "历史课", description: "在你的回合开始时，打出一张你上一回合最后打出的攻击牌的复制品。" });
    expect(judge(raw).reason).toBe(`only our own loss at the next turn's start makes it lethal (${START}), and 历史课 (relic) plays a card at the turn's start`);
  });

  it("an enemy escaping on its turn is gone before our next turn: not certain", () => {
    const raw = board("c4f1_a5_t6_end");
    (demon(raw)["intents"] as Raw[]).push({ index: 1, intent_type: "Escape", label: "", damage: null, hits: null, total_damage: null, status_card_count: null });
    expect(judge(raw).reason).toBe(`only our own loss at the next turn's start makes it lethal (${START}), but every enemy may die before it (${BOUND})`);
  });

  it("no Hellraiser, the demon at 30, Thorns on us: 5 back on its one hit with the 25 may kill it: not certain; Thorns 4: certain", () => {
    const raw = board("c4f1_a5_t6_end");
    setPower(player(raw), "HELLRAISER_POWER", 0);
    demon(raw)["current_hp"] = 30;
    setPower(player(raw), "THORNS_POWER", 5);
    expect(judge(raw).reason).toBe(`only our own loss at the next turn's start makes it lethal (${START}), but every enemy may die before it (our retaliation 5 a hit, Inferno's sweep 18, 抱抱先生 7)`);
    setPower(player(raw), "THORNS_POWER", 4);
    expect(judge(raw)).toMatchObject({ certain: true, tier: "rules" });
  });
});

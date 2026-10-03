/**
 * The SL judge on the Insatiable's Sandpit (docs/sl.md §2.5; ops 2026-10-03, BVJT7HFW6X2S F33 T5). The Sandpit (SANDPIT_POWER on
 * THE_INSATIABLE) starts at 4 with Liquify Ground, loses 1 every enemy turn and gains 1 for each Frantic Escape played; a
 * turn ended at 1 is our death on the enemy turn whatever the HP. Neither the mod's flag nor our count sees it, so BVJT T5
 * (21 HP + 12 block against 24, nothing playable, no potion) died with 6 retries unused. The boards are the logged ones
 * (tests/logged-states/sandpit-judge/insatiable.json, as the mod sent them); the knowledge is the fixed test data
 * (tests/logged-states/game-data.json). No model call, nothing written under logs/.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { leastLossFactsOf, planCombatTurn, revivesOf } from "../src/screens/combat-plan.js";
import { judgeEndTurn, judgeLeastLossNow, LEAST_LOSS_LABEL, type DeathVerdict } from "../src/sl/judge.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { loggedEnv, loggedKnowledge as knowledge } from "./logged.js";

type Raw = Record<string, unknown>;
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(join(HERE, "logged-states", "sandpit-judge", "insatiable.json"), "utf8")) as { states: Record<string, Raw> };

const board = (key: string): Raw => {
  const raw = FIXTURE.states[key];
  if (!raw) throw new Error(`insatiable.json has no state ${key}`);
  return structuredClone(raw);
};
const combat = (raw: Raw) => raw["combat"] as Raw;
const player = (raw: Raw) => combat(raw)["player"] as Raw;
const worm = (raw: Raw) => (combat(raw)["enemies"] as Raw[])[0]!;
const env = (raw: Raw) => loggedEnv({ source: "", decision: { label: "", decider: "", chosen: null, rationale: "" }, state: raw }, { knowledge });
const revives = (raw: Raw) => {
  const e = env(raw);
  return revivesOf(e.state, e.screenMemory, Number(player(raw)["max_hp"])).map((revive) => revive.source);
};
const judge = (raw: Raw, label = LEAST_LOSS_LABEL): DeathVerdict => judgeEndTurn(parseGameState(raw), { label, revives: revives(raw), knowledge });
const SANDPIT = "无厌沙虫's Sandpit at 1: the enemy turn takes it to 0 and eats us whatever the HP";

afterEach(() => {
  rolloutLiveOptions.enabled = true;
});

describe("BVJT7HFW6X2S F33 (A9): the Sandpit at 1 is a certain death the mod does not flag", () => {
  it("T5 end_turn: 21 HP + 12 block against 12x2, Sandpit 1, nothing playable or drinkable: certain (rules)", () => {
    const raw = board("bvjt_t5_end");
    expect(combat(raw)["end_turn_will_kill_player"]).toBe(false);
    const verdict = judge(raw);
    expect(verdict).toMatchObject({ certain: true, tier: "rules", sandpit: 1, ownCountDies: true, hp: 21, block: 12, incoming: 24 });
    expect(verdict.reason).toBe(`nothing left to play or drink; ${SANDPIT} (our count lives: 24 incoming vs 21 HP + 12 block + 0 end-of-turn block)`);
  });

  it("T5's least-loss decision: certain at end_turn (our count dies there too), but no early reload: Frantic Escapes went into the draw pile at random places", () => {
    const raw = board("bvjt_t5_least_loss");
    rolloutLiveOptions.enabled = false;
    const decision = planCombatTurn(env(raw));
    expect(decision?.label).toBe(LEAST_LOSS_LABEL);
    const facts = leastLossFactsOf(decision);
    expect(facts).toMatchObject({ draws: false, chance: null });
    expect(judge(raw)).toMatchObject({ certain: true, tier: "least-loss" });
    const early = judgeLeastLossNow(parseGameState(raw), { revives: [], facts, knownDrawsJudge: true, addedToPile: true, knowledge });
    expect(early.reason).toBe("not before the line is played: cards were added to the draw pile at random places this attempt");
  });

  it("T4 end_turn at Sandpit 2 (1 on T5): not judged", () => {
    expect(judge(board("bvjt_t4_end"), "combat/plan-choice").reason).toBe("the mod does not flag ending the turn as lethal");
  });
});

describe("the Sandpit, other logged boards", () => {
  it("LXB3B2WT9E0W F33 T5: 81 HP + 18 block against 18, eaten: certain (rules)", () => {
    const verdict = judge(board("lxb3_t5_end"));
    expect(verdict).toMatchObject({ certain: true, tier: "rules", sandpit: 1 });
    expect(verdict.reason).toBe(`nothing left to play or drink; ${SANDPIT} (our count lives: 18 incoming vs 81 HP + 18 block + 0 end-of-turn block)`);
  });

  it("GMT2Q5L6BVL0 F33 T5: a Frantic Escape playable at Sandpit 1 is a card left to play (it was played and the fight won)", () => {
    const start = board("gmt2_t5_start");
    rolloutLiveOptions.enabled = false;
    expect(planCombatTurn(env(start))?.label).not.toBe(LEAST_LOSS_LABEL);
    expect(judge(start, "combat/plan-choice").reason).toBe("5 playable card(s) and 1 potion(s) left");
    // Its end_turn, the Sandpit back at 2.
    expect(judge(board("gmt2_t5_end"), "combat/plan-choice").reason).toBe("the mod does not flag ending the turn as lethal");
  });
});

describe("what keeps the Sandpit death uncertain", () => {
  it("a revive, a potion to drink", () => {
    expect(judgeEndTurn(parseGameState(board("bvjt_t5_end")), { label: LEAST_LOSS_LABEL, revives: ["LIZARD_TAIL"], knowledge }).reason).toBe("a revive is left (LIZARD_TAIL): the Sandpit eats us whatever the HP, and a revive against it is not logged");
    const potion = board("bvjt_t5_end");
    ((potion["run"] as Raw)["potions"] as Raw[])[0] = { index: 0, potion_id: "BLOCK_POTION", name: "格挡药水", occupied: true, can_use: true, can_discard: true, requires_target: false, valid_target_indices: [] };
    expect(judge(potion, "combat/end_turn").reason).toBe("0 playable card(s) and 1 potion(s) left");
  });

  it("the Insatiable may die before its turn: our retaliation on its hits, its poison", () => {
    // Flame Barrier 4 on each of its two hits: 8 at 8 HP.
    const low = board("bvjt_t5_end");
    worm(low)["current_hp"] = 8;
    expect(judge(low).reason).toBe(`only the Sandpit makes it lethal (${SANDPIT}), but 无厌沙虫 (8 HP) may die before its turn: up to 8 from the end of the turn, its poison and our retaliation`);
    worm(low)["current_hp"] = 9;
    expect(judge(low).certain).toBe(true);
    const poisoned = board("bvjt_t5_end");
    (worm(poisoned)["powers"] as Raw[]).push({ index: 9, power_id: "POISON_POWER", name: "中毒", amount: 70, is_debuff: true });
    expect(judge(poisoned).reason).toMatch(/may die before its turn: up to 78 from the end of the turn, its poison and our retaliation$/);
  });

  it("another enemy alive, or the Insatiable's move not shown", () => {
    const crowd = board("bvjt_t5_end");
    (combat(crowd)["enemies"] as Raw[]).push({ ...structuredClone(worm(crowd)), index: 1, enemy_id: "SOME_ADD", name: "小虫", current_hp: 10, max_hp: 10, powers: [], intents: [] });
    expect(judge(crowd).reason).toBe(`only the Sandpit makes it lethal (${SANDPIT}), but other enemies are alive (小虫): not a logged board`);
    const hidden = board("bvjt_t5_end");
    worm(hidden)["intents"] = [];
    expect(judge(hidden).reason).toBe(`only the Sandpit makes it lethal (${SANDPIT}), but 无厌沙虫 shows no intent`);
  });

  it("a held card costing HP on our turn with Inferno up: its sweep counted against the Insatiable before its turn", () => {
    const inferno = { index: 9, power_id: "INFERNO_POWER", name: "地狱之炎", amount: 6, is_debuff: false };
    // A Burn the block takes costs no HP: Inferno does not fire.
    const burnt = board("bvjt_t5_end");
    (combat(burnt)["hand"] as Raw[]).push({ index: 1, card_id: "BURN", name: "灼伤", playable: false, energy_cost: 0, rules_text: "回合结束时，如果这张牌在你的手牌中，受到2点伤害。", resolved_rules_text: "回合结束时，如果这张牌在你的手牌中，受到2点伤害。" });
    expect(judge(burnt).certain).toBe(true);
    (player(burnt)["powers"] as Raw[]).push(inferno);
    expect(judge(burnt).certain).toBe(true);
    // Beckon's 6 is HP lost on our turn: Inferno's 6 to every enemy, and the Flame Barrier's 4 on each of its two hits: 14.
    const beckoned = board("bvjt_t5_end");
    (combat(beckoned)["hand"] as Raw[]).push({ index: 1, card_id: "BECKON", name: "呼唤", playable: false, energy_cost: 0, rules_text: "在你的回合结束时，如果这张牌在你的手牌中， 你失去6点生命。", resolved_rules_text: "在你的回合结束时，如果这张牌在你的手牌中， 你失去6点生命。" });
    (player(beckoned)["powers"] as Raw[]).push(inferno);
    worm(beckoned)["current_hp"] = 14;
    expect(judge(beckoned).reason).toBe(`only the Sandpit makes it lethal (${SANDPIT}), but 无厌沙虫 (14 HP) may die before its turn: up to 14 from the end of the turn, its poison and our retaliation`);
    worm(beckoned)["current_hp"] = 15;
    expect(judge(beckoned).certain).toBe(true);
  });
});

describe("relics that cut or cap HP loss: never logged with the Sandpit", () => {
  it("Tungsten Rod or Beating Remnant: not certain", () => {
    for (const [id, name] of [["TUNGSTEN_ROD", "Tungsten Rod"], ["BEATING_REMNANT", "Beating Remnant"]] as const) {
      const raw = board("bvjt_t5_end");
      ((raw["run"] as Raw)["relics"] as Raw[]).push({ index: 9, relic_id: id, name: id, description: "", stack: null, is_melted: false });
      expect(judge(raw).reason).toBe(`only the Sandpit makes it lethal (${SANDPIT}), but ${name} may cut what it takes (never logged with the Sandpit)`);
    }
  });
});

/**
 * The SL judge on the Waterfall Giant's husk (docs/sl.md §2.4; ops 2026-10-03, QLL4VM0WZKW3 F17). Killed, the Giant stays as a
 * husk (999,999,999 max HP): a Stun turn (ABOUT_TO_BLOW_MOVE), then on our next turn EXPLODE_MOVE with a DeathBlow intent
 * that explodes as the turn ends for the eruption stacks at the kill; we live through it or the run ends. The judge refused
 * every verdict in that phase, so QLL4 F17 T13 (33 HP, 0 block, five attacks in hand, no potion, against 50) died with 6
 * retries unused. The blast turn is now judged by the common rules; the Stun turn, other shapes and other special enemies
 * are still refused. The boards are the logged ones (tests/logged-states/giant-judge/husk.json, as the mod sent them); the
 * knowledge is the fixed test data (tests/logged-states/game-data.json) plus Pyre (薪火之源) as the mod's game data has it.
 * No model call, nothing written under logs/.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { leastLossFactsOf, planCombatTurn, revivesOf } from "../src/screens/combat-plan.js";
import { intentNotShown, judgeEndTurn, judgeLeastLossNow, LEAST_LOSS_LABEL, type DeathVerdict } from "../src/sl/judge.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { loggedEnv } from "./logged.js";

type Raw = Record<string, unknown>;
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(join(HERE, "logged-states", "giant-judge", "husk.json"), "utf8")) as { states: Record<string, Raw> };

/** The mod's game data entry (the .cache collections as of 2026-10-03), not in the fixed subset. */
const PYRE = { id: "PYRE_POWER", name: "薪火之源", description: "在每回合开始时获得[blue]1[/blue]点[gold]能量[/gold]。", type: "Buff", stack_type: "Counter", allow_negative: false };
const data = JSON.parse(readFileSync(join(HERE, "logged-states", "game-data.json"), "utf8")) as Record<string, unknown[]>;
const knowledge = makeKnowledge({ ...data, powers: [...(data["powers"] ?? []), PYRE] }, "cache");

/** A fresh copy of one logged board. */
const board = (key: string): Raw => {
  const raw = FIXTURE.states[key];
  if (!raw) throw new Error(`husk.json has no state ${key}`);
  return structuredClone(raw);
};
const combat = (raw: Raw) => raw["combat"] as Raw;
const player = (raw: Raw) => combat(raw)["player"] as Raw;
const enemies = (raw: Raw) => combat(raw)["enemies"] as Raw[];
const env = (raw: Raw) => loggedEnv({ source: "", decision: { label: "", decider: "", chosen: null, rationale: "" }, state: raw }, { knowledge });
/** The revives as the controller reads them (combat-plan revivesOf, a fresh fight memory). */
const revives = (raw: Raw) => {
  const e = env(raw);
  return revivesOf(e.state, e.screenMemory, Number(player(raw)["max_hp"])).map((revive) => revive.source);
};
const judge = (raw: Raw, label: string): DeathVerdict => judgeEndTurn(parseGameState(raw), { label, revives: revives(raw), knowledge });

afterEach(() => {
  rolloutLiveOptions.enabled = true;
});

describe("QLL4VM0WZKW3 F17 (A9): the Giant's blast turn is judged", () => {
  it("T13 end_turn: 33 HP, no block, nothing playable (no energy) or drinkable, against DeathBlow 50: certain (rules)", () => {
    const raw = board("qll4_t13_end");
    expect(combat(raw)["end_turn_will_kill_player"]).toBe(true);
    const verdict = judge(raw, LEAST_LOSS_LABEL);
    expect(verdict).toMatchObject({ certain: true, tier: "rules", hp: 33, block: 0, endBlock: 0, incoming: 50, killers: ["瀑布巨兽 (DeathBlow 50)"] });
    expect(verdict.reason).toBe("nothing left to play or drink; 50 incoming (瀑布巨兽's blast: the husk explodes for 50 as the turn ends, after the end-of-turn block) vs 33 HP + 0 block + 0 end-of-turn block");
  });

  it("T13 start: the planner's least-loss (no card draws, no potion) is certain before its line (SL_RELOAD_EARLY) and at end_turn", () => {
    const raw = board("qll4_t13_start");
    rolloutLiveOptions.enabled = false;
    const decision = planCombatTurn(env(raw));
    expect(decision?.label).toBe(LEAST_LOSS_LABEL);
    const facts = leastLossFactsOf(decision);
    expect(facts).toMatchObject({ draws: false, chance: null, line: ["打击 -> 瀑布巨兽", "打击 -> 瀑布巨兽", "痛击+ -> 瀑布巨兽"] });
    // The husk's DeathBlow is a shown intent (its number is what hits).
    expect(intentNotShown(parseGameState(raw))).toBeNull();
    const early = judgeLeastLossNow(parseGameState(raw), { revives: [], facts, knownDrawsJudge: true, addedToPile: false, knowledge });
    expect(early).toMatchObject({ certain: true, tier: "least-loss", early: true });
    expect(early.reason).toMatch(/^at the least-loss verdict, before its line \(打击 -> 瀑布巨兽, 打击 -> 瀑布巨兽, 痛击\+ -> 瀑布巨兽\): the turn planner: every simulated line dies/);
    expect(judge(raw, LEAST_LOSS_LABEL)).toMatchObject({ certain: true, tier: "least-loss" });
    // Another label with cards still playable: not certain, as for any other enemy.
    expect(judge(raw, "combat/plan").reason).toBe("5 playable card(s) and 0 potion(s) left");
  });

  it("T12 after the kill (the husk's Stun turn): not flagged, and not judged in that phase even when our own count dies", () => {
    const raw = board("qll4_t12_kill");
    expect(enemies(raw)[0]).toMatchObject({ move_id: "ABOUT_TO_BLOW_MOVE", max_hp: 999_999_999 });
    expect(judge(raw, "combat/plan-choice").reason).toBe("the mod does not flag ending the turn as lethal");
    // 1 HP with Inferno up: the next turn's start would kill us; still refused on this turn.
    player(raw)["current_hp"] = 1;
    (player(raw)["powers"] as Raw[]).push({ index: 9, power_id: "INFERNO_POWER", name: "地狱之炎", amount: 6, is_debuff: false });
    const verdict = judge(raw, "combat/plan-choice");
    expect(verdict.certain).toBe(false);
    expect(verdict.reason).toBe("瀑布巨兽 is a husk on its Stun turn (ABOUT_TO_BLOW_MOVE): it explodes at the end of our next turn, only that turn is judged");
  });
});

describe("the blast turn, other logged boards", () => {
  it("5SSRC26ZFKWC F17 T11: 19 HP + 13 block against 39, the planner's least-loss: certain; another label with cards left: not", () => {
    expect(judge(board("5ssr_t11_end"), LEAST_LOSS_LABEL)).toMatchObject({ certain: true, tier: "least-loss", incoming: 39, hp: 19, block: 13 });
    expect(judge(board("5ssr_t11_end"), "combat/plan").certain).toBe(false);
  });

  it("the boards flagged lethal that we lived through are not certain under any label: Ripple Basin, a Fairy, a Lizard Tail", () => {
    // 8V0HD9Y207WY T13: 30 + 20 against 50; Ripple Basin's 4 block came (no attack played), won at 4: counted, our count
    // leaves exactly that 4.
    // LSWUK6D2EV89 T15: 21 + 5 against 38, the Fairy revived us. MZCG9T5G6TBZ T8: 17 + 10 against 30, the Lizard Tail did.
    for (const [key, reason] of [
      ["8v0h_t13_end", "own count survives: 50 incoming - 20 block - 4 end-of-turn block - 0 Regen < 30 HP"],
      // The revive played out (docs/sl.md §2.7): the blast is the turn's one hit, the revive's HP is what is left.
      ["lswu_t15_end", "a revive is left (FAIRY_IN_A_BOTTLE): back at 24 HP, the rest of the turn leaves 24"],
      ["mzcg_t8_end", "a revive is left (LIZARD_TAIL): back at 40 HP, the rest of the turn leaves 40"],
    ] as const) {
      expect(combat(board(key))["end_turn_will_kill_player"]).toBe(true);
      for (const label of [LEAST_LOSS_LABEL, "combat/end_turn", "combat/plan"]) expect(judge(board(key), label), `${key} ${label}`).toMatchObject({ certain: false, reason });
    }
  });

  it("near misses we lived through: not flagged; forced flagged, our own count survives", () => {
    // TD8A2M6M4SWW T10: 23 HP + 18 block against 36 (won at 5); H7W047ZCEBSA T14: 53 + 12 against 36 (stacks 48, the husk Weak).
    for (const key of ["td8a_t10_end", "h7w0_t14_end"]) expect(judge(board(key), LEAST_LOSS_LABEL).reason).toBe("the mod does not flag ending the turn as lethal");
    const forced = board("td8a_t10_end");
    combat(forced)["end_turn_will_kill_player"] = true;
    expect(judge(forced, LEAST_LOSS_LABEL).reason).toBe("own count survives: 36 incoming - 18 block - 0 end-of-turn block - 0 Regen < 23 HP");
  });

  it("1VX145UJM8RZ T12: Stampede's Attack is bounded (Headbutt's 9 at most), the husk cannot die to it: certain (it died)", () => {
    expect(judge(board("1vx1_t12_end"), LEAST_LOSS_LABEL)).toMatchObject({ certain: true, tier: "least-loss" });
  });

  it("the common vetoes still hold on the blast turn: Buffer and Intangible at the most they save, a revive", () => {
    // The blast is one hit: Buffer 1 takes all of it, Intangible leaves 1.
    for (const [id, reason] of [
      ["BUFFER_POWER", "own count survives: 0 HP lost (Buffer 1: the largest loss taken as prevented) - 0 Regen < 33 HP"],
      ["INTANGIBLE_POWER", "own count survives: 1 HP lost (Intangible: every loss taken as 1) - 0 Regen < 33 HP"],
    ] as const) {
      const raw = board("qll4_t13_end");
      (player(raw)["powers"] as Raw[]).push({ index: 9, power_id: id, name: id, amount: 1, is_debuff: false });
      expect(judge(raw, LEAST_LOSS_LABEL)).toMatchObject({ certain: false, reason });
    }
    expect(judgeEndTurn(parseGameState(board("qll4_t13_end")), { label: LEAST_LOSS_LABEL, revives: ["LIZARD_TAIL"], knowledge }).reason).toBe("a revive is left (LIZARD_TAIL): back at 43 HP, the rest of the turn leaves 43");
  });

  it("end-of-turn block counts against the blast (it comes first: Plating, Orichalcum, Ripple Basin in the logs)", () => {
    const raw = board("qll4_t13_end");
    // 33 HP against 50: 18 Plating leaves 1 HP; 17 leaves 0, a death.
    (player(raw)["powers"] as Raw[]).push({ index: 9, power_id: "PLATING_POWER", name: "镀层", amount: 18, is_debuff: false });
    expect(judge(raw, LEAST_LOSS_LABEL).reason).toBe("own count survives: 50 incoming - 0 block - 18 end-of-turn block - 0 Regen < 33 HP");
    (player(raw)["powers"] as Raw[]).at(-1)!["amount"] = 17;
    expect(judge(raw, LEAST_LOSS_LABEL)).toMatchObject({ certain: true, endBlock: 17 });
  });

  it("our own loss at the next turn's start never makes the blast turn certain: the fight ends when we live through it", () => {
    // 51 HP against 50: 1 left, Inferno's 1 would take it at the next turn's start, which does not come (53 of 53 logged
    // blasts lived through were followed by the rewards).
    const raw = board("qll4_t13_end");
    player(raw)["current_hp"] = 51;
    combat(raw)["end_turn_will_kill_player"] = false;
    (player(raw)["powers"] as Raw[]).push({ index: 9, power_id: "INFERNO_POWER", name: "地狱之炎", amount: 6, is_debuff: false });
    const verdict = judge(raw, LEAST_LOSS_LABEL);
    expect(verdict.certain).toBe(false);
    expect(verdict.reason).toBe("only our own loss at the next turn's start makes it lethal (then 1 HP lost at the next turn's start (Inferno)), but the fight ends when we live through 瀑布巨兽's blast (50): no next turn");
  });
});

describe("other special phases are still refused, saying what", () => {
  const giantAt = (raw: Raw) => enemies(raw)[0]!;
  const intent = (raw: Raw) => (giantAt(raw)["intents"] as Raw[])[0]!;

  it("the husk not in the logged blast shape: two hits, no number, the eruption still up, another move", () => {
    const hits = board("qll4_t13_end");
    intent(hits)["hits"] = 2;
    expect(judge(hits, LEAST_LOSS_LABEL).reason).toBe("瀑布巨兽 is a husk, but not on a plain blast turn (move EXPLODE_MOVE, intent DeathBlow 50x2): not a logged shape");
    const blank = board("qll4_t13_end");
    intent(blank)["damage"] = null;
    expect(judge(blank, LEAST_LOSS_LABEL).certain).toBe(false);
    const erupting = board("qll4_t13_end");
    (giantAt(erupting)["powers"] as Raw[]).push({ index: 1, power_id: "STEAM_ERUPTION_POWER", name: "蒸汽喷发", amount: 50, is_debuff: false });
    expect(judge(erupting, LEAST_LOSS_LABEL).reason).toMatch(/^瀑布巨兽 is a husk, but not on a plain blast turn/);
    const moved = board("qll4_t13_end");
    giantAt(moved)["move_id"] = "SOMETHING_MOVE";
    expect(judge(moved, LEAST_LOSS_LABEL).reason).toBe("瀑布巨兽 is a husk, but not on a plain blast turn (move SOMETHING_MOVE, intent DeathBlow 50): not a logged shape");
    expect(intentNotShown(parseGameState(moved))).toBe("瀑布巨兽's intent DeathBlow is not a plain one");
  });

  it("the blast with another enemy alive (never logged)", () => {
    const raw = board("qll4_t13_end");
    enemies(raw).push({ ...structuredClone(giantAt(raw)), index: 1, enemy_id: "SOME_MINION", name: "小怪", current_hp: 10, max_hp: 10, move_id: "ATTACK_MOVE", intents: [{ index: 0, intent_type: "Attack", label: "5", damage: 5, hits: 1 }] });
    expect(judge(raw, LEAST_LOSS_LABEL).reason).toBe("瀑布巨兽's blast with other enemies alive (小怪): not a logged board");
  });

  it("a DeathBlow on the living Giant, or on another enemy, and another enemy at a million HP", () => {
    const alive = board("qll4_t13_end");
    giantAt(alive)["max_hp"] = 250;
    giantAt(alive)["current_hp"] = 40;
    expect(judge(alive, LEAST_LOSS_LABEL).reason).toBe("瀑布巨兽 shows a DeathBlow intent before it was killed (move EXPLODE_MOVE, intent DeathBlow 50): not a logged shape");
    const other = board("qll4_t13_end");
    giantAt(other)["enemy_id"] = "SOME_BOMB";
    giantAt(other)["name"] = "炸弹怪";
    giantAt(other)["max_hp"] = 30;
    expect(judge(other, LEAST_LOSS_LABEL).reason).toBe("炸弹怪 is in a special phase (a DeathBlow intent; move EXPLODE_MOVE, intent DeathBlow 50): only the Waterfall Giant's blast is judged");
    const huge = board("qll4_t13_end");
    giantAt(huge)["enemy_id"] = "SOME_BOSS";
    giantAt(huge)["name"] = "巨怪";
    intent(huge)["intent_type"] = "Attack";
    expect(judge(huge, LEAST_LOSS_LABEL).reason).toBe("巨怪 is in a special phase (a million HP; move EXPLODE_MOVE, intent Attack 50): only the Waterfall Giant's blast is judged");
  });
});

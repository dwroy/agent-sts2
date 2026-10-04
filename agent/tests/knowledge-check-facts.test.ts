/**
 * Knowledge check 2026-09-29 (Dai: the guide, the handbook, Jev's hints, the card tiers and the boss notes are
 * knowledge like the experience base; where our data says otherwise, the data's version, with its ascension and
 * n; counts filled from the data, not hand-written). See paper/materials/experience-changelog.md「知识库核对」.
 */

import { afterEach, describe, expect, it } from "vitest";

import { hintText, loadHints } from "../src/knowledge/jev-hints.js";
import { powerAmountByAscText, setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setRoomCostsForTests } from "../src/knowledge/room-costs.js";
import { bossNote } from "../src/project/run-journal.js";
import {
  bossNote as clockBossNote,
  bossProfile,
  bossRecord,
  cardOutcomeText,
  crabKillRecord,
  crabKillShort,
  crabKillText,
  fillGuideFacts,
  lagSleepRecord,
  lagSleepText,
  laserT4Text,
  setUnblockedSharesForTests,
  unknownFightsText,
  type CrabFightRow,
  type LagSleepRow,
} from "../src/strategy/boss-clock.js";

const crab = (first: CrabFightRow["first"], won: boolean, run?: string): CrabFightRow => ({ first, won, ...(run ? { run } : {}) });
const CRAB = {
  "0": [crab("ROCKET", true), crab("CRUSHER", false), crab(null, false)],
  "8": [crab("ROCKET", true), crab("ROCKET", false), crab("CRUSHER", true), crab(null, false), crab(null, true)],
  "9": [crab(null, false), crab(null, false)],
};
const lag = (won: boolean, wokeTurn: number, wokePct: number, strength: string[], run: string): LagSleepRow => ({ won, woke_turn: wokeTurn, woke_pct: wokePct, strength, run });
const LAG = {
  "2": [lag(false, 1, 5, ["INFLAME"], "KFP1"), lag(true, 2, 3, [], "TXLH")],
  "8": [lag(true, 3, 4, ["INFLAME"], "ZWX5"), lag(true, 3, 2, [], "6HRZ"), lag(false, 3, 5, [], "24UZ"), lag(true, 2, 52, ["FIGHT_ME"], "EZ2L")],
  "9": [lag(true, 1, 26, ["JUGGERNAUT"], "0NZB"), lag(false, 3, 2, [], "BXAZ"), lag(false, 3, 5, [], "WQ67"), lag(true, 3, 7, [], "VBHZ")],
};

afterEach(() => {
  setUnblockedSharesForTests(null);
  setMonsterDbForTests(null);
  setRoomCostsForTests(null);
});

describe("counted records instead of hand-written ones", () => {
  it("the crab's kill order: Rocket first, Crusher first, neither; all ascensions, A8 and A9 (was \"51 场…39 场赢 8\")", () => {
    expect(crabKillText(CRAB, "zh")).toBe(
      "有记录的 10 场螃蟹战：火箭先死 3 场赢 2，碾碎爪先死 2 场赢 1，没有哪只先死（同回合一起死或我方先死）5 场赢 1（A8 火箭先死 1/2、其余 2/3；A9 火箭先死 0/0、其余 0/2）",
    );
    expect(crabKillText(CRAB, "en")).toBe("10 logged crab fights: Rocket died first 2/3 won, Crusher first 1/2, neither died first 1/5");
    expect(crabKillShort(CRAB)).toBe("Rocket died first 2/3 won, otherwise 2/7");
    setUnblockedSharesForTests({ KAISER_CRAB: { unblocked_share: 0.35, fights: 10, turns: 70, first_death: CRAB } });
    expect(crabKillRecord("zh")).toBe(crabKillText(CRAB, "zh"));
    expect(fillGuideFacts("{CRAB_KILL_ORDER}|{CRAB_KILLS_EN}")).toBe(`${crabKillText(CRAB, "zh")}|${crabKillShort(CRAB)}`);
    // The boss notes (DeepSeek's run journal, the boss clock) carry it: from A8 up A8's fights and A9's apart
    // (2026-10-04, recordBand), below A8 the text over every ascension.
    expect(crabKillText(CRAB, "zh", [8, 9])).toBe(
      "有记录的螃蟹战 A8 5 场赢 3，火箭先死 2 场赢 1、碾碎爪先死 1 场赢 1、没有哪只先死 2 场赢 1；A9 2 场赢 0，火箭先死 0 场赢 0、碾碎爪先死 0 场赢 0、没有哪只先死 2 场赢 0（没有哪只先死 = 同回合一起死或我方先死）",
    );
    expect(crabKillText(CRAB, "en", [8, 9])).toBe(
      "logged crab fights A8 5 (3 won): Rocket died first 1/2 won, Crusher first 1/1, neither died first 1/2; A9 2 (0 won): Rocket died first 0/0 won, Crusher first 0/0, neither died first 0/2",
    );
    expect(crabKillShort(CRAB, [8, 9])).toBe("A8 Rocket died first 1/2 won, otherwise 2/3; A9 Rocket died first 0/0 won, otherwise 0/2");
    expect(bossNote("KAISER_CRAB_BOSS", 9)).toContain(`（${crabKillText(CRAB, "zh", [8, 9])}；经验 crab-kill-order）`);
    expect(bossNote("KAISER_CRAB_BOSS", 7)).toContain(`（${crabKillText(CRAB, "zh")}；经验 crab-kill-order）`);
    expect(clockBossNote(bossProfile("KAISER_CRAB")!, 9)).toContain(`(${crabKillText(CRAB, "en", [8, 9])}; experience crab-kill-order)`);
    expect(clockBossNote(bossProfile("KAISER_CRAB")!, 7)).toContain(`(${crabKillText(CRAB, "en")}; experience crab-kill-order)`);
  });

  it("the Matriarch's sleep: decks without lasting Strength by ascension, bursts vs chip damage that woke it", () => {
    expect(lagSleepText(LAG, "zh")).toBe(
      "A8 有持续力量牌 2/2 赢、没有 1/2 赢（输的 24UZ 都等它自然醒，前两回合没有伤害进它）；A9 有持续力量牌 1/1 赢、没有 1/3 赢（输的 BXAZ、WQ67 都等它自然醒，前两回合没有伤害进它）；T1–T2 一次打掉 ≥25% 打醒的 2 场赢 2（EZ2L 52%、0NZB 26%），小伤害打醒的 2 场赢 1",
    );
    expect(lagSleepText(LAG, "en")).toBe("decks without a lasting-Strength card won A8 1/2, A9 1/3");
    setUnblockedSharesForTests({ LAGAVULIN_MATRIARCH: { unblocked_share: 0.5, fights: 10, turns: 90, sleep: LAG } });
    expect(lagSleepRecord("zh")).toBe(lagSleepText(LAG, "zh"));
    // From A8 up (2026-10-04, recordBand) the T1-T2 wake-ups are counted by ascension too (KFP1 and TXLH were A2).
    expect(lagSleepText(LAG, "zh", [8, 9])).toBe(
      "A8 有持续力量牌 2/2 赢、没有 1/2 赢（输的 24UZ 都等它自然醒，前两回合没有伤害进它），T1–T2 一次打掉 ≥25% 打醒的 1 场赢 1（EZ2L 52%）、小伤害打醒的 0 场赢 0；A9 有持续力量牌 1/1 赢、没有 1/3 赢（输的 BXAZ、WQ67 都等它自然醒，前两回合没有伤害进它），T1–T2 一次打掉 ≥25% 打醒的 1 场赢 1（0NZB 26%）、小伤害打醒的 0 场赢 0",
    );
    expect(lagSleepText({ "8": LAG["8"] }, "zh", [8, 9])).toMatch(/；A9 还没有记录$/);
    expect(lagSleepRecord("zh", 9)).toBe(lagSleepText(LAG, "zh", [8, 9]));
    expect(lagSleepRecord("zh", 7)).toBe(lagSleepText(LAG, "zh"));
    const note = bossNote("LAGAVULIN_MATRIARCH_BOSS", 9)!;
    expect(note).toContain("牌组没有持续力量牌时沉睡回合几乎白过");
    expect(note).toContain(lagSleepText(LAG, "zh", [8, 9]));
    expect(bossNote("LAGAVULIN_MATRIARCH_BOSS", 7)!).toContain(lagSleepText(LAG, "zh"));
  });

  it("a boss's fights won by ascension (was \"帝皇蟹（5 局死在它手上\" in the handbook)", () => {
    expect(bossRecord("KAISER_CRAB", { "8": { fights: 24, won: 5 }, "9": { fights: 5, won: 0 } })).toBe("A8 24 场赢 5、A9 5 场赢 0");
    expect(bossRecord("TEST_SUBJECT", { "8": { fights: 3, won: 0 } })).toBe("A8 3 场赢 0、A9 还没有记录");
    setUnblockedSharesForTests({ KAISER_CRAB: { unblocked_share: 0.35, fights: 29, turns: 200, by_asc: { "8": { fights: 24, won: 5 }, "9": { fights: 5, won: 0 } } } });
    expect(fillGuideFacts("帝皇蟹（{BOSS_RECORD:KAISER_CRAB}）")).toBe("帝皇蟹（A8 24 场赢 5、A9 5 场赢 0）");
  });

  it("the Beast's stun HP and the Rocket's T4 Laser by ascension, from the monster DB (were a flat 150 and \"49\")", () => {
    const counts = (asc: Record<string, number>) => Object.fromEntries(Object.entries(asc).map(([key, amount]) => [key, { [String(amount)]: 3 }]));
    setMonsterDbForTests({
      bosses: {},
      encounters: {},
      monsters: {
        CEREMONIAL_BEAST: { powers: { PLOW_POWER: { amount_at_first_sight_by_asc: counts({ "0": 150, "4": 150, "8": 150, "9": 160 }) } } },
        ROCKET: {
          moves: {
            LASER_MOVE: { damage_by_asc: { "8": { base_per_hit: { "31": 4 }, hits: { "1": 4 } }, "9": { base_per_hit: { "35": 2 }, hits: { "1": 2 } } } },
            CHARGE_UP_MOVE: { self_powers_gained_by_asc: { "8": { STRENGTH_POWER: { "2": 30 } }, "9": { STRENGTH_POWER: { "3": 5 } } } },
          },
        },
      },
    } as never);
    expect(powerAmountByAscText("CEREMONIAL_BEAST", "PLOW_POWER")).toBe("A0–A8 150、A9 160");
    expect(fillGuideFacts("{BEAST_STUN}")).toBe("A0–A8 150、A9 160");
    expect(laserT4Text()).toBe("A8 33（背后 49）、A9 38（背后 57）");
    expect(fillGuideFacts("{@9:DMG:ROCKET:LASER_MOVE}/{@8:DMG:ROCKET:LASER_MOVE}")).toBe("35/31");
  });

  it("? rooms that were fights, and what those fights cost against a hallway's (room-costs.json UnknownFight)", () => {
    const room = (n: number, fightMedian?: number, fightP75?: number) => ({ n, median: 0, p75: 0, mean: 0, ...(fightMedian !== undefined ? { fight_median: fightMedian, fight_p75: fightP75 } : {}) });
    setRoomCostsForTests({ "9": { "2": { Unknown: room(81), UnknownFight: room(13, 19, 27), Monster: room(120, 13, 23.2) } } });
    expect(unknownFightsText()).toBe("A9 二幕 81 个问号开出 13 场（16%），战内掉血中位/p75 19/27（走廊 13/23.2）");
    setRoomCostsForTests({});
    expect(unknownFightsText()).toBe("问号开战的数据还没有");
  });

  it("a card's outcome rows (the guide quotes them where the data moved a grade: Taunt)", () => {
    const stats = {
      ascension: 8,
      cards: { TAUNT: { by_act: { "1": { picked: { n: 51, boss_pass: 0.65 }, offered_not_picked: { n: 35, boss_pass: 0.77 } }, "2": { picked: { n: 27, boss_pass: 0.22 } } } } },
    };
    expect(cardOutcomeText("TAUNT", stats)).toBe("A8 一幕拿了 51 局过 boss 65%、给了没拿 35 局 77%");
    expect(cardOutcomeText("OFFERING", stats)).toBe("还没有足够的记录");
  });
});

describe("Jev's hints", () => {
  const byId = (id: string) => loadHints().find((hint) => hint.id === id)!;

  it("the crab record is counted, the Laser comes with Charge Up's Strength", () => {
    expect(byId("crab-rocket-first").text).toContain("({CRAB_KILLS_EN})");
    expect(byId("crab-rocket-first").text).not.toMatch(/9\/12|8\/39/);
    setUnblockedSharesForTests({ KAISER_CRAB: { unblocked_share: 0.35, fights: 10, turns: 70, first_death: CRAB } });
    // At A8 and up each ascension apart (2026-10-04, recordBand); below A8 over every ascension.
    expect(hintText(byId("crab-rocket-first"), 9)).toContain("Focus the Rocket first (A8 Rocket died first 1/2 won, otherwise 2/3; A9 Rocket died first 0/0 won, otherwise 0/2).");
    expect(hintText(byId("crab-rocket-first"), 7)).toContain("Focus the Rocket first (Rocket died first 2/3 won, otherwise 2/7).");
    expect(byId("crab-charge").text).toContain("from behind) plus Strength:");
  });

  it("the Matriarch: sleep turns pay off only with powers; a 25%+ burst may wake it; no count left unfilled", () => {
    expect(byId("matriarch-sleep-turns").text).toContain("pay off only with powers or lasting block");
    expect(byId("matriarch-asleep").text).toContain("a 25%+ HP burst is fine");
    setUnblockedSharesForTests({ LAGAVULIN_MATRIARCH: { unblocked_share: 0.5, fights: 10, turns: 90, sleep: LAG } });
    expect(hintText(byId("matriarch-sleep-turns"), 9)).toContain("(decks without a lasting-Strength card won A8 1/2, A9 1/3)");
  });

  it("hp-trade-boss has the Vantom Slippery exception (3SBP T1)", () => {
    const hint = byId("hp-trade-boss");
    expect(hint.text).toContain("Exception: against Vantom's Slippery, prefer the line with more hits.");
    expect(hint.evidence).toContain("3SBPKG9603WD");
  });
});


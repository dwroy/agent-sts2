/**
 * Knowledge check 2026-09-30 (the A8 window's runs 1-11: RRMY 5LRZ 5PHF UNRL YVYZ Q8XR 3RME NH8A 2WRU 79YR 86C3; Dai's
 * rule: the guide, the handbook, Jev's hints, the card tiers, the boss notes and the experience base are one
 * knowledge base; where our data says otherwise, the data's version with its n; counts filled from the data).
 * See paper/materials/experience-changelog.md「第九次增量」.
 *
 * New data placeholders: {QUEEN_AMALGAM}/{QUEEN_AMALGAM_EN} (the Queen's Amalgam record), {SANDPIT_DEATHS}/
 * {SANDPIT_DEATHS_EN} (the Insatiable losses by death line), {UNKNOWN_FIGHTS:ASC:ACT}, {BOSS_LOSS:ID:ASC}; and the
 * experience base's lesson texts filled with them (lessonText), as the guides are.
 */

import { afterEach, describe, expect, it } from "vitest";

import { lessonText } from "../src/knowledge/experience.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setRoomCostsForTests } from "../src/knowledge/room-costs.js";
import {
  bossLossText,
  fillGuideFacts,
  queenAmalgamRecord,
  queenAmalgamText,
  sandpitDeathRecord,
  sandpitDeathText,
  setUnblockedSharesForTests,
  type QueenFightRow,
  type SandpitFightRow,
} from "../src/strategy/boss-clock.js";

const queen = (won: boolean, killed: number | null, t12Queen: number, t12Amalgam: number, run: string): QueenFightRow => ({ won, killed_turn: killed, t12_queen: t12Queen, t12_amalgam: t12Amalgam, run });
const QUEEN = {
  "4": [queen(true, 4, 29, 93, "BDAK")],
  "8": [queen(true, 3, 96, 172, "RBJ4"), queen(false, null, 58, 55, "5LRZ"), queen(false, 6, 93, 79, "Q8XR"), queen(false, 5, 0, 100, "VE97")],
};
const sand = (won: boolean, death: SandpitFightRow["death"], run: string): SandpitFightRow => ({ won, death, run });
const SAND = {
  "8": [sand(false, "hp", "NH8A"), sand(false, "hp", "UNRL"), sand(false, "sandpit", "LXB3"), sand(false, "both", "EJXC"), sand(true, null, "RVR6")],
  "9": [sand(false, "hp", "XMK1"), sand(false, "both", "KY3Y")],
};

afterEach(() => {
  setUnblockedSharesForTests(null);
  setMonsterDbForTests(null);
  setRoomCostsForTests(null);
});

describe("counted records for the Queen and the Insatiable", () => {
  it("the Queen: wins that killed the Amalgam first, losses that never did, and where turns 1-2 went", () => {
    expect(queenAmalgamText(QUEEN, "zh")).toBe(
      "有记录的 5 场女王战：赢的 2 场都先打死聚合体（T3–T4）；输的 3 场 1 场没打死、2 场 T5–T6 才打死；T1–T2 伤害多进女王的 2 场赢 0、多进聚合体的 3 场赢 2（A8 4 场赢 1：RBJ4 T3 打死聚合体）",
    );
    expect(queenAmalgamText(QUEEN, "en")).toBe(
      "5 logged Queen fights: 2/2 wins killed the Amalgam first (T3-T4); 1/3 losses never did; turns 1-2 mostly into the Queen won 0/2, into the Amalgam 2/3",
    );
    expect(queenAmalgamText({}, "zh")).toBe("还没有女王战记录");
    setUnblockedSharesForTests({ QUEEN: { unblocked_share: 0.5, fights: 5, turns: 30, amalgam: QUEEN } });
    expect(queenAmalgamRecord("zh")).toBe(queenAmalgamText(QUEEN, "zh"));
    expect(fillGuideFacts("{QUEEN_AMALGAM}|{QUEEN_AMALGAM_EN}")).toBe(`${queenAmalgamText(QUEEN, "zh")}|${queenAmalgamText(QUEEN, "en")}`);
  });

  it("the Insatiable: losses by death line, all ascensions and A8/A9", () => {
    expect(sandpitDeathText(SAND, "zh")).toBe("有记录的沙虫输局 6 场：死在 HP 上（沙坑还剩 ≥2）3、被沙坑吞掉 1、两条线同一回合 2（A8 4 场 2/1/1，A9 2 场 1/0/1）");
    expect(sandpitDeathText(SAND, "en")).toBe("6 logged losses: 3 died on HP with the Sandpit at 2+, 1 to the Sandpit, 2 both at once");
    setUnblockedSharesForTests({ THE_INSATIABLE: { unblocked_share: 0.5, fights: 7, turns: 50, deaths: SAND } });
    expect(sandpitDeathRecord("en")).toBe(sandpitDeathText(SAND, "en"));
    expect(fillGuideFacts("{SANDPIT_DEATHS}")).toBe(sandpitDeathText(SAND, "zh"));
  });

  it("one cell of the ? room record, and a boss's HP lost a turn at one ascension (monster DB)", () => {
    const room = (n: number, fightMedian?: number, fightP75?: number) => ({ n, median: 0, p75: 0, mean: 0, ...(fightMedian !== undefined ? { fight_median: fightMedian, fight_p75: fightP75 } : {}) });
    setRoomCostsForTests({ "9": { "2": { Unknown: room(81), UnknownFight: room(13, 19, 27), Monster: room(120, 13, 23.2) } } });
    expect(fillGuideFacts("{UNKNOWN_FIGHTS:9:2}")).toBe("A9 二幕 81 个问号开出 13 场（16%），战内掉血中位/p75 19/27（走廊 13/23.2）");
    expect(fillGuideFacts("{UNKNOWN_FIGHTS:8:2}")).toBe("问号开战的数据还没有");
    setMonsterDbForTests({
      bosses: { KAISER_CRAB: { "8": { fights: 26, hp_loss_per_turn: { median: 9.7, p75: 11.8, n: 26 } }, "9": { fights: 5, hp_loss_per_turn: { median: 13, p75: 13.8, n: 5 } } } },
      encounters: {},
      monsters: {},
    } as never);
    expect(bossLossText("KAISER_CRAB", 9)).toBe("13.0");
    expect(fillGuideFacts("{BOSS_LOSS:KAISER_CRAB:9}（A8 {BOSS_LOSS:KAISER_CRAB:8}）")).toBe("13.0（A8 9.7）");
    expect(bossLossText("KAISER_CRAB", 7)).toBe("?");
  });
});

describe("the experience base's lessons are filled like the guides", () => {
  it("a lesson's placeholders are filled from the data; a lesson without any is left as written", () => {
    setUnblockedSharesForTests({ KAISER_CRAB: { unblocked_share: 0.35, fights: 29, turns: 200, by_asc: { "8": { fights: 26, won: 6 }, "9": { fights: 5, won: 0 } } } });
    expect(lessonText({ lesson: "帝王蟹（{BOSS_RECORD:KAISER_CRAB}）" })).toBe("帝王蟹（A8 26 场赢 6、A9 5 场赢 0）");
    expect(lessonText({ lesson: "没有占位符" })).toBe("没有占位符");
  });
});

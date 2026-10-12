/**
 * Knowledge check 2026-09-30 (the A8 window's runs 1-11: RRMY 5LRZ 5PHF UNRL YVYZ Q8XR 3RME NH8A 2WRU 79YR 86C3; Roy's
 * rule: the guide, the handbook, Jev's hints, the card tiers, the boss notes and the experience base are one
 * knowledge base; where our data says otherwise, the data's version with its n; counts filled from the data).
 * See paper/materials/experience-changelog.md「第九次增量」.
 *
 * The Queen: all 5 logged wins killed the Amalgam first; 5LRZ and Q8XR put their T1 burst into the Queen and lost:
 * the boss notes, the guide and a new Jev hint say single-target into the Amalgam from turn 1, with the record. The
 * Insatiable: most A8 losses died on HP with the Sandpit at 2+ (NH8A played Escape over a 41-damage line with HP the
 * earlier line): compare the two death lines; Jev's hint no longer says "Frantic Escape before extra damage".
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { hintText, loadHints } from "../src/knowledge/jev-hints.js";
import { bossNote } from "../src/memory/run-journal.js";
import { knowledgeFile } from "../src/knowledge/files.js";
import {
  bossNote as clockBossNote,
  bossProfile,
  queenAmalgamText,
  sandpitDeathText,
  setUnblockedSharesForTests,
  type QueenFightRow,
  type SandpitFightRow,
} from "../src/sim/boss-clock.js";

const KNOWLEDGE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "knowledge");
const read = (name: string) => readFileSync(knowledgeFile(KNOWLEDGE, name), "utf8");

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

afterEach(() => setUnblockedSharesForTests(null));

describe("the boss notes carry the records", () => {
  it("the Queen: single-target into the Amalgam from turn 1, with its record (DeepSeek zh, the boss clock en)", () => {
    setUnblockedSharesForTests({ QUEEN: { unblocked_share: 0.5, fights: 5, turns: 30, amalgam: QUEEN } });
    // From A8 up A8's fights and A9's apart (2026-10-04, recordBand: BDAK's A4 win is not counted there); below A8
    // the text over every ascension.
    expect(bossNote("QUEEN_BOSS", 8)).toContain(`单体伤害从第 1 回合起就给它，女王只吃群伤（${queenAmalgamText(QUEEN, "zh", [8, 9])}；经验 queen-plan）`);
    expect(bossNote("QUEEN_BOSS", 7)).toContain(`单体伤害从第 1 回合起就给它，女王只吃群伤（${queenAmalgamText(QUEEN, "zh")}；经验 queen-plan）`);
    expect(bossNote("QUEEN_BOSS", 8)).not.toContain("A8 5 场输局");
    expect(clockBossNote(bossProfile("QUEEN")!, 8)).toContain(`(${queenAmalgamText(QUEEN, "en", [8, 9])}; experience queen-plan)`);
    expect(clockBossNote(bossProfile("QUEEN")!, 7)).toContain(`(${queenAmalgamText(QUEEN, "en")}; experience queen-plan)`);
  });

  it("the Insatiable: compare the Sandpit and HP death lines, with the losses by line", () => {
    setUnblockedSharesForTests({ THE_INSATIABLE: { unblocked_share: 0.5, fights: 7, turns: 50, deaths: SAND } });
    const note = bossNote("THE_INSATIABLE_BOSS", 8)!;
    expect(note).toContain("先比沙坑和 HP 哪条死线先到");
    expect(note).toContain(sandpitDeathText(SAND, "zh", [8, 9]));
    expect(bossNote("THE_INSATIABLE_BOSS", 7)!).toContain(sandpitDeathText(SAND, "zh"));
    expect(clockBossNote(bossProfile("THE_INSATIABLE")!, 8)).toContain(sandpitDeathText(SAND, "en", [8, 9]));
    expect(clockBossNote(bossProfile("THE_INSATIABLE")!, 7)).toContain(sandpitDeathText(SAND, "en"));
  });
});

describe("Jev's hints: the Queen and the Sandpit", () => {
  const byId = (id: string) => loadHints().find((hint) => hint.id === id);

  it("a Queen hint while the Amalgam lives: single-target into it from turn 1, the record filled", () => {
    const hint = byId("queen-amalgam-first")!;
    expect(hint.when.enemies).toEqual(["TORCH_HEAD_AMALGAM"]);
    expect(hint.text).toContain("turns 1-2 included");
    expect(hint.evidence).toEqual(expect.arrayContaining(["5LRZ7HJ7YGSY", "Q8XR6EXAF6QV", "RBJ402TKQZ6F"]));
    setUnblockedSharesForTests({ QUEEN: { unblocked_share: 0.5, fights: 5, turns: 30, amalgam: QUEEN } });
    expect(hintText(hint, 8)).toContain(`(${queenAmalgamText(QUEEN, "en", [8, 9])})`);
    expect(hintText(hint, 7)).toContain(`(${queenAmalgamText(QUEEN, "en")})`);
  });

  it("the Sandpit hints compare the two death lines; no 'Escape before extra damage'", () => {
    expect(byId("sandpit-no-race")).toBeUndefined();
    expect(byId("sandpit-zero")!.text).toContain("Play Escape when the Sandpit would end me before my HP does.");
    const hpFirst = byId("sandpit-hp-first")!;
    expect(hpFirst.evidence).toContain("NH8A3VBDRDZW");
    setUnblockedSharesForTests({ THE_INSATIABLE: { unblocked_share: 0.5, fights: 7, turns: 50, deaths: SAND } });
    expect(hintText(hpFirst, 8)).toBe(`When my HP runs out before the Sandpit, Escapes only waste energy: block or deal damage instead (${sandpitDeathText(SAND, "en", [8, 9])}).`);
    expect(hintText(hpFirst, 7)).toBe(`When my HP runs out before the Sandpit, Escapes only waste energy: block or deal damage instead (${sandpitDeathText(SAND, "en")}).`);
    for (const hint of loadHints()) expect(hint.text, hint.id).not.toContain("Frantic Escape before extra damage");
  });
});

describe("the guides: this batch's conflicts rewritten to the data's version", () => {
  it("the guide", () => {
    const guide = read("ironclad-guide.md");
    expect(guide).not.toContain("沙坑 ≤2 时先打逃离再输出");
    expect(guide).toContain("{SANDPIT_DEATHS}");
    expect(guide).not.toMatch(/4 场女王胜局都在 T4–T8|A8 5 场输局聚合体都活过 T5/);
    expect(guide.split("{QUEEN_AMALGAM}").length - 1).toBe(2);
    expect(guide).toContain("单体伤害从第 1 回合起就给聚合体");
    expect(guide).not.toContain("先小打再重击");
    expect(guide).toContain("剩余 HP 扛得住瓦解叠加时才选瓦解");
    expect(guide).toContain("能删的诅咒（受伤、孢子心灵）排在打击前");
  });

  it("the handbook", () => {
    const handbook = read("ds-handbook.md");
    expect(handbook).not.toContain("一幕赢局 81% 有 AOE，输局只有 47%");
    expect(handbook).toContain("A8 一幕 boss 152 场");
    expect(handbook).toContain("HP 也是一条死线");
    expect(handbook).not.toContain("输局 2.3 张");
  });
});

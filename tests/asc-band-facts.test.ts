/**
 * Dai 2026-10-04 (experience by ascension; the ascension audit, experience 2026-10-04.2): the data placeholders that
 * counted fights over every logged ascension ({CRAB_KILL_ORDER}, {QUEEN_AMALGAM}, {SANDPIT_DEATHS}, their _EN forms,
 * {LAG_SLEEP}'s wake-ups) or pooled A8 with A9 ({GIANT_BLOCK_RECORD}) are read by the run's ascension band: from A8 up
 * A8's fights and A9's apart ("A8 n 场赢 k；A9 n 场赢 k"), below A8 the text as written before. Marked with the run's
 * ascension ({@9:CRAB_KILL_ORDER}), they have their own keys in the day's frozen table (render/facts.ts), so a table
 * filled earlier the same day with the all-ascension text is not handed to an A9 run, and they stay byte-stable within
 * the day. Fixed data throughout (setUnblockedSharesForTests), never the refreshing boss-damage.json.
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { lessonText } from "../src/knowledge/experience.js";
import { hintText, type JevHint } from "../src/knowledge/jev-hints.js";
import { loadPostmortems } from "../src/knowledge/render/data.js";
import { frozenFacts } from "../src/knowledge/render/facts.js";
import { renderKnowledgeSections } from "../src/knowledge/render/knowledge-prefix.js";
import { queryOldKnowledge } from "../src/knowledge/render/old-knowledge.js";
import { jevLessonLine } from "../src/screens/jev-experience.js";
import {
  crabKillShort,
  crabKillText,
  factsAtAscension,
  fillGuideFacts,
  giantBlockBandText,
  giantBlockText,
  lagSleepText,
  queenAmalgamText,
  recordBand,
  sandpitDeathText,
  setUnblockedSharesForTests,
  type CrabFightRow,
  type GiantKillRow,
  type LagSleepRow,
  type QueenFightRow,
  type SandpitFightRow,
  type UnblockedShare,
} from "../src/strategy/boss-clock.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "gkb-data", "knowledge");
const LESSONS = join(HERE, "gkb-data", "lessons.md");
const PLACEHOLDER = /\{@?[A-Z0-9][A-Z0-9_]*(?::[A-Z0-9_]+)*\}/;
const at = (day: number, hour: number) => () => new Date(2026, 9, day, hour, 0, 0);

const crab = (first: CrabFightRow["first"], won: boolean): CrabFightRow => ({ first, won });
const queen = (won: boolean, killed: number | null, t12Queen: number, t12Amalgam: number, run: string): QueenFightRow => ({ won, killed_turn: killed, t12_queen: t12Queen, t12_amalgam: t12Amalgam, run });
const sand = (won: boolean, death: SandpitFightRow["death"]): SandpitFightRow => ({ won, death });
const lag = (won: boolean, wokeTurn: number, wokePct: number, strength: string[], run: string): LagSleepRow => ({ won, woke_turn: wokeTurn, woke_pct: wokePct, strength, run });
const kill = (turn: number | null, won: boolean, hp?: number, stacks?: number): GiantKillRow => ({ turn, won, ...(hp === undefined ? {} : { hp, stacks }) });

/** A low-ascension crowd under every record (A0-A7), and A8/A9 rows that tell a different story. */
const DATA: Record<string, UnblockedShare> = {
  KAISER_CRAB: {
    unblocked_share: 0.35,
    fights: 9,
    turns: 70,
    first_death: { "0": [crab("ROCKET", true), crab("ROCKET", true), crab(null, true)], "8": [crab("ROCKET", true), crab(null, false), crab(null, false)], "9": [crab("CRUSHER", true), crab(null, false), crab(null, false)] },
  },
  QUEEN: {
    unblocked_share: 0.5,
    fights: 4,
    turns: 30,
    amalgam: { "4": [queen(true, 4, 29, 93, "BDAK")], "8": [queen(true, 3, 96, 172, "RBJ4"), queen(false, null, 58, 55, "5LRZ")], "9": [queen(false, 4, 14, 126, "Y8E0")] },
  },
  THE_INSATIABLE: {
    unblocked_share: 0.5,
    fights: 6,
    turns: 40,
    deaths: { "2": [sand(false, "sandpit"), sand(false, "sandpit")], "8": [sand(false, "hp"), sand(true, null)], "9": [sand(false, "both"), sand(false, "hp")] },
  },
  LAGAVULIN_MATRIARCH: {
    unblocked_share: 0.5,
    fights: 4,
    turns: 30,
    sleep: { "2": [lag(true, 1, 5, [], "TXLH"), lag(true, 2, 3, [], "KFP1")], "8": [lag(true, 2, 52, ["FIGHT_ME"], "EZ2L")], "9": [lag(false, 3, 2, [], "BXAZ")] },
  },
  WATERFALL_GIANT: { unblocked_share: 0.3, fights: 4, turns: 40, kills: { "8": [kill(9, true, 25, 30), kill(10, false, 10, 39)], "9": [kill(9, true, 30, 41), kill(null, false)] } },
};

afterEach(() => setUnblockedSharesForTests(null));

describe("the ascension band", () => {
  it("from A8 up: A8 and A9 apart (and the run's own above them); below A8 or unknown: none", () => {
    expect(recordBand(9)).toEqual([8, 9]);
    expect(recordBand(8)).toEqual([8, 9]);
    expect(recordBand(10)).toEqual([8, 9, 10]);
    expect(recordBand(7)).toBeNull();
    expect(recordBand(0)).toBeNull();
    expect(recordBand(undefined)).toBeNull();
  });

  it("marks only the records that count over several ascensions, only from A8 up", () => {
    const text = "{CRAB_KILL_ORDER}/{CRAB_KILLS_EN}/{QUEEN_AMALGAM}/{QUEEN_AMALGAM_EN}/{SANDPIT_DEATHS}/{SANDPIT_DEATHS_EN}/{LAG_SLEEP}/{GIANT_BLOCK_RECORD}/{BOSS_RECORD:KAISER_CRAB}/{GIANT_KILLS_A9}/{LAG_NO_STRENGTH_EN}";
    expect(factsAtAscension(text, 9)).toBe(
      "{@9:CRAB_KILL_ORDER}/{@9:CRAB_KILLS_EN}/{@9:QUEEN_AMALGAM}/{@9:QUEEN_AMALGAM_EN}/{@9:SANDPIT_DEATHS}/{@9:SANDPIT_DEATHS_EN}/{@9:LAG_SLEEP}/{@9:GIANT_BLOCK_RECORD}/{BOSS_RECORD:KAISER_CRAB}/{GIANT_KILLS_A9}/{LAG_NO_STRENGTH_EN}",
    );
    expect(factsAtAscension(text, 7)).toBe(text);
    expect(factsAtAscension(text, undefined)).toBe(text);
    // A marked one matches the frozen table's placeholder pattern (it gets a key of its own there).
    expect("{@9:CRAB_KILL_ORDER}").toMatch(PLACEHOLDER);
  });
});

describe("each record by the band, the old text below A8", () => {
  it("fills a marked record by its ascension's band; unmarked or below A8, the text over every ascension", () => {
    setUnblockedSharesForTests(DATA);
    const firstDeath = DATA["KAISER_CRAB"]!.first_death!;
    expect(fillGuideFacts("{@9:CRAB_KILL_ORDER}")).toBe(crabKillText(firstDeath, "zh", [8, 9]));
    expect(fillGuideFacts("{CRAB_KILL_ORDER}", 9)).toBe(crabKillText(firstDeath, "zh", [8, 9]));
    expect(fillGuideFacts("{CRAB_KILL_ORDER}", 8)).toBe(crabKillText(firstDeath, "zh", [8, 9]));
    expect(fillGuideFacts("{CRAB_KILL_ORDER}", 7)).toBe(crabKillText(firstDeath, "zh"));
    expect(fillGuideFacts("{@7:CRAB_KILL_ORDER}")).toBe(crabKillText(firstDeath, "zh"));
    expect(fillGuideFacts("{CRAB_KILL_ORDER}")).toBe(crabKillText(firstDeath, "zh"));
    // Not a band record: left to the other fills; an unknown marked name is left as written.
    expect(fillGuideFacts("{@9:NOT_A_FACT}")).toBe("{@9:NOT_A_FACT}");
  });

  it("A9: the low-ascension wins no longer lift the A8/A9 records", () => {
    setUnblockedSharesForTests(DATA);
    const nine = (name: string) => fillGuideFacts(`{${name}}`, 9);
    expect(nine("CRAB_KILL_ORDER")).toBe(
      "有记录的螃蟹战 A8 3 场赢 1，火箭先死 1 场赢 1、碾碎爪先死 0 场赢 0、没有哪只先死 2 场赢 0；A9 3 场赢 1，火箭先死 0 场赢 0、碾碎爪先死 1 场赢 1、没有哪只先死 2 场赢 0（没有哪只先死 = 同回合一起死或我方先死）",
    );
    expect(nine("CRAB_KILLS_EN")).toBe("A8 Rocket died first 1/1 won, otherwise 0/2; A9 Rocket died first 0/0 won, otherwise 1/3");
    expect(nine("QUEEN_AMALGAM")).toBe(
      "有记录的女王战 A8 2 场赢 1，赢的都先打死聚合体（RBJ4 T3），输的 1 场 1 场没打死，T1–T2 伤害多进女王的 1 场赢 0、多进聚合体的 1 场赢 1；A9 1 场赢 0，还没有赢过，输的 1 场 0 场没打死、1 场 T4 才打死，T1–T2 伤害多进女王的 0 场赢 0、多进聚合体的 1 场赢 0",
    );
    expect(nine("QUEEN_AMALGAM_EN")).toBe(
      "logged Queen fights A8 2 (1 won): 1/1 wins killed the Amalgam first (T3), 1/1 losses never killed it, turns 1-2 mostly into the Queen won 0/1, into the Amalgam 1/1; A9 1 (0 won): no win yet, 0/1 losses never killed it, turns 1-2 mostly into the Queen won 0/0, into the Amalgam 0/1",
    );
    expect(nine("SANDPIT_DEATHS")).toBe("有记录的沙虫输局 A8 1 场：死在 HP 上（沙坑还剩 ≥2）1、被沙坑吞掉 0、两条线同一回合 0；A9 2 场：死在 HP 上 1、被沙坑吞掉 0、两条线同一回合 1");
    expect(nine("SANDPIT_DEATHS_EN")).toBe("logged losses A8 1: 1 died on HP with the Sandpit at 2+, 0 to the Sandpit, 0 both at once; A9 2: 1 on HP, 0 to the Sandpit, 1 both at once");
    expect(nine("LAG_SLEEP")).toBe(
      "A8 有持续力量牌 1/1 赢、没有 0/0 赢，T1–T2 一次打掉 ≥25% 打醒的 1 场赢 1（EZ2L 52%）、小伤害打醒的 0 场赢 0；A9 有持续力量牌 0/0 赢、没有 0/1 赢（输的 BXAZ 都等它自然醒，前两回合没有伤害进它），T1–T2 一次打掉 ≥25% 打醒的 0 场赢 0、小伤害打醒的 0 场赢 0",
    );
    expect(nine("GIANT_BLOCK_RECORD")).toBe("有击杀的巨兽战按所需格挡（层数 − HP）分：A8 2 场中 ≤13 的 1 场赢 1，≥20 的 1 场赢 0；A9 1 场中 ≤13 的 1 场赢 1，≥20 的 0 场赢 0");
    // The same records below A8: as written before (every ascension; the Giant's A8 and A9 pooled).
    const seven = (name: string) => fillGuideFacts(`{${name}}`, 7);
    expect(seven("CRAB_KILL_ORDER")).toBe(crabKillText(DATA["KAISER_CRAB"]!.first_death!, "zh"));
    expect(seven("CRAB_KILLS_EN")).toBe(crabKillShort(DATA["KAISER_CRAB"]!.first_death!));
    expect(seven("CRAB_KILLS_EN")).toBe("Rocket died first 3/3 won, otherwise 2/6");
    expect(seven("QUEEN_AMALGAM_EN")).toBe(queenAmalgamText(DATA["QUEEN"]!.amalgam!, "en"));
    expect(seven("SANDPIT_DEATHS")).toBe(sandpitDeathText(DATA["THE_INSATIABLE"]!.deaths!, "zh"));
    expect(seven("LAG_SLEEP")).toBe(lagSleepText(DATA["LAGAVULIN_MATRIARCH"]!.sleep!, "zh"));
    expect(seven("GIANT_BLOCK_RECORD")).toBe(giantBlockText([...DATA["WATERFALL_GIANT"]!.kills!["8"]!, ...DATA["WATERFALL_GIANT"]!.kills!["9"]!], "zh"));
    expect(giantBlockBandText(DATA["WATERFALL_GIANT"]!.kills!, "zh", [8, 9])).toBe(nine("GIANT_BLOCK_RECORD"));
  });

  it("the run's own ascension above A9 is a column of its own", () => {
    setUnblockedSharesForTests({ KAISER_CRAB: { ...DATA["KAISER_CRAB"]!, first_death: { ...DATA["KAISER_CRAB"]!.first_death!, "10": [crab("ROCKET", false)] } } });
    expect(fillGuideFacts("{CRAB_KILLS_EN}", 10)).toBe("A8 Rocket died first 1/1 won, otherwise 0/2; A9 Rocket died first 0/0 won, otherwise 1/3; A10 Rocket died first 0/1 won, otherwise 0/0");
  });

  it("Jev's hints, the experience lessons (v3 slice and Jev's lines) and the kb_old_knowledge keyword search read the band", () => {
    setUnblockedSharesForTests(DATA);
    const hint: JevHint = { id: "crab-rocket-first", when: { enemies: ["CRUSHER"] }, text: "Focus the Rocket first ({CRAB_KILLS_EN}).", evidence: [] } as JevHint;
    expect(hintText(hint, 9)).toBe("Focus the Rocket first (A8 Rocket died first 1/1 won, otherwise 0/2; A9 Rocket died first 0/0 won, otherwise 1/3).");
    expect(hintText(hint, 7)).toBe("Focus the Rocket first (Rocket died first 3/3 won, otherwise 2/6).");
    const lesson = { lesson: "输局按死线分：{SANDPIT_DEATHS}。" };
    expect(lessonText(lesson, 9)).toBe(`输局按死线分：${sandpitDeathText(DATA["THE_INSATIABLE"]!.deaths!, "zh", [8, 9])}。`);
    expect(lessonText(lesson, 7)).toBe(`输局按死线分：${sandpitDeathText(DATA["THE_INSATIABLE"]!.deaths!, "zh")}。`);
    expect(lessonText(lesson)).toBe(lessonText(lesson, 7));
    const entry = { id: "x", scope: "boss:THE_INSATIABLE", asc: [0, 20], lesson: lesson.lesson, evidence: [], n_support: 1, n_contradict: 0, confidence: "med", status: "active" } as never;
    expect(jevLessonLine(entry, 9)).toContain(sandpitDeathText(DATA["THE_INSATIABLE"]!.deaths!, "zh", [8, 9]));
    // kb_old_knowledge with a keyword: the guide's lines filled at the run's ascension.
    const knowledgeDir = mkdtempSync(join(tmpdir(), "asc-band-kn-"));
    cpSync(FIXTURE, knowledgeDir, { recursive: true });
    writeFileSync(join(knowledgeDir, "ironclad-guide.md"), `${readFileSync(join(knowledgeDir, "ironclad-guide.md"), "utf8")}\n- 帝皇蟹击杀顺序：{CRAB_KILL_ORDER}。\n`);
    expect(queryOldKnowledge({ ascension: 9, knowledgeDir }, "guide", "帝皇蟹击杀顺序")).toContain(`帝皇蟹击杀顺序：${crabKillText(DATA["KAISER_CRAB"]!.first_death!, "zh", [8, 9])}。`);
    expect(queryOldKnowledge({ ascension: 7, knowledgeDir }, "guide", "帝皇蟹击杀顺序")).toContain(`帝皇蟹击杀顺序：${crabKillText(DATA["KAISER_CRAB"]!.first_death!, "zh")}。`);
  });
});

describe("the prefix with the day's frozen table", () => {
  /** The fixture with band records in the guide, the handbook, a Jev hint and a lesson. */
  const withBandPlaceholders = (): string => {
    const dir = mkdtempSync(join(tmpdir(), "asc-band-kn-"));
    cpSync(FIXTURE, dir, { recursive: true });
    writeFileSync(join(dir, "ironclad-guide.md"), `${readFileSync(join(dir, "ironclad-guide.md"), "utf8")}\n- 帝皇蟹：{CRAB_KILL_ORDER}；战绩 {BOSS_RECORD:KAISER_CRAB}。\n`);
    writeFileSync(join(dir, "ds-handbook.md"), `${readFileSync(join(dir, "ds-handbook.md"), "utf8")}\n- 巨兽：{GIANT_BLOCK_RECORD}。\n`);
    const hints = JSON.parse(readFileSync(join(dir, "jev-hints.json"), "utf8")) as { hints: unknown[] };
    hints.hints.push({ id: "crab-rocket-first", when: { enemies: ["CRUSHER"] }, text: "Focus the Rocket first ({CRAB_KILLS_EN}).", evidence: [] });
    writeFileSync(join(dir, "jev-hints.json"), JSON.stringify(hints));
    const experience = JSON.parse(readFileSync(join(dir, "experience.json"), "utf8")) as { entries: { lesson: string; status?: string; asc?: number[] }[] };
    const active = experience.entries.find((entry) => (entry.status ?? "active") === "active" && (entry.asc ?? [0, 20])[0]! <= 7 && 9 <= (entry.asc ?? [0, 20])[1]!)!;
    active.lesson = `${active.lesson} 女王：{QUEEN_AMALGAM}。`;
    writeFileSync(join(dir, "experience.json"), JSON.stringify(experience));
    return dir;
  };
  const section = (sections: { key: string; text: string }[], key: string) => sections.filter((item) => item.key === key || item.key.startsWith(`${key}.`)).map((item) => item.text).join("\n");

  it("a table filled earlier the day with the all-ascension text: the A9 run takes its band, the A7 run the old values", () => {
    setUnblockedSharesForTests(DATA);
    const knowledgeDir = withBandPlaceholders();
    const factsDir = mkdtempSync(join(tmpdir(), "asc-band-day-"));
    // The table as the 00:05 render left it, before this change (stand-in values).
    const earlier = { "{CRAB_KILL_ORDER}": "旧蟹", "{GIANT_BLOCK_RECORD}": "旧巨兽", "{QUEEN_AMALGAM}": "旧女王", "A9|{CRAB_KILLS_EN}": "old crab", "{BOSS_RECORD:KAISER_CRAB}": "蟹战绩冻结值" };
    writeFileSync(join(factsDir, "2026-10-04-prefix-facts.json"), JSON.stringify(earlier));
    const postmortems = loadPostmortems(LESSONS);
    const nine = renderKnowledgeSections({ ascension: 9, knowledgeDir, facts: frozenFacts(factsDir, at(4, 10)) }, postmortems);
    const band = (name: string) => fillGuideFacts(`{${name}}`, 9);
    expect(section(nine, "old.guide")).toContain(`帝皇蟹：${band("CRAB_KILL_ORDER")}；战绩 蟹战绩冻结值。`);
    expect(section(nine, "old.handbook")).toContain(`巨兽：${band("GIANT_BLOCK_RECORD")}。`);
    expect(section(nine, "old.jev_hints")).toContain(`Focus the Rocket first (${band("CRAB_KILLS_EN")}).`);
    expect(section(nine, "experience")).toContain(`女王：${band("QUEEN_AMALGAM")}。`);
    for (const item of nine) expect(item.text, item.key).not.toMatch(PLACEHOLDER);
    for (const old of ["旧蟹", "旧巨兽", "旧女王", "old crab"]) expect(nine.map((item) => item.text).join("\n")).not.toContain(old);
    // The marked records went into the table under their own keys; the earlier keys are kept for the A7 run.
    const table = JSON.parse(readFileSync(join(factsDir, "2026-10-04-prefix-facts.json"), "utf8")) as Record<string, string>;
    expect(table).toMatchObject({ ...earlier, "{@9:CRAB_KILL_ORDER}": band("CRAB_KILL_ORDER"), "{@9:GIANT_BLOCK_RECORD}": band("GIANT_BLOCK_RECORD"), "{@9:QUEEN_AMALGAM}": band("QUEEN_AMALGAM"), "A9|{@9:CRAB_KILLS_EN}": band("CRAB_KILLS_EN") });
    const seven = renderKnowledgeSections({ ascension: 7, knowledgeDir, facts: frozenFacts(factsDir, at(4, 11)) }, postmortems);
    expect(section(seven, "old.guide")).toContain("帝皇蟹：旧蟹；战绩 蟹战绩冻结值。");
    expect(section(seven, "old.handbook")).toContain("巨兽：旧巨兽。");
    expect(section(seven, "experience")).toContain("女王：旧女王。");
  });

  it("byte-stable within the day: a data refresh and a new process leave the band records as first filled; the next day refills them", () => {
    setUnblockedSharesForTests(DATA);
    const knowledgeDir = withBandPlaceholders();
    const factsDir = mkdtempSync(join(tmpdir(), "asc-band-day-"));
    const postmortems = loadPostmortems(LESSONS);
    const render = (hour: number, day = 4) => renderKnowledgeSections({ ascension: 9, knowledgeDir, facts: frozenFacts(factsDir, at(day, hour)) }, postmortems);
    const first = render(3);
    const crabFirst = fillGuideFacts("{CRAB_KILL_ORDER}", 9);
    // After a run: the crab gained an A9 win.
    const refreshed = { ...DATA, KAISER_CRAB: { ...DATA["KAISER_CRAB"]!, first_death: { ...DATA["KAISER_CRAB"]!.first_death!, "9": [...DATA["KAISER_CRAB"]!.first_death!["9"]!, crab("ROCKET", true)] } } };
    setUnblockedSharesForTests(refreshed);
    expect(fillGuideFacts("{CRAB_KILL_ORDER}", 9)).not.toBe(crabFirst);
    const later = render(23);
    for (const key of ["old.guide", "old.handbook", "old.jev_hints", "experience"]) expect(section(later, key), key).toBe(section(first, key));
    expect(section(later, "old.guide")).toContain(crabFirst);
    expect(section(render(1, 5), "old.guide")).toContain(fillGuideFacts("{CRAB_KILL_ORDER}", 9));
  });
});

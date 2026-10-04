/**
 * Dai 2026-10-04: outcome statistics by ascension, A8 and A9 apart. knowledge/builders/build-outcome-stats.py writes one table per
 * ascension (by_ascension), each over that ascension's runs alone with its own baseline; a run reads its own
 * (knowledge/outcome-tables.ts). At A8, below A8 or without an ascension every text is what it was (A8's table); from
 * A9 up the run's ascension's rows, a row with fewer than 5 runs followed by A8's where A8 has 5 or more, labelled,
 * never added in. The guide's {CARD_OUTCOME:ID} the same, its frozen value keyed by the ascension from A9 up. A file of
 * the older shape (the A8 table alone) reads as before at every ascension.
 *
 * Fixed data throughout (setExperienceForTests, a copy of the gkb fixture dir), never the refreshing outcome-stats.json.
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { setExperienceForTests, statsLines, type OutcomeStats, type SliceInput } from "../src/knowledge/experience.js";
import { NO_DATA, OUTCOME_BASIS_KEY, cardOutcome, eventOptionOutcome, outcomeStatsBasis, relicOutcome, restOutcome } from "../src/knowledge/outcome-facts.js";
import { outcomeTables, outcomeView } from "../src/knowledge/outcome-tables.js";
import { loadKnowledgeData, loadPostmortems } from "../src/knowledge/render/data.js";
import { frozenFacts } from "../src/knowledge/render/facts.js";
import { renderKnowledgeSections } from "../src/knowledge/render/knowledge-prefix.js";
import { renderRestStats } from "../src/knowledge/render/stats-text.js";
import type { GameState } from "../src/hand/mod/schema.js";
import { cardOutcomeText, factsAtAscension, fillGuideFacts } from "../src/sim/boss-clock.js";
import type { JsonValue } from "../src/core/util/json.js";
import { ask, board, decide, env, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { knowledgeFile } from "../src/knowledge/files.js";

setupOneshotTests();

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "gkb-data", "knowledge");
const LESSONS = join(HERE, "gkb-data", "lessons.md");
const PLACEHOLDER = /\{@?[A-Z0-9][A-Z0-9_]*(?::[A-Z0-9_]+)*\}/;
const at = (day: number, hour: number) => () => new Date(2026, 9, day, hour, 0, 0);

/** A row as the build script writes it (low_n below 5). */
const r = (n: number, mean: number, pass: number, extra: Record<string, unknown> = {}) => ({ n, mean_floor: mean, boss_pass: pass, ...(n < 5 ? { low_n: true } : {}), ...extra });

const A8: OutcomeStats = {
  ascension: 8,
  baseline: { runs: 200, mean_floor: 30, boss_pass_by_act: { "1": { n: 200, boss_pass: 0.75 }, "2": { n: 150, boss_pass: 0.35 }, "3": { n: 50, boss_pass: 0.2 } } },
  cards: {
    TAUNT: { name: "挑衅", by_act: { "1": { picked: r(57, 29, 0.68), offered_not_picked: r(69, 33, 0.86) }, "2": { picked: r(32, 34, 0.34), offered_not_picked: r(42, 36, 0.43) } } },
    COLOSSUS: { name: "巨像", by_act: { "1": { picked: r(24, 30.3, 0.67), offered_not_picked: r(22, 32.8, 0.82) } } },
    VICIOUS: { name: "凶恶", by_act: { "1": { picked: r(4, 20, 0.75), offered_not_picked: r(56, 30.4, 0.71) }, "2": { picked: r(6, 34.3, 0.33), offered_not_picked: r(29, 34.6, 0.28) } } },
    STRIKE_IRONCLAD: { name: "打击", by_act: { "1": { picked: r(4, 22, 0.5) } } },
    HEADBUTT: { name: "头槌", by_act: { "1": { picked: r(83, 28.9, 0.71), offered_not_picked: r(47, 34, 0.85) } } },
    MOLTEN_FIST: { name: "熔融之拳", by_act: { "1": { picked: r(47, 26.6, 0.6), offered_not_picked: r(42, 27.6, 0.74) } } },
    RUPTURE: { name: "撕裂", by_act: { "1": { picked: r(16, 27.1, 0.81) } } },
  },
  relics: { VAJRA: { name: "金刚杵", by_act: { "1": r(7, 30, 0.71), "2": r(3, 33, 0.33) } } },
  events: {
    TRASH_HEAP: { name: "垃圾堆", options: { DIVE_IN: { title: "扎进垃圾堆", ...r(10, 21.4, 0.5, { hp_change: -7.8, max_hp_change: 0, gold_change: 1.2 }) }, GRAB: { title: "随便拿点垃圾", ...r(12, 33.2, 0.67, { hp_change: 0.5, max_hp_change: 0, gold_change: 100 }) } } },
    FIELD_OF_MAN_SIZED_HOLES: { name: "人形洞穴之地", options: { ENTER_YOUR_HOLE: { title: "进入你的洞", ...r(10, 32.4, 0.2, { hp_change: -3, max_hp_change: 0, gold_change: 0 }) } } },
    NEOW: { name: "涅奥", options: { VAJRA: { title: "金刚杵", ...r(8, 31, 0.75) } } },
  },
  rest: { HEAL: { "<40%": r(137, 30.4, 0.31), "60-80%": r(134, 32.1, 0.58), ">=80%": r(24, 31.4, 0.67) }, SMITH: { "<40%": r(1, 13, 0), "60-80%": r(76, 30.7, 0.61) } },
};

const A9: OutcomeStats = {
  ascension: 9,
  baseline: { runs: 98, mean_floor: 28.9, boss_pass_by_act: { "1": { n: 98, boss_pass: 0.66 }, "2": { n: 65, boss_pass: 0.42 }, "3": { n: 27, boss_pass: 0.04 } } },
  cards: {
    // Both sides with 5 runs or more in both acts: A9's alone.
    TAUNT: { name: "挑衅", by_act: { "1": { picked: r(14, 27, 0.64), offered_not_picked: r(32, 30, 0.81) }, "2": { picked: r(14, 33, 0.29), offered_not_picked: r(16, 35, 0.38) } } },
    // Taken 2 times in act 1: A8's pair follows (A8 has 24 on that side).
    COLOSSUS: { name: "巨像", by_act: { "1": { picked: r(2, 25, 0.5), offered_not_picked: r(13, 30.2, 0.69) } } },
    // Never taken: act 1 A8's taken side is thin too (no reference); act 2 A8 has 6.
    VICIOUS: { name: "凶恶", by_act: { "1": { offered_not_picked: r(23, 30.2, 0.74) }, "2": { offered_not_picked: r(5, 34.8, 0.4) } } },
    // A starter card: never offered on a reward, its 给了没拿 is empty at every ascension (no reference).
    STRIKE_IRONCLAD: { name: "打击", by_act: { "1": { picked: r(1, 33, 1) } } },
    MOLTEN_FIST: { name: "熔融之拳", by_act: { "1": { picked: r(9, 25, 0.56), offered_not_picked: r(3, 30, 0.67) } } },
    RUPTURE: { name: "撕裂", by_act: { "1": { picked: r(6, 28, 0.67) } } },
  },
  relics: { VAJRA: { name: "金刚杵", by_act: { "1": r(2, 24, 0.5) } } },
  events: {
    TRASH_HEAP: { name: "垃圾堆", options: { DIVE_IN: { title: "扎进垃圾堆", ...r(1, 22, 1, { hp_change: -8, max_hp_change: 0, gold_change: 0 }) }, GRAB: { title: "随便拿点垃圾", ...r(6, 25, 0.5, { hp_change: 0, max_hp_change: 0, gold_change: 100 }) } } },
    FIELD_OF_MAN_SIZED_HOLES: { name: "人形洞穴之地", options: { ENTER_YOUR_HOLE: { title: "进入你的洞", ...r(3, 30, 0.33, { hp_change: -4, max_hp_change: 0, gold_change: 0 }) } } },
  },
  rest: { HEAL: { "<40%": r(14, 25.9, 0.36), "60-80%": r(17, 28.3, 0.59) }, SMITH: { "60-80%": r(16, 28.7, 0.62) } },
};

const GENERATED = "2026-10-04T10:43:26";
const ABOUT = "fixture";
/** The file as the build script writes it from 2026-10-04: one table per ascension. */
const BY_ASC: OutcomeStats = { _about: ABOUT, generated: GENERATED, ascensions: [8, 9], by_ascension: { "8": A8, "9": A9 } } as OutcomeStats;
/** The same A8 table as the whole file, the shape before 2026-10-04. */
const LEGACY: OutcomeStats = { _about: ABOUT, generated: GENERATED, ...A8 } as OutcomeStats;

afterEach(() => setExperienceForTests(null, null));

/** Every text the renderers give for every id of the fixture (and one unknown), at an ascension. */
function allTexts(ascension: number | null | undefined, stats: OutcomeStats): string[] {
  const cards = [...Object.keys(A8.cards!), ...Object.keys(A9.cards!), "NOPE"];
  return [
    ...cards.map((id) => cardOutcome(id, ascension, stats)),
    ...cards.map((id) => cardOutcomeText(id, stats, ascension ?? undefined)),
    ...["VAJRA", "NOPE"].map((id) => relicOutcome(id, ascension, stats)),
    ...Object.entries(A8.events!).flatMap(([eventId, event]) => [...Object.keys(event.options!), "NOPE"].map((key) => eventOptionOutcome(eventId, key, ascension, stats))),
    ...["HEAL", "SMITH", "LIFT"].map((id) => restOutcome(id, ascension, stats)),
    outcomeStatsBasis(ascension ?? null, stats),
  ];
}

describe("which table a run reads", () => {
  it("the file's tables by ascension, each with the file's generation time; an older file is its own one table", () => {
    expect([...outcomeTables(BY_ASC).keys()]).toEqual(["8", "9"]);
    expect(outcomeTables(BY_ASC).get("9")).toMatchObject({ ascension: 9, generated: GENERATED, baseline: { runs: 98 } });
    expect([...outcomeTables(LEGACY).entries()]).toEqual([["8", LEGACY]]);
  });

  it("A8, below A8 or unknown: A8's table, no references; from A9 up the run's own with the lower ones nearest first", () => {
    for (const asc of [8, 7, 0, null, undefined, Number.NaN]) expect(outcomeView(asc, BY_ASC)).toEqual({ asc: null, table: { generated: GENERATED, ...A8 }, refs: [] });
    const nine = outcomeView(9, BY_ASC);
    expect(nine.asc).toBe(9);
    expect(nine.table.ascension).toBe(9);
    expect(nine.refs.map((table) => table.ascension)).toEqual([8]);
    const three = { ...BY_ASC, by_ascension: { ...BY_ASC.by_ascension, "10": { ascension: 10, baseline: { runs: 3 } } } };
    expect(outcomeView(10, three).refs.map((table) => table.ascension)).toEqual([9, 8]);
    // An ascension without runs yet: an empty table of its own, never A9's or A8's numbers as its own.
    expect(outcomeView(11, three).table).toEqual({ ascension: 11, generated: GENERATED, baseline: { runs: 0, boss_pass_by_act: {} } });
    // The older shape: the one table at every ascension.
    expect(outcomeView(9, LEGACY)).toEqual({ asc: null, table: LEGACY, refs: [] });
  });
});

describe("A8, below A8 and unknown: the text as before, byte for byte", () => {
  it("every renderer gives the older file's text (the code before this change reads that file the same way)", () => {
    for (const asc of [8, 7, 0, null, undefined]) expect(allTexts(asc, BY_ASC)).toEqual(allTexts(asc, LEGACY));
  });

  it("pinned A8 texts", () => {
    expect(cardOutcome("TAUNT", 8, BY_ASC)).toBe(
      "A8 第1幕 拿了 n=57 过本幕boss 68% 均终层29 / 给了没拿 n=69 过本幕boss 86% 均终层33；第2幕 拿了 n=32 过本幕boss 34% 均终层34 / 给了没拿 n=42 过本幕boss 43% 均终层36",
    );
    expect(cardOutcome("STRIKE_IRONCLAD+", 8, BY_ASC)).toBe("A8 第1幕 拿了 n=4(少) 过本幕boss 50% 均终层22 / 给了没拿 无数据");
    expect(relicOutcome("VAJRA", 8, BY_ASC)).toBe("A8 第1幕获得 n=7 过本幕boss 71% 均终层30；第2幕获得 n=3(少) 过本幕boss 33% 均终层33");
    expect(eventOptionOutcome("TRASH_HEAP", "DIVE_IN", 8, BY_ASC)).toBe("A8 选这个选项 n=10 过本幕boss 50% 均终层21.4，到下一层平均 HP-7.8 金+1.2");
    expect(restOutcome("SMITH", 8, BY_ASC)).toBe("A8 HP<40% n=1(少) 过本幕boss 0% 均终层13；HP60-80% n=76 过本幕boss 61% 均终层30.7");
    expect(cardOutcomeText("TAUNT", BY_ASC, 8)).toBe("A8 一幕拿了 57 局过 boss 68%、给了没拿 69 局 86%；二幕拿了 32 局过 boss 34%、给了没拿 42 局 43%");
    expect(outcomeStatsBasis(8, BY_ASC)).toBe(
      "outcome_stats / card_outcome_stats / option_outcome_stats = A8 数据：src/knowledge/outcome-stats.json（日志自动统计，tools/build-outcome-stats.py，生成于 2026-10-04T10:43:26，A8 共 200 局）；没有记录的写「无数据」。" +
        "口径：n = 局数（n<5 标「少」）；过本幕boss = 这些局里打过「做这个选择时所在那一幕」boss 的比例；均终层 = 这些局的平均最终层数。" +
        "卡牌「拿了」= 这一幕里牌组多了这张牌（奖励、商店、事件都算），「给了没拿」= 这一幕的卡牌奖励里给过、这一幕没拿；遗物 = 这一幕获得；事件选项 = 选了这个选项（到下一层第一次决策时的平均 HP/上限/金币变化）；休息点 = 按到达时的 HP 档。" +
        "观察数据：混有「在什么局面下做这个选择」的因素，不是因果。基线（A8 全部 200 局）：到达第1幕的局过第1幕boss 75% (n=200)，到达第2幕的局过第2幕boss 35% (n=150)，到达第3幕的局过第3幕boss 20% (n=50)。",
    );
    expect(outcomeStatsBasis(7, BY_ASC)).toContain("= A8 数据（本局 A7，统计只有 A8 的）：");
  });

  it("a file of the older shape at A9: the A8 text as before, the mismatch said", () => {
    expect(cardOutcome("COLOSSUS", 9, LEGACY)).toBe("A8 第1幕 拿了 n=24 过本幕boss 67% 均终层30.3 / 给了没拿 n=22 过本幕boss 82% 均终层32.8");
    expect(outcomeStatsBasis(9, LEGACY)).toContain("= A8 数据（本局 A9，统计只有 A8 的）：");
    expect(allTexts(9, LEGACY)).toEqual(allTexts(8, LEGACY).map((text) => text.replace("A8 数据：", "A8 数据（本局 A9，统计只有 A8 的）：")));
  });
});

describe("A9: its own rows; a thin row followed by A8's, labelled, never added in", () => {
  it("cards: A9's pair by act; an act with a side under 5 runs gets A8's pair when A8 has 5 or more on that side", () => {
    expect(cardOutcome("TAUNT", 9, BY_ASC)).toBe(
      "A9 第1幕 拿了 n=14 过本幕boss 64% 均终层27 / 给了没拿 n=32 过本幕boss 81% 均终层30；第2幕 拿了 n=14 过本幕boss 29% 均终层33 / 给了没拿 n=16 过本幕boss 38% 均终层35",
    );
    expect(cardOutcome("COLOSSUS", 9, BY_ASC)).toBe(
      "A9 第1幕 拿了 n=2(少) 过本幕boss 50% 均终层25 / 给了没拿 n=13 过本幕boss 69% 均终层30.2（A9 不足5局，另附 A8：拿了 n=24 过本幕boss 67% 均终层30.3 / 给了没拿 n=22 过本幕boss 82% 均终层32.8）",
    );
    expect(cardOutcome("VICIOUS", 9, BY_ASC)).toBe(
      "A9 第1幕 拿了 无数据 / 给了没拿 n=23 过本幕boss 74% 均终层30.2；第2幕 拿了 无数据 / 给了没拿 n=5 过本幕boss 40% 均终层34.8（A9 不足5局，另附 A8：拿了 n=6 过本幕boss 33% 均终层34.3 / 给了没拿 n=29 过本幕boss 28% 均终层34.6）",
    );
    // A8 as thin as A9 on the missing side: nothing reliable to add.
    expect(cardOutcome("STRIKE_IRONCLAD", 9, BY_ASC)).toBe("A9 第1幕 拿了 n=1(少) 过本幕boss 100% 均终层33 / 给了没拿 无数据");
    // Logged at A8 only.
    expect(cardOutcome("HEADBUTT", 9, BY_ASC)).toBe(
      "A9 第1幕 拿了 无数据 / 给了没拿 无数据（A9 不足5局，另附 A8：拿了 n=83 过本幕boss 71% 均终层28.9 / 给了没拿 n=47 过本幕boss 85% 均终层34）",
    );
    expect(cardOutcome("NOPE", 9, BY_ASC)).toBe(NO_DATA);
    // Never pooled: only A9's counts and A8's, no sum of them.
    const colossus = cardOutcome("COLOSSUS", 9, BY_ASC);
    for (const pooled of ["n=26", "n=35"]) expect(colossus).not.toContain(pooled);
  });

  it("relics, event options (with a relic-named option's relic rows) and rest actions", () => {
    expect(relicOutcome("VAJRA", 9, BY_ASC)).toBe("A9 第1幕获得 n=2(少) 过本幕boss 50% 均终层24（A9 不足5局，另附 A8：n=7 过本幕boss 71% 均终层30）");
    expect(eventOptionOutcome("TRASH_HEAP", "DIVE_IN", 9, BY_ASC)).toBe(
      "A9 选这个选项 n=1(少) 过本幕boss 100% 均终层22，到下一层平均 HP-8（A9 不足5局，另附 A8：n=10 过本幕boss 50% 均终层21.4，到下一层平均 HP-7.8 金+1.2）",
    );
    expect(eventOptionOutcome("TRASH_HEAP", "GRAB", 9, BY_ASC)).toBe("A9 选这个选项 n=6 过本幕boss 50% 均终层25，到下一层平均 金+100");
    expect(eventOptionOutcome("NEOW", "VAJRA", 9, BY_ASC)).toBe(
      "A9 选这个选项 无数据（A9 不足5局，另附 A8：n=8 过本幕boss 75% 均终层31）；遗物 金刚杵 第1幕获得 n=2(少) 过本幕boss 50% 均终层24（A9 不足5局，另附 A8：n=7 过本幕boss 71% 均终层30）",
    );
    expect(restOutcome("HEAL", 9, BY_ASC)).toBe(
      "A9 HP<40% n=14 过本幕boss 36% 均终层25.9；HP60-80% n=17 过本幕boss 59% 均终层28.3；HP>=80% 无数据（A9 不足5局，另附 A8：n=24 过本幕boss 67% 均终层31.4）",
    );
    // SMITH below 40%: A8 has 1 run there, as thin as A9's none.
    expect(restOutcome("SMITH", 9, BY_ASC)).toBe("A9 HP60-80% n=16 过本幕boss 62% 均终层28.7");
  });

  it("the basis: A9's runs and baseline, how the A8 rows are added, and A8's baseline to read them against", () => {
    const basis = outcomeStatsBasis(9, BY_ASC);
    expect(basis).toContain("= A9 数据：src/knowledge/outcome-stats.json（日志自动统计，tools/build-outcome-stats.py，生成于 2026-10-04T10:43:26，A9 共 98 局；每个进阶分开统计）");
    expect(basis).toContain("基线（A9 全部 98 局）：到达第1幕的局过第1幕boss 66% (n=98)，到达第2幕的局过第2幕boss 42% (n=65)，到达第3幕的局过第3幕boss 4% (n=27)。");
    expect(basis.endsWith(
      "A9 的一行不足5局、而 A8 的同一行够5局时，后面括号里另附那一行，标明进阶（另算，不与 A9 的合并）；A8 基线（全部 200 局）：到达第1幕的局过第1幕boss 75% (n=200)，到达第2幕的局过第2幕boss 35% (n=150)，到达第3幕的局过第3幕boss 20% (n=50)。",
    )).toBe(true);
    expect(basis).not.toContain("统计只有");
  });

  it("above A9: the run's own table, a thin row with the nearest lower ascension that has 5 runs", () => {
    const ten: OutcomeStats = { ascension: 10, baseline: { runs: 4, mean_floor: 20, boss_pass_by_act: { "1": { n: 4, boss_pass: 0.5 } } }, cards: { COLOSSUS: { name: "巨像", by_act: { "1": { picked: r(1, 18, 0), offered_not_picked: r(1, 17, 0) } } } } };
    const stats = { ...BY_ASC, ascensions: [8, 9, 10], by_ascension: { ...BY_ASC.by_ascension, "10": ten } } as OutcomeStats;
    // A9 has 13 on the 给了没拿 side A10 lacks: A9's pair, the nearest.
    expect(cardOutcome("COLOSSUS", 10, stats)).toBe(
      "A10 第1幕 拿了 n=1(少) 过本幕boss 0% 均终层18 / 给了没拿 n=1(少) 过本幕boss 0% 均终层17（A10 不足5局，另附 A9：拿了 n=2(少) 过本幕boss 50% 均终层25 / 给了没拿 n=13 过本幕boss 69% 均终层30.2）",
    );
    // A9 as thin as A10 on a relic: A8's.
    expect(relicOutcome("VAJRA", 10, stats)).toBe("A10 第1幕获得 无数据（A10 不足5局，另附 A8：n=7 过本幕boss 71% 均终层30）");
    expect(outcomeStatsBasis(10, stats)).toContain("A10 的一行不足5局、而 A9/A8 的同一行够5局时，后面括号里另附那一行，标明进阶（取最近的一个进阶；另算，不与 A10 的合并）；A9 基线（全部 98 局）");
    // No table for the run's ascension yet: none of the lower numbers is given as its own.
    expect(cardOutcome("TAUNT", 11, stats)).toBe(
      "A11 第1幕 拿了 无数据 / 给了没拿 无数据（A11 不足5局，另附 A9：拿了 n=14 过本幕boss 64% 均终层27 / 给了没拿 n=32 过本幕boss 81% 均终层30）；第2幕 拿了 无数据 / 给了没拿 无数据（A11 不足5局，另附 A9：拿了 n=14 过本幕boss 29% 均终层33 / 给了没拿 n=16 过本幕boss 38% 均终层35）",
    );
    expect(outcomeStatsBasis(11, stats)).toContain("基线（A11 全部 0 局）：无数据。");
  });
});

describe("the guide's {CARD_OUTCOME:ID}", () => {
  it("A9's acts, a thin act with A8's; at A8 and below the text as before", () => {
    expect(cardOutcomeText("TAUNT", BY_ASC, 9)).toBe("A9 一幕拿了 14 局过 boss 64%、给了没拿 32 局 81%；二幕拿了 14 局过 boss 29%、给了没拿 16 局 38%");
    expect(cardOutcomeText("COLOSSUS", BY_ASC, 9)).toBe("A9 一幕拿了 2 局过 boss 50%、给了没拿 13 局 69%（A9 不足5局，另附 A8：一幕拿了 24 局过 boss 67%、给了没拿 22 局 82%）");
    expect(cardOutcomeText("HEADBUTT", BY_ASC, 9)).toBe("A9 一幕还没有足够的记录（A9 不足5局，另附 A8：一幕拿了 83 局过 boss 71%、给了没拿 47 局 85%）");
    expect(cardOutcomeText("STRIKE_IRONCLAD", BY_ASC, 9)).toBe("还没有足够的记录");
    expect(cardOutcomeText("TAUNT", BY_ASC)).toBe(cardOutcomeText("TAUNT", LEGACY));
    expect(cardOutcomeText("TAUNT", BY_ASC, 7)).toBe(cardOutcomeText("TAUNT", LEGACY));
  });

  it("marked with the run's ascension from A9 up (its own frozen key), not at A8, below A8, or with a file of the older shape", () => {
    setExperienceForTests([], BY_ASC);
    const text = "挑衅（{CARD_OUTCOME:TAUNT}）{CRAB_KILL_ORDER}";
    expect(factsAtAscension(text, 9)).toBe("挑衅（{@9:CARD_OUTCOME:TAUNT}）{@9:CRAB_KILL_ORDER}");
    expect(factsAtAscension(text, 8)).toBe("挑衅（{CARD_OUTCOME:TAUNT}）{@8:CRAB_KILL_ORDER}");
    expect(factsAtAscension(text, 7)).toBe(text);
    expect("{@9:CARD_OUTCOME:TAUNT}").toMatch(PLACEHOLDER);
    expect(fillGuideFacts("{CARD_OUTCOME:TAUNT}", 9)).toBe(cardOutcomeText("TAUNT", BY_ASC, 9));
    expect(fillGuideFacts("{@9:CARD_OUTCOME:TAUNT}")).toBe(cardOutcomeText("TAUNT", BY_ASC, 9));
    expect(fillGuideFacts("{CARD_OUTCOME:TAUNT}", 8)).toBe(cardOutcomeText("TAUNT", LEGACY));
    expect(fillGuideFacts("{CARD_OUTCOME:TAUNT}")).toBe(cardOutcomeText("TAUNT", LEGACY));
    // Before the first refresh by the new build script (a file of the older shape): key and text as before.
    setExperienceForTests([], LEGACY);
    expect(factsAtAscension("{CARD_OUTCOME:TAUNT}", 9)).toBe("{CARD_OUTCOME:TAUNT}");
    expect(fillGuideFacts("{CARD_OUTCOME:TAUNT}", 9)).toBe(cardOutcomeText("TAUNT", LEGACY));
  });

  /** The gkb fixture dir with {CARD_OUTCOME:TAUNT} in the guide. */
  const withPlaceholder = (): string => {
    const dir = mkdtempSync(join(tmpdir(), "outcome-asc-kn-"));
    cpSync(FIXTURE, dir, { recursive: true });
    writeFileSync(knowledgeFile(dir, "ironclad-guide.md"), `${readFileSync(knowledgeFile(dir, "ironclad-guide.md"), "utf8")}\n- 挑衅：{CARD_OUTCOME:TAUNT}。\n`);
    return dir;
  };
  const guideOf = (sections: { key: string; text: string }[]) => sections.filter((item) => item.key === "old.guide").map((item) => item.text).join("\n");

  it("the day's frozen table: A8 keeps its key and value, A9 has its own; both byte-stable across a refresh, refilled the next day", () => {
    setExperienceForTests([], BY_ASC);
    const knowledgeDir = withPlaceholder();
    const factsDir = mkdtempSync(join(tmpdir(), "outcome-asc-day-"));
    // The table as an A8 render left it earlier the day (stand-in value).
    writeFileSync(join(factsDir, "2026-10-04-prefix-facts.json"), JSON.stringify({ "{CARD_OUTCOME:TAUNT}": "A8 冻结值" }));
    const postmortems = loadPostmortems(LESSONS);
    const render = (ascension: number, hour: number, day = 4) => guideOf(renderKnowledgeSections({ ascension, knowledgeDir, facts: frozenFacts(factsDir, at(day, hour)) }, postmortems));
    const nine = render(9, 10);
    expect(nine).toContain(`- 挑衅：${cardOutcomeText("TAUNT", BY_ASC, 9)}。`);
    expect(render(8, 10)).toContain("- 挑衅：A8 冻结值。");
    const table = JSON.parse(readFileSync(join(factsDir, "2026-10-04-prefix-facts.json"), "utf8")) as Record<string, string>;
    expect(table).toMatchObject({ "{CARD_OUTCOME:TAUNT}": "A8 冻结值", "{@9:CARD_OUTCOME:TAUNT}": cardOutcomeText("TAUNT", BY_ASC, 9) });
    // After a run: A9's Taunt gained a run. The same day the prefix keeps its bytes; the next day it is refilled.
    const refreshed = { ...BY_ASC, by_ascension: { ...BY_ASC.by_ascension, "9": { ...A9, cards: { ...A9.cards, TAUNT: { name: "挑衅", by_act: { "1": { picked: r(15, 27, 0.6), offered_not_picked: r(32, 30, 0.81) } } } } } } } as OutcomeStats;
    setExperienceForTests([], refreshed);
    expect(cardOutcomeText("TAUNT", refreshed, 9)).not.toBe(cardOutcomeText("TAUNT", BY_ASC, 9));
    expect(render(9, 23)).toBe(nine);
    expect(render(8, 23)).toContain("- 挑衅：A8 冻结值。");
    expect(render(9, 1, 5)).toContain(`- 挑衅：${cardOutcomeText("TAUNT", refreshed, 9)}。`);
    expect(render(8, 1, 5)).toContain(`- 挑衅：${cardOutcomeText("TAUNT", refreshed, 8)}。`);
  });
});

describe("the knowledge slice's statistics lines and the prefix's rest table", () => {
  const input = (asc: number, label: string, offered: Partial<SliceInput["offered"]>): SliceInput => ({
    label,
    act: 1,
    asc,
    bossId: null,
    threats: [],
    offered: { cards: [], relics: [], potions: [], events: [], eventOptions: [], text: "", ...offered },
  });
  const state = (hp: number, max: number) => ({ run: { current_hp: hp, max_hp: max } }) as unknown as GameState;

  it("statsLines: at A8 as before; at A9 A9's rows, thin ones with A8's, and A8's baseline when a row cites it", () => {
    const reward = input(9, "reward/card", { cards: ["COLOSSUS", "TAUNT"], relics: ["VAJRA"], events: ["TRASH_HEAP"] });
    expect(statsLines(state(50, 80), reward, BY_ASC)).toEqual([
      "基线 A9 全部 98 局: 均终层 28.9，到达第1幕的局过本幕boss 66% (n=98)；括号里另附的 A8 行的基线 A8 全部 200 局: 均终层 30，到达第1幕的局过本幕boss 75% (n=200)",
      "卡 巨像(COLOSSUS) 第1幕: 拿了 n=2(少) 均终层25 过本幕boss 50% | 给了没拿 n=13 均终层30.2 过本幕boss 69%（A9 不足5局，另附 A8：拿了 n=24 均终层30.3 过本幕boss 67% | 给了没拿 n=22 均终层32.8 过本幕boss 82%）",
      "卡 挑衅(TAUNT) 第1幕: 拿了 n=14 均终层27 过本幕boss 64% | 给了没拿 n=32 均终层30 过本幕boss 81%",
      "遗物 金刚杵(VAJRA) 第1幕获得: n=2(少) 均终层24 过本幕boss 50%（A9 不足5局，另附 A8：n=7 均终层30 过本幕boss 71%）",
      "事件 垃圾堆(TRASH_HEAP) 选「扎进垃圾堆」: n=1(少) 均终层22 过本幕boss 100% | 本层平均 HP-8（A9 不足5局，另附 A8：n=10 均终层21.4 过本幕boss 50% | 本层平均 HP-8 金+1）",
      "事件 垃圾堆(TRASH_HEAP) 选「随便拿点垃圾」: n=6 均终层25 过本幕boss 50% | 本层平均 金+100",
    ]);
    // A8's rows cited by none: no A8 baseline.
    expect(statsLines(state(50, 80), input(9, "reward/card", { cards: ["TAUNT"] }), BY_ASC)).toEqual([
      "基线 A9 全部 98 局: 均终层 28.9，到达第1幕的局过本幕boss 66% (n=98)",
      "卡 挑衅(TAUNT) 第1幕: 拿了 n=14 均终层27 过本幕boss 64% | 给了没拿 n=32 均终层30 过本幕boss 81%",
    ]);
    expect(statsLines(state(70, 80), input(9, "rest/choose", {}), BY_ASC)).toEqual([
      "基线 A9 全部 98 局: 均终层 28.9，到达第1幕的局过本幕boss 66% (n=98)；括号里另附的 A8 行的基线 A8 全部 200 局: 均终层 30，到达第1幕的局过本幕boss 75% (n=200)",
      "休息点 HEAL 在 HP >=80%: 无记录（A9 不足5局，另附 A8：n=24 均终层31.4 过本幕boss 67%）",
    ]);
    for (const asc of [8, 7, 0]) {
      const cases: [string, Partial<SliceInput["offered"]>, number][] = [["reward/card", { cards: ["COLOSSUS", "TAUNT", "HEADBUTT"], relics: ["VAJRA"], events: ["TRASH_HEAP", "NEOW"] }, 50], ["rest/choose", {}, 70], ["rest/choose", {}, 20]];
      for (const [label, offered, hp] of cases) {
        expect(statsLines(state(hp, 80), input(asc, label, offered), BY_ASC)).toEqual(statsLines(state(hp, 80), input(asc, label, offered), LEGACY));
      }
    }
  });

  /** The gkb fixture dir with this outcome-stats.json. */
  const dirWith = (stats: OutcomeStats): string => {
    const dir = mkdtempSync(join(tmpdir(), "outcome-asc-kn-"));
    cpSync(FIXTURE, dir, { recursive: true });
    writeFileSync(knowledgeFile(dir, "outcome-stats.json"), JSON.stringify(stats));
    return dir;
  };

  it("renderRestStats: at A9 its own cells and baseline, thin cells with A8's; at A8 and below as before", () => {
    const byAsc = dirWith(BY_ASC);
    const legacy = dirWith(LEGACY);
    expect(loadKnowledgeData(byAsc).outcomeStats.by_ascension?.["9"]?.baseline?.runs).toBe(98);
    const nine = renderRestStats({ ascension: 9, knowledgeDir: byAsc });
    expect(nine.split("\n")).toEqual([
      "结果统计（outcome-stats.json，A9 的局，生成于 2026-10-04T10:43:26；观察数据：一个选择的数字混有「在什么局面下选它」的影响；n=局数，n<5 标(少)）。每个进阶分开统计：A9 不足5局、而 A8 够5局的格子，括号里另附那一格（另算，不合并）。",
      "基线 98 局：均终层 28.9；过本幕 boss 比例 第1幕 66% (n=98)，第2幕 42% (n=65)，第3幕 4% (n=27)。A8 基线 200 局：均终层 30；过本幕 boss 比例 第1幕 75% (n=200)，第2幕 35% (n=150)，第3幕 20% (n=50)。",
      "休息点选择（按到达时的血量段）：n 局，均终层，过本幕 boss 比例。实际回血多少见房间代价表「休息」列（负数=回血）。",
      "- 回血 HEAL：<40% n=14 均终层 25.9 过boss 36%；60-80% n=17 均终层 28.3 过boss 59%；>=80% 无数据（A9 不足5局，另附 A8：n=24 均终层 31.4 过boss 67%）",
      "- 锻造 SMITH：60-80% n=16 均终层 28.7 过boss 62%",
    ]);
    for (const ascension of [8, 7]) expect(renderRestStats({ ascension, knowledgeDir: byAsc })).toBe(renderRestStats({ ascension, knowledgeDir: legacy }));
    expect(renderRestStats({ ascension: 7, knowledgeDir: byAsc })).toContain("注意：这是 A8 的数据，不是本局的 A7。");
    expect(renderRestStats({ ascension: 9, knowledgeDir: legacy })).toContain("注意：这是 A8 的数据，不是本局的 A9。");
  });
});

describe("the build questions at an A9 board (logged states)", () => {
  type View = { options: Record<string, Record<string, JsonValue>>; facts: Record<string, JsonValue> };
  const view = (raw: Raw): View => {
    const question = ask(decide(env(raw)));
    const pick = question.questions[question.deepseek.question];
    if (pick?.type !== "choice") throw new Error("expected a choice question");
    return { options: Object.fromEntries(Object.entries(pick.criteria).map(([key, value]) => [key, JSON.parse(value ?? "{}") as Record<string, JsonValue>])), facts: question.state["facts"] as Record<string, JsonValue> };
  };
  /** The board at another ascension. */
  const atAsc = (raw: Raw, ascension: number): Raw => ({ ...raw, run: { ...(raw["run"] as Raw), ascension } });

  it("reward/card: each card's A9 rows (thin ones with A8's) and the A9 basis; the same board at A8 reads as before", () => {
    setExperienceForTests([], BY_ASC);
    const nine = view(board("xljq-f5-reward", "reward"));
    expect(nine.options["card0"]?.["outcome_stats"]).toBe(NO_DATA);
    expect(nine.options["card1"]?.["outcome_stats"]).toBe(cardOutcome("MOLTEN_FIST", 9, BY_ASC));
    expect(nine.options["card1"]?.["outcome_stats"]).toContain("（A9 不足5局，另附 A8：拿了 n=47");
    expect(nine.options["card2"]?.["outcome_stats"]).toBe("A9 第1幕 拿了 n=6 过本幕boss 67% 均终层28 / 给了没拿 无数据");
    expect(nine.facts[OUTCOME_BASIS_KEY]).toBe(outcomeStatsBasis(9, BY_ASC));
    const eight = view(atAsc(board("xljq-f5-reward", "reward"), 8));
    setExperienceForTests([], LEGACY);
    const before = view(atAsc(board("xljq-f5-reward", "reward"), 8));
    for (const key of ["card0", "card1", "card2"]) expect(eight.options[key]?.["outcome_stats"]).toBe(before.options[key]?.["outcome_stats"]);
    expect(eight.facts[OUTCOME_BASIS_KEY]).toBe(before.facts[OUTCOME_BASIS_KEY]);
    expect(eight.options["card1"]?.["outcome_stats"]).toBe("A8 第1幕 拿了 n=47 过本幕boss 60% 均终层26.6 / 给了没拿 n=42 过本幕boss 74% 均终层27.6");
  });

  it("rest and event: the rest actions' and each option's A9 rows", () => {
    setExperienceForTests([], BY_ASC);
    const rest = view(board("7b0d-f8-rest", "rest")).facts["rest_site"] as Record<string, JsonValue>;
    expect(rest["hp_band_now"]).toBe("60-80%");
    expect(rest["option_outcome_stats"]).toEqual({ HEAL: restOutcome("HEAL", 9, BY_ASC), SMITH: "A9 HP60-80% n=16 过本幕boss 62% 均终层28.7" });
    const event = view(board("yql8-f22-holes", "event")).facts["event"] as Record<string, JsonValue>;
    expect(event["option_outcome_stats"]).toEqual({
      o0: NO_DATA,
      o1: "A9 选这个选项 n=3(少) 过本幕boss 33% 均终层30，到下一层平均 HP-4（A9 不足5局，另附 A8：n=10 过本幕boss 20% 均终层32.4，到下一层平均 HP-3）",
    });
    const eight = view(atAsc(board("yql8-f22-holes", "event"), 8)).facts["event"] as Record<string, JsonValue>;
    expect(eight["option_outcome_stats"]).toEqual({ o0: NO_DATA, o1: "A8 选这个选项 n=10 过本幕boss 20% 均终层32.4，到下一层平均 HP-3" });
  });
});

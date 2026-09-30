/**
 * V4 knowledge renderers (src/knowledge/render): fixed small data in tests/gkb-data, not the knowledge files
 * that are refreshed after every run.
 */

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chainedHpRatio, monsterHpAt, type MonsterEntry } from "../src/knowledge/monster-db.js";
import { KnowledgeLoadError, KnowledgeLookupError, loadKnowledgeData, loadPostmortems, parsePostmortems } from "../src/knowledge/render/data.js";
import { SCOPE_THEMES, THEME_KEYS, caseSummary, queryExperience, renderExperience, themeOf } from "../src/knowledge/render/experience-text.js";
import { countsText } from "../src/knowledge/render/format.js";
import { renderKnowledgePrefix, renderKnowledgeSections } from "../src/knowledge/render/knowledge-prefix.js";
import { renderEncounter, renderEncounters, renderMonster, renderMonsters } from "../src/knowledge/render/monster-text.js";
import { queryOldKnowledge, renderOldKnowledge } from "../src/knowledge/render/old-knowledge.js";
import { renderFightRecords, renderRestStats, renderRoomCosts, renderStatsTable } from "../src/knowledge/render/stats-text.js";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "gkb-data");
const KNOWLEDGE = join(DATA, "knowledge");
const LESSONS = join(DATA, "lessons.md");
const ctx = { ascension: 9, knowledgeDir: KNOWLEDGE };
const withLessons = () => loadPostmortems(LESSONS);
const noLessons = () => loadPostmortems(join(DATA, "no-such-lessons.md"));

const temps: string[] = [];
function copyData(): string {
  const dir = mkdtempSync(join(tmpdir(), "gkb-"));
  temps.push(dir);
  cpSync(KNOWLEDGE, dir, { recursive: true });
  return dir;
}

let savedLessons: string | undefined;
beforeAll(() => {
  savedLessons = process.env["KNOWLEDGE_LESSONS_FILE"];
  process.env["KNOWLEDGE_LESSONS_FILE"] = LESSONS;
});
afterAll(() => {
  if (savedLessons === undefined) delete process.env["KNOWLEDGE_LESSONS_FILE"];
  else process.env["KNOWLEDGE_LESSONS_FILE"] = savedLessons;
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

describe("knowledge prefix: deterministic and complete", () => {
  it("renders the same bytes twice, from a fresh copy of the files, and with the JSON keys in another order", () => {
    const first = renderKnowledgePrefix(ctx, withLessons());
    expect(renderKnowledgePrefix(ctx, withLessons())).toBe(first);
    const copy = copyData();
    expect(renderKnowledgePrefix({ ...ctx, knowledgeDir: copy }, withLessons())).toBe(first);
    // Reverse every object's key order: the output is sorted by stable keys, not by file order.
    const reverse = (value: unknown): unknown =>
      Array.isArray(value) ? value.map(reverse) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reverse(v)])) : value;
    for (const name of ["monster-db.json", "room-costs.json", "outcome-stats.json"]) {
      const path = join(copy, name);
      writeFileSync(path, JSON.stringify(reverse(JSON.parse(readFileSync(path, "utf8")))));
    }
    const experience = JSON.parse(readFileSync(join(copy, "experience.json"), "utf8")) as { entries: unknown[] };
    experience.entries.reverse();
    writeFileSync(join(copy, "experience.json"), JSON.stringify(experience));
    expect(renderKnowledgePrefix({ ...ctx, knowledgeDir: copy }, withLessons())).toBe(first);
  });

  it("has every block in a fixed order with its heading, old knowledge first and marked as below the data", () => {
    const sections = renderKnowledgeSections(ctx, withLessons());
    expect(sections.map((section) => section.key)).toEqual([
      "header",
      "old",
      "old.guide",
      "old.handbook",
      "old.jev_hints",
      "experience",
      "experience.monster",
      "experience.deck",
      "experience.route",
      "experience.potion",
      "experience.mechanics",
      "data",
      "monsters",
      "encounters",
      "stats.rooms",
      "stats.fights",
      "stats.rest",
    ]);
    const text = renderKnowledgePrefix(ctx, withLessons());
    expect(text.startsWith("# 知识库（本局进阶 A9）")).toBe(true);
    expect(text.indexOf("和数据冲突时以数据为准")).toBeLessThan(text.indexOf("### 旧知识：铁甲战士攻略"));
    for (const heading of ["## 旧知识（待数据验证）", "## 经验库", "## 数据版本", "## 怪物（A9）", "## 走廊和问号房遭遇的战绩", "## 统计表", "### 精英和 boss 战绩", "### 休息点"]) expect(text).toContain(heading);
  });

  it("throws, never renders empty knowledge, when a file is missing, malformed or empty", () => {
    const missing = copyData();
    rmSync(join(missing, "monster-db.json"));
    expect(() => renderKnowledgePrefix({ ...ctx, knowledgeDir: missing })).toThrow(KnowledgeLoadError);
    expect(() => renderKnowledgePrefix({ ...ctx, knowledgeDir: missing })).toThrow(/monster-db\.json/);

    const broken = copyData();
    writeFileSync(join(broken, "room-costs.json"), "{ not json");
    expect(() => loadKnowledgeData(broken)).toThrow(/不是合法 JSON/);

    const empty = copyData();
    writeFileSync(join(empty, "experience.json"), JSON.stringify({ version: "x", entries: [] }));
    expect(() => loadKnowledgeData(empty)).toThrow(/entries/);

    const blank = copyData();
    writeFileSync(join(blank, "ironclad-guide.md"), "  \n");
    expect(() => loadKnowledgeData(blank)).toThrow(/为空/);

    const noMonsters = copyData();
    writeFileSync(join(noMonsters, "monster-db.json"), JSON.stringify({ bosses: { X: {} }, encounters: { X: {} }, monsters: {} }));
    expect(() => loadKnowledgeData(noMonsters)).toThrow(/monsters/);
  });

  it("reloads a file changed on disk (the files are refreshed after every run)", () => {
    const dir = copyData();
    const before = renderRoomCosts({ ...ctx, knowledgeDir: dir });
    const rooms = JSON.parse(readFileSync(join(dir, "room-costs.json"), "utf8"));
    rooms.by_asc["9"]["1"]["Monster"].median = 99;
    writeFileSync(join(dir, "room-costs.json"), JSON.stringify(rooms));
    const after = renderRoomCosts({ ...ctx, knowledgeDir: dir });
    expect(after).not.toBe(before);
    expect(after).toContain("| A9（本局） | 99/7/");
  });
});

describe("monster text", () => {
  it("HP at this ascension with n; not logged here: scaled along the measured ratio chain and marked 估", () => {
    const claw = renderMonster("CLAW", ctx);
    expect(claw).toContain("血量 A9: 42 (n=5，范围 40–44)");
    const slime = renderMonster("SLIME", ctx);
    // A7 20 x (A7 -> A9: CLAW 42/40) = 21.
    expect(slime).toMatch(/血量 A9: 估 21（A7 中位 20 \(n=3\) ×1\.05（比例基于 1 种怪））/);
    // Above every logged ascension: the highest one's number, and the step said to be unmeasured.
    expect(renderMonster("CLAW", { ...ctx, ascension: 10 })).toContain("血量 A10: 估 42（A9 中位 42 (n=5，范围 40–44) ×1（A9→A10 无实测比例，按×1））");
  });

  it("move damage per hit x hits with n; unseen here: 估 with the logged number and ratio; a shown-only hit says so", () => {
    const claw = renderMonster("CLAW", ctx);
    expect(claw).toMatch(/- 夹击〔攻击〕 伤害 12 \(n=6\)/);
    expect(claw).toMatch(/- 连夹〔攻击〕 伤害 估 6×2（A8 记录 5 \(n=4\) ×1\.20，比例基于 1 个招式（本怪））/);
    expect(renderMonster("BOSSY", ctx)).toMatch(/伤害 显示值（含当时的力量\/易伤）20 \(n=3\)/);
  });

  it("self buffs and our debuffs at this ascension; a rare leak is not the move's (f72b180); a split count is not collapsed to a mode", () => {
    const claw = renderMonster("CLAW", ctx);
    expect(claw).toContain("给自己加 STRENGTH +3 (n=5)");
    expect(claw).not.toMatch(/壮大[^\n]*覆甲/);
    expect(claw).toContain("给我们上 WEAK 1/2（3/2 次，n=5）");
    expect(claw).not.toMatch(/诅咒[^\n]*FRAIL/);
    expect(renderMonster("CLAW", { ...ctx, ascension: 8 })).toContain("给自己加 STRENGTH +2 (n=6)");
  });

  it("turns, successors, status cards, phases and mechanics from the power descriptions; our debuffs on it are not its mechanics", () => {
    const claw = renderMonster("CLAW", ctx);
    expect(claw).toContain("出现于第 1/3 回合（共 20 次）；下一招 壮大 12/夹击 3");
    expect(claw).toContain("- 荆棘 3 (n=4)（9/10 场）：当被攻击命中时，反击造成伤害。");
    expect(claw).not.toContain("易伤");
    expect(renderMonster("SLIME", ctx)).toContain("塞牌 SLIMED 每次 2 张 (n=5)，落点 弃牌堆 10");
    const bossy = renderMonster("BOSSY", ctx);
    expect(bossy).toContain("阶段血量 A9: 300 > 150 (n=2)；300 (n=1)");
    expect(bossy).toContain("- 滑溜 9 (n=3)（3/3 场）：这个生物下一次要失去生命值时，只会失去1点生命。");
  });

  it("finds a monster by id, lower-case id or Chinese name; says which ids exist when it cannot", () => {
    expect(renderMonster("大老板", ctx)).toContain("### 大老板 BOSSY");
    expect(renderMonster("claw", ctx)).toContain("### 钳子怪 CLAW");
    expect(() => renderMonster("NOPE", ctx)).toThrow(KnowledgeLookupError);
    expect(() => renderMonster("NOPE", ctx)).toThrow(/可用的 id: .*CLAW/);
    expect(() => renderMonster("小喽啰", ctx)).toThrow(/多个怪物.*MINI_A.*MINI_B/);
  });

  it("the full list is every monster, by act and kind, each once", () => {
    const all = renderMonsters(ctx);
    const order = [...all.matchAll(/^### \S+ (\w+)〔/gm)].map((match) => match[1]);
    expect(order).toEqual(["SLIME", "CLAW", "BOSSY", "MINI_A", "MINI_B"]);
  });

  it("encounters: our record at every logged ascension, highest first; elites and bosses live in the stats block", () => {
    const text = renderEncounters(ctx);
    expect(text).toContain("- 钳子怪×2 CLAW+CLAW〔走廊｜第1幕〕 A9 4场 胜75% 死1，赢局战内掉血 8/12 (n=3)；A8 2场 胜100% 死0，赢局战内掉血 5/6 (n=2)");
    expect(text).toContain("CLAW+SLIME〔问号房｜第1幕〕");
    expect(text).not.toContain("SLIME〔精英");
    expect(renderEncounter("BOSSY", ctx)).toContain("- boss BOSSY（大老板 BOSSY）〔第2幕〕 A9 3场 胜33% 死2");
    expect(renderEncounter("钳子怪", ctx, { room: "unknown_room" })).toContain("CLAW+SLIME");
    expect(() => renderEncounter("钳子怪", ctx, { act: 3 })).toThrow(/没有遭遇记录/);
  });
});

describe("monster DB: the HP ratio chain (ascension review #1/#20)", () => {
  const monsters: Record<string, MonsterEntry> = {
    A: { hp_by_asc: { "7": { median: 100 }, "8": { median: 110 }, "9": { median: 110 } } },
    B: { hp_by_asc: { "8": { median: 50 }, "9": { median: 50 } } },
    C: { hp_by_asc: { "7": { median: 20, n: 2 } } },
    D: { hp_by_asc: { "9": { median: 30, n: 4 } } },
  };

  it("logged here: as logged; else the nearest logged ascension times the measured ratio, chained through the ones between", () => {
    expect(monsterHpAt(monsters, "D", 9)).toMatchObject({ hp: 30, n: 4, estimated: false, from: 9 });
    // A7 -> A9 measured directly on A (logged at both): 110/100.
    expect(monsterHpAt(monsters, "C", 9)).toMatchObject({ hp: 22, estimated: true, from: 7, ratioN: 1, ratioTo: 9, logged: 20 });
    // A10 nobody logged: the chain stops at A9 (A9 -> A10 taken as 1).
    expect(chainedHpRatio(monsters, 7, 10)).toMatchObject({ reached: 9 });
    expect(monsterHpAt(monsters, "C", 10)).toMatchObject({ hp: 22, estimated: true, ratioTo: 9 });
    expect(monsterHpAt(monsters, "B", 10)).toMatchObject({ hp: 50, estimated: true, from: 9, ratio: 1 });
    expect(monsterHpAt(monsters, "NONE", 9)).toBeNull();
  });
});

describe("experience text", () => {
  it("only active lessons whose ascension range holds this one", () => {
    const text = renderExperience(ctx, withLessons());
    expect(text).toContain("[bossy-slippery｜boss:BOSSY 大老板｜适用 A0–20]");
    expect(text).toContain("[card-bash｜");
    expect(text).not.toContain("rest-low");
    expect(text).not.toContain("old-retired");
    const a8 = renderExperience({ ...ctx, ascension: 8 }, withLessons());
    expect(a8).toContain("rest-low");
    expect(a8).not.toContain("card-bash");
  });

  it("scopes map to themes by a constant table; an unmapped scope falls back to 机制/综合, not dropped", () => {
    expect(themeOf("boss:BOSSY")).toBe("monster");
    expect(themeOf("general:rest")).toBe("route");
    expect(themeOf("general:neow")).toBe("shop_event");
    expect(themeOf("act:2")).toBe("route");
    expect(themeOf("weird:thing")).toBe("mechanics");
    for (const theme of Object.values(SCOPE_THEMES)) expect(THEME_KEYS).toContain(theme);
    const text = renderExperience(ctx, withLessons());
    expect(text.indexOf("### 经验：机制/综合")).toBeLessThan(text.indexOf("[odd-scope"));
  });

  it("each lesson: support and contradiction counts, confidence, and 1-2 cases with the post-mortem heading's summary", () => {
    const text = renderExperience(ctx, withLessons());
    expect(text).toContain("支持 3 局，反对 1 局，置信 高；案例: RUNAAAAAAAA1（A9，第33层，死于二幕 boss 大老板 BOSSY）；RUNBBBBBBBB2（A8，第17层，死于钳子怪 CLAW）");
    expect(text).toContain("案例: RUNCCCCCCCC3（复盘里没有这一局）");
    expect(caseSummary("A9，第24层，死于棘刺蟾蜍 SPINY_TOAD：9/80 进场；0 瓶药")).toBe("A9，第24层，死于棘刺蟾蜍 SPINY_TOAD");
    expect(caseSummary("x".repeat(200))).toHaveLength(91);
  });

  it("without the post-mortem file: bare run ids, and the text says the case notes are missing", () => {
    const text = renderExperience(ctx, noLessons());
    expect(text).toContain("案例说明缺失");
    expect(text).toContain("no-such-lessons.md");
    expect(text).toContain("案例: RUNAAAAAAAA1；RUNAAAAAAAB9");
    const prefix = renderKnowledgePrefix(ctx, noLessons());
    expect(prefix).toContain("案例说明缺失");
  });

  it("queries by theme, id and keyword; explains a retired id, an id out of range and an unknown theme", () => {
    expect(queryExperience(ctx, { theme: "potion" }, withLessons())).toContain("potion-keep");
    expect(queryExperience(ctx, { keyword: "滑溜" }, withLessons())).toContain("bossy-slippery");
    expect(queryExperience(ctx, { ids: ["card-bash"] }, withLessons())).toContain("痛击留着");
    expect(() => queryExperience(ctx, { ids: ["old-retired"] }, withLessons())).toThrow(/已退役（被 A9 数据推翻）/);
    expect(() => queryExperience(ctx, { ids: ["rest-low"] }, withLessons())).toThrow(/适用 A0–8，不含当前 A9/);
    expect(() => queryExperience(ctx, { ids: ["nope"] }, withLessons())).toThrow(/没有经验条目「nope」/);
    expect(() => queryExperience(ctx, { theme: "bogus" as never }, withLessons())).toThrow(/可用的主题/);
    expect(() => queryExperience(ctx, { theme: "deck", keyword: "药水" }, withLessons())).toThrow(KnowledgeLookupError);
  });

  it("post-mortem parsing: run sections only, their summary and ascension, subsections kept", () => {
    const parsed = parsePostmortems(readFileSync(LESSONS, "utf8"), LESSONS);
    expect([...parsed.sections!.keys()]).toEqual(["RUNAAAAAAAA1", "RUNBBBBBBBB2", "RUNAAAAAAAB9"]);
    const first = parsed.sections!.get("RUNAAAAAAAA1")![0]!;
    expect(first.asc).toBe(9);
    expect(first.text).toContain("### 小节");
    expect(first.text).not.toContain("RUNBBBBBBBB2");
    expect(parsed.sections!.get("RUNBBBBBBBB2")![0]!.text).not.toContain("跨局规律");
  });
});

describe("old knowledge", () => {
  it("every source whole, under the note that the data wins; headings moved under the source; hint numbers from the DB", () => {
    const text = renderOldKnowledge(ctx);
    expect(text.startsWith("以下是早期手写的旧知识")).toBe(true);
    expect(text).toContain("和数据冲突时以数据为准");
    expect(text).toContain("### 旧知识：铁甲战士攻略（ironclad-guide.md，待数据验证）\n### 攻略\n\n#### 1. 总体\n- 删打击。");
    expect(text).toContain("#### 路线\n- 连续三场战斗的路线不走。");
    expect(text).toContain("- [claw-snip] 条件 {\"enemies\":[\"CLAW\"]}：Snip hits for 12.（证据 2 局: RUNAAAAAAAA1, RUNBBBBBBBB2）");
    expect(renderOldKnowledge({ ...ctx, ascension: 8 })).toContain("Snip hits for 10.");
  });

  it("a keyword returns the matching lines under their heading; unknown source or keyword says what exists", () => {
    const text = queryOldKnowledge(ctx, "guide", "休息");
    expect(text).toContain("## 2. 休息\n- 低血时休息。");
    expect(text).not.toContain("删打击");
    expect(queryOldKnowledge(ctx, "jev_hints", "slippery")).toContain("bossy-slip");
    expect(() => queryOldKnowledge(ctx, "wiki")).toThrow(/可用的来源: guide/);
    expect(() => queryOldKnowledge(ctx, undefined, "不存在的词")).toThrow(/没有「不存在的词」/);
  });
});

describe("statistics tables", () => {
  it("room costs by act (from the data) and ascension, median/p75/p90, death rate, n; few rooms marked", () => {
    const text = renderRoomCosts(ctx);
    expect(text).toContain("#### 第1幕\n| 进阶 | 走廊 | 精英 | 休息 |");
    expect(text).toContain("| A9（本局） | 2/7/— 死0% n=30 | — | -20/0/— 死0% n=6 |");
    expect(text).toContain("| A8 | 3/8/— 死5% n=20 | 20/30/— 死0% n=4(少) | — |");
    expect(text).toContain("| A9（本局） | 10/18/30 死25% n=8 |");
    expect(renderRoomCosts(ctx, 2)).not.toContain("第1幕");
    expect(() => renderRoomCosts(ctx, 3)).toThrow(/可用的幕: 1, 2/);
  });

  it("says p90 is missing when the room-cost file has none", () => {
    const dir = copyData();
    const rooms = JSON.parse(readFileSync(join(dir, "room-costs.json"), "utf8"));
    delete rooms.by_asc["9"]["2"]["Monster"].p90;
    writeFileSync(join(dir, "room-costs.json"), JSON.stringify(rooms));
    expect(renderRoomCosts({ ...ctx, knowledgeDir: dir })).toContain("p90 暂缺");
    expect(renderRoomCosts(ctx)).not.toContain("p90 暂缺");
  });

  it("the ? rooms that were a fight get their own named column and a room's in-fight HP loss is shown (v3 337074d data)", () => {
    const dir = copyData();
    const rooms = JSON.parse(readFileSync(join(dir, "room-costs.json"), "utf8"));
    Object.assign(rooms.by_asc["9"]["1"]["Monster"], { fight_median: 9, fight_p75: 12 });
    rooms.by_asc["9"]["1"]["UnknownFight"] = { n: 6, deaths: 0, median: 4, p75: 9, p90: 12, mean: 5, fight_median: 8, fight_p75: 11 };
    writeFileSync(join(dir, "room-costs.json"), JSON.stringify(rooms));
    const text = renderRoomCosts({ ...ctx, knowledgeDir: dir });
    expect(text).toContain("| 进阶 | 走廊 | 精英 | 问号里的战斗 | 休息 |");
    expect(text).toContain("| A9（本局） | 2/7/— 战内9/12 死0% n=30 | — | 4/9/12 战内8/11 死0% n=6 | -20/0/— 死0% n=6 |");
    expect(text).toContain("「战内 中位/p75」= 战斗里掉的血");
    expect(renderRoomCosts(ctx)).not.toContain("战内");
  });

  it("elite and boss records by act; rest-site choices by HP band, saying when the stats are another ascension's", () => {
    const fights = renderFightRecords(ctx);
    expect(fights).toContain("#### 第1幕\n- 史莱姆 SLIME〔精英｜第1幕〕 A9 5场 胜80% 死1，赢局战内掉血 25/31 (n=4)");
    expect(fights).toContain("- boss BOSSY（大老板 BOSSY）〔第2幕〕 A9 3场 胜33% 死2，赢局战内掉血 40/40 (n=1)，赢局回合 7/7 (n=1)，每回合掉血 9/11 (n=3)");
    const rest = renderRestStats(ctx);
    expect(rest).toContain("注意：这是 A8 的数据，不是本局的 A9。");
    expect(rest).toContain("- 回血 HEAL：<40% n=3(少) 均终层 15 过boss 33%；40-60% n=7 均终层 22 过boss 43%");
    expect(rest).toContain("- 锻造 SMITH：>=80% n=6 均终层 30 过boss 50%");
    expect(renderRestStats({ ...ctx, ascension: 8 })).not.toContain("注意");
    expect(() => renderStatsTable("nope", ctx)).toThrow(/可用的表: room_costs/);
  });
});

describe("count formatting", () => {
  it("one dominant value with n; otherwise every value seen with its count", () => {
    expect(countsText({ "3": 8 })).toBe("3 (n=8)");
    expect(countsText({ "3": 9, "1": 1 })).toBe("3 (n=10)");
    expect(countsText({ "1": 1, "2": 1 })).toBe("1/2（1/1 次，n=2）");
    expect(countsText({})).toBeNull();
  });
});

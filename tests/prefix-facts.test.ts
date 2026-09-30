/**
 * KNOWLEDGE_PREFIX=full and v3 8546fde (the DeepSeek system prompt's guide/handbook data facts frozen per day): the
 * prefix's hand-written texts (guide, handbook, Jev hints, experience lessons) take their data facts from the day's
 * table (render/facts.ts), so a run's data refresh leaves the old-knowledge and experience blocks byte-identical and
 * the cached prefix holds up to the data-version block. Also: V3-final's lessons carry placeholders, filled in the
 * prefix (b5e1f44) and in Jev's lessons.
 */
import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createBrain } from "../src/brain/brain.js";
import { loadConfig } from "../src/config.js";
import { loadPostmortems } from "../src/knowledge/render/data.js";
import { freshFacts, frozenFacts } from "../src/knowledge/render/facts.js";
import { renderKnowledgePrefix, renderKnowledgeSections } from "../src/knowledge/render/knowledge-prefix.js";
import { loadExperience, type ExperienceEntry } from "../src/knowledge/experience.js";
import { DeepSeekClient } from "../src/llm/deepseek.js";
import { jevLessonLine } from "../src/screens/jev-experience.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "gkb-data", "knowledge");
const LESSONS = join(HERE, "gkb-data", "lessons.md");
const REAL = join(HERE, "..", "src", "knowledge");
const at = (day: number, hour: number) => () => new Date(2026, 8, day, hour, 0, 0);
const PLACEHOLDER = /\{@?[A-Z0-9][A-Z0-9_]*(?::[A-Z0-9_]+)*\}/;

describe("frozenFacts: each placeholder's value frozen for the day", () => {
  const data = { record: "A8 27 场赢 13" };
  const fill = (text: string) => text.split("{GIANT_KILLS_A8}").join(data.record);

  it("same day: the value first filled holds though the data moved; the next day takes the new data and drops the old table", () => {
    const dir = mkdtempSync(join(tmpdir(), "prefix-facts-"));
    data.record = "A8 27 场赢 13";
    expect(frozenFacts(dir, at(30, 3))("Giant: {GIANT_KILLS_A8}.", fill)).toBe("Giant: A8 27 场赢 13.");
    data.record = "A8 29 场赢 14"; // a run later, the data rebuilt; a new process reads the day's table
    expect(frozenFacts(dir, at(30, 23))("Again {GIANT_KILLS_A8}; {GIANT_KILLS_A8}", fill)).toBe("Again A8 27 场赢 13; A8 27 场赢 13");
    expect(frozenFacts(dir, at(31, 0))("Giant: {GIANT_KILLS_A8}.", fill)).toBe("Giant: A8 29 场赢 14.");
    expect(readdirSync(dir)).toEqual(["2026-10-01-prefix-facts.json"]);
  });

  it("text without placeholders, and braces that are no placeholder, are left as written and not recorded", () => {
    const dir = mkdtempSync(join(tmpdir(), "prefix-facts-"));
    const facts = frozenFacts(dir, at(30, 3));
    expect(facts('条件 {"enemy":"X"}：{UNKNOWN_THING}', (text) => text)).toBe('条件 {"enemy":"X"}：{UNKNOWN_THING}');
    expect(readdirSync(dir)).toEqual([]);
  });

  it("a scope keeps values apart (the hints' monster-DB numbers per ascension)", () => {
    const dir = mkdtempSync(join(tmpdir(), "prefix-facts-"));
    const facts = frozenFacts(dir, at(30, 3));
    expect(facts("{DMG:X:Y}", () => "8", "A8")).toBe("8");
    expect(facts("{DMG:X:Y}", () => "9", "A9")).toBe("9");
    expect(facts("{DMG:X:Y}", () => "10", "A8")).toBe("8");
    expect(JSON.parse(readFileSync(join(dir, "2026-09-30-prefix-facts.json"), "utf8"))).toEqual({ "A8|{DMG:X:Y}": "8", "A9|{DMG:X:Y}": "9" });
  });

  it("no dir: filled fresh at every call", () => {
    expect(frozenFacts(undefined)).toBe(freshFacts);
    data.record = "A8 30 场赢 15";
    expect(freshFacts("{GIANT_KILLS_A8}", fill)).toBe("A8 30 场赢 15");
  });
});

describe("the full prefix with frozen facts", () => {
  /** The fixture with placeholders in the guide, the handbook and a lesson. */
  const withPlaceholders = (): string => {
    const dir = mkdtempSync(join(tmpdir(), "prefix-facts-kn-"));
    cpSync(FIXTURE, dir, { recursive: true });
    writeFileSync(join(dir, "ironclad-guide.md"), `${readFileSync(join(dir, "ironclad-guide.md"), "utf8")}\n- 巨兽：{GIANT_KILLS_A8}。\n`);
    writeFileSync(join(dir, "ds-handbook.md"), `${readFileSync(join(dir, "ds-handbook.md"), "utf8")}\n- 帝王蟹：{BOSS_RECORD:KAISER_CRAB}。\n`);
    const experience = JSON.parse(readFileSync(join(dir, "experience.json"), "utf8")) as { entries: { lesson: string; status?: string; asc?: number[] }[] };
    const active = experience.entries.find((entry) => (entry.status ?? "active") === "active" && (entry.asc ?? [0, 20])[0]! <= 9 && 9 <= (entry.asc ?? [0, 20])[1]!)!;
    active.lesson = `${active.lesson} 记录：{GIANT_KILLS_A8}；{BOSS_RECORD:KAISER_CRAB}。`;
    writeFileSync(join(dir, "experience.json"), JSON.stringify(experience));
    return dir;
  };

  it("the guide, the handbook, the hints and the lessons read the day's table; nothing is left unfilled", () => {
    const knowledgeDir = withPlaceholders();
    const factsDir = mkdtempSync(join(tmpdir(), "prefix-facts-day-"));
    // The day's table as the first render of the day left it (stand-in values, so the test does not hang on the data).
    writeFileSync(
      join(factsDir, "2026-09-30-prefix-facts.json"),
      JSON.stringify({ "{GIANT_KILLS_A8}": "巨兽冻结值", "{BOSS_RECORD:KAISER_CRAB}": "蟹冻结值", "A9|{DMG:CLAW:SNIP_MOVE}": "冻结伤害" }),
    );
    const sections = renderKnowledgeSections({ ascension: 9, knowledgeDir, facts: frozenFacts(factsDir, at(30, 12)) }, loadPostmortems(LESSONS));
    const text = (key: string) => sections.find((section) => section.key === key)?.text ?? "";
    expect(text("old.guide")).toContain("巨兽：巨兽冻结值。");
    expect(text("old.handbook")).toContain("帝王蟹：蟹冻结值。");
    expect(text("old.jev_hints")).toContain("冻结伤害");
    const experience = sections.filter((section) => section.key.startsWith("experience.")).map((section) => section.text).join("\n");
    expect(experience).toContain("记录：巨兽冻结值；蟹冻结值。");
    for (const section of sections) expect(section.text).not.toMatch(PLACEHOLDER);
  });

  it("a data refresh changes the prefix from the data-version block on; everything before it is byte-identical", () => {
    const knowledgeDir = withPlaceholders();
    const factsDir = mkdtempSync(join(tmpdir(), "prefix-facts-day-"));
    const postmortems = loadPostmortems(LESSONS);
    const first = renderKnowledgePrefix({ ascension: 9, knowledgeDir, facts: frozenFacts(factsDir, at(30, 3)) }, postmortems);
    // After a run: the monster DB rebuilt (a new fight count), a new process on the same day.
    const db = JSON.parse(readFileSync(join(knowledgeDir, "monster-db.json"), "utf8")) as { meta?: { generated_from?: { fights?: number } } };
    db.meta = { ...db.meta, generated_from: { ...db.meta?.generated_from, fights: (db.meta?.generated_from?.fights ?? 0) + 7 } };
    writeFileSync(join(knowledgeDir, "monster-db.json"), JSON.stringify(db));
    const second = renderKnowledgePrefix({ ascension: 9, knowledgeDir, facts: frozenFacts(factsDir, at(30, 23)) }, postmortems);
    expect(second).not.toBe(first);
    const cut = first.indexOf("## 数据版本");
    expect(cut).toBeGreaterThan(first.indexOf("## 经验库"));
    expect(cut).toBeLessThan(first.indexOf("## 怪物（A9）"));
    expect(second.slice(0, cut)).toBe(first.slice(0, cut));
    // The header carries no data version (it opens the prefix).
    expect(first.slice(0, first.indexOf("## 旧知识"))).not.toMatch(/场战斗/);
  });

  it("the brain renders with the day's table in DEEPSEEK_FACTS_SNAPSHOT_DIR", async () => {
    const factsDir = join(mkdtempSync(join(tmpdir(), "prefix-facts-brain-")), "guide-facts");
    const log = join(mkdtempSync(join(tmpdir(), "prefix-facts-log-")), "brain.jsonl");
    const config = loadConfig({ DEEPSEEK_API_KEY: "k-test", KNOWLEDGE_PREFIX: "full", BRAIN_LOG: log, DEEPSEEK_FACTS_SNAPSHOT_DIR: factsDir } as unknown as NodeJS.ProcessEnv);
    const ds = new DeepSeekClient({ ...config.deepseek!, baseUrl: "http://deepseek.invalid", guideFile: join(FIXTURE, "ironclad-guide.md"), handbookFile: join(FIXTURE, "ds-handbook.md") });
    const brain = createBrain(config, ds);
    const { system } = brain.knowledge.system({ ascension: 9, knowledgeDir: FIXTURE });
    expect(system).toContain("## 数据版本");
    // The fixture's one placeholder (a Jev hint's monster-DB number) went through the day's table.
    const tables = readdirSync(factsDir).filter((name) => name.endsWith("-prefix-facts.json"));
    expect(tables).toHaveLength(1);
    expect(Object.keys(JSON.parse(readFileSync(join(factsDir, tables[0]!), "utf8")) as object)).toEqual(["A9|{DMG:CLAW:SNIP_MOVE}"]);
  });
});

describe("V3-final's lessons with data placeholders (b5e1f44) are filled where V4 shows them", () => {
  const withPlaceholder = (): ExperienceEntry[] => loadExperience().filter((entry) => entry.status === "active" && PLACEHOLDER.test(entry.lesson));

  it("the real experience base has such lessons", () => {
    expect(withPlaceholder().length).toBeGreaterThan(0);
  });

  it("the prefix (fresh, every ascension played) and Jev's lesson lines show them filled", { timeout: 60_000 }, () => {
    for (const ascension of [8, 9]) {
      const sections = renderKnowledgeSections({ ascension, knowledgeDir: REAL });
      for (const section of sections.filter((item) => item.key === "old" || item.key.startsWith("old.") || item.key.startsWith("experience"))) expect(section.text, section.key).not.toMatch(PLACEHOLDER);
    }
    for (const entry of withPlaceholder()) expect(jevLessonLine(entry)).not.toMatch(PLACEHOLDER);
  });
});

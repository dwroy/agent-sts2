/** The guide and handbook DeepSeek reads defer HP thresholds to the experience base (audit 2026-09-28). */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "knowledge");
const read = (name: string): string => readFileSync(join(DIR, name), "utf8");
const lines = (text: string, topic: RegExp): string[] => text.split("\n").filter((line) => topic.test(line));
/** An HP threshold written as a number: "HP>60%", "HP≥75%", "HP<50%". */
const HP_LINE = /HP\s*[<>≥≤]=?\s*\d+\s*%/;

describe("knowledge text: no hand-set HP thresholds where the experience base has evidence", () => {
  it("the handbook no longer says code forces a rest before the boss, or guards event HP for DeepSeek", () => {
    const handbook = read("ds-handbook.md");
    const enforced = handbook.split("\n").find((line) => line.includes("已由代码强制执行"))!;
    expect(enforced).not.toMatch(/休息|事件/);
    expect(handbook).toMatch(/休息点回血还是锻造（包括强制精英\/boss 前）/);
    expect(handbook).toMatch(/两者冲突时按知识切片/);
  });

  it("elite, rest, shop and event lines carry no HP% threshold and point to the knowledge slice", () => {
    for (const name of ["ds-handbook.md", "ironclad-guide.md"]) {
      const text = read(name);
      const topical = lines(text, /精英|休息|锻造|回血|商店|金币|事件/);
      expect(topical.filter((line) => HP_LINE.test(line))).toEqual([]);
      expect(text).toMatch(/知识切片 general:elite/);
      expect(text).toMatch(/知识切片 general:rest|general:rest/);
    }
  });

  it("the guide no longer excuses HP trades with Burning Blood", () => {
    expect(read("ironclad-guide.md")).not.toContain("燃烧之血能回");
  });

  it("every experience entry the text cites by id exists and is active", () => {
    const entries = new Map(
      (JSON.parse(read("experience.json")) as { entries: { id: string; status: string }[] }).entries.map((entry) => [entry.id, entry.status]),
    );
    for (const name of ["ds-handbook.md", "ironclad-guide.md"]) {
      for (const [id] of read(name).matchAll(/\b(?:elite|rest|shop|event|route|potion)-[a-z-]+(?= n=|，n=|,)/g)) {
        expect(entries.get(id), `${name}: ${id}`).toBe("active");
      }
    }
  });
});

describe("boss numbers per ascension, advice as the experience base has it (Waterfall Giant, Test Subject)", () => {
  it("the Giant: A8/A9 numbers and the early-kill evidence, not the A0 upgrade counts or \"fight slowly\"", () => {
    const handbook = read("ds-handbook.md");
    const guide = read("ironclad-guide.md");
    // giant-deck: A8 winners 1.2 upgrades, losers 2.3; the old 0.3 / 2.2 came from three A0 runs.
    expect(handbook).not.toMatch(/输的 3 局平均升级 0\.3 张/);
    expect(handbook).toMatch(/A8 赢局平均 1\.2 张升级、输局 2\.3 张/);
    // giant-explode: killed by T10 13/15 won, T16 or later 0/3; "block more and fight slowly" is the losing way.
    expect(guide).not.toContain("宁可多格挡慢慢打");
    for (const text of [handbook, guide]) {
      expect(text).toMatch(/A9 = 17\+3\(T−1\)/);
      expect(text).toMatch(/T10 前击杀 13\/15 赢/);
      expect(text).toMatch(/A8\+ 250 血/);
    }
    expect(guide).not.toMatch(/WATERFALL_GIANT（第一幕 Underdocks 路线，240 血）/);
    expect(guide).toMatch(/第 2 回合 A0–A8 15 层、A9 20 层/);
    expect(guide).toMatch(/A9 23\/28\/33/);
  });

  it("the Test Subject: A8 phases, and phase 3 is big hits on the open turns, not many small ones", () => {
    const guide = read("ironclad-guide.md");
    expect(guide).toMatch(/A8 111\/212\/313 共 636 血/);
    expect(guide).toMatch(/进三阶段 HP 最好 ≥75/);
    const hints = JSON.parse(read("jev-hints.json")) as { hints: { id: string; text: string }[] };
    expect(hints.hints.find((hint) => hint.id === "test-subject-phases")!.text).toContain("A8 111/212/313");
    expect(hints.hints.find((hint) => hint.id === "giant-eruption")!.text).toMatch(/Kill it by turn 10/);
  });

  it("every boss experience entry the texts cite exists and is active", () => {
    const entries = new Map(
      (JSON.parse(read("experience.json")) as { entries: { id: string; status: string }[] }).entries.map((entry) => [entry.id, entry.status]),
    );
    for (const name of ["ds-handbook.md", "ironclad-guide.md"]) {
      for (const [id] of read(name).matchAll(/\b(?:giant|ts|crab|queen)-[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
        expect(entries.get(id), `${name}: ${id}`).toBe("active");
      }
    }
  });
});

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

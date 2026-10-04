/** The guide and handbook DeepSeek reads defer HP thresholds to the experience base (audit 2026-09-28). */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { hintText, loadHints } from "../src/knowledge/jev-hints.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { knowledgeFile } from "../src/knowledge/files.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "knowledge");
const read = (name: string): string => readFileSync(knowledgeFile(DIR, name), "utf8");
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
      for (const [id] of read(name).matchAll(/\b(?:elite|rest|shop|event|route|potion)-[a-z-]+(?=[、，,）)\s]|$)/g)) {
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
    // 2026-09-30 (A8 30 fights with 5PHF, 2WRU): winners 1.2, losers 2.1.
    expect(handbook).toMatch(/A8 30 场赢局平均 1\.2 张升级、输局 2\.1 张/);
    // giant-explode: the kill-turn record (A8 killed by T10 13/15 won when written) is filled from the fight data
    // (batch I: {GIANT_KILLS_A8}, {GIANT_KILLS_A9}); "block more and fight slowly" is the losing way.
    expect(guide).not.toContain("宁可多格挡慢慢打");
    for (const text of [handbook, guide]) {
      expect(text).toMatch(/A9 = 17\+3\(T−1\)/);
      expect(text).toContain("{GIANT_KILLS_A8}");
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

describe("no A0/A8 boss HP or damage stated as fact in the guide, the handbook or Jev's hints (review 2026-09-29 #11)", () => {
  // A0-A7 boss HP (A8+ in brackets): Insatiable 321 (341), Queen 400 + 199 (419 + 211), Aeonglass 512 (535),
  // Vantom 173 (183), Beast 252 (262), Kin priest 190 (199), Knowledge Demon 379 (399), crab 408 (428), Entomancer 145 (165).
  const A0_HP = /\b(321|400|199|512|173|252|190|379|408|145)\s*(血|HP)/;

  it("the guide and handbook carry no unlabelled A0 boss HP; §9 defers its numbers to the DB", () => {
    for (const name of ["ds-handbook.md", "ironclad-guide.md"]) {
      const offending = read(name).split("\n").filter((line) => A0_HP.test(line) && !/A0–A7/.test(line));
      expect(offending, name).toEqual([]);
    }
    const guide = read("ironclad-guide.md");
    expect(guide).not.toContain("实验体（600 血）");
    expect(guide).not.toMatch(/400 \+ 199/);
    expect(guide).not.toContain("冲突时以此为准");
    expect(guide).toMatch(/## 9\. .*当前进阶的数值以 boss_db \/ act_boss_clock 为准/);
    // Damage figures that differ at A9: the crab's Laser, the Matriarch's hits, the Terror Eel's Shriek line.
    expect(guide).not.toContain("激光 47–49");
    expect(guide).not.toContain("19、9×2");
    expect(guide).toContain("（A0–A7 70，A8+ 75）");
    expect(read("ds-handbook.md")).not.toContain("408 血");
    expect(read("ds-handbook.md")).not.toContain("肢解 26~28");
  });

  it("Jev's hints: no HP figures, damage filled from the DB at this ascension", () => {
    const hints = loadHints();
    for (const hint of hints) expect(hint.text, hint.id).not.toMatch(/about (321|408|49|30)\b|\(145 HP\)|26-28|30-40/);
    const byId = (id: string) => hints.find((hint) => hint.id === id)!;
    const dmg = (bases: Record<string, number>, hits = 1) => ({
      damage_by_asc: Object.fromEntries(Object.entries(bases).map(([asc, base]) => [asc, { base_per_hit: { [String(base)]: 4 }, hits: { [String(hits)]: 4 } }])),
    });
    setMonsterDbForTests({
      bosses: {},
      encounters: {},
      monsters: {
        ROCKET: { moves: { LASER_MOVE: { ...dmg({ "8": 31, "9": 35 }), back_attack_by_asc: { "8": { behind: 24, facing: 5 } } } } },
        MECHA_KNIGHT: { moves: { HEAVY_CLEAVE_MOVE: dmg({ "8": 35, "9": 40 }) } },
        KNOWLEDGE_DEMON: { moves: { PONDER_MOVE: { self_powers_gained_by_asc: { "8": { STRENGTH_POWER: { "2": 30 } }, "9": { STRENGTH_POWER: { "3": 2 } } } } } },
      },
    } as never);
    try {
      expect(hintText(byId("crab-charge"), 9)).toContain("a laser of 35 (52 from behind)");
      expect(hintText(byId("crab-charge"), 8)).toContain("a laser of 31 (46 from behind)");
      expect(hintText(byId("mecha-knight-t4"), 9)).toContain("Mecha Knight hits 40 on its turn 4 attack");
      expect(hintText(byId("kd-long-fight"), 9)).toContain("gains 3 Strength each cycle");
      expect(hintText(byId("kd-long-fight"), 8)).toContain("gains 2 Strength each cycle");
    } finally {
      setMonsterDbForTests(null);
    }
  });
});

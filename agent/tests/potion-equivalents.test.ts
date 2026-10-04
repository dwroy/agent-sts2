/**
 * The potion table (Dai 2026-09-30; docs/potion-equivalents.md): the builder's formulas on a fixed sample
 * (knowledge/builders/build-potion-equivalents.py --self-test), and the loader, query, renderer, kb_potion tool and Jev's combat
 * question field on the hand-written fixture tests/gkb-data/knowledge/characters/ironclad/potion-equivalents.json (not the table the
 * builder refreshes). No LLM is called.
 */

import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import {
  POTION_WORTH_KEY,
  heldPotionWorth,
  loadPotionEquivalents,
  parsePotionEquivalents,
  potionEquivalent,
  potionEquivalentFrom,
  potionText,
  potionWorthSource,
  sourceLabel,
  tableAct,
  tableAscension,
  worthText,
} from "../src/knowledge/potion-equivalents.js";
import { KnowledgeLoadError, KnowledgeLookupError } from "../src/knowledge/render/data.js";
import { findPotion, renderPotion, renderPotionTable } from "../src/knowledge/render/potion-text.js";
import { buildTools } from "../src/tools/registry.js";
import type { ToolContext } from "../src/tools/types.js";
import { knowledgeFile } from "../src/knowledge/files.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "tests", "gkb-data");
const KNOWLEDGE = join(DATA, "knowledge");
const ctx9 = { ascension: 9, knowledgeDir: KNOWLEDGE };

const temps: string[] = [];
function copyData(): string {
  const dir = mkdtempSync(join(tmpdir(), "potion-eq-"));
  temps.push(dir);
  cpSync(KNOWLEDGE, dir, { recursive: true });
  return dir;
}
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});
afterEach(() => {
  potionWorthSource.dir = undefined;
});

describe("the builder's formulas (fixed sample, no log database)", () => {
  it("passes its self-test: rates, capped block, Strength / Dexterity over the fight, Weak, Regen, Plating, energy, the check column", () => {
    const out = execFileSync("python3", [join(ROOT, "..", "knowledge/builders/build-potion-equivalents.py"), "--self-test"], { encoding: "utf8" });
    expect(out).toContain("self-test ok");
  });
});

describe("loading the table", () => {
  it("loads the fixture, checked, and returns the same object while the file is unchanged", () => {
    const file = loadPotionEquivalents(KNOWLEDGE);
    expect(Object.keys(file.potions)).toContain("FIRE_POTION");
    expect(file.rates["9"]!["3"]!.from_asc).toBe(8);
    expect(loadPotionEquivalents(KNOWLEDGE)).toBe(file);
  });

  it("throws KnowledgeLoadError, never an empty table, when the file is missing, malformed or incomplete", () => {
    const missing = copyData();
    rmSync(knowledgeFile(missing, "potion-equivalents.json"));
    expect(() => loadPotionEquivalents(missing)).toThrow(KnowledgeLoadError);
    expect(() => loadPotionEquivalents(missing)).toThrow(/potion-equivalents\.json/);
    const broken = copyData();
    writeFileSync(knowledgeFile(broken, "potion-equivalents.json"), "{ not json");
    expect(() => loadPotionEquivalents(broken)).toThrow(/不是合法 JSON/);
    expect(() => parsePotionEquivalents(JSON.stringify({ meta: { generated: "x", min_n: 5 }, rates: {}, potions: {} }), "p")).toThrow(/rates/);
    const noHp = { meta: { generated: "x", min_n: 5 }, rates: { "8": { "1": { fights: 1, T: 1, D: 1, L: 1, r: 1, h: 1, b: 1, v_card: 1, v_energy: 1, from_asc: 8 } } }, potions: { X: { name: "x", category: "damage", log: {}, by_asc: { "8": { "1": { damage: 1, block: 1, hold_hp: 1, n: 1, source: "公式", formula: "" } } } } } };
    expect(() => parsePotionEquivalents(JSON.stringify(noHp), "p")).toThrow(/potions\.X\.by_asc\.8\.1/);
    expect(() => parsePotionEquivalents(JSON.stringify({ ...noHp, potions: { X: { name: "x", category: "nonsense", log: {}, by_asc: {} } } }), "p")).toThrow(/category/);
  });
});

describe("potionEquivalent", () => {
  const file = loadPotionEquivalents(KNOWLEDGE);

  it("answers by act and ascension, with the source, n and the check column", () => {
    const fire = potionEquivalentFrom(file, "FIRE_POTION", 1, 8)!;
    expect(fire).toMatchObject({ id: "FIRE_POTION", name: "火焰药水", category: "damage", act: 1, ascension: 8, tableAscension: 8, inputsAscension: 8, hp: 5, damage: 20, block: 5, holdHp: 5, source: "公式", n: 40, timingFree: false });
    expect(fire.check).toEqual({ median: 0, n: 3 });
    expect(potionEquivalentFrom(file, "SWIFT_POTION", 1, 9)).toMatchObject({ source: "估", mc: { hp: 2.5, n: 30 } });
    // Act 3 at A9 borrowed A8's boss fights.
    expect(potionEquivalentFrom(file, "FIRE_POTION", 3, 9)).toMatchObject({ tableAscension: 9, inputsAscension: 8, n: 6 });
    expect(potionEquivalent("BLOCK_POTION", 2, 9, KNOWLEDGE)!.holdHp).toBe(10);
  });

  it("takes the nearest ascension the table has (the lower on a tie) and clamps the act", () => {
    expect(tableAscension(file, 9)).toBe(9);
    expect(tableAscension(file, 0)).toBe(8);
    expect(tableAscension(file, 12)).toBe(9);
    expect([tableAct(0), tableAct(null), tableAct(2), tableAct(4)]).toEqual([1, 1, 2, 3]);
    const low = potionEquivalentFrom(file, "FIRE_POTION", 1, 3)!;
    expect(low).toMatchObject({ ascension: 3, tableAscension: 8, hp: 5 });
    expect(sourceLabel(low)).toBe("A8 公式 n=40");
    expect(sourceLabel(potionEquivalentFrom(file, "FIRE_POTION", 3, 9)!)).toBe("公式 n=6（输入借 A8）");
  });

  it("is null for an unknown potion or one with no value; a negative HP holds 0", () => {
    expect(potionEquivalentFrom(file, "NO_SUCH_POTION", 1, 8)).toBeNull();
    expect(potionEquivalentFrom(file, "POISON_POTION", 1, 8)).toBeNull();
    const foul = potionEquivalentFrom(file, "FOUL_POTION", 1, 8)!;
    expect(foul.hp).toBe(-9);
    expect(foul.holdHp).toBe(0);
    expect(worthText(foul)).toBe("约等于 0 血 / 0 伤害 / 0 格挡");
    expect(worthText(potionEquivalentFrom(file, "FIRE_POTION", 1, 8)!)).toBe("约等于 5 血 / 20 伤害 / 5 格挡");
  });

  it("fills the effect text from potion-values.ts", () => {
    expect(potionText("FIRE_POTION", file.potions["FIRE_POTION"]!)).toBe("造成20点伤害。");
  });
});

describe("the prefix block", () => {
  it("renders the run's ascension: legend, rates with n (a borrowed act said), one line per Ironclad potion by act-1 value, deterministic", () => {
    const text = renderPotionTable(ctx9);
    expect(renderPotionTable(ctx9)).toBe(text);
    const lines = text.split("\n");
    expect(lines[0]).toBe("## 药水换算表（A9：每瓶药留到本幕 boss 战值多少，血/伤害/格挡）");
    expect(text).toContain("boss 之前喝掉它，就等于付出这些血");
    expect(text).toContain("一幕 r=0.300（我方每回合 20 伤害，boss 每回合打进来 6 血，战斗 9 回合，每回合 2 段攻击、1 张格挡牌，n=12）");
    expect(text).toContain("三幕 r=0.200（我方每回合 40 伤害，boss 每回合打进来 8 血，战斗 7 回合，每回合 2 段攻击、1 张格挡牌，n=6，借 A8）");
    const potionLines = lines.filter((line) => line.startsWith("- "));
    expect(potionLines.map((line) => line.split(" ")[2])).toEqual(["BLOCK_POTION［格挡］一幕", "FIRE_POTION［伤害］一幕", "FRUIT_JUICE［回血］一幕", "SWIFT_POTION［抽牌］一幕", "FOUL_POTION［伤害］一幕"]);
    expect(text).toContain("- 火焰药水 FIRE_POTION［伤害］一幕 6/20/6，二幕 5/20/5，三幕 4/20/4（公式 n=12/5/6）");
    expect(text).toContain("什么时候喝都一样，喝掉不算代价");
    expect(text).toContain("喝了净亏 8.4 血（伤到自己），持有价值按 0");
    expect(text).toContain("不在铁甲战士药水池（没有数值）：毒药水");
    expect(text).not.toContain("POISON_POTION［");
  });

  it("uses the nearest ascension, and says so, when the run's is not in the table", () => {
    expect(renderPotionTable({ ascension: 5, knowledgeDir: KNOWLEDGE }).split("\n")[0]).toBe("## 药水换算表（A8（本表没有 A5，用最近的 A8）：每瓶药留到本幕 boss 战值多少，血/伤害/格挡）");
  });

  it("renders one potion in detail: effect, log counts, every act with its formula, checks and notes", () => {
    const text = renderPotion("火焰药水", ctx9);
    expect(text).toContain("火焰药水 FIRE_POTION［伤害］稀有度 Common，只能在战斗中喝，目标 AnyEnemy；求解器：精确");
    expect(text).toContain("效果：造成20点伤害。");
    expect(text).toContain("日志：出现在 10 局，喝了 12 次；boss 战喝 A8 3 次、A9 1 次");
    expect(text).toContain("- 三幕：4/20/4（公式 n=6，输入借 A8）：fixture 9/3");
    expect(text).toContain("校验合计（A8/A9 各幕）：中位 0 血（n=3）");
    expect(renderPotion("SWIFT_POTION", ctx9, 1)).toContain("蒙特卡洛本回合平均增益 2.5 血（n=30");
    expect(renderPotion("SWIFT_POTION", ctx9, 1)).not.toContain("二幕");
    expect(renderPotion("POISON_POTION", ctx9)).toContain("没有数值：不在铁甲战士的药水池");
  });

  it("finds a potion by id, Chinese name or a unique part of it; else lists what there is", () => {
    const file = loadPotionEquivalents(KNOWLEDGE);
    expect(findPotion(file, "fire_potion")).toBe("FIRE_POTION");
    expect(findPotion(file, "格挡药水")).toBe("BLOCK_POTION");
    expect(findPotion(file, "迅捷")).toBe("SWIFT_POTION");
    expect(() => findPotion(file, "药水")).toThrow(KnowledgeLookupError);
    expect(() => findPotion(file, "龙涎香")).toThrow(/找不到药水「龙涎香」。可选：BLOCK_POTION（格挡药水）/);
  });
});

describe("kb_potion", () => {
  const ctx: ToolContext = { ascension: 9, knowledgeDir: KNOWLEDGE, logsDir: join(DATA, "run-logs") };
  const call = async (input: Record<string, unknown>, context: ToolContext = ctx) => {
    const tool = buildTools(context).find((item) => item.name === "kb_potion")!;
    return tool.run(input, context);
  };

  it("returns the table without an id and one potion with one", async () => {
    expect((await call({})).text).toBe(renderPotionTable(ctx9));
    const one = await call({ id: "BLOCK_POTION", act: 2 });
    expect(one.isError).toBeUndefined();
    expect(one.text).toContain("- 二幕：10/40/10（公式 n=5）");
  });

  it("returns isError with the reason for an unknown potion, a bad input or a table that does not load", async () => {
    const unknown = await call({ id: "NOPE" });
    expect(unknown.isError).toBe(true);
    expect(unknown.text).toMatch(/找不到药水「NOPE」/);
    const bad = await call({ act: 4 });
    expect(bad.isError).toBe(true);
    expect(bad.text).toMatch(/输入不合法/);
    const missing = copyData();
    rmSync(knowledgeFile(missing, "potion-equivalents.json"));
    const broken = await call({}, { ...ctx, knowledgeDir: missing });
    expect(broken.isError).toBe(true);
    expect(broken.text).toMatch(/^知识文件加载失败：药水换算表读取失败/);
  });
});

describe("Jev's combat question: each held potion's worth in the act boss", () => {
  it("one line per potion with a value, in the belt's order (the unknown and the valueless left out)", () => {
    potionWorthSource.dir = KNOWLEDGE;
    expect(heldPotionWorth(["FIRE_POTION", "POISON_POTION", "FRUIT_JUICE", "NOPE"], 2, 9)).toEqual({
      [POTION_WORTH_KEY]: ["火焰药水：约等于 5 血 / 20 伤害 / 5 格挡（本幕 boss，A9 公式 n=5）", "果汁：约等于 5 血 / 20 伤害 / 5 格挡（本幕 boss，A9 公式 n=5，什么时候喝都一样）"],
    });
    expect(heldPotionWorth(["FIRE_POTION"], 3, 9)[POTION_WORTH_KEY]).toEqual(["火焰药水：约等于 4 血 / 20 伤害 / 4 格挡（本幕 boss，A9 公式 n=6（输入借 A8））"]);
    expect(heldPotionWorth([], 1, 9)).toEqual({});
    expect(heldPotionWorth(["POISON_POTION"], 1, 9)).toEqual({});
  });

  it("says a table that does not load instead of leaving the facts out silently", () => {
    const missing = copyData();
    rmSync(knowledgeFile(missing, "potion-equivalents.json"));
    potionWorthSource.dir = missing;
    const out = heldPotionWorth(["FIRE_POTION"], 1, 9);
    expect(out[POTION_WORTH_KEY]).toBeUndefined();
    expect(String(out["potion_worth_error"])).toMatch(/^药水换算表读取失败/);
  });
});

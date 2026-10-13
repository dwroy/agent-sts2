/** Sparse new-character tables must not suppress unrelated knowledge or invent a potion value. */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { KnowledgePrompt } from "../src/brain/knowledge.js";
import { knowledgeFile, setKnowledgeCharacter } from "../src/knowledge/files.js";
import { loadPotionEquivalents, parsePotionEquivalents, potionEquivalentFrom, tableAscension } from "../src/knowledge/potion-equivalents.js";
import { renderPotion, renderPotionTable } from "../src/knowledge/render/potion-text.js";

const temps: string[] = [];
const known = { fights: 5, T: 2, D: 3, L: 4, r: 1, h: 1, b: 1, v_card: 1, v_energy: 1, from_asc: 0 };
const emptyTable = () => ({ meta: { generated: "fixed", min_n: 5, ascensions: [8, 9], logs: { boss_fights: 0 } },
  rates: { "8": {}, "9": {} } as Record<string, unknown>,
  potions: { FIXTURE: { name: "固定药水", description: "固定效果", category: "other", regent: true, log: { runs_seen: 1, drinks: 0, boss_drinks: {} }, by_asc: {} } } });
function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "potion-unmeasured-")); temps.push(dir);
  cpSync(join(import.meta.dirname, "gkb-data/knowledge"), dir, { recursive: true });
  mkdirSync(join(dir, "characters/regent"), { recursive: true });
  setKnowledgeCharacter("regent");
  writeFileSync(knowledgeFile(dir, "potion-equivalents.json"), JSON.stringify(emptyTable()));
  writeFileSync(knowledgeFile(dir, "experience.json"), JSON.stringify({ version: "fixture", entries: [{
    id: "regent-fixture", scope: "general:deck", asc: [0, 20], lesson: "储君固定经验哨兵", evidence: ["RUN000000001"],
    n_support: 1, n_contradict: 0, confidence: "low", last_seen: "fixed", status: "active" }] }));
  return dir;
}
afterEach(() => { setKnowledgeCharacter(null); for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe("unmeasured potion rates", () => {
  it("preserves both empty buckets and loads the whole Regent knowledge", () => {
    const dir = fixture(); const file = loadPotionEquivalents(dir);
    expect(file.rates).toEqual({ "8": {}, "9": {} });
    expect(tableAscension(file, 0)).toBeNull();
    expect(potionEquivalentFrom(file, "FIXTURE", 1, 0)).toBeNull();
    const prefix = new KnowledgePrompt({ postmortems: () => ({ path: "fixed", sections: new Map() }) }).system({ knowledgeDir: dir, ascension: 0 });
    expect(prefix.note.mode).toBe("full");
    expect(prefix.system).toContain("储君固定经验哨兵");
    expect(prefix.system).toContain("持有价值未知");
    expect(prefix.system).not.toContain("另一角色夹具内容");
  });
  it("reports unknown worth in the table and single-potion query without inventing zero", () => {
    const dir = fixture(); const ctx = { knowledgeDir: dir, ascension: 0 };
    expect(renderPotionTable(ctx)).toContain("尚无可用");
    expect(renderPotion("FIXTURE", ctx)).toContain("没有数值");
    expect(renderPotion("FIXTURE", ctx)).toContain("持有价值未知");
  });
  it("selects measured buckets while retaining empty ones", () => {
    const dir = fixture(); const table = emptyTable(); table.rates["0"] = { "1": known };
    writeFileSync(knowledgeFile(dir, "potion-equivalents.json"), JSON.stringify(table));
    const file = loadPotionEquivalents(dir);
    expect(tableAscension(file, 8)).toBe(0);
    expect(file.rates["8"]).toEqual({});
    expect(renderPotionTable({ knowledgeDir: dir, ascension: 0 })).toContain("药水换算表（A0");
  });
  it("still rejects malformed rows for a new character", () => {
    const dir = fixture(); const table = emptyTable(); table.rates["0"] = { "1": { ...known, D: "bad" } };
    writeFileSync(knowledgeFile(dir, "potion-equivalents.json"), JSON.stringify(table));
    expect(() => loadPotionEquivalents(dir)).toThrow(/缺少数字字段 D/);
  });
  it("still rejects non-object buckets and a missing rates field", () => {
    expect(() => parsePotionEquivalents(JSON.stringify({ ...emptyTable(), rates: { "8": [] } }), "fixed", true)).toThrow(/rates.8/);
    expect(() => parsePotionEquivalents(JSON.stringify({ ...emptyTable(), rates: undefined }), "fixed", true)).toThrow(/rates/);
  });
  it("retains the strict Ironclad contract and its complete table", () => {
    setKnowledgeCharacter("ironclad");
    expect(() => parsePotionEquivalents(JSON.stringify(emptyTable()), "fixed")).toThrow(/rates.8/);
    const raw = readFileSync(join(import.meta.dirname, "gkb-data/knowledge/characters/ironclad/potion-equivalents.json"), "utf8");
    expect(parsePotionEquivalents(raw, "fixed")).toEqual(JSON.parse(raw));
  });
});

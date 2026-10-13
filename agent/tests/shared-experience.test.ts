/** Shared promotion and consumption use fixed fixtures, never live knowledge or games. */
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { knowledgeFile, setKnowledgeCharacter } from "../src/knowledge/files.js";
import { loadExperience, lessonText, selectLessons, setExperienceForTests } from "../src/knowledge/experience.js";
import { loadSharedExperience, parseSharedExperience, type SharedExperienceEntry } from "../src/knowledge/shared-experience.js";
import { loadKnowledgeData } from "../src/knowledge/render/data.js";
import { renderKnowledgePrefix } from "../src/knowledge/render/knowledge-prefix.js";
import { queryExperience } from "../src/knowledge/render/experience-text.js";
import { KnowledgePrompt } from "../src/brain/knowledge.js";

const dirs: string[] = [];
const postmortems = { path: "fixed", sections: new Map() };
function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "shared-experience-"));
  dirs.push(dir);
  cpSync(join(import.meta.dirname, "gkb-data/knowledge"), dir, { recursive: true });
  // A deliberately invalid foreign file makes unintended reads observable.
  mkdirSync(join(dir, "characters/silent"), { recursive: true });
  writeFileSync(join(dir, "characters/silent/experience.json"), "PRIVATE FOREIGN KNOWLEDGE");
  return dir;
}
function entry(extra: Partial<SharedExperienceEntry> = {}): SharedExperienceEntry {
  return { id: "common-fixture", scope: "general:deck", asc: [0, 20], lesson: "固定公共经验夹具", evidence: ["RUN000000001"],
    n_support: 1, n_contradict: 0, confidence: "low", last_seen: "2026-10-13", status: "active",
    shared: { independent_of_character: true, reason: "固定通用性夹具", conditions: "固定适用条件夹具",
      sources: [{ character: "silent", run_id: "RUN000000001", experience_id: "silent-fixture", evidence_path: "fixed.json", evidence_sha256: "a".repeat(64) }] }, ...extra };
}
function save(dir: string, entries = [entry()], version = "fixture-1"): void {
  writeFileSync(knowledgeFile(dir, "shared-experience.json"), JSON.stringify({ version, entries }));
}
afterEach(() => {
  setKnowledgeCharacter(null);
  setExperienceForTests(null);
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("shared experience", () => {
  it("routes shared and private lessons to different files", () => {
    setKnowledgeCharacter("regent");
    expect(knowledgeFile("fixed", "shared-experience.json")).toBe(join("fixed", "common/shared-experience.json"));
    expect(knowledgeFile("fixed", "experience.json")).toBe(join("fixed", "characters/regent/experience.json"));
  });
  it("gives new characters the promoted lesson and provenance without reading foreign raw data", () => {
    const dir = fixture(); save(dir);
    for (const character of ["regent", "necrobinder", "defect"]) {
      setKnowledgeCharacter(character);
      const ctx = { knowledgeDir: dir, ascension: 0 };
      const text = renderKnowledgePrefix(ctx, postmortems);
      expect(text).toContain("固定公共经验夹具");
      expect(text).toContain("固定适用条件夹具");
      expect(text).toContain("silent/RUN000000001/silent-fixture");
      expect(text).not.toContain("PRIVATE FOREIGN KNOWLEDGE");
      expect(loadKnowledgeData(dir).experience.entries).toEqual([]);
      expect(queryExperience(ctx, { ids: ["common-fixture"] }, postmortems)).toContain("公共经验");
    }
  });
  it("carries conditions through the compact slice and combat-hint renderer", () => {
    const dir = fixture(); save(dir); setKnowledgeCharacter("regent");
    const selected = selectLessons({ label: "reward/card", act: 1, asc: 0, bossId: null, threats: [], offered: { cards: [], relics: [], potions: [], events: [], eventOptions: [], text: "" } }, loadExperience(dir));
    expect(selected.map(e => e.id)).toEqual(["common-fixture"]);
    expect(lessonText(selected[0]!)).toContain("固定适用条件夹具");
  });
  it("reloads a published update and invalidates the brain prompt cache", () => {
    const dir = fixture(); setKnowledgeCharacter("regent"); save(dir);
    const ctx = { knowledgeDir: dir, ascension: 0 };
    const brain = new KnowledgePrompt({ postmortems: () => postmortems });
    const before = brain.system(ctx);
    expect(before.note.shared_experience_ids).toEqual(["common-fixture"]);
    expect(before.note.shared_experience_version).toBe("fixture-1");
    expect(loadExperience(dir)[0]?.lesson).toBe("固定公共经验夹具");
    save(dir, [entry({ lesson: "新版固定公共经验夹具，有额外文本确保夹具大小改变" })], "fixture-2");
    const after = brain.system(ctx);
    expect(after.system).toContain("新版固定公共经验夹具");
    expect(after.note.prefix_sha).not.toBe(before.note.prefix_sha);
    expect(loadExperience(dir)[0]?.lesson).toContain("新版固定公共经验夹具");
  });
  it("filters retired and unobserved ascension ranges without pooling character statistics", () => {
    const dir = fixture(); save(dir, [entry({ id: "common-retired", status: "retired" }), entry({ id: "common-high", asc: [8, 9] })]);
    setKnowledgeCharacter("regent");
    expect(loadKnowledgeData(dir).outcomeStats.by_ascension).toEqual({});
    expect(renderKnowledgePrefix({ knowledgeDir: dir, ascension: 0 }, postmortems)).not.toContain("固定公共经验夹具");
    expect(() => queryExperience({ knowledgeDir: dir, ascension: 0 }, { ids: ["common-retired"] }, postmortems)).toThrow(/退役/);
  });
  it("keeps the Ironclad prompt byte-identical for an absent or empty shared pool", () => {
    const dir = fixture(); setKnowledgeCharacter("ironclad");
    const ctx = { knowledgeDir: dir, ascension: 9 };
    const before = renderKnowledgePrefix(ctx, postmortems);
    save(dir, []);
    expect(renderKnowledgePrefix(ctx, postmortems)).toBe(before);
  });
  it("rejects copying without promotion, incomplete sources, duplicates and role-stat placeholders", () => {
    const invalid = [
      { ...entry(), shared: undefined },
      entry({ shared: { ...entry().shared, independent_of_character: false as true } }),
      entry({ shared: { ...entry().shared, conditions: "" } }),
      entry({ shared: { ...entry().shared, sources: [] } }),
      entry({ evidence: ["RUN000000002"] }),
      entry({ lesson: "{GIANT_BLOCK_RECORD}" }),
      entry({ id: "silent-fixture" }),
    ];
    for (const e of invalid) expect(() => parseSharedExperience({ version: "fixture", entries: [e] }, "fixed")).toThrow(/公共经验/);
    expect(() => parseSharedExperience({ version: "fixture", entries: [entry(), entry()] }, "fixed")).toThrow(/唯一/);
  });
  it("reports malformed shared data rather than silently dropping it", () => {
    const dir = fixture(); setKnowledgeCharacter("regent");
    writeFileSync(knowledgeFile(dir, "shared-experience.json"), "{broken");
    expect(() => loadSharedExperience(dir)).toThrow(/公共经验/);
    expect(() => renderKnowledgePrefix({ knowledgeDir: dir, ascension: 0 }, postmortems)).toThrow(/公共经验/);
  });
});

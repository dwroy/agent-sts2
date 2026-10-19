import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { queryKnowledgeCatalog, readCompatibleKnowledgeText } from "../src/knowledge/catalog.js";

import { loadKnowledgeData } from "../src/knowledge/render/data.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";

const roots: string[] = [];
afterEach(() => { setKnowledgeCharacter(null); roots.splice(0).forEach((p) => rmSync(p, { recursive: true, force: true })); });
function fixture() {
  const base = mkdtempSync(join(tmpdir(), "catalog-fixed-")); roots.push(base);
  const root = join(base, "knowledge");
  const write = (name: string, value: unknown) => { const p = join(root, name); mkdirSync(resolve(p, ".."), { recursive: true }); writeFileSync(p, JSON.stringify(value)); };
  const monster = JSON.parse('{"meta":{"unknown":true},"monsters":{"ENEMY":{"hp_by_asc":{"10":[535]},"provenance":{"n_runs":2}},"__proto__":{"unknown":true},"unset":null},"observed":{"kept":true}}');
  const moves = { ENEMY: { next: { A: { B: 1 } }, damage: { A: 4 } }, _unknown: { retain: true } };
  write("common/monster-db.json", monster); write("common/move-model.json", moves);
  for (const role of ["silent", "ironclad", "regent"]) write(`characters/${role}/experience.json`, {
    entries: [{ id: role + "-rule", scope: { character: role, asc: 10 }, n_support: 3, evidence: ["ABCDEFGHIJKL F17 T2"] }],
  });
  const build = () => execFileSync("python3", [resolve("../knowledge/builders/build-catalog.py"), "--knowledge-root", root]);
  build();
  return { root, write, build, monster, moves };
}
describe("mechanical knowledge catalogue", () => {
  it("keeps exact legacy bytes and reconstructs ordered common views with unknown fields", () => {
    const f = fixture();
    for (const name of ["monster-db.json", "move-model.json"]) {
      const file = join(f.root, "common", name); const raw = readFileSync(file, "utf8");
      expect(readCompatibleKnowledgeText(f.root, name, "silent")).toBe(raw);
      rmSync(file);
      const restored = readCompatibleKnowledgeText(f.root, name, "ironclad");
      expect(restored).toBe(raw);
    }
    expect(() => readCompatibleKnowledgeText(f.root, "experience.json", "unknown")).toThrow();
  });
  it("rejects corrupt fragments and does not silently borrow other role files", () => {
    const f = fixture(); rmSync(join(f.root, "common/monster-db.json"));
    writeFileSync(join(f.root, "common/enemies/ENEMY/mechanics-observed.json"), "{}");
    expect(() => readCompatibleKnowledgeText(f.root, "monster-db.json")).toThrow(/SHA/);
    rmSync(join(f.root, "characters/silent/experience.json"));
    expect(() => readCompatibleKnowledgeText(f.root, "experience.json", "silent")).toThrow();
  });
  it("requires explicit foreign query, retains scope and support without aggregation", () => {
    const f = fixture();
    const usual = queryKnowledgeCatalog(f.root, { character: "silent" });
    expect(usual.records.filter((r) => r.source_character).map((r) => r.source_character)).toEqual(["silent"]);
    const result = queryKnowledgeCatalog(f.root, { character: "regent", sourceCharacter: "silent", id: "silent-rule", details: true });
    expect(result.records[0]).toMatchObject({ reference_only: true, source_character: "silent", target_character: "regent", target_validation: "not_established_by_query", evidence_run_ids: ["ABCDEFGHIJKL"], payload: { scope: { character: "silent", asc: 10 }, n_support: 3 } });
    expect(queryKnowledgeCatalog(f.root, { character: "silent", sourceCharacter: "all" }).records.filter((r) => r.source_character)).toHaveLength(3);
    expect(() => queryKnowledgeCatalog(f.root, { character: "silent", file: "characters/regent/experience.json" })).toThrow(/显式/);
    const enemy = queryKnowledgeCatalog(f.root, { id: "enemy:ENEMY:mechanics" }).records[0]!;
    expect(enemy.evidence_run_ids).toEqual([]);
    expect(enemy.evidence_status).toContain("没有");
  });
  it("is read-only and observes current source updates while marking stale catalogue", () => {
    const f = fixture(); const catalog = readFileSync(join(f.root, "catalog.json"));
    f.write("characters/silent/experience.json", { entries: [{ id: "new", n_support: 1 }] });
    const result = queryKnowledgeCatalog(f.root, { character: "silent", id: "new", details: true });
    expect(result.records[0]!.source.catalog_source_match).toBe(false);
    expect(result.records[0]!.payload).toEqual({ id: "new", n_support: 1 });
    expect(readFileSync(join(f.root, "catalog.json"))).toEqual(catalog);
    expect(queryKnowledgeCatalog(f.root, { character: "silent", file: "characters/silent/experience.json", details: true, pointer: "/entries/0/n_support" }).records[0]!.payload).toBe(1);
    expect(() => queryKnowledgeCatalog(f.root, { file: "common/../catalog.json" })).toThrow();
    expect(() => queryKnowledgeCatalog(f.root, { file: "common/.env" })).toThrow();
  });
  it("refreshes a missing common compatible view when its catalogue changes", () => {
    const f = fixture(); setKnowledgeCharacter("new_role");
    rmSync(join(f.root, "common/monster-db.json"));
    const before = loadKnowledgeData(f.root);
    f.write("common/monster-db.json", { ...f.monster, monsters: { ENEMY: { name: "changed-public-observation" } } });
    f.build(); rmSync(join(f.root, "common/monster-db.json"));
    const after = loadKnowledgeData(f.root);
    expect(after).not.toBe(before);
    expect(after.monsterDb.monsters["ENEMY"]).toMatchObject({ name: "changed-public-observation" });
  });
  it("runs fixed Python source-preservation and curator tests", () => {
    expect(() => execFileSync("python3", [resolve("../knowledge/builders/test_catalog.py")])).not.toThrow();
  });
});

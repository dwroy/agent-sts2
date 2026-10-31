import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { vi } from "vitest";
import { createHash } from "node:crypto";
import { operationalInstructions } from "../../learner/lib/operational-runtime.js";
import type { DecisionEnv } from "../src/memory/types.js";

it("completes operational products and fixed data through real SQLite without source publication", () => {
  const result = spawnSync("python3", ["../ops/tests/test_learning_runtime.py"], { encoding: "utf8", timeout: 60_000 });
  expect(result.status, result.stdout + result.stderr).toBe(0);
}, 65_000);

it("injects the actual dispatch contract for operational products and preserves old launches", () => {
  const temp = mkdtempSync(join(tmpdir(), "operational-contract-")), root = resolve(".."), state = join(temp, "state.json");
  try {
    writeFileSync(state, JSON.stringify({ batches: { fixture: { task: "mechanics-audit", character: "silent", worktree: root,
      operational_runtime: { schema: "operational-runtime-selection-v1", enabled: true, root, directory: temp,
        entries: ["mechanics-audit"], control_sha256: "a".repeat(64) } } } }));
    const env = { LEARNER_BATCH_ID: "fixture", LEARNER_STATE_FILE: state };
    const prompt = operationalInstructions(env, "mechanics-audit", "silent", temp, root, root);
    expect(prompt).toContain("operational-candidate-v1");
    expect(prompt).toContain("不commit/merge");
    expect(prompt).toContain("源码full");
    expect(prompt).toContain("mechanics-audit的旧out改为scratch");
    expect(operationalInstructions({}, "mechanics-audit", "silent", temp, root, root)).toBe("");
    expect(() => operationalInstructions(env, "mechanics-audit", "ironclad", temp, root, root)).toThrow("contract mismatch");
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

it("routes actual legacy loaders to one D1 snapshot while preserving K1 and custom-directory inputs", async () => {
  const temp = mkdtempSync(join(tmpdir(), "fixed-data-reader-")), version = "D1-" + "a".repeat(64), snapshot = join(temp, "data-snapshots", version);
  mkdirSync(join(snapshot, "characters/silent"), { recursive: true });
  const trust = { character: "silent", low_trust_b2: {}, low_confidence_b3: {}, criteria: { fixture: true }, trusted_b2: [], trusted_b3: [] };
  writeFileSync(join(snapshot, "characters/silent/boss-trust.json"), JSON.stringify(trust));
  vi.stubEnv("STS2_DATA_VERSION", version); vi.stubEnv("STS2_DATA_SNAPSHOT", snapshot);
  vi.stubEnv("STS2_DATA_RUNTIME", temp); vi.stubEnv("STS2_DATA_RUN_KEY", "launch:fixture");
  vi.stubEnv("STS2_DATA_MANAGED_PATHS", JSON.stringify(["characters/silent/boss-trust.json", "characters/{character}/potion-equivalents.json", "common/monster-db.json"]));
  vi.resetModules();
  try {
    const files = await import("../src/knowledge/files.js"), data = await import("../src/knowledge/runtime-data.js");
    files.setKnowledgeCharacter("silent");
    const loader = await import("../src/sim/boss-trust.js");
    expect(loader.loadBossTrust()).toEqual(trust);
    expect(files.knowledgeFile(files.KNOWLEDGE_DIR, "boss-trust.json", "silent")).toBe(join(snapshot, "characters/silent/boss-trust.json"));
    expect(files.knowledgeFile(temp, "boss-trust.json", "silent")).toBe(join(temp, "characters/silent/boss-trust.json"));
    expect(files.knowledgeFile(files.KNOWLEDGE_DIR, "strategy-entries.json", "silent")).not.toContain(version);
    expect(files.knowledgeFile(files.KNOWLEDGE_DIR, "outcome-stats.json", "silent")).not.toContain(version);
    expect(files.knowledgeFile(files.KNOWLEDGE_DIR, "boss-trust.json", "ironclad")).not.toContain(version);
    expect(data.runtimeDataIdentity()?.version).toBe(version);
    expect(data.runtimeDataIdentity()?.managed_paths).toContain("characters/silent/boss-trust.json");
    expect(readFileSync(loader.bossTrustPath(), "utf8")).toBe(JSON.stringify(trust));
    const query = await import("../src/knowledge/query-sources.js");
    const observed = await query.withKnowledgeQuerySources(files.KNOWLEDGE_DIR, async () => query.queryKnowledgeJson("boss-trust.json"));
    expect(observed.result).toEqual(trust);
    expect(observed.sources[0]?.["data_version"]).toBe(version);
    const missing = await query.withKnowledgeQuerySources(files.KNOWLEDGE_DIR, async () => query.queryKnowledgeJson("monster-db.json"));
    expect(missing.result).toBeNull();
    expect(missing.sources[0]).toMatchObject({ data_version: version, status: "missing" });
    const catalog = await import("../src/knowledge/catalog.js");
    expect(() => catalog.readCompatibleKnowledgeText(files.KNOWLEDGE_DIR, "monster-db.json", "silent")).toThrow();
    const value = { name: "Fixture", category: "other", log: {}, by_asc: { "0": { "1": { hp: 4, damage: 0, block: 0, hold_hp: 4, n: 3, source: "估", formula: "fixture" } } } };
    writeFileSync(join(snapshot, "characters/silent/potion-equivalents.json"), JSON.stringify({ meta: { generated: "fixture", min_n: 1, ascensions: [0] },
      rates: { "0": { "1": { fights: 5, T: 2, D: 3, L: 4, r: 1, h: 1, b: 1, v_card: 1, v_energy: 1, from_asc: 0 } } }, potions: { TEST_A: value } }));
    vi.doMock("../src/v6/knowledge.js", () => ({ loadV6Knowledge: () => ({ character: "silent", vocab: { status: "missing" }, reflex: { status: "missing" } }) }));
    const { potionEntries } = await import("../src/v6/potion-entries.js");
    const env = { state: { run: { ascension: 0, raw: { character_id: "SILENT", act_id: 0, potions: [] } } }, screenMemory: {} } as unknown as DecisionEnv;
    expect(potionEntries(env, ["TEST_A"], { trust: { current_boss: "unknown", joint: "unknown" } })[0]?.hold_hp).toBe(4);
    // Publication elsewhere cannot switch the imported resolver's captured version.
    vi.stubEnv("STS2_DATA_VERSION", "D1-" + "b".repeat(64));
    expect(data.runtimeDataIdentity()?.version).toBe(version);
    files.setKnowledgeCharacter(null);
  } finally { vi.doUnmock("../src/v6/knowledge.js"); vi.unstubAllEnvs(); vi.resetModules(); rmSync(temp, { recursive: true, force: true }); }
});

it("rejects fixed data whose formal knowledge dependency differs from the run's bound K1", async () => {
  const temp = mkdtempSync(join(tmpdir(), "fixed-data-dependency-")), version = "D1-" + "a".repeat(64);
  const knowledge = join(temp, "formal"), relative = "characters/silent/build-cores.json", bytes = '{"fixture":true}';
  mkdirSync(join(knowledge, "characters/silent"), { recursive: true });
  writeFileSync(join(knowledge, relative), bytes);
  vi.stubEnv("STS2_DATA_VERSION", version); vi.stubEnv("STS2_DATA_SNAPSHOT", join(temp, "data-snapshots", version));
  vi.stubEnv("STS2_DATA_RUNTIME", temp); vi.stubEnv("STS2_DATA_RUN_KEY", "dependency-fixture");
  vi.stubEnv("STS2_KNOWLEDGE_SNAPSHOT", knowledge);
  vi.stubEnv("STS2_DATA_KNOWLEDGE_DEPENDENCIES", JSON.stringify({ [relative]: createHash("sha256").update(bytes).digest("hex") }));
  vi.resetModules();
  try {
    expect((await import("../src/knowledge/runtime-data.js")).runtimeDataIdentity()?.version).toBe(version);
    vi.stubEnv("STS2_DATA_KNOWLEDGE_DEPENDENCIES", JSON.stringify({ [relative]: "0".repeat(64) }));
    vi.resetModules();
    const data = await import("../src/knowledge/runtime-data.js");
    expect(() => data.runtimeDataIdentity()).toThrow("knowledge version conflict");
  } finally { vi.unstubAllEnvs(); vi.resetModules(); rmSync(temp, { recursive: true, force: true }); }
});

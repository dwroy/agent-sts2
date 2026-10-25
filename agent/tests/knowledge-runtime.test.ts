import { existsSync, mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it, vi } from "vitest";
import { KnowledgeStore, safeSQLiteVersion, auditApprovedChanges, type Candidate } from "../src/knowledge/runtime/store.js";
import { validateDocuments } from "../src/knowledge/runtime/validation.js";
import { strategyTool } from "../src/brain/tools/strategy-tool.js";
import { reflexKnowledgeTool } from "../src/brain/tools/reflex-knowledge.js";
import { experienceMatches } from "../src/brain/tools/query-guidance.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { reflex, vocab } from "./v6-fixtures.js";
import { runtimeLearningInstructions } from "../../learner/lib/knowledge-runtime.js";
import { main as runtimeMain } from "../tools/knowledge-runtime.js";

const dirs: string[] = [], handles: KnowledgeStore[] = [];
afterEach(() => { handles.splice(0).forEach(s => { if (s.db.isOpen) s.close(); }); dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); setKnowledgeCharacter(null); vi.unstubAllEnvs(); });
function directory() { const dir = mkdtempSync(join(tmpdir(), "knowledge-runtime-")); dirs.push(dir); return dir; }
function store(root = directory()) { const s = new KnowledgeStore(root); handles.push(s); return s; }
const path = "characters/silent/experience.json";
const experience = { id: "fixture-exp", scope: "general:deck", asc: [10, 10], lesson: "仅格式测试启动路线", evidence: ["SILENT000001"], n_support: 1, n_contradict: 1, confidence: "low", last_seen: "2026-10-25", status: "active" };
const document = (entries = [experience]) => JSON.stringify({ version: "fixture-v1", entries });
function candidate(s: KnowledgeStore, id: string, text = document(), files: Record<string, string> = { [path]: text }): Candidate {
 return { schema: "knowledge-candidate-v1", id, base: s.current(), character: "silent", source: "fixture:internal", files };
}
function publish(s: KnowledgeStore, c = candidate(s, "first")) { s.submit(c); s.validate(c.id); return s.publish(c.id); }

it("uses repaired SQLite versions and preserves bytes, independent evidence, history and run bindings", () => {
 for (const v of ["3.51.3", "3.44.6", "3.50.7", "3.52.0"]) expect(safeSQLiteVersion(v)).toBe(true);
 for (const v of ["3.46.1", "3.51.2", "3.50.6"]) expect(safeSQLiteVersion(v)).toBe(false);
 const s = store(), c = candidate(s, "first"), v1 = publish(s, c);
 expect(s.files(v1)[path]).toBe(c.files[path]);
 const binding = s.bind("FIXTURE_RUN", "a".repeat(40));
 const v2 = publish(s, candidate(s, "next", document([{ ...experience, lesson: "格式测试修订" }])));
 expect(s.bind("FIXTURE_RUN", "b".repeat(40)).version).toBe(v1);
 expect(s.bind("NEXT_RUN", "b".repeat(40)).version).toBe(v2);
 expect(readFileSync(join(String(binding.snapshot), path), "utf8")).toBe(c.files[path]);
 expect(s.db.prepare("SELECT count(*) AS n FROM revisions").get()!.n).toBe(2);
 expect(s.files(v1)[path]).toBe(c.files[path]);
 expect(s.query({ version: v1, character: "ironclad" })).toEqual([]);
 expect(s.query({ version: v1, character: "silent", ascension: 9 })).toEqual([]);
 expect(s.query({ version: v1, character: "silent", ascension: 10, text: "启动" })).toHaveLength(1);
 expect(s.query({ version: v1, character: "silent", text: "格式测试" })).toHaveLength(1);
 expect(s.query({ version: v1, character: "silent", category: "general" })).toHaveLength(1);
 expect(() => s.query({ version: v1, character: "silent", limit: 101 })).toThrow("bounds");
});

it("deduplicates duplicate callbacks even after restart/rollback, and rejects reused IDs", () => {
 const s = store(), c = candidate(s, "first"), version = publish(s, c);
 const other = store(s.root);
 expect(other.submit(c).status).toBe("published");
 expect(other.publish(c.id)).toBe(version);
 expect(() => other.submit({ ...c, source: "different" })).toThrow("idempotency");
 const next = publish(s, candidate(s, "next", document([{ ...experience, lesson: "格式更新" }])));
 expect(other.rollback(version, "rollback-fixture")).toBe(version);
 expect(other.rollback(version, "rollback-fixture")).toBe(version);
 expect(other.publish("next")).toBe(next);
 expect(other.current()).toBe(version);
 expect(s.db.prepare("SELECT count(*) AS n FROM releases").get()!.n).toBe(2);
 expect(() => s.rollback(next, "rollback-fixture")).toThrow("reused");
});

it("handles two candidate producers with CAS, without mixing candidate or reference sets", () => {
 const a = store(), b = store(a.root); publish(a);
 const first = candidate(a, "producer-a", document([{ ...experience, lesson: "候选A" }]));
 const second = candidate(b, "producer-b", document([{ ...experience, lesson: "候选B" }]));
 a.submit(first); b.submit(second); a.validate(first.id); b.validate(second.id);
 const reader = new KnowledgeStore(a.root, { readOnly: true }); handles.push(reader);
 reader.db.exec("BEGIN"); const before = reader.current();
 const after = a.publish(first.id);
 expect(reader.current()).toBe(before); reader.db.exec("COMMIT"); expect(reader.current()).toBe(after);
 expect(() => b.publish(second.id)).toThrow("conflict");
 expect(b.status(second.id).status).toBe("validated");
 expect(b.files(after)[path]).toBe(first.files[path]);
});

it("retains the producer input on SQLITE_BUSY and accepts the same submission after lock release", () => {
 const a = store(), b = store(a.root); publish(a);
 const c = candidate(b, "busy-producer", document([{ ...experience, lesson: "并发夹具" }]));
 b.db.exec("PRAGMA busy_timeout=1"); a.db.exec("BEGIN IMMEDIATE");
 try { expect(() => b.submit(c)).toThrow(/locked|busy/i); }
 finally { a.db.exec("ROLLBACK"); }
 expect(b.submit(c).id).toBe(c.id); b.validate(c.id); expect(b.publish(c.id)).toBe(b.current());
});

it("does not initialize an absent original database during completion recovery", async () => {
 const missing = join(directory(), "original-runtime-unavailable");
 await expect(runtimeMain(["complete", "--runtime", missing, "--candidate", "unused-fixture"])).rejects.toThrow("original runtime database is unavailable");
 expect(existsSync(missing)).toBe(false);
});

it("rolls back interrupted publication atomically, recovers the same prepared snapshot, and backs up consistently", async () => {
 const s = store(); const before = publish(s), c = candidate(s, "crash", document([{ ...experience, lesson: "崩溃恢复格式测试" }]));
 s.submit(c); s.validate(c.id);
 expect(() => s.publish(c.id, () => { throw new Error("injected crash before pointer"); })).toThrow("injected");
 expect(s.current()).toBe(before); expect(s.status(c.id).status).toBe("validated");
 expect(s.db.prepare("SELECT count(*) AS n FROM releases").get()!.n).toBe(1);
 const after = s.publish(c.id);
 const backup = join(directory(), "backup.sqlite"); await s.backup(backup);
 const destination = join(directory(), "restored"), restored = KnowledgeStore.restore(backup, destination); handles.push(restored);
 expect(restored.current()).toBe(after); expect(restored.files(before)).toEqual(s.files(before));
 expect(restored.bind("RECOVERED", "fixture").version).toBe(after);
 expect(() => KnowledgeStore.restore(backup, destination)).toThrow("new");
 restored.rollback(before, "restore-rollback"); expect(restored.status(c.id).status).toBe("published");
});

it("refuses missing references, scope expansion, dropped counterevidence and unpublished paths", () => {
 const s = store(); publish(s);
 for (const entry of [{ ...experience, evidence: ["DIFFERENT001"] }, { ...experience, n_contradict: 0 }, { ...experience, asc: [0, 20] }]) {
  const c = candidate(s, `bad-${entry.evidence[0]}-${entry.n_contradict}-${entry.asc[0]}`, document([entry]));
  s.submit(c); expect(() => s.validate(c.id)).toThrow();
 }
 expect(() => s.submit(candidate(s, "cross-role", "", { "characters/ironclad/experience.json": document() }))).toThrow("character");
 expect(() => s.submit(candidate(s, "pending", "", { "characters/silent/pending/reflex.json": "{}" }))).toThrow();
 const missing = { "characters/silent/reflex.json": JSON.stringify({ schema: "reflex-file-v1", character: "silent", entries: [{ ...reflex, directions: undefined, signal: { kind: "tag", value: "TEST_TAG", unit: "label" } }] }) };
 expect(() => validateDocuments(missing)).toThrow("references");
 expect(() => validateDocuments({ ...missing, "characters/silent/reflex-vocab.json": JSON.stringify(vocab) })).not.toThrow();
});

it("preserves existing strategy/reflex/experience tools, matching and negative controls on release snapshots", async () => {
 setKnowledgeCharacter("silent"); const s = store();
 const { directions: _unused, ...rk } = reflex;
 const strategy = { schema: "brain-strategies-v1", character: "silent", entries: [{ id: "fixture-strategy", version: "fixture", trigger: { question_types: ["card_reward"], acts: [1] }, strategy: "仅格式测试", source: "own", evidence: [{ run: "SILENT000001", floor: 4, role: "contradict" }], confidence: .25 }] };
 const files = { [path]: document(), "characters/silent/strategy-entries.json": JSON.stringify(strategy),
  "characters/silent/reflex.json": JSON.stringify({ schema: "reflex-file-v1", character: "silent", entries: [{ ...rk, scope: { character: "silent", ascensions: [10] } }] }) };
 const v = publish(s, candidate(s, "tools", "", files));
 const snapshot = String(s.bind("TOOLS", "fixture").snapshot);
 const ctx = { label: "reward/card", ascension: 10, act: 1, knowledgeDir: snapshot, logsDir: snapshot, payload: { facts: { act: 1, floor: 4 } } };
 const legacy = directory(); for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(legacy, path)), { recursive: true }); writeFileSync(join(legacy, path), text); }
 const tools = [strategyTool(), reflexKnowledgeTool()];
 for (const tool of tools) {
  const actual = await tool.run({ query: "*" }, ctx), original = await tool.run({ query: "*" }, { ...ctx, knowledgeDir: legacy });
  expect(JSON.parse(actual.text).entries).toEqual(JSON.parse(original.text).entries);
  expect(JSON.parse(actual.text).status).toEqual(JSON.parse(original.text).status);
  if (tool.name === "kb_strategies") expect(JSON.parse(actual.text).sources[0]).toMatchObject({ knowledge_version: v, sha256: JSON.parse(original.text).library_sha256 });
  expect(Buffer.byteLength(actual.text)).toBeLessThanOrEqual(24000);
  expect(JSON.parse((await tool.run({ query: "nonexistent" }, ctx)).text).entries).toEqual([]);
 }
 expect(JSON.parse((await strategyTool().run({ query: "*" }, { ...ctx, label: "rest/plan" })).text).entries).toEqual([]);
 expect(JSON.parse((await reflexKnowledgeTool().run({ query: "*" }, { ...ctx, ascension: 9 })).text).entries).toEqual([]);
 const exp = await experienceMatches(ctx);
 expect(exp.result).toEqual([experience]); expect(exp.result).toEqual((await experienceMatches({ ...ctx, knowledgeDir: legacy })).result);
 expect(s.query({ version: v, character: "silent", kind: "strategy-entries" })[0]!.payload).toContain('"role":"contradict"');
});

it("checks approved external artifacts and supplies runtime instructions only to registered content tasks", () => {
 const s = store(); publish(s); const dir = directory(), artifact = join(dir, "entry.json");
 const entry = { ...experience, lesson: "冻结产物测试" }; writeFileSync(artifact, JSON.stringify(entry));
 const changes = { [path]: document([entry]) };
 expect(() => auditApprovedChanges(s.files(s.current()), changes, [{ id: entry.id, path: artifact }])).not.toThrow();
 expect(() => auditApprovedChanges(s.files(s.current()), changes, [])).toThrow("absent");
 const state = join(dir, "state.json"); writeFileSync(state, JSON.stringify({ batches: { fixture: { character: "silent" } } }));
 const env = { STS2_KNOWLEDGE_RUNTIME: s.root, LEARNER_BATCH_ID: "fixture", LEARNER_STATE_FILE: state, CODEX_OPS_ROOT: dir };
 const prompt = runtimeLearningInstructions(env, "experience-update", "silent", dir);
 expect(prompt).toContain(s.current()); expect(prompt).toContain("knowledge_candidate"); expect(prompt).toContain("不commit/merge");
 expect(runtimeLearningInstructions({}, "experience-update", "silent", dir)).toBe("");
 expect(runtimeLearningInstructions(env, "fix-batch", "silent", dir)).toBe("");
});

it("pins real loader paths and provenance for a process while leaving analysis inputs outside the snapshot", async () => {
 const s = store(), version = publish(s), bound = s.bind("PROCESS", "fixture");
 vi.stubEnv("STS2_KNOWLEDGE_SNAPSHOT", String(bound.snapshot)); vi.stubEnv("STS2_KNOWLEDGE_VERSION", version);
 vi.resetModules();
 const files = await import("../src/knowledge/files.js"), paths = await import("../src/core/paths.js");
 const provenance = await import("../src/knowledge/query-sources.js");
 expect(files.knowledgeFile(paths.KNOWLEDGE_DIR, "experience.json", "silent")).toBe(join(String(bound.snapshot), path));
 expect(files.knowledgeFile(paths.KNOWLEDGE_DIR, "room-costs.json", "silent")).toBe(join(paths.KNOWLEDGE_DIR, "characters/silent/room-costs.json"));
 files.setKnowledgeCharacter("silent");
 const queried = await provenance.withKnowledgeQuerySources(paths.KNOWLEDGE_DIR, async () => { provenance.recordKnowledgeQuerySource("experience.json"); return provenance.queryKnowledgeText(paths.KNOWLEDGE_DIR, "experience.json"); });
 expect(queried.result).toBe(document()); expect(queried.sources[0]).toMatchObject({ knowledge_version: version, path });
 const next = publish(s, candidate(s, "PROCESS-next", document([{ ...experience, lesson: "下一版本" }])));
 expect(next).not.toBe(version);
 expect(files.knowledgeFile(paths.KNOWLEDGE_DIR, "experience.json", "silent")).toBe(join(String(bound.snapshot), path));
});

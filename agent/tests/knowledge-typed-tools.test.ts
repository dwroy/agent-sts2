/** Fixed synthetic contracts; no fixture is published gameplay knowledge. */
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { KnowledgeStore, digest, type Candidate } from "../src/knowledge/runtime/store.js";
import { SCHEMA } from "../src/knowledge/runtime/schema.js";
import { closeIndexedReaders, KnowledgeReader } from "../src/knowledge/runtime/reader.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { validateInput } from "../src/brain/tools/validate.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { main as runtimeMain } from "../tools/knowledge-runtime.js";
import { reflex, vocab, direction } from "./v6-fixtures.js";
import { coreFixture } from "./v6-direction-core-fixtures.js";

const dirs: string[] = [], stores: KnowledgeStore[] = [], readers: KnowledgeReader[] = [];
afterEach(() => { closeIndexedReaders(); readers.splice(0).forEach(s => s.close()); stores.splice(0).forEach(s => { if (s.db.isOpen) s.close(); }); dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); setKnowledgeCharacter(null); vi.unstubAllEnvs(); });
const directory = () => { const dir = mkdtempSync(join(tmpdir(), "typed-knowledge-")); dirs.push(dir); return dir; };
function store(root = directory()) { const s = new KnowledgeStore(root); stores.push(s); return s; }
const exp = { id: "fixture-exp", scope: "general:deck", asc: [0, 20], lesson: "启动路线，仅格式测试", evidence: ["SILENT000001"],
 contradicting: ["SILENT000002"], n_support: 1, n_contradict: 1, confidence: "low", status: "active", last_seen: "2026-10-25" };
const doc = (entries: unknown[]) => JSON.stringify({ version: "fixture-v1", entries });
const expPath = "characters/silent/experience.json";
const strategy = (id = "fixture-strategy", trigger: object = { question_types: ["card_reward"], acts: [1] }) => ({
 id, version: "fixture", trigger, strategy: "启动路线，仅格式测试", source: "own", confidence: .25,
 evidence: [{ run: "SILENT000001", floor: 4 }, { run: "SILENT000002", floor: 7, role: "contradict" }], limits: ["synthetic only"], evidence_status: "conflict" });
function files(): Record<string, string> {
 const core = coreFixture();
 return { [expPath]: doc([exp]), "characters/ironclad/experience.json": doc([{ ...exp, id: "ironclad-only" }]),
  "characters/silent/strategy-entries.json": JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries: [strategy()] }),
  "characters/silent/reflex.json": JSON.stringify({ schema: "reflex-file-v1", character: "silent", entries: [reflex] }),
  "characters/silent/reflex-vocab.json": JSON.stringify(vocab),
  "characters/silent/build-cores.json": JSON.stringify({ schema: "build-cores-v1", character: "silent", entries: [core] }),
  "characters/silent/direction-cards.json": JSON.stringify({ schema: "direction-cards-v1", character: "silent", entries: [direction] }),
  "common/open-book.json": JSON.stringify({ schema: "open-book-v1", sources: { source: "external:spire-codex", license: "fixture-license", sources: { fixture: { url: "https://example.com/fixture", sha256: "a".repeat(64), license: "fixture-license" } } },
   entries: [{ id: "TEST_CARD", kind: "cards", name: "测试牌", aliases: ["别名", "Test Card"], source: "external:spire-codex", game_version: "v0.111.0", provenance: ["fixture"], facts: { fixture: true } }] }),
 };
}
function publish(s: KnowledgeStore, payload = files(), id = "migration"): string {
 const c: Candidate = { schema: "knowledge-candidate-v1", id, base: s.current(), character: "migration", source: "fixture", files: payload };
 s.submit(c); s.validate(id); return s.publish(id);
}
function reader(s: KnowledgeStore, version: string) { const r = new KnowledgeReader(s.root, version); readers.push(r); return r; }
function host(s: KnowledgeStore, ascension = 0, run = "TOOLS", label = "reward/card", payload: unknown = { facts: { act: 1, floor: 4 } }) {
 setKnowledgeCharacter("silent"); const snapshot = String(s.bind(run, "fixture-code").snapshot);
 const ctx = { label, ascension, act: 1, knowledgeDir: snapshot, logsDir: snapshot, payload };
 return { ctx, tools: buildKnowledgeTools(ctx), call: async (name: string, input: Record<string, unknown>) => {
  const toolHost = new ToolHost(buildKnowledgeTools(ctx), ctx, undefined, true);
  const result = await toolHost.call(name, input); return { ...result, data: JSON.parse(result.text) };
 } };
}

it("projects each type with original IDs, payload, evidence, counterevidence and explicit relations", () => {
 const s = store(), input = files(), version = publish(s, input), r = reader(s, version);
 expect(s.files(version)).toEqual(input);
 const expected = { experience: 1, strategy: 1, reflex: 1, core: 1, combo: 2, direction: 1, vocab: 1, fact: 1 };
 for (const [type, n] of Object.entries(expected)) expect(r.all({ type: type as any, character: "silent", ascension: 0 })).toHaveLength(n);
 expect(r.all({ type: "core", character: "silent" })[0]!.original_id).toBe("TEST_A");
 expect(r.all({ type: "core", character: "silent" })[0]!.value).toEqual(JSON.parse(input["characters/silent/build-cores.json"]!).entries[0]);
 expect(r.all({ type: "vocab", character: "silent" })[0]!.value).toEqual(vocab.dimensions.card_role[0]);
 const item = r.all({ type: "strategy", character: "silent" })[0]!;
 expect(JSON.parse(String(s.db.prepare("SELECT payload FROM item_evidence WHERE item=? AND role='contradict'").get(item.item)!.payload))).toEqual(strategy().evidence[1]);
 expect(s.db.prepare("SELECT target FROM item_links WHERE relation='core'").all().map(e => e.target)).toContain("TEST_A");
 expect(r.all({ type: "experience", character: "silent" })[0]!.value.contradicting).toEqual(exp.contradicting);
 expect(r.all({ type: "reflex", character: "silent", ascension: 1 })).toEqual([]);
 expect(r.all({ type: "fact", character: "ironclad", entity: "别名" })).toHaveLength(1);
 expect(r.all({ type: "experience", character: "ironclad" }).map(e => e.original_id)).toEqual(["ironclad-only"]);
 expect(r.all({ type: "experience", character: "silent", topic: "startup" })).toEqual([]); // No inference from prose.
});

it("upgrades a real v1 schema atomically, without changing K1/history/candidates, and is idempotent", async () => {
 const root = directory(), db = new DatabaseSync(join(root, "knowledge.sqlite")); db.exec(SCHEMA);
 db.prepare("INSERT INTO metadata VALUES('schema','1')").run();
 const payload = JSON.stringify(exp), revision = digest(expPath + "\n" + payload), version = "K1-" + "a".repeat(64);
 db.prepare("INSERT INTO revisions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run(revision, expPath, exp.id, "silent", "experience", null, "low", "conflict", 0, 20, null, payload);
 db.prepare("INSERT INTO candidates(id,digest,body,status) VALUES('pending',?,'{}','submitted')").run("b".repeat(64));
 db.prepare("INSERT INTO releases(version,source,manifest) VALUES(?,'fixture',?)").run(version, JSON.stringify({ schema: "knowledge-release-v1", version, files: {} }));
 db.prepare("INSERT INTO release_entries VALUES(?,?)").run(version, revision);
 db.prepare("INSERT INTO metadata VALUES('current',?)").run(version); db.close();
 expect(() => new KnowledgeStore(root, { migrationFailpoint: () => { throw Error("injected upgrade crash"); } })).toThrow("injected upgrade crash");
 const old = new DatabaseSync(join(root, "knowledge.sqlite"));
 expect(old.prepare("SELECT value FROM metadata WHERE key='schema'").get()!.value).toBe("1");
 expect(old.prepare("SELECT name FROM sqlite_master WHERE name='business_items'").get()).toBeUndefined(); old.close();
 const s = store(root), r = reader(s, version);
 expect(r.all({ type: "experience", character: "silent" })[0]!.value).toEqual(exp);
 expect(s.current()).toBe(version); expect(s.status("pending").status).toBe("submitted");
 expect(s.db.prepare("SELECT payload FROM revisions").get()!.payload).toBe(payload);
 const again = store(root); expect(again.db.prepare("SELECT count(*) n FROM business_items").get()!.n).toBe(1);
 const backup = join(directory(), "typed.sqlite"); await s.backup(backup);
 const restored = KnowledgeStore.restore(backup, join(directory(), "restored")); stores.push(restored);
 expect(reader(restored, version).all({ type: "experience", character: "silent" })[0]!.value).toEqual(exp);
});

it("uses the actual ToolDefs with alias/Chinese/indexed queries and rejects model SQL/versions/roles", async () => {
 const s = store(), version = publish(s), h = host(s);
 for (const [name, input] of [["kb_open_book", { query: "别名" }], ["kb_open_book", { query: "测试" }],
  ["kb_experience", { keyword: "启" }], ["kb_experience", { keyword: "启动" }], ["kb_reflex", { query: "*", entity: "test_reflex" }],
  ["kb_strategies", { query: "启动" }], ["kb_build_cores", { query: "*", entity: "TEST_CARD" }], ["kb_build_combos", { query: "*" }], ["kb_vocab", { query: "TEST_TAG" }]] as const) {
  expect(validateInput(h.tools.find(t => t.name === name)!.inputSchema, input)).toEqual([]);
  const result = await h.call(name, input);
  expect(result.isError, result.text).toBeUndefined(); expect(result.data.entries.length, name).toBeGreaterThan(0);
  expect(result.data.knowledge_version).toBe(version); expect(Buffer.byteLength(result.text)).toBeLessThanOrEqual(24000);
 }
 expect((await h.call("kb_open_book", { query: "无匹配" })).data.entries).toEqual([]);
 expect((await h.call("kb_open_book", { query: "别名", category: "monsters" })).data.entries).toEqual([]);
 expect((await h.call("kb_experience", { id: "ironclad-only" })).data.entries).toEqual([]);
 expect((await h.call("kb_experience", { topic: "startup" })).data.entries).toEqual([]);
 for (const input of [{ query: "*", sql: "SELECT 1" }, { query: "*", version }, { query: "*", character: "ironclad" }, { query: "*", offset: -1 }]) {
  const result = await h.tools.find(t => t.name === "kb_strategies")!.run(input, h.ctx); expect(result.isError).toBe(true);
 }
 const r = reader(s, version);
 expect(r.plan({ type: "fact", character: "silent", entity: "别名" }).some(e => String(e.detail).includes("item_term_lookup"))).toBe(true);
 expect(r.plan({ type: "experience", character: "silent", text: "启动" }).some(e => String(e.detail).includes("item_grams"))).toBe(true);
 expect(() => r.db.exec("DELETE FROM candidates")).toThrow(/readonly/);
});

it("exhausts index pages before dynamic matching and paginates applicable rows stably", async () => {
 const s = store(), input = files();
 const invalid = Array.from({ length: 121 }, (_, i) => strategy(`a-${String(i).padStart(3, "0")}`, { question_types: ["card_reward"], hp_ratio: { max: .1 } }));
 const valid = Array.from({ length: 9 }, (_, i) => strategy(`z-${i}`));
 input["characters/silent/strategy-entries.json"] = JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries: [...invalid, ...valid] });
 publish(s, input); const h = host(s, 0, "PAGES", "reward/card", { facts: { act: 1, hp: "50/50" } });
 const ids: string[] = []; let offset: number | null = 0;
 while (offset !== null) {
  const result = await h.call("kb_strategies", { query: "*", limit: 2, offset });
  expect(result.data.total_matches).toBe(9); ids.push(...result.data.entries.map((e: any) => e.id)); offset = result.data.next_offset;
 }
 expect(ids).toEqual(valid.map(e => e.id));
});

it("keeps old/new runs, rollback, restart and concurrent readers on their bound revisions", async () => {
 const s = store(), first = publish(s), old = host(s), r1 = reader(s, first);
 const second = publish(s, { [expPath]: doc([{ ...exp, lesson: "新版格式文本" }]) }, "next");
 const latest = host(s, 0, "NEXT");
 expect((await old.call("kb_experience", { id: exp.id })).data.entries[0].lesson).toBe(exp.lesson);
 expect((await latest.call("kb_experience", { id: exp.id })).data.entries[0].lesson).toBe("新版格式文本");
 s.rollback(first, "rollback"); closeIndexedReaders();
 expect(host(s, 0, "TOOLS").ctx.knowledgeDir).toBe(old.ctx.knowledgeDir);
 expect((await latest.call("kb_experience", { id: exp.id })).data.knowledge_version).toBe(second);
 const r2 = reader(s, second);
 const both = await Promise.all([Promise.resolve(r1.all({ type: "experience", character: "silent" })), Promise.resolve(r2.all({ type: "experience", character: "silent" }))]);
 expect(both[0][0]!.value.lesson).toBe(exp.lesson); expect(both[1][0]!.value.lesson).toBe("新版格式文本");
 expect(() => new KnowledgeReader(s.root, "K1-" + "f".repeat(64))).toThrow("unavailable");
});

it("refuses an unmigrated bound runtime without falling through to files", async () => {
 const s = store(); publish(s); const h = host(s); closeIndexedReaders();
 s.db.prepare("UPDATE metadata SET value='1' WHERE key='schema'").run();
 const result = await h.call("kb_experience", { id: exp.id });
 expect(result.isError).toBe(true); expect(result.data.entries).toEqual([]); expect(result.data.error).toContain("migration");
});

it("backfills every business type from v1 revisions and retains raw bytes and nested original identities", () => {
 const s = store(), input = files(), version = publish(s, input);
 const before = s.db.prepare("SELECT type,original_id,parent_id,payload FROM business_items ORDER BY type,original_id,parent_id").all();
 s.db.exec("DROP TABLE item_search; DROP TABLE item_grams; DROP TABLE item_evidence; DROP TABLE item_links; DROP TABLE item_terms; DROP TABLE experience_details; DROP TABLE strategy_details; DROP TABLE reflex_details; DROP TABLE core_details; DROP TABLE combo_details; DROP TABLE vocab_details; DROP TABLE fact_details; DROP TABLE business_items; UPDATE metadata SET value='1' WHERE key='schema';");
 s.close(); const upgraded = store(s.root);
 expect(upgraded.current()).toBe(version); expect(upgraded.files(version)).toEqual(input);
 expect(upgraded.db.prepare("SELECT type,original_id,parent_id,payload FROM business_items ORDER BY type,original_id,parent_id").all()).toEqual(before);
});

it("retains equal vocab IDs in distinct dimensions, and equal fact IDs in distinct entity kinds", async () => {
 const s = store(), input = files(), v = structuredClone(vocab);
 v.dimensions.enemy_threat = [...v.dimensions.card_role] as never;
 input["characters/silent/reflex-vocab.json"] = JSON.stringify(v);
 const book = JSON.parse(input["common/open-book.json"]!);
 book.entries.push({ ...book.entries[0], kind: "relics", name: "测试遗物", aliases: [] }); input["common/open-book.json"] = JSON.stringify(book);
 const version = publish(s, input), r = reader(s, version);
 expect(r.all({ type: "vocab", character: "silent", entity: "TEST_TAG" }).map(e => e.parent_id).sort()).toEqual(["card_role", "enemy_threat"]);
 expect(r.all({ type: "fact", character: "silent", entity: "TEST_CARD" }).map(e => e.value.kind).sort()).toEqual(["cards", "relics"]);
 const h = host(s); expect((await h.call("kb_open_book", { query: "TEST_CARD", category: "relics" })).data.entries[0].name).toBe("测试遗物");
});

it("preserves nested combo/vocab evidence and rejects deleting the original child", () => {
 const s = store(), input = files(); publish(s, input);
 const path = "characters/silent/build-cores.json", core = JSON.parse(input[path]!);
 core.entries[0].combos[0].evidence = [{ run_id: "DIFFERENT_RUN", floor: 2, turn: 1 }];
 const c: Candidate = { schema: "knowledge-candidate-v1", id: "bad-nested", base: s.current(), character: "silent", source: "fixture", files: { [path]: JSON.stringify(core) } };
 s.submit(c); expect(() => s.validate(c.id)).toThrow("nested evidence");
 const next = structuredClone(vocab); next.dimensions.card_role = [];
 const c2 = { ...c, id: "bad-vocab-delete", files: { "characters/silent/reflex-vocab.json": JSON.stringify(next) } };
 s.submit(c2); expect(() => s.validate(c2.id)).toThrow("published child");
});

it("rejects incomplete or mismatched environment bindings at process capture", async () => {
 vi.stubEnv("STS2_KNOWLEDGE_SNAPSHOT", "/fixture/snapshots/K1-" + "a".repeat(64)); vi.stubEnv("STS2_KNOWLEDGE_VERSION", "K1-" + "b".repeat(64));
 vi.resetModules(); await expect(import("../src/knowledge/runtime-paths.js")).rejects.toThrow("invalid runtime knowledge binding");
 vi.unstubAllEnvs(); vi.resetModules();
});

it("adds newly covered documents via the real CLI without overwriting newer runtime knowledge", async () => {
 const s = store(), base = publish(s, { [expPath]: doc([{ ...exp, lesson: "runtime已更新，不能被旧Git覆盖" }]) });
 const frozen = directory(); mkdirSync(join(frozen, "characters/silent"), { recursive: true }); mkdirSync(join(frozen, "common"));
 writeFileSync(join(frozen, expPath), doc([exp])); writeFileSync(join(frozen, "common/open-book.json"), files()["common/open-book.json"]!);
 const args = ["extend", "--runtime", s.root, "--base", base, "--knowledge", frozen, "--id", "extend-fixture", "--source", "fixture:frozen-published"];
 const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
 try { await runtimeMain(args); await runtimeMain(args); } finally { consoleLog.mockRestore(); }
 const version = s.current()!;
 expect(s.db.prepare("SELECT count(*) n FROM releases").get()!.n).toBe(2);
 expect(s.files(version)[expPath]).toBe(doc([{ ...exp, lesson: "runtime已更新，不能被旧Git覆盖" }]));
 expect(reader(s, base).all({ type: "fact", character: "silent" })).toEqual([]);
 expect(reader(s, version).all({ type: "fact", character: "silent" })).toHaveLength(1);
 const h = host(s); expect((await h.call("kb_open_book", { query: "别名" })).data.entries).toHaveLength(1);
});

it("retains explicit multi-topic membership once, and reevaluates dynamic state with a warm reader", async () => {
 const s = store(), input = files(); input[expPath] = doc([{ ...exp, topics: ["startup", "build_route"] }]);
 input["characters/silent/strategy-entries.json"] = JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries: [strategy("low-only", { question_types: ["card_reward"], hp_ratio: { max: .2 } })] });
 const version = publish(s, input), r = reader(s, version);
 const a = r.all({ type: "experience", character: "silent", topic: "startup" }), b = r.all({ type: "experience", character: "silent", topic: "build_route" });
 expect(a[0]!.item).toBe(b[0]!.item); expect(a).toHaveLength(1);
 const low = host(s, 0, "LOW", "reward/card", { facts: { act: 1, hp: "5/50" } });
 expect((await low.call("kb_strategies", { query: "*" })).data.entries).toHaveLength(1);
 low.ctx.payload = { facts: { act: 1, hp: "50/50" } };
 expect((await low.call("kb_strategies", { query: "*" })).data.entries).toEqual([]);
});

it("rolls back all typed tables with a failed candidate publication while retaining the candidate", () => {
 const s = store(); publish(s); const count = s.db.prepare("SELECT count(*) n FROM business_items").get()!.n;
 const c: Candidate = { schema: "knowledge-candidate-v1", id: "atomic-typed", base: s.current(), character: "silent", source: "fixture",
  files: { [expPath]: doc([{ ...exp, lesson: "新修订格式" }]) } };
 s.submit(c); s.validate(c.id);
 expect(() => s.publish(c.id, () => { throw Error("injected typed write rollback"); })).toThrow("injected typed");
 expect(s.db.prepare("SELECT count(*) n FROM business_items").get()!.n).toBe(count);
 expect(s.status(c.id).status).toBe("validated"); s.publish(c.id);
 expect(s.db.prepare("SELECT count(*) n FROM business_items").get()!.n).toBe(Number(count) + 1);
});

it("opens a fresh process reader while another read transaction retains its original version", () => {
 const s = store(), first = publish(s), r = reader(s, first);
 r.db.exec("BEGIN"); expect(r.all({ type: "experience", character: "silent" })[0]!.value.lesson).toBe(exp.lesson);
 const next = publish(s, { [expPath]: doc([{ ...exp, lesson: "新进程原文" }]) }, "fresh-process");
 const child = spawnSync(process.execPath, ["--import", "tsx", "tools/knowledge-runtime.ts", "typed-query", "--runtime", s.root,
  "--version", next, "--character", "silent", "--type", "experience"], { cwd: join(import.meta.dirname, ".."), encoding: "utf8" });
 expect(child.status, child.stderr).toBe(0); expect(JSON.parse(child.stdout)[0].value.lesson).toBe("新进程原文");
 expect(r.all({ type: "experience", character: "silent" })[0]!.value.lesson).toBe(exp.lesson); r.db.exec("COMMIT");
});

it("resolves published entity aliases within the bound role and preserves kind-qualified fact identities on updates", async () => {
 const s = store(), input = files(); input[expPath] = doc([{ ...exp, scope: "card:TEST_CARD" }]);
 const bookPath = "common/open-book.json", book = JSON.parse(input[bookPath]!);
 book.entries.push({ ...book.entries[0], kind: "relics", name: "另一种原实体", aliases: [] }); input[bookPath] = JSON.stringify(book);
 publish(s, input); const h = host(s);
 expect((await h.call("kb_experience", { entity: "别名" })).data.entries.map((e: any) => e.id)).toEqual([exp.id]);
 const c: Candidate = { schema: "knowledge-candidate-v1", id: "delete-one-kind", base: s.current(), character: "common", source: "fixture",
  files: { [bookPath]: JSON.stringify({ ...book, entries: [book.entries[1]] }) } };
 s.submit(c); expect(() => s.validate(c.id)).toThrow("retire instead of deleting");
});

it("shares an explicitly promoted common experience without counting its source role as consumer validation", async () => {
 const s = store(), input = files(), common = { ...exp, id: "common-fixture", shared: { independent_of_character: true,
  reason: "synthetic format only", conditions: "fixture scope only", sources: [{ character: "silent", run_id: "SILENT000001", experience_id: exp.id,
   evidence_path: "fixture/not-real-evidence.json", evidence_sha256: "a".repeat(64) }] } };
 input["common/shared-experience.json"] = doc([common]); publish(s, input); const h = host(s);
 setKnowledgeCharacter("ironclad"); const result = await h.call("kb_experience", { id: "common-fixture" });
 expect(result.data.entries).toEqual([common]); expect(result.data.entries[0].shared.sources[0].character).toBe("silent");
 expect(result.data.sources[0].character).toBe("common");
});

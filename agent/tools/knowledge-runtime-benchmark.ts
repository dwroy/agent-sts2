/** Fixed local migration/readback benchmark. Never takes a production runtime as an output. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { performance } from "node:perf_hooks";
import { KnowledgeStore, importFiles, digest, type Candidate } from "../src/knowledge/runtime/store.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { strategyTool } from "../src/brain/tools/strategy-tool.js";
import { reflexKnowledgeTool } from "../src/brain/tools/reflex-knowledge.js";

const temp = mkdtempSync(join(tmpdir(), "knowledge-benchmark-"));
const report: Record<string, unknown> = { boundary: "SQLite query + row materialization; tools timed separately; excludes LLM/network", cold: "new SQLite connection, OS page cache uncontrolled", concurrency: "two WAL connections, reader inside uncommitted writer; one process; no CPU-parallel writer claim" };
const percentile = (times: number[]) => ({ n: times.length, p50_ms: [...times].sort((a, b) => a - b)[Math.floor(times.length * .50)], p95_ms: [...times].sort((a, b) => a - b)[Math.min(times.length - 1, Math.floor(times.length * .95))], max_ms: Math.max(...times) });
function measure(run: () => unknown, n = 100) { const times = []; for (let i = 0; i < n; i++) { const start = performance.now(); run(); times.push(performance.now() - start); } return percentile(times); }
try {
 const original = importFiles(resolve(process.argv[2] ?? "../knowledge"));
 const runtime = join(temp, "real");
 const s = new KnowledgeStore(runtime);
 try {
  const c: Candidate = { schema: "knowledge-candidate-v1", id: "frozen-migration", character: "migration", source: "fixed repository published leaves", base: null, files: original };
  const start = performance.now(); s.submit(c); s.validate(c.id); const version = s.publish(c.id);
  report["migration_ms"] = performance.now() - start;
  const restored = s.files(version);
  report["migration"] = { documents: Object.keys(original).length, bytes: Object.values(original).reduce((n, t) => n + Buffer.byteLength(t), 0),
   entries: Number(s.db.prepare("SELECT count(*) n FROM revisions").get()!.n),
   exact_bytes: Object.entries(original).every(([path, text]) => restored[path] === text),
   files: Object.fromEntries(Object.entries(original).map(([path, text]) => [path, digest(text)])) };
  const queries = [
   { kind: "experience", text: "路线" }, { kind: "experience", category: "general" },
   { kind: "strategy-entries", text: "启动" }, { kind: "strategy-entries", entity: "BACKFLIP" },
   { kind: "reflex", text: "boss" }, { kind: "reflex", text: "TEST_NO_MATCH" },
  ];
  report["real_hot"] = queries.map(q => ({ query: q, ...measure(() => s.query({ version, character: "silent", ascension: 10, ...q })) }));
  report["real_connection_cold"] = measure(() => { const r = new KnowledgeStore(runtime, { readOnly: true }); try { r.query({ version, character: "silent", kind: "experience", text: "路线" }); } finally { r.close(); } }, 30);
  const reader = new KnowledgeStore(runtime, { readOnly: true });
  try {
   const edited = { ...original }; const path = "characters/silent/experience.json";
   edited[path] = JSON.stringify({ ...JSON.parse(original[path]!), version: "benchmark-header-only" });
   const change: Candidate = { ...c, id: "header-only", base: version, character: "silent", files: { [path]: edited[path]! } };
   s.submit(change); s.validate(change.id);
   const times: number[] = [];
   s.publish(change.id, () => { for (let i = 0; i < 100; i++) { const start = performance.now(); reader.query({ version, character: "silent", kind: "strategy-entries", text: "启动" }); times.push(performance.now() - start); } });
   report["read_during_writer"] = percentile(times);
  } finally { reader.close(); }
  setKnowledgeCharacter("silent");
  const snapshot = String(s.bind("FIXED_TOOLS", "benchmark").snapshot);
  const ctx = { ascension: 10, act: 1, label: "reward/card", knowledgeDir: snapshot, logsDir: temp, payload: { facts: { act: 1, floor: 4, deck_size: 10 } } };
  const tools: Record<string, unknown> = {};
  for (const tool of [strategyTool(), reflexKnowledgeTool()]) {
   const times = [];
   for (let i = 0; i < 40; i++) { const start = performance.now(); await tool.run({ query: "*" }, { ...ctx, ...(tool.name === "kb_reflex" ? { label: "fight-plan" } : {}) }); times.push(performance.now() - start); }
   tools[tool.name] = percentile(times);
  }
  report["snapshot_tools"] = tools;
 } finally { s.close(); }
 const scale = new KnowledgeStore(join(temp, "extended"));
 try {
  const entries = Array.from({ length: 10000 }, (_, i) => ({ id: `fixture-${i}`, scope: "general:route", asc: [10, 10],
   lesson: `格式夹具 启动 路线 ${i}`, name: `别名${i}`, status: "active", confidence: "low", evidence: ["FIXTURE00001"], n_support: 1, n_contradict: 0, last_seen: "fixture" }));
  const c: Candidate = { schema: "knowledge-candidate-v1", id: "extended-fixed", base: null, character: "silent", source: "synthetic format fixture", files: { "characters/silent/experience.json": JSON.stringify({ version: "fixture", entries }) } };
  scale.submit(c); scale.validate(c.id); const version = scale.publish(c.id);
  report["extended"] = { entries: entries.length, hot_two_character: measure(() => scale.query({ version, character: "silent", ascension: 10, kind: "experience", text: "启动" })),
   hot_trigram: measure(() => scale.query({ version, character: "silent", kind: "experience", text: "格式夹具" })),
   indexed_alias: measure(() => scale.query({ version, character: "silent", entity: "别名9999" })) };
 } finally { scale.close(); }
 const text = JSON.stringify(report, null, 2) + "\n";
 if (process.argv[3]) writeFileSync(process.argv[3], text); else process.stdout.write(text);
} finally { rmSync(temp, { recursive: true, force: true }); }

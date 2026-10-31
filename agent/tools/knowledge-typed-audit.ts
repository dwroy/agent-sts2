/** Reproducible offline audit. Creates only an explicitly named, fresh isolated runtime. */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";
import { KnowledgeStore, importFiles, digest, type Candidate } from "../src/knowledge/runtime/store.js";
import { KnowledgeReader, closeIndexedReaders } from "../src/knowledge/runtime/reader.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import type { ToolContext } from "../src/brain/tools/types.js";

const args = process.argv.slice(2), options: Record<string, string> = {};
for (let i = 0; i < args.length; i += 2) { if (!args[i]?.startsWith("--") || !args[i + 1]) throw Error("expected --name value"); options[args[i]!.slice(2)] = args[i + 1]!; }
const required = (key: string) => { if (!options[key]) throw Error(`--${key} required`); return resolve(options[key]!); };
const runtime = required("runtime");
if (options["probe"]) {
 setKnowledgeCharacter("silent");
 const snapshot = join(runtime, "snapshots", options["version"]!), ctx: ToolContext = { ascension: Number(options["ascension"]), act: 1,
  knowledgeDir: snapshot, logsDir: snapshot, label: options["label"], payload: JSON.parse(options["payload"]!) };
 const start = performance.now(), host = new ToolHost(buildKnowledgeTools(ctx), ctx, undefined, true);
 const result = await host.call(options["probe"], JSON.parse(options["input"]!)), toolMs = performance.now() - start;
 closeIndexedReaders(); console.log(JSON.stringify({ tool_ms: toolMs, isError: !!result.isError, output_bytes: Buffer.byteLength(result.text) }));
} else {
const output = required("output"), knowledge = required("knowledge");
if (existsSync(runtime)) throw Error("audit runtime must be a new isolated directory");
mkdirSync(output, { recursive: true });
const save = (name: string, value: unknown) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const sourcePaths = ["schema", "typed-schema", "store", "projection", "reader", "validation", "sqlite-version"].map(n => `src/knowledge/runtime/${n}.ts`)
 .concat(["agent-knowledge", "typed-knowledge", "query-guidance", "reflex-knowledge"].map(n => `src/brain/tools/${n}.ts`),
 ["src/knowledge/runtime-paths.ts", "src/knowledge/open-book.ts", "tools/knowledge-runtime.ts", "tools/knowledge-typed-audit.ts"]);
const sources = Object.fromEntries(sourcePaths.map(p => [p, digest(readFileSync(resolve(import.meta.dirname, "..", p), "utf8"))]));
save("source-manifest.json", sources);
const canonical = (value: any): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object"
 ? `{${Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",")}}` : JSON.stringify(value);
function publish(s: KnowledgeStore, files: Record<string, string>, id: string) {
 const candidate: Candidate = { schema: "knowledge-candidate-v1", id, base: s.current(), character: "migration", source: "fixture:isolated-audit", files };
 s.submit(candidate); s.validate(id); return s.publish(id);
}
function summary(samples: number[]) {
 const sorted = [...samples].sort((a, b) => a - b);
 return { n: sorted.length, p50_ms: sorted[Math.ceil(sorted.length * .5) - 1], p95_ms: sorted[Math.ceil(sorted.length * .95) - 1], max_ms: sorted.at(-1) };
}
async function measure(reader: KnowledgeReader, ctx: ToolContext, name: string, input: Record<string, unknown>, dbQuery: Parameters<KnowledgeReader["query"]>[0], n = 100) {
 const processStart = performance.now(), child = spawnSync(process.execPath, ["--import", "tsx", "tools/knowledge-typed-audit.ts", "--runtime", reader.root,
  "--probe", name, "--version", reader.version, "--ascension", String(ctx.ascension), "--label", ctx.label ?? "", "--payload", JSON.stringify(ctx.payload), "--input", JSON.stringify(input)],
  { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" });
 const processColdMs = performance.now() - processStart;
 if (child.status !== 0) throw Error(`fresh process probe failed: ${name}`);
 const processProbe = JSON.parse(child.stdout);
 closeIndexedReaders(); const tools = buildKnowledgeTools(ctx), host = new ToolHost(tools, ctx, undefined, true);
 let begin = performance.now(); const coldResult = await host.call(name, input), cold = performance.now() - begin;
 const parsed = JSON.parse(coldResult.text), db: number[] = [], full: number[] = [], errors: string[] = [];
 for (let i = 0; i < n; i++) {
  begin = performance.now(); reader.query(dbQuery); db.push(performance.now() - begin);
  begin = performance.now(); const result = await host.call(name, input); full.push(performance.now() - begin);
  if (result.isError) errors.push(result.text);
  host.take();
 }
 return { name, input, fresh_process: { total_ms: processColdMs, ...processProbe, os_file_cache: "not dropped" }, cold_tool_ms: cold, hot_db: summary(db), hot_tool: summary(full),
  returned: parsed.entries?.length, total_matches: parsed.total_matches, output_bytes: Buffer.byteLength(coldResult.text),
  returned_ids: parsed.entries?.map((e: any) => e.id ?? e.direction), errors: [...new Set(errors)], cold_error: !!coldResult.isError,
  query_plan: reader.plan(dbQuery) };
}

const files = importFiles(knowledge), beginImport = performance.now(), store = new KnowledgeStore(runtime);
try {
 const version = publish(store, files, "isolated-real"), importMs = performance.now() - beginImport;
 const begin = performance.now(), reader = new KnowledgeReader(runtime, version), openMs = performance.now() - begin;
 try {
  const mapping: unknown[] = [], differences: unknown[] = [];
  for (const [path, text] of Object.entries(files)) {
   const body = JSON.parse(text), items = store.db.prepare("SELECT b.* FROM business_items b JOIN revisions r ON r.revision=b.revision JOIN release_entries p ON p.revision=r.revision WHERE p.version=? AND r.path=? ORDER BY b.type,b.original_id,b.parent_id").all(version, path);
   const type = path.endsWith("/reflex-vocab.json") ? "vocab" : path.endsWith("/build-cores.json") ? "core" : null;
   const expected = type === "vocab" ? Object.entries(body.dimensions).flatMap(([dimension, entries]) => (entries as any[]).map(e => ({ id: e.id, type: "vocab", parent: dimension, value: e })))
    : type === "core" ? body.entries.flatMap((e: any) => [{ id: e.direction, type: "core", parent: null, value: e }, ...e.combos.map((c: any) => ({ id: c.id, type: "combo", parent: e.direction, value: c }))])
    : (body.entries ?? []).map((e: any) => ({ id: e.id, type: null, parent: null, entity_kind: e.kind, value: e }));
   for (const e of expected) {
    const found = items.find(i => i.original_id === e.id && (!e.type || i.type === e.type) && i.parent_id === e.parent && (!e.entity_kind || JSON.parse(String(i.payload)).kind === e.entity_kind));
    if (!found || canonical(JSON.parse(String(found.payload))) !== canonical(e.value)) differences.push({ path, id: e.id, parent: e.parent });
   }
   if (items.length !== expected.length) differences.push({ path, expected_count: expected.length, actual_count: items.length });
   mapping.push({ path, source_sha256: digest(text), bytes: Buffer.byteLength(text), original_count: expected.length,
    items: items.map(i => ({ type: i.type, original_id: i.original_id, parent_id: i.parent_id, ...(i.type === "fact" ? { entity_kind: JSON.parse(String(i.payload)).kind } : {}), revision: i.revision, payload_sha256: digest(String(i.payload)) })) });
  }
  const counts = store.db.prepare("SELECT type,character,count(*) n FROM business_items GROUP BY type,character ORDER BY type,character").all();
  save("coverage.json", { version, import_ms: importMs, reader_open_ms: openMs, files: Object.keys(files).length, counts, differences,
   relation_rows: store.db.prepare("SELECT relation,count(*) n FROM item_links GROUP BY relation").all(),
   evidence_rows: store.db.prepare("SELECT role,count(*) n FROM item_evidence GROUP BY role").all(), mapping });
  if (differences.length) throw Error("typed payload coverage differs from frozen source");
  setKnowledgeCharacter("silent");
  const snapshot = String(store.bind("AUDIT_REAL", "isolated-audit-source").snapshot), ctx: ToolContext = { ascension: 10, act: 1,
   label: "map/act-start", payload: { facts: { act: 1, act_boss: "THE_KIN_BOSS", hp: "50/70", floor: 4, deck: [] } }, knowledgeDir: snapshot, logsDir: snapshot };
  const base = { character: "silent", ascension: 10 }, results = [];
  results.push(await measure(reader, ctx, "kb_experience", { relevant: true }, { ...base, type: "experience" }));
  results.push(await measure(reader, ctx, "kb_experience", { keyword: "启动" }, { ...base, type: "experience", text: "启动" }));
  results.push(await measure(reader, ctx, "kb_strategies", { query: "*" }, { ...base, type: "strategy", questions: ["act_plan"] }));
  results.push(await measure(reader, { ...ctx, label: "fight-plan" }, "kb_reflex", { query: "*" }, { ...base, type: "reflex" }));
  results.push(await measure(reader, ctx, "kb_open_book", { query: "ABUNDANCE" }, { ...base, type: "fact", text: "ABUNDANCE" }));
  results.push(await measure(reader, ctx, "kb_build_cores", { query: "*" }, { ...base, type: "core", view: "tool" }));
  results.push(await measure(reader, ctx, "kb_build_combos", { query: "*" }, { ...base, type: "combo", view: "tool" }));
  results.push(await measure(reader, ctx, "kb_vocab", { query: "*" }, { ...base, type: "vocab" }));
  save("real-performance.json", { version, note: "100 sequential hot measurements after one cold ToolHost call; DB query is bounded first page, full tool includes exhaustion, dynamic matching, output and host audit; no LLM/network", results });
 } finally { reader.close(); closeIndexedReaders(); }
} finally { store.close(); }

const scaledRoot = runtime + "-scaled", scaled = new KnowledgeStore(scaledRoot);
try {
 const entries = Array.from({ length: 10000 }, (_, i) => ({ id: `fixture-${String(i).padStart(5, "0")}`, scope: "general:deck", asc: [10, 10],
  lesson: "启动路线，仅规模格式夹具", evidence: ["SILENT000001"], n_support: 1, n_contradict: 0, confidence: "low", status: "active", last_seen: "2026-10-25" }));
 const begin = performance.now(), version = publish(scaled, { "characters/silent/experience.json": JSON.stringify({ version: "synthetic-scale", entries }) }, "scale-fixture"), importMs = performance.now() - begin;
 const reader = new KnowledgeReader(scaledRoot, version);
 try {
  const snapshot = String(scaled.bind("AUDIT_SCALE", "fixture").snapshot), ctx: ToolContext = { ascension: 10, act: 1, label: "reward/card", payload: {}, knowledgeDir: snapshot, logsDir: snapshot };
  const results = [await measure(reader, ctx, "kb_experience", { id: "fixture-09999" }, { character: "silent", type: "experience", id: "fixture-09999" }),
   await measure(reader, ctx, "kb_experience", { relevant: true }, { character: "silent", type: "experience" }, 30)];
  save("scaled-performance.json", { version, entries: entries.length, import_ms: importMs, source: "synthetic format only; not game evidence", results });
 } finally { reader.close(); closeIndexedReaders(); }
} finally { scaled.close(); }
if (sourcePaths.some(p => digest(readFileSync(resolve(import.meta.dirname, "..", p), "utf8")) !== sources[p])) throw Error("source changed during audit; preserve result and rerun on fixed inputs");
console.log(JSON.stringify({ complete: true, runtime, output }));
}

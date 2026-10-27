/** Frozen #80 payload replay. Reads only; never starts models, games, writers or publication. */
import { readFileSync, writeFileSync, mkdirSync, openSync, readSync, closeSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { setKnowledgeCharacter } from "../../../agent/src/knowledge/files.ts";
import { indexedKnowledge, closeIndexedReaders } from "../../../agent/src/knowledge/runtime/reader.ts";
import { attachDecisionKnowledge, decisionContextTool } from "../../../agent/src/brain/decision-knowledge.ts";
import { publishedObservation } from "../../../agent/src/knowledge/strategy-entries.ts";
import { typedKnowledgeTool } from "../../../agent/src/brain/tools/typed-knowledge.ts";
import { strategyTool } from "../../../agent/src/brain/tools/strategy-tool.ts";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, i, values) => i % 2 ? pairs : [...pairs, [value, values[i + 1]]], []));
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceRoot = resolve(args["--source-root"] ?? repo);
const observedVersion = "K1-7bb1e922947acc2c67f738ec36aa49d9c8c445ef871581b49f9057e048a60e9d";
const version = args["--version"] ?? observedVersion, budget = Number(args["--budget"] ?? 8000);
if (!/^K1-[a-f0-9]{64}$/.test(version) || ![2048, 8000, 24000].includes(budget)) throw Error("invalid frozen replay version/budget");
const output = resolve(args["--output"] ?? resolve(repo, ".artifacts/issue81-r2/replay-output"));
const hash = value => createHash("sha256").update(value).digest("hex");
const paths = ["agent/src/brain/decision-knowledge.ts", "agent/src/brain/tools/knowledge-projection.ts", "agent/src/brain/tools/query-guidance.ts", "agent/src/knowledge/strategy-entries.ts", "agent/tests/decision-observations.test.ts"];
const before = Object.fromEntries(paths.map(p => [p, hash(readFileSync(resolve(repo, p)))]));
const observerPath = ".artifacts/ops-issue80-use-20261027/natural-brain.jsonl", observer = readFileSync(resolve(sourceRoot, observerPath));
if (hash(observer) !== "3497c7b3f30136322f4fdc5223f0f9531b5c70412af99631f95b6d380960b8ab") throw Error("frozen observer changed");
const newRuns = new Set(["BQ04NAFKYD78", "3YTH58GLDE56", "9KTVCXYVVTNE", "PMNMK7U2H1JF"]);
const latest = new Map();
const windows = observer.toString().trim().split("\n").map(line => JSON.parse(line));
for (const item of windows) if (newRuns.has(item.row.run_id)) latest.set(item.row.question_id, item);
if (latest.size !== 141) throw Error("frozen question denominator changed");
const snapshot = resolve(sourceRoot, "data/knowledge-runtime/snapshots", version);
setKnowledgeCharacter("silent");
try {
 const reader = indexedKnowledge(snapshot);
 if (!reader || reader.db.prepare("PRAGMA query_only").get().query_only !== 1) throw Error("no query-only bound reader");
 const originalItems = reader.all({ type: "strategy", character: "silent", ascension: 10, view: "tool" }).filter(e => publishedObservation(e.value));
 if (originalItems.length !== 36) throw Error("published observation denominator changed");
 const allowed = new Set(originalItems.map(e => e.original_id));
 const results = [];
 for (const { row, ref } of latest.values()) {
  const ctx = { label: row.label, payload: row.payload, options: row.options, ascension: 10, knowledgeDir: snapshot, logsDir: "" };
  const request = { ...row, system: "fixed-replay", knowledge: { mode: "tools" }, toolContext: ctx,
   spec: { label: row.label, kind: "pick", schema: { type: "object" }, validate: () => [] } };
  const result = attachDecisionKnowledge(request, { enabled: true, bytes: budget }), context = result.payload.decision_knowledge;
  const ids = context?.entries.map(e => e.id) ?? [], bytes = context ? Buffer.byteLength(JSON.stringify(context)) : 0;
  if (bytes > budget || ids.some(id => !allowed.has(id))) throw Error("invalid bounded delivery");
  results.push({ run: row.run_id, question_id: row.question_id, label: row.label, original_ref: ref,
   status: context?.status ?? "outside_decision_points", matches: context?.total_matches ?? 0,
   returned: ids.length, ids, bytes, truncated: context?.truncated ?? false });
 }
 const queryCases = [];
 // Independently verify the three actual topic-query windows, then reconstruct only their saved payload.
 const analysis = JSON.parse(readFileSync(resolve(sourceRoot, "paper/materials/20261027-issue80-natural-five-ops/five-run-analysis.json")));
 for (const [run, data] of Object.entries(analysis)) if (newRuns.has(run)) for (const call of data.tools) {
  if (call.tool !== "kb_strategies" || call.input.topic !== "climb_route") continue;
  const ref = call.ref, fd = openSync(resolve(sourceRoot, ref.file), "r"), bytes = Buffer.alloc(ref.bytes);
  try { if (readSync(fd, bytes, 0, ref.bytes, ref.offset) !== ref.bytes || hash(bytes) !== ref.sha256) throw Error("original query window changed"); }
  finally { closeSync(fd); }
  const row = JSON.parse(bytes.toString()), ctx = { label: row.label, payload: row.payload, options: row.options, ascension: 10, knowledgeDir: snapshot, logsDir: "" };
  const result = await typedKnowledgeTool(strategyTool()).run(call.input, ctx);
  if (result.isError) throw Error("topic query failed");
  const value = JSON.parse(result.text);
  queryCases.push({ run, question_id: row.question_id, original_ref: ref, input: call.input,
   ids: value.entries.map(e => e.id), matches: value.total_matches, next_offset: value.next_offset, bytes: Buffer.byteLength(result.text) });
 }
 if (queryCases.length !== 3) throw Error("original topic query denominator changed");
 const full = [];
 for (const item of originalItems) {
  const e = item.value, t = e.trigger, kind = t.question_types[0], act = t.acts?.[0] ?? 1, floor = t.floor?.min ?? 3, boss = t.bosses?.[0];
  const labels = { card_reward: "reward/card", rest: "rest/plan", shop: "shop/plan", act_plan: "event/act-plan", fight_plan: "fight-plan", event: "event/plan", map_route: "map/route-plan" };
  const label = labels[kind], payload = { facts: { act, floor, deck: [], ...(boss ? { act_boss: boss } : {}) },
   ...(kind === "fight_plan" ? { fight_state: { fight: "boss", act, floor, enemies: (boss ?? "FIXTURE_UNKNOWN").split("+").map(enemy_id => ({ enemy_id })) } } : {}) };
  const ctx = { label, payload, ascension: 10, knowledgeDir: snapshot, logsDir: "" };
  let offset = 0, raw = "", parts = 0;
  do {
   const result = await decisionContextTool().run({ detail: "full", source: "strategy_observation", document_id: e.id, document_offset: offset }, ctx);
   const part = JSON.parse(result.text);
   if (result.isError || !part.json_fragment || part.knowledge_version !== version || Buffer.byteLength(result.text) > 24000) throw Error(`full document failed: ${e.id}`);
   raw += part.json_fragment; offset = part.next_document_offset; parts++;
   if (parts > 100) throw Error("fragment loop");
  } while (offset !== null);
  if (raw !== JSON.stringify(e)) throw Error(`full document changed: ${e.id}`);
  full.push({ id: e.id, case: "synthetic declared formal trigger; original extra conditions not evaluated", label, act, floor, parts, bytes: Buffer.byteLength(raw), sha256: hash(raw) });
 }
 const unique = [...new Set(results.flatMap(r => r.ids))];
 const summary = { observed_knowledge_version: observedVersion, replay_knowledge_version: version, budget,
  independent_questions: results.length, with_entries: results.filter(r => r.returned > 0).length,
  outside_points: results.filter(r => r.status === "outside_decision_points").length,
  missing: results.filter(r => r.status === "missing").length, unavailable: results.filter(r => r.status === "unavailable").length,
  unique_ids: unique, total_returned_entries: results.reduce((n,r) => n + r.returned, 0), truncated_questions: results.filter(r => r.truncated).length,
  max_bytes: Math.max(...results.map(r => r.bytes)), full_documents_equal: full.length,
  full_parts: full.reduce((n,r) => n + r.parts, 0), not_delivered_ids: [...allowed].filter(id => !unique.includes(id)),
  query_cases: queryCases, sources: { observer: { path: observerPath, bytes: observer.length, sha256: hash(observer) },
   strategy_sha256: reader.fileDigest("characters/silent/strategy-entries.json"), classification_sha256: reader.fileDigest("characters/silent/classification.json") },
  source_sha256: before, source_unchanged: paths.every(p => before[p] === hash(readFileSync(resolve(repo, p)))),
  limits: "Offline saved payload only; original raw mod state absent. Full-document cases are synthetic formal-trigger contracts, not natural decisions or benefit evidence." };
 if (!summary.source_unchanged) throw Error("source changed during replay");
 mkdirSync(output, { recursive: true });
 for (const [name, value] of Object.entries({ summary, questions: results, full_documents: full })) writeFileSync(resolve(output, name + ".json"), JSON.stringify(value, null, 2) + "\n");
 console.log(JSON.stringify(summary));
} finally { closeIndexedReaders(); setKnowledgeCharacter(null); }

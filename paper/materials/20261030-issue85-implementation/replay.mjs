/** Frozen payload replay; writes only the explicit isolated output directory. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { KnowledgeStore } from "../../../agent/src/knowledge/runtime/store.ts";
import { closeIndexedReaders, KnowledgeReader } from "../../../agent/src/knowledge/runtime/reader.ts";
import { setKnowledgeCharacter } from "../../../agent/src/knowledge/files.ts";
import { attachDecisionKnowledge, decisionContextTool } from "../../../agent/src/brain/decision-knowledge.ts";
import { DecisionKnowledgeExposure } from "../../../agent/src/brain/decision-knowledge-exposure.ts";
import { ISSUE85_BASE, gradeCandidate } from "../../../agent/tools/grade-strategies.ts";
import { canonical } from "../../../agent/src/knowledge/runtime/classification.ts";
import { typedKnowledgeTool } from "../../../agent/src/brain/tools/typed-knowledge.ts";
import { strategyTool } from "../../../agent/src/brain/tools/strategy-tool.ts";

const [baseFile, windowFile, outputDir, backupFile] = process.argv.slice(2);
if (!baseFile || !windowFile || !outputDir || !backupFile) throw Error("expected exported-base frozen-window unused-output readonly-backup");
const out = resolve(outputDir); if (existsSync(out)) throw Error("output must be new"); mkdirSync(out, { recursive: true });
const base = JSON.parse(readFileSync(baseFile, "utf8")), candidate = JSON.parse(readFileSync(new URL("candidate.json", import.meta.url), "utf8"));
const rebuilt = gradeCandidate(base, readFileSync(new URL("../20261030-issue85-grading/assessments.json", import.meta.url), "utf8"), JSON.parse(readFileSync(new URL("authority.json", import.meta.url), "utf8")));
if (JSON.stringify(rebuilt) !== JSON.stringify(candidate)) throw Error("candidate is not reproducible");
const raw = readFileSync(windowFile), rows = raw.toString().trim().split("\n").map(JSON.parse), contexts = rows.filter(r => r.payload?.decision_knowledge);
const latest = new Map(); for (const r of contexts) latest.set(`${r.run_id}/${r.question_id}`, r);
if (rows.length !== 550 || contexts.length !== 547 || latest.size !== 535 || new Set(contexts.map(r => r.run_id)).size !== 17) throw Error("frozen denominator changed");
const strategyPath = "characters/silent/strategy-entries.json", graded = JSON.parse(candidate.files[strategyPath]);
const byId = new Map(graded.entries.map(e => [e.id, e]));
const store = KnowledgeStore.restore(backupFile, join(out, "runtime")); setKnowledgeCharacter("silent");
const hash = s => createHash("sha256").update(s).digest("hex");
try {
 const before = store.current();
 if (before !== ISSUE85_BASE) throw Error("original K1 identity changed");
 store.submit(candidate); store.validate(candidate.id); const after = store.publish(candidate.id);
 const reader = new KnowledgeReader(store.root, after);
 try {
  const items = reader.all({ type: "strategy", character: "silent" });
  if (items.length !== 173 || items.filter(e => e.value.confidence === null).length !== 68) throw Error("typed null/count mismatch");
 } finally { reader.close(); }
 if (store.files(before)[strategyPath] !== base[strategyPath]) throw Error("old revision changed");
 const snapshot = join(store.root, "snapshots", after), results = [], full = [];
 const exposure = new DecisionKnowledgeExposure();
 for (const r of latest.values()) {
  const payload = { ...r.payload }; delete payload.decision_knowledge;
  const ctx = { label: r.label, payload, options: r.options, ascension: 10, knowledgeDir: snapshot, logsDir: out };
  const req = { ...r, runId: r.run_id, questionId: r.question_id, payload, knowledge: { mode: "tools" }, toolContext: ctx };
  const value = attachDecisionKnowledge(req, { enabled: true, bytes: 8000 }, exposure).payload.decision_knowledge;
  if (!value || value.status !== "ok" || value.exposure_status !== "reserved" || value.entries.length > 4 || Buffer.byteLength(JSON.stringify(value)) > 8000
    || value.entries.some(e => byId.get(e.id).grading.grade === "B−")) throw Error(`invalid delivery: ${r.question_id}`);
  results.push({ run: r.run_id, question_id: r.question_id, label: r.label, original_ref: r._source,
   before_ids: r.payload.decision_knowledge.entries.map(e => e.id), ids: value.entries.map(e => e.id),
   references: value.references.map(e => e.id), matches: value.total_matches, bytes: Buffer.byteLength(JSON.stringify(value)),
   omitted_bodies: value.omitted, omitted_references: value.omitted_references, ordinary_reservation: value.ordinary_reservation,
   first_body_oversized: value.first_body_oversized, eligible_bodies: value.eligible_bodies,
   body_limit_omitted: value.body_limit_omitted, body_budget_omitted: value.body_budget_omitted });
 }
 // All 173 full documents, including B−, remain lossless under a declared formal trigger.
 const labels = { card_reward: "reward/card", rest: "rest/plan", shop: "shop/plan", act_plan: "event/act-plan", fight_plan: "fight-plan", event: "event/plan", map_route: "map/route-plan" };
 for (const e of graded.entries) {
  const t = e.trigger, kind = t.question_types[0], act = t.acts?.[0] ?? 1, floor = t.floor?.min ?? 3, boss = t.bosses?.[0];
  const deck = (t.deck_cards ?? []).flatMap(c => Array.from({ length: c.count?.min ?? 1 }, () => c.name));
  const hp = Math.ceil(100 * (t.hp_ratio?.min ?? .5));
  const payload = { facts: { act, floor, deck, deck_size: t.deck_size?.min ?? deck.length, hp: `${hp}/100`, ...(boss ? { act_boss: boss } : {}) },
   ...(kind === "fight_plan" ? { fight_state: { fight: "boss", act, floor, enemies: (boss ?? "FIXTURE_UNKNOWN").split("+").map(enemy_id => ({ enemy_id })) } } : {}) };
  const ctx = { label: labels[kind], payload, ascension: 10, knowledgeDir: snapshot, logsDir: out };
  let offset = 0, recovered = "", parts = 0;
  do {
   const result = await decisionContextTool().run({ detail: "full", document_id: e.id, document_offset: offset }, ctx), v = JSON.parse(result.text);
   if (result.isError || !v.json_fragment || Buffer.byteLength(result.text) > 24000) throw Error(`full read failed: ${e.id}`);
   recovered += v.json_fragment; offset = v.next_document_offset; parts++;
   if (parts > 100) throw Error("fragment loop");
  } while (offset !== null);
  if (recovered !== canonical(e)) throw Error("lossy full read");
  let queryOffset = 0, queryRaw = "", queryParts = 0;
  do {
   const result = await typedKnowledgeTool(strategyTool()).run({ query: "*", detail: "full", document_id: e.id, document_offset: queryOffset }, ctx), v = JSON.parse(result.text);
   if (result.isError || !v.json_fragment || Buffer.byteLength(result.text) > 24000) throw Error(`strategy full read failed: ${e.id}`);
   queryRaw += v.json_fragment; queryOffset = v.next_document_offset; queryParts++;
   if (queryOffset !== null && v.next_input?.document_offset !== queryOffset) throw Error("missing explicit next input");
  } while (queryOffset !== null);
  const queryValue = JSON.parse(queryRaw);
  for (const key of ["evidence_summary", "limitation_notice"]) if (!Object.hasOwn(e, key)) delete queryValue[key];
  if (canonical(queryValue) !== canonical(e)) throw Error(`lossy strategy full read: ${e.id}`);
  full.push({ id: e.id, parts, query_parts: queryParts, bytes: Buffer.byteLength(recovered), sha256: hash(recovered), synthetic_scope: true });
 }
 const counts = new Map(), category = {}, grades = {}, unique = new Set(), refs = new Set(); let ordinary = 0, mechanism = 0;
 for (const r of results) { for (const id of r.references) refs.add(id); for (const id of r.ids) {
  const e = byId.get(id), g = e.grading; unique.add(id); counts.set(`${r.run}/${id}`, (counts.get(`${r.run}/${id}`) ?? 0) + 1);
  category[g.category] = (category[g.category] ?? 0) + 1; grades[g.grade] = (grades[g.grade] ?? 0) + 1;
  ordinary += !e.review_observation ? 1 : 0; mechanism += g.evidence_type === "机制事实" ? 1 : 0;
 } }
 const total = results.reduce((n, r) => n + r.ids.length, 0), max = Math.max(...counts.values()); if (max > 3) throw Error("run exposure exceeded");
 const summary = { schema: "issue85-offline-replay-v1", before, after, rows: rows.length, context_rows: contexts.length, independent_questions: results.length,
  runs: 17, body_occurrences: total, unique_body_ids: [...unique].sort(), unique_reference_ids: [...refs].sort(), ordinary_body_occurrences: ordinary,
  ordinary_body_share: total ? ordinary / total : 0, mechanism_body_occurrences: mechanism, grade_body_occurrences: grades, category_body_occurrences: category,
  original116_A_body_occurrences: 0, max_run_entry_occurrences: max, Bminus_body_occurrences: 0,
  max_bytes: Math.max(...results.map(r => r.bytes)), questions_without_bodies: results.filter(r => !r.ids.length).length,
  first_body_oversized_questions: results.filter(r => r.first_body_oversized).length,
  ordinary_reservations: Object.fromEntries(["expanded", "budget_limited", "no_eligible_ordinary"].map(k => [k, results.filter(r => r.ordinary_reservation === k).length])),
  budget_omitted_body_occurrences: results.reduce((n, r) => n + r.body_budget_omitted, 0),
  entry_limit_omitted_body_occurrences: results.reduce((n, r) => n + r.body_limit_omitted, 0),
  omitted_body_occurrences: results.reduce((n, r) => n + r.omitted_bodies, 0), omitted_references: results.reduce((n, r) => n + r.omitted_references, 0),
  before_recorded_body_occurrences: results.reduce((n, r) => n + r.before_ids.length, 0), full_documents_lossless: full.length,
  strategy_full_documents_lossless: full.length, strategy_full_single_response: full.filter(r => r.query_parts === 1).length,
  frozen_window: { path: windowFile, bytes: raw.length, sha256: hash(raw) }, candidate_sha256: hash(readFileSync(new URL("candidate.json", import.meta.url))),
  limitations: ["固定R459的547条日志/535独立题；主管原546口径无固定偏移，差异保留。", "仅保存payload，无原mod state；形式触发匹配不证明全部原观察条件成立。", "未运行模型、对局或生产发布；只重放每个独立题的一次调用，生产重问由持久曝光账本另限。", "原116无A级；A正文为0不是漏读。", "全文测试为合成声明触发，不是自然采用或收益证据。"] };
 for (const [name, value] of Object.entries({ summary, questions: results, "full-documents": full })) writeFileSync(join(out, `${name}.json`), JSON.stringify(value, null, 2) + "\n");
 store.rollback(before, "offline-rollback-check"); if (store.current() !== before) throw Error("rollback failed");
 console.log(JSON.stringify(summary));
} finally { closeIndexedReaders(); store.close(); setKnowledgeCharacter(null); }

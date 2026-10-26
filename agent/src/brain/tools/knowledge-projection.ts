/** Bounded consumer views; source payloads and evidence are never rewritten. */
import { createHash } from "node:crypto";
import type { JsonSchema, ToolResult } from "./types.js";

type Row = Record<string, any>;
export const KNOWLEDGE_RESPONSE_BYTES = 24_000;
export const documentInputs: Record<string, JsonSchema> = {
 detail: { type: "string", enum: ["projection", "full"], description: "默认可消费投影；full须给document_id，按document_offset继续取完整JSON" },
 document_id: { type: "string", description: "原条目精确ID；仍受本题/角色/进阶/全部查询条件限制" },
 document_offset: { type: "integer", minimum: 0, maximum: 1000000, description: "全文分片游标，默认0；用next_document_offset继续到null" },
};
export const PROJECTION_NOTICE = "大条目返回固定预算投影，truncated/omitted_fields明示省略；证据引用按原数组末项（不推定日期）及最大外部分母选取，保反证，外部分母不相加。全文用同查询加detail=full、document_id=原ID，按next_document_offset续取；拼接json_fragment后解析还原完整原条目。检索不证明条件成立或采用。";
const bytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v));
const record = (v: unknown): v is Row => !!v && typeof v === "object" && !Array.isArray(v);
const array = (v: unknown): any[] => Array.isArray(v) ? v : [];

/** Bound strings by their escaped JSON bytes, without splitting a Unicode code point. */
function prefix(text: string, budget: number): string {
 let result = "", size = 2;
 for (const char of text) { const n = bytes(char) - 2; if (size + n > budget) break; result += char; size += n; }
 return result;
}

/** Every lossy preview carries paths; it cannot silently replace a complete condition or statistic. */
export function boundedPreview(value: unknown, budget: number): unknown {
 if (bytes(value) <= budget) return value;
 let scale = 700;
 for (;;) {
  const omitted: string[] = [];
  function visit(v: unknown, path: string, depth: number): unknown {
   if (typeof v === "string") {
    const s = prefix(v, scale); if (s !== v) omitted.push(path); return s;
   }
   if (!v || typeof v !== "object") return v;
   if (depth === 5) { omitted.push(path); return { omitted: true }; }
   if (Array.isArray(v)) {
    if (v.length > 3) omitted.push(path);
    return v.slice(0, 3).map((e, i) => visit(e, `${path}/${i}`, depth + 1));
   }
   const pairs = Object.entries(v);
   if (pairs.length > 20) omitted.push(path);
   return Object.fromEntries(pairs.slice(0, 20).map(([k, e]) => [k, visit(e, `${path}/${k}`, depth + 1)]));
  }
  const preview = visit(value, "", 0), result = { preview, truncated: true, omitted_fields: omitted.slice(0, 12), omitted_field_count: omitted.length };
  if (bytes(result) <= budget) return result;
  if (scale <= 40) return { truncated: true, json_excerpt: prefix(JSON.stringify(value), Math.max(40, budget - 150)), representation: "partial_json_text" };
  scale = Math.floor(scale / 2);
 }
}

function evidenceSummary(e: Row) {
 const ev = Array.isArray(e.evidence) ? e.evidence : array(e.evidence?.observations);
 const contradict = ev.filter(v => record(v) && v.role === "contradict");
 const external = ev.filter(v => record(v) ? v.type === "external_aggregate" || String(v.source).startsWith("external:")
  : typeof v === "string" && String(e.source).startsWith("external:"));
 const own = ev.filter(v => !external.includes(v) && (typeof v === "string" ? /^[0-9A-Z]{12}$/.test(v)
  : record(v) && (v.source === undefined || v.source === "own") && typeof (v.run ?? v.run_id) === "string"));
 return { references: ev.length, own_references: own.length, external_references: external.length,
  unclassified_references: ev.length - own.length - external.length,
  own_runs: new Set(own.map(v => typeof v === "string" ? v : v.run ?? v.run_id).filter(Boolean)).size,
  contradict_references: contradict.length, contradicting_references: array(e.contradicting).length,
  counterexamples: array(e.counterexamples).length, n_support: e.n_support ?? e.evidence?.n_support ?? null,
  n_contradict: e.n_contradict ?? e.evidence?.n_contradict ?? null,
  denominator_notice: "引用数不是独立样本；自有/外部分账，各外部分母不求和；未选引用/局限仍在全文" };
}

export function consumerProjection(value: Row, tool: string, query: Row): Row {
 if (bytes(value) <= 6500) return value;
 const ev = Array.isArray(value.evidence) ? value.evidence : array(value.evidence?.observations);
 const strongest = [...ev].filter(record).sort((a, b) => Number(b.denominator?.n ?? 0) - Number(a.denominator?.n ?? 0))[0];
 const chosen = [...new Set([...[...ev].reverse().filter(v => record(v) && v.role === "contradict").slice(0, 1),
  ...ev.slice(-1), ...(strongest ? [strongest] : []), ...[...ev].reverse()])].slice(0, 3);
 const essential = ["id", "trigger", "strategy", "lesson", "summary", "label_en", "confidence", "evidence_status", "scope", "asc", "status", "source", "version", "applies_to", "predicate", "signal", "source_experience", "limitation_notice", "limitations", "limits", "unknowns", "shared"];
 const fields = Object.fromEntries(essential.filter(k => value[k] !== undefined).map(k => [k, value[k]]));
 const core = bytes(fields) <= 3000 ? fields : boundedPreview(fields, 3000);
 return { ...(record(core) && !core.truncated ? core : { id: value.id, confidence: value.confidence, evidence_status: value.evidence_status, partial_fields: core }),
  evidence_summary: evidenceSummary(value), evidence: chosen.map(v => boundedPreview(v, 700)),
  counterevidence: { contradicting: array(value.contradicting).slice(-2).map(v => boundedPreview(v, 150)),
   counterexamples: array(value.counterexamples).slice(-1).map(v => boundedPreview(v, 300)) },
  source_references: { count: array(value.sources).length, latest: array(value.sources).slice(-1).map(v => boundedPreview(v, 700)) },
  history: { supplements: array(value.batch_supplements).length,
   latest: array(value.batch_supplements).slice(-1).map(v => boundedPreview(v, 700)) },
  truncated: true, representation: "consumer_projection", original_bytes: bytes(value),
  omitted_fields: Object.keys(value).filter(k => !essential.includes(k)), evidence_selection: "latest_array_positions_and_largest_external_denominator; contradict_first; no_strength_inference",
  full_document: { tool, input: { ...query, detail: "full", document_id: value.id, document_offset: 0 } } };
}

/** Pagination stops before an unreturned row; it never advances past an oversized match. */
export function consumerPage<T>(options: {
 tool: string; input: Row; rows: T[]; value: (row: T) => Row; present?: (row: T) => Row;
 sources: (rows: T[]) => unknown[]; envelope: Row; defaultLimit?: number;
}): ToolResult {
 const { tool, input, rows, value, envelope } = options;
 const full = input.detail === "full", documentId = input.document_id;
 if (documentId !== undefined && (typeof documentId !== "string" || !documentId.trim() || documentId.length > 200)) throw Error("document_id must contain 1–200 characters");
 if (!full && (documentId !== undefined || input.document_offset !== undefined)) throw Error("document_id/document_offset require detail=full");
 if (full && (!documentId || input.offset || input.limit !== undefined && input.limit !== 1)) throw Error("detail=full requires document_id and offset=0/limit=1 (or omitted)");
 const query = Object.fromEntries(Object.entries(input).filter(([k]) => !["detail", "document_id", "document_offset", "limit", "offset"].includes(k)));
 const offset = Number(input.offset ?? 0), limit = Number(input.limit ?? options.defaultLimit ?? 12);
 const selected = full ? rows.filter(r => value(r).id === documentId) : rows;
 const source = (kept: T[]) => {
  const all = options.sources(kept), result: unknown[] = [];
  for (const s of all) {
   const identity = ["source", "character", "file", "path", "entry_id", "version", "knowledge_version", "revision", "sha256", "item_sha256", "confidence", "evidence_status"];
   const view = !record(s) || bytes(s) <= 1800 ? s : {
    ...Object.fromEntries(identity.filter(k => s[k] !== undefined).map(k => [k, s[k]])), details: boundedPreview(s, 900), truncated: true };
   if (bytes([...result, view]) > 6000) {
    result.push({ truncated: true, omitted_source_records: all.length - result.length, notice: "来源明细见完整原条目；本响应未读全" }); break;
   }
   result.push(view);
  }
  return result;
 };
 if (full && selected.length) {
  if (selected.length !== 1) throw Error("document_id is ambiguous within this scope");
  const row = selected[0]!, raw = JSON.stringify(value(row));
  const parts: string[] = []; let part = "", size = 0;
  for (const char of raw) {
   const n = bytes(char) - 2;
   if (size + n > 9000) { parts.push(part); part = ""; size = 0; }
   part += char; size += n;
  }
  parts.push(part);
  const start = Number(input.document_offset ?? 0);
  if (start >= parts.length) throw Error("document_offset is outside this document");
  const text = JSON.stringify({ ...envelope, entries: [{ id: documentId }], sources: source([row]), returned: 1, truncated: parts.length > 1,
   representation: "full_document_fragment", document_id: documentId, document_sha256: createHash("sha256").update(raw).digest("hex"),
   encoding: "concatenated-json", json_fragment: parts[start], document_offset: start, total_document_parts: parts.length,
   next_document_offset: start + 1 < parts.length ? start + 1 : null, next_offset: null });
  if (Buffer.byteLength(text) > KNOWLEDGE_RESPONSE_BYTES) throw Error("knowledge document metadata exceeds 24KB");
  return { text };
 }
 const kept: T[] = [], entries: Row[] = []; let cursor = Math.min(offset, selected.length);
 const render = () => JSON.stringify({ ...envelope, entries, sources: source(kept), total_matches: selected.length,
  offset, returned: entries.length, omitted: selected.length - entries.length, pagination_empty: selected.length > 0 && offset >= selected.length,
  next_offset: cursor < selected.length ? cursor : null, oversized_skipped: 0,
  truncated: entries.some(e => e.truncated === true), sources_truncated: source(kept).some(s => record(s) && s.truncated === true), projection_notice: PROJECTION_NOTICE });
 while (cursor < selected.length && kept.length < limit) {
  const row = selected[cursor]!;
  kept.push(row); entries.push(consumerProjection((options.present ?? value)(row), tool, query)); cursor++;
  if (Buffer.byteLength(render()) > KNOWLEDGE_RESPONSE_BYTES) { kept.pop(); entries.pop(); cursor--; break; }
 }
 const text = render();
 if (Buffer.byteLength(text) > KNOWLEDGE_RESPONSE_BYTES || cursor < selected.length && !kept.length) throw Error("knowledge projection metadata exceeds 24KB; no matches skipped");
 return { text };
}

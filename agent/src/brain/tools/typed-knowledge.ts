/** Runtime-only indexed adapters. Legacy inputs and dynamic selectors remain authoritative. */
import { knowledgeCharacter } from "../../knowledge/files.js";
import { indexedKnowledge, type IndexedItem, type KnowledgeReader } from "../../knowledge/runtime/reader.js";
import { TOPICS, type BusinessType } from "../../knowledge/runtime/projection.js";
import { appliesAt, themeOf } from "../../knowledge/render/experience-text.js";
import type { ExperienceEntry } from "../../knowledge/experience.js";
import { questionTypes, retrieveStrategies, strategyEvidenceSummary, type StrategyEntry } from "../../knowledge/strategy-entries.js";
import { matchStrategyArchetype } from "../../knowledge/strategy-archetypes.js";
import { questionFacts, selectRelevantExperience } from "./query-guidance.js";
import { constructionTypes } from "./reflex-knowledge.js";
import { validateInput } from "./validate.js";
import type { JsonSchema, ToolContext, ToolDef, ToolResult } from "./types.js";

const filters: Record<string, JsonSchema> = {
 entity: { type: "string", description: "可选实体ID、中文名或明确别名" },
 topic: { type: "string", enum: [...TOPICS], description: "只匹配明确主题标注；未分类不当作无关知识" },
};
const paging: Record<string, JsonSchema> = {
 limit: { type: "integer", minimum: 1, maximum: 12 }, offset: { type: "integer", minimum: 0, maximum: 1000000 },
};
const types: Record<string, BusinessType> = { kb_experience: "experience", kb_strategies: "strategy", kb_reflex: "reflex", kb_open_book: "fact",
 kb_build_cores: "core", kb_build_combos: "combo", kb_vocab: "vocab" };

function runIndexed(tool: ToolDef, input: Record<string, unknown>, ctx: ToolContext, reader: KnowledgeReader): ToolResult {
 const type = types[tool.name]!, query = String(input["query"] ?? "*").trim();
 for (const key of ["entity", "keyword", "id"])
  if (input[key] !== undefined && (typeof input[key] !== "string" || !(input[key] as string).trim() || (input[key] as string).length > 200)) throw new Error(`${key} must contain 1–200 characters`);
 if (!query || query.length > 200) throw new Error("query must contain 1–200 characters");
 if (type === "experience" && !["theme", "id", "keyword", "relevant", "entity", "topic"].some(k => input[k])) throw new Error("请提供 theme、id、keyword、relevant=true、entity 或 topic。");
 const items = reader.all({ type, character: knowledgeCharacter(), ascension: ctx.ascension, view: "tool",
  ...(query !== "*" ? { text: query } : {}),
  ...(input["id"] ? { id: String(input["id"]) } : {}),
  ...(type === "experience" && input["keyword"] ? { text: String(input["keyword"]) } : {}),
  ...(input["entity"] ? { entity: String(input["entity"]) } : {}),
  ...(input["topic"] ? { topic: String(input["topic"]) } : {}),
  ...(type === "fact" && input["category"] ? { category: String(input["category"]) } : {}),
  ...(type === "strategy" ? { questions: questionTypes(ctx.label ?? "", ctx.payload) } : {}),
 });
 let selected = items, archetype: ReturnType<typeof matchStrategyArchetype> | undefined;
 const construction = type === "reflex" ? constructionTypes(ctx) : null;
 if (type === "experience") {
  const candidates = items.map(e => e.value) as ExperienceEntry[];
  const entries = (input["relevant"] === true ? selectRelevantExperience(ctx, candidates) : candidates).filter(e => appliesAt(e, ctx.ascension)
   && (!input["theme"] || themeOf(e.scope) === input["theme"]) && (!input["id"] || e.id === input["id"])
   && (!input["keyword"] || JSON.stringify(e).includes(String(input["keyword"]))));
  const positions = new Map(entries.map((e, i) => [e, i])); selected = items.filter(e => positions.has(e.value as ExperienceEntry)).sort((a, b) => positions.get(a.value as ExperienceEntry)! - positions.get(b.value as ExperienceEntry)!);
 } else if (type === "strategy") {
  const entries = items.map(e => e.value) as StrategyEntry[];
  archetype = entries.some(e => e.trigger.archetype) ? matchStrategyArchetype(ctx) : undefined;
  const matched = retrieveStrategies({ schema: "brain-strategies-v1", character: "silent", entries }, ctx.label ?? "", { ...(ctx.payload as object), facts: questionFacts(ctx) }, archetype?.match);
  const positions = new Map(matched.map((e, i) => [e.id, i]));
  selected = items.filter(e => positions.has(e.original_id)).sort((a, b) => positions.get(a.original_id)! - positions.get(b.original_id)!);
  // Preserve the existing evidence projection, which includes full external metadata and limits.
  selected = selected.map(e => ({ ...e, value: matched[positions.get(e.original_id)!]! }));
 } else if (type === "reflex") selected = items.filter(e => (!construction || construction.includes(e.value.applies_to))
  && (!input["applies_to"] || e.value.applies_to === input["applies_to"]));
 const offset = Number(input["offset"] ?? 0), limit = Number(input["limit"] ?? (type === "strategy" ? 3 : 12));
 const kept: IndexedItem[] = []; let cursor = Math.min(offset, selected.length), oversized = 0;
 const present = (e: IndexedItem) => type === "core" ? { id: e.original_id, direction: e.value.direction, name: e.value.name, status: e.value.status,
  scope: e.value.scope, combos: e.value.combos.map((c: Record<string, unknown>) => ({ id: c["id"], confidence: c["confidence"] })),
  linked_experience: e.value.linked_experience, linked_reflex: e.value.linked_reflex, evidence_relation: "combos", representation: "core_summary",
  omitted_fields: ["card_pool", "pivot_signals", "failure_modes", "combos.*"] }
  : type === "combo" ? { id: e.original_id, core_id: e.parent_id, types: e.value.types, boss: e.value.boss, cards: e.value.cards,
    prerequisites: e.value.prerequisites, evidence: e.value.evidence, confidence: e.value.confidence, linked_experience: e.value.linked_experience,
    fits: e.value.fits, representation: "combo_summary", omitted_fields: ["metrics"] }
  : type === "reflex" && construction ? { id: e.value.id, version: e.value.version,
  applies_to: e.value.applies_to, summary: e.value.label_en, confidence: e.value.confidence, evidence: e.value.evidence, source_experience: e.value.source_experience } : e.value;
 const serialize = (rows: IndexedItem[], next: number, skipped: number) => JSON.stringify({
  schema: type === "reflex" ? "brain-reflex-result-v2" : "brain-knowledge-result-v1", status: type === "reflex" ? "loaded" : "ok",
  knowledge_version: reader.version, entries: rows.map(present), sources: [
   ...reader.sources(rows), ...rows.flatMap(e => type === "strategy" ? [{ entry_id: e.original_id, source: e.value.source, version: e.value.version, ...strategyEvidenceSummary(e.value as StrategyEntry) }] : []),
   ...rows.flatMap(e => type === "fact" ? factSources(reader, e) : []),
  ],
  total_matches: selected.length, offset, returned: rows.length, omitted: selected.length - rows.length,
  next_offset: next < selected.length ? next : null, oversized_skipped: skipped,
  ...(archetype ? { archetype } : {}), ...(type === "reflex" ? { representation: construction ? "construction_summary" : "full_entry", predicate_evaluation: "not_evaluated" } : {}),
  evidence_scope: "原角色与公共范围分账；检索不证明条件成立、自然采用或收益；未知主题保持未知。",
 });
 while (cursor < selected.length && kept.length < limit) {
  const next = selected[cursor]!;
  if (Buffer.byteLength(serialize([...kept, next], cursor + 1, oversized)) <= 24000) { kept.push(next); cursor++; }
  else if (!kept.length) { oversized++; cursor++; }
  else break;
 }
 const text = serialize(kept, cursor, oversized);
 if (Buffer.byteLength(text) > 24000) throw new Error("知识来源元数据超过24KB");
 return { text, ...(!kept.length && oversized ? { isError: true } : {}) };
}

/** Source documents are immutable; cache only the manifest, keyed by the bound version and path. */
const factMetadata = new WeakMap<KnowledgeReader, Map<string, Record<string, any>>>();
function factSources(reader: KnowledgeReader, item: IndexedItem): unknown[] {
 let cache = factMetadata.get(reader); if (!cache) { cache = new Map(); factMetadata.set(reader, cache); }
 let meta = cache.get(item.path);
 if (!meta) {
  const row = reader.db.prepare("SELECT json_extract(d.body,'$.sources') AS sources FROM release_files f JOIN documents d ON d.digest=f.digest WHERE f.version=? AND f.path=?").get(reader.version, item.path);
  meta = JSON.parse(String(row?.["sources"] ?? "{}")) as Record<string, any>; cache.set(item.path, meta);
 }
 return [{ ...meta, sources: Object.fromEntries((item.value.provenance as string[]).map(k => [k, meta!.sources?.[k]])) }];
}

export function typedKnowledgeTool(original: ToolDef): ToolDef {
 if (!types[original.name]) return original;
 const inputSchema = { ...original.inputSchema, properties: { ...original.inputSchema.properties, ...filters,
  ...(original.name !== "kb_strategies" ? paging : {}) } };
 return { ...original, inputSchema, description: `${original.description} SQLite绑定时直查类型索引，可用entity/topic缩小范围；next_offset继续。`,
  async run(input, ctx) {
   const errors = validateInput(inputSchema, input);
   if (errors.length) return { text: errors.join("; "), isError: true };
   try {
    const reader = indexedKnowledge(ctx.knowledgeDir);
    if (reader) return runIndexed(original, input, ctx, reader);
    // Optional indexed selectors cannot silently disappear on a legacy file source.
    if (["entity", "topic", "limit", "offset"].some(k => input[k] !== undefined && !(k in (original.inputSchema.properties ?? {})))) return { text: "类型筛选需要绑定的SQLite知识版本", isError: true };
    return original.run(input, ctx);
   } catch (error) { return { text: JSON.stringify({ status: "invalid", entries: [], error: error instanceof Error ? error.message : String(error) }), isError: true }; }
  } };
}

export function businessKnowledgeTools(): ToolDef[] {
 return ["kb_build_cores", "kb_build_combos", "kb_vocab"].map(name => ({ name,
  description: "只读查已发布构筑核心/组合或词表原条目，query为ID/关键词或*。保留原证据/反证/限制，candidate状态不等于已验证；不评价动态predicate。",
  inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
  run: () => ({ text: "需要绑定的SQLite知识版本", isError: true }),
 }));
}

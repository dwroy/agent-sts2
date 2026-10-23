/** Production knowledge surface: fixed files and selectors, no logs, SQL, paths or network. */
import { createHash } from "node:crypto";
import { knowledgeCharacter } from "../../knowledge/files.js";
import { loadExperience } from "../../knowledge/experience.js";
import { recordKnowledgeQuerySource, withKnowledgeQuerySources } from "../../knowledge/query-sources.js";
import { KNOWLEDGE_FILES } from "../../knowledge/render/data.js";
import { OLD_SOURCES, OLD_SOURCE_KEYS, type OldSource } from "../../knowledge/render/old-knowledge.js";
import { appliesAt, themeOf } from "../../knowledge/render/experience-text.js";
import { loadOpenBook } from "../../knowledge/open-book.js";
import { selectRelevantExperience, strategyMatches } from "./query-guidance.js";
import { reflexKnowledgeTool } from "./reflex-knowledge.js";
import { externalStatsTools } from "./external-stats-tools.js";
import { knowledgeTools } from "./kb-tools.js";
import { validateInput } from "./validate.js";
import type { ToolContext, ToolDef, ToolResult } from "./types.js";

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const MAX_BYTES = 24_000;
const LIMIT = 12;

function envelope(entries: unknown, sources: unknown[], extra: Record<string, unknown> = {}): ToolResult {
  return { text: JSON.stringify({ schema: "brain-knowledge-result-v1", sources, entries, ...extra }) };
}
function bounded(rows: unknown[], sources: unknown[], extra: Record<string, unknown> = {}): ToolResult {
  const kept: unknown[] = [];
  for (const row of rows.slice(0, LIMIT)) {
    if (Buffer.byteLength(envelope([...kept, row], sources, extra).text) > MAX_BYTES) break;
    kept.push(row);
  }
  const result = envelope(kept, sources, { ...extra, omitted: rows.length - kept.length });
  if (Buffer.byteLength(result.text) > MAX_BYTES) return { ...envelope([], [], { error: "来源元数据超过24KB，请用条目 id 缩小查询" }), isError: true };
  return result;
}
function queryTool(name: string, description: string, lookup: (query: string, ctx: ToolContext, category?: string) => ToolResult, category?: readonly string[]): ToolDef {
  const schema = { type: "object" as const, properties: { query: { type: "string" as const }, ...(category ? { category: { type: "string" as const, enum: [...category] } } : {}) }, required: ["query"], additionalProperties: false };
  return { name, description, inputSchema: schema, run(input, ctx) {
    const problems = validateInput(schema, input);
    if (problems.length) return { text: problems.join("; "), isError: true };
    const query = String(input["query"]).trim();
    if (!query || query.length > 200) return { text: "query must contain 1–200 characters", isError: true };
    return lookup(query, ctx, typeof input["category"] === "string" ? input["category"] : undefined);
  } };
}

/** Content dependencies, keyed by the same selectors and constants as the existing renderers. */
function sourceFiles(tool: string, input: Record<string, unknown>): string[] {
  switch (tool) {
    case "kb_monster": case "kb_encounter": return [KNOWLEDGE_FILES.monsterDb, KNOWLEDGE_FILES.monsterRecords];
    case "kb_experience": return [KNOWLEDGE_FILES.experience, KNOWLEDGE_FILES.sharedExperience];
    case "kb_potion": return ["potion-equivalents.json"];
    case "kb_stats":
      if (input["table"] === "fights") return [KNOWLEDGE_FILES.monsterDb, KNOWLEDGE_FILES.monsterRecords];
      return [input["table"] === "rest" ? KNOWLEDGE_FILES.outcomeStats : KNOWLEDGE_FILES.roomCosts];
    case "kb_old_knowledge":
      return (input["source"] ? [input["source"] as OldSource] : OLD_SOURCE_KEYS).map(key => OLD_SOURCES[key].file);
    default: throw new Error(`unmapped knowledge tool ${tool}`);
  }
}

export function buildKnowledgeTools(_ctx: ToolContext): ToolDef[] {
  const own = knowledgeTools().filter(t => ["kb_monster", "kb_encounter", "kb_stats", "kb_old_knowledge", "kb_potion", "kb_experience"].includes(t.name)).map((original): ToolDef => {
    const tool = original.name === "kb_experience" && knowledgeCharacter() === "silent" ? { ...original,
      description: `${original.description} 本工具查经验，reflex knowledge（rk）请用kb_reflex；relevant=true可取本题相关经验（最多12条，保留来源、置信度、支持与反证），也可按id定查。`,
      inputSchema: { ...original.inputSchema, properties: { ...original.inputSchema.properties, relevant: { type: "boolean" as const, description: "按本题状态匹配经验；可与原有筛选条件同时使用" } } } } : original;
    return {
      ...tool,
      async run(input, ctx) {
        if (validateInput(tool.inputSchema, input).length) return tool.run(input, ctx);
        let selected: unknown = null;
        const audit = await withKnowledgeQuerySources(ctx.knowledgeDir, async () => {
          // These selectors use the renderer's file constants; dynamic fact loaders add their actual dependencies.
          sourceFiles(tool.name, input).forEach(recordKnowledgeQuerySource);
          if (tool.name === "kb_experience") {
            if (![input["theme"], input["id"], input["keyword"], input["relevant"]].some(Boolean)) return { text: "请提供 theme、id、keyword 或 relevant=true。", isError: true };
            selected = (input["relevant"] === true ? selectRelevantExperience(ctx) : loadExperience(ctx.knowledgeDir)).filter(e => appliesAt(e, ctx.ascension)
              && (!input["theme"] || themeOf(e.scope) === input["theme"])
              && (!input["id"] || e.id === input["id"])
              && (!input["keyword"] || JSON.stringify(e).includes(String(input["keyword"]))));
            return { text: JSON.stringify(selected) };
          }
          return tool.run(input, ctx);
        });
        const result = audit.result, sources: unknown[] = audit.sources;
        if (Array.isArray(selected)) for (const entry of selected) if (object(entry) && typeof entry["source"] === "string" && entry["source"].startsWith("external:")) sources.push({ source: entry["source"], character: knowledgeCharacter(), representation: "entry", entry_id: entry["id"], version: String(entry["version"] ?? "unknown"), sha256: sha(JSON.stringify(entry)) });
        if (input["relevant"] === true && Array.isArray(selected)) return bounded(selected, sources, { evidence_scope: "本角色与已发布公共经验；保留条目置信度、来源和反证，其他角色来源不计本角色验证" });
        if (Buffer.byteLength(result.text) > MAX_BYTES) return { ...envelope([], sources, { error: "结果超过24KB，请缩小关键词/进阶/幕范围后查询" }), isError: true };
        return { ...envelope(selected ?? result.text, sources, { evidence_scope: "自有知识；条目内来源/反证保持原样；其他角色来源不计本角色验证" }), ...(result.isError ? { isError: true } : {}) };
      },
    };
  });
  return [...own,
    queryTool("kb_open_book", "查公开开卷机械资料：query 为卡牌/遗物/怪物/事件 ID、中文名或关键词；category 可限类别。返回外部来源、版本、SHA、许可；当前 mod 状态优先，资料不证明模拟支持。最多12项，可细化关键词。", (query, ctx, category) => {
      const library = loadOpenBook(ctx.knowledgeDir);
      const rows = library.entries.filter(e => (!category || e.kind === category) && [e.id, e.name, ...e.aliases].some(s => s.toLowerCase().includes(query.toLowerCase())));
      const provenance = new Set(rows.slice(0, LIMIT).flatMap(e => e.provenance));
      const sources = library.sources.map(s => ({ ...s, ...(object(s["sources"]) ? { sources: Object.fromEntries(Object.entries(s["sources"]).filter(([key]) => provenance.has(key))) } : {}) }));
      return bounded(rows, sources, { source: "external:spire-codex", game_version: "v0.111.0", character_scope: "公共机械资料，不是本角色对局验证" });
    }, ["cards", "relics", "monsters", "events"]),
    queryTool("kb_strategies", knowledgeCharacter() !== "silent" ? "查本角色已发布策略库（按本题状态匹配触发条件），query 为关键词或 *。空库返回空，保留自有/外部来源、证据和限制。" : "按本题非空线索与需要查本角色已发布策略库（按本题状态匹配触发条件），query=* 查本题匹配项，也可用条目 id /关键词。0匹配时跳过；空库返回空，保留自有/外部来源、置信度、证据和限制。", (query, ctx) => {
      const data = strategyMatches(ctx);
      const rows = data.entries.filter(e => query === "*" || `${e.id} ${e.strategy}`.includes(query));
      return bounded(rows, [...data.sources, ...rows.map(e => ({ source: e.source, version: e.version, evidence: e.evidence, provenance: e.provenance ?? null })), ...rows.flatMap(e => e.evidence.map(ev => ev.type === "external_aggregate"
        ? { source: ev.source, version: ev.version, dataset_sha256: ev.dataset_sha256, denominator: ev.denominator }
        : { source: "own", version: e.version }))], { status: data.status, ...(data.library_sha256 ? { library_sha256: data.library_sha256 } : {}) });
    }),
    ...(knowledgeCharacter() === "silent" ? [reflexKnowledgeTool()] : []),
    ...externalStatsTools(),
  ];
}

/** Production knowledge surface: fixed files and selectors, no logs, SQL, paths or network. */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { knowledgeCharacter, knowledgeFile } from "../../knowledge/files.js";
import { loadExperience } from "../../knowledge/experience.js";
import { appliesAt, themeOf } from "../../knowledge/render/experience-text.js";
import { loadOpenBook } from "../../knowledge/open-book.js";
import { parseStrategyLibrary, retrieveStrategies } from "../../knowledge/strategy-entries.js";
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
function read(path: string): { value: Record<string, unknown>; sha256: string } {
  if (statSync(path).size > 10_000_000) throw new Error("knowledge file exceeds 10 MB");
  const text = readFileSync(path, "utf8"), value: unknown = JSON.parse(text);
  if (!object(value)) throw new Error("knowledge file is not an object");
  return { value, sha256: sha(text) };
}
function bounded(rows: unknown[], sources: unknown[], extra: Record<string, unknown> = {}): ToolResult {
  const kept: unknown[] = [];
  for (const row of rows.slice(0, LIMIT)) {
    if (Buffer.byteLength(envelope([...kept, row], sources, extra).text) > MAX_BYTES) break;
    kept.push(row);
  }
  return envelope(kept, sources, { ...extra, omitted: rows.length - kept.length });
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

export function buildKnowledgeTools(_ctx: ToolContext): ToolDef[] {
  const own = knowledgeTools().filter(t => ["kb_monster", "kb_encounter", "kb_stats", "kb_old_knowledge", "kb_potion", "kb_experience"].includes(t.name)).map((tool): ToolDef => ({
    ...tool,
    async run(input, ctx) {
      let result: ToolResult;
      let selected: unknown = null;
      if (tool.name === "kb_experience") {
        const problems = validateInput(tool.inputSchema, input);
        if (problems.length || ![input["theme"], input["id"], input["keyword"]].some(Boolean)) return { text: "请提供 theme、id 或 keyword；其他参数不接受。", isError: true };
        selected = loadExperience(ctx.knowledgeDir).filter(e => appliesAt(e, ctx.ascension)
          && (!input["theme"] || themeOf(e.scope) === input["theme"])
          && (!input["id"] || e.id === input["id"])
          && (!input["keyword"] || JSON.stringify(e).includes(String(input["keyword"]))));
        result = { text: JSON.stringify(selected) };
      } else result = await tool.run(input, ctx);
      // Hash the applicable published files, preserving original text/evidence rather than relabelling external entries.
      const names = tool.name === "kb_monster" || tool.name === "kb_encounter" ? ["monster-db.json", "monster-records.json"] : tool.name === "kb_experience" ? ["experience.json", "shared-experience.json"] : tool.name === "kb_potion" ? ["potion-equivalents.json"] : tool.name === "kb_stats" ? ["room-costs.json", "outcome-stats.json"] : [`${knowledgeCharacter()}-guide.md`, "ds-handbook.md", "jev-hints.md"];
      const sources = names.flatMap(name => {
        try { const text = readFileSync(knowledgeFile(ctx.knowledgeDir, name), "utf8"); let version = "unknown";
          try { const v = JSON.parse(text); version = String(v.version ?? v.schema ?? "unknown"); } catch { /* Prose retains its file hash. */ }
          return [{ source: "own", character: knowledgeCharacter(), file: name, version, sha256: sha(text) }];
        } catch { return []; }
      });
      if (Array.isArray(selected)) for (const entry of selected) if (object(entry) && typeof entry["source"] === "string" && entry["source"].startsWith("external:")) sources.push({ source: entry["source"], character: knowledgeCharacter(), file: "experience.json", version: String(entry["version"] ?? "unknown"), sha256: sha(JSON.stringify(entry)) });
      if (Buffer.byteLength(result.text) > MAX_BYTES) return { ...envelope([], sources, { error: "结果超过24KB，请缩小关键词/进阶/幕范围后查询" }), isError: true };
      return { ...envelope(selected ?? result.text, sources, { evidence_scope: "自有知识；条目内来源/反证保持原样；其他角色来源不计本角色验证" }), ...(result.isError ? { isError: true } : {}) };
    },
  }));
  return [...own,
    queryTool("kb_open_book", "查公开开卷机械资料：query 为卡牌/遗物/怪物/事件 ID、中文名或关键词；category 可限类别。返回外部来源、版本、SHA、许可；当前 mod 状态优先，资料不证明模拟支持。最多12项，可细化关键词。", (query, ctx, category) => {
      const library = loadOpenBook(ctx.knowledgeDir);
      const rows = library.entries.filter(e => (!category || e.kind === category) && [e.id, e.name, ...e.aliases].some(s => s.toLowerCase().includes(query.toLowerCase())));
      const provenance = new Set(rows.slice(0, LIMIT).flatMap(e => e.provenance));
      const sources = library.sources.map(s => ({ ...s, ...(object(s["sources"]) ? { sources: Object.fromEntries(Object.entries(s["sources"]).filter(([key]) => provenance.has(key))) } : {}) }));
      return bounded(rows, sources, { source: "external:spire-codex", game_version: "v0.111.0", character_scope: "公共机械资料，不是本角色对局验证" });
    }, ["cards", "relics", "monsters", "events"]),
    queryTool("kb_strategies", "查本角色已发布策略库（按本题状态匹配触发条件），query 为关键词或 *。空库返回空，保留自有/外部来源、证据和限制。", (query, ctx) => {
      if (knowledgeCharacter() !== "silent") return envelope([], [], { status: "empty" });
      let data: ReturnType<typeof read>;
      try { data = read(knowledgeFile(ctx.knowledgeDir, "strategy-entries.json")); } catch { return envelope([], [], { status: "missing" }); }
      const library = parseStrategyLibrary(data.value);
      const rows = retrieveStrategies(library, ctx.label ?? "", ctx.payload).filter(e => query === "*" || `${e.id} ${e.strategy}`.includes(query));
      return bounded(rows, rows.map(e => ({ source: e.source, version: e.version, evidence: e.evidence, provenance: e.provenance ?? null })), { library_sha256: data.sha256 });
    }),
    ...externalStatsTools(),
  ];
}

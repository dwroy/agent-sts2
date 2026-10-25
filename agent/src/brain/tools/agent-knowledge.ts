import { buildResearchTool } from "./build-research.js";
import { indexedKnowledge } from "../../knowledge/runtime/reader.js";
/** Production knowledge surface: fixed files and selectors, no logs, SQL, paths or network. */
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { knowledgeCharacter } from "../../knowledge/files.js";
import { loadExperience } from "../../knowledge/experience.js";
import { recordKnowledgeQuerySource, withKnowledgeQuerySources } from "../../knowledge/query-sources.js";
import { KNOWLEDGE_FILES } from "../../knowledge/render/data.js";
import { OLD_SOURCES, OLD_SOURCE_KEYS, type OldSource } from "../../knowledge/render/old-knowledge.js";
import { appliesAt, themeOf } from "../../knowledge/render/experience-text.js";
import { loadOpenBook } from "../../knowledge/open-book.js";
import { selectRelevantExperience } from "./query-guidance.js";
import { strategyTool } from "./strategy-tool.js";
import { reflexKnowledgeTool } from "./reflex-knowledge.js";
import { externalStatsTools } from "./external-stats-tools.js";
import { businessKnowledgeTools, typedKnowledgeTool } from "./typed-knowledge.js";
import { runtimeKnowledgeRoot } from "../../knowledge/runtime-paths.js";
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

/** Uses live in the authoritative ToolDef.description, shared by the prompt and every tool host. */
const PLANNING_USES: Record<string, string> = {
  kb_monster: "用途：理解启动窗口、敌人机制和本幕Boss压力，判断备战需求。",
  kb_encounter: "用途：根据自有遭遇失血与回合，评估本幕Boss及爬楼路线风险。",
  kb_experience: "用途：核对启动与过渡、费用/抽牌/防护、构筑、成长输出、持续防御及连续双Boss资源判断；保留支持、反证与未知。",
  kb_stats: "用途：比较爬楼路线、房间代价、休息回血/升级和资源安排。",
  kb_old_knowledge: "用途：查旧攻略背景，与当前对局证据及公开来源分清。",
  kb_potion: "用途：用药、Boss备战和连续两战资源取舍；不直接计算完整双Boss胜率。",
  kb_open_book: "用途：理解拿牌、删牌、升级、商店和事件选项的机械效果。",
  kb_strategies: "用途：查已发布的启动、过渡、构筑方向、本幕Boss、最终双Boss、路线和资源策略；未知达标线保持未知。",
  kb_reflex: "用途：查看局部打法与构筑联系，辅助拿牌、商店、休息及备战。",
  external_stats_card: "用途：拿牌比较的外部选择背景。",
  external_stats_skip: "用途：拿/跳牌的外部背景比较。",
  external_stats_deck_size: "用途：理解牌组规模与结局关联，保留存活偏差。",
  external_stats_encounter: "用途：了解外部Boss及路线风险的受伤、回合和死亡分布。",
  external_stats_clusters: "用途：构筑样本背景；簇不等于已验证流派。",
  external_stats_cooccurrence: "用途：组合样本背景；共现不等于收益或已验证构筑方向。",
};

export function buildKnowledgeTools(_ctx: ToolContext): ToolDef[] {
  // Legacy tools report migration errors at call time; building their catalog must remain possible.
  const research = (): ToolDef[] => {
    if (knowledgeCharacter() !== "silent") return [];
    try { return (indexedKnowledge(_ctx.knowledgeDir)?.schema ?? 0) >= 4 ? [buildResearchTool()] : []; }
    catch { return []; }
  };
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
  const tools = [...own,
    queryTool("kb_open_book", "查公开开卷机械资料：query 为卡牌/遗物/怪物/事件 ID、中文名或关键词；category 可限类别。返回外部来源、版本、SHA、许可；当前 mod 状态优先，资料不证明模拟支持。最多12项，可细化关键词。", (query, ctx, category) => {
      const library = loadOpenBook(ctx.knowledgeDir);
      const rows = library.entries.filter(e => (!category || e.kind === category) && [e.id, e.name, ...e.aliases].some(s => s.toLowerCase().includes(query.toLowerCase())));
      const provenance = new Set(rows.slice(0, LIMIT).flatMap(e => e.provenance));
      const sources = library.sources.map(s => ({ ...s, ...(object(s["sources"]) ? { sources: Object.fromEntries(Object.entries(s["sources"]).filter(([key]) => provenance.has(key))) } : {}) }));
      return bounded(rows, sources, { source: "external:spire-codex", game_version: "v0.111.0", character_scope: "公共机械资料，不是本角色对局验证" });
    }, ["cards", "relics", "monsters", "events"]),
    knowledgeCharacter() === "silent" ? strategyTool() : queryTool("kb_strategies", "查本角色已发布策略库（按本题状态匹配触发条件），query 为关键词或 *。空库返回空，保留自有/外部来源、证据和限制。", () => bounded([], [], { status: "empty" })),
    ...(knowledgeCharacter() === "silent" ? [reflexKnowledgeTool()] : []),
    ...externalStatsTools(),
    ...(/\/snapshots\/K1-[a-f0-9]{64}$/.test(resolve(runtimeKnowledgeRoot(_ctx.knowledgeDir))) ? [...businessKnowledgeTools(), ...research()] : []),
  ];
  return tools.map(typedKnowledgeTool).map(tool => ({ ...tool, description: `${tool.description} ${PLANNING_USES[tool.name] ?? ""}`.trim() }));
}

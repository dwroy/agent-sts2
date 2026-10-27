/** Query cues contain identities only; all lesson/strategy content stays behind read-only tools. */
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { knowledgeCharacter, knowledgeFile } from "../../knowledge/files.js";
import { loadExperience, offeredOn, relevance, type SliceInput, type ExperienceEntry } from "../../knowledge/experience.js";
import { indexedKnowledge } from "../../knowledge/runtime/reader.js";
import { actThreatIds } from "../../knowledge/monster-db.js";
import { parseStrategyLibrary, questionTypes, retrieveStrategies, STRATEGY_LIMITS } from "../../knowledge/strategy-entries.js";
import { matchStrategyArchetype } from "../../knowledge/strategy-archetypes.js";
import { recordKnowledgeQuerySource, withKnowledgeQuerySources } from "../../knowledge/query-sources.js";
import type { GameState } from "../../hand/mod/schema.js";
import type { BrainRequest, ToolCallRecord } from "../types.js";
import type { ToolContext } from "./types.js";
import { externalStatsQueryHints } from "./external-stats-tools.js";

const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const CUE_LIMIT = 6;
const identity = (v: string) => Array.from(v).slice(0, 100).join("");

export function questionFacts(ctx: ToolContext): Record<string, unknown> {
  const p = record(ctx.payload), rawRun = record(record(ctx.state)["run"]);
  const contexts = [record(p["facts"]), p, record(p["run_state"]), record(p["run_plan_task"]), record(p["run_brief"])];
  const get = (key: string) => contexts.map(c => c[key]).find(v => v !== undefined && v !== null);
  return { ...record(p["facts"]),
    act: get("act") ?? ctx.act ?? (rawRun["act_id"] === undefined ? undefined : Number(rawRun["act_id"]) + 1),
    act_boss: get("act_boss") ?? get("boss") ?? rawRun["boss_id"],
    floor: get("floor") ?? rawRun["floor"],
    deck: get("deck") ?? rawRun["deck"],
    deck_size: get("deck_size") ?? (Array.isArray(rawRun["deck"]) ? rawRun["deck"].length : undefined) };
}

/** Read-only kb_strategies selector. Missing and invalid libraries stay explicit. */
export function strategyMatches(ctx: ToolContext) {
  if (knowledgeCharacter() !== "silent") return { entries: [], sources: [], status: "empty" };
  const reader = indexedKnowledge(ctx.knowledgeDir);
  if (reader) {
    const items = reader.all({ type: "strategy", character: knowledgeCharacter(), ascension: ctx.ascension,
      // Legacy published observations carry explicit route triggers outside the original question index.
      ...(!questionTypes(ctx.label ?? "", ctx.payload).includes("map_route") ? { questions: questionTypes(ctx.label ?? "", ctx.payload) } : {}) });
    const library = { schema: "brain-strategies-v1" as const, character: "silent" as const, entries: items.map(e => e.value) as ReturnType<typeof parseStrategyLibrary>["entries"] };
    const archetype = library.entries.some(e => e.trigger.archetype) ? matchStrategyArchetype(ctx) : undefined;
    return { entries: retrieveStrategies(library, ctx.label ?? "", { ...record(ctx.payload), facts: questionFacts(ctx) }, archetype?.match),
      sources: reader.sources(items), status: "ok", library_sha256: reader.fileDigest(`characters/${knowledgeCharacter()}/strategy-entries.json`), archetype };
  }
  const path = knowledgeFile(ctx.knowledgeDir, "strategy-entries.json");
  let raw: string;
  try {
    if (statSync(path).size > STRATEGY_LIMITS.fileBytes) return { entries: [], sources: [], status: "invalid" };
    raw = readFileSync(path, "utf8");
  } catch { return { entries: [], sources: [], status: "missing" }; }
  const library_sha256 = createHash("sha256").update(raw).digest("hex");
  const sources = [{ source: "own", file: "strategy-entries.json", character: knowledgeCharacter(), library_sha256 }];
  try {
    const library = parseStrategyLibrary(JSON.parse(raw));
    const archetype = library.entries.some(e => e.trigger.archetype) ? matchStrategyArchetype(ctx) : undefined;
    return { entries: retrieveStrategies(library, ctx.label ?? "", { ...record(ctx.payload), facts: questionFacts(ctx) }, archetype?.match), sources, status: "ok", library_sha256, archetype };
  } catch { return { entries: [], sources, status: "invalid", library_sha256 }; }
}

/** Reuse the published experience relevance rules; never infer a new gameplay rule from a cue. */
export function selectRelevantExperience(ctx: ToolContext, candidates?: ExperienceEntry[]) {
  const reader = candidates ? null : indexedKnowledge(ctx.knowledgeDir);
  if (!reader && !candidates) { recordKnowledgeQuerySource("experience.json"); recordKnowledgeQuerySource("shared-experience.json"); }
  const raw = record(ctx.state), p = record(ctx.payload), facts = questionFacts(ctx);
  const act = Number(facts["act"]);
  const offered = offeredOn({ raw } as GameState, ctx.options);
  // Payloads also contain explicit offered/deck entities in display lines rather than raw screen objects.
  const text = JSON.stringify([ctx.payload, ctx.options]);
  const ids = [...new Set(text.match(/[A-Z][A-Z0-9_]+/g) ?? [])];
  for (const key of ["cards", "relics", "potions", "events"] as const) offered[key] = [...new Set([...offered[key], ...ids])];
  offered.text += `\n${text}`;
  const enemies = [p["enemies"], record(raw["combat"])["enemies"]].flatMap(v => Array.isArray(v) ? v : [])
    .filter(e => record(e)["is_alive"] !== false).map(e => String(record(e)["enemy_id"] ?? "")).filter(Boolean);
  const input: SliceInput = { label: ctx.label ?? "", act, asc: ctx.ascension,
    bossId: String(facts["act_boss"] ?? "") || null,
    offered, enemies, threats: act >= 1 && act <= 3 ? actThreatIds(act, ctx.ascension) : [] };
  return (candidates ?? (reader ? reader.all({ type: "experience", character: knowledgeCharacter(), ascension: ctx.ascension }).map(e => e.value) as ExperienceEntry[] : loadExperience(ctx.knowledgeDir))).map(entry => ({ entry, tier: relevance(entry, input) }))
    .filter((v): v is { entry: typeof v.entry; tier: number } => v.tier !== null)
    .sort((a, b) => a.tier - b.tier || a.entry.id.localeCompare(b.entry.id)).map(v => v.entry);
}

export async function experienceMatches(ctx: ToolContext) {
  const reader = indexedKnowledge(ctx.knowledgeDir);
  if (reader) {
    const items = reader.all({ type: "experience", character: knowledgeCharacter(), ascension: ctx.ascension });
    return { result: selectRelevantExperience(ctx, items.map(e => e.value) as ExperienceEntry[]), sources: reader.sources(items) };
  }
  return withKnowledgeQuerySources(ctx.knowledgeDir, async () => selectRelevantExperience(ctx));
}

export function guidanceKind(label: string, payload: unknown): string | null {
  if (label === "fight-plan") return "fight_plan";
  if (label === "map/act-start") return "act_plan";
  const types = questionTypes(label, payload);
  return types.includes("act_plan") ? "act_plan" : types[0] ?? null;
}

export async function attachQueryGuidance(req: BrainRequest): Promise<BrainRequest> {
  if (knowledgeCharacter() !== "silent" || req.knowledge?.mode !== "tools" || !req.toolContext) return req;
  const kind = guidanceKind(req.label, req.payload);
  if (!kind) return req;
  const ctx = { ...req.toolContext, options: req.options };
  let experience: Record<string, unknown>;
  try {
    const { result, sources } = await experienceMatches(ctx);
    const missing = sources.filter(s => ["experience.json", "shared-experience.json"].includes(String(s["file"]))).every(s => s["status"]);
    experience = { status: missing ? "missing" : "ok", count: missing ? null : result.length, entries: result.slice(0, CUE_LIMIT).map(e => ({ id: identity(e.id), ...(e.name ? { title: identity(e.name) } : {}), scope: identity(e.scope) })),
      omitted: Math.max(0, result.length - CUE_LIMIT) };
  } catch { experience = { status: "unavailable", count: null, entries: [] }; }
  const external = externalStatsQueryHints(ctx);
  const strategies = strategyMatches(ctx), strategyCount = strategies.entries.length;
  const strategyHint = strategyCount > 0 ? `\n本题有 ${strategyCount} 条相关策略/剧本可查。` : "";
  const cues = { schema: "brain-query-cues-v3", question_type: kind,
    experience: { ...experience, ...(typeof experience["count"] === "number" && experience["count"] > 0 ? { tool: "kb_experience", input: { relevant: true } } : {}) },
    ...(strategyCount > 0 ? { strategies: { status: strategies.status, count: strategyCount, tool: "kb_strategies", input: { query: "*", limit: 3 } } } : {}),
    ...(external ? { external_stats: external } : {}) };
  return { ...req, question: `${req.question}${strategyHint}\n\n本题经验实际检索匹配数见下；只按非空线索及需要查询，0匹配/缺失/错误跳过，直接用已有信息作答。外部统计线索仅供任选；主题仅筛明确标签，unknown不是库中没有知识，覆盖计数不当适用知识；不自动拓宽或重试刷库。构筑与爬楼路线分别判断，路线不变继续复用，不因分类更新重算。\n${JSON.stringify(cues)}` };
}

/** Only successful, actually returned entries count as hits; cues and model prose never count. */
export function queryAudit(calls: ToolCallRecord[]) {
  const summarize = (name: string) => {
    const selected = calls.filter(c => c.name === name);
    const ids = new Set<string>();
    let hitCalls = 0, unknownHitCalls = 0;
    for (const call of selected) {
      if (call.isError) continue;
      try {
        const entries = record(JSON.parse(call.output))["entries"];
        if (!Array.isArray(entries)) { unknownHitCalls += 1; continue; }
        const found = Array.isArray(entries) ? entries.flatMap(e => typeof record(e)["id"] === "string" ? [String(record(e)["id"])] : []) : [];
        if (found.length) hitCalls += 1;
        found.forEach(id => ids.add(id));
      } catch { unknownHitCalls += 1; }
    }
    return { queried: selected.length > 0, calls: selected.length, hit_calls: hitCalls, unknown_hit_calls: unknownHitCalls, hit_ids: [...ids].sort() };
  };
  return { schema: "brain-query-audit-v2", strategies: summarize("kb_strategies"), rk: summarize("kb_reflex"), experience: summarize("kb_experience") };
}

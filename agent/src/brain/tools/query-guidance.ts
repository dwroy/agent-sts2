/** Query cues contain identities only; all lesson/strategy content stays behind read-only tools. */
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { knowledgeCharacter, knowledgeFile } from "../../knowledge/files.js";
import { loadExperience, offeredOn, relevance, type SliceInput } from "../../knowledge/experience.js";
import { actThreatIds } from "../../knowledge/monster-db.js";
import { parseStrategyLibrary, questionTypes, retrieveStrategies, STRATEGY_LIMITS } from "../../knowledge/strategy-entries.js";
import { recordKnowledgeQuerySource, withKnowledgeQuerySources } from "../../knowledge/query-sources.js";
import type { GameState } from "../../hand/mod/schema.js";
import type { BrainRequest, ToolCallRecord } from "../types.js";
import type { ToolContext } from "./types.js";
import { reflexMatches } from "./reflex-knowledge.js";

const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const CUE_LIMIT = 6;
const identity = (v: string) => Array.from(v).slice(0, 100).join("");

function questionFacts(ctx: ToolContext): Record<string, unknown> {
  const p = record(ctx.payload), rawRun = record(record(ctx.state)["run"]);
  const contexts = [record(p["facts"]), p, record(p["run_state"]), record(p["run_plan_task"]), record(p["run_brief"])];
  const get = (key: string) => contexts.map(c => c[key]).find(v => v !== undefined && v !== null);
  return { ...record(p["facts"]),
    act: get("act") ?? ctx.act ?? (rawRun["act_id"] === undefined ? undefined : Number(rawRun["act_id"]) + 1),
    act_boss: get("act_boss") ?? get("boss") ?? rawRun["boss_id"],
    floor: get("floor") ?? rawRun["floor"] };
}

/** The same selector powers both the cue and kb_strategies. Missing and invalid libraries stay explicit. */
export function strategyMatches(ctx: ToolContext) {
  if (knowledgeCharacter() !== "silent") return { entries: [], sources: [], status: "empty" };
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
    return { entries: retrieveStrategies(library, ctx.label ?? "", { ...record(ctx.payload), facts: questionFacts(ctx) }), sources, status: "ok", library_sha256 };
  } catch { return { entries: [], sources, status: "invalid", library_sha256 }; }
}

/** Reuse the published experience relevance rules; never infer a new gameplay rule from a cue. */
export function selectRelevantExperience(ctx: ToolContext) {
  recordKnowledgeQuerySource("experience.json");
  recordKnowledgeQuerySource("shared-experience.json");
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
  return loadExperience(ctx.knowledgeDir).map(entry => ({ entry, tier: relevance(entry, input) }))
    .filter((v): v is { entry: typeof v.entry; tier: number } => v.tier !== null)
    .sort((a, b) => a.tier - b.tier || a.entry.id.localeCompare(b.entry.id)).map(v => v.entry);
}

export async function experienceMatches(ctx: ToolContext) {
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
  const strategies = strategyMatches(ctx);
  let experience: Record<string, unknown>;
  try {
    const { result, sources } = await experienceMatches(ctx);
    const missing = sources.filter(s => ["experience.json", "shared-experience.json"].includes(String(s["file"]))).every(s => s["status"]);
    experience = { status: missing ? "missing" : "ok", count: missing ? null : result.length, entries: result.slice(0, CUE_LIMIT).map(e => ({ id: identity(e.id), ...(e.name ? { title: identity(e.name) } : {}), scope: identity(e.scope) })),
      omitted: Math.max(0, result.length - CUE_LIMIT) };
  } catch { experience = { status: "unavailable", count: null, entries: [] }; }
  const reflex = reflexMatches(ctx);
  const p = record(ctx.payload), raw = record(ctx.state);
  const enemies = [p["enemies"], record(raw["combat"])["enemies"]].flatMap(v => Array.isArray(v) ? v : [])
    .map(e => record(e)["enemy_id"]).filter((id): id is string => typeof id === "string");
  const act = Number(questionFacts(ctx)["act"]);
  const threats = await withKnowledgeQuerySources(ctx.knowledgeDir, async () => act >= 1 && act <= 3 ? actThreatIds(act, ctx.ascension) : [])
    .catch(() => ({ result: [] as string[], sources: [] }));
  const entities = [...new Set([questionFacts(ctx)["act_boss"], ...enemies, ...threats.result].filter((id): id is string => typeof id === "string" && !!id))];
  const cues = { schema: "brain-query-cues-v2", question_type: kind,
    strategies: { status: strategies.status, count: strategies.status === "invalid" || strategies.status === "missing" ? null : strategies.entries.length,
      entries: strategies.entries.slice(0, CUE_LIMIT).map(e => ({ id: identity(e.id), ...(typeof record(e)["title"] === "string" ? { title: identity(String(record(e)["title"])) } : {}) })),
      omitted: Math.max(0, strategies.entries.length - CUE_LIMIT), tool: "kb_strategies", input: { query: "*" } },
    rk: { status: reflex.status, count: reflex.status === "loaded" ? reflex.entries.length : null,
      entries: reflex.entries.slice(0, CUE_LIMIT).map(e => ({ id: e.id, applies_to: e.applies_to })), omitted: Math.max(0, reflex.entries.length - CUE_LIMIT),
      tool: "kb_reflex", input: { query: "*" },
      entity_queries: entities.slice(0, CUE_LIMIT).map(id => ({ entity: identity(id), count: reflex.status === "loaded" ? reflex.entries.filter(e => JSON.stringify(e).toLowerCase().includes(id.toLowerCase())).length : null, input: { query: id } })) },
    experience: { ...experience, tool: "kb_experience", input: { relevant: true } } };
  return { ...req, question: `${req.question}\n\n作答前先查本题相关策略与 rk（reflex knowledge，小脑记忆）；备战题优先本幕 Boss / 精英及当前敌人。以下仅为检索候选线索，不是正文或predicate成立证明。先调用 kb_strategies 和 kb_reflex，经验另用kb_experience。rk实体计数只是条目文本提及数，不代表当前条件命中或Jev采用；不启用关闭的出牌条目。按返回的来源、可信度及反证判断；空结果/错误或查询预算结束后用已有信息作答，不重试刷空库。\n${JSON.stringify(cues)}` };
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

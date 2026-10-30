/** Default context is an explicit, bounded read of the run's immutable K1 document. */
import { compareGradedStrategies, gradedBodyEligible, strategyGrading } from "../knowledge/strategy-grading.js";
import type { DecisionKnowledgeExposure } from "./decision-knowledge-exposure.js";
import { compactStrategyDecisionView } from "./decision-knowledge-view.js";
import { strategyEvidenceSummary } from "../knowledge/strategy-entries.js";
import { createHash } from "node:crypto";
import type { BrainRequest } from "./types.js";
import type { ToolContext, ToolDef } from "./tools/types.js";
import { validateInput } from "./tools/validate.js";
import { questionFacts } from "./tools/query-guidance.js";
import { indexedKnowledge } from "../knowledge/runtime/reader.js";
import { characterKey, knowledgeCharacter } from "../knowledge/files.js";
import { deckCounts, publishedObservation, retrieveStrategies, type StrategyEntry } from "../knowledge/strategy-entries.js";
import { matchStrategyArchetype } from "../knowledge/strategy-archetypes.js";
import { DECISION_CONTEXT_FILE, parseDecisionContext, type DecisionPoint, type DecisionContextEntry } from "../knowledge/decision-context.js";

export interface DecisionKnowledgeConfig { enabled: boolean; bytes: number }
const record = (v: unknown): Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const array = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const bytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v));
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const NOTICE = "仅已发布知识的有界背景；当前现场优先。formal_trigger_only只验证正式触发，观察原文的额外条件未求值，不是已验证机器规则。观察性关联不作因果、固定规则或已采用；自有/外部分账，各分母不相加。entries保完整结论、条件、分母、反例与限制；references仅ID和标题，不代表已读正文。需要时用kb_decision_context按ID及source续取完整原件。";
const COMPACT_NOTICE = "正文为≤1900字节的固定决策投影：主张与形式触发不截断；关键分母、至多2条反例和限制为摘要，完整证据/额外条件见全文指针。形式触发不证明原条件全成立；自有/外部分账，关联非因果。references仅导航，不代表已读正文。";

/** Only production decision labels; combat card choices never receive construction advice. */
export function decisionPoints(label: string, payload: unknown, state?: unknown): DecisionPoint[] {
  if (label.startsWith("selection/") && record(state)["in_combat"] === true) return [];
  const p = record(payload), plan = record(p["run_plan_task"]), run = record(p["run_state"]);
  const points: DecisionPoint[] = [];
  if (label === "reward/card" || label === "selection/add") points.push("选牌");
  if (label.startsWith("shop/")) points.push("商店");
  if (label === "selection/upgrade") points.push("升级");
  if (label === "selection/remove") points.push("删牌");
  if (label.startsWith("rest/")) points.push("营火");
  const raw = record(state), removal = record(record(raw["shop"])["card_removal"]);
  if (label.startsWith("shop/") && removal["available"] === true && removal["enough_gold"] === true && removal["used"] !== true) points.push("删牌");
  if (label.startsWith("rest/") && array(record(raw["rest"])["options"]).some(o => record(o)["option_id"] === "SMITH" && record(o)["is_enabled"] === true)) points.push("升级");
  if (["map/route", "map/route-plan", "map/route-review"].includes(label)) points.push("路线");
  if (label === "fight-plan" && (record(p["fight_state"])["fight"] ?? p["fight"]) === "boss") points.push("Boss入场");
  if (label.startsWith("event/")) points.push("事件");
  const trigger = plan["trigger"] ?? (label === "run-plan" ? run["trigger"] ?? p["trigger"] : undefined);
  if (trigger === "start") points.push("开局");
  if (trigger === "act" || label === "map/act-start" || label === "event/act-plan") points.push("幕复核");
  return [...new Set(points)];
}

/** Only explicit current offer IDs, never IDs mentioned in descriptions, history or a deck. */
function candidates(ctx: ToolContext, points: DecisionPoint[]): Set<string> {
  const p = record(ctx.payload), state = record(ctx.state), reward = record(state["reward"]), shop = record(state["shop"]);
  const result = new Set<string>();
  const add = (v: unknown): void => {
    const r = record(v);
    for (const key of ["id", "card_id", "relic_id", "potion_id", "option_id"]) if (typeof r[key] === "string") result.add(String(r[key]));
  };
  const groups = ctx.label === "reward/card" ? [reward["card_options"]]
    : ctx.label?.startsWith("selection/") ? [record(state["selection"])["cards"]]
    : ctx.label?.startsWith("shop/") && points.includes("商店") ? [shop["cards"], shop["relics"], shop["potions"], record(p["facts"])["shop_stock"], p["stock"]] : [];
  for (const group of groups) for (const item of Array.isArray(group) ? group : Object.values(record(group))) add(item);
  if (ctx.label?.startsWith("rest/") || ctx.label?.startsWith("shop/")) {
    // One-shot upgrade/removal choices are in the question, never inferred from the whole deck.
    for (const o of Object.values(record(p["options"]))) {
      const f = record(record(o)["facts"]), kind = String(f["kind"] ?? "");
      if (points.includes("商店") || points.includes("升级") && kind === "SMITH" || points.includes("删牌") && kind === "remove") add(f);
    }
    for (const line of points.includes("删牌") ? Object.values(record(p["your_cards"])) : []) {
      if (typeof line !== "string") continue;
      const id = /^(?:CARD\.)?([A-Z][A-Z0-9_]*)(?:\+\d*)?(?=\s|:|$)/.exec(line.trim())?.[1];
      if (id) result.add(id);
    }
  }
  for (const option of Object.values(ctx.options ?? {})) {
    try {
      const o = record(JSON.parse(option ?? "null")), summary = record(o["summary"]), kind = String(summary["kind"] ?? o["kind"] ?? "");
      if (ctx.label?.startsWith("shop/") && !points.includes("商店") && kind !== "remove" || ctx.label?.startsWith("rest/") && kind !== "SMITH") continue;
      add(o); add(summary);
    } catch { /* Prose is not an entity identifier. */ }
  }
  return result;
}

export function selectDecisionContext(entries: DecisionContextEntry[], ctx: ToolContext): DecisionContextEntry[] {
  if (knowledgeCharacter() !== "silent") return [];
  const points = decisionPoints(ctx.label ?? "", ctx.payload, ctx.state);
  const p = record(ctx.payload), fight = record(p["fight_state"]), state = record(ctx.state), run = record(state["run"]);
  const facts = questionFacts({ ...ctx, payload: { ...p, ...fight } });
  const brief = record(p["run_brief"]), givenCharacter = brief["character"] ?? record(p["facts"])["character"] ?? run["character_id"];
  if (typeof givenCharacter === "string" && characterKey(givenCharacter) !== "silent") return [];
  const act = Number(facts["act"]), floor = Number(facts["floor"]);
  const version = state["game_version"] ?? p["game_version"] ?? record(p["facts"])["game_version"];
  const enemies = array(fight["enemies"] ?? p["enemies"]).map(e => record(e)["enemy_id"]).filter((v): v is string => typeof v === "string");
  // Boss-entry identity must come from the current encounter, not the run's earlier boss clock.
  const bosses = points.includes("Boss入场") ? enemies : [facts["act_boss"]].filter((v): v is string => typeof v === "string");
  const deck = deckCounts(facts["deck"]);
  let archetype: ReturnType<typeof matchStrategyArchetype> | undefined;
  return entries.filter(e => {
    const c = e.conditions;
    if (e.status !== "active" || !e.triggers.some(t => points.includes(t)) || !c.ascensions.includes(ctx.ascension)
      || c.acts && !c.acts.includes(act) || c.floors && !c.floors.includes(floor)
      || c.game_versions && !c.game_versions.includes(String(version ?? ""))
      || c.bosses && !c.bosses.some(b => bosses.includes(b) || b.split("+").length === bosses.length && b.split("+").every(id => bosses.includes(id)))
      || c.candidate_ids && !c.candidate_ids.some(id => candidates(ctx, e.triggers.filter(t => points.includes(t))).has(id))
      || c.deck_cards && (!deck || !c.deck_cards.every(d => (deck.get(d.id) ?? 0) >= d.min))) return false;
    if (c.observed && !c.observed.every(o => {
      let found: unknown = { payload: ctx.payload, state: ctx.state };
      for (const key of o.path.split(".")) {
        if (!found || typeof found !== "object" || !Object.hasOwn(found, key)) return false;
        found = (found as Record<string, unknown>)[key];
      }
      // Canonicalize object keys only; arrays preserve their actual observable order.
      const canonical = (v: unknown): string => Array.isArray(v) ? `[${v.map(canonical).join(",")}]`
        : v && typeof v === "object" ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(record(v)[k])}`).join(",")}}` : JSON.stringify(v);
      return canonical(found) === canonical(o.equals);
    })) return false;
    if (c.archetype) {
      archetype ??= matchStrategyArchetype(ctx);
      const match = archetype.match;
      if (!match || match.model_sha256 !== c.archetype.model_sha256 || match.version !== c.archetype.version || !c.archetype.clusters.includes(match.cluster)) return false;
    }
    return true;
  }).sort((a, b) => b.priority - a.priority || Object.keys(b.conditions).length - Object.keys(a.conditions).length || b.confidence - a.confidence || a.id.localeCompare(b.id));
}

/** Complete decision fields, copied verbatim; archived references remain in the scoped full document. */
export function decisionKnowledgeEntryView(value: DecisionContextEntry | StrategyEntry, source: "decision_context" | "strategy_observation" | "strategy"): Record<string, unknown> {
  const fields = ["summary", "rule_candidate", "conditions", "denominators", "counterexamples", "limitations", "conflicts_with", "triggers", "status"];
  const full_document = { tool: "kb_decision_context", input: { detail: "full", source, document_id: value.id, document_offset: 0 } };
  const view = { id: value.id, confidence: value.confidence, source: record(value)["source"], document_source: source, representation: "complete_decision_view", truncated: false, full_document };
  const grade = strategyGrading(value);
  const display = grade ? { grading: grade, evidence_type: grade.evidence_type, summary: grade.summary,
    grading_population: record(value)["grading_population"], grading_limitations: record(value)["grading_limitations"],
    confidence: value.confidence, ...(grade.evidence_type === "机制事实" ? { evidence_notice: "机制事实（已从原件复核）" } : {}) } : {};
  if (source === "strategy") {
    const e = value as StrategyEntry;
    const counterevidence = e.evidence.filter(v => v.role === "contradict");
    const evidenceLimitations = [...new Set(e.evidence.flatMap(v => v.type === "external_aggregate" ? v.limitations : []))];
    return { ...view, ...display, trigger: e.trigger, source: e.source, strategy: e.strategy,
      evidence_summary: strategyEvidenceSummary(e),
      ...(counterevidence.length ? { counterevidence_refs: counterevidence } : {}),
      ...(evidenceLimitations.length ? { evidence_limitations: evidenceLimitations } : {}),
      ...Object.fromEntries(["scope", "denominators", "counterexamples", "contradicting", "n_contradict", "evidence_status", "limitations", "limits", "conflicts_with"].filter(k => Object.hasOwn(e, k)).map(k => [k, record(e)[k]])) };
  }
  if (source === "strategy_observation") {
    const observation = publishedObservation(value as StrategyEntry);
    if (!observation) throw Error("not a published observation");
    return { ...view, ...display, trigger: (value as StrategyEntry).trigger, scope: record(value)["scope"],
      review_observation: Object.fromEntries(fields.filter(k => Object.hasOwn(observation, k)).map(k => [k, observation[k]])),
      condition_evaluation: "not_evaluated", applicability: "formal_trigger_only" };
  }
  const entry = value as DecisionContextEntry;
  return { ...view, dimension: entry.dimension, priority: entry.priority, review_origin: entry.review_origin,
    ...Object.fromEntries(fields.filter(k => Object.hasOwn(entry, k)).map(k => [k, record(entry)[k]])) };
}

/** Titles are navigation labels only; never use a shortened title as an observation body. */
function referenceTitle(value: DecisionContextEntry | StrategyEntry, budget = 120): string {
  const e = record(value), observation = record(e["review_observation"]);
  const original = String(strategyGrading(value)?.summary ?? e["name"] ?? e["summary"] ?? observation["summary"] ?? e["strategy"] ?? value.id);
  const sentence = /^[^。！？\n]*[。！？]?/u.exec(original)?.[0] || original;
  if (bytes(sentence) <= budget) return sentence;
  let title = "";
  for (const char of sentence) {
    if (bytes(title + char + "…") > budget) break;
    title += char;
  }
  return title + "…";
}

export function decisionKnowledgeReference(value: DecisionContextEntry | StrategyEntry, source: "decision_context" | "strategy_observation" | "strategy") {
  return { id: value.id, title: referenceTitle(value), source };
}

function boundSource(ctx: ToolContext) {
  const reader = indexedKnowledge(ctx.knowledgeDir);
  if (!reader) return null;
  const doc = reader.document(DECISION_CONTEXT_FILE);
  const strategyPath = "characters/silent/strategy-entries.json", strategySha = reader.fileDigest(strategyPath);
  return { reader, doc, entries: doc ? parseDecisionContext(JSON.parse(doc.text)).entries : [], strategyPath, strategySha,
    strategies: strategySha ? reader.all({ type: "strategy", character: "silent", ascension: ctx.ascension, view: "tool" }) : [] };
}

type BoundSource = NonNullable<ReturnType<typeof boundSource>>;
interface Match { value: DecisionContextEntry | StrategyEntry; kind: "decision_context" | "strategy_observation" | "strategy"; path: string; sha256: string }
function matching(source: BoundSource, ctx: ToolContext): Match[] {
  const p = record(ctx.payload), state = record(ctx.state), role = record(p["run_brief"])["character"] ?? record(state["run"])["character_id"];
  if (ctx.label?.startsWith("selection/") && state["in_combat"] === true) return [];
  if (knowledgeCharacter() !== "silent" || typeof role === "string" && characterKey(role) !== "silent") return [];
  const direct: Match[] = selectDecisionContext(source.entries, ctx).map(value => ({ value, kind: "decision_context", path: DECISION_CONTEXT_FILE, sha256: source.doc!.sha256 }));
  const candidates = source.strategies.filter(e => {
    const scope = record(e.value["scope"]);
    return (typeof scope["character"] !== "string" || characterKey(scope["character"]) === "silent")
      && (!Array.isArray(scope["ascensions"]) || scope["ascensions"].includes(ctx.ascension));
  });
  const fight = record(p["fight_state"]), facts = questionFacts({ ...ctx, payload: { ...p, ...fight } });
  if (fight["fight"] === "boss") facts["act_boss"] = array(fight["enemies"]).map(e => record(e)["enemy_id"]).filter(v => typeof v === "string").sort().join("+");
  const entries = candidates.map(e => e.value as StrategyEntry), archetype = entries.some(e => e.trigger.archetype) ? matchStrategyArchetype(ctx) : undefined;
  const selected = retrieveStrategies({ schema: "brain-strategies-v1", character: "silent", entries }, ctx.label ?? "", { ...p, facts }, archetype?.match);
  const positions = new Map(selected.map((e, i) => [e.id, i]));
  return [...direct, ...candidates.filter(e => positions.has(e.original_id)).sort((a, b) => positions.get(a.original_id)! - positions.get(b.original_id)!)
    .map(e => ({ value: e.value as StrategyEntry, kind: publishedObservation(e.value as StrategyEntry) ? "strategy_observation" as const : "strategy" as const, path: e.path, sha256: source.reader.fileDigest(e.path)! }))];
}

export function attachDecisionKnowledge(req: BrainRequest, config?: DecisionKnowledgeConfig, exposure?: DecisionKnowledgeExposure): BrainRequest {
  if (!config?.enabled || knowledgeCharacter() !== "silent" || req.knowledge?.mode !== "tools" || !req.toolContext
    || !req.payload || typeof req.payload !== "object" || Array.isArray(req.payload) || !decisionPoints(req.label, req.payload, req.toolContext.state).length) return req;
  if (!Number.isSafeInteger(config.bytes) || config.bytes < 2048 || config.bytes > 24000) throw Error("invalid decision knowledge byte budget");
  const ctx = { ...req.toolContext, label: req.label, payload: req.payload, options: req.options };
  let status = "unbound", version: string | null = null, sha256: string | null = null, path = DECISION_CONTEXT_FILE, matches: Match[] = [];
  try {
    const source = boundSource(ctx);
    if (source) {
      version = source.reader.version; sha256 = source.doc?.sha256 ?? source.strategySha ?? null;
      path = source.doc ? DECISION_CONTEXT_FILE : source.strategyPath;
      status = sha256 ? "ok" : "missing";
      matches = matching(source, ctx);
    }
  } catch { status = "unavailable"; }
  const compact = matches.some(m => strategyGrading(m.value));
  const projected = new Map(matches.map(m => [m, strategyGrading(m.value)
    ? compactStrategyDecisionView(m.value as StrategyEntry, m.kind) : { view: decisionKnowledgeEntryView(m.value, m.kind) }]));
  const render = (available: (id: string) => boolean, exposureStatus: string): BrainRequest => {
    let entries: Record<string, unknown>[] = [], references: Record<string, unknown>[] = [];
    let firstOversized = false;
    const eligible = matches.filter(m => (m.kind === "decision_context" || strategyGrading(m.value)
      ? m.kind === "decision_context" || gradedBodyEligible(m.value) : !!publishedObservation(m.value as StrategyEntry)) && projected.get(m)?.view && available(m.value.id));
    eligible.sort((a, b) => compareGradedStrategies(a.value, b.value));
    const ordinary = eligible.find(m => m.kind === "strategy");
    const position = ordinary ? eligible.indexOf(ordinary) : -1;
    if (position >= 4) { eligible.splice(position, 1); eligible.splice(3, 0, ordinary!); }
    const reference = (m: Match) => decisionKnowledgeReference(m.value, m.kind);
    const envelope = () => ({ schema: "brain-decision-context-v1", status, knowledge_version: version, path, sha256,
      byte_budget: config.bytes, decision_points: decisionPoints(req.label, req.payload, ctx.state), total_matches: matches.length,
      representation: compact ? "compact_decisions_with_references" : "complete_entries_with_references", entries, returned: entries.length, complete_entries: entries.length, fragment_entries: 0,
      references, reference_only_count: references.length, omitted: matches.length - entries.length,
      omitted_references: matches.length - entries.length - references.length,
      truncated: entries.length + references.length < matches.length, notice: compact ? COMPACT_NOTICE : NOTICE,
      exposure_status: exposureStatus, first_body_oversized: firstOversized,
      eligible_bodies: eligible.length, body_limit_omitted: Math.max(0, eligible.length - 4),
      body_budget_omitted: Math.min(4, eligible.length) - entries.length,
      ordinary_reservation: !ordinary ? "no_eligible_ordinary" : entries.some(e => e.id === ordinary.value.id) ? "expanded" : "budget_limited" });
    const index = () => {
      const present = new Set(entries.map(e => `${e.document_source}:${e.id}`));
      references = matches.filter(m => !present.has(`${m.kind}:${m.value.id}`)).map(reference);
      if (bytes(envelope()) > config.bytes) references = references.map(r => ({ ...r, title: "" }));
      while (references.length && bytes(envelope()) > config.bytes) references.pop();
    };
    index();
    for (const match of eligible.slice(0, 4)) {
      entries.push(projected.get(match)!.view!); index();
      // Preserve the complete ranked prefix: never skip an oversized first body.
      if (bytes(envelope()) > config.bytes) { entries.pop(); firstOversized = entries.length === 0; index(); break; }
    }
    return { ...req, payload: { ...record(req.payload), decision_knowledge: envelope() } };
  };
  return exposure ? exposure.reserve(req, render) : render(() => true, "preview");
}

/** The same bound dynamic scope as injection; full JSON is recoverable in <24KB fragments. */
export function decisionContextTool(): ToolDef {
  const inputSchema: ToolDef["inputSchema"] = { type: "object", properties: {
    detail: { type: "string", enum: ["full"] }, document_id: { type: "string" }, source: { type: "string", enum: ["decision_context", "strategy_observation", "strategy"] },
    document_offset: { type: "integer", minimum: 0, maximum: 1000000 },
  }, required: ["detail", "document_id"], additionalProperties: false };
  return { name: "kb_decision_context", description: "续取本题默认知识摘要的完整条目，保留原分母、条件、反证和历史；仅绑定K1、本角色和本题匹配范围。detail=full，document_id为原ID，按next_document_offset续取，拼接json_fragment后解析。",
    inputSchema, run(input, ctx) {
      const problems = validateInput(inputSchema, input);
      if (problems.length) return { text: problems.join("; "), isError: true };
      try {
        if (knowledgeCharacter() !== "silent" || typeof input["document_id"] !== "string" || input["document_id"].length > 200) throw Error("invalid decision context scope/id");
        const source = boundSource(ctx);
        const matches = source ? matching(source, ctx).filter(e => e.value.id === input["document_id"] && (!input["source"] || e.kind === input["source"])) : [];
        if (!source || !matches.length) return { text: JSON.stringify({ entries: [], status: "no_match" }) };
        if (matches.length !== 1) throw Error("ambiguous document identity; use source");
        const match = matches[0]!, raw = JSON.stringify(match.value);
        const metadata = { knowledge_version: source.reader.version, path: match.path, sha256: match.sha256,
          representation: "full_document_fragment", document_id: match.value.id, document_sha256: digest(raw), encoding: "concatenated-json" };
        const render = (parts: string[], offset: number) => JSON.stringify({ ...metadata, json_fragment: parts[offset],
          document_offset: offset, total_document_parts: parts.length, next_document_offset: offset + 1 < parts.length ? offset + 1 : null,
          ...(offset + 1 < parts.length ? { next_input: { detail: "full", source: match.kind, document_id: match.value.id, document_offset: offset + 1 } } : {}),
          truncated: parts.length > 1 });
        const parts: string[] = [];
        if (Buffer.byteLength(render([raw], 0)) <= 24000) parts.push(raw);
        else {
          let part = "", size = 0;
          for (const char of raw) {
            const n = bytes(char) - 2;
            if (size + n > 9000) { parts.push(part); part = ""; size = 0; }
            part += char; size += n;
          }
          parts.push(part);
        }
        const offset = Number(input["document_offset"] ?? 0);
        if (offset >= parts.length) throw Error("document_offset is outside this document");
        const text = render(parts, offset);
        if (Buffer.byteLength(text) > 24000) throw Error("document response exceeds budget");
        return { text };
      } catch { return { text: JSON.stringify({ entries: [], status: "unavailable" }), isError: true }; }
    } };
}

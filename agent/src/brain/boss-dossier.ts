/** Mandatory construction facts, with provenance kept outside the model's byte-limited dossier. */
import { asArray, asRecord, str, type JsonValue } from "../core/util/json.js";
import { endgameRawScope } from "../memory/endgame-plan.js";
import { isConstructionQuestion } from "../memory/construction-log.js";
import { parseGameState } from "../hand/mod/schema.js";
import { bossIdForFacts, observedBossPhase } from "../knowledge/boss-phase.js";
import { canonicalBossId, loadBossPlanningData, type BossPlanningData } from "../knowledge/boss-planning-data.js";
import { KNOWLEDGE_DIR } from "../knowledge/files.js";
import { BOSS_MARGIN_NOTE } from "../sim/boss-margin.js";
import { BOSS_TARGET_NOTE, BOSS_REVEAL_NOTE, bossContextKey, bossReviewRequired, withBossTargetSpec, type BossTargetContext } from "./boss-target.js";
import type { BrainRequest } from "./types.js";

export const BOSS_DOSSIER_MAX_BYTES = 1500;
export interface BossDossierAudit {
  prompts?: import("./boss-prompt-metrics.js").BossPromptMetrics[];
  schema: "boss-dossier-audit-v1";
  context: BossTargetContext;
  sources: Record<string, unknown>[];
  knowledge_version: string | null;
  dossier_bytes: number;
  projection_ms: number;
  cache_setup_ms: number;
  strategy_bodies: 0;
  strategy_references: Record<string, string[]>;
  published_profiles: Record<string, unknown[]>;
  mechanism_facts: Record<string, unknown[]>;
  displayed_mechanism_facts: Record<string, string[]>;
  mechanics: Record<string, string[]>;
  displayed_mechanics: Record<string, string[]>;
  own_counters: Record<string, unknown>;
  boss_aliases: Record<string, string[]>;
  omitted_fields: number;
}
export function bossDossierScope(raw: unknown, label: string): boolean {
  return endgameRawScope(raw) && asRecord(raw)["in_combat"] !== true && isConstructionQuestion(label);
}
export function dossierBytes(text: string): number { return Buffer.byteLength(JSON.stringify({ boss_dossier: text })); }

export function projectBossDossier(raw: unknown, payload: unknown, data: BossPlanningData): { payload: Record<string, JsonValue>; audit: BossDossierAudit } {
  const started = performance.now(), state = parseGameState(asRecord(raw)), p = asRecord(payload);
  const run = str(state.raw["run_id"]), floor = state.run?.floor ?? 0;
  const safePlan = (value: unknown): unknown => {
    if (value == null) return value;
    const plan = { ...asRecord(value) }, at = plan["made_on_floor"] ?? plan["floor"];
    if (typeof at === "number" && at > floor) return null;
    for (const key of ["boss_context", "bossContext"]) {
      if (!(key in plan)) continue;
      const c = asRecord(plan[key]);
      if (c["run"] !== run || typeof c["floor"] !== "number" || c["floor"] > floor) delete plan[key];
    }
    return plan;
  };
  const facts = { ...asRecord(p["facts"]) }, task = { ...asRecord(p["run_plan_task"]) };
  if ("your_run_plan" in facts) facts["your_run_plan"] = safePlan(facts["your_run_plan"]);
  if ("previous_plan" in task) task["previous_plan"] = safePlan(task["previous_plan"]);
  const shownPlan = asRecord(facts["your_run_plan"]), previousPlan = asRecord(task["previous_plan"]);
  const before = asRecord(shownPlan["boss_context"] ?? shownPlan["bossContext"] ?? previousPlan["bossContext"]);
  const prior = before["run"] === run && typeof before["floor"] === "number" && before["floor"] <= floor ? before : {};
  const phase = observedBossPhase(state), act = Number(asRecord(state.run?.raw)["act_id"]) + 1;
  let current = bossIdForFacts(state);
  // Match a second-fight identity only to observed parts. The raw first-boss ID may be stale.
  if (phase && floor === 49 && state.in_combat) {
    const enemies = asArray(asRecord(state.combat?.raw)["enemies"]).map(e => str(asRecord(e)["enemy_id"]));
    const matches = data.rows.filter(r => r.act === 3 && r.parts.length && r.parts.some(id => enemies.includes(id)));
    current = matches.length === 1 ? matches[0]!.id : null;
  }
  current = current ? canonicalBossId(current) : null;
  if (current && !/^[A-Z][A-Z0-9_+]{0,99}$/.test(current)) current = null;
  const oldFinal = asArray(prior["final"]), first = act === 3 && floor <= 48 && !phase?.["first_boss_defeated"] && current
    ? current : act === 3 && typeof oldFinal[0] === "string" ? oldFinal[0] : null;
  const second = act === 3 && floor === 49 && state.in_combat ? current : act === 3 && typeof oldFinal[1] === "string" ? oldFinal[1] : null;
  const context: BossTargetContext = { schema: "boss-target-context-v1", run, floor, act, act_boss: current,
    final: [first, second], candidates: [...new Set([...data.rows.map(r => r.id), ...[current, first, second].filter((v): v is string => v !== null)])], review_required: false };
  context.review_required = !Object.keys(prior).length || bossContextKey(context) !== bossContextKey(prior);
  const finalRows = data.rows.filter(r => r.act === 3), aliases = new Map(finalRows.map((r, i) => [r.id, String.fromCharCode(65 + i)]));
  const sourceTag = (suffix: string) => str(data.sources.find(s => str(s["path"]).endsWith(suffix) && s["status"] === "ok")?.["sha256"]).slice(0, 8) || "unknown";
  const head = `Silent A10；M首相HP/基础攻/首见/成长#${sourceTag("monster-db.json")}(版unknown)；K机制${data.knowledgeVersion?.slice(0, 11) ?? "unknown"}；目录可查。`;
  const target = `本幕=${current ?? "unknown"}；F48=${first ?? "unknown"}→F49=${second ?? "unknown"}；${phase?.["first_boss_defeated"] ? "实际血药承接次战" : "脑据实际血药分战，余量unknown"}。`;
  const pair = data.pairs.length ? `已见连战${data.pairs.map(p => p.map(id => aliases.get(id) ?? id).join(">")).join("/")}；非穷尽/非本局揭晓。` : "连战组合unknown。";
  const footer = "K单窗限原题仅目录；完整条件/反证/冲突及M余项查原工具；死因/需求unknown。";
  const rows = data.rows.map(r => {
    const usable = (r.publishedMechanisms ?? []).filter(f => {
      const questions = asArray(asRecord(f.trigger)["question_types"]);
      return !(questions.length && questions.every(q => q === "fight_plan")
        || f.single_window && questions.includes("fight_plan"));
    });
    // Restore the three source-ordered M fields used by r1 before optional O/E statistics.
    const mechanics = r.mechanics.slice(0, 3);
    return { r, mechanics, shownFacts: usable.map(f => f.id), pieces: [
      `${r.act === 3 ? aliases.get(r.id) : "二"}:${r.id}${r.parts.length > 1 ? `[${r.parts.join("+")}]` : ""} M${r.hp}`,
      ...(mechanics.length ? mechanics : ["招式unknown"]),
      ...usable.map(f => `K机制:${f.clause}`), `K目录${data.knowledgeVersion ? r.strategies.length : "unknown"}条`],
    };
  });
  let ownShown = false, externalShown = false;
  const render = () => [head, target, ...rows.map(r => r.pieces.join("；")), pair,
    ...(ownShown ? [`O#${sourceTag("monster-records.json")}分窗；首含预截/未知，总已知。`] : []),
    ...(externalShown ? [`E#${sourceTag("silent-a10.json")}v0.111观察，非净损/安全线。`] : []), footer].join("\n");
  let omitted = rows.reduce((n, row) => n + Math.max(0, row.r.mechanics.length - row.mechanics.length), 0);
  // M fields and eligible mechanism clauses are reserved together; O/E cannot evict either.
  if (dossierBytes(render()) > BOSS_DOSSIER_MAX_BYTES) throw Error("Boss dossier M/fact envelope exceeds its budget");
  const detailOrder = [...rows.filter(r => [current, first, second].includes(r.r.id)), ...rows.filter(r => ![current, first, second].includes(r.r.id))];
  for (const kind of ["own", "external"] as const) for (const row of detailOrder) {
    const hadOwn: boolean = ownShown, hadExternal: boolean = externalShown;
    if (kind === "own") ownShown = true; else externalShown = true;
    row.pieces.push(row.r[kind]);
    if (dossierBytes(render()) > BOSS_DOSSIER_MAX_BYTES) {
      row.pieces.pop(); ownShown = hadOwn; externalShown = hadExternal; omitted++;
    }
  }
  const text = render();
  if (dossierBytes(text) > BOSS_DOSSIER_MAX_BYTES) throw Error("Boss dossier fixed envelope exceeds its budget");
  const sim = asRecord(facts["act_boss_sim"]), { boss_margin_objective: _objective, ...keptSim } = sim;
  return { payload: { ...p, ...(p["run_plan_task"] ? { run_plan_task: task } : {}), facts: { ...facts, ...(facts["act_boss_sim"] ? { act_boss_sim: keptSim } : {}),
    boss_dossier: text, boss_target_context: context } } as unknown as Record<string, JsonValue>,
    audit: { schema: "boss-dossier-audit-v1", context, sources: data.sources, knowledge_version: data.knowledgeVersion,
      dossier_bytes: dossierBytes(text), projection_ms: performance.now() - started, cache_setup_ms: data.setupMs,
      strategy_bodies: 0, strategy_references: Object.fromEntries(data.rows.map(r => [r.id, r.strategies])),
      mechanism_facts: Object.fromEntries(data.rows.map(r => [r.id, r.publishedMechanisms ?? []])),
      displayed_mechanism_facts: Object.fromEntries(rows.filter(r => r.shownFacts.length).map(r => [r.r.id, r.shownFacts])),
      mechanics: Object.fromEntries(data.rows.map(r => [r.id, r.mechanics])),
      displayed_mechanics: Object.fromEntries(rows.map(r => [r.r.id, r.mechanics])),
      own_counters: Object.fromEntries(data.rows.map(r => [r.id, r.ownCounters ?? null])),
      published_profiles: Object.fromEntries(data.rows.map(r => [r.id, r.profiles])), boss_aliases: Object.fromEntries(data.rows.map(r => [r.id, r.aliases ?? [r.id, ...r.parts]])), omitted_fields: omitted } };
}
export function attachBossDossier(raw: unknown, payload: unknown, label: string, directory = KNOWLEDGE_DIR) {
  if (!bossDossierScope(raw, label)) return null;
  return projectBossDossier(raw, payload, loadBossPlanningData(directory, str(asRecord(raw)["run_id"])));
}
export function withoutConstructionSObjective(question: string): string { return question.replaceAll(BOSS_MARGIN_NOTE, "").trimEnd(); }

/** Shared by the production request builder and fixed-message replay; never invokes an engine. */
export function withBossPlanningRequest(req: BrainRequest, raw: unknown, directory = KNOWLEDGE_DIR): BrainRequest {
  const result = attachBossDossier(raw, req.payload, req.label, directory);
  if (!result) return req;
  let question = withoutConstructionSObjective(req.question);
  if (!question.includes(BOSS_TARGET_NOTE)) question += ` ${BOSS_TARGET_NOTE}`;
  if (bossReviewRequired(result.payload)) question += ` ${BOSS_REVEAL_NOTE}`;
  return { ...req, question, payload: result.payload, spec: withBossTargetSpec(req.spec, result.payload), bossDossier: result.audit };
}

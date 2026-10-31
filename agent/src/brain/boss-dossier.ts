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
  const head = `Silent A10；M基础攻击/首相HP/首见能力#${sourceTag("monster-db.json")}(自有版本unknown)，O聚合#${sourceTag("monster-records.json")}(含重试非首试)，E外部sts2fun/v0.111观察#${sourceTag("silent-a10.json")}(非因果/净损/安全线)，K本局${data.knowledgeVersion?.slice(0, 11) ?? "unknown"}目录。`;
  const target = `本幕=${current ?? "unknown"}；F48=${first ?? "unknown"}→F49=${second ?? "unknown"}。${phase?.["first_boss_defeated"] ? "当前实际血药承接次战" : "两战血药预算/首战余量unknown，脑据facts分战"}。`;
  const pair = data.pairs.length ? `三幕行首别名的已观察连战：${data.pairs.map(p => p.map(id => aliases.get(id) ?? id).join("→")).join("/")}；非穷尽/本局揭晓。` : "连战组合unknown。";
  const footer = "死因/构筑需求unknown；K仅已发布目录数，正文沿原触发/曝光门；有省略，详查kb_monster/kb_encounter/kb_strategies按ID。";
  const rows = data.rows.map(r => ({ r, pieces: [`${r.act === 3 ? aliases.get(r.id) : "二"}:${r.id}${r.parts.length > 1 ? `[${r.parts.join("+")}]` : ""} ${r.hp}`], remaining: [...r.mechanics] }));
  const render = () => [head, target, ...rows.map(r => r.pieces.join("；")), pair, footer].join("\n");
  let omitted = 0;
  const add = (row: typeof rows[number], text: string) => {
    row.pieces.push(text);
    if (dossierBytes(render()) > BOSS_DOSSIER_MAX_BYTES) { row.pieces.pop(); omitted++; return false; }
    return true;
  };
  // Reserve an observed attack/effect for every Boss before any optional statistics or directory hints.
  for (const row of rows) add(row, row.remaining.shift() ?? "招式unknown");
  const detailOrder = [...rows.filter(r => [current, first, second].includes(r.r.id)), ...rows.filter(r => ![current, first, second].includes(r.r.id))];
  for (const row of detailOrder) add(row, `${row.r.own}/${row.r.external}/K${data.knowledgeVersion ? row.r.strategies.length : "unknown"}`);
  for (let i = 0; i < 2; i++) for (const row of detailOrder) {
    const token = row.remaining.shift(); if (token) add(row, token);
  }
  omitted += rows.reduce((n, r) => n + r.remaining.length, 0);
  // Unknown/oversized future catalogues remain bounded, without slicing a number or a fact sentence.
  while (dossierBytes(render()) > BOSS_DOSSIER_MAX_BYTES && rows.length) { rows.pop(); omitted++; }
  const text = render();
  if (dossierBytes(text) > BOSS_DOSSIER_MAX_BYTES) throw Error("Boss dossier fixed envelope exceeds its budget");
  const sim = asRecord(facts["act_boss_sim"]), { boss_margin_objective: _objective, ...keptSim } = sim;
  return { payload: { ...p, ...(p["run_plan_task"] ? { run_plan_task: task } : {}), facts: { ...facts, ...(facts["act_boss_sim"] ? { act_boss_sim: keptSim } : {}),
    boss_dossier: text, boss_target_context: context } } as unknown as Record<string, JsonValue>,
    audit: { schema: "boss-dossier-audit-v1", context, sources: data.sources, knowledge_version: data.knowledgeVersion,
      dossier_bytes: dossierBytes(text), projection_ms: performance.now() - started, cache_setup_ms: data.setupMs,
      strategy_bodies: 0, strategy_references: Object.fromEntries(data.rows.map(r => [r.id, r.strategies])),
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

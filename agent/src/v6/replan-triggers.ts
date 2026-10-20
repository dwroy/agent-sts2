import { createHash } from "node:crypto";
import type { DirectionWeights, ProjectionEntry } from "./formats.js";
import { v6Config, type V6Config } from "./config.js";

export type ReplanTrigger = "act_start" | "T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7";
/** A paired comparison between directions, not the take-minus-skip pair in ProjectionEntry. */
export interface DirectionComparison {
  direction: string; leader: string; mean: number; se: number; n: number;
  offeredCore?: boolean;
  optionId?: string; labels?: string[];
}
export interface ProjectionReason {
  option_id: string; direction_id: string; target_id: string; combo_id?: string; reasons: string[];
}
export interface ConstructionT6Issue {
  kind: string; reason: string; known: number; total: number; unknownOptions: string[];
}
export interface DirectionEvaluation {
  id: string;
  entries: ProjectionEntry[];
  /** Provider diagnostics for prompt display and gap identity; absence never diagnoses a model failure. */
  projectionReasons?: ProjectionReason[];
  /** Actual W3 checkpoint identities, including ordered two-boss targets. */
  targets?: Array<{ id: string; kind: "current" | "future" | "chain" }>;
  comparisons?: DirectionComparison[];
  coreCompletion?: Record<string, number | null>;
  acquiredComponentIds?: string[];
  pivotMatched?: boolean;
  /** Supplied by the existing route projection. Null means no calibrated hazard assessment. */
  bossEntryHp?: number | null;
  hazardHp?: number | null;
  consecutiveJevFallbacks?: number;
  constructionHandover?: boolean;
  constructionIssue?: ConstructionT6Issue;
  recoveredConstructionKinds?: string[];
}
export interface ReplanState {
  run: string; act: number; calls: number; lastEvaluation?: string;
  streaks: Record<string, number>; lastTurn?: string;
  /** Reserved T6 causes survive rooms and process restarts, but never another act. */
  t6?: { act: number; handled: string[]; pending: string[] };
}
export interface TriggerResult {
  triggers: ReplanTrigger[]; merged: ReplanTrigger[]; skipped: ReplanTrigger[]; ask: boolean;
  t6?: { reasons: string[]; suppressed: string[] };
}
export function freshReplanState(run: string): ReplanState { return { run, act: 0, calls: 0, streaks: {} }; }
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const identity = (parts: string[]) => createHash("sha256").update(JSON.stringify([...new Set(parts)].sort())).digest("hex").slice(0, 16);
const systemicProjection = "systemic:projection_unknown";
const jevFailure = "jev:construction_failure";

/** Missing observations do not prove recovery. Only usable data or an observed Jev success rearms that source. */
function t6Reasons(s: ReplanState, act: number, e: DirectionEvaluation, config: V6Config): string[] {
  const latch = s.t6?.act === act ? s.t6 : (s.t6 = { act, handled: [], pending: [] });
  const unknown = e.entries.filter(p => p.trust === "unknown");
  const projectionGap = e.entries.length > 0 && unknown.length / e.entries.length > config.triggers.t6_unknown_max;
  if (e.entries.length > 0 && !projectionGap) latch.handled = latch.handled.filter(key => !key.startsWith("systemic:projection_unknown") && !key.startsWith("situation:projection_unknown:"));
  for (const kind of e.recoveredConstructionKinds ?? []) {
    latch.handled = latch.handled.filter(key => !key.startsWith(`systemic:construction:${kind}:`) && !key.startsWith(`situation:construction:${kind}:`));
  }
  if (e.consecutiveJevFallbacks === 0) latch.handled = latch.handled.filter(key => key !== jevFailure);
  const reasons: string[] = [];
  if (projectionGap) {
    // A still-unusable partial table does not end an already observed global outage.
    if (unknown.length === e.entries.length || latch.handled.includes(systemicProjection)) reasons.push(systemicProjection);
    else {
      const rowKey = (p: ProjectionReason | ProjectionEntry) => JSON.stringify([p.option_id, p.direction_id, p.target_id, p.combo_id]);
      const diagnostics = new Map(e.projectionReasons?.map(r => [rowKey(r), r.reasons.slice().sort()]));
      reasons.push(`situation:projection_unknown:${identity(unknown.map(p => JSON.stringify([
        p.direction_id, p.target_id, p.combo_id, diagnostics.get(rowKey(p)) ?? [],
      ])))}`);
    }
  }
  if (e.constructionHandover) {
    const issue = e.constructionIssue;
    if (!issue) reasons.push("situation:construction_handover");
    else if (["insufficient_known_options", "known_ratio_below_threshold"].includes(issue.reason)) {
      // The same all-unknown provider is shared by rewards, shops and rest sites.
      if (reasons.includes(systemicProjection) || latch.handled.includes(systemicProjection)) reasons.push(systemicProjection);
      else reasons.push(issue.known === 0 ? `systemic:construction:${issue.kind}:projection_unknown`
        : `situation:construction:${issue.kind}:${identity([issue.reason, ...issue.unknownOptions])}`);
    } else reasons.push(issue.reason === "jev_unavailable" || issue.reason === "jev_request_budget_exhausted"
      ? `jev:${issue.reason}` : jevFailure);
  }
  if ((e.consecutiveJevFallbacks ?? 0) >= config.triggers.t6_fallbacks) reasons.push(jevFailure);
  return [...new Set(reasons)];
}

/** Mutates only this run's scheduler. Re-polling a frozen evaluation never advances T2. */
export function detectReplan(s: ReplanState, input: {
  act: number; floor: number; turnKey: string; plan?: DirectionWeights;
  evaluation: DirectionEvaluation; requirementIds: ReadonlySet<string>;
}, config: V6Config = v6Config()): TriggerResult {
  const { evaluation: e, plan } = input;
  const triggers: ReplanTrigger[] = [];
  if (s.act !== input.act) triggers.push("act_start");
  const leader = plan && Object.keys(plan.direction_weights).sort((a, b) => plan.direction_weights[b]! - plan.direction_weights[a]! || a.localeCompare(b))[0];
  const completion = leader ? e.coreCompletion?.[leader] : null;
  if (finite(completion) && completion >= 0 && completion < config.triggers.t1_core_min) triggers.push("T1");
  const fresh = s.lastEvaluation !== e.id;
  const next: Record<string, number> = {};
  for (const p of e.comparisons ?? []) {
    if (!plan || p.leader !== leader || p.direction === leader || !Object.hasOwn(plan.direction_weights, p.direction)
      || !finite(p.mean) || !finite(p.se) || p.se < 0 || !Number.isInteger(p.n) || p.n < 2
      || p.mean <= Math.max(config.triggers.t2_se * p.se, config.triggers.t2_min_delta)) continue;
    const key = `${p.leader}:${p.direction}`;
    next[key] = fresh ? (s.streaks[key] ?? 0) + 1 : s.streaks[key] ?? 0;
    if (next[key]! >= config.triggers.t2_consecutive && !triggers.includes("T2")) triggers.push("T2");
    if (p.offeredCore && plan.direction_weights[p.direction]! < config.triggers.t3_weight_max && !triggers.includes("T3")) triggers.push("T3");
  }
  if (fresh) { s.streaks = next; s.lastEvaluation = e.id; }
  if (e.pivotMatched || e.acquiredComponentIds?.some(id => input.requirementIds.has(id))) triggers.push("T4");
  if (finite(e.bossEntryHp) && finite(e.hazardHp) && e.bossEntryHp < e.hazardHp) triggers.push("T5");
  const reasons = t6Reasons(s, input.act, e, config), latch = s.t6!;
  const suppressed = reasons.filter(key => latch.handled.includes(key));
  if (reasons.length) triggers.push("T6");
  if (plan && input.floor >= plan.checkpoint) triggers.push("T7");
  const capped = s.calls >= config.budgets.brain_soft_cap;
  const eligible = triggers.filter(t => (t !== "T6" || reasons.some(key => !latch.handled.includes(key)))
    && (!capped || ["act_start", "T5", "T7"].includes(t)));
  const duplicateTurn = s.lastTurn === input.turnKey;
  latch.pending = eligible.includes("T6") && !duplicateTurn ? reasons.filter(key => !latch.handled.includes(key)) : [];
  return { triggers, merged: eligible.slice(1), skipped: triggers.filter(t => !eligible.includes(t) || duplicateTurn), ask: eligible.length > 0 && !duplicateTurn,
    ...(reasons.length ? { t6: { reasons, suppressed } } : {}) };
}
/** Reserve before the request: errors still consume a call and cannot cause a polling storm. */
export function reserveReplan(s: ReplanState, act: number, turnKey: string): void {
  s.calls++; s.act = act; s.lastTurn = turnKey;
  if (s.t6?.act === act) {
    s.t6.handled = [...new Set([...s.t6.handled, ...s.t6.pending])];
    s.t6.pending = [];
  }
}

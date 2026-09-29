/**
 * Route review riding on the card-reward and rest-site questions (BUILD_DECIDER=deepseek; Dai 2026-09-29):
 * DeepSeek plans the act's route once and code follows it; every card reward and (one-shot) rest site it
 * decides also shows it the route from the room we are in, and the same answer says whether to keep it.
 * No extra call: the route rides in the question's state (state.route_review) and the answer's `route`.
 *
 * What it shows (facts only): HP now against the plan's projection for the next node, the plan's next elite
 * and the boss; the run plan's own HP lines; the plan's remaining steps with the HP it projected on arrival;
 * the plan from here ("keep") and the other candidate paths from here, with map/route-plan's facts and code
 * value at HP now (a rest site: at the HP each option leaves). The default is keep; an answer without a valid
 * route keeps the plan and is logged. A change is stored as the act's route plan, as map/route-plan does, and
 * logged as its own map/route-change row: a step of this decision's plan (no call of its own).
 */

import type { Decision, DecisionEnv, ResolvedAction, RouteReviewResult } from "../project/types.js";
import { asArray, asRecord, str, type JsonValue } from "../util/json.js";
import { positionRoutes, type PositionRoutes, type RoutePlanStep } from "./map.js";
import { nextPlanRef, usePlanRef } from "./oneshot.js";

export type ReviewKind = "card" | "rest";

/** A rest option's HP for the route facts: the option keys it covers, its kind, and the HP it leaves. */
export interface RestOptionHp {
  keys: string[];
  kind: string;
  hp: number;
}

export interface RouteBlock {
  kind: ReviewKind;
  /** What DeepSeek sees as state.route_review. */
  state: Record<string, JsonValue>;
  /** The answer format, for the question's note. */
  note: string;
  routes: PositionRoutes;
}

/** The answer format (added to the question's instructions). */
export const ROUTE_REVIEW_NOTE =
  "state.route_review is this act's route plan, which code follows node by node, and the other paths from here, projected from your HP now. " +
  'Settle the route, then this choice. Add to your JSON "route": "keep" (the default: follow the plan) or another key of route_review.routes ' +
  'to switch to it, and "route_reason" (max 15 words).';

/** Why the act's plan was replaced, for the route plan and the run journal. */
export function reviewWhy(kind: ReviewKind): string {
  return kind === "card" ? "card-reward review" : "rest-site review";
}

/** Sentences of the run plan that name an HP level ("Elites only at ≥78% HP after a campfire."). */
export function runPlanHpLines(env: DecisionEnv): string[] {
  const plan = env.screenMemory.runPlan && env.screenMemory.runPlan.runId === str(env.state.raw["run_id"]) ? env.screenMemory.runPlan : null;
  if (!plan) return [];
  return [plan.summary, plan.bossPrep]
    .flatMap((text) => (text ?? "").split(/(?<=[.;。；])\s*/))
    .map((sentence) => sentence.trim())
    .filter((sentence) => /\bHP\b|血量|生命/i.test(sentence));
}

/**
 * The route block for this card reward (kind "card") or rest site ("rest", with each option's HP), or null
 * when there is none to show (position unknown, no plan for the act, the plan broken, no fork left). Never
 * throws: a failure here leaves the question without the block.
 */
export function routeReviewBlock(env: DecisionEnv, kind: ReviewKind, rooms: readonly string[], restOptions: RestOptionHp[] = []): RouteBlock | null {
  try {
    const routes = positionRoutes(env, rooms);
    if (!routes) return null;
    return { kind, state: blockState(env, kind, routes, restOptions), note: ROUTE_REVIEW_NOTE, routes };
  } catch {
    return null;
  }
}

function blockState(env: DecisionEnv, kind: ReviewKind, routes: PositionRoutes, restOptions: RestOptionHp[]): Record<string, JsonValue> {
  const { state } = env;
  const max = state.run?.max_hp ?? 80;
  const hp = state.run?.current_hp ?? 0;
  const { remaining, floorOf, plan } = routes;
  const projected = (step: RoutePlanStep): number => Math.round(step.hpOnArrival * max);
  const gap = (step: RoutePlanStep): string => {
    const diff = projected(step) - hp;
    return diff === 0 ? "at" : `${Math.abs(diff)} points ${diff > 0 ? "below" : "above"}`;
  };
  const next = remaining[0]!;
  const elite = remaining.find((step) => step.type === "Elite");
  const boss = remaining.find((step) => step.type === "Boss");
  const parts = [`HP ${hp}/${max}, ${gap(next)} the plan's projection for the next node (${next.type}, F${floorOf(next.row)}: ${projected(next)}/${max})`];
  if (elite && elite !== next) parts.push(`${gap(elite)} for the elite at F${floorOf(elite.row)} (${projected(elite)}/${max})`);
  if (boss && boss !== next) parts.push(`${gap(boss)} for the boss at F${floorOf(boss.row)} (${projected(boss)}/${max})`);
  const hpLine = `${parts.join(", ")}${kind === "rest" ? "; the plan's numbers after this rest site assume you heal here" : ""}.`;
  const runPlanHp = runPlanHpLines(env);
  // Routes whose code_value reads the same share a rank (consistency R9), as in the DeepSeek pick and act start.
  const shown = (value: number): number => Number(value.toFixed(2));
  const rankOf = (value: number): number => 1 + routes.routes.filter((other) => shown(other.value) > shown(value)).length;
  const groups = restGroups(restOptions);
  return {
    hp: hpLine,
    ...(runPlanHp.length > 0 ? { run_plan_hp: runPlanHp.join(" ") } : {}),
    planned: `${remaining.map((step) => `F${floorOf(step.row)} ${step.type} ${projected(step)}`).join(" -> ")} (HP on arrival projected at F${plan.floor ?? "?"})`,
    routes: Object.fromEntries(
      routes.routes.map((route) => [
        route.key,
        {
          ...(route.key === "keep" ? { keep: "the plan from here, re-projected at HP now" } : {}),
          ...route.facts,
          code_value: Number(route.value.toFixed(2)),
          code_rank: rankOf(route.value),
          ...(groups.length > 0 ? { hp_if_option: Object.fromEntries(groups.map((group) => [group.label, routes.hpAlong(route.key, group.hp)])) } : {}),
        },
      ]),
    ),
    code_value: "sum of code's node weights along the path at the projected HP (as in the act's route plan)",
    projection: routes.note,
  };
}

/** Rest options grouped by the HP they leave: "o0 HEAL (77/77)", "o1 SMITH, o2 LIFT (67/77)". */
function restGroups(options: RestOptionHp[]): { label: string; hp: number }[] {
  const byHp = new Map<number, RestOptionHp[]>();
  for (const option of options) byHp.set(option.hp, [...(byHp.get(option.hp) ?? []), option]);
  return [...byHp].map(([hp, list]) => ({ label: `${list.map((option) => `${option.keys[0]} ${option.kind}`).join(", ")} (HP ${hp})`, hp }));
}

/**
 * The question with the route review attached: DeepSeek's answer is resolved as before, then its `route`
 * (and `route_reason`): keep, a change (stored as the act's route plan when the choice is played, a plan
 * step after the choice), or invalid (kept, logged). The choice itself is never changed or blocked.
 * `hpAfter` gives the HP (absolute) the chosen option leaves (a rest site's heal); by default HP now.
 */
export function withRouteReview(env: DecisionEnv, decision: Decision, block: RouteBlock | null, hpAfter?: (choice: string) => number): Decision {
  if (!block || decision.kind !== "ask" || !decision.deepseek) return decision;
  const question = decision.deepseek.question;
  const inner = decision.resolve.bind(decision);
  return {
    ...decision,
    resolve: (answers): ResolvedAction => {
      const result = inner(answers);
      if (!result.intent || result.fallback) return result;
      const answer = answers[question];
      const raw = asRecord(answer?.raw);
      const given = typeof raw["route"] === "string" ? raw["route"].trim() : "";
      const reason = typeof raw["route_reason"] === "string" ? raw["route_reason"].trim() : "";
      const review = (outcome: RouteReviewResult["outcome"], invalid?: string): ResolvedAction => ({ ...result, routeReview: { answer: given || null, outcome, reason, ...(invalid ? { invalid } : {}) } });
      try {
        if (!given) return review("invalid", "the answer has no route");
        if (given.toLowerCase() === "keep") return review("keep");
        const choice = answer?.type === "choice" ? answer.choice : "";
        const why = reviewWhy(block.kind);
        const plan = block.routes.planFor(given, hpAfter ? hpAfter(choice) : (env.state.run?.current_hp ?? 0), why);
        if (!plan) return review("invalid", `unknown route "${given}"`);
        const runId = str(env.state.raw["run_id"]);
        const ref = result.plan?.id ?? nextPlanRef(env, block.kind === "card" ? "reward" : "rest");
        const steps: JsonValue[] = result.plan ? [...(asArray(result.plan.steps) as JsonValue[]), given] : [choice, given];
        const from = block.routes.remaining.map((step) => step.type).join(" -> ");
        return {
          ...result,
          rationale: `${result.rationale}; route changed (${why}) to ${plan.summary}`,
          plan: { id: ref, steps },
          apply: () => {
            result.apply?.();
            // A one-shot choice already counted its plan reference; a card reward's plan is this one.
            if (!result.plan) usePlanRef(env.screenMemory, runId);
            env.screenMemory.routePlan = plan;
          },
          routeReview: { answer: given, outcome: "change", reason, change: { ref, step: steps.length, key: given, from, to: plan.summary, why } },
        };
      } catch (error) {
        return review("invalid", `route review failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 200));
      }
    },
  };
}

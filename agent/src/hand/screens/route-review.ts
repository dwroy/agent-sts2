/**
 * The act's route riding on the questions the brain already answers (M2; Dai 2026-09-29): the card reward, the rest
 * site (the one-shot rest plan or the step-by-step question) and the last question of an event. No extra call: the
 * route rides in the question's state (state.route_review) and the answer's `route`.
 *
 * What it shows (facts only, no scores or ranks): the act's whole map with where we stand, the plan's remaining
 * route, and the plan's facts projected from HP now (strategy/route-map.ts routeFacts: HP on arrival at each node,
 * median and p75; each rest site healed or smithed; the fights before the next rest site; the next elite and the
 * boss; at a rest site, what each of its options leaves), and next_rest (Dai 2026-10-03, experience
 * route-replan-on-drop): the kept route's stretch to its next rest site and the best stretch through each next node,
 * each with its fights, "?" rooms, shop, HP on arriving there and HP on entering the route's next elite, one clearly
 * worse on the same floor saying so; a change logs the same comparison for the route it took. The answer's `route` is "keep" (the default) or a new node
 * sequence from here to the boss, checked like map/route-plan's (the AnswerSpec re-asks once with the errors; a
 * route still illegal then keeps the plan and is logged). A change is stored as the act's route plan and logged as
 * its own map/route-change row: a step of this decision's plan (no call of its own). The choice itself is never
 * changed or blocked by the route.
 */

import type { Decision, DecisionEnv, ResolvedAction, RouteReviewResult } from "../../memory/types.js";
import { asArray, asRecord, str, type JsonValue } from "../../core/util/json.js";
import { checkRoute, floorOfRow, hasChoiceAhead, isKeep, nextRestVersus, nodeId, roomName, routeAnswerText, routeIds, routeText, type RouteMap } from "../../sim/route-map.js";
import type { RoomCostModel } from "../../sim/route-projection.js";
import { roomPosition } from "./map.js";
import { nextPlanRef, usePlanRef } from "./oneshot.js";
import { actPlan, makeRoutePlan, mapActOf, mapFromMemory, nextPlannedStep, remainingIds, routeBlockState, routeCosts, wingedBootsLeft, type RoutePlan } from "./route-plan.js";

export type ReviewKind = "card" | "rest" | "event";

/** A rest option's HP for the route facts: the option keys it covers, its kind, and the HP (and max HP) it leaves. */
export interface RestOptionHp {
  keys: string[];
  kind: string;
  hp: number;
  /** Max HP after it, when the option changes it (resting with Stone Humidifier); max HP now otherwise. */
  max?: number;
}

export interface RouteBlock {
  kind: ReviewKind;
  /** What the brain sees as state.route_review. */
  state: Record<string, JsonValue>;
  /** The answer format, for the question's note. */
  note: string;
  /** The map from the room we are in (the answer is checked on it). */
  map: RouteMap;
  plan: RoutePlan;
  /** The plan's node ids from the next node on. */
  remaining: string[];
  costs: RoomCostModel;
}

/** The answer format (added to the question's instructions). */
export const ROUTE_REVIEW_NOTE =
  "state.route_review 是本幕路线：完整地图（map，节点 id 规则见 map_legend）、你的位置和下一步可走的节点（next_nodes）、" +
  "你的路线计划（plan，代码按它逐个节点走）和按现在 HP 算的计划事实（plan_facts）。先定路线，再定本题：在同一个 JSON 里加 " +
  '"route"："keep"（默认，照计划走）或新的节点序列（从 next_nodes 之一出发，沿连线或用飞行靴，一直到 boss，节点 id 用空格分隔），' +
  '以及 "route_reason"（15 字以内）。next_rest 是保留（keep，你的计划）和换线（switch，经每个下一步节点）各自到下一个休息点的战斗数和到达 HP、下一只精英的进场 HP：改线前比一比。';

const REST_NOTE = "plan_facts.if_option 是本题每个选项之后的 HP 对应的下一只精英和 boss 前血量。";

/** Why the act's plan was replaced, for the route plan and the run journal. */
export function reviewWhy(kind: ReviewKind): string {
  return kind === "card" ? "card-reward review" : kind === "rest" ? "rest-site review" : "event review";
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
 * The route block for this card reward ("card"), rest site ("rest", with each option's HP) or event page ("event"),
 * or null when there is none to show: the position unknown, no plan for the act, the plan not going on from here
 * (the next map re-plans it), or nothing left to choose on the way to the boss. Never throws: a failure here leaves
 * the question without the block.
 */
export function routeReviewBlock(env: DecisionEnv, kind: ReviewKind, rooms: readonly string[], restOptions: RestOptionHp[] = []): RouteBlock | null {
  try {
    const { state, screenMemory } = env;
    const runId = str(state.raw["run_id"]);
    const floor = state.run?.floor ?? null;
    const remembered = screenMemory.lastMap;
    if (remembered?.act != null && state.run?.act_id != null && remembered.act !== state.run.act_id) return null;
    const here = roomPosition(remembered, runId, floor, rooms);
    if (!remembered || !here || floor === null) return null;
    const act = mapActOf(state);
    const plan = actPlan(env, act);
    if (!plan) return null;
    const map = mapFromMemory(remembered, act, here, wingedBootsLeft(state.run?.raw));
    if (!hasChoiceAhead(map)) return null;
    const next = nextPlannedStep(plan, here);
    if (!next || !map.next.includes(nodeId(next.row, next.col))) return null;
    const remaining = remainingIds(plan, here);
    if (checkRoute(map, remaining).length > 0) return null;
    const costs = routeCosts(env, act);
    const max = state.run?.max_hp ?? 0;
    const start = { hp: state.run?.current_hp ?? 0, max };
    const options = restGroups(restOptions, max);
    const runPlanHp = runPlanHpLines(env);
    const blockState: Record<string, JsonValue> = {
      ...routeBlockState({ map, plan: remaining, start, costs, chain: here.fights, options, ...restStart(options, start) }),
      vs_plan: vsPlan(plan, map, remaining, start, kind),
      ...(runPlanHp.length > 0 ? { run_plan_hp: runPlanHp.join(" ") } : {}),
    };
    return { kind, state: blockState, note: kind === "rest" ? `${ROUTE_REVIEW_NOTE}${REST_NOTE}` : ROUTE_REVIEW_NOTE, map, plan, remaining, costs };
  } catch {
    return null;
  }
}

/** HP now against what the plan projected when it was made: its next node, its next elite and the boss. */
function vsPlan(plan: RoutePlan, map: RouteMap, remaining: string[], start: { hp: number; max: number }, kind: ReviewKind): string {
  const steps = plan.path.filter((step) => remaining.includes(nodeId(step.row, step.col)));
  const at = (step: (typeof steps)[number]): string => `F${floorOfRow(map, step.row)} ${roomName(step.type)} ${Math.round(step.hpOnArrival * start.max)}/${start.max}`;
  const next = steps[0];
  const elite = steps.find((step) => step.type === "Elite");
  const boss = steps.find((step) => step.type === "Boss");
  const points = [...(next ? [`下一节点 ${at(next)}`] : []), ...(elite && elite !== next ? [`精英 ${at(elite)}`] : []), ...(boss && boss !== next ? [`boss ${at(boss)}`] : [])];
  return `计划在 F${plan.floor ?? "?"} 定（当时 HP ${Math.round(plan.hpPct * 100)}%），当时预计到达：${points.join("，")}；现在 HP ${start.hp}/${start.max}${kind === "rest" ? "（本休息点的选项还没算进去）" : ""}`;
}

/**
 * At a rest site the stretches to the next rest site start from the HP its heal leaves (the option leaving the most
 * HP): from HP now a low HP runs out on every route alike and nothing tells them apart (QWXKQVYQGGCJ F25 at 30/91).
 */
export function restStart(options: { label: string; hp: number; max: number }[], now: { hp: number; max: number }): { nextRest?: { start: { hp: number; max: number }; note: string } } {
  const most = [...options].sort((a, b) => b.hp - a.hp)[0];
  if (!most || most.hp <= now.hp) return {};
  return { nextRest: { start: { hp: most.hp, max: most.max }, note: `从本休息点 ${most.label} 后的 HP ${most.hp}/${most.max} 起；不回血就从现在的 ${now.hp}/${now.max} 起` } };
}

/** Rest options grouped by the HP they leave: "o0 HEAL", "o1 SMITH, o2 LIFT". */
function restGroups(options: RestOptionHp[], maxNow: number): { label: string; hp: number; max: number }[] {
  const byHp = new Map<string, RestOptionHp[]>();
  for (const option of options) {
    const key = `${option.hp}/${option.max ?? maxNow}`;
    byHp.set(key, [...(byHp.get(key) ?? []), option]);
  }
  return [...byHp.values()].map((list) => ({ label: list.map((option) => `${option.keys[0]} ${option.kind}`).join(", "), hp: list[0]!.hp, max: list[0]!.max ?? maxNow }));
}

/**
 * The question with the route block attached: the answer is resolved as before, then its `route` (and
 * `route_reason`): keep, a change (stored as the act's route plan when the choice is played, a plan step after the
 * choice), or invalid (kept, logged). The choice itself is never changed or blocked. `hpAfter` gives the HP
 * (absolute) the chosen option leaves (a rest site's heal); by default HP now.
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
      const given = routeAnswerText(raw["route"]);
      const reason = typeof raw["route_reason"] === "string" ? raw["route_reason"].trim() : "";
      const review = (outcome: RouteReviewResult["outcome"], invalid?: string): ResolvedAction => ({ ...result, routeReview: { answer: given || null, outcome, reason, ...(invalid ? { invalid } : {}) } });
      try {
        if (!given) return review("invalid", "the answer has no route");
        if (isKeep(given)) return review("keep");
        const ids = routeIds(given);
        if (!ids) return review("invalid", `route "${given.slice(0, 60)}" names no node ids`);
        const problems = checkRoute(block.map, ids);
        if (problems.length > 0) return review("invalid", problems.join("; ").slice(0, 300));
        // The plan's own route again is a keep.
        if (ids.join(" ") === block.remaining.join(" ")) return review("keep");
        const choice = answer?.type === "choice" ? answer.choice : "";
        const why = reviewWhy(block.kind);
        const start = { hp: hpAfter ? hpAfter(choice) : (env.state.run?.current_hp ?? 0), max: env.state.run?.max_hp ?? 0 };
        const plan = makeRoutePlan(env, block.map, ids, start, block.costs, why);
        // The new route against the kept one at their next rest sites, from the HP this choice leaves (logged; not a block).
        const nextRest = nextRestVersus(block.map, block.remaining, ids, start, block.costs);
        const runId = str(env.state.raw["run_id"]);
        const ref = result.plan?.id ?? nextPlanRef(env, block.kind === "card" ? "reward" : block.kind);
        const key = ids.join(" ");
        const steps: JsonValue[] = result.plan ? [...(asArray(result.plan.steps) as JsonValue[]), key] : [choice, key];
        const from = routeText(block.map, block.remaining);
        return {
          ...result,
          rationale: `${result.rationale}; route changed (${why}) to ${plan.summary}${nextRest ? `; next rest: ${nextRest.text}${nextRest.worse ? " (clearly worse than the kept route)" : ""}${nextRest.eliteWorse ? " (clearly lower at the next elite)" : ""}` : ""}`,
          plan: { id: ref, steps },
          apply: () => {
            result.apply?.();
            // A one-shot choice already counted its plan reference; a card reward's plan is this one.
            if (!result.plan) usePlanRef(env.screenMemory, runId);
            env.screenMemory.routePlan = plan;
          },
          routeReview: { answer: key, outcome: "change", reason, change: { ref, step: steps.length, key, from, to: plan.summary, why, ...(nextRest ? { nextRest } : {}) } },
        };
      } catch (error) {
        return review("invalid", `route review failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 200));
      }
    },
  };
}

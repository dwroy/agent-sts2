/**
 * RUN_PLAN_MERGE (default on; Roy 2026-10-02: "进入新的一幕 为什么不直接先进去，然后一起问ds 选项和 这一幕的所有规划呢"): a due
 * run plan rides on the next DeepSeek question instead of its own call at the map.
 *
 * Why: entering a new act paused twice, first at the map for the run plan (TMNFVW6DRQ20 F17 16 s; V4.3 to 10-02 11:15:
 * 94 plans in 14 runs, median 31 s, max 90 s, 54 min in all), then in the Ancient's act-plan question. The run plan reads
 * the same deck, relics, HP, boss clock and map the next question reads, and that question came right after it: on the
 * same map (the run start: map/route-plan, 14 of 14), the next floor (56) or two floors on, past the act's treasure room
 * (22); never later (notes/run-plan-merge.md).
 *
 * How it goes:
 * - The MAP screen keeps runPlanTrigger's checkpoints (start, act, hp_drop, review) as they were. A due plan is marked
 *   pending (memory.runPlanPending) instead of asked. The run start is also due on the run's first question (act 1's
 *   Neow, before the first map), like the act-start Ancient of acts 2 and 3.
 * - The next DeepSeek question (any of them: card reward, rest site, shop, event, the act-start Ancient, the route plan,
 *   the one-shot plans) carries it: state.run_plan_task (why it is due; the deck, relics, HP and clock are the question's
 *   facts) and RUN_PLAN_MERGE_NOTE in its instructions (the run plan's own brief and format), answered as one more
 *   field, "run_plan", in the same JSON object. The question's own answer is read exactly as before.
 * - A valid run_plan is stored and logged as a separate call's was (screenMemory.runPlan, run-plans.jsonl with its
 *   trigger and merged_into, the journal). None, or not a plan: still pending, the next question carries it again.
 * - Its own call (as before) only when the map has waited RUN_PLAN_MERGE_FLOORS floors with it pending, or when the act
 *   boss is the next room: the boss fight is played before any question could carry it (its card reward is the next
 *   question, and the act trigger replaces the plan at the map after it).
 *
 * Questions with nothing pending are sent exactly as before; RUN_PLAN_MERGE=off asks at the map exactly as before.
 */

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../hand/mod/schema.js";
import type { AskDecision, ScreenMemory } from "./types.js";
import { asArray, asRecord, str, toJsonValue, type JsonValue } from "../core/util/json.js";
import { fightPlanInput } from "./fight-plan.js";
import { actOf, isRunPlanReply, loadRunPlan, RUN_PLAN_BRIEF, RUN_PLAN_FORMAT, RUN_PLAN_TASK_KEY, runPlanInput, runPlanTrigger, type RunPlan, type RunPlanTrigger } from "./run-plan.js";

/**
 * Floors a due plan waits for a question to carry it before the map asks for it on its own. 2: in the 94 V4.3 plans the
 * next question came on the same floor or one or two floors on, the two only past a treasure room (F10, F26: no question
 * there); at 2 the fallback fires only when the answers left the plan out (or a room asked nothing where every logged
 * one asked), and a plan is never more than two floors late.
 */
export const RUN_PLAN_MERGE_FLOORS = 2;

export interface RunPlanPending {
  runId: string;
  trigger: RunPlanTrigger;
  /** The floor it became due on. */
  floor: number;
}

/** Added to the instructions of a question a due run plan rides on. */
export const RUN_PLAN_MERGE_NOTE = [
  "ALSO DUE NOW: your run plan (state.run_plan_task says why, and where your current plan is). Settle it first, then",
  "decide this question with it in mind.",
  RUN_PLAN_BRIEF,
  "Reply to this question in its own JSON format as asked, with one more field in the same JSON object:",
  `"run_plan": ${RUN_PLAN_FORMAT}`,
].join(" ");

/** The fields of runPlanInput a question's facts (strategy/build-facts.ts) already carry. */
const IN_FACTS = ["act", "floor", "ascension", "hp", "gold", "act_boss", "act_boss_clock", "deck_size", "deck_profile", "deck", "relics", "potions", "potion_slots"] as const;

/** The run plan in force for this run: the screen memory's, else the last one logged (a restart). */
export function currentRunPlan(memory: ScreenMemory, logFile: string, runId: string): RunPlan | null {
  if (!memory.runPlan || memory.runPlan.runId !== runId) memory.runPlan = loadRunPlan(logFile, runId);
  return memory.runPlan && memory.runPlan.runId === runId ? memory.runPlan : null;
}

/** Whether every node the map offers is the act boss (the map before the boss fight). */
export function nextRoomIsBoss(state: GameState): boolean {
  const available = asArray(asRecord(state.raw["map"])["available_nodes"]).map(asRecord);
  return available.length > 0 && available.every((node) => str(node["node_type"]) === "Boss");
}

export type MapRunPlanStep =
  | { action: "none" }
  /** Pending: it rides on the next question (`fresh`: it became due on this map). */
  | { action: "wait"; trigger: RunPlanTrigger; since: number; fresh: boolean }
  /** Asked here with its own call, as before (why). */
  | { action: "ask"; trigger: RunPlanTrigger; why: string };

/**
 * What a MAP screen does about the run plan with RUN_PLAN_MERGE (memory.runPlanPending updated): nothing due; due and
 * pending for the next question; or asked here, because the act boss is next or it has been pending
 * RUN_PLAN_MERGE_FLOORS floors.
 */
export function runPlanAtMap(memory: ScreenMemory, state: GameState, plan: RunPlan | null): MapRunPlanStep {
  const runId = str(state.raw["run_id"]);
  const floor = state.run?.floor ?? 0;
  const trigger = runPlanTrigger(plan, state);
  if (!trigger) {
    memory.runPlanPending = undefined;
    return { action: "none" };
  }
  const pending = memory.runPlanPending?.runId === runId ? memory.runPlanPending : undefined;
  const fresh = !pending;
  const since = pending?.floor ?? floor;
  memory.runPlanPending = { runId, trigger, floor: since };
  if (nextRoomIsBoss(state)) return { action: "ask", trigger, why: "the act boss is next: its fight comes before any question could carry the plan" };
  if (floor - since >= RUN_PLAN_MERGE_FLOORS) return { action: "ask", trigger, why: `pending since F${since} and no question carried it` };
  return { action: "wait", trigger, since, fresh };
}

/**
 * The trigger of a run plan this question should carry, or null: the one pending (still due by runPlanTrigger, else
 * the trigger it became due with), or the run start on the run's first question (no plan for this run yet: act 1's
 * Neow comes before the first map). Sets the pending record for the start.
 */
export function runPlanDueAtQuestion(memory: ScreenMemory, state: GameState, plan: RunPlan | null): RunPlanTrigger | null {
  const runId = str(state.raw["run_id"]);
  if (!runId) return null;
  const now = runPlanTrigger(plan, state);
  const pending = memory.runPlanPending?.runId === runId ? memory.runPlanPending : undefined;
  if (pending) return now ?? pending.trigger;
  if (now !== "start") return null;
  memory.runPlanPending = { runId, trigger: "start", floor: state.run?.floor ?? 0 };
  return "start";
}

/**
 * What the question shows of the run plan task (state.run_plan_task): why it is due and the run plan input the
 * question's facts do not already carry (with facts: only the trigger; without: all of it, as the separate call had
 * it), and where the current plan is.
 */
export function runPlanTaskState(state: GameState, knowledge: Knowledge, trigger: RunPlanTrigger, plan: RunPlan | null, questionState: Record<string, JsonValue>): Record<string, JsonValue> {
  const facts = asRecord(questionState["facts"]);
  const covered = IN_FACTS.every((key) => key in facts);
  let input: Record<string, JsonValue> = { trigger };
  if (!covered) {
    const shown = fightPlanInput(state, knowledge, "run", {});
    const full = runPlanInput(state, knowledge, trigger, asArray(shown["deck"]).map(String), asArray(shown["relics"]).map(String), asArray(shown["potions"]).map(String));
    input = Object.fromEntries(Object.entries(full).filter(([key]) => key === "trigger" || !(key in facts)));
  }
  const why = trigger === "start" ? "the run start" : trigger === "act" ? `act ${actOf(state)} begins` : trigger === "hp_drop" ? "a heavy HP loss since the plan" : `the plan is ${String((state.run?.floor ?? 0) - (plan?.floor ?? 0))} floors old`;
  const inFacts = facts["your_run_plan"] !== undefined;
  return {
    ...input,
    due_because: why,
    ...(covered ? { facts: "the deck, relics, potions, HP, gold, act boss and act_boss_clock are in state.facts" } : {}),
    // The current plan's content is facts.your_run_plan; when it was made is shown here (the separate call had it whole).
    ...(plan
      ? inFacts
        ? { current_plan: { in: "state.facts.your_run_plan", made_in_act: plan.act, made_on_floor: plan.floor, hp_then: `${Math.round(plan.hpPct * 100)}%`, made_because: plan.trigger } }
        : { previous_plan: toJsonValue(plan) }
      : { current_plan: null }),
  };
}

/** The question with the run plan task on it: state.run_plan_task and the note after its instructions. */
export function withRunPlanTask(decision: AskDecision & { deepseek: NonNullable<AskDecision["deepseek"]> }, task: Record<string, JsonValue>): AskDecision {
  const key = decision.deepseek.question;
  const question = decision.questions[key];
  if (question?.type !== "choice") throw new Error(`the run plan rides on a choice question; ${decision.label}'s ${key} is not one`);
  return {
    ...decision,
    state: { ...decision.state, [RUN_PLAN_TASK_KEY]: task },
    questions: { ...decision.questions, [key]: { ...question, instructions: `${question.instructions} ${RUN_PLAN_MERGE_NOTE}` } },
  };
}

/** The run plan in an answer's run_plan field, or why there is none usable. */
export function ridingPlanOf(value: unknown): { plan: Record<string, unknown> } | { missing: string } {
  if (value === undefined || value === null) return { missing: "the answer has no run_plan" };
  if (typeof value !== "object" || Array.isArray(value)) return { missing: `run_plan is not an object: ${JSON.stringify(value).slice(0, 80)}` };
  const plan = value as Record<string, unknown>;
  return isRunPlanReply(plan) ? { plan } : { missing: `run_plan is not a run plan: ${JSON.stringify(plan).slice(0, 80)}` };
}

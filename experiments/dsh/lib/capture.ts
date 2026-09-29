/**
 * Rebuilds the DeepSeek request of each target question the way the live client (v3) would send it now.
 *
 * The logs do not keep DeepSeek's `state` (only the question, option keys and run memory), so each target's
 * run is replayed through the run journal (src/project/journal-replay.ts, the loop's own restart path) and,
 * at the target decision, the screen planner (planDecision) is run on the logged game state with the replayed
 * screen memory. That gives the live `state`, question and options; the journal gives the run memory. The
 * user message is then built by the live helpers (choiceMessage / taskMessage). Run plans are rebuilt the way
 * ensureRunPlan builds them (runPlanInput + RUN_PLAN_TASK + previous plan).
 *
 * The same capture is used twice: to write the dataset (build-dataset.ts) and to judge the arms' answers with
 * the live resolvers (judge.ts), which need the planner's closures.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../../../src/config.js";
import { makeKnowledge, type Knowledge } from "../../../src/knowledge/index.js";
import { choiceMessage, taskMessage } from "../../../src/llm/deepseek-message.js";
import type { GameState } from "../../../src/mod/schema.js";
import { replayRun } from "../../../src/project/journal-replay.js";
import { buildRunBrief } from "../../../src/project/run-brief.js";
import type { RunJournal } from "../../../src/project/run-journal.js";
import type { AskDecision, DecisionEnv, ScreenMemory } from "../../../src/project/types.js";
import { planDecision } from "../../../src/screens/index.js";
import { fightPlanInput } from "../../../src/strategy/fight-plan.js";
import { RUN_PLAN_TASK, runPlanInput, runPlanLine, type RunPlanTrigger } from "../../../src/strategy/run-plan.js";
import { asArray, asRecord, bool, str, toJsonValue, type JsonValue } from "../../../src/util/json.js";

type Row = Record<string, JsonValue>;

export interface Target {
  id: string;
  kind: "decision" | "run-plan";
  label: string;
  run_id: string;
  decision_ts?: string;
  plan_ts?: string;
  observed_ts?: string | null;
  floor?: number | null;
  trigger?: string;
  failure?: string | null;
  logged: Record<string, JsonValue>;
}

export interface Captured {
  target: Target;
  state: GameState;
  env: DecisionEnv;
  /** The screen's ask (decisions); null for a run plan. */
  decision: AskDecision | null;
  /** The label the current code asks under (may differ from the logged one: rest/choose -> rest/plan). */
  label: string;
  kind: "pick" | "shop-plan" | "run-plan";
  instructions: string;
  criteria: Record<string, string | null>;
  dsState: Record<string, JsonValue>;
  memory: Record<string, JsonValue>;
  userMessage: string;
  runPlanTrigger?: string;
  /** Why the target could not be rebuilt as a DeepSeek question (then nothing else is set). */
  skipped?: string;
}

export const ROOT = new URL("../../../", import.meta.url).pathname;
export const DATA = join(ROOT, "experiments/dsh/data");

export function setup(): { config: ReturnType<typeof loadConfig>; knowledge: Knowledge } {
  // The live .env has no settings that change the questions beyond these (BUILD_ONESHOT and BUILD_DECIDER default on/deepseek).
  const env = {
    ...process.env,
    DEEPSEEK_API_KEY: "unused-for-capture",
    DEEPSEEK_MODEL: "deepseek-flash",
    DEEPSEEK_REASONING_EFFORT: "max",
    DEEPSEEK_COMBAT_REASONING_EFFORT: "high",
    DEEPSEEK_TIMEOUT_MS: "300000",
    ESCALATION_CHAIN: "deepseek",
    RUN_PLAN: "v1",
    FIGHT_PLAN: "off",
    JEV_CONTEXT: "v1",
    TARGET_ASCENSION: "9",
    STRICT_JEV: "true",
  } as NodeJS.ProcessEnv;
  const config = loadConfig(env);
  const knowledge = makeKnowledge(JSON.parse(readFileSync(join(ROOT, ".cache/game-data.json"), "utf8")).collections, "cache");
  return { config, knowledge };
}

function lines(file: string): Row[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row);
}

class Stop extends Error {}

function makeEnv(state: GameState, knowledge: Knowledge, config: ReturnType<typeof setup>["config"], replayMemory: ScreenMemory): DecisionEnv {
  // The loop's per-screen memory reset (loop.ts), on a copy so the replay's own memory is untouched.
  const screenMemory: ScreenMemory = { ...replayMemory, screen: state.screen, shopOpened: false, cardRewardSkipped: false, combatPlan: null };
  if (state.screen === "SHOP" && bool(asRecord(state.raw["shop"])["is_open"])) screenMemory.shopOpened = true;
  if (state.screen === "MAP" || state.in_combat) {
    screenMemory.shopPlan = undefined;
    screenMemory.pendingPick = undefined;
  }
  const brief = buildRunBrief(state, knowledge);
  const line = screenMemory.runPlan && screenMemory.runPlan.runId === str(state.raw["run_id"]) ? runPlanLine(screenMemory.runPlan) : null;
  if (line) brief.plan = line;
  return {
    state,
    knowledge,
    brief,
    screenMemory,
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: config.combatPlanner,
    shopDiscardPotions: config.shop.discardPotions,
    jevContext: config.jevContext,
    fightPlan: config.fightPlan,
    buildDecider: "deepseek",
    oneshot: config.buildOneshot,
  };
}

function captureDecision(target: Target, state: GameState, journal: RunJournal, memory: ScreenMemory, knowledge: Knowledge, config: ReturnType<typeof setup>["config"]): Captured {
  const env = makeEnv(state, knowledge, config, memory);
  const base = { target, state, env } as const;
  const outcome = planDecision(env);
  if (outcome.kind !== "decision") {
    return { ...base, decision: null, label: target.label, kind: "pick", instructions: "", criteria: {}, dsState: {}, memory: {}, userMessage: "", skipped: `planner: ${outcome.kind} (${outcome.reason.slice(0, 80)})` };
  }
  const planned = outcome.decision;
  if (planned.kind !== "ask" || !planned.deepseek) {
    return { ...base, decision: null, label: planned.label, kind: "pick", instructions: "", criteria: {}, dsState: {}, memory: {}, userMessage: "", skipped: `current planner does not ask DeepSeek here (${planned.kind} ${planned.label})` };
  }
  const spec = planned.deepseek;
  const question = planned.questions[spec.question];
  if (!question || question.type !== "choice") {
    return { ...base, decision: null, label: planned.label, kind: "pick", instructions: "", criteria: {}, dsState: {}, memory: {}, userMessage: "", skipped: "question is not a choice" };
  }
  const rendered = journal.render(state, knowledge, env.screenMemory, { label: planned.label, criteria: question.criteria, factsCovered: "facts" in planned.state, ...(spec.offeredCards ? { offeredCards: spec.offeredCards } : {}) });
  const mem = { ...rendered } as unknown as Record<string, JsonValue>;
  const userMessage = choiceMessage(planned.state, question.instructions, question.criteria, mem);
  return {
    ...base,
    decision: planned,
    label: planned.label,
    kind: spec.plan ? "shop-plan" : "pick",
    instructions: question.instructions,
    criteria: question.criteria,
    dsState: planned.state,
    memory: mem,
    userMessage,
  };
}

function captureRunPlan(target: Target, state: GameState, journal: RunJournal, memory: ScreenMemory, knowledge: Knowledge, config: ReturnType<typeof setup>["config"]): Captured {
  const env = makeEnv(state, knowledge, config, memory);
  const trigger = (target.trigger ?? "review") as RunPlanTrigger;
  const rendered = journal.render(state, knowledge, env.screenMemory, { label: "run-plan", factsCovered: true });
  const mem = { ...rendered } as unknown as Record<string, JsonValue>;
  const shown = fightPlanInput(state, knowledge, "run", {});
  const previous = env.screenMemory.runPlan && env.screenMemory.runPlan.runId === str(state.raw["run_id"]) ? env.screenMemory.runPlan : undefined;
  const payload: Record<string, JsonValue> = {
    task: RUN_PLAN_TASK,
    run_state: runPlanInput(state, knowledge, trigger, asArray(shown["deck"]).map(String), asArray(shown["relics"]).map(String), asArray(shown["potions"]).map(String)),
    memory: mem,
    ...(previous ? { previous_plan: toJsonValue(previous) } : {}),
  };
  return { target, state, env, decision: null, label: "run-plan", kind: "run-plan", instructions: RUN_PLAN_TASK, criteria: {}, dsState: asRecord(payload["run_state"]) as Record<string, JsonValue>, memory: mem, userMessage: taskMessage(payload), runPlanTrigger: trigger };
}

/**
 * Replays each target's run and calls `visit` with the rebuilt question at its decision. Decision targets of
 * one run share a replay; each run-plan target gets its own (its own logged plan must not be filed yet).
 */
export function captureAll(targets: Target[], visit: (captured: Captured) => void, options: { only?: Set<string> } = {}): void {
  const { config, knowledge } = setup();
  const byRun = new Map<string, Target[]>();
  for (const target of targets) {
    if (options.only && !options.only.has(target.id)) continue;
    const list = byRun.get(target.run_id) ?? [];
    list.push(target);
    byRun.set(target.run_id, list);
  }
  for (const [runId, list] of byRun) {
    const states = lines(join(DATA, "runs", `${runId}.states.jsonl`));
    const decisions = lines(join(DATA, "runs", `${runId}.decisions.jsonl`));
    const runPlans = lines(join(DATA, "runs", `${runId}.runplans.jsonl`));
    const decisionTargets = list.filter((t) => t.kind === "decision");
    const planTargets = list.filter((t) => t.kind === "run-plan");
    const seen = new Set<string>();
    if (decisionTargets.length > 0) {
      const byTs = new Map(decisionTargets.map((t) => [t.decision_ts!, t]));
      try {
        replayRun({ runId, states, decisions, runPlans }, knowledge, {
          beforeRecord(state, row, journal, memory) {
            const target = byTs.get(str(row["ts"]));
            if (!target) return;
            seen.add(target.id);
            visit(captureDecision(target, state, journal, memory, knowledge, config));
            if (seen.size >= decisionTargets.length) throw new Stop();
          },
        });
      } catch (error) {
        if (!(error instanceof Stop)) throw error;
      }
    }
    for (const target of planTargets) {
      // Its own row is left out: the plan it made must not be in the memory it was asked with.
      const others = runPlans.filter((row) => str(row["ts"]) !== target.plan_ts);
      let done = false;
      try {
        replayRun({ runId, states, decisions, runPlans: others }, knowledge, {
          beforeRecord(state, row, journal, memory) {
            if (done || state.screen !== "MAP") return;
            const observed = str(row["observed_ts"]);
            const match = target.observed_ts
              ? observed === target.observed_ts
              : (state.run?.floor ?? null) === (target.floor ?? null) && str(row["ts"]) >= target.plan_ts! && (!observed || observed <= target.plan_ts!);
            if (!match) return;
            done = true;
            seen.add(target.id);
            visit(captureRunPlan(target, state, journal, memory, knowledge, config));
            throw new Stop();
          },
        });
      } catch (error) {
        if (!(error instanceof Stop)) throw error;
      }
    }
    for (const target of list) {
      if (!seen.has(target.id)) visit({ target, state: null as unknown as GameState, env: null as unknown as DecisionEnv, decision: null, label: target.label, kind: "pick", instructions: "", criteria: {}, dsState: {}, memory: {}, userMessage: "", skipped: "target row not reached in the replay" });
    }
  }
}

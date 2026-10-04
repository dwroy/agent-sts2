/**
 * The decision log (PLAN.md §10.1): one JSONL record per decision, holding the exact state
 * fingerprint, the questions, the answers, and the action taken. This is what makes tuning possible
 * and what makes `replay` meaningful.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import type { BrainDecider } from "../brain/types.js";
import type { JsonValue } from "../util/json.js";

export interface DecisionRecord {
  ts: string;
  mode: string;
  screen: string;
  session: string;
  floor: number | null;
  turn: number | null;
  label: string;
  /** This decision's id: Jev's prompts for it (jev-prompts.jsonl) carry the same one. */
  decision_id?: string;
  /**
   * Who made this call: code (rules/solver), jev, a model (the brain engine that answered: deepseek, codex, claude, or
   * "deepseek (for codex)" when the router's fallback answered; a v3 escalation's deepseek / claude), or code after an
   * unusable model answer. Before 2026-10-03 every brain answer was logged as deepseek, whichever engine gave it.
   */
  decider?: "code" | "jev" | "code-fallback" | BrainDecider;
  fingerprint: string;
  questions?: Record<string, JsonValue>;
  answers?: JsonValue;
  chosen?: JsonValue;
  /**
   * What the chosen action's indices pointed at when it was decided (V4 M3 execution gate, act/identity.ts):
   * {card, target, potion, node, option, turn, hand, from}, the parts that apply.
   */
  expect?: JsonValue;
  /**
   * The execution gate refused the action (V4 M3): {at: "decision" | "dispatch", kind: "identity" (its indices hold
   * something else now) | "legality" (only logged at dispatch), reason, expected, actual}. The row's result is
   * "not dispatched: gate refused …".
   */
  gate_reject?: JsonValue;
  rationale: string;
  confidence: number | null;
  fallback: boolean;
  /** A model was asked a second time for this decision: Jev's follow-up, or DeepSeek's re-ask by the consistency guard. */
  reasked: boolean;
  /** True when a Jev-eligible decision was resolved by code because the loop ran without Jev. */
  no_jev: boolean;
  /** True when the answer came from the memo instead of a fresh call (so `usage` is zero). */
  reused_answer: boolean;
  /** `usage` counts the tokens spent on *this* decision; these are the calls behind it. */
  request_ids: string[];
  /**
   * plan: the loop's own time after the planner returned, to the row (the gate, the memo, Jev's stale-board re-read), not
   * the planner's; jev / deepseek: the model calls; action: the dispatch. planner (2026-10-04): the screen planner's wall
   * time (planDecision: the solver, the rollout, B2, the SL judge's checks; the parts in the combat row's `timing`), and
   * pre: from the state read (observed_ts) to the planner's start (the journal, the SL controller's observe, run and fight
   * plans, a thief's card value). Absent on rows of a decision not planned this read (a plan's later steps, the memo).
   */
  latency_ms: { plan: number; jev: number; action: number; deepseek?: number; planner?: number; pre?: number };
  /**
   * Tokens spent on this decision by whoever decided it (Jev, or DeepSeek when decider=deepseek; a
   * DeepSeek escalation's tokens are added too). DeepSeek also reports its cache-hit and reasoning tokens.
   */
  usage: { input_tokens: number; output_tokens: number; cache_hit_tokens?: number; reasoning_tokens?: number };
  /** Present when the decision was escalated to DeepSeek. */
  escalation?: JsonValue;
  /**
   * BUILD_DECIDER=deepseek: DeepSeek decided this screen itself ({by, direct, choice, reason, latency_ms,
   * tokens, …}); kept apart from `escalation`, whose records compare against a Jev answer.
   */
  deepseek?: JsonValue;
  /** Why a DeepSeek-decided screen was decided by Jev/code instead. */
  deepseek_fallback?: string;
  /** DeepSeek's answer failed the consistency guard: {first, second, resolution, choice} (see src/llm/consistency.ts). */
  deepseek_consistency?: JsonValue;
  /** Jev context version of this question (JEV_CONTEXT), present when not "off". */
  jev_context?: string;
  /** Fight-hint ids sent to Jev (src/knowledge/jev-hints.json). */
  jev_hints?: string[];
  /** Combat plan choice: the rollout behind the facts shown to Jev ({ms, horizon, samples, degraded, best, …}). */
  rollout?: JsonValue;
  /** Combat plan choice: Jev's pick was the rollout's best line (null: no pick, or no rollout). */
  rollout_best_chosen?: boolean | null;
  /**
   * Combat plan choice (2026-10-04): the combat planner's time to the question and its parts (planner, solve, mc, rollout,
   * boss_sim, other ms), the process's CPU over it, the machine's load, B2's fights done, the SL retry memo's hits
   * (combat-plan.ts plannerTiming). The row's latency_ms.planner is the whole planner call's wall time on every screen.
   */
  timing?: JsonValue;
  /**
   * The boss simulation behind this decision. Boss fights (B2, BOSS_SIM_LINES, src/sim/boss-lines.ts): the whole-fight
   * simulation of the lines shown ({ms, samples, best, lines, plan, …}). Deck-building questions (B3, BOSS_SIM_BUILD,
   * src/sim/build-sim-facts.ts): the act boss simulation the options carried (numbers and timing). One decision has one.
   */
  boss_sim?: JsonValue;
  /**
   * Combat plan choice with a carrying thief alive (THIEF_FACTS, docs/thief.md): the thieves ({name, carries, turns_left}),
   * the keys of the shown lines that kill one this turn, the line kept or added for a kill before it leaves (and why),
   * and whether the chosen line kills one this turn.
   */
  thief?: JsonValue;
  /**
   * THIEF_COST (docs/thief.md §7): the HP value of a Thieving Hopper's stolen card (src/sim/thief-card-value.ts
   * ThiefCardValue), computed before this decision; a restart takes it back from here (journal-replay.ts).
   */
  thief_card_value?: JsonValue;
  /**
   * Combat plan choice with a learned strip-stun rule on the board (MECH_RULES, docs/mechanics-learning.md): the rules
   * ({enemy, power, n}), the keys of the shown lines that set one off this turn, and whether the chosen line does.
   */
  mech?: JsonValue;
  /** The run the decision was made in (the state's run_id), so a restart can find its rows. */
  run_id?: string;
  /** When the loop read the state this decision was made on (orders the replay; see journal-replay.ts). */
  observed_ts?: string;
  /** What the run journal filed for this decision (the choice text and the model's raw reason), for replay. */
  journal?: { choice: string; reason: string };
  /** The route plan this decision made (map/route-plan, map/route-change), so a restart resumes it instead of re-planning. */
  route_plan?: JsonValue;
  /** A route review that rode on this question (card reward, rest site): {answer, outcome, reason, invalid?, plan_ref?, plan_step?}. */
  route_review?: JsonValue;
  /** RUN_PLAN_MERGE: the run plan that rode on this question ({trigger, outcome: stored | missing | error | no_answer, why}). */
  run_plan_merge?: JsonValue;
  /** SL (SL_ENABLED only, docs/sl.md): the attempt at the boss / listed-elite fight being played (null outside one). */
  sl_attempt?: number | null;
  /** SL: the fights reloaded so far this run (0: everything so far is the first attempt's play). */
  sl_reloads?: number;
  result: string;
}

export interface DecisionLog {
  readonly path: string;
  write(record: DecisionRecord): void;
  close(): void;
}

export function createDecisionLog(path: string): DecisionLog {
  let ready = false;
  const ensure = (): void => {
    if (ready) return;
    mkdirSync(dirname(path), { recursive: true });
    ready = true;
  };
  return {
    path,
    write(record) {
      try {
        ensure();
        appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
      } catch {
        // Losing a log line must never stop a run.
      }
    },
    close() {
      // Nothing buffered: writes are synchronous so a crash cannot lose the tail.
    },
  };
}

/**
 * Raw states behind each logged decision, in the `record` fixture format, so every live run doubles as
 * a replay fixture (`replay --ask` over the exact boards the loop saw).
 */
export interface StateLog {
  write(entry: { ts: string; fingerprint: string; screen: string; session: string; state: unknown; observed_ts?: string; observed?: boolean }): void;
}

/**
 * Where the states behind a decision log go: logs/decisions.jsonl -> logs/states.jsonl; any other name
 * gets its own file next to it (x.jsonl -> x.states.jsonl), so two decision logs in one directory (tests)
 * never share their states, which a restart replays (journal-replay.ts).
 */
export function stateLogPath(decisionLog: string): string {
  const name = basename(decisionLog);
  return join(dirname(decisionLog), name === "decisions.jsonl" ? "states.jsonl" : `${name.replace(/\.jsonl$/, "")}.states.jsonl`);
}

export function createStateLog(path: string): StateLog {
  let ready = false;
  return {
    write(entry) {
      try {
        if (!ready) {
          mkdirSync(dirname(path), { recursive: true });
          ready = true;
        }
        appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
      } catch {
        // Same rule as the decision log: never stop a run over a log line.
      }
    },
  };
}

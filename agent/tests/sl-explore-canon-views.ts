/**
 * The logged boards of tests/sl-explore-canon-data (make-fixtures.ts) as planner environments, and their decisions as
 * data for digests: tests/sl-explore-canon.test.ts pins what 08ec8f9 made of them with SL_RETRY_EXPLORE_CANON and _TURN
 * off. Only APIs 08ec8f9 has (the digests were captured there with this file). Imported after the test's knowledge pin.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv, type SlEnv } from "../src/memory/types.js";
import { planCombatTurn, slPointOf } from "../src/reflex/combat-plan.js";
import { previousAttemptsJson, type SlAttemptRow } from "../src/sl/attempts.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";

type Raw = Record<string, unknown>;
export const DATA = join(dirname(fileURLToPath(import.meta.url)), "sl-explore-canon-data");
const config = loadConfig({} as NodeJS.ProcessEnv);
export const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");

export interface Board {
  source: string;
  decision: { label: string; rationale: string; chosen: string };
  state: Raw;
  knownDraws: NonNullable<SlEnv["knownDraws"]> | null;
  /** The plays already made that turn: the turn record's (canon) and the summary's (text). */
  played: { canon: string[]; text: string[] };
  rows: SlAttemptRow[];
}
export const BOARDS = ["uk7r-a5-t1-hemokinesis", "uk7r-a4-t2-deviation", "uk7r-a4-t2-replan", "jsa5-f48-t1-demon-form"] as const;
export const boardOf = (name: string): Board => JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;

/** The fake clocks (the rollout's and the random potions' whole schedules) and B2 off (no worker pool). */
export function frozen(): void {
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
}

/** A logged board's decision environment as the live loop makes it on the retry (the attempt after its rows); `sl` adds to env.sl. */
export function envOf(name: string, sl: Partial<SlEnv> = {}): DecisionEnv {
  const fx = boardOf(name);
  const state = parseGameState(fx.state);
  const max = fx.rows[0]?.max_attempts ?? 6;
  const attempt = Math.max(2, fx.rows.length + 1);
  return {
    state,
    knowledge,
    brief: buildRunBrief(state, knowledge),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory: createScreenMemory(state.screen),
    shopDiscardPotions: [],
    jevContext: "v1",
    sl: { attempt, maxAttempts: max, previousAttempts: previousAttemptsJson(fx.rows, attempt, max, { knownDraws: true }), showSim: true, ...(fx.knownDraws ? { knownDraws: fx.knownDraws } : {}), ...sl },
    thiefFacts: config.thiefFacts,
    thiefCost: config.thiefFacts && config.thiefCost,
    mechRules: config.mechRules,
  };
}

export const pick = (key: string, confidence = 0.9): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;
export const digest = (view: unknown): string => createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);
const NONE = { intent: null, rationale: "", confidence: null, fallback: false };

/** The decision as data: code's own (its intent, rationale and point), or the question and every answer's resolution and point. */
export function viewOf(env: DecisionEnv): unknown {
  const decision = planCombatTurn(env);
  if (!decision) return null;
  if (decision.kind !== "ask") return { ...decision, point: slPointOf(decision, NONE) ?? null };
  const ask = decision as AskDecision;
  const keys = Object.keys((ask.questions["plan"] as { criteria: Record<string, unknown> }).criteria).filter((key) => /^(plan|p)\d+$/.test(key));
  return {
    label: ask.label,
    state: ask.state,
    questions: ask.questions,
    jevView: ask.jevView ?? null,
    resolved: Object.fromEntries(
      keys.map((key) => {
        const out = ask.resolve(pick(key));
        const { apply: _apply, ...rest } = out;
        return [key, { ...rest, point: slPointOf(ask, out) ?? null }];
      }),
    ),
  };
}

/** The ask decision's options by key (criteria parsed) and a line's plays as the record writes them. */
export function optionsOf(decision: AskDecision): Record<string, Raw> {
  const raw = (decision.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  return Object.fromEntries(Object.entries(raw).filter(([key]) => /^(plan|p)\d+$/.test(key)).map(([key, text]) => [key, text ? (JSON.parse(text) as Raw) : {}]));
}
export const playsOf = (option: Raw): string => String(option["plays"] ?? "").replace(/, then /g, ", ").replace(/^nothing \(end the turn now\)$/, "end turn");

/** The sub-switches as live before SL_RETRY_EXPLORE_CANON / _TURN (08ec8f9: B2 gate, boss potions). */
export const ON = { b2Gate: true, bossPotions: true } as const;

/**
 * Every board's decision with the switch recording (env.sl.explore: the sub-switches) and, for a question, with a deviation
 * there (the lines of plan1 and plan2 played there in attempt 2): what 08ec8f9 makes of them.
 */
export function offViews(): Record<string, string> {
  frozen();
  const out: Record<string, string> = {};
  for (const name of BOARDS) {
    const plain = planCombatTurn(envOf(name, { explore: { ...ON } }));
    out[`${name}:record`] = digest(viewOf(envOf(name, { explore: { ...ON } })));
    if (plain?.kind === "ask") {
      const ask = plain as AskDecision;
      const excluded = ["plan1", "plan2"].map((key) => slPointOf(ask, ask.resolve(pick(key)))?.line).filter((line): line is string => line !== undefined);
      out[`${name}:deviate`] = digest(viewOf(envOf(name, { explore: { ...ON, deviate: { point: "T?", excluded, attempts: [2] } } })));
    }
  }
  return out;
}

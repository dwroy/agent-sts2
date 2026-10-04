/**
 * The logged boards of tests/sl-explore-whole-data (make-fixtures.ts: PW7Y9EWUW8SB F48 attempts 3 and 4) as planner
 * environments, and their decisions as data for digests: tests/sl-explore-whole.test.ts pins what e0fa69b made of them
 * (SL_RETRY_EXPLORE_WHOLE did not exist there: off must be the same). Only APIs e0fa69b has (the digests were captured there
 * with this file). Imported after the test's knowledge pin.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv, type SlEnv } from "../src/project/types.js";
import { planCombatTurn, slPointOf } from "../src/screens/combat-plan.js";
import { previousAttemptsJson, type SlAttemptRow } from "../src/sl/attempts.js";
import { exploreTried, slBoardKey } from "../src/sl/explore.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import type { AnswerSet } from "../src/jev/answers.js";

type Raw = Record<string, unknown>;
export const DATA = join(dirname(fileURLToPath(import.meta.url)), "sl-explore-whole-data");
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
export const BOARDS = ["pw7y-a3-t1-deviation", "pw7y-a3-t1-replan", "pw7y-a4-t2-deviation", "pw7y-a4-t2-replan"] as const;
export const boardOf = (name: string): Board => JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;
/** The fight's six rows as written live. */
export const fightRows = (): SlAttemptRow[] => JSON.parse(readFileSync(join(DATA, "pw7y-f48-rows.json"), "utf8")) as SlAttemptRow[];

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

/** The deviation point's board of a board's turn (attempt 3: T1's, attempt 4: T2's) and the turns failed attempts had through it. */
export function triedAt(name: string): { board: string; tried: { canon: string[]; loose: string[] }; attempts: number[] } {
  const fx = boardOf(name);
  const point = name.startsWith("pw7y-a3") ? "pw7y-a3-t1-deviation" : "pw7y-a4-t2-deviation";
  const board = slBoardKey(parseGameState(boardOf(point).state));
  const { tried, attempts } = exploreTried(fx.rows, fx.rows.length + 1, board, { canon: true });
  return { board, tried, attempts };
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

/** The sub-switches live at e0fa69b (B2 gate, boss potions). */
export const ON = { b2Gate: true, bossPotions: true } as const;

/**
 * Every board's decision as e0fa69b makes it with the switches live there: the deviation boards with their deviation (the
 * turns tried there: attempts 1-2's at T1, 1-3's at T2), the boards after the draw with the avoid; and every board only
 * recording (the plays already made).
 */
export function offViews(): Record<string, string> {
  frozen();
  const out: Record<string, string> = {};
  for (const name of BOARDS) {
    const fx = boardOf(name);
    const { tried, attempts } = triedAt(name);
    out[`${name}:record`] = digest(viewOf(envOf(name, { explore: { ...ON, played: fx.played } })));
    const explore = name.endsWith("deviation") ? { ...ON, played: fx.played, deviate: { point: "T?", excluded: [], attempts, tried } } : { ...ON, played: fx.played, avoid: { point: "T?", tried, attempts } };
    out[`${name}:explore`] = digest(viewOf(envOf(name, { explore })));
  }
  return out;
}

/**
 * Boards from logged runs (tests/logged-states/*.json): the recorded state of one decision and the game
 * data those boards reference (game-data.json, a subset of the mod's collections). Mechanics regressions
 * replay the current code over them. The fixtures also carry the run plan and fight plan of the run that
 * logged them; these tests leave them out (the checks are about what the code computes, not the plans).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge, type Knowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv, type ScreenMemory } from "../src/memory/types.js";

type Raw = Record<string, unknown>;
const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states");
const config = loadConfig({} as NodeJS.ProcessEnv);

export const loggedKnowledge: Knowledge = makeKnowledge(JSON.parse(readFileSync(join(DIR, "game-data.json"), "utf8")), "cache");

export interface Logged {
  /** Run, floor, turn, timestamp and label of the recorded decision. */
  source: string;
  decision: { label: string; decider: string; chosen: unknown; rationale: string };
  state: Raw;
  /**
   * What the run's screen memory held at the decision that the state does not show (the Surrounded facing: the
   * last enemy targeted before it). Without it a board is replayed as a fresh process would see it.
   */
  screenMemory?: Partial<ScreenMemory>;
}

/** A logged board (a fresh copy: tests may edit it). */
export function logged(name: string): Logged {
  const raw = JSON.parse(readFileSync(join(DIR, `${name}.json`), "utf8")) as Logged;
  return { source: raw.source, decision: raw.decision, state: raw.state, ...(raw.screenMemory ? { screenMemory: raw.screenMemory } : {}) };
}

/** The decision environment of a logged board (no run or fight plan). */
export function loggedEnv(fx: Logged, over: Partial<DecisionEnv> = {}): DecisionEnv {
  const state = parseGameState(fx.state);
  return {
    state,
    knowledge: loggedKnowledge,
    brief: buildRunBrief(state, loggedKnowledge),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory: { ...createScreenMemory(state.screen), ...(fx.screenMemory ?? {}) },
    shopDiscardPotions: [],
    ...over,
  };
}

/** The combat part of a logged state. */
export function combatOf(fx: Logged): Raw {
  return fx.state["combat"] as Raw;
}

/**
 * Boards from logged runs (tests/logged-states/*.json): the recorded state of one decision, the run
 * plan and fight plan in force then, and the game data those boards reference (game-data.json, a
 * subset of the mod's collections). Post-mortem regressions replay the current code over them.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../src/config.js";
import { makeKnowledge, type Knowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { normalizeFightPlan, type FightPlan } from "../src/strategy/fight-plan.js";
import { normalizeRunPlan, type RunPlan } from "../src/strategy/run-plan.js";

type Raw = Record<string, unknown>;
const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states");
const config = loadConfig({} as NodeJS.ProcessEnv);

export const loggedKnowledge: Knowledge = makeKnowledge(JSON.parse(readFileSync(join(DIR, "game-data.json"), "utf8")), "cache");

export interface Logged {
  /** Run, floor, turn, timestamp and label of the recorded decision. */
  source: string;
  decision: { label: string; decider: string; chosen: unknown; rationale: string };
  state: Raw;
  runPlan: RunPlan | null;
  fightPlan: FightPlan | null;
}

/** A logged board (a fresh copy: tests may edit it). */
export function logged(name: string): Logged {
  const raw = JSON.parse(readFileSync(join(DIR, `${name}.json`), "utf8")) as Logged & { runPlan: Raw | null; fightPlan: Raw | null };
  return {
    ...raw,
    runPlan: raw.runPlan ? normalizeRunPlan(raw.runPlan) : null,
    fightPlan: raw.fightPlan ? normalizeFightPlan(raw.fightPlan) : null,
  };
}

/** The decision environment of a logged board, with its run plan and fight plan (FIGHT_PLAN=v1). */
export function loggedEnv(fx: Logged, over: { runPlan?: RunPlan | null; fightPlan?: FightPlan | null } & Partial<DecisionEnv> = {}): DecisionEnv {
  const { runPlan, fightPlan, ...rest } = over;
  const state = parseGameState(fx.state);
  const screenMemory = createScreenMemory(state.screen);
  screenMemory.runPlan = runPlan === undefined ? fx.runPlan : runPlan;
  const plan = fightPlan === undefined ? fx.fightPlan : fightPlan;
  if (plan) screenMemory.fightPlan = plan;
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
    screenMemory,
    shopDiscardPotions: [],
    fightPlan: "v1",
    ...rest,
  };
}

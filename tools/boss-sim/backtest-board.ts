/**
 * The board of a logged combat state as the live planner sees it (tools/boss-sim/backtest.ts, trace.ts): combat-plan
 * planCombatTurn's solver input and plans (captured by solveTap), rollout-live boardRolloutInput, the draw/discard piles
 * from the state (else the deck minus the hand), as tools/rollout-backtest.ts builds them.
 */
import { loadConfig } from "../../src/config.js";
import type { Knowledge } from "../../src/knowledge/index.js";
import type { GameState } from "../../src/mod/schema.js";
import { buildRunBrief } from "../../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../../src/project/types.js";
import { pileCardModels, planCombatTurn } from "../../src/screens/combat-plan.js";
import type { MoveModelData, RolloutInput } from "../../src/strategy/rollout.js";
import { boardRolloutInput, deckModels, fightMetaOf, type MonsterMoves } from "../../src/strategy/rollout-live.js";
import { solveTap, type Plan, type SolveResult, type SolverInput } from "../../src/strategy/turn-solver.js";

const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const cardKey = (c: { cardId: string; upgraded: boolean }) => `${c.cardId}${c.upgraded ? "+" : ""}`;

export function boardOf(state: GameState, knowledge: Knowledge, encounter: string, db: MonsterMoves, mm: MoveModelData): { input: RolloutInput; solver: SolverInput; plans: Plan[]; piles: "logged" | "deck-minus-hand" } {
  const config = loadConfig(process.env);
  const env: DecisionEnv = {
    state,
    knowledge,
    brief: buildRunBrief(state, knowledge),
    screenMemory: createScreenMemory("COMBAT"),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    shopDiscardPotions: [],
    jevContext: "off",
    fightPlan: "off",
  };
  let captured: { input: SolverInput; result: SolveResult } | null = null;
  solveTap.onSolve = (input, result) => {
    captured ??= { input, result };
  };
  try {
    planCombatTurn(env);
  } finally {
    solveTap.onSolve = null;
  }
  const cap = captured as { input: SolverInput; result: SolveResult } | null;
  if (!cap || cap.result.plans.length === 0) throw new Error("no solve");
  const { input: solver, result } = cap;
  const asc = state.run?.ascension ?? 0;
  const board = boardRolloutInput(state, knowledge, solver, asc, db, mm);
  const targets = solver.enemies.filter((e) => e.hp > 0).map((e) => e.index);
  const pileCtx = { enemyTargets: targets, strength: 0, weak: false };
  const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
  const hasPiles = Array.isArray(view["draw"]) || Array.isArray(view["discard"]);
  let draw = hasPiles ? pileCardModels(state, knowledge, "draw", pileCtx) : [];
  const discard = hasPiles ? pileCardModels(state, knowledge, "discard", pileCtx) : [];
  if (!hasPiles) {
    const left = deckModels(state, knowledge);
    for (const card of solver.hand) {
      const at = left.findIndex((c) => cardKey(c) === cardKey(card));
      if (at >= 0) left.splice(at, 1);
    }
    draw = left;
  }
  const { handBase, ...boardInput } = board;
  const meta = { ...fightMetaOf(state, knowledge, createScreenMemory("COMBAT")), enc: encounter, kind: "boss" as const };
  const input: RolloutInput = { ...boardInput, plans: result.plans, piles: { draw, discard, handBase }, meta, mm, model: null, gates: null };
  return { input, solver, plans: result.plans, piles: hasPiles ? "logged" : "deck-minus-hand" };
}


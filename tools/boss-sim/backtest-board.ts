/**
 * The board of a logged combat state as the live planner sees it (tools/boss-sim/backtest.ts, trace.ts): combat-plan
 * planCombatTurn's solver input and plans (captured by solveTap), rollout-live boardRolloutInput, the draw/discard piles
 * from the state (else the deck minus the hand), as tools/rollout-backtest.ts builds them.
 */
import { closeSync, openSync, readSync } from "node:fs";

import { loadConfig } from "../../src/config.js";
import type { Knowledge } from "../../src/knowledge/index.js";
import type { GameState } from "../../src/mod/schema.js";
import { potionViews } from "../../src/project/narrow.js";
import { buildRunBrief } from "../../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../../src/project/types.js";
import { pileCardModels, planCombatTurn, randomPotionSource } from "../../src/screens/combat-plan.js";
import { bossLinesOptions } from "../../src/sim/boss-lines.js";
import { modelPotion, type CardModel } from "../../src/strategy/card-model.js";
import type { PotionMcSource } from "../../src/strategy/potion-mc.js";
import type { KillOrder, MoveModelData, RolloutInput } from "../../src/strategy/rollout.js";
import { boardRolloutInput, deckModels, fightMetaOf, fightRelicsOf, type MonsterMoves } from "../../src/strategy/rollout-live.js";
import { solveTap, type Plan, type SolveResult, type SolverInput } from "../../src/strategy/turn-solver.js";

const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const cardKey = (c: { cardId: string; upgraded: boolean }) => `${c.cardId}${c.upgraded ? "+" : ""}`;

/**
 * The random potions held (B2): each one's expected-value card, as the live rollout's solver hand carries it
 * (combat-plan rolloutSolver), and its potion-mc source for the whole fight's samples (RolloutInput.randomPotions).
 */
export function randomPotionsOf(state: GameState, knowledge: Knowledge, solver: SolverInput): { cards: CardModel[]; sources: PotionMcSource[] } {
  const relics = (Array.isArray(asRecord(state.run?.raw)["relics"]) ? (asRecord(state.run?.raw)["relics"] as unknown[]) : []).map((r) => String(asRecord(r)["relic_id"] ?? ""));
  const ctx = { enemyTargets: solver.enemies.filter((e) => e.hp > 0).map((e) => e.index), strength: solver.player.strengthNow ?? 0, weak: solver.player.weak };
  const cards: CardModel[] = [];
  const sources: PotionMcSource[] = [];
  for (const potion of potionViews({ raw: asRecord(state.run?.raw) }, knowledge).filter((p) => p.can_use)) {
    const source = randomPotionSource(potion, state, knowledge, ctx, relics.includes("FIDDLE"));
    const card = source ? modelPotion(potion.potion_id, potion.name, potion.slot, potion.valid_targets, ctx) : null;
    if (!source || !card) continue;
    cards.push(card);
    sources.push(source);
  }
  return { cards, sources };
}

export function boardOf(state: GameState, knowledge: Knowledge, encounter: string, db: MonsterMoves, mm: MoveModelData, opts: { randomPotions?: boolean } = {}): { input: RolloutInput; solver: SolverInput; plans: Plan[]; piles: "logged" | "deck-minus-hand" } {
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
    // MECH_MOVE_RULES as configured (MECH_MOVE_RULES=off in the environment: the backtest as before it).
    mechMoveRules: config.mechRules && config.mechMoveRules,
  };
  // The board only: no whole-fight lines inside the planner (B2).
  bossLinesOptions.enabled = false;
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
  const { input: solved, result } = cap;
  const asc = state.run?.ascension ?? 0;
  // B2: the random potions held, as the live rollout's hand has them (the live solve leaves them to potion-mc).
  const random = opts.randomPotions === false ? { cards: [], sources: [] } : randomPotionsOf(state, knowledge, solved);
  const solver = random.cards.length > 0 ? { ...solved, hand: [...solved.hand, ...random.cards] } : solved;
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
  // The whole fight's turn relics (B1.5; the rollout never reads them).
  const fightRelics = fightRelicsOf(asRecord(state.run?.raw), solver.turn ?? meta.t);
  const input: RolloutInput = { ...boardInput, plans: result.plans, piles: { draw, discard, handBase }, meta, mm, model: null, gates: null, fightRelics, ...(random.sources.length > 0 ? { randomPotions: random.sources } : {}) };
  return { input, solver, plans: result.plans, piles: hasPiles ? "logged" : "deck-minus-hand" };
}


/**
 * The kill order the sim's later turns follow where the fight's plan is known (experience queen-plan, the boss clock's
 * note: the Torch Head Amalgam first, the Queen only takes AoE until it is dead; the live fight plan focuses it): the
 * solver alone chips a minion at MINION_CHIP and left the Amalgam up (simulated damage 29 a turn against the logged 43).
 * Other bosses: none (the solver's own targets).
 */
export function queenOrder(input: RolloutInput): KillOrder | null {
  const amalgam = input.enemies.filter((e) => e.id === "TORCH_HEAD_AMALGAM" && (input.solver.enemies.find((x) => x.index === e.index)?.hp ?? 0) > 0).map((e) => e.index);
  const queen = input.enemies.filter((e) => e.id === "QUEEN").map((e) => e.index);
  if (amalgam.length === 0 || queen.length === 0) return null;
  return { key: "TORCH_HEAD_AMALGAM>QUEEN", label: "Torch Head Amalgam > Queen", groups: [amalgam, queen] };
}

/** One line of a JSONL file read by byte offset (logs/states.jsonl: read-only, never the whole file). */
export function readAt(path: string, off: number, len: number): string {
  const fd = openSync(path, "r");
  try {
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, off);
    return buf.toString("utf8");
  } finally {
    closeSync(fd);
  }
}

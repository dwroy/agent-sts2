/**
 * Offline replay of the logged combat lines played while we were Shrunk (SHRINK_POWER on us, the Shrinker Beetle's),
 * through the current planner. Nothing is played, no model API is called; reads logs/states.jsonl (read-only, at the
 * rows' byte offsets), the committed knowledge files and data/game-data.json.
 *
 * Input (--rows): JSONL from tools/shrink-lines.py, one row per fresh combat decision under Shrink: the states.jsonl
 * offset, the logged line (cards / potions and their targets as the decision frame's enemy indices) and what it did
 * (enemy HP lost over the line, the enemies killed, our HP lost to the enemy turn when the line ended the turn).
 *
 * Per row: the solver's own outcome for exactly the logged plays (predicted enemy HP lost, kills, our HP lost), the
 * solver's best line (rollout off), and with --planner the full decision (rollout on, clocks frozen: deterministic): its
 * kind (act = code plays it, ask = Jev picks), label and the line it plays or ranks first.
 *
 * Usage: BOSS_SIM_LINES=off BOSS_SIM_BUILD=off npx tsx tools/shrink-replay.ts --rows PATH --out PATH [--planner] [--shard I --shards N]
 */
import { appendFileSync, closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { replaySteps, solveTap, type Plan, type SolveResult, type SolverInput, type Step } from "../src/strategy/turn-solver.js";
import { fromRoot } from "../src/core/paths.js";

interface Row {
  off: number;
  run: string;
  floor: number;
  turn: number;
  label: string;
  steps: { card: string | null; potion: string | null; target: number | null }[];
  dealt: number;
  kills: number[];
  hpLost: number | null;
  endsTurn: boolean;
  endsFight: boolean;
}

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const rowsPath = arg("rows", "");
const outPath = arg("out", "");
const withPlanner = process.argv.includes("--planner");
const shard = Number(arg("shard", "0"));
const shards = Number(arg("shards", "1"));
if (!rowsPath || !outPath) throw new Error("usage: --rows PATH --out PATH");

const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
const states = openSync(fromRoot("logs/states.jsonl"), "r");

/** The states.jsonl line starting at `off`. */
function stateAt(off: number): Record<string, unknown> {
  const chunks: Buffer[] = [];
  let at = off;
  for (;;) {
    const buf = Buffer.alloc(1 << 16);
    const n = readSync(states, buf, 0, buf.length, at);
    if (n <= 0) break;
    const nl = buf.subarray(0, n).indexOf(10);
    if (nl >= 0) {
      chunks.push(buf.subarray(0, nl));
      break;
    }
    chunks.push(buf.subarray(0, n));
    at += n;
  }
  return (JSON.parse(Buffer.concat(chunks).toString("utf8")) as { state: Record<string, unknown> }).state;
}

function envOf(raw: Record<string, unknown>): DecisionEnv {
  const state = parseGameState(raw);
  return {
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
  };
}

const lineText = (plan: Pick<Plan, "steps"> | undefined): string => (plan ? plan.steps.map((step) => `${step.cardId}${step.target !== null ? `>${step.target}` : ""}`).join(",") : "");

/** The logged plays as solver steps on this input (the hand's cards, each once); null when one is not in the hand. */
function stepsOf(row: Row, input: SolverInput): Step[] | null {
  const used = new Set<number>();
  const steps: Step[] = [];
  for (const logged of row.steps) {
    const card = input.hand.find((entry) => !used.has(entry.index) && (logged.potion ? entry.cardId.startsWith(`POTION:${logged.potion}:`) : entry.cardId === logged.card));
    if (!card) return null;
    used.add(card.index);
    steps.push({ cardIndex: card.index, cardId: card.cardId, upgraded: card.upgraded, cost: card.cost, name: card.name, target: logged.target, targetName: null });
  }
  return steps;
}

writeFileSync(outPath, "");
const rows = readFileSync(rowsPath, "utf8").split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line) as Row);
for (const [k, row] of rows.entries()) {
  if (k % shards !== shard) continue;
  const raw = stateAt(row.off);
  let first: { input: SolverInput; result: SolveResult } | null = null;
  solveTap.onSolve = (input, result) => {
    first ??= { input, result };
  };
  rolloutLiveOptions.enabled = false;
  planCombatTurn(envOf(raw));
  const solved = first as { input: SolverInput; result: SolveResult } | null;
  const out: Record<string, unknown> = { off: row.off, run: row.run, floor: row.floor, turn: row.turn, label: row.label, actual: { dealt: row.dealt, kills: row.kills.length, hpLost: row.hpLost, endsTurn: row.endsTurn, endsFight: row.endsFight } };
  if (solved) {
    const steps = stepsOf(row, solved.input);
    const key = steps ? lineText({ steps }) : null;
    const plan = steps ? solved.result.plans.find((entry) => lineText(entry) === key) ?? replaySteps(solved.input, steps) : null;
    out["shrunk"] = solved.input.player.shrunk === true;
    out["logged"] = key;
    out["predicted"] = plan ? { dealt: plan.outcome.damageDealt, kills: plan.outcome.kills.length, hpLoss: plan.outcome.hpLoss, dies: plan.outcome.dies } : null;
    out["solverBest"] = lineText(solved.result.plans[0]);
    out["solverBestOutcome"] = solved.result.plans[0] ? { dealt: solved.result.plans[0].outcome.damageDealt, kills: solved.result.plans[0].outcome.kills.length, hpLoss: solved.result.plans[0].outcome.hpLoss } : null;
  }
  if (withPlanner) {
    solveTap.onSolve = null;
    rolloutLiveOptions.enabled = true;
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    const decision = planCombatTurn(envOf(raw));
    rolloutLiveOptions.now = null;
    potionMcOptions.now = null;
    if (decision?.kind === "act") out["decision"] = { kind: "act", label: decision.label, intent: decision.intent };
    else if (decision?.kind === "ask") {
      // The options as Jev sees them: plan1 is code's rank 1; the rollout's best carries rollout_best.
      const criteria = ((decision.jevView?.questions ?? decision.questions)["plan"]?.criteria ?? {}) as Record<string, string>;
      const facts = Object.entries(criteria)
        .filter(([key]) => /^plan\d+$/.test(key))
        .map(([key, text]) => [key, JSON.parse(text) as Record<string, unknown>] as const);
      const plan1 = facts.find(([key]) => key === "plan1")?.[1];
      const best = facts.find(([, fact]) => fact["rollout_best"] !== undefined && fact["rollout_best"] !== false)?.[1];
      out["decision"] = { kind: "ask", label: decision.label, plan1: plan1?.["plays"] ?? null, plan1Dealt: plan1?.["damage_dealt"] ?? null, rolloutBest: best?.["plays"] ?? null, options: facts.length };
    } else out["decision"] = null;
  }
  appendFileSync(outPath, JSON.stringify(out) + "\n");
}
closeSync(states);

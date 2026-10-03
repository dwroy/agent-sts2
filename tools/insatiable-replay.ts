/**
 * Offline replay of the logged Insatiable plan questions (tools/insatiable-lines.py rows) through the current planner,
 * for the Frantic Escape question (does the rollout undervalue it against the Sandpit). Nothing is played, no model API
 * is called; reads logs/states.jsonl (read-only, at the rows' byte offsets), the committed knowledge files and
 * .cache/game-data.json. SANDPIT_START as the environment says unless --sandpit-start is given.
 *
 * Per row, with the clocks frozen (deterministic: the rollout always gets its full 5 turns x 8 samples) and B2 off
 * (BOSS_SIM_LINES=off BOSS_SIM_BUILD=off in the environment):
 *   - the planner's question as now: every option's plays and rollout sentence, and whether that sentence is the logged
 *     one word for word (`same`: the logged numbers reproduced);
 *   - with --extra N: every rolled-out option again over N samples (the rollout's own samples first: the first 8 are
 *     the live ones), at the live horizon and with --long H also at H turns (about to the fight's end: the Sandpit ends
 *     it by then), through rollout.ts simulateFight (the rollout's simulation exactly, without whole-fight scripts) with
 *     the solver tap on the policy's turns: wins and deaths by cause (the Sandpit, HP), the win chance as the rollout
 *     computes it (won 1, dead 0, alive at the horizon its terminal), the Frantic Escapes the later turns play (early: at
 *     a Sandpit of 2 or more; on a must turn: at 1), and the must turns with no affordable Escape in hand.
 *
 * Usage: BOSS_SIM_LINES=off BOSS_SIM_BUILD=off npx tsx tools/insatiable-replay.ts --rows PATH --out PATH
 *          [--runs A,B] [--turns 1,2] [--escape-only] [--extra 64] [--long 15] [--per-sample] [--sandpit-start on|off]
 *          [--shard I --shards N]
 * --per-sample: each sample's win chance and value too (the sampling-noise measurement).
 */
import { appendFileSync, closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { DEATH_HP, gateFor, simulateFight, terminal, type LineEstimate, type RolloutInput, type RolloutResult, type TerminalContext } from "../src/strategy/rollout.js";
import { rolloutLiveOptions, rolloutTap } from "../src/strategy/rollout-live.js";
import { solveTap, type Plan, type SolveResult, type SolverInput } from "../src/strategy/turn-solver.js";

interface Row {
  run: string;
  floor: number;
  turn: number;
  off: number;
  attempt: number | null;
  firstOfTurn: boolean;
  won: boolean;
  chosen: string | null;
  label: string;
  board: Record<string, unknown>;
  options: Record<string, { plays: string; escapes: number; rolloutText: string | null; sandpitAfter: number | null }>;
}

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const rowsPath = arg("rows", "");
const outPath = arg("out", "");
const runs = new Set(arg("runs", "").split(",").filter(Boolean));
const escapeOnly = process.argv.includes("--escape-only");
const extra = Number(arg("extra", "0"));
const long = Number(arg("long", "0"));
const perSample = process.argv.includes("--per-sample");
const shard = Number(arg("shard", "0"));
const shards = Number(arg("shards", "1"));
const turns = new Set(arg("turns", "").split(",").filter(Boolean).map(Number));
// SANDPIT_START for the replay (default: as the environment says, on unless SANDPIT_START=off).
const sandpitStart = arg("sandpit-start", rolloutLiveOptions.sandpitStart ? "on" : "off") !== "off";
if (!rowsPath || !outPath) throw new Error("usage: --rows PATH --out PATH");

const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(".cache/game-data.json", "utf8")).collections, "cache");
const states = openSync("logs/states.jsonl", "r");

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

const ESCAPE = "FRANTIC_ESCAPE";
const escapesIn = (plan: Pick<Plan, "steps">): number => plan.steps.filter((step) => step.cardId === ESCAPE).length;
const sandpitOf = (input: Pick<SolverInput, "enemies">): number | null => {
  const pits = input.enemies.filter((e) => e.hp > 0 && (e.sandpit ?? 0) > 0).map((e) => e.sandpit!);
  return pits.length > 0 ? Math.min(...pits) : null;
};

interface PolicyTurn {
  sandpit: number | null;
  inHand: number;
  affordable: number;
  played: number;
  dies: boolean;
  hpAfter: number;
  sandpitAfter: number | null;
  truncated: boolean;
}

/** One sample's numbers (the rollout's valueAt for the win, the policy's turns from the solver tap). */
function sampleOf(input: RolloutInput, plan: Plan, horizon: number, seed: number, ctx: TerminalContext): Record<string, unknown> {
  const turns: PolicyTurn[] = [];
  solveTap.onSolve = (si: SolverInput, result: SolveResult) => {
    const best = result.plans[0];
    const energy = si.player.energy;
    const escapes = si.hand.filter((card) => card.cardId === ESCAPE);
    turns.push({
      sandpit: sandpitOf(si),
      inHand: escapes.length,
      affordable: escapes.filter((card) => card.cost <= energy).length,
      played: best ? escapesIn(best) : 0,
      dies: best?.outcome.dies ?? true,
      hpAfter: best?.outcome.hpAfter ?? 0,
      sandpitAfter: best?.outcome.sandpitAfter ?? null,
      truncated: result.truncated,
    });
  };
  const { records } = simulateFight(input, plan, horizon, seed, false);
  solveTap.onSolve = null;
  const upto = Math.min(horizon, records.length);
  // The rollout's value of the sample (rollout.ts valueAt; no potion cost: 0 in a boss fight).
  const lossCap = input.solver.player.hp + (input.solver.player.revives ?? []).reduce((sum, revive) => sum + revive.hp, 0);
  let win = 0;
  let loss = 0;
  let died = false;
  let won = false;
  let over = false;
  let turn = upto;
  for (let i = 0; i < upto; i += 1) {
    const r = records[i]!;
    if (r.died) {
      died = true;
      loss = lossCap;
      turn = i + 1;
      break;
    }
    if (r.won || r.timeUp) {
      won = r.won;
      over = true;
      win = r.won ? 1 : 0;
      loss += r.loss;
      turn = i + 1;
      break;
    }
    if (i < upto - 1) loss += r.loss;
  }
  if (!died && !over) {
    const last = records[upto - 1]!;
    const term = terminal(ctx, last.snap, input.meta.t + upto - 1).gated;
    win = term.winProb;
    loss = Math.min(lossCap, loss + Math.max(0, last.loss - last.enemyPart) + term.hpLoss);
  }
  const value = -loss - DEATH_HP * (1 - win);
  // The death's cause: the line itself (turn 1) or the policy's line of that turn.
  let cause: string | null = null;
  if (died) {
    const o = turn === 1 ? plan.outcome : turns[turn - 2] ? { dies: turns[turn - 2]!.dies, hpAfter: turns[turn - 2]!.hpAfter, sandpitAfter: turns[turn - 2]!.sandpitAfter } : null;
    const pit = o !== null && o.sandpitAfter !== null && o.sandpitAfter <= 0;
    const hp = o !== null && o.hpAfter <= 0;
    cause = pit && hp ? "both" : pit ? "sandpit" : hp ? "hp" : "other";
  }
  const policy = turns.slice(0, Math.max(0, turn - 1));
  return {
    win,
    value,
    won,
    died,
    turn,
    cause,
    early: policy.filter((t) => (t.sandpit ?? 0) >= 2).reduce((sum, t) => sum + t.played, 0),
    must: policy.filter((t) => t.sandpit === 1).length,
    mustPlayed: policy.filter((t) => t.sandpit === 1 && t.played > 0).length,
    mustNone: policy.filter((t) => t.sandpit === 1 && t.affordable === 0).length,
    heldEarly: policy.filter((t) => (t.sandpit ?? 0) >= 2 && t.affordable > 0 && t.played === 0).length,
    truncated: policy.filter((t) => t.truncated).length,
    pitEnd: records[upto - 1]?.snap.E.map((e) => e[9]["SANDPIT_POWER"] ?? null).find((x) => x !== null) ?? null,
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/** N samples of one line at `horizon` turns, from the rollout's own seeds (seed * 7919 + 1 + j). */
function samplesOf(input: RolloutInput, line: LineEstimate, horizon: number, n: number, ctx: TerminalContext): Record<string, unknown> {
  const seed = input.options?.seed ?? 1;
  const rows = Array.from({ length: n }, (_, j) => sampleOf(input, line.plan, horizon, seed * 7919 + 1 + j, ctx));
  const count = (pred: (r: Record<string, unknown>) => boolean) => rows.filter(pred).length;
  const sum = (key: string) => rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);
  const win = mean(rows.map((r) => Number(r["win"])));
  const value = mean(rows.map((r) => Number(r["value"])));
  const se = Math.sqrt(mean(rows.map((r) => (Number(r["win"]) - win) ** 2)) / Math.max(1, n));
  return {
    horizon,
    samples: n,
    win: Math.round(win * 1000) / 1000,
    se: Math.round(se * 1000) / 1000,
    value: Math.round(value * 10) / 10,
    ...(perSample ? { wins: rows.map((r) => Math.round(Number(r["win"]) * 1000) / 1000), values: rows.map((r) => Math.round(Number(r["value"]) * 10) / 10) } : {}),
    won: count((r) => r["won"] === true),
    died: count((r) => r["died"] === true),
    pit: count((r) => r["cause"] === "sandpit" || r["cause"] === "both"),
    hp: count((r) => r["cause"] === "hp"),
    alive: count((r) => r["won"] !== true && r["died"] !== true),
    early: sum("early") / n,
    must: sum("must"),
    mustPlayed: sum("mustPlayed"),
    mustNone: sum("mustNone"),
    heldEarly: sum("heldEarly"),
    truncated: sum("truncated"),
  };
}

const lineText = (plan: Pick<Plan, "steps">): string => plan.steps.map((step) => `${step.cardId}${step.target !== null ? `>${step.target}` : ""}`).join(",");
/** The option's `plays` as the question shows it (combat-plan describePlan), to find the logged option's line. */
const playsText = (plan: Pick<Plan, "steps">): string => (plan.steps.length === 0 ? "nothing (end the turn now)" : plan.steps.map((step) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", then "));

writeFileSync(outPath, "");
const all = readFileSync(rowsPath, "utf8").split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line) as Row);
const chosen = all.filter((row) => (runs.size === 0 || runs.has(row.run)) && (turns.size === 0 || turns.has(row.turn)) && (!escapeOnly || Object.values(row.options).some((o) => o.escapes > 0)));
for (const [k, row] of chosen.entries()) {
  if (k % shards !== shard) continue;
  const raw = stateAt(row.off);
  let tapped: { input: RolloutInput; result: RolloutResult } | null = null;
  rolloutTap.onRollout = (input, result) => {
    tapped = { input, result };
  };
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.sandpitStart = sandpitStart;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  const decision = planCombatTurn(envOf(raw));
  rolloutLiveOptions.now = null;
  potionMcOptions.now = null;
  rolloutTap.onRollout = null;
  const out: Record<string, unknown> = { run: row.run, floor: row.floor, turn: row.turn, off: row.off, attempt: row.attempt, firstOfTurn: row.firstOfTurn, won: row.won, chosen: row.chosen, board: row.board };
  const criteria = decision?.kind === "ask" ? (((decision.jevView?.questions ?? decision.questions)["plan"]?.criteria ?? {}) as Record<string, string>) : {};
  const now: Record<string, { plays: string; rollout: string | null; best: boolean; sandpitAfter: unknown; dealt: unknown; hpLost: unknown }> = {};
  for (const [key, text] of Object.entries(criteria)) {
    if (!/^(plan\d+|p\d+)$/.test(key)) continue;
    const fact = JSON.parse(text) as Record<string, unknown>;
    now[key] = {
      plays: String(fact["plays"] ?? ""),
      rollout: typeof fact["rollout"] === "string" ? fact["rollout"] : null,
      best: fact["rollout_best"] === true,
      sandpitAfter: fact["sandpit_after_enemy_turn"] ?? null,
      dealt: fact["damage_dealt"] ?? null,
      hpLost: fact["hp_lost"] ?? null,
    };
  }
  out["decision"] = decision ? { kind: decision.kind, label: decision.label } : null;
  // Reproduced: each logged option's rollout sentence found word for word among the options now (by its plays).
  out["options"] = Object.fromEntries(
    Object.entries(row.options).map(([key, logged]) => {
      const match = Object.values(now).find((entry) => entry.plays === logged.plays);
      return [key, { plays: logged.plays, escapes: logged.escapes, logged: logged.rolloutText, now: match?.rollout ?? null, same: match !== undefined && match.rollout === logged.rolloutText, bestNow: match?.best ?? false }];
    }),
  );
  out["optionsNow"] = now;
  const got = tapped as { input: RolloutInput; result: RolloutResult } | null;
  if (got) {
    const { input, result } = got;
    const gate = gateFor(input.gates, input.meta.enc, input.meta.act, input.meta.kind);
    const ctx: TerminalContext = { meta: input.meta, mm: input.mm, model: input.model, gates: input.gates, w: gate.w };
    out["rollout"] = { horizon: result.horizon, samples: result.samples, degraded: result.degraded, seed: input.options?.seed ?? null };
    out["lines"] = result.lines.map((line) => ({
      line: lineText(line.plan),
      plays: playsText(line.plan),
      escapes: escapesIn(line.plan),
      sandpitAfter: line.plan.outcome.sandpitAfter,
      tags: line.tags,
      winProb: Math.round(line.winProb * 1000) / 1000,
      wins: line.wins,
      deaths: line.deaths,
      value: Math.round(line.value * 10) / 10,
      ...(extra > 0 ? { extra: samplesOf(input, line, result.horizon, extra, ctx) } : {}),
      ...(extra > 0 && long > 0 ? { long: samplesOf(input, line, long, extra, ctx) } : {}),
    }));
  }
  appendFileSync(outPath, JSON.stringify(out) + "\n");
}
closeSync(states);

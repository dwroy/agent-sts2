/**
 * Options shown, request size and rollout time on recorded combat boards (the per-target options and
 * kill-order rollout measurement). Nothing is sent.
 * Usage: STATES=<file of COMBAT state lines> [RUN_PLANS=logs/run-plans.jsonl] npx tsx tools/target-options-measure.ts out.json
 * Each board is planned once with a fresh screen memory (JEV_CONTEXT=v1, no fight plan); the run plan in
 * force at the board's time is put in the memory when RUN_PLANS is given.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import type { RunPlan } from "../src/strategy/run-plan.js";
import { fromRoot } from "../src/core/paths.js";

const out = process.argv[2] ?? "target-options.json";
const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
const lines = readFileSync(process.env["STATES"] ?? "states.jsonl", "utf8").trim().split("\n");

const plansByRun = new Map<string, { ts: string; plan: RunPlan }[]>();
const planFile = process.env["RUN_PLANS"];
if (planFile && existsSync(planFile)) {
  for (const line of readFileSync(planFile, "utf8").trim().split("\n")) {
    try {
      const entry = JSON.parse(line) as { ts: string; run: string; plan?: RunPlan };
      if (!entry.plan) continue;
      const list = plansByRun.get(entry.run) ?? [];
      list.push({ ts: entry.ts, plan: entry.plan });
      plansByRun.set(entry.run, list);
    } catch {
      // a torn line
    }
  }
}

const rows: Record<string, unknown>[] = [];
for (const line of lines) {
  const entry = JSON.parse(line) as { ts: string; screen: string; state: Record<string, unknown> };
  if (entry.screen !== "COMBAT") continue;
  const state = parseGameState(entry.state);
  const memory = createScreenMemory("COMBAT");
  const runId = String(entry.state["run_id"] ?? "");
  const runPlan = (plansByRun.get(runId) ?? []).filter((p) => p.ts <= entry.ts).at(-1)?.plan ?? null;
  if (runPlan) memory.runPlan = runPlan;
  const env: DecisionEnv = {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: memory,
    thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", fightPlan: "off", buildDecider: "deepseek",
  };
  const started = performance.now();
  const decision = planCombatTurn(env);
  const ms = performance.now() - started;
  const row: Record<string, unknown> = { ts: entry.ts, run: runId, floor: state.run?.floor, turn: state.turn, ms: Math.round(ms) };
  if (!decision) row["kind"] = "none";
  else if (decision.kind !== "ask") Object.assign(row, { kind: decision.kind, label: decision.label });
  else {
    const view = decision.jevView ?? { state: decision.state, questions: decision.questions };
    const criteria = view.questions["plan"]?.criteria ?? {};
    const keys = Object.keys(criteria);
    const planKeys = keys.filter((key) => /^plan\d+$/.test(key));
    const log = decision.resolve({}).log as Record<string, unknown> | undefined;
    const rollout = (log?.["rollout"] ?? null) as Record<string, unknown> | null;
    Object.assign(row, {
      kind: "ask",
      label: decision.label,
      options: keys.length,
      plan_options: planKeys.length,
      focus_options: planKeys.filter((key) => /"focus"/.test(criteria[key] ?? "")).length,
      chars: JSON.stringify(view.state).length + JSON.stringify(view.questions).length,
      rollout_ms: rollout?.["ms"] ?? null,
      rollout: rollout,
    });
  }
  rows.push(row);
}
writeFileSync(out, JSON.stringify(rows, null, 1));
const asks = rows.filter((row) => row["kind"] === "ask");
const q = (xs: number[], p: number) => (xs.length === 0 ? null : [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))]);
const nums = (key: string) => asks.map((row) => row[key]).filter((x): x is number => typeof x === "number");
console.log(
  JSON.stringify({
    boards: rows.length,
    asks: asks.length,
    acts: rows.filter((row) => row["kind"] === "act").length,
    plan_options_mean: nums("plan_options").reduce((s, x) => s + x, 0) / Math.max(1, asks.length),
    options_mean: nums("options").reduce((s, x) => s + x, 0) / Math.max(1, asks.length),
    chars_p50: q(nums("chars"), 0.5),
    chars_p90: q(nums("chars"), 0.9),
    rollout_ms_p50: q(nums("rollout_ms"), 0.5),
    rollout_ms_p90: q(nums("rollout_ms"), 0.9),
    rollout_ms_max: q(nums("rollout_ms"), 1),
    plan_ms_p50: q(nums("ms"), 0.5),
    plan_ms_p90: q(nums("ms"), 0.9),
  }),
);

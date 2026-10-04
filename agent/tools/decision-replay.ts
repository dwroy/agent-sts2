/**
 * Offline decision replay: the current code over the recorded boards of past runs, compared with what
 * was actually played. No model is called; nothing is played.
 *
 * For each recorded decision of the chosen runs (combat plans, rewards, shops, map, rest, selections,
 * events) it rebuilds the board from logs/states.jsonl (matched by fingerprint), restores that fight's
 * DeepSeek plan when there was one, and runs the planner:
 *   same        code decides and plays the recorded action
 *   changed     code decides and plays something else
 *   now_asks    code used to decide, now it asks Jev
 *   now_code    Jev/DeepSeek decided, now code decides (same or different action)
 *   still_asks  asked then and now (code's own default is compared with the recorded pick)
 * Flagged cases (ops/replay-cases.jsonl, one {run, ts, bad, note} per line) check that a decision a
 * post-mortem called wrong is no longer made.
 *
 * Limits: per-turn memory (a plan already under way, the fight's HP-guard budget, the turn-start
 * settle guard) starts empty, so `combat/plan-continue` steps are skipped and budgets read as unused.
 *
 * Usage: npx tsx tools/decision-replay.ts [--last 5 | --runs A,B] [--tail-mb 500] [--cases <workspace>/ops/replay-cases.jsonl]
 *        [--out logs/decision-replay.json] [--show 20]
 */
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

import { loadConfig } from "../src/core/config.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { planDecision } from "../src/hand/screens/index.js";
import { fightKey, loadFightPlan } from "../src/memory/fight-plan.js";
import { fromRoot, workspaceRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

try {
  (process as NodeJS.Process & { loadEnvFile: (f?: string) => void }).loadEnvFile(".env");
} catch {
  // no .env: flags default off
}
const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
const tailBytes = Number(arg("tail-mb", "500")) * 1024 * 1024;
const casesPath = arg("cases", join(workspaceRoot(), "ops", "replay-cases.jsonl"));
const outPath = arg("out", fromRoot("logs/decision-replay.json"));
const show = Number(arg("show", "20"));

const runsFile = readFileSync(fromRoot("logs/runs.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as { run_id: string; code?: string; ascension?: number; floor?: number });
const explicit = arg("runs", "");
const cases = existsSync(casesPath)
  ? readFileSync(casesPath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as { run: string; ts: string; bad?: Record<string, unknown>; bad_pattern?: string; note: string })
  : [];
const targetRuns = new Set(
  explicit ? explicit.split(",") : runsFile.slice(-Number(arg("last", "5"))).map((run) => run.run_id),
);
for (const flagged of cases) targetRuns.add(flagged.run);
const runInfo = new Map(runsFile.map((run) => [run.run_id, run]));

const runOf = (fingerprint: string): string => /"run":"([A-Z0-9_a-z]+)"/.exec(fingerprint)?.[1] ?? "";

async function* lines(path: string, fromTail: number): AsyncGenerator<string> {
  const size = statSync(path).size;
  const start = Math.max(0, size - fromTail);
  const reader = createInterface({ input: createReadStream(path, { start }), crlfDelay: Infinity });
  let first = start > 0;
  for await (const line of reader) {
    if (first) {
      first = false;
      continue;
    }
    if (line) yield line;
  }
}

// 1. The boards of the target runs, by fingerprint.
const boards = new Map<string, Record<string, unknown>>();
for await (const line of lines(fromRoot("logs/states.jsonl"), tailBytes)) {
  const cut = line.indexOf('"state":');
  const head = cut > 0 ? line.slice(0, cut) : line.slice(0, 2000);
  const run = /\\"run\\":\\"([A-Z0-9_a-z]+)\\"/.exec(head)?.[1] ?? "";
  if (!targetRuns.has(run)) continue;
  const entry = JSON.parse(line) as { fingerprint: string; state: Record<string, unknown> };
  boards.set(entry.fingerprint, entry.state);
}

interface Row {
  run: string;
  ts: string;
  floor: unknown;
  turn: unknown;
  label: string;
  decider: string;
  recorded: string;
  now: string;
  outcome: "same" | "changed" | "now_asks" | "now_code" | "still_asks" | "no_decision";
  rationale: string;
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
// Screens whose decision depends only on the board. Events (several pages share a fingerprint) and
// shop entry/exit (depends on whether the inventory was opened) are left out.
const COMPARABLE = /^(combat\/(plan|plan-choice|plan-choice\+potion|lethal|least-loss|mod-lethal|plan-guarded|plan-potion|potion-now|end_turn)$|reward\/card$|shop\/buy$|map\/|rest\/choose$|selection\/)/;

function envFor(state: ReturnType<typeof parseGameState>): DecisionEnv {
  const env: DecisionEnv = {
    state,
    knowledge,
    brief: buildRunBrief(state, knowledge),
    screenMemory: createScreenMemory(state.screen),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    shopDiscardPotions: config.shop.discardPotions,
    jevContext: config.jevContext,
    fightPlan: config.fightPlan,
  };
  if (config.fightPlan === "v1" && state.in_combat) {
    const plan = loadFightPlan(config.fightPlanLog, String(state.raw["run_id"] ?? ""), fightKey(state));
    if (plan) env.screenMemory.fightPlan = plan;
  }
  return env;
}

function planFor(env: DecisionEnv): Decision | null {
  if (env.state.screen === "COMBAT") return planCombatTurn(env);
  const outcome = planDecision(env);
  return outcome.kind === "decision" ? outcome.decision : null;
}

// 2. Replay every comparable decision of those runs.
const rows: Row[] = [];
const byTs = new Map<string, Row>();
for await (const line of lines(fromRoot("logs/decisions.jsonl"), Number.MAX_SAFE_INTEGER)) {
  if (!line.includes('"run\\"')) continue;
  const record = JSON.parse(line) as { ts: string; fingerprint: string; label: string; decider: string; chosen: unknown; floor: unknown; turn: unknown; questions?: unknown };
  const run = runOf(record.fingerprint);
  if (!targetRuns.has(run) || !COMPARABLE.test(record.label)) continue;
  const raw = boards.get(record.fingerprint);
  if (!raw) continue;
  let decision: Decision | null = null;
  try {
    decision = planFor(envFor(parseGameState(raw)));
  } catch {
    decision = null;
  }
  // A question was put (even when the answer fell back to code's pick).
  const asked = record.questions !== undefined || (record.decider !== "code" && record.decider !== "code-fallback");
  let outcome: Row["outcome"];
  let now = "";
  let rationale = "";
  if (!decision) {
    outcome = "no_decision";
  } else if (decision.kind === "act") {
    now = JSON.stringify(decision.intent);
    rationale = decision.rationale;
    outcome = asked ? "now_code" : same(decision.intent, record.chosen) ? "same" : "changed";
  } else {
    const fallback = decision.resolve({} as AnswerSet);
    now = `ask (${decision.label}); default ${JSON.stringify(fallback.intent ?? null)}`;
    rationale = fallback.rationale;
    outcome = asked ? "still_asks" : "now_asks";
  }
  const row: Row = { run, ts: record.ts, floor: record.floor, turn: record.turn, label: record.label, decider: record.decider, recorded: JSON.stringify(record.chosen), now, outcome, rationale: rationale.slice(0, 220) };
  rows.push(row);
  byTs.set(record.ts, row);
}

// 3. Report.
const tally = (filter: (row: Row) => boolean) => {
  const counts: Record<string, number> = {};
  for (const row of rows.filter(filter)) counts[row.outcome] = (counts[row.outcome] ?? 0) + 1;
  return counts;
};
const groups = [...new Set(rows.map((row) => row.label.split("/")[0]!))];
console.log(`runs: ${[...targetRuns].map((id) => `${id}(A${runInfo.get(id)?.ascension ?? "?"} F${runInfo.get(id)?.floor ?? "?"} ${runInfo.get(id)?.code ?? "?"})`).join(", ")}`);
console.log(`replayed ${rows.length} decisions (${boards.size} boards)`);
for (const group of groups) console.log(`  ${group.padEnd(10)} ${JSON.stringify(tally((row) => row.label.startsWith(`${group}/`)))}`);
const changed = rows.filter((row) => row.outcome === "changed" || (row.outcome === "now_code" && row.now !== row.recorded));
console.log(`\nchanged (${changed.length}), first ${Math.min(show, changed.length)}:`);
for (const row of changed.slice(0, show)) {
  console.log(`  ${row.run} F${row.floor} T${row.turn} ${row.label} [${row.decider}] ${row.recorded} -> ${row.now}\n      ${row.rationale}`);
}

const caseResults = cases.map((flagged) => {
  const row = byTs.get(flagged.ts);
  if (!row) return { ...flagged, result: "not_replayed" };
  // Either the bad action ({"bad": intent}) or a pattern the plan must no longer show ({"bad_pattern": regex}).
  const bad = flagged.bad ? JSON.stringify(flagged.bad) : null;
  const pattern = flagged.bad_pattern ? new RegExp(flagged.bad_pattern) : null;
  const wrong = (pattern !== null && pattern.test(`${row.now} ${row.rationale}`)) || (bad !== null && row.now.includes(bad));
  const fixed = row.outcome === "no_decision" ? "not_replayed" : wrong ? (row.now.startsWith("ask") ? "asks_default_wrong" : "still_wrong") : "fixed";
  return { ...flagged, now: row.now, result: fixed };
});
if (caseResults.length > 0) {
  console.log(`\nflagged cases: ${JSON.stringify(caseResults.reduce<Record<string, number>>((acc, entry) => ({ ...acc, [entry.result]: (acc[entry.result] ?? 0) + 1 }), {}))}`);
  for (const entry of caseResults.filter((entry) => entry.result !== "fixed")) console.log(`  ${entry.result}: ${entry.run} ${entry.ts} ${entry.note} -> ${"now" in entry ? entry.now : ""}`);
}
writeFileSync(outPath, JSON.stringify({ generated: new Date().toISOString(), runs: [...targetRuns], summary: Object.fromEntries(groups.map((group) => [group, tally((row) => row.label.startsWith(`${group}/`))])), cases: caseResults, rows }, null, 1));
console.log(`\nwrote ${outPath}`);

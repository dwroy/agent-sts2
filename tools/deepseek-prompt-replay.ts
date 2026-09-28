/**
 * Replays one logged run through the run journal and rebuilds the DeepSeek user message of each of its
 * direct DeepSeek decisions in the current layout (nothing is sent). Prints, per decision, the message
 * size and the bytes it shares with the previous decision's message (DeepSeek's cache is prefix-based),
 * and writes the message of one chosen decision (default: the last card reward) to the output file.
 *
 * The state part is the card-reward planner's state for REWARD screens, else `{facts}` for that state
 * (the logs do not keep the exact DeepSeek state). Route plans are not in the logs as objects, so the
 * route section says there is none; everything else comes from the logged states, decisions and plans.
 *
 * Usage: STATES=<the run's states.jsonl lines> DECISIONS=<decisions.jsonl (slice)> [RUNPLANS=<run-plans.jsonl>]
 *        [FLOOR=24] [LABEL=reward/card] npx tsx tools/deepseek-prompt-replay.ts out.json
 */
import { readFileSync, writeFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { choiceMessage } from "../src/llm/deepseek-message.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { describeChoice, RunJournal } from "../src/project/run-journal.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv } from "../src/project/types.js";
import { planReward } from "../src/screens/reward.js";
import { buildFacts } from "../src/strategy/build-facts.js";
import { runPlanLine, type RunPlan } from "../src/strategy/run-plan.js";
import type { JsonValue } from "../src/util/json.js";

type Row = Record<string, JsonValue>;
const out = process.argv[2] ?? "logs/deepseek-prompt-replay.json";
const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(".cache/game-data.json", "utf8")).collections, "cache");
const lines = (file: string | undefined): Row[] => (file ? readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row) : []);

const states = lines(process.env["STATES"]);
const runId = String((states[0]?.["state"] as Row | undefined)?.["run_id"] ?? "");
const first = String(states[0]?.["ts"] ?? "");
const last = String(states.at(-1)?.["ts"] ?? "");
const decisions = lines(process.env["DECISIONS"]).filter((row) => String(row["ts"]) >= first && String(row["ts"]) <= last);
const plans = lines(process.env["RUNPLANS"]).filter((row) => row["run"] === runId && row["plan"]);
const events = [
  ...states.map((row) => ({ ts: String(row["ts"]), kind: "state" as const, row })),
  ...decisions.map((row) => ({ ts: String(row["ts"]), kind: "decision" as const, row })),
  ...plans.map((row) => ({ ts: String(row["ts"]), kind: "plan" as const, row })),
].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));

const journal = new RunJournal();
const screenMemory = createScreenMemory("MAP");
let state: GameState | null = null;
let previous = "";
const wantFloor = process.env["FLOOR"] ? Number(process.env["FLOOR"]) : null;
const wantLabel = process.env["LABEL"] ?? "reward/card";
let target: { floor: number | null; label: string; message: string } | null = null;
const rows: { floor: number | null; label: string; chars: number; shared: number }[] = [];

function env(current: GameState): DecisionEnv {
  return {
    state: current, knowledge, brief: buildRunBrief(current, knowledge), screenMemory,
    thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], buildDecider: "deepseek",
  };
}

for (const event of events) {
  if (event.kind === "state") {
    state = parseGameState(event.row["state"] as Record<string, unknown>);
    journal.observe(state, { knowledge, screenMemory });
    continue;
  }
  if (!state) continue;
  if (event.kind === "plan") {
    const plan = event.row["plan"] as unknown as RunPlan;
    screenMemory.runPlan = { ...plan, runId };
    journal.noteRunPlan(state, String(event.row["trigger"] ?? ""), runPlanLine(screenMemory.runPlan));
    continue;
  }
  const row = event.row;
  const label = String(row["label"]);
  const ds = (row["deepseek"] ?? null) as Row | null;
  const questions = (row["questions"] ?? {}) as Record<string, { type?: string; instructions?: string; criteria?: Record<string, string | null> }>;
  if (row["decider"] === "deepseek" && ds && ds["reused"] !== true) {
    const question = questions["pick"] ?? Object.values(questions)[0];
    const criteria = question?.criteria ?? {};
    let dsState: Record<string, JsonValue> = { facts: buildFacts(env(state)) };
    if (label === "reward/card" && state.screen === "REWARD") {
      const planned = planReward(env(state));
      if (planned?.kind === "ask") dsState = (planned as AskDecision).state;
    }
    const memory = journal.render(state, knowledge, screenMemory, { label, criteria, factsCovered: true });
    const message = choiceMessage(dsState, question?.instructions ?? "", criteria, { ...memory } as unknown as JsonValue);
    let shared = 0;
    while (shared < message.length && shared < previous.length && message[shared] === previous[shared]) shared += 1;
    rows.push({ floor: state.run?.floor ?? null, label, chars: message.length, shared });
    previous = message;
    if (label === wantLabel && (wantFloor === null || state.run?.floor === wantFloor)) target = { floor: state.run?.floor ?? null, label, message };
  }
  const decision: Decision = Object.keys(questions).length > 0
    ? ({ kind: "ask", label, state: {}, questions, resolve: () => ({ intent: null, rationale: "", confidence: null, fallback: false }) } as unknown as AskDecision)
    : { kind: "act", label, intent: { action: "noop" } as never, rationale: String(row["rationale"] ?? "") };
  const choice = describeChoice(decision, { intent: null, rationale: String(row["rationale"] ?? ""), confidence: null, fallback: false }, row["answers"], ds ?? row["escalation"] ?? undefined);
  journal.record(state, { label, by: String(row["decider"]), choice, reason: String((ds ?? (row["escalation"] as Row | undefined) ?? {})["reason"] ?? ""), asked: true, intent: (row["chosen"] ?? null) as never });
}

for (const row of rows) console.log(`F${row.floor} ${row.label}: ${row.chars} chars, shares ${row.shared} (${((100 * row.shared) / row.chars).toFixed(0)}%) with the previous DeepSeek message`);
const total = rows.reduce((sum, row) => sum + row.chars, 0);
const shared = rows.slice(1).reduce((sum, row) => sum + row.shared, 0);
console.log(`${rows.length} DeepSeek decisions: mean ${(total / Math.max(rows.length, 1)).toFixed(0)} chars, ${((100 * shared) / Math.max(total - (rows[0]?.chars ?? 0), 1)).toFixed(1)}% of each message shared with the previous one`);
if (target) {
  writeFileSync(out, JSON.stringify({ run: runId, floor: target.floor, label: target.label, chars: target.message.length, user_message: JSON.parse(target.message) as JsonValue }, null, 1));
  console.log(`F${target.floor} ${target.label} -> ${out} (${target.message.length} chars)`);
}

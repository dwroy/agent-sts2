/**
 * Replays one logged run through the run journal and rebuilds the DeepSeek user message of each of its
 * direct DeepSeek decisions in the current layout (nothing is sent). Prints, per decision, the message
 * size and the bytes it shares with the previous decision's message (DeepSeek's cache is prefix-based),
 * and writes the message of one chosen decision (default: the last card reward) to the output file.
 *
 * The state part is the card-reward planner's state for REWARD screens, else `{facts}` for that state
 * (the logs do not keep the exact DeepSeek state). The journal is rebuilt as a restarted loop rebuilds it
 * (src/project/journal-replay.ts): logged states, decisions, run plans and route plans.
 *
 * Usage: STATES=<the run's states.jsonl lines> DECISIONS=<decisions.jsonl (slice)> [RUNPLANS=<run-plans.jsonl>]
 *        [FLOOR=24] [LABEL=reward/card] npx tsx tools/deepseek-prompt-replay.ts out.json
 */
import { readFileSync, writeFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { choiceMessage } from "../src/llm/deepseek-message.js";
import type { GameState } from "../src/mod/schema.js";
import { replayRun } from "../src/project/journal-replay.js";
import { isBrainDecider } from "../src/project/run-journal.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import type { AskDecision, DecisionEnv, ScreenMemory } from "../src/project/types.js";
import { planReward } from "../src/screens/reward.js";
import { buildFacts } from "../src/strategy/build-facts.js";
import type { JsonValue } from "../src/util/json.js";
import { fromRoot } from "../src/core/paths.js";

type Row = Record<string, JsonValue>;
const out = process.argv[2] ?? fromRoot("logs/deepseek-prompt-replay.json");
const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
const lines = (file: string | undefined): Row[] => (file ? readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row) : []);

const states = lines(process.env["STATES"]);
const runId = String((states[0]?.["state"] as Row | undefined)?.["run_id"] ?? "");
const first = String(states[0]?.["ts"] ?? "");
const last = String(states.at(-1)?.["ts"] ?? "");
const decisions = lines(process.env["DECISIONS"]).filter((row) => String(row["ts"]) >= first && String(row["ts"]) <= last);
const plans = lines(process.env["RUNPLANS"]).filter((row) => row["run"] === runId);

let previous = "";
const wantFloor = process.env["FLOOR"] ? Number(process.env["FLOOR"]) : null;
const wantLabel = process.env["LABEL"] ?? "reward/card";
let target: { floor: number | null; label: string; message: string } | null = null;
const rows: { floor: number | null; label: string; chars: number; shared: number }[] = [];

function env(current: GameState, screenMemory: ScreenMemory): DecisionEnv {
  return {
    state: current, knowledge, brief: buildRunBrief(current, knowledge), screenMemory,
    thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], buildDecider: "deepseek",
  };
}

replayRun({ runId, states, decisions, runPlans: plans }, knowledge, {
  beforeRecord(state, row, journal, screenMemory) {
    const label = String(row["label"]);
    const ds = (row["deepseek"] ?? null) as Row | null;
    // A brain decision, whichever engine answered it (the prompt is the same).
    if (!isBrainDecider(String(row["decider"] ?? "")) || !ds || ds["reused"] === true) return;
    const questions = (row["questions"] ?? {}) as Record<string, { instructions?: string; criteria?: Record<string, string | null> }>;
    const question = questions["pick"] ?? Object.values(questions)[0];
    const criteria = question?.criteria ?? {};
    let dsState: Record<string, JsonValue> = { facts: buildFacts(env(state, screenMemory)) };
    if (label === "reward/card" && state.screen === "REWARD") {
      const planned = planReward(env(state, screenMemory));
      if (planned?.kind === "ask") dsState = (planned as AskDecision).state;
    }
    const memory = journal.render(state, knowledge, screenMemory, { label, criteria, factsCovered: true });
    const message = choiceMessage(dsState, question?.instructions ?? "", criteria, { ...memory } as unknown as JsonValue);
    let shared = 0;
    while (shared < message.length && shared < previous.length && message[shared] === previous[shared]) shared += 1;
    rows.push({ floor: state.run?.floor ?? null, label, chars: message.length, shared });
    previous = message;
    if (label === wantLabel && (wantFloor === null || state.run?.floor === wantFloor)) target = { floor: state.run?.floor ?? null, label, message };
  },
});

for (const row of rows) console.log(`F${row.floor} ${row.label}: ${row.chars} chars, shares ${row.shared} (${((100 * row.shared) / row.chars).toFixed(0)}%) with the previous DeepSeek message`);
const total = rows.reduce((sum, row) => sum + row.chars, 0);
const shared = rows.slice(1).reduce((sum, row) => sum + row.shared, 0);
console.log(`${rows.length} DeepSeek decisions: mean ${(total / Math.max(rows.length, 1)).toFixed(0)} chars, ${((100 * shared) / Math.max(total - (rows[0]?.chars ?? 0), 1)).toFixed(1)}% of each message shared with the previous one`);
if (target) {
  writeFileSync(out, JSON.stringify({ run: runId, floor: target.floor, label: target.label, chars: target.message.length, user_message: JSON.parse(target.message) as JsonValue }, null, 1));
  console.log(`F${target.floor} ${target.label} -> ${out} (${target.message.length} chars)`);
}

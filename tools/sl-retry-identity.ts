/**
 * Identity check of SL_RETRY_KNOWN_DRAWS / SL_RETRY_COMPUTE off (docs/sl.md §10.4, notes/sl-retry-report.md §1): the
 * whole decision (question, Jev's view, every answer's resolution: tests/thief.test.ts viewOf) on logged boards, as an
 * SL retry without the known draws and the compute, digested. Run on this tree and on a git archive of v4 3488dc5 (it
 * uses only what 3488dc5 has), the two outputs must be equal. The boards: the rows of tools/sl-retry-replay.ts's
 * results (each fight's first planning decision of the turn, attempt 1's frames), found again in the log DB; frozen
 * clocks, B2 off (as the replay's main run). No model, nothing written outside --out.
 *
 * Usage: npx tsx tools/sl-retry-identity.ts --rows experiments/sl-retry/deaths-0.jsonl,...,deaths-7.jsonl [--shard i/n] --out <file.json>
 *        [--logs DIR --game-data FILE --python PY --query query.py]   (on a git archive: this tree's logs and log DB, read-only)
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
type Row = Record<string, unknown>;
const PLANNING = /^combat\/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)/;
const LOGS = arg("logs", "logs");
const PY = arg("python", ".cache/logdb-venv/bin/python");
const QUERY = arg("query", "tools/logdb/query.py");

function query(sql: string): Row[] {
  const out = execFileSync(PY, [QUERY, "--no-sync", "--json", "--max-rows", "100000", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

const fd = openSync(join(LOGS, "states.jsonl"), "r");
function stateAt(off: number, len: number): GameState {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return parseGameState((JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>);
}

const knowledge = makeKnowledge((JSON.parse(readFileSync(arg("game-data", ".cache/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

function digestOf(decision: Decision | null): string {
  let view: unknown = decision ?? null;
  if (decision && decision.kind === "ask") {
    const ask = decision as AskDecision;
    const keys = Object.keys((ask.questions["plan"] as { criteria: Record<string, unknown> }).criteria);
    const pick = (key: string, confidence: number): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;
    const res = (answers: AnswerSet) => {
      const { apply: _apply, ...rest } = ask.resolve(answers);
      return rest;
    };
    view = {
      label: ask.label, state: ask.state, questions: ask.questions, jevView: ask.jevView ?? null,
      resolved: Object.fromEntries([...keys.map((key) => [key, res(pick(key, 0.9))]), ...keys.map((key) => [`${key}@0.3`, res(pick(key, 0.3))]), ["none", res({} as AnswerSet)], ["bad", res(pick("nope", 0.9))]]),
    };
  }
  return createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);
}

function main(): void {
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  // Comma-separated files (no glob: npx hands its arguments to a shell, which would expand one).
  const files = arg("rows", "").split(",").filter(Boolean);
  const boards = files.flatMap((path) => readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row));
  boards.sort((a, b) => `${String(a["run"])}:${String(a["floor"])}:${String(a["turn"])}`.localeCompare(`${String(b["run"])}:${String(b["floor"])}:${String(b["turn"])}`));
  const [at, of] = arg("shard", "0/1").split("/").map(Number) as [number, number];
  const out: Record<string, string> = {};
  boards.forEach((board, index) => {
    if (index % of !== at) return;
    const run = String(board["run"]);
    const floor = Number(board["floor"]);
    const turn = Number(board["turn"]);
    const decisions = query(`SELECT ts, label FROM decisions WHERE run_id = '${run}' AND floor = ${floor} AND turn = ${turn} ORDER BY ts`);
    const decision = decisions.find((row) => PLANNING.test(String(row["label"])));
    if (!decision) return;
    const frame = query(`SELECT off, len FROM state_index WHERE run_id = '${run}' AND floor = ${floor} AND ts = '${String(decision["ts"])}' AND NOT coalesce(observed, false) ORDER BY off LIMIT 1`)[0];
    if (!frame) return;
    const state = stateAt(Number(frame["off"]), Number(frame["len"]));
    const sl = { attempt: 2, maxAttempts: 4, previousAttempts: { note: "offline evaluation (tools/sl-retry-replay.ts): the fight's own logged draws taken as attempt 1's" }, showSim: false };
    const env: DecisionEnv = {
      state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto",
      characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
      sl, thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
    } as DecisionEnv;
    let digest: string;
    try {
      digest = digestOf(planCombatTurn(env));
    } catch (error) {
      digest = `error: ${error instanceof Error ? error.message : String(error)}`;
    }
    out[`${run}:${floor}:${turn}`] = digest;
    console.log(`${run} F${floor} T${turn} ${digest}`);
  });
  closeSync(fd);
  writeFileSync(arg("out", "experiments/sl-retry/identity.json"), `${JSON.stringify(out, null, 1)}\n`);
}

main();

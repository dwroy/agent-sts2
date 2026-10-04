/**
 * Renders logged build questions as this checkout asks them, for the V4 M2 replay (experiments/build-facts-m2):
 * each target (a dsh dataset row: id, run, decision ts) is replayed from the logs (run journal, route plan, run plan,
 * remembered map: project/journal-replay.ts), its screen planned as the loop plans it at that decision's state, and
 * the user message built as the loop builds it (the question's state, instructions and options, the run memory with
 * the question context the loop passes). Rows in the dsh dataset's shape, for tools/brain-replay.ts. Nothing is sent.
 *
 * Run it in two checkouts (before and after a change) on the same targets and logs: the two outputs differ only by
 * what the change does to the questions.
 *
 * Usage (checkout root): npx tsx tools/build-facts-replay.ts --targets T.jsonl --states S.jsonl --decisions D.jsonl
 *   --run-plans R.jsonl --out O.jsonl
 * S may be the chosen runs' lines of logs/states.jsonl (grep by run id); D and R the whole logs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { choiceMessage } from "../src/brain/llm/deepseek-message.js";
import { readRunLogs, replayRun } from "../src/memory/journal-replay.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import type { DecisionEnv } from "../src/memory/types.js";
import { planDecision } from "../src/hand/screens/index.js";
import { asRecord, type JsonValue } from "../src/core/util/json.js";
import { fromRoot } from "../src/core/paths.js";

const { values } = parseArgs({
  options: {
    targets: { type: "string" },
    states: { type: "string" },
    decisions: { type: "string" },
    "run-plans": { type: "string" },
    out: { type: "string" },
  },
});

interface Target {
  id: string;
  label: string;
  logged_label?: string;
  run_id: string;
  floor: number | null;
  ts: string;
  logged: JsonValue;
}

const config = loadConfig({} as NodeJS.ProcessEnv);
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
const targets = readFileSync(values.targets!, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Target);
const out: Record<string, JsonValue>[] = [];

for (const runId of [...new Set(targets.map((target) => target.run_id))]) {
  const wanted = new Map(targets.filter((target) => target.run_id === runId).map((target) => [target.ts, target]));
  const logs = readRunLogs({ states: values.states!, decisions: values.decisions!, runPlans: values["run-plans"] }, runId, { latestOnly: false });
  replayRun(logs, knowledge, {
    beforeRecord(state, row, journal, memory) {
      const target = wanted.get(String(row["ts"]));
      if (!target) return;
      wanted.delete(target.ts);
      memory.screen = state.screen;
      const env: DecisionEnv = {
        state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: memory,
        thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
        strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], buildDecider: "deepseek",
      };
      const outcome = planDecision(env);
      const decision = outcome.kind === "decision" ? outcome.decision : null;
      if (!decision || decision.kind !== "ask" || !decision.deepseek) {
        out.push({ id: target.id, logged_label: target.label, skipped: `no DeepSeek question at the logged state (${decision ? `${decision.kind} ${decision.label}` : outcome.kind})` });
        return;
      }
      const spec = decision.deepseek;
      const question = decision.questions[spec.question];
      if (question?.type !== "choice") return;
      // The run memory as the loop renders it for a DeepSeek-decided question (loop.ts); statsCovered is ignored by
      // a checkout that does not know it.
      const context = {
        label: decision.label,
        criteria: question.criteria,
        factsCovered: "facts" in decision.state,
        ...(spec.offeredCards ? { offeredCards: spec.offeredCards } : {}),
        ...("outcome_stats_basis" in asRecord(decision.state["facts"]) ? { statsCovered: true } : {}),
      };
      const runMemory = journal.render(state, knowledge, env.screenMemory, context);
      out.push({
        id: target.id,
        label: decision.label,
        logged_label: target.logged_label ?? target.label,
        kind: spec.plan ? "shop-plan" : "pick",
        run_id: runId,
        floor: state.run?.floor ?? null,
        ts: target.ts,
        user_message: choiceMessage(decision.state, question.instructions, question.criteria, runMemory as unknown as JsonValue),
        criteria: question.criteria,
        logged: target.logged,
      });
    },
  });
  for (const target of wanted.values()) out.push({ id: target.id, logged_label: target.label, skipped: "decision row not found in the replayed logs" });
}

out.sort((a, b) => String(a["id"]).localeCompare(String(b["id"])));
writeFileSync(values.out!, `${out.map((row) => JSON.stringify(row)).join("\n")}\n`);
console.log(`${out.length} rows -> ${values.out}: ${out.map((row) => `${String(row["id"])} ${row["skipped"] ? `skipped (${String(row["skipped"])})` : String(row["label"])}`).join(", ")}`);

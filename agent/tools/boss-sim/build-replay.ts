/**
 * B3 acceptance: logged deck-building questions asked again as the loop asks them with BOSS_SIM_BUILD=on (the act boss
 * simulated for every option, src/sim/build-sim-facts.ts), offline. Each target (experiments/build-facts-m2/targets.jsonl
 * shape) is replayed from the logs as tools/build-facts-replay.ts does (run journal, route plan, run plan, remembered
 * map), its question planned at the logged state, then simulated on a worker pool with the live deadline. Nothing is
 * sent to any model; logs are read only.
 *
 * Usage: npx tsx tools/boss-sim/build-replay.ts --targets T.jsonl --states S.jsonl --decisions D.jsonl --run-plans R.jsonl
 *          --out experiments/boss-sim-build/raw/replay.jsonl [--workers 12] [--deadline 11000]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

import { loadConfig } from "../../src/core/config.js";
import { makeKnowledge } from "../../src/knowledge/index.js";
import { choiceMessage } from "../../src/brain/llm/deepseek-message.js";
import { readRunLogs, replayRun } from "../../src/memory/journal-replay.js";
import { buildRunBrief } from "../../src/memory/run-brief.js";
import type { Decision, DecisionEnv } from "../../src/memory/types.js";
import { planDecision } from "../../src/hand/screens/index.js";
import { withBossSim } from "../../src/sim/build-sim-facts.js";
import { BuildSimPool } from "../../src/sim/build-sim-pool.js";
import { asRecord, type JsonValue } from "../../src/core/util/json.js";
import { fromRoot } from "../../src/core/paths.js";

const { values } = parseArgs({
  options: {
    targets: { type: "string" },
    states: { type: "string" },
    decisions: { type: "string" },
    "run-plans": { type: "string" },
    out: { type: "string" },
    workers: { type: "string" },
    deadline: { type: "string" },
    profile: { type: "boolean" },
    only: { type: "string" },
  },
});

interface Target {
  id: string;
  label: string;
  run_id: string;
  ts: string;
}

const config = loadConfig({} as NodeJS.ProcessEnv);
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
const only = values.only ? new Set(values.only.split(",")) : null;
const targets = readFileSync(values.targets!, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Target).filter((target) => !only || only.has(target.id));
const pool = new BuildSimPool(Number(values.workers ?? "12"));
const deadlineMs = Number(values.deadline ?? "11000");
const out: Record<string, JsonValue>[] = [];

function message(decision: Decision, render: (criteria: Record<string, string | null>) => JsonValue): { text: string; criteria: Record<string, string | null> } | null {
  if (decision.kind !== "ask" || !decision.deepseek) return null;
  const question = decision.questions[decision.deepseek.question];
  if (question?.type !== "choice") return null;
  return { text: choiceMessage(decision.state, question.instructions, question.criteria, render(question.criteria)), criteria: question.criteria };
}

// Warm the pool once (its threads start on the first run), as the loop's first deck-building question would.
const pending: { target: Target; env: DecisionEnv; decision: Decision; render: (criteria: Record<string, string | null>) => JsonValue }[] = [];
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
        out.push({ id: target.id, logged_label: target.label, skipped: `no DeepSeek question (${decision ? `${decision.kind} ${decision.label}` : outcome.kind})` });
        return;
      }
      // The replay moves on after this call: the run memory is rendered now (as the loop renders it for this question)
      // and the screen memory kept as it stands (its route plan and run plan are replaced, not changed, later).
      const question = decision.questions[decision.deepseek.question];
      const rendered = journal.render(state, knowledge, memory, { label: decision.label, criteria: question?.type === "choice" ? question.criteria : {}, factsCovered: "facts" in decision.state, ...("outcome_stats_basis" in asRecord(decision.state["facts"]) ? { statsCovered: true } : {}) }) as unknown as JsonValue;
      pending.push({ target, env: { ...env, screenMemory: { ...memory } }, decision, render: () => rendered });
    },
  });
  for (const target of wanted.values()) out.push({ id: target.id, logged_label: target.label, skipped: "decision row not found in the replayed logs" });
}

await pool.run({ base: (await import("../../src/sim/boss-start.js")).syntheticBossStart(pending[0]!.env.state, knowledge, String(pending[0]!.env.state.run?.boss_id ?? ""), 50).input, decks: [{}], orders: [null], samples: 24, seed: 1 });

if (values.profile) {
  // --profile: the cost of one fight of the current deck against this question's boss, in this thread (8 samples per
  // kill order), with the policy's turns and solver nodes.
  const { fightOrders, runBossSim } = await import("../../src/sim/boss-sim.js");
  const { syntheticBossStart } = await import("../../src/sim/boss-start.js");
  for (const { target, env } of pending) {
    const state = env.state;
    const start = syntheticBossStart(state, knowledge, String(state.run?.boss_id ?? ""), state.run?.current_hp ?? 50);
    for (const order of [null, ...fightOrders(start.input)]) {
      const t = performance.now();
      const res = runBossSim(start.input, [null], { samples: 8, seed: 1, order });
      const line = res.lines[0]!;
      const ms = (performance.now() - t) / 8;
      console.log(`${target.id} ${String(state.run?.boss_id)} deck ${start.input.piles.draw.length} order ${order?.label ?? "own"}: ${ms.toFixed(0)} ms/fight, turns ${line.turns.mean}, nodes/turn ${(line.policyNodes / Math.max(1, line.policyTurns)).toFixed(0)}, win ${line.winProb}`);
    }
  }
  process.exit(0);
}

for (const { target, env, decision, render } of pending) {
  const before = message(decision, render);
  const t = performance.now();
  const simmed = await withBossSim(decision, env, { runner: pool, deadlineMs });
  const ms = Math.round(performance.now() - t);
  const after = message(simmed.decision, render);
  const lines = after ? Object.fromEntries(Object.entries(after.criteria).map(([k, v]) => {
    const shown = JSON.parse(v ?? "{}") as Record<string, JsonValue>;
    return [k, { boss_sim: shown["boss_sim"] ?? null, ...(shown["boss_sim_by_card"] ? { by_card: shown["boss_sim_by_card"] } : {}), option: String(shown["card"] ?? shown["buy"] ?? shown["title"] ?? shown["option"] ?? shown["then"] ?? k) }];
  })) : {};
  out.push({
    id: target.id,
    label: decision.label,
    run_id: target.run_id,
    floor: env.state.run?.floor ?? null,
    ms,
    record: simmed.record,
    act_boss_sim: (asRecord(simmed.decision.kind === "ask" ? simmed.decision.state["facts"] : {})["act_boss_sim"] ?? null) as JsonValue,
    lines: lines as JsonValue,
    chars_before: before?.text.length ?? 0,
    chars_after: after?.text.length ?? 0,
    user_message: after?.text ?? null,
  });
  console.error(`${target.id} ${decision.label}: ${ms} ms, ${String(asRecord(simmed.record)["samples"] ?? "-")} samples`);
}
await pool.close();
out.sort((a, b) => String(a["id"]).localeCompare(String(b["id"])));
mkdirSync(dirname(values.out!), { recursive: true });
writeFileSync(values.out!, `${out.map((row) => JSON.stringify(row)).join("\n")}\n`);
console.log(`${out.length} rows -> ${values.out}`);

/**
 * Runs the three arms on the dataset (data/dataset.jsonl) and appends one row per (question, arm) to
 * data/results.jsonl (resumable: pairs already there are skipped).
 *
 * Concurrency: 2 questions at a time, each question's arms one after another in a rotated order (ABC, BCA,
 * CAB), so the experiment never has more than 2 DeepSeek calls in flight next to the live bot. A call budget
 * (default 440 for the whole experiment, probes included) stops new questions once reached.
 *
 * Usage (worktree root): npx tsx experiments/dsh/run-arms.ts [--dry] [--ids q001,q002] [--limit N] [--arms A,B,C] [--budget 440]
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { DeepSeekClient } from "../../src/llm/deepseek.js";
import { choiceMessage, taskMessage } from "../../src/llm/deepseek-message.js";
import type { JsonValue } from "../../src/util/json.js";
import { runArmC } from "./lib/arm-c.js";
import { runArmA, runArmB, TAIL, type Question } from "./lib/arms-ab.js";
import { DATA, ROOT, setup } from "./lib/capture.js";

const { values } = parseArgs({ options: { dry: { type: "boolean" }, ids: { type: "string" }, limit: { type: "string" }, arms: { type: "string" }, budget: { type: "string" }, workers: { type: "string" }, out: { type: "string" }, probes: { type: "string" } } });
const arms = (values.arms ?? "A,B,C").split(",") as ("A" | "B" | "C")[];
const budget = Number(values.budget ?? "440");
const PROBE_CALLS = Number(values.probes ?? "4"); // calls made outside this runner that count against the budget
const RESULTS = join(DATA, values.out ?? "results.jsonl");
const TIMEOUT_MS = 300_000; // DEEPSEEK_TIMEOUT_MS of the live .env

const rows = readFileSync(join(DATA, "dataset.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Question & { skipped?: string });
let questions = rows.filter((row) => !row.skipped);
if (values.ids) {
  const ids = new Set(values.ids.split(","));
  questions = questions.filter((q) => ids.has(q.id));
}
if (values.limit) questions = questions.slice(0, Number(values.limit));
const system = readFileSync(join(DATA, "system-prompt.txt"), "utf8");

if (values.dry) {
  let bad = 0;
  for (const q of questions) {
    const msg = JSON.parse(q.user_message) as Record<string, JsonValue>;
    const rebuilt = q.kind === "run-plan" ? taskMessage(msg) : choiceMessage(msg["state"] as Record<string, JsonValue>, String(msg["question"]), msg["options"] as Record<string, string | null>, msg["memory"]);
    if (rebuilt !== q.user_message) {
      bad += 1;
      console.log(`${q.id} ${q.label}: rebuilt message differs (${rebuilt.length} vs ${q.user_message.length})`);
    }
  }
  console.log(`${questions.length} questions, ${bad} messages not reproducible; tail example: ${JSON.stringify(TAIL("submit_choice"))}`);
  process.exit(0);
}

const apiKey = readFileSync(join(homedir(), ".deepseek_api_key"), "utf8").trim();
const { config } = setup();
const client = new DeepSeekClient({ ...config.deepseek!, apiKey, baseUrl: "https://api.deepseek.com", model: "deepseek-flash", timeoutMs: TIMEOUT_MS, guideFile: join(ROOT, config.deepseek!.guideFile), handbookFile: join(ROOT, config.deepseek!.handbookFile), reasoningEffort: "max", combatReasoningEffort: "high", reasoningLog: join(DATA, "armA-reasoning.jsonl") });
if (client.systemPrompt !== system) throw new Error("arm A's system prompt differs from data/system-prompt.txt");

const done = new Set<string>();
let spent = PROBE_CALLS;
if (existsSync(RESULTS)) {
  for (const line of readFileSync(RESULTS, "utf8").split("\n").filter(Boolean)) {
    const row = JSON.parse(line) as { id: string; arm: string; calls_made: number };
    done.add(`${row.id}|${row.arm}`);
    spent += row.calls_made ?? 0;
  }
}
console.log(`${questions.length} questions, arms ${arms.join("")}, ${done.size} pairs done, ${spent} calls spent of ${budget}`);

async function runQuestion(q: Question, index: number): Promise<void> {
  const order = [...arms.slice(index % arms.length), ...arms.slice(0, index % arms.length)];
  for (const [pos, arm] of order.entries()) {
    if (done.has(`${q.id}|${arm}`)) continue;
    if (spent >= budget) {
      console.log(`budget reached (${spent}); skipping ${q.id} ${arm}`);
      return;
    }
    const rawDir = join(DATA, "raw", q.id, ...(values.out ? [values.out.replace(/\.jsonl$/, "")] : []));
    mkdirSync(rawDir, { recursive: true });
    const started = Date.now();
    let row: Record<string, unknown>;
    if (arm === "A") {
      const r = await runArmA(client, q);
      row = { ...r, calls_made: r.calls.length };
    } else if (arm === "B") {
      const r = await runArmB({ apiKey, system, q, timeoutMs: TIMEOUT_MS, repairs: 1, rawDir });
      row = { ...r, calls_made: r.calls.length };
    } else {
      const r = await runArmC({ apiKey, systemPrompt: system, userMessage: q.user_message + TAIL(q.spec.toolName), spec: q.spec, effort: q.effort, maxRetries: 2, timeoutMs: 3 * TIMEOUT_MS, keepDir: join(rawDir, "C") });
      row = { ...r, calls_made: Math.max(r.calls.length, r.attempts.filter((a) => a.event !== "plugin_ready").length) };
    }
    spent += Number(row["calls_made"] ?? 0);
    const out = { id: q.id, arm, label: q.label, kind: q.kind, effort: q.effort, order_pos: pos, started_at: new Date(started).toISOString(), wall_ms: Date.now() - started, ...row };
    appendFileSync(RESULTS, `${JSON.stringify(out)}\n`);
    done.add(`${q.id}|${arm}`);
    const verdict = (out as { final_verdict?: { ok: boolean } | null }).final_verdict;
    const ok = arm === "C" ? Boolean((out as { accepted?: unknown }).accepted) : Boolean(verdict?.ok);
    console.log(`${new Date().toISOString().slice(11, 19)} ${q.id} ${q.label} ${arm}: ${ok ? "ok" : "FAIL"} ${(out.wall_ms / 1000).toFixed(1)} s, calls ${row["calls_made"]}, spent ${spent}`);
  }
}

const workers = Number(values.workers ?? "2");
let next = 0;
await Promise.all(
  Array.from({ length: workers }, async () => {
    while (next < questions.length && spent < budget) {
      const index = next;
      next += 1;
      try {
        await runQuestion(questions[index]!, index);
      } catch (error) {
        console.log(`${questions[index]!.id}: runner error ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }),
);
console.log(`done: ${spent} calls spent`);

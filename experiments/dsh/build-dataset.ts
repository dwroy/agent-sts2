/**
 * Builds data/dataset.jsonl: for each target in data/targets.json, the request the live client would send
 * now (system prompt is shared and written once to data/system-prompt.txt), the answer spec (tool schema and
 * validation facts), the live effort for its label and what was logged.
 *
 * Usage (from the worktree root): npx tsx experiments/dsh/build-dataset.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { DeepSeekClient, effortFor } from "../../src/llm/deepseek.js";
import { deckEntries } from "../../src/project/deck.js";
import { captureAll, DATA, ROOT, setup, type Target } from "./lib/capture.js";
import { buildSpec } from "./lib/spec.js";

const targets = JSON.parse(readFileSync(join(DATA, "targets.json"), "utf8")) as Target[];
const { config, knowledge } = setup();
const client = new DeepSeekClient({ ...config.deepseek!, guideFile: join(ROOT, config.deepseek!.guideFile), handbookFile: join(ROOT, config.deepseek!.handbookFile), reasoningLog: "" });
writeFileSync(join(DATA, "system-prompt.txt"), client.systemPrompt);
console.log(`system prompt ${client.systemPrompt.length} chars, guide ${client.guideId}`);

const rows: Record<string, unknown>[] = [];
captureAll(targets, (c) => {
  const t = c.target;
  if (c.skipped) {
    rows.push({ id: t.id, logged_label: t.label, skipped: c.skipped, failure: t.failure ?? null });
    console.log(`${t.id} ${t.label} SKIPPED: ${c.skipped}`);
    return;
  }
  const deckIds = c.kind === "run-plan" ? deckEntries(c.state, knowledge).map((card) => card.card_id) : undefined;
  const spec = buildSpec(c.kind, c.criteria, c.dsState as Record<string, unknown>, { deckIds, gold: c.state.run?.gold ?? null });
  const loggedKeys = Array.isArray(t.logged["options"]) ? (t.logged["options"] as string[]) : null;
  const memoryChars = Object.values(c.memory).reduce<number>((sum, v) => sum + (typeof v === "string" ? v.length : JSON.stringify(v ?? null).length), 0);
  rows.push({
    id: t.id,
    label: c.label,
    logged_label: t.label,
    kind: c.kind,
    failure: t.failure ?? null,
    run_id: t.run_id,
    floor: c.state.run?.floor ?? null,
    ts: t.decision_ts ?? t.plan_ts,
    effort: effortFor(c.label, config.deepseek!),
    user_message: c.userMessage,
    user_chars: c.userMessage.length,
    memory_chars: memoryChars,
    logged_memory_chars: t.logged["memory_chars"] ?? null,
    criteria: c.criteria,
    spec,
    logged: t.logged,
    logged_keys: loggedKeys,
    ...(c.runPlanTrigger ? { trigger: c.runPlanTrigger } : {}),
  });
  console.log(`${t.id} ${t.label}${c.label !== t.label ? ` -> ${c.label}` : ""} [${c.kind}] ${Object.keys(c.criteria).length} options, message ${c.userMessage.length} chars, memory ${memoryChars} (logged ${t.logged["memory_chars"] ?? "-"})`);
});
rows.sort((a, b) => String(a["id"]).localeCompare(String(b["id"])));
writeFileSync(join(DATA, "dataset.jsonl"), rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
console.log(`${rows.length} rows (${rows.filter((r) => r["skipped"]).length} skipped) -> ${join(DATA, "dataset.jsonl")}`);

/** Replay only recorded allowance consumption against a fixed in-memory engine, never the original game choices. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BrainRouter } from "../../../agent/src/brain/router.js";
import { loadConfig } from "../../../agent/src/core/config.js";
import { DecisionBudget, withDecisionBudget } from "../../../agent/src/core/decision-budget.js";
import { pickSpec } from "../../../agent/src/brain/specs.js";

async function main() {
  const base = new URL("./", import.meta.url);
  const audit = JSON.parse(readFileSync(new URL("audit.json", base), "utf8"));
  const results = [];
  for (const row of audit.questions) {
    if (typeof row.before_L2_budget_ms !== "number") throw new Error("historical allowance unknown");
    let time = 0, allowance: number | undefined;
    const parent = new DecisionBudget(row.question_id, "brain", () => time);
    parent.charge(90000 - row.before_L2_budget_ms);
    const router = new BrainRouter({ config: loadConfig({ BRAIN_LOG: "off" }).brain, codexOnly: true,
      log: () => {}, engine: () => ({ name: "codex", model: "fixed-engine-no-model", decide: async (req) => {
        allowance = req.timeoutMs;
        if (allowance !== 90000 || req.effort !== "xhigh") throw new Error("L2 allowance/effort mismatch");
        time += Math.min(89999, row.before_L2_budget_ms + 1000);
        return { engine: "codex", model: "fixed-engine-no-model", answer: { choice: "a", reason: "fixed budget replay" },
          problems: [], attempts: 1, latencyMs: time, usage: { inputTokens: 0, outputTokens: 0 }, toolCalls: [] };
      } }) });
    const options = { a: "fixed symbolic option" };
    const remaining = parent.remaining();
    const answer = await withDecisionBudget(parent, () => router.decide({ label: row.label, system: "fixed", question: "fixed",
      payload: {}, options, spec: pickSpec(row.label, options, {}) }));
    if (parent.remaining() !== remaining || answer.answer?.["choice"] !== "a") throw new Error("real allowance debited or fixed answer rejected");
    results.push({ run_id: row.run_id, question_id: row.question_id, label: row.label,
      before_L2_budget_ms: row.before_L2_budget_ms, after_L2_budget_ms: allowance,
      real_computation_allowance_unchanged: true, source: row.brain_source });
  }
  const result = { scope: "fixed-clock engineering replay; no model/game/simulation/natural result", questions: results.length,
    passed: results.length, results };
  writeFileSync(fileURLToPath(new URL("replay-result.json", base)), JSON.stringify(result, null, 2) + "\n");
  process.stdout.write(JSON.stringify({ questions: results.length, passed: results.length, after_L2_budget_ms: 90000 }) + "\n");
}
void main().catch((error) => { process.stderr.write(String(error) + "\n"); process.exitCode = 1; });

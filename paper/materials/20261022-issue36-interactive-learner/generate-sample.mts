/** Fixed broadcast specimen, with deliberate canaries; no engine, model, terminal or game is started. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BrainLiveWriter } from "../../../agent/src/brain/live-view.js";
import { pickSpec } from "../../../agent/src/brain/specs.js";

const here = dirname(fileURLToPath(import.meta.url));
const logs = mkdtempSync(join(here, ".sample-"));
try {
  const writer = new BrainLiveWriter(logs);
  const request = { runId: "STREAM000001", questionId: "fixture-q-1", label: "reward/card", system: "fixture",
    question: "固定样例：从 A/B 选一项。", payload: { run: { floor: 12 }, player_name: "external-fixture-person" },
    options: { A: null, B: null }, spec: pickSpec("reward/card", { A: null, B: null }) };
  const view = writer.begin(request, "codex", "gpt-6.1-sol", "high", false);
  view.observe({ kind: "reasoning", text: "先核固定资料，再回答。" });
  view.observe({ kind: "tool-start", name: "kb_experience", input: { query: "fixture-query", character: "silent", limit: 3 } });
  view.observe({ kind: "tool-end", name: "kb_experience", output: '{"source":"own","version":"fixture","facts":["固定资料"]}', ms: 7 });
  view.observe({ kind: "text", text: 'api_key="sk-fixedCanaryMustNeverShow" player_name="external-fixture-person"\n' });
  view.observe({ kind: "text", text: "固定结果分句。" });
  view.finish({ choice: "A", reason: "固定测试理由，无游戏知识结论" });
  writer.verdict(request, { choice: "A", reason: "固定测试理由，无游戏知识结论" }, true, 180);
  const second = writer.begin({ ...request, questionId: "fixture-q-2" }, "deepseek", "fixed-dsh", "max", true);
  second.observe({ kind: "reasoning", text: "dsh 既有观察器送来的固定摘要。" });
  second.observe({ kind: "status", text: "!!! 查询阶段兜底 time，用已有资料作答" });
  second.finish(null, "fixed stream stalled timeout");
  await writer.flush();
  writeFileSync(join(here, "view-stream-sample.txt"), "固定样例，非自然对局或真实模型验收。\n" + readFileSync(join(logs, "brain-live/STREAM000001/current.txt"), "utf8").replace(/[ \t]+$/gm, ""));
} finally { rmSync(logs, { recursive: true, force: true }); }

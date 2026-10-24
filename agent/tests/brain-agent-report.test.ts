import { expect, it } from "vitest";
import { brainAgentReport, compareBrainQueryReports } from "../tools/brain-agent-report.js";

it("separates natural completions, fallbacks, text-tool failures and observed tool-free thinking", () => {
  const base = { run_id: "FIXED", question_id: "one", engine: "deepseek", knowledge: { mode: "tools" }, latency_ms: 100,
    accepted: true, tool_calls: [], agent: { fallback: null, thinkingWithoutTools: true, jsonTextWithoutTools: false, toolPhaseMs: 100 } };
  const result = brainAgentReport([base, { ...base, accepted: false }, { ...base, question_id: "two", accepted: true,
    tool_calls: [{ ms: 5, sources: [{ source: "external:fixture" }] }], agent: { fallback: "calls", toolPhaseMs: 80 } },
    { ...base, question_id: "three", accepted: false, agent: { jsonTextWithoutTools: true, fallback: "time" } },
    { ...base, question_id: "legacy", knowledge: { mode: "full" } }]);
  expect(result.questions).toBe(3);
  expect(result.groups[0]).toMatchObject({ completed: 1, calls_total: 1, final_phase_fallbacks: 2,
    thinking_without_native_tool_calls: 1, textual_tool_call_without_native_call: 1,
    source_tags: ["external:fixture"], fallback_reasons: { calls: 1, time: 1, stall: 0 } });
  expect(brainAgentReport([], ["MISSING"]).questions).toBe(0);
});

it("reports observed latency medians separately and keeps missing medians unknown", () => {
  const base = { engine: "codex", label: "reward/card", payload: {}, run_id: "fixed", knowledge: { mode: "tools" }, tool_calls: [] };
  const rows = [10, 20, 40].map((latency_ms, i) => ({ ...base, question_id: String(i), latency_ms }));
  const report = brainAgentReport(rows);
  expect(report.groups[0].latency_ms_median).toBe(20); expect(report.query_groups[0].latency_ms_median).toBe(20);
  expect(brainAgentReport(rows.slice(0, 2)).groups[0].latency_ms_median).toBe(15);
  expect(brainAgentReport([base]).query_groups[0].latency_ms_median).toBeNull();
  expect(compareBrainQueryReports(rows, [{ ...base, latency_ms: 30 }]).changes[0].latency_ms_median_delta).toBe(10);
  expect(compareBrainQueryReports([], rows).changes[0].latency_ms_median_delta).toBeNull();
});

it("reports per-run actual strategy IDs and question latency without counting cues, errors or repeated IDs twice", () => {
  const base = { run_id: "FIXTURE", question_id: "one", label: "reward/card", engine: "codex", knowledge: { mode: "tools" }, latency_ms: 100,
    tool_calls: [{ name: "kb_strategies", ms: 4, output: '{"entries":[{"id":"fixture-a"}]}' }] };
  const other = { ...base, question_id: "two", latency_ms: 200, tool_calls: [
    ...base.tool_calls, { name: "kb_strategies", ms: 8, output: '{"entries":[{"id":"fixture-b"}]}' },
    { name: "kb_strategies", ms: 10, output: '{"entries":[{"id":"error-id"}]}', isError: true }] };
  const result = brainAgentReport([base, base, other, { ...base, run_id: "EMPTY", tool_calls: [] }]);
  expect(result.strategy_runs.find(r => r.run_id === "FIXTURE")).toMatchObject({ questions: 2, queried_questions: 2, hit_questions: 2,
    calls: 4, hit_entry_count: 2, hit_ids: ["fixture-a", "fixture-b"], tool_execution_ms_median: 6, question_latency_ms_median: 150,
    questions_detail: [{ question_id: "one", hit_ids: ["fixture-a"] }, { question_id: "two", hit_ids: ["fixture-a", "fixture-b"] }] });
  expect(result.strategy_runs.find(r => r.run_id === "EMPTY")).toMatchObject({ hit_entry_count: 0, hit_ids: [], tool_execution_ms_median: null });
});

import { expect, it } from "vitest";
import { brainAgentReport } from "../tools/brain-agent-report.js";

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

/** Natural-run acceptance from existing brain JSONL; never schedules games or calls models. */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
type Row = Record<string, any>;
const p95 = (xs: number[]) => xs.length ? [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * .95) - 1] : null;
const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
export function brainAgentReport(rows: Row[], runIds: string[] = []) {
  const questions = new Map<string, Row>();
  for (const row of rows) if (row.knowledge?.mode === "tools" && (!runIds.length || runIds.includes(row.run_id))) questions.set(`${row.run_id}/${row.question_id ?? `${row.ts}/${row.label}`}`, row);
  const data = [...questions.values()];
  const groups = [...new Set(data.map(r => r.engine))].sort().map(engine => {
    const selected = data.filter(r => r.engine === engine);
    const calls = selected.map(r => Array.isArray(r.tool_calls) ? r.tool_calls.length : 0);
    const toolTime = selected.map(r => (r.tool_calls ?? []).reduce((n: number, c: Row) => n + (Number(c.ms) || 0), 0));
    const latency = selected.map(r => Number(r.latency_ms) || 0);
    const fallback = selected.filter(r => r.agent?.fallback);
    return { engine, questions: selected.length, completed: selected.filter(r => r.accepted === true).length,
      completion_rate: selected.length ? selected.filter(r => r.accepted === true).length / selected.length : null,
      tool_call_rate: calls.filter(n => n > 0).length / selected.length, calls_total: calls.reduce((a, b) => a + b, 0), calls_mean: mean(calls), calls_p95: p95(calls),
      tool_execution_ms_mean: mean(toolTime), tool_execution_ms_p95: p95(toolTime), latency_ms_mean: mean(latency), latency_ms_p95: p95(latency),
      tool_phase_ms_mean: mean(selected.flatMap(r => typeof r.agent?.toolPhaseMs === "number" ? [r.agent.toolPhaseMs] : [])),
      final_phase_fallbacks: fallback.length, fallback_rate: fallback.length / selected.length,
      fallback_reasons: Object.fromEntries(["calls", "time", "stall"].map(reason => [reason, fallback.filter(r => r.agent.fallback === reason).length])),
      thinking_without_native_tool_calls: selected.filter(r => r.agent?.thinkingWithoutTools === true).length,
      textual_tool_call_without_native_call: selected.filter(r => r.agent?.jsonTextWithoutTools === true).length,
      missing_agent_telemetry: selected.filter(r => !r.agent).length,
      source_tags: [...new Set(selected.flatMap(r => (r.tool_calls ?? []).flatMap((c: Row) => (c.sources ?? []).map((s: Row) => s.source ?? "unknown"))))].sort(),
    };
  });
  return { schema: "brain-agent-acceptance-v1", questions: data.length, run_ids: [...new Set(data.map(r => r.run_id))].sort(),
    prefix_budget_open_book_omissions: data.filter(r => /open.book.*(?:budget|预算)|(?:budget|预算).*open.book/i.test(JSON.stringify(r.notes ?? []))).length,
    inline_knowledge_rows: data.filter(r => r.payload?.open_book || r.payload?.strategy_entries || r.knowledge?.mode === "full").length,
    groups, limitation: "仅自然工具模式题；工具执行耗时与查询阶段总耗时分列。无工具调用是观测，不自动判错；无对照局，不推断因果增加耗时或收益。零题不构成验收。" };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2]; if (!path) throw new Error("usage: brain-agent-report.ts <brain.jsonl> [run-id ...]");
  const rows = readFileSync(path, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
  process.stdout.write(JSON.stringify(brainAgentReport(rows, process.argv.slice(3)), null, 2) + "\n");
}

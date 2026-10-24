/** Natural-run acceptance from existing brain JSONL; never schedules games or calls models. */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { guidanceKind, queryAudit } from "../src/brain/tools/query-guidance.js";
import { endgameRequired, endgamePlanningTask, endgameReuse, endgameCheckpointRequired, endgameProblems, parseEndgamePlan } from "../src/memory/endgame-plan.js";
import { runPlanUpdateProblems } from "../src/memory/run-plan-update.js";
type Row = Record<string, any>;
const p95 = (xs: number[]) => xs.length ? [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * .95) - 1] : null;
const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const median = (xs: number[]) => { const sorted = [...xs].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length ? sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2 : null; };
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
      latency_ms_median: median(selected.flatMap(r => typeof r.latency_ms === "number" && Number.isFinite(r.latency_ms) ? [r.latency_ms] : [])),
      tool_phase_ms_mean: mean(selected.flatMap(r => typeof r.agent?.toolPhaseMs === "number" ? [r.agent.toolPhaseMs] : [])),
      final_phase_fallbacks: fallback.length, fallback_rate: fallback.length / selected.length,
      fallback_reasons: Object.fromEntries(["calls", "time", "stall"].map(reason => [reason, fallback.filter(r => r.agent.fallback === reason).length])),
      thinking_without_native_tool_calls: selected.filter(r => r.agent?.thinkingWithoutTools === true).length,
      textual_tool_call_without_native_call: selected.filter(r => r.agent?.jsonTextWithoutTools === true).length,
      missing_agent_telemetry: selected.filter(r => !r.agent).length,
      source_tags: [...new Set(selected.flatMap(r => (r.tool_calls ?? []).flatMap((c: Row) => (c.sources ?? []).map((s: Row) => s.source ?? "unknown"))))].sort(),
    };
  });
  const queryGroups = [...new Set(data.map(r => `${r.engine}/${guidanceKind(r.label ?? "", r.payload) ?? "other"}`))].sort().map(key => {
    const selected = data.filter(r => `${r.engine}/${guidanceKind(r.label ?? "", r.payload) ?? "other"}` === key);
    const audit = selected.map(r => queryAudit(r.tool_calls ?? []));
    const summarize = (kind: "strategies" | "rk" | "experience") => {
      const rows = audit.map(a => a[kind]);
      const calls = rows.reduce((n, r) => n + r.calls, 0);
      const hits = rows.reduce((n, r) => n + r.hit_calls, 0);
      const unknown = rows.reduce((n, r) => n + r.unknown_hit_calls, 0);
      return { queried_questions: rows.filter(r => r.queried).length, query_rate: rows.filter(r => r.queried).length / selected.length,
        calls, hit_calls: hits, unknown_hit_calls: unknown, hit_rate: calls && !unknown ? hits / calls : null,
        hit_ids: [...new Set(rows.flatMap(r => r.hit_ids))].sort() };
    };
    const calls = selected.map(r => (r.tool_calls ?? []).length);
    const latency = selected.flatMap(r => typeof r.latency_ms === "number" ? [r.latency_ms] : []);
    return { engine: selected[0]!.engine, question_type: key.slice(key.indexOf("/") + 1), questions: selected.length,
      strategies: summarize("strategies"), rk: summarize("rk"), experience: summarize("experience"),
      rk_available_questions: selected.filter(r => Array.isArray(r.tools) && r.tools.includes("kb_reflex")).length, calls_mean: mean(calls), calls_p95: p95(calls),
      latency_ms_mean: mean(latency), latency_ms_median: median(latency), latency_ms_p95: p95(latency) };
  });
  const strategyRuns = [...new Set(data.map(r => r.run_id))].sort().map(run_id => {
    const selected = data.filter(r => r.run_id === run_id);
    const audits = selected.map(r => queryAudit(r.tool_calls ?? []).strategies);
    const ids = [...new Set(audits.flatMap(a => a.hit_ids))].sort();
    const calls = selected.flatMap(r => r.tool_calls ?? []).filter(c => c.name === "kb_strategies");
    const latency = selected.flatMap(r => typeof r.latency_ms === "number" && Number.isFinite(r.latency_ms) ? [r.latency_ms] : []);
    const execution = calls.flatMap(c => typeof c.ms === "number" && Number.isFinite(c.ms) ? [c.ms] : []);
    return { run_id, questions: selected.length, queried_questions: audits.filter(a => a.queried).length,
      hit_questions: audits.filter(a => a.hit_ids.length > 0).length, calls: calls.length,
      hit_entry_count: ids.length, hit_ids: ids,
      tool_execution_ms_median: median(execution), tool_execution_ms_p95: p95(execution),
      question_latency_ms_median: median(latency), question_latency_ms_p95: p95(latency),
      questions_detail: selected.map((r, i) => ({ question_id: r.question_id ?? null, engine: r.engine, label: r.label,
        hit_ids: audits[i]!.hit_ids, latency_ms: typeof r.latency_ms === "number" ? r.latency_ms : null })) };
  });
  const endgame = data.filter(r => endgameRequired(r.payload) || endgamePlanningTask(r.payload));
  const endgameGroups = [...new Set(endgame.map(r => `${r.engine}/${r.payload?.facts?.act ?? r.payload?.run_plan_task?.act ?? "unknown"}`))].sort().map(key => {
    const selected = endgame.filter(r => `${r.engine}/${r.payload?.facts?.act ?? r.payload?.run_plan_task?.act ?? "unknown"}` === key);
    const checkpoints = selected.filter(r => endgameCheckpointRequired(r.payload));
    const nonempty = selected.filter(r => parseEndgamePlan(r.payload?.facts?.your_run_plan?.endgame ?? r.payload?.run_plan_task?.previous_plan?.endgame));
    const accepted = selected.filter(r => r.accepted === true && (endgameReuse(r.payload)
      ? runPlanUpdateProblems(r.answer?.run_plan, r.payload).length === 0
      : endgameProblems(r.answer?.run_plan?.endgame, endgameCheckpointRequired(r.payload)).length === 0));
    const updates = accepted.filter(r => r.answer?.run_plan && Object.keys(r.answer.run_plan).some(k => k !== "change_reason" && r.answer.run_plan[k] != null));
    return { engine: selected[0]!.engine, act: key.slice(key.indexOf("/") + 1), questions: selected.length,
      prior_plan_nonempty: nonempty.length, prior_plan_nonempty_rate: nonempty.length / selected.length,
      accepted_plan_updates: updates.length, accepted_plan_update_rate: updates.length / selected.length,
      reuse_offered: selected.filter(r => endgameReuse(r.payload)).length,
      reuse_without_plan_output: accepted.filter(r => endgameReuse(r.payload) && r.answer?.run_plan == null).length,
      checkpoints_requested: checkpoints.length, checkpoints_answered: checkpoints.filter(r => accepted.includes(r) && typeof r.answer?.run_plan?.endgame?.checkpoint === "string" && r.answer.run_plan.endgame.checkpoint.trim()).length,
      question_ids: selected.map(r => r.question_id ?? null) };
  });
  return { schema: "brain-agent-acceptance-v1", questions: data.length, run_ids: [...new Set(data.map(r => r.run_id))].sort(),
    endgame_groups: endgameGroups,
    planning_questions: endgame.map(r => ({ run_id: r.run_id, question_id: r.question_id ?? null, engine: r.engine, label: r.label,
      accepted: r.accepted ?? null, reuse_offered: endgameReuse(r.payload),
      plan_output: r.answer?.run_plan ?? null, change_reason: r.answer?.run_plan?.change_reason ?? null,
      route: r.answer?.route ?? null, route_reason: r.answer?.route_reason ?? (r.label?.startsWith("map/") ? r.answer?.reason ?? null : null),
      route_calculation: (r.payload?.route_review ?? r.payload?.route_map ?? r.payload?.act_route)?.route_calculation ?? null,
      tools: (r.tool_calls ?? []).map((c: Row) => ({ name: c.name, ms: c.ms ?? null })),
      answer_json_chars: r.answer == null ? null : Array.from(JSON.stringify(r.answer)).length,
      raw_output_chars: typeof r.raw === "string" ? Array.from(r.raw).length : null,
      output_tokens: r.usage?.outputTokens ?? null, question_latency_ms: r.latency_ms ?? null })),
    strategy_runs: strategyRuns,
    endgame_limitation: "统计显式 endgame 规划题（含旧必填与新复用），按引擎/幕分账；首次无旧计划属正常；复用且无计划输出不计更新。planning_questions列实际查库、变更理由、投影复用/依赖失效、答案JSON长度、原文长度与整题耗时；旧记录缺字段为null。非空不证明内容成立，accepted不证明落盘或实际采用；需核run-plans与下一题。未发给大脑的代码/Jev动作不在分母。F48/F49到达与首试/SL结果须沿同角色/进阶/脑来源的原对局日志另核；空样本不构成验收。",
    prefix_budget_open_book_omissions: data.filter(r => /open.book.*(?:budget|预算)|(?:budget|预算).*open.book/i.test(JSON.stringify(r.notes ?? []))).length,
    inline_knowledge_rows: data.filter(r => r.payload?.open_book || r.payload?.strategy_entries || r.knowledge?.mode === "full").length,
    groups, query_groups: queryGroups, rk_definition: "reflex.json via kb_reflex; kb_experience is experience, never rk", limitation: "仅自然工具模式题；工具执行耗时与查询阶段总耗时分列。策略/rk/经验按引擎和互斥题型分母统计；rk仅为kb_reflex，历史kb_experience查询不计rk，命中率=返回非空id数组的调用/该工具调用（含错误）；不把线索或调用文字算命中。自然前后窗口不是A/B，不推断因果耗时或收益；零题不构成验收。" };
}
export function compareBrainQueryReports(before: Row[], after: Row[], beforeRunIds: string[] = [], afterRunIds: string[] = []) {
  const baseline = brainAgentReport(before, beforeRunIds), current = brainAgentReport(after, afterRunIds);
  return { schema: "brain-query-comparison-v1", baseline, current,
    baseline_run_count: baseline.run_ids.length, expected_baseline_runs: 18,
    baseline_matches_18_runs: baseline.run_ids.length === 18,
    changes: current.query_groups.map(group => {
      const old = baseline.query_groups.find(g => g.engine === group.engine && g.question_type === group.question_type);
      return { engine: group.engine, question_type: group.question_type,
        strategies_query_rate_delta: old ? group.strategies.query_rate - old.strategies.query_rate : null,
        rk_query_rate_delta: old ? group.rk.query_rate - old.rk.query_rate : null,
        calls_mean_delta: old && group.calls_mean !== null && old.calls_mean !== null ? group.calls_mean - old.calls_mean : null,
        latency_ms_mean_delta: old && group.latency_ms_mean !== null && old.latency_ms_mean !== null ? group.latency_ms_mean - old.latency_ms_mean : null,
        latency_ms_median_delta: old && group.latency_ms_median !== null && old.latency_ms_median !== null ? group.latency_ms_median - old.latency_ms_median : null };
    }), limitation: "上线前18局与上线后首批自然局须由调用者明确冻结原日志和局号；缺失题型变化为null，不补零，不追加实验局。" };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2]; if (!path) throw new Error("usage: brain-agent-report.ts <brain.jsonl> [run-id ...] [--baseline <before.jsonl> --baseline-run <run-id> ...]");
  const rows = readFileSync(path, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
  const runIds: string[] = [], beforeRunIds: string[] = [];
  let baselinePath: string | undefined;
  const args = process.argv.slice(3);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg === "--baseline" || arg === "--baseline-run") {
      const value = args[++i]; if (!value || value.startsWith("--")) throw new Error(`missing value for ${arg}`);
      if (arg === "--baseline") baselinePath = value; else beforeRunIds.push(value);
    } else if (arg.startsWith("--")) throw new Error(`unknown option ${arg}`);
    else runIds.push(arg);
  }
  const report = baselinePath ? compareBrainQueryReports(readFileSync(baselinePath, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line)), rows, beforeRunIds, runIds) : brainAgentReport(rows, runIds);
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

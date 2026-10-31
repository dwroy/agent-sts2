/** Read-only acceptance of explicitly frozen natural windows. Does not select a release or schedule games. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { asArray, asRecord, str } from "../src/core/util/json.js";
import { bossTargetContext, bossTargetProblems } from "../src/brain/boss-target.js";
import { isConstructionQuestion } from "../src/memory/construction-log.js";
import { canonicalBossId } from "../src/knowledge/boss-planning-data.js";

type Row = Record<string, any>;
const number = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const rate = (n: number, d: number) => d ? n / d : null;
const median = (v: number[]) => { const x = [...v].sort((a, b) => a - b), m = Math.floor(x.length / 2); return x.length ? x.length % 2 ? x[m]! : (x[m - 1]! + x[m]!) / 2 : null; };
const p95 = (v: number[]) => v.length ? [...v].sort((a, b) => a - b)[Math.ceil(v.length * .95) - 1]! : null;
const distribution = (v: unknown[]) => { const values = v.filter(number); return { n: values.length, p50: median(values), p95: p95(values) }; };
export function latencyAlert(before: number | null, after: number | null) {
  if (before === null || after === null) return { status: "unknown", alarm: null, delta_ms: null, relative_increase: null };
  const delta = after - before, relative = before > 0 ? delta / before : null;
  return { status: "observational", alarm: (relative !== null && relative > .10) || delta > 2000,
    delta_ms: delta, relative_increase: relative };
}
function bossCalls(row: Row) {
  const context = bossTargetContext(row.payload), ids = context?.candidates ?? [];
  const aliases = [...ids, ...Object.values(asRecord(row.boss_dossier?.boss_aliases)).flatMap(asArray).filter((s): s is string => typeof s === "string")];
  const allowed = new Set(["kb_monster", "kb_encounter", "kb_strategies", "kb_experience", "external_stats_encounter"]);
  const calls: Row[] = Array.isArray(row.evidence?.tools) ? row.evidence.tools : row.tool_calls ?? [];
  const seen = new Set<string>();
  return calls.filter((c, i) => {
    const name = String(c.name ?? ""), key = String(c.callId ?? c.call_id ?? c.id ?? `${i}/${name}`);
    if (!allowed.has(name) || seen.has(key)) return false; seen.add(key);
    const text = JSON.stringify(c.input ?? {}).toUpperCase(), tokens = (text.match(/[A-Z][A-Z0-9_+.]*/g) ?? []).map(canonicalBossId);
    return aliases.some(id => id && (/^[A-Z0-9_+.]+$/i.test(String(id)) ? tokens.includes(canonicalBossId(String(id))) : text.includes(String(id).toUpperCase())));
  }).map(c => ({ name: c.name, failed: c.isError === true || ["failed", "rejected"].includes(c.status), ms: number(c.ms) ? c.ms : null }));
}
export function bossTargetReport(rows: Row[], runIds: string[] = [], configs: Row[] = []) {
  const grouped = new Map<string, Row[]>();
  for (const r of rows) {
    if (runIds.length && !runIds.includes(r.run_id) || r.knowledge?.mode !== "tools" || !isConstructionQuestion(r.label ?? "")
      || !bossTargetContext(r.payload) && !r.payload?.facts?.endgame_objective) continue;
    const key = `${r.run_id}/${r.question_id ?? `${r.ts}/${r.label}`}`, seen = grouped.get(key) ?? [];
    if (!seen.some(e => JSON.stringify(e) === JSON.stringify(r))) seen.push(r);
    grouped.set(key, seen);
  }
  const data = [...grouped].map(([id, attempts]) => {
    const r = attempts.at(-1)!, c = bossTargetContext(r.payload), target = r.answer?.boss_target;
    const config = configs.filter(x => x.run_id === r.run_id && (!x.ts || !r.ts || x.ts <= r.ts)).at(-1);
    const valid = c !== null && bossTargetProblems(target, r.payload).length === 0;
    const ids = valid ? target.boss_ids as string[] : [], known = c ? [c.act_boss, ...c.final].filter(Boolean) : [];
    const calls = bossCalls(r), service = config?.brain?.codex?.service_tier ?? r.service_tier ?? "unknown";
    const effort = r.native_receipt?.effort ?? r.effort ?? r.requested_effort ?? "unknown", model = r.native_receipt?.model ?? r.model ?? "unknown";
    const effortBasis = r.native_receipt?.effort != null ? "native_receipt" : r.effort != null ? "engine_report" : "requested_or_unknown";
    const queried = (r.tool_calls?.length ?? 0) > 0 || (r.evidence?.tools?.length ?? 0) > 0;
    const label = String(r.label).split("/")[0], key = JSON.stringify([r.engine, model, effort, effortBasis, service, label, queried ? "queried" : "no_query", r.reasks ? "reasked" : "no_reask"]);
    const queryScopeKnown = !!c?.candidates.some(id => typeof id === "string" && !!id.trim())
      || Object.values(asRecord(r.boss_dossier?.boss_aliases)).flatMap(asArray).some(id => typeof id === "string" && !!id.trim());
    return { id, r, key, attempts, calls, queryScopeKnown, valid, concrete: valid && ids.length > 0, revealed: valid && ids.some(id => known.includes(id)),
      candidate: valid && ids.some(id => !known.includes(id)), exception: valid && ids.length === 0,
      stratum: { engine: r.engine, model, effort, effort_basis: effortBasis, service_tier: service,
        question_type: label, query_group: queried ? "queried" : "no_query", reask_group: r.reasks ? "reasked" : "no_reask" } };
  });
  const groups = [...new Set(data.map(d => d.key))].map(key => {
    const ds = data.filter(d => d.key === key), selected = ds.map(d => d.r), accepted = ds.filter(d => d.r.accepted === true);
    const prompts = selected.flatMap(r => r.boss_dossier?.prompts ?? []);
    return { key, ...ds[0]!.stratum, questions: ds.length, accepted: accepted.length,
      valid_target: ds.filter(d => d.valid).length, valid_target_rate: rate(ds.filter(d => d.valid).length, ds.length),
      concrete_target: ds.filter(d => d.concrete).length, concrete_target_rate: rate(ds.filter(d => d.concrete).length, ds.length),
      revealed_target: ds.filter(d => d.revealed).length, candidate_target: ds.filter(d => d.candidate).length,
      explained_no_target: ds.filter(d => d.exception).length,
      latency_ms: distribution(selected.map(r => r.latency_ms)), dossier_bytes: distribution(selected.map(r => r.boss_dossier?.dossier_bytes)),
      projection_ms: distribution(selected.map(r => r.boss_dossier?.projection_ms)),
      prompt_bytes: Object.fromEntries(["system_bytes", "user_bytes", "schema_bytes", "tools_bytes", "total_bytes"].map(k => [k, distribution(prompts.map(p => p[k]))])),
      missing_native_prompt_metrics: selected.filter(r => !r.boss_dossier?.prompts?.length).length,
    };
  });
  return { schema: "boss-target-acceptance-v1", expected_behavior_runs: 10, requested_runs: runIds, observed_runs: [...new Set(data.map(d => d.r.run_id))],
    questions: data.length, reply_questions: data.filter(d => d.attempts.some(r => r.answer != null || r.first?.answer != null)).length,
    accepted: data.filter(d => d.r.accepted === true).length, valid_target: data.filter(d => d.valid).length,
    concrete_target: data.filter(d => d.concrete).length, concrete_target_rate: rate(data.filter(d => d.concrete).length, data.length),
    explained_no_target: data.filter(d => d.exception).length, invalid_or_missing: data.filter(d => !d.valid).length,
    failed_target_questions: data.filter(d => d.attempts.some(r => bossTargetContext(r.payload) && (r.answer != null && bossTargetProblems(r.answer.boss_target, r.payload).length > 0
      || r.first?.answer != null && bossTargetProblems(r.first.answer.boss_target, r.payload).length > 0))).length,
    invalid_reply_records: data.reduce((n, d) => n + d.attempts.filter(r => bossTargetContext(r.payload) && r.answer != null && bossTargetProblems(r.answer.boss_target, r.payload).length > 0).length
      + d.attempts.filter(r => r.first?.answer != null && bossTargetProblems(r.first.answer.boss_target, r.payload).length > 0).length, 0),
    reasked_questions: data.filter(d => d.r.reasks > 0).length,
    boss_query_scope: { mapped_questions: data.filter(d => d.queryScopeKnown).length, unknown_questions: data.filter(d => !d.queryScopeKnown).length,
      status: !data.length || data.every(d => !d.queryScopeKnown) ? "unknown" : data.every(d => d.queryScopeKnown) ? "complete" : "partial",
      interpretation: "boss_queries只计可匹配调用；旧题缺context/别名时覆盖unknown，匹配0不能当作实际零查询，不回填旧曝光。" },
    boss_queries: { questions: data.filter(d => d.calls.length).length, calls: data.reduce((n, d) => n + d.calls.length, 0),
      failed: data.reduce((n, d) => n + d.calls.filter(c => c.failed).length, 0),
      per_tool: Object.fromEntries([...new Set(data.flatMap(d => d.calls.map(c => c.name)))].map(name => [name, data.reduce((n, d) => n + d.calls.filter(c => c.name === name).length, 0)])) },
    forced_dossier_questions: data.filter(d => !!d.r.boss_dossier).length, groups,
    limitation: "显式冻结自然局窗口；具体ID/解释非空只核格式，不证明缺口或采用成立。主动查询按本题规范ID及审计别名匹配，未知/泛称查询不冒命中；不把档案曝光计成查询。最终行与失败/重问分列，invalid_reply_records为记录数非唯一原生调用；旧原生字节缺失为unknown。total_bytes是原生system/user/schema，tools目录另列以免重复；不含传输协议开销。引擎/模型/档位/题型/查询/重问分层仅观察对比；发布/版本与10局结束身份由原ops核。" };
}
export function compareBossTargetReports(before: Row[], after: Row[], beforeRuns: string[], afterRuns: string[], configs: Row[] = []) {
  const baseline = bossTargetReport(before, beforeRuns, configs), current = bossTargetReport(after, afterRuns, configs);
  return { schema: "boss-target-comparison-v1", baseline, current,
    latency_alert_thresholds: { relative_strictly_greater_than: .10, absolute_strictly_greater_than_ms: 2000, logic: "OR" },
    comparisons: current.groups.map(g => {
      const old = baseline.groups.find(b => b.key === g.key);
      return { stratum: g.key, baseline_n: old?.questions ?? 0, current_n: g.questions,
        p50: latencyAlert(old?.latency_ms.p50 ?? null, g.latency_ms.p50), p95: latencyAlert(old?.latency_ms.p95 ?? null, g.latency_ms.p95) };
    }) };
}

/** Missing first-attempt evidence is unknown. A later SL win never fills a primary-run gap. */
export function bossAttemptWindow(runIds: string[], terminals: Row[], attempts: Row[]) {
  const distinct = [...new Set(runIds)];
  const results = distinct.map(run => {
    const terminal = terminals.filter(t => t.run_id === run && str(t.character).toLowerCase() === "silent" && t.ascension === 10
      && typeof t.ended === "string" && Number.isFinite(Date.parse(t.ended))).at(-1);
    const first = attempts.filter(a => a.run_id === run && a.attempt === 1);
    const stopped = first.filter(a => ["predicted_death", "died"].includes(a.result) && number(a.floor));
    const cutoff = stopped.length ? Math.min(...stopped.map(a => a.floor)) : Infinity;
    const floorResult = (floor: number) => {
      if (!terminal) return "pending";
      if (cutoff < floor) return "not_reached_after_first_stop";
      const seen = first.filter(a => a.floor === floor && a.fight_kind === "boss"), outcomes = new Set(seen.map(a => a.result));
      if (outcomes.size === 1 && outcomes.has("won")) return "won";
      if (outcomes.size === 1 && outcomes.has("died")) return "died";
      if (outcomes.size === 1 && outcomes.has("predicted_death")) return "predicted_stop";
      if (!seen.length && number(terminal.floor) && terminal.floor < floor) return "not_reached";
      return "unknown";
    };
    return { run_id: run, ended: !!terminal, outcomes: { "33": floorResult(33), "48": floorResult(48), "49": floorResult(49) } };
  });
  const floors = [33, 48, 49].map(floor => {
    const status = results.map(r => r.outcomes[String(floor) as "33" | "48" | "49"]), won = status.filter(s => s === "won").length;
    const reached = status.filter(s => ["won", "died", "predicted_stop"].includes(s)).length;
    return { floor, ended_runs: results.filter(r => r.ended).length, won, died: status.filter(s => s === "died").length,
      predicted_stop: status.filter(s => s === "predicted_stop").length, unknown: status.filter(s => s === "unknown").length,
      pending: status.filter(s => s === "pending").length, not_reached: status.filter(s => s.startsWith("not_reached")).length,
      first_attempt_known_opportunities: reached, conditional_pass_rate: rate(won, reached), all_window_passed_per_run: rate(won, distinct.length) };
  });
  const after48 = results.filter(r => r.outcomes["48"] === "won" && ["won", "died", "predicted_stop"].includes(r.outcomes["49"]));
  return { expected_effect_runs: 30, requested_runs: distinct.length, ended_runs: results.filter(r => r.ended).length,
    floors, f49_given_f48_and_observed_arrival: { n: after48.length, won: after48.filter(r => r.outcomes["49"] === "won").length,
      pass_rate: rate(after48.filter(r => r.outcomes["49"] === "won").length, after48.length) }, results,
    limitation: "只认完整冻结输入中的attempt=1且fight_kind=boss原结果；预测截止与实际死分列，重试排除。任何更早首试预测/实际死亡使后续不属原首试路线；未到场不算该战失败。缺原战斗/SL覆盖、冲突、未结束保持unknown/pending，不由终局胜利或楼层反推胜场。运行方须核原始覆盖/同角色A10/引擎/发布/窗口身份，零或不足30局不代效果验收。" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), values = new Map<string, string[]>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]!, value = args[i + 1];
    if (!["--brain", "--baseline", "--run", "--baseline-run", "--run-config", "--runs", "--attempts"].includes(key) || !value || value.startsWith("--")) throw Error("usage: --brain FILE --run ID ... [--baseline FILE --baseline-run ID ...] [--run-config FILE] [--runs FILE --attempts FILE]");
    const prior = values.get(key) ?? []; if (prior.length && !["--run", "--baseline-run"].includes(key)) throw Error("duplicate file option");
    values.set(key, [...prior, value]);
  }
  const sources: Row[] = [], read = (key: string): Row[] => {
    const path = values.get(key)?.[0]; if (!path) return [];
    const raw = readFileSync(path); sources.push({ input: key, path, sha256: createHash("sha256").update(raw).digest("hex") });
    return raw.toString("utf8").split("\n").filter(Boolean).map(s => JSON.parse(s));
  };
  if (!values.has("--brain") || !values.has("--run")) throw Error("explicit frozen brain and run IDs required");
  if (values.has("--baseline") && !values.has("--baseline-run")) throw Error("explicit frozen baseline run IDs required");
  const rows = read("--brain"), configs = read("--run-config"), ids = values.get("--run")!;
  const report = values.has("--baseline") ? compareBossTargetReports(read("--baseline"), rows, values.get("--baseline-run") ?? [], ids, configs) : bossTargetReport(rows, ids, configs);
  const attempts = values.has("--runs") && values.has("--attempts") ? bossAttemptWindow(ids, read("--runs"), read("--attempts")) : null;
  process.stdout.write(JSON.stringify({ report, attempts, sources }, null, 2) + "\n");
}

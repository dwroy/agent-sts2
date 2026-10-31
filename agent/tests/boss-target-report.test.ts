import { expect, it } from "vitest";
import { bossTargetReport, compareBossTargetReports, latencyAlert, bossAttemptWindow } from "../tools/boss-target-report.js";

function row(id: string, latency = 1000): any {
  return { run_id: "FIXTURE", question_id: id, ts: "2026-10-31T00:01:00Z", label: "reward/card", engine: "codex", model: "fixed", effort: "high", service_tier: "fast",
    knowledge: { mode: "tools" }, accepted: true, latency_ms: latency, tool_calls: [], payload: { facts: { boss_target_context: {
      schema: "boss-target-context-v1", run: "FIXTURE", floor: 35, act_boss: "FORMAT_A", final: ["FORMAT_A", null], candidates: ["FORMAT_A", "FORMAT_B"], review_required: false } } },
    answer: { boss_target: { boss_ids: ["FORMAT_A"], gap: "unknown", reason: "固定依据" } },
    boss_dossier: { dossier_bytes: 1000, projection_ms: 1, boss_aliases: { FORMAT_A: ["格式甲"] }, prompts: [
      { system_bytes: 100, user_bytes: 1000, schema_bytes: 200, tools_bytes: 400, total_bytes: 1300 }] } };
}
it("separates concrete IDs, revealed IDs, explained survival steps and invalid replies without counting static exposure as a query", () => {
  const a = row("one"), b = row("two"), c = row("three"), d = row("four");
  b.answer.boss_target.boss_ids = ["FORMAT_B"];
  c.answer.boss_target = { boss_ids: [], gap: "本步不补", reason: "保血过当前幕" };
  d.answer.boss_target = { boss_ids: ["INVENTED"], gap: "", reason: "" }; d.accepted = false;
  const r = bossTargetReport([a, a, b, c, d], ["FIXTURE"]);
  expect(r).toMatchObject({ questions: 4, reply_questions: 4, accepted: 3, valid_target: 3, concrete_target: 2,
    explained_no_target: 1, invalid_or_missing: 1, concrete_target_rate: .5, forced_dossier_questions: 4, boss_queries: { calls: 0 } });
  expect(r.groups[0]).toMatchObject({ revealed_target: 1, candidate_target: 1, prompt_bytes: { total_bytes: { p50: 1300 } } });
  expect(bossTargetReport([], ["FIXTURE"]).concrete_target_rate).toBeNull();
});
it("counts only actual Boss-related native calls, including failed calls, without near-ID false matches", () => {
  const a = row("one");
  a.evidence = { tools: [{ id: "a", name: "kb_monster", input: { id: "ENCOUNTER.FORMAT_A_BOSS" }, status: "completed" },
    { id: "a", name: "kb_monster", input: { id: "FORMAT_A" }, status: "completed" },
    { id: "b", name: "kb_encounter", input: { query: "格式甲" }, status: "failed" },
    { id: "c", name: "kb_monster", input: { id: "OTHER_FORMAT_A" }, status: "completed" },
    { id: "d", name: "kb_strategies", input: { query: "*" }, status: "completed" }] };
  expect(bossTargetReport([a]).boss_queries).toEqual({ questions: 1, calls: 2, failed: 1, per_tool: { kb_monster: 1, kb_encounter: 1 } });
});
it("preserves failed first replies and the final accepted answer; stratifies tier, queries and reasks", () => {
  const a = row("one"), invalid = { ...a, answer: { boss_target: null }, accepted: false };
  a.reasks = 1; a.first = { answer: invalid.answer }; const b = row("two"); b.service_tier = "default";
  const r = bossTargetReport([invalid, a, b]);
  expect(r.questions).toBe(2); expect(r.failed_target_questions).toBe(1); expect(r.invalid_reply_records).toBe(2); expect(r.reasked_questions).toBe(1); expect(r.groups).toHaveLength(2);
});
it("marks old missing Boss lookup scope unknown instead of interpreting unmatched calls as zero queries", () => {
  const old = row("old");
  old.payload.facts = { endgame_objective: "historical objective" }; delete old.boss_dossier;
  old.tool_calls = [{ name: "kb_monster", input: { id: "FORMAT_A" } }];
  const r = bossTargetReport([old]);
  expect(r.questions).toBe(1);
  expect(r.boss_query_scope).toMatchObject({ mapped_questions: 0, unknown_questions: 1, status: "unknown" });
  expect(r.boss_queries.calls).toBe(0);
  expect(bossTargetReport([old, row("new")]).boss_query_scope.status).toBe("partial");
  expect(bossTargetReport([row("new")]).boss_query_scope.status).toBe("complete");
});
it("does not label an engine effort fallback as native when the receipt has no effort field", () => {
  const requested = row("requested"); requested.native_receipt = { model: "native-model" };
  expect(bossTargetReport([requested]).groups[0]).toMatchObject({ effort: "high", effort_basis: "engine_report" });
  const native = row("native"); native.native_receipt = { effort: "low" };
  expect(bossTargetReport([native]).groups[0]).toMatchObject({ effort: "low", effort_basis: "native_receipt" });
  const observedHigh = row("observed"); observedHigh.native_receipt = { effort: "high", model: "native-model" };
  expect(bossTargetReport([requested, observedHigh]).groups).toHaveLength(2);
});
it("uses the approved strictly-greater 10 percent OR 2 second p50/p95 alarms", () => {
  expect(latencyAlert(1000, 1100).alarm).toBe(false); expect(latencyAlert(1000, 1101).alarm).toBe(true);
  expect(latencyAlert(100000, 102001).alarm).toBe(true); expect(latencyAlert(100000, 102000).alarm).toBe(false);
  expect(latencyAlert(null, 5000).alarm).toBeNull();
  const r = compareBossTargetReports([row("old", 1000)], [row("new", 1101)], ["FIXTURE"], ["FIXTURE"]);
  expect(r.comparisons[0].p50.alarm).toBe(true); expect(r.comparisons[0].p95.alarm).toBe(true);
  expect(r.latency_alert_thresholds.logic).toBe("OR");
});
it("does not substitute later SL wins, missing battle outcomes or unended runs for primary-run Boss success", () => {
  const end = (run_id: string) => ({ run_id, character: "silent", ascension: 10, floor: 49, ended: "2026-10-31T00:00:00Z" });
  const a = (run_id: string, floor: number, result: string, attempt = 1) => ({ run_id, floor, result, attempt, fight_kind: "boss" });
  const r = bossAttemptWindow(["ONE", "TWO", "THREE", "PENDING"], [end("ONE"), end("TWO"), end("THREE")], [
    a("ONE", 33, "won"), a("ONE", 48, "won"), a("ONE", 49, "predicted_death"), a("ONE", 49, "won", 2),
    a("TWO", 20, "predicted_death"), a("TWO", 33, "won"), a("TWO", 48, "won"), a("TWO", 49, "won")]);
  expect(r.floors[0]).toMatchObject({ won: 1, unknown: 1, pending: 1, not_reached: 1 });
  expect(r.floors[2]).toMatchObject({ won: 0, predicted_stop: 1, died: 0, unknown: 1 });
  expect(r.f49_given_f48_and_observed_arrival).toEqual({ n: 1, won: 0, pass_rate: 0 });
  expect(r.expected_effect_runs).toBe(30); expect(r.ended_runs).toBe(3);
});

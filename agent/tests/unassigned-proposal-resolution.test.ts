import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

// CMS8QL9E3C5U F19 T1 identifies the original task; no gameplay data is loaded.
it.each([
  "resolves_original_id_and_preserves_active_lease_watermark_and_reason",
  "completion_records_resolution_before_marking_done",
  "rejects_foreign_missing_or_changed_original_registration",
  "rejects_unbound_malformed_and_outside_report_without_any_append",
  "verifies_all_dispositions_before_appending_any",
  "failure_preserves_live_merge_fact_and_original_registry",
  "inflight_dispatched_waiting_cannot_reopen_verified_resolution",
  "legacy_empty_and_dispatched_strict_coverage_are_unchanged",
  "preserves_output_scope_when_markdown_has_equivalent_prose",
])("unassigned proposal: %s", (name) => {
  const result = spawnSync("python3", ["-B", "../ops/tests/test_unassigned_proposal_resolution.py",
    `Resolution.test_${name}`], { encoding: "utf8", timeout: 10_000 });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("OK");
});

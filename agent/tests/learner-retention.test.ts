import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// Give each existing case the original process deadline instead of sharing it across the suite.
const cases = [
  "test_published_source_reclaims_copies_and_restores_exact_bytes_and_branch",
  "test_numeric_uuid_scratch_reclaims_and_restores_verified_bytes",
  "test_numeric_uuid_keeps_publication_active_owner_and_path_guards",
  "test_unpublished_source_or_incomplete_check_is_retained",
  "test_failed_lost_and_active_batches_are_not_deleted",
  "test_legacy_report_does_not_abort_sweep_or_delete_its_data",
  "test_pending_report_data_does_not_consume_reclamation_limit",
  "test_original_thread_even_completed_is_protected",
  "test_learner_requests_cleanup_idempotently_and_full_admission_controls_deletion",
  "test_unfinished_or_failed_exit_never_requests_self_cleanup",
  "test_dirty_worktree_unknown_ignored_file_and_other_role_are_retained",
  "test_symlink_and_secret_named_file_are_never_read_or_deleted",
  "test_leases_capacity_and_archive_corruption_prevent_unsafe_cleanup",
  "test_report_only_reclaims_checkout_but_keeps_pending_process_data",
  "test_postmortem_requires_experience_ingestion_and_not_just_a_done_report",
] as const;

it("retains every Python archival and restoration safety case", () => {
  const source = readFileSync(new URL("../../ops/tests/test_learner_retention.py", import.meta.url), "utf8");
  expect([...source.matchAll(/^    def (test_\w+)\(self\):/gm)].map((match) => match[1]).sort()).toEqual([...cases].sort());
});

it.each(cases)("reclaims only settled learner copies: %s", (name) => {
  const result = spawnSync("python3", ["-B", "../ops/tests/test_learner_retention.py", `LearnerRetention.${name}`], {
    encoding: "utf8",
    timeout: 30_000,
  });
  expect(result.status, `${result.error ?? ""}\n${result.stderr}`).toBe(0);
}, 35_000);

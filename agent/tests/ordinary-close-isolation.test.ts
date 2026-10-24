import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

const cases = [
  "test_candidate_source_failure_does_not_poison_valid_peer",
  "test_predataset_attention_reenters_original_guards_with_failure_history",
  "test_any_dataset_side_effect_marker_prevents_attention_reentry",
  "test_postdataset_candidate_failure_is_isolated_and_never_replayed",
  "test_final_git_candidate_guard_rejects_only_its_own_private_record",
  "test_reclaimed_worktree_cannot_fall_back_to_enclosing_main_git",
];

// Each independent Git fixture keeps the original 15s budget instead of sharing it across six cases.
it.each(cases)("isolates ordinary completion with the original guards: %s", (name) => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_ordinary_close.py", `OrdinaryClose.${name}`], {
    encoding: "utf8", timeout: 15_000,
  });
  expect(result.status, result.stdout + result.stderr + String(result.error ?? "")).toBe(0);
  expect(result.stderr).toContain("Ran 1 test");
  expect(result.stderr).toContain("OK");
});

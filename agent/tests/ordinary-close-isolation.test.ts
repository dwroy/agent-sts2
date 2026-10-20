import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("isolates failed candidates and revalidates preserved preflight failures before one dataset commit", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_ordinary_close.py",
    "OrdinaryClose.test_candidate_source_failure_does_not_poison_valid_peer",
    "OrdinaryClose.test_predataset_attention_reenters_original_guards_with_failure_history",
    "OrdinaryClose.test_any_dataset_side_effect_marker_prevents_attention_reentry",
    "OrdinaryClose.test_postdataset_candidate_failure_is_isolated_and_never_replayed",
    "OrdinaryClose.test_final_git_candidate_guard_rejects_only_its_own_private_record",
    "OrdinaryClose.test_reclaimed_worktree_cannot_fall_back_to_enclosing_main_git"], {
    encoding: "utf8", timeout: 15_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 6 tests");
  expect(result.stderr).toContain("OK");
});

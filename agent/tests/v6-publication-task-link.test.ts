import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("registers exact V6 publication and study tasks while preserving evidence guards", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_learning_flow.py",
    "CodeProposals.test_publication_cli_preserves_task_identity_and_all_evidence_guards"], {
    encoding: "utf8", timeout: 15_000,
  });
  expect(result.status, JSON.stringify({ error: result.error?.message, signal: result.signal, stdout: result.stdout, stderr: result.stderr })).toBe(0);
  expect(result.stderr).toContain("Ran 1 test");
});

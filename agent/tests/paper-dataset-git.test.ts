import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("pins Git export and verification to one ref snapshot and fails the CLI on source mismatches", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "-m", "unittest", "discover", "-s", "ops/tests", "-p", "test_paper_dataset_git.py"], {
    cwd: resolve(".."), encoding: "utf8", timeout: 15_000,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", TMPDIR: process.env.TMPDIR ?? "/tmp", PYTHONDONTWRITEBYTECODE: "1" },
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 5 tests");
  expect(result.stderr).toContain("OK");
});

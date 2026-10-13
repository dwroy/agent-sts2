import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("preserves terminal exits without a durable marker and retains the existing explicit recovery hold", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_autoplay_marker_failure.py"], {
    encoding: "utf8", timeout: 15_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 3 tests");
});

import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("serializes dataset cuts and scans, publishes closed archives, and names corrupt inputs", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_paper_dataset_publication.py"], {
    encoding: "utf8", timeout: 20_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 8 tests");
});

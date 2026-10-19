import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("scans exact frozen leaves without expanding record or knowledge copies", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_record_manifest.py"], {
    encoding: "utf8", timeout: 30_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 6 tests");
}, 35_000);

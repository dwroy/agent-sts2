import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("rejects physical/Git ledger status drift atomically while preserving history and unrelated items", () => {
  const result = spawnSync("python3", ["-B", fileURLToPath(new URL("./ledger_publication_baseline_test.py", import.meta.url))], {
    encoding: "utf8", timeout: 10_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain("Ran 5 tests");
  expect(result.stderr).toMatch(/\nOK\s*$/);
});

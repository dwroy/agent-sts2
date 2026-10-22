import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("renders and follows fixed brain logs with redaction, title protection and isolated lifecycle", () => {
  const result = spawnSync("python3", ["-B", "-m", "unittest", "discover", "-s", "ops/tests", "-p", "test_brain_view.py"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)), encoding: "utf8", timeout: 20_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});

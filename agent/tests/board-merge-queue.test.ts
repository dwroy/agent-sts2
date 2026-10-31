import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("binds queue delivery, resource leases, ROOT/LIVE projections and deployment records", () => {
  const result = spawnSync("python3", ["-B", "-m", "unittest",
    "ops.tests.test_board_queue_delivery", "ops.tests.test_board_queue_resources",
    "ops.tests.test_board_queue_checks", "ops.tests.test_board_queue_records"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)), encoding: "utf8", timeout: 60_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});

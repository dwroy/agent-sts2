import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("keeps the minute dispatcher entry separate from stall and behind explicit ops activation", () => {
  const result = spawnSync("python3", ["-B", "-m", "unittest", "discover", "-s", "ops/tests", "-p", "test_agent_board_poll.py"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)), encoding: "utf8", timeout: 20_000,
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});

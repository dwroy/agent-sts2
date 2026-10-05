/** HMVJKM56S4Q8 A9 F33 T2, silent-0009: later shipping must retain earlier post-release repeats. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("historical releases preserve earlier repeats in ledger output and learning curves", () => {
  const result = spawnSync("python3", ["-B", fileURLToPath(new URL("./ledger_rerelease_test.py", import.meta.url))], { encoding: "utf8" });
  expect(result.status, result.stdout + result.stderr).toBe(0);
}, 30_000);

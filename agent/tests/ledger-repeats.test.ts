/** XYYQYBRM2A01 F33 T3, silent-0052: post-mortem time is not the mistake's occurrence time. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("late post-mortems use run start times in both ledger output and learning curves", () => {
  const result = spawnSync("python3", ["-B", fileURLToPath(new URL("./ledger_repeats_test.py", import.meta.url))], { encoding: "utf8" });
  expect(result.status, result.stdout + result.stderr).toBe(0);
}, 30_000);

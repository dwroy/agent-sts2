import { spawn } from "node:child_process";
import { expect, it } from "vitest";

it("rechecks an exact narrow publication without inventing source ancestry or rewriting failures", async () => {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_learner_cherry_pick_recheck.py"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
  expect(result.code, result.output).toBe(0);
  expect(result.output).toContain("Ran 7 tests");
  expect(result.output).toContain("OK");
});

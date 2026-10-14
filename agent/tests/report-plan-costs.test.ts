import { spawn } from "node:child_process";
import { expect, it } from "vitest";

it("includes fixed independent run-plan cost once while preserving actions, Jev totals and historical logs", async () => {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn("nice", ["-n", "19", "python3", "-B", "tests/report_plan_costs_test.py"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); });
    const timer = setTimeout(() => child.kill("SIGTERM"), 10_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, output }); });
  });
  expect(result.code, result.output).toBe(0);
  expect(result.output).toContain("Ran 2 tests");
});

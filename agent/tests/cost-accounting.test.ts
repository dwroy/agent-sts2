import { spawn } from "node:child_process";
import { expect, it } from "vitest";

it("accounts fixed component data, subset tokens, resets and cumulative events without network", async () => {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn("nice", ["-n", "19", "python3", "-B", "tests/cost_accounting_test.py"], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (data: Buffer) => { output += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { output += data.toString(); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
  expect(result.code, result.output).toBe(0);
  expect(result.output).toContain("Ran 6 tests");
}, 15_000);

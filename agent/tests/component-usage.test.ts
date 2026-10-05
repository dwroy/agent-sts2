import { spawn } from "node:child_process";
import { expect, it } from "vitest";

it("syncs component logs, derives counter deltas and refreshes paper costs on fixed fixtures", async () => {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn("nice", ["-n", "19", "../data/logdb-venv/bin/python", "-B", "tests/component_usage_test.py"],
      { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (data: Buffer) => { output += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { output += data.toString(); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
  expect(result.code, result.output).toBe(0);
  expect(result.output).toContain("Ran 9 tests");
}, 20_000);

import { spawn } from "node:child_process";
import { expect, it } from "vitest";

it.each([["test_account_drain.py", 4], ["test_llm_handoff.py", 16]])("validates drain lifecycle: %s", async (file, count) => {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn("python3", ["-B", `../ops/tests/${file}`], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (data: Buffer) => { output += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { output += data.toString(); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
  expect(result.code, result.output).toBe(0);
  expect(result.output).toContain(`Ran ${count} tests`);
});

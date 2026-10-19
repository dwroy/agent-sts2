import { spawn } from "node:child_process";
import { expect, it } from "vitest";

// This exercises several real, sequential Python/Node builder CLIs on temporary fixed logs.
it("keeps a complete exclusion manifest and all frozen-source publication guards", async () => {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn("nice", ["-n", "19", "python3", "-B", "tests/v6_learning_loop_test.py"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); });
    const timer = setTimeout(() => child.kill("SIGTERM"), 55_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, output }); });
  });
  expect(result.code, result.output).toBe(0);
  expect(result.output).toContain("Ran 12 tests");
}, 60_000);

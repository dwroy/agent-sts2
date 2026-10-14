import { spawn } from "node:child_process";
import { expect, it } from "vitest";

it("reclaims only tracked-source Python caches and retains unknown bytecode, links and active owners", async () => {
  const result = await new Promise<{ code: number | null; signal: string | null; output: string }>((resolve, reject) => {
    const child = spawn("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_python_cache_retention.py", "PythonCacheRetention"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); });
    const timer = setTimeout(() => child.kill("SIGTERM"), 30_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code, signal) => { clearTimeout(timer); resolve({ code, signal, output }); });
  });
  expect(result.code, JSON.stringify(result)).toBe(0);
  expect(result.output).toContain("Ran 3 tests");
}, 35_000);

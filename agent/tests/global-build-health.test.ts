import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("checks G2 shadow coverage, retained unknowns and real observation timing on fixed inputs", async () => {
  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn("/usr/bin/python3", ["-B", fileURLToPath(new URL("./global_build_health_test.py", import.meta.url))], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    const timer = setTimeout(() => child.kill("SIGTERM"), 14_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
  expect(result.code, result.stderr).toBe(0);
  expect(result.stdout).toBe("");
});

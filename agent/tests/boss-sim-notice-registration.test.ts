import { spawn } from "node:child_process";
import { expect, it } from "vitest";

it("binds B4 notices to original evidence, native delivery tokens and independent exact-text receipts", async () => {
  const result = await new Promise<{ code: number | null; signal: string | null; output: string }>((resolve, reject) => {
    const child = spawn("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_boss_sim_notice_registration.py", "BossSimNoticeRegistration"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); });
    const timer = setTimeout(() => child.kill("SIGTERM"), 15_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code, signal) => { clearTimeout(timer); resolve({ code, signal, output }); });
  });
  expect(result.code, JSON.stringify(result)).toBe(0);
  expect(result.output).toContain("Ran 3 tests");
}, 20_000);

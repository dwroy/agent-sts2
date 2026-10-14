import { spawn } from "node:child_process";
import { expect, it } from "vitest";

it("binds legacy continuation notices to registered parent/thread/input and preserves independent actor ACK guards", async () => {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_legacy_continuation_notice_ack.py", "LegacyContinuationNoticeAck"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); });
    const timer = setTimeout(() => child.kill("SIGTERM"), 15_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, output }); });
  });
  expect(result.code, result.output).toBe(0);
  expect(result.output).toContain("Ran 4 tests");
}, 20_000);

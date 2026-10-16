import { spawn } from "node:child_process";
import { expect, it } from "vitest";

it("accepts numeric UUID scratch identities with publication and ownership guards", async () => {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_learner_retention.py",
      "LearnerRetention.test_numeric_uuid_scratch_reclaims_and_restores_verified_bytes",
      "LearnerRetention.test_numeric_uuid_keeps_publication_active_owner_and_path_guards"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); });
    const timer = setTimeout(() => child.kill("SIGTERM"), 30_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, output }); });
  });
  expect(result.code, result.output).toBe(0);
  expect(result.output).toContain("Ran 2 tests");
}, 35_000);

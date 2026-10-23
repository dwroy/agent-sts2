import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));

it.each([
  ["python3", "knowledge/builders/test_refresh_pipeline.py", 15],
  ["python3", "knowledge/builders/test_refresh_entrypoints.py", 2],
] as const)("keeps cached statistics equivalent to full fixed evidence: %s %s", async (python, file, count) => {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn("nice", ["-n", "19", python, "-B", `${root}${file}`], {
      cwd: root, env: { ...process.env, OMP_NUM_THREADS: "1", OPENBLAS_NUM_THREADS: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (data: Buffer) => { output += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { output += data.toString(); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
  expect(result.code, result.output).toBe(0);
  expect(result.output).toContain(`Ran ${count} test`);
}, 45_000);

import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";

it("prices TypeSafe input only and reconciles all-character usage with fixed records", async () => {
  const args = ["-B", "-c", "import runpy,sys,tempfile; tempfile.tempdir=sys.argv[1]; sys.argv=['tests/jev_cost_test.py']; runpy.run_path(sys.argv[0],run_name='__main__')", tmpdir()];
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn("nice", ["-n", "19", "python3", ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (data: Buffer) => { output += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { output += data.toString(); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
  expect(result.code, result.output).toBe(0);
  expect(result.output).toContain("Ran 3 tests");
}, 15_000);

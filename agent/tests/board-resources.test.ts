import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

for (const file of ["test_release_checks.py", "test_board_resources.py", "test_launch_runtime.py"]) {
  it(`checks resource admission and exact-tree evidence: ${file}`, () => {
    const result = spawnSync("python3", [`../ops/tests/${file}`], { encoding: "utf8", timeout: 30_000 });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stderr).toMatch(/Ran [1-9]\d* tests?\b/);
    expect(result.stderr).toMatch(/\bOK\b/);
  });
}

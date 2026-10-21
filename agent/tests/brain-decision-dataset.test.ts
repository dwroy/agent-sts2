import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
it("checks five-type dataset projection, version timing and first-trajectory outcome censoring", () => {
  const script = fileURLToPath(new URL("../../knowledge/builders/tests/test_brain_decision_dataset.py", import.meta.url));
  expect(() => execFileSync("python3", ["-B", script], { encoding: "utf8", timeout: 30_000, stdio: "pipe" })).not.toThrow();
});

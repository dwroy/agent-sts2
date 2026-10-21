import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("checks offline dataset dispatch, censoring, run splits and entry leakage boundaries", () => {
  const script = fileURLToPath(new URL("../../knowledge/builders/tests/test_brain_card_distill.py", import.meta.url));
  expect(() => execFileSync("python3", ["-B", script], { encoding: "utf8", timeout: 30_000, stdio: "pipe" })).not.toThrow();
});

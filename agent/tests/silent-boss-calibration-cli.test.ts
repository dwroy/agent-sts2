/** Fixed CLI initialization order: no backtest, filesystem reads, subprocesses or API calls. */
import { afterEach, expect, it, vi } from "vitest";

const initialized = vi.hoisted(() => vi.fn());
vi.mock("../tools/boss-sim/backtest-runner.js", () => {
  initialized(process.env["CHARACTER"]);
  return {};
});

const originalArgv = process.argv;
afterEach(() => {
  process.argv = originalArgv;
  vi.unstubAllEnvs();
});

it("sets Silent before importing modules that initialize character data", async () => {
  vi.stubEnv("CHARACTER", "ironclad");
  process.argv = ["node", "backtest.ts", "--character", "silent"];
  await import("../tools/boss-sim/backtest.js");
  expect(initialized).toHaveBeenCalledWith("silent");
});

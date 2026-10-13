import { spawnSync } from "node:child_process";
import { expect, it, vi } from "vitest";

// Reproduce the old startup timeout while retaining the real Python path checks.
vi.mock("node:child_process", async (original) => ({
  ...await original<typeof import("node:child_process")>(),
  spawnSync: vi.fn(() => ({ status: null, signal: "SIGTERM", stdout: "", stderr: "",
    error: Object.assign(new Error("fixed startup timeout"), { code: "ETIMEDOUT" }) })),
}));
import "./strategy-no-change-path.test.js";

it("does not block the worker on a synchronous Python startup deadline", () => {
  expect(spawnSync).not.toHaveBeenCalled();
});

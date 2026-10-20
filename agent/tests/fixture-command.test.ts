import { expect, it, vi } from "vitest";
import { fixtureCommand, fixtureOutput } from "./fixture-command.js";

it("observes actual Node execution and Unicode output without a listening socket", () => {
  expect(fixtureOutput(process.execPath, ["-e", 'process.stdout.write("固定完成")'])).toBe("固定完成");
});

it("retains actual nonzero exits and signals even when the child prints OK", () => {
  expect(fixtureCommand("python3", ["-c", 'import sys; print("OK"); sys.exit(7)'])).toMatchObject({ status: 7, stdout: "OK\n" });
  expect(() => fixtureOutput("python3", ["-c", 'print("OK"); raise SystemExit(7)'])).toThrow("exited 7");
  expect(fixtureCommand("python3", ["-c", "import os,signal; os.kill(os.getpid(),signal.SIGTERM)"]).status).toBe(-15);
});

it("refuses zero exit without a receipt, a foreign receipt, or malformed output", () => {
  for (const stdout of ["", "{}", '{"token":"foreign","status":0,"stdout":"","stderr":""}']) {
    const launch = vi.fn(() => ({ status: 0, signal: null, stdout, stderr: "", error: Object.assign(new Error("fixed sandbox"), { code: "EPERM" }) }));
    expect(() => fixtureCommand("fixed", [], {}, launch as never)).toThrow(/receipt/);
  }
});

it("requires a matching completed receipt even after a sandbox EPERM and rejects other launch failures", () => {
  const launch = vi.fn((_command, args) => ({ status: 0, signal: null, stderr: "", error: Object.assign(new Error("fixed sandbox"), { code: "EPERM" }),
    stdout: JSON.stringify({ token: args[4], status: 0, stdout: Buffer.from("fixed completion").toString("base64"), stderr: "" }) }));
  expect(fixtureCommand("fixed", [], {}, launch as never).stdout).toBe("fixed completion");
  for (const result of [{ status: null, signal: "SIGTERM" }, { status: 1, signal: null },
    { status: 0, signal: null, error: Object.assign(new Error("fixed failure"), { code: "EIO" }) }]) {
    expect(() => fixtureCommand("fixed", [], {}, (() => result) as never)).toThrow("launcher failed");
  }
});

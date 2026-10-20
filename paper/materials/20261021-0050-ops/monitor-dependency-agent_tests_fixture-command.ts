import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

type Options = { encoding?: "utf8"; stdio?: "pipe" };
type Launch = typeof spawnSync;

/** Require a per-call receipt; sandbox status=0 alone does not prove a Node child ran. */
export function fixtureCommand(command: string, args: readonly string[], _options: Options = {}, launch: Launch = spawnSync) {
  const token = randomUUID();
  const result = launch("nice", ["-n", "19", "python3", fileURLToPath(new URL("./fixture-command.py", import.meta.url)), token, command, ...args],
    { encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0 || result.signal || (result.error && (result.error as NodeJS.ErrnoException).code !== "EPERM")) {
    throw new Error("fixed command launcher failed");
  }
  let receipt: Record<string, unknown>;
  try { receipt = JSON.parse(String(result.stdout)) as Record<string, unknown>; }
  catch { throw new Error("fixed command has no completion receipt"); }
  if (!receipt || receipt.token !== token || !Number.isSafeInteger(receipt.status)
    || typeof receipt.stdout !== "string" || typeof receipt.stderr !== "string") {
    throw new Error("invalid fixed command completion receipt");
  }
  const decode = (value: string) => {
    const bytes = Buffer.from(value, "base64");
    if (bytes.toString("base64") !== value) throw new Error("invalid fixed command output encoding");
    return bytes.toString("utf8");
  };
  return { status: receipt.status as number, stdout: decode(receipt.stdout), stderr: decode(receipt.stderr) };
}

export function fixtureOutput(command: string, args: readonly string[], options: Options = {}) {
  const result = fixtureCommand(command, args, options);
  if (result.status !== 0) throw new Error(`fixed command exited ${result.status}`);
  return result.stdout;
}

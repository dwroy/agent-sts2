import { execFile } from "node:child_process";
import { promisify } from "node:util";

type FixtureOptions = { encoding: "utf8"; timeout: number; env: NodeJS.ProcessEnv };
export type StallExecutor = (command: string, args: string[], options: FixtureOptions) =>
  Promise<{ stdout: string; stderr: string }>;

const executeFile = promisify(execFile);

/** Keep failures observable without guessing why the host delayed or terminated a child. */
export async function runStallFixture(script: string, env: NodeJS.ProcessEnv, timeout = 10_000,
  execute: StallExecutor = executeFile) {
  const started = Date.now();
  try {
    return await execute("bash", [script], { encoding: "utf8", timeout, env });
  } catch (cause) {
    const error = cause as { code?: string | number; signal?: string | null; killed?: boolean;
      stdout?: string; stderr?: string; message?: string };
    const diagnostic = { code: error.code ?? null, signal: error.signal ?? null,
      killed: error.killed ?? null, stdout: error.stdout ?? "", stderr: error.stderr ?? "",
      timeoutMs: timeout, elapsedMs: Date.now() - started };
    throw Object.assign(new Error(`stall-check subprocess failed: ${JSON.stringify(diagnostic)}; ${error.message ?? String(cause)}`,
      { cause }), diagnostic);
  }
}

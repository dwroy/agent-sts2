import { execFile } from "node:child_process";
import { promisify } from "node:util";

export type AuditExecutor = (command: string, args: string[], options: { encoding: "utf8"; timeout: number }) =>
  Promise<{ stdout: string; stderr: string }>;

/** Parse the fixed outputs once, retaining each output's independent reader invocation. */
export function auditOutputFixture(outputs: readonly string[], execute: AuditExecutor = promisify(execFile)) {
  const script = `
import importlib.util, json, sys
from unittest.mock import patch
spec = importlib.util.spec_from_file_location("audit", "../ops/ascension_audit.py")
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
results = []
for output in json.loads(sys.argv[1]):
    with patch.object(mod.Path, "read_text", return_value=output):
        results.append(mod.read_report("/fixture/report.out"))
print(json.dumps(results))
`;
  let pending: Promise<unknown[]> | null = null;
  async function load(): Promise<unknown[]> {
    const started = Date.now();
    try {
      const result = await execute("nice", ["-n", "19", "python3", "-B", "-c", script, JSON.stringify(outputs)],
        { encoding: "utf8", timeout: 5_000 });
      const values: unknown = JSON.parse(result.stdout);
      if (!Array.isArray(values) || values.length !== outputs.length) throw new Error("incomplete fixed audit output batch");
      return values;
    } catch (cause) {
      const error = cause as { code?: number | string; signal?: string | null; killed?: boolean; stdout?: string; stderr?: string };
      throw Object.assign(new Error(`audit fixture failed: ${JSON.stringify({ code: error.code ?? null,
        signal: error.signal ?? null, killed: error.killed ?? null, stdout: error.stdout ?? "", stderr: error.stderr ?? "",
        timeoutMs: 5_000, elapsedMs: Date.now() - started })}`, { cause }), { cause });
    }
  }
  return async (output: string): Promise<unknown> => {
    const index = outputs.indexOf(output);
    if (index < 0) throw new Error("unregistered fixed audit output");
    pending ??= load();
    return (await pending)[index];
  };
}

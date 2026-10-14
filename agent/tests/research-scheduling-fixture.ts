import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";

export type ResearchExecutor = (command: string, args: string[], options: { encoding: "utf8"; timeout: number }) =>
  Promise<{ stdout: string; stderr: string }>;

const source = readFileSync(new URL("../../ops/tests/test_strategy_research_scheduling.py", import.meta.url), "utf8");
export const schedulingCases = [...source.matchAll(/^    def (test_\w+)\(self\):/gm)].map((match) => match[1]!);

/** Keep every Python assertion while giving small groups independent, bounded child lifetimes. */
export function schedulingGroups(cases = schedulingCases): string[][] {
  if (!cases.length || new Set(cases).size !== cases.length) throw new Error("missing or repeated scheduling cases");
  return Array.from({ length: Math.ceil(cases.length / 3) }, (_, index) => cases.slice(index * 3, index * 3 + 3));
}

export async function runSchedulingGroup(cases: string[], execute: ResearchExecutor = promisify(execFile)) {
  const started = Date.now();
  try {
    return await execute("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_strategy_research_scheduling.py",
      ...cases.map((name) => `ResearchScheduling.${name}`)], { encoding: "utf8", timeout: 30_000 });
  } catch (cause) {
    const error = cause as { code?: number | string; signal?: string | null; killed?: boolean; stdout?: string; stderr?: string };
    throw Object.assign(new Error(`research fixture failed: ${JSON.stringify({ cases, code: error.code ?? null,
      signal: error.signal ?? null, killed: error.killed ?? null, stdout: error.stdout ?? "", stderr: error.stderr ?? "",
      timeoutMs: 30_000, elapsedMs: Date.now() - started })}`, { cause }), { cause });
  }
}

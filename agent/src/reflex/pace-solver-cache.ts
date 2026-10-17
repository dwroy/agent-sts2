/** Same-process, exact-input candidate reuse. Never assumes a hidden next hand or bypasses dispatch gates. */
import { AsyncLocalStorage } from "node:async_hooks";
import { deserialize, serialize } from "node:v8";
import { memoKey } from "../sim/compute-memo.js";
import { currentDecisionBudget } from "../core/decision-budget.js";
import type { SolverInput, SolveResult } from "./turn-solver.js";

let scope = "";
const entries = new Map<string, Buffer>();
const MAX_BYTES = 16 * 1024 * 1024;
let storedBytes = 0;
const preparing = new AsyncLocalStorage<boolean>();
export class PreparedSolverDone extends Error {
  constructor(readonly result: SolveResult, readonly reused: boolean) { super("observed candidate preparation complete"); }
}
export function setPaceSolverScope(value: string): void {
  if (scope !== value) { scope = value; entries.clear(); storedBytes = 0; }
}
function keyOf(input: SolverInput): string | null {
  try {
    const { deadline: _deadline, deadlineNow: _clock, ...semantic } = input;
    return memoKey("human-pace-solver-v1", { scope, input: semantic });
  } catch { return null; }
}
export function preparingCandidates<T>(work: () => T): T { return preparing.run(true, work); }
export function budgetedSolve(input: SolverInput, compute: () => SolveResult, onReused?: (result: SolveResult) => void): SolveResult {
  if (!currentDecisionBudget()) return compute();
  const key = keyOf(input), stored = key ? entries.get(key) : undefined;
  const result: SolveResult = stored ? deserialize(stored) : compute();
  if (stored) onReused?.(result);
  if (key && !stored) {
    const bytes = serialize(result);
    if (bytes.length <= MAX_BYTES) {
      while (entries.size && (entries.size >= 16 || storedBytes + bytes.length > MAX_BYTES)) {
        const oldest = entries.keys().next().value!;
        storedBytes -= entries.get(oldest)!.length; entries.delete(oldest);
      }
      entries.set(key, bytes); storedBytes += bytes.length;
    }
  }
  if (preparing.getStore()) throw new PreparedSolverDone(result, !!stored);
  if (stored) currentDecisionBudget()!.stages.push({ stage: "exact_observed_solver_cache", budget_ms: 0, actual_ms: 0, timed_out: false });
  return result;
}

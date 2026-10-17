/** C1: count failed attempts on the exact question, independently of elapsed computation time. */
import { randomUUID } from "node:crypto";
import { simFailurePolicy } from "../core/config.js";
import { fingerprint } from "../hand/act/gate.js";
import type { GameState } from "../hand/mod/schema.js";
import type { ScreenMemory } from "../memory/types.js";
import { memoKey } from "./compute-memo.js";

export interface SimCompletion {
  budgeted?: true;
  required: true;
  attempt_id: string;
  status: "complete" | "complete_adaptive" | "complete_budget" | "partial" | "pending" | "degraded";
  attempts: number;
  reasons: string[];
  samples: number;
  requested: number;
  failure: boolean;
  key: string | null;
}

export function beginComputation(memory: ScreenMemory, state: GameState, label: string, inputKey: string | null): SimAttempt {
  const key = inputKey === null ? null : memoKey("sim-failure-v1", {
    run: state.raw["run_id"], floor: state.run?.floor, turn: state.turn, label,
    board: fingerprint(state), inputKey,
  });
  if (!key || memory.simFailure?.key !== key) memory.simFailure = undefined;
  const policy = simFailurePolicy(String(state.run?.raw["character_id"] ?? ""));
  return new SimAttempt(memory, key, policy.enabled && (memory.simFailure?.count ?? 0) >= policy.retries);
}

export class SimAttempt {
  private readonly id = randomUUID();
  private readonly previous: { count: number; reasons: string[] };
  constructor(private readonly memory: ScreenMemory, private readonly key: string | null, readonly degraded: boolean) {
    this.previous = { count: memory.simFailure?.count ?? 0, reasons: [...(memory.simFailure?.reasons ?? [])] };
  }
  finish(samples: number, requested: number, reason?: string, adaptive = false): SimCompletion {
    const reasons = reason ? [...this.previous.reasons, reason].slice(-32) : this.previous.reasons;
    const attempts = this.previous.count + 1;
    this.memory.simFailure = reason && this.key ? { key: this.key, count: attempts, reasons } : undefined;
    return { required: true, attempt_id: this.id, status: this.degraded ? "degraded" : reason ? "pending" : adaptive ? "complete_adaptive" : "complete",
      attempts, reasons, samples, requested, failure: reason !== undefined, key: this.key };
  }
  /** A normal deadline is not a C1 engine fault and does not increment the failure streak. */
  finishBudget(samples: number, requested: number, partial: boolean): SimCompletion {
    return { ...this.finish(samples, requested), budgeted: true, status: this.degraded ? "degraded" : partial ? "partial" : "complete_budget" };
  }
}

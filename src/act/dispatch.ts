/** Dispatching one action, and classifying what went wrong when it fails (PLAN.md §8.2). */

import { ModProtocolError, ModResponseError, ModUnreachableError, type ActionRequest, type ModClient } from "../mod/client.js";
import { PayloadShapeError, type ActionResult } from "../mod/schema.js";
import { wireIntent } from "./identity.js";

export type FailureKind = "wait" | "redecide" | "fatal";

export interface FailureClassification {
  kind: FailureKind;
  detail: string;
}

export function classifyFailure(error: unknown): FailureClassification {
  if (error instanceof ModUnreachableError) return { kind: "wait", detail: error.message };
  if (error instanceof ModResponseError) {
    if (error.retryable) return { kind: "wait", detail: `${error.code}: ${error.message}` };
    return { kind: "redecide", detail: `${error.code}: ${error.message}` };
  }
  if (error instanceof ModProtocolError) return { kind: "fatal", detail: error.message };
  if (error instanceof PayloadShapeError) return { kind: "fatal", detail: error.message };
  return { kind: "fatal", detail: error instanceof Error ? error.message : String(error) };
}

/** Sends the action; the gate's `expect` stays with us (the mod gets only the action's own fields). */
export async function dispatch(client: ModClient, intent: ActionRequest): Promise<ActionResult> {
  return client.act(wireIntent(intent));
}

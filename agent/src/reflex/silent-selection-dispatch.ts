import { asRecord, str, toJsonValue, type JsonValue } from "../core/util/json.js";
import { wireIntent } from "../hand/act/identity.js";
import type { ActionRequest } from "../hand/mod/client.js";
import type { ActionResult, GameState } from "../hand/mod/schema.js";

export type SelectionDispatchReceipt =
  | { status: "not_dispatched"; reason: string }
  | { status: "returned"; result: Pick<ActionResult, "status" | "stable"> }
  | { status: "error"; kind: string };

/** 8JRE/YF0L/XP2S, silent-0079: one dispatch receipt never proves the selected turn was executed. */
export function silentSelectionDispatch(
  state: GameState, audit: JsonValue | undefined, intent: ActionRequest, receipt: SelectionDispatchReceipt,
): { selection_dispatch?: JsonValue } {
  if (str(asRecord(state.run?.raw)["character_id"]).toLowerCase() !== "silent" || state.run?.ascension !== 10 ||
    asRecord(audit)["scope"] !== "predicted_candidates") return {};
  return {
    selection_dispatch: {
      schema: 1,
      scope: "single_action_receipt",
      requested_action: toJsonValue(asRecord(audit)["requested_action"] ?? null),
      gated_action: toJsonValue(wireIntent(intent)),
      expected_identity: intent.expect ? toJsonValue(intent.expect) : null,
      dispatch_status: receipt.status,
      not_dispatched_reason: receipt.status === "not_dispatched" ? receipt.reason : null,
      returned_status: receipt.status === "returned" ? receipt.result.status : null,
      returned_stable: receipt.status === "returned" ? receipt.result.stable : null,
      error_kind: receipt.status === "error" ? receipt.kind : null,
      // Even a completed/stable response needs later state evidence; a timeout may have applied.
      state_effect_verified: false,
      whole_plan_executed: null,
      actual_turn: null,
    },
  };
}

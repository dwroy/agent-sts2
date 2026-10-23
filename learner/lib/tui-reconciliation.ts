/** Read-only native acceptance audit. This cannot authorize sending, retirement, finish or receipt repair. */
import { createHash } from "node:crypto";
import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { NativeBatch, learnerAgentName, type PromptProof, type TurnBinding } from "./herdr.js";

type Row = Parameters<NativeBatch["feed"]>[0];
interface Receipt {
  submitted?: boolean;
  cwd?: string;
  label?: string;
  pane?: string;
  agent_name?: string;
  agent_name_version?: number;
  submissions?: PromptProof[];
  bindings?: TurnBinding[];
  session?: string;
  turn?: string;
  state?: string;
  result?: { code?: number; session?: string; turn?: string };
}
const sha256 = (bytes: string | Buffer): string => createHash("sha256").update(bytes).digest("hex");

function snapshot(file: string, limit: number): Buffer {
  const fd = openSync(file, "r");
  try {
    const size = fstatSync(fd).size;
    if (size > limit) throw new Error("audit snapshot too large");
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = readSync(fd, bytes, offset, size - offset, offset);
      if (!count) break;
      offset += count;
    }
    return bytes.subarray(0, offset);
  } finally { closeSync(fd); }
}

export function reconcileTuiReceipt(receipt: Receipt, rows: Row[]) {
  const proofs = receipt.submissions;
  if (receipt.submitted !== true || !receipt.cwd || !receipt.label || !receipt.pane || !Array.isArray(proofs) || !proofs.length ||
      proofs.some((p) => !p || typeof p.marker !== "string" || !p.marker || !/^[a-f0-9]{64}$/.test(p.prompt_sha256 ?? "")) ||
      new Set(proofs.map((p) => p.marker)).size !== proofs.length) throw new Error("missing original submitted prompt proof");
  if (receipt.agent_name_version !== 1 || receipt.agent_name !== learnerAgentName(receipt.label, receipt.pane, receipt.cwd)) {
    throw new Error("original native name binding is unverified");
  }
  const native = new NativeBatch(proofs[0]!.marker);
  // Reuse the journaled hashes; plaintext prompts never need to be copied or resent by an audit.
  for (const proof of proofs) native.expectProof(proof);
  for (const row of rows) native.feed(row);
  if (native.cwd !== receipt.cwd || !native.session ||
      [receipt.session, receipt.result?.session].some((value) => value !== undefined && value !== native.session) ||
      [receipt.turn, receipt.result?.turn].some((value) => value !== undefined && value !== native.turn) ||
      (receipt.bindings ?? []).some((binding, i) => binding.turn_id !== native.bindings[i]?.turn_id ||
        binding.marker !== native.bindings[i]?.marker || binding.prompt_sha256 !== native.bindings[i]?.prompt_sha256)) {
    throw new Error("native session/cwd/turn differs from the original receipt");
  }
  return {
    schema: "learner-tui-native-reconciliation-v1",
    original_state: receipt.state, original_result_code: receipt.result?.code,
    observed: { session: native.session, cwd: native.cwd, turn: native.turn, accepted: native.accepted,
      foreign_activity: native.foreignActivity, complete: native.complete, open: native.open,
      bindings: native.bindings, native_context_version: 1, native_preludes: native.preludes },
    // An accepted native task is evidence of consumption, not authority to mutate any live control state.
    original_receipt_modified: false, prompt_send_authorized: false, retirement_authorized: false,
    finish_authorized: false, pane_pid_lease_revalidated: false,
  };
}

export function reconciliationMain(argv: string[], out: (text: string) => void = console.log, err: (text: string) => void = console.error): number {
  if (argv.length !== 4 || argv[0] !== "--receipt" || argv[2] !== "--native") {
    err("usage: reconcile-tui.ts --receipt <original-receipt.json> --native <original-rollout.jsonl>"); return 2;
  }
  try {
    const receiptBytes = snapshot(argv[1]!, 1024 * 1024);
    const nativeBytes = snapshot(argv[3]!, 64 * 1024 * 1024);
    const end = nativeBytes.lastIndexOf(10) + 1;
    const durable = nativeBytes.subarray(0, end);
    const rows = durable.toString("utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row);
    const audit = reconcileTuiReceipt(JSON.parse(receiptBytes.toString("utf8")) as Receipt, rows);
    out(JSON.stringify({ ...audit, original_receipt_sha256: sha256(receiptBytes),
      native_snapshot_sha256: sha256(durable), native_snapshot_bytes: end, trailing_partial_bytes: nativeBytes.length - end }));
    return audit.observed.accepted && !audit.observed.foreign_activity ? 0 : 75;
  } catch {
    err("native acceptance audit deferred; retain the original receipt, pane, supervisor and lease"); return 75;
  }
}

/** Read-only native acceptance audit. This cannot authorize sending, retirement, finish or receipt repair. */
import { createHash, randomUUID } from "node:crypto";
import { closeSync, fstatSync, fsyncSync, openSync, readFileSync, readSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { NativeBatch, learnerAgentName, type PromptProof, type TurnBinding } from "./herdr.js";
import { runCommand, type HerdrResult } from "../../ops/codex/herdr.js";

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
  pid?: number;
  birth?: string;
  identity?: Record<string, unknown>;
  rollout?: string;
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
      successful: native.successful(),
      bindings: native.bindings, native_context_version: 1, native_preludes: native.preludes,
      native_environment_version: 1, native_environment_updates: native.environmentUpdates },
    // An accepted native task is evidence of consumption, not authority to mutate any live control state.
    original_receipt_modified: false, prompt_send_authorized: false, retirement_authorized: false,
    finish_authorized: false, pane_pid_lease_revalidated: false,
  };
}

export function reconciliationSnapshot(receiptFile: string, nativeFile: string) {
  const receiptBytes = snapshot(receiptFile, 1024 * 1024);
  const nativeBytes = snapshot(nativeFile, 64 * 1024 * 1024);
  const end = nativeBytes.lastIndexOf(10) + 1;
  const durable = nativeBytes.subarray(0, end);
  const rows = durable.toString("utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row);
  return { ...reconcileTuiReceipt(JSON.parse(receiptBytes.toString("utf8")) as Receipt, rows),
    original_receipt_sha256: sha256(receiptBytes), native_snapshot_sha256: sha256(durable),
    native_snapshot_bytes: end, trailing_partial_bytes: nativeBytes.length - end };
}

export function reconciliationMain(argv: string[], out: (text: string) => void = console.log, err: (text: string) => void = console.error): number {
  if (argv.length !== 4 || argv[0] !== "--receipt" || argv[2] !== "--native") {
    err("usage: reconcile-tui.ts --receipt <original-receipt.json> --native <original-rollout.jsonl>"); return 2;
  }
  try {
    const audit = reconciliationSnapshot(argv[1]!, argv[3]!);
    out(JSON.stringify(audit));
    return audit.observed.accepted && !audit.observed.foreign_activity ? 0 : 75;
  } catch {
    err("native acceptance audit deferred; retain the original receipt, pane, supervisor and lease"); return 75;
  }
}

const processBirth = (pid: number): string | undefined => {
  try {
    const raw = readFileSync(`/proc/${pid}/stat`, "utf8");
    const fields = raw.slice(raw.lastIndexOf(")") + 2).trim().split(/\s+/);
    return ["Z", "X"].includes(fields[0]!) ? undefined : fields[19];
  } catch { return undefined; }
};

/** Observe a retained original process only. Never acquire control, replace a supervisor or repair its receipt. */
export async function watchReconciliationMain(argv: string[], deps: {
  h?: (args: string[]) => Promise<HerdrResult>; birth?: (pid: number) => string | undefined;
  now?: () => number; pause?: (ms: number) => Promise<void>;
  out?: (text: string) => void; err?: (text: string) => void;
} = {}): Promise<number> {
  const out = deps.out ?? console.log, err = deps.err ?? console.error;
  const allowed = ["--receipt", "--native", "--watch-state", "--batch", "--output", "--timeout-seconds"];
  const args = new Map<string, string>();
  for (let at = 0; at < argv.length; at += 2) {
    if (!allowed.includes(argv[at]!) || args.has(argv[at]!) || !argv[at + 1]) return 2;
    args.set(argv[at]!, argv[at + 1]!);
  }
  if (args.size !== allowed.length || !/^[1-9][0-9]{0,3}$/.test(args.get("--timeout-seconds")!) || Number(args.get("--timeout-seconds")) > 3600) return 2;
  const h = deps.h ?? ((command: string[]) => runCommand(process.env.HERDR_BIN || "herdr", command, 20_000));
  const birth = deps.birth ?? processBirth, now = deps.now ?? Date.now;
  const pause = deps.pause ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  const receiptFile = resolve(args.get("--receipt")!), nativeFile = resolve(args.get("--native")!);
  const stateFile = resolve(args.get("--watch-state")!), output = resolve(args.get("--output")!), batch = args.get("--batch")!;
  let ownsOutput = false;
  const publish = (value: Record<string, unknown>): void => {
    const data = JSON.stringify({ schema: "learner-tui-readonly-observation-v1", observer_pid: process.pid,
      batch, receipt: receiptFile, ...value, original_receipt_modified: false, registration_modified: false,
      prompt_send_authorized: false, finish_authorized: false, retirement_authorized: false }) + "\n";
    const target = `${output}.${randomUUID()}.tmp`;
    writeFileSync(target, data, { mode: 0o600, flag: "wx" });
    const fd = openSync(target, "r"); try { fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(target, output);
  };
  try {
    const originalBytes = snapshot(receiptFile, 1024 * 1024);
    const original = JSON.parse(originalBytes.toString("utf8")) as Receipt;
    const root = dirname(dirname(dirname(stateFile)));
    const registration = () => JSON.parse(snapshot(stateFile, 16 * 1024 * 1024).toString("utf8")).batches?.[batch];
    const row = registration();
    const label = `learner-${batch}${(row?.task ?? "postmortem") === "postmortem" ? "-postmortem" : ""}`;
    if (!row || !["running", "awaiting_review"].includes(row.state) || row.pane !== original.pane ||
        resolve(row.worktree ?? root) !== original.cwd || original.label !== label || original.state !== "needs-attention" ||
        !original.submitted || !original.bindings?.length || !original.pid || !original.birth ||
        resolve(original.rollout ?? "") !== nativeFile || original.result?.code !== 75 ||
        stateFile !== resolve(dirname(receiptFile), "../learn.json") || receiptFile !== resolve(dirname(stateFile), "learner", `${label}.tui.json`)) throw new Error("original identity unavailable");
    const registrationHash = sha256(JSON.stringify(row)), originalHash = sha256(originalBytes);
    const deadline = now() + Number(args.get("--timeout-seconds")) * 1000;
    // A distinct new artifact is required; the original receipt, output and state cannot be overwritten.
    if (!output.endsWith(".observation.json") || [receiptFile, nativeFile, stateFile].includes(output)) throw new Error("invalid observation target");
    writeFileSync(output, "{}\n", { flag: "wx", mode: 0o600 }); ownsOutput = true;
    let prefixBytes = 0, prefixHash = sha256(Buffer.alloc(0));
    for (;;) {
      if (sha256(snapshot(receiptFile, 1024 * 1024)) !== originalHash || sha256(JSON.stringify(registration())) !== registrationHash ||
          birth(original.pid) !== original.birth) throw new Error("original ownership changed");
      const bytes = snapshot(nativeFile, 64 * 1024 * 1024);
      if (bytes.length < prefixBytes || sha256(bytes.subarray(0, prefixBytes)) !== prefixHash) throw new Error("native history changed");
      const audit = reconciliationSnapshot(receiptFile, nativeFile);
      prefixBytes = bytes.length; prefixHash = sha256(bytes);
      const gotPane = await h(["pane", "get", original.pane!]);
      const pane = gotPane.result?.pane as Record<string, unknown> | undefined;
      const gotAgent = await h(["agent", "get", original.pane!]);
      const agent = gotAgent.result?.agent as Record<string, unknown> | undefined;
      const gotProcess = await h(["pane", "process-info", "--pane", original.pane!]);
      const group = gotProcess.result?.process_info as Record<string, unknown> | undefined;
      if (!gotPane.ok || !pane || ["pane_id", "tab_id", "terminal_id", "workspace_id"].some((key) => !original.identity?.[key] || pane[key] !== original.identity[key]) ||
          !gotAgent.ok || agent?.agent !== "codex" || agent.name !== original.agent_name || agent.pane_id !== original.pane || agent.foreground_cwd !== original.cwd ||
          !["working", "idle", "done"].includes(String(agent.agent_status)) || !gotProcess.ok || group?.foreground_process_group_id !== original.pid ||
          birth(original.pid) !== original.birth || sha256(snapshot(receiptFile, 1024 * 1024)) !== originalHash ||
          sha256(JSON.stringify(registration())) !== registrationHash) throw new Error("fresh identity is unverified");
      const valid = audit.observed.accepted && !audit.observed.foreign_activity;
      const latest = snapshot(nativeFile, 64 * 1024 * 1024);
      if (latest.length < prefixBytes || sha256(latest.subarray(0, prefixBytes)) !== prefixHash) throw new Error("native history changed");
      const snapshotCurrent = latest.length === audit.native_snapshot_bytes + audit.trailing_partial_bytes &&
        sha256(latest.subarray(0, audit.native_snapshot_bytes)) === audit.native_snapshot_sha256;
      const completed = valid && snapshotCurrent && audit.observed.successful && audit.trailing_partial_bytes === 0;
      const expired = now() >= deadline;
      publish({ state: !valid ? "blocked" : completed ? "completed-observed" : expired ? "timeout" : "observing",
        original_receipt_sha256: originalHash, registration_sha256: registrationHash, deadline_ms: deadline,
        pane_pid_registration_revalidated: true, native_snapshot_current: snapshotCurrent, observed_at_ms: now(), audit });
      if (!valid || (snapshotCurrent && !audit.observed.open && !completed)) return 75;
      if (completed) { out(output); return 0; }
      if (expired) return 75;
      await pause(Math.min(5000, Math.max(1, deadline - now())));
    }
  } catch {
    if (ownsOutput) {
      try { publish({ state: "identity-or-evidence-unverified", pane_pid_registration_revalidated: false }); } catch { /* Preserve original inputs when even the observer target is unavailable. */ }
    }
    err("read-only observation held; preserve original session, registration and failure receipts"); return 75;
  }
}

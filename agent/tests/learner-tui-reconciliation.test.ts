import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { learnerAgentName } from "../../learner/lib/herdr.js";
import { reconcileTuiReceipt, reconciliationMain } from "../../learner/lib/tui-reconciliation.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
function fixture() {
  const cwd = "/fixture/learner", label = "learner-20261023-032433-strategy-proposal", pane = "w1:p2";
  const marker = "[learner-batch:fixture]", prompt = `${marker}\nOriginal task`;
  const receipt = { state: "needs-attention", submitted: true, cwd, label, pane, agent_name: learnerAgentName(label, pane, cwd), agent_name_version: 1,
    submissions: [{ marker, prompt_sha256: hash(prompt) }], bindings: [], result: { code: 75 } };
  const rows = [
    { type: "session_meta", payload: { id: "session", cwd } },
    { type: "event_msg", payload: { type: "task_started", turn_id: "turn" } },
    { type: "response_item", payload: { type: "message", role: "user", content: [
      { type: "input_text", text: `# AGENTS.md instructions for ${cwd}\n\n<INSTRUCTIONS>\nFixed instructions.\n</INSTRUCTIONS>` },
      { type: "input_text", text: `<environment_context>\n  <cwd>${cwd}</cwd>\n  <shell>bash</shell>\n</environment_context>` },
    ] } },
    { type: "turn_context", payload: { turn_id: "turn", cwd } },
    { type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: prompt }] } },
  ];
  return { receipt, rows };
}

describe("read-only reconciliation of an already submitted TUI", () => {
  it("reconstructs native acceptance without rewriting old 75/bindings or authorizing lifecycle actions", () => {
    const { receipt, rows } = fixture(); const before = JSON.stringify(receipt);
    const audit = reconcileTuiReceipt(receipt, rows);
    expect(audit.observed).toMatchObject({ session: "session", cwd: receipt.cwd, turn: "turn", accepted: true, foreign_activity: false, open: true, complete: false });
    expect(audit.observed.bindings).toHaveLength(1); expect(audit.observed.native_preludes).toHaveLength(1);
    expect(audit).toMatchObject({ original_result_code: 75, original_receipt_modified: false, prompt_send_authorized: false,
      retirement_authorized: false, finish_authorized: false, pane_pid_lease_revalidated: false });
    expect(JSON.stringify(receipt)).toBe(before);
  });
  it.each(["unsubmitted", "wrong-name", "wrong-cwd", "wrong-hash", "wrong-session", "missing-proof"])("does not reconcile %s", (kind) => {
    const { receipt, rows } = fixture();
    if (kind === "unsubmitted") receipt.submitted = false;
    if (kind === "wrong-name") receipt.agent_name = "foreign";
    if (kind === "wrong-cwd") receipt.cwd = "/foreign";
    if (kind === "wrong-hash") receipt.submissions[0]!.prompt_sha256 = "0".repeat(64);
    if (kind === "wrong-session") Object.assign(receipt, { session: "foreign" });
    if (kind === "missing-proof") receipt.submissions = [];
    let accepted = false;
    try { const audit = reconcileTuiReceipt(receipt, rows); accepted = audit.observed.accepted && !audit.observed.foreign_activity; } catch { /* deferred */ }
    expect(accepted).toBe(false);
  });
  it("retains a subsequent human turn even when the initial dispatch was proved", () => {
    const { receipt, rows } = fixture();
    rows.push({ type: "event_msg", payload: { type: "task_started", turn_id: "human" } });
    const audit = reconcileTuiReceipt(receipt, rows);
    expect(audit.observed.foreign_activity).toBe(true); expect(audit.observed.accepted).toBe(false);
  });
  it("audits a bounded durable snapshot without writing either source file or treating partial rows as acceptance", () => {
    const { receipt, rows } = fixture();
    const root = mkdtempSync(join(tmpdir(), "tui-reconcile-")); roots.push(root);
    const receiptFile = join(root, "original.json"), nativeFile = join(root, "native.jsonl");
    const original = JSON.stringify(receipt), native = rows.map((r) => JSON.stringify(r) + "\n").join("") + '{"type":';
    writeFileSync(receiptFile, original); writeFileSync(nativeFile, native);
    const output: string[] = [], errors: string[] = [];
    expect(reconciliationMain(["--receipt", receiptFile, "--native", nativeFile], (s) => output.push(s), (s) => errors.push(s))).toBe(0);
    const audit = JSON.parse(output[0]!);
    expect(audit.original_receipt_sha256).toBe(hash(original)); expect(audit.trailing_partial_bytes).toBe(8);
    expect(audit.finish_authorized).toBe(false); expect(errors).toEqual([]);
    expect(readFileSync(receiptFile, "utf8")).toBe(original); expect(readFileSync(nativeFile, "utf8")).toBe(native);
  });
});

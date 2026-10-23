/** Shared native-only metadata cases; Python independently reconstructs the same proofs. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NativeBatch } from "../../learner/lib/herdr.js";
import { reconcileTuiReceipt } from "../../learner/lib/tui-reconciliation.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/learner-midnight.json", import.meta.url), "utf8"));
const clone = <T>(value: T): T => structuredClone(value);
const hash = (s: string) => createHash("sha256").update(s.replace(/\r\n/g, "\n").trimEnd()).digest("hex");
function batch(rows = clone(fixture.rows), receipt = clone(fixture.receipt)) {
  const native = new NativeBatch(receipt.submissions[0].marker);
  for (const proof of receipt.submissions) native.expectProof(proof);
  for (const row of rows) native.feed(row);
  return native;
}
function changed(changes: any[]) {
  const rows = clone(fixture.rows);
  for (const change of changes) {
    if (change.move) { const [from, to] = change.move; rows.splice(to, 0, rows.splice(from, 1)[0]); }
    else if (change.insert !== undefined) rows.splice(change.insert, 0, clone(change.value));
    else if (change.whole) rows[change.row] = clone(change.whole);
    else if (change.replace) {
      for (const part of rows[change.row].payload.content) part.text = part.text.replaceAll(...change.replace);
    } else {
      let target = rows[change.row];
      for (const key of change.path.slice(0, -1)) target = target[key];
      target[change.path.at(-1)] = clone(change.value);
    }
  }
  return rows;
}

describe("bound native environment updates", () => {
  it("accepts midnight metadata only in the original open turn and records the full unchanged policy proof", () => {
    const native = batch();
    expect(native.successful()).toBe(true); expect(native.bindings).toEqual(fixture.receipt.bindings);
    expect(native.environmentUpdates).toEqual([fixture.proof]); expect(native.preludes).toEqual(fixture.receipt.native_preludes);
  });
  it.each(fixture.cases)("rejects $name without restoring task authority", ({ changes }) => {
    const native = batch(changed(changes));
    expect(native.foreignActivity).toBe(true); expect(native.successful()).toBe(false);
    expect(native.environmentUpdates).toEqual([]);
  });
  it("allows an unchanged same-day refresh without creating another binding", () => {
    const rows = clone(fixture.rows);
    rows[6].timestamp = "2026-10-23T15:59:30.000Z";
    rows[6].payload.internal_chat_message_metadata_passthrough.create_time = Date.parse(rows[6].timestamp) / 1000 + 0.00025;
    rows[6].payload.content[0].text = rows[6].payload.content[0].text.replace("2026-10-24", "2026-10-23");
    const native = batch(rows);
    expect(native.successful()).toBe(true); expect(native.bindings).toHaveLength(1);
    expect(native.environmentUpdates[0]).toMatchObject({ current_date: "2026-10-23", sha256: hash(rows[6].payload.content[0].text) });
  });
  it("reconciles the old failure read-only and never rewrites or upgrades its authority", () => {
    const receipt = clone(fixture.receipt); delete receipt.native_environment_updates; delete receipt.native_environment_version;
    receipt.result.code = 75; const before = JSON.stringify(receipt);
    const audit = reconcileTuiReceipt(receipt, fixture.rows);
    expect(audit.observed.native_environment_updates).toEqual([fixture.proof]);
    expect(audit.observed.foreign_activity).toBe(false); expect(audit.finish_authorized).toBe(false);
    expect(audit.original_result_code).toBe(75); expect(JSON.stringify(receipt)).toBe(before);
  });
  it("rejects replaying a native metadata message id without losing the first proof", () => {
    const rows = clone(fixture.rows); rows.splice(7, 0, clone(rows[6]));
    const native = batch(rows);
    expect(native.foreignActivity).toBe(true); expect(native.successful()).toBe(false);
    expect(native.environmentUpdates).toEqual([fixture.proof]);
  });
  it("compares metadata object fields independently of JSON key order", () => {
    const rows = clone(fixture.rows);
    rows[6].payload.internal_chat_message_metadata_passthrough.content_item_metadata = [{ provenance: { hook: false, type: "harness" } }];
    expect(batch(rows).environmentUpdates).toEqual([fixture.proof]);
  });
  it("keeps the metadata proof when a later explicitly sent continuation is replayed", () => {
    const rows = clone(fixture.rows), receipt = clone(fixture.receipt);
    const prompt = "[learner-batch:retry]\nContinue the same task";
    receipt.submissions.push({ marker: "[learner-batch:retry]", prompt_sha256: hash(prompt) });
    rows.push({ type: "event_msg", payload: { type: "task_started", turn_id: "two" } },
      { type: "turn_context", payload: { ...rows[3].payload, turn_id: "two" } },
      { type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text: prompt }] } },
      { type: "event_msg", payload: { type: "task_complete", turn_id: "two", last_agent_message: "continued report" } });
    const native = batch(rows, receipt);
    expect(native.successful()).toBe(true); expect(native.bindings).toHaveLength(2);
    expect(native.environmentUpdates).toEqual([fixture.proof]);
  });
});

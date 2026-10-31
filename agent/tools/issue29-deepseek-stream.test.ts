import { test } from "node:test";
import { execFileSync } from 'node:child_process';
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from 'node:url';
import { StreamCapture, claimCall, selectSamples } from "./issue29-deepseek-stream.js";

test("SSE splits preserve UTF-8 decoded text, CRLF, heartbeats and first token timing", () => {
  const c = new StreamCapture();
  c.feed(': heartbeat\r\n\r\ndata: {"choices":[{"delta":{"role":"assistant"}}]}\r\n\r\n', 5);
  assert.equal(c.first_token_ms, null);
  const bytes = Buffer.from('data: {"choices":[{"delta":{"reasoning_content":"思考"}}]}\r\n\r\n');
  const decoder = new TextDecoder();
  for (const b of bytes) c.feed(decoder.decode(new Uint8Array([b]), { stream: true }), 10);
  c.feed(decoder.decode(), 10);
  c.feed('data: {"choices":[{"delta":{"content":"{}"}}]}\n\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"completion_tokens":5}}\n\ndata: [DONE]\n\n', 20);
  c.finish();
  assert.equal(c.reasoning, "思考"); assert.equal(c.content, "{}");
  assert.equal(c.first_token_ms, 10); assert.equal(c.first_content_ms, 20);
  assert.equal(c.usage.completion_tokens, 5);
});

test("usage-only final event and multiline JSON data are accepted", () => {
  const c = new StreamCapture();
  c.feed('data: {"choices":\ndata: [{"delta":{"content":"{}"},"finish_reason":"stop"}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":17}}\n\ndata: [DONE]\n\n', 12);
  c.finish(); assert.equal(c.usage.prompt_tokens, 17);
});

test("early disconnect is rejected even after a finish reason", () => {
  const c = new StreamCapture();
  c.feed('data: {"choices":[{"delta":{"content":"{}"},"finish_reason":"stop"}]}\n\n', 1);
  assert.throws(() => c.finish(), /IncompleteStream/);
});

test("partial trailing event and provider error cannot masquerade as successful stream", () => {
  const c = new StreamCapture(); c.feed('data: {"choices":', 1);
  assert.throws(() => c.finish(), /IncompleteSSEEvent/);
  assert.throws(() => new StreamCapture().feed('data: {"error":{"message":"secret must not be thrown"}}\n\n', 1), /^Error: ProviderStreamError$/);
});

test("persistent claims count interrupted calls and refuse the next call at limit", () => {
  const dir = mkdtempSync(join(tmpdir(), "issue29-budget-"));
  try {
    claimCall(dir, { key: "a" }, 2); claimCall(dir, { key: "b" }, 2);
    assert.throws(() => claimCall(dir, { key: "c" }, 2), /budget exhausted/);
    assert.equal(readFileSync(join(dir, "claims.jsonl"), "utf8").trim().split("\n").length, 2);
  } finally { rmSync(dir, { recursive: true }); }
});

test("frozen sample preserves all failures, disjoint unique controls and alternating order", () => {
  // Keep the original historical input available without a retained cold copy.
  const previous = execFileSync('git', ['-C', fileURLToPath(new URL('../..', import.meta.url)), 'cat-file', 'blob',
    'b84d95c5185941eec143cbcf2966d5770309cca5'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }).trim().split("\n").map(s => JSON.parse(s));
  const s = selectSamples(previous);
  assert.equal(s.length, 25); assert.equal(new Set(s.map(r => r.id)).size, 18);
  assert.equal(s.filter(r => r.cohort === "previous-timeout").length, 15);
  assert.equal(new Set(s.filter(r => r.cohort === "previous-success").map(r => r.id)).size, 10);
  assert.deepEqual(s[0].order, ["nova", "official"]); assert.deepEqual(s[1].order, ["official", "nova"]);
  assert.throws(() => selectSamples([]), /15 frozen/);
});

/** Streaming broadcast uses fixed notifications/tools and ignored temporary files only. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { BrainLiveWriter, observeBrain, safeLiveText, boundLiveText, type BrainLiveOptions, type BrainLiveEvent } from "../src/brain/live-view.js";
import { BrainRouter } from "../src/brain/router.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { KnowledgeMcp } from "../src/brain/tools/knowledge-mcp.js";
import { loadConfig } from "../src/core/config.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainAnswer, BrainRequest } from "../src/brain/types.js";

const roots: string[] = [];
const writers: BrainLiveWriter[] = [];
afterEach(async () => { for (const writer of writers.splice(0)) await writer.flush(); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture(cap?: number, options?: BrainLiveOptions) {
  const root = mkdtempSync(join(tmpdir(), "brain-live-")); roots.push(root);
  const writer = new BrainLiveWriter(root, cap, options); writers.push(writer);
  const req: BrainRequest = { label: "reward/card", system: "fixed", question: "选择固定牌。", runId: "STREAM000001", questionId: "fixed-question",
    payload: { state: { run: { floor: 9 } }, player_name: "external-fixture-person" }, options: { a: null }, spec: pickSpec("reward/card", { a: null }) };
  const file = join(root, "brain-live", req.runId!, "current.txt");
  return { root, writer, req, file };
}

it("shows model deltas and tool progress before completion, and redacts split credentials/identifiers", async () => {
  const f = fixture();
  const view = f.writer.begin(f.req, "codex", "gpt-6.1-sol", "high", false);
  view.observe({ kind: "reasoning", text: "先核固定证据。" });
  view.observe({ kind: "text", text: 'api_key="sk-fixture' });
  view.observe({ kind: "text", text: 'SecretShouldNeverAppear" external-fixture-person\n' });
  view.observe({ kind: "text", text: 'token="multiLineSecret\n' });
  view.observe({ kind: "text", text: 'StillSecret"\n' });
  view.observe({ kind: "tool-start", name: "kb_test", input: { query: "private-query", act: 1, api_key: "private" } });
  view.observe({ kind: "tool-end", name: "kb_test", output: '{"facts":["fixed"],"player_id":"external-player-42"}', ms: 12 });
  await f.writer.flush();
  const partial = readFileSync(f.file, "utf8");
  expect(partial).toContain("F9"); expect(partial).toContain("推理摘要：先核固定证据。");
  expect(partial).toContain("工具开始 kb_test"); expect(partial).toContain("12 ms");
  expect(partial).not.toContain("最终选择");
  for (const forbidden of ["fixtureSecretShouldNeverAppear", "external-fixture-person", "external-player-42", "multiLineSecret", "StillSecret"]) expect(partial).not.toContain(forbidden);
  view.finish({ choice: "a", reason: "fixed" });
  f.writer.verdict(f.req, { choice: "a", reason: "fixed" }, true, 25);
  await f.writer.flush();
  expect(readFileSync(f.file, "utf8")).toContain("最终选择与理由");
});

it("bounds long undelimited spans without writing credential prefixes and shows progress while receiving", async () => {
  const f = fixture(); const view = f.writer.begin(f.req, "deepseek", "fixed", "max", false);
  for (let i = 0; i < 100; i++) view.observe({ kind: "text", text: "fixtureOpaqueToken".repeat(50) });
  await f.writer.flush();
  expect(readFileSync(f.file, "utf8")).toContain("已收到");
  expect(readFileSync(f.file, "utf8")).not.toContain("fixtureOpaqueToken");
});

it("rolls a bounded file within one run while preserving previous output and separates the next run", async () => {
  const f = fixture(512); const view = f.writer.begin(f.req, "codex", "fixed", "high", false);
  for (let i = 0; i < 20; i++) { view.observe({ kind: "text", text: `固定分句 ${i}。` }); await f.writer.flush(); }
  expect(statSync(f.file).size).toBeLessThanOrEqual(512);
  expect(statSync(join(f.root, "brain-live", f.req.runId!, "previous.txt")).size).toBeLessThanOrEqual(512);
  f.writer.begin({ ...f.req, runId: "STREAM000002" }, "deepseek", "fixed", "max", false).finish({ choice: "a" });
  await f.writer.flush();
  expect(existsSync(f.file)).toBe(true); expect(existsSync(join(f.root, "brain-live/STREAM000002/current.txt"))).toBe(true);
});

it("keeps disk and observer failures out of answers, tool results, signals and the decision timeout", async () => {
  const f = fixture(); const blocker = join(f.root, "blocked"); writeFileSync(blocker, "file");
  const answer: BrainAnswer = { engine: "deepseek", model: "fixed", answer: { choice: "a", reason: "fixed" }, problems: [], toolCalls: [], attempts: 1, latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 } };
  let got: BrainRequest | undefined;
  const router = new BrainRouter({ config: loadConfig({ BRAIN_ENGINE: "deepseek", BRAIN_LOG: join(blocker, "brain.jsonl") }).brain,
    log: () => {}, engine: () => ({ name: "deepseek", model: "fixed", decide: async (req) => { got = req; observeBrain(req.observe, { kind: "text", text: "固定输出。" }); return answer; } }) });
  const result = await router.decide({ ...f.req, timeoutMs: 1000, observe: () => { throw new Error("viewer failed"); } });
  expect(result.answer).toEqual(answer.answer); expect(got!.timeoutMs).toBe(1000);
  const host = new ToolHost([{ name: "kb_fixed", description: "fixed", inputSchema: {}, run: () => ({ text: "fixed tool result" }) }], { ascension: 0, knowledgeDir: "", logsDir: "" }, undefined, true, () => { throw new Error("viewer failed"); });
  expect((await host.call("kb_fixed", {})).text).toBe("fixed tool result");
  expect(host.calls).toHaveLength(1);
  // Drain the router's asynchronous best-effort writer before the fixture directory is reclaimed.
  await new Promise((done) => setTimeout(done, 30));
});

it("observes MCP tool start before its return and includes errors without altering the original record", async () => {
  const seen: BrainLiveEvent[] = [];
  const mcp = new KnowledgeMcp();
  try {
    let release!: () => void; const ready = new Promise<void>((done) => { release = done; });
    const host = mcp.begin([{ name: "kb_fixed", description: "fixed", inputSchema: {}, run: async () => { await ready; throw new Error("fixed failure"); } }],
      { ascension: 0, knowledgeDir: "", logsDir: "" }, 3, Infinity, () => {}, (e) => seen.push(e));
    const running = host.call("kb_fixed", { query: "fixture" });
    expect(seen.map(e => e.kind)).toEqual(["tool-start"]);
    release(); expect((await running).isError).toBe(true);
    expect(seen.map(e => e.kind)).toEqual(["tool-start", "tool-end"]);
    expect(host.calls[0]!.output).toContain("fixed failure");
  } finally { await mcp.close(); }
});

it("never uses a run ID as a path and hides credential fragments before visible truncation", async () => {
  const f = fixture(); f.writer.begin({ ...f.req, runId: "../foreign" }, "codex", "fixed", "high", false).finish({ choice: "a" });
  await f.writer.flush(); expect(existsSync(join(f.root, "foreign"))).toBe(false);
  expect(safeLiveText('prefix api_key="sk-fixedCredentialsMustStayHidden"', 24)).not.toContain("sk-fixed");
  mkdirSync(join(f.root, "empty"));
});

it("shows the complete user message, public summary, interleaved tools, provenance and final JSON", async () => {
  const f = fixture();
  f.req.memory = { plan: "固定本局构筑记录" };
  f.req.payload = { floor: 9, projection: { expected: "固定模拟事实" } };
  f.req.options = { a: "固定选项详情" };
  const view = f.writer.begin(f.req, "codex", "fixed", "high", false);
  view.observe({ kind: "reasoning", text: "先查询固定资料" });
  view.observe({ kind: "tool-start", name: "kb_test", input: { query: "完整查询参数", filter: { act: 1 } } });
  view.observe({ kind: "tool-end", name: "kb_test", output: '{"facts":"完整返回正文"}', ms: 7,
    sources: [{ source: "fixed-evidence", version: "test-v1", sha256: "a".repeat(64) }] });
  view.observe({ kind: "reasoning", text: "据此核验选项。" });
  const answer = { choice: "a", reason: "完整理由".repeat(500), extra: { confidence: "unknown" }, key_turns: [1, 2] };
  view.finish(answer); f.writer.verdict(f.req, answer, true, 11);
  await f.writer.flush();
  const text = readFileSync(f.file, "utf8");
  for (const expected of ["固定本局构筑记录", "固定模拟事实", "固定选项详情", '"query":"完整查询参数"',
    '"filter":{"act":1}', '"facts":"完整返回正文"', "fixed-evidence", "test-v1", "a".repeat(64), JSON.stringify(answer)]) expect(text).toContain(expected);
  const ordered = ["先查询固定资料", "工具开始", "工具返回", "据此核验选项", "本次尝试答案", "最终选择与理由"];
  for (let i = 1; i < ordered.length; i++) expect(text.indexOf(ordered[i]!)).toBeGreaterThan(text.indexOf(ordered[i - 1]!));
  expect(text).not.toContain("本题无公开推理摘要");
});

it("deduplicates system previews by run and exact SHA, and explicitly marks missing public summaries", async () => {
  const f = fixture();
  f.writer.begin(f.req, "codex", "fixed", "high", false).finish({ choice: "a" });
  f.writer.begin(f.req, "codex", "fixed", "high", false).finish({ choice: "a" });
  f.writer.begin({ ...f.req, system: "changed" }, "codex", "fixed", "high", false).finish({ choice: "a" });
  await f.writer.flush();
  const text = readFileSync(f.file, "utf8");
  expect(text.match(/系统提示 · 原文/g)).toHaveLength(2);
  expect(text.match(/系统提示同上/g)).toHaveLength(1);
  expect(text.match(/本题无公开推理摘要/g)).toHaveLength(3);
  expect(text).toMatch(/原文 5 B · SHA256 [a-f0-9]{64}/);
  f.writer.begin({ ...f.req, runId: "STREAM000002" }, "codex", "fixed", "high", false).finish({ choice: "a" });
  await f.writer.flush();
  expect(readFileSync(join(f.root, "brain-live/STREAM000002/current.txt"), "utf8")).toContain("系统提示 · 原文");
});

it("bounds UTF-8 question paragraphs and both tool fields with exact omission bytes and positions", async () => {
  const f = fixture(undefined, { questionBytes: 512, toolBytes: 256 });
  f.req.payload = {};
  f.req.question = "题目开头\n\n" + "固定中文段落内容。\n\n".repeat(300) + "题目结尾";
  const view = f.writer.begin(f.req, "deepseek", "fixed", "max", false);
  view.observe({ kind: "tool-start", name: "kb_test", input: { query: "参数开头" + "中间内容，".repeat(100) + "参数结尾" } });
  view.observe({ kind: "tool-end", name: "kb_test", output: "返回开头\n" + "中间内容，\n".repeat(100) + "返回结尾", ms: 2 });
  view.finish({ choice: "a" }); await f.writer.flush();
  const text = readFileSync(f.file, "utf8");
  for (const expected of ["题目开头", "题目结尾", "参数开头", "参数结尾", "返回开头", "返回结尾", "中间省略", "脱敏全文", "保留 [0,"]) expect(text).toContain(expected);
  expect(text).not.toContain("\ufffd");
  const source = "首段\n" + "中文。\n".repeat(100) + "尾段";
  const clipped = boundLiveText(source, 256);
  expect(Buffer.byteLength(clipped)).toBeLessThanOrEqual(256);
  const parts = /^(.*?)\n\[… 中间省略 (\d+) B；脱敏全文 (\d+) B；保留 \[0, (\d+)\) 与 \[(\d+), (\d+)\) …\]\n(.*)$/s.exec(clipped)!;
  expect(Number(parts[2])).toBe(Buffer.byteLength(source) - Buffer.byteLength(parts[1]!) - Buffer.byteLength(parts[7]!));
  expect(Number(parts[4]) + Number(parts[6]) - Number(parts[5])).toBeLessThanOrEqual(256);
});

it("redacts nested and escaped sensitive fields before truncation, including identifiers echoed in final answers", async () => {
  const f = fixture(undefined, { toolBytes: 256 });
  f.req.memory = { player_id: "memory-person", note: "memory-person" };
  const view = f.writer.begin(f.req, "codex", "fixed", "high", false);
  const input = { query: "正常完整参数", nested: { api_key: 'canary \"quoted\" value', password: "canary line one\nline two" } };
  view.observe({ kind: "tool-start", name: "kb_test", input });
  view.observe({ kind: "tool-end", name: "kb_test", output: JSON.stringify({ player_id: "tool-person", source: "external:fixed", rows: [{ run_id: "external-bare-match" }], external_run_id: "external-match", facts: "tool-person external-match", padding: "固定，".repeat(100) }), ms: 1 });
  view.observe({ kind: "text", text: 'password="multi word\n' });
  view.observe({ kind: "text", text: 'continuing secret"。' });
  const answer = { choice: "a", reason: "tool-person external-match memory-person external-bare-match" };
  view.finish(answer); f.writer.verdict(f.req, answer, true, 4);
  await f.writer.flush();
  const text = readFileSync(f.file, "utf8");
  for (const forbidden of ["memory-person", "tool-person", "external-match", "external-bare-match", "canary", "quoted", "line one", "line two", "multi word", "continuing secret"]) expect(text).not.toContain(forbidden);
  expect(text).toContain("正常完整参数");
});

it("preserves compact mode's short question and parameter shapes", async () => {
  const f = fixture(undefined, { mode: "compact" });
  const view = f.writer.begin(f.req, "codex", "fixed", "high", false);
  view.observe({ kind: "tool-start", name: "kb_test", input: { query: "private-query" } });
  view.finish({ choice: "a" }); await f.writer.flush();
  const text = readFileSync(f.file, "utf8");
  expect(text).toContain("题面（截断）"); expect(text).toContain("query=文本/13字");
  expect(text).not.toContain("private-query"); expect(text).not.toContain("系统提示 · 原文");
});

it("hides multi-line quoted secrets containing apostrophes and escaped quotes across stream chunks", async () => {
  const f = fixture();
  const view = f.writer.begin(f.req, "codex", "fixed", "high", false);
  view.observe({ kind: "text", text: 'password="inline \\"canary\\" concealed"。' });
  const chunks = ['password="first canary\'s\n', 'second \\"still open', '\\" canary\n', 'last canary"。安全内容。'];
  for (const text of chunks) view.observe({ kind: "text", text });
  view.observe({ kind: "reasoning", text: " \n" });
  view.finish({ choice: "a" }); await f.writer.flush();
  const output = readFileSync(f.file, "utf8");
  for (const forbidden of ["inline", "concealed", "first", "second", "still open", "last", "canary"]) expect(output).not.toContain(forbidden);
  expect(output).toContain("安全内容");
  expect(output).toContain("本题无公开推理摘要");
});

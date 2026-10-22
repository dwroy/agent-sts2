/** Streaming broadcast uses fixed notifications/tools and ignored temporary files only. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { BrainLiveWriter, observeBrain, safeLiveText, type BrainLiveEvent } from "../src/brain/live-view.js";
import { BrainRouter } from "../src/brain/router.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { loadConfig } from "../src/core/config.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainAnswer, BrainRequest } from "../src/brain/types.js";

const roots: string[] = [];
const writers: BrainLiveWriter[] = [];
afterEach(async () => { for (const writer of writers.splice(0)) await writer.flush(); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture(cap?: number) {
  const root = mkdtempSync(join(tmpdir(), "brain-live-")); roots.push(root);
  const writer = new BrainLiveWriter(root, cap); writers.push(writer);
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
  for (const forbidden of ["fixtureSecretShouldNeverAppear", "external-fixture-person", "external-player-42", "private-query", "multiLineSecret", "StillSecret"]) expect(partial).not.toContain(forbidden);
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
  const host = new ToolHost([{ name: "kb_fixed", description: "fixed", inputSchema: {}, run: () => ({ text: "fixed tool result" }) }], { ascension: 0, knowledgeDir: "", logsDir: "" }, undefined, () => { throw new Error("viewer failed"); });
  expect((await host.call("kb_fixed", {})).text).toBe("fixed tool result");
  expect(host.calls).toHaveLength(1);
  // Drain the router's asynchronous best-effort writer before the fixture directory is reclaimed.
  await new Promise((done) => setTimeout(done, 30));
});


it("never uses a run ID as a path and hides credential fragments before visible truncation", async () => {
  const f = fixture(); f.writer.begin({ ...f.req, runId: "../foreign" }, "codex", "fixed", "high", false).finish({ choice: "a" });
  await f.writer.flush(); expect(existsSync(join(f.root, "foreign"))).toBe(false);
  expect(safeLiveText('prefix api_key="sk-fixedCredentialsMustStayHidden"', 24)).not.toContain("sk-fixed");
  mkdirSync(join(f.root, "empty"));
});

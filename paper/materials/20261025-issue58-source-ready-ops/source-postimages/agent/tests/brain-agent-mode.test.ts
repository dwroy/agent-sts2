/** Fixed knowledge/MCP/engine contracts; no model, game or external data service is called. */
import { afterEach, expect, it, vi } from "vitest";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { toolCapabilities } from "../src/brain/tools/capabilities.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { KnowledgeMcp } from "../src/brain/tools/knowledge-mcp.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { KnowledgeAgent } from "../src/brain/engines/knowledge-agent.js";
import { DshEngine, dshEntryIds, dshPatch } from "../src/brain/engines/dsh.js";
import { createBrain, createRouter } from "../src/brain/brain.js";
import { EXTERNAL_STATS_DATA_SHA256 } from "../src/brain/tools/external-stats-tools.js";
import { KNOWLEDGE_DIR } from "../src/core/paths.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { loadConfig } from "../src/core/config.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainAnswer, BrainRequest } from "../src/brain/types.js";
import type { ToolDef } from "../src/brain/tools/types.js";
import { BrainRouter } from "../src/brain/router.js";
import { DecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";

const dirs: string[] = [];
const cleanup: Array<() => Promise<void>> = [];
const temp = () => { const dir = mkdtempSync(join(tmpdir(), "brain-agent-")); dirs.push(dir); return dir; };
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); setKnowledgeCharacter(null); });
const settings = () => loadConfig({ BRAIN_ENGINE: "codex", BRAIN_LOG: "off" }).brain;
const request = (): BrainRequest => ({ label: "reward/card", system: "fixed rules", question: "choose", payload: {},
  options: { a: null, b: null }, spec: pickSpec("reward/card", { a: null, b: null }) });
const answer = (engine: "codex" | "deepseek" = "codex"): BrainAnswer => ({ engine, model: "fixed", answer: { choice: "a", reason: "fixed" }, problems: [], attempts: 1, latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [] });
const fixture: ToolDef = { name: "kb_test", description: "fixture", inputSchema: { type: "object", additionalProperties: false },
  run: () => ({ text: JSON.stringify({ entries: ["fixed"], sources: [{ source: "own", version: "fixture" }] }) }) };
const rpc = async (url: string, method: string, params = {}): Promise<any> => (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) })).json();

it("exposes only fixed knowledge selectors, keeps external provenance, and returns empty optional libraries", async () => {
  setKnowledgeCharacter("silent"); const dir = temp(); mkdirSync(join(dir, "common")); mkdirSync(join(dir, "characters/silent"), { recursive: true });
  const source = { source: "external:spire-codex", revision: "fixture", game_version: "v0.111.0", license: "fixture-license", sha256: "a".repeat(64) };
  writeFileSync(join(dir, "common/open-book.json"), JSON.stringify({ schema: "open-book-v1", sources: source, entries: [{ kind: "cards", id: "FIXTURE", name: "fixture", aliases: [], source: source.source, game_version: source.game_version, provenance: [], facts: { fixture: true } }] }));
  const ctx = { ascension: 10, knowledgeDir: dir, logsDir: "/forbidden", payload: { exact: "question state" } };
  const tools = buildKnowledgeTools(ctx), host = new ToolHost(tools, ctx);
  expect(tools.map(t => t.name)).toEqual(["kb_monster", "kb_encounter", "kb_experience", "kb_stats", "kb_old_knowledge", "kb_potion", "kb_open_book", "kb_strategies", "kb_reflex", "external_stats_card", "external_stats_skip", "external_stats_deck_size", "external_stats_encounter", "external_stats_clusters", "external_stats_cooccurrence"]);
  const result = await host.call("kb_open_book", { query: "FIXTURE", category: "cards" });
  expect(JSON.parse(result.text)).toMatchObject({ entries: [{ id: "FIXTURE", source: source.source, game_version: "v0.111.0" }], sources: [source] });
  expect(JSON.parse((await host.call("kb_open_book", { query: "FIXTURE" })).text).entries).toHaveLength(1);
  expect(host.calls[0]).toMatchObject({ sources: [source], outputBytes: Buffer.byteLength(result.text) });
  expect(JSON.parse((await host.call("kb_strategies", { query: "*" })).text).entries).toEqual([]);
  expect(JSON.parse((await host.call("external_stats_card", { id: "SNAKEBITE" })).text)).toMatchObject({ rows: [], status: "无数据", source: "external:sts2fun" });
  expect((await host.call("kb_open_book", { query: "x", path: "../../.env" })).isError).toBe(true);
  expect((await host.call("logs_query", { sql: "SELECT *" })).isError).toBe(true);
});

it("serves the same ToolDefs over MCP and turns errors and exhausted budgets into tool text", async () => {
  const mcp = new KnowledgeMcp(); cleanup.push(() => mcp.close());
  const host = mcp.begin([{ ...fixture, run: () => { throw new Error("fixture error"); } }], { ascension: 0, knowledgeDir: "", logsDir: "" }, 1, Date.now() + 1000, () => {});
  const url = await mcp.start();
  expect((await rpc(url, "tools/list")).result.tools.map((t: any) => t.name)).toEqual(["kb_test"]);
  expect((await rpc(url, "tools/call", { name: "kb_test", arguments: {} })).result).toMatchObject({ isError: true, content: [{ text: expect.stringContaining("fixture error") }] });
  expect((await rpc(url, "tools/call", { name: "kb_test", arguments: {} })).result.content[0].text).toContain("预算");
  expect(host.calls).toHaveLength(2);
  expect((await fetch(url.replace(/mcp\/.*/, "wrong"), { method: "POST" })).status).toBe(404);
});

it("records the external statistics single-source envelope without rewriting the tool output", async () => {
  const source = { source: "external:sts2fun", version: "v0.111", downloaded_at: "2026-10-21", dataset_sha256: "f".repeat(64), provenance: { license: "fixed" } };
  const text = JSON.stringify({ ...source, cohort: { runs: 1 }, limitations: ["fixture only"], rows: [] });
  const host = new ToolHost([{ ...fixture, name: "external_stats_card", run: () => ({ text }) }], { ascension: 10, knowledgeDir: "", logsDir: "" }, undefined, true);
  expect((await host.call("external_stats_card", {})).text).toBe(text);
  expect(host.calls[0]).toMatchObject({ output: text, outputBytes: Buffer.byteLength(text), sources: [source] });
});

it("mounts all six #26 tools through the same MCP and retains controller role/ascension identity", async () => {
  setKnowledgeCharacter("silent");
  const ctx = { ascension: 10, knowledgeDir: KNOWLEDGE_DIR, logsDir: "/unused" };
  const mcp = new KnowledgeMcp(); cleanup.push(() => mcp.close());
  const defs = buildKnowledgeTools(ctx);
  const host = mcp.begin(defs, ctx, 8, Infinity, () => {}), url = await mcp.start();
  const names = (await rpc(url, "tools/list")).result.tools.map((t: any) => t.name);
  expect(names.filter((n: string) => n.startsWith("external_stats_"))).toHaveLength(6);
  const valid = (await rpc(url, "tools/call", { name: "external_stats_card", arguments: { id: "SNAKEBITE", act: 1 } })).result;
  expect(valid.isError).toBe(false);
  expect(JSON.parse(valid.content[0].text)).toMatchObject({ source: "external:sts2fun", version: "v0.111", dataset_sha256: EXTERNAL_STATS_DATA_SHA256, returned_rows: 1 });
  expect(host.calls[0]).toMatchObject({ sources: [expect.objectContaining({ source: "external:sts2fun", version: "v0.111", dataset_sha256: EXTERNAL_STATS_DATA_SHA256 })] });
  setKnowledgeCharacter("ironclad");
  expect((await rpc(url, "tools/call", { name: "external_stats_card", arguments: { id: "SNAKEBITE" } })).result.isError).toBe(true);
  setKnowledgeCharacter("silent");
  mcp.begin(defs, { ...ctx, ascension: 9 }, 8, Infinity, () => {});
  expect((await rpc(url, "tools/call", { name: "external_stats_skip", arguments: {} })).result.isError).toBe(true);
});

it.each(["calls", "time"] as const)("uses the same engine and exact acquired results to answer after %s limit", async reason => {
  const cfg = settings(); cfg.agent = { ...cfg.agent, maxToolCalls: 1, codexTotalMs: 2000, codexAnswerMs: 1000 };
  let finalRequest: BrainRequest | null = null;
  const engine = new KnowledgeAgent("codex", "fixed", cfg, url => ({ name: "codex", model: "fixed", decide: async (req, signal) => {
    if (!url) { finalRequest = req; return answer(); }
    if (reason === "calls") await rpc(url, "tools/call", { name: "kb_test", arguments: {} });
    await new Promise<void>(resolve => { if (signal?.aborted) resolve(); else signal?.addEventListener("abort", () => resolve(), { once: true }); });
    throw new Error("phase cancelled");
  } })); cleanup.push(() => engine.close());
  if (reason === "time") cfg.agent.codexTotalMs = 40;
  const result = await engine.decide({ ...request(), system: "fixed rules" + toolCapabilities([fixture]), tools: [fixture], toolContext: { ascension: 0, knowledgeDir: "", logsDir: "" } });
  expect(result.answer).toMatchObject({ choice: "a" }); expect(result.agent?.fallback).toBe(reason);
  expect(finalRequest!.tools).toEqual([]);
  expect(finalRequest!.system).not.toContain(`${fixture.name} —`); expect(finalRequest!.system).toContain("知识工具已关闭");
  if (reason === "calls") { expect(finalRequest!.question).toContain("fixed"); expect(result.toolCalls).toHaveLength(1); }
});

it("honors a configured answer reserve larger than half the question budget", async () => {
  const cfg = settings(); cfg.agent.codexTotalMs = 1000; cfg.agent.codexAnswerMs = 800;
  let finalRequest: BrainRequest | null = null;
  const engine = new KnowledgeAgent("codex", "fixed", cfg, url => ({ name: "codex", model: "fixed", decide: async (req, signal) => {
    if (!url) { finalRequest = req; return answer(); }
    await new Promise<void>(resolve => signal?.addEventListener("abort", () => resolve(), { once: true }));
    throw new Error("query phase ended");
  } })); cleanup.push(() => engine.close());
  await engine.initialise();
  vi.useFakeTimers();
  try {
    const pending = engine.decide(request());
    await vi.advanceTimersByTimeAsync(199); expect(finalRequest).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).agent?.fallback).toBe("time");
    expect(finalRequest!.timeoutMs).toBe(800);
  } finally { vi.useRealTimers(); }
});

it("production removes prefixes and inline open-book/strategies while retaining state and projections", async () => {
  const cfg = loadConfig({ BRAIN_ENGINE: "codex", BRAIN_LOG: "off", KNOWLEDGE_PREFIX: "full" });
  const brain = createBrain(cfg, null);
  let seen: BrainRequest | null = null;
  brain.router.decide = async req => { seen = req; return answer(); };
  brain.setToolContext({ ascension: 10, knowledgeDir: temp(), logsDir: "/forbidden" });
  await brain.choose({ projection: { exact: 7 }, open_book: { unwanted: true }, strategy_entries: { unwanted: true } }, "choose", { a: null });
  expect(seen!.knowledge?.mode).toBe("tools"); expect(seen!.payload).toEqual({ projection: { exact: 7 } });
  expect(seen!.system).not.toContain("全量知识库"); expect(seen!.tools).toHaveLength(14);
  expect(brain.router.config.fallback).toBeNull();
  expect(createRouter(loadConfig({ BRAIN_RUN_CONFIG: '{"engine":"deepseek","effort":"max"}' }), null).engineFor("reward/card")).toBe("deepseek");
});

it("dsh patches disable every inherited plugin, select Nova credentials/max and expose only the shared MCP", () => {
  expect(dshEntryIds("- id: shell\n  name: untrusted\n- id: network\n")).toEqual(["shell", "network"]);
  expect(() => dshEntryIds("- name: implicit\n")).toThrow();
  const patches = dshPatch(["shell", "network"], "rules", "fixture-model", "max", "/sessions", "http://127.0.0.1:1/mcp");
  expect(patches.slice(0, 2)).toEqual([{ id: "shell", disabled: true }, { id: "network", disabled: true }]);
  const rows = patches[2]!.insert as any[];
  expect(rows.filter(r => /tool-(?:bash|fs|web)|subagent/.test(r.name))).toEqual([]);
  expect(rows.find(r => r.id === "sts2-provider").config).toMatchObject({ apiKeyEnv: "NOVA_DSH_API_KEY", thinking: "enabled", reasoningEffort: "max" });
  expect(rows.find(r => r.id === "sts2-knowledge").config).toMatchObject({ transport: "streamable-http", serverName: "gkb" });
});

it("runs dsh with a fresh isolated cwd, streams NDJSON and needs no direct API key", async () => {
  const dir = temp(), bin = join(dir, "dsh.mjs"), observed = join(dir, "observed.json");
  writeFileSync(bin, `#!${process.execPath}\nimport {writeFileSync,readFileSync} from 'node:fs';\nconst args=process.argv.slice(2);if(args.includes('--dump-config')){console.log('- id: inherited_shell\\n  name: shell');process.exit(0);}\nconst patch=JSON.parse(readFileSync(args[args.indexOf('--patch')+1],'utf8'));writeFileSync(${JSON.stringify(observed)},JSON.stringify({cwd:process.cwd(),patch,hasDirectKey:!!process.env.DEEPSEEK_API_KEY}));\nfor await(const _ of process.stdin){}\nconsole.log(JSON.stringify({type:'session',sessionId:'fixed-session'}));console.log(JSON.stringify({type:'sts2_stream',kind:'reasoning-delta',text:'固定流式摘要。'}));console.log(JSON.stringify({type:'status',phase:'step_end',usage:{inputTokens:4,outputTokens:2}}));console.log(JSON.stringify({type:'final',text:'{"choice":"a","reason":"fixed"}'}));\n`); chmodSync(bin, 0o755);
  const cfg = settings(); cfg.dsh.bin = bin;
  const live: unknown[] = [];
  const result = await new DshEngine(cfg).decide({ ...request(), observe: (event) => live.push(event) });
  expect(live).toContainEqual({ kind: "reasoning", text: "固定流式摘要。" });
  expect(result).toMatchObject({ engine: "deepseek", effort: "max", answer: { choice: "a" }, usage: { inputTokens: 4, outputTokens: 2 } });
  const trace = JSON.parse(readFileSync(observed, "utf8"));
  expect(trace.cwd).toMatch(/question-.+\/cwd$/); expect(trace.hasDirectKey).toBe(false);
});

it("does not renew the tool allowance when the same question recovers after an engine error", async () => {
  const cfg = settings(); cfg.agent.maxToolCalls = 1;
  let reads = 0;
  const engine = new KnowledgeAgent("codex", "fixed", cfg, url => ({ name: "codex", model: "fixed", decide: async () => {
    if (!url) return answer();
    await rpc(url, "tools/call", { name: "kb_test", arguments: {} });
    throw new Error("fixed service failure");
  } })); cleanup.push(() => engine.close());
  const req = { ...request(), questionId: "same-question", tools: [{ ...fixture, run: () => { reads += 1; return { text: "fixed evidence" }; } }], toolContext: { ascension: 0, knowledgeDir: "", logsDir: "" } };
  await expect(engine.decide(req)).rejects.toThrow("fixed service failure");
  const recovered = await engine.decide(req);
  expect(reads).toBe(1); expect(recovered.toolCalls).toHaveLength(1);
  expect(recovered.agent?.fallback).toBe("calls"); expect(recovered.answer).toMatchObject({ choice: "a" });
});

it("a previous question's delayed limit callback cannot cancel the next question", async () => {
  const cfg = settings(); cfg.agent.maxToolCalls = 1;
  let questions = 0;
  const engine = new KnowledgeAgent("codex", "fixed", cfg, url => ({ name: "codex", model: "fixed", decide: async (_req, signal) => {
    if (!url) throw new Error("unexpected final phase");
    questions += 1;
    if (questions === 1) await rpc(url, "tools/call", { name: "kb_test", arguments: {} });
    else await new Promise(resolve => setTimeout(resolve, 60));
    if (signal?.aborted) throw new Error("wrong question cancelled");
    return answer();
  } })); cleanup.push(() => engine.close());
  const req = { ...request(), tools: [fixture], toolContext: { ascension: 0, knowledgeDir: "", logsDir: "" } };
  await engine.decide({ ...req, questionId: "first" });
  expect((await engine.decide({ ...req, questionId: "second" })).agent?.fallback).toBeNull();
});

it("forwards live dsh text only to the existing parent stream observer", async () => {
  const { apply } = await import("../src/brain/engines/dsh-stream.mjs");
  let listener: (e: unknown) => void = () => {};
  const writes: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation(value => { writes.push(String(value)); return true; });
  try {
    apply({ on: (_name: string, fn: typeof listener) => { listener = fn; } });
    listener({ frame: { chunk: { type: "reasoning-delta", text: "private reasoning fixture" } } });
    expect(writes.map(s => JSON.parse(s))).toEqual([{ type: "sts2_stream", kind: "reasoning-delta", chars: 25, text: "private reasoning fixture" }]);
    expect(writes.join("")).not.toContain("tool-call-delta");
  } finally { spy.mockRestore(); }
});

it.each([["codex", "high", 300_000], ["deepseek", "max", 900_000]] as const)("freezes %s/%s with its configured L2 allowance of %d ms", async (engine, effort, total) => {
  let time = 0;
  const config = loadConfig({ BRAIN_LOG: "off", BRAIN_RUN_CONFIG: JSON.stringify({ engine, effort }) });
  const parent = new DecisionBudget("fixed-agent-L2", "routine", () => time);
  const router = new BrainRouter({ config: { ...config.brain, engine }, codexOnly: engine === "codex", knowledgeAgent: true, log: () => {},
    engine: () => ({ name: engine, model: "fixed", decide: async req => {
      expect(req.effort).toBe(effort); expect(req.timeoutMs).toBe(total);
      time += total - 1000;
      return answer(engine);
    } }) });
  const result = await withDecisionBudget(parent, () => router.decide(request()));
  expect(result.answer).toMatchObject({ choice: "a" });
  expect(parent.record().stages).toContainEqual(expect.objectContaining({ scope: "L2", budget_ms: total, timed_out: false }));
});

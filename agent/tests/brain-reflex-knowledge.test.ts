/** Synthetic reflex format fixtures; this lookup never sends entries to Jev. */
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it, vi } from "vitest";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { attachQueryGuidance, queryAudit } from "../src/brain/tools/query-guidance.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { KnowledgeMcp } from "../src/brain/tools/knowledge-mcp.js";
import { KnowledgeAgent } from "../src/brain/engines/knowledge-agent.js";
import { setKnowledgeCharacter, knowledgeFile } from "../src/knowledge/files.js";
import { reflex, vocab } from "./v6-fixtures.js";
import { loadConfig } from "../src/core/config.js";
import { pickSpec } from "../src/brain/specs.js";
import { compareBrainQueryReports } from "../tools/brain-agent-report.js";
import type { BrainAnswer, BrainRequest } from "../src/brain/types.js";
import { loadV6Knowledge } from "../src/v6/knowledge.js";
import { loadCombatEntries } from "../src/reflex/jev/combat-entries.js";
import { fixedState } from "./v6-combat-fixtures.js";
import { BrainRouter, type BrainLogRow } from "../src/brain/router.js";

const dirs: string[] = [];
const close: Array<() => Promise<void>> = [];
afterEach(async () => { for (const fn of close.splice(0)) await fn(); dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); setKnowledgeCharacter(null); vi.unstubAllEnvs(); });
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
function fixture() {
  setKnowledgeCharacter("silent");
  const dir = mkdtempSync(join(tmpdir(), "brain-rk-")); dirs.push(dir);
  const write = (name: string, value: unknown) => { const path = knowledgeFile(dir, name); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(value)); };
  const { directions: _unused, ...base } = reflex;
  const entry = { ...base, id: "real-rk-fixture", applies_to: "combat_line", scope: { character: "silent", ascensions: [10] }, confidence: .25,
    predicate: { op: "eq", field: "enemy.id", value: "FIXTURE_BOSS" }, label_en: "Reflex content fixture only" };
  const library = { schema: "reflex-file-v1", character: "silent", entries: [entry] };
  write("reflex.json", library);
  const ctx = { label: "fight-plan", ascension: 10, act: 1, knowledgeDir: dir, logsDir: "/forbidden", payload: { facts: { act: 1, act_boss: "FIXTURE_BOSS" } } };
  const host = new ToolHost(buildKnowledgeTools(ctx), ctx, undefined, true);
  const req: BrainRequest = { label: ctx.label, system: "fixed", question: "fixed", payload: ctx.payload, toolContext: ctx, tools: buildKnowledgeTools(ctx), knowledge: { mode: "tools" }, spec: pickSpec(ctx.label, { a: null }) };
  return { dir, ctx, host, write, entry, library, req };
}

it("queries actual reflex.json entries and never labels experience queries as rk", async () => {
  const { host } = fixture();
  const result = await host.call("kb_reflex", { query: "*" });
  expect(result.isError).not.toBe(true);
  expect(JSON.parse(result.text)).toMatchObject({ status: "loaded", entries: [{ id: "real-rk-fixture", confidence: .25, source_experience: ["TEST_EXPERIENCE"] }] });
  const experience = { name: "kb_experience", input: {}, output: '{"entries":[{"id":"experience-only"}]}', ms: 1 };
  expect(queryAudit([experience])).toMatchObject({ rk: { queried: false, hit_ids: [] }, experience: { queried: true, hit_ids: ["experience-only"] } });
  expect(queryAudit(host.calls).rk).toMatchObject({ queried: true, hit_ids: ["real-rk-fixture"] });
});

it("omits nonempty rk identities and query parameters while keeping the tool available", async () => {
  const { req } = fixture();
  const cue = await attachQueryGuidance(req);
  expect(cue.question).not.toContain("kb_reflex");
  expect(cue.tools!.map(t => t.name)).toContain("kb_reflex");
  expect(cue.question).not.toContain("real-rk-fixture");
  expect(cue.question).not.toContain("Reflex content fixture only");
  expect(cue.question).not.toContain('"signal"');
  expect(cue.question).not.toContain('"predicate"');
  expect(JSON.parse(cue.question.split("\n").at(-1)!)).not.toHaveProperty("rk");
});

it("keeps rk callable without cues when the optional act-threat database is malformed", async () => {
  const { req, write, host, entry } = fixture();
  write("monster-db.json", { monsters: {}, encounters: { INVALID_FIXTURE: null } });
  expect((await attachQueryGuidance(req)).question).not.toContain("real-rk-fixture");
  expect(JSON.parse((await host.call("kb_reflex", { query: "*" })).text).entries).toEqual([entry]);
});

it("retains exact file and entry versions, confidence, evidence and source-experience links without writing", async () => {
  const { ctx, host, entry, dir, library } = fixture();
  const path = knowledgeFile(dir, "reflex.json"), before = readFileSync(path, "utf8");
  const result = await host.call("kb_reflex", { query: "FIXTURE_BOSS", applies_to: "combat_line" });
  expect(JSON.parse(result.text)).toMatchObject({ entries: [entry], predicate_evaluation: "not_evaluated",
    sources: [{ source: "own", character: "silent", file: "reflex.json", version: "reflex-file-v1", sha256: sha(before) }] });
  expect(host.calls[0]).toMatchObject({ output: result.text, outputBytes: Buffer.byteLength(result.text), sources: [expect.objectContaining({ sha256: sha(before) })] });
  expect(readFileSync(path, "utf8")).toBe(before);
  // The optional audited reader is equivalent to the existing loader and never changes a consumer's defaults.
  expect(loadV6Knowledge(dir, "silent", p => readFileSync(p, "utf8"))).toEqual(loadV6Knowledge(dir, "silent"));
  expect(library.entries).toEqual([entry]); expect(ctx.ascension).toBe(10);
});

it("distinguishes missing, empty, no match, unsupported ascension and malformed reflex knowledge", async () => {
  const { host, write, dir, entry, library } = fixture();
  expect(JSON.parse((await host.call("kb_reflex", { query: "not-present" })).text)).toMatchObject({ status: "loaded", entries: [] });
  expect(JSON.parse((await host.call("kb_reflex", { query: "*", applies_to: "rest" })).text).entries).toEqual([]);
  write("reflex.json", { ...library, entries: [{ ...entry, scope: { character: "silent", ascensions: [9] } }] });
  expect(JSON.parse((await host.call("kb_reflex", { query: "*" })).text)).toMatchObject({ status: "loaded", entries: [] });
  write("reflex.json", { ...library, entries: [] });
  expect(JSON.parse((await host.call("kb_reflex", { query: "*" })).text)).toMatchObject({ status: "loaded", entries: [] });
  rmSync(knowledgeFile(dir, "reflex.json"));
  write("experience.json", { version: "fixture", entries: [{ id: "not-reflex" }] });
  writeFileSync(join(dir, "characters/silent/reflex.json"), "{");
  expect((await host.call("kb_reflex", { query: "*" })).isError).toBe(true);
  rmSync(knowledgeFile(dir, "reflex.json"));
  const missing = await host.call("kb_reflex", { query: "*" });
  expect(missing.isError).not.toBe(true); expect(JSON.parse(missing.text)).toMatchObject({ status: "missing", entries: [] });
});

it("keeps strict reference validation and includes the actual vocabulary input SHA", async () => {
  const { host, write, library, entry, dir } = fixture();
  write("reflex.json", { ...library, entries: [{ ...entry, signal: { kind: "tag", value: "TEST_TAG", unit: "label" } }] });
  expect((await host.call("kb_reflex", { query: "*" })).isError).toBe(true);
  write("reflex-vocab.json", vocab);
  const result = JSON.parse((await host.call("kb_reflex", { query: "*" })).text);
  expect(result.entries[0]).toMatchObject({ id: entry.id, signal: { kind: "tag", value: "TEST_TAG" }, confidence: .25 });
  expect(result.sources).toContainEqual(expect.objectContaining({ file: "reflex-vocab.json", sha256: sha(readFileSync(knowledgeFile(dir, "reflex-vocab.json"), "utf8")) }));
  for (const changed of [ { ...entry, directions: ["UNKNOWN_DIRECTION"] }, { ...entry, predicate: { op: "exists", field: "raw.secret" } } ]) {
    write("reflex.json", { ...library, entries: [changed] });
    const bad = await host.call("kb_reflex", { query: "*" });
    expect(bad.isError).toBe(true); expect(JSON.parse(bad.text).entries).toEqual([]);
  }
});

it("rejects cross-role headers, scopes, duplicates, traversal inputs and symlink escapes", async () => {
  const { host, write, library, entry, dir } = fixture();
  for (const value of [ { ...library, character: "ironclad" }, { ...library, entries: [{ ...entry, scope: { character: "ironclad", ascensions: [10] } }] }, { ...library, entries: [entry, entry] } ]) {
    write("reflex.json", value); expect((await host.call("kb_reflex", { query: "*" })).isError).toBe(true);
  }
  for (const input of [{ query: "*", path: "../reflex.json" }, { query: "*", character: "ironclad" }, { query: "*", applies_to: "shell" }, { query: "" }, { query: "*", write: true }]) expect((await host.call("kb_reflex", input)).isError).toBe(true);
  write("reflex.json", library);
  const foreign = join(dir, "characters/ironclad/reflex.json"); mkdirSync(dirname(foreign), { recursive: true }); writeFileSync(foreign, JSON.stringify(library));
  rmSync(knowledgeFile(dir, "reflex.json")); symlinkSync(foreign, knowledgeFile(dir, "reflex.json"));
  const escaped = JSON.parse((await host.call("kb_reflex", { query: "*" })).text);
  expect(escaped).toMatchObject({ status: "invalid", entries: [] }); expect(escaped.sources).not.toContainEqual(expect.objectContaining({ file: "reflex.json" }));
});

it("reloads changed reflex bytes and keeps all other roles' existing tool surface unchanged", async () => {
  const { ctx, host, write, entry, library } = fixture();
  const first = JSON.parse((await host.call("kb_reflex", { query: "*" })).text);
  write("reflex.json", { ...library, entries: [{ ...entry, id: "changed-reflex", version: 2, confidence: .1 }] });
  const second = JSON.parse((await host.call("kb_reflex", { query: "*" })).text);
  expect(second.entries[0]).toMatchObject({ id: "changed-reflex", version: 2, confidence: .1 });
  expect(second.sources[0].sha256).not.toBe(first.sources[0].sha256);
  for (const role of ["ironclad", "regent", "defect", "necrobinder"]) { setKnowledgeCharacter(role); expect(buildKnowledgeTools(ctx).map(t => t.name)).not.toContain("kb_reflex"); }
});

it("bounds voluntarily queried entries without adding identities or Boss query hints", async () => {
  const { req, host, write, entry, library } = fixture();
  write("reflex.json", { ...library, entries: Array.from({ length: 30 }, (_, i) => ({ ...entry, id: `reflex-${i}` })) });
  const cue = await attachQueryGuidance(req), body = JSON.parse(cue.question.split("\n").at(-1)!);
  expect(body).not.toHaveProperty("rk"); expect(cue.question).not.toContain("reflex-0");
  expect(cue.question).not.toContain("entity_queries");
  const broad = await host.call("kb_reflex", { query: "*" }); expect(Buffer.byteLength(broad.text)).toBeLessThanOrEqual(24_000);
  expect(JSON.parse(broad.text)).toMatchObject({ omitted: 18 }); expect(JSON.parse(broad.text).entries).toHaveLength(12);
});

it("serves rk through the production MCP with the same provenance and unchanged combat-off consumer", async () => {
  const { ctx, dir, entry } = fixture();
  vi.stubEnv("V6_COMBAT_ENTRIES", "off");
  const mcp = new KnowledgeMcp(); close.push(() => mcp.close());
  const host = mcp.begin(buildKnowledgeTools(ctx), ctx, 8, Infinity, () => {}), url = await mcp.start();
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "kb_reflex", arguments: { query: "*" } } }) });
  const body = await response.json() as any;
  expect(JSON.parse(body.result.content[0].text)).toMatchObject({ entries: [entry], predicate_evaluation: "not_evaluated" });
  expect(queryAudit(host.calls).rk.hit_ids).toEqual([entry.id]);
  expect(process.env["V6_COMBAT_ENTRIES"]).toBe("off"); expect(loadCombatEntries(fixedState(), dir, { V6_COMBAT_ENTRIES: "off" })).toBeNull();
});

it("uses the same engine's answer reserve after a real rk lookup consumes the call allowance", async () => {
  const { ctx, req, entry } = fixture();
  const config = loadConfig({ BRAIN_LOG: "off" }).brain; config.agent = { ...config.agent, maxToolCalls: 1, codexTotalMs: 2000, codexAnswerMs: 1000 };
  let final: BrainRequest | undefined;
  const answer: BrainAnswer = { engine: "codex", model: "fixed", answer: { choice: "a" }, problems: [], attempts: 1, toolCalls: [], latencyMs: 0, usage: { inputTokens: 1, outputTokens: 1 } };
  const engine = new KnowledgeAgent("codex", "fixed", config, url => ({ name: "codex", model: "fixed", decide: async (request, signal) => {
    if (!url) { final = request; return answer; }
    await fetch(url, { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "kb_reflex", arguments: { query: "*" } } }) });
    await new Promise<void>(resolve => { if (signal?.aborted) resolve(); else signal?.addEventListener("abort", () => resolve(), { once: true }); });
    throw new Error("query allowance exhausted");
  } })); close.push(() => engine.close());
  const result = await engine.decide({ ...await attachQueryGuidance(req), toolContext: ctx });
  expect(result.agent?.fallback).toBe("calls"); expect(final!.tools).toEqual([]); expect(final!.question).toContain(entry.id);
  expect(queryAudit(result.toolCalls).rk.hit_ids).toEqual([entry.id]);
});

it("recomputes historical rk rates only from kb_reflex and keeps experience in a separate denominator", () => {
  const before = { engine: "codex", label: "reward/card", knowledge: { mode: "tools" }, run_id: "before", tools: ["kb_experience"],
    query_audit: { rk: { queried: true, hit_ids: ["wrong-old-alias"] } }, tool_calls: [{ name: "kb_experience", output: '{"entries":[{"id":"experience-only"}]}', ms: 1 }] };
  const after = { ...before, run_id: "after", tools: ["kb_reflex", "kb_experience"], tool_calls: [{ name: "kb_reflex", output: '{"entries":[{"id":"real-rk"}]}', ms: 1 }] };
  const compared = compareBrainQueryReports([before], [after]);
  expect(compared.baseline.query_groups[0]).toMatchObject({ rk: { query_rate: 0, hit_ids: [] }, experience: { query_rate: 1 }, rk_available_questions: 0 });
  expect(compared.current.query_groups[0]).toMatchObject({ rk: { query_rate: 1, hit_ids: ["real-rk"] }, experience: { query_rate: 0 }, rk_available_questions: 1 });
  expect(compared.changes[0].rk_query_rate_delta).toBe(1);
});

it("persists actual reflex IDs and its exact sources in the brain log on success and failure", async () => {
  const { req, host, entry } = fixture();
  await host.call("kb_reflex", { query: "*" });
  const logs: BrainLogRow[] = [];
  let fail = false;
  const cfg = loadConfig({ BRAIN_LOG: "off" }).brain;
  const router = new BrainRouter({ config: { ...cfg, engine: "deepseek", fallback: null }, knowledgeAgent: true, log: row => logs.push(row),
    engine: () => ({ name: "deepseek", model: "fixed", decide: async () => {
      if (fail) throw Object.assign(new Error("fixture failure"), { brainToolCalls: host.calls });
      return { engine: "deepseek", model: "fixed", answer: { choice: "a", reason: "fixed" }, problems: [], attempts: 1, toolCalls: host.calls, latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 } };
    } }) });
  await router.decide(req); fail = true; await expect(router.decide(req)).rejects.toThrow("fixture failure");
  for (const row of logs) {
    expect(row.query_audit).toMatchObject({ schema: "brain-query-audit-v2", rk: { queried: true, hit_ids: [entry.id] }, experience: { queried: false, hit_ids: [] } });
    expect(row.tool_calls[0]).toMatchObject({ name: "kb_reflex", sources: [expect.objectContaining({ file: "reflex.json", sha256: expect.stringMatching(/^[a-f0-9]{64}$/) })] });
  }
});

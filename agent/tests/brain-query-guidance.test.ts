/** Fixed format fixtures only; no game advice, live writes, model calls or network service. */
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";
import { attachQueryGuidance, queryAudit, strategyMatches } from "../src/brain/tools/query-guidance.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { agentSystemPrompt, createBrain } from "../src/brain/brain.js";
import { BrainRouter, type BrainLogRow } from "../src/brain/router.js";
import { loadConfig } from "../src/core/config.js";
import { knowledgeFile, setKnowledgeCharacter } from "../src/knowledge/files.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainAnswer, BrainRequest } from "../src/brain/types.js";
import type { ToolContext } from "../src/brain/tools/types.js";
import { compareBrainQueryReports } from "../tools/brain-agent-report.js";

const dirs: string[] = [];
afterEach(() => { dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); setKnowledgeCharacter(null); });
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const lesson = (id: string, scope: string, extra = {}) => ({ id, scope, asc: [10, 10], name: "格式夹具标题", lesson: "RK_BODY_FIXTURE_ONLY", evidence: ["FIXTURE00001"], n_support: 1, n_contradict: 1, confidence: "low", last_seen: "2026-10-23", status: "active", ...extra });
function fixture(label = "reward/card") {
  setKnowledgeCharacter("silent");
  const dir = mkdtempSync(join(tmpdir(), "query-guidance-")); dirs.push(dir);
  const write = (name: string, value: unknown) => { const p = knowledgeFile(dir, name); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(value)); };
  write("experience.json", { version: "rk-fixture-v1", entries: [lesson("rk-card", "card:FIXTURE_CARD"), lesson("rk-boss", "boss:FIXTURE_BOSS"), lesson("rk-elite", "elite:FIXTURE_ELITE"), lesson("rk-other", "boss:OTHER_BOSS"), lesson("rk-retired", "general:deck", { status: "retired" }), lesson("rk-asc", "general:deck", { asc: [0, 9] })] });
  write("monster-db.json", { version: "monster-fixture", monsters: {}, encounters: { FIXTURE_ELITE: { acts: { "1": 1 }, rooms: { elite: 1 } } } });
  write("monster-records.json", { version: "records-fixture", encounters: {} });
  const strategy = { id: "strategy-fixture", title: "格式策略标题", version: "fixture-v1", trigger: { question_types: ["card_reward", "shop", "rest", "event", "act_plan", "fight_plan"], acts: [1], bosses: ["FIXTURE_BOSS"] }, strategy: "STRATEGY_BODY_FIXTURE_ONLY", source: "own", evidence: [{ run: "FIXTURE00001", floor: 1 }], confidence: .4 };
  write("strategy-entries.json", { schema: "brain-strategies-v1", character: "silent", entries: [strategy] });
  const payload = { facts: { act: 1, act_boss: "FIXTURE_BOSS" }, enemies: [{ enemy_id: "FIXTURE_ELITE" }] };
  const ctx: ToolContext = { label, ascension: 10, act: 1, knowledgeDir: dir, logsDir: "/forbidden", payload, options: { a: "FIXTURE_CARD", b: null } };
  const req: BrainRequest = { label, system: agentSystemPrompt(), question: "fixed question", payload, options: ctx.options, toolContext: ctx, tools: buildKnowledgeTools(ctx), spec: pickSpec(label, { a: null }), knowledge: { mode: "tools" } };
  return { dir, write, ctx, req, strategy };
}
const answer = (): BrainAnswer => ({ engine: "deepseek", model: "fixed", answer: { choice: "a", reason: "fixture" }, problems: [], attempts: 1, latencyMs: 10, usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [] });

it.each(["reward/card", "shop/plan", "rest/plan", "event/plan", "event/act-plan", "map/act-start", "fight-plan"])("%s offers optional strategy tool/input guidance and retains experience cues", async label => {
  const { req, ctx } = fixture(label), before = JSON.stringify(req.payload);
  const result = await attachQueryGuidance(req);
  const cues = JSON.parse(result.question.split("\n").at(-1)!);
  expect(cues.strategies).toMatchObject({ status: "ok", count: 1, tool: "kb_strategies", input: { query: "*", limit: 3 } }); expect(cues).not.toHaveProperty("rk");
  expect(result.question).toContain("本题有 1 条相关策略/剧本可查。");
  expect(result.question).not.toMatch(/kb_reflex|策略\/rk|构筑rk|备战rk/);
  expect(result.question).toContain("只按非空线索及需要查询");
  expect(result.system).toContain("kb_strategies"); expect(result.system).toContain("kb_reflex");
  expect(result.system).not.toContain("查相关策略与 rk 后");
  expect(result.tools!.map(t => t.name)).toEqual(expect.arrayContaining(["kb_strategies", "kb_reflex"]));
  expect(result.question).toContain('"relevant":true');
  expect(result.question).not.toContain("strategy-fixture"); expect(result.question).not.toContain("格式策略标题");
  expect(result.question).toContain("rk-boss");
  expect(result.question).not.toContain("STRATEGY_BODY"); expect(result.question).not.toContain("RK_BODY");
  expect(result.question).not.toContain("rk-retired"); expect(result.question).not.toContain("rk-asc"); expect(result.question).not.toContain("rk-other");
  expect(result.payload).toBe(req.payload); expect(JSON.stringify(req.payload)).toBe(before);
  const host = new ToolHost(buildKnowledgeTools(ctx), ctx, undefined, true);
  const strategies = JSON.parse((await host.call("kb_strategies", { query: "*" })).text);
  const rk = JSON.parse((await host.call("kb_experience", { relevant: true })).text);
  expect(strategies.entries.map((e: any) => e.id)).toEqual(["strategy-fixture"]);
  expect(rk.entries.map((e: any) => e.id)).toContain("rk-boss");
  expect(rk.entries[0]).toMatchObject({ confidence: "low", n_support: 1, n_contradict: 1, evidence: ["FIXTURE00001"] });
  expect(rk.sources).toContainEqual(expect.objectContaining({ file: "experience.json", version: "rk-fixture-v1", sha256: hash(readFileSync(knowledgeFile(ctx.knowledgeDir, "experience.json"), "utf8")) }));
  expect(queryAudit(host.calls)).toMatchObject({ strategies: { queried: true, hit_ids: ["strategy-fixture"] }, experience: { queried: true, hit_ids: expect.arrayContaining(["rk-boss"]) }, rk: { queried: false, hit_ids: [] } });
});

it("keeps Ironclad and non-target/legacy requests unchanged", async () => {
  const { req } = fixture("combat/plan"); expect(await attachQueryGuidance(req)).toBe(req);
  expect(await attachQueryGuidance({ ...req, label: "reward/card", knowledge: { mode: "off" } })).toMatchObject({ question: req.question });
  setKnowledgeCharacter("ironclad");
  const before = agentSystemPrompt(); expect(before).not.toContain("rk");
  expect(await attachQueryGuidance({ ...req, label: "reward/card" })).toMatchObject({ question: req.question });
  expect(buildKnowledgeTools(req.toolContext!).find(t => t.name === "kb_experience")!.inputSchema.properties).not.toHaveProperty("relevant");
});

it("keeps tools read-only, reflects library changes and fails closed on bad libraries", async () => {
  const { req, ctx, write, strategy } = fixture();
  const initial = readFileSync(knowledgeFile(ctx.knowledgeDir, "experience.json"), "utf8");
  const host = new ToolHost(buildKnowledgeTools(ctx), ctx, undefined, true);
  expect((await host.call("kb_experience", { relevant: true, path: "../../.env" })).isError).toBe(true);
  expect((await host.call("kb_strategies", { query: "*", write: true })).isError).toBe(true);
  await host.call("kb_experience", { relevant: true });
  expect(readFileSync(knowledgeFile(ctx.knowledgeDir, "experience.json"), "utf8")).toBe(initial);
  write("strategy-entries.json", { schema: "brain-strategies-v1", character: "silent", entries: [] });
  expect(strategyMatches(ctx).entries).toEqual([]); expect((await attachQueryGuidance(req)).question).not.toContain('"strategies"');
  write("strategy-entries.json", { schema: "brain-strategies-v1", character: "silent", entries: [{ ...strategy, confidence: 2 }] });
  expect(strategyMatches(ctx)).toMatchObject({ status: "invalid", entries: [] });
  expect((await attachQueryGuidance(req)).question).not.toContain('"strategies"');
  rmSync(knowledgeFile(ctx.knowledgeDir, "strategy-entries.json"));
  expect(strategyMatches(ctx).status).toBe("missing");
});

it("uses the live act/boss fallback for voluntary fight-plan queries while preserving explicit question facts", async () => {
  const { ctx, req } = fixture("fight-plan");
  const live = { ...ctx, payload: { enemies: [{ enemy_id: "FIXTURE_ELITE" }] }, state: { run: { act_id: 0, boss_id: "FIXTURE_BOSS" } } };
  expect(strategyMatches(live).entries).toHaveLength(1);
  expect((await attachQueryGuidance({ ...req, payload: live.payload, toolContext: live })).question).not.toContain("strategy-fixture");
  expect(strategyMatches({ ...live, payload: { facts: { act_boss: "OTHER_BOSS" } } }).entries).toEqual([]);
});

it("bounds cue identities, returns full ids in queries and permits a narrower id lookup", async () => {
  const { req, ctx, write } = fixture();
  write("experience.json", { version: "many", entries: Array.from({ length: 30 }, (_, i) => lesson(`rk-${String(i).padStart(2, "0")}`, "general:deck")) });
  const clue = await attachQueryGuidance(req);
  expect(clue.question).toContain('"count":30'); expect(clue.question).toContain('"omitted":24');
  const host = new ToolHost(buildKnowledgeTools(ctx), ctx);
  const broad = JSON.parse((await host.call("kb_experience", { relevant: true })).text);
  expect(broad.entries).toHaveLength(12); expect(broad.omitted).toBe(18);
  const narrow = JSON.parse((await host.call("kb_experience", { id: "rk-29" })).text);
  expect(narrow.entries.map((e: any) => e.id)).toEqual(["rk-29"]);
});

it("retains public lesson conditions and source roles without reading another character's private file", async () => {
  const { ctx, write } = fixture();
  const path = join(ctx.knowledgeDir, "characters/ironclad/experience.json"); mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ entries: [lesson("foreign-private", "boss:FIXTURE_BOSS")] }));
  write("shared-experience.json", { version: "shared-fixture", entries: [lesson("common-rk-fixture", "boss:FIXTURE_BOSS", {
    shared: { independent_of_character: true, reason: "格式通用性夹具", conditions: "格式条件夹具", sources: [{ character: "ironclad", run_id: "FIXTURE00001", experience_id: "original-fixture", evidence_path: "fixed/fixture.json", evidence_sha256: "a".repeat(64) }] }
  })] });
  const host = new ToolHost(buildKnowledgeTools(ctx), ctx, undefined, true);
  const result = JSON.parse((await host.call("kb_experience", { relevant: true })).text);
  expect(result.entries.map((e: any) => e.id)).not.toContain("foreign-private");
  expect(result.entries.find((e: any) => e.id === "common-rk-fixture").shared).toMatchObject({ conditions: "格式条件夹具", sources: [{ character: "ironclad", experience_id: "original-fixture" }] });
  expect(result.sources).toContainEqual(expect.objectContaining({ file: "shared-experience.json", version: "shared-fixture", sha256: expect.stringMatching(/^[a-f0-9]{64}$/) }));
});

it("projects oversized strategy provenance and retrieves every original evidence byte explicitly", async () => {
  const { ctx, write, strategy } = fixture();
  const original = { ...strategy, evidence: [{ run: "FIXTURE00001", floor: 1, ref: "fixed".repeat(6000) }] };
  write("strategy-entries.json", { schema: "brain-strategies-v1", character: "silent", entries: [original] });
  const host = new ToolHost(buildKnowledgeTools(ctx), ctx);
  const result = await host.call("kb_strategies", { query: "*" });
  expect(result.isError).not.toBe(true); expect(Buffer.byteLength(result.text)).toBeLessThanOrEqual(24_000);
  expect(JSON.parse(result.text)).toMatchObject({ returned: 1, entries: [{ id: original.id, trigger: original.trigger,
    strategy: original.strategy, confidence: original.confidence, truncated: true }] });
  let offset: number | null = 0, text = "";
  do {
    const page = await host.call("kb_strategies", { query: "*", detail: "full", document_id: original.id, document_offset: offset });
    expect(page.isError).not.toBe(true); expect(Buffer.byteLength(page.text)).toBeLessThanOrEqual(24_000);
    const parsed = JSON.parse(page.text); text += parsed.json_fragment; offset = parsed.next_document_offset;
  } while (offset !== null);
  expect(JSON.parse(text)).toEqual(original);
});

it("routes production guidance and records actual query identities in brain logs", async () => {
  const { ctx, req } = fixture();
  const brain = createBrain(loadConfig({ BRAIN_LOG: "off" }), null); brain.setToolContext(ctx);
  let seen: BrainRequest | undefined;
  brain.router.decide = async r => { seen = r; return answer(); };
  await brain.choose(req.payload as any, "fixed question", { a: "FIXTURE_CARD" }, { label: "reward/card" });
  expect(seen!.question).toContain("brain-query-cues-v3");
  const host = new ToolHost(buildKnowledgeTools(ctx), ctx, undefined, true);
  await host.call("kb_strategies", { query: "*" }); await host.call("kb_experience", { relevant: true });
  const logs: BrainLogRow[] = [];
  const router = new BrainRouter({ config: { ...loadConfig({ BRAIN_LOG: "off" }).brain, engine: "deepseek", fallback: null }, knowledgeAgent: true,
    log: r => logs.push(r), engine: () => ({ name: "deepseek", model: "fixed", decide: async () => ({ ...answer(), toolCalls: host.calls }) }) });
  await router.decide(req);
  expect(logs[0]!.query_audit).toMatchObject({ strategies: { queried: true, hit_ids: ["strategy-fixture"] }, experience: { queried: true, hit_ids: expect.arrayContaining(["rk-card"]) }, rk: { queried: false, hit_ids: [] } });
  const failed = new BrainRouter({ config: { ...loadConfig({ BRAIN_LOG: "off" }).brain, engine: "deepseek", fallback: null }, knowledgeAgent: true,
    log: r => logs.push(r), engine: () => ({ name: "deepseek", model: "fixed", decide: async () => { throw Object.assign(new Error("fixture transport failure"), { brainToolCalls: host.calls }); } }) });
  await expect(failed.decide(req)).rejects.toThrow("fixture transport failure");
  expect(logs.at(-1)!.query_audit).toEqual(logs[0]!.query_audit);
});

it("separates calls, errors, empty results and identities from tool-looking prose", () => {
  const call = (output: string, isError = false) => ({ name: "kb_experience", input: {}, output, ms: 1, isError });
  const audit = queryAudit([call('{"entries":[{"id":"one"}]}'), call('{"entries":[]}'), call('{"entries":[{"id":"error-id"}]}', true), call('kb_strategies {"id":"prose"}')]);
  expect(audit).toEqual({ schema: "brain-query-audit-v2", rk: { queried: false, calls: 0, hit_calls: 0, unknown_hit_calls: 0, hit_ids: [] }, strategies: { queried: false, calls: 0, hit_calls: 0, unknown_hit_calls: 0, hit_ids: [] }, experience: { queried: true, calls: 4, hit_calls: 1, unknown_hit_calls: 1, hit_ids: ["one"] } });
});

it("compares natural before/after cohorts by engine and disjoint question type without inventing missing cells", () => {
  const row = { engine: "codex", label: "event/act-plan", payload: {}, run_id: "before", question_id: "one", knowledge: { mode: "tools" }, tool_calls: [], latency_ms: 100 };
  const compared = compareBrainQueryReports([row], [{ ...row, run_id: "after", latency_ms: 200, tool_calls: [{ name: "kb_strategies", output: '{"entries":[{"id":"fixture"}]}', ms: 1 }] }]);
  expect(compared.baseline_matches_18_runs).toBe(false);
  expect(compared.current.query_groups[0]).toMatchObject({ question_type: "act_plan", questions: 1, strategies: { query_rate: 1, hit_rate: 1 }, rk: { query_rate: 0, hit_rate: null } });
  expect(compared.changes[0]).toMatchObject({ strategies_query_rate_delta: 1, calls_mean_delta: 1, latency_ms_mean_delta: 100 });
  expect(compareBrainQueryReports([], [row]).changes[0]!.latency_ms_mean_delta).toBeNull();
});

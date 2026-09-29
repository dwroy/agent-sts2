/**
 * V4 brain with KNOWLEDGE_PREFIX (src/brain/knowledge.ts): the full-knowledge system prompt (rules + the whole
 * knowledge base, the guide and handbook not appended again, the memory's experience lessons not sent), the same
 * system for every engine, rendered once while the data holds; KNOWLEDGE_PREFIX=off keeps v3's bytes; the Claude
 * engine's call budget (BRAIN_CLAUDE_MAX_CALLS) is its own. Fixed data (tests/gkb-data), no model is called.
 */
import { chmodSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { Brain, createBrain } from "../src/brain/brain.js";
import { FULL_KNOWLEDGE_NOTE, KnowledgePrompt, fullSystemPrompt, memoryWithoutLessons, sliceWithoutLessons } from "../src/brain/knowledge.js";
import { BrainRouter, type BrainLogRow } from "../src/brain/router.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainAnswer, BrainEngine, BrainRequest, EngineName } from "../src/brain/types.js";
import { DEFAULT_CLAUDE_MAX_CALLS, loadConfig } from "../src/config.js";
import { SLICE_LESSONS_HEADING, SLICE_STATS_HEADING } from "../src/knowledge/experience.js";
import { loadKnowledgeData, loadPostmortems } from "../src/knowledge/render/data.js";
import { queryOldKnowledge } from "../src/knowledge/render/old-knowledge.js";
import { renderKnowledgePrefix } from "../src/knowledge/render/knowledge-prefix.js";
import { DeepSeekClient, SYSTEM } from "../src/llm/deepseek.js";
import type { JsonValue } from "../src/util/json.js";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "gkb-data");
const KNOWLEDGE = join(DATA, "knowledge");
const LESSONS = join(DATA, "lessons.md");
const GUIDE = join(KNOWLEDGE, "ironclad-guide.md");
const HANDBOOK = join(KNOWLEDGE, "ds-handbook.md");

let savedLessons: string | undefined;
const temps: string[] = [];
beforeAll(() => {
  savedLessons = process.env["KNOWLEDGE_LESSONS_FILE"];
  process.env["KNOWLEDGE_LESSONS_FILE"] = LESSONS;
});
afterAll(() => {
  if (savedLessons === undefined) delete process.env["KNOWLEDGE_LESSONS_FILE"];
  else process.env["KNOWLEDGE_LESSONS_FILE"] = savedLessons;
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

function temp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

/* ---- a fake chat-completions endpoint: request bodies kept verbatim --------------------------------------- */

const realFetch = globalThis.fetch;
let bodies: string[] = [];
let content = '{"choice": "card0", "reason": "block"}';

beforeEach(() => {
  bodies = [];
  content = '{"choice": "card0", "reason": "block"}';
  globalThis.fetch = (async (_url: unknown, init?: { body?: unknown }) => {
    bodies.push(String(init?.body));
    return new Response(JSON.stringify({ choices: [{ message: { content, reasoning_content: "Decision: card0." }, finish_reason: "stop" }], usage: { prompt_tokens: 1000, completion_tokens: 50, prompt_cache_hit_tokens: 900 } }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

function client(): DeepSeekClient {
  return new DeepSeekClient({ apiKey: "k-test", baseUrl: "http://deepseek.invalid", model: "deepseek-flash", timeoutMs: 5000, guideFile: GUIDE, handbookFile: HANDBOOK, reasoningEffort: "max" });
}

function brainOf(env: Record<string, string>, ds = client()): { brain: Brain; log: string } {
  const log = join(temp("brain-kn-log-"), "brain.jsonl");
  return { brain: createBrain(loadConfig({ BRAIN_LOG: log, ...env } as unknown as NodeJS.ProcessEnv), ds), log };
}

const rows = (log: string): Record<string, unknown>[] => readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>);
const sent = (index = 0): { system: string; user: Record<string, unknown> } => {
  const body = JSON.parse(bodies[index]!) as { messages: { role: string; content: string }[] };
  return { system: body.messages[0]!.content, user: JSON.parse(body.messages[1]!.content) as Record<string, unknown> };
};

// The knowledge slice as run-journal renders it: lessons, then outcome statistics for what is offered.
const LESSON = "- [card:INFLAME | 置信高 n=9] 燃烧早拿。";
const STAT = "卡 燃烧(INFLAME) 第1幕: 拿了 n=12 均终层20 过本幕boss 70% | 给了没拿 无记录";
const slice = `${SLICE_LESSONS_HEADING}\n${LESSON}\n${SLICE_STATS_HEADING}\n${STAT}`;
const memory: Record<string, JsonValue> = { act: "第1幕 boss: 巨兽", history: "F1 拿了 挑衅", this_floor: "", route: "r0", lookahead: "boss 巨兽", knowledge: slice };
const state: Record<string, JsonValue> = { screen: "REWARD", facts: { deck: ["STRIKE", "DEFEND"], hp: "50/80" } };
const criteria: Record<string, string | null> = { card0: JSON.stringify({ card: "燃烧" }), skip: JSON.stringify({ option: "skip" }) };
const ctx = { ascension: 9, knowledgeDir: KNOWLEDGE, logsDir: "/nonexistent" };

describe("the knowledge slice without its lessons", () => {
  it("keeps the outcome statistics, drops a lessons-only slice, leaves anything else alone", () => {
    expect(sliceWithoutLessons(slice)).toBe(`${SLICE_STATS_HEADING}\n${STAT}`);
    expect(sliceWithoutLessons(`${SLICE_LESSONS_HEADING}\n${LESSON}`)).toBeNull();
    expect(sliceWithoutLessons(`${SLICE_STATS_HEADING}\n${STAT}`)).toBe(`${SLICE_STATS_HEADING}\n${STAT}`);
    expect(sliceWithoutLessons("自由文本")).toBe("自由文本");
    const lessonsOnly = memoryWithoutLessons({ act: "a", knowledge: `${SLICE_LESSONS_HEADING}\n${LESSON}` });
    expect(lessonsOnly).toEqual({ act: "a" });
    // Section order is kept (the prefix caches depend on it).
    expect(Object.keys(memoryWithoutLessons(memory))).toEqual(Object.keys(memory));
    expect(memoryWithoutLessons("a string memory")).toBe("a string memory");
  });
});

describe("KNOWLEDGE_PREFIX=full", () => {
  it("system = v3's rules + the data-wins note + the whole prefix; guide and handbook once; memory without lessons", async () => {
    const { brain, log } = brainOf({ KNOWLEDGE_PREFIX: "full" });
    brain.setToolContext(ctx);
    await brain.choose(state, "Pick a card.", criteria, { label: "reward/card", memory: { ...memory } });
    const { system, user } = sent();
    const prefix = renderKnowledgePrefix({ ascension: 9, knowledgeDir: KNOWLEDGE }, loadPostmortems(LESSONS));
    expect(system).toBe(fullSystemPrompt(prefix));
    expect(system.startsWith(`${SYSTEM}\n\n${FULL_KNOWLEDGE_NOTE}\n\n# 知识库（本局进阶 A9）`)).toBe(true);
    expect(system).toContain("和数据冲突时以数据为准");
    // The guide and handbook are in the prefix's old-knowledge block only: v3's appended copies are gone.
    expect(system.split("删打击。").length - 1).toBe(1);
    expect(system.split("连续三场战斗的路线不走。").length - 1).toBe(1);
    expect(system).not.toContain("# Ironclad strategy guide");
    expect(system).not.toContain("# 经验手册（来自过往对局复盘）");
    // v3's system for comparison: guide and handbook appended, no prefix.
    expect(client().systemPrompt).toContain("# Ironclad strategy guide");
    // Memory: the lessons are dropped, the outcome statistics and every other section stay, in order.
    const sentMemory = user["memory"] as Record<string, string>;
    expect(sentMemory["knowledge"]).toBe(`${SLICE_STATS_HEADING}\n${STAT}`);
    expect(JSON.stringify(user)).not.toContain(LESSON);
    expect(Object.keys(sentMemory)).toEqual(["act", "history", "route", "lookahead", "knowledge"]);
    expect(sentMemory["act"]).toBe(memory["act"]);
    expect(user["question"]).toBe("Pick a card.");
    const row = rows(log)[0]!;
    expect(row["knowledge"]).toMatchObject({ mode: "full", ascension: 9, prefix_chars: prefix.length });
    expect(row["system_chars"]).toBe(system.length);
  });

  it("renders once per ascension while the data holds; a changed file or another ascension renders again", async () => {
    const dir = temp("brain-kn-data-");
    cpSync(KNOWLEDGE, dir, { recursive: true });
    const { brain } = brainOf({ KNOWLEDGE_PREFIX: "full" });
    brain.setToolContext({ ...ctx, knowledgeDir: dir });
    await brain.choose(state, "Pick a card.", criteria, { label: "reward/card", memory: { ...memory } });
    await brain.choosePlan(state, "Plan the shop.", { leave: null }, { label: "shop/plan", memory: { ...memory } });
    await brain.askJson({ task: "TASK: run plan", run_state: { act: 1 }, memory: { ...memory } }, "run-plan", () => true);
    expect(brain.knowledge.renders).toBe(1);
    expect(new Set([0, 1, 2].map((i) => sent(i).system)).size).toBe(1);
    // A refreshed knowledge file (after a run): rendered again.
    const handbook = join(dir, "ds-handbook.md");
    writeFileSync(handbook, `${readFileSync(handbook, "utf8")}\n- 新经验：留药给 boss。\n`);
    await brain.choose(state, "Pick a card.", criteria, { label: "reward/card", memory: { ...memory } });
    expect(brain.knowledge.renders).toBe(2);
    expect(sent(3).system).toContain("新经验：留药给 boss。");
    brain.setToolContext({ ...ctx, knowledgeDir: dir, ascension: 8 });
    await brain.choose(state, "Pick a card.", criteria, { label: "reward/card", memory: { ...memory } });
    expect(brain.knowledge.renders).toBe(3);
    expect(sent(4).system).toContain("# 知识库（本局进阶 A8）");
  });

  it("the renderer fills the guides' data placeholders once: the prefix, the kb_* tools and gkb-dump read the filled text", () => {
    const dir = temp("brain-kn-fill-");
    cpSync(KNOWLEDGE, dir, { recursive: true });
    writeFileSync(join(dir, "ds-handbook.md"), `${readFileSync(join(dir, "ds-handbook.md"), "utf8")}\n- 巨兽：{GIANT_BLOCK_RECORD}\n`);
    const ctx = { ascension: 9, knowledgeDir: dir };
    expect(loadKnowledgeData(dir).handbook).not.toContain("{GIANT_BLOCK_RECORD}");
    expect(loadKnowledgeData(dir).handbook).toContain("- 巨兽：");
    expect(queryOldKnowledge(ctx, "handbook")).not.toContain("{GIANT_BLOCK_RECORD}");
    expect(queryOldKnowledge(ctx, "handbook", "巨兽")).not.toContain("{GIANT_BLOCK_RECORD}");
    const { system } = new KnowledgePrompt({ postmortems: () => loadPostmortems(LESSONS) }).system(ctx);
    expect(system.startsWith(SYSTEM)).toBe(true);
    expect(system).toContain("- 巨兽：");
    expect(system).not.toContain("{GIANT_BLOCK_RECORD}");
  });

  it("every engine gets the same system (DeepSeek's request, Claude's --system-prompt-file)", async () => {
    const dir = temp("brain-kn-claude-");
    const seenFile = join(dir, "seen.json");
    const bin = join(dir, "claude.mjs");
    const answer = { choice: "card0", reason: "block" };
    const result = { type: "result", subtype: "success", is_error: false, result: JSON.stringify(answer), structured_output: answer, total_cost_usd: 0.01, usage: { input_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 900, output_tokens: 20 }, modelUsage: { "claude-opus-5-5": {} } };
    writeFileSync(bin, `#!${process.execPath}
import { readFileSync, writeFileSync } from "node:fs";
const argv = process.argv.slice(2);
let stdin = "";
for await (const chunk of process.stdin) stdin += chunk;
writeFileSync(${JSON.stringify(seenFile)}, JSON.stringify({ system: readFileSync(argv[argv.indexOf("--system-prompt-file") + 1], "utf8"), stdin }));
process.stdout.write(JSON.stringify(${JSON.stringify(result)}) + "\\n");
`);
    chmodSync(bin, 0o755);
    // No tools (the knowledge is in the prompt): with tools the system would carry the tools note too.
    const { brain } = brainOf({ KNOWLEDGE_PREFIX: "full", BRAIN_ENGINE_REWARD: "claude", BRAIN_CLAUDE_BIN: bin, BRAIN_CLAUDE_MODEL: "opus", BRAIN_CLAUDE_TOOLS: "off" });
    brain.setToolContext(ctx);
    const picked = await brain.choose(state, "Pick a card.", criteria, { label: "reward/card", memory: { ...memory } });
    expect(picked.brain).toMatchObject({ engine: "claude", model: "claude-opus-5-5" });
    await brain.choose(state, "Rest or smith?", criteria, { label: "rest/plan", memory: { ...memory } });
    const seen = JSON.parse(readFileSync(seenFile, "utf8")) as { system: string; stdin: string };
    expect(seen.system).toBe(sent(0).system);
    expect(seen.system.startsWith(`${SYSTEM}\n\n${FULL_KNOWLEDGE_NOTE}`)).toBe(true);
    // The same memory as DeepSeek's: without the lessons.
    expect((JSON.parse(seen.stdin) as { memory: unknown }).memory).toEqual(sent(0).user["memory"]);
  });

  it("a knowledge base that fails to load: v3's prompt and memory for that question, the failure said once and logged", async () => {
    const broken = temp("brain-kn-broken-");
    cpSync(KNOWLEDGE, broken, { recursive: true });
    rmSync(join(broken, "monster-db.json"));
    const ds = client();
    const { brain, log } = brainOf({ KNOWLEDGE_PREFIX: "full" }, ds);
    const notes: string[] = [];
    brain.onNote((message) => notes.push(message));
    brain.setToolContext({ ...ctx, knowledgeDir: broken });
    await brain.choose(state, "Pick a card.", criteria, { label: "reward/card", memory: { ...memory } });
    await brain.choose(state, "Pick a card.", criteria, { label: "reward/card", memory: { ...memory } });
    expect(sent(0).system).toBe(ds.systemPrompt);
    expect((sent(0).user["memory"] as Record<string, string>)["knowledge"]).toBe(slice);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/KNOWLEDGE_PREFIX=full: knowledge failed to load, v3 prompt sent: .*monster-db\.json/);
    expect(rows(log)[0]!["knowledge"]).toMatchObject({ mode: "off", ascension: 9, error: expect.stringContaining("monster-db.json") });
  });

  it("without a run context yet (ascension unknown): v3's prompt, said so", async () => {
    const ds = client();
    const { brain, log } = brainOf({ KNOWLEDGE_PREFIX: "full" }, ds);
    await brain.choose(state, "Pick a card.", criteria, { label: "reward/card", memory: { ...memory } });
    expect(sent(0).system).toBe(ds.systemPrompt);
    expect(rows(log)[0]!["knowledge"]).toMatchObject({ mode: "off", error: expect.stringContaining("ascension") });
  });
});

describe("KNOWLEDGE_PREFIX=off (the default)", () => {
  it("sends v3's exact request, with or without the variable, and logs no knowledge note", async () => {
    const ds = client();
    await ds.choose(state, "Pick a card.", criteria, { label: "reward/card", memory: { ...memory } });
    const v3 = bodies[0]!;
    const envs: Record<string, string>[] = [{}, { KNOWLEDGE_PREFIX: "off" }];
    for (const env of envs) {
      bodies = [];
      const { brain, log } = brainOf(env, ds);
      brain.setToolContext(ctx);
      await brain.choose(state, "Pick a card.", criteria, { label: "reward/card", memory: { ...memory } });
      expect(bodies).toEqual([v3]);
      expect(brain.knowledge.renders).toBe(0);
      expect("knowledge" in rows(log)[0]!).toBe(false);
    }
  });

  it("rejects an unknown mode", () => {
    expect(() => loadConfig({ KNOWLEDGE_PREFIX: "some" } as unknown as NodeJS.ProcessEnv)).toThrow(/KNOWLEDGE_PREFIX/);
  });
});

/* ---- the Claude engine's call budget ----------------------------------------------------------------------- */

class CountingEngine implements BrainEngine {
  readonly requests: BrainRequest[] = [];
  constructor(
    readonly name: EngineName,
    private readonly answers: unknown[] = [{ choice: "a", reason: "heal" }],
    readonly model = `${name}-model`,
  ) {}
  async decide(req: BrainRequest): Promise<BrainAnswer> {
    this.requests.push(req);
    const answer = this.answers[Math.min(this.requests.length - 1, this.answers.length - 1)];
    return { engine: this.name, model: this.model, answer, problems: [], attempts: 1, latencyMs: 1, usage: { inputTokens: 10, outputTokens: 1 }, toolCalls: [] };
  }
}

const options = { a: JSON.stringify({ option: "heal" }), b: JSON.stringify({ option: "smith" }) };
const request = (): BrainRequest => ({ label: "rest/plan", system: "S", question: "Heal or smith?", options, payload: {}, spec: pickSpec("rest/plan", options, {}) });

function routerOf(env: Record<string, string>, engines: Partial<Record<EngineName, CountingEngine>>): { router: BrainRouter; rows: BrainLogRow[] } {
  const logged: BrainLogRow[] = [];
  const router = new BrainRouter({
    config: loadConfig(env as unknown as NodeJS.ProcessEnv).brain,
    engine: (name) => {
      const engine = engines[name];
      if (!engine) throw new Error(`no ${name}`);
      return engine;
    },
    log: (row) => logged.push(row),
  });
  return { router, rows: logged };
}

describe("BRAIN_CLAUDE_MAX_CALLS", () => {
  it("defaults: Claude has its own budget, DeepSeek none in the router (DEEPSEEK_MAX_CALLS is the loop's)", () => {
    const config = loadConfig({} as NodeJS.ProcessEnv).brain;
    expect(config.engines.claude.maxCalls).toBe(DEFAULT_CLAUDE_MAX_CALLS);
    expect(config.engines.deepseek.maxCalls).toBeNull();
    expect(loadConfig({ BRAIN_CLAUDE_MAX_CALLS: "off" } as unknown as NodeJS.ProcessEnv).brain.engines.claude.maxCalls).toBeNull();
    expect(loadConfig({ BRAIN_CLAUDE_MAX_CALLS: "40" } as unknown as NodeJS.ProcessEnv).brain.engines.claude.maxCalls).toBe(40);
    expect(() => loadConfig({ BRAIN_CLAUDE_MAX_CALLS: "-1" } as unknown as NodeJS.ProcessEnv)).toThrow(/BRAIN_CLAUDE_MAX_CALLS/);
  });

  it("counts Claude's calls (re-asks included) apart from DeepSeek's; a used-up budget goes to the fallback", async () => {
    // The first answer names no option: the router re-asks once (both calls count).
    const claude = new CountingEngine("claude", [{ choice: "x", reason: "?" }, { choice: "a", reason: "heal" }]);
    const deepseek = new CountingEngine("deepseek");
    const { router, rows: logged } = routerOf({ BRAIN_ENGINE: "claude", BRAIN_FALLBACK: "deepseek", BRAIN_CLAUDE_MAX_CALLS: "3" }, { claude, deepseek });
    const first = await router.decide(request());
    expect(first).toMatchObject({ engine: "claude", attempts: 2 });
    expect(router.callsMade("claude")).toBe(2);
    await router.decide(request());
    expect(router.callsMade("claude")).toBe(3);
    expect(router.budgetLeft("claude")).toBe(false);
    const third = await router.decide(request());
    expect(third.engine).toBe("deepseek");
    expect(third.fellBackFrom).toEqual({ engine: "claude", error: "claude call budget used up (3/3, BRAIN_CLAUDE_MAX_CALLS)" });
    expect(logged[2]!.fell_back_from).toMatchObject({ engine: "claude", kind: "budget" });
    expect(claude.requests).toHaveLength(3);
    expect(router.callsMade("deepseek")).toBe(1);
    // DeepSeek's calls never touch Claude's budget, and DeepSeek has no router budget.
    expect(router.budgetLeft("deepseek")).toBe(true);
  });

  it("without a fallback a used-up budget fails the question (the loop then plays Jev/code)", async () => {
    const claude = new CountingEngine("claude");
    const { router, rows: logged } = routerOf({ BRAIN_ENGINE: "claude", BRAIN_CLAUDE_MAX_CALLS: "0" }, { claude });
    await expect(router.decide(request())).rejects.toThrow(/budget used up \(0\/0/);
    expect(claude.requests).toHaveLength(0);
    expect(logged[0]).toMatchObject({ engine: "claude", error_kind: "budget" });
  });
});

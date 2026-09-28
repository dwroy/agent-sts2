/** DeepSeek request shape: static system prompt (guide + handbook), run memory in the user message. */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { DeepSeekClient, effortFor, parseEffortTiers } from "../src/llm/deepseek.js";
import { sendJson, startTestServer, type TestServer } from "./support.js";

let server: TestServer | null = null;

afterEach(async () => {
  await server?.close();
  server = null;
});

describe("DeepSeekClient", () => {
  it("keeps the system prompt identical across calls and sends the memory before the state (cache order)", async () => {
    const bodies: { messages: { role: string; content: string }[] }[] = [];
    server = await startTestServer((req, res) => {
      let text = "";
      req.on("data", (chunk: Buffer) => (text += chunk.toString("utf8")));
      req.on("end", () => {
        bodies.push(JSON.parse(text) as (typeof bodies)[number]);
        sendJson(res, 200, { choices: [{ message: { content: '{"choice":"a","reason":"ok"}' } }], usage: { prompt_tokens: 10, completion_tokens: 2, prompt_cache_hit_tokens: 6, completion_tokens_details: { reasoning_tokens: 1 } } });
      });
    });
    const dir = mkdtempSync(join(tmpdir(), "ds-test-"));
    writeFileSync(join(dir, "guide.md"), "GUIDE TEXT");
    writeFileSync(join(dir, "handbook.md"), "HANDBOOK TEXT");
    const log = join(dir, "reasoning.jsonl");
    const client = new DeepSeekClient({
      apiKey: "test-key", baseUrl: server.url, model: "m", timeoutMs: 5000,
      guideFile: join(dir, "guide.md"), handbookFile: join(dir, "handbook.md"), reasoningLog: log,
    });
    expect(client.guideId).toMatch(/^[0-9a-f]{8}\+[0-9a-f]{8}$/);

    const memory1 = { run_journal: "本幕 boss: VANTOM_BOSS", fight_log: "T1 HP 55", lookahead: "距 boss 5 层" };
    const memory2 = { run_journal: "本幕 boss: THE_KIN_BOSS", fight_log: "", lookahead: "距 boss 1 层" };
    const first = await client.choose({ floor: 3 }, "Which?", { a: "A", b: "B" }, { label: "event/choose", memory: memory1 });
    await client.choose({ floor: 4 }, "Which?", { a: "A", b: "B" }, { label: "event/choose", memory: memory2 });
    expect(first.handbookId).toMatch(/^[0-9a-f]{8}$/);

    const [one, two] = bodies;
    expect(one!.messages[0]!.content).toBe(two!.messages[0]!.content);
    const system = one!.messages[0]!.content;
    expect(system.indexOf("GUIDE TEXT")).toBeLessThan(system.indexOf("# 经验手册（来自过往对局复盘）\n\nHANDBOOK TEXT"));
    expect(system).not.toContain("VANTOM");

    const user = one!.messages[1]!.content;
    expect(Object.keys(JSON.parse(user) as object)).toEqual(["memory", "state", "question", "options"]);
    expect(JSON.parse(user).memory).toEqual(memory1);
    // Empty sections are not sent.
    expect(JSON.parse(two!.messages[1]!.content).memory).toEqual({ run_journal: memory2.run_journal, lookahead: memory2.lookahead });

    const logged = readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line) as { memory?: unknown; guide?: string; usage?: unknown });
    expect(logged[0]!.memory).toEqual(memory1);
    expect(logged[0]!.guide).toBe(client.guideId);
    // Every call's usage is in the reasoning log.
    expect(logged[0]!.usage).toEqual({ input_tokens: 10, cache_hit_tokens: 6, output_tokens: 2, reasoning_tokens: 1 });
  });

  it("works without a handbook: no heading, guideId is the guide hash alone", () => {
    const dir = mkdtempSync(join(tmpdir(), "ds-test-"));
    writeFileSync(join(dir, "guide.md"), "GUIDE TEXT");
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: "http://127.0.0.1:1", model: "m", timeoutMs: 1, guideFile: join(dir, "guide.md"), handbookFile: join(dir, "missing.md") });
    expect(client.guideId).toMatch(/^[0-9a-f]{8}$/);
    expect(client.handbookId).toBe("");
    expect(client.systemPrompt).not.toContain("经验手册");
  });
});

describe("DeepSeek thinking effort per label", () => {
  const base = { reasoningEffort: "max", combatReasoningEffort: "high" };

  it("the default tiers: picks with a code value think at high, the run's big calls keep max", () => {
    for (const label of ["reward/card", "rest/choose", "selection/upgrade", "selection/remove", "selection/add", "bundle/choose", "reward/card (re-ask)"]) {
      expect(effortFor(label, base)).toBe("high");
    }
    for (const label of ["run-plan", "map/route-plan", "shop/buy", "event/choose", "selection/transform", "selection/enchant", "fight-plan", "chest/relic", "something/new"]) {
      expect(effortFor(label, base)).toBe("max");
    }
    expect(effortFor("combat/plan-choice", base)).toBe("high");
    expect(effortFor("combat/plan-choice", { reasoningEffort: "max" })).toBe("max");
  });

  it("DEEPSEEK_EFFORT_BY_LABEL overrides by prefix (longest wins), ignores unknown efforts, and never turns thinking on", () => {
    const effortByLabel = "selection=high, selection/enchant=max, shop/buy=low, event/choose=extreme";
    expect(effortFor("selection/remove", { ...base, effortByLabel })).toBe("high");
    expect(effortFor("selection/enchant", { ...base, effortByLabel })).toBe("max");
    expect(effortFor("shop/buy", { ...base, effortByLabel })).toBe("low");
    expect(effortFor("event/choose", { ...base, effortByLabel })).toBe("max");
    expect(effortFor("reward/card", { ...base, effortByLabel: "-" })).toBe("max");
    expect(effortFor("reward/card", { reasoningEffort: "off" })).toBe("off");
    expect(parseEffortTiers("a=high,ab=low,bad,c=")).toEqual([["ab", "low"], ["a", "high"]]);
    const config = loadConfig({ DEEPSEEK_API_KEY: "k", DEEPSEEK_EFFORT_BY_LABEL: "reward/card=max" } as unknown as NodeJS.ProcessEnv);
    expect(config.deepseek?.effortByLabel).toBe("reward/card=max");
    expect(loadConfig({ DEEPSEEK_API_KEY: "k" } as unknown as NodeJS.ProcessEnv).deepseek?.effortByLabel).toBeUndefined();
  });

  it("the effort actually used is sent and logged per call", async () => {
    const bodies: { reasoning_effort?: string }[] = [];
    server = await startTestServer((req, res) => {
      let text = "";
      req.on("data", (chunk: Buffer) => (text += chunk.toString("utf8")));
      req.on("end", () => {
        bodies.push(JSON.parse(text) as (typeof bodies)[number]);
        sendJson(res, 200, { choices: [{ message: { content: '{"choice":"a","reason":"ok"}', reasoning_content: "thinking" } }], usage: { prompt_tokens: 10, completion_tokens: 2 } });
      });
    });
    const dir = mkdtempSync(join(tmpdir(), "ds-effort-"));
    const log = join(dir, "reasoning.jsonl");
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000, reasoningEffort: "max", reasoningLog: log });
    const a = await client.choose({}, "Which?", { a: "A", b: "B" }, { label: "reward/card" });
    await client.choose({}, "Which?", { a: "A", b: "B" }, { label: "shop/buy" });
    expect(a.effort).toBe("high");
    expect(bodies.map((body) => body.reasoning_effort)).toEqual(["high", "max"]);
    const logged = readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line) as { label: string; effort: string });
    expect(logged.map((row) => [row.label, row.effort])).toEqual([["reward/card", "high"], ["shop/buy", "max"]]);
  });
});

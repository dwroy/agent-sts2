/**
 * Fix batch M (notes/fix-queue.md "From post-mortems 2WRU 79YR 86C3" and "From post-mortems YVYZ Q8XR 3RME NH8A"):
 * pure bugs. One describe per fix; boards are synthetic or logged fixtures (tests/logged-states/batch-m), never the
 * refreshing knowledge files.
 */

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { DeepSeekAnswerError, DeepSeekClient, pickJsonObject, truncatedJsonObject } from "../src/llm/deepseek.js";
import { planSelection } from "../src/screens/selection.js";
import { isRunPlanReply } from "../src/strategy/run-plan.js";
import { logged, loggedEnv } from "./logged.js";
import { sendJson, startTestServer, type TestServer } from "./support.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "logged-states", "batch-m");
const fixture = <T>(name: string): T => JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8")) as T;

type Raw = Record<string, unknown>;

describe("1. Knowledge Demon: with Rupture up, Disintegration that outlasts the HP still ranks last (79YR F33 T5: 17 HP, Rupture 2, taken as \"Rupture: Strength\")", () => {
  it("the logged board picks Sloth, and the text gives Rupture's Strength and the HP gate apart", { timeout: 30_000 }, () => {
    const fx = logged("batch-m/79yr-f33-t5-curse");
    const decision = planSelection(loggedEnv(fx));
    expect(decision?.kind).toBe("act");
    const act = decision as { intent: Raw; rationale: string };
    expect(act.intent).toEqual({ action: "select_deck_card", option_index: 1 });
    expect(act.rationale).toContain("懒惰");
    expect(act.rationale).toMatch(/DISINTEGRATION Rupture: Strength \(outlasts the HP: 7 a turn x 6\.9 turns \+ 20 > 17 HP\)/);
  });

  it("with the HP to pay for it, Rupture still makes Disintegration the pick", { timeout: 30_000 }, () => {
    const fx = logged("batch-m/79yr-f33-t5-curse");
    const player = ((fx.state["combat"] as Raw)["player"] as Raw);
    player["current_hp"] = 80;
    const act = planSelection(loggedEnv(fx)) as { intent: Raw; rationale: string };
    expect(act.intent).toEqual({ action: "select_deck_card", option_index: 0 });
    expect(act.rationale).toMatch(/DISINTEGRATION Rupture: Strength;/);
  });
});

describe("2. DeepSeek replies that are JSON but were judged non-JSON (79YR F6 one-shot shop: re-planned step by step, +145.8 s)", () => {
  let server: TestServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });
  const reply = (content: string) =>
    startTestServer((req, res) => {
      req.on("data", () => undefined);
      req.on("end", () => sendJson(res, 200, { choices: [{ message: { content, reasoning_content: "thinking" } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }));
    });
  const f6 = fixture<{ raw_reply: string; options: string[] }>("79yr-f6-shop-plan-reply");
  const criteria = Object.fromEntries(f6.options.map((key) => [key, null]));

  it("the logged reply is two whole objects joined by a comma, not a cut one: the plan object is taken", () => {
    expect(pickJsonObject(f6.raw_reply)).toEqual({
      plan: ["remove:c0", "buy_card3", "buy_card2"],
      reason: expect.stringMatching(/^Strike removal at its cheapest \(100\), then the two best block fixes .*Feel No Pain \(no exhaust\)\.$/),
    });
  });

  it("choosePlan returns it", async () => {
    server = await reply(f6.raw_reply);
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000 });
    const { json } = await client.choosePlan({}, "Plan the shop.", criteria, { label: "shop/plan" });
    expect(json["plan"]).toEqual(["remove:c0", "buy_card3", "buy_card2"]);
  });

  it("a comma still needs values on both sides; other garbage still fails", () => {
    expect(() => pickJsonObject('{"a": 1},')).toThrow(/non-JSON/);
    expect(() => pickJsonObject(', {"a": 1}')).toThrow(/non-JSON/);
    expect(() => pickJsonObject('{"a": 1},, {"b": 2}')).toThrow(/non-JSON/);
    expect(() => pickJsonObject('{"a": 1} and more')).toThrow(/non-JSON/);
  });

  it("a reply cut inside its reason keeps the whole members and the reason so far, marked [truncated]", async () => {
    const cut = '{"plan": ["remove:c0", "buy_card3", "buy_card2"], "reason": "Strike removal at its cheapest (100), then the two best blo';
    expect(truncatedJsonObject(cut)).toEqual({ plan: ["remove:c0", "buy_card3", "buy_card2"], reason: "Strike removal at its cheapest (100), then the two best blo [truncated]" });
    server = await reply(cut);
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000 });
    const { json } = await client.choosePlan({}, "Plan the shop.", criteria, { label: "shop/plan" });
    expect(json["plan"]).toEqual(["remove:c0", "buy_card3", "buy_card2"]);
    expect(json["reason"]).toMatch(/best blo \[truncated\]$/);
  });

  it("a member cut in the middle is dropped, never half-used: a cut plan list or choice is missing, not shortened", () => {
    expect(truncatedJsonObject('{"reason": "x", "plan": ["remove:c0", "buy_ca')).toEqual({ reason: "x [truncated]" });
    expect(truncatedJsonObject('{"reason": "x", "choice": "car')).toEqual({ reason: "x [truncated]" });
    expect(truncatedJsonObject('{"plan": ["remove:c0", "buy_ca')).toBeNull();
    expect(truncatedJsonObject('{"a": 1')).toBeNull();
    expect(truncatedJsonObject('{"a": 1} tail')).toBeNull();
    expect(truncatedJsonObject("")).toBeNull();
  });

  it("choose(): a whole choice with its reason cut is taken, the reason marked", async () => {
    server = await reply('{"choice":"card3","reason":"剑柄打击: 9 damage + draw fixes the deck');
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000 });
    const answer = await client.choose({}, "Which card should I add?", { card1: null, card3: null }, { label: "selection/add" });
    expect(answer.choice).toBe("card3");
    expect(answer.reason).toBe("剑柄打击: 9 damage + draw fixes the deck [truncated]");
  });
});

describe("3. An empty run-plan reply, all its output spent in the reasoning (79YR F30: 6,791 tokens, the plan written at the end of the reasoning)", () => {
  let server: TestServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });
  type Reply = { content: string; reasoning: string; finish?: string; tokens?: number };
  /** Serves the replies in turn (the last one again after the list), counting the calls. */
  const serve = async (replies: Reply[]) => {
    const calls = { n: 0 };
    server = await startTestServer((req, res) => {
      req.on("data", () => undefined);
      req.on("end", () => {
        const reply = replies[Math.min(calls.n, replies.length - 1)]!;
        calls.n += 1;
        const tokens = reply.tokens ?? 100;
        sendJson(res, 200, {
          choices: [{ message: { content: reply.content, reasoning_content: reply.reasoning }, finish_reason: reply.finish ?? "stop" }],
          usage: { prompt_tokens: 1000, completion_tokens: tokens, completion_tokens_details: { reasoning_tokens: reply.content ? tokens - 10 : tokens } },
        });
      });
    });
    return calls;
  };
  const f30 = fixture<{ raw_reply: string; reasoning_tail: string; usage: { output_tokens: number } }>("79yr-f30-run-plan-empty");
  const client = (log = "") => new DeepSeekClient({ apiKey: "k", baseUrl: server!.url, model: "m", timeoutMs: 5000, reasoningLog: log });
  const PLAN = '{"archetype": "strength", "want": ["INFLAME"], "summary": "second answer"}';

  it("the plan at the end of the reasoning is taken, without a second call; the log row says why", async () => {
    const calls = await serve([{ content: f30.raw_reply, reasoning: f30.reasoning_tail, tokens: f30.usage.output_tokens }]);
    const log = join(mkdtempSync(join(tmpdir(), "batch-m-")), "reasoning.jsonl");
    const out = await client(log).askJson({ task: "run plan" }, "run-plan", isRunPlanReply);
    expect(calls.n).toBe(1);
    expect(out.recovered).toBe(true);
    expect(out.json["archetype"]).toBe("Rupture/Inflame Strength scaling; big single hits for Sloth turns");
    expect(out.json["remove"]).toEqual(["STRIKE_IRONCLAD", "DEFEND_IRONCLAD", "STAMPEDE"]);
    expect(out.note).toBe("empty reply (finish_reason stop; all 6791 output tokens were reasoning): the answer taken from the end of its reasoning");
    const row = JSON.parse(readFileSync(log, "utf8").trim()) as { answer: Raw };
    expect(row.answer["empty_reply"]).toBe("empty reply (finish_reason stop; all 6791 output tokens were reasoning)");
  });

  it("with no answer drafted, asked once more: the second reply is used, both calls' tokens counted, both logged", async () => {
    const calls = await serve([{ content: "", reasoning: "thinking, no draft" }, { content: PLAN, reasoning: "ok" }]);
    const log = join(mkdtempSync(join(tmpdir(), "batch-m-")), "reasoning.jsonl");
    const out = await client(log).askJson({ task: "run plan" }, "run-plan", isRunPlanReply);
    expect(calls.n).toBe(2);
    expect(out.json["summary"]).toBe("second answer");
    expect(out.meta.outputTokens).toBe(200);
    expect(out.note).toBe("first empty reply (finish_reason stop; all 100 output tokens were reasoning): asked once more");
    const rows = readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Raw);
    expect(rows).toHaveLength(2);
    expect(rows[0]!["parse_error"]).toMatch(/^empty reply \(finish_reason stop; all 100 output tokens were reasoning\), no answer drafted in its reasoning: asked once more$/);
    expect(rows[0]!["finish_reason"]).toBe("stop");
  });

  it("empty twice: fails with the reason and both calls' usage (the plan in force stays, as before)", async () => {
    const calls = await serve([{ content: "", reasoning: "thinking", finish: "length" }]);
    const failed = await client().askJson({ task: "run plan" }, "run-plan", isRunPlanReply).catch((error: unknown) => error);
    expect(calls.n).toBe(2);
    expect(failed).toBeInstanceOf(DeepSeekAnswerError);
    expect((failed as Error).message).toBe("DeepSeek's run-plan reply was empty twice (last: empty reply (finish_reason length; all 100 output tokens were reasoning)) and its reasoning drafted no answer");
    expect((failed as DeepSeekAnswerError).meta.outputTokens).toBe(200);
  });
});

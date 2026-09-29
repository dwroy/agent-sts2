/**
 * Fix batch M (notes/fix-queue.md "From post-mortems 2WRU 79YR 86C3" and "From post-mortems YVYZ Q8XR 3RME NH8A"):
 * pure bugs. One describe per fix; boards are synthetic or logged fixtures (tests/logged-states/batch-m), never the
 * refreshing knowledge files.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { DeepSeekClient, pickJsonObject, truncatedJsonObject } from "../src/llm/deepseek.js";
import { planSelection } from "../src/screens/selection.js";
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

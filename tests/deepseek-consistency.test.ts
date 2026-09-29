/**
 * Consistency guard on DeepSeek's direct answers (run 2WNTQHYY4GAD, F12 rest at 24/80: the reasoning ended
 * "Decisive: heal." but the answer was the smith option with no reason). Mocked DeepSeek HTTP replies.
 */

import { afterEach, describe, expect, it } from "vitest";

import { checkConsistency, reaskFields, reaskMessage, reasoningConclusion } from "../src/llm/consistency.js";
import { DeepSeekClient, DeepSeekInconsistentError } from "../src/llm/deepseek.js";
import { sendJson, startTestServer, type TestServer } from "./support.js";

interface Reply {
  content: string;
  reasoning?: string;
}

interface Body {
  messages: { role: string; content: string }[];
}

let server: TestServer | null = null;
afterEach(async () => {
  await server?.close();
  server = null;
});

/** A DeepSeek stand-in that plays `replies` in order and records each request body. */
async function mockDeepSeek(replies: Reply[]): Promise<{ client: DeepSeekClient; bodies: Body[] }> {
  const bodies: Body[] = [];
  server = await startTestServer((req, res) => {
    let text = "";
    req.on("data", (chunk: Buffer) => (text += chunk.toString("utf8")));
    req.on("end", () => {
      bodies.push(JSON.parse(text) as Body);
      const reply = replies[Math.min(bodies.length - 1, replies.length - 1)] as Reply;
      sendJson(res, 200, {
        choices: [{ message: { content: reply.content, reasoning_content: reply.reasoning ?? "" } }],
        usage: { prompt_tokens: 100, completion_tokens: 10 },
      });
    });
  });
  const client = new DeepSeekClient({ apiKey: "test-key", baseUrl: server.url, model: "m", timeoutMs: 5000, reasoningEffort: "max" });
  return { client, bodies };
}

/** The F12 rest question, as the build-decider path sends it. */
const REST = {
  o0: JSON.stringify({ option: "休息", kind: "HEAL", description: "回复最大生命值的30%（24）。", code_value: 13, code_rank: 1, why: "HP 30%: heal 10" }),
  o1: JSON.stringify({ option: "锻造", kind: "SMITH", description: "升级你牌组中的1张牌。", code_value: 6, code_rank: 2, why: "smith 6" }),
};

/** The tail of the incident's reasoning. */
const HEAL_REASONING = [
  "We're at floor 12 rest site, HP 24/80. Boss is Waterfall Giant, 5 floors away. Need to decide heal vs smith.",
  "Smith would give value but we're at 24 HP with a boss clock needing damage. However, dying is worse. Healing is clearly right: 24→48 HP.",
  "Code value says heal 13 vs smith 6. Choose heal.",
  "But consider: does healing get truncated? No, 24+24 = 48.",
  "Decisive: heal.",
].join("\n");

const ask = (client: DeepSeekClient, criteria: Record<string, string | null> = REST) =>
  client.choose({ floor: 12 }, "What should I do at this rest site?", criteria, { label: "rest/choose" });

describe("DeepSeek consistency guard", () => {
  it("consistent answer: one call, played as given, no consistency record", async () => {
    const { client, bodies } = await mockDeepSeek([{ content: '{"choice":"o0","reason":"24 HP is too low; heal to 48"}', reasoning: HEAL_REASONING }]);
    const answer = await ask(client);
    expect(bodies).toHaveLength(1);
    expect(answer).toMatchObject({ choice: "o0", reason: "24 HP is too low; heal to 48" });
    expect(answer.consistency).toBeUndefined();
  });

  it("the incident: empty reason + reasoning concluded heal but answered smith -> re-asked once, quoting the contradiction", async () => {
    const { client, bodies } = await mockDeepSeek([
      { content: '{"choice":"o1"}', reasoning: HEAL_REASONING },
      { content: '{"choice":"o0","reason":"HP 24/80 before an elite; heal"}', reasoning: "I concluded heal. Answer: o0." },
    ]);
    const answer = await ask(client);
    expect(bodies).toHaveLength(2);
    const followUp = bodies[1]!.messages;
    expect(followUp.map((message) => message.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(followUp[2]!.content).toBe('{"choice":"o1"}');
    expect(followUp[3]!.content).toContain('Your reasoning concluded "Decisive: heal." (option o0) but you answered o1');
    expect(followUp[3]!.content).toContain("empty reason");
    expect(answer).toMatchObject({ choice: "o0", reason: "HP 24/80 before an elite; heal", inputTokens: 200, outputTokens: 20 });
    expect(answer.consistency).toMatchObject({
      resolution: "reasked",
      choice: "o0",
      first: { choice: "o1", reason: "", conclusion: "o0", issues: ["empty reason", "reasoning concluded o0 but answered o1"] },
      second: { choice: "o0", issues: [] },
    });
  });

  it("contradiction survives the re-ask: the option named in the reasoning's conclusion is played", async () => {
    const { client } = await mockDeepSeek([
      { content: '{"choice":"o1","reason":"upgrade for scaling"}', reasoning: HEAL_REASONING },
      { content: '{"choice":"o1","reason":"upgrade for scaling"}', reasoning: "Still: dying is worse.\nDecisive: heal." },
    ]);
    const answer = await ask(client);
    expect(answer.choice).toBe("o0");
    expect(answer.reason).toMatch(/^reasoning concluded o0: Decisive: heal\./);
    expect(answer.consistency).toMatchObject({ resolution: "conclusion", choice: "o0", second: { choice: "o1", conclusion: "o0" } });
  });

  it("still inconsistent and no conclusion maps to one option: throws for the caller's fallback, with both answers", async () => {
    const { client, bodies } = await mockDeepSeek([{ content: '{"choice":"o1","reason":""}' }, { content: '{"choice":"o1"}' }]);
    const error = await ask(client).catch((e: unknown) => e);
    expect(bodies).toHaveLength(2);
    expect(error).toBeInstanceOf(DeepSeekInconsistentError);
    const record = (error as DeepSeekInconsistentError).record;
    expect(record).toMatchObject({ resolution: "fallback", first: { choice: "o1", issues: ["empty reason"] }, second: { choice: "o1", issues: ["empty reason"] } });
    expect((error as DeepSeekInconsistentError).meta).toEqual({ calls: 2, tokens: 220 });
  });

  it("the re-ask failing (bad JSON) still resolves on the first reasoning's conclusion", async () => {
    const { client } = await mockDeepSeek([{ content: '{"choice":"o1","reason":"x"}', reasoning: HEAL_REASONING }, { content: "not json" }]);
    const answer = await ask(client);
    expect(answer.choice).toBe("o0");
    expect(answer.consistency).toMatchObject({ resolution: "conclusion", second: { error: expect.stringContaining("non-JSON") } });
  });
});

describe("reasoning conclusion", () => {
  it("names the option after the last decision marker; discussing both earlier is not a contradiction", () => {
    const reasoning = "heal 13 vs smith 6, heal is safer.\nBut the boss clock gap is 11.\nGo with smith over heal: HP 70/80 is fine.";
    expect(reasoningConclusion(reasoning, REST)).toMatchObject({ option: "o1", unambiguous: true });
    expect(checkConsistency("o1", "scaling", reasoning, REST).ok).toBe(true);
    expect(checkConsistency("o0", "safe", reasoning, REST).issues).toEqual(["reasoning concluded o1 but answered o0"]);
  });

  it("works on option keys and card names; a name shared by two options names neither", () => {
    const cards = {
      card0: JSON.stringify({ card: "INFLAME", type: "Power" }),
      card1: JSON.stringify({ card: "STRIKE", type: "Attack" }),
      card2: JSON.stringify({ card: "STRIKE", type: "Attack" }),
      skip: JSON.stringify({ option: "skip" }),
    };
    expect(reasoningConclusion("Final answer: card0.", cards)).toMatchObject({ option: "card0", unambiguous: true });
    expect(reasoningConclusion("Decision: take Inflame.", cards)?.option).toBe("card0");
    expect(reasoningConclusion("Decision: take a Strike.", cards)).toBeNull();
    expect(reasoningConclusion("Nothing fits the plan. Final answer: skip.", cards)?.option).toBe("skip");
  });

  it("ignores negated markers and reasoning with no conclusion", () => {
    expect(reasoningConclusion("Don't choose smith here.", REST)).toBeNull();
    expect(reasoningConclusion("HP is low. Output JSON only.", REST)).toBeNull();
    expect(checkConsistency("o1", "scaling", "", REST).ok).toBe(true);
  });

  it("maps a CJK option name; a longer name containing a shorter one counts once", () => {
    const cards = { card0: JSON.stringify({ card: "打击" }), card1: JSON.stringify({ card: "双重打击" }) };
    expect(reasoningConclusion("结论：双重打击", cards)).toMatchObject({ option: "card1", unambiguous: true });
    expect(reasoningConclusion("选择 锻造", REST)?.option).toBe("o1");
  });
});

describe("the re-ask asks for the question's other fields again", () => {
  const check = checkConsistency("o1", "smith", "Decisive: o0.", REST);

  it("a plain question: {choice, reason} only", () => {
    expect(reaskMessage("o1", check, reaskFields({ facts: {} }, {}))).toMatch(/JSON only, \{"choice": "<option key>", "reason": "<max 25 words>"\}\.$/);
  });

  it("the act-start joint question: its route from act_routes; a first answer with cards: the cards", () => {
    const message = reaskMessage("o1", check, reaskFields({ act_routes: { r1: {}, r2: {} } }, { cards: ["c3", "c4"] }));
    expect(message).toContain("state.act_routes");
    expect(message).toMatch(/\{"choice": "<option key>", "reason": "<max 25 words>", "route": "<r1 \| r2>", "cards": \[<the deck cards the option takes>\]\}\.$/);
  });
});

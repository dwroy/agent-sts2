/**
 * Fix batch O (the leftovers of batch N). Fixtures in tests/logged-states/batch-o/.
 */

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { makeKnowledge } from "../src/knowledge/index.js";
import { DeepSeekAnswerError, DeepSeekClient, isPlanDraft, lastDraftedAnswer } from "../src/llm/deepseek.js";
import { parseGameState } from "../src/mod/schema.js";
import { calibrated, deckEstimate, deckProfileForBoss, ESTIMATE_SLOPE, mechanicFactor, rawDeckDamage, type DeckProfile } from "../src/strategy/boss-clock.js";
import { isFightPlanDraft, isFightPlanReply } from "../src/strategy/fight-plan.js";
import { baseState, runPayload } from "./scenarios.js";
import { sendJson, startTestServer, type TestServer } from "./support.js";

type Raw = Record<string, unknown>;
const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states", "batch-o");
const fixture = <T>(name: string): T => JSON.parse(readFileSync(join(DIR, name), "utf8")) as T;

describe("boss clock: the Knowledge Demon's Sloth caps card plays, not the powers' own triggers", () => {
  const fx = fixture<{ boards: Record<string, { run: Raw }>; game_data: Record<string, unknown[]> }>("boss-clock-kd-sloth.json");
  // The game data those decks reference, fixed with the fixture (not the refreshed knowledge).
  const knowledge = makeKnowledge(fx.game_data, "cache");
  const deckOf = (key: string): DeckProfile => deckProfileForBoss(parseGameState(baseState("MAP", { run: runPayload(fx.boards[key]!.run) })), knowledge)!;
  const KD = "KNOWLEDGE_DEMON_BOSS";
  const unrounded = (deck: DeckProfile, turns: number) => calibrated(rawDeckDamage(deck, KD, turns)) * mechanicFactor("KNOWLEDGE_DEMON", deck, turns);

  it("the turn-start power hits are told apart: 5HHL F32 Juggernaut 6 on Crimson Mantle's block, S1MU F32 Inferno+ 9 on its own HP loss", () => {
    expect(deckOf("5HHLMV2DZ5AZ:32").passiveTurnStart).toBe(6);
    expect(deckOf("S1MURCR8DGPT:32").passiveTurnStart).toBe(9);
  });

  it("5HHL F32 (3.7 plays a turn, Sloth binds): the turn-start Juggernaut hits go through whole, the card part is capped (29.4 -> 30.3 at 8 turns)", () => {
    const deck = deckOf("5HHLMV2DZ5AZ:32");
    const turns = 8;
    const sloth = 3 / deck.plays;
    expect(sloth).toBeLessThan(1);
    // Mind Rot from T5: one card of five less on turns 6-8.
    const cap = (sloth * 5 + sloth * 0.8 * 3) / turns;
    const total = calibrated(rawDeckDamage(deck, KD, turns));
    const free = ESTIMATE_SLOPE * 6 * ((turns - deck.setupTurn) / turns);
    expect(unrounded(deck, turns)).toBeCloseTo(cap * (total - free) + free, 6);
    // The whole estimate capped was 29.45.
    expect(unrounded(deck, turns)).toBeGreaterThan(total * cap + 0.5);
    expect(deckEstimate(deck, KD, turns)).toBe(30);
  });

  it("more turn-start power damage adds its full calibrated value; the same damage from card plays adds only the capped share", () => {
    const deck = deckOf("5HHLMV2DZ5AZ:32");
    const turns = 8;
    const inPlay = (turns - deck.setupTurn) / turns;
    const base = unrounded(deck, turns);
    const powers = unrounded({ ...deck, passiveDamage: deck.passiveDamage! + 10, passiveTurnStart: deck.passiveTurnStart! + 10 }, turns);
    expect(powers - base).toBeCloseTo(ESTIMATE_SLOPE * 10 * inPlay, 6);
    const cards = unrounded({ ...deck, passiveDamage: deck.passiveDamage! + 10 }, turns);
    expect(cards - base).toBeLessThan(ESTIMATE_SLOPE * 10 * inPlay * 0.8);
  });

  it("power damage is not raised by Vulnerable (logged: Inferno and Juggernaut hits on Vulnerable enemies took their plain amount)", () => {
    const deck = deckOf("5HHLMV2DZ5AZ:32");
    const plain = { ...deck, vulnerableSources: 0 };
    const vulnerable = { ...deck, vulnerableSources: 2 };
    const powers = (d: DeckProfile) => rawDeckDamage(d, "QUEEN_BOSS", 8) - rawDeckDamage({ ...d, passiveDamage: 0, passiveAoe: 0 }, "QUEEN_BOSS", 8);
    expect(powers(vulnerable)).toBeCloseTo(powers(plain), 9);
    expect(powers(plain)).toBeGreaterThan(0);
  });

  it("a deck with no turn-start power damage reads as before (the cap on the whole estimate)", () => {
    const deck = { ...deckOf("5HHLMV2DZ5AZ:32"), passiveDamage: 0, passiveAoe: 0, passiveTurnStart: 0 };
    const sloth = 3 / deck.plays;
    expect(mechanicFactor("KNOWLEDGE_DEMON", deck, 8)).toBeCloseTo((sloth * 5 + sloth * 0.8 * 3) / 8, 9);
  });
});

describe("an answer recovered from the reasoning is its LAST drafted answer, or none (batch N: the last one that passed was taken over a later, final one that failed)", () => {
  let server: TestServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });
  type Reply = { content: string; reasoning: string };
  const serve = async (replies: Reply[]) => {
    const calls = { n: 0 };
    server = await startTestServer((req, res) => {
      req.on("data", () => undefined);
      req.on("end", () => {
        const reply = replies[Math.min(calls.n, replies.length - 1)]!;
        calls.n += 1;
        sendJson(res, 200, {
          choices: [{ message: { content: reply.content, reasoning_content: reply.reasoning }, finish_reason: "stop" }],
          usage: { prompt_tokens: 1000, completion_tokens: 100, completion_tokens_details: { reasoning_tokens: reply.content ? 90 : 100 } },
        });
      });
    });
    return calls;
  };
  const client = (log = "") => new DeepSeekClient({ apiKey: "k", baseUrl: server!.url, model: "m", timeoutMs: 5000, reasoningLog: log });
  const rowsOf = (log: string) => readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Raw);
  // A shop's options; the screen's check stands in: a plan list of offered keys.
  const criteria = { buy_card3: null, buy_card4: null, leave: null };
  const valid = (json: Record<string, unknown>) => Array.isArray(json["plan"]) && (json["plan"] as unknown[]).every((key) => typeof key === "string" && key in criteria);
  // A Knowledge Demon fight plan's reasoning: the plan drafted, then {}, {} and {"type": "json_object"} (the response format quoted).
  const logged = fixture<{ reasoning_tail: string }>("fight-plan-reasoning-ends-on-format.json");

  it("lastDraftedAnswer: a final draft that fails is not replaced by an earlier one that passes", () => {
    const reasoning = 'Draft: {"plan": ["buy_card3"], "reason": "block"}. Hmm, both? Final: {"plan": ["buy_card3", "buy_card9"], "reason": "both"}';
    expect(lastDraftedAnswer(reasoning, valid, isPlanDraft)).toEqual({ failed: { plan: ["buy_card3", "buy_card9"], reason: "both" } });
    expect(lastDraftedAnswer('Final: {"plan": ["buy_card3"], "reason": "block"}', valid, isPlanDraft)).toEqual({ answer: { plan: ["buy_card3"], reason: "block" } });
    expect(lastDraftedAnswer("no JSON here", valid, isPlanDraft)).toBeNull();
  });

  it("lastDraftedAnswer: objects that are no answer ({}, {\"type\": \"json_object\"}) after the plan do not hide it (the logged fight-plan reasoning)", () => {
    const out = lastDraftedAnswer(logged.reasoning_tail, isFightPlanReply, isFightPlanDraft);
    expect(out).toMatchObject({ answer: { approach: "setup", setup_cards: ["RUPTURE", "INFERNO", "UNMOVABLE"], focus_enemy: "KNOWLEDGE_DEMON" } });
    // Every object counted as a draft, the last is the quoted format: no answer.
    expect(lastDraftedAnswer(logged.reasoning_tail, isFightPlanReply)).toEqual({ failed: { type: "json_object" } });
  });

  it("choosePlan, empty reply: the reasoning's final plan fails the screen's check, so its earlier draft is not taken: asked once more", async () => {
    const calls = await serve([
      { content: "", reasoning: 'Draft: {"plan": ["buy_card3"], "reason": "block"}. Hmm, gold for both? Final: {"plan": ["buy_card3", "buy_card9"], "reason": "both"}' },
      { content: '{"plan": ["buy_card4"], "reason": "second answer"}', reasoning: "again" },
    ]);
    const log = join(mkdtempSync(join(tmpdir(), "batch-o-")), "reasoning.jsonl");
    const answer = await client(log).choosePlan({}, "Plan the shop.", criteria, { label: "shop/plan" }, valid);
    expect(calls.n).toBe(2);
    expect(answer.json["plan"]).toEqual(["buy_card4"]);
    expect(answer.recovered).toBeUndefined();
    expect(rowsOf(log)[0]!["parse_error"]).toMatch(/the last answer drafted in its reasoning fails the check \(\{"plan":\["buy_card3","buy_card9"\].*an earlier draft is not taken\): asked once more$/);
  });

  it("choosePlan, empty twice with the final draft failing both times: an answer error naming it", async () => {
    const calls = await serve([{ content: "", reasoning: 'Draft: {"plan": ["buy_card3"], "reason": "a"}. Final: {"plan": ["buy_everything"], "reason": "b"}' }]);
    const failed = await client().choosePlan({}, "Plan the shop.", criteria, { label: "shop/plan" }, valid).catch((error: unknown) => error);
    expect(calls.n).toBe(2);
    expect(failed).toBeInstanceOf(DeepSeekAnswerError);
    expect((failed as Error).message).toMatch(/was empty twice .* and the last answer its reasoning drafted fails the check \(\{"plan":\["buy_everything"\]/);
  });

  it("askJson, an echo reply: a final fight-plan draft that fails is not replaced by the earlier plan; an error (the fight is played without a plan)", async () => {
    await serve([{ content: '{"choice": "end_turn", "reason": "fight plan"}', reasoning: `${logged.reasoning_tail}\n\nNo wait, rewrite: {"approach": "turtle", "summary": ""}` }]);
    const failed = await client().askJson({ task: "fight plan" }, "fight-plan", isFightPlanReply, isFightPlanDraft).catch((error: unknown) => error);
    expect(failed).toBeInstanceOf(DeepSeekAnswerError);
    expect((failed as Error).message).toMatch(/not in the task's format and the last answer its reasoning drafted fails the check \(\{"approach":"turtle"/);
  });

  it("askJson, an echo reply on the logged reasoning: the plan is taken (the objects after it are no drafts)", async () => {
    await serve([{ content: '{"choice": "end_turn", "reason": "fight plan"}', reasoning: logged.reasoning_tail }]);
    const out = await client().askJson({ task: "fight plan" }, "fight-plan", isFightPlanReply, isFightPlanDraft);
    expect(out.recovered).toBe(true);
    expect(out.json).toMatchObject({ approach: "setup", setup_cards: ["RUPTURE", "INFERNO", "UNMOVABLE"] });
  });
});

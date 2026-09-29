/**
 * Fix batch N (post-mortems MZFV S1MU 5HHL, the A8 window's runs 12-14; the leftovers of batch M). Fixtures in
 * tests/logged-states/batch-n/.
 */

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { makeKnowledge } from "../src/knowledge/index.js";
import { DeepSeekAnswerError, DeepSeekClient } from "../src/llm/deepseek.js";
import { parseGameState } from "../src/mod/schema.js";
import { deckEstimate, deckProfileForBoss } from "../src/strategy/boss-clock.js";
import { isFightPlanReply } from "../src/strategy/fight-plan.js";
import { board, play, scriptedDeepSeek, setupOneshotTests } from "./oneshot-support.js";
import { baseState, combatPayload, mainMenuPayload, runPayload } from "./scenarios.js";
import { sendJson, startTestServer, type TestServer } from "./support.js";

type Raw = Record<string, unknown>;
const DIR = join(dirname(fileURLToPath(import.meta.url)), "logged-states", "batch-n");
const fixture = <T>(name: string): T => JSON.parse(readFileSync(join(DIR, name), "utf8")) as T;

describe("boss clock: self-damage engines (S1MU, 5HHL)", () => {
  const fx = fixture<{ boards: Record<string, { run: Raw }>; game_data: Record<string, unknown[]> }>("boss-clock-self-damage.json");
  // The game data those decks reference, fixed with the fixture (not the refreshed knowledge).
  const knowledge = makeKnowledge(fx.game_data, "cache");
  const deckOf = (key: string) => {
    const run = fx.boards[key]!.run;
    return { deck: deckProfileForBoss(parseGameState(baseState("MAP", { run: runPayload(run) })), knowledge)!, boss: String(run["boss_id"]) };
  };

  it("Rupture+ gives 2 per HP loss and Inferno's turn-start loss feeds it every turn (S1MU F33: Strength +2 a turn from T4)", () => {
    const { deck } = deckOf("S1MURCR8DGPT:32");
    // Inferno alone: one HP loss a turn x 2 = +2; the two self-damage cards add their share of the plays.
    expect(deck.ruptureRate).toBeGreaterThanOrEqual(2);
    expect(deck.ruptureRate).toBeLessThan(3);
    expect(deck.growth.join("; ")).toMatch(/Rupture \+2 per HP loss, fed by Inferno each turn \+ 2 self-damage cards/);
  });

  it("Inferno's hit to all per HP loss is in the estimate (S1MU F33 Inferno+ 9; F48 two Infernos stack to 18, Crimson Mantle adds a loss a turn)", () => {
    const kd = deckOf("S1MURCR8DGPT:32").deck;
    expect(kd.passiveAoe).toBeGreaterThanOrEqual(9);
    const aeon = deckOf("S1MURCR8DGPT:47").deck;
    // Two turn-start losses (Inferno, Crimson Mantle) x 18, plus the four self-damage cards' share.
    expect(aeon.passiveAoe).toBeGreaterThanOrEqual(36);
    expect(aeon.ruptureRate).toBeGreaterThanOrEqual(4);
    expect((aeon.passive ?? []).join("; ")).toMatch(/Inferno 18 to all per HP loss/);
  });

  it("Juggernaut's damage per block gained is in the estimate (5HHL)", () => {
    const { deck } = deckOf("5HHLMV2DZ5AZ:32");
    // 7 block cards of 24 and Crimson Mantle's block each turn: ~2.4 gains a turn x 6.
    expect(deck.passiveDamage).toBeGreaterThan(10);
    expect(deck.passiveAoe).toBe(0);
    expect((deck.passive ?? []).join("; ")).toMatch(/Juggernaut 6 per block gain/);
  });

  it("the calibrated estimates at 8 turns move toward the realised damage and stay under it (calibration unchanged)", () => {
    // Before (v3 8b24187): 21 / 21 / 23 / 36; realised 51.0 / 76.4 / 41.7 / 57.3 a turn.
    const at8 = (key: string) => {
      const { deck, boss } = deckOf(key);
      return deckEstimate(deck, boss, 8);
    };
    expect(at8("S1MURCR8DGPT:32")).toBeGreaterThanOrEqual(28);
    expect(at8("S1MURCR8DGPT:32")).toBeLessThan(51);
    expect(at8("S1MURCR8DGPT:47")).toBeGreaterThanOrEqual(35);
    expect(at8("S1MURCR8DGPT:47")).toBeLessThan(76);
    expect(at8("5HHLMV2DZ5AZ:32")).toBeGreaterThanOrEqual(27);
    expect(at8("5HHLMV2DZ5AZ:32")).toBeLessThan(42);
    expect(at8("5HHLMV2DZ5AZ:47")).toBeGreaterThanOrEqual(39);
    expect(at8("5HHLMV2DZ5AZ:47")).toBeLessThan(57);
  });
});

describe("choosePlan: an empty reply takes the plan its reasoning drafted, else asks once more (MZFV F24 shop: 10,661 tokens all reasoning)", () => {
  let server: TestServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });
  type Reply = { content: string; reasoning: string; tokens?: number };
  const serve = async (replies: Reply[]) => {
    const calls = { n: 0 };
    server = await startTestServer((req, res) => {
      req.on("data", () => undefined);
      req.on("end", () => {
        const reply = replies[Math.min(calls.n, replies.length - 1)]!;
        calls.n += 1;
        const tokens = reply.tokens ?? 100;
        sendJson(res, 200, {
          choices: [{ message: { content: reply.content, reasoning_content: reply.reasoning }, finish_reason: "stop" }],
          usage: { prompt_tokens: 1000, completion_tokens: tokens, completion_tokens_details: { reasoning_tokens: reply.content ? tokens - 10 : tokens } },
        });
      });
    });
    return calls;
  };
  const f24 = fixture<{ raw_reply: string; reasoning_tail: string; options: string[]; usage: { output_tokens: number } }>("mzfv-f24-shop-plan-empty.json");
  const criteria = Object.fromEntries(f24.options.map((key) => [key, null]));
  // The screen's check stands in: a plan list of offered keys.
  const valid = (json: Record<string, unknown>) => Array.isArray(json["plan"]) && (json["plan"] as unknown[]).every((key) => typeof key === "string" && key in criteria);
  const client = (log = "") => new DeepSeekClient({ apiKey: "k", baseUrl: server!.url, model: "m", timeoutMs: 5000, reasoningLog: log });

  it("the logged empty reply: the plan at the end of its reasoning is taken, in one call, and the log row says why", async () => {
    expect(f24.raw_reply).toBe("");
    const calls = await serve([{ content: "", reasoning: f24.reasoning_tail, tokens: f24.usage.output_tokens }]);
    const log = join(mkdtempSync(join(tmpdir(), "batch-n-")), "reasoning.jsonl");
    const answer = await client(log).choosePlan({}, "Plan the shop.", criteria, { label: "shop/plan" }, valid);
    expect(calls.n).toBe(1);
    expect(answer.json["plan"]).toEqual(["buy_card3"]);
    expect(answer.recovered).toBe(true);
    expect(answer.note).toMatch(/empty reply \(finish_reason stop; all 10661 output tokens were reasoning\): the answer taken from the end of its reasoning/);
    const rows = readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ label: "shop/plan", choice: '["buy_card3"]', answer: { recovered_from_reasoning: true, empty_reply: expect.stringMatching(/^empty reply/), plan: ["buy_card3"] } });
  });

  it("a drafted plan that fails the check is not taken: asked once more, and the second reply is used", async () => {
    const calls = await serve([
      { content: "", reasoning: 'Final: {"plan": ["buy_everything"], "reason": "?"}' },
      { content: '{"plan": ["buy_card3"], "reason": "block"}', reasoning: "again" },
    ]);
    const answer = await client().choosePlan({}, "Plan the shop.", criteria, { label: "shop/plan" }, valid);
    expect(calls.n).toBe(2);
    expect(answer.json["plan"]).toEqual(["buy_card3"]);
    expect(answer.recovered).toBeUndefined();
    expect(answer.note).toMatch(/^first empty reply .*: asked once more$/);
    expect(answer.meta.inputTokens).toBe(2000);
  });

  it("empty twice with nothing drafted: an answer error (the screen goes step by step)", async () => {
    const calls = await serve([{ content: "", reasoning: "thinking, no plan" }]);
    await expect(client().choosePlan({}, "Plan the shop.", criteria, { label: "shop/plan" }, valid)).rejects.toThrow(DeepSeekAnswerError);
    expect(calls.n).toBe(2);
  });

  describe("in the loop, the shop screen's own check decides what is recovered", () => {
    setupOneshotTests();
    const SHOP = "u6ru-f22-shop";

    it("empty reply, plan drafted in the reasoning: bought as planned with one call, the row marked recovered", { timeout: 30_000 }, async () => {
      const { client: scripted, bodies } = await scriptedDeepSeek([{ content: "", reasoning: 'Leave? No. Final: {"plan": ["buy_card3", "buy_card4"], "reason": "block"}' }]);
      const { stats, actions, records } = await play([board(SHOP, "open"), board(SHOP, "after_card3"), mainMenuPayload()], scripted);
      expect(bodies).toHaveLength(1);
      expect(stats.deepseekCalls).toBe(1);
      expect(actions.slice(0, 2)).toEqual([{ action: "buy_card", option_index: 3 }, { action: "buy_card", option_index: 4 }]);
      expect(records.find((row) => row["label"] === "shop/plan")).toMatchObject({
        deepseek: { plan: ["buy_card3", "buy_card4", "leave"], recovered_from_reasoning: expect.stringMatching(/empty reply/), note: expect.stringMatching(/the answer taken from the end of its reasoning/) },
      });
    });
  });
});

describe("fight plan: askJson checks the reply is a fight plan (batch M left its empty-reply retry without a format check)", () => {
  it("a {choice, reason} echo or an empty object is no fight plan; any of the plan's fields is", () => {
    expect(isFightPlanReply({ choice: "card1", reason: "x" })).toBe(false);
    expect(isFightPlanReply({})).toBe(false);
    expect(isFightPlanReply({ approach: "sprint" })).toBe(false);
    expect(isFightPlanReply({ approach: "Setup" })).toBe(true);
    expect(isFightPlanReply({ setup_cards: [] })).toBe(true);
    expect(isFightPlanReply({ summary: "Inflame first" })).toBe(true);
    expect(isFightPlanReply({ potions: { FIRE_POTION: "save" } })).toBe(true);
  });

  describe("in the loop (FIGHT_PLAN=v1)", () => {
    setupOneshotTests();
    const bossBoard = (): Raw => {
      const raw = combatPayload();
      raw["turn"] = 1;
      const combat = raw["combat"] as Raw;
      const enemies = combat["enemies"] as Raw[];
      combat["enemies"] = [{ ...enemies[0], enemy_id: "LAGAVULIN_MATRIARCH", name: "Lagavulin Matriarch", current_hp: 222, max_hp: 222 }];
      return raw;
    };
    const DRAFT = '{"approach": "setup", "setup_cards": [], "focus_enemy": "", "potions": {}, "key_turns": "T3 big hit", "summary": "set up, then race"}';

    it("an echo reply takes the plan its reasoning drafted (was parsed into a blank race plan)", { timeout: 30_000 }, async () => {
      const log = join(mkdtempSync(join(tmpdir(), "batch-n-fp-")), "fight-plans.jsonl");
      const { client: scripted } = await scriptedDeepSeek([{ content: '{"choice": "end_turn", "reason": "fight plan"}', reasoning: `Plan: ${DRAFT}` }]);
      await play([bossBoard(), mainMenuPayload()], scripted, { fightPlan: "v1", fightPlanLog: log });
      const rows = readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Raw);
      expect(rows[0]).toMatchObject({ kind: "boss", recovered_from_reasoning: true, plan: { approach: "setup", keyTurns: "T3 big hit", summary: "set up, then race" } });
    });

    it("an empty reply takes the plan its reasoning drafted in one call", { timeout: 30_000 }, async () => {
      const log = join(mkdtempSync(join(tmpdir(), "batch-n-fp-")), "fight-plans.jsonl");
      const { client: scripted, bodies } = await scriptedDeepSeek([{ content: "", reasoning: `Plan: ${DRAFT}` }]);
      await play([bossBoard(), mainMenuPayload()], scripted, { fightPlan: "v1", fightPlanLog: log });
      const rows = readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Raw);
      expect(rows[0]).toMatchObject({ recovered_from_reasoning: true, note: expect.stringMatching(/empty reply/), plan: { approach: "setup" } });
      const fightPlanCalls = bodies.filter((body) => String(((body["messages"] as Raw[])[1] as Raw)["content"]).includes("TASK: fight plan"));
      expect(fightPlanCalls).toHaveLength(1);
    });
  });
});

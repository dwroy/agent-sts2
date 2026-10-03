/**
 * Fix batch N (post-mortems MZFV S1MU 5HHL, the A8 window's runs 12-14; the leftovers of batch M). Fixtures in
 * tests/logged-states/batch-n/.
 */

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { DeepSeekAnswerError, DeepSeekClient } from "../src/llm/deepseek.js";
import { parseGameState } from "../src/mod/schema.js";
import { endTurnLethalNote, guardedText, hpGuardNote, planCombatTurn } from "../src/screens/combat-plan.js";
import { deckEstimate, deckProfileForBoss } from "../src/strategy/boss-clock.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { isFightPlanReply } from "../src/strategy/fight-plan.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { passivePiecesOptions } from "../src/strategy/passive-pieces.js";
import { rolloutDecision, type EnemyTable, type RolloutInput } from "../src/strategy/rollout.js";
import { MUSIC_BOX_INDEX, solveTurn, type EnemySim, type Plan, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv } from "./logged.js";
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

describe("\"ending now kills\" note names the HP the held cards take straight off (5HHL F17 T7: two Beckons, 12 of the 37 unnamed)", () => {
  afterEach(() => {
    rolloutLiveOptions.enabled = true;
    passivePiecesOptions.enabled = true;
  });
  const card = (index: number, cardId: string, name: string, overrides: Partial<CardModel> = {}): CardModel => ({
    index, key: `c${index}`, cardId, name, type: "Status", upgraded: false, cost: -1, xCost: false, playable: false, target: "none", validTargets: [],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
    draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...overrides,
  });
  const enemy: EnemySim = { index: 0, name: "Soul Fysh", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] };
  const player: PlayerSim = { hp: 40, maxHp: 80, block: 0, energy: 1, weak: false, vulnerable: false, intangible: false };

  it("the logged board: \"37 HP lost in all, 25 of it the enemy hits after block, 12 HP lost to cards held (呼唤 ×2)\"", { timeout: 30_000 }, () => {
    rolloutLiveOptions.enabled = false;
    // The logged numbers are the planner's without PASSIVE_PIECES: the run holds Ripple Basin, whose 4 block on a turn
    // with no Attack now makes the Attack-free line 4 cheaper and the HP guard play it instead of Jev's pick.
    passivePiecesOptions.enabled = false;
    const fx = logged("batch-n/5hhl-f17-t7-beckon");
    expect(fx.decision.rationale).toMatch(/37 HP lost in all, 25 of it the enemy hits after block\]/);
    const decision = planCombatTurn(loggedEnv(fx)) as unknown as { kind: string; resolve?: (answers: AnswerSet) => { rationale: string }; questions?: Record<string, { type: string; criteria: Record<string, string> }> };
    const question = Object.values(decision.questions ?? {})[0]!;
    const key = Object.keys(question.criteria).find((k) => k.startsWith("plan"))!;
    const resolved = decision.resolve!({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } } as AnswerSet);
    expect(resolved.rationale).toContain("[ending now kills by what the mod's lethal flag does not count: 37 HP lost in all, 25 of it the enemy hits after block, 12 HP lost to cards held (呼唤 ×2)]");
  });

  it("solver: the held HP loss by name and count, apart from held damage", () => {
    const beckon = (i: number) => card(i, "BECKON", "呼唤", { heldPenalty: 6, heldHpLoss: 6 });
    const burn = card(2, "BURN", "灼伤", { heldPenalty: 2 });
    const out = solveTurn({ hand: [beckon(0), beckon(1), burn], player, enemies: [enemy], fightKind: "boss" });
    const end = out.plans.find((plan) => plan.steps.length === 0)!;
    expect(end.outcome.heldHpLoss).toBe(12);
    expect(end.outcome.heldHpLossFrom).toEqual(["呼唤 ×2"]);
    expect(end.outcome.heldDamage).toBe(2);
    expect(end.outcome.heldDamageFrom).toEqual(["灼伤"]);
    expect(endTurnLethalNote({ ...end, outcome: { ...end.outcome, dies: true } }, false, 40)).toBe(
      ` [ending now kills by what the mod's lethal flag does not count: ${end.outcome.hpLoss} HP lost in all, 0 of it the enemy hits after block, 2 damage from cards held (灼伤), 12 HP lost to cards held (呼唤 ×2)]`,
    );
  });
});

describe("HP guard texts: a heal reads \"hp +8\", not \"loses -8 HP\" (batch M's leftover, as 5e19d7a)", () => {
  const line = (hpLoss: number, name: string): Plan =>
    ({ steps: [{ cardIndex: 0, cardId: name, name, target: null }], outcome: { hpLoss, damageDealt: 7 }, score: 0 }) as unknown as Plan;

  it("code's own line over the bound, and the guard's replacement of a pick", () => {
    const healing = line(-8, "Reaper");
    const block = line(-20, "Feed");
    expect(guardedText(healing, block)).toMatch(/^code plan .* \(hp \+8\) is over the HP guard bound; playing .* instead \(hp \+20, dmg 7\)$/);
    expect(guardedText(line(12, "Strike"), line(3, "Defend"))).toMatch(/\(hp -12\) is over the HP guard bound; .* \(hp -3, dmg 7\)$/);
    const note = hpGuardNote(2, healing, 8, 1, block);
    expect(note).toMatch(/^; HP guard: plan 2 \(.*; hp \+8\) is more than 8 HP over the cheapest line, playing plan 1 \(.*; hp \+20\) instead$/);
    for (const text of [guardedText(healing, block), note]) expect(text).not.toMatch(/loses -|hp --/);
  });
});

describe("rollout: a played Music Box copy goes to the discard pile and is drawn again (batch M's leftover; YVYZ F48 T7 drew back the T5 copy)", () => {
  const card = (index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel => ({
    index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
    draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...overrides,
  });
  // One Strike, nothing else: every turn draws what the discard pile holds. A dummy that never attacks.
  const scenario = (): RolloutInput => {
    const hand = [card(0, "STRIKE_IRONCLAD", { damage: 6 })];
    const player: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, musicBox: { count: 0 } };
    const enemy: EnemySim = { index: 0, name: "Dummy", hp: 999, maxHp: 999, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] };
    const solver: SolverInput = { hand, player, enemies: [enemy], fightKind: "monster", turn: 1 };
    const table: EnemyTable = { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } };
    return {
      solver,
      plans: solveTurn(solver).plans,
      enemies: [{ index: 0, id: "DUMMY", move: "WAIT", strength: 0, powers: {} }],
      tables: { DUMMY: table },
      piles: { draw: [], discard: [], handBase: hand },
      meta: { act: 1, t: 1, asc: 8, kind: "hallway", enc: "DUMMY", deck: { n: 1, atk: 1, skl: 0, pow: 0, junk: 0, dmg: 6, blk: 0, up: 0 }, relics: 1, max_en: 3 },
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 7, horizon: 3, now: (() => { let t = 0; return () => (t += 0.01); })() },
    };
  };

  it("Strike + its copy on T1; T2 draws both back (Strike, copy, and a new copy: 18), T3 likewise: 12 + 18 + 18", () => {
    const result = rolloutDecision(scenario());
    const both = result.lines.find((line) => line.plan.steps.map((step) => step.cardIndex).join(",") === `0,${MUSIC_BOX_INDEX}`)!;
    expect(both).toBeDefined();
    expect(both.plan.outcome.damageDealt).toBe(12);
    // Without the copy back in the pile the later turns hold one Strike: 12 + 12 + 12 (enemy at 963).
    expect(both.enemyHpLeft).toBe(999 - 12 - 18 - 18);
  });
});

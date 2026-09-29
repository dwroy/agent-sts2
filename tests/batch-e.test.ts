/**
 * Fix batch E (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states), never the refreshing knowledge files.
 */

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import { DeepSeekAnswerError, DeepSeekClient } from "../src/llm/deepseek.js";
import { noteScreenChange } from "../src/loop.js";
import { parseGameState } from "../src/mod/schema.js";
import { givesPotion, planEvent } from "../src/screens/event.js";
import { planMap, restedFraction } from "../src/screens/map.js";
import { setRoomCostsForTests } from "../src/knowledge/room-costs.js";
import { NO_REST_RELICS, restHealOf } from "../src/strategy/route-projection.js";
import { board as oneshotBoard, env as oneshotEnv } from "./oneshot-support.js";
import type { AskDecision } from "../src/project/types.js";

import { distinctNames, enemySims, killGroups, planCombatTurn } from "../src/screens/combat-plan.js";
import { modelHandCard, type CardModel } from "../src/strategy/card-model.js";
import { killOrders, rolloutDecision, type EnemyTable, type FightMeta } from "../src/strategy/rollout.js";
import { ROLLOUT_BUDGET_MS, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { isRunPlanReply } from "../src/strategy/run-plan.js";
import { solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import { combatOf, logged, loggedEnv, loggedKnowledge } from "./logged.js";
import { sendJson, startTestServer, type TestServer } from "./support.js";

type Raw = Record<string, unknown>;

afterEach(() => {
  rolloutLiveOptions.enabled = true;
});

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index,
    key: `c${index}`,
    cardId,
    name: cardId,
    type: "Attack",
    upgraded: false,
    cost: 1,
    xCost: false,
    playable: true,
    target: "single",
    validTargets: [0],
    damage: null,
    hits: 1,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: false,
    special: null,
    known: true,
    flatValue: 0,
    heldPenalty: 0,
    text: "",
    ...overrides,
  };
}

const META: FightMeta = {
  act: 1,
  t: 1,
  asc: 8,
  kind: "hallway",
  enc: "TEST_DUMMY",
  deck: { n: 2, atk: 2, skl: 0, pow: 0, junk: 0, dmg: 10, blk: 0, up: 0 },
  relics: 0,
  max_en: 3,
};

describe("1. Thrash hits for its printed number; the absorbed damage is for its later plays (3SBPKG9603WD)", () => {
  it("3SBP F12 T2: Bash+, Thrash(4) with a Strike in hand is no lethal on Byrdonis at 39 (it lived at 17)", () => {
    const fx = logged("3sbp-f12-t2-thrash");
    const combat = combatOf(fx);
    const hand = (combat["hand"] as Raw[]).map((raw, i) => modelHandCard(raw, i, loggedKnowledge));
    const raw = combat["player"] as Raw;
    const player: PlayerSim = { hp: Number(raw["current_hp"]), maxHp: Number(raw["max_hp"]), block: 0, energy: Number(raw["energy"]), weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
    const enemies = enemySims(combat);
    const solved = solveTurn({ hand, player, enemies, fightKind: "elite" });
    const line = solved.plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === "BASH,THRASH");
    // Logged: 39 -> 29 (Bash+ 10) -> 17 (Thrash 2 x 4, x1.5 into Vulnerable).
    expect(line?.outcome.damageDealt).toBe(22);
    expect(line?.outcome.winsFight).toBe(false);
    expect(line?.outcome.thrashGrowth).toEqual([{ index: hand.find((c) => c.cardId === "THRASH")!.index, amount: 6 }]);
    expect(solved.plans.some((plan) => plan.outcome.winsFight)).toBe(false);
    rolloutLiveOptions.enabled = false;
    expect(planCombatTurn(loggedEnv(fx))?.label).not.toBe("combat/lethal");
  });

  it("the rollout carries the growth: the Thrash back from the discard pile hits for 4 + 6", () => {
    const thrash = card(0, "THRASH", { damage: 4, damageBase: 4, hits: 2, special: "thrash" });
    const strike = card(1, "STRIKE_IRONCLAD", { damage: 6, damageBase: 6 });
    const player: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 1, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
    // 28 HP: Thrash 8 now, then 2 x 10 next turn is the kill; at a flat 4 it takes four turns.
    const dummy: EnemySim = { index: 0, name: "Dummy", hp: 28, maxHp: 28, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] };
    const solver: SolverInput = { hand: [thrash, strike], player, enemies: [dummy], fightKind: "monster", turn: 1 };
    const plans = solveTurn(solver).plans;
    const table: EnemyTable = { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } };
    const result = rolloutDecision({
      solver,
      plans,
      enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
      tables: { TEST_DUMMY: table },
      piles: { draw: [], discard: [], handBase: [thrash, strike] },
      meta: META,
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 3, now: (() => { let t = 0; return () => (t += 0.01); })() },
    });
    const line = result.lines.find((entry) => entry.plan.steps.map((step) => step.cardId).join(",") === "THRASH");
    expect(line?.winProb).toBe(1);
    expect(line?.turnsToWin).toBe(2);
  });
});

describe("2. A run-plan reply that only echoes {choice, reason} never replaces the plan (9GRPA F9, F25)", () => {
  let server: TestServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });

  async function replying(content: string, reasoning: string): Promise<{ client: DeepSeekClient; rows: () => Record<string, unknown>[] }> {
    server = await startTestServer((req, res) => {
      req.on("data", () => undefined);
      req.on("end", () => sendJson(res, 200, { choices: [{ message: { content, reasoning_content: reasoning } }], usage: { prompt_tokens: 900, completion_tokens: 200 } }));
    });
    const log = join(mkdtempSync(join(tmpdir(), "ds-run-plan-")), "reasoning.jsonl");
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000, reasoningEffort: "max", reasoningLog: log });
    return { client, rows: () => readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>) };
  }

  // F25's reasoning (cut): it drafted the whole plan, then replied {"choice": null, "reason": null}.
  const F25_REASONING = [
    "Mention elite skip.",
    "",
    "Let me now write JSON:",
    "",
    '{\n "archetype": "Permanent Strength + big single-target hits; light block",\n "want": ["DEMON_FORM","INFLAME","BLUDGEON","THRASH","UPPERCUT","SHRUG_IT_OFF"],\n "avoid": ["HAVOC","CINDER"],\n "remove": [],\n "block_target": 6,\n "elites": "avoid",\n "rest": "auto",\n "boss_prep": "Enter ≥75% with 1–2 potions",\n "summary": "Gap ~24/turn (27 vs 51): take Demon Form/Inflame"\n}',
    "",
    'Count summary words: Gap(1) ... The wrapper says {"choice": ..., "reason": ...} but the task overrides it.',
  ].join("\n");

  it("isRunPlanReply: the echoes are not plans; any plan field is", () => {
    expect(isRunPlanReply({ choice: "review", reason: "n/a" })).toBe(false);
    expect(isRunPlanReply({ choice: null, reason: null })).toBe(false);
    expect(isRunPlanReply({ archetype: "", summary: " " })).toBe(false);
    expect(isRunPlanReply({ archetype: "Strength" })).toBe(true);
    expect(isRunPlanReply({ want: [] })).toBe(true);
  });

  it("F25: the echo is replaced by the plan its reasoning drafted (the last one), and the row says so", async () => {
    const { client, rows } = await replying('{"choice": null, "reason": null}', F25_REASONING);
    const reply = await client.askJson({ task: "Write the run plan." }, "run-plan", isRunPlanReply);
    expect(reply.recovered).toBe(true);
    expect(reply.json).toMatchObject({ archetype: "Permanent Strength + big single-target hits; light block", elites: "avoid", block_target: 6 });
    expect(rows()[0]).toMatchObject({ label: "run-plan", answer: expect.objectContaining({ recovered_from_reasoning: true }) });
  });

  it("F9: no draft in the reasoning: an error (the caller keeps the plan in force), with a log row", async () => {
    const { client, rows } = await replying('{"choice": "review", "reason": "n/a"}', "Decision: avoid. Final JSON.");
    const error = await client.askJson({ task: "Write the run plan." }, "run-plan", isRunPlanReply).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DeepSeekAnswerError);
    expect(rows()[0]).toMatchObject({ label: "run-plan", parse_error: expect.stringMatching(/not in the task's format/) });
  });
});

const choose = (key: string, confidence: number): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;

function planCriteria(decision: ReturnType<typeof planCombatTurn>): Record<string, string> {
  if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind} ${decision?.kind === "act" ? decision.label : ""}`);
  const question = decision.questions["plan"];
  if (question?.type !== "choice") throw new Error("expected a plan choice");
  return Object.fromEntries(Object.entries(question.criteria ?? {}).map(([key, text]) => [key, String(text)]));
}

describe("3. A card choice mid-turn pauses the chosen line; back in combat it goes on (2MK4V7V3Q5BM F8 T2)", () => {
  /** Jev's logged line "Headbutt, Defend, Defend" chosen on the ask board; the memory after its first step. */
  function afterHeadbutt() {
    rolloutLiveOptions.enabled = false;
    const ask = loggedEnv(logged("2mk4-f8-t2-ask"));
    const criteria = planCriteria(planCombatTurn(ask));
    const chosen = Object.entries(criteria).find(([key, text]) => key.startsWith("plan") && /"plays":"头槌 -> 方柱构装体, then 防御, then 防御"/.test(text));
    if (!chosen) throw new Error("the logged line is not offered");
    const first = (planCombatTurn(ask) as AskDecision).resolve(choose(chosen[0], 0.98));
    first.apply?.();
    expect(first.intent).toMatchObject({ action: "play_card" });
    return ask.screenMemory;
  }

  it("Headbutt's pick (hand unchanged): back on the combat screen the next step is played, Jev is not re-asked", () => {
    const memory = afterHeadbutt();
    noteScreenChange(memory, parseGameState(logged("2mk4-f8-t2-pick").state));
    expect(memory.combatPlan).toBeNull();
    const back = logged("2mk4-f8-t2-back");
    // Logged: re-asked here, Jev took "Strike, Defend" (11 -> 6 HP).
    expect(back.decision.label).toBe("combat/plan-choice");
    noteScreenChange(memory, parseGameState(back.state));
    const decision = planCombatTurn({ ...loggedEnv(back), screenMemory: memory });
    expect(decision?.kind).toBe("act");
    expect(decision?.label).toBe("combat/plan-continue");
    expect(decision?.kind === "act" ? decision.rationale : "").toMatch(/Jev-chosen plan: 防御/);
  });

  it("a pick that exhausted a card the line does not play (True Grit+): the line goes on; one it plays: re-planned", () => {
    const memory = afterHeadbutt();
    noteScreenChange(memory, parseGameState(logged("2mk4-f8-t2-pick").state));
    const back = logged("2mk4-f8-t2-back");
    const combat = back.state["combat"] as Raw;
    const hand = combat["hand"] as Raw[];
    // The Strike (not in the line) exhausted by the pick.
    combat["hand"] = hand.filter((card) => card["card_id"] !== "STRIKE_IRONCLAD").map((card, index) => ({ ...card, index }));
    noteScreenChange(memory, parseGameState(back.state));
    expect(planCombatTurn({ ...loggedEnv(back), screenMemory: memory })?.label).toBe("combat/plan-continue");

    const memory2 = afterHeadbutt();
    noteScreenChange(memory2, parseGameState(logged("2mk4-f8-t2-pick").state));
    const back2 = logged("2mk4-f8-t2-back");
    const combat2 = back2.state["combat"] as Raw;
    const hand2 = combat2["hand"] as Raw[];
    // Both Defends gone: the line cannot go on.
    combat2["hand"] = hand2.filter((card) => card["card_id"] !== "DEFEND_IRONCLAD").map((card, index) => ({ ...card, index }));
    noteScreenChange(memory2, parseGameState(back2.state));
    expect(planCombatTurn({ ...loggedEnv(back2), screenMemory: memory2 })?.label).not.toBe("combat/plan-continue");
  });

  it("a new turn does not resume the paused line", () => {
    const memory = afterHeadbutt();
    noteScreenChange(memory, parseGameState(logged("2mk4-f8-t2-pick").state));
    const back = logged("2mk4-f8-t2-back");
    back.state["turn"] = Number(back.state["turn"]) + 1;
    noteScreenChange(memory, parseGameState(back.state));
    expect(memory.combatPlan).toBeNull();
  });
});

describe("4. Same-named enemies with different ids are told apart in options and kill orders (KYC0RYEN0NVW F28)", () => {
  it("distinctNames: the id part they do not share; the board order for the same id; a unique name as it is", () => {
    expect(distinctNames([
      { name: "残杀千足虫", id: "DECIMILLIPEDE_SEGMENT_FRONT" },
      { name: "残杀千足虫", id: "DECIMILLIPEDE_SEGMENT_MIDDLE" },
      { name: "残杀千足虫", id: "DECIMILLIPEDE_SEGMENT_BACK" },
    ])).toEqual(["残杀千足虫 (FRONT)", "残杀千足虫 (MIDDLE)", "残杀千足虫 (BACK)"]);
    expect(distinctNames([{ name: "Louse", id: "LOUSE" }, { name: "Louse", id: "LOUSE" }, { name: "Jaw Worm", id: "JAW_WORM" }])).toEqual(["Louse #1", "Louse #2", "Jaw Worm"]);
  });

  it("the logged T2 board: every option reads differently, the enemy list uses the same names, six distinct kill orders", () => {
    rolloutLiveOptions.enabled = false;
    const fx = logged("kyc0-f28-t2-decimillipede");
    const combat = combatOf(fx);
    const sims = enemySims(combat);
    expect(sims.map((enemy) => enemy.name)).toEqual(["残杀千足虫 (FRONT)", "残杀千足虫 (MIDDLE)", "残杀千足虫 (BACK)"]);
    const decision = planCombatTurn(loggedEnv(fx)) as AskDecision;
    expect(decision.kind).toBe("ask");
    const question = decision.questions["plan"]!;
    const lines = Object.entries(question.type === "choice" ? question.criteria ?? {} : {})
      .filter(([key]) => key.startsWith("plan"))
      .map(([, text]) => String((JSON.parse(String(text)) as Raw)["plays"]));
    expect(lines.length).toBeGreaterThan(1);
    expect(new Set(lines).size).toBe(lines.length);
    const shown = (decision.state["enemies"] as Raw[]).map((enemy) => enemy["name"]);
    expect(shown).toEqual(["残杀千足虫 (FRONT)", "残杀千足虫 (MIDDLE)", "残杀千足虫 (BACK)"]);
    const orders = killOrders(killGroups(combat, sims)).orders.map((order) => order.label);
    expect(orders).toHaveLength(6);
    expect(new Set(orders).size).toBe(6);
    expect(orders).toContain("残杀千足虫 (BACK) > 残杀千足虫 (MIDDLE) > 残杀千足虫 (FRONT)");
  });
});

describe("5. A full potion belt at an event that gives a potion: \"discard one, then take it\" is an option, the decider picks (YQL8D59999AX F28)", () => {
  const pick = (key: string): AnswerSet => ({ pick: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;

  it("givesPotion reads the option text", () => {
    expect(givesPotion("获得[blue]1[/blue]瓶随机[gold]罕见药水[/gold]。")).toBe(true);
    expect(givesPotion("获得[blue]3[/blue]瓶[gold]污浊药水[/gold]。")).toBe(true);
    expect(givesPotion("失去[red]13[/red]点最大生命。")).toBe(false);
  });

  it("the logged Potion Courier: each option also offered after discarding either potion; the plain one says the potion is lost", () => {
    const fx = logged("yql8-f28-potion-courier");
    const env = { ...loggedEnv(fx), buildDecider: "deepseek" as const };
    const decision = planEvent(env) as AskDecision;
    expect(decision.kind).toBe("ask");
    const question = decision.questions["pick"]!;
    const criteria = question.type === "choice" ? question.criteria ?? {} : {};
    // 拿走这批药水 gives 3 into a full 2-slot belt: either potion or both (batch F); 洗劫 gives 1: either.
    expect(Object.keys(criteria).sort()).toEqual(["o0", "o0:d0", "o0:d0+1", "o0:d1", "o1", "o1:d0", "o1:d1"]);
    expect(JSON.parse(String(criteria["o1"]))).toMatchObject({ potion_slots: expect.stringMatching(/lost/) });
    expect(JSON.parse(String(criteria["o1:d1"]))).toMatchObject({ option: "洗劫", discard_first: expect.stringMatching(/攻击药水/) });
    // DeepSeek takes "discard the Attack Potion, then 洗劫": the discard now, the option next.
    const resolved = decision.resolve(pick("o1:d1"));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 1 });
    resolved.apply?.();
    const potions = ((fx.state["run"] as Raw)["potions"] as Raw[]);
    potions[1] = { index: 1, occupied: false, can_discard: false };
    const next = planEvent({ ...loggedEnv(fx), buildDecider: "deepseek", screenMemory: env.screenMemory });
    expect(next).toMatchObject({ kind: "act", label: "event/after-discard", intent: { action: "choose_event_option", option_index: 1 } });
    // Done once: the next frame asks as usual (洗劫's one potion fits; 拿走这批药水's 3 still need a second slot).
    const again = planEvent({ ...loggedEnv(fx), buildDecider: "deepseek", screenMemory: env.screenMemory }) as AskDecision;
    expect(again.kind).toBe("ask");
    const againQ = again.questions["pick"]!;
    expect(Object.keys(againQ.type === "choice" ? againQ.criteria ?? {} : {}).sort()).toEqual(["o0", "o0:d0", "o1"]);
  });
});

describe("6. A card exhausted earlier this turn is read from the exhaust pile, not a field the state never sends (0NZBAVFAT3JG F25 T1)", () => {
  it("after Brand's exhaust, the re-asked options count Evil Eye's extra Block (\"Evil Eye, Juggernaut\" was shown -12)", () => {
    rolloutLiveOptions.enabled = false;
    // The turn's first frame (Jev chose Brand, Evil Eye, Juggernaut), then the frame after Brand's pick.
    const first = loggedEnv(logged("0nzb-f25-t1-brand"));
    planCombatTurn(first);
    const after = logged("0nzb-f25-t1-after-exhaust");
    expect((after.state["combat"] as Raw)["player"]).not.toHaveProperty("cards_exhausted_this_turn");
    const criteria = planCriteria(planCombatTurn({ ...loggedEnv(after), screenMemory: first.screenMemory }));
    const line = Object.values(criteria).map((text) => JSON.parse(text) as Raw).find((entry) => entry["plays"] === "邪眼, then 势不可当");
    expect(line).toMatchObject({ block_gained: 32, hp_lost: 0 });
    // Seen alone (no earlier frame of this turn), the pile it starts with is the baseline: no bonus assumed.
    const alone = planCriteria(planCombatTurn(loggedEnv(logged("0nzb-f25-t1-after-exhaust"))));
    expect(Object.values(alone).map((text) => JSON.parse(text) as Raw).find((entry) => entry["plays"] === "邪眼, then 势不可当")).toMatchObject({ block_gained: 16 });
  });
});

describe("7. Ethereal cards left in hand are exhausted at the end of the turn: Feel No Pain's Block (7KDMKN16GD6B F27 T5)", () => {
  it("three Dazed held with Feel No Pain 3: Strike, Defend costs 7 (logged 40 -> 33), not 16", () => {
    rolloutLiveOptions.enabled = false;
    const fx = logged("7kdm-f27-t5-dazed");
    // Logged: "code plan (only distinct line): 打击 -> 蜂群术士, 防御; hp -16, dmg 6"; the turn cost 7.
    expect(fx.decision.rationale).toMatch(/hp -16/);
    const criteria = planCriteria(planCombatTurn(loggedEnv(fx)));
    const line = Object.values(criteria).map((text) => JSON.parse(text) as Raw).find((entry) => entry["plays"] === "打击 -> 蜂群术士, then 防御");
    expect(line).toMatchObject({ hp_lost: 7, block_gained: 14 });
  });

  it("the card model reads Ethereal; the rollout does not put the held Dazed back into the discard pile", () => {
    const fx = logged("7kdm-f27-t5-dazed");
    const hand = (combatOf(fx)["hand"] as Raw[]).map((raw, i) => modelHandCard(raw, i, loggedKnowledge));
    expect(hand.filter((c) => c.ethereal).map((c) => c.cardId)).toEqual(["DAZED", "DAZED", "DAZED"]);
    // Two Dazed and nothing to play: the turn ends with both in hand; the dummy never attacks. Next turn the discard
    // pile is shuffled in and 5 cards drawn: exhausted, the Dazed leave the five that hold both Strikes (a kill);
    // put back, 5 of 7 cards are drawn and some samples miss a Strike.
    const dazed = (i: number) => card(i, "DAZED", { type: "Status", playable: false, target: "none" as CardModel["target"], validTargets: [], ethereal: true });
    const strike = (i: number) => card(i, "STRIKE_IRONCLAD", { damage: 6, damageBase: 6 });
    const defend = (i: number) => card(i, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], block: 5 });
    const player: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 0, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
    const dummy: EnemySim = { index: 0, name: "Dummy", hp: 12, maxHp: 12, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] };
    const solver: SolverInput = { hand: [dazed(0), dazed(1)], player, enemies: [dummy], fightKind: "monster", turn: 1 };
    const table: EnemyTable = { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } };
    const result = rolloutDecision({
      solver,
      plans: solveTurn(solver).plans,
      enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
      tables: { TEST_DUMMY: table },
      piles: { draw: [], discard: [strike(10), strike(11), defend(12), defend(13), defend(14)], handBase: [dazed(0), dazed(1)] },
      meta: META,
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 5, now: (() => { let t = 0; return () => (t += 0.01); })() },
    });
    // Turn 1 draws both Strikes (12 damage): the fight ends on the first later turn in every sample.
    expect(result.lines[0]?.samples).toBeGreaterThan(1);
    expect(result.lines[0]?.winProb).toBe(1);
    expect(result.lines[0]?.turnsToWin).toBe(2);
  });
});

describe("10. The map's route values rest with the game's heal and the rest relics, like the projection (batch D 981ae07)", () => {
  afterEach(() => setRoomCostsForTests(null));

  it("restedFraction: 30% rounded down, Regal Pillow's +15, Stone Humidifier's +5 max HP; no context: the old flat 30%", () => {
    expect(restedFraction(0.5, { maxHp: 85, heal: NO_REST_RELICS })).toBeCloseTo((42.5 + 25) / 85, 6);
    expect(restedFraction(0.5, { maxHp: 80, heal: restHealOf(["REGAL_PILLOW"]) })).toBeCloseTo((40 + 24 + 15) / 80, 6);
    expect(restedFraction(0.5, { maxHp: 80, heal: restHealOf(["STONE_HUMIDIFIER"]) })).toBeCloseTo((40 + 24 + 5) / 85, 6);
    expect(restedFraction(0.5, null)).toBeCloseTo(0.8, 6);
  });

  it("the logged 9GRP F27 map: holding Regal Pillow changes the value of the paths through rest sites", () => {
    // The old fixed room-cost model (no measured rooms): the test does not read the refreshing room costs.
    setRoomCostsForTests({});
    const rationale = (relic: string | null): string => {
      const raw = oneshotBoard("9grp-f28-rest", "map_before");
      const run = raw["run"] as Raw;
      if (relic) run["relics"] = [...(run["relics"] as Raw[]), { index: 9, relic_id: relic, name: relic, stack: null, is_melted: false }];
      const decision = planMap(oneshotEnv(raw, undefined, { buildDecider: "jev" }));
      return decision?.kind === "act" ? decision.rationale : JSON.stringify(decision?.kind === "ask" ? decision.questions : null);
    };
    expect(rationale("REGAL_PILLOW")).not.toBe(rationale(null));
  });
});

describe("11. Blessing of the Forge drunk as a line's step: the upgraded hand is the one expected, the line goes on (BXAZV0R9ZHWK F17 T5)", () => {
  it("\"potion 熔炉的祝福, then 心神不宁+, …\": after the drink every card shows \"+\", the next step is played, not re-planned", () => {
    rolloutLiveOptions.enabled = false;
    const ask = loggedEnv(logged("bxaz-f17-t5-forge"));
    const criteria = planCriteria(planCombatTurn(ask));
    const chosen = Object.entries(criteria).find(([key, text]) => key.startsWith("plan") && /"plays":"potion 熔炉的祝福, then 心神不宁\+/.test(text));
    if (!chosen) throw new Error("the forge line is not offered");
    const first = (planCombatTurn(ask) as AskDecision).resolve(choose(chosen[0], 0.9));
    first.apply?.();
    expect(first.intent).toMatchObject({ action: "use_potion", option_index: 0 });
    // The board after the drink: the belt slot empty, every hand card upgraded.
    const after = logged("bxaz-f17-t5-forge");
    const combat = after.state["combat"] as Raw;
    combat["hand"] = (combat["hand"] as Raw[]).map((card) => ({ ...card, upgraded: true, name: `${String(card["name"])}+` }));
    const potions = (after.state["run"] as Raw)["potions"] as Raw[];
    potions[0] = { index: 0, occupied: false, can_discard: false };
    const decision = planCombatTurn({ ...loggedEnv(after), screenMemory: ask.screenMemory });
    expect(decision?.label).toBe("combat/plan-continue");
    expect(decision?.kind === "act" ? decision.rationale : "").toMatch(/Jev-chosen plan: 心神不宁\+/);
  });
});

describe("12. A drink that changes nothing in its line reads the dry line's rollout numbers, not noise (3SBPKG9603WD F17 T3)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("\"Inferno, Defend, Defend, then Flex\" (logged 62.5 vs 64.1, marked best, Jev drank it): the same numbers as without, and it says so; still an option", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const fx = logged("3sbp-f17-t3-flex");
    expect(fx.decision.rationale).toMatch(/狱火, 防御, 防御, potion 肌肉药水/);
    const decision = planCombatTurn(loggedEnv(fx)) as AskDecision;
    const question = (decision.jevView?.questions ?? decision.questions)["plan"]!;
    const lines = Object.values(question.type === "choice" ? question.criteria ?? {} : {}).map((text) => JSON.parse(String(text)) as Raw);
    const dry = lines.find((line) => line["plays"] === "狱火, then 防御, then 防御")!;
    const drink = lines.find((line) => line["plays"] === "狱火, then 防御, then 防御, then potion 肌肉药水")!;
    expect(drink).toBeDefined();
    expect(drink["rollout"]).toBe(dry["rollout"]);
    expect(drink["rollout_turns"]).toBe(dry["rollout_turns"]);
    expect(String(drink["potion_no_effect"])).toMatch(/^肌肉药水: no effect in this line \(this turn is the same as 狱火, 防御, 防御 without it\)$/);
    expect(dry).not.toHaveProperty("potion_no_effect");
    // Never the drink alone as the rollout's best: with its dry twin it is best-and-tied or neither.
    expect(drink["rollout_best"] === true && dry["rollout_best"] !== true && drink["rollout_tied"] === undefined).toBe(false);
  }, 60_000);
});

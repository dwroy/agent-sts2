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
import type { AskDecision } from "../src/project/types.js";

import { distinctNames, enemySims, killGroups, planCombatTurn } from "../src/screens/combat-plan.js";
import { modelHandCard, type CardModel } from "../src/strategy/card-model.js";
import { killOrders, rolloutDecision, type EnemyTable, type FightMeta } from "../src/strategy/rollout.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
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
    expect(Object.keys(criteria).sort()).toEqual(["o0", "o0:d0", "o0:d1", "o1", "o1:d0", "o1:d1"]);
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
    // Done once: the next frame asks as usual (no free-slot options: the belt has room).
    const again = planEvent({ ...loggedEnv(fx), buildDecider: "deepseek", screenMemory: env.screenMemory }) as AskDecision;
    expect(again.kind).toBe("ask");
    const againQ = again.questions["pick"]!;
    expect(Object.keys(againQ.type === "choice" ? againQ.criteria ?? {} : {}).sort()).toEqual(["o0", "o1"]);
  });
});

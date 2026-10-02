/**
 * SL retries with the known draw order and more compute (docs/sl.md §10): the draw tracker (src/sl/draws.ts) on synthetic
 * boards shaped like the logged ones (the pile listing grouped and sorted by name, the hand in draw order), the order the
 * earlier attempts agree on, the check against this attempt's draws, the solver drawing the known cards, the rollout's
 * and the random potions' samples drawing them first, and the controller: the attempt's row keeps its draws, the retry's
 * env carries the known draws and the compute, the switches off leave the env as before, a restart reads the draws back.
 * No logs/ or .cache, no model.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { SlConfig } from "../src/config.js";
import type { ActionRequest } from "../src/mod/client.js";
import type { ActionResult } from "../src/mod/schema.js";
import { RunJournal } from "../src/project/run-journal.js";
import { createScreenMemory } from "../src/project/types.js";
import { previousAttemptsJson, type SlAttemptRow } from "../src/sl/attempts.js";
import { RETRY_COMPUTE, SlController } from "../src/sl/controller.js";
import { checkKnown, DrawTracker, knownOrderOf, knownTopIndices, type KnownOrder, type SlDraws } from "../src/sl/draws.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { samplePotion, type PotionMcSource } from "../src/strategy/potion-mc.js";
import { rng, sampledDrawPile } from "../src/strategy/rollout.js";
import { solveTurn, type EnemySim, type PlayerSim } from "../src/strategy/turn-solver.js";
import { testKnowledge } from "./scenarios.js";
import { bossBoard, menuBoard, state } from "./sl-support.js";

type Raw = Record<string, unknown>;

/** A board's hand (card keys, "+" upgraded, in hand order) and piles (grouped and sorted by name, as the game lists them). */
function withCards(board: Raw, hand: string[], draw: string[], discard: string[] = []): Raw {
  const combat = board["combat"] as Raw;
  combat["hand"] = hand.map((key, index) => {
    const id = key.replace(/\+$/, "");
    return { index, card_id: id, name: key, upgraded: key.endsWith("+"), energy_cost: 1, playable: true, target_type: "AnyEnemy", requires_target: true, valid_target_indices: [0] };
  });
  const lines = (keys: string[]) => {
    const counts = new Map<string, number>();
    for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
    return [...counts.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, n]) => ({ line: `${key}${n > 1 ? `*${n}` : ""} [1费]：text`, card_ids: [key.replace(/\+$/, "")] }));
  };
  board["agent_view"] = { combat: { draw: lines(draw), discard: lines(discard), exhaust: [] } };
  // The run's deck: the fight's own cards (the draw tracker's first state reads the hand's draws off it).
  (board["run"] as Raw)["deck"] = [...hand, ...draw, ...discard].map((key, index) => ({ index, card_id: key.replace(/\+$/, ""), name: key, upgraded: key.endsWith("+") }));
  return board;
}

/** A fight turn's board with these cards (the boss board of tests/sl-support.ts). */
function turnBoard(turn: number, hand: string[], draw: string[], discard: string[] = [], options: { lethal?: boolean; hp?: number } = {}): Raw {
  return withCards(bossBoard({ turn, hp: options.hp ?? 60, lethal: options.lethal ?? false, playable: true }), hand, draw, discard);
}

describe("DrawTracker: the order cards come off the draw pile", () => {
  it("the opening hand in hand order, then each turn's draw, then a mid-turn draw added at the end", () => {
    const t = new DrawTracker();
    t.observe(state(turnBoard(1, [], ["A", "B", "C", "D", "E", "F", "G", "H"])));
    t.observe(state(turnBoard(1, ["C", "A", "E"], ["B", "D", "F", "G", "H"])));
    // T1 plays C; a mid-turn draw (Pommel Strike's) brings G, added last.
    t.observe(state(turnBoard(1, ["A", "E", "G"], ["B", "D", "F", "H"], ["C"])));
    // T2: the hand discarded, three drawn.
    t.observe(state(turnBoard(2, ["H", "B", "D"], ["F"], ["A", "C", "E", "G"])));
    expect(t.record).toEqual({ order: ["C", "A", "E", "G", "H", "B", "D"], names: ["C", "A", "E", "G", "H", "B", "D"], turns: [1, 1, 1, 1, 2, 2, 2], clean: 7, broke: null });
  });

  it("a card kept in the hand (Retain) with a drawn copy of it: the drawn one is the later one in the hand", () => {
    const t = new DrawTracker();
    t.observe(state(turnBoard(1, ["A", "B"], ["A", "C", "D"])));
    t.observe(state(turnBoard(2, ["A", "C", "A"], ["D"], ["B"])));
    expect(t.record.order).toEqual(["A", "B", "C", "A"]);
    expect(t.record.clean).toBe(4);
  });

  it("a card upgraded on its way to the hand (Bellows, VNKN F25) is the pile's card", () => {
    const t = new DrawTracker();
    t.observe(state(turnBoard(1, [], ["STRIKE_R", "STRIKE_R", "BASH"])));
    t.observe(state(turnBoard(1, ["STRIKE_R+", "BASH+"], ["STRIKE_R"])));
    expect(t.record.order).toEqual(["STRIKE_R", "BASH"]);
    expect(t.record.names).toEqual(["STRIKE_R+", "BASH+"]);
    expect(t.intact).toBe(true);
  });

  it("a reshuffle: the old pile's cards are still the order, the shuffled ones are not", () => {
    const t = new DrawTracker();
    t.observe(state(turnBoard(1, ["A", "B"], ["C"])));
    // T2 draws C (the old pile's last card), then the discard pile (A, B) is shuffled in and B comes off.
    t.observe(state(turnBoard(2, ["C", "B"], ["A"], [])));
    expect(t.record).toMatchObject({ order: ["A", "B", "C", "B"], clean: 3, broke: "T2: reshuffle (the discard pile shuffled into the draw pile)" });
  });

  it("a status put into the draw pile, or a card leaving it without coming into the hand, ends the known order", () => {
    const status = new DrawTracker();
    status.observe(state(turnBoard(1, ["A"], ["B", "C"])));
    status.observe(state(turnBoard(2, ["B"], ["C", "DAZED"], ["A"])));
    expect(status.record).toMatchObject({ order: ["A", "B"], clean: 1, broke: "T2: DAZED put into the draw pile (at a random place, or a card back from the hand)" });
    const top = new DrawTracker();
    top.observe(state(turnBoard(1, ["A"], ["B", "C", "D"])));
    // Havoc-like: B is played from the top; C drawn.
    top.observe(state(turnBoard(1, ["A", "C"], ["D"], ["B"])));
    expect(top.record).toMatchObject({ order: ["A", "C"], clean: 1 });
    expect(top.record.broke).toMatch(/^T1: B left the draw pile without coming into the hand/);
  });

  it("the first state after a reload: only the hand's cards that came off the pile, never one made into the hand (X7BX F48)", () => {
    // X7BX5DYHFZ3N F48 (ops 2026-10-02): attempt 2's first state, T1, held five drawn cards and Crossbow's Spite (怨恨, made
    // into the hand at the turn's start, not in the deck); attempt 1's first state had an empty hand and read its draws off
    // the pile. Both now record the same order, and the next turn's draws follow it.
    const deck = ["BLOOD_WALL", "IRON_WAVE+", "SETUP_STRIKE", "ANGER+", "STRIKE", "ANGER", "JUGGERNAUT+", "STRIKE+"];
    const reloaded = (raw: Raw): Raw => {
      (raw["run"] as Raw)["deck"] = deck.map((key, index) => ({ index, card_id: key.replace(/\+$/, ""), name: key, upgraded: key.endsWith("+") }));
      return raw;
    };
    const first = new DrawTracker({ inserts: true, tops: true });
    first.observe(state(reloaded(turnBoard(1, [], deck))));
    first.observe(state(reloaded(turnBoard(1, ["BLOOD_WALL", "IRON_WAVE+", "SETUP_STRIKE", "ANGER+", "STRIKE", "SPITE"], ["ANGER", "JUGGERNAUT+", "STRIKE+"]))));
    const second = new DrawTracker({ inserts: true, tops: true });
    second.observe(state(reloaded(turnBoard(1, ["BLOOD_WALL", "IRON_WAVE+", "SETUP_STRIKE", "ANGER+", "STRIKE", "SPITE"], ["ANGER", "JUGGERNAUT+", "STRIKE+"]))));
    expect(second.record.order).toEqual(["BLOOD_WALL", "IRON_WAVE+", "SETUP_STRIKE", "ANGER+", "STRIKE"]);
    expect(second.record.order).toEqual(first.record.order);
    const known = knownOrderOf([{ attempt: 1, draws: { ...first.record, order: [...first.record.order, "ANGER"], names: [...first.record.names, "ANGER"], turns: [...first.record.turns, 2], clean: 6 } }]).known!;
    second.observe(state(reloaded(turnBoard(2, ["ANGER", "SPITE"], ["JUGGERNAUT+", "STRIKE+"], ["BLOOD_WALL", "IRON_WAVE+", "SETUP_STRIKE", "ANGER+", "STRIKE"]))));
    expect(second.record.order.at(-1)).toBe("ANGER");
    expect(checkKnown(known, second)).toMatchObject({ ok: true });
    // A state without the deck listed: the whole hand, as before.
    const bare = turnBoard(1, ["A", "B"], ["C"]);
    delete (bare["run"] as Raw)["deck"];
    const old = new DrawTracker();
    old.observe(state(bare));
    expect(old.record.order).toEqual(["A", "B"]);
  });

  it("tracking that starts after the fight's start (a restarted process) knows nothing", () => {
    const t = new DrawTracker();
    t.observe(state(turnBoard(3, ["A", "B"], ["C"], ["D"])));
    expect(t.record).toMatchObject({ clean: 0 });
    expect(t.record.broke).toMatch(/^T3: tracking began after the fight's start/);
  });
});

const draws = (order: string[], clean = order.length): SlDraws => ({ order, names: order.map((key) => key.toLowerCase()), turns: order.map(() => 1), clean, broke: clean < order.length ? "T2: reshuffle" : null });

describe("knownOrderOf and checkKnown", () => {
  it("the longest clean order the earlier attempts agree on; attempts that disagree keep the draws before it", () => {
    expect(knownOrderOf([{ attempt: 1, draws: draws(["A", "B", "C"], 2) }, { attempt: 2, draws: draws(["A", "B", "C", "D"]) }]).known).toEqual({ keys: ["A", "B", "C", "D"], names: ["a", "b", "c", "d"], attempts: [1, 2] });
    // Ops 2026-10-02 (X7BX5DYHFZ3N F48: one card counted wrongly at draw 6 dropped the 5 agreed draws for attempts 3-6):
    // the common part stays, nothing from the disagreement on, not even from a longer later row.
    expect(knownOrderOf([{ attempt: 1, draws: draws(["A", "B"]) }, { attempt: 2, draws: draws(["A", "C"]) }])).toEqual({ known: { keys: ["A"], names: ["a"], attempts: [1, 2] }, reason: "attempts 1 and 2 drew differently at draw 2 (B vs C): the 1 draw before it kept" });
    expect(knownOrderOf([{ attempt: 1, draws: draws(["A", "B", "C"]) }, { attempt: 2, draws: draws(["A", "B", "X", "D"]) }, { attempt: 3, draws: draws(["A", "B", "C", "D", "E"]) }]).known).toEqual({ keys: ["A", "B"], names: ["a", "b"], attempts: [1, 2, 3] });
    expect(knownOrderOf([{ attempt: 1, draws: draws(["A", "B"]) }, { attempt: 2, draws: draws(["C", "B"]) }])).toEqual({ known: null, reason: "attempts 1 and 2 drew differently at draw 1 (A vs C)" });
    expect(knownOrderOf([{ attempt: 1 }, { attempt: 2, draws: null }]).known).toBeNull();
    // An upgrade on the way to the hand is the same card.
    expect(knownOrderOf([{ attempt: 1, draws: draws(["A+", "B"]) }, { attempt: 2, draws: draws(["A", "B"]) }]).known?.keys).toEqual(["A+", "B"]);
  });

  it("this attempt's draws so far are the known ones: the rest of the known order, once the pile holds it", () => {
    const known: KnownOrder = { keys: ["A", "B", "C", "D", "E"], names: ["a", "b", "c", "d", "e"], attempts: [1] };
    const t = new DrawTracker();
    t.observe(state(turnBoard(1, ["A", "B"], ["C", "D", "E", "F"])));
    expect(checkKnown(known, t)).toEqual({ ok: true, keys: ["C", "D", "E"], names: ["c", "d", "e"] });
    // Another card drawn where the earlier attempt drew C.
    const other = new DrawTracker();
    other.observe(state(turnBoard(1, ["A", "F"], ["C", "D", "E", "B"])));
    expect(checkKnown(known, other)).toEqual({ ok: false, reason: "T1: drew F where the earlier attempt drew b (draw 2)" });
    // Past the known part: nothing known ahead, still ok.
    const past = new DrawTracker();
    past.observe(state(turnBoard(1, ["A", "B", "C", "D", "E"], ["F"])));
    expect(checkKnown(known, past)).toEqual({ ok: true, keys: [], names: [] });
    // The pile not holding a known card.
    const missing = new DrawTracker();
    missing.observe(state(turnBoard(1, ["A", "B"], ["C", "D", "F"])));
    expect(checkKnown(known, missing)).toEqual({ ok: false, reason: "the draw pile does not hold the known next cards (E missing)" });
  });

  it("the known cards as indices into a pile's card list, the same card under another upgrade mark last", () => {
    const pile = [{ cardId: "A", upgraded: false }, { cardId: "B", upgraded: true }, { cardId: "A", upgraded: false }];
    expect(knownTopIndices(["A", "B+", "A"], pile)).toEqual([0, 1, 2]);
    expect(knownTopIndices(["B"], pile)).toEqual([1]);
    expect(knownTopIndices(["C"], pile)).toBeNull();
  });
});

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
    draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...overrides,
  };
}
const enemy = (overrides: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Boss", hp: 20, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...overrides });
const player = (overrides: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 30, maxHp: 80, block: 0, energy: 2, weak: false, vulnerable: false, intangible: false, ...overrides });

describe("the solver with the known top of the draw pile", () => {
  it("a draw card draws the known cards, which the line can play (VNKN F33 T4: Shrug It Off's Defend)", () => {
    const shrug = card(0, "SHRUG_IT_OFF", { type: "Skill", target: "self", validTargets: [], block: 8, draw: 1 });
    const bludgeon = card(700, "BLUDGEON", { key: "known0", damage: 20, cost: 1 });
    const input = { hand: [shrug], player: player(), enemies: [enemy({ attacks: [{ damage: 5, hits: 1 }] })], fightKind: "boss" as const };
    const blind = solveTurn(input);
    expect(blind.plans.some((plan) => plan.outcome.winsFight)).toBe(false);
    const known = solveTurn({ ...input, knownTop: [bludgeon] });
    const win = known.plans.find((plan) => plan.outcome.winsFight);
    expect(win?.steps.map((step) => `${step.cardId}#${step.cardIndex}`)).toEqual(["SHRUG_IT_OFF#0", "BLUDGEON#700"]);
  });

  it("two draw cards take the known cards in the order they are played", () => {
    const a = card(0, "POMMEL_STRIKE", { damage: 1, draw: 1, cost: 0 });
    const b = card(1, "SHRUG_IT_OFF", { type: "Skill", target: "self", validTargets: [], block: 1, draw: 1, cost: 0 });
    const k0 = card(700, "BLUDGEON", { key: "known0", damage: 30, cost: 2 });
    const k1 = card(701, "DEFEND_R", { key: "known1", type: "Skill", target: "self", validTargets: [], block: 5, cost: 2 });
    const solved = solveTurn({ hand: [a, b], player: player({ energy: 2 }), enemies: [enemy({ hp: 25 })], fightKind: "boss", knownTop: [k0, k1] });
    const win = solved.plans.find((plan) => plan.outcome.winsFight)!;
    // Whichever draws first gets Bludgeon (the pile's top), the second the Defend.
    expect(win.steps.find((step) => step.cardId === "BLUDGEON")).toBeDefined();
    expect(win.steps.findIndex((step) => step.cardId === "BLUDGEON")).toBeGreaterThan(0);
  });
});

describe("the rollout's and the random potions' samples draw the known cards first", () => {
  const pile = ["A", "B", "C", "D", "E", "F"].map((id, i) => card(900 + i, id));
  it("every sample's pile has the known cards on top in order, the rest shuffled under them", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const drawn = sampledDrawPile({ draw: pile, discard: [], handBase: [], drawTop: [3, 0] }, rng(seed));
      // Drawn from the end: D first, then A.
      expect(drawn.slice(-2).map((c) => c.cardId)).toEqual(["A", "D"]);
      expect(drawn.map((c) => c.cardId).sort()).toEqual(["A", "B", "C", "D", "E", "F"]);
    }
    // Without a known top (or a bad one) the whole pile is shuffled, as before.
    expect(sampledDrawPile({ draw: pile, discard: [], handBase: [] }, rng(5)).map((c) => c.cardId)).toEqual(sampledDrawPile({ draw: pile, discard: [], handBase: [], drawTop: [9] }, rng(5)).map((c) => c.cardId));
  });

  it("a draw potion's sample draws the known cards first", () => {
    const source: PotionMcSource = { potionId: "SWIFT_POTION", name: "Swift", slot: 0, text: "", kind: "draw", piles: { draw: pile, discard: [] }, knownTop: [4, 2, 5] };
    for (let seed = 1; seed <= 10; seed += 1) expect(samplePotion(source, [], rng(seed)).drawn!.map((c) => c.cardId)).toEqual(["E", "C", "F"]);
  });
});

// ---------------------------------------------------------------- the controller

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempLog(): string {
  const dir = mkdtempSync(join(tmpdir(), "sl-retry-test-"));
  dirs.push(dir);
  return join(dir, "sl-attempts.jsonl");
}
function rows(path: string): SlAttemptRow[] {
  return readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line) as SlAttemptRow);
}
function slConfig(log: string | null, overrides: Partial<SlConfig> = {}): SlConfig {
  return { enabled: true, bossRetries: 3, eliteRetries: 1, retryShowSim: true, retryKnownDraws: true, retryCompute: true, judgeKnownDraws: true, reloadEarly: true, retryKnownInserts: true, retryKnownTop: true, retryExplore: true, retryExploreB2: true, retryExploreBossPotions: true, retryExploreOrder: true, retryExploreReplay: true, retryKnownPicks: true, log, stepTimeoutMs: 5_000, ...overrides };
}

/** The deck of these fights: 8 cards; the first attempt draws A..E on T1, F, G, H on T2. */
const DECK = ["A", "B", "C", "D", "E", "F", "G", "H"];
const t1Hand = ["C", "A", "E", "B", "D"];
const t1 = (hp = 60) => turnBoard(1, t1Hand, ["F", "G", "H"], [], { hp });

function setup(log: string, overrides: Partial<SlConfig> = {}, firstTurn: Raw = t1()) {
  const lethal = turnBoard(2, ["H", "F", "G"], [], ["A", "B", "C", "D", "E"], { lethal: true, hp: 10 });
  // Nothing playable on the lethal board: the rules tier.
  for (const entry of (lethal["combat"] as Raw)["hand"] as Raw[]) entry["playable"] = false;
  let current = lethal;
  const actions: string[] = [];
  let clock = 0;
  const client = {
    state: async () => state(current),
    act: async (intent: ActionRequest): Promise<ActionResult> => {
      actions.push(intent.action);
      if (intent.action === "save_and_quit") current = menuBoard();
      if (intent.action === "continue_run") current = firstTurn;
      return { action: intent.action, status: "completed", stable: true, message: "", state: null, raw: {} };
    },
  };
  const notes: string[] = [];
  const sl = new SlController({ config: slConfig(log, overrides), knowledge: testKnowledge, client, note: (m) => notes.push(m), sleep: async (ms) => void (clock += ms), now: () => clock });
  const memory = { journal: new RunJournal(), screenMemory: createScreenMemory() };
  return { sl, notes, memory, lethal, actions };
}

/** Attempt 1: the fight's first frame (hand not drawn yet), T1 drawn, T2 drawn, and the certain death that reloads it. */
async function firstAttempt(t: ReturnType<typeof setup>): Promise<void> {
  t.sl.observe(state(turnBoard(1, [], DECK)), t.memory);
  t.sl.observe(state(t1()), t.memory);
  t.sl.observe(state(t.lethal), t.memory);
  const outcome = await t.sl.beforeEndTurn(state(t.lethal), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
  expect(outcome).toMatchObject({ handled: true, ok: true });
}

describe("SlController with SL_RETRY_KNOWN_DRAWS and SL_RETRY_COMPUTE", () => {
  it("the first attempt's row keeps its draws; the retry knows the next cards and gets the compute", async () => {
    const log = tempLog();
    const t = setup(log);
    await firstAttempt(t);
    const [row] = rows(log);
    expect(row!.draws).toEqual({ order: ["C", "A", "E", "B", "D", "H", "F", "G"], names: ["C", "A", "E", "B", "D", "H", "F", "G"], turns: [1, 1, 1, 1, 1, 2, 2, 2], clean: 8, broke: null });
    expect(t.notes).toContain("SL: attempt 2 knows the first 8 draws of the fight (attempt 1)");
    // Attempt 2 on T1, its hand the first attempt's: the next cards are T2's.
    const env = t.sl.envFor(state(t1()));
    expect(env?.knownDraws).toEqual({ cards: ["H", "F", "G"], names: ["H", "F", "G"], attempts: [1] });
    expect(env?.compute).toEqual(RETRY_COMPUTE);
    expect(JSON.stringify(env?.previousAttempts)).toContain("known_draws lists the next cards");
  });

  it("the draws leaving the known order: none from there, said once", async () => {
    const log = tempLog();
    const t = setup(log);
    await firstAttempt(t);
    expect(t.sl.envFor(state(t1()))?.knownDraws).toBeDefined();
    // T2 of attempt 2 draws G first where attempt 1 drew H.
    const t2 = turnBoard(2, ["G", "F", "H"], [], ["A", "B", "C", "D", "E"]);
    t.sl.observe(state(t2), t.memory);
    expect(t.sl.envFor(state(t2))?.knownDraws).toBeUndefined();
    expect(t.sl.envFor(state(t2))?.knownDraws).toBeUndefined();
    expect(t.notes.filter((note) => note.startsWith("SL: the draws left the order"))).toEqual(["SL: the draws left the order attempt 1 saw (F17 T2 attempt 2): T2: drew G where the earlier attempt drew H (draw 6); random draws from here"]);
  });

  it("both switches off: the retry's env as before (no known draws, no compute, the block's note unchanged)", async () => {
    const log = tempLog();
    // SL_RETRY_EXPLORE off too: its env.sl.explore is the only other key a retry's env gets.
    const t = setup(log, { retryKnownDraws: false, retryCompute: false, retryExplore: false });
    await firstAttempt(t);
    const env = t.sl.envFor(state(t1()))!;
    expect(Object.keys(env).sort()).toEqual(["attempt", "maxAttempts", "previousAttempts", "showSim"]);
    expect(env.previousAttempts).toEqual(previousAttemptsJson(rows(log), 2, 4));
    expect(t.notes.some((note) => note.includes("draws of the fight"))).toBe(false);
    // The row still keeps the draws (a later switch-on, the evaluation).
    expect(rows(log)[0]!.draws?.clean).toBe(8);
    expect(t.sl.describe()).toMatchObject({ retry_known_draws: false, retry_compute: false });
  });

  it("a restarted process reads the draws back from the rows and knows them on the retry", async () => {
    const log = tempLog();
    const t = setup(log);
    await firstAttempt(t);
    const again = setup(log);
    again.sl.observe(state(t1()), again.memory);
    expect(again.sl.decisionFields().sl_attempt).toBe(2);
    expect(again.sl.envFor(state(t1()))?.knownDraws?.cards).toEqual(["H", "F", "G"]);
  });

  it("describe(): the switches and the compute for run-config", () => {
    const t = setup("/nowhere/sl.jsonl");
    expect(t.sl.describe()).toMatchObject({ retry_known_draws: true, retry_compute: { rollout_samples: 24, rollout_budget_ms: RETRY_COMPUTE.rolloutBudgetMs, turn_budget_ms: 30_000, mc_samples: 36, mc_budget_ms: RETRY_COMPUTE.mcBudgetMs, boss_sim_samples: RETRY_COMPUTE.bossSimSamples } });
  });
});

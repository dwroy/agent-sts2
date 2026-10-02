/**
 * SL_RELOAD_EARLY, SL_JUDGE_KNOWN_DRAWS and SL_RETRY_KNOWN_INSERTS (docs/sl.md §2, §10; Dai 2026-10-02): the early reload's
 * judge (certain only with nothing left to chance this turn: every random case here must not reload early), the draw
 * veto lifted only by exactly known draws, the draw tracker keeping the known order through cards added at random places
 * (and never calling those draws exact), the samples placing the added cards at random, and the controller. Synthetic
 * boards (tests/sl-support.ts); no logs/ or .cache, no model.
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
import { SlController } from "../src/sl/controller.js";
import { checkKnown, DrawTracker, knownOrderOf, withAddedAtRandom, type KnownOrder } from "../src/sl/draws.js";
import { drawsKnownAt, intentNotShown, judgeEndTurn, judgeLeastLossNow, LEAST_LOSS_LABEL, midTurnRisks, type LeastLossFacts } from "../src/sl/judge.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { samplePotion, type PotionMcSource } from "../src/strategy/potion-mc.js";
import { rng, sampledDrawPile } from "../src/strategy/rollout.js";
import { testKnowledge } from "./scenarios.js";
import { bossBoard, menuBoard, state } from "./sl-support.js";

type Raw = Record<string, unknown>;

/** A least-loss verdict with nothing left to chance (the planner's facts). */
const clean = (overrides: Partial<LeastLossFacts> = {}): LeastLossFacts => ({ knownDraws: 0, drawsKnown: false, draws: false, line: ["DEFEND_R", "STRIKE_R -> Test Subject"], chance: null, ...overrides });

/** The boss board with its hand playable (Strike, Defend, Bash: none draws), lethal, 10 HP against 30. */
function lethalBoard(options: Parameters<typeof bossBoard>[0] = {}): Raw {
  return bossBoard({ playable: true, ...options });
}

/** A hand card that draws (its text says so), playable. */
function drawCard(index: number): Raw {
  return { index, card_id: "SHRUG_IT_OFF", name: "Shrug It Off", upgraded: false, target_type: "Self", requires_target: false, valid_target_indices: [], energy_cost: 1, playable: true, rules_text: "获得8点格挡。 抽1张牌。", resolved_rules_text: "获得8点格挡。 抽1张牌。" };
}

const knowledgeWith = (powers: Record<string, string>) => ({
  power: (id: string | null | undefined) => (id && powers[id] !== undefined ? { id, name: id, description: powers[id]!, type: "Buff" } : null),
  relic: () => null,
});

const now = (board: Raw, facts: LeastLossFacts | undefined, extra: { addedToPile?: boolean; knownDrawsJudge?: boolean; knowledge?: ReturnType<typeof knowledgeWith> } = {}) =>
  judgeLeastLossNow(state(board), { revives: [], facts, knownDrawsJudge: extra.knownDrawsJudge ?? true, addedToPile: extra.addedToPile ?? false, ...(extra.knowledge ? { knowledge: extra.knowledge } : {}) });

describe("judgeLeastLossNow: the least-loss verdict taken before its line, only with nothing left to chance", () => {
  it("certain on a lethal board with a deterministic verdict: early, the line named", () => {
    const verdict = now(lethalBoard(), clean());
    expect(verdict).toMatchObject({ certain: true, tier: "least-loss", early: true });
    expect(verdict.reason).toMatch(/^at the least-loss verdict, before its line \(DEFEND_R, STRIKE_R -> Test Subject\): the turn planner: every simulated line dies/);
  });

  it("every judgeEndTurn condition still holds first: the mod not flagging it, a revive, Buffer, a special phase", () => {
    expect(now(lethalBoard({ lethal: false }), clean()).certain).toBe(false);
    expect(judgeLeastLossNow(state(lethalBoard()), { revives: ["LIZARD_TAIL"], facts: clean(), knownDrawsJudge: true, addedToPile: false }).certain).toBe(false);
    expect(now(lethalBoard({ playerPowers: [{ power_id: "BUFFER_POWER", amount: 1 }] }), clean()).certain).toBe(false);
    expect(now(lethalBoard({ hp: 40 }), clean()).reason).toMatch(/^own count survives/);
  });

  it("random cases never reload early: a random card, a random potion, an unmodelled card (the planner's facts)", () => {
    for (const chance of ["飞剑回旋镖 has a random effect", "a random potion (Attack Potion): its samples", "SOMETHING is not modelled", "Juggernaut hits a random enemy", "Havoc plays or makes a card nobody knows"]) {
      const verdict = now(lethalBoard(), clean({ chance }));
      expect(verdict.certain).toBe(false);
      expect(verdict.reason).toBe(`not before the line is played: chance in the verdict (${chance})`);
    }
  });

  it("draws: a line drawing cards not exactly known never reloads early; exactly known draws may", () => {
    expect(now(lethalBoard(), clean({ draws: true, drawsKnown: false })).reason).toBe("not before the line is played: a line draws cards not exactly known");
    // Known, but SL_JUDGE_KNOWN_DRAWS off: not early either.
    expect(now(lethalBoard(), clean({ draws: true, drawsKnown: true }), { knownDrawsJudge: false }).certain).toBe(false);
    expect(now(lethalBoard(), clean({ draws: true, drawsKnown: true, knownDraws: 5 })).certain).toBe(true);
  });

  it("a playable card that draws vetoes as at end_turn, unless every draw is exactly known", () => {
    const board = lethalBoard();
    ((board["combat"] as Raw)["hand"] as Raw[]).push(drawCard(3));
    expect(now(board, clean()).reason).toBe("the planner sees every line die, but Shrug It Off draws (unknown cards)");
    expect(now(board, clean({ draws: true, drawsKnown: true, knownDraws: 3 }))).toMatchObject({ certain: true, early: true });
  });

  it("cards added to the draw pile at random places this attempt: never early", () => {
    expect(now(lethalBoard(), clean(), { addedToPile: true }).reason).toBe("not before the line is played: cards were added to the draw pile at random places this attempt");
  });

  it("the enemy intents as shown: an enemy with no intent or an unknown kind of intent is not early", () => {
    const none = lethalBoard();
    const enemies = (none["combat"] as Raw)["enemies"] as Raw[];
    enemies.push({ ...enemies[0]!, index: 1, enemy_id: "TOUGH_EGG", name: "Egg", intents: [] });
    expect(intentNotShown(state(none))).toBe("Egg shows no intent");
    expect(now(none, clean()).reason).toBe("not before the line is played: Egg shows no intent");
    const odd = lethalBoard();
    const intents = (((odd["combat"] as Raw)["enemies"] as Raw[])[0]!["intents"] as Raw[]);
    intents.push({ index: 1, intent_type: "Unknown", label: "?", damage: null, hits: null });
    expect(now(odd, clean()).reason).toBe("not before the line is played: Test Subject's intent Unknown is not a plain one");
  });

  it("relics and powers: acting by chance, or mid-turn without the planner, keep the end_turn timing", () => {
    const soul = lethalBoard();
    ((soul["run"] as Raw)["relics"] as Raw[]).push({ index: 9, relic_id: "FORGOTTEN_SOUL", name: "遗忘之魂", description: "每当你[gold]消耗[/gold]一张牌，随机对一名敌人造成[blue]{Damage}[/blue]点伤害。" });
    // (Its held cards count as Ethereal, having no text: the end-of-turn exhaust triggers it, which the judge itself refuses.)
    expect(now(soul, clean())).toMatchObject({ certain: false, reason: "the enemies may be hit before they act: 遗忘之魂 hits the enemies when the held Ethereal cards are exhausted at the end of the turn" });
    const fan = lethalBoard();
    ((fan["run"] as Raw)["relics"] as Raw[]).push({ index: 9, relic_id: "ORNAMENTAL_FAN", name: "精致折扇", description: "你每在同一回合内打出[blue]{Cards}[/blue]张攻击牌，就获得[blue]{Block}[/blue]点[gold]格挡[/gold]。" });
    expect(now(fan, clean()).reason).toBe("not before the line is played: acting mid-turn without the planner: 精致折扇 (relic)");
    // Stone Calendar hits every enemy at the end of its turn, before they act (7DXAW0ZBDFHP F23 T7: both died).
    const calendar = lethalBoard();
    ((calendar["run"] as Raw)["relics"] as Raw[]).push({ index: 9, relic_id: "STONE_CALENDAR", name: "历石", description: "在第[blue]{DamageTurn}[/blue]回合结束时，对所有敌人造成[blue]{Damage}[/blue]点伤害。" });
    expect(now(calendar, clean()).reason).toBe("not before the line is played: hitting the enemies at the end of the turn: 历石 (relic)");
    // A relic about another moment (a fight's end) is no risk.
    const blood = lethalBoard();
    ((blood["run"] as Raw)["relics"] as Raw[]).push({ index: 9, relic_id: "BURNING_BLOOD", name: "燃烧之血", description: "在战斗结束时，回复[green]{Heal}[/green]点生命。" });
    expect(now(blood, clean()).certain).toBe(true);
    const serpent = lethalBoard({ playerPowers: [{ power_id: "SERPENT_FORM_POWER", name: "群蛇形态", amount: 4 }] });
    const knowledge = knowledgeWith({ SERPENT_FORM_POWER: "你每打出一张牌，就对随机一名敌人造成[blue]4[/blue]点伤害。" });
    expect(now(serpent, clean(), { knowledge }).reason).toMatch(/^not before the line is played: acting by chance: 群蛇形态 \(power\)/);
    // A power with no text known counts, to be safe.
    expect(now(lethalBoard({ playerPowers: [{ power_id: "MYSTERY_POWER", name: "?", amount: 1 }] }), clean(), { knowledge }).reason).toMatch(/its text unknown/);
  });

  it("no facts from the planner: not early", () => {
    expect(now(lethalBoard(), undefined).reason).toBe("not before the line is played: the planner's facts about its verdict are missing");
  });
});

describe("held cards' end-of-turn damage in the judge's count (damage through block, the end-of-turn block first; HP loss past it)", () => {
  const held = (key: string, text: string): Raw => ({ index: 7, card_id: key, name: key, upgraded: false, energy_cost: -1, playable: false, rules_text: text, resolved_rules_text: text });
  const burn = held("BURN", "不能被打出。 在你的回合结束时，如果这张牌在你的手牌中，你受到3点伤害。");
  const beckon = held("BECKON", "在你的回合结束时，如果这张牌在你的手牌中， 你失去6点生命。");
  const withHeld = (options: Parameters<typeof bossBoard>[0], card: Raw): Raw => {
    const raw = bossBoard(options);
    ((raw["combat"] as Raw)["hand"] as Raw[]).push(card);
    return raw;
  };

  it("Burn after Plating's block: 12 + 3 against 0 + 5 block takes 10 of 10 HP; the plain count (7) survives: certain only with the held card", () => {
    const raw = withHeld({ hp: 10, damage: 12, lethal: false, playerPowers: [{ power_id: "PLATING_POWER", amount: 5 }] }, burn);
    const verdict = judgeEndTurn(state(raw), { label: "combat/end_turn", revives: [] });
    expect(verdict).toMatchObject({ certain: true, tier: "rules", held: { damage: 3, loss: 0, from: ["BURN"] }, ownCountDies: true });
    expect(verdict.reason).toBe("nothing left to play or drink; 12 incoming + held BURN: 3 damage (the mod does not count them) vs 10 HP + 0 block + 5 end-of-turn block");
    // 11 HP: 10 lost, alive: the count survives (its text names the held card).
    expect(judgeEndTurn(state(withHeld({ hp: 11, damage: 12, lethal: false, playerPowers: [{ power_id: "PLATING_POWER", amount: 5 }] }, burn)), { label: "combat/end_turn", revives: [] })).toMatchObject({ certain: false, reason: "the mod does not flag ending the turn as lethal" });
  });

  it("Beckon's HP loss goes past block: 5 HP behind 20 block against 10 dies to it", () => {
    const verdict = judgeEndTurn(state(withHeld({ hp: 5, block: 20, damage: 10, lethal: false }, beckon)), { label: "combat/end_turn", revives: [] });
    expect(verdict).toMatchObject({ certain: true, held: { damage: 0, loss: 6 } });
  });

  it("the plain count's reason is the one before the held cards when none is held", () => {
    expect(judgeEndTurn(state(bossBoard({ hp: 40 })), { label: "combat/end_turn", revives: [] }).reason).toBe("own count survives: 30 incoming - 0 block - 0 end-of-turn block - 0 Regen < 40 HP");
    expect(judgeEndTurn(state(withHeld({ hp: 40 }, burn)), { label: "combat/end_turn", revives: [] }).reason).toBe("own count survives: 30 incoming - 0 block - 0 end-of-turn block - 0 Regen < 40 HP (with held BURN: 3 damage)");
  });

  it("the controller says when its own count, held cards included, sees a death the mod does not flag and the judge cannot call certain", async () => {
    const log = tempLog();
    const t = setup(log);
    const raw = withHeld({ turn: 2, hp: 10, damage: 12, lethal: false, playerPowers: [{ power_id: "PLATING_POWER", amount: 5 }] }, burn);
    ((raw["combat"] as Raw)["hand"] as Raw[]).push(held("REGRET", "不能被打出。 在你的回合结束时，如果这张牌在你的手牌中，失去相当于手牌数量的生命。"));
    expect(await t.sl.beforeEndTurn(state(raw), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal })).toEqual({ handled: false });
    expect(t.notes.at(-1)).toBe("SL: ending the turn may be lethal (F17 T2 attempt 1/4), not certain: only the held cards make it lethal (held BURN: 3 damage), and REGRET: the end-of-turn amount is not given");
  });
});

describe("SL_JUDGE_KNOWN_DRAWS: the end_turn draw veto lifted only by exactly known draws", () => {
  const board = () => {
    const raw = lethalBoard();
    ((raw["combat"] as Raw)["hand"] as Raw[]).push(drawCard(3));
    return raw;
  };
  it("judgeEndTurn: drawsKnown lifts the veto; absent, the veto as before", () => {
    expect(judgeEndTurn(state(board()), { label: LEAST_LOSS_LABEL, revives: [] })).toMatchObject({ certain: false, reason: "the planner sees every line die, but Shrug It Off draws (unknown cards)" });
    const lifted = judgeEndTurn(state(board()), { label: LEAST_LOSS_LABEL, revives: [], drawsKnown: true });
    expect(lifted).toMatchObject({ certain: true, tier: "least-loss" });
    expect(lifted.reason).toMatch(/; Shrug It Off draws, but every draw the lines made is a known card \(SL retry\)$/);
    // No drawing card: the reason is the one before the switch, byte for byte.
    expect(judgeEndTurn(state(lethalBoard()), { label: LEAST_LOSS_LABEL, revives: [], drawsKnown: true }).reason).toBe(judgeEndTurn(state(lethalBoard()), { label: LEAST_LOSS_LABEL, revives: [] }).reason);
  });

  it("drawsKnownAt: the facts' exact draws, and nothing on the board drawing or changing the pile unseen", () => {
    expect(drawsKnownAt(state(board()), clean({ drawsKnown: true }))).toBe(true);
    expect(drawsKnownAt(state(board()), clean({ drawsKnown: false }))).toBe(false);
    expect(drawsKnownAt(state(board()), undefined)).toBe(false);
    // The Entomancer's Personal Hive adds Dazed to our draw pile when hit: the known draws are not sure.
    const hive = board();
    (((hive["combat"] as Raw)["enemies"] as Raw[])[0]!["powers"] as Raw[]).push({ power_id: "PERSONAL_HIVE_POWER", name: "人体蜂房", amount: 1 });
    const knowledge = knowledgeWith({ PERSONAL_HIVE_POWER: "每当这个敌人被攻击命中时，在你的[gold]抽牌堆[/gold]中加入[gold]晕眩[/gold]。" });
    expect(midTurnRisks(state(hive), knowledge).draws).toEqual(["Test Subject's 人体蜂房"]);
    expect(drawsKnownAt(state(hive), clean({ drawsKnown: true }), knowledge)).toBe(false);
    // A relic that draws mid-turn (Centennial Puzzle on the first HP loss).
    const puzzle = board();
    ((puzzle["run"] as Raw)["relics"] as Raw[]).push({ index: 9, relic_id: "CENTENNIAL_PUZZLE", name: "百年积木", description: "你在每场战斗中第一次损失生命值时，抽[blue]{Cards}[/blue]张牌。" });
    expect(drawsKnownAt(state(puzzle), clean({ drawsKnown: true }))).toBe(false);
  });
});

// ---------------------------------------------------------------- the draw tracker with cards added at random places

/** A fight turn's board: the hand (keys, in hand order) and the piles (grouped and sorted by name, as the game lists them). */
function withCards(board: Raw, hand: string[], draw: string[], discard: string[] = []): Raw {
  const combat = board["combat"] as Raw;
  combat["hand"] = hand.map((key, index) => ({ index, card_id: key.replace(/\+$/, ""), name: key, upgraded: key.endsWith("+"), energy_cost: 1, playable: true, target_type: "AnyEnemy", requires_target: true, valid_target_indices: [0] }));
  const lines = (keys: string[]) => {
    const counts = new Map<string, number>();
    for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
    return [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, n]) => ({ line: `${key}${n > 1 ? `*${n}` : ""} [1费]：text`, card_ids: [key.replace(/\+$/, "")] }));
  };
  board["agent_view"] = { combat: { draw: lines(draw), discard: lines(discard), exhaust: [] } };
  return board;
}
const turnBoard = (turn: number, hand: string[], draw: string[], discard: string[] = [], options: { lethal?: boolean; hp?: number } = {}) =>
  withCards(bossBoard({ turn, hp: options.hp ?? 60, lethal: options.lethal ?? false, playable: true }), hand, draw, discard);

describe("DrawTracker with SL_RETRY_KNOWN_INSERTS: added cards keep the order and are skipped", () => {
  it("an added Dazed: the order goes on through it, the Dazed is listed, never in the order", () => {
    const t = new DrawTracker({ inserts: true });
    t.observe(state(turnBoard(1, ["A", "B"], ["C", "D", "E", "F"])));
    // T1: a hit adds a Dazed to the draw pile.
    t.observe(state(turnBoard(1, ["B"], ["C", "D", "DAZED", "E", "F"], ["A"])));
    expect(t.added).toEqual({ keys: ["DAZED"], names: ["DAZED"] });
    // T2 draws C, the Dazed, D: the order is A B C D, the Dazed skipped.
    t.observe(state(turnBoard(2, ["C", "DAZED", "D"], ["E", "F"], ["A", "B"])));
    expect(t.record).toMatchObject({ order: ["A", "B", "C", "D"], clean: 4, broke: null, inserted: [{ turn: 1, at: 2, cards: ["DAZED"] }] });
    expect(t.added.keys).toEqual([]);
    expect(t.addedToPile).toBe(true);
  });

  it("without the switch the same draws end the order at the Dazed (as before)", () => {
    const t = new DrawTracker();
    t.observe(state(turnBoard(1, ["A", "B"], ["C", "D", "E", "F"])));
    t.observe(state(turnBoard(1, ["B"], ["C", "D", "DAZED", "E", "F"], ["A"])));
    t.observe(state(turnBoard(2, ["C", "DAZED", "D"], ["E", "F"], ["A", "B"])));
    expect(t.record).toMatchObject({ clean: 2, broke: "T1: DAZED put into the draw pile (at a random place, or a card back from the hand)" });
    expect(t.record.inserted).toBeUndefined();
  });

  it("a card moved onto the pile from the discard pile (Headbutt) still ends the order", () => {
    const t = new DrawTracker({ inserts: true });
    t.observe(state(turnBoard(1, ["A", "B"], ["C", "D"])));
    t.observe(state(turnBoard(1, ["B"], ["C", "D"], ["A"])));
    // B played (Headbutt-like): A from the discard pile onto the draw pile.
    t.observe(state(turnBoard(1, [], ["A", "C", "D"], ["B"])));
    expect(t.record.broke).toBe("T1: A moved onto the draw pile from the discard pile or the hand (Headbutt-like: on top)");
    expect(t.addedToPile).toBe(false);
  });

  it("SL_RETRY_KNOWN_TOP: a card moved on top (Headbutt) is drawn next, the order goes on, and it stays exact", () => {
    const known: KnownOrder = { keys: ["A", "B", "C", "D", "E"], names: ["a", "b", "c", "d", "e"], attempts: [1] };
    const t = new DrawTracker({ inserts: true, tops: true });
    t.observe(state(turnBoard(1, ["A", "B"], ["C", "D", "E"])));
    t.observe(state(turnBoard(1, ["B"], ["C", "D", "E"], ["A"])));
    // B played (Headbutt): to the discard pile, then (the selection screen, a step of its own) A onto the pile.
    t.observe(state(turnBoard(1, [], ["C", "D", "E"], ["A", "B"])));
    t.observe(state(turnBoard(1, [], ["A", "C", "D", "E"], ["B"])));
    expect(t.record).toMatchObject({ order: ["A", "B"], clean: 2, broke: null, topped: [{ turn: 1, at: 2, cards: ["A"] }] });
    expect(t.topped).toEqual({ keys: ["A"], names: ["A"] });
    expect(t.addedToPile).toBe(false);
    expect(checkKnown(known, t)).toEqual({ ok: true, keys: ["A", "C", "D", "E"], names: ["A", "c", "d", "e"] });
    // T2 draws A (the top), C, D: the order goes on with the pile's own C, D.
    t.observe(state(turnBoard(2, ["A", "C", "D"], ["E"], ["B"])));
    expect(t.record).toMatchObject({ order: ["A", "B", "C", "D"], clean: 4, broke: null });
    expect(checkKnown(known, t)).toEqual({ ok: true, keys: ["E"], names: ["e"] });
  });

  it("SL_RETRY_KNOWN_TOP: the next draw not the card on top ends the order; Thinking Ahead puts one back after its draws", () => {
    const t = new DrawTracker({ inserts: true, tops: true });
    t.observe(state(turnBoard(1, ["A", "B"], ["C", "D", "E"])));
    t.observe(state(turnBoard(1, ["B"], ["C", "D", "E"], ["A"])));
    t.observe(state(turnBoard(1, [], ["A", "C", "D", "E"], ["B"])));
    t.observe(state(turnBoard(2, ["C", "D"], ["A", "E"], ["B"])));
    expect(t.record.broke).toBe("T2: drew C where A, moved on top, was next");
    // Thinking Ahead-like: draws C and D, then puts B from the hand on top.
    const ahead = new DrawTracker({ inserts: true, tops: true });
    ahead.observe(state(turnBoard(1, ["A", "B"], ["C", "D", "E"])));
    ahead.observe(state(turnBoard(1, ["A", "C", "D"], ["B", "E"], [])));
    expect(ahead.record).toMatchObject({ order: ["A", "B", "C", "D"], broke: null, topped: [{ cards: ["B"] }] });
    expect(ahead.topped.keys).toEqual(["B"]);
  });

  it("a card taken out of the draw pile by choice (Seeker Strike) is not a draw: the order ends (RTF3KZLZPV2L F42 T1)", () => {
    const t = new DrawTracker({ inserts: true, tops: true });
    t.observe(state(turnBoard(1, ["A", "B"], ["C", "D", "E"])));
    const selection = turnBoard(1, ["A"], ["C", "D", "E"], ["B"]);
    selection["screen"] = "CARD_SELECTION";
    selection["selection"] = { kind: "deck_card_select", prompt: "选择一张牌加入你的手牌" };
    t.observe(state(selection));
    t.observe(state(turnBoard(1, ["A", "D"], ["C", "E"], ["B"])));
    expect(t.record.broke).toBe("T1: D taken from the draw pile by choice (选择一张牌加入你的手牌)");
    expect(t.record.clean).toBe(2);
  });

  it("SL_RETRY_KNOWN_TOP: a status that seems moved from the discard pile is added at a random place (Soul Fysh's Beckon)", () => {
    const t = new DrawTracker({ inserts: true, tops: true });
    t.observe(state(turnBoard(1, ["A", "BECKON"], ["C", "D"])));
    t.observe(state(turnBoard(1, ["A"], ["C", "D"], ["BECKON"])));
    t.observe(state(turnBoard(1, ["A"], ["BECKON", "C", "D"], [])));
    expect(t.record.inserted).toEqual([{ turn: 1, at: 2, cards: ["BECKON"] }]);
    expect(t.topped.keys).toEqual([]);
    expect(t.addedToPile).toBe(true);
  });

  it("an added copy of a card the pile has: drawing that card ends the order (the added one or the pile's own)", () => {
    const t = new DrawTracker({ inserts: true });
    t.observe(state(turnBoard(1, ["A"], ["B", "C", "D"])));
    // Metamorphosis-like: a C added.
    t.observe(state(turnBoard(1, [], ["B", "C", "C", "D"], ["A"])));
    t.observe(state(turnBoard(2, ["B", "C"], ["C", "D"], ["A"])));
    expect(t.record.broke).toBe("T2: drew C, which may be the one added to the draw pile or the pile's own");
    expect(t.record.clean).toBe(2);
  });

  it("an added card drawn at once (a status in the hand that never showed in the pile): recorded, no longer exact", () => {
    const t = new DrawTracker({ inserts: true });
    t.observe(state(turnBoard(1, ["A", "B"], ["C", "D", "E", "F"])));
    // The enemy turn adds Frantic Escape; T2's draw takes it with C and D.
    t.observe(state(turnBoard(2, ["C", "FRANTIC_ESCAPE", "D"], ["E", "F"], ["A", "B"])));
    expect(t.record).toMatchObject({ order: ["A", "B", "C", "D"], clean: 4, inserted: [{ turn: 2, at: 2, cards: [], drawn: ["FRANTIC_ESCAPE"] }] });
    expect(t.addedToPile).toBe(true);
    // Without the switch the record is as before, but the draws are not called exact either.
    const old = new DrawTracker();
    old.observe(state(turnBoard(1, ["A", "B"], ["C", "D", "E", "F"])));
    old.observe(state(turnBoard(2, ["C", "FRANTIC_ESCAPE", "D"], ["E", "F"], ["A", "B"])));
    expect(old.record).toEqual({ order: ["A", "B", "C", "D"], names: ["A", "B", "C", "D"], turns: [1, 1, 2, 2], clean: 4, broke: null });
    expect(old.addedToPile).toBe(true);
  });

  it("checkKnown: the added cards still in the pile ride along; nothing exact once this attempt saw a card added", () => {
    const known: KnownOrder = { keys: ["A", "B", "C", "D", "E", "F"], names: ["a", "b", "c", "d", "e", "f"], attempts: [1] };
    const t = new DrawTracker({ inserts: true });
    t.observe(state(turnBoard(1, ["A", "B"], ["C", "D", "E", "F"])));
    expect(checkKnown(known, t)).toEqual({ ok: true, keys: ["C", "D", "E", "F"], names: ["c", "d", "e", "f"] });
    t.observe(state(turnBoard(1, ["B"], ["C", "D", "DAZED", "DAZED", "E", "F"], ["A"])));
    expect(checkKnown(known, t)).toEqual({ ok: true, keys: ["C", "D", "E", "F"], names: ["c", "d", "e", "f"], inserted: { keys: ["DAZED", "DAZED"], names: ["DAZED", "DAZED"] }, exact: 0 });
  });

  it("knownOrderOf: the exact part of a record ends at its first added card; rows without any are all exact", () => {
    const withAdded = { order: ["A", "B", "C", "D"], names: ["a", "b", "c", "d"], turns: [1, 1, 2, 2], clean: 4, broke: null, inserted: [{ turn: 1, at: 2, cards: ["DAZED"] }] };
    expect(knownOrderOf([{ attempt: 1, draws: withAdded }]).known).toEqual({ keys: ["A", "B", "C", "D"], names: ["a", "b", "c", "d"], attempts: [1], exact: 2 });
    const plain = { ...withAdded, inserted: undefined };
    expect(knownOrderOf([{ attempt: 1, draws: plain }]).known).toEqual({ keys: ["A", "B", "C", "D"], names: ["a", "b", "c", "d"], attempts: [1] });
    // A later attempt without an added card confirms the order exactly further.
    expect(knownOrderOf([{ attempt: 1, draws: withAdded }, { attempt: 2, draws: { ...plain, order: ["A", "B", "C"], clean: 3 } }]).known?.exact).toBe(3);
    // checkKnown on a fresh attempt: the exact part left.
    const known = knownOrderOf([{ attempt: 1, draws: withAdded }]).known!;
    const t = new DrawTracker({ inserts: true });
    t.observe(state(turnBoard(1, ["A"], ["B", "C", "D", "E"])));
    expect(checkKnown(known, t)).toMatchObject({ ok: true, keys: ["B", "C", "D"], exact: 1 });
  });
});

describe("samples put the added cards at random places among the known ones", () => {
  const model = (cardId: string, i: number): CardModel =>
    ({ index: 900 + i, key: `p${i}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0], damage: 1, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0, draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "" }) as CardModel;
  const pile = ["A", "B", "C", "DAZED", "E", "F"].map(model);

  it("withAddedAtRandom: the order of the rest kept, every place for the added card taken about equally", () => {
    const counts = new Array(5).fill(0);
    const random = rng(7);
    for (let i = 0; i < 4000; i += 1) {
      const out = withAddedAtRandom(["a", "b", "c", "d"], ["X"], random);
      expect(out.filter((x) => x !== "X")).toEqual(["a", "b", "c", "d"]);
      counts[out.indexOf("X")] += 1;
    }
    for (const n of counts) expect(Math.abs(n - 800)).toBeLessThan(120);
  });

  it("the rollout's pile: the known cards drawn in order, the Dazed anywhere among them; without drawAdded as before", () => {
    const places = new Set<number>();
    for (let seed = 1; seed <= 60; seed += 1) {
      const drawn = sampledDrawPile({ draw: pile, discard: [], handBase: [], drawTop: [2, 0], drawAdded: [3] }, rng(seed)).map((c) => c.cardId).reverse();
      expect(drawn.filter((id) => id === "C" || id === "A")).toEqual(["C", "A"]);
      expect(drawn.indexOf("C")).toBeLessThan(drawn.indexOf("A"));
      expect([...drawn].sort()).toEqual(["A", "B", "C", "DAZED", "E", "F"]);
      places.add(drawn.indexOf("DAZED"));
    }
    expect(places.has(0)).toBe(true);
    expect(places.size).toBeGreaterThan(3);
    const plain = sampledDrawPile({ draw: pile, discard: [], handBase: [], drawTop: [2, 0] }, rng(3)).map((c) => c.cardId);
    expect(plain.slice(-2)).toEqual(["A", "C"]);
  });

  it("a draw potion's samples: the known cards in order with the added card among them", () => {
    const source: PotionMcSource = { potionId: "SWIFT_POTION", name: "Swift", slot: 0, text: "", kind: "draw", piles: { draw: pile, discard: [] }, knownTop: [4, 2], knownAdded: [3] };
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed += 1) {
      const drawn = samplePotion(source, [], rng(seed)).drawn!.map((c) => c.cardId);
      expect(drawn.filter((id) => id !== "DAZED").slice(0, 2)).toEqual(["E", "C"]);
      seen.add(drawn.join(","));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------- the controller

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempLog(): string {
  const dir = mkdtempSync(join(tmpdir(), "sl-early-test-"));
  dirs.push(dir);
  return join(dir, "sl-attempts.jsonl");
}
function rows(path: string): SlAttemptRow[] {
  return readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line) as SlAttemptRow);
}
function slConfig(log: string | null, overrides: Partial<SlConfig> = {}): SlConfig {
  return { enabled: true, bossRetries: 3, eliteRetries: 1, retryShowSim: true, retryKnownDraws: true, retryCompute: true, judgeKnownDraws: true, reloadEarly: true, retryKnownInserts: true, retryKnownTop: true, retryExplore: true, log, stepTimeoutMs: 5_000, ...overrides };
}

function setup(log: string, overrides: Partial<SlConfig> = {}) {
  const firstTurn = turnBoard(1, ["A", "B"], ["C", "D", "E"]);
  const lethal = turnBoard(2, ["C", "D", "E"], [], ["A", "B"], { lethal: true, hp: 10 });
  let current: Raw = lethal;
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
  sl.observe(state(turnBoard(1, [], ["A", "B", "C", "D", "E"])), memory);
  sl.observe(state(firstTurn), memory);
  sl.observe(state(lethal), memory);
  return { sl, notes, memory, lethal, actions, firstTurn };
}

describe("SlController.beforeLeastLoss (SL_RELOAD_EARLY)", () => {
  const context = (t: ReturnType<typeof setup>, facts: LeastLossFacts | undefined) => ({ label: LEAST_LOSS_LABEL, screenMemory: t.memory.screenMemory, journal: t.memory.journal, facts });

  it("certain at the least-loss verdict: reloads before the line, the row says early, the next attempt is told", async () => {
    const log = tempLog();
    const t = setup(log);
    const outcome = await t.sl.beforeLeastLoss(state(t.lethal), context(t, clean()));
    expect(outcome).toMatchObject({ handled: true, ok: true });
    expect(t.actions).toEqual(["save_and_quit", "continue_run"]);
    const [row] = rows(log);
    expect(row).toMatchObject({ result: "predicted_death", attempt: 1, judge: { tier: "least-loss", early: true } });
    expect(row!.judge!.reason).toMatch(/^at the least-loss verdict, before its line/);
    expect(t.notes.some((note) => /^SL: certain death foreseen at F17 T2 attempt 1\/4 \(least-loss, early: /.test(note))).toBe(true);
    const block = JSON.stringify(previousAttemptsJson(rows(log), 2, 4));
    expect(block).toContain("certain death on T2 with 10 HP + 0 block against 30 incoming from Test Subject (Attack 30): every line the planner simulated dies (the fight was reloaded before playing it out)");
  });

  it("random cases do not reload early (said once a turn); end_turn still judges as before", async () => {
    const log = tempLog();
    const t = setup(log);
    for (const facts of [clean({ chance: "飞剑回旋镖 has a random effect" }), clean({ draws: true }), undefined]) {
      expect(await t.sl.beforeLeastLoss(state(t.lethal), context(t, facts))).toEqual({ handled: false });
    }
    expect(t.actions).toEqual([]);
    expect(t.notes.filter((note) => note.includes("end_turn decides"))).toEqual([
      "SL: every simulated line dies at F17 T2 attempt 1/4, but not before the line is played: chance in the verdict (飞剑回旋镖 has a random effect); end_turn decides",
    ]);
  });

  it("cards added to the pile this attempt: not early (the tracker saw them)", async () => {
    const log = tempLog();
    const t = setup(log);
    // A Dazed added to the (empty) draw pile mid-turn.
    t.sl.observe(state(turnBoard(2, ["C", "D", "E"], ["DAZED"], ["A", "B"], { lethal: true, hp: 10 })), t.memory);
    expect(await t.sl.beforeLeastLoss(state(t.lethal), context(t, clean()))).toEqual({ handled: false });
    expect(t.actions).toEqual([]);
  });

  it("switched off, the wrong label, or no retry left: nothing", async () => {
    const off = setup(tempLog(), { reloadEarly: false });
    expect(await off.sl.beforeLeastLoss(state(off.lethal), context(off, clean()))).toEqual({ handled: false });
    expect(off.actions).toEqual([]);
    const plan = setup(tempLog());
    expect(await plan.sl.beforeLeastLoss(state(plan.lethal), { ...context(plan, clean()), label: "combat/plan" })).toEqual({ handled: false });
    const last = setup(tempLog(), { bossRetries: 0 });
    expect(await last.sl.beforeLeastLoss(state(last.lethal), context(last, clean()))).toEqual({ handled: false });
    expect(last.actions).toEqual([]);
  });

  it("describe(): the three switches", () => {
    expect(setup(tempLog()).sl.describe()).toMatchObject({ judge_known_draws: true, reload_early: true, retry_known_inserts: true });
    expect(setup(tempLog(), { judgeKnownDraws: false, reloadEarly: false, retryKnownInserts: false }).sl.describe()).toMatchObject({ judge_known_draws: false, reload_early: false, retry_known_inserts: false });
  });
});

describe("SlController: the HP lost so far this turn for Beating Remnant's cap", () => {
  const remnant = (raw: Raw, hp: number): Raw => {
    ((raw["run"] as Raw)["relics"] as Raw[]).push({ index: 9, relic_id: "BEATING_REMNANT", name: "律动残余", description: "你在一回合内失去的生命值不会超过[blue]20[/blue]点。" });
    for (const entry of (raw["combat"] as Raw)["hand"] as Raw[]) entry["playable"] = false;
    ((raw["combat"] as Raw)["player"] as Raw)["current_hp"] = hp;
    return raw;
  };
  it("nothing lost this turn (its first state at 10 HP): at most 20 more, 30 incoming: certain; an HP that rose in the turn: not exact", async () => {
    const t = setup(tempLog());
    const lethal = remnant(turnBoard(2, ["C", "D", "E"], [], ["A", "B"], { lethal: true, hp: 10 }), 10);
    t.sl.observe(state(lethal), t.memory);
    expect(await t.sl.beforeEndTurn(state(lethal), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal })).toMatchObject({ handled: true, ok: true });
    const rose = setup(tempLog());
    rose.sl.observe(state(remnant(turnBoard(2, ["C", "D", "E"], [], ["A", "B"], { lethal: true, hp: 10 }), 8)), rose.memory);
    const later = remnant(turnBoard(2, ["C", "D", "E"], [], ["A", "B"], { lethal: true, hp: 10 }), 10);
    rose.sl.observe(state(later), rose.memory);
    expect(await rose.sl.beforeEndTurn(state(later), { label: "combat/end_turn", screenMemory: rose.memory.screenMemory, journal: rose.memory.journal })).toEqual({ handled: false });
    expect(rose.notes.at(-1)).toBe("SL: ending the turn may be lethal (F17 T2 attempt 1/4), not certain: own count not exact: Beating Remnant caps the HP lost this turn at 20 and the HP lost so far this turn is not known exactly");
  });
});

describe("SlController.beforeEndTurn with SL_JUDGE_KNOWN_DRAWS", () => {
  it("a least-loss end_turn with a drawing card left: reloaded when the facts' draws are exactly known, not otherwise or when off", async () => {
    const drawingLethal = () => {
      const raw = turnBoard(2, ["C", "D", "E"], [], ["A", "B"], { lethal: true, hp: 10 });
      ((raw["combat"] as Raw)["hand"] as Raw[]).push(drawCard(3));
      return raw;
    };
    const known = setup(tempLog());
    const ok = await known.sl.beforeEndTurn(state(drawingLethal()), { label: LEAST_LOSS_LABEL, screenMemory: known.memory.screenMemory, journal: known.memory.journal, facts: clean({ draws: true, drawsKnown: true, knownDraws: 4 }) });
    expect(ok).toMatchObject({ handled: true, ok: true });
    const unknown = setup(tempLog());
    expect(await unknown.sl.beforeEndTurn(state(drawingLethal()), { label: LEAST_LOSS_LABEL, screenMemory: unknown.memory.screenMemory, journal: unknown.memory.journal, facts: clean({ draws: true }) })).toEqual({ handled: false });
    const off = setup(tempLog(), { judgeKnownDraws: false });
    expect(await off.sl.beforeEndTurn(state(drawingLethal()), { label: LEAST_LOSS_LABEL, screenMemory: off.memory.screenMemory, journal: off.memory.journal, facts: clean({ draws: true, drawsKnown: true, knownDraws: 4 }) })).toEqual({ handled: false });
  });
});

describe("the retry's known draws in the env (SL_RETRY_KNOWN_INSERTS)", () => {
  it("cards added at random places ride along, and nothing is exact; switched off, they end the order as before", async () => {
    const log = tempLog();
    const t = setup(log);
    expect(await t.sl.beforeEndTurn(state(turnBoard(2, ["C", "D", "E"], [], ["A", "B"], { lethal: true, hp: 10 })), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal })).toEqual({ handled: false });
    // Nothing playable: the rules tier reloads.
    const dead = turnBoard(2, ["C", "D", "E"], [], ["A", "B"], { lethal: true, hp: 10 });
    for (const entry of (dead["combat"] as Raw)["hand"] as Raw[]) entry["playable"] = false;
    expect(await t.sl.beforeEndTurn(state(dead), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal })).toMatchObject({ handled: true, ok: true });
    // Attempt 2 on T1 (A, B drawn); a Dazed added to the pile.
    t.sl.observe(state(turnBoard(1, ["B"], ["C", "D", "DAZED", "E"], ["A"])), t.memory);
    const env = t.sl.envFor(state(turnBoard(1, ["B"], ["C", "D", "DAZED", "E"], ["A"])));
    expect(env?.knownDraws).toEqual({ cards: ["C", "D", "E"], names: ["C", "D", "E"], attempts: [1], added: { cards: ["DAZED"], names: ["DAZED"] }, exact: 0 });
  });
});

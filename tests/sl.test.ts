/**
 * SL (docs/sl.md): the certain-death check, the elite list, the reload (save_and_quit, continue_run, checks) against
 * a fake game, and the controller (attempts, the log, the previous-attempts block, retries used up, a failed reload,
 * a restart reading its attempts back). No real save directory, no logs/ or .cache, no model.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { SlConfig } from "../src/config.js";
import { loadConfig } from "../src/config.js";
import type { ActionRequest } from "../src/mod/client.js";
import type { ActionResult } from "../src/mod/schema.js";
import { RunJournal } from "../src/project/run-journal.js";
import { createScreenMemory } from "../src/project/types.js";
import type { SlAttemptRow } from "../src/sl/attempts.js";
import { previousAttemptsJson } from "../src/sl/attempts.js";
import { SlController } from "../src/sl/controller.js";
import { listedElite, loadSlElites } from "../src/sl/elites.js";
import { judgeEndTurn, LEAST_LOSS_LABEL } from "../src/sl/judge.js";
import { encounterOf, reloadFight } from "../src/sl/reload.js";
import { testKnowledge } from "./scenarios.js";
import { bossBoard, mapBoard, menuBoard, state } from "./sl-support.js";

type Raw = Record<string, unknown>;

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempLog(): string {
  const dir = mkdtempSync(join(tmpdir(), "sl-test-"));
  dirs.push(dir);
  return join(dir, "sl-attempts.jsonl");
}

function rows(path: string): SlAttemptRow[] {
  return readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line) as SlAttemptRow);
}

/** A game that answers /state with `current` and moves on each action as `onAction` says (an Error throws). */
function fakeGame(initial: Raw, onAction: (action: string, current: Raw) => Raw | Error | null) {
  let current = initial;
  const actions: string[] = [];
  let clock = 0;
  const client = {
    state: async () => state(current),
    act: async (intent: ActionRequest): Promise<ActionResult> => {
      actions.push(intent.action);
      const next = onAction(intent.action, current);
      if (next instanceof Error) throw next;
      if (next) current = next;
      return { action: intent.action, status: "completed", stable: true, message: "", state: null, raw: {} };
    },
  };
  return {
    client,
    actions,
    set: (raw: Raw) => {
      current = raw;
    },
    // A clock that only moves when the reload sleeps: timeouts are instant and deterministic.
    sleep: async (ms: number) => {
      clock += ms;
    },
    now: () => clock,
  };
}

/** The game's SL path: save_and_quit -> the main menu, continue_run -> the fight's first turn (as the save has it). */
function reloadingGame(start: Raw, firstTurn: Raw) {
  return fakeGame(start, (action) => (action === "save_and_quit" ? menuBoard() : action === "continue_run" ? firstTurn : null));
}

function slConfig(log: string | null, overrides: Partial<SlConfig> = {}): SlConfig {
  return { enabled: true, bossRetries: 3, eliteRetries: 1, retryShowSim: true, log, stepTimeoutMs: 5_000, ...overrides };
}

describe("judgeEndTurn: certain death only when nothing can be ruled out", () => {
  const judge = (board: Raw, label = "combat/end_turn", revives: string[] = []) => judgeEndTurn(state(board), { label, revives });

  it("nothing to play or drink, the mod and our count agree: certain (rules)", () => {
    const verdict = judge(bossBoard({ hp: 10, damage: 30 }));
    expect(verdict).toMatchObject({ certain: true, tier: "rules", incoming: 30, hp: 10 });
    expect(verdict.killers).toEqual(["Test Subject (Attack 30)"]);
  });

  it("multi-hit intents count damage x hits", () => {
    expect(judge(bossBoard({ hp: 20, damage: 5, hits: 4 })).certain).toBe(true);
    expect(judge(bossBoard({ hp: 21, damage: 5, hits: 4 })).certain).toBe(false);
  });

  it("vetoes: the mod not flagging it, a revive, Buffer/Intangible, a special enemy phase", () => {
    expect(judge(bossBoard({ lethal: false })).reason).toMatch(/does not flag/);
    expect(judge(bossBoard(), "combat/end_turn", ["FAIRY_IN_A_BOTTLE"]).reason).toMatch(/revive/);
    expect(judge(bossBoard({ playerPowers: [{ power_id: "BUFFER_POWER", amount: 1 }] })).certain).toBe(false);
    expect(judge(bossBoard({ playerPowers: [{ power_id: "INTANGIBLE_POWER", amount: 1 }] })).certain).toBe(false);
    const giant = bossBoard();
    ((giant["combat"] as Raw)["enemies"] as Raw[])[0]!["max_hp"] = 999_999_999;
    expect(judge(giant).reason).toMatch(/special phase/);
    const deathBlow = bossBoard();
    ((((deathBlow["combat"] as Raw)["enemies"] as Raw[])[0]!["intents"]) as Raw[])[0]!["intent_type"] = "DeathBlow";
    expect(judge(deathBlow).certain).toBe(false);
  });

  it("our own count includes the block that comes at the end of the turn and Regen", () => {
    // 30 incoming vs 10 HP: certain; with 21 Plating, or 20 block + Cloak Clasp's 1 for the card held, not.
    expect(judge(bossBoard({ playerPowers: [{ power_id: "PLATING_POWER", amount: 21 }] })).certain).toBe(false);
    expect(judge(bossBoard({ block: 20, relics: ["CLOAK_CLASP"] })).reason).toMatch(/own count survives/);
    expect(judge(bossBoard({ block: 20 })).certain).toBe(true);
    expect(judge(bossBoard({ hp: 25, relics: ["ORICHALCUM"] })).certain).toBe(false);
    expect(judge(bossBoard({ hp: 24, relics: ["ORICHALCUM"] })).certain).toBe(true);
    expect(judge(bossBoard({ hp: 20, playerPowers: [{ power_id: "REGEN_POWER", amount: 11 }] })).certain).toBe(false);
    // Feel No Pain: counted for each Ethereal card held, and for a card with no text (unknown: the side of caution); not
    // for the others (7PWU F48 attempt 2 T6: 32 block counted for four non-Ethereal cards, none came, it died).
    const fnp = (text: string) => {
      const board = bossBoard({ hp: 20, playerPowers: [{ power_id: "FEEL_NO_PAIN_POWER", amount: 11 }] });
      (((board["combat"] as Raw)["hand"] as Raw[])[0]!)["resolved_rules_text"] = text;
      return judge(board);
    };
    expect(fnp("").certain).toBe(false);
    expect(fnp("无法被打出。 虚无。").certain).toBe(false);
    expect(fnp("造成6点伤害。").certain).toBe(true);
    expect(judge(bossBoard({ relics: ["RIPPLE_BASIN"] })).reason).toMatch(/Ripple Basin/);
  });

  it("a playable card or a drinkable potion vetoes, unless the planner's least-loss verdict ended the turn", () => {
    expect(judge(bossBoard({ playable: true })).reason).toMatch(/playable card/);
    expect(judge(bossBoard({ potion: true })).reason).toMatch(/potion/);
    expect(judge(bossBoard({ playable: true }), LEAST_LOSS_LABEL)).toMatchObject({ certain: true, tier: "least-loss" });
    expect(judge(bossBoard({ potion: true }), LEAST_LOSS_LABEL)).toMatchObject({ certain: true, tier: "least-loss" });
    // A card that draws: the draws are unknown.
    const drawing = bossBoard({ playable: true });
    const hand = (drawing["combat"] as Raw)["hand"] as Raw[];
    hand[0]!["resolved_rules_text"] = "造成9点伤害。抽1张牌。";
    expect(judge(drawing, LEAST_LOSS_LABEL).reason).toMatch(/draws/);
  });
});

describe("the hard elite list (src/sl/sl-elites.json)", () => {
  it("lists the hardest 5 non-boss fights by A8-A9 deaths (any room) with their enemy ids, source and date", () => {
    const list = loadSlElites();
    expect(list.elites.map((elite) => elite.name)).toEqual(["Decimillipede", "Entomancer", "Slumbering Beetle + Bowlbugs", "The Obscura", "Infested Prism"]);
    expect(list.date).toBe("2026-10-02");
    expect(list.source).toMatch(/A8-A9/);
    expect(listedElite(["DECIMILLIPEDE_SEGMENT_MIDDLE"], list)?.name).toBe("Decimillipede");
    expect(listedElite(["BOWLBUG_ROCK", "BOWLBUG_SILK", "SLUMBERING_BEETLE"], list)?.name).toBe("Slumbering Beetle + Bowlbugs");
    expect(listedElite(["BOWLBUG_NECTAR", "BOWLBUG_ROCK", "BOWLBUG_SILK"], list)).toBeNull();
    expect(listedElite(["FLAIL_KNIGHT", "MAGI_KNIGHT", "SPECTRAL_KNIGHT"], list)).toBeNull();
    expect(listedElite(["BYGONE_EFFIGY"], list)).toBeNull();
  });
});

describe("reloadFight", () => {
  const target = (board: Raw) => ({ runId: "TESTRUN123", floor: 17, encounter: encounterOf(state(board)) });

  it("save_and_quit, the main menu, continue_run, back on the same floor and fight", async () => {
    const start = bossBoard();
    const game = reloadingGame(start, bossBoard({ turn: 1, hp: 60, lethal: false }));
    const outcome = await reloadFight(target(start), state(start), { client: game.client, stepTimeoutMs: 5_000, sleep: game.sleep, now: game.now });
    expect(outcome).toMatchObject({ ok: true, resumedTurn: 1 });
    expect(game.actions).toEqual(["save_and_quit", "continue_run"]);
  });

  it("a turn-start choice in the fight (CARD_SELECTION on T1) is back in the fight", async () => {
    // JW925EDF9ZTQ F48: Continue landed on T1's turn-start discard; waiting for COMBAT timed out and stopped SL.
    const start = bossBoard();
    const choice = bossBoard({ turn: 1, hp: 60, lethal: false, ready: false });
    choice["screen"] = "CARD_SELECTION";
    choice["available_actions"] = ["save_and_quit", "select_deck_card", "confirm_selection", "discard_potion"];
    const game = reloadingGame(start, choice);
    const outcome = await reloadFight(target(start), state(start), { client: game.client, stepTimeoutMs: 5_000, sleep: game.sleep, now: game.now });
    expect(outcome).toMatchObject({ ok: true, resumedTurn: 1 });
    if (outcome.ok) expect(outcome.state.screen).toBe("CARD_SELECTION");
  });

  it("in the fight with nothing but leaving to do is not ready yet (times out at back_in_fight)", async () => {
    const start = bossBoard();
    const loading = bossBoard({ turn: 1, ready: false });
    loading["screen"] = "CARD_SELECTION";
    loading["available_actions"] = ["save_and_quit", "discard_potion"];
    const game = reloadingGame(start, loading);
    const outcome = await reloadFight(target(start), state(start), { client: game.client, stepTimeoutMs: 5_000, sleep: game.sleep, now: game.now });
    expect(outcome).toMatchObject({ ok: false, step: "back_in_fight" });
  });

  it("gives up without acting when save_and_quit is not legal", async () => {
    const start = bossBoard();
    start["available_actions"] = ["end_turn"];
    const game = reloadingGame(start, bossBoard({ turn: 1 }));
    const outcome = await reloadFight(target(start), state(start), { client: game.client, stepTimeoutMs: 5_000, sleep: game.sleep, now: game.now });
    expect(outcome).toMatchObject({ ok: false, step: "save_and_quit" });
    expect(game.actions).toEqual([]);
  });

  it("a main menu with nothing to continue times out (step main_menu)", async () => {
    const start = bossBoard();
    const game = fakeGame(start, (action) => (action === "save_and_quit" ? menuBoard(false) : null));
    const outcome = await reloadFight(target(start), state(start), { client: game.client, stepTimeoutMs: 5_000, sleep: game.sleep, now: game.now });
    expect(outcome).toMatchObject({ ok: false, step: "main_menu" });
    expect(game.actions).toEqual(["save_and_quit"]);
  });

  it("a timed-out save_and_quit that went through still reaches the menu", async () => {
    const start = bossBoard();
    let quit = false;
    const game = fakeGame(start, (action) => {
      if (action === "save_and_quit") {
        quit = true;
        return new Error("the request timed out");
      }
      return action === "continue_run" ? bossBoard({ turn: 1 }) : null;
    });
    const client = { ...game.client, state: async () => (quit && game.actions.length === 1 ? state(menuBoard()) : game.client.state()) };
    const outcome = await reloadFight(target(start), state(start), { client, stepTimeoutMs: 5_000, sleep: game.sleep, now: game.now });
    expect(outcome.ok).toBe(true);
  });

  it("continue_run landing elsewhere (the map, another floor, another fight) is a failed check", async () => {
    const start = bossBoard();
    for (const [landing, step, reason] of [
      [mapBoard(17), "back_in_fight", /resumed on MAP/],
      [bossBoard({ turn: 1, floor: 16 }), "verify", /floor 16/],
      [bossBoard({ turn: 1, enemyIds: ["JAW_WORM"] }), "verify", /another fight/],
      [bossBoard({ turn: 1, runId: "OTHERRUN" }), "verify", /another run/],
    ] as const) {
      const game = reloadingGame(start, landing);
      const outcome = await reloadFight(target(start), state(start), { client: game.client, stepTimeoutMs: 5_000, sleep: game.sleep, now: game.now });
      expect(outcome).toMatchObject({ ok: false, step });
      if (!outcome.ok) expect(outcome.reason).toMatch(reason);
    }
  });
});

describe("SlController", () => {
  function setup(log: string | null, firstTurn: Raw = bossBoard({ turn: 1, hp: 60, lethal: false }), overrides: Partial<SlConfig> = {}) {
    const lethal = bossBoard({ turn: 3, hp: 10 });
    const game = reloadingGame(lethal, firstTurn);
    const notes: string[] = [];
    const sl = new SlController({ config: slConfig(log, overrides), knowledge: testKnowledge, client: game.client, note: (m) => notes.push(m), sleep: game.sleep, now: game.now });
    const journal = new RunJournal();
    const screenMemory = createScreenMemory();
    const memory = { journal, screenMemory };
    return { sl, game, notes, memory, lethal, firstTurn };
  }

  /** Plays turn 1 to 3 of an attempt as the loop would: states observed, a card noted on T1. */
  function playToLethal(t: ReturnType<typeof setup>): void {
    const t1 = bossBoard({ turn: 1, hp: 60, lethal: false, playable: true });
    t.sl.observe(state(t1), t.memory);
    t.sl.noteAction(state(t1), { action: "play_card", card_index: 0, target_index: 0 });
    t.sl.observe(state(bossBoard({ turn: 2, hp: 35, lethal: false })), t.memory);
    t.sl.observe(state(t.lethal), t.memory);
  }

  it("a boss fight: attempt 1 tracked, a certain death reloads it, the row is logged and attempt 2 is told how 1 went", async () => {
    const log = tempLog();
    const t = setup(log);
    playToLethal(t);
    expect(t.sl.decisionFields()).toEqual({ sl_attempt: 1, sl_reloads: 0 });
    expect(t.sl.envFor(state(t.lethal))).toBeUndefined();
    const outcome = await t.sl.beforeEndTurn(state(t.lethal), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
    expect(outcome).toMatchObject({ handled: true, ok: true });
    expect(t.game.actions).toEqual(["save_and_quit", "continue_run"]);
    expect(t.sl.decisionFields()).toEqual({ sl_attempt: 2, sl_reloads: 1 });

    const [row] = rows(log);
    expect(row).toMatchObject({
      run_id: "TESTRUN123",
      floor: 17,
      encounter: "TEST_SUBJECT",
      fight_kind: "boss",
      elite: null,
      attempt: 1,
      max_attempts: 4,
      from: "first play of the fight",
      result: "predicted_death",
      turns: 3,
      end_hp: 10,
      incoming: 30,
      judge: { tier: "rules" },
      reload: { ok: true, resumed_turn: 1 },
      give_up_reason: null,
    });
    expect(row!.summary.turns.map((turn) => turn.turn)).toEqual([1, 2, 3]);
    expect(row!.summary.turns[0]!.plays).toEqual(["STRIKE_R -> Test Subject"]);
    expect(row!.summary.killers).toEqual(["Test Subject (Attack 30)"]);
    expect(typeof row!.started_at).toBe("string");

    const env = t.sl.envFor(state(t.firstTurn));
    expect(env).toMatchObject({ attempt: 2, maxAttempts: 4, showSim: true });
    const block = JSON.stringify(env!.previousAttempts);
    expect(block).toContain("attempt 2 of at most 4");
    expect(block).toContain("certain death at the end of T3");
    expect(block).toContain("T1: 60 HP; Test Subject 80/100; played STRIKE_R -> Test Subject");
    expect(block).toContain("the draws and the enemy moves are the same");
  });

  it("enemies sharing a name are named as the options name them (VNKN F25: the Decimillipede's segments)", async () => {
    const log = tempLog();
    // A second enemy with the boss's name and another id, as the Decimillipede's segments share 「残杀千足虫」 (the
    // options name each by the part of its id the other does not share: combat-plan distinctNames).
    const twin = (board: Raw): Raw => {
      for (const enemy of (board["combat"] as Raw)["enemies"] as Raw[]) enemy["name"] = "残杀千足虫";
      return board;
    };
    const ids = { enemyIds: ["TEST_SUBJECT", "TEST_SUBJECT_MIDDLE"] };
    const lethal = twin(bossBoard({ turn: 3, hp: 10, ...ids }));
    const game = reloadingGame(lethal, twin(bossBoard({ turn: 1, hp: 60, lethal: false, ...ids })));
    const sl = new SlController({ config: slConfig(log), knowledge: testKnowledge, client: game.client, note: () => undefined, sleep: game.sleep, now: game.now });
    const memory = { journal: new RunJournal(), screenMemory: createScreenMemory() };
    const t1 = twin(bossBoard({ turn: 1, hp: 60, lethal: false, playable: true, ...ids }));
    sl.observe(state(t1), memory);
    sl.noteAction(state(t1), { action: "play_card", card_index: 0, target_index: 1 });
    sl.observe(state(lethal), memory);
    await sl.beforeEndTurn(state(lethal), { label: "combat/end_turn", screenMemory: memory.screenMemory, journal: memory.journal });
    const [row] = rows(log);
    expect(row!.enemies).toEqual(["残杀千足虫 (SUBJECT)", "残杀千足虫 (SUBJECT_MIDDLE)"]);
    expect(row!.summary.turns[0]!.plays).toEqual(["STRIKE_R -> 残杀千足虫 (SUBJECT_MIDDLE)"]);
    expect(row!.summary.turns[0]!.enemies).toBe("残杀千足虫 (SUBJECT) 80/100, 残杀千足虫 (SUBJECT_MIDDLE) 80/100");
    expect(row!.summary.killers).toEqual(["残杀千足虫 (SUBJECT) (Attack 30)"]);
  });

  it("the second attempt's row says where it came from; a win closes it", async () => {
    const log = tempLog();
    const t = setup(log);
    playToLethal(t);
    await t.sl.beforeEndTurn(state(t.lethal), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
    t.sl.observe(state(t.firstTurn), t.memory);
    t.sl.observe(state(mapBoard(17)), t.memory);
    const second = rows(log)[1]!;
    expect(second).toMatchObject({ attempt: 2, result: "won", from: expect.stringMatching(/room-entry save of F17/), reload: null });
    expect(t.sl.decisionFields()).toEqual({ sl_attempt: null, sl_reloads: 1 });
  });

  it("retries used up: the turn ends as usual and the death is logged with the verdict", async () => {
    const log = tempLog();
    const t = setup(log, undefined, { bossRetries: 0 });
    playToLethal(t);
    const outcome = await t.sl.beforeEndTurn(state(t.lethal), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
    expect(outcome).toEqual({ handled: false });
    expect(t.game.actions).toEqual([]);
    t.sl.observe(state({ ...menuBoard(false), screen: "GAME_OVER", run_id: "TESTRUN123", game_over: { is_victory: false } }), t.memory);
    expect(rows(log)[0]).toMatchObject({ attempt: 1, max_attempts: 1, result: "died", judge: { tier: "rules" } });
    expect(t.notes.join("\n")).toMatch(/no retry left/);
  });

  it("not certain: no reload (a potion left), and the mod's lethal flag is reported", async () => {
    const t = setup(tempLog());
    playToLethal(t);
    const withPotion = bossBoard({ turn: 3, hp: 10, potion: true });
    const outcome = await t.sl.beforeEndTurn(state(withPotion), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
    expect(outcome).toEqual({ handled: false });
    expect(t.notes.join("\n")).toMatch(/may be lethal .* not certain: .*potion/);
  });

  it("continue_run back somewhere else: SL stops for the run, the reason is logged, the loop plays on", async () => {
    const log = tempLog();
    const t = setup(log, mapBoard(17));
    playToLethal(t);
    const outcome = await t.sl.beforeEndTurn(state(t.lethal), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
    expect(outcome).toMatchObject({ handled: true, ok: false });
    const [row] = rows(log);
    expect(row).toMatchObject({ result: "predicted_death", reload: { ok: false, step: "back_in_fight" }, give_up_reason: expect.stringMatching(/reload failed at back_in_fight/) });
    // No more SL this run: the next fight is not tracked and an end of turn is not intercepted.
    t.sl.observe(state(bossBoard({ turn: 1, floor: 33 })), t.memory);
    expect(t.sl.decisionFields().sl_attempt).toBeNull();
    expect(await t.sl.beforeEndTurn(state(bossBoard({ floor: 33 })), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal })).toEqual({ handled: false });
  });

  it("a restarted process reads the run's attempts back: the attempt count and the previous attempts go on", async () => {
    const log = tempLog();
    const t = setup(log);
    playToLethal(t);
    await t.sl.beforeEndTurn(state(t.lethal), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
    const again = setup(log);
    again.sl.observe(state(bossBoard({ turn: 1, hp: 60, lethal: false })), again.memory);
    expect(again.sl.decisionFields()).toEqual({ sl_attempt: 2, sl_reloads: 1 });
    expect(JSON.stringify(again.sl.envFor(state(again.firstTurn))?.previousAttempts)).toContain("certain death at the end of T3");
  });

  it("listed elites get SL_ELITE_RETRIES; other elites and hallway fights are not tracked", async () => {
    const t = setup(tempLog(), bossBoard({ turn: 1, enemyIds: ["ENTOMANCER"], lethal: false }));
    t.sl.observe(state(bossBoard({ turn: 1, enemyIds: ["ENTOMANCER"], lethal: false })), t.memory);
    expect(t.sl.decisionFields().sl_attempt).toBe(1);
    expect(t.notes.join("\n")).toMatch(/listed elite \(Entomancer\).*at most 2/);
    const other = setup(tempLog());
    other.sl.observe(state(bossBoard({ turn: 1, enemyIds: ["JAW_WORM", "CULTIST"] })), other.memory);
    expect(other.sl.decisionFields().sl_attempt).toBeNull();
  });

  it("the reload restores the journal and the Lizard Tail record from the fight's start", async () => {
    const t = setup(tempLog());
    t.memory.screenMemory.lizardTail = { runId: "TESTRUN123", used: false };
    playToLethal(t);
    t.memory.screenMemory.lizardTail = { runId: "TESTRUN123", used: true };
    t.memory.journal.choices.push({ seq: 99, at: 17, act: 1, floor: 17, label: "x", by: "code", choice: "during the failed attempt", reason: "" } as never);
    await t.sl.beforeEndTurn(state(t.lethal), { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
    expect(t.memory.screenMemory.lizardTail).toEqual({ runId: "TESTRUN123", used: false });
    expect(t.memory.journal.choices.some((choice) => choice.choice === "during the failed attempt")).toBe(false);
  });

  it("describe() is what run-config records", () => {
    const t = setup("/nowhere/sl.jsonl");
    expect(t.sl.describe()).toMatchObject({ enabled: true, boss_retries: 3, elite_retries: 1, retry_show_sim: true, elites: ["Decimillipede", "Entomancer", "Slumbering Beetle + Bowlbugs", "The Obscura", "Infested Prism"] });
  });
});

describe("previousAttemptsJson", () => {
  it("says the same deck and draws come back, and lists each attempt's end, potions and turns", () => {
    const row = {
      attempt: 1,
      result: "predicted_death",
      turns: 2,
      end_hp: 7,
      end_block: 3,
      incoming: 40,
      summary: { turns: [{ turn: 1, hp: 50, block: 0, enemies: "Queen 400/400", plays: ["Bash -> Queen", "potion Block Potion"] }], potions: ["T1 Block Potion"], killers: ["Queen (Attack 40)"] },
    } as unknown as SlAttemptRow;
    const json = previousAttemptsJson([row], 2, 4) as Record<string, unknown>;
    expect(json["this_attempt"]).toBe("attempt 2 of at most 4");
    expect(json["attempts"]).toEqual([
      {
        attempt: 1,
        ended: "certain death at the end of T2 with 7 HP + 3 block against 40 incoming from Queen (Attack 40) (the fight was reloaded before the enemy turn)",
        potions_drunk: "T1 Block Potion",
        turns: ["T1: 50 HP; Queen 400/400; played Bash -> Queen, potion Block Potion"],
      },
    ]);
  });
});

describe("configuration", () => {
  it("SL is on by default (Dai 2026-10-02), with retries 5 / 3, the sim shown on retries, the log next to the decision log", () => {
    const config = loadConfig({ DECISION_LOG: "/tmp/x/decisions.jsonl" } as NodeJS.ProcessEnv);
    expect(config.sl).toEqual({ enabled: true, bossRetries: 5, eliteRetries: 3, retryShowSim: true, log: "/tmp/x/sl-attempts.jsonl", stepTimeoutMs: 60_000 });
    const on = loadConfig({ SL_ENABLED: "on", SL_BOSS_RETRIES: "2", SL_ELITE_RETRIES: "0", SL_RETRY_SHOW_SIM: "off", SL_LOG: "off" } as NodeJS.ProcessEnv);
    expect(on.sl).toMatchObject({ enabled: true, bossRetries: 2, eliteRetries: 0, retryShowSim: false, log: null });
    expect(() => loadConfig({ SL_BOSS_RETRIES: "-1" } as NodeJS.ProcessEnv)).toThrow(/SL_BOSS_RETRIES/);
    expect(loadConfig({ SL_ENABLED: "off" } as NodeJS.ProcessEnv).sl.enabled).toBe(false);
  });

  it("THIEF_FACTS and THIEF_COST are on by default (Dai 2026-10-02); off turns each off", () => {
    const config = loadConfig({} as NodeJS.ProcessEnv);
    expect([config.thiefFacts, config.thiefCost]).toEqual([true, true]);
    const off = loadConfig({ THIEF_FACTS: "off", THIEF_COST: "off" } as NodeJS.ProcessEnv);
    expect([off.thiefFacts, off.thiefCost]).toEqual([false, false]);
  });
});

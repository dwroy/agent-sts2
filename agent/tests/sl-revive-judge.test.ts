/**
 * Revives in the SL judge and the Lizard Tail tracker (docs/sl.md §2.7; ops 2026-10-03, ET3V5177HXSY F48, the Aeonglass, A9:
 * died at T13 with 5 retries unused). T9 ended at 12 HP + 7 block with no attack shown, two held Wither+2 and Crimson Mantle
 * up: the Withers left 1, the Mantle's 1 at T10's start took it, the Lizard Tail fired and T10 opened at 37 of 74. The
 * tracker's lethal read counted the intents alone, so the tail stayed "left", and at T13 (7 HP + 7 block, three held
 * Wither+4, the Aeonglass's 36, nothing to play) the judge said "a revive is left" with nothing left. With the tail known
 * spent, Beating Remnant still refused it ("own count not exact": the Mantle's start-of-turn loss); the judge now takes the
 * cap at its lowest. A revive held is played out loss by loss (every order), so a death it cannot stop is judged like any
 * other. And the GAME_OVER state seen twice opened a second "attempt 1" row. Boards are the logged ones
 * (tests/sl-revive-judge-data, make-fixtures.ts; some edited), the knowledge the mod's collections trimmed to them. No model
 * call, nothing under logs/ or .cache read.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { SlConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import type { ActionRequest } from "../src/hand/mod/client.js";
import { parseGameState, type ActionResult, type GameState } from "../src/hand/mod/schema.js";
import { RunJournal } from "../src/memory/run-journal.js";
import { createScreenMemory, type ScreenMemory } from "../src/memory/types.js";
import { noteLizardTailEndTurn, revivesOf, trackLizardTail } from "../src/reflex/combat-plan.js";
import type { SlAttemptRow } from "../src/sl/attempts.js";
import { SlController, turnStartLoss } from "../src/sl/controller.js";
import { judgeEndTurn, judgeLeastLossNow, LEAST_LOSS_LABEL, type DeathVerdict, type JudgeContext } from "../src/sl/judge.js";
import { heldCardEthereal } from "../src/reflex/card-model.js";
import { menuBoard } from "./sl-support.js";

type Raw = Record<string, unknown>;
const DATA = join(dirname(fileURLToPath(import.meta.url)), "sl-revive-judge-data");
const FIXTURE = JSON.parse(readFileSync(join(DATA, "boards.json"), "utf8")) as { states: Record<string, Raw> };
const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")) as Record<string, unknown[]>, "cache");

const board = (key: string): Raw => {
  const raw = FIXTURE.states[key];
  if (!raw) throw new Error(`boards.json has no state ${key}`);
  return structuredClone(raw);
};
const combat = (raw: Raw) => raw["combat"] as Raw;
const player = (raw: Raw) => combat(raw)["player"] as Raw;
const enemies = (raw: Raw) => combat(raw)["enemies"] as Raw[];
const relics = (raw: Raw) => (raw["run"] as Raw)["relics"] as Raw[];
const dropRelic = (raw: Raw, id: string) => {
  (raw["run"] as Raw)["relics"] = relics(raw).filter((relic) => relic["relic_id"] !== id);
};
const setAttack = (enemy: Raw, damage: number, hits = 1) => {
  enemy["intents"] = [{ index: 0, intent_type: "Attack", label: String(damage), damage, hits, total_damage: damage * hits, status_card_count: null }];
};
const ethereal = (card: Record<string, unknown>) => heldCardEthereal(card, knowledge);
const judge = (raw: Raw, extra: Partial<JudgeContext> = {}): DeathVerdict =>
  judgeEndTurn(parseGameState(raw), { label: "combat/end_turn", revives: [], ethereal, knowledge, ...extra });

/** As the loop: each state read is tracked (Lizard Tail), an end_turn sent on it noted. */
function feed(memory: ScreenMemory, raw: Raw, endTurn = false): string | null {
  const state = parseGameState(structuredClone(raw));
  const how = trackLizardTail(memory, state);
  if (endTurn) noteLizardTailEndTurn(memory, state, { action: "end_turn" });
  return how;
}
const sources = (memory: ScreenMemory, raw: Raw): string[] => {
  const state = parseGameState(structuredClone(raw));
  return revivesOf(state, memory, state.run?.max_hp ?? 0).map((revive) => revive.source);
};

describe("ET3V5177HXSY F48: the tail fired at T10's start, read from the held Withers and the Mantle", () => {
  it("T9's end reads lethal on the held cards and the next turn's start (no attack shown), and T10's 37 marks the tail spent", () => {
    const memory = createScreenMemory("COMBAT");
    const t9 = board("et3v_f48_t9_end");
    expect(combat(t9)["end_turn_will_kill_player"]).toBe(false);
    expect(feed(memory, t9, true)).toBeNull();
    // 9 + 9 against 7 block leaves 1; Crimson Mantle's 1 at the next turn's start: 12 = our HP.
    expect(memory.lizardTail?.last).toMatchObject({ turn: 9, hp: 12, block: 7, lethal: true, hits: [], heldHits: [9, 9], startLoss: 1, ended: true });
    expect(feed(memory, board("et3v_f48_t10_start"))).toBe("HP rose 12 -> 37 after a lethal read");
    expect(memory.lizardTail).toMatchObject({ used: true, seen: { fight: "2:48", turn: 10 } });
    expect(sources(memory, board("et3v_f48_t13_end"))).toEqual([]);
  });

  it("the same T9 without the held Withers, or a T10 that did not rise to the revive: not the tail", () => {
    // No held damage: the intents (none) and the Mantle's 1 do not reach 12.
    const memory = createScreenMemory("COMBAT");
    const dry = board("et3v_f48_t9_end");
    combat(dry)["hand"] = (combat(dry)["hand"] as Raw[]).filter((card) => card["card_id"] !== "WITHER");
    feed(memory, dry, true);
    expect(memory.lizardTail?.last).toMatchObject({ lethal: false });
    expect(feed(memory, board("et3v_f48_t10_start"))).toBeNull();
    // T10 at 11 (Orichalcum's block came) or 1 (lower than the turn ended, far from what the revive leaves): no revive read.
    for (const hp of [11, 1]) {
      const m = createScreenMemory("COMBAT");
      feed(m, board("et3v_f48_t9_end"), true);
      const t10 = board("et3v_f48_t10_start");
      player(t10)["current_hp"] = hp;
      expect(feed(m, t10)).toBeNull();
      expect(m.lizardTail?.used).toBe(false);
    }
  });
});

describe("ET3V5177HXSY F48 T13: Beating Remnant's cap at its lowest when the turn's start took HP", () => {
  it("the tail spent: certain (rules) with at most 1 lost so far; not exact without it, as before", () => {
    const t13 = board("et3v_f48_t13_end");
    expect(judge(t13).reason).toBe("own count not exact: Beating Remnant caps the HP lost this turn at 20 and the HP lost so far this turn is not known exactly");
    const verdict = judge(t13, { lostSoFarAtMost: 1 });
    expect(verdict).toMatchObject({ certain: true, tier: "rules", hp: 7, block: 7, incoming: 36 });
    expect(verdict.reason).toBe("nothing left to play or drink; 36 incoming vs 7 HP + 7 block + 6 end-of-turn block (Beating Remnant: at most 20 lost this turn, at most 1 lost so far (the turn's start took HP))");
    // The cap at its lowest is 20 - 1 = 19 of the 68 that land: dead whichever way the start counts. At most 13 lost so far
    // still leaves 7; at most 14 leaves 1, and the Mantle's 1 at the next turn's start (under that turn's own cap) takes it;
    // at most 15 no longer kills.
    expect(judge(t13, { lostSoFarAtMost: 13 }).certain).toBe(true);
    expect(judge(t13, { lostSoFarAtMost: 14 })).toMatchObject({ certain: true, startLoss: 1 });
    expect(judge(t13, { lostSoFarAtMost: 15 }).reason).toMatch(/^own count survives: 5 HP lost/);
  });

  it("the controller's most lost so far: Crimson Mantle's cost (and Inferno's copies) when nothing else took HP at the start", () => {
    expect(turnStartLoss(parseGameState(board("et3v_f48_t13_end")), knowledge)).toEqual({ startLoss: true, startLossMost: 1 });
    // Inferno 6: one copy, 1.
    expect(turnStartLoss(parseGameState(board("9xzx_f33_t7_end")), knowledge)).toEqual({ startLoss: true, startLossMost: 1 });
    // Poison on us: its loss at the start not read here.
    const poisoned = board("et3v_f48_t13_end");
    (player(poisoned)["powers"] as Raw[]).push({ index: 9, power_id: "POISON_POWER", name: "中毒", amount: 3, is_debuff: true });
    expect(turnStartLoss(parseGameState(poisoned), knowledge)).toEqual({ startLoss: true, startLossMost: null });
    expect(turnStartLoss(parseGameState(board("rjzg_f31_t7_end")), knowledge)).toEqual({ startLoss: false, startLossMost: 0 });
  });

  it("9XZX4ZJ1ZKUA F33 T7 (A2, before SL): 5 HP + 17 block against 26, Beating Remnant and Inferno: certain with at most 1 lost, died", () => {
    const raw = board("9xzx_f33_t7_end");
    expect(judge(raw, { label: LEAST_LOSS_LABEL }).reason).toMatch(/^own count not exact/);
    expect(judge(raw, { label: LEAST_LOSS_LABEL, lostSoFarAtMost: 1 })).toMatchObject({ certain: true, tier: "rules" });
  });
});

describe("a revive held is played out loss by loss (docs/sl.md §2.7)", () => {
  it("the logged revives: the HP the judge's count leaves is the next turn's HP", () => {
    const cases: [string, string[], string][] = [
      // 11 HP, no block, the Crusher's 23: the Fairy (first) back at 24; T6 opened at 24.
      ["et3v_f33_t5_end", ["FAIRY_IN_A_BOTTLE", "LIZARD_TAIL"], "a revive is left (FAIRY_IN_A_BOTTLE, LIZARD_TAIL): FAIRY_IN_A_BOTTLE back at 24 HP, the rest of the turn leaves 24"],
      // 14 HP against 12x3: 2 -> 0 -> 40 -> 28; T4 opened at 28.
      ["y8e0_f48_t3_end", ["LIZARD_TAIL"], "a revive is left (LIZARD_TAIL): back at 40 HP, the rest of the turn leaves 28"],
      // 19 HP against the Entomancer's 5x8: back at 24 on the 4th hit, 4 left; the next turn at 4.
      ["rjzg_f31_t7_end", ["FAIRY_IN_A_BOTTLE"], "a revive is left (FAIRY_IN_A_BOTTLE): back at 24 HP, the rest of the turn leaves 4"],
      // 10 HP + 10 block + Plating 1 against 5x8: back at 26 (30% of 87), 11 left; the next turn at 11.
      ["yql8_f31_t4_end", ["FAIRY_IN_A_BOTTLE"], "a revive is left (FAIRY_IN_A_BOTTLE): back at 26 HP, the rest of the turn leaves 11"],
    ];
    for (const [key, revives, reason] of cases) {
      const verdict = judge(board(key), { revives });
      expect(verdict, key).toMatchObject({ certain: false, reason, revive: { saved: true } });
    }
    // JR66CJ9T8H7W F48 T8 (least-loss): 2 HP against 18x2, two Fairies: one back at 31, 12 left; the next turn at 12.
    const jr66 = judge(board("jr66_f48_t8_end"), { label: LEAST_LOSS_LABEL, revives: ["FAIRY_IN_A_BOTTLE", "FAIRY_IN_A_BOTTLE"] });
    expect(jr66).toMatchObject({ certain: false, revive: { used: ["FAIRY_IN_A_BOTTLE"], backAt: [31], hpLeft: 12, saved: true } });
  });

  it("T13 had the tail been left (Beating Remnant taken out): 15 takes us to 0, back at 37, 15 + 15 leave 7, the 36 kills: certain", () => {
    const raw = board("et3v_f48_t13_end");
    dropRelic(raw, "BEATING_REMNANT");
    expect(judge(raw)).toMatchObject({ certain: true, tier: "rules" });
    const verdict = judge(raw, { revives: ["LIZARD_TAIL"] });
    expect(verdict).toMatchObject({ certain: true, tier: "rules", revive: { held: ["LIZARD_TAIL"], used: ["LIZARD_TAIL"], backAt: [37], hpLeft: -14, saved: false } });
    expect(verdict.reason).toBe("nothing left to play or drink; 36 incoming vs 7 HP + 7 block + 6 end-of-turn block; back at 37 HP, the rest of the turn still kills (-14 left)");
    // With Beating Remnant (as logged) the cap is played out at the most it can save: 19 left (1 lost so far at most), the
    // first Wither's 2 past the block and the second's 15 count against it, back at 37, the third Wither and the 36 take the
    // last 2, the Mantle's 1 at the next turn's start: 34. The revive may save us: not certain.
    expect(judge(board("et3v_f48_t13_end"), { revives: ["LIZARD_TAIL"], lostSoFarAtMost: 1 })).toMatchObject({
      certain: false, reason: "a revive is left (LIZARD_TAIL): back at 37 HP, the rest of the turn leaves 34", revive: { used: ["LIZARD_TAIL"], backAt: [37], hpLeft: 34, saved: true },
    });
    // The HP lost so far not known: the cap's lowest is not known either (our own count's veto, before the revive's).
    expect(judge(board("et3v_f48_t13_end"), { revives: ["LIZARD_TAIL"] }).reason).toBe("own count not exact: Beating Remnant caps the HP lost this turn at 20 and the HP lost so far this turn is not known exactly");
  });

  it("what is left after the revive decides: the hits after it, and our own loss at the next turn's start (refused)", () => {
    const at = (damage: number) => {
      const raw = board("et3v_f48_t13_end");
      dropRelic(raw, "BEATING_REMNANT");
      setAttack(enemies(raw)[0]!, damage);
      return judge(raw, { revives: ["LIZARD_TAIL"] });
    };
    // 22 left after the Withers: 21 leaves 1, and the Mantle's 1 at the next turn's start would take it.
    expect(at(21).reason).toBe("a revive is left (LIZARD_TAIL): after the revive only our own loss at the next turn's start would kill us, and an enemy dying in its turn would stop it: not judged with a revive");
    expect(at(20)).toMatchObject({ certain: false, reason: "a revive is left (LIZARD_TAIL): back at 37 HP, the rest of the turn leaves 1" });
    expect(at(22)).toMatchObject({ certain: true, tier: "rules" });
  });

  it("two revives: both spent and still dead is certain; one left over is not", () => {
    const raw = board("et3v_f48_t13_end");
    dropRelic(raw, "BEATING_REMNANT");
    setAttack(enemies(raw)[0]!, 30, 3);
    // 7 + 13 block: 15 -> 5; 15 -> 0, Fairy 22 (30% of 74); 15 -> 7; 30 -> 0, the tail 37; 30 -> 7; 30 -> dead. Two hits: 7
    // left, 6 after the Mantle's 1 at the next turn's start.
    const both = judge(raw, { revives: ["FAIRY_IN_A_BOTTLE", "LIZARD_TAIL"] });
    expect(both).toMatchObject({ certain: true, revive: { used: ["FAIRY_IN_A_BOTTLE", "LIZARD_TAIL"], backAt: [22, 37], saved: false } });
    setAttack(enemies(raw)[0]!, 30, 2);
    expect(judge(raw, { revives: ["FAIRY_IN_A_BOTTLE", "LIZARD_TAIL"] })).toMatchObject({ certain: false, reason: "a revive is left (FAIRY_IN_A_BOTTLE, LIZARD_TAIL): FAIRY_IN_A_BOTTLE back at 22, then LIZARD_TAIL back at 37 HP, the rest of the turn leaves 6" });
  });

  it("every order the game could take: the enemies' turns (Y8E0 F48 T3 with the Queen attacking 30)", () => {
    // Board order (the Amalgam's 12x3, then the Queen's 30): 2, 0 -> 40, 28, 16, then 30 kills. The Queen first: 14 - 30 ->
    // 40, then 28, 16, 4: alive. Not certain, the best order's 4.
    const raw = board("y8e0_f48_t3_end");
    const queen = enemies(raw).find((enemy) => enemy["enemy_id"] === "QUEEN")!;
    setAttack(queen, 30);
    expect(judge(raw, { revives: ["LIZARD_TAIL"] })).toMatchObject({ certain: false, reason: "a revive is left (LIZARD_TAIL): back at 40 HP, the rest of the turn leaves 4", revive: { hpLeft: 4 } });
    // Without the revive: dead either way (certain, nothing to play).
    expect(judge(raw)).toMatchObject({ certain: true, tier: "rules" });
  });

  it("the least-loss tier with a revive: the planner's lines are taken only where the order is the only one", () => {
    // JR66 F48 T8 edited: 18x2 -> 40x2 (one attacker, no held card): both Fairies spent and dead; the planner's verdict counts.
    const raw = board("jr66_f48_t8_end");
    setAttack(enemies(raw)[0]!, 40, 2);
    const revives = ["FAIRY_IN_A_BOTTLE"];
    expect(judge(raw, { label: LEAST_LOSS_LABEL, revives })).toMatchObject({ certain: true, tier: "least-loss", revive: { used: ["FAIRY_IN_A_BOTTLE"], saved: false } });
    // Regen: before or after the held cards is not known with a revive in the turn.
    const regen = structuredClone(raw);
    (player(regen)["powers"] as Raw[]).push({ index: 9, power_id: "REGEN_POWER", name: "再生", amount: 1, is_debuff: false });
    expect(judge(regen, { label: LEAST_LOSS_LABEL, revives }).reason).toBe("the planner sees every line die, but a revive is left (FAIRY_IN_A_BOTTLE) and its lines play it out in one order: Regen heals before or after the held cards");
    // The early reload asks the same.
    const facts = { knownDraws: 0, drawsKnown: false, draws: false, line: ["打击 -> 永世沙漏"], chance: null };
    expect(judgeLeastLossNow(parseGameState(regen), { revives, ethereal, facts, knownDrawsJudge: true, addedToPile: false, knowledge }).certain).toBe(false);
  });

  it("SL_RELOAD_ON_REVIVE (default off): a board only the revive saves is judged as without it", () => {
    const raw = board("rjzg_f31_t7_end");
    expect(judge(raw, { revives: ["FAIRY_IN_A_BOTTLE"] }).certain).toBe(false);
    const on = judge(raw, { revives: ["FAIRY_IN_A_BOTTLE"], reloadOnRevive: true });
    expect(on).toMatchObject({ certain: true, tier: "rules", revive: { used: ["FAIRY_IN_A_BOTTLE"], hpLeft: 4, saved: true } });
    expect(on.reason).toBe("nothing left to play or drink; 40 incoming vs 19 HP + 0 block + 0 end-of-turn block (SL_RELOAD_ON_REVIVE: FAIRY_IN_A_BOTTLE not counted)");
  });
});

describe("the SL controller on ET3V5177HXSY F48", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });
  const tempLog = () => {
    const dir = mkdtempSync(join(tmpdir(), "sl-revive-"));
    dirs.push(dir);
    return join(dir, "sl-attempts.jsonl");
  };
  const rows = (path: string): SlAttemptRow[] => {
    try {
      return readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as SlAttemptRow);
    } catch {
      return [];
    }
  };
  const config = (log: string, overrides: Partial<SlConfig> = {}): SlConfig => ({
    enabled: true, bossRetries: 5, eliteRetries: 3, act3LowHp: true, act3LowHpPct: 50, retryShowSim: false, retryKnownDraws: false, retryCompute: false, judgeKnownDraws: true, judgeAnyDraw: true, reloadEarly: true,
    retryKnownInserts: false, retryKnownTop: false, retryExplore: false, retryExploreB2: false, retryExploreBossPotions: false, retryExploreOrder: false, retryExploreReplay: false, retryExploreCanon: false,
    retryExploreTurn: false, retryExploreWhole: false, retryExploreWhere: false, retryExplorePotion: false, retryKnownPicks: false, retryExploreReplayPlays: false, retryExploreReplayDeviate: false,
    retryKnownOffTop: false, retryKnownHandOrder: false, log, stepTimeoutMs: 5_000, ...overrides,
  });
  /** A game that goes to the menu on save_and_quit and back to the fight's T1 on continue_run. */
  const game = (start: Raw) => {
    let current = start;
    const actions: string[] = [];
    let clock = 0;
    const firstTurn = board("et3v_f48_t9_end");
    firstTurn["turn"] = 1;
    return {
      actions,
      client: {
        state: async (): Promise<GameState> => parseGameState(structuredClone(current)),
        act: async (intent: ActionRequest): Promise<ActionResult> => {
          actions.push(intent.action);
          current = intent.action === "save_and_quit" ? menuBoard() : intent.action === "continue_run" ? firstTurn : current;
          return { action: intent.action, status: "completed", stable: true, message: "", state: null, raw: {} };
        },
      },
      sleep: async (ms: number) => {
        clock += ms;
      },
      now: () => clock,
    };
  };
  /** The loop's order on each state: the Lizard Tail tracker, then SL. */
  const observe = (sl: SlController, memory: { journal: RunJournal; screenMemory: ScreenMemory }, raw: Raw) => {
    const state = parseGameState(structuredClone(raw));
    trackLizardTail(memory.screenMemory, state);
    sl.observe(state, memory);
    return state;
  };

  it("T13: the tail read spent at T10, at most 1 lost so far (the Mantle): a certain death, reloaded with 5 retries left", async () => {
    const log = tempLog();
    const g = game(board("et3v_f48_t13_end"));
    const notes: string[] = [];
    const sl = new SlController({ config: config(log), knowledge, client: g.client as never, note: (m) => notes.push(m), sleep: g.sleep, now: g.now });
    const memory = { journal: new RunJournal(), screenMemory: createScreenMemory() };
    const t9 = observe(sl, memory, board("et3v_f48_t9_end"));
    noteLizardTailEndTurn(memory.screenMemory, t9, { action: "end_turn" });
    observe(sl, memory, board("et3v_f48_t10_start"));
    expect(memory.screenMemory.lizardTail?.used).toBe(true);
    const t13 = observe(sl, memory, board("et3v_f48_t13_end"));
    const outcome = await sl.beforeEndTurn(t13, { label: "combat/end_turn", screenMemory: memory.screenMemory, journal: memory.journal });
    expect(outcome).toMatchObject({ handled: true, ok: true });
    expect(g.actions).toEqual(["save_and_quit", "continue_run"]);
    expect(rows(log)[0]).toMatchObject({ floor: 48, attempt: 1, result: "predicted_death", judge: { tier: "rules", reason: expect.stringContaining("at most 1 lost so far") } });
    expect(notes.join("\n")).toMatch(/certain death foreseen at F48 T13 attempt 1\/6/);
  });

  it("the run over: GAME_OVER seen twice (the loop's run-end call, then the per-state one) writes one row and tracks nothing new", async () => {
    const log = tempLog();
    const g = game(board("et3v_f48_t13_end"));
    const notes: string[] = [];
    const sl = new SlController({ config: config(log), knowledge, client: g.client as never, note: (m) => notes.push(m), sleep: g.sleep, now: g.now });
    const memory = { journal: new RunJournal(), screenMemory: createScreenMemory() };
    // The tail left (as the tracker had it then): the judge refuses, the turn ends, the run is lost.
    const t13 = observe(sl, memory, board("et3v_f48_t13_end"));
    expect(await sl.beforeEndTurn(t13, { label: "combat/end_turn", screenMemory: memory.screenMemory, journal: memory.journal })).toEqual({ handled: false });
    expect(notes.join("\n")).toMatch(/may be lethal \(F48 T13 attempt 1\/6\), not certain: a revive is left \(LIZARD_TAIL\)/);
    const over = board("et3v_f48_game_over");
    expect(parseGameState(structuredClone(over))).toMatchObject({ screen: "GAME_OVER", in_combat: true });
    for (let i = 0; i < 3; i += 1) observe(sl, memory, over);
    expect(rows(log)).toHaveLength(1);
    expect(rows(log)[0]).toMatchObject({ floor: 48, attempt: 1, result: "died", turns: 13 });
    expect(notes.filter((note) => note.startsWith("SL: tracking"))).toHaveLength(1);
    expect(sl.decisionFields()).toEqual({ sl_attempt: null, sl_reloads: 0 });
  });
});

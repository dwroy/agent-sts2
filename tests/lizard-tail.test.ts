/**
 * Lizard Tail's one use a run, read from the states (combat-plan trackLizardTail): logged frames around its logged
 * triggers (tests/lizard-tail-data, make-fixtures.py), never the refreshing knowledge files. Y8E0KK4L7JBL F48: the tail
 * fired in T3's enemy turn and the hits went on (14 HP against 12x3: 2 -> 0 -> 40 -> 28), T4 opened at 28 of 80, outside
 * the old window (35-40), so the tail stayed "left": the SL judge said "a revive is left" at T6 and never reloaded.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseGameState, type GameState } from "../src/mod/schema.js";
import { replayRun } from "../src/project/journal-replay.js";
import { createScreenMemory, type ScreenMemory } from "../src/project/types.js";
import { noteLizardTailEndTurn, revivesOf, trackLizardTail } from "../src/screens/combat-plan.js";
import { judgeEndTurn } from "../src/sl/judge.js";
import { loggedKnowledge } from "./logged.js";

type Raw = Record<string, unknown>;
interface Frame {
  name: string;
  source: string;
  decision: { label: string; action: string } | null;
  state: Raw;
}

const DIR = join(dirname(fileURLToPath(import.meta.url)), "lizard-tail-data");
const TAIL = { index: 99, relic_id: "LIZARD_TAIL", name: "蜥蜴尾巴", stack: null, is_melted: false };

/** A logged sequence's frames by name (fresh copies), the tail put in the relics when `withTail` (runs that never held it). */
function sequence(name: string, withTail = false): Record<string, Frame> {
  const frames = JSON.parse(readFileSync(join(DIR, `${name}.json`), "utf8")) as Frame[];
  if (withTail) for (const frame of frames) ((frame.state["run"] as Raw)["relics"] as Raw[]).push({ ...TAIL });
  return Object.fromEntries(frames.map((frame) => [frame.name, frame]));
}

const parse = (frame: Frame): GameState => parseGameState(structuredClone(frame.state));

/** As the loop: the state is read (tracked), then its logged decision goes out (an end_turn noted). */
function feed(memory: ScreenMemory, frame: Frame): string | null {
  const state = parse(frame);
  const how = trackLizardTail(memory, state);
  if (frame.decision) noteLizardTailEndTurn(memory, state, { action: frame.decision.action } as never);
  return how;
}

const sources = (memory: ScreenMemory, frame: Frame): string[] => {
  const state = parse(frame);
  return revivesOf(state, memory, state.run?.max_hp ?? 0).map((revive) => revive.source);
};

describe("trackLizardTail reads the revive from our HP (Y8E0KK4L7JBL F48 and the other logged triggers)", () => {
  it("Y8E0 F48: T3 ends at 14 against 12x3, T4 opens at 28 of 80 (the hits went on after the revive): spent", () => {
    const y = sequence("y8e0-f48");
    const memory = createScreenMemory("COMBAT");
    expect(feed(memory, y["t3-end"]!)).toBeNull();
    expect(memory.lizardTail?.last).toMatchObject({ turn: 3, hp: 14, block: 0, lethal: true, fairies: 0, hits: [12, 12, 12], ended: true });
    // The relic shows nothing: the same fields before and after.
    const relic = (frame: Frame) => ((frame.state["run"] as Raw)["relics"] as Raw[]).find((entry) => entry["relic_id"] === "LIZARD_TAIL");
    expect(relic(y["t4-start"]!)).toEqual(relic(y["t3-end"]!));
    // 28 is outside the old window (40 - 5 .. 40), and above the 14 the turn ended at.
    expect(feed(memory, y["t4-start"]!)).toBe("HP rose 14 -> 28 after a lethal read");
    expect(memory.lizardTail).toMatchObject({ used: true, seen: { fight: "2:48", turn: 4 } });
    expect(sources(memory, y["t6-end"]!)).toEqual([]);
  });

  it("Y8E0 F48 T6: with the tail spent the end of the turn is a certain death (rules: nothing to play or drink)", () => {
    const y = sequence("y8e0-f48");
    const state = parse(y["t6-end"]!);
    const ctx = { label: y["t6-end"]!.decision!.label, knowledge: loggedKnowledge };
    expect(judgeEndTurn(state, { ...ctx, revives: ["LIZARD_TAIL"] })).toMatchObject({ certain: false, reason: "a revive is left (LIZARD_TAIL)" });
    const memory = createScreenMemory("COMBAT");
    for (const name of ["t3-end", "t4-start", "t6-end"]) feed(memory, y[name]!);
    const verdict = judgeEndTurn(state, { ...ctx, revives: sources(memory, y["t6-end"]!) });
    expect(verdict).toMatchObject({ certain: true, tier: "rules" });
    expect(verdict.reason).toContain("30 incoming vs 14 HP");
  });

  it("the hits through the revive: a turn that ends lower than it began is read when the intents say so, not otherwise", () => {
    // Y8E0's T3 board at 30 HP against 12x5: 30 -> 18 -> 6 -> 0 -> 40 -> 28 -> 16. No rise, outside the window.
    const board = (turnHp: number, nextHp: number): { end: Frame; next: Frame } => {
      const y = sequence("y8e0-f48");
      const end = y["t3-end"]!;
      ((end.state["combat"] as Raw)["player"] as Raw)["current_hp"] = turnHp;
      const amalgam = ((end.state["combat"] as Raw)["enemies"] as Raw[]).find((enemy) => enemy["enemy_id"] === "TORCH_HEAD_AMALGAM")!;
      ((amalgam["intents"] as Raw[]).find((intent) => intent["damage"] === 12)!)["hits"] = 5;
      const next = y["t4-start"]!;
      ((next.state["combat"] as Raw)["player"] as Raw)["current_hp"] = nextHp;
      return { end, next };
    };
    const read = (nextHp: number) => {
      const { end, next } = board(30, nextHp);
      const memory = createScreenMemory("COMBAT");
      feed(memory, end);
      return feed(memory, next);
    };
    expect(read(16)).toBe("HP 16, the hits 12+12+12+12+12 through the revive leave 16");
    expect(read(12)).toBe("HP 12, the hits 12+12+12+12+12 through the revive leave 16");
    expect(read(25)).toBeNull();
  });

  it("the fight won in the enemy turn (MZCG9T5G6TBZ F17: 17 + 10 block against the Waterfall Giant's 30, out at 46 = 40 + Burning Blood's 6)", () => {
    const m = sequence("mzcg-f17");
    const memory = createScreenMemory("COMBAT");
    feed(memory, m["t8-end"]!);
    expect(feed(memory, m["reward"]!)).toBe("the fight was won in the enemy turn after a lethal read: HP rose 17 -> 40 after a lethal read (less 6 healed at the fight's end)");
    expect(memory.lizardTail).toMatchObject({ used: true, seen: { fight: "0:17", turn: 8 } });
    // Without the end_turn (the fight won by our own last card) the same HP says nothing.
    const notEnded = createScreenMemory("COMBAT");
    trackLizardTail(notEnded, parse(m["t8-end"]!));
    expect(trackLizardTail(notEnded, parse(m["reward"]!))).toBeNull();
    expect(notEnded.lizardTail?.used).toBe(false);
    // F33 T4, the boss turn that ended the run: no revive left, a certain death (SL was not on in that run).
    expect(sources(memory, m["f33-t4-end"]!)).toEqual([]);
    expect(judgeEndTurn(parse(m["f33-t4-end"]!), { label: "combat/least-loss", revives: [], knowledge: loggedKnowledge })).toMatchObject({ certain: true, tier: "rules" });
  });

  it("a Fairy fires first: its 0 HP frame and its 30% are not the tail; the tail later is (VTREB5A9XWS7 F23)", () => {
    const v = sequence("vtreb-f23");
    const memory = createScreenMemory("COMBAT");
    feed(memory, v["t2-end"]!);
    expect(memory.lizardTail?.last).toMatchObject({ fairies: 1, lethal: true });
    // The enemy turn: 0 HP, the Fairy already gone from the belt.
    expect(feed(memory, v["fairy-0hp"]!)).toBeNull();
    // T3 at 24 = 30% of 80 with the Fairy spent: not above the Fairy's own revive.
    expect(feed(memory, v["t3-start"]!)).toBeNull();
    expect(memory.lizardTail?.used).toBe(false);
    feed(memory, v["t4-end"]!);
    expect(feed(memory, v["t5-start"]!)).toBe("HP rose 19 -> 40 after a lethal read");
  });

  it("an enemy-turn frame at 0 HP with no Fairy held is the tail firing", () => {
    const y = sequence("y8e0-f48");
    const memory = createScreenMemory("COMBAT");
    feed(memory, y["t3-end"]!);
    const hit = y["t3-end"]!;
    ((hit.state["combat"] as Raw)["player"] as Raw)["current_hp"] = 0;
    ((hit.state["combat"] as Raw)["action_readiness"] as Raw)["can_use_combat_actions"] = false;
    hit.decision = null;
    expect(feed(memory, hit)).toBe("HP 0 in combat with no Fairy held");
    // With a Fairy in the belt the 0 is the Fairy's.
    const v = sequence("vtreb-f23");
    const fairy = createScreenMemory("COMBAT");
    feed(fairy, v["t2-end"]!);
    const zero = v["t2-end"]!;
    ((zero.state["combat"] as Raw)["player"] as Raw)["current_hp"] = 0;
    ((zero.state["combat"] as Raw)["action_readiness"] as Raw)["can_use_combat_actions"] = false;
    zero.decision = null;
    expect(feed(fairy, zero)).toBeNull();
    // Nor a 0 HP frame before any turn of the fight was read (a fight's first frame).
    const first = createScreenMemory("COMBAT");
    expect(trackLizardTail(first, parse(hit))).toBeNull();
    expect(first.lizardTail?.used).toBe(false);
  });

  it("lethal reads survived without any revive do not read as the tail (runs that never held it, the tail put in)", () => {
    // U6RUE7LBUFJF F33 T4: 36 HP against 38, T5 at 2 (through a revive: 40). 7KDMKN16GD6B F27 T7: 33 against 5x8, T8 at 5.
    for (const [name, end, next] of [["u6ru-f33", "t4-end", "t5-start"], ["7kdm-f27", "t7-end", "t8-start"]] as const) {
      const s = sequence(name, true);
      const memory = createScreenMemory("COMBAT");
      feed(memory, s[end]!);
      expect(memory.lizardTail?.last?.lethal).toBe(true);
      expect(feed(memory, s[next]!)).toBeNull();
      expect(memory.lizardTail?.used).toBe(false);
    }
    // 7DXAW0ZBDFHP F23 T7: 3 + 13 block against 38, end_turn, the fight won in the enemy turn at 9 = 3 + Burning Blood's 6.
    // 2WUMK6PK5QHD F33 T13: 28 against 32, won by our own last card at 35 (no end_turn on its last frame).
    for (const [name, end] of [["7dxa-f23", "t7-end"], ["2wum-f33", "t13-last"]] as const) {
      const s = sequence(name, true);
      const memory = createScreenMemory("COMBAT");
      feed(memory, s[end]!);
      expect(feed(memory, s["reward"]!)).toBeNull();
      expect(memory.lizardTail?.used).toBe(false);
    }
  });

  it("an SL reload (the fight again from a lower turn) puts back a tail spent in this fight, not one spent before it", () => {
    const y = sequence("y8e0-f48");
    const memory = createScreenMemory("COMBAT");
    feed(memory, y["t1"]!);
    feed(memory, y["t3-end"]!);
    feed(memory, y["t4-start"]!);
    expect(memory.lizardTail?.used).toBe(true);
    // The reload: T1 of the same fight from the room's save.
    feed(memory, y["t1"]!);
    expect(memory.lizardTail).toMatchObject({ used: false, fight: { key: "2:48", usedAtStart: false, turn: 1 } });
    expect(memory.lizardTail?.seen).toBeUndefined();
    expect(sources(memory, y["t1"]!)).toEqual(["LIZARD_TAIL"]);
    // Spent in an earlier fight (MZCG F17), then a fight reloaded: still spent.
    const m = sequence("mzcg-f17");
    const earlier = createScreenMemory("COMBAT");
    feed(earlier, m["t8-end"]!);
    feed(earlier, m["reward"]!);
    const f33 = m["f33-t4-end"]!;
    trackLizardTail(earlier, parse(f33));
    const t1 = structuredClone(f33);
    t1.state["turn"] = 1;
    trackLizardTail(earlier, parse(t1));
    expect(earlier.lizardTail).toMatchObject({ used: true, fight: { key: "1:33", usedAtStart: true, turn: 1 } });
  });

  it("the main menu (an SL reload's save_and_quit, a restart) leaves the record alone", () => {
    const y = sequence("y8e0-f48");
    const memory = createScreenMemory("COMBAT");
    feed(memory, y["t3-end"]!);
    feed(memory, y["t4-start"]!);
    const menu = structuredClone(y["t4-start"]!);
    menu.state["run_id"] = "run_unknown";
    menu.state["in_combat"] = false;
    menu.state["screen"] = "MAIN_MENU";
    expect(trackLizardTail(memory, parse(menu))).toBeNull();
    expect(memory.lizardTail).toMatchObject({ runId: "Y8E0KK4L7JBL", used: true });
  });

  it("the journal replay after a restart reads the same: the end_turn decisions are noted, an observed 0 HP frame counts", () => {
    const rows = (frames: Frame[]) => {
      const states: Raw[] = [];
      const decisions: Raw[] = [];
      frames.forEach((frame, i) => {
        const ts = `2026-10-03T00:00:${String(10 + i).padStart(2, "0")}.000Z`;
        const fingerprint = `fp${i}`;
        states.push({ ts, observed_ts: ts, fingerprint, state: frame.state, ...(frame.decision ? {} : { observed: true }) });
        if (frame.decision) decisions.push({ ts, fingerprint, run_id: frame.state["run_id"], label: frame.decision.label, decider: "code", chosen: { action: frame.decision.action }, result: "completed: ok" });
      });
      return { states, decisions };
    };
    const m = sequence("mzcg-f17");
    const mz = rows([m["t8-end"]!, m["reward"]!]);
    expect(replayRun({ runId: "MZCG9T5G6TBZ", states: mz.states as never, decisions: mz.decisions as never, runPlans: [] }, loggedKnowledge).lizardTail).toMatchObject({ used: true, seen: { turn: 8 } });
    const y = sequence("y8e0-f48");
    const yt = rows([y["t1"]!, y["t3-end"]!, y["t4-start"]!]);
    expect(replayRun({ runId: "Y8E0KK4L7JBL", states: yt.states as never, decisions: yt.decisions as never, runPlans: [] }, loggedKnowledge).lizardTail).toMatchObject({ used: true, seen: { turn: 4, how: "HP rose 14 -> 28 after a lethal read" } });
    // A restart in a reloaded attempt: the earlier attempt's trigger is undone by the fight's lower turn.
    const again = rows([y["t1"]!, y["t3-end"]!, y["t4-start"]!, y["t1"]!]);
    expect(replayRun({ runId: "Y8E0KK4L7JBL", states: again.states as never, decisions: again.decisions as never, runPlans: [] }, loggedKnowledge).lizardTail).toMatchObject({ used: false });
    const hit = structuredClone(y["t3-end"]!);
    ((hit.state["combat"] as Raw)["player"] as Raw)["current_hp"] = 0;
    ((hit.state["combat"] as Raw)["action_readiness"] as Raw)["can_use_combat_actions"] = false;
    hit.decision = null;
    const ys = rows([y["t3-end"]!, hit]);
    expect(replayRun({ runId: "Y8E0KK4L7JBL", states: ys.states as never, decisions: ys.decisions as never, runPlans: [] }, loggedKnowledge).lizardTail).toMatchObject({ used: true, seen: { how: "HP 0 in combat with no Fairy held" } });
  });
});

/**
 * Rules from the A8 post-mortems of PCGH29GVGSCE and FEY65PFTP8BH (notes/lessons.md): the HP guard in an
 * act-boss race, the measured damage rate around the wake turn, a dominated line labelled "best", same-turn
 * re-asks after a draw, the map's survival figure through a forbidden elite, and the Obscura dossier.
 * Replayed on the logged boards (tests/logged-states).
 */

import { describe, expect, it } from "vitest";

import type { AskDecision } from "../src/project/types.js";
import { hpClockTurns, measuredDamagePerTurn, planCombatTurn } from "../src/screens/combat-plan.js";
import { setupRisksDeath } from "../src/strategy/intent.js";
import { asArray, asRecord } from "../src/util/json.js";
import { logged, loggedEnv } from "./logged.js";

const answer = (choice: string, confidence: number) => ({ plan: { type: "choice", choice, confidence, probabilities: {}, raw: {} } }) as never;

describe("boss race: behind on the tighter of the boss clock and our HP clock (FEY6 F17 T6)", () => {
  it("the 15% floor only counts when next turn may attack", () => {
    // 10 HP of 80 before a turn with no attack: no death risk; with an attack (or an unknown move) there is.
    expect(setupRisksDeath(10, 0, 80, false)).toBe(false);
    expect(setupRisksDeath(10, 0, 80, true)).toBe(true);
    expect(setupRisksDeath(10, 0, 80)).toBe(true);
    // Next turn's hit + 3 is a risk whatever the flag.
    expect(setupRisksDeath(10, 8, 80, false)).toBe(true);
  });

  it("the HP clock counts a 0-damage move and stops at the hit that takes the HP", () => {
    const enemies = asArray(asRecord(logged("fey6-f17-t6").state["combat"])["enemies"]).map(asRecord);
    // 17 HP (the swap's): Soul Siphon then Slash; far shorter than the dossier's 7 turns left.
    const turns = hpClockTurns(enemies, 17);
    expect(turns).toBeGreaterThanOrEqual(2);
    expect(turns).toBeLessThan(7);
    expect(hpClockTurns(enemies, 0)).toBe(1);
    expect(hpClockTurns(enemies, 1000)).toBeGreaterThan(turns);
  });

  it("Jev's pick of code's rank 1 (+10 damage, -7 HP) is played, not swapped", () => {
    const fx = logged("fey6-f17-t6");
    expect(fx.decision.rationale).toMatch(/HP guard: plan 1/);
    const decision = planCombatTurn(loggedEnv(fx));
    expect(decision?.kind).toBe("ask");
    const resolved = (decision as AskDecision).resolve(answer("plan1", 0.68));
    expect(resolved.rationale).toMatch(/^Jev chose plan 1\//);
    expect(resolved.rationale).not.toMatch(/HP guard/);
  });
});

describe("the measured damage rate leaves out the idle turn that woke the boss, and what it dealt (FEY6 F17 T6)", () => {
  // First-look Matriarch HP by turn (states): asleep T1-T3, T3's Bash+/Strike/Fire Potion woke her.
  const turnHp = { "1": 233, "2": 233, "3": 233, "4": 191, "5": 142, "6": 85 };
  it("T6 reads T4-T5's rate (106 over 2), not 148 over 2", () => {
    const rate = measuredDamagePerTurn({ hp: 233, turn: 1, idle: [1, 2, 3], turnHp }, 85, 6)!;
    expect(rate).toBeCloseTo(53, 5);
    expect(rate).toBeLessThan(148 / 2);
    // Without first-look HPs nothing is subtracted (older memory).
    expect(measuredDamagePerTurn({ hp: 233, turn: 1, idle: [1, 2, 3] }, 85, 6)).toBe(74);
    // At T4 the only measured turns are idle: nothing measured.
    expect(measuredDamagePerTurn({ hp: 233, turn: 1, idle: [1, 2, 3], turnHp }, 191, 4)).toBeNull();
  });

  it("the board records each turn's first-look enemy HP once", () => {
    const env = loggedEnv(logged("fey6-f17-t6"));
    planCombatTurn(env);
    expect(env.screenMemory.fightStart?.turnHp).toEqual({ "6": 85 });
  });
});

describe("a line another shown line beats on HP and damage is never labelled code's best (PCGH F23 T4)", () => {
  it("the logged kill_fast board: Bash+, Strike (-32, 19) costs; Bash+, Headbutt (-13, 21) is the reference", () => {
    const decision = planCombatTurn(loggedEnv(logged("pcgh-f23-t4")));
    expect(decision?.kind).toBe("ask");
    const options = Object.values((decision as AskDecision).questions)
      .flatMap((question) => Object.entries(question.criteria ?? {}))
      .filter(([key]) => /^plan\d+$/.test(key))
      .map(([, value]) => JSON.parse(String(value)) as { hp_lost: number; damage_dealt: number; intent_fit?: string });
    expect(options.length).toBeGreaterThan(1);
    for (const line of options) {
      const beaten = options.some(
        (other) => other !== line && other.hp_lost <= line.hp_lost && other.damage_dealt >= line.damage_dealt && (other.hp_lost < line.hp_lost || other.damage_dealt > line.damage_dealt) && !/lasting|sets up/.test(JSON.stringify(line)),
      );
      if (beaten) expect(line.intent_fit).not.toMatch(/code's best line|fits/);
    }
    const best = options.filter((line) => /code's best line under/.test(String(line.intent_fit)));
    expect(best).toHaveLength(1);
    expect(best[0]!.hp_lost).toBe(Math.min(...options.map((line) => line.hp_lost)));
  });
});

describe("a Jev line cut short by a draw is continued while code still ranks it top 2 (FEY6 F6 T1)", () => {
  const firstAsk = () => {
    const env = loggedEnv(logged("fey6-f6-t1"));
    const decision = planCombatTurn(env) as AskDecision;
    // Logged: Jev 0.86 for plan 1, "Pommel Strike x2, True Grit" (code rank 1).
    const resolved = decision.resolve(answer("plan1", 0.86));
    resolved.apply?.();
    return env.screenMemory.drawCommit;
  };

  it("each re-plan after a Pommel Strike draw plays the rest of Jev's line instead of asking again", () => {
    let commit = firstAsk();
    expect(commit?.steps.map((step) => step.cardId)).toEqual(["POMMEL_STRIKE", "TRUE_GRIT"]);
    // Drew Defend: logged re-ask, Jev 0.46 for another line. Now: the committed line continues.
    const env2 = loggedEnv(logged("fey6-f6-t1-reask"), { screenMemory: { ...loggedEnv(logged("fey6-f6-t1-reask")).screenMemory, drawCommit: commit } });
    const second = planCombatTurn(env2);
    expect(second?.kind).toBe("act");
    expect(second?.kind === "act" ? second.label : "").toBe("combat/plan-continue");
    expect(second?.kind === "act" ? second.rationale : "").toMatch(/Jev-chosen plan after the draw/);
    commit = env2.screenMemory.drawCommit;
    expect(commit?.steps.map((step) => step.cardId)).toEqual(["TRUE_GRIT"]);
    // Drew Uppercut with 1 energy left: logged re-ask, Jev 0.47 for Breakthrough (-17). Now True Grit.
    const env3 = loggedEnv(logged("fey6-f6-t1-reask2"), { screenMemory: { ...loggedEnv(logged("fey6-f6-t1-reask2")).screenMemory, drawCommit: commit } });
    const third = planCombatTurn(env3);
    expect(third?.kind === "act" ? third.rationale : "").toMatch(/Jev-chosen plan after the draw.*: 坚毅/);
  });

  it("a remaining line code no longer ranks top 2 is asked again", () => {
    const fx = logged("fey6-f6-t1-reask2");
    const target = Number((((fx.state["combat"] as Record<string, unknown>)["enemies"] as Record<string, unknown>[])[0]!)["index"]);
    const strike = { cardIndex: 1, cardId: "STRIKE_IRONCLAD", upgraded: false, name: "Strike", target, targetName: null };
    const base = loggedEnv(fx);
    const env = loggedEnv(fx, { screenMemory: { ...base.screenMemory, drawCommit: { ...firstAsk()!, steps: [strike] } } });
    expect(planCombatTurn(env)?.kind).toBe("ask");
    expect(env.screenMemory.drawCommit).toBeUndefined();
  });
});

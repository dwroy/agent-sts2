/**
 * Rules from the A8 post-mortems of PCGH29GVGSCE and FEY65PFTP8BH (notes/lessons.md): the HP guard in an
 * act-boss race, the measured damage rate around the wake turn, a dominated line labelled "best", same-turn
 * re-asks after a draw, the map's survival figure through a forbidden elite, and the Obscura dossier.
 * Replayed on the logged boards (tests/logged-states).
 */

import { describe, expect, it } from "vitest";

import type { AskDecision } from "../src/project/types.js";
import { hpClockTurns, planCombatTurn } from "../src/screens/combat-plan.js";
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

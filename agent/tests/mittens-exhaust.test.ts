/**
 * Toasty Mittens exhausts a hand card at the start of every turn. In the Insatiable races of
 * VNWR16YEJASM and 981WMX8MQ7DK it took the biggest attacks (Bludgeon, Ultimate Strike, Bash+) because
 * attacks were scored 100 - static card value; a Defend (or a Strike) should go instead.
 */

import { describe, expect, it } from "vitest";

import { planSelection } from "../src/hand/screens/selection.js";
import { logged, loggedEnv } from "./logged.js";

function pickOf(name: string): { id: string; rationale: string } {
  const fx = logged(name);
  const decision = planSelection(loggedEnv(fx));
  if (decision?.kind !== "act") throw new Error(`expected an act, got ${decision?.kind}`);
  const cards = (fx.state["selection"] as Record<string, unknown>)["cards"] as Record<string, unknown>[];
  const index = decision.intent.option_index;
  return { id: String(cards.find((card) => card["index"] === index)?.["card_id"]), rationale: decision.rationale };
}

describe("Toasty Mittens keeps the big attacks in a boss race", () => {
  it("VNWR F33 T4: a Defend goes, not Bludgeon (35 damage; logged pick Bludgeon 34 over Defend 20)", () => {
    expect(logged("vnwr-f33-t4-mittens").decision.rationale).toMatch(/重锤 scores 34/);
    expect(pickOf("vnwr-f33-t4-mittens").id).toBe("DEFEND_IRONCLAD");
  });

  it("VNWR F33 T6: Ultimate Strike (21) is kept; Frantic Escape against the Sandpit is kept too", () => {
    const { id } = pickOf("vnwr-f33-t6-mittens");
    expect(id).not.toBe("ULTIMATE_STRIKE");
    expect(id).not.toBe("FRANTIC_ESCAPE");
    expect(id).toBe("DEFEND_IRONCLAD");
  });

  it("981W F33 T2: the Defend goes, not Bash+ (the only Vulnerable), Ultimate Strike or Blood Wall (16 block)", () => {
    const { id } = pickOf("981w-f33-t2-mittens");
    expect(id).toBe("DEFEND_IRONCLAD");
  });
});

describe("Toasty Mittens reads Colossus and keeps the only Artifact answer (LY0N909D4A0V F33, 8V0HD9Y207WY F24)", () => {
  it("LY0N F33 T3: with Bash+ in hand and 9x3 coming, Colossus is kept and the Defend goes (logged: Colossus 29 vs Defend 20)", () => {
    expect(logged("ly0n-f33-t3-mittens").decision.rationale).toMatch(/巨像 scores 29/);
    expect(pickOf("ly0n-f33-t3-mittens").id).toBe("DEFEND_IRONCLAD");
  });

  it("Colossus with nothing to make the attacker Vulnerable is only its 4 block", async () => {
    const { combatExhaustScore } = await import("../src/hand/screens/selection.js");
    const context = { attacks: 10, incoming: 27, hp: 70 };
    const defend = combatExhaustScore("DEFEND_IRONCLAD", "Skill", context, true, { block: 5 });
    // No Vulnerable source and none on the enemy: 4 block is less than a Defend's 5.
    expect(combatExhaustScore("COLOSSUS", "Skill", { ...context, vulnerableIncoming: 0 }, true, { block: 4, colossus: true })).toBeGreaterThan(defend);
    // 27 from a Vulnerable (or Bash-able) enemy: 4 + 13.5 effective block, kept well below the Defend.
    expect(combatExhaustScore("COLOSSUS", "Skill", { ...context, vulnerableIncoming: 27 }, true, { block: 4, colossus: true })).toBeLessThan(defend);
  });

  it("8V0H F24 T3: Artifact 2 on the Chompers, Bash is kept and Pommel Strike goes (logged: Bash 10 vs Pommel Strike 3)", () => {
    // Pommel Strike reads 15 (9 + Strength 3 + Strike Dummy 3): the damage cap already has both; taking
    // them off again as flat discounts put it at 3, under the Artifact-capped Bash.
    expect(logged("8v0h-f24-t3-mittens").decision.rationale).toMatch(/痛击 scores 10 vs 剑柄打击 3/);
    const { id, rationale } = pickOf("8v0h-f24-t3-mittens");
    expect(id).toBe("POMMEL_STRIKE");
    expect(rationale).toMatch(/剑柄打击 scores 12 vs 痛击 10/);
  });

  it("LY0N F33 T5: Ultimate Strike (18) no longer ties Pommel Strike (13) and is kept (logged: 11 vs 11, Ultimate Strike went)", () => {
    expect(logged("ly0n-f33-t5-mittens").decision.rationale).toMatch(/究极打击 scores 11 vs 剑柄打击 11/);
    expect(pickOf("ly0n-f33-t5-mittens").id).not.toBe("ULTIMATE_STRIKE");
  });
});

/**
 * Toasty Mittens exhausts a hand card at the start of every turn. In the Insatiable races of
 * VNWR16YEJASM and 981WMX8MQ7DK it took the biggest attacks (Bludgeon, Ultimate Strike, Bash+) because
 * attacks were scored 100 - static card value; a Defend (or a Strike) should go instead.
 */

import { describe, expect, it } from "vitest";

import { planSelection } from "../src/screens/selection.js";
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

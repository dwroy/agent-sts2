/**
 * Fix batch M (notes/fix-queue.md "From post-mortems 2WRU 79YR 86C3" and "From post-mortems YVYZ Q8XR 3RME NH8A"):
 * pure bugs. One describe per fix; boards are synthetic or logged fixtures (tests/logged-states/batch-m), never the
 * refreshing knowledge files.
 */

import { describe, expect, it } from "vitest";

import { planSelection } from "../src/screens/selection.js";
import { logged, loggedEnv } from "./logged.js";

type Raw = Record<string, unknown>;

describe("1. Knowledge Demon: with Rupture up, Disintegration that outlasts the HP still ranks last (79YR F33 T5: 17 HP, Rupture 2, taken as \"Rupture: Strength\")", () => {
  it("the logged board picks Sloth, and the text gives Rupture's Strength and the HP gate apart", { timeout: 30_000 }, () => {
    const fx = logged("batch-m/79yr-f33-t5-curse");
    const decision = planSelection(loggedEnv(fx));
    expect(decision?.kind).toBe("act");
    const act = decision as { intent: Raw; rationale: string };
    expect(act.intent).toEqual({ action: "select_deck_card", option_index: 1 });
    expect(act.rationale).toContain("懒惰");
    expect(act.rationale).toMatch(/DISINTEGRATION Rupture: Strength \(outlasts the HP: 7 a turn x 6\.9 turns \+ 20 > 17 HP\)/);
  });

  it("with the HP to pay for it, Rupture still makes Disintegration the pick", { timeout: 30_000 }, () => {
    const fx = logged("batch-m/79yr-f33-t5-curse");
    const player = ((fx.state["combat"] as Raw)["player"] as Raw);
    player["current_hp"] = 80;
    const act = planSelection(loggedEnv(fx)) as { intent: Raw; rationale: string };
    expect(act.intent).toEqual({ action: "select_deck_card", option_index: 0 });
    expect(act.rationale).toMatch(/DISINTEGRATION Rupture: Strength;/);
  });
});

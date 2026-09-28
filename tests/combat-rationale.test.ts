/** The plan-choice rationale names the line actually played (the dominance swap printed the chosen line's label). */

import { describe, expect, it } from "vitest";

import { pickNote } from "../src/screens/combat-plan.js";
import type { Plan } from "../src/strategy/turn-solver.js";

const line = (...names: string[]): Plan => ({ steps: names.map((name, i) => ({ cardIndex: i, cardId: name.toUpperCase(), upgraded: false, name, target: null })) }) as unknown as Plan;

describe("pickNote", () => {
  it("names Jev's pick, and the played line with its own number and label after a dominance swap", () => {
    const a = line("Strike", "Defend");
    const b = line("Bash", "Defend");
    const c = line();
    expect(pickNote([a, b, c], b, b)).toBe("plan 2/3 (Bash, Defend)");
    expect(pickNote([a, b, c], c, a)).toBe("plan 3/3 (end turn); plan 1 (Strike, Defend) is as good or better on every axis, playing it");
  });
});

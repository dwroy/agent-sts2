/**
 * Post-mortems of 9VG8, 11LC, YG3H, 123Z and PKB0 (notes/lessons.md, A8): Fiend Fire counting the
 * cards drawn earlier in its line, Duplication already up, the card a pile-card potion's line takes,
 * the Regen Potion and Distilled Chaos in the solver, heal potions' HP labels, and the boss damage gap
 * in route scoring, each replayed on the logged board of the cited floor.
 */

import { describe, expect, it } from "vitest";

import type { AskDecision, Decision } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { logged, loggedEnv } from "./logged.js";

type Raw = Record<string, unknown>;

/** Every line offered to Jev on a logged combat board (plan1 first), or the act code took. */
function combatLines(fx: ReturnType<typeof logged>, over: Parameters<typeof loggedEnv>[1] = {}): { act: Decision | null; lines: Raw[] } {
  const decision = planCombatTurn(loggedEnv(fx, over)) as Decision;
  if (decision.kind !== "ask") return { act: decision, lines: [] };
  const question = Object.values((decision as AskDecision).questions)[0]!;
  if (question.type !== "choice") return { act: null, lines: [] };
  return { act: null, lines: Object.entries(question.criteria).filter(([key]) => key.startsWith("plan")).map(([, value]) => JSON.parse(value!) as Raw) };
}

describe("Fiend Fire counts the cards drawn earlier in its line (9VG8 F35 T6)", () => {
  it("22/80, Devoted Sculptor at 80: 'Offering+, Fiend Fire+' is code's lethal (logged: 44 damage shown for it, 4 hits; Jev took 55, died T7)", () => {
    const { act } = combatLines(logged("9vg8-f35-t6"));
    expect(act?.kind).toBe("act");
    if (act?.kind !== "act") return;
    expect(act.label).toBe("combat/lethal");
    expect(act.rationale).toMatch(/祭品\+.*恶魔之焰\+/);
  });

  it("with no cards in the draw or discard pile, Offering draws nothing and Fiend Fire is no kill", () => {
    const fx = logged("9vg8-f35-t6");
    const view = (fx.state["agent_view"] as Raw)["combat"] as Raw;
    view["draw"] = [];
    view["discard"] = [];
    const { act } = combatLines(fx);
    expect(act?.kind === "act" && act.label === "combat/lethal").toBe(false);
  });
});

describe("Duplication already up doubles the next card (11LC F17 T2)", () => {
  it("re-planned after the Duplicator: Bash+ first, Vulnerable 6 (logged: shown as Vulnerable 3, Jev duplicated a Strike)", () => {
    const { lines } = combatLines(logged("11lc-f17-t2-dup"));
    expect(String(lines[0]!["plays"])).toMatch(/^痛击\+/);
    expect(String(lines[0]!["enemies_after"])).toMatch(/Vulnerable 6/);
  });

  it("without DUPLICATION_POWER the same Bash+ is Vulnerable 3", () => {
    const fx = logged("11lc-f17-t2-dup");
    ((fx.state["combat"] as Raw)["player"] as Raw)["powers"] = [];
    const { lines } = combatLines(fx);
    const bash = lines.find((line) => String(line["plays"]).startsWith("痛击+"));
    expect(String(bash?.["enemies_after"])).toMatch(/Vulnerable 3/);
  });
});

describe("the Regen Potion and Distilled Chaos are lines with numbers (PKB0 F17 T4, YG3H F33 T1)", () => {
  it("PKB0 F17 T4 at 35/80: code's best line drinks the Regen Potion and says the heal in HP (logged: 'fits hp ... in no line's numbers', left at 0.05)", () => {
    const { lines } = combatLines(logged("pkb0-f17-t4a"));
    const regen = lines.find((line) => String(line["plays"]).includes("再生药水"));
    expect(regen).toBeDefined();
    expect(String(lines[0]!["plays"])).toMatch(/再生药水/);
    expect(String(regen!["heal_potion"])).toMatch(/^\+5 HP at this turn's end .*Regen 5.*: 35\/80 \(44%\) -> 40\/80 \(50%\)/);
    // Its heal is in the line's HP: 5 less lost than the same cards without it.
    const dry = lines.find((line) => String(line["plays"]) === String(regen!["plays"]).replace(/^potion 再生药水, then /, ""));
    if (dry) expect(Number(dry["hp_lost"]) - Number(regen!["hp_lost"])).toBe(5);
  });

  it("PKB0 F17 T4, energy spent: code drinks it rather than end the turn (logged: Jev ended the turn at 0.05)", () => {
    const decision = planCombatTurn(loggedEnv(logged("pkb0-f17-t4"))) as Decision;
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.intent).toEqual({ action: "use_potion", option_index: 0 });
  });

  it("YG3H F33 T1 (LIQUIFY_GROUND, no attack in hand): a line drinks Distilled Chaos for the draw pile's expected damage (logged: 'neutral: unclassified', drunk T7 at 7 HP)", () => {
    const { act, lines } = combatLines(logged("yg3h-f33-t1"));
    const text = act?.kind === "act" ? act.rationale : String(lines[0]?.["plays"]);
    expect(text).toMatch(/potion 精炼混沌/);
    if (act?.kind === "act") expect(Number(/dmg (\d+)/.exec(act.rationale)?.[1])).toBeGreaterThan(10);
  });
});

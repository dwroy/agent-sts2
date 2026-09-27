/**
 * Post-mortems of Z49J, 77UJ, EN55 and 77QX (notes/lessons.md, A8): route projection at the rooms'
 * median costs with per-fight survival, the Blood Potion, the boss clock of multi-part bosses, the rest
 * site's look past a treasure room, the optional-elite HP gate, event HP labels, Gambler's Brew and the
 * reserved potion in a lethal line, each replayed on the logged board of the cited floor.
 */

import { describe, expect, it } from "vitest";

import { awakeDamagePerTurn } from "../src/knowledge/move-model.js";
import { parseGameState } from "../src/mod/schema.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { hpPercent, planMap, routeHealShare } from "../src/screens/map.js";
import { planRest, rememberMap } from "../src/screens/rest.js";
import { bossClockJson, bossDamagePerTurn, bossNeed, cappedBossNeed, deckBlockPerTurn } from "../src/strategy/boss-clock.js";
import { fightHpCost, MEDIAN_OF_P75, roomHpCost, roomProjectedCost } from "../src/strategy/route-cost.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";

type Raw = Record<string, unknown>;

/** Code's pick on a logged map (the recorded run plan in force). */
const pick = (name: string): unknown => {
  const decision = planMap(loggedEnv(logged(name)));
  return decision?.kind === "act" ? decision.intent : decision?.kind;
};
/** Every option with its summary, with no code margin (the "card" planner asks Jev every time). */
function options(name: string, edit: (fx: ReturnType<typeof logged>) => void = () => {}): Raw[] {
  const fx = logged(name);
  edit(fx);
  const decision = planMap(loggedEnv(fx, { combatPlanner: "card" })) as Decision;
  expect(decision.kind).toBe("ask");
  const question = (decision as AskDecision).questions["pick"]!;
  if (question.type !== "choice") throw new Error("not a choice");
  return Object.values(question.criteria).map((value) => JSON.parse(value!) as Raw);
}
const at = (all: Raw[], position: string): Raw => all.find((option) => option["position"] === position)!;
const pctIn = (text: unknown, pattern: RegExp): number => Number(pattern.exec(String(text))?.[1]);
/** Code's best combat line: plan1's plays when Jev is asked, else the rationale of the act. */
function bestLine(name: string, over: Parameters<typeof loggedEnv>[1] = {}): string {
  const decision = planCombatTurn(loggedEnv(logged(name), over)) as Decision;
  if (decision.kind !== "ask") return decision.kind === "act" ? decision.rationale : "";
  const question = Object.values((decision as AskDecision).questions)[0]!;
  if (question.type !== "choice") return "";
  return String((JSON.parse(question.criteria["plan1"] ?? "{}") as Raw)["plays"] ?? "");
}
const survivalOf = (option: Raw): number => pctIn(option["route_survival"], /~(\d+)% of the time/);

describe("route projection at median room costs, survival fight by fight (Z49J, 77UJ, 77QX)", () => {
  it("rooms are projected at 0.6 of the priced p75 cost", () => {
    for (const act of [1, 2, 3]) {
      for (const type of ["Monster", "Elite", "Unknown"]) expect(roomProjectedCost(type, act)).toBeCloseTo(MEDIAN_OF_P75 * roomHpCost(type, act));
    }
    expect(roomProjectedCost("Monster", 2)).toBeLessThan(fightHpCost("Monster", 2));
  });

  it("Z49J F18: the boss arrival discriminates (was '~30% HP, alive ~0-8%' on both): (1,2) reaches the F33 boss at 45-65%", () => {
    expect(pick("z49j-map-f18")).toEqual({ action: "choose_map_node", option_index: 0 });
    const all = options("z49j-map-f18");
    const taken = at(all, "row 1, column 2");
    const other = at(all, "row 1, column 5");
    const bossHp = pctIn(taken["boss_arrival"], /^~(\d+)% HP at the F33 boss/);
    expect(bossHp).toBeGreaterThanOrEqual(45);
    expect(bossHp).toBeLessThanOrEqual(65);
    expect(pctIn(taken["boss_arrival"], /alive there ~(\d+)%/)).toBeGreaterThan(25);
    // The other line runs out of HP before its last rest: said so, not "~30% at the boss".
    expect(String(other["boss_arrival"])).toMatch(/^HP runs out at F\d+ on its safest path before the F33 boss/);
    expect(survivalOf(taken)).toBeGreaterThan(survivalOf(other));
  });

  it("77QX F18: (1,5), not five hallways in a row into the F24 rest (logged: (1,1) -17.8 vs (1,5) -36.4; died at F22)", () => {
    expect(pick("77qx-map-f18")).toEqual({ action: "choose_map_node", option_index: 1 });
    const all = options("77qx-map-f18");
    // Both over the same stretch (through the F28 forced elite of (1,5) to the rest after it).
    expect(String(at(all, "row 1, column 1")["route_survival"])).toMatch(/^alive through F28 at the F29 rest/);
    expect(survivalOf(at(all, "row 1, column 5"))).toBeGreaterThan(survivalOf(at(all, "row 1, column 1")));
  });

  it("77UJ F22 and F26: the same picks, and the boss arrivals no longer all read ~30%", () => {
    expect(pick("77uj-map-f22")).toEqual({ action: "choose_map_node", option_index: 0 });
    expect(pick("77uj-map-f26")).toEqual({ action: "choose_map_node", option_index: 0 });
    for (const name of ["77uj-map-f22", "77uj-map-f26"]) {
      const arrivals = options(name).map((option) => String(option["boss_arrival"]));
      expect(new Set(arrivals).size).toBe(arrivals.length);
    }
    const f22 = options("77uj-map-f22");
    expect(pctIn(at(f22, "row 5, column 3")["boss_arrival"], /^~(\d+)% HP/)).toBeGreaterThan(pctIn(at(f22, "row 5, column 4")["boss_arrival"], /^~(\d+)% HP/));
  });
});

describe("heal potions count as route HP only when the fights model them (EN55 F7, F8)", () => {
  it("the Blood Potion is modelled and counts its 20%; an unmodelled heal potion does not", () => {
    expect(routeHealShare("BLOOD_POTION")).toBeCloseTo(0.2);
    expect(routeHealShare("REGEN_POTION")).toBe(0);
    const fx = logged("en55-map-f7");
    expect(hpPercent(loggedEnv(fx))).toBeCloseTo(41 / 80 + 0.2);
    expect(hpPercent(loggedEnv(fx), false)).toBeCloseTo(41 / 80);
    const regen = logged("en55-map-f7");
    for (const potion of (regen.state["run"] as Raw)["potions"] as Raw[]) if (potion["potion_id"] === "BLOOD_POTION") potion["potion_id"] = "REGEN_POTION";
    expect(hpPercent(loggedEnv(regen))).toBeCloseTo(41 / 80);
  });

  it("EN55 F8 T5 (18/80, the eel's CRASH coming): code's best line drinks the Blood Potion (logged: kept to T9 at 7 HP)", () => {
    expect(String(bestLine("en55-f8-t5"))).toMatch(/^(code plan[^:]*: )?potion 鲜血药水/);
  });
});

describe("boss clock: multi-part bosses hit with their parts (Z49J F32 Kaiser Crab, K8TC/VUV4 The Kin)", () => {
  const board = (name: string) => parseGameState(logged(name).state);

  it("the crab is its two claws, the Kin its priest and two followers", () => {
    expect(bossDamagePerTurn("KAISER_CRAB")!.perTurn).toBeCloseTo(awakeDamagePerTurn("CRUSHER")!.perTurn + awakeDamagePerTurn("ROCKET")!.perTurn);
    expect(bossDamagePerTurn("THE_KIN")!.perTurn).toBeCloseTo(awakeDamagePerTurn("KIN_PRIEST")!.perTurn + 2 * awakeDamagePerTurn("KIN_FOLLOWER")!.perTurn);
    expect(bossDamagePerTurn("KAISER_CRAB")!.sleepTurns).toBe(0);
  });

  it("Z49J F32 at 45/80: the clock is capped at the turns 45 HP lasts (was 8 turns, 'need 54, gap 19'; the Laser killed on T4)", () => {
    const state = board("z49j-map-f32");
    const need = cappedBossNeed(state, loggedKnowledge)!;
    const hit = bossDamagePerTurn("KAISER_CRAB")!.perTurn;
    expect(need.entryHp).toBe(45);
    expect(need.survivableTurns).toBeCloseTo(45 / Math.max(1, hit - deckBlockPerTurn(state, loggedKnowledge)), 1);
    expect(need.turns).toBeLessThan(bossNeed("KAISER_CRAB")!.turns);
    // 428 HP over those turns (the turns are shown to one decimal).
    expect(Math.abs(need.perTurn - 428 / need.turns)).toBeLessThan(0.05 * need.perTurn);
    expect(String(bossClockJson(state, loggedKnowledge)!["turns_note"])).toMatch(/capped at [\d.]+: the turns 45 HP survives/);
  });

  it("the crab lets ~45% of the deck estimate through (M9PL 23.6 of 53, Z49J 16.3 of 35)", () => {
    expect(bossNeed("KAISER_CRAB")!.realised).toBeCloseTo(0.45);
  });

  it("The Kin boards read the cap too (K8TC F3, VUV4 F12)", () => {
    for (const name of ["k8tc-map-f3", "vuv4-map-f12"]) expect(String(bossClockJson(board(name), loggedKnowledge)!["turns_note"])).toMatch(/^10 turns in the table, capped at/);
  });
});

describe("a rest site looks two nodes ahead for a forced elite, through a treasure room (77QX F9)", () => {
  it("77QX F9 at 52/80: heals (logged: smithed at 65%, the F11 Terror Eel behind a treasure room took 52 -> 17)", () => {
    const env = loggedEnv(logged("77qx-rest-f9"));
    rememberMap(env.screenMemory, parseGameState(logged("77qx-map-f8").state));
    const decision = planRest(env)!;
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.rationale).toMatch(/^code: \S+ \(HEAL\)/);
  });

  it("without the remembered map it cannot see the elite (the old next-node check alone)", () => {
    const decision = planRest(loggedEnv(logged("77qx-rest-f9")))!;
    if (decision.kind === "act") expect(decision.rationale).toMatch(/^code: \S+ \(SMITH\)/);
  });
});

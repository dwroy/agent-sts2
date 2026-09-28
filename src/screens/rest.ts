/**
 * Rest sites (PLAN.md §6.7): HEAL vs SMITH and friends. Code gives each option its facts (HP after the
 * heal against DeepSeek's entry target and the floors to the boss; which card an upgrade would improve
 * and by how much) and a reference score from HP and the boss clock alone; Jev decides with DeepSeek's
 * rest lean in view. Code never picks between two rest options (it used to at a 3-point margin, with
 * the plan's entry-HP heal +8 and preserve heal +4 / smith -2 on top: 80% HP healed without asking).
 */

import { asArray, asRecord, bool, num, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { damageGap, gapRestShift } from "../strategy/boss-clock.js";
import { currentRunPlan, floorsToBoss } from "../strategy/run-plan.js";
import { guidanceFor, LABEL_NOTE, restFit } from "../strategy/intent.js";
import { deckEntries } from "../project/deck.js";
import { modelHandCard, upgradeCard, upgradeGain, type CardModel } from "../strategy/card-model.js";
import type { Knowledge } from "../knowledge/index.js";
import { upgradePriority } from "./selection.js";
import { briefJson } from "../project/run-brief.js";
import type { GameState } from "../mod/schema.js";
import type { Decision, DecisionEnv, RememberedMap, ScreenMemory } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";

export function planRest(env: DecisionEnv): Decision | null {
  const { state, knowledge } = env;
  const rest = asRecord(state.raw["rest"]);
  if (Object.keys(rest).length === 0) return null;

  const options: (Omit<PickOption, "summary"> & { summary: Record<string, JsonValue>; id: string; hpPct: number })[] = [];
  // DeepSeek's rest lean, hp_policy and entry-HP target: a tempo note on each option (intent.ts restFit).
  const runPlan = currentRunPlan(env.screenMemory, state);
  const upgrades = upgradeFacts(state, knowledge);
  for (const raw of asArray(rest["options"]).map(asRecord)) {
    if (!bool(raw["is_enabled"])) continue;
    const index = numOrNull(raw["index"]);
    if (index === null) continue;
    const id = str(raw["option_id"]).toUpperCase();
    const title = str(raw["title"], id);
    // Pantograph heals 25 at the boss's start: the rest right before the boss counts it (UP1C F16: healed
    // 60 -> 80 when 60 + 25 already entered at 80/80; smithing was free).
    const hpPct = hpPercent(env, pantographHeal(state));
    // Code-side preference only matters when Jev cannot be used or is unsure.
    // Phase 2: heal below half HP, otherwise upgrade; anything unusual stays close so the model sees it.
    // The rest site right before an act boss (floor 16 of an act) heals unless HP is already high:
    // runs 2, 5 and 6 walked into the Act 1 boss at 50-67% and two of them died there.
    // Act bosses sit on floors 17, 33 and 48 (acts are not all 17 floors: 88HN's F47 rest was missed).
    // A rest whose every exit is an Elite is the same as the pre-boss rest (G8AQ F24: 49/80, trained
    // instead of healing, the forced elite next killed us; XJWF F7: smithed at 65%, elite took 60 -> 26),
    // and so is one whose every path meets an Elite two nodes on with no rest or shop between (77QX F9:
    // smithed at 65% with only a treasure room before the F11 Terror Eel, 52 -> 17).
    const floor = state.run?.floor ?? 1;
    const nextBoss = [17, 33, 48].find((bossFloor) => bossFloor >= floor) ?? floor;
    const beforeBoss = nextBoss - floor <= 2 || forcedNext(env.screenMemory, state) !== null || forcedEliteWithin(env.screenMemory, state, REST_NODES, REST_ELITE_DEPTH);
    // Within 4 floors of the boss, below 65% there are fights left to lose HP in before the last rest
    // (T4PY F29: smithed at 46/80, entered the crab at 55/80 after two fights, died on T4).
    const nearBoss = nextBoss - floor <= 4;
    const score =
      (id === "HEAL"
        ? hpPct < 0.5 || (beforeBoss && hpPct < 0.85) || (nearBoss && hpPct < 0.65) ? 10 : hpPct < 0.65 ? 5 : 1
        : id === "SMITH" ? 6 : 4) + gapRestShift(damageGap(state, env.knowledge), id, hpPct, beforeBoss);
    const facts = restOptionFacts(id, state, hpPct, runPlan?.entryHp ?? null, nextBoss - floor, beforeBoss, upgrades);
    options.push({
      key: `o${index}`,
      label: `${title} (${id})`,
      intent: bool(raw["requires_target"]) && asArray(raw["valid_target_indices"]).length > 0
        ? { action: "choose_rest_option", option_index: index, target_index: numOrNull(asArray(raw["valid_target_indices"])[0]) ?? 0 }
        : { action: "choose_rest_option", option_index: index },
      score,
      summary: {
        option: title,
        kind: id,
        description: truncate(str(raw["description"]), 160),
        ...facts,
      },
      why: restWhy(id, hpPct, beforeBoss, nearBoss),
      id,
      hpPct,
    });
  }
  // Tempo notes against DeepSeek's rest lean, entry target and hp_policy.
  const toBoss = floorsToBoss(state.run?.floor ?? 1);
  const labelled: PickOption[] = options.map(({ id, hpPct, ...option }) => {
    const fit = restFit(runPlan, id, hpPct, toBoss);
    return { ...option, summary: { ...option.summary, ...(fit ? { tempo: fit.tempo } : {}) }, ...(fit?.breaks ? { intentBreak: fit.tempo } : {}) };
  });

  if (options.length === 0) {
    if (state.available_actions.includes("proceed")) {
      return { kind: "act", label: "rest/proceed", intent: { action: "proceed" }, rationale: "nothing to choose at this rest site" };
    }
    return null;
  }

  const entries = deckEntries(state, knowledge);
  const upgradeable = entries.filter((entry) => !entry.upgraded).length;
  return buildPickDecision({
    label: "rest/choose",
    instructions: "What should I do at this rest site?",
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    escalateBelow: 0.5,
    options: labelled,
    planVersion: runPlan?.version ?? null,
    guidance: guidanceFor(runPlan, "rest", hpPercent(env)),
    state: {
      run_brief: briefJson(env.brief),
      situation: {
        screen: "REST",
        hp: env.brief.hp,
        hp_percent: Math.round(hpPercent(env) * 100),
        ...(pantographHeal(state) > 0 ? { boss_start_heal: `Pantograph heals ${PANTOGRAPH_HEAL} at the boss's start: ${Math.round(hpPercent(env, PANTOGRAPH_HEAL) * 100)}% HP entering it without resting` } : {}),
        upgradable_cards: upgradeable,
        next_nodes: nextNodeTypes(env.screenMemory, state),
      },
      labels: LABEL_NOTE,
    },
  });
}

/** HEAL restores this share of max HP. */
export const REST_HEAL_SHARE = 0.3;

/** Why code scores a rest option as it does (its reference, from HP and the boss clock only). */
function restWhy(id: string, hpPct: number, beforeBoss: boolean, nearBoss: boolean): string {
  const pct = `${Math.round(hpPct * 100)}%`;
  if (id === "HEAL") {
    if (hpPct < 0.5) return `HP ${pct} is below half`;
    if (beforeBoss && hpPct < 0.85) return `HP ${pct} with the boss or a forced elite next`;
    if (nearBoss && hpPct < 0.65) return `HP ${pct} within 4 floors of the boss`;
    return hpPct < 0.65 ? `HP ${pct} is below 65%` : `HP ${pct}: little to heal`;
  }
  if (id === "SMITH") return "an upgrade lasts the rest of the run";
  return "other rest option";
}

/**
 * The facts of a rest option: for HEAL the HP it leaves against the entry target and the boss distance
 * (Pantograph counted before the boss), for SMITH the cards an upgrade improves most and by how much.
 */
export function restOptionFacts(
  id: string,
  state: GameState,
  hpPct: number,
  entryHp: number | null,
  toBoss: number,
  beforeBoss: boolean,
  upgrades: string[],
): Record<string, JsonValue> {
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  const hp = state.run?.current_hp ?? null;
  const max = state.run?.max_hp ?? null;
  if (id === "HEAL" && hp !== null && max !== null && max > 0) {
    const heal = Math.min(max - hp, Math.round(max * REST_HEAL_SHARE));
    const after = Math.min(1, hpPct + heal / max);
    const target = entryHp !== null ? `; DeepSeek's entry target ${pct(entryHp)} ${after >= entryHp ? "reached" : `still ${pct(entryHp - after)} short`}` : "";
    return { heal_facts: `+${heal} HP: ${pct(hpPct)} -> ${pct(after)}${after >= 0.999 && heal < max * REST_HEAL_SHARE ? ` (${Math.round(max * REST_HEAL_SHARE) - heal} of the heal wasted at full HP)` : ""}; boss in ${toBoss} floor${toBoss === 1 ? "" : "s"}${beforeBoss ? " (boss or forced elite next)" : ""}${target}` };
  }
  if (id === "SMITH") {
    return {
      upgrade_facts: upgrades.length > 0 ? `best upgrades: ${upgrades.join("; ")}` : "no card left to upgrade",
      hp_if_not_healing: `${pct(hpPct)} HP carried on${entryHp !== null ? ` (DeepSeek's entry target ${pct(entryHp)}, boss in ${toBoss} floors)` : ` (boss in ${toBoss} floors)`}`,
    };
  }
  return {};
}

/** What an upgrade adds to a card, in its numbers ("+3 damage, +1 Vulnerable"). */
function upgradeDelta(before: CardModel, after: CardModel): string {
  const parts: string[] = [];
  const damage = (after.damage ?? 0) * Math.max(1, after.hits) - (before.damage ?? 0) * Math.max(1, before.hits);
  if (damage) parts.push(`${damage > 0 ? "+" : ""}${damage} damage`);
  if (after.block !== before.block) parts.push(`+${after.block - before.block} block`);
  if (after.vulnerable !== before.vulnerable) parts.push(`+${after.vulnerable - before.vulnerable} Vulnerable`);
  if (after.weak !== before.weak) parts.push(`+${after.weak - before.weak} Weak`);
  if (after.strength !== before.strength) parts.push(`+${after.strength - before.strength} Strength`);
  if (after.draw !== before.draw) parts.push(`+${after.draw - before.draw} draw`);
  if (after.cost !== before.cost) parts.push(`cost ${before.cost} -> ${after.cost}`);
  return parts.join(", ");
}

/**
 * The deck's best upgrades (up to three): code's upgrade priority (Demon Form, Offering, Bash, …, then
 * card value), each with what the upgrade changes in the numbers the solver models.
 */
export function upgradeFacts(state: GameState, knowledge: Knowledge): string[] {
  const deck = asArray(asRecord(state.run?.raw)["deck"]).map(asRecord);
  const seen = new Set<string>();
  return deck
    .map((entry, index) => ({ entry, index, id: str(entry["card_id"]), type: str(entry["card_type"], knowledge.card(str(entry["card_id"]))?.type ?? "") }))
    .filter(({ entry, id, type }) => !bool(entry["upgraded"]) && id !== "" && type !== "Curse" && type !== "Status")
    .filter(({ id }) => (seen.has(id) ? false : (seen.add(id), true)))
    .map((card) => ({ ...card, priority: upgradePriority(card.id, card.type) }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map(({ entry, index, id, priority }) => {
      const model = modelHandCard(entry, index, knowledge);
      const up = upgradeCard(model);
      const delta = upgradeDelta(model, up);
      const gain = Math.round(upgradeGain(model, up));
      return `${str(entry["name"], knowledge.card(id)?.name ?? id)}: ${delta || "effect beyond the modelled numbers"}${gain > 0 ? ` (~${gain} points a play)` : ""}, upgrade priority ${Math.round(priority)}`;
    });
}

function hpPercent(env: DecisionEnv, extra = 0): number {
  const hp = env.state.run?.current_hp ?? null;
  const max = env.state.run?.max_hp ?? null;
  return hp !== null && max !== null && max > 0 ? Math.min(1, (hp + extra) / max) : 1;
}

/** Pantograph: HP healed at the start of a boss fight (CWU9, 0YV6, CAYK: +25 each time). */
export const PANTOGRAPH_HEAL = 25;

/** Pantograph's boss heal when the next floor is the act boss, else 0. */
export function pantographHeal(state: GameState): number {
  const floor = state.run?.floor ?? 1;
  const relics = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
  return relics.includes("PANTOGRAPH") && [17, 33, 48].includes(floor + 1) ? PANTOGRAPH_HEAL : 0;
}

/** Keeps the MAP screen's graph for the screens after it (the REST screen has no map). */
export function rememberMap(memory: ScreenMemory, state: GameState): void {
  const map = asRecord(state.raw["map"]);
  const rawNodes = asArray(map["nodes"]).map(asRecord);
  if (rawNodes.length === 0) return;
  memory.lastMap = {
    runId: str(state.raw["run_id"]),
    floor: state.run?.floor ?? null,
    nodes: rawNodes.map((node) => ({
      row: num(node["row"]),
      col: num(node["col"]),
      type: str(node["node_type"], "Unknown"),
      children: asArray(node["children"]).map(asRecord).map((child) => ({ row: num(child["row"]), col: num(child["col"]) })),
    })),
    available: asArray(map["available_nodes"]).map(asRecord).map((node) => ({ row: num(node["row"]), col: num(node["col"]), type: str(node["node_type"], "Unknown") })),
    current: mapPoint(map["current_node"]),
    boss: mapPoint(map["boss_node"]),
    act: state.run?.act_id ?? null,
  };
}

function mapPoint(value: unknown): { row: number; col: number } | null {
  const point = asRecord(value);
  return typeof point["row"] === "number" && typeof point["col"] === "number" ? { row: point["row"], col: point["col"] } : null;
}

/** Map node types a rest site shows as; events come from "Unknown" (and "Ancient") nodes. */
export const REST_NODES = ["RestSite", "Rest"];
export const EVENT_NODES = ["Unknown", "Ancient"];

/**
 * The node types reachable from this room, from the map remembered one floor earlier: the room is the
 * one node of `roomTypes` among that map's available nodes. null when that is not known.
 */
export function nextNodeTypes(memory: ScreenMemory, state: GameState, roomTypes: readonly string[] = REST_NODES): string[] | null {
  const map: RememberedMap | undefined = memory.lastMap;
  const floor = state.run?.floor ?? null;
  if (!map || map.runId !== str(state.raw["run_id"]) || floor === null || map.floor !== floor - 1) return null;
  const rests = map.available.filter((node) => roomTypes.includes(node.type));
  if (rests.length !== 1) return null;
  const here = map.nodes.find((node) => node.row === rests[0]!.row && node.col === rests[0]!.col);
  if (!here || here.children.length === 0) return null;
  return here.children.map((child) => map.nodes.find((node) => node.row === child.row && node.col === child.col)?.type ?? "Unknown");
}

/** "Elite" or "Boss" when every path from this room goes straight into one; else null. */
export function forcedNext(memory: ScreenMemory, state: GameState, roomTypes: readonly string[] = REST_NODES): "Elite" | "Boss" | null {
  const types = nextNodeTypes(memory, state, roomTypes);
  if (!types || types.length === 0) return null;
  if (types.every((type) => type === "Elite")) return "Elite";
  if (types.every((type) => type === "Boss")) return "Boss";
  return null;
}

/** Nodes a rest site looks ahead for a forced Elite (through a treasure room or a fight). */
export const REST_ELITE_DEPTH = 2;

/** Nodes where HP (rest) or the gold an HP trade buys (shop) can be used before an elite. */
const ELITE_ESCAPES = ["RestSite", "Rest", "Shop"];

/**
 * Whether every path from this room meets an Elite within `depth` nodes, with no rest site or shop
 * before it (remembered map). The room is any of the remembered map's available nodes of `roomTypes`:
 * all of them must lead there, since which one was taken is not known. NZR7 F4: -18 HP for 150 gold
 * with F5/F6 forced Monsters and a forced Elite at F7, no shop in between; the next-node check saw a
 * Monster.
 */
export function forcedEliteWithin(memory: ScreenMemory, state: GameState, roomTypes: readonly string[], depth: number): boolean {
  const map: RememberedMap | undefined = memory.lastMap;
  const floor = state.run?.floor ?? null;
  if (!map || map.runId !== str(state.raw["run_id"]) || floor === null || map.floor !== floor - 1) return false;
  const nodeAt = (point: { row: number; col: number }) => map.nodes.find((node) => node.row === point.row && node.col === point.col);
  const rooms = map.available.filter((node) => roomTypes.includes(node.type)).map(nodeAt);
  if (rooms.length === 0) return false;
  const reaches = (node: RememberedMap["nodes"][number], left: number): boolean =>
    node.children.length > 0 &&
    node.children.every((child) => {
      const next = nodeAt(child);
      if (!next) return false;
      if (next.type === "Elite") return true;
      if (ELITE_ESCAPES.includes(next.type) || left <= 1) return false;
      return reaches(next, left - 1);
    });
  return rooms.every((room) => room !== undefined && reaches(room, depth));
}

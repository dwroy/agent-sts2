/** Rest sites (PLAN.md §6.7): HEAL vs SMITH and friends, driven by HP% and upgradeable cards. */

import { asArray, asRecord, bool, num, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { damageGap, gapRestShift } from "../strategy/boss-clock.js";
import { runPlanRestShift } from "../strategy/run-plan.js";
import { deckEntries } from "../project/deck.js";
import { briefJson } from "../project/run-brief.js";
import type { GameState } from "../mod/schema.js";
import type { Decision, DecisionEnv, RememberedMap, ScreenMemory } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";
import { buildFacts, deepseekDecides } from "../strategy/build-facts.js";
import { deckCards, deckFollowUp, eligibleCards, nextPlanRef, oneshotFailedHere, oneshotOn, planOnly, visitKey, withFollowUp, type DeckFollowUp } from "./oneshot.js";
import { followUpTargetScore } from "./selection.js";
import { fightChainAt } from "./map.js";
import { routeReviewBlock, withRouteReview } from "./route-review.js";
import { baseRestHeal, restedHp, restHealOf, type RestHeal } from "../strategy/route-projection.js";

export function planRest(env: DecisionEnv): Decision | null {
  const { state, knowledge } = env;
  const rest = asRecord(state.raw["rest"]);
  if (Object.keys(rest).length === 0) return null;

  const options: PickOption[] = [];
  /** Each option's game entry (its id and text tell which deck selection it opens). */
  const rawByKey = new Map<string, Record<string, unknown>>();
  for (const raw of asArray(rest["options"]).map(asRecord)) {
    if (!bool(raw["is_enabled"])) continue;
    const index = numOrNull(raw["index"]);
    if (index === null) continue;
    const id = str(raw["option_id"]).toUpperCase();
    const title = str(raw["title"], id);
    const hpPct = hpPercent(env);
    // Code-side preference only matters when Jev cannot be used or is unsure.
    // Phase 2: heal below half HP, otherwise upgrade; anything unusual stays close so the model sees it.
    // The rest site right before an act boss (floor 16 of an act) heals unless HP is already high:
    // runs 2, 5 and 6 walked into the Act 1 boss at 50-67% and two of them died there.
    // Act bosses sit on floors 17, 33 and 48 (acts are not all 17 floors: 88HN's F47 rest was missed).
    // A rest whose every exit is an Elite is the same as the pre-boss rest (G8AQ F24: 49/80, trained
    // instead of healing, the forced elite next killed us; XJWF F7: smithed at 65%, elite took 60 -> 26).
    const floor = state.run?.floor ?? 1;
    const nextBoss = [17, 33, 48].find((bossFloor) => bossFloor >= floor) ?? floor;
    const beforeBoss = nextBoss - floor <= 2 || forcedNext(env.screenMemory, state) !== null;
    // Within 4 floors of the boss, below 65% there are fights left to lose HP in before the last rest
    // (T4PY F29: smithed at 46/80, entered the crab at 55/80 after two fights, died on T4).
    const nearBoss = nextBoss - floor <= 4;
    const healScore = hpPct < 0.5 || (beforeBoss && hpPct < 0.85) || (nearBoss && hpPct < 0.65) ? 10 : hpPct < 0.65 ? 5 : 1;
    const planShift = runPlanRestShift(env.screenMemory.runPlan, id, hpPct, beforeBoss);
    const gapShift = gapRestShift(damageGap(state, env.knowledge), id, hpPct, beforeBoss);
    const score = (id === "HEAL" ? healScore : id === "SMITH" ? 6 : 4) + planShift + gapShift;
    const why = [
      id === "HEAL"
        ? `HP ${Math.round(hpPct * 100)}%${beforeBoss ? ", boss or forced elite within 2 floors" : nearBoss ? ", boss within 4 floors" : ""}: heal ${healScore}`
        : id === "SMITH" ? "smith 6" : `${id} 4`,
      ...(planShift ? [`run plan rest ${env.screenMemory.runPlan?.rest ?? ""} ${planShift > 0 ? "+" : ""}${planShift}`] : []),
      ...(gapShift ? [`boss clock gap +${gapShift}`] : []),
    ].join("; ");
    rawByKey.set(`o${index}`, raw);
    options.push({
      why,
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
      } satisfies JsonValue,
    });
  }

  if (options.length === 0) {
    if (state.available_actions.includes("proceed")) {
      return { kind: "act", label: "rest/proceed", intent: { action: "proceed" }, rationale: "nothing to choose at this rest site" };
    }
    return null;
  }

  const entries = deckEntries(state, knowledge);
  const upgradeable = entries.filter((entry) => !entry.upgraded).length;
  const floor = state.run?.floor ?? 1;
  const nextBoss = [17, 33, 48].find((bossFloor) => bossFloor >= floor) ?? floor;
  const params = {
    label: "rest/choose",
    instructions: "What should I do at this rest site?",
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    escalateBelow: 0.5,
    options,
    codeMargin: env.combatPlanner === "card" ? undefined : 3,
    state: {
      run_brief: briefJson(env.brief),
      situation: {
        screen: "REST",
        hp: env.brief.hp,
        hp_percent: Math.round(hpPercent(env) * 100),
        upgradable_cards: upgradeable,
        next_nodes: nextNodeTypes(env.screenMemory, state),
      },
    },
  };
  // BUILD_DECIDER=deepseek: heal or smith (and the card to smith, on the next screen) is DeepSeek's call.
  if (!deepseekDecides(env)) return buildPickDecision(params);
  const maxNow = state.run?.max_hp ?? 0;
  const hpNow = state.run?.current_hp ?? 0;
  const healOption = asArray(rest["options"]).map(asRecord).find((raw) => str(raw["option_id"]).toUpperCase() === "HEAL");
  const heal = restHealHere(healOption ? str(healOption["description"]) : "", maxNow, relicIdsOf(state));
  const healed = restedHp(hpNow, maxNow, heal.rest, heal.base);
  const facts = buildFacts(env, {
    rest_site: {
      heal_amount: heal.text,
      hp_after_heal: `${healed.hp}/${healed.max}`,
      upgradable_cards: entries.filter((entry) => !entry.upgraded && entry.type !== "Curse" && entry.type !== "Status").map((entry) => entry.name),
      floors_to_act_boss: nextBoss - floor,
      next_nodes: nextNodeTypes(env.screenMemory, state),
      forced_next: forcedNext(env.screenMemory, state),
    },
  });
  // The act's route rides on the rest question while a fork is left (route-review.ts), the one-shot rest plan
  // and the step-by-step question alike, with the HP each rest option leaves: heal adds its amount, the other
  // actions leave HP as it is.
  const kindOf = (key: string): string => str(rawByKey.get(key)?.["option_id"]).toUpperCase();
  const after = (key: string): { hp: number; max: number } => (kindOf(key) === "HEAL" ? healed : { hp: hpNow, max: maxNow });
  const hpAfter = new Map(options.map((option) => [option.key, after(option.key).hp]));
  const review = routeReviewBlock(env, "rest", REST_NODES, options.map((option) => ({ keys: [option.key], kind: kindOf(option.key), hp: after(option.key).hp, max: after(option.key).max })));
  const reviewNote = review ? ` ${review.note} hp_if_option: each route's HP at its first elite and boss after each rest option.` : "";
  const withReview = (decision: Decision): Decision => withRouteReview(env, decision, review, (choice) => hpAfter.get(choice.split(":")[0] ?? choice) ?? hpNow);
  const reviewState = review ? { state: { ...params.state, route_review: review.state } } : {};
  // BUILD_ONESHOT: the rest action and the card it takes (smith X) in one question; code plays both.
  if (oneshotOn(env) && !oneshotFailedHere(env, "rest")) {
    const cards = deckCards(state, knowledge);
    const ref = nextPlanRef(env, "rest");
    const offered = new Set<string>();
    const expanded = options.flatMap((option) => {
      const raw = rawByKey.get(option.key) ?? {};
      const follow: DeckFollowUp | null = str(raw["option_id"]).toUpperCase() === "SMITH" ? { task: "upgrade", count: 1, upTo: false, text: "SMITH" } : deckFollowUp(str(raw["description"]));
      if (!follow) return [planOnly(env, option, ref)];
      for (const card of eligibleCards(cards, follow)) offered.add(card.identity.card_id);
      return withFollowUp(env, option, follow, cards, ref, "rest", followUpTargetScore(env, follow.task));
    });
    const note = "Each smith option names its card: code upgrades that card on the next screen without asking again.";
    return withReview(
      buildPickDecision({
        ...params,
        ...reviewState,
        label: "rest/plan",
        instructions: "What should I do at this rest site? Heal, smith a named card (one option per card that can be upgraded, with what the upgrade changes), or another rest action; code plays the action and the card pick.",
        options: expanded,
        deepseek: {
          facts,
          note: `${note}${reviewNote}`,
          // Without DeepSeek: the rest site's own Jev/code question (heal or smith; the card on the next screen).
          baseline: buildPickDecision(params),
          oneshot: { fallback: () => (env.screenMemory.oneshotFailed = visitKey(env, "rest")) },
          offeredCards: [...offered],
        },
      }),
    );
  }
  // Step by step (BUILD_ONESHOT off, or the one-shot answer was unusable): the card to smith is asked on the
  // next screen; the route block rides here as on the one-shot question.
  return withReview(
    buildPickDecision({
      ...params,
      ...reviewState,
      deepseek: {
        facts,
        note: `If you smith, you pick the card to upgrade on the next screen.${reviewNote}`,
      },
    }),
  );
}

function relicIdsOf(state: GameState): string[] {
  return asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
}

/**
 * What resting (HEAL) does at this rest site: the HEAL option's own text when it reads as the game writes it
 * (「回复最大生命值的30%（23）。」, then a line per relic: 「皇家枕头提供+15点生命。」 Regal Pillow,
 * 「提升5点你的最大生命值。」 Stone Humidifier), else 30% of max HP rounded down and the rest relics held
 * (route-projection REST_RELICS). hp_if_option and the rest facts assumed a flat 30% before.
 */
export function restHealHere(healText: string, maxHp: number, relicIds: readonly string[]): { base: number; rest: RestHeal; total: number; text: string } {
  const relics = restHealOf(relicIds);
  const own = /[（(](\d+)[）)]/.exec(healText);
  const sum = (pattern: RegExp): number => [...healText.matchAll(pattern)].reduce((total, match) => total + Number(match[1]), 0);
  const base = own ? Number(own[1]) : baseRestHeal(maxHp);
  const rest: RestHeal = own ? { bonus: sum(/提供\+(\d+)点生命/g), maxGain: sum(/提升(\d+)点你的最大生命值/g), sources: relics.sources } : relics;
  const total = base + rest.bonus;
  const text =
    `${total} HP: ${base} (30% of max HP, rounded down)${rest.bonus > 0 ? ` + ${rest.bonus}` : ""}` +
    `${rest.maxGain > 0 ? `, and max HP +${rest.maxGain} with HP +${rest.maxGain}` : ""}` +
    `${rest.sources.length > 0 ? ` (${rest.sources.join(", ")})` : ""}`;
  return { base, rest, total, text };
}

function hpPercent(env: DecisionEnv): number {
  const hp = env.state.run?.current_hp ?? null;
  const max = env.state.run?.max_hp ?? null;
  return hp !== null && max !== null && max > 0 ? hp / max : 1;
}

/** Keeps the MAP screen's graph for the screens after it (the REST screen has no map). */
export function rememberMap(memory: ScreenMemory, state: GameState): void {
  const map = asRecord(state.raw["map"]);
  const rawNodes = asArray(map["nodes"]).map(asRecord);
  if (rawNodes.length === 0) return;
  const next: RememberedMap = {
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
    fights: fightChainAt(map),
  };
  // A later frame of the same map screen (the travel animation) keeps the node already chosen from it.
  const previous = memory.lastMap;
  if (previous?.chosen && previous.runId === next.runId && previous.floor === next.floor && previous.act === next.act && samePoint(previous.current ?? null, next.current ?? null)) next.chosen = previous.chosen;
  memory.lastMap = next;
}

/**
 * Notes the node a map move chose on the remembered map (the loop, when it sends the move; the replay,
 * for a logged move): the REWARD and REST screens after it carry no map position.
 */
export function rememberChosenNode(memory: ScreenMemory, state: GameState, intent: { action: string; option_index?: number | null } | null | undefined): void {
  if (!intent || intent.action !== "choose_map_node" || state.screen !== "MAP") return;
  const map = memory.lastMap;
  if (!map || map.runId !== str(state.raw["run_id"]) || map.floor !== (state.run?.floor ?? null)) return;
  const node = asArray(asRecord(state.raw["map"])["available_nodes"])
    .map(asRecord)
    .find((entry) => numOrNull(entry["index"]) === (intent.option_index ?? null));
  if (node) map.chosen = { row: num(node["row"]), col: num(node["col"]), type: str(node["node_type"], "Unknown") };
}

function samePoint(a: { row: number; col: number } | null, b: { row: number; col: number } | null): boolean {
  return a === null || b === null ? a === b : a.row === b.row && a.col === b.col;
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

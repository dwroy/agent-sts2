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
import { deckCards, deckFollowUp, selectableCards, nextPlanRef, oneshotFailedHere, oneshotOn, planOnly, visitKey, withFollowUp, type DeckFollowUp } from "./oneshot.js";
import { followUpTargetScore } from "./selection.js";
import { fightChainAt } from "./map.js";
import { routeReviewBlock, withRouteReview } from "./route-review.js";
import { mapActOf } from "./route-plan.js";
import { baseRestHeal, BOSS_START_HEAL, restedHp, restHealOf, type RestHeal } from "../strategy/route-projection.js";
import { continueAfterDiscard, DISCARD_ANSWER_NOTE, DISCARD_SUFFIX, discardableSlots, discardVariant, potionSlotsNeeded } from "./potion-discard.js";
import { hpBandOf, restOutcome } from "../knowledge/outcome-facts.js";

export function planRest(env: DecisionEnv): Decision | null {
  const { state, knowledge } = env;
  const rest = asRecord(state.raw["rest"]);
  if (Object.keys(rest).length === 0) return null;
  // The second half of a rest option chosen with potion discards first (Tiny Mailbox's heal into a full belt).
  const pending = continueAfterDiscard(env, "rest", "rest", (option, title) => {
    const raw = asArray(rest["options"]).map(asRecord).find((entry) => numOrNull(entry["index"]) === option && bool(entry["is_enabled"]) && str(entry["title"], str(entry["option_id"]).toUpperCase()) === title);
    return raw ? { action: "choose_rest_option", option_index: option } : null;
  });
  if (pending !== undefined) return pending;

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
    // Code's fallback order (Jev's question, code deciding without it); never shown to DeepSeek (V4 M2).
    const score = (id === "HEAL" ? healScore : id === "SMITH" ? 6 : 4) + planShift + gapShift;
    rawByKey.set(`o${index}`, raw);
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
      } satisfies JsonValue,
    });
  }

  // A rest option that gives potions into a belt without room (Tiny Mailbox: 「从小邮箱获得2瓶随机药水」 on the heal
  // only, never on a smith; ZGZ0EQDDNJPT F10 code discarded Fysh Oil on the map for it, F11 smithed, the boss
  // with a slot empty): the plain option says what is lost, and a "discard, then …" variant lets the decider free
  // slots first; which potions, if any, is its call.
  const slots = discardableSlots(env);
  const withDiscard = (option: PickOption): PickOption[] => {
    const raw = rawByKey.get(option.key);
    const need = raw ? potionSlotsNeeded(str(raw["description"]), state.run?.raw) : 0;
    const title = raw ? str(raw["title"], str(raw["option_id"]).toUpperCase()) : "";
    const variant = raw ? discardVariant(env, option, { place: "rest", option: numOrNull(raw["index"]) ?? 0, title }, need, slots) : null;
    if (!variant) return [option];
    const lost = { ...option, summary: { ...(option.summary as Record<string, JsonValue>), potion_slots: `${need === 1 ? "1 potion" : `${need} potions`} this option gives ${need === 1 ? "has" : "have"} no free slot and ${need === 1 ? "is" : "are"} lost unless potions are discarded first (option ${variant.key})` } };
    return [lost, variant];
  };

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
    options: options.flatMap(withDiscard),
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
      // Facts only (the code's heal score keeps its own beforeBoss rule): an Elite every path meets within
      // FORCED_ELITE_DEPTH nodes with no rest site or shop before it (7KDMKN16GD6B), and a boss-start heal.
      ...(forcedEliteWithin(env.screenMemory, state, REST_NODES, FORCED_ELITE_REST_DEPTH) ? { forced_elite_ahead: `every path meets an Elite within ${FORCED_ELITE_REST_DEPTH} nodes, with no rest site or shop before it` } : {}),
      ...bossStartHealFacts(relicIdsOf(state), bossIsNextFight(env.screenMemory, state), heal.total, healed, hpNow, maxNow),
      // Our runs' outcome statistics per rest action, by the HP band on arrival (V4 M2: facts, not code's heal/smith score).
      ...restOutcomeFacts(options.map((option) => str(rawByKey.get(option.key)?.["option_id"]).toUpperCase()), hpNow, maxNow, state.run?.ascension),
    },
  });
  // The act's route rides on the rest question while a fork is left (route-review.ts), the one-shot rest plan
  // and the step-by-step question alike, with the HP each rest option leaves: heal adds its amount, the other
  // actions leave HP as it is.
  const kindOf = (key: string): string => str(rawByKey.get(key.split(":")[0] ?? key)?.["option_id"]).toUpperCase();
  const after = (key: string): { hp: number; max: number } => (kindOf(key) === "HEAL" ? healed : { hp: hpNow, max: maxNow });
  const hpAfter = new Map(options.map((option) => [option.key, after(option.key).hp]));
  const review = routeReviewBlock(env, "rest", REST_NODES, options.map((option) => ({ keys: [option.key], kind: kindOf(option.key), hp: after(option.key).hp, max: after(option.key).max })));
  const reviewNote = review ? ` ${review.note}` : "";
  const withReview = (decision: Decision): Decision => withRouteReview(env, decision, review, (choice) => hpAfter.get(choice.split(":")[0] ?? choice) ?? hpNow);
  const reviewState = review ? { state: { ...params.state, route_review: review.state } } : {};
  const discardNote = params.options.some((option) => option.key.endsWith(DISCARD_SUFFIX))
    ? ` ${DISCARD_ANSWER_NOTE}`
    : "";
  // BUILD_ONESHOT: the rest action and the card it takes (smith X) in one question; code plays both.
  if (oneshotOn(env) && !oneshotFailedHere(env, "rest")) {
    const cards = deckCards(state, knowledge);
    const ref = nextPlanRef(env, "rest");
    const offered = new Set<string>();
    const expanded = params.options.flatMap((option) => {
      const raw = rawByKey.get(option.key) ?? {};
      const follow: DeckFollowUp | null = str(raw["option_id"]).toUpperCase() === "SMITH" ? { task: "upgrade", count: 1, upTo: false, text: "SMITH" } : deckFollowUp(str(raw["description"]));
      if (!follow) return [planOnly(env, option, ref)];
      for (const card of selectableCards(env.state, cards, follow).listed) offered.add(card.identity.card_id);
      return withFollowUp(env, option, follow, cards, ref, "rest", followUpTargetScore(env, follow.task));
    });
    const note = `Each smith option names its card: code upgrades that card on the next screen without asking again.${discardNote}`;
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
        note: `If you smith, you pick the card to upgrade on the next screen.${discardNote}${reviewNote}`,
      },
    }),
  );
}

/**
 * The rest actions' outcome statistics (outcome-stats.json "rest": runs that took that action at a rest site, by
 * their HP band on arrival) and the band this rest site is in. `ascension`: the run's (from A9 up its own rows, thin ones
 * with A8's: knowledge/outcome-tables.ts).
 */
export function restOutcomeFacts(actionIds: string[], hp: number, maxHp: number, ascension?: number | null): Record<string, JsonValue> {
  const kinds = [...new Set(actionIds.filter(Boolean))];
  if (kinds.length === 0) return {};
  return {
    hp_band_now: hpBandOf(hp, maxHp),
    option_outcome_stats: Object.fromEntries(kinds.map((kind) => [kind, restOutcome(kind, ascension)])),
  };
}

function relicIdsOf(state: GameState): string[] {
  return asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
}

/**
 * What resting (HEAL) does at this rest site: the HEAL option's own text when it reads as the game writes it
 * (「回复最大生命值的30%（23）。」, then a line per relic: 「皇家枕头提供+15点生命。」 Regal Pillow,
 * 「提升5点你的最大生命值。」 Stone Humidifier), else 30% of max HP rounded down and the rest relics held
 * (route-projection REST_RELICS). The route facts and the rest facts assumed a flat 30% before.
 */
export function restHealHere(healText: string, maxHp: number, relicIds: readonly string[]): { base: number; rest: RestHeal; total: number; text: string } {
  // Eternal Feather's heal on entering is already in the HP here (no deck size: no enterHeal).
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
      ...(node["visited"] === true ? { visited: true } : {}),
    })),
    available: asArray(map["available_nodes"]).map(asRecord).map((node) => ({ row: num(node["row"]), col: num(node["col"]), type: str(node["node_type"], "Unknown") })),
    current: mapPoint(map["current_node"]),
    boss: mapPoint(map["boss_node"]),
    // Every boss node (A10: a second one): the route map marks both.
    bosses: [mapPoint(map["boss_node"]), mapPoint(map["second_boss_node"]), ...rawNodes.filter((node) => node["is_boss"] === true || node["is_second_boss"] === true).map((node) => mapPoint(node))]
      .filter((point): point is { row: number; col: number } => point !== null)
      .filter((point, at, all) => all.findIndex((other) => other.row === point.row && other.col === point.col) === at),
    act: state.run?.act_id ?? null,
    fights: fightChainAt(map, mapActOf(state)),
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

/** Nodes ahead a rest site looks for a forced Elite in (as an event does: FORCED_ELITE_DEPTH). */
export const FORCED_ELITE_REST_DEPTH = 3;

/** Relics that heal at the start of a boss fight (route-projection.ts; Pantograph 25). */
export { BOSS_START_HEAL };

/**
 * The boss-start heal facts at the rest site whose next fight is the act boss (bossIsNextFight): what the relic heals,
 * the HP each choice enters the boss with, and resting's real heal for the boss as a number (5NFGDU7BQPD3 F16: the
 * rest heal was weighed without it; MCK9SMSK40ZY F32 A8: smithed at 52/89, the real heal of resting was 12, entered
 * the Insatiable at 77/89 and lost by 1 HP). Pantograph heals 25 at the boss fight's start, up to max HP (logged boss
 * fights with it, first combat frame vs the rest site's exit HP: the 11 entered at least 25 below max HP started 25
 * higher, JRN33CL7EB50 F33 27 with Blood Vial's 2; 21 of the other 22 started at max HP), so resting adds min(heal,
 * max HP - HP - 25) over not resting, nothing when that is <= 0. `heal`: what resting here heals (the HEAL option's
 * own number with the rest relics); `healed`: HP and max HP after it.
 */
export function bossStartHealFacts(relicIds: string[], bossNext: boolean, heal: number, healed: { hp: number; max: number }, hpNow: number, maxNow: number): Record<string, JsonValue> {
  const relics = relicIds.filter((id) => BOSS_START_HEAL[id] !== undefined);
  if (relics.length === 0 || !bossNext) return {};
  const amount = relics.reduce((sum, id) => sum + BOSS_START_HEAL[id]!, 0);
  const entry = (hp: number, max: number): number => Math.min(max, hp + amount);
  const rested = entry(healed.hp, healed.max);
  const smithed = entry(hpNow, maxNow);
  const real = rested - smithed;
  const name = relics.map((id) => (id === "PANTOGRAPH" ? "Pantograph (缩放仪)" : id)).join(", ");
  // Without a max-HP gain (Stone Humidifier) the real heal is the formula; with one, the two entry HPs say it.
  const room = maxNow - hpNow - amount;
  const why =
    healed.max !== maxNow
      ? `${rested} - ${smithed} = ${real} HP`
      : room > 0
        ? `min(${heal}, ${maxNow} - ${hpNow} - ${amount}) = ${real} HP`
        : `0 HP (${maxNow} - ${hpNow} - ${amount} <= 0: ${name} alone fills HP to max at the boss's start)`;
  return {
    boss_start_heal:
      `${name} heals ${amount} HP when the boss fight starts (up to max HP), and the next fight after this rest site is the act boss: ` +
      `resting here heals ${heal} (${healed.hp}/${healed.max}) and enters the boss at ${rested}/${healed.max}; smithing (or any option that does not heal) enters it at ${smithed}/${maxNow}. ` +
      `Resting's real heal for the boss: ${why}.`,
  };
}

/** Rooms between a rest site and the boss that cost no HP: no fight can happen in them. */
const NO_FIGHT_NODES = ["Shop", "Treasure"];

/**
 * Whether the next fight after this rest site is the act boss: every path from it reaches a boss node through shops
 * and treasure rooms only, with no fight, "?" room or other rest site on the way. A "?" room may be a fight, so it
 * counts as one (uncertain: not the boss next). The rest site's node: the one chosen from the map remembered one floor
 * earlier, else every rest site available on that map (all of them must qualify). Without that map, the floor rule:
 * the boss is the very next floor (the floor before each act boss is all rest sites on every logged map: A8/A9
 * F16, F32 and F47 were a RestSite in 505 of 505 runs).
 */
export function bossIsNextFight(memory: ScreenMemory, state: GameState): boolean {
  const floor = state.run?.floor ?? null;
  if (floor === null) return false;
  const nextBoss = [17, 33, 48].find((bossFloor) => bossFloor >= floor) ?? floor;
  const map: RememberedMap | undefined = memory.lastMap;
  if (!map || map.runId !== str(state.raw["run_id"]) || map.floor !== floor - 1) return nextBoss - floor === 1;
  const nodeAt = (point: { row: number; col: number }) => map.nodes.find((node) => node.row === point.row && node.col === point.col);
  const isBoss = (point: { row: number; col: number }): boolean => nodeAt(point)?.type === "Boss" || (map.bosses ?? [map.boss ?? null]).some((boss) => boss !== null && boss.row === point.row && boss.col === point.col);
  const chosen = map.chosen && REST_NODES.includes(map.chosen.type) ? [map.chosen] : map.available.filter((node) => REST_NODES.includes(node.type));
  const rooms = chosen.map(nodeAt);
  if (rooms.length === 0 || rooms.some((room) => room === undefined)) return nextBoss - floor === 1;
  const reaches = (node: RememberedMap["nodes"][number], depth: number): boolean =>
    depth > 0 &&
    node.children.length > 0 &&
    node.children.every((child) => {
      if (isBoss(child)) return true;
      const next = nodeAt(child);
      return next !== undefined && NO_FIGHT_NODES.includes(next.type) && reaches(next, depth - 1);
    });
  return rooms.every((room) => reaches(room!, 16));
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

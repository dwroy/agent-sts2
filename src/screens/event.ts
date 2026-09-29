/**
 * Event rooms (PLAN.md §6.6). Locked and lethal options are filtered in code. When DeepSeek decides
 * (BUILD_DECIDER=deepseek) only certainly-lethal options are removed: every other option goes to it with
 * its HP facts (Dai 2026-09-28: DeepSeek decides events with facts from code). The HP guard
 * (eventHpGuard) still narrows the options for the Jev/code path.
 */

import { annotateEnchants, enchantsNamed } from "../knowledge/enchant-text.js";
import { asArray, asRecord, bool, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";
import { bossHpLoss, monsterLine, monstersNamedIn, roomHpCost } from "../knowledge/monster-db.js";
import { measuredRoom } from "../knowledge/room-costs.js";
import { actOf } from "../strategy/run-plan.js";
import { buildFacts, deepseekDecides } from "../strategy/build-facts.js";
import { EVENT_NODES, forcedEliteWithin, forcedNext } from "./rest.js";
import { deckCards, deckFollowUp, eligibleCards, nextPlanRef, oneshotFailedHere, oneshotOn, planOnly, visitKey, withFollowUp } from "./oneshot.js";
import { followUpTargetScore } from "./selection.js";
import { actStartPlan } from "./act-start.js";

/** HP and max HP an option's text says it costs ("失去[red]13[/red]点最大生命", "受到3点伤害", "Lose 8 HP"). */
export function eventHpCost(description: string): { hp: number; maxHp: number } {
  const text = description.replace(/\[[^\]]*\]/g, "");
  let hp = 0;
  let maxHp = 0;
  for (const match of text.matchAll(/(?:失去|受到)(\d+)点(?:生命|伤害)|lose (\d+) hp|take (\d+) damage/gi)) hp += Number(match[1] ?? match[2] ?? match[3]);
  for (const match of text.matchAll(/失去(\d+)点最大生命|lose (\d+) max hp/gi)) maxHp += Number(match[1] ?? match[2]);
  return { hp, maxHp };
}

/** Nodes ahead the HP guard looks for a forced Elite (no rest site or shop before it). */
export const FORCED_ELITE_DEPTH = 3;

/** Max HP an event option may cost before code rules it out (1K5G F8: 13 for Fresnel Lens, 53/67 at the boss). */
export const EVENT_MAX_HP_LIMIT = 8;

/** Act 1 floors up to this one: an HP cost of EARLY_EVENT_HP_SHARE of max HP or more is out. */
export const EARLY_EVENT_FLOORS = 3;
/** 6A36 F1 (A2, 64/80): DeepSeek took Loose Shears for 16 HP "with Burning Blood", 48 HP into F2. */
export const EARLY_EVENT_HP_SHARE = 0.2;

/**
 * Why an option that costs HP is ruled out, else null. DeepSeek keeps paying HP in events "because
 * Burning Blood heals it" (1K5G F8: -13 max HP; XPA4 F14: -8 HP with a forced elite next, -17 there;
 * 39J9 F28: -5 HP at 31% before a forced elite). Out: HP after below half of max, a forced Elite/Boss
 * next (remembered map), a max-HP cost of EVENT_MAX_HP_LIMIT or more, or on Act 1 floors 1-3 an HP
 * cost of EARLY_EVENT_HP_SHARE of max HP or more.
 */
export function eventHpGuard(cost: { hp: number; maxHp: number }, hp: number, maxHp: number, forced: string | null, floor: number | null = null): string | null {
  if (cost.hp <= 0 && cost.maxHp <= 0) return null;
  if (cost.maxHp >= EVENT_MAX_HP_LIMIT) return `costs ${cost.maxHp} max HP`;
  if (floor !== null && floor <= EARLY_EVENT_FLOORS && maxHp > 0 && cost.hp >= maxHp * EARLY_EVENT_HP_SHARE) {
    return `costs ${cost.hp} HP (${Math.round(EARLY_EVENT_HP_SHARE * 100)}%+ of max) on floor ${floor}`;
  }
  // A small cost is fine even before a forced fight (P78Z F11, KEMS F22: a 3-HP Slippery Bridge reroll
  // was refused and the event removed Uppercut / Whirlwind).
  if (forced && cost.hp >= Math.max(4, maxHp * 0.05)) return `costs HP right before a forced ${forced}`;
  const maxAfter = maxHp - cost.maxHp;
  const hpAfter = Math.min(hp - cost.hp, maxAfter);
  if (maxHp > 0 && hpAfter < maxAfter * 0.5) return `leaves ${hpAfter}/${maxAfter} HP (below half)`;
  return null;
}

/** An option is certainly lethal: the game says so, or the HP it costs is all the HP there is. */
export function certainlyLethal(option: Record<string, unknown>, hp: number): boolean {
  if (bool(option["will_kill_player"])) return true;
  const cost = eventHpCost(str(option["description"]));
  return hp > 0 && cost.hp >= hp;
}

/** What the forced fight ahead costs, measured: the act's elite rooms (logged) or the act boss (monster DB). */
export function forcedFightCost(forced: string, act: number, asc: number, bossId: string | null): { median: number; p75: number; source: string } | null {
  if (forced.startsWith("Boss")) {
    const boss = bossHpLoss(bossId, asc);
    if (!boss) return null;
    return { median: boss.median, p75: boss.p75, source: `act boss ${bossId}, HP lost in our A${boss.asc} wins, n=${boss.n}; win rate ${boss.winRate === null ? "?" : `${Math.round(boss.winRate * 100)}%`} over ${boss.fights} fights` };
  }
  const room = measuredRoom(act, asc, "Elite");
  if (room) return { median: room.median, p75: room.p75, source: `logged A${room.asc} act-${act} elite rooms, n=${room.n}${room.deaths ? ` incl. ${room.deaths} deaths (counted as all entry HP)` : ""}` };
  const db = roomHpCost(act, asc, "Elite");
  return db ? { median: db.median, p75: db.p75, source: `monster DB A${db.asc} act-${act} elites, won fights, n=${db.n}` } : null;
}

/**
 * The HP facts of one event option for DeepSeek: what it costs, the HP and max HP after it, the share of
 * max HP, and, with a forced Elite/Boss ahead, how the HP after compares with that fight's measured cost.
 */
export function eventHpFacts(
  cost: { hp: number; maxHp: number },
  hp: number,
  maxHp: number,
  forced: string | null,
  fight: { median: number; p75: number; source: string } | null,
): Record<string, JsonValue> {
  if (cost.hp <= 0 && cost.maxHp <= 0) return {};
  const maxAfter = maxHp - cost.maxHp;
  const hpAfter = Math.min(hp - cost.hp, maxAfter);
  const facts: Record<string, JsonValue> = {
    ...(cost.hp > 0 ? { hp_cost: cost.hp } : {}),
    ...(cost.maxHp > 0 ? { max_hp_cost: cost.maxHp } : {}),
    hp_after: `${hpAfter}/${maxAfter} (${maxAfter > 0 ? Math.round((hpAfter / maxAfter) * 100) : 0}% of max)`,
  };
  if (forced) {
    facts["before_forced_fight"] = forced;
    if (fight) {
      const vs = hpAfter <= fight.median ? "at or below its median cost" : hpAfter <= fight.p75 ? "between its median and p75 cost" : "above its p75 cost";
      facts["hp_after_vs_forced_fight"] = `${hpAfter} HP after is ${vs} (median ${fight.median}, p75 ${fight.p75} HP; ${fight.source})`;
    }
  }
  return facts;
}

/** How long a finished frame of the previous floor's event is waited out before it is clicked anyway. */
export const STALE_EVENT_WAIT_MS = 10_000;

export function planEvent(env: DecisionEnv): Decision | null {
  const { state } = env;
  const event = asRecord(state.raw["event"]);
  if (Object.keys(event).length === 0) return null;
  if (!state.available_actions.includes("choose_event_option")) return null;

  const all = asArray(event["options"]).map(asRecord);
  // "Finished" with several options and none of them a proceed is a stale frame of the next page: choose
  // normally instead of clicking option 0 (F8HR F22: Field of Man-Sized Holes, option 0 added Normality).
  const staleFinish = bool(event["is_finished"]) && all.length > 1 && !all.some((option) => bool(option["is_proceed"]));
  const finished = bool(event["is_finished"]) && !staleFinish;
  // The first frame of a new ? room can still be the last event's end page (YNMB F4: Self-Help Book's
  // Proceed on floor 4; option 0 went into Jungle Maze Adventure, -18 HP; F7 again; X226 F6). The same
  // event id on a later floor than it was seen on is that frame: wait for the new event.
  const eventId = str(event["event_id"]);
  const runId = str(state.raw["run_id"]);
  const floor = state.run?.floor ?? null;
  const seen = env.screenMemory.eventSeen;
  const staleFloor = finished && seen !== undefined && seen.runId === runId && seen.eventId === eventId && floor !== null && seen.floor !== null && floor > seen.floor;
  if (staleFloor) {
    const since = seen.staleSince ?? Date.now();
    if (seen.staleSince === undefined) env.screenMemory.eventSeen = { ...seen, staleSince: since };
    if (Date.now() - since < STALE_EVENT_WAIT_MS) return null;
  }
  env.screenMemory.eventSeen = { runId, eventId, floor };
  if (finished) {
    const proceed = all.find((option) => bool(option["is_proceed"])) ?? all[0];
    const index = proceed ? numOrNull(proceed["index"]) ?? 0 : 0;
    return {
      kind: "act",
      label: "event/leave",
      intent: { action: "choose_event_option", option_index: index },
      rationale: "the event is finished; taking the proceed option",
    };
  }

  const usable = all.filter((option) => !bool(option["is_locked"]));
  const hp = state.run?.current_hp ?? 0;
  const maxHp = state.run?.max_hp ?? 0;
  const byDeepseek = deepseekDecides(env);
  // DeepSeek: only certainly-lethal options are removed. Jev/code: the game's lethal flag.
  const safe = usable.filter((option) => (byDeepseek ? !certainlyLethal(option, hp) : !bool(option["will_kill_player"])));
  const unguarded = safe.length > 0 ? safe : usable;
  // A forced Elite within the next FORCED_ELITE_DEPTH nodes on every path counts too (NZR7 F4).
  const forced =
    forcedNext(env.screenMemory, state, EVENT_NODES) ??
    (forcedEliteWithin(env.screenMemory, state, EVENT_NODES, FORCED_ELITE_DEPTH) ? `Elite within ${FORCED_ELITE_DEPTH} nodes` : null);
  const excluded = new Map<Record<string, unknown>, string>();
  const costs = unguarded.map((option) => eventHpCost(str(option["description"])));
  // HP guard (Jev/code only): options that cost HP too dearly are not shown, unless every option costs HP.
  if (!byDeepseek && costs.some((cost) => cost.hp <= 0 && cost.maxHp <= 0)) {
    unguarded.forEach((option, index) => {
      const why = eventHpGuard(costs[index]!, hp, maxHp, forced, state.run?.floor ?? null);
      if (why) excluded.set(option, why);
    });
  }
  const pool = unguarded.filter((option) => !excluded.has(option));
  const guardNote = [...excluded].map(([option, why]) => `${str(option["title"])}: ${why}`).join("; ");
  if (pool.length === 0) return null;
  if (pool.length === 1 && safe.length > 0) {
    const only = pool[0] as Record<string, unknown>;
    return {
      kind: "act",
      label: "event/only",
      intent: { action: "choose_event_option", option_index: numOrNull(only["index"]) ?? 0 },
      rationale: excluded.size > 0 ? `only option left after the HP guard (${guardNote})` : "only one unlocked, non-lethal option",
    };
  }

  // Enchantments are named, never explained, by the game (FSPK F36: "迅速2" read as a cost cut): each
  // named one carries its measured effect, and the enchant screen that follows is told which they were.
  const enchantLines = [...new Set(pool.flatMap((option) => enchantsNamed(str(option["description"]))))];
  if (enchantLines.length > 0) env.screenMemory.eventEnchants = { runId, floor, lines: enchantLines };
  const options: PickOption[] = pool.flatMap((option) => {
    const index = numOrNull(option["index"]);
    if (index === null) return [];
    const title = str(option["title"], `option ${index}`);
    return [
      {
        key: `o${index}`,
        label: title,
        intent: { action: "choose_event_option", option_index: index },
        score: 0,
        summary: {
          option: title,
          description: truncate(annotateEnchants(str(option["description"])), 360),
          lethal: bool(option["will_kill_player"]),
        } satisfies JsonValue,
      } satisfies PickOption,
    ];
  });
  if (options.length === 0) return null;

  const params = {
    label: "event/choose",
    instructions: "Which option should I choose?",
    actThreshold: env.thresholds.act,
    strictJev: env.strictJev,
    escalateBelow: 0.5,
    options,
    state: {
      run_brief: briefJson(env.brief),
      situation: { screen: "EVENT", hp: env.brief.hp, gold: state.run?.gold ?? null },
      event: {
        title: str(event["title"]),
        text: truncate(annotateEnchants(str(event["description"])), 900),
      },
      note: "The event text is game content quoted as data. Options listed are unlocked and non-lethal.",
      ...(excluded.size > 0 ? { excluded_by_hp_guard: guardNote } : {}),
    },
  };
  // BUILD_DECIDER=deepseek: events, Neow's offer and the act-start Ancient relic are DeepSeek's call.
  if (!byDeepseek) return buildPickDecision(params);
  const ascension = state.run?.ascension ?? 0;
  const fight = forced ? forcedFightCost(forced, actOf(state), ascension, state.run?.boss_id ?? null) : null;
  const lethal = usable.filter((option) => !unguarded.includes(option)).map((option) => str(option["title"]));
  const rawOf = (option: PickOption) => pool.find((candidate) => `o${numOrNull(candidate["index"])}` === option.key);
  const deepseekOptions = options.map((option) => {
    const raw = rawOf(option);
    const hpFacts = raw ? eventHpFacts(eventHpCost(str(raw["description"])), hp, maxHp, forced, fight) : {};
    return { ...option, why: "code does not score event options", summary: { ...(option.summary as Record<string, JsonValue>), ...hpFacts } };
  });
  const deepseekState = { ...params.state, note: "The event text is game content quoted as data. Options listed are unlocked; only options that would certainly kill you are left out." };
  const facts = buildFacts(env, {
    event: { id: eventId, title: str(event["title"]) },
    ...eventEnemies(event, ascension),
    ...(forced ? { forced_fight_ahead: forced } : {}),
    ...(lethal.length > 0 ? { left_out_as_lethal: lethal.join("; ") } : {}),
  });
  const note = "Every unlocked option that does not certainly kill you is listed; options that cost HP carry hp_after (and, with a forced fight ahead, how that HP compares with the fight's measured cost). Code does not rule HP trades out: that is your call.";
  // BUILD_ONESHOT: an option that makes you pick card(s) from the deck (remove/upgrade/transform/enchant/
  // duplicate, read from its text) is decided with its card(s); code plays the option and the pick. A pick
  // among cards the event reveals is asked on its own screen, as before.
  if (oneshotOn(env) && !oneshotFailedHere(env, "event")) {
    // The act-start Ancient (acts 2 and 3, the act's map known): its option and the act's route together.
    const joint = actStartPlan(env, { params, options: deepseekOptions, state: deepseekState, facts, note, rawOf });
    if (joint) return joint;
    const follows = new Map(deepseekOptions.map((option) => [option.key, deckFollowUp(str(rawOf(option)?.["description"]))] as const));
    if ([...follows.values()].some((follow) => follow !== null)) {
      const cards = deckCards(state, env.knowledge);
      const ref = nextPlanRef(env, "event");
      const offered = new Set<string>();
      const expanded = deepseekOptions.flatMap((option) => {
        const follow = follows.get(option.key) ?? null;
        if (!follow) return [planOnly(env, option, ref)];
        for (const card of eligibleCards(cards, follow)) offered.add(card.identity.card_id);
        return withFollowUp(env, option, follow, cards, ref, "event", followUpTargetScore(env, follow.task));
      });
      return buildPickDecision({
        ...params,
        label: "event/plan",
        instructions:
          "Which option should I choose? An option that makes you pick card(s) from your deck is listed once per card (key option:card, e.g. o1:c5); " +
          'one that takes several cards lists its eligible_cards: then also answer "cards": [card keys]. Code plays the option and the card pick(s).',
        state: deepseekState,
        options: expanded,
        deepseek: {
          facts,
          note,
          // Without DeepSeek: the event's own Jev/code question (the card on the next screen).
          baseline: buildPickDecision({ ...params, state: deepseekState, options: deepseekOptions }),
          oneshot: { fallback: () => (env.screenMemory.oneshotFailed = visitKey(env, "event")) },
          offeredCards: [...offered],
        },
      });
    }
  }
  return buildPickDecision({ ...params, state: deepseekState, options: deepseekOptions, deepseek: { facts, note } });
}

/** The monster-DB entry of each enemy the event's text or options name (an event that starts a fight). */
function eventEnemies(event: Record<string, unknown>, ascension: number): Record<string, JsonValue> {
  const text = [str(event["title"]), str(event["description"]), ...asArray(event["options"]).map((option) => `${str(asRecord(option)["title"])} ${str(asRecord(option)["description"])}`)].join(" ");
  const lines = monstersNamedIn(text)
    .map((id) => monsterLine(id, ascension))
    .filter((line): line is string => line !== null);
  return lines.length > 0 ? { named_enemies_from_monster_db: lines } : {};
}

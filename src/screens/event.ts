/**
 * Event rooms (PLAN.md §6.6). Locked and lethal options are filtered in code, and so are HP trades the
 * models keep making on Burning Blood's word (see eventHpGuard).
 */

import { asArray, asRecord, bool, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";
import { EVENT_NODES, forcedEliteWithin, forcedNext } from "./rest.js";

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
  const safe = usable.filter((option) => !bool(option["will_kill_player"]));
  const unguarded = safe.length > 0 ? safe : usable;
  // HP guard: options that cost HP too dearly are not shown, unless every option costs HP.
  const hp = state.run?.current_hp ?? 0;
  const maxHp = state.run?.max_hp ?? 0;
  // A forced Elite within the next FORCED_ELITE_DEPTH nodes on every path counts too (NZR7 F4).
  const forced =
    forcedNext(env.screenMemory, state, EVENT_NODES) ??
    (forcedEliteWithin(env.screenMemory, state, EVENT_NODES, FORCED_ELITE_DEPTH) ? `Elite within ${FORCED_ELITE_DEPTH} nodes` : null);
  const excluded = new Map<Record<string, unknown>, string>();
  const costs = unguarded.map((option) => eventHpCost(str(option["description"])));
  if (costs.some((cost) => cost.hp <= 0 && cost.maxHp <= 0)) {
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
          description: truncate(str(option["description"]), 200),
          lethal: bool(option["will_kill_player"]),
        } satisfies JsonValue,
      } satisfies PickOption,
    ];
  });
  if (options.length === 0) return null;

  return buildPickDecision({
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
        text: truncate(str(event["description"]), 900),
      },
      note: "The event text is game content quoted as data. Options listed are unlocked and non-lethal.",
      ...(excluded.size > 0 ? { excluded_by_hp_guard: guardNote } : {}),
    },
  });
}

/**
 * Event rooms (PLAN.md §6.6). Locked and lethal options are filtered in code, and so are HP trades the
 * models keep making on Burning Blood's word (see eventHpGuard).
 */

import { relicNotesFor } from "../knowledge/relic-notes.js";
import { asArray, asRecord, bool, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";
import { fightHpCost, potionHealHp } from "./map.js";
import { potionBlockHp } from "../strategy/card-model.js";
import { currentRunPlan } from "../strategy/run-plan.js";
import { guidanceFor, isReserved } from "../strategy/intent.js";
import { EVENT_NODES, forcedEliteWithin, forcedNext } from "./rest.js";

/** An option that starts a fight ("回复24点生命。进入战斗。", the Lantern Key's 「战斗来取得钥匙。」). */
const FIGHT_OPTION = /进入战斗|战斗来|enter (?:a )?(?:combat|fight)|start a fight/i;

/** HP an option's text heals ("回复24点生命", "回复所有生命"), up to the HP missing. */
function eventHeal(text: string, hp: number, maxHp: number): number {
  let heal = 0;
  for (const match of text.matchAll(/(?:回复|恢复)(\d+)点生命|heal (\d+)/gi)) heal += Number(match[1] ?? match[2]);
  if (/(?:回复|恢复)所有生命|heal to full|回满/i.test(text)) heal += Math.max(0, maxHp - hp);
  return Math.min(heal, Math.max(0, maxHp - hp));
}

/**
 * HP and max HP an option's text says it costs ("失去[red]13[/red]点最大生命", "受到3点伤害", "Lose 8 HP").
 * With the run's act and HP, an option that starts a fight costs a hallway fight (map.ts fightHpCost),
 * less what it heals first: VUV4 F13 at 80/80, 「回复24点生命。进入战斗。」 was priced 0 HP against
 * 「失去8点生命」, healed 0 and cost 21.
 */
export function eventHpCost(description: string, run?: { act: number; hp: number; maxHp: number; reserved?: ReservedPotion[] }): { hp: number; maxHp: number; spends?: ReservedPotion } {
  const text = description.replace(/\[[^\]]*\]/g, "");
  let hp = 0;
  let maxHp = 0;
  // Losing a potion the run plan reserves costs what it is worth in HP (KGR6 F27).
  const spends = (run?.reserved ?? []).find((potion) => new RegExp(`(?:失去|交出|lose|give up)[^。.]{0,6}${escapeRegExp(potion.name)}`, "i").test(text));
  if (spends) hp += spends.hp;
  for (const match of text.matchAll(/(?:失去|受到)(\d+)点(?:生命|伤害)|lose (\d+) hp|take (\d+) damage/gi)) hp += Number(match[1] ?? match[2] ?? match[3]);
  for (const match of text.matchAll(/失去(\d+)点最大生命|lose (\d+) max hp/gi)) maxHp += Number(match[1] ?? match[2]);
  if (run && run.maxHp > 0 && FIGHT_OPTION.test(text)) {
    hp += Math.max(0, Math.round(fightHpCost("Monster", run.act) * run.maxHp) - eventHeal(text, run.hp, run.maxHp));
  }
  return { hp, maxHp, ...(spends ? { spends } : {}) };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A belt potion the run plan reserves, with its worth in HP. */
export interface ReservedPotion {
  id: string;
  name: string;
  hp: number;
}

/** Worth of a potion kept for a fight, in HP when not otherwise priced (the event score's +8 for a potion). */
export const RESERVED_POTION_HP = 8;

/**
 * The belt's potions the run plan reserves, each with its HP worth in the fight it is kept for: block
 * and Plating over an elite's turns (card-model potionBlockHp: Heart of Iron 22), a heal potion's heal,
 * else RESERVED_POTION_HP. KGR6 F27: the HP guard left only "lose Heart of Iron for +10 max HP", the
 * block potion reserved since act 1, against "-6 HP"; the F28 elite killed the run.
 */
export function reservedPotions(potions: Record<string, unknown>[], reserve: Parameters<typeof isReserved>[0], maxHp: number): ReservedPotion[] {
  return potions
    .filter((potion) => bool(potion["occupied"], true) && str(potion["potion_id"]) !== "")
    .filter((potion) => isReserved(reserve, str(potion["potion_id"]), str(potion["description"])))
    .map((potion) => {
      const id = str(potion["potion_id"]);
      const block = potionBlockHp(id);
      const heal = potionHealHp(id, maxHp);
      return { id, name: str(potion["name"], id), hp: block > 0 ? block : heal > 0 ? heal : RESERVED_POTION_HP };
    });
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
 * 39J9 F28: -5 HP at 31% before a forced elite). Out: HP after below half of max, a max-HP cost of
 * EVENT_MAX_HP_LIMIT or more, on Act 1 floors 1-3 an HP cost of EARLY_EVENT_HP_SHARE of max HP or more,
 * a forced Boss next, or a forced Elite (next, or within FORCED_ELITE_DEPTH nodes) that the HP left
 * after the cost and the elite's expected cost (map.ts fightHpCost) would leave below half of max HP.
 * VUV4 F13 at 80/80: -8 HP for 77 gold was out for an elite 3 nodes away; 80 - 8 - 20 is 52 of 80.
 * The caller shows it as the option's hp_caution (planEvent); it used to remove the option.
 */
export function eventHpGuard(cost: { hp: number; maxHp: number }, hp: number, maxHp: number, forced: string | null, floor: number | null = null, act = 1): string | null {
  if (cost.hp <= 0 && cost.maxHp <= 0) return null;
  if (cost.maxHp >= EVENT_MAX_HP_LIMIT) return `costs ${cost.maxHp} max HP`;
  if (floor !== null && floor <= EARLY_EVENT_FLOORS && maxHp > 0 && cost.hp >= maxHp * EARLY_EVENT_HP_SHARE) {
    return `costs ${cost.hp} HP (${Math.round(EARLY_EVENT_HP_SHARE * 100)}%+ of max) on floor ${floor}`;
  }
  // A small cost is fine even before a forced fight (P78Z F11, KEMS F22: a 3-HP Slippery Bridge reroll
  // was refused and the event removed Uppercut / Whirlwind).
  const maxAfter = maxHp - cost.maxHp;
  const hpAfter = Math.min(hp - cost.hp, maxAfter);
  if (forced && cost.hp >= Math.max(4, maxHp * 0.05)) {
    if (!forced.startsWith("Elite")) return `costs HP right before a forced ${forced}`;
    const eliteCost = Math.round(fightHpCost("Elite", act) * maxHp);
    if (hpAfter - eliteCost < maxAfter * 0.5) return `costs HP right before a forced ${forced} (~${eliteCost} HP there would leave ${hpAfter - eliteCost}/${maxAfter})`;
  }
  if (maxHp > 0 && hpAfter < maxAfter * 0.5) return `leaves ${hpAfter}/${maxAfter} HP (below half)`;
  return null;
}

/** Deck card an option can name: its shown name, and whether losing it costs the deck something. */
export interface EventDeckCard {
  name: string;
  /** A Power, an upgraded card, or a rare: not what an event should take away. */
  valued: boolean;
}

/** HP value weight: HP is worth more the lower it is (1.5 at 0 HP, 0.5 at full). */
function hpWeight(hp: number, maxHp: number): number {
  return maxHp > 0 ? 1 - hp / maxHp + 0.5 : 1;
}

/**
 * Code's score of an event option, used when no model answers (the code arm, a failed ask). All
 * options scored 0 and option 0 always won (90JG F9: an unplayable Spoils Map; BUUY F1: Scroll Boxes'
 * junk cards; 7048 F8: -3 HP into a forced elite over +10 HP; WYF0 F27: Demon Form+ removed on the
 * Slippery Bridge; YNMB F1: Lava Rock, paid only by an act-1 boss win). A rough sum of what the text
 * says: curses and unplayable cards -30, HP lost by how low HP is, healing likewise (x1.5 before a
 * forced fight), potion +8, potion slot +12, relic +10 (0 when a boss must drop it), card reward +8,
 * removal +12 (-30 when it names a Power, upgraded or rare card of the deck), upgrade +6, gold /12.
 */
export function eventOptionScore(
  description: string,
  ctx: { hp: number; maxHp: number; forced: boolean; deck?: EventDeckCard[]; act?: number; reserved?: ReservedPotion[] },
  reasons: string[] = [],
): number {
  const text = description.replace(/\[[^\]]*\]/g, "");
  const weight = hpWeight(ctx.hp, ctx.maxHp);
  let score = 0;
  if (/不能被打出|unplayable/i.test(text) || /(?:获得|加入|添加|变成|gain|add|obtain|become)[^。.]{0,16}(?:诅咒|curse)/i.test(text)) {
    score -= 30;
    reasons.push("a curse or unplayable card -30");
  }
  // A fight the option starts is priced with what it heals first (eventHpCost), so its heal is not
  // counted again.
  const fight = ctx.act !== undefined && FIGHT_OPTION.test(text);
  const cost = eventHpCost(text, ctx.act !== undefined ? { act: ctx.act, hp: ctx.hp, maxHp: ctx.maxHp, reserved: ctx.reserved } : { act: 0, hp: ctx.hp, maxHp: 0, reserved: ctx.reserved });
  score -= cost.hp * weight + cost.maxHp * 1.5;
  if (cost.hp > 0) reasons.push(`-${cost.hp} HP${fight ? " (a fight, at a hallway's cost)" : ""} x${weight.toFixed(2)}`);
  if (cost.maxHp > 0) reasons.push(`-${cost.maxHp} max HP x1.5`);
  if (cost.spends) reasons.push(`spends ${cost.spends.id}, held for the boss (~${cost.spends.hp} HP there)`);
  const heal = eventHeal(text, ctx.hp, ctx.maxHp);
  const healValue = fight ? Math.max(0, heal - Math.round(fightHpCost("Monster", ctx.act ?? 1) * ctx.maxHp)) * weight * (ctx.forced ? 1.5 : 1) : heal * weight * (ctx.forced ? 1.5 : 1);
  score += healValue;
  if (healValue > 0) reasons.push(`+${heal} HP heal${ctx.forced ? " before a forced fight (x1.5)" : ""}`);
  for (const match of text.matchAll(/获得(\d+)点最大生命|gain (\d+) max hp/gi)) {
    score += 0.6 * Number(match[1] ?? match[2]);
    reasons.push(`+${match[1] ?? match[2]} max HP`);
  }
  if (/药水栏|potion slot/i.test(text)) {
    score += 12;
    reasons.push("a potion slot +12");
  } else if (/药水|potion/i.test(text) && !/(?:失去|消耗|lose)[^。.]{0,8}(?:药水|potion)/i.test(text)) {
    score += 8;
    reasons.push("a potion +8");
  }
  // A relic that only a boss kill pays (Lava Rock) is worth nothing to a run that may die first.
  if (/遗物|relic/i.test(text)) {
    const relic = /boss|首领/i.test(text) ? 0 : 10;
    score += relic;
    reasons.push(relic > 0 ? "a relic +10" : "a relic paid only by a boss kill +0");
  }
  if (/卡牌奖励|card reward/i.test(text)) {
    score += 8;
    reasons.push("a card reward +8");
  }
  if (/(?:移除|删除|remove)/i.test(text)) {
    const named = (ctx.deck ?? []).find((card) => card.valued && card.name.length > 0 && text.includes(card.name));
    score += named ? -30 : 12;
    reasons.push(named ? `removes ${named.name}, a card worth keeping -30` : "a removal +12");
  }
  if (/升级|upgrade/i.test(text)) {
    score += 6;
    reasons.push("an upgrade +6");
  }
  for (const match of text.matchAll(/获得(\d+)\s*(?:枚)?\s*金|gain (\d+) gold/gi)) {
    score += Number(match[1] ?? match[2]) / 12;
    reasons.push(`+${match[1] ?? match[2]} gold /12`);
  }
  return Math.round(score * 10) / 10;
}

/**
 * An option's HP effect in words, against the run plan's entry target: 77UJ F22 Spirit Grafter at
 * 53/80 under entry_hp 85%, "+25 HP" and "-10 HP" went to Jev as bare text and it took -10 at 0.04.
 */
export function eventHpEffect(heal: number, cost: { hp: number; maxHp: number }, hp: number, maxHp: number, entryHp: number | null, maxGain = 0): string | null {
  if (maxHp <= 0 || (heal <= 0 && cost.hp <= 0 && cost.maxHp <= 0 && maxGain <= 0)) return null;
  const pct = (value: number, max: number) => `${Math.round((100 * value) / Math.max(1, max))}%`;
  const max = maxHp - cost.maxHp + maxGain;
  const after = Math.max(0, Math.min(max, hp + heal - cost.hp + maxGain));
  const changes = [heal > 0 ? `+${heal} HP` : "", cost.hp > 0 ? `-${cost.hp} HP` : "", maxGain > 0 ? `+${maxGain} max HP` : "", cost.maxHp > 0 ? `-${cost.maxHp} max HP` : ""].filter(Boolean);
  const parts = [`${changes.join(", ")}: ${pct(hp, maxHp)} -> ${pct(after, max)}`];
  if (entryHp !== null) {
    const target = `entry_hp ${Math.round(entryHp * 100)}%`;
    const before = hp / maxHp >= entryHp;
    if (after / max >= entryHp) parts.push(before ? `at ${target}` : `reaches ${target}`);
    else if (before) parts.push(`drops below ${target}`);
    else parts.push(after / max > hp / maxHp ? `toward ${target}` : after / max < hp / maxHp ? `further below ${target}` : `below ${target}`);
  }
  return parts.join(", ");
}

/** Max HP an option's text gives ("获得[blue]10[/blue]最大生命"). */
function eventMaxHpGain(text: string): number {
  let gain = 0;
  for (const match of text.matchAll(/获得(\d+)点?最大生命|gain (\d+) max hp/gi)) gain += Number(match[1] ?? match[2]);
  return gain;
}

/** The Lantern Key event (act 2): keep the key and fight for it, or return it for gold. */
export const LANTERN_KEY_EVENT = "THE_LANTERN_KEY";
/** HP share of max below which the Lantern Key is returned for the gold (the lessons' rule, 90% -> 80%). */
export const LANTERN_KEY_MIN_HP = 0.8;

/** The Lantern Key option that starts the fight ("留下钥匙": 「战斗来取得钥匙。」). */
function isLanternKeyFight(option: Record<string, unknown>): boolean {
  const text = `${str(option["text_key"])} ${str(option["title"])} ${str(option["description"])}`;
  return /KEEP_THE_KEY|留下钥匙|keep the key|战斗|fight/i.test(text) && !/金币|gold/i.test(str(option["description"]));
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
  const safe = usable.filter((option) => !bool(option["will_kill_player"]));
  const unguarded = safe.length > 0 ? safe : usable;
  // Only a lethal option (will_kill_player) is left out; HP costs are cautions on the options below.
  const hp = state.run?.current_hp ?? 0;
  const maxHp = state.run?.max_hp ?? 0;
  // A forced Elite within the next FORCED_ELITE_DEPTH nodes on every path counts too (NZR7 F4).
  const forced =
    forcedNext(env.screenMemory, state, EVENT_NODES) ??
    (forcedEliteWithin(env.screenMemory, state, EVENT_NODES, FORCED_ELITE_DEPTH) ? `Elite within ${FORCED_ELITE_DEPTH} nodes` : null);
  // Code's cautions on an option (HP costs before a forced fight, the Lantern Key's elite fight at low
  // HP) are facts on it now, not removals: Jev decides (only a lethal option is ever left out).
  const cautions = new Map<Record<string, unknown>, string>();
  // The Lantern Key: keeping it is a fight with the Mysterious Knight (108 HP, Strength 6, Plating 6: an
  // elite), paid with an unplayable Quest card and a card reward, not a relic. Three times a model kept
  // it for "a relic" (4V5T F23 -28, ZWX5 F28 -47, X8HF F21 55 -> 5 HP).
  if (eventId === LANTERN_KEY_EVENT && maxHp > 0 && hp < maxHp * LANTERN_KEY_MIN_HP) {
    for (const option of unguarded.filter(isLanternKeyFight)) cautions.set(option, `keeping the key is an elite-strength fight (Mysterious Knight: 108 HP, Strength 6, Plating 6) at ${hp}/${maxHp} HP, below ${Math.round(LANTERN_KEY_MIN_HP * 100)}%; it pays a Quest card and a card reward, not a relic`);
  }
  const act = Number(state.run?.act_id ?? 0) + 1 || 1;
  const reserved = reservedPotions(asArray(asRecord(state.run?.raw)["potions"]).map(asRecord), currentRunPlan(env.screenMemory, state)?.reserve, maxHp);
  const run = { act, hp, maxHp, reserved };
  const costs = unguarded.map((option) => eventHpCost(str(option["description"]), run));
  unguarded.forEach((option, index) => {
    const why = eventHpGuard(costs[index]!, hp, maxHp, forced, state.run?.floor ?? null, act);
    if (why && !cautions.has(option)) cautions.set(option, why);
  });
  const pool = unguarded;
  const spendsOf = (option: Record<string, unknown>) => costs[unguarded.indexOf(option)]?.spends;
  const spendsText = (spends: ReservedPotion) => `spends ${spends.id}, which DeepSeek holds for the boss (~${spends.hp} HP in the fight it is kept for)`;
  if (pool.length === 0) return null;
  if (pool.length === 1 && safe.length > 0) {
    const only = pool[0] as Record<string, unknown>;
    const spends = spendsOf(only);
    return {
      kind: "act",
      label: "event/only",
      intent: { action: "choose_event_option", option_index: numOrNull(only["index"]) ?? 0 },
      rationale: `only one unlocked, non-lethal option${spends ? `; ${spendsText(spends)}` : ""}`,
    };
  }

  const deck: EventDeckCard[] = asArray(asRecord(state.run?.raw)["deck"]).map((entry) => {
    const card = asRecord(entry);
    const id = str(card["card_id"]);
    const basic = /^(STRIKE|DEFEND)_/.test(id);
    return {
      name: str(card["name"]),
      valued: !basic && (str(card["card_type"]) === "Power" || bool(card["upgraded"]) || str(card["rarity"]) === "Rare"),
    };
  });
  const scoreCtx = { hp, maxHp, forced: forced !== null, deck, act, reserved };
  const entryHp = currentRunPlan(env.screenMemory, state)?.entryHp ?? null;
  const healOf = (option: Record<string, unknown>) => eventHeal(str(option["description"]).replace(/\[[^\]]*\]/g, ""), hp, maxHp);
  const costOf = (option: Record<string, unknown>) => costs[unguarded.indexOf(option)] ?? { hp: 0, maxHp: 0 };
  const runPlan = currentRunPlan(env.screenMemory, state);
  // The option's own HP numbers (a fight at its hallway cost net of its heal), not a potion it gives up.
  const hpEffectOf = (option: Record<string, unknown>): Record<string, JsonValue> => {
    const text = str(option["description"]).replace(/\[[^\]]*\]/g, "");
    const cost = eventHpCost(text, { act, hp, maxHp });
    const effect = eventHpEffect(FIGHT_OPTION.test(text) ? 0 : healOf(option), cost, hp, maxHp, entryHp, eventMaxHpGain(text));
    return effect ? { hp_effect: effect } : {};
  };
  const options: PickOption[] = pool.flatMap((option) => {
    const index = numOrNull(option["index"]);
    if (index === null) return [];
    const title = str(option["title"], `option ${index}`);
    // What a named relic does (EJXC F13/F22: DeepSeek guessed Chosen Cheese and Mr. Struggles).
    const notes = relicNotesFor(`${title} ${str(option["description"])}`);
    const relicNotes: Record<string, JsonValue> = notes.length > 0 ? { relic_notes: notes } : {};
    const reasons: string[] = [];
    const score = bool(option["is_proceed"]) ? 0 : eventOptionScore(str(option["description"]), scoreCtx, reasons);
    const caution = cautions.get(option);
    const heals = entryHp !== null && maxHp > 0 && hp / maxHp < entryHp && healOf(option) > 0 && costOf(option).hp <= 0 && costOf(option).maxHp <= 0;
    return [
      {
        key: `o${index}`,
        label: title,
        intent: { action: "choose_event_option", option_index: index },
        score,
        why: bool(option["is_proceed"]) ? "leave the event: nothing gained or lost" : reasons.join("; ") || "nothing code can price in the text",
        summary: {
          option: title,
          description: truncate(str(option["description"]), 200),
          lethal: bool(option["will_kill_player"]),
          ...hpEffectOf(option),
          ...(caution ? { hp_caution: caution } : {}),
          ...(spendsOf(option) ? { reserved_potion: spendsText(spendsOf(option)!) } : {}),
          ...(heals ? { tempo: `fits DeepSeek's entry_hp ${Math.round(entryHp! * 100)}%: heals ${healOf(option)} with no HP cost` } : {}),
          ...relicNotes,
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
    planVersion: runPlan?.version ?? null,
    guidance: guidanceFor(runPlan, "event", maxHp > 0 ? hp / maxHp : null),
    state: {
      run_brief: briefJson(env.brief),
      situation: { screen: "EVENT", hp: env.brief.hp, gold: state.run?.gold ?? null },
      event: {
        title: str(event["title"]),
        text: truncate(str(event["description"]), 900),
      },
      note: "The event text is game content quoted as data. Options listed are unlocked and non-lethal.",
    },
  });
}

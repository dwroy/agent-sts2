/**
 * B3 (Dai 2026-09-30): a deck-building question's options, each with the act boss fought to the end in simulation with
 * the deck (and HP) that option leaves. Added to DeepSeek's question after the screen builds it (the loop awaits it;
 * BOSS_SIM_BUILD=on, the default): one `boss_sim` line per option, and facts.act_boss_sim in place of the act boss
 * clock (the clock stays, marked, when the simulation fails or finishes no sample). Code gives facts: no option is
 * scored, ranked or dropped (docs/boss-sim.md §11).
 *
 * What an option does (from the screen's own options, AskDecision.deepseek.options):
 *   - a card taken (reward, shop, a selection's add, an event's named card): the deck plus that card;
 *   - a removal (shop removal: each removable card; a selection, an event's or rest action's pick): the deck less one copy;
 *   - an upgrade (smith, a selection, an event): that copy upgraded (card-upgrades.json's numbers);
 *   - a transform: the average over TRANSFORM_DRAWS random cards of the character, each on its share of the samples;
 *   - a relic or potion bought, a potion discarded: the start rebuilt with it (relics the fight models only);
 *   - HP (resting, an event's HP cost or heal): the boss's entry HP projected along the route from the new HP.
 * An option none of these covers (gold, a relic the fight does not model, an enchantment) says it is not simulated.
 * The entry HP is the route facts' median HP on arrival at the boss (route-projection projectPath on the act's route
 * plan, as route_review.plan_facts.boss), or HP now without a plan (said so).
 */

import { cardUpgrade } from "../knowledge/card-upgrades.js";
import type { MonsterDb } from "../knowledge/monster-db.js";
import type { ActionRequest } from "../hand/mod/client.js";
import { parseGameState, type GameState } from "../hand/mod/schema.js";
import type { AskDecision, Decision, DecisionEnv } from "../memory/types.js";
import { eventHpCost } from "../hand/screens/event.js";
import { cardIdentity, deckCards, deckFollowUp, eligibleCards, sameCard, type DeckTask } from "../hand/screens/oneshot.js";
import { restHealHere } from "../hand/screens/rest.js";
import { actPlan, mapActOf, routeCosts } from "../hand/screens/route-plan.js";
import { offHandCardModel, pilePowerExtraCost, type CardModel } from "../reflex/card-model.js";
import type { MoveModelData, RolloutInput } from "../reflex/rollout.js";
import { actFirstFloor } from "./route-map.js";
import { projectPath, restedHp } from "./route-projection.js";
import { asArray, asRecord, bool, numOrNull, str, type JsonValue } from "../core/util/json.js";
import { FIGHT_START_RELICS, bossKey, passiveSimRelic, syntheticBossStart, type SyntheticStart } from "./boss-start.js";
import { calibratedWinProb } from "./boss-sim.js";
import { BUILD_SIM_CALIBRATION_SAMPLES, BUILD_SIM_DEADLINE_MS, BUILD_SIM_SAMPLES, BUILD_SIM_SEED, compareOptions, type CompareResult, type DeckOption, type OptionSim } from "./build-sim.js";
import type { DeckSimRunner } from "./build-sim-pool.js";
import { LOW_CONFIDENCE_B3 } from "./boss-trust.js";

/** The deck-building questions that get the simulation. */
export const BUILD_SIM_LABELS = new Set([
  "reward/card", "shop/buy", "shop/plan", "rest/choose", "rest/plan",
  "selection/upgrade", "selection/remove", "selection/transform", "selection/add", "event/plan", "event/choose",
]);

/** Fewer samples than this (cut short by the time budget) and the options' numbers are not shown (Dai 2026-10-02). */
export const BUILD_SIM_MIN_SHOWN = 300;

/** A transform's outcome: this many random cards of the character, each on 1/n of the samples. */
export const TRANSFORM_DRAWS = 6;

/**
 * Bosses whose simulated fights are low confidence, and why (said on every line, the reason in facts.act_boss_sim): B4's
 * criteria on each boss's validation numbers from the pre-fight start (docs/boss-sim.md §13), the data file
 * knowledge/characters/ironclad/boss-trust.json that tools/boss-sim/trust.py writes (boss-trust.ts LOW_CONFIDENCE_B3).
 */
export const LOW_CONFIDENCE: Record<string, string> = LOW_CONFIDENCE_B3;

/** What the question's instructions add when the options carry the simulation (English, as the instructions are). */
export const BOSS_SIM_NOTE =
  "boss_sim on an option: this act's boss fought to the end in simulation with the deck (and HP) that option leaves, " +
  "against your current deck on the same random seeds: the win rate (calibrated on logged boss fights), the difference " +
  "± its standard error, the median HP lost in the won fights and the turns. facts.act_boss_sim gives the start, the " +
  "method and its limits; it replaces the act boss clock.";

export interface BuildSimSetup {
  runner: DeckSimRunner;
  samples?: number;
  seed?: number;
  /** The simulation's budget from the call (default BUILD_SIM_DEADLINE_MS). */
  deadlineMs?: number;
  now?: () => number;
  /** The monster DB and move model (default the committed ones; tests give fixed ones). */
  db?: MonsterDb;
  mm?: MoveModelData;
}

/** One option's simulation plan: its deck change, a per-card group (a removal, a smith), or why it is not simulated. */
interface OptionPlan {
  key: string;
  change?: Partial<RolloutInput> | null;
  mixture?: Partial<RolloutInput>[];
  /** Per deck card (a shop removal, a step-by-step smith): card key -> the change. */
  group?: { key: string; name: string; verb: string; change: Partial<RolloutInput>; mixture?: Partial<RolloutInput>[] }[];
  note?: string;
  none?: string;
}

type SimOption = { key: string; intent: ActionRequest; summary: JsonValue };

const pct = (p: number) => `${Math.round(p * 100)}%`;
const signed = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 1000) / 10)}`;
const one = (x: number) => String(Math.round(x * 10) / 10);

/** The entry HP the route facts project for the boss from `hp` (max `max`), and where it comes from. */
export function routeEntry(env: DecisionEnv): { project: (hp: number, max: number) => number; source: string; planned: boolean } {
  const { state } = env;
  const act = mapActOf(state);
  const plan = actPlan(env, act);
  const floor = state.run?.floor ?? null;
  if (!plan || floor === null) return { project: (hp) => hp, source: "按当前血量（本幕还没有路线计划）", planned: false };
  const first = actFirstFloor(act);
  const ahead = plan.path.filter((step) => first + step.row > floor);
  const bossAt = ahead.findIndex((step) => step.type === "Boss");
  if (bossAt < 0) return { project: (hp) => hp, source: "按当前血量（路线计划里前面没有 boss 节点）", planned: false };
  const types = ahead.map((step) => step.type);
  const costs = routeCosts(env, act);
  return {
    project: (hp, max) => projectPath(types, hp, costs, max).arrival[bossAt]!,
    source: `本幕路线计划到 boss（F${first + ahead[bossAt]!.row}）的中位投影，和 route_review.plan_facts.boss 同一个算法`,
    planned: true,
  };
}

/** A deck entry upgraded as card-upgrades.json logs it (card-model upgradeDelta's numbers), or null when not logged. */
export function upgradedEntry(card: Record<string, unknown>): Record<string, unknown> | null {
  const upgrade = cardUpgrade(str(card["card_id"]));
  if (!upgrade) return null;
  const moved = (value: unknown, delta: number): unknown => (typeof value === "number" ? value + delta : value);
  return {
    ...card,
    upgraded: true,
    energy_cost: upgrade.cost && !bool(card["costs_x"]) ? moved(card["energy_cost"], upgrade.cost[1] - upgrade.cost[0]) : card["energy_cost"],
    dynamic_values: asArray(card["dynamic_values"]).map((raw) => {
      const value = asRecord(raw);
      const change = upgrade.vars[str(value["name"])];
      if (!change) return value;
      const delta = change[1] - change[0];
      return { ...value, base_value: moved(value["base_value"], delta), current_value: moved(value["current_value"], delta), enchanted_value: moved(value["enchanted_value"], delta) };
    }),
  };
}

function seeded(text: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  let x = h >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

/**
 * The option plans of a question: what each option does to the start (`start`: the current deck at the projected
 * entry HP). `rebuild` builds the start again from a changed run (a relic, a potion).
 */
function planOptions(label: string, options: SimOption[], env: DecisionEnv, start: SyntheticStart, entry: ReturnType<typeof routeEntry>, rebuild: (edit: (run: Record<string, unknown>) => void) => RolloutInput): OptionPlan[] {
  const { state, knowledge } = env;
  const base = start.input;
  const run = asRecord(state.run?.raw);
  const deck = asArray(run["deck"]).map(asRecord);
  const hpNow = state.run?.current_hp ?? start.entryHp;
  const maxNow = state.run?.max_hp ?? start.maxHp;
  const character = str(run["character_id"]).toLowerCase();
  let added = 0;
  const withDraw = (draw: CardModel[]): Partial<RolloutInput> => ({ piles: { ...base.piles, draw } });
  // Spiked Gauntlets: an added or upgraded Power 1 more, as the deck's (rollout-live deckModels).
  const powerExtraCost = pilePowerExtraCost(asArray(run["relics"]).map((relic) => str(asRecord(relic)["relic_id"])));
  const newCard = (own: Record<string, unknown> | null, cardId: string, upgraded: boolean): CardModel => offHandCardModel(own, cardId, upgraded, 990 + (added += 1), knowledge, null, powerExtraCost);
  const positionOfKey = (cardKey: string): number => deck.findIndex((card, p) => `c${numOrNull(card["index"]) ?? p}` === cardKey);
  const positionOf = (card: Record<string, unknown>): number => deck.findIndex((own) => sameCard(own, cardIdentity(card)));
  const draw = base.piles.draw;
  const drop = (p: number) => draw.filter((c) => c.index !== 900 + p);
  const upgradeAt = (p: number): { change: Partial<RolloutInput>; note?: string } => {
    const own = deck[p]!;
    const up = upgradedEntry(own);
    const model = offHandCardModel(up ?? { ...own, upgraded: true }, str(own["card_id"]), true, 900 + p, knowledge, null, powerExtraCost);
    return { change: withDraw(draw.map((c) => (c.index === 900 + p ? model : c))), ...(up ? {} : { note: "这张牌的升级数值没有记录，按未升级的数值算" }) };
  };
  const transformAt = (p: number): { mixture: Partial<RolloutInput>[]; note: string } => {
    const own = deck[p]!;
    const pool = knowledge.cards().filter((c) => c.color === character && /^(Common|Uncommon|Rare)$/.test(c.rarity) && c.id !== str(own["card_id"]) && !/Curse|Status/.test(c.type));
    const random = seeded(`${str(state.raw["run_id"])}:${state.run?.floor ?? ""}:${str(own["card_id"])}`);
    const picks: typeof pool = [];
    const left = pool.slice();
    while (picks.length < TRANSFORM_DRAWS && left.length > 0) picks.push(left.splice(Math.floor(random() * left.length), 1)[0]!);
    const rest = drop(p);
    return {
      mixture: picks.map((c) => withDraw([...rest, newCard(null, c.id, false)])),
      note: `变化按随机结果的期望：${picks.length} 张随机的本角色牌（${picks.map((c) => c.name).join("、")}），每张各占一份样本`,
    };
  };
  const byTask = (task: DeckTask, p: number): { change?: Partial<RolloutInput>; mixture?: Partial<RolloutInput>[]; note?: string; none?: string } => {
    if (p < 0) return { none: "找不到这张牌" };
    if (task === "remove") return { change: withDraw(drop(p)) };
    if (task === "upgrade") return upgradeAt(p);
    if (task === "transform") return transformAt(p);
    if (task === "duplicate") return { change: withDraw([...draw, newCard(deck[p]!, str(deck[p]!["card_id"]), bool(deck[p]!["upgraded"]))]) };
    return { none: "附魔的战斗效果没有建模：不模拟" };
  };
  const withHp = (hp: number, max: number, change?: Partial<RolloutInput>): Partial<RolloutInput> => {
    const entryHp = Math.max(1, Math.round(entry.project(Math.max(0, hp), max)));
    const solver = change?.solver ?? base.solver;
    return { ...(change ?? {}), solver: { ...solver, player: { ...solver.player, hp: Math.min(max, entryHp), maxHp: max } } };
  };
  const relicOf = (id: string, name: string): OptionPlan | Omit<OptionPlan, "key"> => {
    if (!FIGHT_START_RELICS[id] && !knownRelic(id)) return { none: "这件遗物在 boss 战里的效果没有建模：不模拟" };
    return { change: rebuild((r) => void (r["relics"] = [...asArray(r["relics"]), { relic_id: id, name, stack: null, is_melted: false }])) };
  };
  const potionOf = (raw: Record<string, unknown>): Omit<OptionPlan, "key"> => {
    const belt = asArray(run["potions"]).map(asRecord);
    const empty = belt.findIndex((slot) => slot["occupied"] !== true);
    if (empty < 0) return { none: "药水栏已满（要先丢一瓶）：不模拟" };
    const id = str(raw["potion_id"]);
    const change = rebuild((r) => {
      const slots = asArray(r["potions"]).map(asRecord);
      slots[empty] = { ...slots[empty], index: numOrNull(slots[empty]!["index"]) ?? empty, potion_id: id, name: str(raw["name"], id), occupied: true, usage: str(raw["usage"], "CombatOnly"), target_type: str(raw["target_type"], "AnyPlayer") };
      r["potions"] = slots;
    });
    const held = (input: RolloutInput) => input.solver.hand.filter((c) => c.type === "Potion").length;
    return held(change) > held(base) ? { change } : { none: "这瓶药不在模拟里（随机药水或效果没建模）：不模拟" };
  };
  const eventOption = (raw: Record<string, unknown>, cardKey: string | null): Omit<OptionPlan, "key"> => {
    const text = str(raw["description"]);
    const plain = text.replace(/\[[^\]]*\]/g, "");
    const cost = eventHpCost(text);
    const heal = [...plain.matchAll(/回复(\d+)点生命/g)].reduce((sum, m) => sum + Number(m[1]), 0);
    const maxGain = [...plain.matchAll(/(?:获得|提升)(\d+)点最大生命/g)].reduce((sum, m) => sum + Number(m[1]), 0);
    let change: Partial<RolloutInput> | undefined;
    let mixture: Partial<RolloutInput>[] | undefined;
    const notes: string[] = [];
    // Cards the text names as added to the deck ("将1张X加入你的牌组").
    for (const m of plain.matchAll(/将(\d+|一|两)张(.{1,12}?)(?:加入|添加到?)你的牌组/g)) {
      const card = knowledge.cards().find((c) => c.name === m[2]);
      if (!card) continue;
      const count = Number(m[1]) || (m[1] === "两" ? 2 : 1);
      const models = Array.from({ length: count }, () => newCard(null, card.id, false));
      change = withDraw([...(change?.piles?.draw ?? draw), ...models]);
      notes.push(`加入 ${count} 张${card.name}`);
    }
    const follow = deckFollowUp(text);
    if (follow && cardKey) {
      const done = byTask(follow.task, positionOfKey(cardKey));
      if (done.none) return { none: done.none };
      if (done.mixture) mixture = done.mixture;
      else change = { ...(change ?? {}), ...done.change };
      if (done.note) notes.push(done.note);
    }
    if (cost.hp > 0 || cost.maxHp > 0 || heal > 0 || maxGain > 0) {
      const max = maxNow - cost.maxHp + maxGain;
      const hp = Math.min(max, hpNow - cost.hp + heal + maxGain);
      if (mixture) mixture = mixture.map((m) => withHp(hp, max, m));
      else change = withHp(hp, max, change);
      notes.push(`进场血量按选项之后的 HP ${hp}/${max} 投影`);
    }
    if (!change && !mixture) return { none: "这个选项的效果没有换算成牌组或血量的变化：不模拟" };
    return { ...(mixture ? { mixture } : { change: change! }), ...(notes.length > 0 ? { note: notes.join("；") } : {}) };
  };
  const removalGroup = (verb: string, task: DeckTask): OptionPlan["group"] =>
    eligibleCards(deckCards(state, knowledge), { task, count: 1, upTo: false, text: "" }).flatMap((card) => {
      const done = byTask(task, positionOfKey(card.key));
      return done.change || done.mixture ? [{ key: card.key, name: card.name, verb, change: done.change ?? {}, ...(done.mixture ? { mixture: done.mixture } : {}) }] : [];
    });

  const shop = asRecord(state.raw["shop"]);
  const reward = asRecord(state.raw["reward"]);
  const selection = asRecord(state.raw["selection"]);
  const event = asRecord(state.raw["event"]);
  const rest = asRecord(state.raw["rest"]);
  const entryAt = (list: unknown, index: number) => asArray(list).map(asRecord).find((e, i) => (numOrNull(e["index"]) ?? i) === index) ?? null;
  const task = label.startsWith("selection/") ? (label.slice("selection/".length) as DeckTask | "add") : null;

  return options.map((option): OptionPlan => {
    const { key } = option;
    const [head, cardKey] = key.split(":") as [string, string | undefined];
    const index = numOrNull(option.intent["option_index"]);
    const action = str(option.intent["action"]);
    const plan = (() : Omit<OptionPlan, "key"> => {
      if (action === "skip_reward_cards" || action === "close_shop_inventory" || key === "leave" || key === "skip") return { change: null };
      if (label === "reward/card" && index !== null) {
        const card = entryAt(reward["card_options"], index);
        return card ? { change: withDraw([...draw, newCard(card, str(card["card_id"]), bool(card["upgraded"]))]) } : { none: "找不到这张牌" };
      }
      // A shop item the gold now cannot pay for (the plan lists every stocked item): nothing to buy this visit.
      const summary = option.summary && typeof option.summary === "object" && !Array.isArray(option.summary) ? (option.summary as Record<string, JsonValue>) : {};
      if (action.startsWith("buy_") && summary["affordable_now"] === false) return { none: "现在的金币买不起：不模拟" };
      if (action === "remove_card_at_shop" && summary["affordable_now"] === false) return { none: "现在的金币付不起删牌：不模拟" };
      if (action === "buy_card" && index !== null) {
        const card = entryAt(shop["cards"], index);
        return card ? { change: withDraw([...draw, newCard(card, str(card["card_id"]), bool(card["upgraded"]))]) } : { none: "找不到这张牌" };
      }
      if (action === "buy_relic" && index !== null) {
        const relic = entryAt(shop["relics"], index);
        return relic ? relicOf(str(relic["relic_id"]), str(relic["name"], str(relic["relic_id"]))) : { none: "找不到这件遗物" };
      }
      if (action === "buy_potion" && index !== null) {
        const potion = entryAt(shop["potions"], index);
        return potion ? potionOf(potion) : { none: "找不到这瓶药" };
      }
      if (action === "discard_potion" && index !== null) {
        return { change: rebuild((r) => void (r["potions"] = asArray(r["potions"]).map(asRecord).map((slot, i) => ((numOrNull(slot["index"]) ?? i) === index ? { ...slot, potion_id: null, name: null, occupied: false } : slot)))) };
      }
      if (action === "remove_card_at_shop") return { group: removalGroup("去掉", "remove") };
      if (task && action === "select_deck_card" && index !== null) {
        const card = entryAt(selection["cards"], index);
        if (!card) return { none: "找不到这张牌" };
        if (task === "add") return { change: withDraw([...draw, newCard(card, str(card["card_id"]), bool(card["upgraded"]))]) };
        return byTask(task as DeckTask, positionOf(card));
      }
      if (label.startsWith("rest/")) {
        const raw = entryAt(rest["options"], Number(head.replace(/^o/, "")));
        const kind = str(raw?.["option_id"]).toUpperCase();
        if (kind === "HEAL") {
          const heal = restHealHere(str(raw?.["description"]), maxNow, asArray(run["relics"]).map((r) => str(asRecord(r)["relic_id"])));
          const healed = restedHp(hpNow, maxNow, heal.rest, heal.base);
          return { change: withHp(healed.hp, healed.max), note: `回血后 HP ${healed.hp}/${healed.max}，进场血量按它投影` };
        }
        if (kind === "SMITH") {
          if (cardKey) return byTask("upgrade", positionOfKey(cardKey));
          return { group: removalGroup("升级", "upgrade") };
        }
        if (kind === "LIFT") return { change: rebuild((r) => void (r["relics"] = asArray(r["relics"]).map(asRecord).map((relic) => (str(relic["relic_id"]) === "GIRYA" ? { ...relic, stack: (numOrNull(relic["stack"]) ?? 0) + 1 } : relic)))), note: "举重：壶铃多一层（开场力量 +1）" };
        const follow = raw ? deckFollowUp(str(raw["description"])) : null;
        if (follow && cardKey) return byTask(follow.task, positionOfKey(cardKey));
        return { none: "这个休息点动作不改变牌组和血量：不模拟" };
      }
      if (label.startsWith("event/") && action === "choose_event_option" && index !== null) {
        const raw = entryAt(event["options"], index);
        return raw ? eventOption(raw, cardKey ?? null) : { none: "找不到这个选项" };
      }
      return { none: "这个选项不改变牌组和血量：不模拟" };
    })();
    // A card whose effect the solver does not model plays as a small flat value (card-model `known`): taking it looks
    // like a dud and removing it like a free cut. Said on the option.
    const touched = [...(plan.change?.piles?.draw ?? []), ...(plan.mixture ?? []).flatMap((m) => m.piles?.draw ?? [])].filter((c) => !draw.includes(c));
    const removed = plan.change?.piles ? draw.filter((c) => !plan.change!.piles!.draw.includes(c)) : [];
    const unknown = [...touched, ...removed].filter((c) => !c.known && c.type !== "Curse" && c.type !== "Status").map((c) => c.name);
    const warn = unknown.length > 0 ? `${[...new Set(unknown)].join("、")}的效果模拟里没有完全建模（只算了已建模的部分），这张牌的作用可能被低估` : null;
    return { key, ...plan, ...(warn ? { note: plan.note ? `${plan.note}；${warn}` : warn } : {}) };
  });
}

/** Relics the fight models besides the fight-start table (boss-start MODELLED_ELSEWHERE, by what their ids name). */
function knownRelic(id: string): boolean {
  if (passiveSimRelic(id)) return true;
  return /^(CAPTAINS_WHEEL|SAI|CANDELABRA|CHANDELIER|HORN_CLEAT|HAPPY_FLOWER|SHURIKEN|PEN_NIB|LOST_WISP|MUSIC_BOX|CLOAK_CLASP|PAELS_TEARS|RED_SKULL|SELF_FORMING_CLAY|DEMON_TONGUE|INTIMIDATING_HELMET|BEATING_REMNANT|PAPER_PHROG|FIDDLE|KUSARIGAMA|VAMBRACE|MERCURY_HOURGLASS|LIZARD_TAIL|BLESSED_ANTLER|BLOOD_SOAKED_ROSE|BREAD|ECTOPLASM|PAELS_FLESH|PHILOSOPHERS_STONE|PRISMATIC_GEM|PUMPKIN_CANDLE|SOZU|SPIKED_GAUNTLETS|VELVET_CHOKER|WHISPERING_EARRING)$/.test(id);
}

/** The line of one option. */
function simLine(head: string, base: OptionSim, sim: OptionSim, samples: number, lowWin: boolean): string {
  // The current deck mostly loses: the boss's HP left (0 in a won sample) still tells the options apart.
  const left = lowWin ? `；boss 平均剩血 ${Math.round(sim.bossLeft)}${sim.diff ? `（当前牌组 ${Math.round(base.bossLeft)}，${signed(sim.diff.bossLeft / 100)} ± ${one(sim.diff.bossLeftSe)}）` : ""}` : "";
  const tail = `赢局掉血中位 ${sim.hpLossWon ?? "—"}，约 ${sim.turns ?? "—"} 回合${left}（${samples} 次模拟，校准后${lowWin ? "；当前牌组胜率很低，胜率的差信息少" : ""}）`;
  if (!sim.diff) return `${head}不改变牌组：胜率 ${pct(base.winCal)}，${tail}`;
  const hp = sim.hp !== base.hp ? `（进场 ${sim.hp} 血）` : "";
  return `${head}当前牌组胜率 ${pct(base.winCal)}；选这个${hp} ${pct(sim.winCal)}（${signed(sim.diff.cal)} ± ${one(sim.diff.calSe * 100)}），${tail}`;
}

/** A per-card line (a removal, a smith): shorter, the head is on the option. */
function cardLine(verb: string, name: string, sim: OptionSim, lowWin: boolean): string {
  const left = lowWin && sim.diff ? `，boss 平均剩血 ${Math.round(sim.bossLeft)}（${signed(sim.diff.bossLeft / 100)} ± ${one(sim.diff.bossLeftSe)}）` : "";
  return `${verb} ${name}：${pct(sim.winCal)}（${sim.diff ? `${signed(sim.diff.cal)} ± ${one(sim.diff.calSe * 100)}` : "±0"}），赢局掉血中位 ${sim.hpLossWon ?? "—"}${left}`;
}

/** facts with act_boss_clock replaced by `value` under act_boss_sim (at the clock's place), or added. */
function withSimFacts(facts: Record<string, JsonValue>, value: JsonValue, keepClock: boolean): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  let placed = false;
  for (const [k, v] of Object.entries(facts)) {
    if (k === "act_boss_clock") {
      if (keepClock) out[k] = v;
      out["act_boss_sim"] = value;
      placed = true;
    } else out[k] = v;
  }
  if (!placed) out["act_boss_sim"] = value;
  return out;
}

export interface BossSimOutcome {
  decision: Decision;
  /** For the decision log: the boss, the start, timing and every option's numbers (null when not applied). */
  record: Record<string, JsonValue> | null;
}

/**
 * The calibrated win rate a deck winning no sample reads (the "pre" Platt map at 0 wins, clipped at the fit's sample
 * count): the floor of every boss_sim number. From the map itself, not written in the note (fix-queue-v4: the note said
 * "约 8%" from B1.5's fit while the live floor was 6.24%; after the B5 refit 4.7%).
 */
export function calibratedFloor(): number {
  return calibratedWinProb(0, BUILD_SIM_CALIBRATION_SAMPLES, "pre");
}

/** The act boss floors (boss-clock BOSS_FLOORS), by act (1-based). */
const ACT_BOSS_FLOORS = [17, 33, 48];

/**
 * Whether the act's boss is already dead: its floor, out of combat (the reward, the next screens), still in its act.
 * run.boss_id moves on only when the next act starts (GBBBMVCPA7R1 F17: THE_KIN_BOSS on the reward, act_id 0;
 * THE_INSATIABLE_BOSS on the act 2 map, act_id 1), and the next act's boss is not in the state before that.
 */
export function actBossDefeated(state: GameState): boolean {
  const floor = state.run?.floor ?? null;
  return floor !== null && !state.in_combat && ACT_BOSS_FLOORS[mapActOf(state) - 1] === floor;
}

/**
 * The question with the boss simulation added (BOSS_SIM_BUILD=on): every option's `boss_sim` line, facts.act_boss_sim
 * in place of the clock, the instructions' note. A question of another kind, or without the screen's options, comes
 * back as it is. A failure keeps the clock and says so in facts.act_boss_sim. Never throws.
 */
export async function withBossSim(decision: Decision, env: DecisionEnv, setup: BuildSimSetup): Promise<BossSimOutcome> {
  if (decision.kind !== "ask" || !decision.deepseek?.options || !BUILD_SIM_LABELS.has(decision.label)) return { decision, record: null };
  const now = setup.now ?? (() => performance.now());
  const started = now();
  const ask: AskDecision = decision;
  const spec = ask.deepseek!;
  const question = ask.questions[spec.question];
  if (question?.type !== "choice") return { decision, record: null };
  const facts = asRecord(ask.state["facts"]) as Record<string, JsonValue>;
  const { state, knowledge } = env;
  const bossId = str(asRecord(state.run?.raw)["boss_id"]) || state.run?.boss_id || "";
  const fail = (why: string): BossSimOutcome => ({
    decision: { ...ask, state: { ...ask.state, facts: withSimFacts(facts, `boss 模拟没有结果（${why}）：act_boss_clock 仍是 boss 时钟的估计`, true) } },
    record: { error: why, ms: Math.round(now() - started) },
  });
  try {
    if (!bossId) return fail("不知道本幕 boss");
    // Right after the boss fight boss_id is still the boss just killed (fix-queue-v4: the card reward after every act
    // boss was simulated against it, 7PWU4CD3QCP3 F17 and 5DFX/VNKN/THR/GBBB F17; the brain quoted those deltas), and the
    // next act's boss is not known before its act starts: no simulation. The clock stays (bossClockJson marks it stale).
    if (actBossDefeated(state)) {
      const note = "本幕 boss 已经打完；下一幕的 boss 要到下一幕开始才知道，这道题不做 boss 模拟（act_boss_clock 也是刚打完的 boss）";
      return {
        decision: { ...ask, state: { ...ask.state, facts: withSimFacts(facts, note, true) } },
        record: { skipped: "act boss defeated; the next act's boss is not known yet", boss: bossKey(bossId), ms: Math.round(now() - started) },
      };
    }
    const entry = routeEntry(env);
    const hpNow = state.run?.current_hp ?? 1;
    const maxNow = state.run?.max_hp ?? hpNow;
    const projected = entry.project(hpNow, maxNow);
    const entryHp = Math.max(1, Math.round(projected));
    const start = syntheticBossStart(state, knowledge, bossId, entryHp, { ...(setup.db ? { db: setup.db } : {}), ...(setup.mm ? { mm: setup.mm } : {}) });
    const rebuild = (edit: (run: Record<string, unknown>) => void): RolloutInput => {
      const raw = JSON.parse(JSON.stringify(state.raw)) as Record<string, unknown>;
      edit(asRecord(raw["run"]));
      return syntheticBossStart(parseGameState(raw) as GameState, knowledge, bossId, entryHp, { ...(setup.db ? { db: setup.db } : {}), ...(setup.mm ? { mm: setup.mm } : {}) }).input;
    };
    const plans = planOptions(decision.label, spec.options!(), env, start, entry, rebuild);
    const deckOptions: DeckOption[] = [];
    for (const plan of plans) {
      if (plan.group) for (const g of plan.group) deckOptions.push({ key: `${plan.key}|${g.key}`, change: g.mixture ? null : g.change, ...(g.mixture ? { mixture: g.mixture } : {}) });
      else if (plan.change !== undefined || plan.mixture) deckOptions.push({ key: plan.key, change: plan.change ?? null, ...(plan.mixture ? { mixture: plan.mixture } : {}) });
    }
    const budget = (setup.deadlineMs ?? BUILD_SIM_DEADLINE_MS) - (now() - started);
    const result: CompareResult = await compareOptions(setup.runner, start.input, deckOptions, { samples: setup.samples ?? BUILD_SIM_SAMPLES, seed: setup.seed ?? BUILD_SIM_SEED, deadlineMs: Math.max(200, budget), ...(setup.now ? { now: setup.now } : {}) });
    if (result.samples === 0) return fail(`${Math.round(now() - started)} ms 内没有跑完一个样本`);
    // Too few samples to tell the options apart (Dai 2026-10-02): R6V3 F22 n=24 and 5DFX F27-F29 n=24 put "+11.6" style
    // deltas in front of the brain, which quoted them. Cut short by the clock under BUILD_SIM_MIN_SHOWN (or under what was
    // asked for, when less), no numbers, as a failed simulation.
    const minShown = Math.min(BUILD_SIM_MIN_SHOWN, result.requested);
    if (result.samples < minShown) return fail(`只跑完 ${result.samples} 次模拟（不足 ${minShown} 次），选项之间的差噪声太大，不给数字`);
    const sims = new Map(result.options.map((sim) => [sim.key, sim]));
    const key = bossKey(bossId);
    const low = LOW_CONFIDENCE[key];
    const boss = `${start.boss.name}，A${state.run?.ascension ?? start.boss.asc}`;
    const head = `打本幕 boss（${boss}${low ? "；低可信，见 facts.act_boss_sim" : ""}）的模拟：`;
    // Mostly lost: the raw rate under 10% (the calibrated one never reads under the map's floor at 0 wins: calibratedFloor).
    const lowWin = result.base.win < 0.1;
    const criteria: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(question.criteria)) {
      const plan = plans.find((p) => p.key === k);
      if (!plan || v === null) {
        criteria[k] = v;
        continue;
      }
      const shown = JSON.parse(v) as Record<string, JsonValue>;
      if (plan.none) shown["boss_sim"] = `${head}${plan.none}`;
      else if (plan.group) {
        shown["boss_sim"] = `${head}按 boss_sim_by_card 每张牌分别算；当前牌组胜率 ${pct(result.base.winCal)}${lowWin ? `，boss 平均剩血 ${Math.round(result.base.bossLeft)}` : ""}（${result.samples} 次模拟，校准后）`;
        shown["boss_sim_by_card"] = Object.fromEntries(plan.group.flatMap((g) => {
          const sim = sims.get(`${plan.key}|${g.key}`);
          return sim ? [[g.key, cardLine(g.verb, g.name, sim, lowWin)]] : [];
        }));
      } else {
        const sim = sims.get(k);
        if (sim) shown["boss_sim"] = `${simLine(head, result.base, sim, result.samples, lowWin)}${plan.note ? `；${plan.note}` : ""}`;
      }
      criteria[k] = JSON.stringify(shown);
    }
    const b = result.base;
    const ms = Math.round(now() - started);
    const simFacts: Record<string, JsonValue> = {
      // Not logged at this ascension: HP from the nearest one; damage, buffs and block moved by the measured change
      // between ascensions (monster-db moveDamageAt, amountAt), not the nearest one's as logged.
      boss: `${boss}：${start.boss.parts.map((p) => `${p.name} ${p.hp} 血`).join("、")}${start.boss.exact ? "" : `（A${state.run?.ascension ?? "?"} 没有这个 boss 的日志：数值取最近的 A${start.boss.asc}，伤害、增益和格挡按实测的进阶变化估算）`}`,
      entry_hp: `${start.entryHp}/${start.maxHp}：${entry.source}${projected < 1 ? "（中位投影在 boss 前血量耗尽，按 1 血算）" : ""}`,
      current_deck: `胜率 ${pct(b.winCal)}（校准后；原始 ${pct(b.win)}），赢局掉血中位 ${b.hpLossWon ?? "—"}，赢局约 ${b.turns ?? "—"} 回合${b.deathTurn !== null ? `，输的样本中位死在第 ${b.deathTurn} 回合` : ""}`,
      samples: `每个选项 ${result.samples} 次${result.samples < result.requested ? `（目标 ${result.requested}，到时间只跑完这些）` : ""}；所有选项同一组随机种子，按样本配对比较；用时 ${(ms / 1000).toFixed(1)} 秒`,
      method:
        "整场模拟（docs/boss-sim.md）：boss 的血量、首招、开场能力和出招按怪物库和出招模型（本进阶），我方按现在的牌组、遗物和药水，每个样本洗牌后由求解器逐回合出牌，打到一方死亡；" +
        "胜率经日志 boss 战验证集校准；选项的差 = 两个校准胜率之差，± 是配对标准误（差在两个标准误以内，模拟分不出高低）",
      limits:
        "格挡牌和防守能力牌的价值可能被低估（模拟策略跨回合的防守不如实际）；模拟的战斗比实际更确定，单张牌带来的差可能被放大（校准只把绝对胜率拉准）；" +
        "随机药水不在模拟里；进场血量是投影的中位数，实际会有高低；离本幕 boss 还远时，现在的牌组和到 boss 时的牌组差得多",
      ...(start.relics.applied.length > 0 ? { relics_at_start: `开场生效：${start.relics.applied.join("、")}` } : {}),
      ...(start.relics.unmodelled.length > 0 ? { relics_not_modelled: start.relics.unmodelled.join("、") } : {}),
      ...(low ? { low_confidence: low } : {}),
      ...(lowWin ? { low_win_rate: `当前牌组在模拟里多半打不过（原始胜率 ${pct(b.win)}，校准后的数不会低于 ${(calibratedFloor() * 100).toFixed(1)}%，0 胜的读数）：胜率的差信息少，各选项另给 boss 平均剩血（赢的样本算 0）和它的配对差；离 boss 还远时现在的牌组和到 boss 时的牌组差得多` } : {}),
    };
    const record: Record<string, JsonValue> = {
      boss: key,
      asc: state.run?.ascension ?? null,
      entry_hp: start.entryHp,
      entry_source: entry.planned ? "route" : "hp_now",
      samples: result.samples,
      requested: result.requested,
      timed_out: result.timedOut,
      workers: result.workers,
      orders: result.orders,
      sim_ms: result.elapsedMs,
      ms,
      base: { win: b.win, win_cal: b.winCal, hp_loss_won: b.hpLossWon, turns: b.turns, boss_left: b.bossLeft },
      options: Object.fromEntries(result.options.map((sim) => [sim.key, { win: sim.win, win_cal: sim.winCal, diff_cal: sim.diff?.cal ?? 0, se_cal: sim.diff?.calSe ?? 0, diff_raw: sim.diff?.raw ?? 0, se_raw: sim.diff?.se ?? 0, hp_loss_won: sim.hpLossWon, turns: sim.turns, hp: sim.hp, boss_left: sim.bossLeft, boss_left_diff: sim.diff?.bossLeft ?? 0, boss_left_se: sim.diff?.bossLeftSe ?? 0 }])),
      not_simulated: Object.fromEntries(plans.filter((p) => p.none).map((p) => [p.key, p.none!])),
    };
    return {
      decision: {
        ...ask,
        state: { ...ask.state, facts: withSimFacts(facts, simFacts, false) },
        questions: { ...ask.questions, [spec.question]: { ...question, instructions: `${question.instructions} ${BOSS_SIM_NOTE}`, criteria } },
      },
      record,
    };
  } catch (error) {
    return fail(`出错：${String(error instanceof Error ? error.message : error).slice(0, 160)}`);
  }
}

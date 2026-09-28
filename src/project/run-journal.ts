/**
 * Run memory for DeepSeek (phase 2).
 *
 * DeepSeek is stateless: every call saw one screen and nothing of the run behind it. The journal keeps
 * the whole run, per run id and in process, from the states actually observed and the decisions actually
 * played: every DeepSeek decision (and Jev's/code's key non-combat picks), every fight with HP before and
 * after, HP and gold per floor, every deck/relic/potion/max-HP change, the route plans and their progress,
 * and the current facts. Nothing is dropped as the run grows: each item is one terse line (Dai
 * 2026-09-28: DeepSeek always gets the complete run history). It rides in DeepSeek's *user* message on
 * every question type, so the system prompt stays byte-identical and cached. Jev never sees it.
 */

import { knowledgeSlice } from "../knowledge/experience.js";
import type { Knowledge } from "../knowledge/index.js";
import { actThreats, bossDossier } from "../knowledge/monster-db.js";
import type { GameState } from "../mod/schema.js";
import type { ActionRequest } from "../mod/client.js";
import type { RoutePlan } from "../screens/map.js";
import { bossClock } from "../strategy/boss-clock.js";
import { deckProfile } from "../strategy/card-value.js";
import { actOf, runPlanLine } from "../strategy/run-plan.js";
import { asArray, asRecord, bool, num, str, truncate, type JsonValue } from "../util/json.js";
import { deckEntries, deckStats } from "./deck.js";
import type { Decision, RememberedMap, ResolvedAction, ScreenMemory } from "./types.js";

/** One decision this run: every DeepSeek decision, plus the key non-combat picks of Jev and code. */
export interface JournalChoice {
  act: number;
  floor: number | null;
  label: string;
  by: string;
  choice: string;
  reason: string;
}

/** One fight of the run, from its first combat state to the first state after it. */
export interface FightRecord {
  key: string;
  act: number;
  floor: number | null;
  /** "boss" | "elite" | "monster" | "unknown" (the strongest enemy type seen). */
  kind: string;
  enemies: string[];
  hpBefore: number | null;
  hpMin: number | null;
  hpAfter: number | null;
  maxHp: number | null;
  turns: number;
  potionsUsed: string[];
  over: boolean;
  died: boolean;
}

/** HP, max HP, gold and room at the end of a floor (the last state seen on it). */
export interface FloorMark {
  act: number;
  floor: number;
  hp: number | null;
  maxHp: number | null;
  gold: number | null;
  room: string;
}

/** A change to the deck, relics, potions or max HP, noticed by comparing consecutive states. */
export interface ResourceEvent {
  act: number;
  floor: number | null;
  text: string;
}

/** A route plan DeepSeek made (BUILD_DECIDER=deepseek), in the order they were made. */
export interface RouteRecord {
  key: string;
  act: number;
  floor: number | null;
  hpPct: number;
  steps: { row: number; col: number; type: string; hpOnArrival: number }[];
  why: string | null;
}

/**
 * The run context DeepSeek receives with every question. Nothing is dropped: every decision, every
 * fight and every floor of the run is one terse line (or item) here; only the wording is compact.
 */
export interface RunMemory {
  /** Current facts: HP, gold, deck, relics, potions, boss and its clock, DeepSeek's run plan. */
  now: string;
  /** The act boss's monster-DB entry (measured HP, moves, our record), at this ascension. */
  boss_db: string;
  /** Every DeepSeek decision this run (and Jev's/code's key non-combat picks), by act. */
  decisions: string;
  /** Every fight this run, one line each: floor, enemies, HP before → after, potions used. */
  fights: string;
  /** The current act's elites and dangerous hallway fights from the monster DB (the map ahead). */
  map_threats: string;
  /** HP / gold per floor. */
  hp_timeline: string;
  /** Cards added/removed/upgraded, relics, potions gained/used/discarded, max HP changes. */
  resources: string;
  /** DeepSeek's route plans per act, re-plans and why, and the current act's progress. */
  route: string;
  /** The road to the boss from here, and the boss's key mechanics. */
  lookahead: string;
  /**
   * The experience knowledge base's slice for this question (knowledge/experience.ts): lessons from past
   * runs whose scope matches the offered items, the act boss, the act's threats and this decision's
   * topics, with confidence and n; plus outcome stats of what is offered. "" when nothing applies.
   */
  knowledge: string;
}

/** The question being asked, so the knowledge slice can match its screen type and options. */
export interface QuestionContext {
  label?: string;
  criteria?: Record<string, string | null>;
}

export interface JournalEntry {
  label: string;
  by: string;
  choice: string;
  reason: string;
  asked: boolean;
  intent: ActionRequest | null;
}

/** What else the journal reads besides the state: monster types, the route plan, the run plan, the map. */
export interface JournalContext {
  knowledge?: Knowledge;
  screenMemory?: Partial<Pick<ScreenMemory, "lastMap" | "routePlan" | "runPlan">>;
}

const LOOKAHEAD_CAP = 600;

/** Non-DeepSeek decisions worth keeping (deck, relics, potions, rests, events, route plans). */
const KEY_LABELS = /^(reward\/(card|skip)|shop\/(buy|discard)|rest\/choose|event\/(choose|only)|chest\/relic|selection\/(?!confirm)|bundle\/choose|capstone\/choose|map\/(discard-potion|route-plan))/;

/** What each act boss does, in one line (ironclad-guide.md §7/§9). Keyed by boss id without "_BOSS". */
export const BOSS_NOTES: Record<string, string> = {
  VANTOM: "173 血，开场 9 层滑溜（前 9 次伤害只算 1）：多段攻击破层；4 回合循环，肢解重击 19–30 并塞伤口时全力格挡，蓄力回合输出/打能力。",
  CEREMONIAL_BEAST: "252 血，前两回合蓄力（打能力），犁地 9→20→22→24；首次跌破 150 血被击晕一回合，之后昏眩（一回合只能打 1 张）。",
  THE_KIN: "神官 199 血(A8) + 两个信徒 62/63(爪牙)：神官一死战斗即结束，单体伤害压神官，AOE 顺带信徒；T3/T7/T11 光束 3×(3+力量)。",
  LAGAVULIN_MATRIARCH: "222 血，开场沉睡 + 12 覆甲：掉 1 血就醒，沉睡时打能力/留格挡；醒后 19、9×2，尽早爆发。",
  SOUL_FYSH: "往牌组塞 Beckon（6 点无法格挡）：用消耗牌清掉，少抽牌；周期性无实体时别输出。",
  WATERFALL_GIANT: "240 血，被打「死」后下一回合自爆 = 蒸汽喷发层数（第 2 回合 15，每回合 +3）：HP 始终留在层数之上，自爆回合全力格挡。虹吸回合回 10 血，压力枪每次递增（20→25→30）：拖得越久越难，要抢伤害。",
  THE_INSATIABLE: "341 血(A8)，沙坑每敌方回合 −1，归零即死：打不死它就尽早打狂乱逃离（每张多一回合），不要等沙坑 ≤2。",
  KAISER_CRAB: "两只钳子：先杀一只另一只得 99 格挡 +6 力，要同回合一起打死（血量保持接近，注意回合开始群伤）。",
  KNOWLEDGE_DEMON: "379 血，第 1/5/9 回合选负面：懒惰 > 心灵腐化 > 瓦解 > 衰朽；每 4 回合回血加力，要力量成长速攻。",
  QUEEN: "女王 400 + 聚合体 199：第 2 回合起 99 层易伤/虚弱/脆弱，前两回合全力输出；之后攻击全给聚合体，魂缚牌每回合只打一张。",
  TEST_SUBJECT: "三阶段共 600 血：一阶段少打技能；二阶段多段爪逐回合加段：挡得住就挡，挡不住就抢伤害尽快打完（每拖一回合多一段）；三阶段无实体，靠多段；复生回合做准备。",
  AEONGLASS: "512 血，人工制品 3 + 凋萎存在（每打 6 张牌塞一张凋萎）：先用便宜减益剥人工制品，少打小牌，退潮 33 格挡在我方第 2/5/8 回合，那几回合打能力，约第 8 回合前打完。",
  DOORMAKER: "多阶段，需要 AOE + 可持续成长。",
};

export function bossNote(bossId: string | null | undefined): string | null {
  if (!bossId) return null;
  const key = bossId.toUpperCase().replace(/_BOSS$/, "");
  return BOSS_NOTES[key] ?? null;
}


/** Cards that give lasting Strength (Setup Strike's is gone at the end of the turn). */
const STRENGTH_IDS = new Set(["INFLAME", "DEMON_FORM", "RUPTURE", "SPOT_WEAKNESS", "LIMIT_BREAK", "FLEX"]);

const TYPE_LABELS: [string, string][] = [
  ["Elite", "精英"],
  ["RestSite", "休息"],
  ["Shop", "商店"],
  ["Unknown", "问号"],
  ["Treasure", "宝箱"],
];

/** One-character room labels for the HP timeline and routes. */
const ROOM_SHORT: Record<string, string> = {
  Monster: "怪",
  Elite: "精",
  RestSite: "休",
  Rest: "休",
  Shop: "店",
  Unknown: "问",
  Treasure: "宝",
  Boss: "王",
  Ancient: "古",
};


const SOURCE_BY_SCREEN: Record<string, string> = {
  REWARD: "奖励",
  COMBAT: "战斗",
  SHOP: "商店",
  EVENT: "事件",
  CHEST: "宝箱",
  REST: "休息",
  MAP: "地图",
};

type Counted = Map<string, { name: string; count: number }>;

export class RunJournal {
  runId = "";
  choices: JournalChoice[] = [];
  /** Every fight this run. */
  fights: FightRecord[] = [];
  floors = new Map<number, FloorMark>();
  events: ResourceEvent[] = [];
  routes: RouteRecord[] = [];
  /** The map node last chosen, the map floor it was chosen from, its act and type (the next MAP screen supersedes it). */
  position: { row: number; col: number; fromFloor: number | null; act?: number; type?: string } | null = null;
  private rooms = new Map<number, string>();
  private deckSnap: Counted | null = null;
  private relicSnap: Counted | null = null;
  private potionSnap: Counted | null = null;
  private maxHpSnap: number | null = null;
  private discardFloors = new Set<number>();
  private knowledge: Knowledge | null = null;

  /** Called with every state read: resets on a new run, tracks fights, resources, HP and route plans. */
  observe(state: GameState, context: JournalContext = {}): void {
    this.syncRun(state);
    if (context.knowledge) this.knowledge = context.knowledge;
    if (state.run) {
      this.trackFight(state);
      this.trackResources(state);
      this.trackFloor(state);
    }
    if (context.screenMemory) this.trackRoute(state, context.screenMemory.routePlan);
  }

  /** Called once per executed decision, with the state it was decided on. */
  record(state: GameState, entry: JournalEntry): void {
    this.syncRun(state);
    if (entry.intent?.action === "choose_map_node") {
      const node = asArray(asRecord(state.raw["map"])["available_nodes"])
        .map(asRecord)
        .find((candidate) => num(candidate["index"], -1) === entry.intent?.option_index);
      if (node) {
        const type = str(node["node_type"], "Unknown");
        const floor = state.run?.floor ?? null;
        this.position = { row: num(node["row"]), col: num(node["col"]), fromFloor: floor, act: actOf(state), type };
        if (floor !== null) this.rooms.set(floor + 1, type);
      }
    }
    if (entry.intent?.action === "discard_potion" || entry.label.endsWith("discard-potion")) {
      if (state.run?.floor != null) this.discardFloors.add(state.run.floor);
    }
    // Combat turns are not decisions here: each fight is one line (the fights section).
    if (entry.label.startsWith("combat/") || inCombat(state)) return;
    if (entry.by === "deepseek" || entry.by === "claude" || KEY_LABELS.test(entry.label)) this.pushChoice(state, entry);
  }

  private pushChoice(state: GameState, entry: JournalEntry): void {
    this.choices.push({
      act: actOf(state),
      floor: state.run?.floor ?? null,
      label: entry.label,
      by: entry.by,
      choice: oneLine(entry.choice, 70),
      reason: entry.by === "deepseek" || entry.by === "claude" ? journalReason(entry.reason) : "",
    });
  }

  /** DeepSeek's run plan (RUN_PLAN=v1), one of its decisions. */
  noteRunPlan(state: GameState, trigger: string, line: string | null): void {
    this.syncRun(state);
    this.choices.push({ act: actOf(state), floor: state.run?.floor ?? null, label: "run-plan", by: "deepseek", choice: oneLine(`${trigger ? `(${trigger}) ` : ""}${line ?? ""}`, 160), reason: "" });
  }

  private trackFight(state: GameState): void {
    const current = this.fights.at(-1);
    const open = current && !current.over ? current : null;
    if (!inCombat(state)) {
      if (open) this.closeFight(open, state);
      return;
    }
    const key = fightKey(state);
    const enemies = asArray(asRecord(state.combat?.raw ?? state.raw["combat"])["enemies"]).map(asRecord);
    let fight = open && open.key === key ? open : null;
    if (!fight) {
      if (open) this.closeFight(open, state);
      // A stale frame after a won fight has no living enemy: not a new fight.
      if (!enemies.some((enemy) => enemy["is_alive"] !== false)) return;
      const hp = state.combat?.current_hp ?? state.run?.current_hp ?? null;
      fight = {
        key,
        act: actOf(state),
        floor: state.run?.floor ?? null,
        kind: this.rooms.get(state.run?.floor ?? -1) === "Elite" ? "elite" : "unknown",
        enemies: [],
        hpBefore: hp,
        hpMin: hp,
        hpAfter: null,
        maxHp: state.combat?.max_hp ?? state.run?.max_hp ?? null,
        turns: 0,
        potionsUsed: [],
        over: false,
        died: false,
      };
      this.fights.push(fight);
    }
    const hp = state.combat?.current_hp ?? state.run?.current_hp ?? null;
    if (hp !== null && (fight.hpMin === null || hp < fight.hpMin)) fight.hpMin = hp;
    if (state.turn !== null && state.turn > fight.turns) fight.turns = state.turn;
    for (const enemy of enemies) {
      const id = str(enemy["enemy_id"]);
      const name = str(enemy["name"], id || "?");
      if (!fight.enemies.includes(name)) fight.enemies.push(name);
      const type = this.knowledge?.monster(id)?.type ?? "";
      const kind = type === "Boss" ? "boss" : type === "Elite" ? "elite" : type === "Normal" ? "monster" : "unknown";
      if (KIND_RANK[kind]! > KIND_RANK[fight.kind]!) fight.kind = kind;
    }
  }

  private closeFight(fight: FightRecord, state: GameState): void {
    fight.over = true;
    fight.hpAfter = state.run?.current_hp ?? state.combat?.current_hp ?? fight.hpMin;
    fight.died = (fight.hpAfter !== null && fight.hpAfter <= 0) || state.screen === "GAME_OVER";
    if (fight.hpAfter !== null && (fight.hpMin === null || fight.hpAfter < fight.hpMin)) fight.hpMin = fight.hpAfter;
  }

  private trackResources(state: GameState): void {
    const run = asRecord(state.run?.raw);
    const floor = state.run?.floor ?? null;
    const act = actOf(state);
    const source = this.sourceOf(state);
    const push = (text: string): void => {
      this.events.push({ act, floor, text });
    };
    const deck = run["deck"];
    if (Array.isArray(deck) && deck.length > 0) {
      const snap = countBy(deck, (card) => `${str(card["card_id"])}${bool(card["upgraded"]) ? "+" : ""}`, (card) => `${str(card["name"], str(card["card_id"]))}${bool(card["upgraded"]) ? "+" : ""}`);
      if (this.deckSnap) this.diffDeck(this.deckSnap, snap, source, push);
      this.deckSnap = snap;
    }
    const relics = run["relics"];
    if (Array.isArray(relics)) {
      const snap = countBy(relics, (relic) => str(relic["relic_id"]), (relic) => str(relic["name"], str(relic["relic_id"])));
      if (this.relicSnap) {
        for (const [, change] of diffCounts(this.relicSnap, snap)) {
          push(change.delta > 0 ? `+遗物 ${change.name}${times(change.delta)}(${source})` : `-遗物 ${change.name}${times(-change.delta)}`);
        }
      }
      this.relicSnap = snap;
    }
    const potions = run["potions"];
    if (Array.isArray(potions)) {
      const occupied = potions.filter((slot) => bool(asRecord(slot)["occupied"]) && str(asRecord(slot)["potion_id"]));
      const snap = countBy(occupied, (slot) => str(slot["potion_id"]), (slot) => str(slot["name"], str(slot["potion_id"])));
      if (this.potionSnap) {
        const fight = this.fights.at(-1);
        for (const [, change] of diffCounts(this.potionSnap, snap)) {
          if (change.delta > 0) {
            push(`+药 ${change.name}${times(change.delta)}(${source})`);
          } else if (inCombat(state) && fight && !fight.over) {
            for (let n = 0; n < -change.delta; n += 1) fight.potionsUsed.push(change.name);
            push(`用药 ${change.name}${times(-change.delta)}(战斗)`);
          } else {
            const discarded = floor !== null && this.discardFloors.has(floor);
            push(`${discarded ? "弃药" : "药水离开(战外)"} ${change.name}${times(-change.delta)}`);
          }
        }
      }
      this.potionSnap = snap;
    }
    const maxHp = state.run?.max_hp ?? null;
    if (maxHp !== null && maxHp > 0) {
      if (this.maxHpSnap !== null && maxHp !== this.maxHpSnap) push(`上限 ${this.maxHpSnap}→${maxHp}(${source})`);
      this.maxHpSnap = maxHp;
    }
  }

  private diffDeck(before: Counted, after: Counted, source: string, push: (text: string) => void): void {
    const base = (key: string): string => key.replace(/\+$/, "");
    const ids = new Set([...before.keys(), ...after.keys()].map(base));
    for (const id of ids) {
      const prevPlain = before.get(id)?.count ?? 0;
      const prevUp = before.get(`${id}+`)?.count ?? 0;
      const nowPlain = after.get(id)?.count ?? 0;
      const nowUp = after.get(`${id}+`)?.count ?? 0;
      const upgraded = Math.max(0, Math.min(prevPlain - nowPlain, nowUp - prevUp));
      const plainName = (after.get(id) ?? before.get(id))?.name ?? (after.get(`${id}+`) ?? before.get(`${id}+`))?.name.replace(/\+$/, "") ?? id;
      const upName = (after.get(`${id}+`) ?? before.get(`${id}+`))?.name ?? `${plainName}+`;
      if (upgraded > 0) push(`升级 ${plainName}${times(upgraded)}(${source})`);
      const plainDelta = nowPlain - prevPlain + upgraded;
      const upDelta = nowUp - prevUp - upgraded;
      for (const [delta, name] of [[plainDelta, plainName], [upDelta, upName]] as [number, string][]) {
        if (delta > 0) push(`+卡 ${name}${times(delta)}(${source})`);
        if (delta < 0) push(`-卡 ${name}${times(-delta)}(${source})`);
      }
    }
  }

  private sourceOf(state: GameState): string {
    if (inCombat(state)) return "战斗";
    const room = this.rooms.get(state.run?.floor ?? -1);
    const byScreen = SOURCE_BY_SCREEN[state.screen];
    if (byScreen && state.screen !== "MAP") return byScreen;
    if (room) return ROOM_SOURCE[room] ?? room;
    return byScreen ?? (state.screen.toLowerCase() || "?");
  }

  private trackFloor(state: GameState): void {
    const floor = state.run?.floor ?? null;
    if (floor === null) return;
    this.floors.set(floor, {
      act: actOf(state),
      floor,
      hp: state.run?.current_hp ?? null,
      maxHp: state.run?.max_hp ?? null,
      gold: state.run?.gold ?? null,
      room: this.rooms.get(floor) ?? this.floors.get(floor)?.room ?? "",
    });
  }

  private trackRoute(state: GameState, plan: RoutePlan | undefined): void {
    if (!plan || plan.runId !== str(state.raw["run_id"])) return;
    const key = `${plan.act}:${plan.floor ?? "?"}:${plan.path.map((step) => `${step.row},${step.col}`).join(";")}`;
    if (this.routes.some((route) => route.key === key)) return;
    this.routes.push({ key, act: plan.act, floor: plan.floor, hpPct: plan.hpPct, steps: plan.path.map((step) => ({ ...step })), why: plan.why ?? null });
  }

  private syncRun(state: GameState): void {
    const runId = str(state.raw["run_id"]);
    if (!runId || runId === this.runId) return;
    this.runId = runId;
    this.choices = [];
    this.fights = [];
    this.floors = new Map();
    this.events = [];
    this.routes = [];
    this.position = null;
    this.rooms = new Map();
    this.deckSnap = null;
    this.relicSnap = null;
    this.potionSnap = null;
    this.maxHpSnap = null;
    this.discardFloors = new Set();
  }

  /** The run context DeepSeek receives (every question type). */
  render(state: GameState, knowledge: Knowledge, context: JournalContext["screenMemory"] = {}, question: QuestionContext = {}): RunMemory {
    this.syncRun(state);
    this.knowledge ??= knowledge;
    this.trackRoute(state, context.routePlan);
    return {
      now: this.renderNow(state, knowledge, context),
      boss_db: bossDossier(state.run?.boss_id ?? str(asRecord(state.run?.raw)["boss_id"]), state.run?.ascension ?? 0) ?? "",
      decisions: this.renderDecisions(),
      fights: this.renderFights(state),
      map_threats: renderThreats(state),
      hp_timeline: this.renderTimeline(),
      resources: this.renderResources(),
      route: this.renderRoute(state),
      lookahead: renderLookahead(state, context.lastMap, this.position),
      knowledge: renderKnowledge(state, question),
    };
  }

  private renderNow(state: GameState, knowledge: Knowledge, context: JournalContext["screenMemory"] = {}): string {
    const lines: string[] = [];
    const run = asRecord(state.run?.raw);
    lines.push(`现状: 第${actOf(state)}幕 F${state.run?.floor ?? "?"} | HP ${state.run?.current_hp ?? "?"}/${state.run?.max_hp ?? "?"} | 金币 ${state.run?.gold ?? "?"}`);
    const bossId = state.run?.boss_id ?? str(run["boss_id"]);
    if (bossId) {
      const name = knowledge.monster(bossId)?.name ?? knowledge.monster(bossId.replace(/_BOSS$/, ""))?.name;
      lines.push(`本幕 boss: ${name && name !== bossId ? `${name} (${bossId})` : bossId}`);
    }
    const entries = deckEntries(state, knowledge);
    if (entries.length > 0) {
      const stats = deckStats(entries);
      const profile = deckProfile(entries);
      const strength = [...new Set(entries.filter((card) => givesStrength(card.card_id, card.description)).map((card) => card.name))];
      const counted = countBy(entries as unknown as JsonValue[], (card) => `${str(card["name"])}${bool(card["upgraded"]) ? "+" : ""}`, (card) => `${str(card["name"])}${bool(card["upgraded"]) ? "+" : ""}`);
      lines.push(`牌组 ${entries.length} 张: ${[...counted.values()].map((card) => `${card.name}${times(card.count)}`).join(", ")}`);
      lines.push(
        `构筑: ${stats.total} 张 (攻击 ${stats.attacks}/技能 ${stats.skills}/能力 ${stats.powers}) | 力量来源 ${strength.length > 0 ? strength.join("、") : "无"} | AOE ${profile.aoe} | 格挡牌 ${profile.block} | 过牌 ${profile.draw} | 成长 ${profile.scaling}`,
      );
    }
    const relics = asArray(run["relics"]).map((relic) => str(asRecord(relic)["name"], str(asRecord(relic)["relic_id"])));
    if (relics.length > 0) lines.push(`遗物: ${relics.join(", ")}`);
    const belt = asArray(run["potions"]).map(asRecord);
    if (belt.length > 0) {
      const held = belt.filter((slot) => bool(slot["occupied"])).map((slot) => str(slot["name"], str(slot["potion_id"])));
      lines.push(`药水 ${held.length}/${belt.length}: ${held.length > 0 ? held.join(", ") : "无"}`);
    }
    try {
      const clock = bossClock(state, knowledge);
      if (clock) lines.push(`boss 时钟: ${clock.boss} 约 ${clock.hp} 血，约 ${clock.fightTurns} 回合，需 ${clock.need}/回合，牌组估 ${clock.deck}/回合，缺口 ${clock.gap}`);
    } catch {
      // the clock is a convenience; the facts above stand without it
    }
    const plan = context.runPlan && context.runPlan.runId === this.runId ? runPlanLine(context.runPlan) : null;
    if (plan) lines.push(`你的本局计划 (F${context.runPlan!.floor ?? "?"} 定): ${plan}`);
    return lines.join("\n");
  }

  private renderDecisions(): string {
    if (this.choices.length === 0) return "";
    const lines = ["本局全部决策（DS=DeepSeek；未核实理由 = DeepSeek 当时所写，不是事实）:"];
    let act = -1;
    for (const entry of this.choices) {
      if (entry.act !== act) {
        act = entry.act;
        lines.push(`第${act}幕:`);
      }
      const reason = entry.reason.replace(UNVERIFIED_REASON_PREFIX, "");
      lines.push(`F${entry.floor ?? "?"} ${entry.label} [${entry.by === "deepseek" ? "DS" : entry.by}]: ${entry.choice}${reason ? ` — 未核实理由: ${reason}` : ""}`);
    }
    return lines.join("\n");
  }

  private renderFights(state: GameState): string {
    if (this.fights.length === 0) return "";
    const lines = ["本局全部战斗（每场一行: 层 敌人: HP 战前→战后 药水）:"];
    let act = -1;
    for (const fight of this.fights) {
      if (fight.act !== act) {
        act = fight.act;
        lines.push(`第${act}幕:`);
      }
      lines.push(fightLine(fight, state));
    }
    return lines.join("\n");
  }

  private renderTimeline(): string {
    if (this.floors.size === 0) return "";
    const marks = [...this.floors.values()].sort((a, b) => a.floor - b.floor);
    const lines = ["每层结束时 层+房间+HP(/上限，变化时标出)+¥金币 (怪/精/问/休/店/宝/王/古=房间，·=未知):"];
    let act = -1;
    let line: string[] = [];
    let lastMax: number | null = null;
    for (const mark of marks) {
      if (mark.act !== act) {
        if (line.length > 0) lines.push(line.join(" "));
        act = mark.act;
        line = [`第${act}幕:`];
      }
      const max = mark.maxHp !== null && mark.maxHp !== lastMax ? `/${mark.maxHp}` : "";
      lastMax = mark.maxHp ?? lastMax;
      line.push(`F${mark.floor}${ROOM_SHORT[mark.room] ?? "·"}${mark.hp ?? "?"}${max}¥${mark.gold ?? "?"}`);
    }
    if (line.length > 0) lines.push(line.join(" "));
    return lines.join("\n");
  }

  private renderResources(): string {
    if (this.events.length === 0) return "";
    const lines = ["牌组/遗物/药水/上限变化（起始牌组与起始遗物不计）:"];
    const acts = [...new Set(this.events.map((event) => event.act))];
    for (const act of acts) {
      lines.push(`第${act}幕: ${this.events.filter((event) => event.act === act).map((event) => `F${event.floor ?? "?"} ${event.text}`).join("; ")}`);
    }
    return lines.join("\n");
  }

  private renderRoute(state: GameState): string {
    const act = actOf(state);
    const lines: string[] = [];
    for (const route of this.routes) {
      const what = route.why ? `重规划（${oneLine(route.why, 90)}）` : "规划";
      lines.push(`第${route.act}幕 F${route.floor ?? "?"} ${what}，当时 HP ${Math.round(route.hpPct * 100)}%: ${route.steps.map((step) => ROOM_SHORT[step.type] ?? step.type).join("→")}→王`);
    }
    const plan = [...this.routes].reverse().find((route) => route.act === act);
    if (!plan) {
      lines.push(`第${act}幕: 没有 DeepSeek 路线计划（逐节点选择）`);
    } else {
      const here = this.position && this.position.act === act ? this.position : null;
      const done = here ? plan.steps.filter((step) => step.row <= here.row) : [];
      const onPlan = here ? plan.steps.find((step) => step.row === here.row) : undefined;
      const off = here && onPlan && onPlan.col !== here.col ? "（当前节点不在计划上）" : "";
      const left = plan.steps.filter((step) => !here || step.row > here.row);
      const next = left[0];
      lines.push(
        `本幕进度: 已走 ${done.length}/${plan.steps.length}${done.length > 0 ? ` [${done.map((step) => ROOM_SHORT[step.type] ?? step.type).join("")}]` : ""}${off}` +
          (next ? ` | 下一步 ${ROOM_SHORT[next.type] ?? next.type}（预计 HP ${Math.round(next.hpOnArrival * 100)}%）` : "") +
          ` | 剩余 ${left.length}: ${left.map((step) => ROOM_SHORT[step.type] ?? step.type).join("→")}→王`,
      );
    }
    return lines.join("\n");
  }
}

const KIND_RANK: Record<string, number> = { unknown: 0, monster: 1, elite: 2, boss: 3 };

const ROOM_SOURCE: Record<string, string> = { RestSite: "休息", Rest: "休息", Shop: "商店", Unknown: "事件", Ancient: "古神", Treasure: "宝箱", Monster: "战斗", Elite: "精英", Boss: "Boss" };

function fightLine(fight: FightRecord, state: GameState): string {
  const enemies = fight.enemies.map((name) => truncate(name, 10)).join("+") || "?";
  const after = fight.over ? String(fight.hpAfter ?? "?") : `进行中 ${state.combat?.current_hp ?? state.run?.current_hp ?? "?"}`;
  const max = fight.maxHp !== null ? `/${fight.maxHp}` : "";
  return `F${fight.floor ?? "?"} ${enemies}: ${fight.hpBefore ?? "?"}→${after}${max}${fight.potionsUsed.length > 0 ? ` 药:${fight.potionsUsed.join(",")}` : ""}`;
}

function renderKnowledge(state: GameState, question: QuestionContext): string {
  if (!state.run) return "";
  try {
    return knowledgeSlice(state, question.label ?? "", question.criteria ?? {}).text;
  } catch {
    // the knowledge base is advice; the run context stands without it
    return "";
  }
}

/** The current act's elites and dangerous hallway encounters (monster DB), one line each. */
function renderThreats(state: GameState): string {
  if (!state.run) return "";
  const lines = actThreats(actOf(state), state.run.ascension ?? 0);
  if (lines.length === 0) return "";
  return [`第${actOf(state)}幕的精英与危险小怪（monster DB 实测；失血 = 赢局 中位/p75；n = 场次）:`, ...lines].join("\n");
}

function countBy(items: JsonValue[] | unknown[], key: (item: Record<string, unknown>) => string, name: (item: Record<string, unknown>) => string): Counted {
  const counted: Counted = new Map();
  for (const item of items) {
    const record = asRecord(item as JsonValue);
    const id = key(record);
    if (!id) continue;
    const entry = counted.get(id);
    if (entry) entry.count += 1;
    else counted.set(id, { name: name(record), count: 1 });
  }
  return counted;
}

function diffCounts(before: Counted, after: Counted): [string, { name: string; delta: number }][] {
  const out: [string, { name: string; delta: number }][] = [];
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const delta = (after.get(id)?.count ?? 0) - (before.get(id)?.count ?? 0);
    if (delta !== 0) out.push([id, { name: (after.get(id) ?? before.get(id))!.name, delta }]);
  }
  return out;
}

function times(count: number): string {
  return count > 1 ? `×${count}` : "";
}

function inCombat(state: GameState): boolean {
  return state.in_combat || state.screen === "COMBAT";
}

function fightKey(state: GameState): string {
  return `${state.run?.act_id ?? "?"}:${state.run?.floor ?? "?"}`;
}


function givesStrength(cardId: string, description: string): boolean {
  if (cardId === "SETUP_STRIKE") return false;
  return STRENGTH_IDS.has(cardId) || /\bgains?\s+(?:\d+|X)\s+Strength/i.test(description);
}

/**
 * The escalator's free-text reason is its guess, not a fact (VC4L F22: "腐化≈费用归零" was quoted back
 * as memory on the next pick; Corrupted costs 2 HP a play). Kept short and labelled unverified.
 */
export const UNVERIFIED_REASON_PREFIX = "（DeepSeek 当时的理由，未经核实）";
export const REASON_CAP = 40;

export function journalReason(reason: string): string {
  const text = oneLine(reason, REASON_CAP);
  return text ? `${UNVERIFIED_REASON_PREFIX}${text}` : "";
}

function oneLine(text: string, max: number): string {
  return truncate(text.replace(/\s+/g, " ").trim(), max);
}

/* ---- lookahead ------------------------------------------------------------------------------ */

type Span = Record<string, [number, number]>;

function normalizeType(type: string): string {
  return type === "Rest" ? "RestSite" : type;
}

/**
 * Min–max count of each node type on every path from `start` (exclusive) to the end of the map
 * (the boss excluded), plus the types of the next nodes.
 */
export function pathSpans(map: RememberedMap, start: { row: number; col: number }): { span: Span; next: string[] } | null {
  const byKey = new Map(map.nodes.map((node) => [`${node.row}:${node.col}`, node]));
  const here = byKey.get(`${start.row}:${start.col}`);
  if (!here) return null;
  const memo = new Map<string, Span>();
  const walk = (key: string): Span => {
    const cached = memo.get(key);
    if (cached) return cached;
    const node = byKey.get(key)!;
    const children = node.children.map((child) => `${child.row}:${child.col}`).filter((child) => byKey.has(child));
    const span = mergeChildren(children.map(walk));
    const type = normalizeType(node.type);
    if (type !== "Boss") {
      const [min, max] = span[type] ?? [0, 0];
      span[type] = [min + 1, max + 1];
    }
    memo.set(key, span);
    return span;
  };
  const children = here.children.map((child) => `${child.row}:${child.col}`).filter((child) => byKey.has(child));
  return {
    span: mergeChildren(children.map(walk)),
    next: children.map((child) => normalizeType(byKey.get(child)!.type)),
  };
}

function mergeChildren(spans: Span[]): Span {
  if (spans.length === 0) return {};
  const types = new Set(spans.flatMap((span) => Object.keys(span)));
  const merged: Span = {};
  for (const type of types) {
    merged[type] = [
      Math.min(...spans.map((span) => span[type]?.[0] ?? 0)),
      Math.max(...spans.map((span) => span[type]?.[1] ?? 0)),
    ];
  }
  return merged;
}

export function renderLookahead(
  state: GameState,
  map: RememberedMap | undefined,
  position: { row: number; col: number; fromFloor: number | null } | null,
): string {
  const parts: string[] = [];
  const act = state.run?.act_id ?? null;
  const usable = map && map.runId === str(state.raw["run_id"]) && (map.act == null || act == null || map.act === act);
  if (usable) {
    // After choosing a node the map is gone until the next MAP screen: stand on the chosen node.
    const start = position && position.fromFloor === map.floor ? position : map.current ?? null;
    const spans = start ? pathSpans(map, start) : null;
    if (start && spans) {
      if (map.boss) parts.push(`距 boss ${map.boss.row - start.row} 层`);
      const counts = TYPE_LABELS.map(([type, label]) => {
        const [min, max] = spans.span[type] ?? [0, 0];
        return `${label} ${min === max ? min : `${min}–${max}`}`;
      });
      parts.push(`到 boss 前各路线: ${counts.join(", ")}`);
      const next = [...new Set(spans.next)];
      if (next.length > 0) parts.push(next.length === 1 ? `下一个节点强制: ${next[0]}` : `下一个节点可选: ${next.join("/")}`);
    }
  }
  const note = bossNote(state.run?.boss_id);
  // The monster DB's measured numbers (boss_db) replace the note's hand-written HP; its strategy stays.
  if (note) parts.push(`boss 要点: ${bossDossier(state.run?.boss_id, state.run?.ascension ?? 0) ? withoutHandHp(note) : note}`);
  return truncate(parts.join(" | "), LOOKAHEAD_CAP);
}

/** The note without its hand-written HP figures ("173 血，…"), when the monster DB has measured ones. */
export function withoutHandHp(note: string): string {
  return note.replace(/\d+\s*血\s*/g, "").replace(/^[，,：:\s]+/, "").replace(/([（(])[，,]/g, "$1");
}

/* ---- choice text ---------------------------------------------------------------------------- */

/** The option actually played, as a short line: the chosen option's text, else the rationale. */
export function describeChoice(decision: Decision, resolved: ResolvedAction, answers: JsonValue | undefined, escalation: JsonValue | undefined): string {
  if (decision.kind === "act") return oneLine(decision.rationale, 80);
  const questionKey = decision.escalate?.question ?? Object.keys(decision.questions).find((key) => decision.questions[key]?.type === "choice");
  const question = questionKey ? decision.questions[questionKey] : undefined;
  const key = resolved.guard?.choice ?? (str(asRecord(escalation)["choice"]) || str(asRecord(asRecord(answers)[questionKey ?? ""])["choice"]));
  if (question?.type !== "choice" || !key) return oneLine(resolved.rationale, 80);
  return oneLine(optionText(question.criteria[key] ?? null) ?? key, 80);
}

function optionText(criterion: string | null): string | null {
  if (!criterion) return null;
  try {
    const parsed = asRecord(JSON.parse(criterion));
    for (const field of ["plays", "option", "card", "name", "title", "label"]) {
      if (typeof parsed[field] === "string" && parsed[field]) {
        // The option's own game text rides along (events: "靠近: 一张攻击牌附魔腐化"), so memory holds
        // what the option said rather than what the escalator guessed it meant.
        const description = typeof parsed["description"] === "string" ? (parsed["description"] as string).replace(/\[[^\]]*\]/g, "").trim() : "";
        return description ? `${parsed[field] as string}: ${description}` : (parsed[field] as string);
      }
    }
    const first = Object.values(parsed).find((value) => typeof value === "string");
    if (typeof first === "string") return first;
  } catch {
    // plain text
  }
  return criterion;
}

export function memoryChars(memory: RunMemory): number {
  return Object.values(memory).reduce((sum, text) => sum + text.length, 0);
}

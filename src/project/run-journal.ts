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
 *
 * Layout for DeepSeek's prefix cache (Dai 2026-09-28): the sections are ordered from most to least stable
 * and the message is built in that order. `act` (the act's threats and boss) changes three times a run;
 * `history` is one chronological floor-by-floor journal of the floors already left behind, which only
 * ever grows at its end (a floor is written once, when the run has moved past it; no counts, no current
 * values, no re-sorting); everything that changes between two questions (this floor so far, current
 * facts, route progress, lookahead, the knowledge slice) comes after it.
 */

import { knowledgeSlice } from "../knowledge/experience.js";
import type { Knowledge } from "../knowledge/index.js";
import { actThreats, bossDossier } from "../knowledge/monster-db.js";
import type { GameState } from "../mod/schema.js";
import type { ActionRequest } from "../mod/client.js";
import type { RoutePlan } from "../screens/map.js";
import { bossClock, eruptionSchedule } from "../strategy/boss-clock.js";
import { actOf, runPlanLine } from "../strategy/run-plan.js";
import { asArray, asRecord, bool, num, str, type JsonValue } from "../util/json.js";
import { deckEntries } from "./deck.js";
import { deckProfileLine } from "./deck-profile.js";
import type { Decision, RememberedMap, ResolvedAction, ScreenMemory } from "./types.js";

/** One decision this run: every DeepSeek decision, plus the key non-combat picks of Jev and code. */
export interface JournalChoice {
  /** Order of creation in the run (history is chronological). */
  seq: number;
  /** The floor the journal files it under (never below a floor already left: history is append-only). */
  at: number;
  act: number;
  floor: number | null;
  label: string;
  by: string;
  choice: string;
  reason: string;
}

/** One fight of the run, from its first combat state to the first state after it. */
export interface FightRecord {
  seq: number;
  at: number;
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
  seq: number;
  at: number;
  act: number;
  floor: number | null;
  text: string;
}

/** A route plan DeepSeek made (BUILD_DECIDER=deepseek), in the order they were made. */
export interface RouteRecord {
  seq: number;
  at: number;
  key: string;
  act: number;
  floor: number | null;
  hpPct: number;
  steps: { row: number; col: number; type: string; hpOnArrival: number }[];
  why: string | null;
}

/**
 * The run context DeepSeek receives with every question, in message order (most stable first, see the
 * file comment). Nothing is dropped: every decision, fight, floor and resource change of the run is one
 * terse line in `history` (floors left behind) or `this_floor` (the floor the run is on).
 */
export interface RunMemory {
  /**
   * The current act, stable until the next act: its elites and dangerous hallway fights from the monster
   * DB (the map ahead), the act boss and its monster-DB entry (measured HP, moves, our record).
   */
  act: string;
  /**
   * Every floor already left, in order, append-only: the floor's room, HP / gold at its end, then each
   * decision (every DeepSeek decision and Jev's/code's key non-combat picks), fight (enemies, HP before →
   * after, potions), deck/relic/potion/max-HP change and route plan made on it.
   */
  history: string;
  /**
   * Current facts: HP, gold, deck, relics, potions, the boss clock, DeepSeek's run plan. "" when the
   * question's own facts already carry them (every BUILD_DECIDER=deepseek question and the run plan).
   */
  now: string;
  /** The current floor so far, in the history's format (a fight still going shows its HP now). */
  this_floor: string;
  /** Progress on DeepSeek's route plan for the current act (the plans themselves are in the history). */
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
  /**
   * The question carries its own current facts (deck, relics, potions, HP, gold, boss clock, run plan):
   * `now` is left empty instead of repeating them.
   */
  factsCovered?: boolean;
}

/** What one observed state changed in the journal (see RunJournal.observe). */
export type JournalChange = "none" | "mark" | "items";

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

/** Non-DeepSeek decisions worth keeping (deck, relics, potions, rests, events, route plans). */
const KEY_LABELS = /^(reward\/(card|skip)|shop\/(buy|discard)|rest\/choose|event\/(choose|only)|chest\/relic|selection\/(?!confirm)|bundle\/choose|capstone\/choose|map\/(discard-potion|route-plan))/;

/** What each act boss does, in one line (ironclad-guide.md §7/§9). Keyed by boss id without "_BOSS". */
export const BOSS_NOTES: Record<string, string> = {
  VANTOM: "173 血，开场 9 层滑溜（前 9 次伤害只算 1）：多段攻击破层；4 回合循环，肢解重击 19–30 并塞伤口时全力格挡，蓄力回合输出/打能力。",
  CEREMONIAL_BEAST: "252 血，前两回合蓄力（打能力），犁地 9→20→22→24；首次跌破 150 血被击晕一回合，之后昏眩（一回合只能打 1 张）。",
  THE_KIN: "神官 199 血(A8) + 两个信徒 62/63(爪牙)：神官一死战斗即结束，单体伤害压神官，AOE 顺带信徒；T3/T7/T11 光束 3×(3+力量)。",
  LAGAVULIN_MATRIARCH: "222 血，开场沉睡 + 12 覆甲：掉 1 血就醒，沉睡时打能力/留格挡；醒后 19、9×2，尽早爆发。",
  SOUL_FYSH: "往牌组塞 Beckon（6 点无法格挡）：用消耗牌清掉，少抽牌；周期性无实体时别输出。",
  WATERFALL_GIANT: "240 血，被打「死」后下一回合自爆 = 蒸汽喷发层数（{ERUPTION}）：HP 始终留在层数之上，自爆回合全力格挡。虹吸回合回 10 血，压力枪每次递增（20→25→30）：拖得越久越难，要抢伤害。",
  THE_INSATIABLE: "341 血(A8)，沙坑每敌方回合 −1，归零即死：打不死它就尽早打狂乱逃离（每张多一回合），不要等沙坑 ≤2。",
  KAISER_CRAB: "两只钳子：单体伤害集中打火箭（T4/T9 激光 47–49），群伤照打两只；先死一只时另一只 +99 格挡 +6 力，但格挡只挡一回合，那回合出格挡/能力牌（51 场螃蟹战：火箭先死 9/12 赢，两只一直活着 8/39；经验 crab-kill-order）。",
  KNOWLEDGE_DEMON: "379 血，第 1/5/9 回合选负面：懒惰 > 心灵腐化 > 瓦解 > 衰朽；每 4 回合回血加力，要力量成长速攻。",
  QUEEN: "女王 400 + 聚合体 199：先杀聚合体，女王只吃群伤（4 场胜局都在 T4–T8 先打死聚合体，A8 5 场输局聚合体都活过 T5；经验 queen-plan）；第 2 回合起 99 层易伤/虚弱/脆弱，前两回合全力输出，魂缚牌每回合只打一张。",
  TEST_SUBJECT: "三阶段共 600 血：一阶段少打技能；二阶段多段爪逐回合加段：挡得住就挡，挡不住就抢伤害尽快打完（每拖一回合多一段）；三阶段无实体，靠多段；复生回合做准备。",
  AEONGLASS: "512 血，人工制品 3 + 凋萎存在（每打 6 张牌塞一张凋萎）：先用便宜减益剥人工制品，少打小牌，退潮 33 格挡在我方第 2/5/8 回合，那几回合打能力，约第 8 回合前打完。",
  DOORMAKER: "多阶段，需要 AOE + 可持续成长。",
};

export function bossNote(bossId: string | null | undefined, ascension = 8): string | null {
  if (!bossId) return null;
  const key = bossId.toUpperCase().replace(/_BOSS$/, "");
  const note = BOSS_NOTES[key];
  if (!note) return null;
  // The Giant's eruption at this ascension (monster DB): A8 第 2 回合 15，A9 20，每回合 +3 at both.
  const eruption = eruptionSchedule(ascension);
  return note.replace("{ERUPTION}", `A${ascension}：第 ${eruption.firstTurn} 回合 ${eruption.first}，每回合 +${eruption.perTurn}`);
}



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
  /** Creation counter for the journal's items (history is chronological). */
  private seq = 0;
  /** Highest floor seen this run: every floor below it is closed and written to the history for good. */
  private maxFloor = 0;

  /** The floor an item made now is filed under: the state's floor, never below a floor already left. */
  private placeFloor(state: GameState): number {
    const floor = state.run?.floor ?? null;
    if (floor !== null && floor > this.maxFloor) this.maxFloor = floor;
    return this.maxFloor;
  }

  private nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }

  /**
   * Called with every state read: resets on a new run, tracks fights, resources, HP and route plans.
   * Returns what the state changed in what the journal renders: "items" (a new item, a fight's shown
   * values, the run, the floor count, a first resource snapshot), "mark" (only the current floor's HP /
   * gold line, which a later state of the same floor overwrites) or "none". The loop logs every state
   * that changed something, so a restarted process can replay the journal from the logs
   * (journal-replay.ts).
   */
  observe(state: GameState, context: JournalContext = {}): JournalChange {
    const floor = state.run?.floor ?? null;
    const items = this.itemSignature();
    const mark = floor === null ? "" : JSON.stringify(this.floors.get(floor) ?? null);
    this.syncRun(state);
    if (context.knowledge) this.knowledge = context.knowledge;
    if (state.run) {
      this.trackFight(state);
      this.trackResources(state);
      this.trackFloor(state);
    }
    if (context.screenMemory) this.trackRoute(state, context.screenMemory.routePlan);
    if (this.itemSignature() !== items) return "items";
    return floor !== null && JSON.stringify(this.floors.get(floor) ?? null) !== mark ? "mark" : "none";
  }

  /** Items made so far this run (grows with every decision, fight, change and plan the journal files). */
  get itemCount(): number {
    return this.seq;
  }

  /** Everything the journal renders except the floor marks (see observe). */
  private itemSignature(): string {
    const fight = this.fights.at(-1);
    return [
      this.runId,
      this.seq,
      this.maxFloor,
      this.routes.length,
      this.deckSnap ? 1 : 0,
      this.relicSnap ? 1 : 0,
      this.potionSnap ? 1 : 0,
      this.maxHpSnap ?? "",
      fight ? [fight.enemies.length, fight.hpBefore, fight.hpAfter, fight.maxHp, fight.over, fight.died, fight.potionsUsed.length].join("|") : "",
    ].join("#");
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
      seq: this.nextSeq(),
      at: this.placeFloor(state),
      act: actOf(state),
      floor: state.run?.floor ?? null,
      label: entry.label,
      by: entry.by,
      choice: compact(entry.choice),
      reason: entry.by === "deepseek" || entry.by === "claude" ? journalReason(entry.reason) : "",
    });
  }

  /** DeepSeek's run plan (RUN_PLAN=v1), one of its decisions. */
  noteRunPlan(state: GameState, trigger: string, line: string | null): void {
    this.syncRun(state);
    this.choices.push({ seq: this.nextSeq(), at: this.placeFloor(state), act: actOf(state), floor: state.run?.floor ?? null, label: "run-plan", by: "deepseek", choice: compact(`${trigger ? `(${trigger}) ` : ""}${line ?? ""}`), reason: "" });
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
        seq: this.nextSeq(),
        at: this.placeFloor(state),
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
      this.events.push({ seq: this.nextSeq(), at: this.placeFloor(state), act, floor, text });
    };
    const deck = run["deck"];
    if (Array.isArray(deck) && deck.length > 0) {
      const snap = countBy(deck, (card) => `${str(card["card_id"])}${bool(card["upgraded"]) ? "+" : ""}`, (card) => upgradedName(str(card["name"], str(card["card_id"])), bool(card["upgraded"])));
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
      const upName = (after.get(`${id}+`) ?? before.get(`${id}+`))?.name ?? upgradedName(plainName, true);
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
    // A stale state of a floor already left must not rewrite that floor's line in the history.
    if (floor === null || floor < this.placeFloor(state)) return;
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
    this.routes.push({ seq: this.nextSeq(), at: this.placeFloor(state), key, act: plan.act, floor: plan.floor, hpPct: plan.hpPct, steps: plan.path.map((step) => ({ ...step })), why: plan.why ?? null });
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
    this.seq = 0;
    this.maxFloor = 0;
  }

  /** The run context DeepSeek receives (every question type), in message order. */
  render(state: GameState, knowledge: Knowledge, context: JournalContext["screenMemory"] = {}, question: QuestionContext = {}): RunMemory {
    this.syncRun(state);
    this.knowledge ??= knowledge;
    this.trackRoute(state, context.routePlan);
    const current = this.placeFloor(state);
    return {
      act: renderAct(state, knowledge),
      history: this.renderHistory(state, (floor) => floor < current),
      now: question.factsCovered ? "" : this.renderNow(state, knowledge, context),
      this_floor: this.renderThisFloor(state, current),
      route: this.renderRoute(state),
      lookahead: renderLookahead(state, context.lastMap, this.position),
      knowledge: renderKnowledge(state, question),
    };
  }

  private renderNow(state: GameState, knowledge: Knowledge, context: JournalContext["screenMemory"] = {}): string {
    const lines: string[] = [];
    const run = asRecord(state.run?.raw);
    lines.push(`现状: 第${actOf(state)}幕 F${state.run?.floor ?? "?"} | HP ${state.run?.current_hp ?? "?"}/${state.run?.max_hp ?? "?"} | 金币 ${state.run?.gold ?? "?"}`);
    // The act boss's name is in the act block.
    const entries = deckEntries(state, knowledge);
    if (entries.length > 0) {
      const counted = countBy(entries as unknown as JsonValue[], (card) => upgradedName(str(card["name"]), bool(card["upgraded"])), (card) => upgradedName(str(card["name"]), bool(card["upgraded"])));
      lines.push(`牌组 ${entries.length} 张: ${[...counted.values()].map((card) => `${card.name}${times(card.count)}`).join(", ")}`);
      lines.push(`构筑: ${deckProfileLine(state, knowledge)}`);
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

  /**
   * The floors `closed` accepts, chronologically: one line per floor (room, HP and gold at its end, max HP
   * when it changed), then each item made on it in the order it happened. A closed floor's text never
   * changes again, so the history of one question is a byte prefix of the next one's.
   */
  private renderHistory(state: GameState, closed: (floor: number) => boolean): string {
    const all = this.items();
    const floors = new Set<number>([...this.floors.keys()].filter(closed));
    for (const item of all) if (closed(item.at)) floors.add(item.at);
    if (floors.size === 0) return "";
    const lines = [HISTORY_HEADER];
    let act = -1;
    let lastMax: number | null = null;
    for (const floor of [...floors].sort((a, b) => a - b)) {
      const mark = this.floors.get(floor);
      const items = all.filter((item) => item.at === floor);
      const firstAct = items[0]?.act ?? mark?.act ?? act;
      if (firstAct !== act) {
        act = firstAct;
        lines.push(`第${act}幕:`);
      }
      let head = `F${floor}`;
      if (mark) {
        const max = mark.maxHp !== null && mark.maxHp !== lastMax ? `/${mark.maxHp}` : "";
        lastMax = mark.maxHp ?? lastMax;
        head += ` ${ROOM_SHORT[mark.room] ?? "·"} HP${mark.hp ?? "?"}${max} ¥${mark.gold ?? "?"}`;
      }
      lines.push(head);
      act = this.pushItems(lines, items, act, state);
    }
    return lines.join("\n");
  }

  /** The floor the run is on, so far: the same item lines as the history (it joins it once left). */
  private renderThisFloor(state: GameState, current: number): string {
    const items = this.items().filter((item) => item.at >= current);
    if (items.length === 0) return "";
    const lines = [`本层至今（F${current}，尚未结束；格式同 history）:`];
    this.pushItems(lines, items, items[0]!.act, state);
    return lines.join("\n");
  }

  /** Every journal item, in the order it was made. */
  private items(): JournalItem[] {
    return [
      ...this.choices.map((choice): JournalItem => ({ kind: "choice", seq: choice.seq, at: choice.at, act: choice.act, choice })),
      ...this.fights.map((fight): JournalItem => ({ kind: "fight", seq: fight.seq, at: fight.at, act: fight.act, fight })),
      ...this.events.map((event): JournalItem => ({ kind: "event", seq: event.seq, at: event.at, act: event.act, event })),
      ...this.routes.map((route): JournalItem => ({ kind: "route", seq: route.seq, at: route.at, act: route.act, route })),
    ].sort((a, b) => a.seq - b.seq);
  }

  /** Item lines (indented one space); consecutive resource changes share a line; an act change mid-floor gets its header. */
  private pushItems(lines: string[], items: JournalItem[], act: number, state: GameState): number {
    let events: string[] = [];
    const flush = (): void => {
      if (events.length > 0) lines.push(` ${events.join("; ")}`);
      events = [];
    };
    for (const item of items) {
      if (item.act !== act) {
        flush();
        act = item.act;
        lines.push(`第${act}幕:`);
      }
      const other = (floor: number | null): string => (floor !== null && floor !== item.at ? `(F${floor}) ` : "");
      if (item.kind === "event") {
        events.push(`${other(item.event.floor)}${item.event.text}`);
        continue;
      }
      flush();
      if (item.kind === "choice") {
        const entry = item.choice;
        const reason = entry.reason.replace(UNVERIFIED_REASON_PREFIX, "");
        lines.push(` ${other(entry.floor)}${entry.label} [${entry.by === "deepseek" ? "DS" : entry.by}]: ${entry.choice}${reason ? ` — 未核实理由: ${reason}` : ""}`);
      } else if (item.kind === "fight") {
        lines.push(` ${other(item.fight.floor)}战斗 ${fightLine(item.fight, state)}`);
      } else {
        const route = item.route;
        const what = route.why ? `路线重规划（${compact(route.why)}）` : "路线规划";
        lines.push(` ${what}（第${route.act}幕 F${route.floor ?? "?"} 定，当时 HP ${Math.round(route.hpPct * 100)}%）: ${routeText(route.steps)}`);
      }
    }
    flush();
    return act;
  }

  /** Progress on the current act's route plan (the plans themselves are history items). */
  private renderRoute(state: GameState): string {
    const act = actOf(state);
    const plan = [...this.routes].reverse().find((route) => route.act === act);
    if (!plan) return `第${act}幕: 没有 DeepSeek 路线计划（逐节点选择）`;
    const here = this.position && this.position.act === act ? this.position : null;
    const done = here ? plan.steps.filter((step) => step.row <= here.row) : [];
    const onPlan = here ? plan.steps.find((step) => step.row === here.row) : undefined;
    const off = here && onPlan && onPlan.col !== here.col ? "（当前节点不在计划上）" : "";
    const left = plan.steps.filter((step) => !here || step.row > here.row);
    const next = left[0];
    return (
      `本幕进度（按 F${plan.floor ?? "?"} 的路线）: 已走 ${done.length}/${plan.steps.length}${done.length > 0 ? ` [${done.map((step) => ROOM_SHORT[step.type] ?? step.type).join("")}]` : ""}${off}` +
      (next ? ` | 下一步 ${ROOM_SHORT[next.type] ?? next.type}（预计 HP ${Math.round(next.hpOnArrival * 100)}%）` : "") +
      ` | 剩余 ${left.length}: ${routeText(left)}`
    );
  }
}

type JournalItem = { seq: number; at: number; act: number } & (
  | { kind: "choice"; choice: JournalChoice }
  | { kind: "fight"; fight: FightRecord }
  | { kind: "event"; event: ResourceEvent }
  | { kind: "route"; route: RouteRecord }
);

/** The history's legend: static text, so it is part of the cached prefix. */
const HISTORY_HEADER =
  "本局历程（已离开的楼层，按层按发生顺序，只追加）: 每层首行 = 层 房间 层末 HP(/上限，变化时标出) ¥金币（房间 怪/精/问/休/店/宝/王/古，·=未知）；" +
  "其下每行一件事: 决策「标签 [决策者]: 选择 — 未核实理由」（DS=DeepSeek；未核实理由 = DeepSeek 当时所写，不是事实）、" +
  "「战斗 敌人: HP 战前→战后/上限 药:用掉的药水」、牌组/遗物/药水/上限变化（起始牌组与起始遗物不计）、路线规划。";

const KIND_RANK: Record<string, number> = { unknown: 0, monster: 1, elite: 2, boss: 3 };

const ROOM_SOURCE: Record<string, string> = { RestSite: "休息", Rest: "休息", Shop: "商店", Unknown: "事件", Ancient: "古神", Treasure: "宝箱", Monster: "战斗", Elite: "精英", Boss: "Boss" };

function fightLine(fight: FightRecord, state: GameState): string {
  const enemies = fight.enemies.join("+") || "?";
  const after = fight.over ? String(fight.hpAfter ?? "?") : `进行中 ${state.combat?.current_hp ?? state.run?.current_hp ?? "?"}`;
  const max = fight.maxHp !== null ? `/${fight.maxHp}` : "";
  return `${enemies}: ${fight.hpBefore ?? "?"}→${after}${max}${fight.potionsUsed.length > 0 ? ` 药:${fight.potionsUsed.join(",")}` : ""}`;
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

/**
 * The act block: the act's threats (the same for every run at this ascension) first, then the act boss
 * and its monster-DB entry. Changes only when the act does.
 */
function renderAct(state: GameState, knowledge: Knowledge): string {
  const parts: string[] = [];
  const threats = renderThreats(state);
  if (threats) parts.push(threats);
  const bossId = state.run?.boss_id ?? str(asRecord(state.run?.raw)["boss_id"]);
  if (bossId) {
    const name = knowledge.monster(bossId)?.name ?? knowledge.monster(bossId.replace(/_BOSS$/, ""))?.name;
    parts.push(`第${actOf(state)}幕 boss: ${name && name !== bossId ? `${name} (${bossId})` : bossId}`);
    const dossier = bossDossier(bossId, state.run?.ascension ?? 0);
    if (dossier) parts.push(dossier);
  }
  return parts.join("\n");
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

/**
 * A card's display name with one "+" when upgraded. The game's own name of an upgraded card already
 * ends in "+" ("痛击+"); adding another rendered "痛击++" (audit 2026-09-28: 72 of 95 memories), which
 * reads as upgraded twice.
 */
export function upgradedName(name: string, upgraded: boolean): string {
  return upgraded && !name.endsWith("+") ? `${name}+` : name;
}

/** Route steps as room letters, ending at the boss once (the planned path already holds the Boss node). */
export function routeText(steps: { type: string }[]): string {
  const rooms = steps.map((step) => ROOM_SHORT[step.type] ?? step.type);
  if (steps.at(-1)?.type !== "Boss") rooms.push(ROOM_SHORT["Boss"]!);
  return rooms.join("→");
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



/**
 * The escalator's free-text reason is its guess, not a fact (VC4L F22: "腐化≈费用归零" was quoted back
 * as memory on the next pick; Corrupted costs 2 HP a play). Labelled unverified, kept whole: Dai
 * 2026-09-28, DeepSeek's history is compressed in format only, never cut (audit: a 40-char cap had cut
 * the body of every reason).
 */
export const UNVERIFIED_REASON_PREFIX = "（DeepSeek 当时的理由，未经核实）";

export function journalReason(reason: string): string {
  const text = compact(reason);
  return text ? `${UNVERIFIED_REASON_PREFIX}${text}` : "";
}

/** Whitespace folded to single spaces; nothing else removed. */
export function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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
  const note = bossNote(state.run?.boss_id, state.run?.ascension ?? 0);
  // The monster DB's measured numbers (boss_db) replace the note's hand-written HP; its strategy stays.
  if (note) parts.push(`boss 要点: ${bossDossier(state.run?.boss_id, state.run?.ascension ?? 0) ? withoutHandHp(note) : note}`);
  return parts.join(" | ");
}

/** The note without its hand-written HP figures ("173 血，…"), when the monster DB has measured ones. */
export function withoutHandHp(note: string): string {
  return note.replace(/\d+\s*血\s*/g, "").replace(/^[，,：:\s]+/, "").replace(/([（(])[，,]/g, "$1");
}

/* ---- choice text ---------------------------------------------------------------------------- */

/** The option actually played, as a short line: the chosen option's text, else the rationale. */
export function describeChoice(decision: Decision, resolved: ResolvedAction, answers: JsonValue | undefined, escalation: JsonValue | undefined): string {
  if (decision.kind === "act") return compact(decision.rationale);
  const questionKey = decision.escalate?.question ?? Object.keys(decision.questions).find((key) => decision.questions[key]?.type === "choice");
  const question = questionKey ? decision.questions[questionKey] : undefined;
  const key = resolved.guard?.choice ?? (str(asRecord(escalation)["choice"]) || str(asRecord(asRecord(answers)[questionKey ?? ""])["choice"]));
  if (question?.type !== "choice" || !key) return compact(resolved.rationale);
  return compact(optionText(question.criteria[key] ?? null) ?? key);
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

/** Characters per memory section (logged with every DeepSeek call, to watch the context grow). */
export function memorySections(memory: RunMemory): Record<string, number> {
  return Object.fromEntries(Object.entries(memory).map(([key, text]) => [key, text.length]));
}

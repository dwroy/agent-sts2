/**
 * Run memory for the DeepSeek escalator (phase 2).
 *
 * DeepSeek is stateless: every call saw one screen and nothing of the run behind it, so it could not
 * tell a deck built around Strength from a pile of Strikes, what it had itself decided three floors
 * ago, or that the boss is five floors away with no shop on any path. The journal keeps that, per
 * run and in process, and renders it into three short strings (≤ ~1,500 chars together) that ride in
 * DeepSeek's *user* message, so its system prompt stays byte-identical and cached. Jev never sees it.
 */

import type { Knowledge } from "../knowledge/index.js";
import type { GameState } from "../mod/schema.js";
import type { ActionRequest } from "../mod/client.js";
import { deckProfile } from "../strategy/card-value.js";
import { asArray, asRecord, num, numOrNull, str, truncate, type JsonValue } from "../util/json.js";
import { deckEntries, deckStats } from "./deck.js";
import type { Decision, RememberedMap, ResolvedAction } from "./types.js";

/** One decision the escalator made this run (not combat: the fight log covers that). */
export interface JournalChoice {
  floor: number | null;
  label: string;
  by: string;
  choice: string;
  reason: string;
}

/** One player turn of the current fight. */
export interface FightTurn {
  turn: number | null;
  hpStart: number | null;
  choice: string;
  by: string;
  /** Whether a model (not code alone) chose this turn's line: a later model answer replaces a code act. */
  asked: boolean;
  hpLost: number | null;
  enemiesAfter: string | null;
}

export interface RunMemory {
  run_journal: string;
  fight_log: string;
  lookahead: string;
}

export interface JournalEntry {
  label: string;
  by: string;
  choice: string;
  reason: string;
  asked: boolean;
  intent: ActionRequest | null;
}

const MAX_CHOICES = 8;
const MAX_TURNS = 5;
/** Per-section caps; the three together stay under ~1,500 chars. */
const CAP = { run_journal: 800, fight_log: 420, lookahead: 280 } as const;

/** What each act boss does, in one line (ironclad-guide.md §7/§9). Keyed by boss id without "_BOSS". */
export const BOSS_NOTES: Record<string, string> = {
  VANTOM: "173 血，开场 9 层滑溜（前 9 次伤害只算 1）：多段攻击破层；4 回合循环，肢解重击 19–30 并塞伤口时全力格挡，蓄力回合输出/打能力。",
  CEREMONIAL_BEAST: "252 血，前两回合蓄力（打能力），犁地 9→20→22→24；首次跌破 150 血被击晕一回合，之后昏眩（一回合只能打 1 张）。",
  THE_KIN: "神官 190 血 + 两个信徒：信徒成长快，AOE 价值极高，长战先杀信徒。",
  LAGAVULIN_MATRIARCH: "222 血，开场沉睡 + 12 覆甲：掉 1 血就醒，沉睡时打能力/留格挡；醒后 19、9×2，尽早爆发。",
  SOUL_FYSH: "往牌组塞 Beckon（6 点无法格挡）：用消耗牌清掉，少抽牌；周期性无实体时别输出。",
  WATERFALL_GIANT: "240 血，被打「死」后下一回合自爆 = 蒸汽喷发层数（第 2 回合 15，每回合 +3）：HP 始终留在层数之上，自爆回合全力格挡。",
  THE_INSATIABLE: "321 血，沙坑每敌方回合 −1，归零即死：沙坑 ≤2 时先打狂乱逃离再输出。",
  KAISER_CRAB: "两只钳子：先杀一只另一只得 99 格挡 +6 力，要同回合一起打死（血量保持接近，注意回合开始群伤）。",
  KNOWLEDGE_DEMON: "379 血，第 1/5/9 回合选负面：懒惰 > 心灵腐化 > 瓦解 > 衰朽；每 4 回合回血加力，要力量成长速攻。",
  QUEEN: "女王 400 + 聚合体 199：第 2 回合起 99 层易伤/虚弱/脆弱，前两回合全力输出；之后攻击全给聚合体，魂缚牌每回合只打一张。",
  TEST_SUBJECT: "三阶段共 600 血：一阶段少打技能；二阶段多段爪逐回合加段：挡得住就挡，挡不住就抢伤害尽快打完（每拖一回合多一段）；三阶段无实体，靠多段；复生回合做准备。",
  AEONGLASS: "512 血，人工制品 3 + 凋萎存在（每打 6 张牌塞一张凋萎）：先用便宜减益剥人工制品，少打小牌，退潮 33 格挡回合打能力，约第 9 回合前打完。",
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

export class RunJournal {
  runId = "";
  choices: JournalChoice[] = [];
  fight: { key: string; turns: FightTurn[]; over: boolean } | null = null;
  /** The map node last chosen, and the map floor it was chosen from (the next MAP screen supersedes it). */
  position: { row: number; col: number; fromFloor: number | null } | null = null;

  /** Called with every state read: resets on a new run and closes the fight log when combat ends. */
  observe(state: GameState): void {
    this.syncRun(state);
    if (!inCombat(state) && this.fight && !this.fight.over) {
      const last = this.fight.turns.at(-1);
      if (last && last.hpLost === null) {
        const hp = state.run?.current_hp ?? null;
        last.hpLost = last.hpStart !== null && hp !== null ? last.hpStart - hp : null;
        last.enemiesAfter = "战斗结束";
      }
      this.fight.over = true;
    }
  }

  /** Called once per executed decision, with the state it was decided on. */
  record(state: GameState, entry: JournalEntry): void {
    this.syncRun(state);
    if (entry.intent?.action === "choose_map_node") {
      const node = asArray(asRecord(state.raw["map"])["available_nodes"])
        .map(asRecord)
        .find((candidate) => num(candidate["index"], -1) === entry.intent?.option_index);
      if (node) this.position = { row: num(node["row"]), col: num(node["col"]), fromFloor: state.run?.floor ?? null };
    }
    if (entry.label.startsWith("combat/") && inCombat(state)) {
      this.recordTurn(state, entry);
      return;
    }
    if (entry.by !== "deepseek" && entry.by !== "claude") return;
    this.choices.push({
      floor: state.run?.floor ?? null,
      label: entry.label,
      by: entry.by,
      choice: oneLine(entry.choice, 70),
      reason: journalReason(entry.reason),
    });
    if (this.choices.length > MAX_CHOICES) this.choices.splice(0, this.choices.length - MAX_CHOICES);
  }

  /** DeepSeek's plan for an elite/boss fight (FIGHT_PLAN=v1): kept with the run's other escalator choices. */
  noteFightPlan(state: GameState, summary: string): void {
    this.syncRun(state);
    this.choices.push({ floor: state.run?.floor ?? null, label: "combat/fight-plan", by: "deepseek", choice: oneLine(summary, 70), reason: "" });
    if (this.choices.length > MAX_CHOICES) this.choices.splice(0, this.choices.length - MAX_CHOICES);
  }

  private recordTurn(state: GameState, entry: JournalEntry): void {
    const key = fightKey(state);
    if (!this.fight || this.fight.key !== key) this.fight = { key, turns: [], over: false };
    const hp = state.combat?.current_hp ?? state.run?.current_hp ?? null;
    const turns = this.fight.turns;
    const last = turns.at(-1);
    if (last && last.turn === state.turn) {
      // Continuations of the turn's plan add nothing; a model's answer replaces an earlier code act.
      if (entry.asked && !last.asked && !entry.label.endsWith("plan-continue")) {
        last.choice = oneLine(entry.choice, 60);
        last.by = entry.by;
        last.asked = true;
      }
      return;
    }
    if (last && last.hpLost === null) {
      last.hpLost = last.hpStart !== null && hp !== null ? last.hpStart - hp : null;
      last.enemiesAfter = describeEnemies(state);
    }
    turns.push({ turn: state.turn, hpStart: hp, choice: oneLine(entry.choice, 60), by: entry.by, asked: entry.asked, hpLost: null, enemiesAfter: null });
    if (turns.length > MAX_TURNS) turns.splice(0, turns.length - MAX_TURNS);
  }

  private syncRun(state: GameState): void {
    const runId = str(state.raw["run_id"]);
    if (!runId || runId === this.runId) return;
    this.runId = runId;
    this.choices = [];
    this.fight = null;
    this.position = null;
  }

  /** The memory block DeepSeek receives. */
  render(state: GameState, knowledge: Knowledge, map: RememberedMap | undefined): RunMemory {
    this.syncRun(state);
    return {
      run_journal: this.renderJournal(state, knowledge),
      fight_log: this.renderFight(state),
      lookahead: renderLookahead(state, map, this.position),
    };
  }

  private renderJournal(state: GameState, knowledge: Knowledge): string {
    const lines: string[] = [];
    const bossId = state.run?.boss_id ?? str(asRecord(state.run?.raw)["boss_id"]);
    if (bossId) {
      const name = knowledge.monster(bossId)?.name ?? knowledge.monster(bossId.replace(/_BOSS$/, ""))?.name;
      lines.push(`本幕 boss: ${name && name !== bossId ? `${name} (${bossId})` : bossId}`);
    }
    const entries = deckEntries(state, knowledge);
    if (entries.length > 0) {
      const stats = deckStats(entries);
      const profile = deckProfile(entries);
      const strength = [...new Set(entries.filter((card) => givesStrength(card.card_id, card.description)).map((card) => card.name))];
      lines.push(
        `构筑: ${stats.total} 张 (攻击 ${stats.attacks}/技能 ${stats.skills}/能力 ${stats.powers}) | 力量来源 ${strength.length > 0 ? strength.join("、") : "无"} | AOE ${profile.aoe} | 格挡牌 ${profile.block} | 过牌 ${profile.draw} | 成长 ${profile.scaling}`,
      );
    }
    const header = lines.join("\n");
    const choices = this.choices.map((entry) => `F${entry.floor ?? "?"} ${entry.label} [${entry.by}]: ${entry.choice}${entry.reason ? ` — ${entry.reason}` : ""}`);
    // Oldest choices go first when the section runs long.
    while (choices.length > 0 && header.length + choices.join("\n").length + 12 > CAP.run_journal) choices.shift();
    const body = choices.length > 0 ? `${header}\n本局兜底决策:\n${choices.join("\n")}` : header;
    return truncate(body, CAP.run_journal);
  }

  private renderFight(state: GameState): string {
    if (!inCombat(state) || !this.fight || this.fight.key !== fightKey(state)) return "";
    // Only completed turns: the current turn's line is still being played (no HP lost yet), and
    // showing it confuses the escalator about what has already happened this turn.
    const done = this.fight.turns.filter((turn) => turn.turn === null || turn.turn !== state.turn);
    if (done.length === 0) return "";
    const lines = done.map((turn) => {
      const lost = turn.hpLost === null ? "" : `, 失血 ${turn.hpLost}`;
      const after = turn.enemiesAfter ? ` | 之后敌人: ${turn.enemiesAfter}` : "";
      return `T${turn.turn ?? "?"} HP ${turn.hpStart ?? "?"}${lost} | ${turn.by}: ${turn.choice}${after}`;
    });
    while (lines.length > 1 && lines.join("\n").length > CAP.fight_log) lines.shift();
    return truncate(lines.join("\n"), CAP.fight_log);
  }
}

function inCombat(state: GameState): boolean {
  return state.in_combat || state.screen === "COMBAT";
}

function fightKey(state: GameState): string {
  return `${state.run?.act_id ?? "?"}:${state.run?.floor ?? "?"}`;
}

function describeEnemies(state: GameState): string {
  const enemies = asArray(asRecord(state.combat?.raw)["enemies"]).map(asRecord).filter((enemy) => enemy["is_alive"] !== false);
  if (enemies.length === 0) return "无";
  return enemies.map((enemy) => `${truncate(str(enemy["name"], str(enemy["enemy_id"], "?")), 10)} ${numOrNull(enemy["current_hp"]) ?? "?"}/${numOrNull(enemy["max_hp"]) ?? "?"}`).join(", ");
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
  if (note) parts.push(`boss 要点: ${note}`);
  return truncate(parts.join(" | "), CAP.lookahead);
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
  return memory.run_journal.length + memory.fight_log.length + memory.lookahead.length;
}

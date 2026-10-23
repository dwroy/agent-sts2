/** Observed deck changes and executed skips, with bounded, run-local reasons. No card valuation. */
import type { GameState } from "../hand/mod/schema.js";
import type { JournalEntry } from "./run-journal.js";
import { asArray, asRecord, str } from "../core/util/json.js";

export const CONSTRUCTION_LOG_HEAD = 4;
export const CONSTRUCTION_LOG_RECENT = 36;
export const CONSTRUCTION_LOG_MAX_CHARS = 20_000;
export const CONSTRUCTION_LOG_NOTE = "本局已做的选择，不是规则；运行计划的转向条件照旧有效。";

interface Card { id: string; name: string; upgraded: boolean }
export interface ConstructionEntry {
  floor: number | null;
  action: string;
  cards: string;
  reason: string;
  source: string;
}
interface Pending {
  floor: number | null;
  screen: string;
  action: string;
  cardId: string;
  reason: string;
  source: string;
}
interface Core {
  entries: ConstructionEntry[];
  omitted: number;
  deck: Card[] | null;
  pending: Pending[];
  plans: Record<string, { reason: string; source: string }>;
}
export interface ConstructionLog extends Core {
  floor: number | null;
  checkpoints: Record<string, Core & { floor: number | null }>;
}
export interface ConstructionLogView {
  entries: ConstructionEntry[];
  omitted: number;
}

export function emptyConstructionLog(): ConstructionLog {
  return { entries: [], omitted: 0, deck: null, pending: [], plans: {}, floor: null, checkpoints: {} };
}

export function isConstructionQuestion(label: string): boolean {
  return /^(reward\/(card|skip)|shop\/|rest\/|selection\/|event\/|bundle\/|capstone\/|run-plan$|map\/(act-start|route-plan))/.test(label);
}

/** Bound Unicode characters, including supplementary code points; never retain a reasoning transcript. */
export function shortConstructionText(text: string, max = 20): string {
  return Array.from(text.replace(/\s+/gu, " ").trim()).slice(0, max).join("");
}

function clippedCards(text: string, max = 180): string {
  const compact = text.replace(/\s+/gu, " ").trim();
  return Array.from(compact).length > max ? shortConstructionText(compact, max - 1) + "…" : compact;
}

function push(log: ConstructionLog, entry: ConstructionEntry): void {
  log.entries.push(entry);
  if (log.entries.length > CONSTRUCTION_LOG_HEAD + CONSTRUCTION_LOG_RECENT) {
    log.entries.splice(CONSTRUCTION_LOG_HEAD, 1);
    log.omitted += 1;
  }
}

const names = (cards: Card[]): string => clippedCards(cards.map(c => c.name + (c.upgraded && !c.name.endsWith("+") ? "+" : "")).join("/"));
const key = (c: Card): string => `${c.id}:${c.upgraded}`;
function difference(a: Card[], b: Card[]): Card[] {
  const rest = b.map(key);
  return a.filter(c => {
    const at = rest.indexOf(key(c));
    if (at < 0) return true;
    rest.splice(at, 1);
    return false;
  });
}

/** Executed actions supply attribution; the next real deck observation supplies the outcome. */
export function recordConstruction(log: ConstructionLog, state: GameState, entry: JournalEntry): void {
  const action = entry.intent?.action;
  if (!action || entry.executed === false) return;
  const brain = /^(codex|deepseek|dsh|claude)( \(for .+\))?$/.test(entry.by);
  const inherited = entry.planRef ? log.plans[entry.planRef] : undefined;
  const reason = shortConstructionText(brain ? entry.reason || inherited?.reason || `${entry.by}（理由缺失）` : entry.by || "code");
  const source = shortConstructionText(brain ? inherited?.source ?? entry.by : entry.by, 16);
  if (entry.planRef && entry.reason) log.plans[entry.planRef] = { reason, source };
  const floor = state.run?.floor ?? null;
  if (action === "skip_reward_cards") {
    const offered = asArray(asRecord(state.raw["reward"])["card_options"]).map(asRecord);
    push(log, { floor, action: "跳过", cards: clippedCards(offered.map(c => str(c["name"], str(c["card_id"])) + (c["upgraded"] === true && !str(c["name"]).endsWith("+") ? "+" : "")).join("/")), reason, source });
    log.pending = [];
    return;
  }
  // Battle selections affect the hand/piles, not the permanent deck.
  if (state.in_combat || state.screen === "COMBAT") return;
  if (!["choose_reward_card", "buy_card", "select_deck_card", "choose_event_option", "choose_rest_option"].includes(action)
    && !/^(bundle|capstone)\//.test(entry.label)) return;
  const list = action === "buy_card" ? asRecord(state.raw["shop"])["cards"]
    : action === "choose_reward_card" ? asRecord(state.raw["reward"])["card_options"]
    : action === "select_deck_card" ? asRecord(state.raw["selection"])["cards"] : [];
  const card = asArray(list).map(asRecord).find((c, i) => (c["index"] ?? i) === entry.intent?.option_index);
  if (!card && ["buy_card", "choose_reward_card", "select_deck_card"].includes(action)) return;
  const task = str(asRecord(state.raw["selection"])["kind"]);
  const verb = action === "buy_card" ? "商店买" : action === "choose_reward_card" ? "拿"
    : /upgrade/.test(task) ? "升级" : /transform/.test(task) ? "事件变牌"
    : /add/.test(task) ? "事件加牌" : /enchant/.test(task) ? "附魔" : action === "select_deck_card" ? "删" : "";
  log.pending.push({ floor, screen: state.screen, action: verb, cardId: str(card?.["card_id"]), reason, source });
  log.pending = log.pending.slice(-20);
}

/** Missing deck payloads do not mean an empty deck. An explicit [] does. */
export function observeConstruction(log: ConstructionLog, state: GameState): boolean {
  const rawDeck = asRecord(state.run?.raw)["deck"];
  if (!Array.isArray(rawDeck)) return false;
  const floor = state.run?.floor ?? null;
  const deck: Card[] = rawDeck.map(asRecord).map(c => ({ id: str(c["card_id"]), name: shortConstructionText(str(c["name"], str(c["card_id"])), 48), upgraded: c["upgraded"] === true }));
  if (floor === log.floor && log.deck && !difference(deck, log.deck).length && !difference(log.deck, deck).length) return false;
  if (floor !== null && log.floor !== null && floor < log.floor) {
    // Manual floor rollback: discard the abandoned future, retaining the original floor checkpoint.
    const checkpoint = log.checkpoints[String(floor)];
    Object.assign(log, structuredClone(checkpoint ?? { ...emptyConstructionLog(), deck: null }));
    for (const f of Object.keys(log.checkpoints)) if (Number(f) > floor) delete log.checkpoints[f];
  }
  if (floor !== null && !log.checkpoints[String(floor)]) {
    const { checkpoints: _checkpoints, ...core } = log;
    log.checkpoints[String(floor)] = structuredClone(core);
  }
  if (log.deck) {
    const added = difference(deck, log.deck), removed = difference(log.deck, deck);
    const changes = [...added, ...removed];
    if (changes.length) {
      const pending = log.pending.filter(p => p.floor === floor || (p.floor === log.floor && p.cardId));
      const matched = pending.filter(p => p.cardId &&
        (["拿", "商店买", "事件加牌"].includes(p.action) ? added : changes).some(c => c.id === p.cardId));
      const cause = matched.at(-1) ?? pending.filter(p => !p.cardId).at(-1);
      const reason = cause?.reason ?? "状态观察（来源未知）", source = cause?.source ?? "state";
      const actionFloor = cause?.floor ?? floor;
      // Pair upgrades by card ID; duplicate copies are compared as a multiset.
      for (let i = removed.length - 1; i >= 0; i--) {
        const old = removed[i]!;
        const at = added.findIndex(c => c.id === old.id && c.upgraded && !old.upgraded);
        if (at < 0) continue;
        const card = added.splice(at, 1)[0]!;
        removed.splice(i, 1);
        const own = matched.find(p => p.cardId === card.id) ?? cause;
        push(log, { floor: own?.floor ?? floor, action: "升级", cards: names([card]), reason: own?.reason ?? reason, source: own?.source ?? source });
      }
      if (added.length || removed.length) {
        let verb = "删";
        if (added.length && removed.length) verb = cause?.screen === "EVENT" || cause?.action === "事件变牌" ? "事件变牌" : "替换（状态差分）";
        else if (added.length) {
          if (cause?.action === "商店买" || cause?.action === "拿") verb = cause.action;
          else verb = cause?.screen === "EVENT" || cause?.screen === "CARD_SELECTION" || state.screen === "EVENT" ? "事件加牌" : "加牌";
        }
        const cards = added.length && removed.length ? `${names(removed)}→${names(added)}` : names(added.length ? added : removed);
        push(log, { floor: actionFloor, action: verb, cards: clippedCards(cards), reason, source });
      }
      log.pending = [];
    }
  }
  if (floor !== log.floor) log.pending = [];
  log.floor = floor;
  log.deck = deck;
  return true;
}

export function constructionLogView(log: ConstructionLog): ConstructionLogView {
  return { entries: structuredClone(log.entries), omitted: log.omitted };
}

export function renderConstructionLog(log: ConstructionLog): string {
  const lines = [CONSTRUCTION_LOG_NOTE, `保留开头${CONSTRUCTION_LOG_HEAD}条及最近${CONSTRUCTION_LOG_RECENT}条；中间省略${log.omitted}条（原日志保留）。`];
  for (const e of log.entries) lines.push(`F${e.floor ?? "?"} ${e.action} ${clippedCards(e.cards, 140) || "（无选项）"}：${e.reason} [${e.source}]`);
  if (!log.entries.length) lines.push("尚无已确认构筑选择。");
  return lines.join("\n").slice(0, CONSTRUCTION_LOG_MAX_CHARS);
}

/**
 * One-shot build decisions (BUILD_DECIDER=deepseek, Roy 2026-09-29): DeepSeek decides a shop visit, a rest
 * site or an event option together with the deck card(s) its follow-up screen takes, in one question;
 * code then plays the steps. This module holds what the three screens share: the deck as distinct cards
 * with keys, which deck selection an option leads to (read from its text), the card named for the
 * selection screen that follows (PendingPick), plan references and the upgrade preview.
 *
 * Code supplies facts only: an option's follow-up is the game's own text; a card the follow-up screen
 * does not offer, or a screen other than the one expected, is a divergence and the step-by-step question
 * is asked there as before.
 */

import { cardUpgrade } from "../../knowledge/card-upgrades.js";
import { cardOutcome } from "../../knowledge/outcome-facts.js";
import { annotatePlating } from "../../knowledge/enchant-text.js";
import type { Knowledge } from "../../knowledge/index.js";
import { deckEntries, type DeckEntry } from "../../memory/deck.js";
import type { DecisionEnv, ScreenMemory } from "../../memory/types.js";
import type { GameState } from "../mod/schema.js";
import { asArray, asRecord, bool, iconsToText, numOrNull, str, truncate, type JsonValue } from "../../core/util/json.js";
import type { PickOption, PlanAnswer } from "./pick.js";

/** The deck selections an option can lead to. */
export type DeckTask = "remove" | "upgrade" | "transform" | "enchant" | "duplicate";

/** What makes two deck cards the same pick: id, upgrade, rendered text (enchantments show there) and cost. */
export interface CardIdentity {
  card_id: string;
  upgraded: boolean;
  text: string;
  cost: number | null;
}

/** One distinct deck card, keyed for DeepSeek (`c` + the deck index of its first copy). */
export interface DeckCard {
  key: string;
  identity: CardIdentity;
  name: string;
  count: number;
  type: string;
  rarity: string;
  /** The rendered rules text (icons as text). */
  text: string;
  enchant?: string;
  /** Eternal (永恒): the game offers it for no removal or transform. */
  eternal: boolean;
  /** The raw deck entry of the first copy (for the upgrade preview). */
  raw: Record<string, unknown>;
}

export function cardIdentity(card: Record<string, unknown>): CardIdentity {
  return {
    card_id: str(card["card_id"]),
    upgraded: bool(card["upgraded"]),
    text: str(card["resolved_rules_text"]),
    cost: numOrNull(card["energy_cost"]),
  };
}

export function sameCard(card: Record<string, unknown>, identity: CardIdentity): boolean {
  const other = cardIdentity(card);
  return other.card_id === identity.card_id && other.upgraded === identity.upgraded && other.text === identity.text && other.cost === identity.cost;
}

const ETERNAL = /永恒|\bEternal\b/i;

/** The deck as distinct cards, in deck order. */
export function deckCards(state: GameState, knowledge: Knowledge): DeckCard[] {
  const raws = asArray(asRecord(state.run?.raw)["deck"]).map(asRecord);
  const entries = deckEntries(state, knowledge);
  const out: DeckCard[] = [];
  raws.forEach((raw, position) => {
    const entry: DeckEntry | undefined = entries[position];
    const identity = cardIdentity(raw);
    const seen = out.find((card) => sameCard(card.raw, identity));
    if (seen) {
      seen.count += 1;
      return;
    }
    const index = numOrNull(raw["index"]) ?? position;
    const info = knowledge.card(identity.card_id);
    const name = str(raw["name"], info?.name ?? identity.card_id);
    out.push({
      key: `c${index}`,
      identity,
      name: identity.upgraded && !name.endsWith("+") ? `${name}+` : name,
      count: 1,
      type: str(raw["card_type"], entry?.type ?? info?.type ?? ""),
      rarity: str(raw["rarity"], entry?.rarity ?? info?.rarity ?? ""),
      text: iconsToText(identity.text || info?.description || "").replace(/\s+/g, " ").trim(),
      ...(entry?.enchant ? { enchant: entry.enchant } : {}),
      eternal: ETERNAL.test(identity.text),
      raw,
    });
  });
  return out;
}

/** One line per distinct card, as DeepSeek sees it: `Name+ ×2 (Type, 1E): text [enchanted …]`. */
export function cardLine(card: DeckCard): string {
  const cost = card.identity.cost === null ? "?" : String(card.identity.cost);
  return `${card.name}${card.count > 1 ? ` ×${card.count}` : ""} (${card.type || "?"}, ${cost}E): ${annotatePlating(truncate(card.text, 110))}${card.enchant ? ` [enchanted ${card.enchant}]` : ""}${card.eternal ? " [Eternal: cannot be removed or transformed]" : ""}`;
}

/* ---- which deck selection an option leads to ----------------------------------------------------- */

/** An option's follow-up: pick `count` card(s) from the deck (up to `count` when `upTo`) for `task`. */
export interface DeckFollowUp {
  task: DeckTask;
  count: number;
  upTo: boolean;
  /** The game text's restriction on the cards (a type, starter cards, Strikes/Defends), when it names one. */
  only?: { type?: string; basic?: boolean; ids?: string[] };
  /** The sentence the follow-up was read from. */
  text: string;
}

const VERBS: [RegExp, DeckTask][] = [
  [/移除|\bremove/i, "remove"],
  [/变化|\btransform/i, "transform"],
  [/附魔|\benchant/i, "enchant"],
  [/升级|\bupgrade/i, "upgrade"],
  [/复制(?!品)|\bduplicate|\bcopy(?! of)/i, "duplicate"],
];

/** A relic's trigger in fights (each turn, whenever, into your hand): an effect later on, not a pick now. */
const LATER_EFFECT = /每回合|每场|在你的回合|回合开始时|战斗开始时|战斗结束时|每当|手牌|whenever|each turn|every turn|each combat|start of (?:your |each )?turn|end of combat|into your hand/i;

/** A sentence that changes cards without a choice: random, all, the whole deck, a named card, the next combat. */
const NO_CHOICE = /随机|所有|全部|整个|每张|被移除|升级过|被升级|初始手牌|你的\s*(?:\d+|一)\s*张打击和|random|\ball\b|\bevery\b|entire|whole|is removed|upgraded cards?/i;

const COUNT_WORDS: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

/** "N张" / "a card" in a sentence, with "至多/up to"; null when it names no count of cards. */
function countIn(sentence: string): { count: number; upTo: boolean } | null {
  const zh = /(至多|最多)?\s*(\d+|[一两二三四五六])\s*张/.exec(sentence);
  if (zh) return { count: Number(zh[2]) || COUNT_WORDS[zh[2]!] || 1, upTo: Boolean(zh[1]) };
  const en = /(up to\s+)?(\d+|a|an|one|two|three|four|five|six)\s+(?:[a-z]+\s+){0,2}cards?\b/i.exec(sentence);
  if (en) return { count: Number(en[2]) || COUNT_WORDS[en[2]!.toLowerCase()] || 1, upTo: Boolean(en[1]) };
  return null;
}

function restrictionIn(sentence: string): DeckFollowUp["only"] | undefined {
  if (/打击.{0,3}或.{0,3}防御|strike or defend/i.test(sentence)) return { basic: true, ids: ["STRIKE_", "DEFEND_"] };
  if (/初始牌|基础|starter|basic/i.test(sentence)) return { basic: true };
  if (/张打击|strikes?\b/i.test(sentence) && !/攻击牌/.test(sentence)) return { ids: ["STRIKE_"] };
  if (/张防御|defends?\b/i.test(sentence)) return { ids: ["DEFEND_"] };
  if (/攻击牌|attack/i.test(sentence)) return { type: "Attack" };
  if (/技能牌|skill/i.test(sentence)) return { type: "Skill" };
  if (/能力牌|power/i.test(sentence)) return { type: "Power" };
  return undefined;
}

/**
 * The deck selection an option's text leads to, or null (none, random, all cards, or cards added from
 * outside the deck). Sentence by sentence: "从你的牌组中选择1张牌移除" -> remove 1; "选择一张攻击牌附魔：锋利2" ->
 * enchant 1 Attack; "从你的牌组中选择3张攻击牌。为这些牌附魔：本能" -> enchant 3 Attack; "随机升级2张牌" -> null.
 */
export function deckFollowUp(description: string): DeckFollowUp | null {
  const text = iconsToText(description).replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
  const sentences = text.split(/[。.!！;；\n]/).map((part) => part.trim()).filter(Boolean);
  for (let i = 0; i < sentences.length; i += 1) {
    const sentence = sentences[i]!;
    const verb = VERBS.find(([pattern]) => pattern.test(sentence));
    if (!verb) continue;
    if (NO_CHOICE.test(sentence) || LATER_EFFECT.test(sentence)) continue;
    // "将1张X加入你的牌组" adds a named card (a card name may hold a verb): no pick from the deck.
    if (/(?:加入|添加)(?:到|至)?你的.{0,4}牌组|add .{0,40} to your deck/i.test(sentence) && !/选择|从你的.{0,4}牌组|from your deck|choose/i.test(sentence)) continue;
    // "为这些牌附魔" / "these cards": the cards were chosen in the sentence before.
    const these = /这些牌|these cards/i.test(sentence) ? sentences[i - 1] ?? "" : "";
    const count = countIn(sentence) ?? (these ? countIn(these) : null);
    if (!count && !/牌|card/i.test(sentence)) continue;
    const only = restrictionIn(these ? `${these} ${sentence}` : sentence);
    return { task: verb[1], count: count?.count ?? 1, upTo: count?.upTo ?? false, ...(only ? { only } : {}), text: these ? `${these}。${sentence}` : sentence };
  }
  return null;
}

/** The deck cards a follow-up can take (the game's own rules: no curse upgrades, no eternal removals). */
export function eligibleCards(cards: DeckCard[], follow: DeckFollowUp): DeckCard[] {
  return cards.filter((card) => {
    const junk = card.type === "Curse" || card.type === "Status";
    if ((follow.task === "upgrade" || follow.task === "enchant" || follow.task === "duplicate") && junk) return false;
    if (follow.task === "upgrade" && card.identity.upgraded) return false;
    if ((follow.task === "remove" || follow.task === "transform") && card.eternal) return false;
    const only = follow.only;
    if (only?.type && card.type !== only.type) return false;
    if (only?.basic && !/^(basic|starter)$/i.test(card.rarity) && !/^(STRIKE|DEFEND|BASH)_?/.test(card.identity.card_id)) return false;
    if (only?.ids && !only.ids.some((prefix) => card.identity.card_id.startsWith(prefix))) return false;
    return true;
  });
}

/**
 * The most cards a deck selection screen lists (deck_upgrade_select, deck_card_select, deck_transform_select): the mod
 * sends the first this many eligible copies, in deck order (index 0-24). 0U96U4D9Z3PP F47: 33 upgradable cards, the
 * screen listed 25; Inferno at deck[36]/[40] was named, silently dropped and re-asked (~130 s), and another card
 * upgraded (fix-queue-v4 #7).
 */
export const SELECTION_SCREEN_CARDS = 25;

/**
 * The eligible cards the selection screen will list (`listed`: a copy among its first SELECTION_SCREEN_CARDS eligible
 * copies in deck order) and those it will not (`unlisted`). Without the deck's own list, every eligible card is listed.
 */
export function selectableCards(state: GameState, cards: DeckCard[], follow: DeckFollowUp): { listed: DeckCard[]; unlisted: DeckCard[]; preview: CardIdentity[] } {
  const eligible = eligibleCards(cards, follow);
  const raws = asArray(asRecord(state.run?.raw)["deck"]).map(asRecord);
  if (raws.length === 0) return { listed: eligible, unlisted: [], preview: eligible.flatMap((card) => Array.from({ length: card.count }, () => card.identity)) };
  const listed = new Set<DeckCard>();
  const preview: CardIdentity[] = [];
  let copies = 0;
  for (const raw of raws) {
    const identity = cardIdentity(raw);
    const card = eligible.find((entry) => sameCard(entry.raw, identity));
    if (!card) continue;
    copies += 1;
    if (copies > SELECTION_SCREEN_CARDS) break;
    listed.add(card);
    preview.push(identity);
  }
  return { listed: eligible.filter((card) => listed.has(card)), unlisted: eligible.filter((card) => !listed.has(card)), preview };
}

/** silent-0272: the observed Silent A10 shop page reordered cards relative to the deck. */
export function unverifiedRemovalPreview(state: GameState): boolean {
  const run = asRecord(state.run?.raw);
  return state.screen === "SHOP" && str(run["character_id"]) === "SILENT" && numOrNull(run["ascension"]) === 10;
}

/** The note on a question whose follow-up screen will not list some eligible cards (none when it lists them all). */
export function unlistedNote(unlisted: DeckCard[], task: DeckTask, unverified = false): Record<string, JsonValue> {
  if (unverified) return {
    selection_screen_prediction: `移除名单尚未现场核实；按牌组顺序预测未列出的牌：${unlisted.map((card) => card.name).join("、") || "无"}。此预测不能证明牌不可选，实际移除页可能重排；进入选牌页后按现场名单核对。`,
  };
  if (unlisted.length === 0) return {};
  return {
    not_on_selection_screen: `the game's ${task} screen lists only the first ${SELECTION_SCREEN_CARDS} eligible cards in deck order; these cannot be picked there: ${unlisted.map((card) => `${card.name}${card.count > 1 ? ` x${card.count}` : ""}`).join(", ")}`,
  };
}

/** The task a CARD_SELECTION screen performs (null: a pick among new cards, or a combat pick). */
export function selectionTask(kind: string, prompt: string): DeckTask | null {
  const text = prompt.replace(/\[[^\]]*\]/g, "");
  if (kind === "deck_upgrade_select") return "upgrade";
  if (kind === "deck_enchant_select") return "enchant";
  if (kind === "deck_transform_select") return "transform";
  if (kind !== "deck_card_select") return null;
  if (/加入|add .* to your deck|抽牌堆顶|top of your draw pile/i.test(text)) return null;
  if (/变化|transform/i.test(text)) return "transform";
  if (/复制|duplicate|copy/i.test(text)) return "duplicate";
  if (/移除|remove/i.test(text)) return "remove";
  return null;
}

/* ---- the card named for the next selection screen ------------------------------------------------- */

/** The deck card(s) a one-shot plan named for the selection screen its action opens. */
export interface PendingPick {
  ref: string;
  runId: string;
  floor: number | null;
  source: "shop" | "rest" | "event";
  task: DeckTask;
  /** Still to select, in order. */
  cards: CardIdentity[];
  names: string[];
  /** The plan step the next selection is. */
  step: number;
  /** Predicted copies, checked against the actual shop removal page before executing the commitment. */
  selectionPreview?: CardIdentity[];
  /**
   * The event page it was named on (eventPage): another page of the event before the selection means the
   * selection did not come (the game resolved it itself), so the card is dropped there.
   */
  page?: string;
}

/** An event page's signature: its id and option titles. */
export function eventPage(state: GameState): string {
  const event = asRecord(state.raw["event"]);
  return `${str(event["event_id"])}|${asArray(event["options"]).map((option) => str(asRecord(option)["title"])).join("|")}`;
}

/** A plan reference: run, floor, screen and a per-run count ("U6RUE7LBUFJF:F22:shop#3"). */
export function nextPlanRef(env: DecisionEnv, kind: string): string {
  const runId = str(env.state.raw["run_id"]);
  const seq = env.screenMemory.planSeq && env.screenMemory.planSeq.runId === runId ? env.screenMemory.planSeq.n : 0;
  return `${runId}:F${env.state.run?.floor ?? "?"}:${kind}#${seq + 1}`;
}

/** Who made plan `ref`, as its steps' rationales name it (DecisionEnv.planMaker; "DeepSeek" without one). */
export function planMakerOf(env: DecisionEnv, ref: string, label: string): string {
  return env.planMaker?.(ref, label) ?? "DeepSeek";
}

/** Marks a plan reference as used (the plan was played). */
export function usePlanRef(memory: ScreenMemory, runId: string): void {
  const seq = memory.planSeq && memory.planSeq.runId === runId ? memory.planSeq.n : 0;
  memory.planSeq = { runId, n: seq + 1 };
}

/** Whether the one-shot flow applies on this screen (BUILD_DECIDER=deepseek, BUILD_ONESHOT not off). */
export function oneshotOn(env: DecisionEnv): boolean {
  return env.buildDecider === "deepseek" && env.oneshot !== "off" && !env.state.in_combat;
}

/** The key a one-shot visit's failure is kept under: the step-by-step questions answer the rest of it. */
export function visitKey(env: DecisionEnv, screen: string): string {
  return `${str(env.state.raw["run_id"])}:${env.state.run?.floor ?? "?"}:${screen}`;
}

export function oneshotFailedHere(env: DecisionEnv, screen: string): boolean {
  return env.screenMemory.oneshotFailed === visitKey(env, screen);
}

/* ---- the upgrade preview -------------------------------------------------------------------------- */

/** A card's rules template rendered with upgraded numbers ({X:diff()}, energy icons, IfUpgraded, InCombat). */
function renderUpgraded(template: string, values: Record<string, number>): string | null {
  let text = template
    .replace(/\{InCombat:[^|]*\|([^{}]*)\}/g, "$1")
    .replace(/\{IfUpgraded:show:([^|{}]*)(?:\|[^{}]*)?\}/g, "$1")
    .replace(/\{(\w+):diff\(\)\}/g, (match, name: string) => (name in values ? String(values[name]) : match))
    .replace(/\{(\w+):energyIcons\((\d*)\)\}/g, (match, name: string, literal: string) => (literal ? "" : name in values ? `${values[name]}点能量` : match));
  text = iconsToText(text).replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
  return /[{}]/.test(text) ? null : text;
}

/**
 * What smithing this card does, "before -> after": the game's text now, and its template with the numbers
 * moved by the logged upgrade differences (knowledge/card-upgrades). The numbers alone when the template
 * does not render; "not in code's upgrade data" for a card never logged both ways.
 */
export function upgradePreview(raw: Record<string, unknown>, knowledge: Knowledge): string {
  const cardId = str(raw["card_id"]);
  const before = iconsToText(str(raw["resolved_rules_text"]) || knowledge.card(cardId)?.description || "").replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
  const upgrade = cardUpgrade(cardId);
  if (!upgrade) return `${before} -> (upgrade not in code's data: see the card's text)`;
  const values: Record<string, number> = {};
  const currentValues: Record<string, number> = {};
  const changes: string[] = [];
  for (const entry of asArray(raw["dynamic_values"]).map(asRecord)) {
    const name = str(entry["name"]);
    const now = numOrNull(entry["current_value"]) ?? numOrNull(entry["base_value"]);
    if (!name || now === null) continue;
    currentValues[name] = now;
    const change = upgrade.vars[name];
    values[name] = change ? now + change[1] - change[0] : now;
    if (change) changes.push(`${name} ${now}->${values[name]}`);
  }
  for (const [name, change] of Object.entries(upgrade.vars)) if (!(name in values)) changes.push(`${name} ${change[0]}->${change[1]}`);
  const cost = numOrNull(raw["energy_cost"]);
  if (upgrade.cost && cost !== null) changes.push(`cost ${cost}->${cost + upgrade.cost[1] - upgrade.cost[0]}`);
  const template = str(raw["rules_text"]);
  let after = template ? renderUpgraded(template, values) : null;
  // P5HT1272P5SB F24/F25, silent-0217: resolved text includes keyword decorations absent from the template.
  // Preserve those decorations only when the current template matches exactly; never copy stale numbers
  // or decorations across an unverified conditional upgrade branch.
  if (after && !template.includes("{IfUpgraded:")) {
    const current = renderUpgraded(template, currentValues);
    const at = current ? before.indexOf(current) : -1;
    if (current && at >= 0) after = before.slice(0, at) + after + before.slice(at + current.length);
    else after = null;
  }
  const numbers = changes.length > 0 ? changes.join(", ") : "text only";
  // Plating's decay said for both stack counts (QBCV838592ZQ F16: Stone Armor smithed as "4 -> 6 block every turn").
  return annotatePlating(after && after !== before ? `${before} -> ${after}${upgrade.cost ? ` (${numbers})` : ""}` : `${before} -> ${numbers}`);
}

/* ---- an option together with the card(s) its follow-up takes -------------------------------------- */

/** How code orders a card for this follow-up in its fallback (a small tie-break inside the option's own score); never shown to DeepSeek. */
export type TargetScore = (card: DeckCard) => { score: number };

/**
 * One option whose action opens a deck selection, as DeepSeek sees it in a one-shot question:
 * - one card to pick: one option per eligible distinct card ("o1:c5"), each with the card (and, for an
 *   upgrade, what the upgrade changes) and our runs' outcome statistics for that card (card_outcome_stats); the
 *   fallback's score is the option's plus a tie-break by code's order of the card (not shown to DeepSeek);
 * - N >= 2 cards (or "up to N"): the option itself, listing the eligible card keys with their outcome statistics;
 *   DeepSeek names them in its answer's "cards" list.
 * Choosing it plays the option's action and names the card(s) for the selection screen (PendingPick). No
 * eligible card: the option as it was (its selection is asked as before).
 */
export function withFollowUp(
  env: DecisionEnv,
  option: PickOption,
  follow: DeckFollowUp,
  cards: DeckCard[],
  ref: string,
  source: PendingPick["source"],
  targetScore: TargetScore,
): PickOption[] {
  // Only the cards the selection screen will list (selectableCards): a card past them could never be selected.
  const { listed: eligible, unlisted } = selectableCards(env.state, cards, follow);
  const cut = unlistedNote(unlisted, follow.task);
  const summary = asRecord(option.summary) as Record<string, JsonValue>;
  const arm = (picked: DeckCard[]): (() => void) => () => {
    usePlanRef(env.screenMemory, str(env.state.raw["run_id"]));
    env.screenMemory.pendingPick = {
      ref,
      runId: str(env.state.raw["run_id"]),
      floor: env.state.run?.floor ?? null,
      source,
      task: follow.task,
      cards: picked.map((card) => card.identity),
      names: picked.map((card) => card.name),
      step: 2,
      ...(source === "event" ? { page: eventPage(env.state) } : {}),
    };
  };
  if (eligible.length === 0) return [planOnly(env, option, ref)];
  if (follow.count === 1 && !follow.upTo) {
    return eligible.map((card, at) => {
      const ranked = targetScore(card);
      const preview = follow.task === "upgrade" ? upgradePreview(card.raw, env.knowledge) : null;
      return {
        ...option,
        key: `${option.key}:${card.key}`,
        label: `${option.label ?? option.key}: ${follow.task} ${card.name}`,
        // The fallback's order: the option's own score leads; code's card order only orders the cards within it.
        score: option.score + ranked.score / 1000,
        summary: {
          ...summary,
          then: `${follow.task} ${card.name}`,
          card: card.name,
          ...(card.count > 1 ? { copies: card.count } : {}),
          ...(preview ? { upgrade: preview } : { card_text: truncate(card.text, 140) }),
          ...(card.enchant ? { enchanted: card.enchant } : {}),
          card_outcome_stats: cardOutcome(card.identity.card_id, env.state.run?.ascension),
          // Said once, on the first card's option.
          ...(at === 0 ? cut : {}),
        },
        plan: () => ({ id: ref, steps: [option.key, card.key], apply: arm([card]), journal: `${option.label ?? option.key}: ${follow.task} ${card.name}` }),
      } satisfies PickOption;
    });
  }
  const byKey = new Map(eligible.map((card) => [card.key, card]));
  return [
    {
      ...option,
      summary: {
        ...summary,
        then: `${follow.task} ${follow.upTo ? "up to " : ""}${follow.count} card(s) from your deck`,
        cards_to_name: `answer "cards": [${follow.upTo ? "up to " : ""}${follow.count} keys from eligible_cards, repeat a key for several copies]`,
        // Each card as it is, and our runs' outcome statistics for it (V4 M2: no code value as a target).
        eligible_cards: Object.fromEntries(eligible.map((card) => [card.key, cardLine(card)])),
        card_outcome_stats: Object.fromEntries(eligible.map((card) => [card.key, cardOutcome(card.identity.card_id, env.state.run?.ascension)])),
        ...cut,
      },
      plan: (answer: PlanAnswer) => {
        const picked: DeckCard[] = [];
        const unnamed = () => planOnly(env, option, ref).plan!({ cards: [] });
        for (const key of answer.cards) {
          const card = byKey.get(key);
          if (!card || picked.filter((entry) => entry === card).length >= card.count) return unnamed();
          picked.push(card);
        }
        const valid = picked.length > 0 && (follow.upTo ? picked.length <= follow.count : picked.length === follow.count);
        if (!valid) return unnamed();
        return { id: ref, steps: [option.key, ...picked.map((card) => card.key)], apply: arm(picked), journal: `${option.label ?? option.key}: ${follow.task} ${picked.map((card) => card.name).join(", ")}` };
      },
    },
  ];
}

/**
 * An option of a one-shot question with no card to name: the plan is the option alone, or the option's own plan
 * (a "discard potion(s), then …" option: the slots its answer names) under the one-shot reference.
 */
export function planOnly(env: DecisionEnv, option: PickOption, ref: string): PickOption {
  const own = option.plan;
  const use = () => usePlanRef(env.screenMemory, str(env.state.raw["run_id"]));
  return {
    ...option,
    plan: (answer: PlanAnswer) => {
      const inner = own?.(answer) ?? null;
      if (inner && "invalid" in inner) return inner;
      if (!inner) return { id: ref, steps: [option.key], apply: use };
      return { ...inner, id: ref, apply: () => (use(), inner.apply?.()) };
    },
  };
}

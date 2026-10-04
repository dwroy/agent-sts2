/**
 * "Discard potion(s), then take this option" where the game lets potions be discarded (an event page, a rest
 * site): an option that gives potions into a belt without room for them loses the extra ones (the reward screen
 * cannot discard), so the decider may free slots first. Code never picks which potions go (Dai: code does not
 * handle potions for the decider): one extra option per such option, and the answer names the slots.
 *
 * - DeepSeek (the decider, or an escalation): the answer's "discard": [potion slot numbers], 1 to `need` of the
 *   slots listed; code checks them and plays the discards, then the option (memory afterDiscard).
 * - Jev (a choice question cannot carry a list): one yes/no question per discardable slot ("discard_p<slot>");
 *   the slots Jev answers yes to (most sure first, at most `need`), else the one it leans to most.
 */

import type { ActionRequest } from "../mod/client.js";
import type { AnswerSet } from "../../reflex/jev/answers.js";
import { noulQ, type QuestionSet } from "../../reflex/jev/questions.js";
import { fillPotionText } from "../../knowledge/potion-values.js";
import type { Decision, DecisionEnv } from "../../memory/types.js";
import { asArray, asRecord, bool, numOrNull, str, type JsonValue } from "../../core/util/json.js";
import type { PickOption, PlanAnswer, PlannedOption } from "./pick.js";

/** A potion that can be discarded here: its belt slot, name and potion id. */
export interface DiscardSlot {
  index: number;
  name: string;
  description: string;
  /** The potion's id (the execution gate checks a later discard still drops this potion). */
  id?: string;
}

/** An option given together with its "discard first" variant: key suffix of the variant. */
export const DISCARD_SUFFIX = ":discard";

/** DeepSeek's note on a question with such variants. */
export const DISCARD_ANSWER_NOTE =
  'A "discard potion(s), then …" option (key ending ":discard") also needs "discard": [potion slot numbers from its discardable_potions] in your answer; code discards those, then takes the option.';

/**
 * The potions the game lets be discarded on this screen (none when discarding is not an available action). The
 * description with its numbers filled (fillPotionText): the mod sends a template (5LRZ7HJ7YGSY F37: 「获得{MaxHp}点
 * 最大生命值」 for Fruit Juice, 「回复你最大生命值的{HealPercent}%」 for Blood Potion in the statue questions).
 */
export function discardableSlots(env: DecisionEnv): DiscardSlot[] {
  const { state } = env;
  if (!state.available_actions.includes("discard_potion")) return [];
  return asArray(asRecord(state.run?.raw)["potions"])
    .map(asRecord)
    .filter((slot) => bool(slot["occupied"]) && bool(slot["can_discard"], true) && numOrNull(slot["index"]) !== null)
    .map((slot) => {
      const id = str(slot["potion_id"]);
      return { index: numOrNull(slot["index"])!, name: str(slot["name"], id), description: fillPotionText(id, str(slot["description"]) || env.knowledge.potion(id)?.description || ""), id };
    });
}

/** A "drink this potion, then take the option" variant's key suffix (":drink<slot>"). */
export const DRINK_SUFFIX = ":drink";

/**
 * The potions that can be drunk on this screen outside a fight (the game's can_use; no target: Fruit Juice, Blood
 * Potion …), none when use_potion is not an available action. Drinking one empties its slot as a discard does.
 */
export function drinkableSlots(env: DecisionEnv): DiscardSlot[] {
  const { state } = env;
  if (state.in_combat || !state.available_actions.includes("use_potion")) return [];
  return asArray(asRecord(state.run?.raw)["potions"])
    .map(asRecord)
    .filter((slot) => bool(slot["occupied"]) && bool(slot["can_use"]) && !bool(slot["requires_target"]) && numOrNull(slot["index"]) !== null)
    .map((slot) => {
      const id = str(slot["potion_id"]);
      return { index: numOrNull(slot["index"])!, name: str(slot["name"], id), description: fillPotionText(id, str(slot["description"]) || env.knowledge.potion(id)?.description || ""), id };
    });
}

/**
 * The "drink <potion> now, then this option" variant (a White Beast Statue move with a full belt: a potion usable on
 * the map frees its slot by being drunk, 5LRZ7HJ7YGSY F37 had only "keep all" / "discard first" and Fruit Juice was
 * discarded). Its value is its option's: code does not rank it. Chosen, it drinks, then takes the option once the slot
 * shows empty (memory afterDiscard, as a discard).
 */
export function drinkVariant(env: DecisionEnv, option: PickOption, then: DiscardThen, slot: DiscardSlot): PickOption {
  const runId = str(env.state.raw["run_id"]);
  const floor = env.state.run?.floor ?? null;
  const summary = option.summary && typeof option.summary === "object" && !Array.isArray(option.summary) ? (option.summary as Record<string, JsonValue>) : { option: option.summary };
  // The option's own one-shot plan would replace the drink as the action played now: a map move has none.
  const { plan: _plan, jev: _jev, ...plain } = option;
  return {
    ...plain,
    key: `${option.key}${DRINK_SUFFIX}${slot.index}`,
    label: `drink ${slot.name}, then ${option.label ?? then.title}`,
    intent: { action: "use_potion", option_index: slot.index },
    why: `${option.why ?? ""}${option.why ? "; " : ""}drinking frees the slot; code does not rank which potions to drink`,
    summary: {
      ...summary,
      drink_first: `drink ${slot.name} (potion slot ${slot.index}) now, on this screen, then this option`,
      potion: `${slot.name}${slot.description ? `: ${slot.description}` : ""}`,
    },
    apply: () => {
      option.apply?.();
      env.screenMemory.afterDiscard = { ...then, runId, floor, at: Date.now(), slot: slot.index, more: [], via: "drink" };
    },
  };
}

/** An option text that gives potion(s) (「获得[blue]1[/blue]瓶随机[gold]罕见药水[/gold]。」). */
export function givesPotion(description: string): boolean {
  return /获得[^。]*药水|(?:gain|obtain)[^.]*potion/i.test(description);
}

/**
 * Potion slots an option's potions need beyond the empty ones: the potions it gives (「获得[blue]3[/blue]瓶…药水」;
 * a potion without a number is one; Tiny Mailbox's rest line 「从小邮箱获得[blue]2[/blue]瓶随机[gold]药水[/gold]」)
 * less the slots it adds (「获得[blue]1[/blue]个药水栏位」, 药瓶皮套) and the empty slots, at most the belt's size
 * (more cannot be kept). 0: nothing is lost.
 */
export function potionSlotsNeeded(description: string, run: Record<string, unknown> | undefined): number {
  if (!givesPotion(description)) return 0;
  const plain = description.replace(/\[\/?[a-z]+\]/g, "");
  const counted = [...plain.matchAll(/获得(\d+)瓶[^。，,]*?药水/g)].reduce((sum, m) => sum + Number(m[1]), 0);
  const english = [...plain.matchAll(/(?:gain|obtain)\s+(\d+)\s[^.]*?potions?/gi)].reduce((sum, m) => sum + Number(m[1]), 0);
  const potions = counted + english > 0 ? counted + english : 1;
  const slotsAdded = [...plain.matchAll(/获得(\d+)个药水栏位|(?:gain|obtain)\s+(\d+)\s+potion slots?/gi)].reduce((sum, m) => sum + Number(m[1] ?? m[2]), 0);
  const belt = asArray(asRecord(run)["potions"]).map(asRecord);
  const empty = belt.filter((slot) => !bool(slot["occupied"])).length;
  return Math.max(0, Math.min(belt.length, potions - slotsAdded - empty));
}

/** Potion slot numbers out of an answer's "discard" field (numbers, or strings such as "1", "p1", "slot 1"). */
export function discardSlotsOf(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const slots = value.flatMap((entry) => {
    if (typeof entry === "number" && Number.isInteger(entry)) return [entry];
    const digits = typeof entry === "string" ? /(\d+)/.exec(entry) : null;
    return digits ? [Number(digits[1])] : [];
  });
  return slots;
}

/** The yes/no question Jev answers for one discardable slot. */
function slotQuestionKey(slot: DiscardSlot): string {
  return `discard_p${slot.index}`;
}

/** Where the option chosen with the discards is taken, once they land. */
export interface DiscardThen {
  /** "rest", or "event:<event id>": the screen the pending option belongs to. */
  place: string;
  /** The option's index on that screen and its title (checked again before it is taken). */
  option: number;
  title: string;
}

/**
 * The "discard, then this option" variant of an option whose potions need `need` slots beyond the empty ones
 * (none when nothing can be discarded here or nothing is lost). The variant's value is its option's: code does
 * not rank which potions go. DeepSeek names the slots in its answer ("discard"), Jev in its per-slot questions.
 */
export function discardVariant(env: DecisionEnv, option: PickOption, then: DiscardThen, need: number, slots: DiscardSlot[]): PickOption | null {
  if (need <= 0 || slots.length === 0) return null;
  const most = Math.min(need, slots.length);
  const runId = str(env.state.raw["run_id"]);
  const floor = env.state.run?.floor ?? null;
  const summary = option.summary && typeof option.summary === "object" && !Array.isArray(option.summary) ? (option.summary as Record<string, JsonValue>) : { option: option.summary };
  const bySlot = new Map(slots.map((slot) => [slot.index, slot]));
  const plan = (answer: PlanAnswer): PlannedOption | { invalid: string } => {
    const chosen = answer.discard ?? [];
    const valid = slots.map((slot) => slot.index).join(", ");
    if (chosen.length === 0) return { invalid: `the answer names no potion slot to discard ("discard": [1 to ${most} of ${valid}])` };
    if (chosen.length > most) return { invalid: `the answer discards ${chosen.length} potions, more than the ${most} needed ("discard": [1 to ${most} of ${valid}])` };
    if (new Set(chosen).size !== chosen.length) return { invalid: `the answer names a potion slot twice (${chosen.join(", ")})` };
    const unknown = chosen.filter((index) => !bySlot.has(index));
    if (unknown.length > 0) return { invalid: `potion slot ${unknown.join(", ")} cannot be discarded here (discardable: ${valid})` };
    const [first, ...more] = chosen;
    const names = chosen.map((index) => bySlot.get(index)!.name).join(" and ");
    return {
      id: `${option.key}${DISCARD_SUFFIX}`,
      steps: [...chosen.map((index) => `discard potion slot ${index}`), option.key],
      intent: { action: "discard_potion", option_index: first! },
      apply: () => {
        // The potions the later discards drop, as the answer saw them (the gate checks each slot still holds it).
        const moreIds = more.map((index) => bySlot.get(index)?.id ?? "");
        env.screenMemory.afterDiscard = { ...then, runId, floor, at: Date.now(), slot: first!, more, ...(moreIds.some((id) => id !== "") ? { moreIds } : {}) };
      },
      journal: `discarded ${names}, then ${then.title}`,
    };
  };
  const listed = Object.fromEntries(slots.map((slot) => [String(slot.index), `${slot.name}${slot.description ? `: ${slot.description}` : ""}`]));
  return {
    ...option,
    key: `${option.key}${DISCARD_SUFFIX}`,
    label: `discard potion(s), then ${option.label ?? then.title}`,
    // Stands in until the answer names the slots (plan gives the real first discard).
    intent: { action: "discard_potion", option_index: slots[0]!.index },
    why: option.why?.includes("code does not rank which potions to discard") ? option.why : `${option.why ?? ""}${option.why ? "; " : ""}code does not rank which potions to discard`,
    summary: {
      ...summary,
      discard_first: `discard 1 to ${most} of discardable_potions (by potion slot number) now to free slot(s), then this option: answer "discard": [potion slot numbers]; Jev: the discard_p<slot> questions`,
      discardable_potions: listed,
    },
    plan,
    jev: {
      questions: Object.fromEntries(
        slots.map((slot) => [
          slotQuestionKey(slot),
          noulQ(`The potion slots are full. Only if your pick is a "discard potion(s), then …" option: is potion slot ${slot.index} (${slot.name}) one of those you discard? Yes = discard it.`),
        ]),
      ),
      answer: (answers: AnswerSet): PlanAnswer => ({ cards: [], discard: jevDiscards(answers, slots, most) }),
    },
  };
}

/**
 * Jev's slots, from its per-slot yes/no answers: those at 0.5 or more, most sure first, at most `most`; none
 * above 0.5 (it chose to discard but said no to every slot): the slot it leaned to most. Its answers rank them.
 */
function jevDiscards(answers: AnswerSet, slots: DiscardSlot[], most: number): number[] {
  const scored = slots
    .map((slot) => {
      const answer = answers[slotQuestionKey(slot)];
      return { index: slot.index, p: answer && answer.type === "noul" ? answer.noul : 0 };
    })
    .sort((a, b) => b.p - a.p || a.index - b.index);
  const yes = scored.filter((entry) => entry.p >= 0.5).slice(0, most);
  return (yes.length > 0 ? yes : scored.slice(0, 1)).map((entry) => entry.index);
}

/** The Jev questions the options carry beyond the pick (the per-slot discard questions), merged. */
export function optionQuestions(options: PickOption[]): QuestionSet {
  return Object.assign({}, ...options.map((option) => option.jev?.questions ?? {})) as QuestionSet;
}

/** How long the option chosen with a discard waits for the discard to show on the belt. */
export const AFTER_DISCARD_WAIT_MS = 4_000;

/** The potion slot with this index is empty (slots keep their index: 3SBP F15 slot 0 discarded, slot 1 stayed 1). */
function slotEmpty(run: Record<string, unknown> | undefined, index: number): boolean {
  const slot = asArray(asRecord(run)["potions"]).map(asRecord).find((entry) => numOrNull(entry["index"]) === index);
  return slot !== undefined && !bool(slot["occupied"]);
}

/**
 * The rest of an option chosen with discards, on the screen it belongs to (`place`): the next discard once the
 * last one landed, then the option (`take` builds its action when it is still offered with that title). undefined
 * when nothing is pending here; null while a discard has not landed yet (wait).
 */
export function continueAfterDiscard(env: DecisionEnv, place: string, labelPrefix: string, take: (option: number, title: string) => ActionRequest | null): Decision | null | undefined {
  const pending = env.screenMemory.afterDiscard;
  if (!pending) return undefined;
  const { state } = env;
  const here = pending.place === place && pending.runId === str(state.raw["run_id"]) && pending.floor === (state.run?.floor ?? null);
  if (!here) {
    env.screenMemory.afterDiscard = undefined;
    return undefined;
  }
  const landed = pending.slot === undefined || slotEmpty(state.run?.raw, pending.slot);
  // The discard not landed yet: wait a moment for it, then ask afresh.
  if (!landed && Date.now() - pending.at < AFTER_DISCARD_WAIT_MS) return null;
  // More slots chosen to free (an option giving several potions): the next discard.
  const [nextSlot, ...more] = pending.more ?? [];
  const [nextId, ...moreIds] = pending.moreIds ?? [];
  if (landed && nextSlot !== undefined && state.available_actions.includes("discard_potion")) {
    const { moreIds: _ids, ...kept } = pending;
    env.screenMemory.afterDiscard = { ...kept, slot: nextSlot, more, at: Date.now(), ...(pending.moreIds ? { moreIds } : {}) };
    // The potion chosen for this slot when the option was decided: another one there is refused by the gate.
    const intent: ActionRequest = nextId ? { action: "discard_potion", option_index: nextSlot, expect: { potion: { id: nextId } } } : { action: "discard_potion", option_index: nextSlot };
    return { kind: "act", label: `${labelPrefix}/discard-more`, intent, rationale: `freeing potion slot ${nextSlot} too before ${pending.title}, as chosen with the discards` };
  }
  env.screenMemory.afterDiscard = undefined;
  const intent = landed ? take(pending.option, pending.title) : null;
  if (!intent) return undefined;
  return { kind: "act", label: `${labelPrefix}/after-${pending.via ?? "discard"}`, intent, rationale: `the potion slot(s) are free: taking ${pending.title}, as chosen with the ${pending.via === "drink" ? "drink" : "discards"}` };
}

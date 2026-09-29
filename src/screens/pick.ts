/**
 * Shared builder for the "choose one of these" screens (PLAN.md §6.2–§6.7).
 *
 * Every non-combat screen is the same shape: code builds a small list of legal options with the
 * numbers already worked out, Jev picks one, and a confidence gate decides whether to trust it or
 * fall back to the code-side score.
 */

import type { ActionRequest } from "../mod/client.js";
import { choiceQ, type QuestionSet } from "../jev/questions.js";
import type { Decision, ResolvedAction } from "../project/types.js";
import { asArray, asRecord, type JsonValue } from "../util/json.js";

export interface PickOption {
  key: string;
  intent: ActionRequest;
  /** What Jev sees as the option's description. Objects are fine (PLAN.md §2.2). */
  summary: JsonValue;
  /** Used only when we fall back, or when Jev's answer is unusable. Higher is better. */
  score: number;
  /** Shown in the rationale when this option wins. */
  label?: string;
  /** Extra facts for DeepSeek's view of this option (BUILD_DECIDER=deepseek); Jev's question is unchanged. */
  facts?: Record<string, JsonValue>;
  /** Why code scores the option as it does (DeepSeek's view); the summary's own `why` when absent. */
  why?: string;
  /** Memory effect when DeepSeek's choice of this option is played (the route plan). */
  apply?: () => void;
  /**
   * One-shot (BUILD_ONESHOT): what DeepSeek's choice of this option plans beyond its own action (the deck
   * card(s) the next screen takes, the act's route), given the answer's `cards` list and `route` key; null
   * when it plans nothing more; `invalid` when the answer lacks what the option needs (the answer is then
   * unusable and the loop falls back).
   */
  plan?: (answer: PlanAnswer) => PlannedOption | { invalid: string } | null;
}

/** The parts of a one-shot answer beyond its option key. */
export interface PlanAnswer {
  cards: string[];
  route?: string;
}

/** What a one-shot option plans: its reference, steps, memory effect and run-journal text. */
export interface PlannedOption {
  id: string;
  steps: JsonValue;
  apply?: () => void;
  journal?: string;
}

export interface PickDecisionParams {
  label: string;
  instructions: string;
  state: Record<string, JsonValue>;
  options: PickOption[];
  actThreshold: number;
  extras?: QuestionSet;
  /** A code-chosen option used when the model is not needed at all (e.g. only one option). */
  skipModelWhenSingle?: boolean;
  /** Trust the model's choice regardless of confidence (config `strictJev`). */
  strictJev: boolean;
  /**
   * Phase 2: when the code score of the best option beats the runner-up by at least this much, code
   * decides and the model is not asked. Otherwise only the top `maxModelOptions` are shown.
   */
  codeMargin?: number;
  maxModelOptions?: number;
  /** Escalate to DeepSeek when Jev's confidence on the pick is below this. */
  escalateBelow?: number;
  /**
   * BUILD_DECIDER=deepseek: DeepSeek decides among every option (no code margin, no trimming), shown with
   * code's value and why, and these run facts. The decision without it is kept as the fallback.
   */
  deepseek?: {
    facts: Record<string, JsonValue>;
    note?: string;
    baseline?: Decision;
    onFail?: () => void;
    /** A one-shot question: an unusable answer re-plans into the step-by-step questions (AskDecision.deepseek.oneshot). */
    oneshot?: { fallback: () => void };
    offeredCards?: string[];
  };
}

export function bestOption(options: PickOption[]): PickOption {
  return options.reduce((a, b) => (b.score > a.score ? b : a));
}

export function buildPickDecision(params: PickDecisionParams): Decision {
  const { options, actThreshold } = params;
  if (options.length === 0) throw new Error(`pick decision with no options: ${params.label}`);

  if (params.deepseek && options.length > 1) return deepseekPick(params, params.deepseek);

  if (options.length === 1 && params.skipModelWhenSingle !== false) {
    const only = options[0] as PickOption;
    return {
      kind: "act",
      label: params.label,
      intent: only.intent,
      rationale: `only one legal option: ${only.label ?? only.key}`,
    };
  }

  if (params.codeMargin !== undefined && options.length > 1) {
    const ranked = [...options].sort((a, b) => b.score - a.score);
    const top = ranked[0] as PickOption;
    const second = ranked[1] as PickOption;
    // Identical cards (e.g. two unupgraded Strikes to remove) tie on score but are the same choice.
    const sameThing = top.label !== undefined && top.label === second.label && top.score === second.score;
    if (top.score - second.score >= params.codeMargin || sameThing) {
      return {
        kind: "act",
        label: params.label,
        intent: top.intent,
        // The winner's reasons (card value, run plan, boss clock) so a bonus can be traced in the log.
        rationale: `code: ${top.label ?? top.key} scores ${top.score} vs ${second.label ?? second.key} ${second.score}${whyOf(top)}`,
      };
    }
    if (params.maxModelOptions !== undefined && ranked.length > params.maxModelOptions) {
      // Keep the "take nothing" option in view even when it ranks low: skipping is always a real choice.
      const keep = ranked.slice(0, params.maxModelOptions);
      for (const option of ranked) {
        if ((option.key === "skip" || option.key === "leave") && !keep.includes(option)) keep.push(option);
      }
      return buildPickDecision({ ...params, codeMargin: undefined, options: keep });
    }
  }

  const byKey = new Map(options.map((option) => [option.key, option]));
  const criteria: Record<string, string | null> = {};
  for (const option of options) {
    criteria[option.key] = typeof option.summary === "string" ? option.summary : JSON.stringify(option.summary);
  }

  return {
    kind: "ask",
    label: params.label,
    state: params.state,
    questions: { pick: choiceQ(params.instructions, criteria), ...(params.extras ?? {}) },
    ...(params.escalateBelow === undefined ? {} : { escalate: { question: "pick", below: params.escalateBelow, why: params.label } }),
    resolve(answers): ResolvedAction {
      const answer = answers["pick"];
      const fallback = (why: string, confidence: number | null): ResolvedAction => {
        const choice = bestOption(options);
        return {
          intent: choice.intent,
          rationale: `${why}; deterministic fallback chose ${choice.label ?? choice.key}`,
          confidence,
          fallback: true,
        };
      };

      if (params.strictJev) {
        if (!answer || answer.type !== "choice") {
          return {
            intent: null,
            rationale: "no usable answer from Jev (trust-jev: waiting to ask again instead of choosing in code)",
            confidence: null,
            fallback: false,
          };
        }
        const trusted = byKey.get(answer.choice);
        if (!trusted) {
          return {
            intent: null,
            rationale: `Jev chose unknown option "${answer.choice}" (trust-jev: waiting to ask again instead of choosing in code)`,
            confidence: answer.confidence,
            fallback: false,
          };
        }
        return {
          intent: trusted.intent,
          rationale: `Jev chose ${trusted.label ?? trusted.key} with confidence ${answer.confidence.toFixed(2)}`,
          confidence: answer.confidence,
          fallback: false,
        };
      }

      if (!answer || answer.type !== "choice") return fallback("no usable answer from Jev", null);
      const chosen = byKey.get(answer.choice);
      if (!chosen) return fallback(`Jev chose unknown option "${answer.choice}"`, answer.confidence);
      if (answer.confidence < actThreshold) {
        return fallback(`confidence ${answer.confidence.toFixed(2)} is below the act threshold`, answer.confidence);
      }
      return {
        intent: chosen.intent,
        rationale: `Jev chose ${chosen.label ?? chosen.key} with confidence ${answer.confidence.toFixed(2)}`,
        confidence: answer.confidence,
        fallback: false,
      };
    },
  };
}

/** " (why: …)" from an option's summary, when it carries a `why`. */
function whyOf(option: PickOption): string {
  const summary = option.summary;
  const why = summary && typeof summary === "object" && !Array.isArray(summary) ? (summary as Record<string, unknown>)["why"] : null;
  return typeof why === "string" && why ? ` (why: ${why})` : "";
}

/** DeepSeek's instructions on a screen it decides (it is the decider here, not a reviewer). */
export const DEEPSEEK_DECIDES_NOTE =
  "You decide this yourself; no other model is asked first. Each option carries code's value and why (a heuristic score: " +
  "advice, not an order; higher is better, 0 or the skip/leave line is the bar). facts are exact: the deck, relics, potions, " +
  "HP, gold, the act boss clock (damage a turn needed vs this deck's estimate) and your own run plan. Weigh them for the whole run.";

/**
 * The DeepSeek-decided form of a pick (BUILD_DECIDER=deepseek): every option, with code's score and why
 * in its criteria and the run facts in the state; resolves the same way as the Jev question.
 */
function deepseekPick(params: PickDecisionParams, deepseek: NonNullable<PickDecisionParams["deepseek"]>): Decision {
  const baseline = deepseek.baseline ?? buildPickDecision({ ...params, deepseek: undefined });
  const byKey = new Map(params.options.map((option) => [option.key, option]));
  const ranked = [...params.options].sort((a, b) => b.score - a.score);
  const criteria: Record<string, string | null> = {};
  for (const option of params.options) {
    const summary = option.summary && typeof option.summary === "object" && !Array.isArray(option.summary) ? (option.summary as Record<string, JsonValue>) : { option: option.summary };
    const why = option.why ?? (typeof summary["why"] === "string" ? summary["why"] : null);
    criteria[option.key] = JSON.stringify({
      ...summary,
      code_value: Number(option.score.toFixed(2)),
      code_rank: ranked.indexOf(option) + 1,
      ...(why ? { why } : {}),
      ...(option.facts ?? {}),
    });
  }
  const instructions = `${params.instructions} ${DEEPSEEK_DECIDES_NOTE}${deepseek.note ? ` ${deepseek.note}` : ""}`;
  return {
    kind: "ask",
    label: params.label,
    state: { ...params.state, facts: deepseek.facts },
    questions: { pick: choiceQ(instructions, criteria) },
    deepseek: {
      question: "pick",
      baseline,
      ...(deepseek.onFail ? { onFail: deepseek.onFail } : {}),
      ...(deepseek.oneshot ? { oneshot: deepseek.oneshot } : {}),
      ...(deepseek.offeredCards && deepseek.offeredCards.length > 0 ? { offeredCards: deepseek.offeredCards } : {}),
    },
    resolve(answers): ResolvedAction {
      const answer = answers["pick"];
      const chosen = answer && answer.type === "choice" ? byKey.get(answer.choice) : undefined;
      if (!chosen) {
        // Not reached through the loop (it plays the baseline when DeepSeek has no usable answer).
        const best = bestOption(params.options);
        return { intent: best.intent, rationale: `no usable DeepSeek answer; code chose ${best.label ?? best.key}`, confidence: null, fallback: true };
      }
      // A one-shot option names what its follow-up takes: the answer's `cards` and `route` ride in its raw.
      const raw = asRecord(answer?.raw);
      const cards = asArray(raw["cards"]).filter((card): card is string => typeof card === "string");
      const route = typeof raw["route"] === "string" ? raw["route"] : undefined;
      const outcome = chosen.plan?.({ cards, ...(route ? { route } : {}) }) ?? null;
      if (outcome && "invalid" in outcome) {
        return { intent: null, rationale: `DeepSeek chose ${chosen.label ?? chosen.key}, but ${outcome.invalid}`, confidence: null, fallback: true };
      }
      const planned = outcome;
      const apply = chosen.apply || planned?.apply ? (): void => (chosen.apply?.(), planned?.apply?.()) : undefined;
      return {
        intent: chosen.intent,
        rationale: `DeepSeek chose ${chosen.label ?? chosen.key} (code value ${Number(chosen.score.toFixed(2))}, rank ${ranked.indexOf(chosen) + 1} of ${ranked.length})`,
        confidence: answer && answer.type === "choice" ? answer.confidence : null,
        fallback: false,
        decider: "deepseek",
        ...(apply ? { apply } : {}),
        ...(planned ? { plan: { id: planned.id, steps: planned.steps } } : {}),
        ...(planned?.journal ? { journal: planned.journal } : {}),
      };
    },
  };
}

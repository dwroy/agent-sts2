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
import type { JsonValue } from "../util/json.js";

export interface PickOption {
  key: string;
  intent: ActionRequest;
  /** What Jev sees as the option's description. Objects are fine (PLAN.md §2.2). */
  summary: JsonValue;
  /** Used only when we fall back, or when Jev's answer is unusable. Higher is better. */
  score: number;
  /** Shown in the rationale when this option wins. */
  label?: string;
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
}

export function bestOption(options: PickOption[]): PickOption {
  return options.reduce((a, b) => (b.score > a.score ? b : a));
}

export function buildPickDecision(params: PickDecisionParams): Decision {
  const { options, actThreshold } = params;
  if (options.length === 0) throw new Error(`pick decision with no options: ${params.label}`);

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
        rationale: `code: ${top.label ?? top.key} scores ${top.score} vs ${second.label ?? second.key} ${second.score}`,
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

/**
 * Shared builder for the "choose one of these" screens (PLAN.md §6.2–§6.7).
 *
 * Every non-combat screen is the same shape: code builds the legal options with their facts worked
 * out (code_value, why, a reference rank), DeepSeek's guidance for the topic rides along, and Jev
 * picks (Dai 2026-09-28: DeepSeek sets strategy and tempo, code gives facts, Jev decides). Code acts
 * alone only on a single option, or when every other option is dominated on every fact (an identical
 * duplicate, or an option a screen marks `dominatedBy`). `codeMargin` is kept for in-combat mechanics
 * screens only (exhaust picks), never for build, route, rest, shop or event choices.
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
  /** Kept among the model's options when the list is pruned to `maxModelOptions`, like skip/leave. */
  keepInView?: boolean;
  /**
   * How this option differs from DeepSeek's tempo/strategy guidance (intent.ts): Jev picking it is logged
   * as `differs_from_tempo` (a fact, never enforced or judged).
   */
  differsFromTempo?: string;
  /** Code's reasons for its value (shown as `why` when the summary has none). */
  why?: string;
  /**
   * Another option is at least as good on every fact this one has, and better on one: dropped (while
   * another option is left), so a lone survivor is acted on without asking.
   */
  dominatedBy?: string;
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
   * In-combat mechanics screens only (exhaust picks): when the code score of the best option beats the
   * runner-up by at least this much, code decides. Build, route, rest, shop and event screens never pass
   * it: Jev decides those (the reference rank is a fact on each option).
   */
  codeMargin?: number;
  /** DeepSeek's guidance relevant to this question (run/fight plan excerpt), shown to Jev and logged. */
  guidance?: string[];
  maxModelOptions?: number;
  /** Escalate to DeepSeek when Jev's confidence on the pick is below this. */
  escalateBelow?: number;
  /** The run plan version in force (picks that differ from its guidance are logged per version). */
  planVersion?: number | null;
}

export function bestOption(options: PickOption[]): PickOption {
  return options.reduce((a, b) => (b.score > a.score ? b : a));
}

/** What Jev is told about who does what (every question carries it). */
export const ROLE_NOTE =
  "Roles: you decide. DeepSeek's strategy and tempo (deepseek_guidance / strategy: potion timing and holding, heal vs smith, elite appetite, deck direction) is guidance. Code gives facts and a reference rank (code_value, code_rank, why); the rank is computed by rules and can be wrong. Weigh both and pick what you judge best for winning the run; a pick that differs from the reference or from DeepSeek's tempo is logged as a fact, not as a mistake.";

/** Options ranked by code score (rank 1 = code's reference), ties in list order. */
function referenceRanks(options: PickOption[]): Map<PickOption, number> {
  const ranked = [...options].sort((a, b) => b.score - a.score);
  return new Map(ranked.map((option, index) => [option, index + 1]));
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** The option summary with code's facts: code_value, code_rank (1 = reference) and why. */
function annotated(option: PickOption, rank: number): JsonValue {
  const summary = option.summary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return summary;
  const record = summary as Record<string, JsonValue>;
  return {
    ...record,
    ...(record["code_value"] === undefined ? { code_value: round1(option.score) } : {}),
    code_rank: rank,
    ...(record["why"] === undefined || record["why"] === null ? { why: option.why ?? null } : {}),
  };
}

export function buildPickDecision(params: PickDecisionParams): Decision {
  const { actThreshold } = params;
  if (params.options.length === 0) throw new Error(`pick decision with no options: ${params.label}`);
  // Dominated options go while another is left; identical duplicates (two plain Strikes to remove) are
  // one choice.
  const undominated = params.options.filter((option) => option.dominatedBy === undefined);
  const pool = undominated.length > 0 ? undominated : params.options;
  const options = pool.filter(
    (option, index) => option.label === undefined || !pool.some((other, at) => at < index && other.label === option.label && other.score === option.score),
  );
  const dropped = params.options.filter((option) => !options.includes(option));

  if (options.length === 1 && params.skipModelWhenSingle !== false) {
    const only = options[0] as PickOption;
    const why = dropped.length > 0
      ? `every other option is dominated (${dropped.map((option) => `${option.label ?? option.key}${option.dominatedBy ? `: ${option.dominatedBy}` : ": identical"}`).join("; ")})`
      : "only one legal option";
    return {
      kind: "act",
      label: params.label,
      intent: only.intent,
      rationale: `${why}: ${only.label ?? only.key}`,
    };
  }

  if (params.codeMargin !== undefined && options.length > 1) {
    const ranked = [...options].sort((a, b) => b.score - a.score);
    const top = ranked[0] as PickOption;
    const second = ranked[1] as PickOption;
    if (top.score - second.score >= params.codeMargin) {
      return {
        kind: "act",
        label: params.label,
        intent: top.intent,
        rationale: `code: ${top.label ?? top.key} scores ${top.score} vs ${second.label ?? second.key} ${second.score}${whyOf(top)}`,
      };
    }
  }
  if (params.maxModelOptions !== undefined && options.length > params.maxModelOptions) {
    // Keep the "take nothing" option in view even when it ranks low: skipping is always a real choice.
    const ranked = [...options].sort((a, b) => b.score - a.score);
    const keep = ranked.slice(0, params.maxModelOptions);
    for (const option of ranked) {
      if ((option.key === "skip" || option.key === "leave" || option.keepInView) && !keep.includes(option)) keep.push(option);
    }
    return buildPickDecision({ ...params, maxModelOptions: undefined, codeMargin: undefined, options: keep });
  }

  const ranks = referenceRanks(options);
  const byKey = new Map(options.map((option) => [option.key, option]));
  const criteria: Record<string, string | null> = {};
  for (const option of options) {
    const summary = annotated(option, ranks.get(option) ?? 0);
    criteria[option.key] = typeof summary === "string" ? summary : JSON.stringify(summary);
  }
  const guidance = (params.guidance ?? []).filter(Boolean);
  const reference = (chosen: PickOption): NonNullable<ResolvedAction["reference"]> => {
    const top = [...ranks.entries()].find(([, rank]) => rank === 1)?.[0];
    return { rank: ranks.get(chosen) ?? null, of: options.length, top: top?.key ?? null, matched: ranks.get(chosen) === 1 };
  };

  return {
    kind: "ask",
    label: params.label,
    state: { ...params.state, roles: ROLE_NOTE, ...(guidance.length > 0 ? { deepseek_guidance: guidance } : {}) },
    questions: { pick: choiceQ(params.instructions, criteria), ...(params.extras ?? {}) },
    ...(guidance.length > 0 ? { guidance } : {}),
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
          rationale: `Jev chose ${trusted.label ?? trusted.key} with confidence ${answer.confidence.toFixed(2)}; code rank ${ranks.get(trusted) ?? "?"}/${options.length}`,
          confidence: answer.confidence,
          fallback: false,
          reference: reference(trusted),
          ...tempoDiffOf(trusted, params.planVersion),
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
        rationale: `Jev chose ${chosen.label ?? chosen.key} with confidence ${answer.confidence.toFixed(2)}; code rank ${ranks.get(chosen) ?? "?"}/${options.length}`,
        confidence: answer.confidence,
        fallback: false,
        reference: reference(chosen),
        ...tempoDiffOf(chosen, params.planVersion),
      };
    },
  };
}

function tempoDiffOf(option: PickOption, version: number | null | undefined): Pick<ResolvedAction, "tempoDiff"> {
  return option.differsFromTempo ? { tempoDiff: { guidance: option.differsFromTempo, runPlanVersion: version ?? null } } : {};
}

/** " (why: …)" from an option's summary, when it carries a `why`. */
function whyOf(option: PickOption): string {
  const summary = option.summary;
  const why = summary && typeof summary === "object" && !Array.isArray(summary) ? (summary as Record<string, unknown>)["why"] : null;
  return typeof why === "string" && why ? ` (why: ${why})` : "";
}

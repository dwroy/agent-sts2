/**
 * Typed question specs in the wire shape of `POST /v1/systemone` (PLAN.md §2.2).
 *
 * They are declared locally rather than imported from the SDK so the decision layer can build and
 * test them without the SDK in the loop, and so the exact request body is visible in the log.
 */

export interface ChoiceQuestionSpec {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
}

export interface NoulQuestionSpec {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
}

export interface ScoreQuestionSpec {
  type: "score";
  instructions: string;
  criteria: string[];
}

export type QuestionSpec = ChoiceQuestionSpec | NoulQuestionSpec | ScoreQuestionSpec;
export type QuestionSet = Record<string, QuestionSpec>;

export function choiceQ(instructions: string, criteria: Record<string, string | null>): ChoiceQuestionSpec {
  return { type: "choice", instructions, criteria };
}

export function noulQ(instructions: string, criteria?: { true?: string; false?: string }): NoulQuestionSpec {
  return criteria ? { type: "noul", instructions, criteria } : { type: "noul", instructions };
}

export function scoreQ(instructions: string, levels: string[]): ScoreQuestionSpec {
  if (levels.length < 2) throw new Error("a score question needs at least two levels");
  return { type: "score", instructions, criteria: levels };
}

/**
 * The documented limit is 255 options per Choice. Crossing it silently would yield an API error, so
 * creators should call this before sending and trim the option set in code instead.
 */
export const MAX_CHOICE_OPTIONS = 255;

export function assertChoiceSize(instructions: string, criteria: Record<string, unknown>): void {
  const size = Object.keys(criteria).length;
  if (size === 0) throw new Error(`choice question has no options: ${instructions}`);
  if (size > MAX_CHOICE_OPTIONS) {
    throw new Error(`choice question has ${size} options, above the ${MAX_CHOICE_OPTIONS} limit: ${instructions}`);
  }
}

/** Normalising the answers map into discriminated unions, defensively (the reply is external data). */

import { asRecord, num, str } from "../../core/util/json.js";

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
  raw: unknown;
}

export interface NoulAnswer {
  type: "noul";
  noul: number;
  raw: unknown;
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
  raw: unknown;
}

export type Answer = ChoiceAnswer | NoulAnswer | ScoreAnswer;
export type AnswerSet = Record<string, Answer>;

function numberMap(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, entry] of Object.entries(asRecord(value))) {
    if (typeof entry === "number" && Number.isFinite(entry)) out[key] = entry;
  }
  return out;
}

function stringMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(asRecord(value))) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

export function readAnswers(raw: unknown): AnswerSet {
  const answers: AnswerSet = {};
  for (const [key, entry] of Object.entries(asRecord(raw))) {
    const obj = asRecord(entry);
    const probabilities = numberMap(obj["probabilities"]);
    // The answer's own `type` is authoritative; fall back to the shape when it is absent.
    const declared = str(obj["type"]);
    const type = declared || (obj["noul"] !== undefined ? "noul" : obj["choice"] !== undefined ? "choice" : "score");
    if (type === "noul") {
      answers[key] = { type: "noul", noul: num(obj["noul"]), raw: entry };
    } else if (type === "choice") {
      answers[key] = {
        type: "choice",
        choice: str(obj["choice"]),
        probabilities,
        confidence: num(obj["confidence"]),
        raw: entry,
      };
    } else {
      answers[key] = {
        type: "score",
        score: num(obj["score"]),
        legend: stringMap(obj["legend"]),
        probabilities,
        confidence: num(obj["confidence"]),
        raw: entry,
      };
    }
  }
  return answers;
}

/** The single option that should win, plus the runner-up, for margin-based tie-breaking. */
export function topAlternatives(answer: ChoiceAnswer, limit: number): { option: string; probability: number }[] {
  return Object.entries(answer.probabilities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([option, probability]) => ({ option, probability }));
}

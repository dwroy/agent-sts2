/** Offline draft validation only; never writes or promotes knowledge. */
import { array, enumeration, id, literal, nullable, number, object, text, validate, type Result } from "./schema.js";
import { characterSchema, observationSchema, reflexVocabSchema, type Character } from "./formats.js";
import { directionFile, reflexFile } from "./knowledge.js";
import type { Predicate } from "./predicate.js";
const coverage = array(object({ experience_id: id, status: enumeration("converted", "partial", "text_only", "disputed"),
  reflex_ids: array(id), directions: array(id), reason: text(4000) }));
const metric = object({ reflex_id: id, n: number(1, 1_000_000, true), method: text(4000), design: enumeration("observational", "paired"),
  effect_size: nullable(number()), se: nullable(number(0)), frequency: object({ n: number(0, 1_000_000, true), total: number(1, 1_000_000, true) }),
  evidence: array(observationSchema, 1) });
const reflexDraft = object({ schema: literal("v6-reflex-draft-v1"), character: characterSchema, vocab: reflexVocabSchema, reflex: reflexFile,
  coverage, metrics: array(metric), missing_fields: array(object({ field: text(), purpose: text(4000), evidence: array(observationSchema, 1) })), limitations: array(text(4000)) });
const directionDraft = object({ schema: literal("v6-direction-draft-v1"), character: characterSchema, cards: directionFile, coverage, limitations: array(text(4000)) });
export interface DraftContext { character: Character; experienceIds: readonly string[]; directionIds: readonly string[]; runIds: readonly string[] }
/** Context comes from frozen inputs, not a list invented by the draft author. */
export function validateV6Draft(kind: "reflex" | "directions", raw: unknown, context: DraftContext): Result<unknown> {
  const issues: string[] = [];
  const result = kind === "reflex" ? validate(reflexDraft, raw) : validate(directionDraft, raw);
  if (!result.ok) return result;
  const v = result.value;
  if (v.character !== context.character) issues.push("draft character mismatch");
  const exact = (actual: string[], expected: readonly string[], name: string): void => {
    if (new Set(actual).size !== actual.length || actual.length !== expected.length || expected.some(x => !actual.includes(x))) issues.push(`${name}: exact unique coverage required`);
  };
  exact(v.coverage.map(c => c.experience_id), context.experienceIds, "experience coverage");
  const directions = new Set(context.directionIds), experiences = new Set(context.experienceIds);
  const reflexIds = new Set("reflex" in v ? v.reflex.entries.map(r => r.id) : []);
  for (const row of v.coverage) {
    if (row.directions.some(d => !directions.has(d))) issues.push(`${row.experience_id}: unknown direction`);
    if (kind === "reflex" && row.reflex_ids.some(r => !reflexIds.has(r))) issues.push(`${row.experience_id}: unknown reflex`);
    if (kind === "reflex" && ["converted", "partial"].includes(row.status) && !row.reflex_ids.length) issues.push(`${row.experience_id}: conversion needs a reflex reference`);
  }
  if ("cards" in v) {
    if (v.cards.character !== context.character) issues.push("cards character mismatch");
    if (v.cards.entries.some(c => !directions.has(c.id))) issues.push("cards: catalog changes need a separate proposal");
  } else {
    if (v.vocab.character !== context.character || v.reflex.character !== context.character) issues.push("reflex/vocab character mismatch");
    const tags = new Set(Object.values(v.vocab.dimensions).flat().map(t => t.id));
    function checkTags(p: Predicate): void {
      if (p.op === "and" || p.op === "or") p.args.forEach(checkTags);
      else if (p.op === "not" || p.op === "any" || p.op === "all") checkTags(p.arg);
      else if ("value" in p && p.op === "contains" && ["card.tags", "potion.tags"].includes(p.field)
        && !tags.has(String(p.value))) issues.push("predicate: unknown vocabulary tag");
    }
    for (const r of v.reflex.entries) {
      if (r.source_experience.some(e => !experiences.has(e))) issues.push(`${r.id}: unknown source experience`);
      if (r.directions?.some(d => !directions.has(d))) issues.push(`${r.id}: unknown direction`);
      if (r.signal.kind === "tag" && !tags.has(r.signal.value)) issues.push(`${r.id}: unknown tag`);
      for (const e of r.source_experience) if (!v.coverage.find(c => c.experience_id === e)?.reflex_ids.includes(r.id)) issues.push(`${r.id}: source coverage link missing`);
      checkTags(r.predicate);
    }
    exact(v.metrics.map(m => m.reflex_id), [...reflexIds], "metrics");
    for (const m of v.metrics) {
      if (m.frequency.n > m.frequency.total) issues.push(`${m.reflex_id}: frequency denominator`);
      const r = v.reflex.entries.find(r => r.id === m.reflex_id);
      if (r && r.signal.kind !== "tag" && (m.effect_size !== r.signal.value || m.se !== (r.signal.se ?? null))) issues.push(`${m.reflex_id}: signal and audit disagree`);
      if (r?.signal.kind === "contrast" && (m.design !== "observational" || m.n !== r.signal.n.take + r.signal.n.not_take)) issues.push(`${m.reflex_id}: contrast design/sample counts disagree`);
    }
  }
  const runs = new Set(context.runIds);
  function evidence(value: unknown): void {
    if (Array.isArray(value)) value.forEach(evidence);
    else if (value && typeof value === "object") {
      const row = value as Record<string, unknown>;
      if (typeof row.run_id === "string" && !runs.has(row.run_id)) issues.push(`evidence outside frozen runs: ${row.run_id}`);
      Object.values(row).forEach(evidence);
    }
  }
  evidence(v);
  return issues.length ? { ok: false, issues } : { ok: true, value: v };
}

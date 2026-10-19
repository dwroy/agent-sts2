/** Read-only learner coverage/reference checks; never publishes knowledge. */
import { array, enumeration, id, literal, object, text, validate, type Result } from "./schema.js";
import { characterSchema } from "./formats.js";
import { buildCoreFileSchema } from "./build-core.js";
import type { DraftContext } from "./draft.js";

const reference = object({ core: id, combo: id });
const schema = object({ schema: literal("v6-build-core-draft-v1"), character: characterSchema, cores: buildCoreFileSchema,
  coverage: array(object({ experience_id: id, status: enumeration("linked", "unrelated", "unknown", "disputed"),
    links: array(reference), reason: text(4000) })),
  missing: array(object({ direction: id, category: text(), reason: text(4000) })),
  catalog_opinions: array(text(4000)), disagreements: array(text(4000)), limitations: array(text(4000)),
});
export function validateBuildCoreDraft(raw: unknown, context: DraftContext & { reflexIds: readonly string[] }): Result<unknown> {
  const parsed = validate(schema, raw);
  if (!parsed.ok) return parsed;
  const v = parsed.value, issues: string[] = [];
  if (v.character !== context.character || v.cores.character !== context.character) issues.push("draft character mismatch");
  const exact = (a: string[], b: readonly string[], label: string): void => {
    if (new Set(a).size !== a.length || a.length !== b.length || b.some(x => !a.includes(x))) issues.push(`${label}: exact unique coverage required`);
  };
  exact(v.coverage.map(x => x.experience_id), context.experienceIds, "experience coverage");
  const cores = new Map(v.cores.entries.map(c => [c.direction, c]));
  for (const c of v.cores.entries) {
    if (!context.directionIds.includes(c.direction)) issues.push(`${c.direction}: catalog change requires separate proposal`);
    if (c.linked_experience.some(x => !context.experienceIds.includes(x))) issues.push(`${c.direction}: unknown experience`);
    if (c.linked_reflex.some(x => !context.reflexIds.includes(x))) issues.push(`${c.direction}: unknown reflex`);
    for (const combo of c.combos) for (const exp of combo.linked_experience) {
      if (!v.coverage.find(x => x.experience_id === exp)?.links.some(x => x.core === c.direction && x.combo === combo.id)) issues.push(`${exp}: missing reverse coverage`);
    }
    for (const exp of c.linked_experience) if (!v.coverage.find(x => x.experience_id === exp)?.links.some(x => x.core === c.direction)) issues.push(`${exp}: core missing reverse coverage`);
  }
  for (const row of v.coverage) {
    if ((row.status === "linked") !== (row.links.length > 0)) issues.push(`${row.experience_id}: links/status mismatch`);
    const refs = row.links.map(x => `${x.core}:${x.combo}`);
    if (new Set(refs).size !== refs.length) issues.push(`${row.experience_id}: duplicate link`);
    for (const r of row.links) {
      const c = cores.get(r.core), combo = c?.combos.find(x => x.id === r.combo);
      if (!c?.linked_experience.includes(row.experience_id) || !combo?.linked_experience.includes(row.experience_id)) issues.push(`${row.experience_id}: dangling core/combo reference`);
    }
  }
  const categories = ["must_pick_minimal", "common", "max_cards", "max_dpr"];
  for (const d of context.directionIds) for (const category of categories) {
    if (!cores.get(d)?.combos.some(c => c.types.includes(category)) && !v.missing.some(m => m.direction === d && m.category === category)) issues.push(`${d}: missing category must be explained: ${category}`);
  }
  if (v.missing.some(m => !context.directionIds.includes(m.direction))) issues.push("missing: unknown direction");
  const runs = new Set(context.runIds);
  function checkEvidence(value: unknown): void {
    if (Array.isArray(value)) value.forEach(checkEvidence);
    else if (value && typeof value === "object") {
      const r = value as Record<string, unknown>;
      if (typeof r.run_id === "string" && !runs.has(r.run_id)) issues.push(`evidence outside frozen runs: ${r.run_id}`);
      Object.values(r).forEach(checkEvidence);
    }
  }
  checkEvidence(v);
  return issues.length ? { ok: false, issues } : parsed;
}

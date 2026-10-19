/** Executable, three-valued applicability. Contains no inferred game conditions. */
import type { BuildCombo } from "./build-core.js";
import { evaluatePredicate } from "./predicate.js";

export function evaluateBuildPrerequisites(combo: Pick<BuildCombo, "prerequisites">, facts: unknown): boolean | null {
  return combo.prerequisites === null ? true : evaluatePredicate(combo.prerequisites, facts);
}
/** Fits are descriptive applicability annotations, not implicit hard prerequisites. */
export function evaluateBuildFits(combo: Pick<BuildCombo, "fits">, facts: unknown) {
  const evaluate = (entries: BuildCombo["fits"]["situations"]) => entries.map(entry => ({
    ...entry, applies: entry.when === null ? true : evaluatePredicate(entry.when, facts),
  }));
  return { bosses_positive: evaluate(combo.fits.bosses_positive), bosses_negative: evaluate(combo.fits.bosses_negative),
    routes: evaluate(combo.fits.routes), situations: evaluate(combo.fits.situations) };
}

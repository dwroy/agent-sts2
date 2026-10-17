/** Shadow-only ordering. Missing measurements never imply a preference for skipping. */
import { BOSS_LINES_TIE_SE } from "./boss-lines.js";

export interface ShadowCardEstimate { mean: number; se: number }
export interface ShadowCardPolicyRow {
  key: string; core_component: boolean | null; template_membership: string[];
  target_delta_win: ShadowCardEstimate | null; next_boss_delta_win: ShadowCardEstimate | null;
}

export function rankShadowCards(rows: readonly ShadowCardPolicyRow[], primary: string) {
  const membership = (row: ShadowCardPolicyRow) => row.core_component === true ? 2
    : primary === "uncommitted" && row.template_membership.length ? 1 : 0;
  const valid = (v: ShadowCardEstimate | null) => !!v && Number.isFinite(v.mean) && Number.isFinite(v.se) && v.se >= 0;
  const metric = rows.length && rows.every((r) => valid(r.target_delta_win)) ? "target_delta_win"
    : rows.length && rows.every((r) => valid(r.next_boss_delta_win)) ? "next_boss_delta_win" : null;
  const basis = metric === "target_delta_win" ? "raw_Act2_weighted_win_S_excluded"
    : metric === "next_boss_delta_win" ? "next_boss_paired_win_then_template_S_excluded" : "learner_template_membership_only";
  const ordered = [...rows].sort((a, b) => metric ? b[metric]!.mean - a[metric]!.mean : membership(b) - membership(a));
  const best = ordered[0];
  if (!best) return { first: null, basis: "defer_to_brain", confidence: "unknown", ordered: [] as string[] };
  const contenders = metric ? ordered.filter((r) => best[metric]!.mean - r[metric]!.mean
    <= BOSS_LINES_TIE_SE * (best[metric]!.se + r[metric]!.se)) : ordered;
  const highest = Math.max(...contenders.map(membership));
  const members = contenders.filter((r) => membership(r) === highest);
  const selected = highest > 0 && members.length === 1 ? members[0]!
    : metric && ordered.some((r) => r[metric]!.mean !== best[metric]!.mean) ? best : null;
  return { first: selected?.key ?? null, basis: selected ? basis : "defer_to_brain",
    confidence: !selected ? "unknown" : !metric ? "template_only" : contenders.length === 1 ? "clear_MC_lead" : "close_MC_or_template_tiebreak",
    ordered: ordered.map((r) => r.key) };
}

/** No committed direction means an initial-plan gap, not proof that every offer breaks a plan. */
export function shadowPlanCoverage(primary: string, hasPlan: boolean, explicitlyCovered: boolean) {
  const status = !hasPlan ? "missing" : primary === "uncommitted" ? "uncommitted" : "committed";
  return { status, uncovered: explicitlyCovered ? false : status === "committed" ? true : null,
    initial_direction_needed: status !== "committed" };
}

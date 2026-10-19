/** Project explicit route steps with the existing room model. Unknown boss losses stay unknown. */
import type { V6Config } from "../v6/config.js";
import type { Character } from "../v6/formats.js";
import { projectPath, type RoomCostModel, type PathProjection } from "./route-projection.js";

export interface V6RouteEntryTable {
  character: Character; ascension: number; source_floor: number; source_act: number; max_hp: number;
  /** The caller includes this signature in the projection context digest. */
  signature: string;
  entries: { act: number; floor: number; hp: number | null; max_hp: number; labels: string[] }[];
}
export interface V6RouteStep { act: number; floor: number; type: string }
export interface V6RouteInput {
  character: Character; ascension: number; floor: number; act: number; hp: number; max_hp: number;
  signature: string; steps: readonly V6RouteStep[];
  /** Own-character, own-ascension models supplied by the existing route caller. */
  costs: Readonly<Record<number, RoomCostModel>>;
  /** Optional same-sample simulation boundary. No historical future HP may be substituted here. */
  bossExit?: (step: V6RouteStep, entry: { hp: number; max_hp: number }) => number | null;
}
export function projectV6RouteEntries(config: Pick<V6Config, "mode">, input: V6RouteInput): V6RouteEntryTable | null {
  if (config.mode === "off") return null;
  if (!input.signature || !Number.isSafeInteger(input.floor) || input.floor < 0 || !Number.isSafeInteger(input.act) || input.act < 1
    || !Number.isFinite(input.hp) || !Number.isFinite(input.max_hp) || input.max_hp <= 0 || input.hp < 0 || input.hp > input.max_hp
    || input.steps.some((s, i) => !Number.isSafeInteger(s.floor) || s.floor <= (input.steps[i - 1]?.floor ?? input.floor)
      || !Number.isSafeInteger(s.act) || s.act < (input.steps[i - 1]?.act ?? input.act) || s.act > (input.steps[i - 1]?.act ?? input.act) + 1))
    throw new Error("invalid V6 route scope or ordered steps");
  const table: V6RouteEntryTable = { character: input.character, ascension: input.ascension, source_floor: input.floor,
    source_act: input.act, max_hp: input.max_hp, signature: input.signature, entries: [] };
  let hp: number | null = input.hp, max = input.max_hp, previous: V6RouteStep | undefined;
  for (const step of input.steps) {
    const model = input.costs[step.act];
    // A new act requires an explicit preceding boss boundary; an unseen inter-act heal is never assumed.
    const boundaryMissing = step.act !== (previous?.act ?? input.act) && previous?.type !== "Boss";
    const valid = model?.act === step.act && [model.maxHp, model.monster.median, model.monster.p75, model.elite.median,
      model.elite.p75, model.unknown.median, model.unknown.p75, model.bossStartHeal ?? 0, model.rest?.bonus ?? 0,
      model.rest?.maxGain ?? 0, model.rest?.enterHeal ?? 0].every(v => Number.isFinite(v) && v >= 0);
    if (!valid || boundaryMissing) hp = null;
    const projection: PathProjection | null = hp === null || !valid ? null : projectPath([step.type], hp, model, max);
    const entry = projection?.arrival[0] ?? null;
    if (step.type === "Boss") table.entries.push({ act: step.act, floor: step.floor, hp: entry === null ? null : Math.max(0, entry), max_hp: max,
      labels: ["existing_route_room_cost_projection", ...(!valid ? ["missing_or_invalid_own_route_cost_model"] : []),
        ...(entry === null ? ["route_entry_unknown_after_unmodelled_boundary"] : []), "future_inventory_not_predicted"] });
    hp = projection?.end ?? null; max = projection?.maxEnd ?? max;
    if (step.type === "Boss" && entry !== null && entry > 0 && input.bossExit) {
      const exit = input.bossExit(step, { hp: entry, max_hp: max });
      if (exit !== null && (!Number.isFinite(exit) || exit < 0 || exit > max)) throw new Error("invalid simulated V6 boss exit HP");
      hp = exit;
    }
    previous = step;
  }
  return table;
}

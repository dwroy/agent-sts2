/** Recover only the route facts actually shown for the exact frozen question state. */
import { asRecord } from "../../src/core/util/json.js";
import type { GameState } from "../../src/hand/mod/schema.js";
import { fingerprint } from "../../src/hand/act/gate.js";
import type { V6RouteEntryTable } from "../../src/sim/v6-route-entry.js";
import { frozenRecord, type FrozenRange } from "./frozen-input.js";
export interface FrozenRouteRef { run_id: string; floor: number; observed_ts: string; source: FrozenRange }
export interface FrozenRouteIndex { schema: "v6-frozen-route-index-v1"; source_manifest_sha256: string;
  byte_limit: number; rows: FrozenRouteRef[]; malformed_rows: number }
export function frozenRouteTable(logs: string, refs: readonly FrozenRouteRef[], state: GameState, observedTs: string): {
  table: V6RouteEntryTable | null; sources: FrozenRange[]; reason: string;
} {
  const run = asRecord(state.run?.raw), floor = state.run?.floor, act = Number(run["act_id"]) + 1;
  const character = String(run["character_id"]).toLowerCase(), ascension = state.run?.ascension, max = Number(run["max_hp"]);
  if (character !== "silent" || floor === null || floor === undefined || ascension === null || ascension === undefined || !Number.isFinite(max))
    return { table: null, sources: [], reason: "route_state_scope_unknown" };
  const candidates = refs.filter(r => r.run_id === state.raw["run_id"] && r.floor === floor && r.observed_ts === observedTs);
  const matches: { table: V6RouteEntryTable; source: FrozenRange }[] = [];
  for (const ref of candidates) {
    const row = asRecord(frozenRecord(logs, ref.source));
    if (row["run_id"] !== ref.run_id || row["floor"] !== floor || row["observed_ts"] !== observedTs
      || row["fingerprint"] !== fingerprint(state)) continue;
    const shown = asRecord(asRecord(row["request"])["state"]), brief = asRecord(shown["run_brief"]);
    if (brief["ascension"] !== ascension || brief["floor"] !== floor || Number(brief["act"]) !== act) continue;
    const facts = asRecord(asRecord(shown["route_review"])["plan_facts"]), text = facts["boss"];
    if (typeof text !== "string") continue;
    const match = /^F(\d+) [^：\n]+：到达 (?:(\d+)\/(\d+)|0（血量耗尽）|未知（前场 Boss 损血未建模）)（p75 /.exec(text);
    if (!match || Number(match[1]) <= floor) continue;
    const hp = match[2] !== undefined && Number(match[3]) === max && Number(match[2]) <= max ? Number(match[2])
      : text.includes("：到达 0（血量耗尽）") ? 0 : null;
    matches.push({ source: ref.source, table: { character: "silent", ascension, source_act: act, source_floor: floor, max_hp: max,
      signature: ref.source.sha256, entries: [{ act, floor: Number(match[1]), hp, max_hp: max,
        labels: ["frozen_question_route_facts_rounded_display", ...(hp === null ? ["displayed_route_hp_unknown_or_max_changed"] : [])] }] } });
  }
  if (!matches.length) return { table: null, sources: [], reason: "no_exact_frozen_route_question" };
  if (matches.some(m => JSON.stringify(m.table.entries) !== JSON.stringify(matches[0]!.table.entries)))
    return { table: null, sources: matches.map(m => m.source), reason: "conflicting_frozen_route_questions" };
  return { table: matches[0]!.table, sources: matches.map(m => m.source), reason: "verified_frozen_route_question" };
}

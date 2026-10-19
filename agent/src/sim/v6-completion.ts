/** Evidence-owned combination adapters and replaceable completion providers. No game knowledge. */
import { createHash } from "node:crypto";
import type { ConstructionSupport } from "../construction/support.js";
import type { BuildState, Component, CoreTemplate, Requirement } from "../construction/types.js";
import type { Character, ProjectionEntry } from "../v6/formats.js";
import type { Predicate } from "../v6/predicate.js";
import type { BuildCore, BuildCombo } from "../v6/build-core.js";
export const v6Digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export interface V6Combo {
  id: string; requirements: Requirement[]; source: "brain" | "build_core" | "construction_adapter";
  prerequisites: Predicate | null; prerequisiteResolution?: "unknown";
  summary: BuildCombo["metrics"] | null; roles: Record<string, string[]>;
}
export interface V6Direction {
  id: string; name: string; character: Character; ascensions: number[]; core: CoreTemplate;
  combos: V6Combo[]; support: Component[]; conflict: Component[];
  source: "build_core" | "construction_adapter"; signature: string; limits: string[];
}
/** Missing formal cards use requirement signatures, never invented card sets. */
export function v6Directions(character: Character, ascension: number, templates: readonly CoreTemplate[],
  support: ConstructionSupport | null, cards: readonly BuildCore[] = []): V6Direction[] {
  const result: V6Direction[] = cards.filter(c => c.scope.character === character && c.scope.ascensions.includes(ascension)).map(c => {
    const combos: V6Combo[] = c.combos.map(k => ({ id: k.id, source: "build_core", summary: k.metrics, prerequisites: k.prerequisites,
      roles: Object.fromEntries(Object.entries(c.card_pool).map(([id, p]) => [id, p.roles])),
      requirements: k.cards.map((r, i) => ({ id: `${k.id}:${i}`, count: r.count,
        any: ("id" in r ? [r.id] : r.any_of).map(id => ({ id, kind: "card", upgraded: r.upgraded })) })) }));
    const core: CoreTemplate = { id: c.direction, name: c.name, character, ascensions: c.scope.ascensions, status: c.status,
      requirements: combos[0]!.requirements, evidence: { runs: [...new Set(c.combos.flatMap(k => k.evidence.map(e => e.run_id)))],
        source: "build-core-v1", sha256: v6Digest(c) }, limits: [] };
    return { id: c.direction, name: c.name, character, ascensions: c.scope.ascensions, core, combos, support: [], conflict: [],
      source: "build_core", signature: v6Digest(c), limits: [`build_status_${c.status}`] };
  });
  for (const core of templates.filter(c => c.character === character && c.ascensions.includes(ascension))) {
    if (result.some(c => c.id === core.id)) continue;
    const observed = support?.character === character ? support.entries.filter(e => e.core === core.id && e.ascensions.includes(ascension)) : [];
    result.push({ id: core.id, name: core.name, character, ascensions: core.ascensions, core,
      combos: [{ id: `${core.id}:minimal`, requirements: core.requirements, source: "construction_adapter", summary: null, prerequisites: null, roles: {} }],
      support: observed.map(e => e.component), conflict: [], source: "construction_adapter", signature: v6Digest({ core, observed }),
      limits: ["candidate_signature_not_functional_completion", "local_support_is_not_net_benefit", ...core.limits] });
  }
  return result;
}
const matches = (c: Component, card: { id: string; upgraded: boolean }): boolean =>
  c.kind === "card" && c.id === card.id && (!c.upgraded || card.upgraded);
export function v6DirectionRole(d: V6Direction, all: readonly V6Direction[], card?: { id: string; upgraded: boolean }): ProjectionEntry["direction_role"] {
  if (!card) return "neutral";
  if (d.combos.some(k => k.requirements.some(r => r.any.some(c => matches(c, card))))) return "core";
  if (d.conflict.some(c => matches(c, card))) return "conflict";
  if (d.support.some(c => matches(c, card))) return "support";
  if (all.some(x => x.id !== d.id && x.combos.some(k => k.requirements.some(r => r.any.some(c => matches(c, card)))))) return "core_of_other";
  return d.source === "build_core" ? "neutral" : "unknown";
}
export interface V6ProjectionOption {
  id: string; state: BuildState; card?: { id: string; upgraded: boolean };
  /** Held inventory and route identity outside BuildState (for example the potion belt). */
  preparationKey?: string;
}
export interface V6CompletionCombination {
  id: string; source: V6Combo["source"]; requirements: Requirement[]; summary: V6Combo["summary"]; roles: V6Combo["roles"];
  samples: { id: string; states: Readonly<Record<string, BuildState | null>> }[];
  general: { id: string; states: Readonly<Record<string, BuildState | null>> }[];
  availability: Readonly<Record<string, number | null>>;
  /** Shared supply worlds permit a paired uncertainty term without independent-binomial assumptions. */
  supply: Readonly<Record<string, readonly boolean[] | null>>;
  labels: string[];
}
export interface V6CompletionSet { source: string; signature: string; combinations: V6CompletionCombination[]; labels: string[] }
export interface V6CompletionContext {
  direction: V6Direction; options: readonly V6ProjectionOption[]; target: { id: string; floor: number };
  samples: number; seed: number; deadline: number; phase: "pick" | "act";
  idealOverrides?: Readonly<Record<string, readonly string[]>>;
  appearedCards?: readonly string[];
  ranking?: readonly string[];
}
export interface V6CompletionSource {
  kind: string; signature: string;
  /** Bounded, synchronous preparation from immutable inputs; no I/O or simulation. */
  resolve(context: V6CompletionContext): V6CompletionSet | null;
}
export function resolveV6Completion(context: V6CompletionContext, sources: readonly V6CompletionSource[]): V6CompletionSet | null {
  for (const source of sources) {
    if (!source.signature) throw new Error("completion provider requires a frozen signature");
    const result = source.resolve(context);
    if (result) { if (!result.signature || result.source !== source.kind) throw new Error("completion provenance mismatch"); return result; }
  }
  return null;
}

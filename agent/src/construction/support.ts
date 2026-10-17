/** Independent, evidence-owned support observations. These never complete a core requirement. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { knowledgeFile, KNOWLEDGE_DIR } from "../knowledge/files.js";
import type { CoreTemplate } from "./types.js";

interface SupportSource { path: string; offset: number; bytes: number; sha256: string }
interface SupportEvidence {
  run: string; ascension: number; floor: number; attempt: number; turn: number;
  sources: SupportSource[]; outcome: string; outcome_turn: number;
}
export interface SupportObservation {
  id: string; core: string; core_sha256: string;
  component: { id: string; kind: "card"; upgraded: boolean };
  ascensions: number[]; confidence: "low" | "med" | "high";
  effect: string; conditions: string; necessary: null; substitutes: null; upgrade_comparison: null;
  experience: string[]; evidence: SupportEvidence[];
}
export interface ConstructionSupport {
  schema: "construction-support-v1"; character: string; version: string; entries: SupportObservation[];
}

export function supportCoreDigest(core: CoreTemplate): string {
  return createHash("sha256").update(JSON.stringify(core)).digest("hex");
}

/** A stale core, an unbound source or an incomplete observation cannot supply a positive label. */
export function parseConstructionSupport(raw: unknown, character: string, cores: readonly CoreTemplate[]): ConstructionSupport | null {
  try {
    const data = raw as ConstructionSupport;
    if (!data || data.schema !== "construction-support-v1" || data.character !== character
      || typeof data.version !== "string" || !data.version || !Array.isArray(data.entries)) return null;
    const ids = new Set<string>();
    for (const e of data.entries) {
      const core = cores.find((c) => c.id === e.core && c.character === character);
      // A caller may intentionally supply only one of the templates.
      if (!core) continue;
      if (typeof e.id !== "string" || !e.id || ids.has(e.id) || e.core_sha256 !== supportCoreDigest(core)
        || e.component.kind !== "card" || typeof e.component.id !== "string" || !e.component.id || typeof e.component.upgraded !== "boolean"
        || core.requirements.some((r) => r.any.some((c) => c.kind === "card" && c.id === e.component.id))
        || !Array.isArray(e.ascensions) || !e.ascensions.length || e.ascensions.some((a) => !Number.isInteger(a) || !core.ascensions.includes(a))
        || !["low", "med", "high"].includes(e.confidence) || typeof e.effect !== "string" || !e.effect
        || typeof e.conditions !== "string" || !e.conditions || e.necessary !== null || e.substitutes !== null || e.upgrade_comparison !== null
        || !Array.isArray(e.experience) || !e.experience.length || e.experience.some((id) => typeof id !== "string" || !id)
        || !Array.isArray(e.evidence) || !e.evidence.length || e.evidence.some((v) => !/^[A-Z0-9]{12}$/.test(v.run)
          || !e.ascensions.includes(v.ascension) || ![v.floor, v.attempt, v.turn, v.outcome_turn].every((n) => Number.isInteger(n) && n > 0)
          || typeof v.outcome !== "string" || !v.outcome || !Array.isArray(v.sources) || v.sources.length < 2
          || v.sources.some((s) => typeof s.path !== "string" || !s.path || !Number.isSafeInteger(s.offset) || s.offset < 0
            || !Number.isSafeInteger(s.bytes) || s.bytes <= 0 || !/^[a-f0-9]{64}$/.test(s.sha256)))) return null;
      ids.add(e.id);
    }
    return { ...data, entries: data.entries.filter((e) => cores.some((c) => c.id === e.core && c.character === character)) };
  } catch { return null; }
}

export function loadConstructionSupport(character: string, cores: readonly CoreTemplate[], dir = KNOWLEDGE_DIR): ConstructionSupport | null {
  if (!/^[a-z_]+$/.test(character)) return null;
  try {
    return parseConstructionSupport(JSON.parse(readFileSync(knowledgeFile(dir, "construction-support.json", character), "utf8")), character, cores);
  } catch { return null; }
}

export function cardSupport(data: ConstructionSupport | null, core: CoreTemplate | undefined,
  card: { id: string | null; upgraded?: boolean | null }, ascension: number) {
  const result = (component: boolean | null, reason: string, observations: SupportObservation[] = []) => ({
    support_component: component, support_reason: reason, support_observations: observations,
    support_version: data?.version ?? null,
  });
  if (card.id === null) return result(false, "skip_adds_no_card");
  if (!core) return result(null, "no_committed_core");
  if (!core.ascensions.includes(ascension)) return result(null, "unobserved_ascension");
  if (core.requirements.some((r) => r.any.some((c) => c.kind === "card" && c.id === card.id))) return result(false, "core_requirement_separate_from_support");
  if (!data || data.character !== core.character) return result(null, "support_mapping_missing_invalid_or_stale");
  if (typeof card.upgraded !== "boolean") return result(null, "offered_upgrade_unknown");
  const found = data.entries.filter((e) => e.core === core.id && e.ascensions.includes(ascension)
    && e.component.id === card.id && e.component.upgraded === card.upgraded);
  return found.length ? result(true, "observed_local_support_not_current_function_or_net_benefit", found)
    : result(null, "no_observed_mapping_for_card_variant");
}

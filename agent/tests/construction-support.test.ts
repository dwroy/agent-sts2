import { expect, it } from "vitest";
import { cardSupport, parseConstructionSupport, supportCoreDigest, type ConstructionSupport } from "../src/construction/support.js";
import type { CoreTemplate } from "../src/construction/types.js";

function fixture() {
  const core: CoreTemplate = { id: "P", character: "silent", name: "fixed", status: "candidate", ascensions: [10],
    requirements: [{ id: "core", count: 1, any: [{ kind: "card", id: "CORE_CARD" }] }],
    evidence: { runs: ["AAAAAAAAAAAA"], source: "fixed", sha256: "a".repeat(64) }, limits: [] };
  const data: ConstructionSupport = { schema: "construction-support-v1", character: "silent", version: "fixed",
    entries: [{ id: "fixed-support", core: "P", core_sha256: supportCoreDigest(core),
      component: { id: "SUPPORT_CARD", kind: "card", upgraded: false }, ascensions: [10], confidence: "low",
      effect: "A local observed effect", conditions: "Not necessity, sufficiency or net benefit",
      necessary: null, substitutes: null, upgrade_comparison: null, experience: ["fixed-experience"],
      evidence: [{ run: "AAAAAAAAAAAA", ascension: 10, floor: 48, attempt: 1, turn: 3, outcome: "died", outcome_turn: 8,
        sources: [1, 2].map((offset) => ({ path: "fixed.jsonl", offset, bytes: 1, sha256: "b".repeat(64) })) }] }] };
  return { core, data };
}

it("keeps an observed support relation separate from core completion, upgrades, missing evidence and skip", () => {
  const { core, data } = fixture(), parsed = parseConstructionSupport(data, "silent", [core]);
  expect(parsed).not.toBeNull();
  expect(cardSupport(parsed, core, { id: "SUPPORT_CARD", upgraded: false }, 10)).toMatchObject({ support_component: true,
    support_observations: [{ necessary: null, substitutes: null, confidence: "low", evidence: [{ outcome: "died" }] }] });
  for (const card of [{ id: "UNOBSERVED", upgraded: false }, { id: "SUPPORT_CARD", upgraded: true }, { id: "SUPPORT_CARD" }]) {
    expect(cardSupport(parsed, core, card, 10).support_component).toBeNull();
  }
  expect(cardSupport(parsed, undefined, { id: "SUPPORT_CARD", upgraded: false }, 10).support_component).toBeNull();
  expect(cardSupport(parsed, core, { id: "SUPPORT_CARD", upgraded: false }, 9).support_component).toBeNull();
  expect(cardSupport(parsed, core, { id: "CORE_CARD", upgraded: false }, 10)).toMatchObject({ support_component: false,
    support_reason: "core_requirement_separate_from_support" });
  expect(cardSupport(parsed, core, { id: null }, 10).support_component).toBe(false);
});

it.each(["stale", "foreign", "overlap", "source", "unbounded"])("rejects %s mapping evidence", (kind) => {
  const { core, data } = fixture(), entry = data.entries[0]!;
  if (kind === "stale") entry.core_sha256 = "0".repeat(64);
  if (kind === "foreign") data.character = "other";
  if (kind === "overlap") entry.component.id = "CORE_CARD";
  if (kind === "source") entry.evidence[0]!.sources[0]!.sha256 = "unknown";
  if (kind === "unbounded") Object.assign(entry, { necessary: true });
  expect(parseConstructionSupport(data, "silent", [core])).toBeNull();
});

it("does not transfer a positive support observation between templates or roles", () => {
  const { core, data } = fixture(), other = { ...core, id: "D" };
  const parsed = parseConstructionSupport(data, "silent", [core, other]);
  expect(cardSupport(parsed, other, { id: "SUPPORT_CARD", upgraded: false }, 10).support_component).toBeNull();
  expect(parseConstructionSupport(data, "other", [{ ...core, character: "other" }])).toBeNull();
});

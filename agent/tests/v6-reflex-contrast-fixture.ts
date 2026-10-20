/** Synthetic statistical and inventory contracts, not game knowledge. */
import { contrastConfidence, contrastInterval } from "../src/v6/contrast-statistics.js";
import { validateReflexEntry, type ReflexEntry } from "../src/v6/formats.js";
import { reflex } from "./v6-fixtures.js";

export function contrastFixture(value = -4, se = 1, clusters = 20): ReflexEntry {
  const raw = { ...reflex, id: "TEST_CONTRAST", directions: [], cores: ["TEST_A"], combos: ["TEST_A:min"],
    predicate: { op: "and", args: [{ op: "eq", field: "card.id", value: "TEST_CARD" },
      { op: "gte", field: "player.deck_size", value: 2 }] },
    signal: { kind: "contrast", design: "observational", metric: "hp_loss", value, se, unit: "hp",
      baseline: { treatment: "take_candidate", control: "same_offer_not_taken", definition: "Same offered candidate and matched observed pre-pick deck state",
        outcome_window: "Next observed combat through its end; censored windows excluded and counted", adjustment: "Synthetic deck-size strata only; residual confounding remains" },
      n: { take: clusters, not_take: clusters, clusters },
      uncertainty: { method: "run_cluster_t", cluster: "run_id", interval: contrastInterval(value, se, clusters) },
      audit: { path: "scratch/synthetic-contrast.json", sha256: "a".repeat(64) } },
    evidence: { observations: [{ run_id: "SYNTHETIC_RUN_A", floor: 8 }, { run_id: "SYNTHETIC_RUN_B", floor: 9 }], n_support: 1, n_contradict: 1 },
    confidence: contrastConfidence(value, se, clusters) };
  const result = validateReflexEntry(raw);
  if (!result.ok) throw new Error(result.issues.join("\n"));
  return result.value;
}

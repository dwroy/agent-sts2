/** Offline W8/W1.1 acceptance. Synthetic W1 data only; never sends requests or executes actions. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { annotatedFrozen, installFixture, fixedState, fixedPlan, fixedBoss, fixedRollout } from "../../../agent/tests/v6-combat-fixtures.js";
import { combatEntryAudit, loadCombatEntries } from "../../../agent/src/reflex/jev/combat-entries.js";
import { REFLEX_GAP_FIELDS } from "../../../agent/src/reflex/jev/predicate-context.js";
import { validatePredicate } from "../../../agent/src/v6/predicate.js";
import { projectCombatDecision } from "../../../agent/src/reflex/jev/combat-entry-projection.js";

const output = dirname(fileURLToPath(import.meta.url));
const save = (name: string, value: unknown) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + "\n");
const digest = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const directory = mkdtempSync(join(tmpdir(), "v6-w8-context-"));
try {
  installFixture(directory);
  const original = annotatedFrozen(directory);
  const projection = projectCombatDecision(original.state, original.questions, { V6_COMBAT_ENTRIES: "on" })!;
  const wire = { state: projection.state, questions: projection.questions };
  const sentWire = JSON.parse(readFileSync(join(output, "../2026-10-19-v6-w8/frozen-wire.json"), "utf8"));
  assert.equal(JSON.stringify(wire), JSON.stringify(sentWire), "The expanded context must preserve the already accepted frozen wire");
  const receipt = JSON.parse(readFileSync(join(output, "../2026-10-19-v6-w8/request-receipt.json"), "utf8"));
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.wire_sha256, digest(wire));
  const session = loadCombatEntries(fixedState(), directory, { V6_COMBAT_ENTRIES: "on" })!;
  const audit = combatEntryAudit(session, fixedPlan, fixedRollout, fixedBoss) as any;
  const inventory = REFLEX_GAP_FIELDS.map(field => {
    assert.equal(validatePredicate({ op: "exists", field }).ok, true);
    const source = audit.predicate_facts.sources[field] ?? null;
    const unavailable_reason = audit.predicate_facts.unavailable[field] ?? null;
    assert(source || unavailable_reason, `Undocumented field: ${field}`);
    return { field, source, unavailable_reason,
      ...(field.startsWith("card.") ? { scoped_binding: "any/all: player.hand, player.deck, player.piles.*, option.actions" }
        : field.startsWith("potion.") && field !== "potion.slots" ? { scoped_binding: "any/all: potion.slots, option.actions" } : {}) };
  });
  save("field-inventory.json", inventory);
  save("frozen-wire.json", wire);
  save("frozen-decision-evidence.json", projection.evidence);
  save("frozen-contract.json", projection.contract);
  const summary = { checked_at: new Date().toISOString(), purpose: "synthetic_format_acceptance_only", fields: inventory.length,
    wire_byte_equivalent_to_accepted_w8_fixture: true, wire_sha256: digest(wire), evidence_sha256: digest(projection.evidence),
    wire_bytes: Buffer.byteLength(JSON.stringify(wire)), evidence_bytes: Buffer.byteLength(JSON.stringify(projection.evidence)),
    prior_receipt: "../2026-10-19-v6-w8/request-receipt.json", new_network_requests: 0, action_execution: false,
    limitations: ["Role, act, plan, simulations and W1 entries are synthetic overlays; not game evidence",
      "Expanded decision_evidence is frozen separately; the historical W8 audit is never overwritten",
      "Empty Plan.steps in this fixture is an observed empty sequence, not a continuation completeness certificate"] };
  save("frozen-summary.json", summary);
  process.stdout.write(JSON.stringify(summary) + "\n");
} finally { rmSync(directory, { recursive: true, force: true }); }

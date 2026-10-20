import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { closeSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gate } from "../../../agent/src/hand/act/gate.js";
import { parseGameState } from "../../../agent/src/hand/mod/schema.js";
import { discardableSlots } from "../../../agent/src/hand/screens/potion-discard.js";
import type { DecisionEnv } from "../../../agent/src/memory/types.js";

const base = new URL("./", import.meta.url);
const frozen = JSON.parse(readFileSync(new URL("frozen/potion-0.json", base), "utf8"));
const fd = openSync(frozen.source, "r");
const verified = [];
try {
  for (const phase of ["combat", "reward"] as const) {
    const ref = frozen.evidence[phase];
    const bytes = Buffer.alloc(ref.bytes);
    assert.equal(readSync(fd, bytes, 0, bytes.length, ref.offset), bytes.length);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), ref.sha256);
    assert.deepEqual(JSON.parse(bytes.toString()).state, frozen.states[phase]);
    verified.push({ phase, ...ref });
  }
} finally {
  closeSync(fd);
}

const combat = parseGameState(frozen.states.combat);
const reward = parseGameState(frozen.states.reward);
assert.equal(reward.screen, "REWARD");
assert.equal(reward.in_combat, false);
assert.equal(frozen.states.reward.run.potions.length, 2);
assert(frozen.states.reward.run.potions.every((slot: { occupied: boolean }) => slot.occupied));
assert.equal(discardableSlots({ state: reward } as DecisionEnv).length, 0);
const results = frozen.states.reward.run.potions.map((slot: { index: number; potion_id: string; can_discard: boolean }) => {
  const intent = { action: "discard_potion", option_index: slot.index };
  const before = gate(combat, intent);
  const after = gate(reward, intent);
  assert.equal(before.ok, true);
  assert.equal(after.ok, false);
  assert.equal(after.kind, "legality");
  assert.equal(slot.can_discard, false);
  return { slot: slot.index, id: slot.potion_id, combat: before, reward: after };
});
const result = {
  scope: "Frozen production state and production execution gate only; no HTTP, model, simulation or action dispatch",
  run_id: frozen.states.reward.run_id,
  floor: reward.run?.floor,
  available_actions: reward.available_actions,
  incoming: frozen.states.reward.reward.rewards.filter((entry: { reward_type: string }) => entry.reward_type === "Potion"),
  discardable_slots: 0,
  gate_results: results,
  source_readback: verified,
};
writeFileSync(fileURLToPath(new URL("checks/capability-replay.json", base)), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));

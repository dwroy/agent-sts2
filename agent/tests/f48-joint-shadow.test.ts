import { expect, it } from "vitest";
import { f48JointShadow } from "../src/sim/f48-joint-shadow.js";
import { continuousBossResult } from "../src/sim/continuous-boss-result.js";
import { candidate, jointInput, sample, scope } from "./f48-joint-fixture.js";

const rows = (record: any): any[] => record.candidates;
it("uses returned sample resources, not an average-HP continuation, and retains the G1a rates", () => {
  const a = [sample(11, 8, false), sample(12, 18, true)], b = [sample(11, 13, false), sample(12, 13, false)];
  const original = structuredClone(a), record = f48JointShadow(scope, [candidate("a", a), candidate("b", b)], jointInput())!;
  const [one, two] = rows(record);
  expect(record).toMatchObject({ schema: "f48-joint-shadow-v1", mode: "shadow", delivered: false,
    extra_workers: 0, extra_simulation_samples: 0, trust: { F49: "low_trust", joint_calibration: "unknown", joint_S: "unknown" } });
  expect(one.continuous).toEqual(continuousBossResult(a, 2, true));
  expect(one.exit_resources.hp).toEqual({ n: 2, min: 8, p10: 9, p50: 13, p90: 17 });
  expect(two.exit_resources.hp.p50).toBe(13);
  expect(one.continuous.joint.value).toBe(.5); expect(two.continuous.joint.value).toBe(0);
  expect(two.paired_comparison).toMatchObject({ complete_pairs: 2, delta_joint_vector: [0, -1], delta_joint_raw: -.5, mc_se: .5 });
  expect(a).toEqual(original);
});

it("keeps physical duplicate-id slots distinct, spent revives absent and the recorded opening loss applied once", () => {
  const [row] = rows(f48JointShadow(scope, [candidate("a", [sample(1, 8, true), sample(2, 18, false)])], jointInput()));
  expect(row.exit_resources).toMatchObject({ potion_slot_states: [{ state: ["POTION:BLOCK_POTION:1"], n: 2 }],
    remaining_revive_states: [{ state: [], n: 2 }], opening_hp_loss: [{ state: 2, n: 2 }],
    simulated_F49_entry_hp: { min: 6, p50: 11 }, spent_slots: null, actual_revive_use: null, opening_charge_states: null });
  expect(row.exit_resources.unknown).toContain("unobserved_transition_rewards");
  expect(JSON.stringify(row)).not.toContain('"hp":20');
});

it.each(["missing", "zero", "NaN", "restored_revive", "double_opening_loss"])("keeps invalid %s resources unknown with no unsafe trace or numeric rate", (kind) => {
  const o = sample(1, 8, true);
  if (kind === "missing") o.sequence!.firstResources = null;
  if (kind === "zero") o.sequence!.firstHp = o.sequence!.firstResources!.hp = 0;
  if (kind === "NaN") o.sequence!.firstHp = o.sequence!.firstResources!.hp = NaN;
  if (kind === "restored_revive") o.sequence!.secondEntry!.revives.push({ source: "LIZARD_TAIL", hp: 8, name: "fixed" });
  if (kind === "double_opening_loss") o.sequence!.secondEntry!.hp -= 2;
  const [row] = rows(f48JointShadow(scope, [candidate("a", [o])], jointInput()));
  for (const rate of [row.continuous.first, row.continuous.secondGivenFirstWin, row.continuous.joint]) expect(rate.value).toBeNull();
  expect(row.continuous.traces).toEqual([]); expect(row.unknown_samples).toBe(1);
  expect(row.exit_resources.hp).toMatchObject({ n: 0, p50: null }); expect(row.paired_comparison.delta_joint_raw).toBeNull();
});

it.each(["capped", "timeUp"] as const)("retains a valid F48 exit when F49 is %s while withholding the joint rate", (kind) => {
  const o = sample(1, 8, false); o.died = false; o[kind] = true; o.sequence!.secondDied = false;
  const [row] = rows(f48JointShadow(scope, [candidate("a", [o])], jointInput()));
  expect(row.continuous.joint.value).toBeNull(); expect(row.exit_resources.hp).toMatchObject({ n: 1, min: 8 });
  expect(row.second_outcomes).toEqual([{ state: kind === "capped" ? "second_capped" : "second_time_up", n: 1 }]);
});

it("preserves C2 prefix gaps and pairs by seed, not array position or a filled-in loss", () => {
  const ref = [sample(1, 8, true), sample(2, 9, false), sample(3, 10, true)];
  const partial = [sample(2, 9, true), sample(1, 8, true)];
  const [base, short] = rows(f48JointShadow(scope, [candidate("base", ref), candidate("early", partial, 3)], jointInput()));
  expect(base.continuous.joint.samples).toBe(3);
  expect(short.continuous.joint).toMatchObject({ value: null, samples: 3, unknown: 1 });
  expect(short.paired_comparison).toMatchObject({ status: "unknown", complete_pairs: 2, missing_pairs: 1,
    delta_joint_vector: [1, 0], delta_joint_raw: null, mc_se: null });
});

it("rejects different second-boss variants and duplicate seed identities", () => {
  const ref = [sample(1, 8, true), sample(2, 9, false)], changed = structuredClone(ref);
  changed[0]!.sequence!.secondBoss = "DIFFERENT";
  const [, bad] = rows(f48JointShadow(scope, [candidate("a", ref), candidate("b", changed)], jointInput()));
  expect(bad.paired_comparison).toMatchObject({ status: "unknown", variant_mismatches: 1, delta_joint_raw: null });
  const [duplicate] = rows(f48JointShadow(scope, [candidate("a", [ref[0]!, ref[0]!])], jointInput()));
  expect(duplicate.unknown_reasons).toContainEqual({ state: "duplicate_sample_seed", n: 1 });
});

it("keeps no-first-win and no-computation cases unknown without inventing conditional zeros", () => {
  const o = sample(1, 8, false); Object.assign(o.sequence!, { firstWon: false, firstDied: true, firstResources: null,
    secondEntry: null, firstHp: 0, secondWon: null, secondDied: null });
  const [row] = rows(f48JointShadow(scope, [candidate("a", [o])], jointInput()));
  expect(row.continuous.first.value).toBe(0); expect(row.continuous.secondGivenFirstWin.value).toBeNull();
  expect(row.continuous.joint.value).toBeNull();
  expect(f48JointShadow(scope, [], undefined, { reason: "resource_contract_failure:nonpositive-hp", reference: { sha256: "fixed" } }))
    .toMatchObject({ status: "unknown", continuous: null, failure: { reason: "resource_contract_failure:nonpositive-hp" } });
});

it.each(["ironclad", "regent", "defect", "necrobinder"])("is entirely absent for %s even with supplied continuous samples", (character) => {
  expect(f48JointShadow({ ...scope, character }, [candidate("a", [sample(1, 8, true)])], jointInput())).toBeUndefined();
  expect(f48JointShadow({ ...scope, floor: 49 }, [], jointInput())).toBeUndefined();
});

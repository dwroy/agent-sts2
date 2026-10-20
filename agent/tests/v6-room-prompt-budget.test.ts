/** Fixed W7 truncation contracts: legal continuations, unknowns and complete audit. */
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { asArray, asRecord } from "../src/core/util/json.js";
import { buildV6RoomDecision, recordV6Room } from "../src/hand/screens/v6-room.js";
import { v6RestOptions, v6ShopOptions } from "../src/hand/screens/v6-room-options.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import { validateBuildCore } from "../src/v6/build-core.js";
import { promptBudgetLabels, V6_JEV_REQUEST_BYTES, V6_JEV_STATE_BYTES } from "../src/v6/prompt-summary.js";
import { board, env, setupOneshotTests, type Raw } from "./oneshot-support.js";
import { coreFixture } from "./v6-direction-core-fixtures.js";

setupOneshotTests();
const dirs: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value));
function on() {
  vi.stubEnv("CHARACTER", "silent"); vi.stubEnv("V6_BUILD", "on");
  vi.stubEnv("V6_SHOP_DECIDER", "jev"); vi.stubEnv("V6_REST_DECIDER", "jev");
}
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "v6-room-budget-")); dirs.push(dir);
  const own = join(dir, "characters", "silent"); mkdirSync(own, { recursive: true });
  const core = coreFixture();
  // Repeated synthetic provenance exercises the same large-snapshot path without reading learned knowledge.
  for (const combo of core.combos) for (const metric of combo.metrics) {
    metric.observed.dpr_boss.evidence = Array.from({ length: 800 }, () => ({ run_id: "FIXTURE_RUN", floor: 8, turn: 1 }));
  }
  expect(validateBuildCore(core).ok).toBe(true);
  writeFileSync(join(own, "build-cores.json"), JSON.stringify({ schema: "build-cores-v1", character: "silent", entries: [core] }));
  return { dir, core };
}
function room(kind: "shop" | "rest") {
  const raw = kind === "shop" ? board("u6ru-f22-shop", "open") : board("w2tb-f7-rest", "rest");
  Object.assign(raw.run as Raw, { character_id: "SILENT", ascension: 0 });
  return env(raw);
}
function answer(key: string): AnswerSet {
  return { pick: { type: "choice", choice: key, confidence: .9, probabilities: { [key]: 1 }, raw: {} } };
}
it.each(["shop", "rest"] as const)("keeps every %s action and its continuation after trimming, with full unknown/audit rows", kind => {
  on(); const { dir, core } = fixture(), e = room(kind);
  const input = (kind === "shop" ? v6ShopOptions : v6RestOptions)(e)!;
  const before = JSON.stringify(e.state.raw), d = buildV6RoomDecision(e, input, undefined, "fixed_provider_unavailable", dir);
  const keys = input.options.map(o => o.option.key);
  expect(promptBudgetLabels(d.state)).toHaveLength(1);
  expect(bytes(d.state)).toBeLessThanOrEqual(V6_JEV_STATE_BYTES);
  expect(bytes({ model: "typesafe/jev-1.14", state: d.state, questions: d.questions })).toBeLessThanOrEqual(V6_JEV_REQUEST_BYTES);
  expect(Object.keys(asRecord(d.state.options))).toEqual(keys);
  expect(Object.keys(asRecord(d.questions.pick).criteria)).toEqual(keys);
  if (kind === "shop") expect(keys).toHaveLength(28);
  for (const option of input.options) {
    const view = asRecord(asRecord(d.state.options)[option.option.key]);
    expect(view.facts).toBeTruthy();
    for (const field of ["id", "card", "price", "slot"]) {
      const expected = asRecord(option.option.summary)[field];
      if (expected !== undefined) expect(asRecord(view.facts)[field]).toEqual(expected);
    }
    const leading = asRecord(asArray(view.projections)[0]);
    expect(leading.direction_id).toBe(core.direction);
    expect(leading.combo_id).toBe(core.combos[0]!.id);
    expect(leading.availability).toEqual({ take: null, skip: null });
    expect(leading.opening).toEqual({ Wk: "opening unknown", W0: "opening unknown" });
    expect(view.comparison).toMatchObject({ weighted_chain: { delta: null, tier: "unknown", known_mass: null },
      current_boss: { delta: null, tier: "unknown", known_mass: null } });
    const catalog = asRecord(d.state.option_reason_catalog);
    const reasons = asArray(view.unknown_reasons ?? leading.unknown_reasons).map(reason => catalog[String(reason)] ?? reason);
    expect(reasons).toContain(option.unknown_reason ?? "fixed_provider_unavailable");
    const resolved = d.resolve(answer(option.option.key));
    expect(resolved.fallback).toBe(false);
    expect(resolved.intent).toEqual(option.option.intent);
  }
  expect(e.screenMemory.pendingPick).toBeUndefined();
  expect(JSON.stringify(e.state.raw)).toBe(before);
  expect(buildV6RoomDecision(e, input, undefined, "fixed_provider_unavailable", dir).state).toEqual(d.state);
  expect(d.resolve(answer("foreign_action")).intent?.action).toBe(kind === "shop" ? "close_shop_inventory" : "choose_rest_option");
  expect(d.resolve(answer("foreign_action")).fallback).toBe(true);

  const projections = Object.values(asRecord(d.state.options)).flatMap(o => asArray(asRecord(o).projections));
  expect(projections.length).toBeGreaterThan(0);
  for (const raw of projections) {
    const p = asRecord(raw);
    // A compact minimum may omit unmeasured optional statistics; it must never invent zero.
    for (const field of ["win", "expected_win", "formation_n", "formation_se"]) expect(p[field] ?? null).toBeNull();
    if (p.trust !== undefined) expect(p.trust).toBe("unknown");
  }
  const metrics = asArray(asRecord(asArray(d.state.core_metrics)[0]).metrics);
  expect(metrics[0]).toMatchObject({ dpr_boss: { value: 20, n: 3 } });
  expect(asRecord(asRecord(metrics[0]).dpr_boss).se ?? null).toBeNull();
  expect(d.roomEntries).toHaveLength(input.options.length * core.combos.length * 2);
  expect(d.roomEntries.every(row => row.win === null)).toBe(true);
  recordV6Room(e, d, join(dir, "plans.jsonl"), "FIXTURE_BUDGET", answer(keys[0]!), false, 1);
  const audit = JSON.parse(readFileSync(join(dir, "v6-build.jsonl"), "utf8"));
  expect(audit.entries).toHaveLength(d.roomEntries.length);
  expect(audit.unknown).toEqual({ count: d.roomEntries.length, total: d.roomEntries.length });
  expect(audit.degradation).toEqual(expect.arrayContaining(promptBudgetLabels(d.state)));
  expect(audit.metric_audits).toHaveLength(core.combos.length);
  for (const ref of audit.metric_audits) {
    const snapshot = readFileSync(join(dir, ref.file), "utf8").trimEnd();
    expect(createHash("sha256").update(snapshot).digest("hex")).toBe(ref.sha256);
    expect(JSON.parse(snapshot)).toEqual(core.combos.find(c => c.id === ref.combo_id)!.metrics);
  }
  const follow = input.options.find(o => o.changes?.[0]?.kind === (kind === "shop" ? "remove" : "upgrade"))!;
  d.resolve(answer(follow.option.key)).apply?.();
  expect(e.screenMemory.pendingPick?.task).toBe(kind === "shop" ? "remove" : "upgrade");
});
it("retains UTF-8 potion slot questions and rejects missing or malformed slot answers after rest truncation", () => {
  on(); const { dir } = fixture(), e = room("rest");
  e.state.available_actions.push("discard_potion");
  (e.state.run!.raw as Raw).potions = [2, 7].map(index => ({ index, occupied: true, can_discard: true, potion_id: `TEST_POTION_${index}`, name: "格式测试" }));
  asArray(asRecord(e.state.raw.rest).options).push({ index: 2, option_id: "TEST_REWARD", title: "Synthetic reward", description: "gain 1 potion", is_enabled: true });
  const input = v6RestOptions(e)!, variant = input.options.find(o => o.option.key === "o2:discard")!;
  expect(variant).toBeTruthy();
  // Stress the truncatable question text rather than fabricate oversized inventory identities.
  for (const option of input.options) for (const question of Object.values(option.option.jev?.questions ?? {}))
    question.instructions = "格式测试".repeat(2000);
  const d = buildV6RoomDecision(e, input, undefined, "fixed_provider_unavailable", dir);
  expect(bytes(d.state)).toBeLessThanOrEqual(V6_JEV_STATE_BYTES);
  expect(bytes({ model: "typesafe/jev-1.14", state: d.state, questions: d.questions })).toBeLessThanOrEqual(V6_JEV_REQUEST_BYTES);
  expect(Object.keys(asRecord(d.questions.pick).criteria)).toEqual(input.options.map(o => o.option.key));
  expect(Object.keys(d.questions)).toEqual(["pick", "discard_p2", "discard_p7"]);
  for (const key of ["discard_p2", "discard_p7"]) {
    expect(d.questions[key]!.type).toBe("noul");
    expect(Buffer.byteLength(d.questions[key]!.instructions)).toBeLessThanOrEqual(600);
  }
  const valid: AnswerSet = { ...answer(variant.option.key), discard_p2: { type: "noul", noul: .1, raw: {} }, discard_p7: { type: "noul", noul: .9, raw: {} } };
  for (const bad of [answer(variant.option.key), { ...valid, discard_p7: { type: "noul" as const, noul: NaN, raw: {} } }]) {
    const result = d.resolve(bad);
    expect(result.fallback).toBe(true); expect(result.intent).toEqual({ action: "choose_rest_option", option_index: 0 });
  }
  expect(e.screenMemory.afterDiscard).toBeUndefined();
  const result = d.resolve(valid);
  expect(result.fallback).toBe(false); expect(result.intent).toEqual({ action: "discard_potion", option_index: 7 });
  result.apply?.();
  expect(e.screenMemory.afterDiscard).toMatchObject({ place: "rest", option: 2, slot: 7, more: [] });
});

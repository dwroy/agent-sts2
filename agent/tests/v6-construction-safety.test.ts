import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { constructionCoverage, constructionQuestion, recordConstructionHandover, unknownCardLastResort } from "../src/v6/construction-safety.js";
import { v6Config } from "../src/v6/config.js";
import { detectReplan, freshReplanState } from "../src/v6/replan-triggers.js";
import type { V6ProjectionTable } from "../src/sim/v6-projection.js";
import type { AskDecision } from "../src/memory/types.js";
import { knownCurrentRows } from "./v6-projection-fixture.js";
import { board, env, setupOneshotTests } from "./oneshot-support.js";
setupOneshotTests();
const dirs: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
function table(keys: string[]): V6ProjectionTable {
  const t = { enabled: true, combinations: [], targets: [{ id: "current", kind: "current", probability: 1 }], target_mixtures: [] } as unknown as V6ProjectionTable;
  knownCurrentRows(t, keys); return t;
}
it.each([
  [[], ["a", "b"], "insufficient_known_options"],
  [["a"], ["a", "b"], "insufficient_known_options"],
  [["a", "b"], ["a", "b", "c", "d"], null],
  [["a", "b"], ["a", "b", "c", "d", "e"], "known_ratio_below_threshold"],
] as const)("counts current Boss values by offered option (%j)", (known, options, reason) => {
  const result = constructionCoverage(options, table([...known]));
  expect(result).toMatchObject({ known: known.length, total: options.length, reason });
});
it("does not require later target mass or count duplicate options, but rejects malformed current values", () => {
  const t = table(["a", "a", "b", "c", "d", "e"]);
  t.combinations[2]!.entry.availability.take = null;
  t.combinations[3]!.entry.win_complete = null;
  t.combinations[4]!.entry.win_complete!.se = NaN;
  t.combinations[5]!.entry.win_complete!.n = 0;
  t.targets.push({ id: "chain", kind: "chain", unknown: "ordered_pair_missing", probability: .69 } as never);
  expect(constructionCoverage(["a", "a", "b", "c", "d", "e", "foreign"], t)).toMatchObject({ known: 1, total: 6, reason: "insufficient_known_options" });
});

it("configures the coverage ratio and validates its range without weakening the two-option minimum", () => {
  const config = v6Config({ V6_MIN_KNOWN_OPTION_RATIO: ".75" });
  expect(constructionCoverage(["a", "b", "c"], table(["a", "b"]), config).reason).toBe("known_ratio_below_threshold");
  expect(constructionCoverage(["a"], table(["a"]), v6Config({ V6_MIN_KNOWN_OPTION_RATIO: "0" })).reason).toBe("insufficient_known_options");
  expect(v6Config({ V6_MIN_KNOWN_OPTION_RATIO: "2" })).toMatchObject({ min_known_option_ratio: .5, invalid: ["V6_MIN_KNOWN_OPTION_RATIO"] });
});
it.each(["off", "shadow"])("does not change %s routing or record handovers", mode => {
  vi.stubEnv("V6_BUILD", mode); vi.stubEnv("V6_CARD_DECIDER", "jev");
  const e = env(board("xljq-f5-reward", "reward"));
  const decision = { kind: "ask", label: "reward/card", v6Card: true } as AskDecision;
  const before = JSON.stringify(e.screenMemory);
  expect(constructionQuestion(e, decision)).toBeNull();
  expect(JSON.stringify(e.screenMemory)).toBe(before);
});
it("records coverage recovery only for the observed construction kind and run", () => {
  vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_CARD_DECIDER", "jev");
  const e = env(board("xljq-f5-reward", "reward"));
  const decision = { kind: "ask", label: "reward/card", v6Card: true,
    questions: { pick: { type: "choice", criteria: { a: "a", b: "b" } } } } as unknown as AskDecision;
  const run = String(e.state.raw.run_id);
  e.screenMemory.v6ConstructionRecovered = { run, kinds: ["shop", "potion"] };
  e.v6ProjectionTable = table(["a", "b"]);
  expect(constructionQuestion(e, decision)?.coverage.reason).toBeNull();
  expect(e.screenMemory.v6ConstructionRecovered).toEqual({ run, kinds: ["shop", "potion", "card_pick"] });
  e.v6ProjectionTable = undefined;
  expect(constructionQuestion(e, decision)?.coverage.known).toBe(0);
  expect(e.screenMemory.v6ConstructionRecovered).toEqual({ run, kinds: ["shop", "potion"] });
  e.screenMemory.v6ConstructionRecovered = { run: "OTHER", kinds: ["shop"] };
  constructionQuestion(e, decision);
  expect(e.screenMemory.v6ConstructionRecovered).toEqual({ run, kinds: [] });
});
it("records an exact handover event and a first-failure T6 signal even without projection entries", () => {
  vi.stubEnv("V6_BUILD", "on");
  const dir = mkdtempSync(join(tmpdir(), "v6-safety-")); dirs.push(dir);
  const e = env(board("xljq-f5-reward", "reward"));
  recordConstructionHandover(e, join(dir, "plans.jsonl"), "fixture", "card_pick", constructionCoverage(["take", "skip"]), "insufficient_known_options");
  const row = JSON.parse(readFileSync(join(dir, "v6-build.jsonl"), "utf8"));
  expect(row).toMatchObject({ event: "v6_unknown_to_brain", triggers: ["T6"], unknown: { count: 2, total: 2 } });
  expect(row.fallback).toContain("known=0/2; threshold=0.5");
  expect(e.screenMemory.v6BrainFallbackPending?.run).toBe(String(e.state.raw.run_id));
  expect(e.screenMemory.v6BrainFallbackPending?.issue).toEqual({ kind: "card_pick", reason: "insufficient_known_options", known: 0, total: 2, unknownOptions: ["take", "skip"] });
  const s = freshReplanState("fixture"); s.act = 1;
  expect(detectReplan(s, { act: 1, floor: 5, turnKey: "fixture", requirementIds: new Set(),
    evaluation: { id: "fixture", entries: [], constructionHandover: true } }).triggers).toEqual(["T6"]);
});

it("uses the first legal offered card only when both models failed and the original baseline would skip", () => {
  const take = { action: "choose_reward_card", option_index: 7 };
  const original = { kind: "ask", label: "reward/card", deepseek: { options: () => [{ intent: take }] } } as unknown as AskDecision;
  const skip = { kind: "act", label: "reward/card", intent: { action: "skip_reward_cards" }, rationale: "baseline" } as const;
  expect(unknownCardLastResort(original, skip)).toMatchObject({ intent: take, fallback: true });
  expect(unknownCardLastResort(original, { ...skip, intent: take })).toBeNull();
  expect(unknownCardLastResort({ ...original, label: "selection/remove" }, skip)).toBeNull();
});

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { projectSilentCombatDecision } from "../src/reflex/jev/decision-projection.js";
import { askJevLogged, type JevPromptRecord } from "../src/eye/jev-prompt-log.js";
import type { QuestionSet } from "../src/reflex/jev/questions.js";
import { JevError } from "../src/reflex/jev/client.js";

const rawFixture = JSON.parse(readFileSync(new URL("./jev-context-recovery-request.json", import.meta.url), "utf8")) as { state: Record<string, unknown>; questions: QuestionSet };
const fixture = { state: rawFixture.state, questions: rawFixture.questions };
const meta = { decisionId: "frozen-W1", runId: "W1YY8PEWGUF9", floor: 17, turn: 1, fingerprint: "fixed", observedTs: "2026-10-14T10:44:02Z", label: "combat/plan-choice", jevContext: "v1", call: "ask" as const };
const sourceValue = (object: unknown, path: string): unknown => path.split(".").reduce((value, field) => (value as Record<string, unknown>)[field], object);

it("replaces the frozen rejected request with source-bound decision facts, keeping every candidate and all original evidence", () => {
  const before = JSON.stringify(fixture), projected = projectSilentCombatDecision(fixture.state, fixture.questions)!;
  expect(projected.contract.schema).toBe("silent-combat-decision-v1");
  expect(projected.contract.sourceSha256).toBe(createHash("sha256").update(before).digest("hex"));
  for (const [qid, question] of Object.entries(fixture.questions)) {
    if (question.type !== "choice") continue;
    const wire = projected.questions[qid];
    expect(wire?.type).toBe("choice");
    if (wire?.type !== "choice") throw Error("missing choice");
    expect(Object.keys(wire.criteria)).toEqual(Object.keys(question.criteria));
    expect(wire.instructions).toBe(question.instructions);
    for (const candidate of Object.keys(question.criteria)) {
      const old = JSON.parse(question.criteria[candidate]!), current = JSON.parse(wire.criteria[candidate]!);
      expect(current).not.toHaveProperty("quantitative_turn");
      expect(current).not.toHaveProperty("boss_relative_margin");
      expect(current).not.toHaveProperty("rollout_turns");
      expect(current).not.toHaveProperty("dmg");
      expect(current.turn_model.realization).not.toHaveProperty("actions");
      expect(current.turn_model.realization).not.toHaveProperty("established_before");
      expect(current.turn_model.realization).not.toHaveProperty("modeled_after_actions");
      expect(current.boss_evaluation).not.toHaveProperty("observedSubset");
      expect(current.boss_evaluation).not.toHaveProperty("won");
      expect(current.boss_evaluation).not.toHaveProperty("died");
      for (const key of ["plays", "result", "hp_lost", "damage_dealt", "potion_cost", "lethal_now", "whole_fight_sim", "rollout"]) expect(current[key]).toEqual(old[key]);
      for (const key of ["samples", "valid", "missing", "rankingEligible", "reference", "limits"]) expect(current.boss_evaluation[key]).toEqual(old.boss_relative_margin[key]);
      for (const binding of projected.contract.sources.filter((entry) => entry.question === qid && entry.candidate === candidate)) expect(sourceValue(current, binding.field)).toEqual(sourceValue(old, binding.source));
    }
  }
  expect(projected.evidence).toEqual(fixture);
  expect(JSON.stringify(fixture)).toBe(before);
  expect(projected.contract.projectedBytes).toBeLessThan(projected.contract.originalBytes);
});

it("keeps null, incomplete coverage, unknown attribution and low trust, without zero backfill or leaking new internal statistics", () => {
  const questions: QuestionSet = { plan: { type: "choice", instructions: "same", criteria: { a: JSON.stringify({
    plays: "end turn", damage_dealt: 3, dmg: 4, protection: "original guard",
    quantitative_turn: { schema: "quantitative-v1", unknown_cards: ["UNKNOWN"], realization: { complete_line: false, delayed_damage: null, unknown: ["own cost"], energy_paid: 0, actions: ["audit-only"] } },
    boss_relative_margin: { schema: "boss-relative-margin-v1", status: "unknown", rankingEligible: false, samples: 1000, valid: 800, missing: 200, reference: { unknown: ["self-damage"] }, score: null, myDpr: { n: 800, mean: 0.1234567890123456, internalNewSamples: ["audit-only"] }, enemyDpr: null, paired: { difference: null, unmatchedBase: 200, unmatchedOption: 0 }, futureInternal: ["audit-only"] },
  }), missing: null, prose: "original unknown effect" } } };
  const result = projectSilentCombatDecision(fixture.state, questions)!;
  const q = result.questions.plan;
  if (q?.type !== "choice") throw Error("missing question");
  const value = JSON.parse(q.criteria.a!);
  expect(value.dmg).toBe(4);
  expect(value.protection).toBe("original guard");
  expect(value.turn_model.realization).toMatchObject({ complete_line: false, delayed_damage: null, unknown: ["own cost"], energy_paid: 0 });
  expect(value.turn_model).not.toHaveProperty("hp_after");
  expect(value.boss_evaluation).toMatchObject({ rankingEligible: false, samples: 1000, valid: 800, missing: 200, score: null, myDpr: { n: 800, mean: 0.1234567890123456 }, enemyDpr: null, paired: { difference: null, unmatchedBase: 200, unmatchedOption: 0 } });
  expect(JSON.stringify(value)).not.toContain("audit-only");
  expect(q.criteria.missing).toBeNull();
  expect(q.criteria.prose).toBe("original unknown effect");
});

it("does not change another character or route high-level Codex questions to Jev", () => {
  for (const character of ["IRONCLAD", "REGENT", "铁甲战士", undefined]) expect(projectSilentCombatDecision({ ...fixture.state, run_brief: { character } }, fixture.questions)).toBeNull();
  expect(projectSilentCombatDecision(fixture.state, { route: fixture.questions.plan! })).toBeNull();
});

it("the actual Jev call receives the replacement while the joined prompt log keeps the full source and audit binding", async () => {
  const rows: JevPromptRecord[] = [], calls: { state: unknown; questions: QuestionSet }[] = [];
  const client = { model: "same-jev-model", async ask(state: unknown, questions: QuestionSet) {
    calls.push({ state, questions });
    return { model: "same-jev-model", answers: {}, latencyMs: 1, inputTokens: 4321, outputTokens: 4, requestId: "fixed-request" };
  } };
  await askJevLogged(client, { path: "fixed", write: (row) => rows.push(row) }, meta, fixture.state, fixture.questions);
  expect(calls).toHaveLength(1);
  const q = calls[0]!.questions.plan;
  if (q?.type !== "choice") throw Error("missing question");
  expect(JSON.parse(q.criteria.plan1!)).toHaveProperty("boss_evaluation");
  expect(JSON.parse(q.criteria.plan1!)).not.toHaveProperty("boss_relative_margin");
  expect(rows[0]!.request).toEqual({ model: client.model, ...calls[0] });
  const original = { state: fixture.state, questions: fixture.questions };
  expect(rows[0]!.decision_evidence).toEqual(original);
  expect(rows[0]!.decision_projection?.sourceSha256).toBe(createHash("sha256").update(JSON.stringify(original)).digest("hex"));
  expect(rows[0]!.input_tokens).toBe(4321);
});

it("a projected rejection cannot retry the discarded full payload or bypass the two-call limit", async () => {
  const rows: JevPromptRecord[] = [], calls: QuestionSet[] = [];
  const error = new JevError("validation", '400 {"detail":{"error_type":"max_tokens_exceeded"}}', { status: 400 });
  const client = { model: "same", async ask(_state: unknown, questions: QuestionSet): Promise<never> { calls.push(questions); throw error; } };
  await expect(askJevLogged(client, { path: "fixed", write: (row) => rows.push(row) }, meta, fixture.state, fixture.questions)).rejects.toThrow("max_tokens_exceeded");
  expect(calls.length).toBeLessThanOrEqual(2);
  const original = { state: fixture.state, questions: fixture.questions };
  expect(rows[0]!.decision_evidence).toEqual(original);
  for (const row of rows) expect(row.decision_projection?.schema).toBe("silent-combat-decision-v1");
  for (const questions of calls) expect(JSON.stringify(questions)).not.toContain("modeled_after_actions");
});

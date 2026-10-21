import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it, vi } from "vitest";
import * as knowledgeLoader from "../src/v6/knowledge.js";
import { loadCombatEntries, combatEntryAudit } from "../src/reflex/jev/combat-entries.js";
import { projectCombatDecision } from "../src/reflex/jev/combat-entry-projection.js";
import { askJevLogged, type JevPromptRecord } from "../src/eye/jev-prompt-log.js";
import { JevError, prepareJevOpenBook } from "../src/reflex/jev/client.js";
import type { QuestionSet } from "../src/reflex/jev/questions.js";
import { annotatedFrozen, fixedBoss, fixedPlan, fixedRollout, fixedState, installFixture } from "./v6-combat-fixtures.js";
import baselines from "./v6-combat-off-baseline.json";

const directories: string[] = [];
const temp = () => { const path = mkdtempSync(join(tmpdir(), "v6-combat-test-")); directories.push(path); return path; };
afterEach(() => { directories.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); vi.unstubAllEnvs(); });
const meta = { decisionId: "W8_FROZEN", runId: "W1YY8PEWGUF9", floor: 17, turn: 1, fingerprint: "fixed", observedTs: "fixed", label: "combat/plan-choice", jevContext: "v1", call: "ask" as const };
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const frozen = () => JSON.parse(readFileSync(new URL("./jev-context-recovery-request.json", import.meta.url), "utf8")) as { state: Record<string, any>; questions: QuestionSet };
const valueAt = (v: any, path: string): any => path.split(".").reduce((r, key) => r[key], v);
const criterion = (q: QuestionSet, key?: string) => {
  const question = q.plan ?? q.pick;
  if (question?.type !== "choice") throw Error("missing frozen choice");
  return JSON.parse(question.criteria[key ?? Object.keys(question.criteria)[0]!]!);
};

for (const character of Object.keys(baselines)) it.each([undefined, "off", "true", "shadow"])(`${character} W8=%s preserves pre-W8 frozen wire bytes`, async setting => {
  vi.stubEnv("V6_COMBAT_ENTRIES", setting);
  const fixture = frozen(); fixture.state.run_brief.character = character;
  const calls: unknown[] = [];
  const client = { model: "frozen-jev", async ask(state: unknown, questions: QuestionSet) {
    calls.push({ state, questions });
    return { model: this.model, answers: {}, inputTokens: 0, outputTokens: 0, latencyMs: 0, requestId: null };
  } };
  await askJevLogged(client, null, meta, fixture.state, fixture.questions);
  // #25 adds references independently of W8; all pre-existing wire fields retain their frozen hash.
  const wire = calls[0] as { state: Record<string, unknown>; questions: QuestionSet };
  const { open_book, ...originalState } = wire.state;
  expect(hash({ state: originalState, questions: wire.questions })).toBe((baselines as Record<string, string>)[character]);
  expect(open_book).toEqual((prepareJevOpenBook(fixture.state, fixture.questions, true) as Record<string, unknown>).open_book);
});

it("requires explicit on and both valid role-local files; missing knowledge preserves the old wire without fallback", () => {
  const dir = temp(), state = fixedState();
  expect(loadCombatEntries(state, dir, {})).toBeNull();
  expect(loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })).toBeNull();
  const path = installFixture(dir);
  for (const character of ["IRONCLAD", "REGENT", "NECROBINDER", "DEFECT"]) {
    const other = fixedState(); other.run!.raw["character_id"] = character;
    expect(loadCombatEntries(other, dir, { V6_COMBAT_ENTRIES: "on" })).toBeNull();
  }
  const baseline = frozen();
  expect(projectCombatDecision(baseline.state, baseline.questions, { V6_COMBAT_ENTRIES: "on" }))
    .toEqual(projectCombatDecision(baseline.state, baseline.questions, {}));
  unlinkSync(join(path, "reflex-vocab.json"));
  expect(loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })).toBeNull();
  installFixture(dir); writeFileSync(join(path, "reflex.json"), "{}");
  expect(loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })).toBeNull();
});

it("uses W1 predicates, per-character/ascension scope and learner enums; absent tags remain unknown under NOT", () => {
  const dir = temp(); installFixture(dir);
  const session = loadCombatEntries(fixedState(), dir, { V6_COMBAT_ENTRIES: "on" })!;
  const audit = combatEntryAudit(session, fixedPlan, fixedRollout, fixedBoss) as any;
  expect(audit.memory.map((m: any) => m.id)).toEqual(["TEST_HP", "TEST_TAG"]);
  expect(audit.memory[0]).toMatchObject({ signal: { kind: "hp", value: 1.25, se: .2 }, confidence: .5, n_support: 1,
    source: { path: "characters/silent/reflex.json", sha256: hash(session.entries), entry_id: "TEST_HP" } });
  expect(audit.memory[1].vocabulary).toEqual([{ dimension: "card_role", id: "TEST_TAG", label_en: "Test tag" }]);
  expect(audit.evaluated).toContainEqual({ id: "TEST_MISSING", result: null });
  expect(audit.context).not.toHaveProperty("card");
  expect(audit.context).not.toHaveProperty("direction_weights");
  const unknown = combatEntryAudit(session, null, null, null, "unmodelled") as any;
  expect(unknown.memory).toEqual([]);
  expect(unknown.rollout).toMatchObject({ horizon_turns: null, samples: null, further_hp_loss: null, win_probability: null });
  expect(unknown.whole_fight).toMatchObject({ horizon_turns: null, samples: null, further_hp_loss: null, win_probability: null });
});

it.each(Object.keys(baselines))("loads only %s's validated memory without assuming unobserved values", character => {
  const dir = temp(); installFixture(dir, character.toLowerCase());
  const state = fixedState(); state.run!.raw["character_id"] = character;
  const combat = state.raw["combat"] as Record<string, unknown>;
  combat["player"] = { powers: [{ power_id: "TEST_ZERO", amount: 0 }, { power_id: "TEST_UNKNOWN" }] };
  combat["enemies"] = [{ is_alive: true, intents: [{ intent_type: "ATTACK", damage: 4, hits: 2 }] },
    { is_alive: true, powers: [{ power_id: "TEST_OTHER_ENEMY", amount: 1 }] }];
  const session = loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })!;
  expect(session.character).toBe(character.toLowerCase());
  expect(session.context.player).toMatchObject({ powers: { TEST_ZERO: 0 } });
  expect(session.context.player).not.toHaveProperty("hp");
  expect(session.context).not.toHaveProperty("enemy");
  expect((combatEntryAudit(session, fixedPlan, null, null) as any).memory.map((m: any) => m.id)).toEqual(["TEST_HP", "TEST_TAG"]);
  combat["enemies"] = [{ is_alive: true, intents: [{ intent_type: "ATTACK", damage: 4 }] }];
  const singular = loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })!;
  expect(singular.context.enemy).toEqual({ alive: true, intent_type: "ATTACK", powers: {} });
  state.run!.ascension = null;
  expect(loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })).toBeNull();
});

it("projects complete numeric fields with exact source bindings and preserves the entire frozen decision evidence", () => {
  const dir = temp(); installFixture(dir);
  const fixture = annotatedFrozen(dir), original = JSON.stringify(fixture);
  const p = projectCombatDecision(fixture.state, fixture.questions, { V6_COMBAT_ENTRIES: "on" })!;
  expect(p.contract.schema).toBe("v6-combat-decision-v1");
  expect(p.evidence).toEqual(fixture); expect(JSON.stringify(fixture)).toBe(original);
  expect(p.contract.sourceSha256).toBe(hash(fixture));
  for (const [qid, question] of Object.entries(p.questions)) if (question.type === "choice") {
    const oldQ = fixture.questions[qid]!;
    if (oldQ.type !== "choice") throw Error("changed choice");
    expect(Object.keys(question.criteria)).toEqual(Object.keys(oldQ.criteria));
    expect(question.instructions).toBe(oldQ.instructions);
    for (const [key, text] of Object.entries(question.criteria)) {
      const original = JSON.parse(oldQ.criteria[key]!), view = JSON.parse(text!);
      expect(view).not.toHaveProperty("rollout"); expect(view).not.toHaveProperty("whole_fight_sim");
      expect(view).not.toHaveProperty("v6_combat_entry");
      expect(view.simulation.rollout).toMatchObject({ horizon_turns: 5, samples: 4, further_hp_loss: 6.25, win_probability: .75, horizon_win_probability: .5, truncation_reasons: ["horizon"] });
      expect(view.simulation.whole_fight).toMatchObject({ horizon_turns: 30, samples: 4, further_hp_loss: 9, win_probability: .4, raw_win_probability: .5,
        trust: { level: "low", bias: "unknown", ranking_eligible: false } });
      for (const binding of p.contract.sources.filter(s => s.question === qid && s.candidate === key))
        expect(valueAt(view, binding.field)).toEqual(valueAt(original, binding.source));
      for (const key of ["plays", "result", "hp_lost", "potion_cost"]) expect(view[key]).toEqual(original[key]);
    }
  }
  expect(p.state.run_plan).toMatchObject({ source: { kind: "run_memory", author: "unknown" }, text: "Run plan (F8; advice, not orders): TEST recorded plan" });
  expect(p.state).not.toHaveProperty("deepseek_plan");
  expect(JSON.stringify({ state: p.state, questions: p.questions })).not.toContain("TEST_AUDIT_ONLY");
  expect(JSON.stringify(p.evidence)).toContain("TEST_AUDIT_ONLY");
});

it("does not turn a clock fallback, unavailable simulation or zero samples into a win estimate", () => {
  const dir = temp(); installFixture(dir);
  const s = loadCombatEntries(fixedState(), dir, { V6_COMBAT_ENTRIES: "on" })!;
  if (!fixedRollout.available || !fixedBoss.available) throw Error("fixture");
  const audit = combatEntryAudit(s, fixedPlan, { ...fixedRollout, result: { ...fixedRollout.result, degraded: ["1-turn"] } }, fixedBoss) as any;
  expect(audit.rollout).toMatchObject({ status: "clock_estimate", further_hp_loss: 6.25, win_probability: null, horizon_wins: null, truncation_reasons: ["budget", "clock_fallback"] });
  const boss = structuredClone(fixedBoss); if (!boss.available) throw Error("fixture");
  delete (boss.run as typeof boss.run & { maxTurns?: number }).maxTurns;
  expect((combatEntryAudit(s, fixedPlan, null, boss) as any).whole_fight.horizon_turns).toBeNull();
  boss.byPlan = new Map([[fixedPlan, { ...fixedBoss.byPlan.get(fixedPlan)!, result: { ...fixedBoss.byPlan.get(fixedPlan)!.result, samples: 0 } }]]);
  expect((combatEntryAudit(s, fixedPlan, null, boss) as any).whole_fight).toMatchObject({ samples: 0, further_hp_loss: null, win_probability: null, wins: null });
});

it("sends the W8 projection and keeps joined evidence through a single bounded context-recovery retry", async () => {
  vi.stubEnv("V6_COMBAT_ENTRIES", "on");
  const dir = temp(); installFixture(dir); const fixture = annotatedFrozen(dir);
  const rows: JevPromptRecord[] = [], calls: { state: unknown; questions: QuestionSet }[] = [];
  const client = { model: "frozen-jev", async ask(state: unknown, questions: QuestionSet) {
    calls.push({ state, questions });
    if (calls.length === 1) throw new JevError("validation", '{"detail":{"error_type":"max_tokens_exceeded"}}', { status: 400 });
    return { model: this.model, answers: {}, inputTokens: 2, outputTokens: 1, latencyMs: 1, requestId: "W8_FIXED_ACCEPTED" };
  } };
  await askJevLogged(client, { path: "fixed", write: r => rows.push(r) }, meta, fixture.state, fixture.questions);
  expect(calls).toHaveLength(2); expect(rows).toHaveLength(2);
  expect(rows[0]!.decision_evidence).toEqual({ state: prepareJevOpenBook(fixture.state, fixture.questions, true), questions: fixture.questions });
  expect(rows[1]!.decision_evidence).toBeUndefined();
  expect(rows[1]!.decision_projection).toEqual(rows[0]!.decision_projection);
  expect(criterion(calls[0]!.questions).combat_memory).toHaveLength(2);
});


it("reuses validated files, refreshes actual-state predicates and invalidates edits and missing files", () => {
  const dir = temp(), path = installFixture(dir), state = fixedState();
  const spy = vi.spyOn(knowledgeLoader, "loadV6Knowledge");
  try {
    const first = loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })!;
    const second = loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })!;
    expect(spy).toHaveBeenCalledTimes(1);
    expect(second.provenance).toBe(first.provenance);
    expect(second.predicateFacts).not.toBe(first.predicateFacts);
    const source = JSON.parse(readFileSync(join(path, "reflex.json"), "utf8"));
    source.entries[0].signal.value = 3.75;
    writeFileSync(join(path, "reflex.json"), JSON.stringify(source));
    const changed = loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })!;
    expect(changed.entries[0]!.signal.value).toBe(3.75);
    expect(spy).toHaveBeenCalledTimes(2);
    unlinkSync(join(path, "reflex.json"));
    expect(loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })).toBeNull();
    expect(spy).toHaveBeenCalledTimes(3);
    expect(loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "off" })).toBeNull();
    expect(spy).toHaveBeenCalledTimes(3);
  } finally { spy.mockRestore(); }
});

/** Fixed deployment-selection fixtures; no learned rules, game actions or model calls. */
import { afterEach, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { combatEntrySelectionConfig } from "../src/v6/combat-entry-selection.js";
import { combatEntryAudit, combatEntriesState, loadCombatEntries } from "../src/reflex/jev/combat-entries.js";
import { prepareCombatEntryReplay } from "../src/reflex/jev/combat-entry-replay.js";
import { projectCombatDecision } from "../src/reflex/jev/combat-entry-projection.js";
import { annotatedFrozen, fixedPlan, fixedState, installFixture } from "./v6-combat-fixtures.js";
import { captureCombatEntryReplay } from "../tools/v6/capture-combat-entry-replay.js";
import { loadConfig } from "../src/core/config.js";
import { runConfigRow } from "../src/eye/run-config.js";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, { force: true, recursive: true })));
function fixture(boss = "AEONGLASS") {
  const dir = mkdtempSync(join(tmpdir(), "combat-selection-")); dirs.push(dir); installFixture(dir);
  const state = fixedState();
  const combat = state.raw.combat as Record<string, unknown>;
  combat.enemies = [{ enemy_id: boss, is_alive: true }, { enemy_id: "TEST_COMPANION", is_alive: true }];
  return { dir, state, env: { V6_COMBAT_ENTRIES: "on", V6_COMBAT_ENTRY_SELECTION: JSON.stringify({ [boss]: ["TEST_HP"] }) } };
}

it.each(["AEONGLASS", "TEST_SUBJECT", "THE_INSATIABLE", "QUEEN"])("selects exact %s IDs, preserves full provenance and does not leak other entries", boss => {
  const { dir, state, env } = fixture(boss), all = loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })!;
  const one = loadCombatEntries(state, dir, env)!;
  expect(one.entries.map(e => e.id)).toEqual(["TEST_HP"]);
  expect(one.provenance).toEqual(all.provenance);
  expect((combatEntryAudit(one, fixedPlan, null, null) as any).memory.map((e: any) => e.id)).toEqual(["TEST_HP"]);
  expect((combatEntriesState(one, false) as any).selection).toEqual({ schema: "combat-entry-selection-v1", boss, entry_ids: ["TEST_HP"] });
  expect(loadCombatEntries(state, dir, { ...env, V6_COMBAT_ENTRIES: "off" })).toBeNull();
  const other = { ...env, V6_COMBAT_ENTRY_SELECTION: JSON.stringify({ [boss]: ["TEST_TAG"] }) };
  expect(loadCombatEntries(state, dir, other)!.entries.map(e => e.id)).toEqual(["TEST_TAG"]);
  // Removing the mapping disables only that boss; other configured entries cannot spill across bosses.
  const different = boss === "QUEEN" ? "AEONGLASS" : "QUEEN";
  expect(loadCombatEntries(state, dir, { ...env, V6_COMBAT_ENTRY_SELECTION: JSON.stringify({ [different]: ["TEST_HP"] }) })).toBeNull();
});

it.each(["", "null", "[]", "false", "on", "{", '{"*": ["TEST_HP"]}', '{"AEONGLASS":"TEST_HP"}',
  '{"AEONGLASS":["TEST_HP","TEST_HP"]}', '{"AEONGLASS":["*"]}', '{"AEONGLASS":["constructor"]}',
  '{"AEONGLASS":[42]}', '{"OTHER_BOSS":["TEST_HP"]}', " ".repeat(16385)])("fails closed on invalid selector %s", raw => {
  const { dir, state, env } = fixture();
  expect(combatEntrySelectionConfig(raw)).toEqual({ mode: "invalid" });
  expect(loadCombatEntries(state, dir, { ...env, V6_COMBAT_ENTRY_SELECTION: raw })).toBeNull();
});

it("never falls back for empty/unknown/inapplicable IDs, absent boss facts, non-targets or another act", () => {
  const { dir, state, env } = fixture();
  for (const map of [{}, { AEONGLASS: [] }, { AEONGLASS: ["MISSING"] }, { AEONGLASS: ["TEST_HP", "MISSING"] },
    { AEONGLASS: ["TEST_OTHER_SCREEN"] }, { AEONGLASS: ["TEST_OTHER_ASCENSION"] }])
    expect(loadCombatEntries(state, dir, { ...env, V6_COMBAT_ENTRY_SELECTION: JSON.stringify(map) })).toBeNull();
  for (const enemies of [undefined, [], [{ enemy_id: "OTHER", is_alive: true }], [{ enemy_id: "AEONGLASS" }],
    [{ enemy_id: "AEONGLASS", is_alive: false }], [{ enemy_id: "AEONGLASS", is_alive: true }, { enemy_id: "QUEEN", is_alive: true }]]) {
    (state.raw.combat as Record<string, unknown>).enemies = enemies;
    expect(loadCombatEntries(state, dir, env)).toBeNull();
  }
  (state.raw.combat as Record<string, unknown>).enemies = [{ enemy_id: "AEONGLASS", is_alive: true }];
  state.run!.act_id = "3";
  expect(loadCombatEntries(state, dir, env)).toBeNull();
});

it.each([1, 2, 3])("selects the observed boss in valid act %s without assuming all targets are in act three", act => {
  const { dir, state, env } = fixture("THE_INSATIABLE");
  state.run!.act_id = String(act - 1);
  const session = loadCombatEntries(state, dir, env)!;
  expect(session.entries.map(e => e.id)).toEqual(["TEST_HP"]);
  expect(session.selection?.boss).toBe("THE_INSATIABLE");
  expect(session.act).toBe(act);
  if (act === 2) {
    const request = annotatedFrozen(dir);
    request.state.v6_combat_entries = combatEntriesState(session, false);
    for (const q of Object.values(request.questions)) if (q.type === "choice") for (const key of Object.keys(q.criteria)) {
      const f = JSON.parse(q.criteria[key]!); f.v6_combat_entry = combatEntryAudit(session, fixedPlan, null, null);
      q.criteria[key] = JSON.stringify(f);
    }
    expect(Object.values(prepareCombatEntryReplay(request).matched).every(ids => JSON.stringify(ids) === '["TEST_HP"]')).toBe(true);
    expect(projectCombatDecision(request.state, request.questions, env)!.contract.schema).toBe("v6-combat-decision-v1");
  }
});

it("selects the observed Act 2 crab pair and either survivor with one exact shared entry set", () => {
  const { dir, state } = fixture();
  state.run!.act_id = "1";
  const env = { V6_COMBAT_ENTRIES: "on", V6_COMBAT_ENTRY_SELECTION: '{"CRUSHER+ROCKET":["TEST_HP"]}' };
  for (const enemies of [
    [{ enemy_id: "CRUSHER", is_alive: true }, { enemy_id: "ROCKET", is_alive: true }],
    [{ enemy_id: "CRUSHER", is_alive: true }, { enemy_id: "ROCKET", is_alive: false }],
    [{ enemy_id: "CRUSHER", is_alive: true }], [{ enemy_id: "ROCKET", is_alive: true }],
  ]) {
    (state.raw.combat as Record<string, unknown>).enemies = enemies;
    const session = loadCombatEntries(state, dir, env)!;
    expect(session.entries.map(e => e.id)).toEqual(["TEST_HP"]);
    expect(session.selection).toEqual({ schema: "combat-entry-selection-v1", boss: "CRUSHER+ROCKET", entry_ids: ["TEST_HP"] });
    expect(loadCombatEntries(state, dir, { ...env, V6_COMBAT_ENTRIES: "off" })).toBeNull();
    expect(loadCombatEntries(state, dir, { ...env, V6_COMBAT_ENTRY_SELECTION: '{"AEONGLASS":["TEST_HP"]}' })).toBeNull();
    const request = annotatedFrozen(dir);
    request.state.v6_combat_entries = combatEntriesState(session, false);
    for (const q of Object.values(request.questions)) if (q.type === "choice") for (const key of Object.keys(q.criteria)) {
      const facts = JSON.parse(q.criteria[key]!); facts.v6_combat_entry = combatEntryAudit(session, fixedPlan, null, null);
      q.criteria[key] = JSON.stringify(facts);
    }
    expect(Object.values(prepareCombatEntryReplay(request).matched).every(ids => JSON.stringify(ids) === '["TEST_HP"]')).toBe(true);
    expect(projectCombatDecision(request.state, request.questions, env)!.contract.schema).toBe("v6-combat-decision-v1");
  }
});

it("rejects ambiguous crab membership, missing liveness, wrong acts and an individual part selector", () => {
  const { dir, state } = fixture(); state.run!.act_id = "1";
  const env = { V6_COMBAT_ENTRIES: "on", V6_COMBAT_ENTRY_SELECTION: '{"CRUSHER+ROCKET":["TEST_HP"]}' };
  for (const enemies of [[], [{ enemy_id: "CRUSHER" }], [{ enemy_id: "ROCKET", is_alive: false }],
    [{ enemy_id: "CRUSHER", is_alive: true }, { enemy_id: "ROCKET" }],
    [{ enemy_id: "CRUSHER", is_alive: true }, { enemy_id: "CRUSHER", is_alive: true }],
    [{ enemy_id: "CRUSHER", is_alive: true }, { enemy_id: "CRUSHER", is_alive: false }],
    [{ enemy_id: "CRUSHER", is_alive: true }, { enemy_id: "OTHER", is_alive: true }],
    [{ enemy_id: "CRUSHER", is_alive: true }, { enemy_id: "AEONGLASS", is_alive: true }],
    [{ enemy_id: "CRUSHER", is_alive: true }, null]]) {
    (state.raw.combat as Record<string, unknown>).enemies = enemies;
    expect(loadCombatEntries(state, dir, env)).toBeNull();
  }
  (state.raw.combat as Record<string, unknown>).enemies = [{ enemy_id: "ROCKET", is_alive: true }];
  for (const act of ["0", "2"]) { state.run!.act_id = act; expect(loadCombatEntries(state, dir, env)).toBeNull(); }
  state.run!.act_id = "1";
  for (const part of ["CRUSHER", "ROCKET", "KAISER_CRAB_BOSS"])
    expect(loadCombatEntries(state, dir, { ...env, V6_COMBAT_ENTRY_SELECTION: JSON.stringify({ [part]: ["TEST_HP"] }) })).toBeNull();
});

it("preserves unconfigured and Ironclad behavior, even if Silent's selector is invalid", () => {
  const { dir, state, env } = fixture(); installFixture(dir, "ironclad");
  const legacy = loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" })!;
  expect(legacy.entries).toHaveLength(5);
  expect(combatEntriesState(legacy, false)).not.toHaveProperty("selection");
  state.run!.raw.character_id = "IRONCLAD";
  expect(loadCombatEntries(state, dir, { ...env, V6_COMBAT_ENTRY_SELECTION: "bad" }))
    .toEqual(loadCombatEntries(state, dir, { V6_COMBAT_ENTRIES: "on" }));
});

it("captures and replays the selected subset, rejects changed selection and keeps deployment mismatch on the old projection", () => {
  const { dir, state, env } = fixture(), request = annotatedFrozen(dir);
  const session = loadCombatEntries(state, dir, env)!;
  request.state.v6_combat_entries = combatEntriesState(session, false);
  for (const q of Object.values(request.questions)) if (q.type === "choice") for (const key of Object.keys(q.criteria)) {
    const facts = JSON.parse(q.criteria[key]!);
    facts.v6_combat_entry = combatEntryAudit(session, fixedPlan, null, null);
    q.criteria[key] = JSON.stringify(facts);
  }
  const pair = prepareCombatEntryReplay(request);
  expect(Object.values(pair.matched).every(ids => JSON.stringify(ids) === '["TEST_HP"]')).toBe(true);
  const actual = projectCombatDecision(request.state, request.questions, env)!;
  for (const q of Object.values(actual.questions)) if (q.type === "choice") for (const text of Object.values(q.criteria))
    expect(JSON.parse(text!).combat_memory.map((m: any) => m.id)).toEqual(["TEST_HP"]);
  const changed = structuredClone(request);
  (changed.state.v6_combat_entries as any).selection.boss = "QUEEN";
  expect(() => prepareCombatEntryReplay(changed)).toThrow(/selection/);
  const wrongCandidate = structuredClone(request);
  for (const q of Object.values(wrongCandidate.questions)) if (q.type === "choice") {
    const key = Object.keys(q.criteria)[0]!, facts = JSON.parse(q.criteria[key]!);
    facts.v6_combat_entry.context.enemies.items[0].id = "QUEEN";
    q.criteria[key] = JSON.stringify(facts);
  }
  expect(() => prepareCombatEntryReplay(wrongCandidate)).toThrow(/selection/);
  (changed.state.v6_combat_entries as any).selection = { schema: "combat-entry-selection-v1", boss: "AEONGLASS", entry_ids: ["MISSING"] };
  expect(() => prepareCombatEntryReplay(changed)).toThrow(/selection/);
  expect(projectCombatDecision(request.state, request.questions, { ...env, V6_COMBAT_ENTRY_SELECTION: '{}' }))
    .toEqual(projectCombatDecision(request.state, request.questions, { V6_COMBAT_ENTRIES: "off" }));

  const original = structuredClone(request);
  delete original.state.v6_combat_entries;
  (original.state.run_brief as any).floor = state.run!.floor;
  (original.state.situation as any).turn = state.turn;
  const plans: Record<string, typeof fixedPlan> = {};
  for (const q of Object.values(original.questions)) if (q.type === "choice") for (const key of Object.keys(q.criteria)) {
    const f = JSON.parse(q.criteria[key]!); delete f.v6_combat_entry; q.criteria[key] = JSON.stringify(f); plans[key] = fixedPlan;
  }
  const captured = captureCombatEntryReplay({ schema: "combat-entry-capture-input-v1", state: state.raw, request: original, plans }, dir, env.V6_COMBAT_ENTRY_SELECTION);
  expect(Object.values(prepareCombatEntryReplay(captured).matched).every(ids => JSON.stringify(ids) === '["TEST_HP"]')).toBe(true);
  expect((captured.state as any).v6_combat_entries.knowledge.reflex.entries).toHaveLength(5);
  expect(JSON.parse(readFileSync(join(dir, "characters/silent/reflex.json"), "utf8")).entries).toHaveLength(5);
});

it("records effective selection and invalid status in run-config identity without adding fields to legacy off", () => {
  const row = (env: NodeJS.ProcessEnv) => runConfigRow({ env, code: { commit: "0".repeat(40), code: "fixed", dirty: false,
    dirty_files: [], branch: "fixture", worktree: "fixture" }, config: loadConfig({}), brain: null, jevEnabled: false,
    mode: "play", knowledgeDir: "/__fixed_missing__", processStarted: "2026-10-30T00:00:00Z" },
    { runId: "FIXTURE_RUN", ascension: 10, character: "SILENT", floor: 48 }, new Date("2026-10-30T00:00:00Z"));
  expect(row({})).not.toHaveProperty("combat_entries");
  const selected = row({ V6_COMBAT_ENTRIES: "on", V6_COMBAT_ENTRY_SELECTION: '{"AEONGLASS":["TEST_HP"]}' });
  expect(selected.combat_entries).toEqual({ requested: "on", selection: { mode: "restricted", bosses: { AEONGLASS: ["TEST_HP"] } } });
  expect(row({ V6_COMBAT_ENTRIES: "on", V6_COMBAT_ENTRY_SELECTION: "malformed" }).combat_entries)
    .toEqual({ requested: "on", selection: { mode: "invalid" } });
  expect(selected.config_sha).not.toBe(row({ V6_COMBAT_ENTRIES: "on" }).config_sha);
});

it("captures production untargeted null steps without inventing an enemy target or changing the Plan", () => {
  const { dir, state, env } = fixture(), request = annotatedFrozen(dir);
  delete request.state.v6_combat_entries;
  (request.state.run_brief as any).floor = state.run!.floor;
  (request.state.situation as any).turn = state.turn;
  const plans: Record<string, typeof fixedPlan> = {};
  for (const q of Object.values(request.questions)) if (q.type === "choice") for (const key of Object.keys(q.criteria)) {
    const facts = JSON.parse(q.criteria[key]!); delete facts.v6_combat_entry; q.criteria[key] = JSON.stringify(facts);
    plans[key] = { ...fixedPlan, steps: [{ cardIndex: 0, cardId: "TEST_UNTARGETED", upgraded: false,
      cost: 1, name: "Fixed card", target: null, targetName: null }] };
  }
  const before = JSON.stringify(plans);
  const capture = () => captureCombatEntryReplay({ schema: "combat-entry-capture-input-v1", state: state.raw, request, plans }, dir, env.V6_COMBAT_ENTRY_SELECTION);
  const captured = capture();
  expect(JSON.stringify(plans)).toBe(before);
  expect(Object.values(prepareCombatEntryReplay(captured).matched).every(ids => JSON.stringify(ids) === '["TEST_HP"]')).toBe(true);
  for (const q of Object.values(captured.questions)) if (q.type === "choice") for (const text of Object.values(q.criteria)) {
    const action = JSON.parse(text!).v6_combat_entry.context.option.actions[0];
    expect(action.card.id).toBe("TEST_UNTARGETED"); expect(action).not.toHaveProperty("target");
  }
  const step = plans[Object.keys(plans)[0]!]!.steps[0]!;
  for (const [field, value] of [["target", "none"], ["cardIndex", null], ["cost", "1"]] as const) {
    const old = (step as any)[field]; (step as any)[field] = value;
    expect(capture).toThrow(/invalid frozen step/); (step as any)[field] = old;
  }
});

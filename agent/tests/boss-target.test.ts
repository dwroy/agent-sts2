/** Fixed format/evidence fixtures only; these invented IDs are not game knowledge. */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";
import { attachBossDossier, projectBossDossier, dossierBytes } from "../src/brain/boss-dossier.js";
import { bossContextKey, bossTargetProblems, withBossTargetSpec, observedBossContext } from "../src/brain/boss-target.js";
import { bossMechanics, loadBossPlanningData, publishedBossMechanisms, bossOwnCounters, bossOwnCounterText, type BossPlanningData } from "../src/knowledge/boss-planning-data.js";
import { gradingDigest, type StrategyGrading } from "../src/knowledge/strategy-grading.js";
import { parseBossProfile } from "../src/knowledge/boss-profile.js";
import { KnowledgeStore } from "../src/knowledge/runtime/store.js";
import { closeIndexedReaders } from "../src/knowledge/runtime/reader.js";
import { BOSS_MARGIN_NOTE } from "../src/sim/boss-margin.js";
import { pickSpec, stableSchema, runPlanSpec, withRunPlanField, shopPlanSpec, routePlanSpec } from "../src/brain/specs.js";
import { strictSchema } from "../src/brain/engines/codex.js";
import { recordBossPromptMetrics } from "../src/brain/boss-prompt-metrics.js";
import { promptWithReask } from "../src/brain/message.js";
import type { BrainRequest } from "../src/brain/types.js";
import { rewardCardPayload } from "./scenarios.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { runPlanUpdateProblems, updateRunPlan } from "../src/memory/run-plan-update.js";
import { parseRunPlan } from "../src/memory/run-plan.js";
import { testKnowledge } from "./scenarios.js";

const dirs: string[] = [];
afterEach(() => { setKnowledgeCharacter(null); dirs.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })); });
function board(floor = 35, act = 3, boss = "FORMAT_C_BOSS") {
  const r = rewardCardPayload();
  r["run"] = { ...r["run"] as object, character_id: "SILENT", ascension: 10, floor, act_id: String(act - 1), boss_id: boss,
    ascension_effects: [{ id: "LEVEL_10" }] };
  return r;
}
const data: BossPlanningData = { knowledgeVersion: "K1-" + "a".repeat(64), setupMs: 1, sources: [],
  pairs: [["FORMAT_C", "FORMAT_D"], ["FORMAT_D", "FORMAT_C"]], rows: [
    { id: "FORMAT_B", act: 2, parts: ["PART_1", "PART_2"], hp: "2体首HP11(n2)+12(n2)", mechanics: ["固定攻击13(n2)", "固定增益+2(n2)"], own: "Ounknown", external: "Eunknown", strategies: ["reference-only"], profiles: [] },
    { id: "FORMAT_C", act: 3, parts: ["PART_3"], hp: "1体首HP17(n2)", mechanics: ["固定攻击7(n2)", "固定减益1(n2)"], own: "O胜50%(n2)", external: "E伤p90=8(n3)", strategies: [], profiles: [] },
    { id: "FORMAT_D", act: 3, parts: ["PART_4"], hp: "1体首HP19(n2)", mechanics: ["固定攻击9(n2)"], own: "Ounknown", external: "Eunknown", strategies: [], profiles: [] },
  ] };
const payload = { facts: { act_boss_sim: { boss: "fixed", current_deck: "unchanged", boss_margin_objective: BOSS_MARGIN_NOTE } },
  run_plan_task: { plan_reuse: true } };
const target = { boss_ids: ["FORMAT_C"], gap: "unknown，暂定缺口", reason: "固定格式依据" };
const review = { endgame: { gaps: "FORMAT_C需求unknown", resources: "两战unknown", win_condition: "FORMAT_C→FORMAT_D候选，后场unknown" } };
function mechanism(id: string, text: string, single = true): Record<string, any> {
  const grading: StrategyGrading = { schema: "strategy-grading-v1", grade: "B+", category: "Boss打法", evidence_type: "机制事实",
    summary: `机制事实（已从原件复核）；${single ? "单次观察窗口：" : ""}${text}；反证与适用限制完整保留`, single_observation_window: single,
    basis: { checkpoint_sha256: "a".repeat(64), original_entry_sha256: "b".repeat(64), assessment_sha256: "c".repeat(64) } };
  return { id, version: "1", strategy: grading.summary, confidence: null, evidence_type: "机制事实", grading,
    source: "own", evidence: [{ run: "SILENT000001", floor: 33 }], trigger: { question_types: ["rest"], bosses: ["FORMAT_B_BOSS"] },
    formal_publication: { schema: "strategy-publication-v1", status: "published", authorization: "https://github.com/dwroy/agent-sts2/issues/85#issuecomment-123", grading_sha256: gradingDigest(grading) } };
}

it("projects only formally published unscored facts, retaining the full source and original window", () => {
  const a = mechanism("window", "固定窗口能量3→2"), b = mechanism("trigger", "PART_2死亡后PART_1获得能力+2", false);
  const facts = publishedBossMechanisms([a, b, { ...b, id: "pending", formal_publication: { ...b.formal_publication, status: "pending" } },
    { ...b, id: "numeric", confidence: .3 }, { ...b, id: "bad-digest", formal_publication: { ...b.formal_publication, grading_sha256: "0".repeat(64) } },
    { id: "mechanism-only-in-name", strategy: "不按名字猜机制", confidence: null }]);
  expect(facts.map(f => f.id)).toEqual(["trigger", "window"]);
  expect(facts[0]!.clause).toBe("PART_2死亡后PART_1获得能力+2"); expect(facts[0]!.summary).toContain("反证与适用限制");
  expect(facts[1]!.clause).toBe("单窗：固定窗口能量3→2");
});

it("separates first markers from inclusive explicit win counters without reversing rounded rates", () => {
  expect(bossOwnCounterText(bossOwnCounters({ win_rate: .667, n_outcome_known: 54 }))).toBe("O首试unknown/含重试unknown");
  expect(bossOwnCounterText(bossOwnCounters({ win_rate: .667, n_outcome_known: 54, turns_won: { n: 36 } }))).toBe("O首试unknown/含重试36/54");
  expect(bossOwnCounters({ n_outcome_known: 2, turns_won: { n: 3 } }).inclusive.won).toBeNull();
  expect(bossOwnCounters({ n_outcome_known: 2, turns_won: { n: true } }).inclusive.won).toBeNull();
});

it("shows complete published conditions and separate own counters, with full limitations in audit", () => {
  const source = { ...data, rows: data.rows.map((r, i) => ({ ...r, own: "O首试unknown/含重试1/2",
    publishedMechanisms: publishedBossMechanisms([mechanism(`fact-${i}`, "PART_2死亡后PART_1获得能力+2", false)]) })) };
  const result = projectBossDossier(board(32, 2, "FORMAT_B_BOSS"), payload, source), text = (result.payload.facts as any).boss_dossier;
  expect(text).toContain("PART_2死亡后PART_1获得能力+2"); expect(text).toContain("O首试unknown/含重试1/2");
  expect(Object.keys(result.audit.displayed_mechanism_facts)).toHaveLength(3);
  expect(JSON.stringify(result.audit.mechanism_facts)).toContain("反证与适用限制完整保留");
  expect(result.audit.strategy_bodies).toBe(0); expect(dossierBytes(text)).toBeLessThanOrEqual(1500);
});

it("keeps factual HP, multiple bodies and observed attacks under the full JSON byte cap; preserves sim numbers", () => {
  const result = projectBossDossier(board(), payload, data), f = result.payload["facts"] as any;
  expect(f.boss_dossier).toContain("PART_1+PART_2"); expect(f.boss_dossier).toContain("固定攻击13(n2)");
  expect(f.boss_dossier).toContain("固定增益+2(n2)"); expect(f.boss_dossier).toContain("固定减益1(n2)");
  expect(f.boss_dossier).toContain("F48=FORMAT_C→F49=unknown");
  expect(f.act_boss_sim).toEqual({ boss: "fixed", current_deck: "unchanged" });
  expect((payload.facts.act_boss_sim)).toHaveProperty("boss_margin_objective");
  expect(dossierBytes(f.boss_dossier)).toBeLessThanOrEqual(1500);
  expect(result.audit.strategy_bodies).toBe(0); expect(f.boss_dossier).not.toContain("reference-only");
  expect(result.audit.strategy_references.FORMAT_B).toEqual(["reference-only"]);
});

it("requires a new target review once, survives persistence/restart, and rejects future/foreign target memory", () => {
  const initial = projectBossDossier(board(), payload, data), c = observedBossContext(initial.payload)!;
  const nextPayload = { ...payload, facts: { ...payload.facts, your_run_plan: { boss_context: JSON.parse(JSON.stringify(c)) } } };
  expect((projectBossDossier(board(36), nextPayload, data).audit.context).review_required).toBe(false);
  expect((projectBossDossier(board(36, 3, "FORMAT_D_BOSS"), nextPayload, data).audit.context).review_required).toBe(true);
  for (const changed of [{ ...c, floor: 40 }, { ...c, run: "FOREIGN" }]) {
    const p = { ...payload, facts: { ...payload.facts, your_run_plan: { boss_context: changed } } };
    expect(projectBossDossier(board(), p, data).audit.context.review_required).toBe(true);
  }
  const hidden = { ...c, floor: 40, final: ["FORBIDDEN_FUTURE_ID", null] };
  const future = projectBossDossier(board(), { facts: { your_run_plan: { made_on_floor: 1, boss_context: hidden } },
    run_plan_task: { previous_plan: { floor: 1, bossContext: hidden } } }, data);
  expect(JSON.stringify(future.payload)).not.toContain("FORBIDDEN_FUTURE_ID");
  const parent = projectBossDossier(board(), { facts: { your_run_plan: { made_on_floor: 40, summary: "FUTURE_PLAN_SENTINEL" } } }, data);
  expect(JSON.stringify(parent.payload)).not.toContain("FUTURE_PLAN_SENTINEL");
  expect(bossContextKey(c)).toBe(bossContextKey({ ...c, floor: 36 }));
});

it("does not reuse a stale first-boss clock as the F49 identity or invent an ordered pair", () => {
  const first = projectBossDossier(board(), payload, data), previous = observedBossContext(first.payload)!;
  const result = projectBossDossier(board(49), { facts: { your_run_plan: { boss_context: previous } } }, data);
  expect(result.audit.context.act_boss).toBeNull(); expect(result.audit.context.final).toEqual(["FORMAT_C", null]);
  const noPairs = projectBossDossier(board(1, 1), {}, { ...data, pairs: [] });
  expect((noPairs.payload["facts"] as any).boss_dossier).toContain("连战组合unknown");
});

it.each(["reward/card", "reward/skip", "shop/plan", "rest/choose", "selection/deck", "selection/upgrade", "event/choose", "bundle/choose", "capstone/choose", "map/route-plan", "run-plan"])("requires boss_target through ordinary, stable and strict schema for %s", label => {
  const p = projectBossDossier(board(), payload, data).payload;
  const base = label === "shop/plan" ? withRunPlanField(shopPlanSpec(label, { leave: null }, p), p)
    : label === "run-plan" ? runPlanSpec(label, p) : label.startsWith("map/") ? withRunPlanField(routePlanSpec(label, p), p) : pickSpec(label, { yes: null }, p);
  const spec = withBossTargetSpec(base, p);
  expect(spec.schema.required).toContain("boss_target"); expect(stableSchema(spec).required).toContain("boss_target");
  expect(JSON.stringify(strictSchema(stableSchema(spec)))).toContain('"boss_target"');
  expect(spec.validate({ choice: "yes", plan: [], route: "keep" }).join()).toContain("boss_target");
  expect(bossTargetProblems(target, p)).toEqual([]);
  expect(bossTargetProblems({ ...target, boss_ids: ["HIDDEN_NEXT_BOSS"] }, p).join()).toContain("Boss IDs");
  expect(bossTargetProblems({ ...target, boss_ids: [], reason: "" }, p).join()).toContain("reason");
  expect(bossTargetProblems({ ...target, boss_ids: [], gap: "本步不补", reason: "保血过当前幕" }, p)).toEqual([]);
});

it("keeps Unicode bounds exact and requires explicit partial endgame review without changing unmentioned plan fields", () => {
  const raw = board(), p = projectBossDossier(raw, payload, data).payload;
  expect(bossTargetProblems({ ...target, gap: "😀".repeat(80) }, p)).toEqual([]);
  expect(bossTargetProblems({ ...target, gap: "😀".repeat(81) }, p)).not.toEqual([]);
  expect(runPlanUpdateProblems(undefined, p)).toHaveLength(3);
  const endgame = { core: "fixed", gaps: review.endgame.gaps, resources: review.endgame.resources, win_condition: review.endgame.win_condition,
    scaling_damage: "unknown", sustainable_defense: "unknown", checkpoint: "" };
  const old = parseRunPlan({ archetype: "fixed", endgame }, parseGameState(raw), testKnowledge, "start");
  const withOld = { ...p, facts: { ...(p["facts"] as object), your_run_plan: { endgame } } };
  expect(runPlanUpdateProblems(review, withOld)).toEqual([]);
  const changed = updateRunPlan(old, review, parseGameState(raw), testKnowledge, "review");
  expect(changed.outcome).toBe("reused"); expect(changed.plan).toBe(old);
});

it("keeps other characters, levels and combat selections exactly outside the attachment", () => {
  const raw = board();
  for (const [character, asc] of [["IRONCLAD", 10], ["REGENT", 10], ["SILENT", 9], ["SILENT", 11]]) {
    expect(attachBossDossier({ ...raw, run: { ...(raw["run"] as object), character_id: character, ascension: asc } }, payload, "reward/card")).toBeNull();
  }
  expect(attachBossDossier({ ...raw, in_combat: true }, payload, "selection/deck")).toBeNull();
  expect(attachBossDossier(raw, payload, "fight-plan")).toBeNull();
});

it("does not borrow A9 damage/HP or turn an observed first sight into an innate rule", () => {
  const part = { hp_by_asc: { "9": { median: 55, n: 8 } }, moves: { ATTACK: { name: "固定", n_seen: 2,
    turns_seen: { "1": 2 }, damage_by_asc: { "9": { base_per_hit: { "9": 2 }, hits: { "1": 2 } } } } } };
  const m = { monsters: { PART: part }, bosses: {}, encounters: {} };
  expect(bossMechanics(m, ["PART"])).toEqual({ hp: "1体首HPunknown", tokens: [] });
  const phased = { ...part, hp_by_asc: { "10": { median: 11, n: 2 } }, phases_by_asc: { "10": { "11 > 22 > 11 > 22 (PART)": 2 } } };
  expect(bossMechanics({ ...m, monsters: { PART: phased } }, ["PART"]).hp).toBe("1体首HP11(n2) 相HP观测11/22");
});

it("ignores well-formed but unpublished Git profile drafts and rejects malformed public datasets", () => {
  const dir = mkdtempSync(join(tmpdir(), "boss-draft-")); dirs.push(dir); setKnowledgeCharacter("silent");
  mkdirSync(join(dir, "common"), { recursive: true }); mkdirSync(join(dir, "characters/silent"), { recursive: true });
  writeFileSync(join(dir, "common/monster-db.json"), JSON.stringify({ monsters: {} }));
  writeFileSync(join(dir, "characters/silent/strategy-entries.json"), JSON.stringify({ entries: [{ id: "draft", boss_profile: { boss: "FORMAT_C" } }] }));
  const loaded = loadBossPlanningData(dir, "FIXTURE");
  expect(loaded.knowledgeVersion).toBeNull(); expect(loaded.rows).toEqual([]); expect(loaded.pairs).toEqual([]);
  expect(loaded.sources.some(s => s.status === "unavailable")).toBe(true);
  writeFileSync(join(dir, "common/monster-db.json"), JSON.stringify({ unexpected: "bad shape" }));
  writeFileSync(join(dir, "characters/silent/monster-records.json"), JSON.stringify({ bosses: { BAD: null } }));
  expect(loadBossPlanningData(dir, "BAD_SHAPE").rows).toEqual([]);
});

it("keeps own/external first outcomes, prediction stops, retries and null denominators separate", () => {
  const counts = { first: 3, won: 1, died: 0, predicted_stop: 1, unknown: 1, retries: 9 };
  const profile = { schema: "boss-profile-v1", boss: "FORMAT_C", character: "silent", ascension: 10, game_version: "unknown", cutoff: "2026-10-30T00:00:00Z", own: counts,
    external: [{ source: "external:fixture", game_version: "v0.111.0", unit: "uploaded_attempts", counts: { ...counts, first: null, won: null }, dataset_sha256: "a".repeat(64) }],
    evidence_refs: ["fixed-source-window"], limitations: ["partial, not independent players"] };
  expect(parseBossProfile(profile)).toEqual(profile);
  expect(parseBossProfile({ ...profile, own: { ...counts, first: 2 } })).toBeNull();
  expect(parseBossProfile({ ...profile, own: { ...counts, won: 4, died: null } })).toBeNull();
  expect(parseBossProfile({ ...profile, own: { ...counts, retries: true } })).toBeNull();
  expect(parseBossProfile({ ...profile, evidence_refs: [] })).toBeNull();
});

it("reads #83 counters only after the ordinary submit/validate/publish path and exact K1 readback", () => {
  setKnowledgeCharacter("silent");
  const root = mkdtempSync(join(tmpdir(), "boss-published-")); dirs.push(root);
  const store = new KnowledgeStore(root);
  try {
    const profile = { schema: "boss-profile-v1", boss: "PART_1+PART_2", character: "silent", ascension: 10, game_version: "unknown", cutoff: "2026-10-30T00:00:00Z",
      own: { first: 3, won: 1, died: 0, predicted_stop: 1, unknown: 1, retries: 9 }, external: [], evidence_refs: ["synthetic-only"], limitations: ["format fixture"] };
    const entry = { id: "synthetic-profile", version: "1", trigger: { question_types: ["rest"], bosses: ["FORMAT_B_BOSS"] }, strategy: "仅格式夹具",
      evidence: [{ run: "SILENT000001", floor: 33 }], source: "own", confidence: .2, boss_profile: profile };
    const fact = mechanism("published-trigger", "PART_2死亡后PART_1获得能力+2", false);
    const doc = JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries: [entry, fact] });
    store.submit({ schema: "knowledge-candidate-v1", id: "synthetic-profile", base: store.current(), character: "silent", source: "fixture", files: { "characters/silent/strategy-entries.json": doc } });
    store.validate("synthetic-profile"); const version = store.publish("synthetic-profile"), snapshot = join(root, "snapshots", version);
    // The non-K1 fixed observations are a separate, private source fixture, with their own hashes.
    mkdirSync(join(snapshot, "common"), { recursive: true });
    writeFileSync(join(snapshot, "common/monster-db.json"), JSON.stringify({ monsters: { PART_1: { acts: { "2": 2 }, hp_by_asc: { "10": { median: 11, n: 2 } } }, PART_2: { acts: { "2": 2 }, hp_by_asc: { "10": { median: 12, n: 2 } } } } }));
    writeFileSync(join(snapshot, "characters/silent/monster-records.json"), JSON.stringify({ bosses: { FORMAT_B: { "10": { parts: { PART_1: {}, PART_2: {} }, win_rate: .5, n_outcome_known: 2 } } } }));
    const loaded = loadBossPlanningData(snapshot, "PUBLISHED_FIXTURE");
    expect(loaded.knowledgeVersion).toBe(version);
    expect(loaded.rows[0]!.profiles).toEqual([profile]); expect(loaded.rows[0]!.own).toBe("O首试1/3(死0预截1未知1重试9)/含重试unknown");
    expect(loaded.rows[0]!.ownCounters?.first_cutoff).toBe(profile.cutoff);
    expect(loaded.rows[0]!.publishedMechanisms?.map(f => f.id)).toEqual(["published-trigger"]);
    expect(loaded.rows[0]!.strategies).toEqual(["synthetic-profile", "published-trigger"]);
    expect(store.files(version)["characters/silent/strategy-entries.json"]).toBe(doc);
  } finally { closeIndexedReaders(); store.close(); }
});

it("records the actual post-reservation prompt/schema bytes and phases without prompt content", () => {
  const r = projectBossDossier(board(), payload, data);
  const req: BrainRequest = { label: "reward/card", system: "固定系统", question: "固定题", payload: r.payload,
    spec: pickSpec("reward/card", { yes: null }, r.payload), options: { yes: null }, bossDossier: r.audit, evidencePhase: "query" };
  recordBossPromptMetrics(req, { strict: true }, "codex");
  expect(r.audit.prompts?.[0].user_bytes).toBe(Buffer.byteLength(promptWithReask(req)));
  recordBossPromptMetrics({ ...req, evidencePhase: "answer", question: req.question + "已有工具资料" }, req.spec.schema, "dsh");
  expect(r.audit.prompts?.map(p => p.phase)).toEqual(["query", "answer"]);
  expect(JSON.stringify(r.audit.prompts)).not.toContain("固定系统");
});

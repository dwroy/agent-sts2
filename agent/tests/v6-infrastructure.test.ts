import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { v6Config } from "../src/v6/config.js";
import { loadV6Knowledge } from "../src/v6/knowledge.js";
import { V6BuildLog } from "../src/v6/log.js";
import { loadConfig } from "../src/core/config.js";
import { runConfigRow } from "../src/eye/run-config.js";
import { direction, logRow, reflex, vocab } from "./v6-fixtures.js";

const tempRoot = fileURLToPath(new URL("../../.cache/", import.meta.url));
const temps: string[] = [];
function temp() { mkdirSync(tempRoot, { recursive: true }); const path = mkdtempSync(join(tempRoot, "v6-test-")); temps.push(path); return path; }
afterEach(() => { for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function files(root: string, character = "silent", entries = [direction], reflexes = [reflex]) {
  const dir = join(root, "characters", character); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "direction-cards.json"), JSON.stringify({ schema: "direction-cards-v1", character, entries }));
  writeFileSync(join(dir, "reflex-vocab.json"), JSON.stringify({ ...vocab, character }));
  writeFileSync(join(dir, "reflex.json"), JSON.stringify({ schema: "reflex-file-v1", character, entries: reflexes }));
  return dir;
}
const code = { commit: "0".repeat(40), code: "fixed", dirty: false, dirty_files: [], branch: "fixture", worktree: "fixture" };
function row(env: NodeJS.ProcessEnv, character: string) {
  return runConfigRow({ env, code, config: loadConfig({}), brain: null, jevEnabled: false, mode: "play", knowledgeDir: "/__v6_fixed_missing__", processStarted: "2026-10-19T00:00:00.000Z" },
    { runId: "FIXTURE_RUN", ascension: 0, character, floor: 1 }, new Date("2026-10-19T00:00:00.000Z"));
}

describe("V6 feature configuration", () => {
  it("defaults all consumers to legacy/off and records the complete numeric defaults", () => {
    const c = v6Config({});
    expect(c.mode).toBe("off"); expect(c.reflex).toBe("off");
    expect(c.deciders).toEqual({ card: "brain", potion: "brain", shop: "brain", rest: "brain" });
    expect(c.samples_pick).toBe(20); expect(c.samples_act).toBe(100); expect(c.direction_min_weight).toBe(.1);
    expect(c.win).toEqual({ certain_win: .95, favored: .7, even: .3, unfavored: .05 });
    expect(c.delta).toEqual({ much_se: 2, better_se: 1, much_min: .05 });
    expect(c.triggers).toMatchObject({ t1_core_min: .3, t2_se: 2, t2_min_delta: .05, t2_consecutive: 2, t3_weight_max: .2, t6_unknown_max: .5, t6_fallbacks: 2 });
    expect(c.budgets).toEqual({ brain_soft_cap: 15, brain_ms: 90000, act_ms: 60000, pick_ms: 5000, jev_ms: 1000 });
    expect(c.invalid).toEqual([]); expect(c.delivered).toBe(false);
  });
  it("supports independent requested selectors, sample and threshold overrides without enabling consumers", () => {
    const c = v6Config({ V6_BUILD: "shadow", V6_CARD_DECIDER: "jev", V6_POTION_DECIDER: "jev", V6_SHOP_DECIDER: "jev", V6_REST_DECIDER: "jev", V6_REFLEX: "on",
      V6_SAMPLES_PICK: "30", V6_SAMPLES_ACT: "120", V6_DIRECTION_MIN_WEIGHT: ".2", V6_T2_CONSECUTIVE: "3", V6_BRAIN_SOFT_CAP: "12" });
    expect(c.mode).toBe("shadow"); expect(Object.values(c.deciders)).toEqual(["jev", "jev", "jev", "jev"]); expect(c.reflex).toBe("on");
    expect(c.samples_pick).toBe(30); expect(c.samples_act).toBe(120); expect(c.direction_min_weight).toBe(.2); expect(c.triggers.t2_consecutive).toBe(3); expect(c.budgets.brain_soft_cap).toBe(12);
    expect(c.admission).toBe("interfaces_only"); expect(c.delivered).toBe(false);
  });
  it("fails closed on invalid modes and rejects nonfinite, fractional, negative and disordered thresholds", () => {
    const c = v6Config({ V6_BUILD: "ON", V6_CARD_DECIDER: "auto", V6_SAMPLES_PICK: "0", V6_SAMPLES_ACT: "1.5", V6_DIRECTION_MIN_WEIGHT: "NaN",
      V6_T1_CORE_MIN: "2", V6_PICK_MS: "Infinity", V6_JEV_MS: "-1", V6_WIN_EVEN: ".9", V6_DELTA_MUCH_SE: ".5" });
    expect(c.mode).toBe("off"); expect(c.deciders.card).toBe("brain"); expect(c.samples_pick).toBe(20); expect(c.samples_act).toBe(100);
    expect(c.win).toEqual(v6Config({}).win); expect(c.delta).toEqual(v6Config({}).delta); expect(c.invalid.length).toBe(10);
  });
  it.each(["IRONCLAD", "SILENT", "REGENT"])("keeps run-config bytes and config identity unchanged when off for %s", character => {
    const before = JSON.stringify(row({}, character));
    expect(JSON.stringify(row({ V6_BUILD: "off", V6_REFLEX: "on", V6_CARD_DECIDER: "jev", V6_SHOP_DECIDER: "jev" }, character))).toBe(before);
    expect(row({}, character)).not.toHaveProperty("v6");
    const on = row({ V6_BUILD: "on", V6_SAMPLES_PICK: "25" }, character);
    expect(on.v6).toMatchObject({ mode: "on", samples_pick: 25, delivered: false });
    expect(on.config_sha).not.toBe(row({}, character).config_sha);
    expect(on.config_sha).not.toBe(row({ V6_BUILD: "on", V6_SAMPLES_PICK: "26" }, character).config_sha);
    expect(JSON.stringify(on)).not.toContain("arbitrary_secret_value");
  });
});

describe("explicit per-character V6 knowledge", () => {
  it("loads only the requested character, with no fallback to another role or common directory", () => {
    const root = temp(); files(root);
    expect(loadV6Knowledge(root, "SILENT").directions).toMatchObject({ status: "loaded", value: [direction] });
    expect(loadV6Knowledge(root, "silent").reflex).toMatchObject({ status: "loaded", value: [reflex] });
    for (const character of ["ironclad", "regent"]) {
      const result = loadV6Knowledge(root, character);
      for (const item of [result.directions, result.vocab, result.reflex]) expect(item).toMatchObject({ status: "missing", message: "无此知识" });
    }
    expect(loadV6Knowledge(root, null).character).toBe(null);
    expect(loadV6Knowledge(root, "../../silent").directions.status).toBe("invalid");
    const dir = join(root, "characters", "regent"); mkdirSync(dir);
    symlinkSync(join(root, "characters", "silent", "direction-cards.json"), join(dir, "direction-cards.json"));
    expect(loadV6Knowledge(root, "regent").directions.status).toBe("invalid");
  });
  it("rejects a character directory symlink even if the file claims the requested role", () => {
    const root = temp(); files(root);
    symlinkSync(join(root, "characters", "silent"), join(root, "characters", "regent"));
    expect(loadV6Knowledge(root, "regent").directions.status).toBe("invalid");
  });
  it.each(["ironclad", "regent", "silent"])("interleaved reads retain %s scope", character => {
    const root = temp();
    const ownDirection = { ...direction, scope: { ...direction.scope, character } };
    const ownReflex = { ...reflex, scope: { ...reflex.scope, character } };
    files(root, character, [ownDirection], [ownReflex]);
    expect(loadV6Knowledge(root, character).reflex.status).toBe("loaded");
    expect(loadV6Knowledge(root, "defect").reflex.status).toBe("missing");
    expect(loadV6Knowledge(root, character).directions).toMatchObject({ value: [ownDirection] });
  });
  it("rejects cross-role scope, duplicate IDs, bad JSON and missing vocabulary/direction references", () => {
    const root = temp(); const dir = files(root, "regent");
    expect(loadV6Knowledge(root, "regent").directions.status).toBe("invalid");
    files(root, "silent", [direction, direction]);
    expect(loadV6Knowledge(root, "silent").directions.status).toBe("invalid");
    const silent = files(root);
    writeFileSync(join(silent, "reflex.json"), JSON.stringify({ schema: "reflex-file-v1", character: "silent", entries: [{ ...reflex, signal: { kind: "tag", value: "UNDEFINED_TAG", unit: "label" } }] }));
    expect(loadV6Knowledge(root, "silent").reflex.status).toBe("invalid");
    files(root, "silent", [], [reflex]);
    expect(loadV6Knowledge(root, "silent").reflex.status).toBe("invalid");
    writeFileSync(join(dir, "reflex-vocab.json"), "invalid json");
    expect(loadV6Knowledge(root, "regent").vocab.status).toBe("invalid");
  });
});

describe("lazy v6-build.jsonl skeleton", () => {
  it("creates no directories or files while off, including with requested subfeatures", () => {
    const path = join(temp(), "never-created", "v6-build.jsonl");
    expect(new V6BuildLog(v6Config({ V6_BUILD: "off", V6_CARD_DECIDER: "jev" }), path).append(logRow)).toEqual({ written: false, reason: "off" });
    expect(existsSync(join(path, ".."))).toBe(false);
  });
  it("roundtrips all audit fields, appends one row per call, preserves unknown nulls", () => {
    const path = join(temp(), "logs", "v6-build.jsonl"); const logger = new V6BuildLog(v6Config({ V6_BUILD: "shadow" }), path);
    expect(logger.append(logRow)).toEqual({ written: true });
    expect(logger.append({ ...logRow, jev_answer: { choice: "test_option", confidence: .8, probabilities: { test_option: .8, skip: .2 } }, fallback: "timeout", degradation: ["budget exhausted"] })).toEqual({ written: true });
    const rows = readFileSync(path, "utf8").trim().split("\n").map(line => JSON.parse(line));
    expect(rows).toHaveLength(2); expect(rows[0]).toEqual(logRow); expect(rows[0].entries[0].joint_win).toBe(null);
  });
  it("rejects invalid, inconsistent or unsafe rows and contains filesystem failures", () => {
    const path = join(temp(), "v6-build.jsonl"); const logger = new V6BuildLog(v6Config({ V6_BUILD: "shadow" }), path);
    for (const row of [null, { ...logRow, mode: "on" }, { ...logRow, ts: "invalid" }, { ...logRow, unknown: { count: 2, total: 1 } },
      { ...logRow, entries: [{ ...logRow.entries[0], win: null }] }, { ...logRow, env: { TOKEN: "never logged" } }]) expect(logger.append(row).written).toBe(false);
    expect(existsSync(path)).toBe(false);
    mkdirSync(path);
    expect(logger.append(logRow)).toEqual({ written: false, reason: "write failed" });
  });
});

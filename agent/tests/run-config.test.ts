/**
 * The run configuration log (src/eye/run-config.ts, docs/eval.md §8): one row per run with the configuration
 * it was played with, never a key; once per run (a restart writes again only with a changed configuration); the
 * loop writes it on a run's first state; tools/logdb/extract.py reads the rows the writer makes, and the Python
 * fixtures have the writer's shape. Fixed data (tests/gkb-data), no model is called.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Brain } from "../src/brain/brain.js";
import { createBrain } from "./legacy-brain.js";
import { loadConfig, type AppConfig } from "../src/core/config.js";
import { DeepSeekClient } from "../src/brain/llm/deepseek.js";
import { LOGS_DIR } from "../src/core/paths.js";
import {
  type CodeInfo,
  createRunConfigLog,
  estimateTokens,
  parseGitStatus,
  resolveRunConfigLog,
  RunConfigLog,
  runConfigLogPath,
  type RunConfigRow,
  TOKENS_PER_CHAR,
} from "../src/eye/run-config.js";
import { board, FakeDeepSeek, play, setupOneshotTests } from "./oneshot-support.js";
import { mainMenuPayload } from "./scenarios.js";
import { knowledgeFile } from "../src/knowledge/files.js";

setupOneshotTests();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "tests/gkb-data");
const KNOWLEDGE = join(DATA, "knowledge");

const JEV_KEY = "tsk-fake-jev-0123456789abcdef";
const DS_KEY = "sk-fakedeepseek0123456789abcdef";
const KEY_FILE = "/home/someone/.secret-deepseek-key-file";
const OTHER_TOKEN = "tok-fake-9876543210fedcba";

const temps: string[] = [];
let savedLessons: string | undefined;
beforeAll(() => {
  savedLessons = process.env["KNOWLEDGE_LESSONS_FILE"];
  process.env["KNOWLEDGE_LESSONS_FILE"] = join(DATA, "lessons.md");
});
afterAll(() => {
  if (savedLessons === undefined) delete process.env["KNOWLEDGE_LESSONS_FILE"];
  else process.env["KNOWLEDGE_LESSONS_FILE"] = savedLessons;
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), "run-config-"));
  temps.push(dir);
  return dir;
}

const CODE: CodeInfo = { commit: "0c66af2" + "0".repeat(33), code: "0c66af2+dirty", dirty: true, dirty_files: ["src/knowledge/monster-db.json"], branch: "v4", worktree: "jev-sts2-v4run" };

/** A V4 setup: DeepSeek by default, Claude Opus for map questions, DeepSeek as the fallback, the full knowledge prefix. */
const V4_ENV: Record<string, string> = {
  TYPESAFE_API_KEY: JEV_KEY,
  DEEPSEEK_API_KEY: DS_KEY,
  DEEPSEEK_API_KEY_FILE: KEY_FILE,
  CI_DEPLOY_TOKEN: OTHER_TOKEN,
  DEEPSEEK_MODEL: "deepseek-flash",
  DEEPSEEK_MAX_CALLS: "300",
  JEV_MODEL: "jev-latest",
  JEV_CONTEXT: "v1",
  RUN_PLAN: "v1",
  BRAIN_ENGINE_MAP: "claude",
  BRAIN_CLAUDE_MODEL: "opus",
  BRAIN_FALLBACK: "deepseek",
  KNOWLEDGE_PREFIX: "full",
  TARGET_ASCENSION: "9",
};

function setup(env: Record<string, string>, dir: string): { config: AppConfig; brain: Brain | null; env: NodeJS.ProcessEnv } {
  // The prefix's day table of data facts (render/facts.ts) in the test's own directory, never the shared logs/.
  const full = { BRAIN_LOG: join(dir, "brain.jsonl"), DECISION_LOG: join(dir, "decisions.jsonl"), DEEPSEEK_FACTS_SNAPSHOT_DIR: join(dir, "guide-facts"), ...env } as unknown as NodeJS.ProcessEnv;
  const config = loadConfig(full);
  const ds = config.deepseek
    ? new DeepSeekClient({ ...config.deepseek, baseUrl: "http://deepseek.invalid", guideFile: knowledgeFile(KNOWLEDGE, "ironclad-guide.md"), handbookFile: knowledgeFile(KNOWLEDGE, "ds-handbook.md"), factsSnapshotDir: "" })
    : null;
  return { config, brain: ds ? createBrain(config, ds) : null, env: full };
}

function logOf(env: Record<string, string>, dir = temp(), notes: string[] = []): { log: RunConfigLog; path: string; brain: Brain | null } {
  const { config, brain, env: full } = setup(env, dir);
  const log = createRunConfigLog({ config, brain, jevEnabled: true, mode: "play", env: full, code: () => CODE, knowledgeDir: KNOWLEDGE, now: () => new Date("2026-09-30T01:02:03.000Z"), note: (m) => notes.push(m) });
  if (!log) throw new Error("expected a run config log");
  return { log, path: log.path, brain };
}

const state = (runId: string, ascension: number | null = 9, floor = 1) => ({ run: { ascension, floor, character_name: "Ironclad" }, raw: { run_id: runId, run: { character_id: "IRONCLAD" } } });
const menu = { run: null, raw: { run_id: "run_unknown" } };
const rowsOf = (path: string): RunConfigRow[] => (existsSync(path) ? readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as RunConfigRow) : []);

/** Every key path of a JSON value ("a.b.c"; record keys under by_prefix / engines / model_by_prefix collapsed). */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const out: string[] = [];
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    const free = /(^|\.)(by_prefix|model_by_prefix)$/.test(prefix) || /(^|\.)engines$/.test(prefix);
    const path = prefix ? `${prefix}.${free ? "*" : key}` : key;
    out.push(path, ...keyPaths(inner, path));
  }
  return [...new Set(out)].sort();
}

describe("git status parsing", () => {
  it("reads HEAD, the branch and the changed tracked files; +dirty as ops/run.sh writes it", () => {
    const clean = parseGitStatus("# branch.oid 0c66af2aaaabbbbccccddddeeeeffff000011112\n# branch.head v4\n", "jev-sts2-v4run");
    expect(clean).toEqual({ commit: "0c66af2aaaabbbbccccddddeeeeffff000011112", code: "0c66af2", dirty: false, dirty_files: [], branch: "v4", worktree: "jev-sts2-v4run" });
    const dirty = parseGitStatus(
      [
        "# branch.oid d75c1890000000000000000000000000000000aa",
        "# branch.head (detached)",
        "1 .M N... 100644 100644 100644 aaaa bbbb src/knowledge/monster-db.json",
        "2 R. N... 100644 100644 100644 aaaa bbbb R100 notes/new name.md\tnotes/old.md",
        "",
      ].join("\n"),
      "jev-sts2-v3",
    );
    expect(dirty).toMatchObject({ code: "d75c189+dirty", dirty: true, dirty_files: ["src/knowledge/monster-db.json", "notes/new name.md"], branch: null });
    expect(parseGitStatus("# branch.oid (initial)\n", "x")).toMatchObject({ commit: null, code: null, dirty: null });
  });
});

describe("where the rows go", () => {
  it("next to the decision log by default; RUN_CONFIG_LOG sets the path or switches it off", () => {
    expect(runConfigLogPath("./logs/decisions.jsonl")).toBe("logs/run-config.jsonl");
    expect(runConfigLogPath("/tmp/x/test-1.jsonl")).toBe("/tmp/x/test-1.run-config.jsonl");
    const off = loadConfig({ RUN_CONFIG_LOG: "off" } as unknown as NodeJS.ProcessEnv);
    expect(resolveRunConfigLog(off.log)).toBeNull();
    expect(createRunConfigLog({ config: off, brain: null, jevEnabled: true, mode: "play", code: () => CODE })).toBeNull();
    expect(resolveRunConfigLog(loadConfig({ RUN_CONFIG_LOG: "/tmp/rc.jsonl" } as unknown as NodeJS.ProcessEnv).log)).toBe("/tmp/rc.jsonl");
    expect(resolveRunConfigLog(loadConfig({} as NodeJS.ProcessEnv).log)).toBe(join(LOGS_DIR, "run-config.jsonl"));
  });
});

describe("the row", () => {
  it("has the run, the code, the brain engines and models, the knowledge prefix's hash and size, and the Jev and loop settings", () => {
    const { log, path, brain } = logOf(V4_ENV);
    const row = log.observe(state("RUNX00000001"));
    expect(row).not.toBeNull();
    const [written] = rowsOf(path);
    expect(written).toEqual(row);
    expect(written).toMatchObject({
      ts: "2026-09-30T01:02:03.000Z",
      run_id: "RUNX00000001",
      ascension: 9,
      character: "IRONCLAD",
      floor: 1,
      restart: false,
      code: CODE,
      brain: {
        active: true,
        engine: "deepseek",
        by_prefix: { MAP: "claude" },
        fallback: "deepseek",
        engines: {
          deepseek: { model: "deepseek-flash", tools: false, max_calls: 300 },
          claude: { model: "claude-opus-5-5", model_by_prefix: {}, timeout_ms: 120_000, tools: false, max_calls: 150 },
        },
        claude: { schema: "kind", max_budget_usd: null },
      },
      knowledge: { prefix: "full", ascension: 9, experience_version: "fixture-1" },
      deepseek: { model: "deepseek-flash", max_calls: 300, reasoning_effort: "off", effort_by_label: null },
      jev: { enabled: true, model: "jev-latest", context: "v1", strict: true },
      loop: { mode: "play", build_decider: "deepseek", build_oneshot: "on", run_plan: "v1", fight_plan: "off", mech_rules: true },
      target_ascension: 9,
      arm: null,
    });
    expect(Object.keys(written!.brain.engines)).toEqual(["deepseek", "claude"]);
    expect(written!.process.pid).toBe(process.pid);
    expect(written!.config_sha).toMatch(/^[0-9a-f]{12}$/);
    // The prefix is the brain's own render for the run's ascension: the hash brain.jsonl's knowledge note carries.
    const { note, system } = brain!.knowledge.system({ ascension: 9, knowledgeDir: KNOWLEDGE });
    expect(written!.knowledge.prefix_sha).toBe(note.prefix_sha);
    expect(written!.knowledge.prefix_chars).toBe(note.prefix_chars);
    expect(written!.knowledge.system_chars).toBe(system.length);
    expect(written!.knowledge.prefix_tokens_est).toEqual(estimateTokens(note.prefix_chars!));
    expect(written!.knowledge.prefix_tokens_est!.claude).toBe(Math.round(note.prefix_chars! * TOKENS_PER_CHAR.claude));
    expect(brain!.knowledge.renders).toBe(1); // rendered once: the run's first question reuses it
    expect(written!.knowledge.error).toBeUndefined();
  });

  it("codex among the engines: its run settings, the service tier among them (BRAIN_CODEX_SERVICE_TIER, ops 10-04)", () => {
    const { log } = logOf({ ...V4_ENV, BRAIN_ENGINE: "codex", BRAIN_ENGINE_MAP: "codex", BRAIN_CODEX_SERVICE_TIER: "priority", BRAIN_CODEX_MODE: "session" });
    const row = log.observe(state("RUNX00000011"))!;
    expect(Object.keys(row.brain.engines)).toEqual(["codex", "deepseek"]);
    expect(row.brain.codex).toMatchObject({ mode: "session", service_tier: "priority" });
    const standard = logOf({ ...V4_ENV, BRAIN_ENGINE: "codex", BRAIN_ENGINE_MAP: "codex" }).log.observe(state("RUNX00000012"))!;
    expect(standard.brain.codex!.service_tier).toBeNull();
    expect(standard.config_sha).not.toBe(row.config_sha);
    // Not asked: no codex block.
    expect(logOf(V4_ENV).log.observe(state("RUNX00000013"))!.brain.codex).toBeUndefined();
  });

  it("holds no key, no key file path and no other secret", () => {
    const { log, path } = logOf(V4_ENV);
    log.observe(state("RUNX00000002"));
    const text = readFileSync(path, "utf8");
    for (const secret of [JEV_KEY, DS_KEY, KEY_FILE, OTHER_TOKEN, "fakedeepseek", "secret-deepseek"]) expect(text).not.toContain(secret);
    expect(text).not.toMatch(/api_?key|apiKey|base_?url/i);
  });

  it("is not written when a setting would carry a secret; the note names the variable, not the value", () => {
    const notes: string[] = [];
    const { log, path } = logOf({ ...V4_ENV, JEV_MODEL: OTHER_TOKEN }, temp(), notes);
    expect(log.observe(state("RUNX00000003"))).toBeNull();
    expect(existsSync(path)).toBe(false);
    expect(notes.join("\n")).toContain("CI_DEPLOY_TOKEN");
    expect(notes.join("\n")).not.toContain(OTHER_TOKEN);
  });

  it("KNOWLEDGE_PREFIX=off: v3's system prompt hash, no prefix; no DeepSeek: no brain", () => {
    const off = logOf({ DEEPSEEK_API_KEY: DS_KEY });
    const row = off.log.observe(state("RUNX00000004", 8))!;
    expect(row.knowledge).toMatchObject({ prefix: "off", prefix_sha: null, prefix_tokens_est: null, system_chars: off.brain!.deepseek.systemPrompt.length });
    expect(row.knowledge.system_sha).toMatch(/^[0-9a-f]{12}$/);
    expect(row.brain).toMatchObject({ active: true, engine: "deepseek", by_prefix: {}, fallback: null });
    expect(Object.keys(row.brain.engines)).toEqual(["deepseek"]);
    expect(row.brain.claude).toBeUndefined();
    expect(row.target_ascension).toBeNull();
    const none = logOf({ KNOWLEDGE_PREFIX: "full", ARM: "jev" }).log.observe(state("RUNX00000005"))!;
    expect(none.brain.active).toBe(false);
    expect(none.deepseek).toBeNull();
    expect(none.knowledge.error).toMatch(/no brain/);
    expect(none.arm).toBe("jev");
  });

  it("a prefix over the warning size is in the row's warnings (outside the configuration hash)", () => {
    const { log, path, brain } = logOf(V4_ENV);
    (brain!.knowledge as unknown as { system: () => unknown }).system = () => ({ system: "BIG", note: { mode: "full", ascension: 9, prefix_sha: "big0", prefix_chars: 300_000 } });
    log.observe(state("RUNBIG1"));
    const [row] = rowsOf(path);
    expect(row!.knowledge.prefix_tokens_est).toEqual({ deepseek: 210_000, claude: 291_000 });
    expect(row!.warnings).toEqual([expect.stringMatching(/^the knowledge prefix is about 210000 DeepSeek tokens/)]);
    const small = logOf(V4_ENV);
    small.log.observe(state("RUNBIG1"));
    expect(rowsOf(small.path)[0]!.warnings).toBeUndefined();
  });

  it("an unknown ascension leaves the prefix unrendered and says so", () => {
    const row = logOf(V4_ENV).log.observe(state("RUNX00000006", null))!;
    expect(row.knowledge).toMatchObject({ prefix: "full", prefix_sha: null, ascension: null });
    expect(row.knowledge.error).toMatch(/ascension is not known/);
  });
});

describe("once per run", () => {
  it("one row per run id; menus and repeated states write nothing", () => {
    const { log, path } = logOf(V4_ENV);
    expect(log.observe(menu)).toBeNull();
    expect(log.observe(state("RUNY00000001"))).not.toBeNull();
    for (let floor = 1; floor < 5; floor += 1) expect(log.observe(state("RUNY00000001", 9, floor))).toBeNull();
    expect(log.observe(menu)).toBeNull();
    expect(log.observe(state("RUNY00000002"))).not.toBeNull();
    expect(rowsOf(path).map((row) => row.run_id)).toEqual(["RUNY00000001", "RUNY00000002"]);
  });

  it("a restarted process writes again only when the configuration changed (restart: true)", () => {
    const dir = temp();
    const first = logOf(V4_ENV, dir);
    first.log.observe(state("RUNZ00000001"));
    // Same configuration, a new process joining the run at F7: nothing new.
    expect(logOf(V4_ENV, dir).log.observe(state("RUNZ00000001", 9, 7))).toBeNull();
    // Map questions back on DeepSeek after the restart: a second row for the run.
    const { BRAIN_ENGINE_MAP: _map, ...changed } = V4_ENV;
    const again = logOf(changed, dir).log.observe(state("RUNZ00000001", 9, 7))!;
    expect(again).toMatchObject({ run_id: "RUNZ00000001", restart: true, floor: 7, brain: { by_prefix: {} } });
    const rows = rowsOf(first.path);
    expect(rows.map((row) => [row.run_id, row.restart])).toEqual([["RUNZ00000001", false], ["RUNZ00000001", true]]);
    expect(rows[0]!.config_sha).not.toBe(rows[1]!.config_sha);
  });

  it("the knowledge prefix re-rendered mid-run is not a configuration change; the row says brain.jsonl has each call's (fix-queue-v4 #10)", () => {
    const dir = temp();
    const lessons = join(dir, "lessons.md");
    const saved = process.env["KNOWLEDGE_LESSONS_FILE"];
    process.env["KNOWLEDGE_LESSONS_FILE"] = lessons;
    try {
      writeFileSync(lessons, readFileSync(join(DATA, "lessons.md"), "utf8"));
      const first = logOf(V4_ENV, dir);
      const before = first.log.observe(state("RUNW00000001"))!;
      expect(before.knowledge.prefix_note).toMatch(/brain\.jsonl row's knowledge\.prefix_sha/);
      // The lessons refreshed after the last run (WLM6YKJ0ASNE: the prefix changed in the run's first minutes), then
      // a restart joins the run at F7: the same configuration, no second row, so no "configuration changed mid-run".
      writeFileSync(lessons, `${readFileSync(lessons, "utf8")}\n## RUNCCCCCCCC3（A8，第48层，死于女王 QUEEN）\n- 新复盘\n`);
      const again = logOf(V4_ENV, dir);
      const rendered = again.brain!.knowledge.system({ ascension: 9, knowledgeDir: KNOWLEDGE }).note.prefix_sha;
      expect(rendered).not.toBe(before.knowledge.prefix_sha);
      expect(again.log.observe(state("RUNW00000001", 9, 7))).toBeNull();
      expect(rowsOf(first.path).filter((row) => row.run_id === "RUNW00000001")).toHaveLength(1);
    } finally {
      if (saved === undefined) delete process.env["KNOWLEDGE_LESSONS_FILE"];
      else process.env["KNOWLEDGE_LESSONS_FILE"] = saved;
    }
  });
});

describe("in the loop", () => {
  it("the loop writes one row on the run's first state, next to its decision log", async () => {
    const deepseek = new FakeDeepSeek(() => "o0");
    const REST = "7b0d-f8-rest";
    const { stats } = await play([board(REST, "rest"), board(REST, "rest"), mainMenuPayload()], deepseek);
    const path = runConfigLogPath(stats.logPath);
    temps.push(path);
    const rows = rowsOf(path);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ restart: false, brain: { active: true, engine: "deepseek" }, knowledge: { prefix: "off" }, jev: { enabled: true }, loop: { mode: "play" } });
    expect(rows[0]!.run_id).toMatch(/^[A-Z0-9]{8,}$/);
    // The checkout's root (core/paths.ts PROJECT_ROOT), the directory above agent/.
    expect(rows[0]!.code.worktree).toBe(dirname(ROOT).split("/").pop());
  });
});

describe("the log database reads it (tools/logdb/extract.py)", () => {
  it("run_config_row takes the writer's row; the Python fixtures have the writer's shape", () => {
    const { log, path } = logOf(V4_ENV);
    const row = log.observe(state("RUNX00000009"))!;
    const script = [
      "import json, sys",
      `sys.path.insert(0, ${JSON.stringify(join(ROOT, "tools/logdb"))})`,
      "import extract",
      "raw = open(sys.argv[1], 'rb').readline()",
      "row = extract.run_config_row(raw, 0)",
      "cols = [c for c, _ in extract.TABLES['run_config']]",
      "assert sorted(row) == sorted(cols), (sorted(set(row) ^ set(cols)))",
      "print(json.dumps(row, default=str))",
    ].join("\n");
    const out = spawnSync("python3", ["-c", script, path], { encoding: "utf8" });
    expect(out.status, out.stderr).toBe(0);
    const got = JSON.parse(out.stdout) as Record<string, unknown>;
    expect(got).toMatchObject({
      run_id: "RUNX00000009",
      ascension: 9,
      code: "0c66af2+dirty",
      dirty: true,
      branch: "v4",
      worktree: "jev-sts2-v4run",
      brain_active: true,
      brain_engine: "deepseek",
      brain_fallback: "deepseek",
      brain_label: "deepseek:deepseek-flash; MAP=claude:claude-opus-5-5",
      knowledge_prefix: "full",
      prefix_sha: row.knowledge.prefix_sha,
      prefix_tokens_deepseek: row.knowledge.prefix_tokens_est!.deepseek,
      system_sha: row.knowledge.system_sha,
      experience_version: "fixture-1",
      jev_model: "jev-latest",
      jev_context: "v1",
      target_ascension: 9,
      config_sha: row.config_sha,
      restart: false,
    });
    expect(JSON.parse(got["brain_by_prefix"] as string)).toEqual({ MAP: "claude" });
    // The hand-written fixtures of the Python tests use the writer's keys (no key the writer does not write).
    const noBrain = logOf({ KNOWLEDGE_PREFIX: "full" }).log.observe(state("RUNX00000010"))!;
    const shape = [...new Set([...keyPaths(row), ...keyPaths(noBrain)])];
    for (const fixture of ["tests/logdb-data/run-config.jsonl", "tests/eval-data/run-config.jsonl"]) {
      for (const line of readFileSync(join(ROOT, fixture), "utf8").trim().split("\n")) {
        const extra = keyPaths(JSON.parse(line)).filter((key) => !shape.includes(key));
        expect(extra, `${fixture}: keys the writer does not write`).toEqual([]);
      }
    }
  });
});

/**
 * Where things are after the layout change (docs/layout.md, core/paths.ts, knowledge/files.ts): the project root is
 * found from the code's own location, a relative path from the environment resolves against it (not the cwd: the old
 * cwd was the code root, where logs/ lived), every knowledge data file is where its loader looks, and the defaults the
 * brain and the tools start from exist.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { brainLogPath, loadConfig } from "../src/core/config.js";
import { AGENT_DIR, DATA_DIR, fromRoot, KNOWLEDGE_DIR, LOGS_DIR, PROJECT_ROOT, workspaceRoot } from "../src/core/paths.js";
import { COMMON_FILES, DEFAULT_CHARACTER, knowledgeDataDirs, knowledgeFile } from "../src/knowledge/files.js";
import { DEFAULT_KNOWLEDGE_DIR, KNOWLEDGE_FILES, lessonsPath } from "../src/knowledge/render/data.js";
import { DeepSeekClient } from "../src/brain/llm/deepseek.js";
import { resolveJevPromptLog } from "../src/eye/jev-prompt-log.js";
import { resolveRunConfigLog } from "../src/eye/run-config.js";
import { mcpLaunchSpec } from "../src/brain/tools/mcp-launch.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();
afterEach(() => process.chdir(cwd));

/** Every knowledge data file a loader reads (src/knowledge/*.ts, sim/boss-trust.ts, sl/elites.ts, strategy/*). */
const DATA_FILES = [
  "monster-db.json", "move-model.json", "event-pages.json", "card-upgrades.json",
  "experience.json", "ironclad-guide.md", "ds-handbook.md", "jev-hints.json", "outcome-stats.json", "room-costs.json",
  "boss-damage.json", "potion-equivalents.json", "fight-value.json", "fight-value-gates.json", "boss-trust.json", "sl-elites.json", "monster-records.json",
];

describe("the project root", () => {
  it("is this checkout's root: agent/ (with this test), knowledge/ and the logs/ and data/ beside them", () => {
    expect(PROJECT_ROOT).toBe(resolve(HERE, "..", ".."));
    expect(AGENT_DIR).toBe(resolve(HERE, ".."));
    expect(existsSync(join(AGENT_DIR, "package.json"))).toBe(true);
    expect(existsSync(join(KNOWLEDGE_DIR, "common"))).toBe(true);
    expect(LOGS_DIR).toBe(join(PROJECT_ROOT, "logs"));
    expect(DATA_DIR).toBe(join(PROJECT_ROOT, "data"));
    expect(DEFAULT_KNOWLEDGE_DIR).toBe(KNOWLEDGE_DIR);
  });

  it("resolves a relative path against itself whatever the cwd; an absolute one stays", () => {
    process.chdir(mkdtempSync(join(tmpdir(), "paths-cwd-")));
    expect(fromRoot("logs/decisions.jsonl")).toBe(join(PROJECT_ROOT, "logs", "decisions.jsonl"));
    expect(fromRoot("./logs/escalation")).toBe(join(PROJECT_ROOT, "logs", "escalation"));
    expect(fromRoot("/var/tmp/x.jsonl")).toBe("/var/tmp/x.jsonl");
    rmSync(process.cwd(), { recursive: true, force: true });
  });

  it("the workspace (notes/, ops/) is STS2_WORKSPACE, else the project root", () => {
    expect(workspaceRoot({} as NodeJS.ProcessEnv)).toBe(PROJECT_ROOT);
    expect(workspaceRoot({ STS2_WORKSPACE: "/srv/main" } as NodeJS.ProcessEnv)).toBe("/srv/main");
    expect(lessonsPath({} as NodeJS.ProcessEnv)).toBe(join(PROJECT_ROOT, "notes", "lessons.md"));
    expect(lessonsPath({ STS2_WORKSPACE: "/srv/main" } as NodeJS.ProcessEnv)).toBe("/srv/main/notes/lessons.md");
    expect(lessonsPath({ KNOWLEDGE_LESSONS_FILE: "notes/lessons.md" } as NodeJS.ProcessEnv)).toBe(join(PROJECT_ROOT, "notes", "lessons.md"));
    expect(lessonsPath({ KNOWLEDGE_LESSONS_FILE: "/x/lessons.md" } as NodeJS.ProcessEnv)).toBe("/x/lessons.md");
  });
});

describe("paths from the environment", () => {
  const env = {
    DEEPSEEK_API_KEY: "placeholder-not-a-key",
    DECISION_LOG: "logs/decisions.jsonl",
    SL_LOG: "logs/sl.jsonl",
    FIGHT_PLAN_LOG: "logs/fp.jsonl",
    RUN_PLAN_LOG: "logs/rp.jsonl",
    BRAIN_LOG: "logs/b.jsonl",
    JEV_PROMPT_LOG: "experiments/p.jsonl",
    RUN_CONFIG_LOG: "logs/rc.jsonl",
    DEEPSEEK_REASONING_LOG: "logs/ds.jsonl",
    DEEPSEEK_FACTS_SNAPSHOT_DIR: "logs/facts",
    CLAUDE_ESCALATION_DIR: "./logs/esc",
    DEEPSEEK_GUIDE_FILE: "knowledge/characters/ironclad/ironclad-guide.md",
  } as unknown as NodeJS.ProcessEnv;

  it("a relative one (an .env's DECISION_LOG=logs/decisions.jsonl) resolves against the project root, not the cwd", () => {
    process.chdir(mkdtempSync(join(tmpdir(), "paths-env-")));
    const config = loadConfig(env);
    const at = (rel: string) => join(PROJECT_ROOT, rel);
    expect(config.log.decisionLog).toBe(at("logs/decisions.jsonl"));
    expect(config.sl.log).toBe(at("logs/sl.jsonl"));
    expect(config.fightPlanLog).toBe(at("logs/fp.jsonl"));
    expect(config.runPlanLog).toBe(at("logs/rp.jsonl"));
    expect(config.brain.log).toBe(at("logs/b.jsonl"));
    expect(config.log.jevPromptLog).toBe(at("experiments/p.jsonl"));
    expect(config.log.runConfigLog).toBe(at("logs/rc.jsonl"));
    expect(config.deepseek?.reasoningLog).toBe(at("logs/ds.jsonl"));
    expect(config.deepseek?.factsSnapshotDir).toBe(at("logs/facts"));
    expect(config.escalation.claudeDir).toBe(at("logs/esc"));
    expect(config.deepseek?.guideFile).toBe(at("knowledge/characters/ironclad/ironclad-guide.md"));
    rmSync(process.cwd(), { recursive: true, force: true });
  });

  it("an absolute one is used as given", () => {
    const config = loadConfig({ DECISION_LOG: "/var/tmp/d/decisions.jsonl", BRAIN_LOG: "/var/tmp/b.jsonl" } as unknown as NodeJS.ProcessEnv);
    expect(config.log.decisionLog).toBe("/var/tmp/d/decisions.jsonl");
    expect(config.sl.log).toBe("/var/tmp/d/sl-attempts.jsonl");
    expect(config.brain.log).toBe("/var/tmp/b.jsonl");
  });

  it("the defaults are the project's logs/ (where the old code root kept them)", () => {
    process.chdir(tmpdir());
    const config = loadConfig({ DEEPSEEK_API_KEY: "placeholder-not-a-key" } as unknown as NodeJS.ProcessEnv);
    expect(config.log.decisionLog).toBe(join(LOGS_DIR, "decisions.jsonl"));
    expect(config.sl.log).toBe(join(LOGS_DIR, "sl-attempts.jsonl"));
    expect(brainLogPath(config)).toBe(join(LOGS_DIR, "brain.jsonl"));
    expect(resolveJevPromptLog(config.log)).toBe(join(LOGS_DIR, "jev-prompts.jsonl"));
    expect(resolveRunConfigLog(config.log)).toBe(join(LOGS_DIR, "run-config.jsonl"));
    expect(config.fightPlanLog).toBe(join(LOGS_DIR, "fight-plans.jsonl"));
    expect(config.runPlanLog).toBe(join(LOGS_DIR, "run-plans.jsonl"));
    expect(config.deepseek?.reasoningLog).toBe(join(LOGS_DIR, "deepseek-reasoning.jsonl"));
    expect(config.deepseek?.factsSnapshotDir).toBe(join(LOGS_DIR, "guide-facts"));
    expect(config.escalation.claudeDir).toBe(join(LOGS_DIR, "escalation"));
  });
});

describe("the knowledge files", () => {
  it("every data file is where its loader looks: common/ or characters/<character>/", () => {
    expect(DEFAULT_CHARACTER).toBe("ironclad");
    for (const name of [...DATA_FILES, ...Object.values(KNOWLEDGE_FILES)]) {
      const path = knowledgeFile(KNOWLEDGE_DIR, name);
      expect(existsSync(path), path).toBe(true);
      expect(path.startsWith(join(KNOWLEDGE_DIR, COMMON_FILES.has(name) ? "common" : join("characters", DEFAULT_CHARACTER)) + "/")).toBe(true);
    }
  });

  it("nothing in the data directories is outside that map (a file a loader would not find)", () => {
    const seen = knowledgeDataDirs().flatMap((dir) => readdirSync(dir).filter((name) => !name.startsWith(".")).map((name) => join(dir, name)));
    for (const path of seen) expect(knowledgeFile(KNOWLEDGE_DIR, path.split("/").pop()!), path).toBe(path);
    expect(seen.length).toBe(DATA_FILES.length);
  });

  it("the default guide and handbook (v3's system prompt) exist and reach DeepSeek's system prompt", () => {
    process.chdir(tmpdir());
    const config = loadConfig({ DEEPSEEK_API_KEY: "placeholder-not-a-key" } as unknown as NodeJS.ProcessEnv);
    expect(config.deepseek?.guideFile).toBe(knowledgeFile(KNOWLEDGE_DIR, "ironclad-guide.md"));
    expect(config.deepseek?.handbookFile).toBe(knowledgeFile(KNOWLEDGE_DIR, "ds-handbook.md"));
    expect(existsSync(config.deepseek!.guideFile)).toBe(true);
    expect(existsSync(config.deepseek!.handbookFile)).toBe(true);
    const client = new DeepSeekClient({ ...config.deepseek!, factsSnapshotDir: "" });
    // readOptional() gives "" for a missing file: both hashes present means both files were read.
    expect(client.guideId).toMatch(/^[0-9a-f]{8}\+[0-9a-f]{8}$/);
    expect(client.systemPrompt).toContain("# Ironclad strategy guide");
    expect(client.systemPrompt).toContain("# 经验手册（来自过往对局复盘）");
  });
});

describe("the tool servers' and log database's defaults", () => {
  it("the MCP server runs this package's tsx on its own source", () => {
    const spec = mcpLaunchSpec({ ascension: 9, knowledgeDir: KNOWLEDGE_DIR, logsDir: LOGS_DIR });
    expect(spec.args.slice(0, 2)).toEqual([join(AGENT_DIR, "node_modules/.bin/tsx"), join(AGENT_DIR, "src/brain/tools/mcp-server.ts")]);
    expect(existsSync(spec.args[1]!)).toBe(true);
  });

  it("the log database's query script is in agent/tools/logdb", () => {
    expect(existsSync(join(AGENT_DIR, "tools", "logdb", "query.py"))).toBe(true);
  });
});

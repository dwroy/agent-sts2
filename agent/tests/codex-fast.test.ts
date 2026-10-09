import { describe, expect, it } from "vitest";

import { codexArgs, sessionArgs } from "../src/brain/engines/codex.js";
import { loadConfig } from "../src/core/config.js";
import { codexCommand, type EngineRequest } from "../../learner/lib/engines.js";
import { initCommand, interactiveArgs, resumeCommand } from "../../ops/codex/lib.js";

const SESSION = "01a10717-c859-7592-9012-ad4251284920";
const request: EngineRequest = {
  engine: "codex", cwd: "/tmp/fast-project", projectRoot: "/tmp/fast-project",
  home: "/tmp/fast-home", codexHome: "/tmp/fast-home/.codex", keyFiles: [],
  model: "gpt-6.1-sol", effort: "xhigh", tools: ["Read", "Bash"],
};

describe("Codex Fast policy across session entry points", () => {
  it.each(["IRONCLAD", "SILENT"])("uses Fast for %s, preserving model and reasoning", (character) => {
    for (const legacyTier of [undefined, "default", "priority"]) {
      const config = loadConfig({ CHARACTER: character, BRAIN_CODEX_SERVICE_TIER: legacyTier });
      expect(config.brain.codex.serviceTier).toBe("priority");
      expect(config.brain.engines.codex.model).toBe("gpt-6.1-sol");
      expect(config.brain.engines.codex.effort).toBe("xhigh");
    }
  });

  it("passes Fast to learner exec, ops init/resume and interactive ops resume", () => {
    const commands = [
      codexCommand(request, "TASK", "codex").args,
      initCommand(request, "TASK", "codex").args,
      resumeCommand(request, SESSION, "TASK", "codex").args,
      interactiveArgs(request, SESSION),
    ];
    for (const args of commands) {
      expect(args).toContain('service_tier="priority"');
      expect(args).toContain('model_reasoning_effort="xhigh"');
      expect(args).toContain("gpt-6.1-sol");
    }
  });

  it("passes Fast through both play transports and preserves their isolation settings", () => {
    const config = loadConfig({}).brain;
    const brain = config.codex;
    const settings = { catalogFile: "/tmp/fast-catalog.json", stateDir: "/tmp/fast-state",
      effort: config.engines.codex.effort, summary: brain.summary, serviceTier: brain.serviceTier };
    const commands = [
      codexArgs({ ...settings, systemFile: "/tmp/fast-system.md", cwd: "/tmp/fast-cwd", model: config.engines.codex.model, schemaFile: null }),
      sessionArgs(settings),
    ];
    for (const args of commands) {
      expect(args).toContain('service_tier="priority"');
      expect(args).toContain('model_reasoning_effort="xhigh"');
      expect(args).toContain("project_doc_max_bytes=0");
      expect(args).toContain("hooks");
    }
  });
});

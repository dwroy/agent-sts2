import { describe, expect, it } from "vitest";

import { codexArgs, sessionArgs } from "../src/brain/engines/codex.js";
import { loadConfig } from "../src/core/config.js";
import { codexCommand, engineDefaults, type EngineRequest } from "../../learner/lib/engines.js";
import { initCommand, interactiveArgs, resumeCommand } from "../../ops/codex/lib.js";

const SESSION = "01a10717-c859-7592-9012-ad4251284920";
const request: EngineRequest = {
  engine: "codex", cwd: "/tmp/fast-project", projectRoot: "/tmp/fast-project",
  home: "/tmp/fast-home", codexHome: "/tmp/fast-home/.codex", keyFiles: [],
  model: "gpt-6-astra", effort: "xhigh", tools: ["Read", "Bash"],
};

describe("Shared Codex defaults across session entry points", () => {
  it.each(["IRONCLAD", "SILENT"])("uses Astra/xhigh/normal for %s", (character) => {
    for (const legacyTier of [undefined, "default", "priority"]) {
      const config = loadConfig({ CHARACTER: character, BRAIN_CODEX_SERVICE_TIER: legacyTier });
      expect(config.brain.codex.serviceTier).toBe("default");
      expect(config.brain.engines.codex.model).toBe("gpt-6-astra");
      expect(config.brain.engines.codex.effort).toBe("xhigh");
    }
  });

  it("applies normal tier and 512k to ops init/resume and interactive resume", () => {
    const commands = [
      initCommand(request, "TASK", "codex").args,
      resumeCommand(request, SESSION, "TASK", "codex").args,
      interactiveArgs(request, SESSION),
    ];
    for (const args of commands) {
      expect(args).toContain("model_context_window=512000");
      expect(args).toContain("model_auto_compact_token_limit=460800");
      expect(args).toContain('service_tier="default"');
      expect(args).toContain('model_reasoning_effort="xhigh"');
      expect(args).toContain("gpt-6-astra");
    }
  });

  it("shares learner Astra/xhigh/normal with gameplay and ops", () => {
    expect(engineDefaults("codex")).toEqual({ model: "gpt-6-astra", effort: "xhigh" });
    const opsArgs = initCommand({ ...request, model: undefined, effort: undefined }, "TASK", "codex").args;
    expect(opsArgs).toContain("gpt-6-astra");
    expect(opsArgs).toContain('service_tier="default"');
    const args = codexCommand({ ...request, model: undefined, effort: undefined }, "TASK", "codex").args;
    expect(args).toContain("gpt-6-astra");
    expect(args).toContain('model_reasoning_effort="xhigh"');
    expect(args).toContain("--ignore-user-config");
    expect(args).toContain("model_context_window=512000");
    expect(args).toContain("model_auto_compact_token_limit=460800");
    expect(args).toContain('service_tier="default"');
  });

  it("passes normal tier and 512k through both play transports and preserves their isolation settings", () => {
    const config = loadConfig({}).brain;
    const brain = config.codex;
    const settings = { catalogFile: "/tmp/fast-catalog.json", stateDir: "/tmp/fast-state",
      effort: config.engines.codex.effort, summary: brain.summary, serviceTier: brain.serviceTier };
    const commands = [
      codexArgs({ ...settings, systemFile: "/tmp/fast-system.md", cwd: "/tmp/fast-cwd", model: config.engines.codex.model, schemaFile: null }),
      sessionArgs(settings),
    ];
    for (const args of commands) {
      expect(args).toContain("model_context_window=512000");
      expect(args).toContain("model_auto_compact_token_limit=460800");
      expect(args).toContain('service_tier="default"');
      expect(args).toContain('model_reasoning_effort="xhigh"');
      expect(args).toContain("project_doc_max_bytes=0");
      expect(args).toContain("hooks");
    }
  });
});

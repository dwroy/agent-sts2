import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ConfigError, loadConfig, parsePortRange, requireJevApiKey, resolveClaudeBin } from "../src/config.js";

const env = (values: Record<string, string> = {}): NodeJS.ProcessEnv => values as NodeJS.ProcessEnv;

describe("loadConfig", () => {
  it("applies the documented defaults", () => {
    const config = loadConfig(env());
    expect(config.sts2.baseUrl).toBe("http://127.0.0.1:8080");
    expect(config.sts2.portScan).toEqual({ from: 8080, to: 8090 });
    expect(config.sts2.timeoutMs).toBe(10_000);
    expect(config.jev.model).toBe("jev-1.13.0");
    expect(config.jev.apiKey).toBeNull();
    expect(config.jev.maxRetries).toBe(2);
    expect(config.mode).toBe("shadow");
    expect(config.budgets).toEqual({ maxRequests: 2_000, maxTokens: 20_000_000 });
    expect(config.thresholds).toEqual({ act: 0.55, strong: 0.75 });
    expect(config.enricher).toMatchObject({ enabled: false, tasks: ["run_brief"] });
    expect(config.warnings).toEqual([]);
  });

  it("reads environment overrides", () => {
    const config = loadConfig(
      env({
        STS2_BASE_URL: "http://192.168.1.5:8081",
        STS2_PORT_SCAN: "8081",
        TYPESAFE_API_KEY: "test-key",
        JEV_MODEL: "jev-1.13.0",
        MAX_TOKENS: "5M",
        MODE: "play",
        ENRICHER_ENABLED: "true",
        ENRICHER_BASE_URL: "http://127.0.0.1:11434/v1",
        ENRICHER_MODEL: "qwen3:8b",
        ENRICHER_TASKS: "run_brief, unknown_screen",
      }),
    );
    expect(config.sts2.baseUrl).toBe("http://192.168.1.5:8081");
    expect(config.sts2.portScan).toEqual({ from: 8081, to: 8081 });
    expect(config.jev.apiKey).toBe("test-key");
    expect(config.budgets.maxTokens).toBe(5_000_000);
    expect(config.mode).toBe("play");
    expect(config.enricher).toMatchObject({
      enabled: true,
      baseUrl: "http://127.0.0.1:11434/v1",
      model: "qwen3:8b",
      tasks: ["run_brief", "unknown_screen"],
    });
  });

  it("gives CLI overrides precedence over the environment", () => {
    const config = loadConfig(env({ STS2_BASE_URL: "http://127.0.0.1:9999", MODE: "shadow" }), {
      sts2BaseUrl: "http://127.0.0.1:8085",
      mode: "record",
      jevModel: "jev-1.13.0",
    });
    expect(config.sts2.baseUrl).toBe("http://127.0.0.1:8085");
    expect(config.mode).toBe("record");
  });

  it("treats blank values as unset", () => {
    const config = loadConfig(env({ TYPESAFE_API_KEY: "   ", STS2_BASE_URL: "" }));
    expect(config.jev.apiKey).toBeNull();
    expect(config.sts2.baseUrl).toBe("http://127.0.0.1:8080");
  });

  it("strips a trailing slash from the base URL", () => {
    expect(loadConfig(env({ STS2_BASE_URL: "http://127.0.0.1:8080/" })).sts2.baseUrl).toBe("http://127.0.0.1:8080");
  });

  it("collects every problem instead of failing on the first", () => {
    try {
      loadConfig(env({ MODE: "turbo", STS2_BASE_URL: "not a url", STS2_PORT_SCAN: "abc" }));
      throw new Error("expected a ConfigError");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const fields = (error as ConfigError).problems.map((problem) => problem.field);
      expect(fields).toContain("MODE");
      expect(fields).toContain("STS2_BASE_URL");
      expect(fields).toContain("STS2_PORT_SCAN");
    }
  });

  it("requires an enricher URL and model when the enricher is enabled", () => {
    try {
      loadConfig(env({ ENRICHER_ENABLED: "true" }));
      throw new Error("expected a ConfigError");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const fields = (error as ConfigError).problems.map((problem) => problem.field);
      expect(fields).toEqual(expect.arrayContaining(["ENRICHER_BASE_URL", "ENRICHER_MODEL"]));
    }
  });

  it("BUILD_ONESHOT: on by default, off on request, anything else a problem", () => {
    expect(loadConfig(env({})).buildOneshot).toBe("on");
    expect(loadConfig(env({ BUILD_ONESHOT: "OFF" })).buildOneshot).toBe("off");
    try {
      loadConfig(env({ BUILD_ONESHOT: "sometimes" }));
      throw new Error("expected a ConfigError");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).problems.map((problem) => problem.field)).toContain("BUILD_ONESHOT");
    }
  });

  it("warns when the confidence tiers are inverted", () => {
    const config = loadConfig(env({ CONFIDENCE_ACT: "0.9", CONFIDENCE_STRONG: "0.4" }));
    expect(config.warnings).toHaveLength(1);
    expect(config.warnings[0]).toContain("CONFIDENCE_ACT");
  });
});

describe("parsePortRange", () => {
  it("parses a range", () => {
    expect(parsePortRange("8080-8090", "X", [])).toEqual({ from: 8080, to: 8090 });
  });

  it("parses a single port", () => {
    expect(parsePortRange("8080", "X", [])).toEqual({ from: 8080, to: 8080 });
  });

  it("rejects an inverted range", () => {
    const problems: { field: string; message: string }[] = [];
    expect(parsePortRange("9000-8000", "X", problems)).toEqual({ from: 8000, to: 9000 });
    expect(problems).toHaveLength(1);
  });

  it("rejects out-of-range ports", () => {
    const problems: { field: string; message: string }[] = [];
    parsePortRange("70000", "X", problems);
    expect(problems).toHaveLength(1);
  });
});

describe("requireJevApiKey", () => {
  it("returns the key when present", () => {
    const config = loadConfig(env({ TYPESAFE_API_KEY: "abc123" }));
    expect(requireJevApiKey(config)).toBe("abc123");
  });

  it("throws an actionable ConfigError when missing", () => {
    const config = loadConfig(env());
    expect(() => requireJevApiKey(config)).toThrow(ConfigError);
    expect(() => requireJevApiKey(config)).toThrow(/TYPESAFE_API_KEY/);
  });
});

describe("the claude program (BRAIN_CLAUDE_BIN)", () => {
  const root = mkdtempSync(join(tmpdir(), "claude-bin-"));
  const program = (path: string): string => {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "#!/bin/sh\necho 1.0\n");
    chmodSync(path, 0o755);
    return path;
  };
  const onPath = program(join(root, "bin", "claude"));
  const home = join(root, "home");
  const installed = program(join(home, ".local", "bin", "claude"));
  // Not executable: skipped.
  mkdirSync(join(root, "plain"), { recursive: true });
  writeFileSync(join(root, "plain", "claude"), "");

  it("is BRAIN_CLAUDE_BIN when set, else the first executable claude on PATH, else ~/.local/bin/claude, as absolute paths", () => {
    expect(resolveClaudeBin({ BRAIN_CLAUDE_BIN: "/opt/claude", PATH: join(root, "bin"), HOME: home } as NodeJS.ProcessEnv)).toBe("/opt/claude");
    expect(resolveClaudeBin({ PATH: [join(root, "plain"), join(root, "bin")].join(":"), HOME: home } as NodeJS.ProcessEnv)).toBe(onPath);
    // ops/run.sh's PATH has only ~/.local/node/bin: the installed program is found anyway.
    expect(resolveClaudeBin({ PATH: [join(root, "plain"), join(home, ".local", "node", "bin")].join(":"), HOME: home } as NodeJS.ProcessEnv)).toBe(installed);
    expect(loadConfig({ PATH: join(root, "plain"), HOME: home } as unknown as NodeJS.ProcessEnv).brain.claude.bin).toBe(installed);
    // Nothing found: the bare name, which the start-up check reports.
    expect(resolveClaudeBin({ PATH: join(root, "plain"), HOME: join(root, "nobody") } as NodeJS.ProcessEnv)).toBe("claude");
  });
});

/** Fixed configuration/launcher contracts only; no model or production home access. */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { CODEX_SERVICE_TIER, ConfigError, loadConfig } from "../src/core/config.js";
import { codexConfig, sessionArgs } from "../src/brain/engines/codex.js";
import { codexLearnerConfig } from "../../learner/lib/engines.js";

afterEach(() => vi.unstubAllEnvs());

it.each([undefined, "default", "fast", "priority"])("selects only the brain tier %s and sends it explicitly to native CLI configuration", tier => {
  const cfg = loadConfig(tier ? { BRAIN_CODEX_SERVICE_TIER: tier } : {});
  const expected = tier ?? "default";
  expect(cfg.brain.codex.serviceTier).toBe(expected);
  expect(CODEX_SERVICE_TIER).toBe("default");
  const opts = { systemFile: "/fixture/system", catalogFile: "/fixture/catalog", stateDir: "/fixture/state", effort: "xhigh", summary: "auto", serviceTier: cfg.brain.codex.serviceTier };
  expect(codexConfig(opts).filter(s => s.startsWith("service_tier="))).toEqual([`service_tier="${expected}"`]);
  expect(sessionArgs(opts)).toContain(`service_tier="${expected}"`);
  const normal = loadConfig({});
  expect(cfg.brain.engines).toEqual(normal.brain.engines);
  expect(cfg.jev).toEqual(normal.jev);
});

it.each(["auto", "flex", "ultrafast", "FAST", "none", "not-a-tier"])("rejects unsupported brain tier %s", tier => {
  expect(() => loadConfig({ BRAIN_CODEX_SERVICE_TIER: tier })).toThrow(ConfigError);
  expect(() => loadConfig({ BRAIN_CODEX_SERVICE_TIER: tier })).toThrow("BRAIN_CODEX_SERVICE_TIER");
});

it.each(["fast", "priority"])("keeps learner and ops/learner shell policy normal when the brain selects %s", tier => {
  vi.stubEnv("BRAIN_CODEX_SERVICE_TIER", tier);
  expect(codexLearnerConfig({ effort: "high" }).filter(s => s.startsWith("service_tier="))).toEqual(['service_tier="default"']);
  const dir = mkdtempSync(join(tmpdir(), "brain-tier-policy-"));
  try {
    const fake = join(dir, "native.py");
    writeFileSync(fake, '#!/usr/bin/python3\nimport json,sys\nprint(json.dumps(sys.argv[1:]))\n', { mode: 0o700 });
    const text = execFileSync("bash", ["-c", 'codex_bin="$1"; shift; policy_path="$1"; shift; source "$policy_path" "$@"', "fixture", fake,
      resolve("../ops/codex-policy.sh"), "exec", "-c", 'service_tier="priority"', "--", "/fixture/check"],
    { encoding: "utf8", env: { PATH: process.env.PATH, BRAIN_CODEX_SERVICE_TIER: tier } });
    const args = JSON.parse(text) as string[];
    expect(args.filter(s => s.startsWith("service_tier="))).toEqual(['service_tier="default"']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

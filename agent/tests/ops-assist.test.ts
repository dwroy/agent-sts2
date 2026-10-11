import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assistFilesystem, assistOverrides, assistRequest, assistPlan } from "../../ops/codex/assist.js";
import { validateRequest } from "../../ops/codex/lib.js";

describe("ops assistant boundary", () => {
  it("uses the established learner profile with no writable path", () => {
    const request = assistRequest("/fixture/repo", "/fixture/repo/ops/codex-ops/assist/jobs/a/input", { HOME: "/fixture/home", CODEX_HOME: "/fixture/home/codex" });
    const rules = assistFilesystem(request);
    expect(request.tools).toEqual(["Read", "Grep", "Glob"]);
    expect(rules["/fixture/home/codex/auth.json"]).toBe("none");
    expect(rules[":root"]).toBe("read");
    expect(rules[":tmpdir"]).toBeUndefined();
    expect(JSON.stringify(rules)).not.toContain('"write"');
    expect(assistOverrides(request)[1]).toContain("permissions.ops_assist.filesystem=");
  });
  it("keeps the request, key probe and model on LEARNER_CODEX_HOME even when CODEX_HOME differs", () => {
    const root = mkdtempSync(join(tmpdir(), "assist-home-"));
    try {
      mkdirSync(join(root, "learner/tasks"), { recursive: true });
      mkdirSync(join(root, "input"));
      writeFileSync(join(root, "learner/tasks/ops-assist.md"), "fixture");
      writeFileSync(join(root, "input/manifest.json"), "{}");
      const plan = assistPlan(root, join(root, "input"), { HOME: "/fixture/home", CODEX_HOME: "/fixture/old", LEARNER_CODEX_HOME: "/fixture/isolated", LEARNER_CODEX_BIN: "/bin/true" });
      expect(plan.env["CODEX_HOME"]).toBe("/fixture/isolated");
      expect(plan.command.args.join(" ")).toContain('"/fixture/isolated/auth.json" = "none"');
      expect(plan.probe.join(" ")).toContain('"/fixture/isolated/auth.json" = "none"');
      expect(plan.command.args.join(" ")).toContain("--disable multi_agent");
      expect(plan.command.args).toContain("project_doc_max_bytes=0");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it("broker accepts only fixed task IDs and the argument-free status action", () => {
    expect(validateRequest({ action: "ops-assist", args: ["audit-20261011-01"] }).ok).toBe(true);
    expect(validateRequest({ action: "ops-assist-status", args: [] }).ok).toBe(true);
    for (const id of ["../escape", "a;touch", "a/b", "UPPER", "a".repeat(49), "a.json", "a_b"]) {
      expect(validateRequest({ action: "ops-assist", args: [id] }).ok).toBe(false);
    }
    expect(validateRequest({ action: "ops-assist-status", args: ["a"] }).ok).toBe(false);
  });
});

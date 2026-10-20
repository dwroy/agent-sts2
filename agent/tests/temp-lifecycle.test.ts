import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cleanupTempScope, createTempScope, defaultTempParent } from "../tools/temp-root.mjs";
import { mkdtempSync } from "./temp-fixtures.js";

describe("owned temporary files", () => {
  it("removes unexpected nested sidecars while leaving neighboring caller files intact", () => {
    const parent = mkdtempSync(join(tmpdir(), "temp-lifecycle-"));
    const neighbor = join(parent, "caller-evidence");
    writeFileSync(neighbor, "retain");
    const scope = createTempScope({}, parent);
    const nested = join(scope.directory!, "future-sidecar");
    mkdirSync(nested);
    writeFileSync(join(nested, "run-config.jsonl"), "fixed");
    scope.cleanup();
    scope.cleanup();
    expect(existsSync(scope.directory!)).toBe(false);
    expect(readFileSync(neighbor, "utf8")).toBe("retain");
  });

  it("preserves an explicit TMPDIR and refuses a mismatched ownership marker", () => {
    const directory = mkdtempSync(join(tmpdir(), "temp-explicit-"));
    const scope = createTempScope({ TMPDIR: directory }, "/does-not-exist");
    expect(scope.env).toEqual({});
    scope.cleanup();
    expect(existsSync(directory)).toBe(true);
    writeFileSync(join(directory, ".sts2-temp-owner"), "original");
    expect(() => cleanupTempScope(directory, "wrong")).toThrow("owner mismatch");
    expect(existsSync(directory)).toBe(true);
  });

  it("defaults to the common repository disk before a child starts and cleans on failure", () => {
    const env = { ...process.env };
    delete env.TMPDIR;
    const cwd = mkdtempSync(join(tmpdir(), "temp-old-checkout-"));
    const wrapper = fileURLToPath(new URL("../tools/with-temp.mjs", import.meta.url));
    const result = spawnSync(process.execPath, [wrapper, process.execPath, "-e",
      "const fs=require('fs'); console.log(require('os').tmpdir()); fs.writeFileSync(process.env.TMPDIR+'/new-sidecar','fixed'); process.exit(7)"],
    { cwd, env, encoding: "utf8", timeout: 5000 });
    expect(result.status).toBe(7);
    const directory = result.stdout.trim();
    expect(directory.startsWith(defaultTempParent() + "/s-")).toBe(true);
    expect(existsSync(directory)).toBe(false);
  });

  it("keeps caller-owned child scratch on a successful smoke command", () => {
    const directory = mkdtempSync(join(tmpdir(), "temp-smoke-"));
    execFileSync(process.execPath, ["tools/with-temp.mjs", process.execPath, "-e",
      "require('fs').writeFileSync(process.env.TMPDIR+'/evidence','fixed')"],
    { env: { ...process.env, TMPDIR: directory }, timeout: 5000 });
    expect(readFileSync(join(directory, "evidence"), "utf8")).toBe("fixed");
  });

  it("reports a missing offline executable as a failure", () => {
    const result = spawnSync(process.execPath, ["tools/with-temp.mjs", "/missing-sts2-fixed-executable"],
      { encoding: "utf8", timeout: 5000 });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ENOENT");
  });
});

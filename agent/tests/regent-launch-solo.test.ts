import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateRequest } from "../../ops/codex/lib.js";
import { sharedJevSettings } from "../src/core/jev-settings.js";

describe("registered Regent solo startup", () => {
  it("admits only a frozen manifest, not arbitrary native commands", () => {
    expect(validateRequest({action:"regent-launch-solo",args:["a".repeat(64)]}).ok).toBe(true);
    for (const args of [[], ["8080"], ["a".repeat(64), "--force-steam"]]) {
      expect(validateRequest({action:"regent-launch-solo",args}).ok).toBe(false);
    }
  });
  it("runs fixed deduplication, binding and lane tests without any live access", () => {
    const output = execFileSync("python3", ["-B", "-m", "unittest", "discover", "-s", "../ops/tests", "-p", "test_regent_launch_solo.py"], { encoding:"utf8", stdio:["ignore","pipe","pipe"] });
    expect(output).toBe("");
  });
  it("shares only Jev credential/service fields and never another role's endpoint or log paths", () => {
    const dir = mkdtempSync(join(tmpdir(),"regent-jev-fixture-"));
    try {
      const file=join(dir,"settings.fixture");
      writeFileSync(file,'TYPESAFE_API_KEY=fixed-test-placeholder\nTYPESAFE_BASE_URL=https://example.invalid\nJEV_MODEL=fixture\nCHARACTER=SILENT\nSTS2_BASE_URL=http://127.0.0.1:8080\nDECISION_LOG=/foreign/decisions.jsonl\n');
      expect(sharedJevSettings(file)).toEqual({ TYPESAFE_API_KEY:"fixed-test-placeholder", TYPESAFE_BASE_URL:"https://example.invalid", JEV_MODEL:"fixture" });
    } finally { rmSync(dir,{recursive:true,force:true}); }
  });
});

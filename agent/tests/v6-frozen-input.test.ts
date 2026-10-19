import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, symlinkSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { frozenRecord } from "../tools/v6/frozen-input.js";
it("accepts only exact bounded log bytes inside the source directory, including symlink resolution", () => {
  const dir = mkdtempSync(join(tmpdir(), "v6-input-")), logs = join(dir, "logs"), bytes = Buffer.from('{"state":{"run_id":"fixed"}}\n');
  mkdirSync(logs); writeFileSync(join(logs, "states.jsonl"), bytes); writeFileSync(join(dir, "outside"), bytes);
  const source = { path: "states.jsonl", offset: 0, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  try {
    expect(frozenRecord(logs, source)).toEqual({ state: { run_id: "fixed" } });
    expect(() => frozenRecord(logs, { ...source, bytes: bytes.length - 1 })).toThrow("SHA mismatch");
    expect(() => frozenRecord(logs, { ...source, offset: -1 })).toThrow("invalid frozen");
    expect(() => frozenRecord(logs, { ...source, path: "../outside" })).toThrow("invalid frozen");
    symlinkSync(join(dir, "outside"), join(logs, "escape"));
    expect(() => frozenRecord(logs, { ...source, path: "escape" })).toThrow("invalid frozen");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

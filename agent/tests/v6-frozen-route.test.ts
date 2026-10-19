import { afterEach, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { frozenRouteTable, type FrozenRouteRef } from "../tools/v6/frozen-route.js";
import { fingerprint } from "../src/hand/act/gate.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { asRecord } from "../src/core/util/json.js";
import { board, setupOneshotTests } from "./oneshot-support.js";
setupOneshotTests();
const dirs: string[] = []; afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { force: true, recursive: true }); });
function fixture(boss = "F17 r14c3：到达 27/60（p75 10）") {
  const raw = board("xljq-f5-reward", "reward"), run = asRecord(raw["run"]);
  Object.assign(run, { character_id: "SILENT", ascension: 10, act_id: "0", floor: 5, current_hp: 40, max_hp: 60 });
  const state = parseGameState(raw), observed = "2026-10-19T12:00:00.000Z";
  const row = { run_id: raw["run_id"], floor: 5, observed_ts: observed, fingerprint: fingerprint(state),
    request: { state: { run_brief: { floor: 5, act: "1", ascension: 10 }, route_review: { plan_facts: { boss } } } } };
  const dir = mkdtempSync(join(tmpdir(), "v6-frozen-route-")); dirs.push(dir);
  const path = join(dir, "jev-prompts.jsonl"), bytes = Buffer.from(JSON.stringify(row) + "\n"); writeFileSync(path, bytes);
  const ref: FrozenRouteRef = { run_id: String(raw["run_id"]), floor: 5, observed_ts: observed,
    source: { path, offset: 0, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") } };
  return { raw, state, observed, row, dir, path, bytes, ref };
}
it("recovers the displayed route estimate only for the exact frozen question state", () => {
  const f = fixture(), result = frozenRouteTable(f.dir, [f.ref], f.state, f.observed);
  expect(result.table?.entries[0]).toMatchObject({ act: 1, floor: 17, hp: 27, max_hp: 60 });
  expect(result.sources).toEqual([f.ref.source]);
  expect(frozenRouteTable(f.dir, [f.ref], f.state, "2026-10-19T12:01:00.000Z").table).toBeNull();
  asRecord(f.raw["run"])["gold"] = 999;
  expect(frozenRouteTable(f.dir, [f.ref], parseGameState(f.raw), f.observed).table).toBeNull();
  const bytes = Buffer.from(f.bytes); bytes[bytes.length - 2] = 32; writeFileSync(f.path, bytes);
  expect(() => frozenRouteTable(f.dir, [f.ref], f.state, f.observed)).toThrow("SHA mismatch");
});
it("preserves dead, unknown and changed-max-HP route displays without inferring later actual entry HP", () => {
  for (const [text, hp] of [["F17 r14c3：到达 0（血量耗尽）（p75 耗尽）", 0],
    ["F17 r14c3：到达 未知（前场 Boss 损血未建模）（p75 未知）", null], ["F17 r14c3：到达 27/65（p75 10）", null]] as const) {
    const f = fixture(text); expect(frozenRouteTable(f.dir, [f.ref], f.state, f.observed).table?.entries[0]!.hp).toBe(hp);
  }
});
it("does not choose between conflicting question facts for an identical state", () => {
  const f = fixture(), b = Buffer.from(JSON.stringify({ ...f.row, request: { state: { ...f.row.request.state,
    route_review: { plan_facts: { boss: "F17 r14c3：到达 28/60（p75 11）" } } } } }) + "\n");
  writeFileSync(f.path, Buffer.concat([f.bytes, b]));
  const ref = { ...f.ref, source: { ...f.ref.source, offset: f.bytes.length, bytes: b.length, sha256: createHash("sha256").update(b).digest("hex") } };
  expect(frozenRouteTable(f.dir, [f.ref, ref], f.state, f.observed)).toMatchObject({ table: null, reason: "conflicting_frozen_route_questions" });
});

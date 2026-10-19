import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { assembleV6History, loadV6HistoryPack, sealV6History } from "../src/sim/v6-history-pack.js";
import { pooledMetrics } from "./v6-build-metric-fixtures.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const temporary = () => { const root = mkdtempSync(join(tmpdir(), "v6-history-")); roots.push(root); return root; };
const at = (n: number) => `2020-01-01T00:${String(n).padStart(2, "0")}:00.000Z`;
const sha = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
function input() {
  const coverage = [{ run_id: "r", ended: at(50), ascension: 0, first_stop: { ts: at(30), floor: 17, result: "predicted_death" },
    first_trial_final_victory: false, final_including_sl_victory: true }];
  const frame = (floor: number, minute: number) => ({ run_id: "r", ts: at(minute), floor, act_id: "0", screen: "COMBAT",
    boss_id: "B", in_combat: true, turn: 1, hp: 20, max_hp: 60, gold: 10, deck: [{ id: "A", upgraded: false }] });
  return { character: "silent" as const, cutoff: at(55), generated_at: at(56),
    sources: ["coverage", "frames", "fights", "opportunities"].map(name => ({ name, sha256: sha(name), bytes: 1 })), coverage,
    frames: [frame(5, 10), frame(17, 20), frame(17, 21), frame(49, 40)],
    fights: [{ run_id: "r", ascension: 0, floor: 17, boss: "B", attempt: 1, started_at: at(20), ended_at: at(22), result: "won",
      entry: { ts: at(20), hp: 20, max_hp: 60 } }],
    opportunities: { schema: "construction-opportunities-v1" as const, character: "silent" as const, generated: at(54), cutoff: at(50),
      digest: sha("offers"), limitations: [], rows: [{ id: "o", run: "r", ts: at(12), floor: 6, act: 1, ascension: 0,
        kind: "reward" as const, offers: [{ id: "A", upgraded: false, price: 0 }], source: { offset: 0, bytes: 1, sha256: sha("o") } }] },
    combo_metrics: [{ id: "C", metrics: pooledMetrics() }], checkpointFloors: [17] };
}
function publish(root: string, pack = assembleV6History(input())) {
  const dir = join(root, "characters/silent"); mkdirSync(dir, { recursive: true });
  const path = join(dir, "v6-history.json"); writeFileSync(path, JSON.stringify(pack)); return path;
}
describe("V6 run-start frozen history", () => {
  it("keeps first-attempt floor polls distinct from independent runs and excludes post-stop frames", () => {
    const pack = assembleV6History(input());
    expect(pack.data.coverage).toHaveLength(1);
    expect(pack.data.floor_frames.map(f => [f.floor, f.observed_frames])).toEqual([[5, 1], [17, 2]]);
    expect(pack.data.observations).toMatchObject([{ run_id: "r", floor: 17, first_attempt: true, entry_hp: 20 }]);
    expect(pack.data.combo_metrics[0]!.metrics.map(m => m.attempt)).toEqual(["first", "including_sl"]);
    expect(pack.data.histories[0]!.ascension).toBe(0);
    const rollback = { ...input(), coverage: input().coverage.map(r => ({ ...r, first_stop: null })) };
    rollback.frames[2]!.floor = 4;
    expect(assembleV6History(rollback).data.floor_frames.map(f => f.floor)).toEqual([5, 17]);
  });
  it("loads only own character, checks content hashes, and retains a snapshot after the file changes", () => {
    const root = temporary(), path = publish(root);
    const loaded = loadV6HistoryPack(root, "silent", { mode: "shadow" });
    expect(loaded.status).toBe("loaded");
    expect(loadV6HistoryPack(root, "ironclad", { mode: "shadow" }).status).toBe("missing");
    const corrupt = JSON.parse(readFileSync(path, "utf8")); corrupt.data.coverage[0].ascension = 10;
    writeFileSync(path, JSON.stringify(corrupt));
    expect(loadV6HistoryPack(root, "silent", { mode: "shadow" }).status).toBe("invalid");
    if (loaded.status === "loaded") expect(loaded.value.data.coverage[0]!.ascension).toBe(0);
    expect(loadV6HistoryPack("/does/not/exist", "silent", { mode: "off" })).toMatchObject({ status: "disabled", path: "" });
  });
  it("rejects cross-character symlinks and mismatched or future-dated payloads even with a new hash", () => {
    const root = temporary(), path = publish(root), dir = join(root, "characters/regent"); mkdirSync(dir);
    symlinkSync(path, join(dir, "v6-history.json"));
    expect(loadV6HistoryPack(root, "regent", { mode: "on" }).status).toBe("invalid");
    const data = assembleV6History(input()).data; data.histories[0]!.character = "regent";
    expect(() => sealV6History(data, at(56))).toThrow("history scope");
    expect(() => assembleV6History({ ...input(), generated_at: at(20) })).toThrow("generation precedes cutoff");
  });
  it("rejects metrics whose raw provenance is absent", () => {
    const data = assembleV6History(input()).data, m = data.combo_metrics[0]!.metrics[0]!;
    m.sources.push({ version: "fixture", ascension: 0, run_ids: ["absent"], counts: { ...m.raw_counts, runs: 1 } });
    m.raw_counts.runs = 1;
    expect(() => sealV6History(data, at(56))).toThrow("provenance");
  });
  it("builds through the production CLI from hash-frozen inputs and rejects changed bytes", () => {
    const root = temporary(), spec = input();
    const values = { coverage: JSON.stringify(spec.coverage), frames: spec.frames.map(f => JSON.stringify({ ...f,
      deck: f.deck.map(c => ({ ...c, name: "historical display metadata" })) })).join("\n"),
      fights: JSON.stringify(spec.fights), opportunities: JSON.stringify(spec.opportunities),
      combo_metrics: JSON.stringify({ schema: "combo-metrics-report-v1", character: "silent", combos: spec.combo_metrics }) };
    const inputs = Object.fromEntries(Object.entries(values).map(([name, data]) => {
      writeFileSync(join(root, name), data); return [name, { path: name, bytes: Buffer.byteLength(data), sha256: sha(data) }];
    }));
    const manifest = join(root, "inputs.json"); writeFileSync(manifest, JSON.stringify({ schema: "v6-history-inputs-v1", character: "silent",
      cutoff: at(55), checkpoint_floors: [17], inputs }));
    const dir = join(root, "characters/silent"); mkdirSync(dir, { recursive: true });
    const path = join(dir, "v6-history.json"), cli = resolve("tools/v6/freeze-history.ts");
    const run = (out: string) => execFileSync(process.execPath, ["--import", "tsx", cli, "--manifest", manifest, "--out", out], { stdio: "pipe" });
    run(path);
    expect(loadV6HistoryPack(root, "silent", { mode: "on" }).status).toBe("loaded");
    writeFileSync(join(root, "frames"), "changed");
    expect(() => run(join(dir, "next.json"))).toThrow();
    expect(readFileSync(path, "utf8")).toContain("v6-frozen-history-v1");
  });
});

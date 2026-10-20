import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadV6HistoryPack, sealV6History, v6OpportunitySchema } from "../src/sim/v6-history-pack.js";
import { validate } from "../src/v6/schema.js";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const cutoff = "2026-10-20T00:44:09.586Z";
// Frozen provenance from the failed refresh; these are byte identities, not game knowledge.
const ranges = [
  { offset: 1090247640, bytes: 83745, sha256: "d63cd33162a5cda1406a9e9bb647bf338b1bcc319a1afc7c21231505aa2f6326" },
  { offset: 1090398158, bytes: 239840, sha256: "222ff8dfdecfe86a2c145224767ceb13540daf2e9d756b95bccd20096e4a1d1e" },
];
function fixture() {
  const opportunities = { schema: "construction-opportunities-v1", character: "silent", generated: cutoff, cutoff,
    digest: sha("frozen-opportunities"), limitations: [], rows: ranges.map((source, i) => ({
      id: `o${i}`, run: "MWMR855QHTWR", ts: i ? "2026-10-20T00:21:44.215Z" : "2026-10-20T00:16:01.696Z",
      floor: 15, act: 1, ascension: 10, kind: i ? "shop" : "reward", offers: [], source: { ...source },
    })) };
  return { character: "silent", cutoff,
    sources: ["coverage", "frames", "fights", "opportunities"].map(name => ({ name, sha256: sha(name), bytes: 14613516359 })),
    coverage: [{ run_id: "MWMR855QHTWR", ended: cutoff, ascension: 10, first_stop: null,
      first_trial_final_victory: false, final_including_sl_victory: false }],
    floor_frames: [], histories: [], observations: [], combo_metrics: [], opportunities, labels: [],
  };
}
describe("V6 frozen-history byte provenance", () => {
  it("seals and loads both real >1GB offsets without losing a row, byte range, or SHA", () => {
    const data = fixture(), pack = sealV6History(data, cutoff), root = mkdtempSync(join(tmpdir(), "v6-byte-"));
    try {
      const dir = join(root, "characters/silent"); mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "v6-history.json"), JSON.stringify(pack));
      const loaded = loadV6HistoryPack(root, "silent", { mode: "on" });
      expect(loaded.status).toBe("loaded");
      if (loaded.status !== "loaded") throw new Error(loaded.reason);
      expect(loaded.value.data.opportunities.rows.map(r => r.source)).toEqual(ranges);
      expect(loaded.value.data.sources).toEqual(data.sources);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it.each([0, 1e9 + 1, Number.MAX_SAFE_INTEGER])("accepts exact safe byte metadata %s independently of gameplay bounds", n => {
    const data = fixture();
    data.opportunities.rows[0]!.source.offset = n;
    data.opportunities.rows[0]!.source.bytes = n;
    data.sources[0]!.bytes = n;
    expect(() => sealV6History(data, cutoff)).not.toThrow();
  });
  it.each([-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects unsafe byte metadata %s", n => {
    for (const field of ["offset", "bytes"] as const) {
      const data = fixture(); data.opportunities.rows[0]!.source[field] = n;
      expect(validate(v6OpportunitySchema, data.opportunities).ok).toBe(false);
      expect(() => sealV6History(data, cutoff)).toThrow(`source.${field}`);
    }
    const data = fixture(); data.sources[0]!.bytes = n;
    expect(() => sealV6History(data, cutoff)).toThrow("sources[0].bytes");
  });
  it("retains gameplay-count, first-attempt, and source-hash guards", () => {
    const data = fixture(); data.opportunities.rows[0]!.floor = 1e9 + 1;
    expect(() => sealV6History(data, cutoff)).toThrow("floor");
    data.opportunities.rows[0]!.floor = 15;
    data.opportunities.rows[0]!.ts = "2026-10-20T00:44:10.000Z";
    expect(() => sealV6History(data, cutoff)).toThrow("opportunity outside first attempt");
    data.opportunities.rows[0]!.ts = "2026-10-20T00:16:01.696Z";
    data.opportunities.rows[0]!.source.sha256 = "invalid";
    expect(() => sealV6History(data, cutoff)).toThrow("invalid SHA256");
  });
});

import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { EXTERNAL_STATS_DATA_SHA256, EXTERNAL_STATS_FILE, EXTERNAL_STATS_MAX_BYTES, externalStatsTools } from "../src/brain/tools/external-stats-tools.js";
import type { ToolContext } from "../src/brain/tools/types.js";
import { knowledgeCharacter, setKnowledgeCharacter } from "../src/knowledge/files.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ctx: ToolContext = { ascension: 10, knowledgeDir: join(ROOT, "knowledge"), logsDir: "/unused-external-stats-logs" };
const tools = externalStatsTools();
const initialCharacter = knowledgeCharacter();
const scratch = mkdtempSync(join(tmpdir(), "external-stats-"));
beforeAll(() => setKnowledgeCharacter("silent"));
afterAll(() => { setKnowledgeCharacter(initialCharacter); rmSync(scratch, { recursive: true, force: true }); });

async function call(table: string, input: unknown = {}, context = ctx) {
  const result = await tools.find((t) => t.name === `external_stats_${table}`)!.run(input as Record<string, unknown>, context);
  expect(Buffer.byteLength(result.text)).toBeLessThanOrEqual(EXTERNAL_STATS_MAX_BYTES);
  const parsed = JSON.parse(result.text);
  expect(parsed).toMatchObject({ source: "external:sts2fun", character: "silent", ascension: 10,
    downloaded_at: "2026-10-21", dataset_sha256: EXTERNAL_STATS_DATA_SHA256,
    database_sha256: "1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5" });
  expect(parsed.limitations.join("\n")).toMatch(/自选上传偏差/);
  expect(parsed.limitations.join("\n")).toMatch(/非因果/);
  expect(parsed.limitations.join("\n")).toMatch(/口径不同/);
  expect(parsed.limitations.join("\n")).toMatch(/分账/);
  return { ...result, parsed };
}

const inputs: Record<string, Record<string, unknown>> = {
  card: { id: "SNAKEBITE" }, skip: {}, deck_size: {},
  encounter: { id: "DECIMILLIPEDE_ELITE" }, clusters: {}, cooccurrence: {},
};

describe("external aggregate tools: contract, provenance, bounded errors and empty lookups", () => {
  for (const [table, input] of Object.entries(inputs)) {
    it(`${table}: valid input, provenance and deterministic output`, async () => {
      const first = await call(table, input);
      expect(first.isError).toBeFalsy();
      expect(first).toEqual(await call(table, input));
      expect(first.parsed.cohort).toEqual({ runs: 1739, players: 98, wins: 492, builds: { "v0.111.0": 1739 } });
      expect(first.parsed.provenance).toMatchObject({ downloaded_at: "2026-10-21", filter: expect.stringContaining("SILENT"),
        url: "https://sts2.fun/static/sts2_public.db.zst", license: expect.stringContaining("aggregate") });
      expect(Object.keys(first.parsed.aggregate_sha256)).toContain("paper/materials/2026-10-21-sts2fun-stats/provenance.json");
      for (const sha of Object.values(first.parsed.aggregate_sha256)) expect(sha).toMatch(/^[0-9a-f]{64}$/);
    });

    it(`${table}: rejects invalid shapes, types, ranges, enums, extra keys and oversized input`, async () => {
      for (const bad of [null, [], "query", { ...input, unexpected: 1 }, { ...input, version: "v0.999" },
        { ...input, limit: "1" }, { ...input, limit: 0 }, { ...input, limit: 11 },
        { ...input, offset: -1 }, { ...input, offset: 0.5 }, { ...input, offset: 10001 },
        { ...input, version: "x".repeat(20_000) }, Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`x${i}`, 1]))]) {
        const result = await call(table, bad);
        expect(result.isError).toBe(true);
        expect(result.parsed.reason).toContain("输入不合法");
        expect(result.parsed.rows).toEqual([]);
      }
    });

    it(`${table}: missing or damaged dataset gives explicit no data without paths or fallback`, async () => {
      for (const dir of [join(scratch, "missing"), join(scratch, "damaged")]) {
        if (dir.endsWith("damaged")) {
          mkdirSync(dirname(join(dir, EXTERNAL_STATS_FILE)), { recursive: true });
          writeFileSync(join(dir, EXTERNAL_STATS_FILE), "{broken");
        }
        const result = await call(table, input, { ...ctx, knowledgeDir: dir });
        expect(result.isError).toBe(true);
        expect(result.parsed.status).toBe("无数据");
        expect(result.parsed.rows).toEqual([]);
        expect(result.parsed.cohort).toBeNull();
        expect(result.text).not.toContain(scratch);
      }
    });

    it(`${table}: paginates whole rows under hard cap; out-of-range is explicit`, async () => {
      let offset = 0;
      const allRows = [];
      let total = 0;
      do {
        const result = await call(table, { ...input, limit: 10, offset });
        expect(result.isError).toBeFalsy();
        expect(result.parsed.returned_rows).toBe(result.parsed.rows.length);
        expect(result.parsed.returned_rows).toBeGreaterThan(0);
        total = result.parsed.total_rows;
        allRows.push(...result.parsed.rows);
        offset = result.parsed.next_offset;
      } while (offset !== null);
      expect(allRows).toHaveLength(total);
      const ended = await call(table, { ...input, offset: total });
      expect(ended.isError).toBe(true);
      expect(ended.parsed.status).toBe("无数据");
    });
  }

  it("pins only reviewed aggregate data, with no external or own identifiers/records", () => {
    const bytes = readFileSync(join(ctx.knowledgeDir, EXTERNAL_STATS_FILE));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(EXTERNAL_STATS_DATA_SHA256);
    expect(bytes.length).toBeLessThan(2_000_000);
    const data = JSON.parse(bytes.toString("utf8"));
    expect(Object.keys(data.tables).sort()).toEqual(Object.keys(inputs).sort());
    for (const packed of Object.values(data.tables) as { columns: string[]; rows: unknown[][] }[]) {
      expect(packed.columns).not.toEqual(expect.arrayContaining(["player_id"]));
      expect(packed.columns).not.toEqual(expect.arrayContaining(["run_id"]));
      for (const row of packed.rows) expect(row).toHaveLength(packed.columns.length);
    }
    expect(bytes.toString("utf8")).not.toMatch(/"(?:player_id|run_id|raw_json|own|username|seed_id)"/);
  });

  it("rejects a parseable, plausible but changed dataset", async () => {
    const dir = join(scratch, "modified");
    mkdirSync(dirname(join(dir, EXTERNAL_STATS_FILE)), { recursive: true });
    const original = readFileSync(join(ctx.knowledgeDir, EXTERNAL_STATS_FILE), "utf8");
    writeFileSync(join(dir, EXTERNAL_STATS_FILE), original.replace('"runs":1739', '"runs":9999'));
    expect((await call("card", inputs.card, { ...ctx, knowledgeDir: dir })).parsed.reason).toContain("SHA");
  });

  it("never applies Silent A10 samples to other roles or ascensions", async () => {
    for (const [table, input] of Object.entries(inputs)) {
      expect((await call(table, input, { ...ctx, ascension: 9 })).isError).toBe(true);
      setKnowledgeCharacter("ironclad");
      try { expect((await call(table, input)).isError).toBe(true); }
      finally { setKnowledgeCharacter("silent"); }
    }
  });
});

describe("readback against #24 report numbers and interpretation", () => {
  it("SNAKEBITE frequency, raw association, adjusted contrast and overlap are unchanged", async () => {
    const rows = (await call("card", { id: " card.snakebite " })).parsed.rows;
    const r = rows.find((r: Record<string, unknown>) => r.act === "all");
    expect(r).toMatchObject({ offered: 2188, picked: 533, not_picked: 1655, matched_players: 56, matched_offers: 1806 });
    expect(r.pick_rate).toBe(533 / 2188);
    expect(r.picked_win_rate).toBeCloseTo(0.3114, 3);
    expect(r.not_picked_win_rate).toBeCloseTo(0.3728, 3);
    expect(r.player_act_adjusted_difference).toBeCloseTo(-0.002, 3);
    expect(r.adjusted_cluster_ci[0]).toBeLessThan(0);
    expect(r.adjusted_cluster_ci[1]).toBeGreaterThan(0);
    for (const key of ["pick_rate_cluster_ci", "picked_win_cluster_ci", "not_picked_win_cluster_ci", "win_difference_cluster_ci"]) {
      expect(r[key]).toHaveLength(2);
    }
    const a1 = await call("card", { id: "SNAKEBITE", act: 1 });
    expect(a1.parsed.rows).toHaveLength(1);
    expect(a1.parsed.rows[0].act).toBe(1);
    expect((await call("card", { id: "../SNAKEBITE" })).isError).toBe(true);
    expect((await call("card", {})).isError).toBe(true);
    expect((await call("card", { id: "UNKNOWN" })).parsed.status).toBe("无数据");
    expect((await call("card", { id: "SNAKEBITE", act: 4 })).isError).toBe(true);
  });

  it("first-act skip frequency, without inventing missing unique-run/player denominators", async () => {
    const r = (await call("skip", { act: 1 })).parsed;
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ screens: 13307, skipped: 1456, rate: 1456 / 13307 });
    expect(r.rows[0].cluster_ci).toHaveLength(2);
    expect(r.limitations.join("\n")).toContain("独立局数及逐行玩家数未提供（未知）");
    expect((await call("skip", { act: 0 })).isError).toBe(true);
  });

  it("deck-size all vs reached-act3 retains survival-bias scope and denominators", async () => {
    for (const [scope, n, wins] of [["all", 219, 1], ["reached_act3", 2, 1]] as const) {
      const result = await call("deck_size", { scope, limit: 10 });
      expect(result.parsed.rows.find((r: Record<string, unknown>) => r.size === "15-19")).toMatchObject({ scope, n, wins, win_rate: wins / n });
      expect(result.parsed.limitations.join("\n")).toContain("存活偏差");
    }
    expect((await call("deck_size", { scope: "survivors" })).isError).toBe(true);
  });

  it("DECIMILLIPEDE deaths and gross damage use external-only fights, distinct runs and players", async () => {
    const result = await call("encounter", { id: "ENCOUNTER.DECIMILLIPEDE_ELITE", act: 2 });
    expect(result.parsed.rows).toHaveLength(1);
    expect(result.parsed.rows[0]).toMatchObject({ fights: 762, independent_runs: 758, independent_players: 82,
      death_events: 52, death_mean: 52 / 762, gross_damage_median: 16, turns_median: 4 });
    expect(result.parsed.rows[0].death_cluster_ci).toHaveLength(2);
    expect(result.parsed.limitations.join("\n")).toContain("外部总受伤");
    expect(result.text).not.toContain("net_hp");
    expect((await call("encounter", { id: "DECIMILLIPEDE_ELITE", act: 1 })).isError).toBe(true);
    expect((await call("encounter", { id: "DECIMILLIPEDE" })).isError).toBe(true);
    expect((await call("encounter", { id: 12 })).isError).toBe(true);
  });

  it("clusters always attach the no-direction conclusion on success and errors, with observed labels", async () => {
    const result = await call("clusters");
    expect(result.parsed.rows).toHaveLength(4);
    expect(result.parsed.rows[0]).toMatchObject({ scope: "reached_act3", k: 4, seed: 24, n: 60, wins: 36, players: 23 });
    expect(result.parsed.rows[0].distinctive_cards.slice(0, 4).map((c: { card: string }) => c.card)).toEqual(["ASSASSINATE", "DAGGER_SPRAY", "BLADE_OF_INK", "PRECISE_CUT"]);
    for (const input of [{}, { scope: "all" }, { k: 3, seed: 240 }, { k: 2 }, { version: "v0.110" }]) {
      expect((await call("clusters", input)).text).toContain("现有样本无法区分流派优劣、不作方向依据");
    }
    expect((await call("clusters", { k: 2 })).isError).toBe(true);
    expect((await call("clusters", { seed: 1 })).isError).toBe(true);
  });

  it("cooccurrence returns only descriptive lift and can query a pair in either order", async () => {
    const input = { scope: "all", card: "BULLET_TIME", with_card: "NIGHTMARE" };
    const a = await call("cooccurrence", input);
    const b = await call("cooccurrence", { ...input, card: "CARD.NIGHTMARE", with_card: "BULLET_TIME" });
    expect(a.parsed.rows).toEqual(b.parsed.rows);
    expect(a.parsed.rows).toHaveLength(1);
    expect(a.parsed.rows[0]).toMatchObject({ n: 28, total: 1739, a_n: 145, b_n: 103 });
    expect(a.parsed.rows[0].lift).toBeCloseTo(3.26026, 5);
    expect(a.text).toContain("只描述常一起出现");
    expect((await call("cooccurrence", { card: "UNKNOWN" })).parsed.status).toBe("无数据");
    expect((await call("cooccurrence", { with_card: "NIGHTMARE" })).isError).toBe(true);
    expect((await call("cooccurrence", { card: "a/b" })).isError).toBe(true);
  });

  it("adjacent versions remain separate, and non-primary clusters/encounters have no invented data", async () => {
    for (const version of ["v0.107", "v0.108", "v0.109", "v0.110"]) {
      for (const table of ["card", "skip", "deck_size"]) {
        const result = await call(table, { ...inputs[table], version });
        expect(result.isError).toBeFalsy();
        expect(result.parsed.version).toBe(version);
        expect(result.parsed.cohort.runs).not.toBe(1739);
        expect(result.parsed.rows.every((r: { version: string }) => r.version === version)).toBe(true);
      }
      for (const table of ["clusters", "cooccurrence", "encounter"]) {
        const result = await call(table, { ...inputs[table], version });
        expect(result.isError).toBe(true);
        expect(result.parsed.status).toBe("无数据");
        expect(result.parsed.version).toBe(version);
      }
    }
  });
});

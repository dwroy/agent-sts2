/** Fixed copies exercise content/SHA coupling through the real production tools and ToolHost. */
import { afterEach, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { ToolHost } from "../src/brain/tools/mcp-server.js";
import { KNOWLEDGE_DIR, knowledgeFile, setKnowledgeCharacter } from "../src/knowledge/files.js";
import { loadKnowledgeData } from "../src/knowledge/render/data.js";
import { loadExperience } from "../src/knowledge/experience.js";
import { knowledgeTools } from "../src/brain/tools/kb-tools.js";
import { readCompatibleKnowledgeText } from "../src/knowledge/catalog.js";
import { fixtureOutput } from "./fixture-command.js";
import { PROJECT_ROOT } from "../src/core/paths.js";

const dirs: string[] = [];
afterEach(() => { dirs.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })); setKnowledgeCharacter(null); });
const hash = (raw: string | Buffer) => createHash("sha256").update(raw).digest("hex");
function fixture() {
  setKnowledgeCharacter("ironclad");
  const dir = mkdtempSync(join(tmpdir(), "knowledge-provenance-")); dirs.push(dir);
  for (const name of ["monster-db.json", "monster-records.json", "experience.json", "shared-experience.json", "room-costs.json", "outcome-stats.json", "jev-hints.json", "ironclad-guide.md", "ds-handbook.md", "boss-damage.json", "potion-equivalents.json"]) {
    const path = knowledgeFile(dir, name); mkdirSync(dirname(path), { recursive: true }); copyFileSync(knowledgeFile(KNOWLEDGE_DIR, name), path);
  }
  const write = (name: string, value: unknown) => writeFileSync(knowledgeFile(dir, name), typeof value === "string" ? value : JSON.stringify(value));
  const json = (name: string) => JSON.parse(readFileSync(knowledgeFile(dir, name), "utf8"));
  write("ironclad-guide.md", "# Fixed guide\nmarker plain guide\n");
  write("ds-handbook.md", "# Fixed handbook\nmarker plain handbook\n");
  write("jev-hints.json", { version: "fixture-hints-v1", hints: [{ id: "sandpit-zero", text: "marker text-a", when: {}, evidence: [] }] });
  const ctx = { ascension: 8, knowledgeDir: dir, logsDir: "/unused" };
  const host = new ToolHost(buildKnowledgeTools(ctx), ctx, undefined, true);
  const call = async (name: string, input: Record<string, unknown>) => {
    const result = await host.call(name, input); expect(result.isError).not.toBe(true);
    const body = JSON.parse(result.text), record = host.calls.at(-1)!;
    expect(record.output).toBe(result.text); expect(record.outputBytes).toBe(Buffer.byteLength(result.text)); expect(record.sources).toEqual(body.sources);
    for (const source of body.sources) if (source.source === "own" && source.sha256 && !source.representation) {
      expect(source.sha256).toBe(hash(readFileSync(join(dir, source.path)))); expect(source.version).toBeTruthy();
    }
    return body;
  };
  return { dir, write, json, host, call };
}
const files = (body: any): string[] => body.sources.map((s: any) => s.file).sort();
const source = (body: any, file: string) => body.sources.find((s: any) => s.file === file);

it("records the actual selected Jev JSON and changes its audited SHA with the returned hint", async () => {
  const f = fixture(), input = { source: "jev_hints", keyword: "sandpit-zero" };
  const before = await f.call("kb_old_knowledge", input);
  expect(files(before)).toEqual(["jev-hints.json"]); expect(source(before, "jev-hints.json").version).toBe("fixture-hints-v1");
  const hints = f.json("jev-hints.json"); hints.hints[0].text = "marker text-b"; f.write("jev-hints.json", hints);
  const after = await f.call("kb_old_knowledge", input);
  expect(after.entries).not.toBe(before.entries); expect(source(after, "jev-hints.json").sha256).not.toBe(source(before, "jev-hints.json").sha256);
});

it("tracks both fight inputs and no unrelated statistics tables", async () => {
  const f = fixture(), input = { table: "fights", act: 1 };
  const before = await f.call("kb_stats", input);
  expect(files(before)).toEqual(["monster-db.json", "monster-records.json"]);
  const records = f.json("monster-records.json");
  const encounter = Object.values(records.encounters).find((e: any) => e.acts?.["1"] && e.rooms?.elite) as any;
  for (const row of Object.values(encounter.by_asc) as any[]) row.fights += 1000001;
  f.write("monster-records.json", records);
  const after = await f.call("kb_stats", input);
  expect(after.entries).not.toBe(before.entries); expect(source(after, "monster-records.json").sha256).not.toBe(source(before, "monster-records.json").sha256);
  expect(source(after, "monster-db.json").sha256).toBe(source(before, "monster-db.json").sha256);
  const id = Object.entries(records.encounters).find(([, e]: any) => e.acts?.["1"] && e.rooms?.elite)![0].split("+")[0]!;
  const db = f.json("monster-db.json"); db.monsters[id].name.zh += " FIXTURE"; f.write("monster-db.json", db);
  const changedDb = await f.call("kb_stats", input);
  expect(changedDb.entries).not.toBe(after.entries); expect(source(changedDb, "monster-db.json").sha256).not.toBe(source(after, "monster-db.json").sha256);
});

it.each([["room_costs", "room-costs.json"], ["rest", "outcome-stats.json"]])("%s records only its selected table", async (table, file) => {
  const f = fixture(); expect(files(await f.call("kb_stats", { table }))).toEqual([file]);
});

it.each([["guide", "ironclad-guide.md"], ["handbook", "ds-handbook.md"]])("%s records the chosen text, not the other old knowledge", async (kind, file) => {
  const f = fixture(); expect(files(await f.call("kb_old_knowledge", { source: kind, keyword: "marker" }))).toEqual([file]);
});

it("fills boss records from the query copy, records the dependency and refreshes a same-size/same-mtime copy", async () => {
  const f = fixture(); f.write("ironclad-guide.md", "marker {SANDPIT_DEATHS_EN}\n");
  const path = knowledgeFile(f.dir, "boss-damage.json"), body = { THE_INSATIABLE: { deaths: { "8": [{ won: false, death: "hp" }] } } };
  f.write("boss-damage.json", body);
  const original = statSync(path), before = await f.call("kb_old_knowledge", { source: "guide", keyword: "marker" });
  expect(files(before)).toEqual(["boss-damage.json", "ironclad-guide.md"]);
  expect(before.entries).toContain("1 died on HP");
  body.THE_INSATIABLE.deaths["8"][0]!.death = "xx"; f.write("boss-damage.json", body); utimesSync(path, original.atime, original.mtime);
  const after = await f.call("kb_old_knowledge", { source: "guide", keyword: "marker" });
  expect(after.entries).toContain("0 died on HP"); expect(source(after, "boss-damage.json").sha256).not.toBe(source(before, "boss-damage.json").sha256);
});

it("records room-cost dynamic fills from the current copy", async () => {
  const f = fixture(); f.write("ds-handbook.md", "marker {UNKNOWN_FIGHTS:8:1}\n");
  const costs = { by_asc: { "8": { "1": { Unknown: { n: 10 }, UnknownFight: { n: 1, fight_median: 2, fight_p75: 3 } } } } };
  f.write("room-costs.json", costs);
  const before = await f.call("kb_old_knowledge", { source: "handbook", keyword: "marker" });
  expect(files(before)).toEqual(["ds-handbook.md", "room-costs.json"]);
  costs.by_asc["8"]["1"].UnknownFight.n = 2; f.write("room-costs.json", costs);
  const after = await f.call("kb_old_knowledge", { source: "handbook", keyword: "marker" });
  expect(after.entries).not.toBe(before.entries); expect(source(after, "room-costs.json").sha256).not.toBe(source(before, "room-costs.json").sha256);
});

it("records monster facts dynamically used to fill Jev hint numbers", async () => {
  const f = fixture(); const hints = f.json("jev-hints.json"); hints.hints[0].text = "marker {DMG:ROCKET:LASER_MOVE}"; f.write("jev-hints.json", hints);
  const before = await f.call("kb_old_knowledge", { source: "jev_hints", keyword: "marker" });
  expect(files(before)).toEqual(["jev-hints.json", "monster-db.json", "monster-records.json"]);
  expect(before.entries).not.toContain("{DMG:");
  const db = f.json("monster-db.json"); db.monsters.ROCKET.moves.LASER_MOVE.damage_by_asc["8"].base_per_hit = { "400": 1 }; f.write("monster-db.json", db);
  const after = await f.call("kb_old_knowledge", { source: "jev_hints", keyword: "marker" });
  expect(after.entries).not.toBe(before.entries); expect(source(after, "monster-db.json").sha256).not.toBe(source(before, "monster-db.json").sha256);
});

it("records outcome statistics used by a card-outcome placeholder", async () => {
  const f = fixture(); f.write("ironclad-guide.md", "marker {CARD_OUTCOME:FIXTURE_CARD}\n");
  const pair = { picked: { n: 10, boss_pass: .5 }, offered_not_picked: { n: 10, boss_pass: .4 } };
  const outcome = { by_ascension: { "8": { ascension: 8, rest: {}, cards: { FIXTURE_CARD: { by_act: { "1": pair } } } } } };
  f.write("outcome-stats.json", outcome);
  const before = await f.call("kb_old_knowledge", { source: "guide", keyword: "marker" });
  expect(files(before)).toEqual(["ironclad-guide.md", "outcome-stats.json"]);
  pair.picked.n = 11; f.write("outcome-stats.json", outcome);
  const after = await f.call("kb_old_knowledge", { source: "guide", keyword: "marker" });
  expect(after.entries).not.toBe(before.entries); expect(source(after, "outcome-stats.json").sha256).not.toBe(source(before, "outcome-stats.json").sha256);
});

it("experience snapshots bypass warm gameplay caches without modifying those caches", async () => {
  const f = fixture(), path = knowledgeFile(f.dir, "experience.json");
  const old = f.json("experience.json"); old.entries[0].lesson = "marker lesson-a"; f.write("experience.json", old);
  const warm = loadExperience(f.dir); expect(warm[0]!.lesson).toBe("marker lesson-a");
  const info = statSync(path); old.entries[0].lesson = "marker lesson-b"; f.write("experience.json", old); utimesSync(path, info.atime, info.mtime);
  const result = await f.call("kb_experience", { id: old.entries[0].id });
  expect(result.entries[0].lesson).toBe("marker lesson-b"); expect(files(result)).toEqual(["experience.json", "shared-experience.json"]);
  expect(warm[0]!.lesson).toBe("marker lesson-a");
});

it("plain source output remains equivalent to the existing renderer on the same published inputs", async () => {
  const f = fixture(); const data = loadKnowledgeData(f.dir); expect(data.guide).toContain("marker plain guide");
  const body = await f.call("kb_old_knowledge", { source: "guide", keyword: "marker" });
  expect(body.entries).toContain("marker plain guide"); expect(files(body)).toEqual(["ironclad-guide.md"]);
});

it("keeps concurrent queries in their own input snapshots and audit logs", async () => {
  const a = fixture(), b = fixture(), hints = b.json("jev-hints.json");
  hints.hints[0].text = "marker isolated-b"; b.write("jev-hints.json", hints);
  const [one, two] = await Promise.all([a.call("kb_old_knowledge", { source: "jev_hints" }), b.call("kb_old_knowledge", { source: "jev_hints" })]);
  expect(one.entries).toContain("text-a"); expect(two.entries).toContain("isolated-b");
  expect(source(one, "jev-hints.json").sha256).not.toBe(source(two, "jev-hints.json").sha256);
});

it("labels a catalogue reconstruction as a compatible view with its actual catalogue hash", async () => {
  const f = fixture();
  fixtureOutput("python3", [join(PROJECT_ROOT, "knowledge/builders/build-catalog.py"), "--knowledge-root", f.dir]);
  rmSync(knowledgeFile(f.dir, "monster-db.json"));
  const result = await f.call("kb_stats", { table: "fights", act: 1 });
  expect(source(result, "monster-db.json")).toMatchObject({ representation: "catalog-compatible-view", catalog_file: "catalog.json",
    catalog_sha256: hash(readFileSync(join(f.dir, "catalog.json"))), sha256: hash(readCompatibleKnowledgeText(f.dir, "monster-db.json")) });
});

it.each([["kb_old_knowledge", { source: "jev_hints", keyword: "sandpit-zero" }], ["kb_stats", { table: "fights", act: 1 }]] as const)("%s preserves published Ironclad renderer bytes and its ordinary cache", async (name, input) => {
  setKnowledgeCharacter("ironclad");
  const ctx = { ascension: 8, knowledgeDir: KNOWLEDGE_DIR, logsDir: "/unused" }, cached = loadKnowledgeData(KNOWLEDGE_DIR);
  const legacy = await knowledgeTools().find(t => t.name === name)!.run(input, ctx);
  const audited = await buildKnowledgeTools(ctx).find(t => t.name === name)!.run(input, ctx);
  expect(legacy.isError).not.toBe(true); expect(audited.isError).not.toBe(true);
  expect(JSON.parse(audited.text).entries).toBe(legacy.text);
  expect(loadKnowledgeData(KNOWLEDGE_DIR)).toBe(cached);
});

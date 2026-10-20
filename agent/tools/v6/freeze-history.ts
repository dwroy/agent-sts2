/** Explicit offline builder. The game loop must only use loadV6HistoryPack. */
import { createHash } from "node:crypto";
import { createReadStream, existsSync, linkSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { asRecord } from "../../src/core/util/json.js";
import { characterSchema } from "../../src/v6/formats.js";
import { array, object, text, number, validate, type Schema } from "../../src/v6/schema.js";
import { buildMetricSchema } from "../../src/v6/build-core.js";
import { v6AppearanceSchema } from "../../src/v6/appearance.js";
import { assembleV6History, sealV6History, v6CoverageSchema, v6FightSchema, v6FrameSchema, v6OpportunitySchema } from "../../src/sim/v6-history-pack.js";

const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== "--manifest" || args[2] !== "--out") throw new Error("freeze-history.ts --manifest INPUTS.json --out NEW_v6-history.json");
const manifestPath = resolve(args[1]!), output = resolve(args[3]!);
if (existsSync(output)) throw new Error("output exists; build a new snapshot before atomic publication between runs");
const manifestBytes = readFileSync(manifestPath);
const manifest = asRecord(JSON.parse(manifestBytes.toString("utf8")));
const characterResult = validate(characterSchema, manifest["character"]);
if (manifest["schema"] !== "v6-history-inputs-v1" || !characterResult.ok || typeof manifest["cutoff"] !== "string"
  || !Number.isFinite(Date.parse(manifest["cutoff"]))) throw new Error("invalid frozen input manifest");
const character = characterResult.value, cutoff = new Date(manifest["cutoff"]).toISOString();
const descriptors = asRecord(manifest["inputs"]), sources = [{ name: "input_manifest",
  sha256: createHash("sha256").update(manifestBytes).digest("hex"), bytes: manifestBytes.length }];
const paths = new Map<string, string>();
for (const name of ["coverage", "frames", "fights", "opportunities", "combo_metrics", "appearance"]) {
  const entry = asRecord(descriptors[name]);
  if (name === "combo_metrics" && descriptors[name] === null) continue;
  if (name === "appearance" && descriptors[name] === undefined) continue;
  if (typeof entry["path"] !== "string" || typeof entry["sha256"] !== "string" || !/^[a-f0-9]{64}$/.test(entry["sha256"])
    || typeof entry["bytes"] !== "number" || !Number.isSafeInteger(entry["bytes"]) || entry["bytes"] < 0) throw new Error(`invalid descriptor: ${name}`);
  const path = resolve(dirname(manifestPath), entry["path"]), hash = createHash("sha256"); let bytes = 0;
  for await (const part of createReadStream(path)) { bytes += part.length; hash.update(part); }
  if (bytes !== entry["bytes"] || hash.digest("hex") !== entry["sha256"]) throw new Error(`frozen SHA/length mismatch: ${name}`);
  paths.set(name, path); sources.push({ name, sha256: entry["sha256"], bytes });
}
// All timestamps are normalized so lexical chronology in the existing extractor is unambiguous.
const ts = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : v;
function checked<T>(schema: Schema<T>, value: unknown, name: string): T {
  const result = validate(schema, value); if (!result.ok) throw new Error(`${name}: ${result.issues.slice(0, 10).join("; ")}`); return result.value;
}
const json = (name: string) => {
  const bytes = readFileSync(paths.get(name)!), source = sources.find(s => s.name === name)!;
  if (bytes.length !== source.bytes || createHash("sha256").update(bytes).digest("hex") !== source.sha256) throw new Error(`input changed: ${name}`);
  return JSON.parse(bytes.toString("utf8")) as unknown;
};
function rows(value: unknown): Record<string, unknown>[] { if (!Array.isArray(value)) throw new Error("expected rows"); return value.map(asRecord); }
const coverage = checked(array(v6CoverageSchema, 0, 100000), rows(json("coverage")).map(r => ({
  run_id: r["run_id"], ended: ts(r["ended"]), ascension: r["ascension"],
  first_stop: r["first_stop"] === null ? null : { ts: ts(asRecord(r["first_stop"])["ts"]),
    floor: asRecord(r["first_stop"])["floor"], result: asRecord(r["first_stop"])["result"] },
  first_trial_final_victory: r["first_trial_final_victory"], final_including_sl_victory: r["final_including_sl_victory"],
})), "coverage");
const frames: ReturnType<typeof frame>[] = [];
function frame(r: Record<string, unknown>) {
  return checked(v6FrameSchema, { run_id: r["run_id"], ts: ts(r["ts"]), floor: r["floor"], act_id: r["act_id"], screen: r["screen"],
    ...(r["boss_id"] ? { boss_id: r["boss_id"] } : {}), ...(r["in_combat"] !== undefined ? { in_combat: r["in_combat"] } : {}),
    ...(r["turn"] !== undefined ? { turn: r["turn"] } : {}), hp: r["hp"], max_hp: r["max_hp"], gold: r["gold"],
    deck: rows(r["deck"]).map(c => ({ id: c["id"], upgraded: c["upgraded"] })) }, "frame");
}
const stream = createReadStream(paths.get("frames")!), frameHash = createHash("sha256"); let frameBytes = 0;
stream.on("data", part => { frameHash.update(part); frameBytes += part.length; });
for await (const line of createInterface({ input: stream, crlfDelay: Infinity }))
  if (line) frames.push(frame(asRecord(JSON.parse(line))));
const frameSource = sources.find(s => s.name === "frames")!;
if (frameBytes !== frameSource.bytes || frameHash.digest("hex") !== frameSource.sha256) throw new Error("frames changed during generation");
const fights = checked(array(v6FightSchema, 0, 1e6), rows(json("fights")).map(r => {
  const entry = r["entry"] === null ? null : asRecord(r["entry"]);
  return { run_id: r["run_id"], ascension: r["ascension"], floor: r["floor"], boss: r["boss"], attempt: r["attempt"],
    started_at: ts(r["started_at"]), ended_at: ts(r["ended_at"]), result: r["result"],
    entry: entry === null ? null : { ts: ts(entry["ts"]), hp: entry["hp"], max_hp: entry["max_hp"] } };
}), "fights");
const model = asRecord(json("opportunities"));
const opportunities = checked(v6OpportunitySchema, { schema: model["schema"], character: model["character"], generated: ts(model["generated"]),
  cutoff: ts(model["cutoff"]), digest: model["digest"], limitations: model["limitations"], rows: rows(model["rows"]).map(r => ({
    id: r["id"], run: r["run"], ts: ts(r["ts"]), floor: r["floor"], act: r["act"], ascension: r["ascension"],
    kind: r["kind"], offers: r["offers"], source: r["source"],
  })) }, "opportunities");
const comboSchema = array(object({ id: text(), metrics: array(buildMetricSchema, 2, 2) }), 0, 10000);
// Keep the report's character identity; do not import learner interpretation or publish a core.
const report = paths.has("combo_metrics") ? asRecord(json("combo_metrics")) : null;
if (report && (report["schema"] !== "combo-metrics-report-v1" || report["character"] !== character)) throw new Error("combo report scope mismatch");
const metrics = checked(comboSchema, report ? rows(report["combos"]).map(c => ({ id: c["id"], metrics: c["metrics"] })) : [], "combo metrics");
const checkpoints = checked(array(number(0, 10000, true), 0, 100), manifest["checkpoint_floors"] ?? [], "checkpoint floors");
const appearance = paths.has("appearance") ? checked(v6AppearanceSchema, json("appearance"), "appearance") : undefined;
let pack = assembleV6History({ character, cutoff, generated_at: new Date().toISOString(), sources, coverage, frames, fights,
  opportunities, combo_metrics: metrics, ...(appearance === undefined ? {} : { appearance }), checkpointFloors: checkpoints });
if (!report) { pack.data.labels.push("combo_metrics_missing_no_substitution"); pack = sealV6History(pack.data, pack.generated_at); }
mkdirSync(dirname(output), { recursive: true });
const temporary = `${output}.tmp-${process.pid}`;
writeFileSync(temporary, JSON.stringify(pack) + "\n", { flag: "wx" });
// Hard-link publication is atomic and refuses an existing target even after a concurrent writer.
try { linkSync(temporary, output); } finally { unlinkSync(temporary); }
console.log(JSON.stringify({ path: output, character, content_sha256: pack.content_sha256, generated_at: pack.generated_at,
  coverage: coverage.length, floors: pack.data.floor_frames.length, observations: pack.data.observations.length,
  opportunities: pack.data.opportunities.rows.length, combo_metrics: metrics.length }));

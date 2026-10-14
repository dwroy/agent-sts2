/** P0.2: read the existing frozen ablation cases; no API calls, simulator reruns or production-log scan. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import { asRecord } from "../src/core/util/json.js";

type Row = Record<string, unknown>;
const obj = asRecord;
const finite = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const diff = (a: number | null, b: number | null) => a !== null && b !== null ? a - b : null;
function facts(value: unknown): Row {
  if (typeof value !== "string") return obj(value);
  try { return obj(JSON.parse(value)); } catch { return {}; }
}
function further(value: Row): number | null {
  const match = /expected further HP loss (-?\d+(?:\.\d+)?)/.exec(String(value["rollout"] ?? ""));
  return match ? Number(match[1]) : null;
}
function hasPotion(key: string | null, value: Row): boolean {
  const drink = value["potions_used"];
  return !!key && (/^p\d/.test(key) || (typeof drink === "string" && !["none", "", "0"].includes(drink.toLowerCase())));
}

export function compareJevCase(decision: Row, prompt: Row) {
  if (decision["decision_id"] !== prompt["decision_id"] || decision["run_id"] !== prompt["run_id"]) throw new Error("frozen decision/prompt identity mismatch");
  if (!String(decision["label"]).startsWith("combat/plan")) throw new Error("not a combat plan question");
  const request = obj(prompt["request"]), state = obj(request["state"]);
  if (!["silent", "SILENT", "静默猎手"].includes(String(obj(state["run_brief"])["character"]))) throw new Error("not a Silent frozen case");
  const criteria = obj(obj(obj(decision["questions"])["plan"])["criteria"]);
  const first = criteria["plan1"] != null ? "plan1" : null;
  const answer = obj(obj(decision["answers"])["plan"]);
  const choice = typeof answer["choice"] === "string" ? answer["choice"] : null;
  const b2 = obj(decision["boss_sim"]), rollout = obj(decision["rollout"]);
  const a = facts(criteria[choice ?? ""]), b = facts(criteria[first ?? ""]);
  const ba = obj(obj(b2["lines"])[choice ?? ""]), bb = obj(obj(b2["lines"])[first ?? ""]);
  // Historical paired deltas are relative to B2's best, not necessarily plan1. Covariance is not recoverable.
  const pairedToFirst = first !== null && b2["best"] === first;
  const margin = obj(ba["boss_relative_margin"]);
  const pairedS = obj(obj(margin["paired"])["difference"]);
  const confidence = finite(answer["confidence"] ?? decision["confidence"]);
  const audit = obj(decision["selection_audit"]), dispatch = obj(decision["selection_dispatch"]);
  const after = obj(audit["after_sl"]), answered = obj(audit["answer"]);
  const afterKey = choice && JSON.stringify(after["planned_steps"]) === JSON.stringify(answered["planned_steps"])
    && Array.isArray(after["planned_steps"]) ? choice : typeof obj(decision["guard"])["choice"] === "string" ? obj(decision["guard"])["choice"] : null;
  return {
    id: decision["decision_id"], run_id: decision["run_id"], ts: decision["ts"], floor: decision["floor"], turn: decision["turn"],
    attempt: decision["sl_attempt"] ?? null, ascension: obj(state["run_brief"])["ascension"] ?? null,
    fight: state["fight"] === "monster" ? "hallway" : state["fight"] ?? "unknown",
    confidence, confidence_band: confidence === null ? "unknown" : confidence < 0.5 ? "below_0.5" : confidence < 0.8 ? "0.5_to_0.8" : "at_least_0.8",
    jev_choice: choice, code_first: first, code_first_source: "original code-order plan1; distinct from rollout/B2 best",
    rollout_best: b2["rollout_own_best"] ?? rollout["best"] ?? null, b2_best: b2["best"] ?? null,
    simulation_tied: b2["available"] && !b2["low_trust"] ? b2["tied"] ?? [] : rollout["tied"] ?? [],
    deviated: first && choice ? choice !== first : null,
    potion_in_comparison: hasPotion(choice, a) || hasPotion(first, b),
    difference_chosen_minus_code: {
      rollout_expected_hp_loss: { mean: diff(further(a), further(b)), se: null },
      boss_win: { mean: diff(finite(ba["win"]), finite(bb["win"])),
        paired: pairedToFirst ? finite(ba["d"]) : null, se: pairedToFirst ? finite(ba["se"]) : null },
      S: { mean: pairedToFirst ? finite(pairedS["mean"]) : null, se: pairedToFirst ? finite(pairedS["meanSe"]) : null },
    },
    execution: { planned_after_guards: afterKey, planned_steps: after["planned_steps"] ?? null,
      requested_action: decision["chosen"] ?? null, dispatched_action: dispatch["gated_action"] ?? null,
      dispatch_status: dispatch["dispatch_status"] ?? null, returned_status: dispatch["returned_status"] ?? null,
      whole_plan_executed: dispatch["whole_plan_executed"] ?? null },
    actual_fight_outcome: null as string | null,
    input_tokens: finite(prompt["input_tokens"]), latency_ms: finite(prompt["latency_ms"]),
    limits: "Original simulated differences only. Missing paired samples/SE and whole-plan execution remain unknown; no counterfactual or causal result.",
  };
}

export function replayFrozenCases(path: string) {
  const bytes = readFileSync(path), cases = JSON.parse(bytes.toString()) as Row[];
  const seen = new Set<string>();
  const rows = cases.map((entry) => {
    const id = String(entry["id"]);
    if (seen.has(id)) throw new Error("duplicate frozen case");
    seen.add(id);
    const originals = entry["originals"] as Row[];
    const load = (kind: string): Row => {
      const source = originals.find((item) => String(item["path"]).endsWith(`-${kind}.jsonl.gz`));
      if (!source) throw new Error(`missing ${kind} source`);
      const raw = gunzipSync(readFileSync(resolve(dirname(path), String(source["path"]))));
      if (createHash("sha256").update(raw).digest("hex") !== source["raw_sha256"]) throw new Error(`changed ${kind} source`);
      return obj(JSON.parse(raw.toString()));
    };
    return { ...compareJevCase(load("decision"), load("prompt")), stratum: entry["stratum"], sources: originals };
  });
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = JSON.stringify([row.fight, row.confidence_band, row.potion_in_comparison]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return { schema: "jev-vs-code-baseline-v1", input_sha256: createHash("sha256").update(bytes).digest("hex"), rows,
    groups: [...groups.entries()].map(([key, rows]) => ({ group: JSON.parse(key), n: rows.length,
      comparable: rows.filter((row) => row.deviated !== null).length, deviated: rows.filter((row) => row.deviated).length })),
    recommendation: "Keep full until paired evidence is sufficient; tiebreak is the approved next experiment, never infer an off authorization.",
    limits: "Reuses the original stratified ablation sample, not a representative all-history deviation rate. No new Jev calls. Missing SE is not evidence of no significant difference." };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("usage: jev-vs-code-replay.ts existing-pilot/cases.json output.json");
  writeFileSync(output, JSON.stringify(replayFrozenCases(input), null, 2) + "\n");
}

/**
 * Random-potion Monte Carlo cost and exposure on recorded combat boards (nothing is sent).
 * Usage: BOARDS=<states lines holding a random potion> [N=100] [SAMPLES=12] npx tsx tools/potion-mc-measure.ts
 * Prints, per decision: Monte Carlo ms (all random potions of the board), whether a question was asked,
 * the potion options shown (random / unsimulated), and the request size with and without them; then
 * p50/p90 of the added time and the shares.
 */
import { readFileSync } from "node:fs";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { potionMcOptions, potionMcTap, type PotionMc } from "../src/strategy/potion-mc.js";

const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(".cache/game-data.json", "utf8")).collections, "cache");
const lines = readFileSync(process.env["BOARDS"] ?? "", "utf8").trim().split("\n");
const want = Number(process.env["N"] ?? 100);
if (process.env["SAMPLES"]) potionMcOptions.samples = Number(process.env["SAMPLES"]);
// One board per (run, floor, turn), spread over the file.
const seen = new Set<string>();
const picked: string[] = [];
const step = Math.max(1, Math.floor(lines.length / (want * 3)));
for (let i = 0; i < lines.length && picked.length < want; i += step) {
  const entry = JSON.parse(lines[i]!) as { state: Record<string, unknown> };
  const run = (entry.state["run"] ?? {}) as Record<string, unknown>;
  const key = `${String(entry.state["run_id"])}:${String(run["floor"])}:${String(entry.state["turn"] ?? (entry.state["combat"] as Record<string, unknown> | undefined)?.["turn"])}`;
  if (seen.has(key)) continue;
  seen.add(key);
  picked.push(lines[i]!);
}

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]! : 0;
};
const mcMs: number[] = [];
const planMs: number[] = [];
let asked = 0;
let withRandom = 0;
let randomShown = 0;
let unsimShown = 0;
let degraded = 0;
const sizes: { total: number; potion: number }[] = [];
let unsimHeld = 0;
let unsimAsked = 0;
let t1Hp = 0;
let t1Death = 0;
let t1Any = 0;
/** Potions neither modelled nor random (the unsimulated class), as held in the logs. */
const UNSIM = new Set(["RADIANT_TINCTURE", "STABLE_SERUM", "SOLDIERS_STEW", "BLESSING_OF_THE_FORGE", "LIQUID_BRONZE", "ENTROPIC_BREW", "SHACKLING_POTION", "GHOST_IN_A_JAR", "CUNNING_POTION", "POT_OF_GHOULS", "COSMIC_CONCOCTION", "POTION_OF_CAPACITY", "FOCUS_POTION", "POISON_POTION", "POTION_OF_DOOM", "STAR_POTION", "KINGS_COURAGE", "BONE_BREW", "ESSENCE_OF_DARKNESS", "AMBERGRIS"]);
const byPotion = new Map<string, { runs: number; shown: number; beats: number; wins: number; samples: number }>();
for (const line of picked) {
  const entry = JSON.parse(line) as { state: Record<string, unknown> };
  const state = parseGameState(entry.state);
  const env: DecisionEnv = {
    state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"),
    thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", fightPlan: "off", buildDecider: "deepseek",
  };
  const runs: PotionMc[] = [];
  potionMcTap.onRun = (mc) => runs.push(mc);
  const t0 = performance.now();
  const decision = planCombatTurn(env);
  planMs.push(performance.now() - t0);
  potionMcTap.onRun = null;
  if (runs.length > 0) {
    withRandom += 1;
    mcMs.push(runs.reduce((sum, mc) => sum + mc.ms, 0));
    if (runs.some((mc) => mc.degraded)) degraded += 1;
  }
  for (const mc of runs) {
    const row = byPotion.get(mc.source.potionId) ?? { runs: 0, shown: 0, beats: 0, wins: 0, samples: 0 };
    row.runs += 1;
    row.samples += mc.samples;
    row.beats += mc.beats;
    row.wins += mc.wins;
    byPotion.set(mc.source.potionId, row);
  }
  const heldUnsim = ((entry.state["run"] as Record<string, unknown>)["potions"] as Record<string, unknown>[]).some((p) => p["occupied"] && p["can_use"] && UNSIM.has(String(p["potion_id"])));
  if (heldUnsim) unsimHeld += 1;
  if (decision?.kind !== "ask") continue;
  asked += 1;
  const t1 = ((decision.resolve({}).log?.potions ?? null) as { t1?: { hp: boolean; rollout_death: boolean } } | null)?.t1;
  if (heldUnsim && t1) {
    unsimAsked += 1;
    if (t1.hp) t1Hp += 1;
    if (t1.rollout_death) t1Death += 1;
    if (t1.hp || t1.rollout_death) t1Any += 1;
  }
  const criteria = (decision.jevView?.questions ?? decision.questions)["plan"]?.criteria ?? {};
  const potionKeys = Object.keys(criteria).filter((key) => /^p\d/.test(key));
  const random = potionKeys.filter((key) => String(criteria[key]).includes("result unknown until drunk"));
  if (random.length > 0) randomShown += 1;
  if (potionKeys.length > random.length) unsimShown += 1;
  for (const mc of runs) {
    if (random.some((key) => String(criteria[key]).includes(`drink ${mc.source.name} now`))) byPotion.get(mc.source.potionId)!.shown += 1;
  }
  const total = JSON.stringify(decision.jevView?.state ?? decision.state).length + JSON.stringify(criteria).length;
  const potion = random.reduce((sum, key) => sum + String(criteria[key]).length, 0);
  sizes.push({ total, potion });
}
console.log(`boards ${picked.length}, holding a simulated random potion ${withRandom}, questions ${asked}`);
console.log(`Monte Carlo ms per decision (boards with a random potion): p50 ${pct(mcMs, 0.5).toFixed(0)} p90 ${pct(mcMs, 0.9).toFixed(0)} max ${Math.max(0, ...mcMs).toFixed(0)}; degraded ${degraded}`);
console.log(`whole planCombatTurn ms: p50 ${pct(planMs, 0.5).toFixed(0)} p90 ${pct(planMs, 0.9).toFixed(0)}`);
console.log(`questions with a random-potion option ${randomShown}/${asked}; with an unsimulated-potion option ${unsimShown}/${asked}`);
const withPotion = sizes.filter((size) => size.potion > 0);
console.log(`request chars (Jev view): p50 ${pct(sizes.map((s) => s.total), 0.5)}; random-potion options add p50 ${pct(withPotion.map((s) => s.potion), 0.5)} (${(100 * pct(withPotion.map((s) => s.potion / s.total), 0.5)).toFixed(1)}% of the request) when shown`);
console.log(`unsimulated potion held on ${unsimHeld} boards, asked ${unsimAsked}: T1 fired ${t1Any} (HP >= 12%: ${t1Hp}, a dying rollout sample: ${t1Death})`);
for (const [id, row] of [...byPotion.entries()].sort()) {
  console.log(`  ${id}: runs ${row.runs}, shown ${row.shown}, beats-dry ${((100 * row.beats) / Math.max(1, row.samples)).toFixed(0)}% of samples, wins ${((100 * row.wins) / Math.max(1, row.samples)).toFixed(0)}%`);
}

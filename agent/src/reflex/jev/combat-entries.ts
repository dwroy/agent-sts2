import { createHash } from "node:crypto";
import { relative } from "node:path";
import { KNOWLEDGE_DIR } from "../../knowledge/files.js";
import { asArray, asRecord, toJsonValue, type JsonValue } from "../../core/util/json.js";
import type { GameState } from "../../hand/mod/schema.js";
import { loadV6Knowledge } from "../../v6/knowledge.js";
import type { ReflexEntry, ReflexVocab } from "../../v6/formats.js";
import { evaluatePredicate } from "../../v6/predicate.js";
import type { Plan } from "../turn-solver.js";

type Row = Record<string, unknown>;
/** Read-only source contract. The adapter cannot import or invoke a simulator. */
interface RolloutLineSource {
  plan: Plan; sameAsDry?: Plan; horizon: number; samples: number; hpLoss: number; winProb: number;
  wins: number; deaths: number; turnsToWin: number | null; timeUps?: number; revived?: number; noPotionFight?: boolean;
  perTurn: unknown; modelForecast: { rollout: unknown };
  orders: { order: { label: string }; firstDown: unknown; leader: unknown; enemyHpLeft: number;
    turnsSurvived: number; hpLoss: number; winProb: number; wins: number; deaths: number; turnsToWin: number | null }[];
}
type RolloutSource = { available: false; reason: string } | { available: true; result: { degraded: string[] };
  byPlan: ReadonlyMap<Plan, RolloutLineSource>; encounterN: number; gate: unknown };
interface WholeFightLineSource {
  calibrated: number; vsBest: unknown;
  result: { samples: number; hpLoss: { mean: number }; hpLossWon: { median: number } | null;
    winProb: number; wins: number; deaths: number; capped: number; turnsWon: { median: number } | null };
}
type WholeFightSource = { completion?: { status: string } } & ({ available: false; reason: string } | {
  available: true; byPlan: ReadonlyMap<Plan, WholeFightLineSource>; lowTrust: string | null;
  run: { requested: number; timedOut: boolean; maxTurns?: number };
});
const finite = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const numbers = (pairs: [string, unknown][]): Row => Object.fromEntries(pairs.filter(([, value]) => finite(value) !== null));

export interface CombatEntries {
  character: string;
  ascension: number;
  act: number | null;
  context: Row;
  entries: ReflexEntry[];
  vocab: ReflexVocab;
  provenance: Row;
}

function powers(value: unknown): Row {
  return Object.fromEntries(asArray(value).map(asRecord).filter(p => typeof p["power_id"] === "string" && finite(p["amount"]) !== null)
    .map(p => [String(p["power_id"]), p["amount"]]));
}

/** No implicit character, pending draft, common knowledge, inferred tags or missing-value defaults. */
export function loadCombatEntries(state: GameState, directory = KNOWLEDGE_DIR, env: NodeJS.ProcessEnv = process.env): CombatEntries | null {
  if (env["V6_COMBAT_ENTRIES"] !== "on") return null;
  const ascension = state.run?.ascension;
  if (ascension == null) return null;
  const loaded = loadV6Knowledge(directory, String(state.run?.raw["character_id"] ?? ""));
  if (!loaded.character || loaded.reflex.status !== "loaded" || loaded.vocab.status !== "loaded") return null;
  const combat = asRecord(state.raw["combat"]), player = asRecord(combat["player"]);
  const living = asArray(combat["enemies"]).map(asRecord).filter(e => e["is_alive"] !== false);
  // A singular predicate cannot join the intent of one enemy to the powers of another.
  const enemy = living.length === 1 ? living[0] : undefined;
  const intents = enemy ? asArray(enemy["intents"]).map(asRecord) : [];
  const intent = intents.length === 1 ? intents[0] : undefined;
  const damage = finite(intent?.["damage"]), hits = finite(intent?.["hits"]);
  const act = state.run?.act_id != null && /^\d+$/.test(state.run.act_id) ? Number(state.run.act_id) + 1 : null;
  const context: Row = {
    ...numbers([["act", act], ["floor", state.run?.floor]]),
    player: { ...numbers([["hp", player["current_hp"]], ["block", player["block"]], ["energy", player["energy"]]]), powers: powers(player["powers"]) },
    ...(enemy ? { enemy: { ...numbers([["hits", hits], ["total_damage", damage !== null && hits !== null ? damage * hits : null]]),
      ...(typeof intent?.["intent_type"] === "string" ? { intent_type: intent["intent_type"] } : {}), powers: powers(enemy["powers"]) } } : {}),
  };
  return { character: loaded.character, ascension, act, context,
    entries: loaded.reflex.value, vocab: loaded.vocab.value,
    provenance: {
      reflex: { path: relative(directory, loaded.reflex.path), sha256: hash(loaded.reflex.value), encoding: "validated-entries-json", entries: loaded.reflex.value },
      vocab: { path: relative(directory, loaded.vocab.path), sha256: hash(loaded.vocab.value), encoding: "validated-vocab-json", value: loaded.vocab.value },
    },
  };
}

/** Operational enums describe computation, never learner-authored game classifications. */
function rolloutAudit(plan: Plan | null, rollout: RolloutSource | null): Row {
  const line = plan && rollout?.available ? rollout.byPlan.get(plan) : undefined;
  const sampled = line && line.samples > 0 ? line : undefined;
  const degraded = rollout?.available ? rollout.result.degraded : null;
  const fallback = degraded?.includes("1-turn") === true;
  const sourceLine = line ? (({ plan: _plan, sameAsDry, ...summary }) => ({ ...summary,
    ...(sameAsDry ? { same_as_dry: { steps: sameAsDry.steps, outcome: sameAsDry.outcome } } : {}) }))(line) : null;
  return {
    source: "rollout-live", status: !sampled ? "unavailable" : fallback ? "clock_estimate" : "conditional_model",
    horizon_turns: line?.horizon ?? null, samples: line?.samples ?? null,
    further_hp_loss: finite(sampled?.hpLoss), win_probability: fallback ? null : finite(sampled?.winProb),
    horizon_wins: fallback ? null : sampled?.wins ?? null,
    horizon_win_probability: !fallback && line && line.samples > 0 ? line.wins / line.samples : null,
    kill_orders: !fallback && sampled ? sampled.orders.map(o => ({ order: o.order.label, first_down: o.firstDown,
      leader: o.leader, enemy_hp_left: o.enemyHpLeft, turns_survived: o.turnsSurvived, further_hp_loss: o.hpLoss,
      win_probability: o.winProb, wins: o.wins, deaths: o.deaths, turns_to_win: o.turnsToWin })) : null,
    deaths: fallback ? null : sampled?.deaths ?? null, turns_to_win: sampled?.turnsToWin ?? null,
    per_turn: !fallback && sampled ? sampled.perTurn ?? null : null,
    history_estimate: sampled?.modelForecast.rollout ?? null,
    history_support: rollout?.available ? { encounter_samples: finite(rollout.encounterN), gate: rollout.gate ?? null } : null,
    time_limit_losses: fallback ? null : sampled?.timeUps ?? null,
    revived_samples: fallback ? null : sampled?.revived ?? null,
    no_potion_fight: sampled?.noPotionFight ?? null,
    truncation_reasons: !sampled ? ["unavailable"] : fallback ? ["budget", "clock_fallback"] : [
      ...(degraded && degraded.length > 0 ? ["budget"] : []),
      ...(sampled.wins + sampled.deaths + (sampled.timeUps ?? 0) < sampled.samples ? ["horizon"] : []),
    ],
    trust: { level: "unknown", bias: "unknown", calibration: "not_asserted" },
    // Exact structured source summaries and all original prose remain in decision_evidence.
    evidence: { degraded, unavailable_reason: rollout && !rollout.available ? rollout.reason : null,
      line: sourceLine },
  };
}

function wholeFightAudit(plan: Plan | null, sim: WholeFightSource | null): Row {
  const line = plan && sim?.available ? sim.byPlan.get(plan) : undefined;
  const r = line && line.result.samples > 0 ? line.result : undefined;
  return {
    source: "boss-lines", status: r ? "conditional_model" : "unavailable",
    // Current boss-lines results do not expose their cap. Do not reconstruct it from prose or a copied constant.
    horizon_turns: line && sim?.available ? finite(sim.run.maxTurns) : null, samples: line?.result.samples ?? null,
    requested_samples: sim?.available ? sim.run.requested : null,
    further_hp_loss: finite(r?.hpLoss.mean), hp_loss_when_won_median: finite(r?.hpLossWon?.median),
    win_probability: r ? finite(line?.calibrated) : null, raw_win_probability: finite(r?.winProb),
    wins: r?.wins ?? null, deaths: r?.deaths ?? null, unfinished: r?.capped ?? null,
    turns_to_win_median: finite(r?.turnsWon?.median),
    paired_delta: r ? line?.vsBest ?? null : null,
    truncation_reasons: !r ? ["unavailable"] : [
      ...(sim?.available && sim.run.timedOut ? ["budget"] : []), ...(r.capped > 0 ? ["horizon"] : []),
      ...(sim?.completion?.status === "degraded" ? ["fault_degraded"] : []),
      ...(r.samples < (sim?.available ? sim.run.requested : r.samples) ? ["partial_samples"] : []),
    ],
    trust: { level: sim?.available ? sim.lowTrust === null ? "trusted" : "low" : "unknown", bias: "unknown",
      ranking_eligible: r && sim?.available ? sim.lowTrust === null : false },
    evidence: { low_trust_reason: sim?.available ? sim.lowTrust : null,
      unavailable_reason: sim && !sim.available ? sim.reason : null, completion: sim?.completion ?? null,
      result: line?.result ?? null, calibrated: line?.calibrated ?? null, paired: line?.vsBest ?? null },
  };
}

/** Read-only annotation: neither the candidate list nor any rank/action is changed. */
export function combatEntryAudit(session: CombatEntries, plan: Plan | null, rollout: RolloutSource | null, sim: WholeFightSource | null,
  basis: "plan" | "potion_median" | "unmodelled" = "plan", selection?: { best: boolean; tied_with: string[] }): JsonValue {
  const context = { ...session.context, ...(plan ? { option: { turn: numbers([
    ["damage", plan.outcome.damageDealt], ["block", plan.outcome.blockGained], ["hp_loss", plan.outcome.hpLoss],
    ["energy_left", plan.outcome.energyLeft], ["cards_drawn", plan.outcome.cardsDrawn],
  ]) } } : {}) };
  const evaluated = session.entries.filter(e => e.applies_to === "combat_line" && e.scope.ascensions.includes(session.ascension))
    .map(entry => ({ id: entry.id, result: evaluatePredicate(entry.predicate, context) }));
  const matched = new Set(evaluated.filter(e => e.result === true).map(e => e.id));
  const provenance = asRecord(session.provenance.reflex);
  const memory = session.entries.filter(e => matched.has(e.id)).map(entry => {
    const tag = entry.signal.kind === "tag" ? Object.entries(session.vocab.dimensions).flatMap(([dimension, members]) => members
      .filter(m => m.id === entry.signal.value).map(m => ({ dimension, id: m.id, label_en: m.label_en }))) : [];
    return { id: entry.id, version: entry.version, label_en: entry.label_en, signal: entry.signal,
      confidence: entry.confidence, n_support: entry.evidence.n_support, n_contradict: entry.evidence.n_contradict,
      source: { path: provenance.path, sha256: provenance.sha256, encoding: provenance.encoding, entry_id: entry.id },
      ...(tag.length > 0 ? { vocabulary: tag } : {}) };
  });
  return toJsonValue({ schema: "v6-combat-entry-audit-v1", basis, context, evaluated, memory,
    ...(selection ? { selection } : {}), rollout: rolloutAudit(plan, rollout), whole_fight: wholeFightAudit(plan, sim) });
}

export function combatEntriesState(session: CombatEntries, hasRunPlan: boolean): JsonValue {
  return toJsonValue({ schema: "v6-combat-entries-audit-v1", character: session.character, ascension: session.ascension,
    context: session.context, knowledge: session.provenance,
    run_plan_source: { kind: hasRunPlan ? "run_memory" : "run_brief", author: "unknown" } });
}

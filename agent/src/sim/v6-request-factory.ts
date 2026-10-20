/** Run-start snapshots and resource transitions shared by pick, shop and rest callers. No runtime I/O. */
import { applyBuildAction } from "../construction/planner.js";
import type { BuildAction, BuildState, CoreTemplate } from "../construction/types.js";
import type { ConstructionSupport } from "../construction/support.js";
import { asArray, asRecord, str } from "../core/util/json.js";
import { parseGameState, type GameState } from "../hand/mod/schema.js";
import { cardUpgrade } from "../knowledge/card-upgrades.js";
import type { DoubleBossModel } from "../knowledge/double-boss.js";
import type { Knowledge } from "../knowledge/index.js";
import { deckBudget } from "../memory/run-constraints.js";
import type { BuildCore } from "../v6/build-core.js";
import type { V6Config } from "../v6/config.js";
import type { Character } from "../v6/formats.js";
import { BOSS_KEYS, type BossTrustData } from "./boss-trust.js";
import { bossKey, type SyntheticStartOptions } from "./boss-start.js";
import { v6Digest, v6Directions, type V6ProjectionOption } from "./v6-completion.js";
import type { V6HistoryLoad } from "./v6-history-pack.js";
import type { V6PreparedProjection, V6ProjectionRequest } from "./v6-projection.js";
import { projectV6RouteEntries, type V6RouteInput, type V6RouteEntryTable } from "./v6-route-entry.js";
import { v6ProjectionStart } from "./v6-start.js";
import { v6FormationTableSource, type V6FormationTable } from "./v6-formation-table.js";
import { v6ProjectionTargets, v6TargetTrust, type V6TargetContext } from "./v6-targets.js";

export type V6ProjectionChange = Exclude<BuildAction, { kind: "relic" }> | {
  kind: "potion"; slot: number; value: Record<string, unknown> | null; price: number;
};
export interface V6SituationOption { id: string; changes: readonly V6ProjectionChange[] }
export interface V6FactorySnapshot {
  config: V6Config; character: Character; history: V6HistoryLoad; knowledge: Knowledge;
  templates: readonly CoreTemplate[]; support: ConstructionSupport | null; cores?: readonly BuildCore[];
  doubleBoss: DoubleBossModel | null; trust: BossTrustData | null; modelVersion: string;
  models?: SyntheticStartOptions;
}
export interface V6ProjectionSituation {
  state: GameState; phase: "pick" | "act"; runId: string; asOf: string; seed: number;
  weights: Readonly<Record<string, number>>; options: readonly V6SituationOption[]; baselineId?: string;
  visibleBosses?: V6TargetContext["visible"];
  /** The signature covers route selection, cost models and any callback implementation/data. */
  route?: Omit<V6RouteInput, "character" | "ascension" | "floor" | "act" | "hp" | "max_hp" | "costs" | "bossExit"> & {
    costs: V6RouteInput["costs"] | ((option: V6ProjectionOption) => V6RouteInput["costs"]);
    bossExit?: (option: V6ProjectionOption, ...args: Parameters<NonNullable<V6RouteInput["bossExit"]>>) => number | null;
  };
  /** Already projected boss-entry HP, with provenance. Healing requires route reprojection. */
  currentRouteHp?: number | null; currentRouteSignature?: string;
  idealOverrides?: V6ProjectionRequest["idealOverrides"]; appearedCards?: readonly string[];
  rankings?: V6ProjectionRequest["rankings"];
}
export type V6FactoryResult = { status: "ready"; request: V6ProjectionRequest; labels: string[];
  rejected_options: { id: string; reason: string }[] } | { status: "disabled" | "unavailable"; reason: string };
export interface V6ProjectionFactory { create(situation: V6ProjectionSituation): V6FactoryResult }
const knownNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const timestamp = (v: string) => Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;

function transition(state: BuildState, raw: Record<string, unknown>, changes: readonly V6ProjectionChange[], knowledge: Knowledge): BuildState | null {
  let result = state;
  for (const change of changes) {
    if (change.kind === "potion") {
      const run = asRecord(raw["run"]), belt = run["potions"];
      if (!Array.isArray(belt) || !Number.isSafeInteger(change.slot) || change.slot < 0
        || !knownNumber(change.price) || change.price < 0 || result.gold < change.price) return null;
      const positions = belt.flatMap((entry, position) => (asRecord(entry)["index"] ?? position) === change.slot ? [position] : []);
      if (positions.length !== 1) return null;
      const value = change.value;
      if (value !== null && (!str(value["potion_id"]) || !knowledge.potion(str(value["potion_id"])))) return null;
      belt[positions[0]!] = value === null ? { index: change.slot, occupied: false }
        : { ...structuredClone(value), index: change.slot, occupied: true };
      result = { ...result, gold: result.gold - change.price };
    } else {
      if (!["skip", "add", "remove", "upgrade", "heal"].includes(change.kind)) return null;
      if (change.kind === "add" && (!knowledge.card(change.card.id) || change.card.upgraded && !cardUpgrade(change.card.id))) return null;
      if (change.kind === "upgrade" && !cardUpgrade(result.cards[change.index]?.id ?? "")) return null;
      const next = applyBuildAction(result, change); if (!next) return null; result = next;
      const run = asRecord(raw["run"]), deck = asArray(run["deck"]);
      if (change.kind === "add") for (let i = 0; i < (change.copies ?? 1); i++) deck.push({ card_id: change.card.id, upgraded: change.card.upgraded });
      if (change.kind === "remove") deck.splice(change.index, 1);
      if (change.kind === "upgrade") asRecord(deck[change.index])["upgraded"] = true;
      run["deck"] = deck.map((card, index) => ({ ...asRecord(card), index }));
    }
  }
  return result;
}

export function createV6ProjectionFactory(snapshot: V6FactorySnapshot): V6ProjectionFactory {
  // This branch reads no history, knowledge, state, inventory or callback, preserving disabled callers exactly.
  if (snapshot.config.mode === "off") return { create: () => ({ status: "disabled", reason: "V6 off" }) };
  const { character, knowledge, models } = snapshot, config = structuredClone(snapshot.config);
  if (snapshot.history.status !== "loaded") return { create: () => ({ status: "unavailable", reason: `own_history_${snapshot.history.status}` }) };
  const pack = structuredClone(snapshot.history.value), modelVersion = snapshot.modelVersion;
  if (pack.data.character !== character || v6Digest(pack.data) !== pack.content_sha256 || !modelVersion)
    return { create: () => ({ status: "unavailable", reason: "history_scope_hash_or_model_mismatch" }) };
  const templates = structuredClone(snapshot.templates), support = structuredClone(snapshot.support);
  const cores = structuredClone(snapshot.cores ?? []), doubleBoss = structuredClone(snapshot.doubleBoss), trust = structuredClone(snapshot.trust);
  // Descriptive metrics are a frozen runtime overlay, never a write to the published core cards.
  for (const core of cores.filter(c => c.scope.character === character)) for (const combo of core.combos) {
    const metric = pack.data.combo_metrics.find(m => m.id === combo.id); if (metric) combo.metrics = structuredClone(metric.metrics);
  }
  // One run-start factory owns its frozen supply cache across act, idle and pick requests.
  const supplies = new Map<string, ReturnType<typeof v6FormationTableSource>>();
  const openings = new Map<string, V6PreparedProjection | null>();
  const directionCache = new Map<number, ReturnType<typeof v6Directions>>();
  return { create(supplied) { try {
    const s = { ...supplied, state: parseGameState(structuredClone(supplied.state.raw)) }, run = asRecord(s.state.run?.raw);
    const ascension = run["ascension"], floor = run["floor"], hp = run["current_hp"], maxHp = run["max_hp"], gold = run["gold"];
    const actId = run["act_id"], act = typeof actId === "string" && /^\d+$/.test(actId) ? Number(actId) + 1 : NaN;
    if (str(run["character_id"]).toLowerCase() !== character || ![ascension, floor, hp, maxHp, gold, act].every(knownNumber)
      || !Number.isSafeInteger(ascension) || !Number.isSafeInteger(floor) || !Number.isSafeInteger(act) || act < 1
      || (ascension as number) < 0 || (floor as number) < 0 || (maxHp as number) <= 0 || (hp as number) < 0
      || (hp as number) > (maxHp as number) || (gold as number) < 0 || !Array.isArray(run["deck"]) || !Array.isArray(run["relics"]))
      return { status: "unavailable", reason: "actual_run_scope_or_resources_unknown" };
    if (!s.runId || str(s.state.raw["run_id"]) && str(s.state.raw["run_id"]) !== s.runId || !timestamp(s.asOf)
      || s.asOf < pack.data.cutoff || !Number.isSafeInteger(s.seed)) return { status: "unavailable", reason: "run_time_or_seed_mismatch" };
    const baselineId = s.baselineId ?? "skip", ids = [baselineId, ...s.options.map(o => o.id)];
    if (ids.some(id => !id) || new Set(ids).size !== ids.length) return { status: "unavailable", reason: "duplicate_or_empty_option_id" };
    const cards = asArray(run["deck"]).map(asRecord), relics = asArray(run["relics"]).map(asRecord);
    if (cards.some(c => !str(c["card_id"]) || c["upgraded"] != null && typeof c["upgraded"] !== "boolean") || relics.some(r => !str(r["relic_id"])))
      return { status: "unavailable", reason: "held_inventory_unknown" };
    const build: BuildState = { cards: cards.map(c => ({ id: str(c["card_id"]), upgraded: c["upgraded"] === true })),
      relics: relics.map(r => str(r["relic_id"])), hp: hp as number, maxHp: maxHp as number, gold: gold as number,
      floor: floor as number, cap: deckBudget(s.state)?.maximum ?? null };
    let directions = directionCache.get(ascension as number);
    if (!directions) { directions = v6Directions(character, ascension as number, templates, support, cores); directionCache.set(ascension as number, directions); }
    const prior = new Set(pack.data.coverage.filter(r => r.run_id !== s.runId && r.ended < s.asOf).map(r => r.run_id));
    const observations = pack.data.observations.filter(o => prior.has(o.run_id));
    const targetBase: V6TargetContext = { character, ascension: ascension as number, act, floor: floor as number,
      visible: structuredClone(s.visibleBosses ?? []), observations, excludeRun: s.runId, doubleBoss };
    if (!targetBase.visible.some(v => v.act === act) && str(run["boss_id"])) {
      const boss = bossKey(str(run["boss_id"])), routeFloor = s.route?.steps.find(t => t.act === act && t.type === "Boss")?.floor;
      const floors = [...new Set(observations.filter(o => o.act === act && o.ascension === ascension
        && (!doubleBoss || o.floor !== doubleBoss.secondFloor)).map(o => o.floor))];
      const bossFloor = routeFloor ?? (doubleBoss?.character === character && doubleBoss.ascension === ascension && doubleBoss.act === act
        ? doubleBoss.firstFloor : floors.length === 1 ? floors[0] : undefined);
      if ((BOSS_KEYS as readonly string[]).includes(boss) && bossFloor !== undefined)
        targetBase.visible = [...targetBase.visible, { act, floor: bossFloor, boss }];
    }
    const targets = v6ProjectionTargets(targetBase), resources = new Map<string, { raw: GameState["raw"]; context: V6TargetContext; routeHp: number | null }>();
    const options: V6ProjectionOption[] = [], rejected_options: { id: string; reason: string }[] = [];
    for (const proposed of [{ id: baselineId, changes: [] }, ...s.options]) {
      const raw = structuredClone(s.state.raw), state = transition(structuredClone(build), raw, proposed.changes, knowledge);
      if (!state) { rejected_options.push({ id: proposed.id, reason: "invalid_resource_transition" }); continue; }
      asRecord(raw["run"])["gold"] = state.gold;
      const option: V6ProjectionOption = { id: proposed.id, state }, add = proposed.changes.filter(c => c.kind === "add");
      if (add.length === 1) option.card = { ...(add[0] as Extract<V6ProjectionChange, { kind: "add" }>).card };
      let routeEntries: V6RouteEntryTable | undefined;
      if (s.route) {
        const { costs, bossExit, ...route } = s.route;
        routeEntries = projectV6RouteEntries(config, { ...route, character, ascension: ascension as number, floor: state.floor, act,
          hp: state.hp, max_hp: state.maxHp, costs: typeof costs === "function" ? costs(option) : costs,
          ...(bossExit ? { bossExit: (step, entry) => bossExit(option, step, entry) } : {}) }) ?? undefined;
      }
      if (state.hp !== build.hp) {
        // A historical baseline cannot measure healing at an unprojected checkpoint.
        routeEntries ??= { character, ascension: ascension as number, source_floor: state.floor, source_act: act, max_hp: state.maxHp,
          signature: "healing_requires_route_reprojection", entries: [] };
        for (const t of targets) if (!routeEntries.entries.some(e => e.act === t.act && e.floor === t.floor))
          routeEntries.entries.push({ act: t.act, floor: t.floor, hp: null, max_hp: state.maxHp,
            labels: ["healing_requires_route_reprojection"] });
      }
      // Absent checkpoints (including an empty route) use own historical entry HP.
      // Explicit null entries from an unmodelled/dead route and healing still remain unknown.
      const routeHp = s.currentRouteSignature && state.hp === build.hp ? s.currentRouteHp ?? null : null;
      option.preparationKey = v6Digest([raw["run"], routeEntries, routeHp, s.currentRouteSignature]);
      resources.set(option.id, { raw, context: { ...targetBase, ...(routeEntries ? { routeEntries } : {}) }, routeHp }); options.push(option);
    }
    const baseline = options.shift()!;
    const historySignature = v6Digest([pack.content_sha256, s.asOf, s.runId]);
    const supplyKey = `${historySignature}:${ascension}`;
    let supply = supplies.get(supplyKey);
    if (!supply) { supply = v6FormationTableSource({ character, ascension: ascension as number,
      table: (pack.data as typeof pack.data & { appearance?: V6FormationTable }).appearance,
      excludeRun: s.runId, asOf: s.asOf, signature: historySignature });
      if (supplies.size >= 4) supplies.delete(supplies.keys().next().value!); supplies.set(supplyKey, supply);
    }
    const completionSources = [supply];
    const request: V6ProjectionRequest = { config: structuredClone(config), phase: s.phase, character, ascension: ascension as number, act,
      baseline, options, directions, weights: structuredClone(s.weights), targets, completionSources, seed: s.seed, modelVersion,
      contextDigest: v6Digest({ resources: run, history: [pack.content_sha256, pack.generated_at], asOf: s.asOf, run: s.runId,
        directions: directions.map(d => [d.id, d.signature]), doubleBoss, trust, targets, route: s.route?.signature, options: [baseline, ...options], ideal: s.idealOverrides,
        appeared: s.appearedCards, rankings: s.rankings, weights: s.weights, config, seed: s.seed, modelVersion }),
      ...(s.idealOverrides ? { idealOverrides: structuredClone(s.idealOverrides) } : {}),
      ...(s.appearedCards ? { appearedCards: [...s.appearedCards] } : {}), ...(s.rankings ? { rankings: structuredClone(s.rankings) } : {}),
      prepare(target, completed, option = baseline) {
        const resource = resources.get(option.id); if (!resource || option.preparationKey !== [baseline, ...options].find(o => o.id === option.id)?.preparationKey) return null;
        const key = v6Digest([option.preparationKey, target, completed]);
        if (openings.has(key)) return openings.get(key)!;
        const raw = structuredClone(resource.raw); asRecord(raw["run"])["gold"] = completed.gold;
        const opening = v6ProjectionStart({ state: parseGameState(raw), knowledge, targets: resource.context,
          currentRouteHp: resource.routeHp, doubleBoss, models }, target, completed);
        if (openings.size >= 2048) openings.delete(openings.keys().next().value!);
        openings.set(key, opening); return opening;
      }, cachedPreparation(target, completed, option = baseline) {
        const resource = resources.get(option.id);
        if (!resource) return null;
        return openings.get(v6Digest([option.preparationKey, target, completed])) ?? null;
      }, trust: target => v6TargetTrust(character, ascension as number, target, trust) };
    return { status: "ready", request, rejected_options, labels: [...pack.data.labels,
      ...(!s.route && !s.currentRouteSignature ? ["current_route_hp_unknown"] : []),
      ...(directions.some(d => d.source === "construction_adapter") ? ["construction_signature_transition_adapter"] : [])] };
  } catch { return { status: "unavailable", reason: "invalid_actual_context_or_route" }; } } };
}

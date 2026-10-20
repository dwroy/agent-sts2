/** Read-only run snapshots and live choices feed W3's shared factory; no evidence is derived here. */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { DecisionEnv } from "../memory/types.js";
import { asArray, asRecord, bool, numOrNull, str } from "../core/util/json.js";
import { KNOWLEDGE_DIR } from "../knowledge/files.js";
import { loadV6Knowledge } from "./knowledge.js";
import { v6Config } from "./config.js";
import { loadConstructionData } from "../construction/data.js";
import { loadConstructionSupport } from "../construction/support.js";
import { permanentCardGain } from "../memory/run-constraints.js";
import { actOf } from "../memory/run-plan.js";
import { actPlan, mapFromState, routeCosts } from "../hand/screens/route-plan.js";
import { actFirstFloor, floorOfRow } from "../sim/route-map.js";
import { bossKeyOf } from "../sim/boss-lines.js";
import { loadDoubleBossModel } from "../knowledge/double-boss.js";
import { BOSS_KEYS, loadBossTrust } from "../sim/boss-trust.js";
import { loadV6HistoryPack } from "../sim/v6-history-pack.js";
import { v6Directions, v6Digest } from "../sim/v6-completion.js";
import { createV6ProjectionFactory, type V6SituationOption, type V6ProjectionFactory, type V6ProjectionSituation } from "../sim/v6-request-factory.js";
import type { V6ProjectionRequest } from "../sim/v6-projection.js";
import type { Character } from "./formats.js";

export interface V6ProjectionInput { factory: V6ProjectionFactory; situation: V6ProjectionSituation }
/** One instance per loop. A restart loads a new snapshot; polls never reload a run's evidence. */
export function v6ProjectionInputs(dir = KNOWLEDGE_DIR, now = () => new Date().toISOString()) {
  let snapshot: ReturnType<typeof freeze> | undefined;
  function freeze(env: DecisionEnv, character: Character, run: string, ascension: number) {
    const asOf = now(), config = v6Config(), knowledge = loadV6Knowledge(dir, character);
    const history = loadV6HistoryPack(dir, character, config), own = join(dir, "characters", character);
    // The legacy loader can fall back. Only character-owned adapter inputs are admitted here.
    const construction = ["construction-templates.json", "construction-opportunities.json"].every(f => existsSync(join(own, f)))
      ? loadConstructionData(character, dir) : null;
    const templates = construction?.templates ?? [];
    const support = construction && existsSync(join(own, "construction-support.json")) ? loadConstructionSupport(character, templates, dir) : null;
    const cores = knowledge.cores.status === "loaded" ? knowledge.cores.value : [];
    const directions = v6Directions(character, ascension, templates, support, cores);
    const candidate = loadDoubleBossModel();
    const doubleBoss = candidate?.character === character && candidate.ascension === ascension
      && asArray(asRecord(env.state.run?.raw).ascension_effects).some(e => asRecord(e).id === candidate.effect) ? structuredClone(candidate) : null;
    const trust = loadBossTrust(join(own, "boss-trust.json"));
    const signature = v6Digest({ history: history.status === "loaded" && [history.value.generated_at, history.value.content_sha256],
      directions, trust, doubleBoss, catalog: env.knowledge.catalog ?? null });
    const factory = createV6ProjectionFactory({ config, character, history, knowledge: env.knowledge,
      templates, support, cores, doubleBoss, trust, modelVersion: `v6-runtime-v1:${signature}` });
    return { run, character, ascension, asOf, directions, factory };
  }
  return async (env: DecisionEnv, phase: "act" | "pick"): Promise<V6ProjectionInput | null> => {
    if (v6Config().mode === "off" || env.state.in_combat) return null;
    const raw = asRecord(env.state.run?.raw), character = str(raw.character_id).toLowerCase() as Character;
    const run = str(env.state.raw.run_id), ascension = env.state.run?.ascension ?? 0;
    if (!["silent", "ironclad", "regent", "necrobinder", "defect"].includes(character) || !run) return null;
    if (!snapshot || snapshot.run !== run || snapshot.character !== character || snapshot.ascension !== ascension) snapshot = freeze(env, character, run, ascension);
    const frozen = snapshot; if (!frozen.directions.length) return null;
    const state = env.state, act = actOf(state), floor = state.run?.floor ?? 0;
    const plan = env.screenMemory.runPlan?.runId === run && env.screenMemory.runPlan.act === act ? env.screenMemory.runPlan.v6 : undefined;
    const weights = plan?.direction_weights ?? Object.fromEntries(frozen.directions.map(d => [d.id, 1 / frozen.directions.length]));
    const options: V6SituationOption[] = [], offers = asArray(asRecord(state.raw.reward).card_options).map(asRecord);
    if (phase === "pick" && state.screen === "REWARD" && bool(asRecord(state.raw.reward).pending_card_choice)
      && state.available_actions.includes("choose_reward_card")) for (const [i, card] of offers.entries()) {
      const index = numOrNull(card.index) ?? i, id = str(card.card_id);
      if (!id || !Number.isInteger(index) || index < 0 || options.some(o => o.id === `card${index}`)) continue;
      const copies = permanentCardGain(state, { action: "choose_reward_card", option_index: index });
      if (copies !== null) options.push({ id: `card${index}`, changes: [{ kind: "add", card: { id, upgraded: bool(card.upgraded) }, copies, price: 0 }] });
    }
    const selected = actPlan(env, act), map = mapFromState(env);
    const steps = (selected?.path ?? []).map(p => ({ act, floor: actFirstFloor(act) + p.row, type: p.type })).filter(p => p.floor > floor);
    const costs = { [act]: routeCosts(env, act) };
    const signature = v6Digest({ run, floor, act, hp: state.run?.current_hp, maxHp: state.run?.max_hp, steps, costs });
    const rawBoss = str(raw.boss_id).toUpperCase().replace(/_BOSS$/, "");
    const boss = (BOSS_KEYS as readonly string[]).includes(rawBoss) ? rawBoss : bossKeyOf([rawBoss]);
    const bossNode = map?.act === act ? map.nodes.get(map.bosses[0] ?? "") : undefined;
    const visibleBosses = boss && (BOSS_KEYS as readonly string[]).includes(boss) && bossNode
      ? [{ act, floor: floorOfRow(map!, bossNode.row), boss }] : undefined;
    const appearedCards = [...new Set([...env.screenMemory.v6Planner?.appearedCards ?? [],
      ...asArray(raw.deck).map(c => str(asRecord(c).card_id)), ...offers.map(c => str(c.card_id))].filter(Boolean))];
    return { factory: frozen.factory, situation: { state, phase, runId: run, asOf: frozen.asOf, seed: parseInt(v6Digest(run).slice(0, 8), 16),
      weights, options, baselineId: "skip", idealOverrides: plan?.ideal_overrides, appearedCards, visibleBosses,
      // Empty steps admit the scoped historical entry-HP fallback; explicit route failures remain unknown.
      route: { signature, steps, costs } } };
  };
}
/** Compatibility boundary for consumers that only need the default reward/act request. */
export function v6ProjectionRequests(dir = KNOWLEDGE_DIR, now = () => new Date().toISOString()) {
  const input = v6ProjectionInputs(dir, now);
  return async (env: DecisionEnv, phase: "act" | "pick"): Promise<V6ProjectionRequest | null> => {
    const context = await input(env, phase); if (!context) return null;
    const result = context.factory.create(context.situation);
    return result.status === "ready" ? result.request : null;
  };
}

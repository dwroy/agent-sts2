/**
 * The run facts DeepSeek gets on every deck-building, route and rest question it decides
 * (BUILD_DECIDER=deepseek; Dai 2026-09-28: "构筑需要ds亲自来…路线选择也应该让ds来决定…休息点也交给deepseek").
 * Code supplies facts, never a hidden choice or a score (V4 M2, docs/v4-build-facts.md): the deck, relics with
 * their numbers where they are known, potions, HP and gold, the act boss clock and DeepSeek's own current run plan.
 * A question whose options carry outcome statistics gets their basis note too (screens/pick.ts deepseekPick).
 */

import { fillRelicText } from "../knowledge/relic-values.js";
import { UNKNOWN_VALUE } from "../knowledge/potion-values.js";
import { deckProfileLine } from "../project/deck-profile.js";
import type { DecisionEnv } from "../project/types.js";
import { asArray, asRecord, bool, str, type JsonValue } from "../util/json.js";
import { bossClockJson } from "./boss-clock.js";
import { fightPlanInput } from "./fight-plan.js";
import { actOf } from "./run-plan.js";

/** Act boss floors (acts are 17, 16 and 15 floors). */
const BOSS_FLOORS = [17, 33, 48];

/** `Name: effect` for each relic held, placeholders filled where measured and marked unknown otherwise. */
export function relicFacts(env: DecisionEnv): string[] {
  const { state, knowledge } = env;
  return asArray(asRecord(state.run?.raw)["relics"]).map((entry) => {
    const relic = asRecord(entry);
    const id = str(relic["relic_id"]);
    const info = knowledge.relic(id);
    const name = str(relic["name"], info?.name ?? id);
    const text = fillRelicText(id, info?.description || str(relic["description"]));
    return text ? `${name}: ${text}` : name;
  });
}

export function buildFacts(env: DecisionEnv, extra: Record<string, JsonValue> = {}): Record<string, JsonValue> {
  const { state, knowledge } = env;
  const run = asRecord(state.run?.raw);
  const floor = state.run?.floor ?? null;
  const shown = fightPlanInput(state, knowledge, "run", {});
  const belt = asArray(run["potions"]).map(asRecord);
  const relics = relicFacts(env);
  const potions = asArray(shown["potions"]).map(String);
  const plan = env.screenMemory.runPlan && env.screenMemory.runPlan.runId === str(state.raw["run_id"]) ? env.screenMemory.runPlan : null;
  const nextBoss = floor === null ? null : (BOSS_FLOORS.find((bossFloor) => bossFloor >= floor) ?? null);
  const facts: Record<string, JsonValue> = {
    act: actOf(state),
    floor,
    floors_to_act_boss: nextBoss === null || floor === null ? null : nextBoss - floor,
    ascension: state.run?.ascension ?? 0,
    hp: env.brief.hp,
    gold: state.run?.gold ?? null,
    act_boss: str(run["boss_id"]) || state.run?.boss_id || null,
    deck_size: asArray(run["deck"]).length,
    deck_profile: deckProfileLine(state, knowledge),
    deck: asArray(shown["deck"]).map(String),
    relics,
    potions,
    potion_slots: `${belt.filter((slot) => bool(slot["occupied"])).length}/${belt.length} used`,
    act_boss_clock: bossClockJson(state, knowledge),
    your_run_plan: plan
      ? {
          made_on_floor: plan.floor,
          archetype: plan.archetype,
          want: plan.want,
          avoid: plan.avoid,
          remove: plan.remove,
          block_target: plan.blockTarget,
          elites: plan.elites,
          rest: plan.rest,
          boss_prep: plan.bossPrep,
          summary: plan.summary,
        }
      : null,
    ...extra,
  };
  if ([...relics, ...potions].some((line) => line.includes(UNKNOWN_VALUE))) {
    facts["unknown_value_note"] = `${UNKNOWN_VALUE} marks a number the mod does not expose; the text around it is accurate`;
  }
  return facts;
}

/** Whether this screen's pick goes to DeepSeek directly (BUILD_DECIDER=deepseek, outside combat). */
export function deepseekDecides(env: DecisionEnv): boolean {
  return env.buildDecider === "deepseek" && !env.state.in_combat;
}

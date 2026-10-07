/**
 * The run facts DeepSeek gets on every deck-building, route and rest question it decides
 * (BUILD_DECIDER=deepseek; Dai 2026-09-28: "构筑需要ds亲自来…路线选择也应该让ds来决定…休息点也交给deepseek").
 * Code supplies facts, never a hidden choice or a score (V4 M2, docs/v4-build-facts.md): the deck, relics with
 * their numbers where they are known, potions, HP and gold, the act boss clock and DeepSeek's own current run plan.
 * A question whose options carry outcome statistics gets their basis note too (screens/pick.ts deepseekPick).
 */

import { fillRelicText } from "../knowledge/relic-values.js";
import { UNKNOWN_VALUE } from "../knowledge/potion-values.js";
import { deckProfileLine } from "../memory/deck-profile.js";
import type { DecisionEnv } from "../memory/types.js";
import { asArray, asRecord, bool, str, type JsonValue } from "../core/util/json.js";
import { bossClockJson } from "../sim/boss-clock.js";
import { doubleBossPreparation } from "../knowledge/double-boss.js";
import { fightPlanInput } from "../memory/fight-plan.js";
import { actOf } from "../memory/run-plan.js";

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
  const continuation = doubleBossPreparation(state);
  if (continuation) facts["double_boss_preparation"] = {
    objective: "第三幕路线和休息按F48→F49连续两战备战：第一战剩余HP/药水是第二战进场资源，四局观察没有中间营火或回血。",
    projection: "沿用silent-0163/S1.fix27：F48之后路线血量仍未知，不把进F48的血量当进F49血量；连战模拟才传递每条样本实际余量。",
    evidence: continuation.evidence,
    limits: continuation.limitation,
    choice: "全部路线、休息和锻造选项保留，由Codex结合即时血量、牌组及连续两战原始模拟选择。",
  };
  // silent-0148/0147: 2SU6XN2AEJRD F12 T1 and four events; HMVJKM56S4Q8 F31 T1.
  // Keep the entry-heal observation separate from room costs, which already include in-room healing.
  if (str(run["character_id"]).toLowerCase() === "silent"
    && asArray(run["relics"]).map(asRecord).some((relic) => str(relic["relic_id"]) === "PLANISPHERE" && !bool(relic["is_melted"]))) {
    facts["route_relic_observations"] = [{
      relic_id: "PLANISPHERE",
      name: "活动星图",
      map_room_type: "Unknown",
      observed_hp_gain: 5,
      observations: 6,
      trigger: "进入地图问号房时，在事件选择或战斗出牌之前回血；问号随后开战也已先回血。",
      evidence: [
        { run: "2SU6XN2AEJRD", floor: 12, turn: 1 },
        ...[15, 21, 36, 43].map((at) => ({ run: "2SU6XN2AEJRD", floor: at, turn: null })),
        { run: "HMVJKM56S4Q8", floor: 31, turn: 1 },
      ],
      projection_note: "这是六次进房实回5的观察。当前血量保持现场值；房间代价按进房前到离房后的净血量变化统计，已包含进房回血，不在路线投影上再加5。现有房间统计没有按是否持有星图区分。",
      limits: "满血截断、其他房型及择路收益尚未验证；HMVJKM56S4Q8 F31回5后仅11血离场，F32回血至34仍在F33失败。全部选项保留，由DeepSeek结合房间代价与其他事实选择。",
    }];
  }
  if ([...relics, ...potions].some((line) => line.includes(UNKNOWN_VALUE))) {
    facts["unknown_value_note"] = `${UNKNOWN_VALUE} marks a number the mod does not expose; the text around it is accurate`;
  }
  return facts;
}

/** Whether this screen's pick goes to DeepSeek directly (BUILD_DECIDER=deepseek, outside combat). */
export function deepseekDecides(env: DecisionEnv): boolean {
  return env.buildDecider === "deepseek" && !env.state.in_combat;
}

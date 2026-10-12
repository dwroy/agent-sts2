/** JMH5C51RLN4E / 9TG1RP5LFAAK F48 reward -> map -> F49 T1, silent-0228. */
import type { GameState } from "../hand/mod/schema.js";
import { asArray, asRecord, bool, numOrNull, str, type JsonValue } from "../core/util/json.js";

/** Only the observed Silent A10 third-act structure is covered; later levels remain unknown. */
export function observedBossPhase(state: GameState): Record<string, JsonValue> | null {
  const run = asRecord(state.run?.raw);
  const floor = state.run?.floor;
  if (str(run["character_id"]).toLowerCase() !== "silent" || state.run?.ascension !== 10
    || Number(run["act_id"]) !== 2 || (floor !== 48 && floor !== 49)
    || !asArray(run["ascension_effects"]).some((e) => str(asRecord(e)["id"]) === "LEVEL_10")) return null;
  const firstDefeated = floor === 49 || !state.in_combat && (state.screen === "REWARD" || state.screen === "MAP");
  const map = asRecord(state.raw["map"]);
  const nodes = asArray(map["nodes"]).map(asRecord);
  const remaining = !Array.isArray(map["nodes"]) ? null : nodes
    .filter((node) => str(node["node_type"]) === "Boss" && !bool(node["visited"]) && !bool(node["is_current"])
      && numOrNull(node["row"]) !== null && numOrNull(node["col"]) !== null)
    .map((node) => ({ row: numOrNull(node["row"]), col: numOrNull(node["col"]),
      second: bool(node["is_second_boss"]) }));
  const rawBoss = str(run["boss_id"]) || state.run?.boss_id || null;
  // The two observed F49 encounters have a distinct principal enemy. Never infer the hidden next boss.
  const enemyIds = state.in_combat ? asArray(asRecord(state.combat?.raw)["enemies"]).map(asRecord)
    .map((enemy) => str(enemy["enemy_id"])) : [];
  const principals = ["AEONGLASS", "QUEEN"].filter((id) => enemyIds.includes(id));
  const current = floor === 48 && state.in_combat ? rawBoss : floor === 49 && state.in_combat
    ? principals.length === 1 ? principals[0]! : null : null;
  return {
    first_boss_defeated: firstDefeated,
    observed_remaining_boss_nodes: remaining,
    current_boss: current,
    current_boss_basis: floor === 49 && state.in_combat ? "现场敌人" : current ? "run.boss_id" : null,
    raw_boss_id: rawBoss,
    raw_boss_id_stale: firstDefeated && rawBoss !== null && (current === null || rawBoss.replace(/_BOSS$/, "") !== current),
    // No F49 victory was observed in the source runs. A post-F49 screen is not proof of act completion.
    act_complete: floor === 48 || state.in_combat || (remaining !== null && remaining.length > 0) ? false : null,
    note: firstDefeated && floor === 48
      ? "F48首Boss已败，本幕仍有F49第二场；地图未显示时剩余节点记未知，下一Boss身份入场前未知。不重做刚结束的首Boss模拟。"
      : floor === 49 ? "F49当前Boss只按现场敌人确认；run.boss_id保留原值，是否过期由raw_boss_id_stale标明。尚无本来源局F49胜利证据，不预判本幕或整局通关。"
      : "F48是连续两场中的首Boss；本场获胜仍须保留资源进入F49。",
    evidence: ["JMH5C51RLN4E:F48奖励/地图→F49:T1", "9TG1RP5LFAAK:F48奖励/地图→F49:T1"],
  };
}

/** Effective identity for displayed facts; a stale first-boss id must not describe the second fight. */
export function bossIdForFacts(state: GameState): string | null {
  const phase = observedBossPhase(state);
  if (phase) return typeof phase["current_boss"] === "string" ? phase["current_boss"] : null;
  return str(asRecord(state.run?.raw)["boss_id"]) || state.run?.boss_id || null;
}

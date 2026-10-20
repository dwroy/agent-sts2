import { asArray, asRecord, bool, numOrNull, str, type JsonValue } from "../core/util/json.js";
import { parseGameState, type GameState } from "../hand/mod/schema.js";
import type { ScreenMemory } from "../memory/types.js";

function room(state: GameState): string | null {
  const run = str(state.raw.run_id), act = str(asRecord(state.run?.raw).act_id), floor = state.run?.floor;
  return run && run !== "run_unknown" && act && floor != null ? JSON.stringify([run, act, floor]) : null;
}

/** A reward-shaped event is not evidence of a won fight. Keep only a directly observed room transition. */
export function observeV6CardReward(memory: ScreenMemory, state: GameState): void {
  const key = room(state), prior = memory.v6CardReward;
  if (!key || !(state.run?.current_hp != null && state.run.current_hp > 0)) {
    delete memory.v6CardReward;
  } else if (state.in_combat) {
    memory.v6CardReward = { room: key, phase: "combat" };
  } else if (prior?.room === key && (state.screen === "REWARD" || state.screen === "COMBAT" && prior.phase === "combat")) {
    // COMBAT can linger for its victory animation before the reward screen opens.
    memory.v6CardReward = { room: key, phase: state.screen === "REWARD" ? "reward" : "combat" };
  } else {
    delete memory.v6CardReward;
  }
}

/** Existing state logs are the only restart provenance; missing or interrupted provenance stays unadmitted. */
export function restoreV6CardReward(memory: ScreenMemory, rows: readonly Record<string, JsonValue>[]): void {
  delete memory.v6CardReward;
  for (const row of rows) observeV6CardReward(memory, parseGameState(asRecord(row.state)));
}

/** Roy's scope is exactly a post-combat three-card reward with a legal skip, never a generic card choice. */
export function postCombatCardReward(memory: ScreenMemory, state: GameState): boolean {
  if (state.in_combat || state.screen !== "REWARD" || memory.v6CardReward?.phase !== "reward"
    || memory.v6CardReward.room !== room(state) || !(state.run?.current_hp != null && state.run.current_hp > 0)
    || !state.available_actions.includes("choose_reward_card") || !state.available_actions.includes("skip_reward_cards")) return false;
  const reward = asRecord(state.raw.reward), offers = asArray(reward.card_options);
  if (!bool(reward.pending_card_choice) || offers.length !== 3) return false;
  const indices = offers.map((entry, index) => {
    const card = asRecord(entry);
    return card.index === undefined ? index : numOrNull(card.index);
  });
  return new Set(indices).size === 3 && indices.every(index => index !== null && Number.isInteger(index) && index >= 0)
    && offers.every(entry => !!str(asRecord(entry).card_id));
}

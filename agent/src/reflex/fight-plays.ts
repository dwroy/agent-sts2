import type { ActionRequest } from "../hand/mod/client.js";
import type { GameState } from "../hand/mod/schema.js";
import type { ScreenMemory } from "../memory/types.js";
import { asArray, asRecord, num, str } from "../core/util/json.js";
import { heldPenaltyOf, replayOf } from "./card-model.js";

function observedWither(state: GameState): boolean {
  return state.in_combat && str(asRecord(state.run?.raw)["character_id"]).toLowerCase() === "silent" &&
    asArray(asRecord(state.raw["combat"])["enemies"]).some((entry) => {
      const enemy = asRecord(entry);
      return enemy["is_alive"] !== false && asArray(enemy["powers"]).some((power) =>
        str(asRecord(power)["power_id"]) === "WITHERING_PRESENCE_POWER" && num(asRecord(power)["amount"]) > 0);
    });
}

/** Keep the raw per-turn mean separate from extra plays that Withering Presence counts. */
export function recordStateFightPlays(memory: ScreenMemory, state: GameState, played: number): NonNullable<ScreenMemory["fightCards"]> {
  const fight = `${str(asRecord(state.run?.raw)["act_id"])}:${state.run?.floor ?? "?"}`;
  const runId = str(state.raw["run_id"]);
  const tracked = observedWither(state);
  const previous = memory.fightCards;
  const last = previous?.last;
  const actionable = state.combat?.can_use_combat_actions !== false && state.turn !== null;
  // DPYF2BAA3DKT F48 T1/T7, silent-0199: SL restarts this room's counters, including a retry in T1.
  const restarted = tracked && actionable && last &&
    (state.turn! < last.turn || (state.turn === last.turn && played < last.played));
  if (!previous || previous.fight !== fight || (tracked && previous.runId && previous.runId !== runId) || restarted) {
    memory.fightCards = { fight, perTurn: {}, witherDamage: 3 };
  }
  const memo = memory.fightCards!;
  if (tracked && !actionable) return memo;
  const turn = String(state.turn ?? "?");
  memo.perTurn[turn] = Math.max(memo.perTurn[turn] ?? 0, played);
  if (tracked) {
    memo.runId = runId;
    memo.last = { turn: state.turn!, played };
    // Rebuild the same last-seen damage that witherInput keeps, even after the card leaves the hand.
    for (const entry of asArray(asRecord(state.raw["combat"])["hand"])) {
      const card = asRecord(entry);
      if (str(card["card_id"]) === "WITHER") {
        memo.witherDamage = Math.max(memo.witherDamage, heldPenaltyOf(str(card["resolved_rules_text"])).heldPenalty);
      }
    }
  }
  return memo;
}

/** Sample every actionable Silent Wither frame, including frames logged without a decision. */
export function observeFightPlays(memory: ScreenMemory, state: GameState): boolean {
  if (!state.in_combat) {
    const had = memory.fightCards !== undefined;
    memory.fightCards = undefined;
    return had;
  }
  if (!observedWither(state) || state.combat?.can_use_combat_actions === false || state.turn === null) return false;
  const played = asRecord(asRecord(state.raw["combat"])["player"])["cards_played_this_turn"];
  if (typeof played !== "number" || !Number.isInteger(played) || played < 0) return false;
  const previous = JSON.stringify(memory.fightCards);
  recordStateFightPlays(memory, state, played);
  return previous !== JSON.stringify(memory.fightCards);
}

/** Only an accepted dispatch (or its logged replay) adds the card's observed enchantment replays. */
export function noteFightReplay(memory: ScreenMemory, state: GameState, intent: ActionRequest | null | undefined): void {
  if (!observedWither(state) || intent?.action !== "play_card" || typeof intent.card_index !== "number") return;
  observeFightPlays(memory, state);
  const memo = memory.fightCards;
  const played = asRecord(asRecord(state.raw["combat"])["player"])["cards_played_this_turn"];
  if (!memo || state.turn === null || typeof played !== "number" || !Number.isInteger(played) || played < 0) return;
  const raw = asArray(asRecord(state.raw["combat"])["hand"])
    .find((entry, index) => (asRecord(entry)["index"] ?? index) === intent.card_index);
  const count = replayOf(str(asRecord(raw)["resolved_rules_text"]));
  if (count <= 0) return;
  // The manual counter identifies this accepted source play; re-reading or replaying its row is idempotent.
  (memo.replays ??= {})[`${state.turn}:${played}`] = count;
}

/**
 * The turn-start settle (loop.ts, before the re-read that precedes every dispatch). At the start of our turn the game runs
 * its hooks one after another: the draw, Hellraiser playing each drawn Strike, Inferno's HP loss and its sweep, Crimson
 * Mantle's, Toasty Mittens' exhaust, Mr Struggles. When one hook's action (an auto-played Strike, a sweep) finishes before
 * the next hook starts, the mod's readiness reads ready for that while: can_use_combat_actions, actions_settled,
 * snapshot_stable true, running_action_type null, on every one of the 25327 logged frames the loop acted on first in a
 * turn (T2+, to 2026-10-03), the early ones too. A loop that acts on such a frame plans on a board the hooks still change.
 *
 * Logged (tools/turn-start-settle.py: each turn's first combat decision, its frame against the next one): the board kept
 * moving after the frame the loop acted on (cards still drawn, Inferno's loss still to come, Toasty Mittens' choice next)
 * on 7 of 1142 turn starts holding Inferno or Hellraiser from 2026-09-28 (55 of 1046 before), against 5 of 11264 holding
 * neither. Those with the read time logged were all decided in 3 ms or less (code's own act: least-loss, lethal, plan);
 * none of the 564 decided in 500 ms or more moved after. One older one moved after a Jev answer: VC4LRL945UEF F17 T4
 * (Hellraiser + Inferno, 2026-09-25): the board stood 646 ms or more, then a card was drawn and Inferno's 1 came.
 * C4F14F3XPN0N F33 attempt 1 T7 (Hellraiser + two Inferno+, 2026-10-03 14:38:20): the frame showed 4 HP and one card,
 * Hellraiser having played the drawn Strike and Setup Strike; the least-loss Anger went out 3 ms after the read and came
 * back "pending (unstable)"; two more cards were drawn, Inferno's 2 came (2 HP), then Mittens' choice.
 *
 * So the first combat action of a turn holding one of these powers goes out only once the board it was planned on has
 * stood for the power's TURN_START_SETTLE_MS since it was read (the most of the powers up): the loop sleeps what is left of
 * that, and its re-read before the dispatch re-plans on whatever moved (the window starts again from that read). Inferno
 * 500 ms; Hellraiser 1000 ms, past the 646 ms seen. The cost on the logged turn starts holding them (with the read time):
 * 448 of 982 would wait, 0.51 s on average (0.23 s over all of them, 0.7 s a fight; experiments/inferno-planner/
 * turn-start-settle.md). A turn holding neither, and every later
 * action of the turn, is not held. Rolling Boulder has its own wait (combat-plan boulderSettling).
 */

import type { ActionRequest } from "../mod/client.js";
import type { GameState } from "../mod/schema.js";
import type { ScreenMemory } from "../../memory/types.js";
import { asArray, asRecord, num, str } from "../../core/util/json.js";

/** How long the board a turn's first combat action was planned on must stand (from its read), by the power up. */
export const TURN_START_SETTLE_MS: Readonly<Record<string, number>> = { INFERNO_POWER: 500, HELLRAISER_POWER: 1000 };
const COMBAT_ACTIONS = new Set(["play_card", "use_potion", "end_turn"]);

/** The fight turn a combat state is on ("<run>:<act>:<floor>:<turn>"), or null outside a combat turn. */
export function turnKeyOf(state: GameState): string | null {
  if (state.screen !== "COMBAT" || !state.in_combat || state.turn === null) return null;
  return `${str(state.raw["run_id"])}:${str(asRecord(state.run?.raw)["act_id"])}:${state.run?.floor ?? "?"}:${state.turn}`;
}

/** The settle powers we hold (amount above 0), by id. */
export function settlePowersOf(state: GameState): string[] {
  const player = asRecord(asRecord(state.raw["combat"])["player"]);
  return asArray(player["powers"])
    .map(asRecord)
    .filter((power) => str(power["power_id"]) in TURN_START_SETTLE_MS && num(power["amount"]) > 0)
    .map((power) => str(power["power_id"]));
}

/**
 * Milliseconds to wait before the re-read that precedes this dispatch: what is left of the settle (the most of the powers
 * up) since the state was read (`readAt`), for the turn's first combat action (none sent on this fight turn yet:
 * `memory.turnActed`); 0 otherwise.
 */
export function turnStartSettleMs(state: GameState, intent: ActionRequest, memory: Pick<ScreenMemory, "turnActed">, readAt: number, now: number): number {
  if (!COMBAT_ACTIONS.has(intent.action)) return 0;
  const key = turnKeyOf(state);
  if (key === null || memory.turnActed === key) return 0;
  const powers = settlePowersOf(state);
  if (powers.length === 0) return 0;
  const settle = Math.max(...powers.map((power) => TURN_START_SETTLE_MS[power] ?? 0));
  return Math.max(0, Math.min(settle, settle - (now - readAt)));
}

/** A combat action went out on this fight turn: its later actions are not held (turnStartSettleMs). */
export function noteTurnActed(memory: Pick<ScreenMemory, "turnActed">, state: GameState, intent: ActionRequest): void {
  if (!COMBAT_ACTIONS.has(intent.action)) return;
  const key = turnKeyOf(state);
  if (key !== null) memory.turnActed = key;
}

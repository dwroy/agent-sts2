import type { GameState } from "../hand/mod/schema.js";
import type { ActionRequest } from "../hand/mod/client.js";
import type { Knowledge } from "../knowledge/index.js";
import { asArray, asRecord, str } from "../core/util/json.js";
import { fightKey } from "../memory/fight-plan.js";
import type { ScreenMemory } from "../memory/types.js";
import { modelHandCard } from "./card-model.js";

/** Silent observations: 25226ZFLNR1J F29 T1, PJ2LL9KU7FHD F17 attempt 3 T4; silent-0172/0173. */
export const PERMAFROST_BLOCK = 7;

/** Track availability from the fight's opening, never from currently active player powers. */
export function observePermafrost(memory: ScreenMemory, state: GameState): boolean {
  const previous = JSON.stringify(memory.permafrost);
  const run = asRecord(state.run?.raw);
  const runId = str(state.raw["run_id"]);
  if (!runId || runId === "run_unknown") return false;
  if (!state.in_combat || str(run["character_id"]).toLowerCase() !== "silent" ||
      !asArray(run["relics"]).some((entry) => str(asRecord(entry)["relic_id"]) === "PERMAFROST")) {
    memory.permafrost = undefined;
    return previous !== JSON.stringify(memory.permafrost);
  }
  // Transitional enemy-turn frames may still carry the old turn number with reset counters.
  if (state.combat?.can_use_combat_actions === false || state.turn === null) return false;
  const player = asRecord(asRecord(state.raw["combat"])["player"]);
  const counter = (key: string): number | null => {
    const n = player[key];
    return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
  };
  const cards = counter("cards_played_this_turn");
  const attacks = counter("attacks_played_this_turn");
  const skills = counter("skills_played_this_turn");
  const fight = `${runId}:${fightKey(state)}`;
  const last = memory.permafrost;
  // SL returns to the room's opening, including a retry within T1.
  if (!last || last.fight !== fight || state.turn < last.turn ||
      (state.turn === 1 && last.turn === 1 && cards !== null && cards < (last.cards ?? 0))) {
    memory.permafrost = { fight, turn: state.turn, cards, status: state.turn === 1 && cards === 0 ? "armed" : "unknown" };
  }
  const memo = memory.permafrost!;
  if (memo.status === "armed" && (cards === null || attacks === null || skills === null ||
      cards !== attacks + skills || state.turn > memo.turn + 1)) {
    // A play outside the observed Attack/Skill counts may have consumed the trigger. Do not guess its type.
    memo.status = "unknown";
  }
  memo.turn = state.turn;
  memo.cards = cards;
  return previous !== JSON.stringify(memory.permafrost);
}

/** Called only for an accepted dispatch, and when replaying its logged decision after a restart. */
export function notePermafrostPlay(memory: ScreenMemory, state: GameState, intent: ActionRequest | null | undefined, knowledge: Knowledge): void {
  observePermafrost(memory, state);
  const memo = memory.permafrost;
  if (!memo || intent?.action !== "play_card" || typeof intent.card_index !== "number") return;
  const raw = asArray(asRecord(state.raw["combat"])["hand"])
    .find((entry, index) => (asRecord(entry)["index"] ?? index) === intent.card_index);
  if (!raw) { memo.status = "unknown"; return; }
  const card = modelHandCard(raw, intent.card_index, knowledge, "silent");
  if (card.type === "Power") memo.status = "spent";
  else if (card.type !== "Attack" && card.type !== "Skill") memo.status = "unknown";
}

export function permafrostBlock(memory: ScreenMemory, state: GameState): number | undefined {
  observePermafrost(memory, state);
  return memory.permafrost?.status === "armed" ? PERMAFROST_BLOCK : undefined;
}

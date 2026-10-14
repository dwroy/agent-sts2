import { asArray, asRecord, str } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { PlayerSim } from "./turn-solver.js";

/** 9R916WW0V65N A10 F49 T1/T2; silent-0085/0291. Read the observed counter, never an absent stack as zero. */
export function silentKunai(state: GameState): PlayerSim["kunai"] {
  const run = asRecord(state.run?.raw);
  if (!state.in_combat || state.run?.ascension !== 10 || str(run["character_id"]).toLowerCase() !== "silent") return undefined;
  // This batch has separate Kunai and Helical Dart observations, not their combined trigger order.
  if (asArray(run["relics"]).some((entry) => asRecord(entry)["relic_id"] === "HELICAL_DART")) return undefined;
  const relics = asArray(run["relics"]).map(asRecord).filter((entry) => entry["relic_id"] === "KUNAI");
  const relic = relics[0];
  const player = asRecord(asRecord(state.raw["combat"])["player"]);
  const attacks = player["attacks_played_this_turn"], stack = relic?.["stack"];
  if (relics.length !== 1 || relic?.["is_melted"] !== false ||
      typeof stack !== "number" || !Number.isInteger(stack) || stack < 0 ||
      typeof attacks !== "number" || !Number.isInteger(attacks) || attacks < 0 || stack % 3 !== attacks % 3) return undefined;
  return { count: stack % 3 };
}

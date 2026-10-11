/** Existing run-memory observations, not relic charges inferred from the inventory. */
import { asArray, asRecord, str, type JsonValue } from "../core/util/json.js";
import type { GameState } from "../hand/mod/schema.js";
import type { ScreenMemory } from "./types.js";

/** 5BU7ZE1PWLSX F17 T4 -> F28/F32, silent-0367: the held tail had already fired. */
export function lizardTailResourceState(
  state: GameState, memory?: Pick<ScreenMemory, "lizardTail">,
): Record<string, JsonValue> | null {
  const run = asRecord(state.run?.raw);
  // This evidence covers Silent A10 build questions; combat and other characters retain their inputs.
  if (state.in_combat || str(run["character_id"]).toLowerCase() !== "silent" || state.run?.ascension !== 10) return null;
  if (!asArray(run["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "LIZARD_TAIL")) return null;
  const runId = str(state.raw["run_id"]);
  const tail = runId && runId !== "run_unknown" && memory?.lizardTail?.runId === runId ? memory.lizardTail : undefined;
  const source = tail?.used ? tail.seen : undefined;
  const floor = source ? Number(source.fight.split(":")[1]) : NaN;
  return {
    relic_id: "LIZARD_TAIL",
    run_id: runId,
    held: true,
    status: tail ? tail.used ? "used" : "not_observed_used" : "unknown",
    used: tail?.used ?? null,
    available: tail?.used ? false : null,
    source: source ? {
      run_id: runId, fight: source.fight, floor: Number.isFinite(floor) ? floor : null,
      observed_turn: source.turn, observation: source.how,
    } : null,
    note: tail?.used
      ? "同局跟踪已记录蜥蜴尾巴用过，不能再计作剩余复活；遗物效果文字是静态说明。"
      : tail
        ? "同局跟踪尚未观察到使用；这不是剩余次数的直接读数，不因持有就确认可用。"
        : "缺少同局使用记录，剩余复活未核实；不因持有就确认可用。",
  };
}

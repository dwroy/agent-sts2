import type { JsonValue } from "../core/util/json.js";
import type { OptionSim } from "./build-sim.js";

/** 2L1BNN9ZJEFU F9, silent-0139 (0003/0020/0079): equal win rates can hide different HP and turns. */
export function silentBuildWinTies(character: string, options: OptionSim[]): Map<string, Record<string, JsonValue>> {
  const facts = new Map<string, Record<string, JsonValue>>();
  if (character.toLowerCase() !== "silent") return facts;
  // Compare full precision, not displayed percentages or the calibration floor alone.
  const valid = options.filter((option) => Number.isInteger(option.samples) && option.samples > 0
    && Number.isFinite(option.win) && option.win >= 0 && option.win <= 1
    && Number.isFinite(option.winCal) && option.winCal >= 0 && option.winCal <= 1);
  for (const option of valid) {
    const peers = valid.filter((other) => other.key !== option.key && other.samples === option.samples
      && other.win === option.win && other.winCal === option.winCal).map((other) => other.key);
    if (peers.length === 0) continue;
    facts.set(option.key, {
      boss_sim_win_tied_with: peers,
      boss_sim_win_tie_note: `本次模拟与${peers.join("、")}的胜率指标并列：相同样本量下，精确原始胜率和校准胜率均相同。剩余boss血量、损血、回合与进场血量仍可能不同；不代表整局价值相同，全部选项仍交由DeepSeek选择。`,
    });
  }
  return facts;
}

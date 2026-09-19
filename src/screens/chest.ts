/** Treasure rooms (PLAN.md §6.7): open, choose a relic, leave. */

import { asArray, asRecord, bool, numOrNull, str, type JsonValue } from "../util/json.js";
import { briefJson } from "../project/run-brief.js";
import type { Decision, DecisionEnv } from "../project/types.js";
import { buildPickDecision, type PickOption } from "./pick.js";

export function planChest(env: DecisionEnv): Decision | null {
  const { state, knowledge } = env;
  const chest = asRecord(state.raw["chest"]);
  if (Object.keys(chest).length === 0) return null;

  if (!bool(chest["is_opened"]) && state.available_actions.includes("open_chest")) {
    return { kind: "act", label: "chest/open", intent: { action: "open_chest" }, rationale: "opening the chest" };
  }

  const relics = asArray(chest["relic_options"]).map(asRecord);
  if (!bool(chest["has_relic_been_claimed"]) && relics.length > 0 && state.available_actions.includes("choose_treasure_relic")) {
    const options: PickOption[] = relics.flatMap((relic, fallbackIndex) => {
      const index = numOrNull(relic["index"]) ?? fallbackIndex;
      const id = str(relic["relic_id"]);
      const name = str(relic["name"], knowledge.relic(id)?.name ?? id);
      return [
        {
          key: `r${index}`,
          label: name,
          intent: { action: "choose_treasure_relic", option_index: index },
          score: 0,
          summary: {
            relic: name,
            rarity: str(relic["rarity"], knowledge.relic(id)?.rarity ?? ""),
            text: knowledge.relic(id)?.description ?? "",
          } satisfies JsonValue,
        } satisfies PickOption,
      ];
    });
    if (options.length === 1) {
      const only = options[0] as PickOption;
      return { kind: "act", label: "chest/relic", intent: only.intent, rationale: "only one relic offered" };
    }
    return buildPickDecision({
      label: "chest/relic",
      instructions: "Which relic should I take from the chest?",
      actThreshold: env.thresholds.act,
      strictJev: env.strictJev,
      options,
      state: { run_brief: briefJson(env.brief), situation: { screen: "CHEST", hp: env.brief.hp } },
    });
  }

  if (state.available_actions.includes("proceed")) {
    return { kind: "act", label: "chest/proceed", intent: { action: "proceed" }, rationale: "chest handled" };
  }
  return null;
}

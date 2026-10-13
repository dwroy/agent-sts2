import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as runConstraints from "../src/memory/run-constraints.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planDecision } from "../src/hand/screens/index.js";
import { historicalRunConstraints } from "./historical-run-constraints-fixture.js";
import type { DecisionEnv } from "../src/memory/types.js";

it.each([
  ["silent-route-relic-evidence.json", "map_before", 31],
  ["silent-route-relic-evidence.json", "reward", 31],
  ["silent-route-relic-evidence.json", "rest", 32],
  ["silent-tail-resource-evidence.json", "rest_32", 32],
] as const)("isolates %s:%s without editing the snapshot or disabling the production cap", (file, key, size) => {
  const fixture = JSON.parse(readFileSync(new URL(`./${file}`, import.meta.url), "utf8"));
  const raw = structuredClone(fixture.states[key]);
  const before = JSON.stringify(raw);
  const state = parseGameState(raw);
  const historical = historicalRunConstraints(runConstraints);
  expect(state.run?.raw["deck"]).toHaveLength(size);
  expect(historical.deckBudget(state)).toBeNull();
  expect(historical.budgetedState(state)).toBe(state);
  expect(historical.deckBudgetFacts(state)).toEqual({});
  expect(historical.deckBudgetProblem(state, { action: "choose_reward_card", option_index: 0 })).toBeNull();
  expect(historical.requiredSelectionProblem(state)).toBeNull();
  expect(JSON.stringify(raw)).toBe(before);
  expect(runConstraints.deckBudget(state)).toMatchObject({ maximum: 30, current: size });
  // Overflow is rejected before the router consumes any other environment fields.
  expect(planDecision({ state } as DecisionEnv)).toMatchObject({ kind: "blocked" });
});

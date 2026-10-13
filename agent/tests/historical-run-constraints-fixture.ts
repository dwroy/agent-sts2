import type * as RunConstraints from "../src/memory/run-constraints.js";

/** Keep historical consumer snapshots intact while isolating later operator policies. */
export function historicalRunConstraints(original: typeof RunConstraints): typeof RunConstraints {
  return {
    ...original,
    deckBudget: () => null,
    deckBudgetFacts: () => ({}),
    deckBudgetProblem: () => null,
    budgetedState: (state) => state,
    requiredSelectionProblem: () => null,
  };
}

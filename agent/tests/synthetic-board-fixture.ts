import type * as TurnSolver from "../src/reflex/turn-solver.js";

/** Capture the real synthetic input; fixed-receipt consumers never use searched plans. */
export function captureSyntheticInput(original: typeof TurnSolver): typeof TurnSolver["solveTurn"] {
  return (input) => {
    const capture = original.solveTap.onSolve;
    original.solveTap.onSolve = null;
    let result: TurnSolver.SolveResult;
    try { result = original.solveTurn({ ...input, hand: [] }); }
    finally { original.solveTap.onSolve = capture; }
    capture?.(input, result);
    return result;
  };
}

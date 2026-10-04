/**
 * tools/check-imports.ts: every relative import in agent/src, agent/tests, agent/tools, learner/ and eval/ points at a
 * file that exists (tsc does not read tools/, eval/ or learner/), so a move that breaks one fails here.
 */
import { describe, expect, it } from "vitest";

import { unresolvedImports } from "../tools/check-imports.js";

describe("relative imports", () => {
  it("all resolve", () => {
    expect(unresolvedImports()).toEqual([]);
  });
});

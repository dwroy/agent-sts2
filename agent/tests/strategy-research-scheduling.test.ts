import { expect, it } from "vitest";
import { runSchedulingGroup, schedulingGroups } from "./research-scheduling-fixture.js";

it.each(schedulingGroups().map((cases, index) => [index + 1, cases] as const))(
  "frozen research group %i takes the next slot and starts only after its actual registration is saved", async (_index, cases) => {
    const result = await runSchedulingGroup(cases);
    expect(result.stderr, result.stdout + result.stderr).toMatch(new RegExp(`Ran ${cases.length} tests?`));
    expect(result.stderr).toContain("OK");
  });

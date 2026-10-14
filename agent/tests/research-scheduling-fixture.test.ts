import { expect, it } from "vitest";
import { runSchedulingGroup, schedulingCases, schedulingGroups, type ResearchExecutor } from "./research-scheduling-fixture.js";

it("preserves all registration cases when total fixture work exceeds one test deadline", async () => {
  let elapsed = 0;
  const completed: string[] = [];
  const execute: ResearchExecutor = async (command, args, options) => {
    expect(command).toBe("nice");
    expect(options.timeout).toBe(30_000);
    const cases = args.slice(5).map((name) => name.replace(/^ResearchScheduling\./, ""));
    const work = cases.length * 1_000;
    if (work > 15_000) throw new Error("fixed Vitest case exceeded its deadline");
    elapsed += work;
    completed.push(...cases);
    return { stdout: "", stderr: `Ran ${cases.length} tests\nOK` };
  };
  for (const group of schedulingGroups()) await runSchedulingGroup(group, execute);
  expect(elapsed).toBeGreaterThan(15_000);
  expect(completed).toEqual(schedulingCases);
  expect(new Set(completed).size).toBe(schedulingCases.length);
});

it("keeps the child failure evidence instead of treating printed OK as success", async () => {
  const cause = Object.assign(new Error("fixed child failure"), { code: 9, signal: null, killed: false,
    stdout: "OK\n", stderr: "fixed registration error\n" });
  const execute: ResearchExecutor = async () => { throw cause; };
  await expect(runSchedulingGroup([schedulingCases[0]!], execute)).rejects.toMatchObject({ cause,
    message: expect.stringContaining('"code":9') });
});

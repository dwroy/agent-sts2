import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";

const paths = vi.hoisted(() => ({ states: "", data: "", out: "" }));
const planner = vi.hoisted(() => vi.fn());

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  return { ...fs, readFileSync: (...args: Parameters<typeof fs.readFileSync>) => {
    // Reproduce ERR_STRING_TOO_LONG without allocating a multi-gigabyte log.
    if (args[0] === paths.states) throw new RangeError("ERR_STRING_TOO_LONG: whole state log read");
    return fs.readFileSync(...args);
  } };
});
vi.mock("../src/core/paths.js", () => ({ fromRoot: (path: string) => path === "data/game-data.json" ? paths.data : paths.out }));
vi.mock("../src/core/config.js", () => ({ loadConfig: () => ({ thresholds: {} }) }));
vi.mock("../src/knowledge/index.js", () => ({ makeKnowledge: () => ({}) }));
vi.mock("../src/hand/mod/schema.js", () => ({ parseGameState: (state: unknown) => state }));
vi.mock("../src/memory/run-brief.js", () => ({ buildRunBrief: () => ({}) }));
vi.mock("../src/reflex/combat-plan.js", () => ({ planCombatTurn: planner }));

let dir: string;
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

it("streams backward to the latest model combat question without reading the whole log", async () => {
  dir = mkdtempSync(join(tmpdir(), "prompt-dump-"));
  paths.states = join(dir, "states.jsonl");
  paths.data = join(dir, "game-data.json");
  paths.out = join(dir, "prompt.json");
  writeFileSync(paths.data, JSON.stringify({ collections: {} }));
  const row = (turn: number) => JSON.stringify({ screen: "COMBAT", state: { run: { floor: 9 }, turn } });
  writeFileSync(paths.states, [row(1), row(3), row(4), JSON.stringify({ screen: "MAP" }), '{"screen":"COM'].join("\n"));
  vi.stubEnv("STATES", paths.states);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  planner.mockImplementation(({ state }: { state: { turn: number } }) => state.turn === 4 ? { kind: "act" } : {
    kind: "ask", label: "combat/plan", state, questions: { plan: { instructions: "固定问题", criteria: { p1: "固定选项" } } },
  });
  await import("../tools/deepseek-prompt-dump.js");
  expect(planner.mock.calls.map(([env]) => env.state.turn)).toEqual([4, 3]);
  expect(JSON.parse(readFileSync(paths.out, "utf8"))).toEqual({
    question_key: "plan", floor: 9, turn: 3,
    user_message: { state: { run: { floor: 9 }, turn: 3 }, question: "固定问题", options: { p1: "固定选项" } },
  });
});

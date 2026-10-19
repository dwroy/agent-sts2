import { describe, expect, it, vi } from "vitest";
import { simulateHistoricalCase, type SimulationCase } from "../../knowledge/builders/combo-simulation.mjs";
import type { SyntheticStart } from "../src/sim/boss-start.js";
import type { BossSimResult } from "../src/sim/boss-sim.js";
import type { GameState } from "../src/hand/mod/schema.js";
import { historicalPrerequisite } from "../../knowledge/builders/combo-prerequisites.mjs";
import { fixedState } from "./v6-combat-fixtures.js";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

describe("historical combo prerequisites", () => {
  it("verifies exact raw bytes before evaluating a batch and rejects a changed source", () => {
    const dir = mkdtempSync(join(tmpdir(), "combo-prerequisites-"));
    try {
      const raw = structuredClone(fixedState().raw), sourcePath = join(dir, "states.jsonl");
      (raw["run"] as Record<string, unknown>)["relics"] = [{ relic_id: "FIXTURE_RELIC", stack: 3 }];
      const bytes = Buffer.from(JSON.stringify({ state: raw }) + "\n"); writeFileSync(sourcePath, bytes);
      const source = { path: sourcePath, offset: 0, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
      const input = join(dir, "input.json"), output = join(dir, "output.json");
      const payload = { predicates: { fixture: { op: "contains", field: "player.relics", value: "FIXTURE_RELIC" } }, frames: [{ source, combos: ["fixture"] }] };
      const script = fileURLToPath(new URL("../../knowledge/builders/combo-prerequisites.mts", import.meta.url));
      writeFileSync(input, JSON.stringify(payload));
      execFileSync(process.execPath, ["--import", "tsx", script, input, output], { stdio: "pipe" });
      expect(JSON.parse(readFileSync(output, "utf8"))).toMatchObject({ rows: [{ conditions: { fixture: { value: true } } }] });
      writeFileSync(sourcePath, Buffer.from(bytes.toString().replace("FIXTURE_RELIC", "CHANGED_RELIC")));
      expect(() => execFileSync(process.execPath, ["--import", "tsx", script, input, output], { stdio: "pipe" })).toThrow();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("uses the runtime W1 facts and three-valued evaluator on the original frame", () => {
    const raw = structuredClone(fixedState().raw);
    const run = raw["run"] as Record<string, unknown>;
    run["relics"] = [{ relic_id: "FIXTURE_RELIC", stack: 3 }];
    const predicate = { op: "contains", field: "player.relics", value: "FIXTURE_RELIC" };
    expect(historicalPrerequisite(predicate, raw)).toMatchObject({ value: true, sources: { "player.relics": "state.run.raw.relics[*].relic_id" } });
    expect(historicalPrerequisite({ ...predicate, value: "ABSENT_RELIC" }, raw).value).toBe(false);
    delete run["relics"];
    expect(historicalPrerequisite({ op: "not", arg: predicate }, raw).value).toBeNull();
    expect(historicalPrerequisite({ op: "eq", field: "option.kind", value: "combat_line" }, raw).value).toBeNull();
    expect(() => historicalPrerequisite({ op: "eq", field: "raw.secret", value: 1 }, raw)).toThrow("invalid combo prerequisite");
  });
});

const job: SimulationCase = { combo: "fictional", direction: "fixture", run_id: "FIXTURE", target: "B-F48", encounter: "B", historical_max_hp: 70,
  entry: { path: "fixture", offset: 0, bytes: 1, sha256: "fixture" }, evidence: { run_id: "FIXTURE", floor: 48 } };
function raw() { return { state_version: 11, screen: "COMBAT", session: { mode: "singleplayer", phase: "playing" }, available_actions: [], run_id: "FIXTURE", turn: 1,
  run: { floor: 48, act_id: "2", boss_id: "B", ascension: 2, max_hp: 70, deck: [{ card_id: "A", upgraded: false }], relics: [] },
  combat: { player: { cards_played_this_turn: 0 }, action_readiness: { snapshot_stable: true } } }; }
function dependencies(capped = false) {
  return { start: vi.fn((_state: GameState, _boss: string, _hp: number) => ({ boss: { exact: true, asc: 10, parts: [{ id: "B" }] }, relics: { unmodelled: ["UNKNOWN_RELIC"] } }) as unknown as SyntheticStart),
    simulate: vi.fn(() => ({ lines: [{ samples: 2, capped: Number(capped), timeUps: 0,
      outcomes: [{ won: true, died: false, capped: false, timeUp: false, hpLoss: 2, turns: 3 },
        { won: false, died: !capped, capped, timeUp: false, hpLoss: 10, turns: 5 }],
      perTurn: [{ fighting: 2, dmg: 12 }, { fighting: 0, dmg: 999 }] }] }) as unknown as BossSimResult) };
}
describe("historical A10 simulation bridge", () => {
  it("keeps the actual deck, uses one declared HP standard, and marks trust unknown", () => {
    const deps = dependencies(); const result = simulateHistoricalCase(job, raw(), { samples: 2 }, deps, 60);
    expect(result).toMatchObject({ entry_hp: 60, trust: "unknown", values: { win_rate: .5, hp_loss: 6, completion_turns: 4, dpr: 12 }, unmodelled_relics: ["UNKNOWN_RELIC"] });
    expect(deps.start.mock.calls[0]?.[0]).toMatchObject({ run: { ascension: 10, raw: { ascension: 10, deck: raw().run.deck } }, combat: null });
    expect(deps.start.mock.calls[0]?.[2]).toBe(60);
    expect(raw().run.ascension).toBe(2);
  });
  it("keeps all whole-fight outcomes unknown when any sample is censored", () => {
    expect(simulateHistoricalCase(job, raw(), {}, dependencies(true), 60)).toMatchObject({ capped: 1,
      values: { win_rate: null, hp_loss: null, completion_turns: null, dpr: 12 } });
  });
  it("rejects missing HP/upgrade/pre-action evidence without invoking a simulator", () => {
    for (const mutate of [(r: ReturnType<typeof raw>) => { delete (r.run as Partial<typeof r.run>).max_hp; },
      (r: ReturnType<typeof raw>) => { delete (r.run.deck[0] as Partial<{ upgraded: boolean }>).upgraded; },
      (r: ReturnType<typeof raw>) => { r.combat.player.cards_played_this_turn = 1; }]) {
      const r = raw(), deps = dependencies(); mutate(r);
      expect(simulateHistoricalCase(job, r, {}, deps)).toMatchObject({ samples: 0, values: null });
      expect(deps.start).not.toHaveBeenCalled(); expect(deps.simulate).not.toHaveBeenCalled();
    }
  });
  it("does not use nearest ascension or estimated static openings", () => {
    for (const boss of [{ exact: false, asc: 9, parts: [{ id: "B" }] }, { exact: true, asc: 10, parts: [{ id: "B", estimated: { hp: true } }] }, { exact: true, asc: 10, parts: [{ id: "OTHER" }] }]) {
      const deps = dependencies(); deps.start.mockReturnValue({ boss } as unknown as SyntheticStart);
      expect(simulateHistoricalCase(job, raw(), {}, deps)).toMatchObject({ samples: 0, values: null });
      expect(deps.simulate).not.toHaveBeenCalled();
    }
  });
});

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { deserialize } from "node:v8";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { simulateFight, type RolloutInput } from "../src/reflex/rollout.js";
import { solveTurn, type Plan, type Revive } from "../src/reflex/turn-solver.js";
import { fightSample } from "../src/sim/boss-sim.js";
import { board } from "./boss-sim-fixture.js";

interface Replay {
  floor: number;
  label: string;
  original: { won: boolean; died: boolean; hp: number; turns: number; solver_dies: boolean; solver_wins: boolean };
  fixture_sha256: string;
  fixture_payload: string;
}
const fixture = JSON.parse(gunzipSync(readFileSync(new URL("./fixtures/continuation-retaliation-cen1.json.gz", import.meta.url))).toString()) as { run: string; fixtures: Replay[] };

function retaliation(hp: number, revives: Revive[] = []): RolloutInput {
  const input = board({ bossHp: 4, playerHp: hp });
  input.solver.hand = [];
  input.solver.player.retaliate = 4;
  input.solver.player.revives = revives;
  input.plans = solveTurn(input.solver).plans;
  input.piles = { handBase: [], draw: [], discard: [] };
  input.captureResources = true;
  input.options = { drawFirst: 0, policyNodes: 100 };
  input.continuation = { variants: [{ boss: "FIXED_SECOND", count: 1, input: board() }], potions: [], source: "fixed fixture", limitation: "synthetic terminal precedence" };
  return input;
}

describe("retaliation cannot override resolved player death", () => {
  it.each(fixture.fixtures)(`${fixture.run} F$floor $label returns a first-fight loss instead of attempting a dead continuation`, (replay) => {
    const bytes = Buffer.from(replay.fixture_payload, "base64");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(replay.fixture_sha256);
    expect(replay.original).toMatchObject({ won: true, died: false, solver_dies: true, solver_wins: false });
    expect(replay.original.hp).toBeLessThanOrEqual(0);
    const { input, sample } = deserialize(bytes) as { input: RolloutInput; sample: { plan: Plan | null; seed: number; maxTurns: number; scripts: boolean; order: Parameters<typeof fightSample>[5] } };
    const result = fightSample(input, sample.plan, sample.seed, sample.maxTurns, sample.scripts, sample.order);
    expect(result).toMatchObject({ won: false, died: true, capped: false, timeUp: false,
      turns: replay.original.turns, resources: { hp: replay.original.hp },
      sequence: { firstWon: false, firstDied: true, secondBoss: null, secondWon: null, secondEntry: null } });
    expect(result.failureTrajectory).toBeUndefined();
  });

  it.each([1, 10])("records a lethal hit at %i HP that also kills the last attacker by retaliation as a loss", (hp) => {
    const input = retaliation(hp);
    const last = simulateFight(input, null, 1, 7).records.at(-1)!;
    expect(last.hpLeft).toEqual({ 0: 0 });
    expect(last).toMatchObject({ won: false, died: true, resources: { hp: hp - 10 } });
    expect(fightSample(input, null, 7, 1)).toMatchObject({ won: false, died: true,
      sequence: { firstWon: false, secondBoss: null, secondEntry: null } });
  });

  it("keeps retaliation wins when the player survives", () => {
    const last = simulateFight(retaliation(11), null, 1, 7).records.at(-1)!;
    expect(last).toMatchObject({ won: true, died: false, resources: { hp: 1 } });
  });

  it("uses a resolved automatic revive before deciding survival and consumes it once", () => {
    const last = simulateFight(retaliation(1, [{ source: "FAIRY_IN_A_BOTTLE", name: "fixed revive", hp: 20 }]), null, 1, 7).records.at(-1)!;
    expect(last).toMatchObject({ won: true, died: false, revived: 1, resources: { hp: 20, revives: [] } });
  });
});

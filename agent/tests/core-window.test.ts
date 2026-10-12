import { expect, it } from "vitest";
import { board, card } from "./boss-sim-fixture.js";
import { traceSteps, type Step } from "../src/reflex/turn-solver.js";
import { coreWindow, summarizeCoreWindows } from "../src/sim/core-window.js";
import { compareOptions } from "../src/sim/build-sim.js";
import { SerialDeckRunner } from "../src/sim/build-sim-pool.js";
import { compactQuantitativeFight } from "../src/sim/quantitative-facts.js";
import { fightSample } from "../src/sim/boss-sim.js";

it("counts the named two-component discard recipe once, without counting replay as a second set", () => {
  const s = board().solver;
  s.player.toughBandagesBlock = 3;
  s.hand = [card(0, "ACROBATICS", { type: "Skill", target: "self", discardAfterDraw: true, replay: 1, discards: ["c2", "c3"] }),
    card(1, "CALCULATED_GAMBLE", { type: "Skill", target: "self", cost: 0, discardsHand: true }),
    card(2, "X", { playable: false }), card(3, "Y", { playable: false }), card(4, "Z", { playable: false })];
  const steps: Step[] = s.hand.slice(0, 2).map((c) => ({ cardId: c.cardId, cardIndex: c.index, name: c.name, upgraded: false, target: null, targetName: null }));
  const traced = traceSteps(s, steps);
  expect(traced.complete).toBe(true);
  const window = coreWindow([{ turn: 3, complete: true, bandages: 3, events: traced.transitions }]);
  expect(window.byCard.ACROBATICS).toEqual({ manual: 1, effects: 2, firstPlay: 3 });
  expect(window.combinations.discardBandages.pairs).toEqual([{ components: ["ACROBATICS", "CALCULATED_GAMBLE"], count: 1, firstCompletion: 3 }]);
  expect(window.combinations.poisonDefense.count).toBeNull();
  expect(coreWindow([]).energyPaid).toBeNull();
  expect(coreWindow([{ turn: 3, complete: false, bandages: 3, events: traced.transitions }]).energyPaid).toBeNull();
  expect(coreWindow([{ turn: 3, complete: true, bandages: null, events: traced.transitions }]).combinations.discardBandages.pairs).toEqual([]);
});

it("captures selected simulator lines without changing any simulated outcome or random stream", () => {
  const input = board();
  input.options = { policyNodes: 80 };
  const legacy = fightSample(input, null, 13, 3, false);
  const captured = fightSample({ ...input, captureCore: true }, null, 13, 3, false);
  const { coreWindow: trace, ...rest } = captured;
  expect(rest).toEqual(legacy);
  expect(trace?.turns).toBe(legacy.turns);
  expect(trace?.byCard).not.toEqual({});
});

it("the real build comparison pairs keep/skip/remove/add on the same samples and preserves compact consumers", async () => {
  const input = board({ bossHp: 20 }); input.meta.asc = 10;
  input.options = { policyNodes: 60 };
  const options = [{ key: "keep", change: null }, { key: "skip", change: null },
    { key: "remove", change: { piles: { ...input.piles, draw: input.piles.draw.slice(1) } } },
    { key: "add", change: { piles: { ...input.piles, draw: [...input.piles.draw, card(100, "FIXTURE", { damage: 6 })] } } }];
  const result = await compareOptions(new SerialDeckRunner(), input, options, { samples: 3, quantitative: true });
  expect(result.options.map((o) => o.key)).toEqual(options.map((o) => o.key));
  expect(result.options[0]!.quantitative).toEqual(result.options[1]!.quantitative);
  const q = result.options[0]!.quantitative as any;
  expect(q.core_window.samples).toBe(3);
  expect(q.core_window.paired_energy_paid.difference.mean).toBe(0);
  expect(compactQuantitativeFight(q)).toHaveProperty("core_window");
  const legacy = await compareOptions(new SerialDeckRunner(), input, options, { samples: 3 });
  expect(legacy.options.map(({ quantitative, ...rest }) => rest)).toEqual(result.options.map(({ quantitative, ...rest }) => rest));
});

it("exposes missing traces and uses only same-identity energy pairs", () => {
  const trace = coreWindow([{ turn: 1, complete: true, bandages: null, events: [] }]);
  const result = summarizeCoreWindows([trace, undefined], [undefined, trace], [3, 8]);
  expect(result).toMatchObject({ valid: 1, missing: 1, paired_energy_paid: { difference: { n: 0 } } });
  expect(result.paired_energy_paid.difference.mean).toBeNull();
});

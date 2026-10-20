import { afterEach, expect, it, vi } from "vitest";
import { observeV6CardReward, postCombatCardReward, restoreV6CardReward } from "../src/v6/card-reward-scope.js";
import { v6CardActive } from "../src/v6/card-pick.js";
import { V6ProjectionRuntime } from "../src/v6/projection-runtime.js";
import { planReward } from "../src/hand/screens/reward.js";
import { toJsonValue } from "../src/core/util/json.js";
import { board, env, FakeDeepSeek, play, setupOneshotTests, type Raw } from "./oneshot-support.js";

setupOneshotTests();
afterEach(() => vi.unstubAllEnvs());
function reward() { return board("xljq-f5-reward", "reward"); }
function combat(raw = reward()) {
  const state = env(raw).state; state.in_combat = true; state.screen = "COMBAT"; return state;
}
function won() {
  const e = env(reward()); observeV6CardReward(e.screenMemory, combat());
  observeV6CardReward(e.screenMemory, e.state); return e;
}
function on() { vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_CARD_DECIDER", "jev"); }

it("requires observed combat-to-reward provenance, not a reward-shaped event", () => {
  on(); const e = env(reward());
  expect(postCombatCardReward(e.screenMemory, e.state)).toBe(false);
  observeV6CardReward(e.screenMemory, e.state);
  expect(v6CardActive(e)).toBe(false);
  observeV6CardReward(e.screenMemory, combat());
  const animation = combat(); animation.in_combat = false;
  observeV6CardReward(e.screenMemory, animation);
  observeV6CardReward(e.screenMemory, e.state);
  expect(v6CardActive(e)).toBe(true);
});
it("keeps provenance while claiming required rewards before opening the cards", () => {
  const e = won(), unopened = structuredClone(e.state);
  unopened.raw.reward = { pending_card_choice: false };
  observeV6CardReward(e.screenMemory, unopened);
  expect(postCombatCardReward(e.screenMemory, unopened)).toBe(false);
  observeV6CardReward(e.screenMemory, e.state);
  expect(postCombatCardReward(e.screenMemory, e.state)).toBe(true);
});
it.each(["MAP", "EVENT", "SHOP", "REST", "CARD_SELECTION", "CHARACTER_SELECT"])("clears the receipt on %s, even if a later event uses the same floor", screen => {
  const e = won(), away = structuredClone(e.state); away.screen = screen;
  observeV6CardReward(e.screenMemory, away);
  observeV6CardReward(e.screenMemory, e.state);
  expect(postCombatCardReward(e.screenMemory, e.state)).toBe(false);
});
it.each(["run", "act", "floor", "dead"])("rejects stale or unsuccessful combat provenance (%s)", change => {
  const e = won();
  if (change === "run") e.state.raw.run_id = "ANOTHER_RUN";
  if (change === "act") e.state.run!.raw.act_id = "1";
  if (change === "floor") e.state.run!.floor!++;
  if (change === "dead") e.state.run!.current_hp = 0;
  expect(postCombatCardReward(e.screenMemory, e.state)).toBe(false);
  observeV6CardReward(e.screenMemory, e.state);
  expect(e.screenMemory.v6CardReward).toBeUndefined();
});
it.each(["two", "four", "no_skip", "no_take", "duplicate", "negative", "fraction", "bad_index", "no_card"])("admits exactly three legal candidates and skip (%s)", change => {
  const raw = reward(), r = raw.reward as Raw, cards = r.card_options as Raw[];
  if (change === "two") cards.pop();
  if (change === "four") cards.push({ ...cards[0], index: 4 });
  if (change === "no_skip") raw.available_actions = ["choose_reward_card"];
  if (change === "no_take") raw.available_actions = ["skip_reward_cards"];
  if (change === "duplicate") cards[1]!.index = cards[0]!.index;
  if (change === "negative") cards[0]!.index = -1;
  if (change === "fraction") cards[0]!.index = .5;
  if (change === "bad_index") cards[0]!.index = "0";
  if (change === "no_card") delete cards[0]!.card_id;
  const e = env(raw); observeV6CardReward(e.screenMemory, combat()); observeV6CardReward(e.screenMemory, e.state);
  expect(postCombatCardReward(e.screenMemory, e.state)).toBe(false);
});
it("restores only uninterrupted combat-to-reward evidence from existing raw state logs", () => {
  const raw = reward(), fight = structuredClone(raw); fight.in_combat = true; fight.screen = "COMBAT";
  const map = structuredClone(raw); map.screen = "MAP";
  const e = env(raw), rows = (states: Raw[]) => states.map(state => ({ state: toJsonValue(state) }));
  restoreV6CardReward(e.screenMemory, rows([fight, raw]));
  expect(postCombatCardReward(e.screenMemory, e.state)).toBe(true);
  restoreV6CardReward(e.screenMemory, rows([raw]));
  expect(postCombatCardReward(e.screenMemory, e.state)).toBe(false);
  restoreV6CardReward(e.screenMemory, rows([fight, map, raw]));
  expect(postCombatCardReward(e.screenMemory, e.state)).toBe(false);
});
it("does not construct inputs or run a simulation for an unproven reward", async () => {
  on(); const engine = { evaluate: vi.fn(), precompute: vi.fn() }, input = vi.fn(), context = vi.fn();
  const runtime = new V6ProjectionRuntime(engine, vi.fn(), undefined, input, { engine: engine as never, context, record: vi.fn() });
  expect(await runtime.evaluateCard(env(reward()))).toBeNull();
  expect(input).not.toHaveBeenCalled(); expect(context).not.toHaveBeenCalled(); expect(engine.evaluate).not.toHaveBeenCalled();
});
it("leaves generic/event rewards on the exact original brain question and action", async () => {
  on(); const raw = reward(), render = () => JSON.stringify(planReward(env(raw)));
  vi.stubEnv("V6_CARD_DECIDER", "brain"); const original = render();
  vi.stubEnv("V6_CARD_DECIDER", "jev"); expect(render()).toBe(original);
  const fake = new FakeDeepSeek(() => "card0"), ask = vi.fn(async () => { throw Error("unadmitted reward reached Jev"); });
  const evaluateCard = vi.fn();
  const result = await play([raw], fake, { buildOneshot: "off" }, {
    maxDecisions: 1, jev: { model: "fixture", ask } as never,
    v6Projection: { evaluateCard } as never,
  });
  expect(result.actions).toEqual([{ action: "choose_reward_card", option_index: 0 }]);
  expect(fake.calls.filter(call => call.label === "reward/card")).toHaveLength(1);
  expect(ask).not.toHaveBeenCalled(); expect(evaluateCard).not.toHaveBeenCalled();
});

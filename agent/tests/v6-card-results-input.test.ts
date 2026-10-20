import { expect, it, vi } from "vitest";
import { cardResultsContext } from "../src/v6/card-results-input.js";
import { request } from "./v6-projection-fixture.js";
import { env, board, setupOneshotTests } from "./oneshot-support.js";
import { loadMonsterDb } from "../src/sim/boss-start.js";
import { v6ProjectionStart } from "../src/sim/v6-start.js";
vi.mock("../src/sim/boss-start.js", () => ({ loadMonsterDb: vi.fn() }));
vi.mock("../src/sim/v6-start.js", () => ({ v6ProjectionStart: vi.fn() }));
setupOneshotTests();
it("uses recorded initial encounter IDs and observed HP, excluding spawned members", () => {
  vi.mocked(loadMonsterDb).mockReturnValue({ bosses: {}, encounters: {
    "PARENT+PARENT": { acts: { "1": 3 }, rooms: { elite: 3 }, by_asc: { "10": { fights: 3 } } },
    UNKNOWN: { acts: { "1": 1 }, rooms: { elite: 1 }, by_asc: { "10": { fights: 1 } } },
  }, monsters: { PARENT: { hp_by_asc: { "10": { min: 20, median: 21, max: 22, n: 6 } } },
    SPAWN: { encounters: { "PARENT+PARENT": 3 }, hp_by_asc: { "10": { median: 99 } } } } });
  vi.mocked(v6ProjectionStart).mockReturnValue(null);
  const e = env(board("xljq-f5-reward", "reward")), r = request();
  const input = { situation: { state: e.state, route: {} } } as never;
  const context = cardResultsContext(e, input, r), target = context.eliteTargets![0]!;
  expect(target.boss).toBe("PARENT+PARENT");
  context.prepareElite!(target, r.baseline);
  const models = vi.mocked(v6ProjectionStart).mock.calls[0]![0].models!;
  expect(models.db!.bosses["PARENT+PARENT"]!["10"]!.parts).toEqual({ PARENT: { min: 20, median: 21, max: 22, n: 6, count_per_fight: 2 } });
  expect(context.prepareElite!(context.eliteTargets![1]!, r.baseline)).toBeNull();
  expect(v6ProjectionStart).toHaveBeenCalledTimes(1);
});
it("uses actual current HP for immediate Boss outcomes, independent of a dead route forecast", () => {
  vi.mocked(loadMonsterDb).mockReturnValue({ bosses: {}, encounters: {}, monsters: {} });
  vi.mocked(v6ProjectionStart).mockClear();
  vi.mocked(v6ProjectionStart).mockReturnValue(null);
  const e = env(board("xljq-f5-reward", "reward")), r = request(); e.state.run!.current_hp = 1;
  const input = { situation: { state: e.state, route: { entries: [{ entry_hp: null, exhausted: true }] } } } as never;
  const context = cardResultsContext(e, input, r);
  context.prepareCurrent!(r.targets[0]!, r.baseline);
  const [start, target, actual] = vi.mocked(v6ProjectionStart).mock.calls[0]!;
  expect(start.currentRouteHp).toBe(1); expect(start.targets.routeEntries).toBeUndefined();
  expect(start.targets.floor).toBe(e.state.run!.floor); expect(target.kind).toBe("current");
  expect(actual).toBe(r.baseline.state);
});

/** Immutable baseline runner: exact live solver and five-turn outputs on fixed synthetic inputs. */
import { pathToFileURL } from "node:url";
const candidate = process.argv[2]!;
const baseline = process.argv[3]!;
const { board } = await import(pathToFileURL(`${baseline}/agent/tests/boss-sim-fixture.ts`).href);
const { solveTurn } = await import(pathToFileURL(`${candidate}/agent/src/reflex/turn-solver.ts`).href);
const { rolloutDecision } = await import(pathToFileURL(`${candidate}/agent/src/reflex/rollout.ts`).href);
const { boardRolloutInput } = await import(pathToFileURL(`${candidate}/agent/src/reflex/rollout-live.ts`).href);
const { setCardUpgradesForTests } = await import(pathToFileURL(`${candidate}/agent/src/knowledge/card-upgrades.ts`).href);
setCardUpgradesForTests({});
const results = [];
for (const hp of [18, 70]) for (const enemyHp of [40, 120]) for (const seed of [3, 7]) {
  const input = board({ playerHp: hp, bossHp: enemyHp });
  const solved = solveTurn(input.solver);
  const rollout = rolloutDecision({ ...input, plans: solved.plans, options: { budgetMs: 1e9, seed, samples: 8, horizon: 5, k: 3 } });
  results.push({ hp, enemyHp, seed, solved, lines: rollout.lines, orders: rollout.orders, horizon: rollout.horizon, samples: rollout.samples });
}
for (const character of ["SILENT", "IRONCLAD"]) for (const id of ["TEST_BOSS", "AEONGLASS", "TEST_SUBJECT"]) {
  const input = board();
  const state = { raw: { combat: { enemies: [{ enemy_id: id, move_id: "HIT", index: 0, powers: [] }], player: { powers: [] } } },
    run: { raw: { character_id: character, relics: [], deck: [], potions: [] } } };
  const built = boardRolloutInput(state, { card: () => null }, input.solver, 8, {}, {});
  const solved = solveTurn(built.solver);
  const rollout = rolloutDecision({ ...input, ...built, plans: solved.plans, tables: { [id]: input.tables.TEST_BOSS },
    options: { budgetMs: 1e9, seed: 3, samples: 8, horizon: 5, k: 3 } });
  results.push({ character, id, solved, lines: rollout.lines, orders: rollout.orders, horizon: rollout.horizon, samples: rollout.samples });
}
// Wall-clock metadata has no decision semantics. Every numerical/structural decision field is retained.
process.stdout.write(JSON.stringify(results, (key, value) => ["elapsedMs", "policyMs"].includes(key) ? undefined : value) + "\n");

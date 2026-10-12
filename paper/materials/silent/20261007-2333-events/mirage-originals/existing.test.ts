import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { makeKnowledge } from "/home/dw/Projects/agent-sts2/.worktrees/codex-dev/agent/src/knowledge/index.ts";
import { modelHandCard } from "/home/dw/Projects/agent-sts2/.worktrees/codex-dev/agent/src/reflex/card-model.ts";
import { enemySims } from "/home/dw/Projects/agent-sts2/.worktrees/codex-dev/agent/src/reflex/combat-plan.ts";
import { replaySteps } from "/home/dw/Projects/agent-sts2/.worktrees/codex-dev/agent/src/reflex/turn-solver.ts";
import { simulateFight } from "/home/dw/Projects/agent-sts2/.worktrees/codex-dev/agent/src/reflex/rollout.ts";
import { board } from "/home/dw/Projects/agent-sts2/.worktrees/codex-dev/agent/tests/boss-sim-fixture.ts";

vi.mock("node:fs", async (original) => {
  const fs = await original();
  const { KNOWLEDGE_DIR: root } = await import("/home/dw/Projects/agent-sts2/.worktrees/codex-dev/agent/src/knowledge/files.ts");
  const readFileSync = (path, ...args) => {
    if (typeof path === "string" && resolve(path).startsWith(root + "/")) {
      throw Object.assign(new Error("ENOENT: fixed proposal checks"), { code: "ENOENT" });
    }
    return fs.readFileSync(path, ...args);
  };
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const rows = readFileSync(new URL("DUZUBAJ3A8GP-states.jsonl", import.meta.url), "utf8").trim().split("\n").map(JSON.parse);
const knowledge = makeKnowledge({ cards: ["DEFEND_SILENT", "DEADLY_POISON", "PIERCING_WAIL", "MIRAGE"].map((id) => ({ id, type: "Skill" })) }, "cache");
const simAt = (index) => {
  const c = rows[index].state.combat;
  return { hand: c.hand.map((h) => modelHandCard(h, h.index, knowledge, "silent", 10)),
    player: { hp: c.player.current_hp, maxHp: c.player.max_hp, block: c.player.block, energy: c.player.energy,
      weak: false, vulnerable: false, intangible: false, retaliate: 3 },
    enemies: enemySims({ enemies: c.enemies }), fightKind: "monster", turn: rows[index].state.turn };
};
const step = (input, index, target = null) => {
  const c = input.hand.find((h) => h.index === index);
  return { cardIndex: index, cardId: c.cardId, name: c.name, upgraded: false, target, targetName: null };
};

it("DUZ F30 T5/T6: the existing Wail and independent growth give fourteen then twenty-two", () => {
  const first = simAt(612);
  const input = board();
  input.solver = first;
  input.enemies = rows[612].state.combat.enemies.map((e) => ({ index: e.index, id: e.enemy_id, move: e.move_id,
    strength: e.powers.find((p) => p.power_id === "STRENGTH_POWER")?.amount ?? 0,
    powers: Object.fromEntries(e.powers.map((p) => [p.power_id, p.amount])) }));
  input.tables = {
    BOWLBUG_SILK: { moves: { TOXIC_SPIT_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: {} },
    SLUMBERING_BEETLE: { moves: { ROLL_OUT_MOVE: { damage: 18, hits: 1, strength: 2, block: 0 } }, next: { ROLL_OUT_MOVE: { ROLL_OUT_MOVE: 1 } } },
  };
  input.piles = { handBase: first.hand, draw: [], discard: [] };
  input.options = { handSize: 0, horizon: 2, samples: 1, now: () => 0 };
  input.meta = { ...input.meta, asc: 10, act: 2, t: 5, kind: "hallway", enc: "BOWLBUG_SILK|SLUMBERING_BEETLE", max_en: 4 };
  input.playerPowers = { THORNS_POWER: 3, FASTEN_POWER: 4 };
  const plan = replaySteps(first, [step(first, 0), step(first, 1, 1), step(first, 2), step(first, 3)]);
  const records = simulateFight(input, plan, 2, 1, false).records;
  expect(records[0].enemyPart).toBe(0);
  expect(records[1].snap.E[1][9].STRENGTH_POWER).toBe(4);
  expect(records[1].snap.E[1][7]).toBe(22);
  const wailOnly = replaySteps({ ...first, player: { ...first.player, block: 0 } }, [step(first, 2)]);
  expect(wailOnly.outcome.hpLoss).toBe(14);
});

it("DUZ F30 T4: two blocked Silk hits return six and the Beetle hit returns three", () => {
  const input = simAt(611);
  const outcome = replaySteps(input, []).outcome;
  expect(outcome.hpLoss).toBe(4);
  expect(outcome.retaliated).toEqual([{ index: 0, amount: 6 }, { index: 1, amount: 3 }]);
});

it("DUZ F30 T6: eight poison and three Thorns still resolve on the death turn", () => {
  const input = simAt(621);
  const outcome = replaySteps(input, []).outcome;
  expect(outcome.dies).toBe(true);
  expect(outcome.hpLoss).toBe(6);
  expect(outcome.enemyHpAfter[0].hp).toBe(35);
  expect(outcome.retaliated).toEqual([{ index: 0, amount: 3 }]);
  expect(rows[622].state.combat.enemies[0].current_hp).toBe(32);
});

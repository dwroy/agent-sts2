/** Synthetic W1 data, never a learned game claim or a formal knowledge publication. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { reflex, vocab } from "./v6-fixtures.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { combatEntryAudit, combatEntriesState, loadCombatEntries } from "../src/reflex/jev/combat-entries.js";
import type { Plan } from "../src/reflex/turn-solver.js";
import type { LiveRollout } from "../src/reflex/rollout-live.js";
import type { BossLineSim } from "../src/sim/boss-lines.js";
import type { QuestionSet } from "../src/reflex/jev/questions.js";

export function installFixture(directory: string, character = "silent") {
  const root = join(directory, "characters", character);
  mkdirSync(root, { recursive: true });
  const { directions: _directions, ...base } = reflex;
  const entry = { ...base, applies_to: "combat_line", scope: { character, ascensions: [0] },
    predicate: { op: "gte", field: "option.turn.damage", value: 3 } };
  const entries = [
    { ...entry, id: "TEST_HP", signal: { kind: "hp", value: 1.25, se: .2, unit: "hp" } },
    { ...entry, id: "TEST_TAG", signal: { kind: "tag", value: "TEST_TAG", unit: "label" } },
    { ...entry, id: "TEST_MISSING", predicate: { op: "not", arg: { op: "contains", field: "card.tags", value: "TEST_TAG" } } },
    { ...entry, id: "TEST_OTHER_SCREEN", applies_to: "card_pick" },
    { ...entry, id: "TEST_OTHER_ASCENSION", scope: { character, ascensions: [1] } },
  ];
  writeFileSync(join(root, "reflex.json"), JSON.stringify({ schema: "reflex-file-v1", character, entries }));
  writeFileSync(join(root, "reflex-vocab.json"), JSON.stringify({ ...vocab, character }));
  return root;
}

export function fixedState() {
  const raw = JSON.parse(readFileSync(new URL("./logged-states/k8tc-f17-t5.json", import.meta.url), "utf8")).state;
  raw.run.character_id = "SILENT"; raw.run.ascension = 0; raw.run.act_id = "2";
  return parseGameState(raw);
}

export const fixedPlan = { steps: [], score: 0, outcome: { damageDealt: 12, blockGained: 3, hpLoss: 2, energyLeft: 1, cardsDrawn: 0 } } as unknown as Plan;
export const fixedRollout = { available: true, result: { degraded: [] }, byPlan: new Map([[fixedPlan, {
  horizon: 5, samples: 4, hpLoss: 6.25, winProb: .75, wins: 2, deaths: 1, turnsToWin: 3,
  orders: [], order: null, modelForecast: { rollout: null, oneTurn: null },
}]]) } as unknown as LiveRollout;
export const fixedBoss = { available: true, lowTrust: "TEST_UNVALIDATED_MODEL", run: { requested: 4, timedOut: false, maxTurns: 30 },
  byPlan: new Map([[fixedPlan, { calibrated: .4, vsBest: null, result: { samples: 4, wins: 2, deaths: 1, capped: 1,
    hpLoss: { mean: 9 }, hpLossWon: { median: 4 }, winProb: .5, turnsWon: { median: 3 }, outcomes: ["TEST_AUDIT_ONLY"] } }]]) } as unknown as BossLineSim;

/** Frozen real question, with explicitly synthetic structured source summaries for format acceptance. */
export function annotatedFrozen(directory: string) {
  const { state, questions } = JSON.parse(readFileSync(new URL("./jev-context-recovery-request.json", import.meta.url), "utf8")) as { state: Record<string, unknown>; questions: QuestionSet };
  const frozen = { state, questions };
  const session = loadCombatEntries(fixedState(), directory, { V6_COMBAT_ENTRIES: "on" })!;
  if (!session) throw Error("missing synthetic W1 fixture");
  frozen.state.v6_combat_entries = combatEntriesState(session, true);
  frozen.state.deepseek_plan = "DeepSeek's run plan (F8; advice, not orders): TEST recorded plan";
  frozen.state.fight = "boss";
  for (const question of Object.values(frozen.questions)) if (question.type === "choice") {
    for (const [key, text] of Object.entries(question.criteria)) {
      const facts = JSON.parse(text!);
      facts.v6_combat_entry = combatEntryAudit(session, fixedPlan, fixedRollout, fixedBoss);
      question.criteria[key] = JSON.stringify(facts);
    }
  }
  return frozen;
}

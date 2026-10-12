import { expect, it } from "vitest";
import { extractQuantitativeLog, type QuantitativeLogInput } from "../src/sim/quantitative-log-extract.js";

function logs(): QuantitativeLogInput {
  const state = { run_id: "L704TLETMZBM", screen: "COMBAT", turn: 3, selection: null,
    run: { character_id: "SILENT", ascension: 10, floor: 48 },
    combat: { player: { energy: 1, block: 6, current_hp: 60 }, hand: [{ index: 0, card_id: "CALCULATED_GAMBLE" }] } };
  const realization = { model: "silent-realization-v1", fingerprint: "solver-hash", unknown: [],
    actions: [{ card: "CALCULATED_GAMBLE", target: null, energy_after: 1, hp_after: 60, block_after: 33, pending_selection: false }] };
  return { contiguous: true, sources: [{ run: "L704TLETMZBM", commit: "a".repeat(40) }],
    decisions: [{ ts: "2026-10-06T13:00:00Z", observed_ts: "2026-10-06T13:00:00Z", run_id: "L704TLETMZBM", decision_id: "d1", sl_attempt: 3,
      fingerprint: "before", chosen: { action: "play_card", card_index: 0 }, result: "completed: Action completed.",
      answers: { plan: { choice: "plan1" } }, questions: { plan: { criteria: { plan1: JSON.stringify({ quantitative_turn: { realization } }) } } } }],
    states: [{ ts: "2026-10-06T13:00:00Z", fingerprint: "before", state },
      { ts: "2026-10-06T13:00:01Z", fingerprint: "after", state: { ...state, combat: { ...state.combat, player: { energy: 1, block: 33, current_hp: 60 } } } }] };
}
it("extracts adopted first-action values from raw envelopes; does not invent interval coverage", () => {
  const result = extractQuantitativeLog(logs());
  expect(result.excluded).toEqual([]);
  expect(result.rows).toHaveLength(3);
  expect(result.summary.groups.every((g) => g.bias === 0 && g.empirical80Coverage === null)).toBe(true);
});
it("excludes missing frames, source drift, other characters, altered adoption, SL and selection windows", () => {
  for (const mutate of [
    (x: QuantitativeLogInput) => { x.contiguous = false; },
    (x: QuantitativeLogInput) => { x.sources[0]!.commit = "abcdef+dirty"; },
    (x: QuantitativeLogInput) => { x.states = x.states.slice(0, 1); },
    (x: QuantitativeLogInput) => { x.decisions[0]!.result = "pending (unstable)"; },
    (x: QuantitativeLogInput) => { (x.decisions[0]!.chosen as any).card_index = 9; },
    (x: QuantitativeLogInput) => { (x.states[1]!.state as any).selection = { options: [] }; },
    (x: QuantitativeLogInput) => { (x.states[1]!.state as any).turn = 4; },
    (x: QuantitativeLogInput) => { (x.states[0]!.state as any).run.character_id = "IRONCLAD"; },
    (x: QuantitativeLogInput) => { x.decisions[0]!.sl_attempt = null; },
  ]) { const x = logs(); mutate(x); const r = extractQuantitativeLog(x); expect(r.rows).toHaveLength(0); expect(r.excluded.length).toBe(1); }
});

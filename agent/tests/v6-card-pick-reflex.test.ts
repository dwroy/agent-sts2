import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { buildV6CardPick } from "../src/v6/card-pick.js";
import { observeV6CardReward } from "../src/v6/card-reward-scope.js";
import { cardPickPredicateFacts, cardPickReflex } from "../src/v6/card-pick-reflex.js";
import { loadV6Knowledge } from "../src/v6/knowledge.js";
import { evaluatePredicate } from "../src/v6/predicate.js";
import { asRecord } from "../src/core/util/json.js";
import { contrastFixture } from "./v6-reflex-contrast-fixture.js";
import { coreFixture } from "./v6-direction-core-fixtures.js";
import { reflex } from "./v6-fixtures.js";
import { board, env, type Raw } from "./oneshot-support.js";

const dirs: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture(character = "silent", entries: unknown[] = [contrastFixture()]) {
  vi.stubEnv("CHARACTER", character); vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_CARD_DECIDER", "jev");
  const dir = mkdtempSync(join(tmpdir(), "v6-pick-reflex-")); dirs.push(dir);
  const kd = join(dir, "characters", character); mkdirSync(kd, { recursive: true });
  writeFileSync(join(kd, "build-cores.json"), JSON.stringify({ schema: "build-cores-v1", character, entries: [{ ...coreFixture(), scope: { character, ascensions: [0] } }] }));
  writeFileSync(join(kd, "reflex.json"), JSON.stringify({ schema: "reflex-file-v1", character, entries: entries.map(e => ({ ...asRecord(e), scope: { character, ascensions: [0] } })) }));
  const raw = board("xljq-f5-reward", "reward");
  Object.assign(raw.run as Raw, { character_id: character.toUpperCase(), ascension: 0, act_id: "0", floor: 8,
    deck: [{ card_id: "TEST_ANCHOR", upgraded: true, energy_cost: 1 }, { card_id: "TEST_OTHER", upgraded: false, energy_cost: 0 }],
    relics: [{ relic_id: "TEST_RELIC", stack: null }] });
  raw.available_actions = ["choose_reward_card", "skip_reward_cards"];
  raw.reward = { pending_card_choice: true, card_options: [{ index: 2, card_id: "TEST_CARD", upgraded: true },
    { index: 7, card_id: "TEST_OTHER", upgraded: false }, { index: 9, card_id: "TEST_THIRD", upgraded: false }] };
  const e = env(raw), combat = structuredClone(raw);
  Object.assign(combat, { screen: "COMBAT", in_combat: true, available_actions: ["end_turn"], reward: null });
  Object.assign(combat.combat as Raw, { hand: [], enemies: [], action_readiness: { can_use_combat_actions: true, combat_over_or_ending: false } });
  observeV6CardReward(e.screenMemory, env(combat).state); observeV6CardReward(e.screenMemory, e.state);
  return { dir, e, raw, knowledge: loadV6Knowledge(dir, character) };
}

it("sends only matched nonzero-interval contrasts alongside A/B with traceable evidence, even before weights initialize", () => {
  vi.stubEnv("V6_REFLEX", "on");
  const positive = { ...contrastFixture(4), id: "POSITIVE" }, crossing = { ...contrastFixture(.1), id: "CROSSES_ZERO" };
  const { e, dir, knowledge } = fixture("silent", [contrastFixture(), positive, crossing, reflex]);
  expect(knowledge.reflex.status).toBe("loaded");
  const pick = buildV6CardPick(e, undefined, dir)!;
  const facts = asRecord(asRecord(pick.decision.state).options), rows = asRecord(facts.card2).reflex as Raw[];
  expect(rows.map(r => r.id)).toEqual(["TEST_CONTRAST", "POSITIVE"]);
  // The bounded prompt intentionally omits empty arrays; unmatched advice is absent.
  expect(asRecord(facts.card7)).not.toHaveProperty("reflex");
  expect(asRecord(facts.card9)).not.toHaveProperty("reflex");
  const row = rows[0]!;
  expect(asRecord(row.source).file).toBe(join(dir, "characters/silent/reflex.json"));
  expect(asRecord(row.source).sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(asRecord(row.signal).design).toBe("observational");
  expect(row.cores).toEqual(["TEST_A"]); expect(row.combos).toEqual(["TEST_A:min"]);
  expect(pick.decision.state).toHaveProperty("core_metrics");
  const bytes = Buffer.byteLength(JSON.stringify({ state: pick.decision.state, questions: pick.decision.questions }));
  expect(bytes).toBeLessThan(30_000);
  process.stdout.write(JSON.stringify({ fixture: "two_signed_card_pick_contrasts", prompt_bytes: bytes, sent_entries: rows.length }) + "\n");
});

it("keeps off/shadow reward questions byte-equivalent for every character despite published contrast data", () => {
  for (const character of ["silent", "ironclad", "regent", "necrobinder", "defect"]) {
    vi.stubEnv("V6_REFLEX", "off"); const a = fixture(character), b = fixture(character, []);
    const prompt = (f: typeof a) => { const p = buildV6CardPick(f.e, undefined, f.dir)!; return JSON.stringify({ state: p.decision.state, questions: p.decision.questions }); };
    const before = prompt(a);
    expect(before).toBe(prompt(b));
    vi.stubEnv("V6_REFLEX", "shadow"); expect(prompt(a)).toBe(before);
    expect(cardPickReflex(a.e, a.knowledge, "card2", { card_id: "TEST_CARD" }, {})).toEqual([]);
  }
});

it("uses observed deck, same-option combo progress and current Boss only; missing facts stay unknown", () => {
  const { e } = fixture();
  const candidate = { card_id: "TEST_CARD", upgraded: true };
  let f = cardPickPredicateFacts(e, "card2", candidate, {});
  expect(evaluatePredicate({ op: "eq", field: "player.deck_size", value: 2 }, f.context)).toBe(true);
  expect(evaluatePredicate({ op: "eq", field: "player.relic_counters.TEST_RELIC", value: 0 }, f.context)).toBe(null);
  expect(evaluatePredicate({ op: "eq", field: "card.cost", value: 0 }, f.context)).toBe(null);
  expect(f.unavailable["combos.items"]).toBe("current_option_combo_progress_unavailable");
  e.v6CardResults = { schema: "v6-card-combat-results-v1", immediate: [], long_term: [],
    progress: { card2: [{ direction: "TEST_A", combo: "TEST_A:min", missing_before: 2, missing_after: 1, advanced: 1 }] },
    targets: [{ id: "f17:BOSS", boss: "TEST_BOSS", kind: "current", act: 1, floor: 17, probability: 1, labels: [] },
      { id: "elite_pool", boss: "TEST_ELITE", kind: "elite", act: 1, floor: 9, probability: null, labels: [] }],
    telemetry: { elapsed_ms: 0, preparation_ms: 0, simulation_ms: 0, simulations: 0, cache_hits: 0, long_term_cache: "miss", long_term_computed: 0, long_term_total: 0, pending_work: false }, labels: [] };
  f = cardPickPredicateFacts(e, "card2", candidate, {});
  expect(evaluatePredicate({ op: "any", field: "combos.items", arg: { op: "eq", field: "combo.missing_after", value: 1 } }, f.context)).toBe(true);
  expect(asRecord(f.context.targets).items).toEqual([{ id: "f17:BOSS", boss: "TEST_BOSS", kind: "current", act: 1, floor: 17 }]);
  expect(cardPickPredicateFacts(e, "card7", candidate, {}).unavailable["combos.items"]).toBeDefined();
  delete e.state.run!.raw.deck;
  f = cardPickPredicateFacts(e, "card2", candidate, {});
  expect(evaluatePredicate({ op: "not", arg: { op: "eq", field: "player.deck_size", value: 0 } }, f.context)).toBe(null);
});

it("rejects unknown formal combo references and skips missing ascension instead of assuming A0", () => {
  vi.stubEnv("V6_REFLEX", "on");
  const bad = fixture("silent", [{ ...contrastFixture(), combos: ["UNPUBLISHED"] }]);
  expect(bad.knowledge.reflex.status).toBe("invalid");
  const { e, knowledge } = fixture(); e.state.run!.ascension = null;
  expect(cardPickReflex(e, knowledge, "card2", { card_id: "TEST_CARD" }, {})).toEqual([]);
});

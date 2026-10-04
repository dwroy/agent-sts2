/**
 * Offline check of the card-text fix (v4-shiv, 2026-10-03): a card template's conditional placeholders no longer decide
 * what the card does (card-model unconditionalText), and the mod's target fields come before the text (targetMode). The
 * bug: Shiv's 「{TargetType:choose(AllEnemies):对所有敌人|}造成{Damage:diff()}点伤害。」 read as an AoE card, played without a
 * target, refused by the gate 18 times on 6 boards of RNTVAT76BPV0 (each time the turn then ended).
 *
 * The v4 base and this tree run side by side in one process: `--base` is a directory holding the base's src (git archive
 * <rev> src package.json tsconfig.json, node_modules linked), whose modules are imported apart from this tree's. Only logs
 * are read (states.jsonl at byte offsets, the log DB for the decision rows); no model is called.
 *
 * --step scan: every line of states.jsonl. Each distinct card entry with a rules text (hand, deck, selection, reward, shop)
 *   modelled by both (modelHandCard; a deck entry also as a pile card, offHandCardModel), and every game-data card as a pile
 *   card and a potion's pool card: the cards whose model differs, field by field. The frames holding such a card (hand,
 *   piles, deck, selection), the frames whose hand holds a card the SL judge's draw test reads apart (judge.ts DRAWS on the
 *   template), and the deck profile line (deck-profile 「力量来源」) of every frame whose deck holds a card whose Strength is
 *   only in a conditional. Writes <out>/scan.json.
 * --step decisions: the logged combat planning decisions on those frames, and a control (the same run's other planning
 *   decisions and --control more from the whole log, sampled by hash), planned by both (clocks frozen, B2 off, no SL):
 *   code's action, the question's lines, the rollout's numbers and pick, the random potions' Monte Carlo, the any-draw
 *   bound; each option's first action gated on its logged board, and each line's steps of a card needing a target that
 *   name none. The logged least-loss decisions on the judge's frames: judgeEndTurn by both. The brain's decisions off
 *   combat whose deck holds such a Strength card: the deck profile line of their facts by both. <out>/results[-i].jsonl.
 * --step summary: <out>/summary.txt from every <out>/results*.jsonl (shards, or the shards merged into results.jsonl).
 *
 * Usage: nice npx tsx tools/template-target-replay.ts --base <dir> --step scan|decisions [--out experiments/template-target]
 *        [--control 600] [--shard i/n];  nice npx tsx tools/template-target-replay.ts --step summary [--out ...]
 * The 2026-10-03 run: base 6bd48a9 (git archive into a scratch directory), --control 600, 4 shards, merged.
 */
import { execFileSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fromRoot } from "../src/core/paths.js";
import { srcModule } from "./src-layout.js";

type Row = Record<string, unknown>;

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
const baseArg = arg("base", "");
const baseDir = baseArg ? resolve(baseArg) : "";
const step = arg("step", "scan");
const outDir = arg("out", fromRoot("experiments/template-target"));
const controlCount = Number(arg("control", "600"));
const [shard, shards] = arg("shard", "0/1").split("/").map(Number) as [number, number];
const STATES = fromRoot("logs/states.jsonl");
const PLANNING = "combat/(plan-choice|plan$|plan-guarded|lethal|least-loss|mod-lethal)";

/* ---- the two code trees ------------------------------------------------------------------------------------ */

type CombatPlan = typeof import("../src/reflex/combat-plan.js");
type CardModelModule = typeof import("../src/reflex/card-model.js");
interface Code {
  name: "base" | "new";
  plan: CombatPlan;
  cards: CardModelModule;
  deckProfileLine: (typeof import("../src/memory/deck-profile.js"))["deckProfileLine"];
  judge: typeof import("../src/sl/judge.js");
  gate: (typeof import("../src/hand/act/gate.js"))["gate"];
  parseGameState: (typeof import("../src/hand/mod/schema.js"))["parseGameState"];
  buildRunBrief: (typeof import("../src/memory/run-brief.js"))["buildRunBrief"];
  createScreenMemory: (typeof import("../src/memory/types.js"))["createScreenMemory"];
  config: ReturnType<(typeof import("../src/core/config.js"))["loadConfig"]>;
  knowledge: import("../src/knowledge/index.js").Knowledge;
}

async function loadCode(root: string, name: Code["name"]): Promise<Code> {
  // A module by its name before the module split, in either layout (tools/src-layout.ts).
  const at = (path: string) => srcModule(join(root, "src"), path);
  const plan = (await import(at("screens/combat-plan.ts"))) as CombatPlan;
  const cards = (await import(at("strategy/card-model.ts"))) as CardModelModule;
  const { makeKnowledge } = (await import(at("knowledge/index.ts"))) as typeof import("../src/knowledge/index.js");
  const { loadConfig } = (await import(at("config.ts"))) as typeof import("../src/core/config.js");
  const { rolloutLiveOptions } = (await import(at("strategy/rollout-live.ts"))) as typeof import("../src/reflex/rollout-live.js");
  const { potionMcOptions } = (await import(at("strategy/potion-mc.ts"))) as typeof import("../src/reflex/potion-mc.js");
  const { bossLinesOptions } = (await import(at("sim/boss-lines.ts"))) as typeof import("../src/sim/boss-lines.js");
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  // The any-draw bound by its node limit only (its wall-clock budget would make the two trees' bounds differ by load).
  plan.anyDrawOptions.budgetMs = 1e12;
  const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
  return {
    name,
    plan,
    cards,
    deckProfileLine: ((await import(at("project/deck-profile.ts"))) as typeof import("../src/memory/deck-profile.js")).deckProfileLine,
    judge: (await import(at("sl/judge.ts"))) as typeof import("../src/sl/judge.js"),
    gate: ((await import(at("act/gate.ts"))) as typeof import("../src/hand/act/gate.js")).gate,
    parseGameState: ((await import(at("mod/schema.ts"))) as typeof import("../src/hand/mod/schema.js")).parseGameState,
    buildRunBrief: ((await import(at("project/run-brief.ts"))) as typeof import("../src/memory/run-brief.js")).buildRunBrief,
    createScreenMemory: ((await import(at("project/types.ts"))) as typeof import("../src/memory/types.js")).createScreenMemory,
    config: loadConfig({} as NodeJS.ProcessEnv),
    knowledge,
  };
}

/* ---- logs -------------------------------------------------------------------------------------------------- */

function query(sql: string): Row[] {
  const out = execFileSync(fromRoot("data/logdb-venv/bin/python"), [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "200000", "--timeout", "300", sql], { encoding: "utf8", maxBuffer: 1 << 29 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string; truncated?: boolean };
  if (data.error) throw new Error(data.error);
  if (data.truncated) throw new Error("query truncated");
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}

/** Every line of states.jsonl with its byte offset and length, read in blocks (the file is never read whole). */
function* stateLines(): Generator<{ off: number; len: number; text: string }> {
  const fd = openSync(STATES, "r");
  const block = Buffer.alloc(32 << 20);
  let carry = Buffer.alloc(0);
  let pos = 0;
  let lineStart = 0;
  for (;;) {
    const read = readSync(fd, block, 0, block.length, pos);
    if (read === 0) break;
    pos += read;
    const data = carry.length > 0 ? Buffer.concat([carry, block.subarray(0, read)]) : block.subarray(0, read);
    let from = 0;
    for (let nl = data.indexOf(10, from); nl >= 0; nl = data.indexOf(10, from)) {
      yield { off: lineStart, len: nl - from, text: data.toString("utf8", from, nl) };
      lineStart += nl - from + 1;
      from = nl + 1;
    }
    carry = Buffer.from(data.subarray(from));
  }
  closeSync(fd);
}

function stateAt(fd: number, off: number, len: number): Row {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return (JSON.parse(buffer.toString("utf8")) as Row)["state"] as Row;
}

const record = (value: unknown): Row => (value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {});
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/* ---- scan -------------------------------------------------------------------------------------------------- */

/** The fields two models differ in, "field: before -> after". */
function modelDiff(before: unknown, after: unknown): string[] {
  const a = record(before);
  const b = record(after);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
    .map((key) => `${key}: ${JSON.stringify(a[key]) ?? "-"} -> ${JSON.stringify(b[key]) ?? "-"}`);
}

/** The objects with a rules text in a state, where they sit (combat.hand, run.deck, selection.cards, ...). */
function cardEntries(state: Row): { path: string; entry: Row }[] {
  const out: { path: string; entry: Row }[] = [];
  const walk = (value: unknown, path: string) => {
    if (Array.isArray(value)) for (const item of value) walk(item, path);
    else if (value && typeof value === "object") {
      const obj = value as Row;
      if (typeof obj["rules_text"] === "string" && typeof obj["card_id"] === "string") out.push({ path, entry: obj });
      for (const [key, inner] of Object.entries(obj)) if (key !== "agent_view") walk(inner, path ? `${path}.${key}` : key);
    }
  };
  walk(state, "");
  return out;
}

const DRAWS = /抽|draw/i;

async function scan(base: Code, next: Code): Promise<void> {
  const knowledge = next.knowledge;
  // Game-data cards as pile cards (both upgrades) and as a potion's pool card.
  const gameData: Row[] = [];
  const pileDiff = new Map<string, string[]>();
  for (const info of knowledge.cards()) {
    const diffs: string[] = [];
    for (const upgraded of [false, true]) {
      const d = modelDiff(base.cards.offHandCardModel(null, info.id, upgraded, 900, base.knowledge), next.cards.offHandCardModel(null, info.id, upgraded, 900, knowledge));
      if (d.length > 0) diffs.push(...d.map((x) => `pile${upgraded ? "+" : ""} ${x}`));
    }
    const ctx = { enemyTargets: [0, 1], strength: 0, weak: false };
    const pool = modelDiff(base.plan.poolCardModel(base.knowledge.card(info.id)!, base.knowledge, ctx), next.plan.poolCardModel(info, knowledge, ctx));
    if (pool.length > 0) diffs.push(...pool.map((x) => `pool ${x}`));
    if (diffs.length > 0) {
      pileDiff.set(info.id, diffs);
      gameData.push({ card: info.id, target: info.target, rarity: info.rarity, color: info.color, template: info.descriptionRaw, diffs });
    }
  }
  // Cards whose deck-profile Strength is only in a conditional (the profile line reads their rendered text now).
  const { givesLastingStrength, unconditionalText } = next.cards;
  const strengthInConditional = new Set(knowledge.cards().filter((info) => givesLastingStrength(info.descriptionRaw) && !givesLastingStrength(unconditionalText(info.descriptionRaw))).map((info) => info.id));

  const entryDiff = new Map<string, { diffs: string[]; card: string; path: string; frames: number; runs: Set<string>; rendered: string; template: string; target: unknown; requires: unknown }>();
  const seen = new Map<string, string | null>();
  const frames: Row[] = [];
  const judgeFrames: Row[] = [];
  const profiles = new Map<string, { before: string; after: string; frames: number; runs: Set<string> }>();
  let lines = 0;
  let entries = 0;
  for (const line of stateLines()) {
    lines += 1;
    if (lines % 20000 === 0) console.error(`scan: ${lines} lines, ${seen.size} distinct entries, ${frames.length} frames holding a changed card`);
    let row: Row;
    try {
      row = JSON.parse(line.text) as Row;
    } catch {
      continue;
    }
    const state = record(row["state"]);
    const run = String(state["run_id"] ?? "");
    const holding = new Set<string>();
    for (const { path, entry } of cardEntries(state)) {
      entries += 1;
      const { index: _index, ...rest } = entry;
      const deck = path === "run.deck";
      const key = `${deck ? "deck" : "card"}|${JSON.stringify(rest)}`;
      let diffKey = seen.get(key);
      if (diffKey === undefined) {
        const diffs = modelDiff(base.cards.modelHandCard(entry, 0, base.knowledge), next.cards.modelHandCard(entry, 0, knowledge));
        const id = String(entry["card_id"]);
        if (deck) {
          const d = modelDiff(base.cards.offHandCardModel(entry, id, entry["upgraded"] === true, 900, base.knowledge), next.cards.offHandCardModel(entry, id, entry["upgraded"] === true, 900, knowledge));
          diffs.push(...d.map((x) => `as a pile card: ${x}`));
        }
        diffKey = diffs.length > 0 ? `${id}|${path}|${diffs.join("; ")}` : null;
        seen.set(key, diffKey);
        if (diffKey && !entryDiff.has(diffKey)) entryDiff.set(diffKey, { diffs, card: id, path, frames: 0, runs: new Set(), rendered: String(entry["resolved_rules_text"] ?? ""), template: String(entry["rules_text"]), target: entry["target_type"], requires: entry["requires_target"] });
      }
      if (diffKey) {
        const info = entryDiff.get(diffKey)!;
        info.frames += 1;
        info.runs.add(run);
        holding.add(`${String(entry["card_id"])}@${path}`);
      }
    }
    const view = record(record(state["agent_view"])["combat"]);
    for (const pile of ["draw", "discard", "exhaust"]) for (const pileLine of list(view[pile])) for (const id of list(record(pileLine)["card_ids"])) if (pileDiff.has(String(id))) holding.add(`${String(id)}@${pile}`);
    const hand = list(record(state["combat"])["hand"]).map(record);
    const judgeCards = hand.filter((card) => DRAWS.test(`${String(card["resolved_rules_text"] ?? "")} ${String(card["rules_text"] ?? "")}`) !== DRAWS.test(`${String(card["resolved_rules_text"] ?? "")} ${unconditionalText(String(card["rules_text"] ?? ""))}`));
    const meta = { off: line.off, len: line.len, ts: row["ts"], run, screen: state["screen"], floor: record(state["run"])["floor"], turn: state["turn"] };
    if (holding.size > 0) frames.push({ ...meta, holding: [...holding] });
    if (judgeCards.length > 0) judgeFrames.push({ ...meta, cards: judgeCards.map((card) => `${String(card["card_id"])}: ${String(card["resolved_rules_text"] ?? "")}`) });
    const deck = list(record(state["run"])["deck"]).map(record);
    if (deck.some((card) => strengthInConditional.has(String(card["card_id"])))) {
      const key = JSON.stringify([deck, record(state["run"])["relics"]]);
      let profile = profiles.get(key);
      if (!profile) {
        const parsed = (code: Code) => code.deckProfileLine(code.parseGameState(state), code.knowledge);
        profile = { before: parsed(base), after: parsed(next), frames: 0, runs: new Set() };
        profiles.set(key, profile);
      }
      profile.frames += 1;
      profile.runs.add(run);
    }
  }
  const changedProfiles = [...profiles.values()].filter((profile) => profile.before !== profile.after);
  const out = {
    lines,
    entries,
    distinct_entries: seen.size,
    game_data: gameData,
    entries_changed: [...entryDiff.values()].map((info) => ({ ...info, runs: [...info.runs] })),
    frames,
    judge_frames: judgeFrames,
    strength_in_conditional: [...strengthInConditional],
    deck_profiles: {
      decks: profiles.size,
      frames: [...profiles.values()].reduce((sum, profile) => sum + profile.frames, 0),
      changed_decks: changedProfiles.length,
      changed_frames: changedProfiles.reduce((sum, profile) => sum + profile.frames, 0),
      changed_runs: [...new Set(changedProfiles.flatMap((profile) => [...profile.runs]))],
      examples: [...new Map(changedProfiles.map((profile) => [`${profile.before}\n${profile.after}`, { before: profile.before, after: profile.after }])).values()].slice(0, 12),
    },
  };
  writeFileSync(join(outDir, "scan.json"), `${JSON.stringify(out, null, 1)}\n`);
  console.log(`scan: ${lines} lines, ${entries} card entries (${seen.size} distinct); game-data cards changed: ${gameData.map((card) => card["card"]).join(", ") || "none"}; logged entries changed: ${[...new Set([...entryDiff.values()].map((info) => info.card))].join(", ") || "none"}; frames holding one: ${frames.length}; judge frames: ${judgeFrames.length}; deck profiles changed: ${changedProfiles.length} decks, ${out.deck_profiles.changed_frames} frames`);
}

/* ---- decisions --------------------------------------------------------------------------------------------- */

type Decision = import("../src/memory/types.js").Decision;
type AskDecision = import("../src/memory/types.js").AskDecision;
type AnswerSet = import("../src/reflex/jev/answers.js").AnswerSet;

function envOf(code: Code, raw: Row): import("../src/memory/types.js").DecisionEnv {
  const state = code.parseGameState(raw);
  return {
    state, knowledge: code.knowledge, brief: code.buildRunBrief(state, code.knowledge), screenMemory: code.createScreenMemory("COMBAT"), thresholds: code.config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
    thiefFacts: code.config.thiefFacts, thiefCost: code.config.thiefFacts && code.config.thiefCost, mechRules: code.config.mechRules,
  };
}

/** The steps of a line naming a hand card that needs a target without one ("小刀" where it should read "小刀 -> X"). */
function untargeted(plays: string, needTarget: Set<string>): string[] {
  return plays.split(", then ").filter((stepText) => needTarget.has(stepText.trim()));
}

/** A decision as data to compare (pile-cost-replay's view), with the gate on each option's first action and the untargeted steps. */
function viewOf(code: Code, raw: Row): Row {
  const plan = code.plan;
  plan.thiefTrace.enabled = true;
  plan.thiefTrace.last = null;
  const env = envOf(code, raw);
  const decision: Decision | null = plan.planCombatTurn(env);
  if (!decision) return { kind: null };
  const last = (plan.thiefTrace as { last: (typeof plan.thiefTrace)["last"] }).last;
  const mc = (last?.mcShown ?? []).map((entry) => ({
    potion: entry.source.potionId,
    beats: entry.beats,
    samples: entry.samples,
    median: entry.median ? { damage: entry.median.outcome.damageDealt, hpLoss: entry.median.outcome.hpLoss, steps: entry.median.steps.map((s) => s.name).join(", ") } : null,
  }));
  const boundOf = plan.drawBoundOf(plan.leastLossFactsOf(decision));
  const bound = boundOf ? boundOf() : null;
  const boundView = bound ? { refused: bound.refused, ...(bound.superset ? { cards: bound.superset.cards, allDie: bound.superset.allDie, aliveAfterDraw: bound.superset.aliveAfterDraw, inexact: bound.superset.inexact.length } : {}) } : null;
  const hand = list(record(raw["combat"])["hand"]).map(record);
  const needTarget = new Set(hand.filter((card) => card["requires_target"] === true).flatMap((card) => [String(card["name"] ?? ""), `${String(card["name"] ?? "")}+`]));
  const gateOf = (intent: import("../src/hand/mod/client.js").ActionRequest) => {
    const result = code.gate(env.state, intent);
    return result.ok ? "ok" : result.reason;
  };
  if (decision.kind !== "ask") return { kind: "act", label: decision.label, intent: decision.intent, gate: gateOf(decision.intent), mc, ...(boundView ? { bound: boundView } : {}) };
  const ask = decision as AskDecision;
  const criteria = (ask.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  const options = Object.fromEntries(Object.entries(criteria).filter(([key]) => /^(plan|p)\d+$/.test(key)).map(([key, text]) => [key, text ? (JSON.parse(text) as Row) : {}]));
  const rolloutBest = Object.keys(options).filter((key) => options[key]!["rollout_best"] === true);
  const resolveKey = (key: string) => ask.resolve({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.95 }, confidence: 0.95, raw: {} } } as unknown as AnswerSet);
  const intents = Object.fromEntries(Object.keys(options).map((key) => [key, resolveKey(key)?.intent ?? null]));
  const pickKey = rolloutBest[0] ?? Object.keys(options)[0];
  return {
    kind: "ask",
    label: ask.label,
    options: Object.fromEntries(Object.entries(options).map(([key, option]) => [key, String(option["plays"] ?? option["label"] ?? "")])),
    rollout: Object.fromEntries(Object.entries(options).map(([key, option]) => [key, option["rollout"] ?? null])),
    rollout_best: rolloutBest,
    mc,
    rollout_pick_intent: pickKey ? intents[pickKey] : null,
    intents,
    gates: Object.fromEntries(Object.entries(intents).map(([key, intent]) => [key, intent ? gateOf(intent) : null])),
    untargeted: Object.fromEntries(Object.entries(options).map(([key, option]) => [key, untargeted(String(option["plays"] ?? ""), needTarget)]).filter(([, steps]) => (steps as string[]).length > 0)),
    ...(boundView ? { bound: boundView } : {}),
  };
}

async function decisions(base: Code, next: Code): Promise<void> {
  const scanned = JSON.parse(readFileSync(join(outDir, "scan.json"), "utf8")) as { frames: Row[]; judge_frames: Row[]; strength_in_conditional: string[] };
  const affected = new Map(scanned.frames.map((frame) => [Number(frame["off"]), frame]));
  const judgeAt = new Map(scanned.judge_frames.map((frame) => [Number(frame["off"]), frame]));
  const runs = [...new Set(scanned.frames.map((frame) => String(frame["run"])))];
  const base_sql = `SELECT d.ts, d.run_id, d.floor, d.turn, d.label, d.decider, d.action, d.card_index, d.target_index, d.rationale, f.off, f.len
    FROM decisions d JOIN frames f ON f.run_id = d.run_id AND f.ts = d.ts AND coalesce(f.observed, false) = false
    WHERE d.screen = 'COMBAT' AND regexp_matches(d.label, '^${PLANNING}') AND f.in_combat`;
  const inRuns = runs.length > 0 ? query(`${base_sql} AND d.run_id IN (${runs.map((run) => `'${run}'`).join(", ")}) ORDER BY d.ts`) : [];
  const cases = inRuns.filter((row) => affected.has(Number(row["off"])));
  const sameRun = inRuns.filter((row) => !affected.has(Number(row["off"])));
  const sampled = controlCount > 0 ? query(`${base_sql} ${runs.length > 0 ? `AND d.run_id NOT IN (${runs.map((run) => `'${run}'`).join(", ")})` : ""} ORDER BY hash(d.ts) LIMIT ${controlCount}`) : [];
  const control = [...sameRun, ...sampled.filter((row) => !affected.has(Number(row["off"])))];
  const judgeRows = scanned.judge_frames.length > 0 ? query(`SELECT d.ts, d.run_id, d.floor, d.turn, d.label, f.off, f.len FROM decisions d JOIN frames f ON f.run_id = d.run_id AND f.ts = d.ts AND coalesce(f.observed, false) = false WHERE d.screen = 'COMBAT' AND d.label = 'combat/least-loss' AND f.off IN (${[...judgeAt.keys()].join(", ")}) ORDER BY d.ts`) : [];
  // The brain's decisions (every screen but combat) whose deck holds a card with its Strength only in a conditional: the
  // deck profile line of their facts (build-facts deck_profile).
  const profileIds = scanned.strength_in_conditional.flatMap((id) => [id, `${id}+`]);
  const profileRows = profileIds.length > 0 ? query(`SELECT d.ts, d.run_id, d.floor, d.label, d.label_head, f.off, f.len FROM decisions d JOIN frames f ON f.run_id = d.run_id AND f.ts = d.ts AND coalesce(f.observed, false) = false WHERE d.screen <> 'COMBAT' AND (${profileIds.map((id) => `list_contains(f.deck, '${id}')`).join(" OR ")}) ORDER BY d.ts`) : [];
  const fd = openSync(STATES, "r");
  const out = join(outDir, shards > 1 ? `results-${shard}.jsonl` : "results.jsonl");
  writeFileSync(out, "");
  let k = 0;
  for (const [set, rows] of [["affected", cases], ["control", control]] as const) {
    for (const row of rows) {
      if (k++ % shards !== shard) continue;
      const raw = stateAt(fd, Number(row["off"]), Number(row["len"]));
      let before: Row;
      let after: Row;
      try {
        before = viewOf(base, raw);
      } catch (e) {
        before = { error: String(e) };
      }
      try {
        after = viewOf(next, raw);
      } catch (e) {
        after = { error: String(e) };
      }
      const same = JSON.stringify(before) === JSON.stringify(after);
      const logged = { label: row["label"], decider: row["decider"], action: row["action"], card_index: row["card_index"], target_index: row["target_index"], rationale: String(row["rationale"] ?? "").slice(0, 160) };
      const result = { set, ts: row["ts"], run: row["run_id"], floor: row["floor"], turn: row["turn"], holding: affected.get(Number(row["off"]))?.["holding"] ?? [], logged, same };
      writeFileSync(out, `${JSON.stringify(same && set === "control" ? result : { ...result, before, after })}\n`, { flag: "a" });
    }
  }
  for (const row of judgeRows) {
    if (k++ % shards !== shard) continue;
    const raw = stateAt(fd, Number(row["off"]), Number(row["len"]));
    const verdictOf = (code: Code) => {
      const state = code.parseGameState(raw);
      const verdict = code.judge.judgeEndTurn(state, { label: code.judge.LEAST_LOSS_LABEL, revives: [], ethereal: (card) => code.cards.heldCardEthereal(card, code.knowledge), knowledge: code.knowledge });
      return { certain: verdict.certain, tier: verdict.tier, reason: verdict.reason.slice(0, 220) };
    };
    const before = verdictOf(base);
    const after = verdictOf(next);
    writeFileSync(out, `${JSON.stringify({ set: "judge", ts: row["ts"], run: row["run_id"], floor: row["floor"], turn: row["turn"], cards: judgeAt.get(Number(row["off"]))?.["cards"], same: JSON.stringify(before) === JSON.stringify(after), before, after })}\n`, { flag: "a" });
  }
  for (const row of profileRows) {
    if (k++ % shards !== shard) continue;
    const raw = stateAt(fd, Number(row["off"]), Number(row["len"]));
    const line = (code: Code) => code.deckProfileLine(code.parseGameState(raw), code.knowledge).split(" | ").pop() ?? "";
    const before = line(base);
    const after = line(next);
    writeFileSync(out, `${JSON.stringify({ set: "profile", ts: row["ts"], run: row["run_id"], floor: row["floor"], label: row["label"], label_head: row["label_head"], same: before === after, ...(before === after ? {} : { before, after }) })}\n`, { flag: "a" });
  }
  closeSync(fd);
  console.log(`decisions (shard ${shard}/${shards}): ${cases.length} affected, ${control.length} control (${sameRun.length} from the affected runs), ${judgeRows.length} least-loss judge rows, ${profileRows.length} brain decisions with the deck profile`);
}

/* ---- summary ----------------------------------------------------------------------------------------------- */

function summary(): void {
  const files = readdirSync(outDir).filter((name) => /^results(-\d+)?\.jsonl$/.test(name));
  const rows = files.flatMap((name) => readFileSync(join(outDir, name), "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row));
  rows.sort((a, b) => String(a["ts"]).localeCompare(String(b["ts"])));
  const scanned = existsSync(join(outDir, "scan.json")) ? (JSON.parse(readFileSync(join(outDir, "scan.json"), "utf8")) as Row) : {};
  const lines: string[] = [];
  const entriesChanged = list(scanned["entries_changed"]).map(record);
  lines.push(`scan: ${String(scanned["lines"])} state lines, ${String(scanned["entries"])} card entries (${String(scanned["distinct_entries"])} distinct)`);
  for (const card of list(scanned["game_data"]).map(record)) lines.push(`  game data ${String(card["card"])} (${String(card["target"])}, ${String(card["rarity"])}, ${String(card["color"])}): ${list(card["diffs"]).join("; ")}`);
  for (const entry of entriesChanged) lines.push(`  logged ${String(entry["card"])} at ${String(entry["path"])} (target_type ${String(entry["target"])}, requires_target ${String(entry["requires"])}; ${String(entry["frames"])} frames, ${list(entry["runs"]).length} runs): ${list(entry["diffs"]).join("; ")}`);
  lines.push(`  frames holding a changed card: ${list(scanned["frames"]).length}; hand frames the judge's draw test reads apart: ${list(scanned["judge_frames"]).length}`);
  const profiles = record(scanned["deck_profiles"]);
  lines.push(`  deck profile (cards whose Strength is only in a conditional: ${list(scanned["strength_in_conditional"]).join(", ") || "none"}): ${String(profiles["decks"])} decks on ${String(profiles["frames"])} frames, changed ${String(profiles["changed_decks"])} decks on ${String(profiles["changed_frames"])} frames (${list(profiles["changed_runs"]).length} runs)`);
  for (const example of list(profiles["examples"]).map(record).slice(0, 4)) lines.push(`    ${String(example["before"]).split(" | ").pop()} -> ${String(example["after"]).split(" | ").pop()}`);
  for (const set of ["affected", "control"]) {
    const of = rows.filter((row) => row["set"] === set);
    const changed = of.filter((row) => row["same"] !== true);
    const holdingOf = (row: Row) => [...new Set(list(row["holding"]).map((entry) => String(entry).split("@")[1]))].join("+") || "none";
    const kinds = new Map<string, [number, number]>();
    for (const row of of) {
      const [n, c] = kinds.get(holdingOf(row)) ?? [0, 0];
      kinds.set(holdingOf(row), [n + 1, c + (row["same"] === true ? 0 : 1)]);
    }
    lines.push(`${set}: ${of.length} planning decisions (${new Set(of.map((row) => row["run"])).size} runs), byte-identical ${of.length - changed.length}, changed ${changed.length}${set === "affected" ? `; by where the changed card is: ${[...kinds.entries()].map(([kind, [n, c]]) => `${kind} ${c} changed of ${n}`).join(", ")}` : ""}`);
    if (set !== "affected") {
      for (const row of changed) lines.push(`  CHANGED ${String(row["run"])} F${String(row["floor"])} T${String(row["turn"])} ${String(row["ts"])} ${String(record(row["logged"])["label"])}`);
      continue;
    }
    let refusedBefore = 0;
    let refusedAfter = 0;
    let untargetedBefore = 0;
    let untargetedAfter = 0;
    let pickRefusedBefore = 0;
    let pickRefusedAfter = 0;
    for (const row of of) {
      const before = record(row["before"]);
      const after = record(row["after"]);
      const refused = (view: Row) => (view["kind"] === "act" ? (view["gate"] === "ok" ? 0 : 1) : Object.values(record(view["gates"])).filter((gate) => gate !== "ok" && gate !== null).length);
      const unt = (view: Row) => Object.values(record(view["untargeted"])).length;
      const pickRefused = (view: Row) => {
        if (view["kind"] === "act") return view["gate"] === "ok" ? 0 : 1;
        const best = list(view["rollout_best"])[0];
        const key = typeof best === "string" ? best : Object.keys(record(view["gates"]))[0];
        return key && record(view["gates"])[key] !== "ok" ? 1 : 0;
      };
      refusedBefore += refused(before);
      refusedAfter += refused(after);
      untargetedBefore += unt(before);
      untargetedAfter += unt(after);
      pickRefusedBefore += pickRefused(before);
      pickRefusedAfter += pickRefused(after);
      if (row["same"] === true) continue;
      const logged = record(row["logged"]);
      const loggedText = `${String(logged["label"])} ${String(logged["action"])}${logged["card_index"] !== null && logged["card_index"] !== undefined ? ` card ${String(logged["card_index"])}` : ""}${logged["target_index"] !== null && logged["target_index"] !== undefined ? ` -> ${String(logged["target_index"])}` : ""}`;
      lines.push(`  ${String(row["run"])} F${String(row["floor"])} T${String(row["turn"])} ${String(row["ts"])} (${list(row["holding"]).join(", ")}) logged ${loggedText}${String(logged["rationale"]).startsWith("fallback after repeated illegal") ? " [the gate-refusal fallback]" : ""}`);
      const describe = (view: Row) =>
        view["kind"] === "act"
          ? `code ${String(view["label"])} ${JSON.stringify(view["intent"])} gate ${String(view["gate"])}`
          : `question ${String(view["label"])}, rollout pick ${JSON.stringify(view["rollout_best"])} ${JSON.stringify(view["rollout_pick_intent"])}; refused first actions ${refused(view)} of ${Object.keys(record(view["gates"])).length}; lines with an untargeted step ${unt(view)}`;
      lines.push(`    base: ${describe(before)}`);
      lines.push(`    new:  ${describe(after)}`);
      const options = (view: Row) => record(view["options"]);
      for (const key of new Set([...Object.keys(options(before)), ...Object.keys(options(after))])) {
        const a = String(options(before)[key] ?? "-");
        const b = String(options(after)[key] ?? "-");
        if (a !== b) lines.push(`      ${key}: ${a}\n         -> ${b}`);
      }
      if (JSON.stringify(before["rollout"]) !== JSON.stringify(after["rollout"])) lines.push(`      rollout numbers changed`);
      if (JSON.stringify(before["mc"]) !== JSON.stringify(after["mc"])) lines.push(`      random potions' Monte Carlo changed`);
      if (JSON.stringify(before["bound"]) !== JSON.stringify(after["bound"])) lines.push(`      any-draw bound ${JSON.stringify(before["bound"])} -> ${JSON.stringify(after["bound"])}`);
    }
    lines.push(`  options whose first action the gate refuses: ${refusedBefore} -> ${refusedAfter}; lines with a step needing a target and naming none: ${untargetedBefore} -> ${untargetedAfter}; the rollout pick (or code's action) refused: ${pickRefusedBefore} -> ${pickRefusedAfter}`);
  }
  const judge = rows.filter((row) => row["set"] === "judge");
  const verdictChanged = (row: Row) => record(row["before"])["certain"] !== record(row["after"])["certain"] || record(row["before"])["tier"] !== record(row["after"])["tier"];
  lines.push(`judge (logged least-loss decisions, a hand card the draw test reads apart): ${judge.length}; certain or tier changed ${judge.filter(verdictChanged).length}, only the reason ${judge.filter((row) => row["same"] !== true && !verdictChanged(row)).length}`);
  for (const row of judge.filter((entry) => entry["same"] !== true)) lines.push(`  ${String(row["run"])} F${String(row["floor"])} T${String(row["turn"])} ${String(row["ts"])} ${list(row["cards"]).join("; ")}: ${JSON.stringify(row["before"])} -> ${JSON.stringify(row["after"])}`);
  const profile = rows.filter((row) => row["set"] === "profile");
  const profileChanged = profile.filter((row) => row["same"] !== true);
  const byHead = new Map<string, [number, number]>();
  for (const row of profile) {
    const head = String(row["label_head"]);
    const [n, c] = byHead.get(head) ?? [0, 0];
    byHead.set(head, [n + 1, c + (row["same"] === true ? 0 : 1)]);
  }
  lines.push(`deck profile (the brain's decisions off combat with such a card in the deck): ${profile.length} in ${new Set(profile.map((row) => row["run"])).size} runs, the line changed on ${profileChanged.length} (${new Set(profileChanged.map((row) => row["run"])).size} runs): ${[...byHead.entries()].map(([head, [n, c]]) => `${head} ${c}/${n}`).join(", ")}`);
  const text = lines.join("\n");
  writeFileSync(join(outDir, "summary.txt"), `${text}\n`);
  console.log(text);
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  if (step === "summary") return summary();
  if (!baseDir || !existsSync(srcModule(join(baseDir, "src"), "screens/combat-plan.ts"))) throw new Error(`--base ${baseDir || "(missing)"}: no combat-plan.ts there (src/screens/ or src/reflex/)`);
  if (resolve(baseDir) === resolve(process.cwd())) throw new Error("--base is this tree: give the base's own copy");
  const base = await loadCode(baseDir, "base");
  const next = await loadCode(process.cwd(), "new");
  if (step === "scan") await scan(base, next);
  else if (step === "decisions") await decisions(base, next);
  else throw new Error(`unknown --step ${step}`);
}

await main();

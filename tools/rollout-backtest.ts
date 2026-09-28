/**
 * Offline backtest of the combat line evaluators (src/strategy/rollout.ts) on logged Jev decision points.
 * Nothing is played, no model API is called; reads logs/ and the committed knowledge files only.
 *
 * For every logged plan choice (decisions.jsonl combat/plan-choice[+potion], A7+, the first of each turn,
 * joined to its fight-value row for the fight's act/kind/encounter and the realised outcome) it rebuilds the
 * board from states.jsonl (the latest state with the decision's fingerprint), runs the live planner to get
 * the solver input and plans (turn-solver's solveTap), matches the offered plan1..N to the solver's plans
 * by their plays text, and evaluates the candidate lines (top 6 + diversity picks + every offered line) with
 *   (i)   the current solver score,
 *   (ii)  the line + the gated fight-value terminal,
 *   (iii) the 5-turn rollout + the gated terminal.
 * Pairing tests and the report are tools/build-fight-value.py rollout-report.
 *
 * Usage:
 *   npx tsx tools/rollout-backtest.ts extract [--logs DIR] [--rows PATH] [--work DIR]
 *   npx tsx tools/rollout-backtest.ts run [--work DIR] [--shard I --shards N] [--budget 1500] [--limit N] [--fold-dir DIR]
 * --fold-dir: out-of-fold models and gates (python3 tools/build-fight-value.py folds --fold-dir DIR); without it
 * the committed model, which was trained on these very fights, is used (in-sample: optimistic).
 * Output: <work>/decisions.jsonl (extract), <work>/eval-<I>.jsonl (run).
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { loadConfig } from "../src/config.js";
import { makeKnowledge, type Knowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { pileCardModels, planCombatTurn } from "../src/screens/combat-plan.js";
import { modelHandCard, type CardModel } from "../src/strategy/card-model.js";
import { loadFightValueModel, type FightValueModel } from "../src/strategy/fight-value.js";
import { loadFightValueGates, rolloutDecision, type FightValueGates, type EnemyTable, type FightMeta, type MoveModelData, type RolloutEnemy } from "../src/strategy/rollout.js";
import { solveTap, type Plan, type SolveResult, type SolverInput, type Step } from "../src/strategy/turn-solver.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const stage = process.argv[2] ?? "run";
const logs = arg("logs", existsSync("logs/states.jsonl") ? "logs" : join(homedir(), "Projects/sts2-jev/jev-sts2/logs"));
const rowsPath = arg("rows", ".cache/fight-value-rows.jsonl");
const work = arg("work", "/tmp/rollout-backtest");
mkdirSync(work, { recursive: true });

interface FvRow {
  fid: string;
  run: string;
  asc: number;
  act: number;
  floor: number;
  kind: string;
  enc: string;
  t: number;
  max_t: number;
  outcome: string;
  final_hp: number;
  deck: FightMeta["deck"];
  relics: number;
  max_en: number;
  S: { hp: number };
  E: { hp: number };
}

async function* lines(path: string): AsyncGenerator<string> {
  const reader = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of reader) if (line) yield line;
}

/** The value of `"key":"..."` near the start of a line (a JSON string, escapes kept), without parsing the line. */
function headString(line: string, key: string, limit = 20000): string | null {
  const at = line.indexOf(`"${key}":"`);
  if (at < 0 || at > limit) return null;
  let i = at + key.length + 4;
  const start = i - 1;
  while (i < line.length) {
    const c = line.charCodeAt(i);
    if (c === 92) i += 2;
    else if (c === 34) break;
    else i += 1;
  }
  return JSON.parse(line.slice(start, i + 1)) as string;
}

async function extract(): Promise<void> {
  const rows = new Map<string, FvRow>();
  for (const line of readFileSync(rowsPath, "utf8").split("\n")) {
    if (!line) continue;
    const r = JSON.parse(line) as FvRow;
    if (r.asc >= 7 && ["hallway", "elite", "boss"].includes(r.kind)) rows.set(`${r.run}|${r.floor}|${r.t}`, r);
  }
  const wanted = new Map<string, { key: string; ts: string; record: Record<string, unknown> }[]>();
  const seen = new Set<string>();
  let total = 0;
  for await (const line of lines(join(logs, "decisions.jsonl"))) {
    if (!line.includes('"combat/plan-choice')) continue;
    const d = JSON.parse(line) as Record<string, unknown>;
    if (!String(d["label"]).startsWith("combat/plan-choice")) continue;
    const fingerprint = String(d["fingerprint"]);
    const run = /"run":"([A-Za-z0-9_]+)"/.exec(fingerprint)?.[1] ?? "";
    const key = `${run}|${d["floor"]}|${d["turn"]}`;
    if (!rows.has(key) || seen.has(key)) continue;
    seen.add(key);
    total += 1;
    const list = wanted.get(fingerprint) ?? [];
    list.push({ key, ts: String(d["ts"]), record: d });
    wanted.set(fingerprint, list);
  }
  console.error(`decisions: ${total} first plan choices of A7+ turns with a fight-value row`);
  const found = new Map<string, string>();
  let scanned = 0;
  for await (const line of lines(join(logs, "states.jsonl"))) {
    scanned += 1;
    if (scanned % 20000 === 0) console.error(`  states scanned ${scanned}, found ${found.size}`);
    const fingerprint = headString(line, "fingerprint");
    if (fingerprint === null) continue;
    const list = wanted.get(fingerprint);
    if (!list) continue;
    const ts = headString(line, "ts") ?? "";
    for (const entry of list) if (ts <= entry.ts) found.set(entry.key, line);
  }
  const out = join(work, "decisions.jsonl");
  writeFileSync(out, "");
  let written = 0;
  for (const list of wanted.values()) {
    for (const entry of list) {
      const line = found.get(entry.key);
      if (!line) continue;
      const state = (JSON.parse(line) as { state: Record<string, unknown> }).state;
      // Keep what the planner reads; drop the map, glossary and other screens' payloads.
      for (const drop of ["map", "shop", "reward", "event", "rest", "chest", "timeline", "unlock", "character_select", "bundles", "capstone"]) delete state[drop];
      const view = state["agent_view"] as Record<string, unknown> | undefined;
      if (view) for (const drop of ["map", "glossary", "shop", "reward", "event", "rest", "chest", "timeline", "unlock", "character_select"]) delete view[drop];
      const r = rows.get(entry.key)!;
      const rec = entry.record;
      appendFileSync(
        out,
        JSON.stringify({
          key: entry.key,
          row: { fid: r.fid, run: r.run, asc: r.asc, act: r.act, floor: r.floor, kind: r.kind, enc: r.enc, t: r.t, deck: r.deck, relics: r.relics, max_en: r.max_en },
          decision: {
            ts: rec["ts"],
            label: rec["label"],
            decider: rec["decider"],
            rationale: rec["rationale"],
            chosen: rec["chosen"],
            answers: rec["answers"],
            criteria: ((rec["questions"] as Record<string, Record<string, unknown>> | undefined)?.["plan"]?.["criteria"] ?? {}) as Record<string, string>,
          },
          state,
        }) + "\n",
      );
      written += 1;
    }
  }
  console.error(`extract: ${written} decision boards -> ${out}`);
}

// ---------------------------------------------------------------- run

const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function stepText(step: Step): string {
  return step.targetName ? `${step.name} -> ${step.targetName}` : step.name;
}

function playsText(plan: Plan): string {
  return plan.steps.length === 0 ? "nothing (end the turn now)" : plan.steps.map(stepText).join(", then ");
}

interface MonsterDbMove {
  next?: Record<string, number>;
  damage_by_asc?: Record<string, { base_per_hit?: Record<string, number>; hits?: Record<string, number> }>;
  self_powers_gained?: Record<string, Record<string, number>>;
  block_gained?: Record<string, number>;
  avg_total_shown?: number;
}

function mode(counts: Record<string, number> | undefined): number | null {
  if (!counts) return null;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? Number(best[0]) : null;
}

function enemyTable(id: string, asc: number, db: Record<string, { moves?: Record<string, MonsterDbMove> }>, mm: MoveModelData): EnemyTable | undefined {
  const moves = db[id]?.moves;
  const learned = mm[id];
  if (!moves && !learned) return undefined;
  const table: EnemyTable = { moves: {}, next: {} };
  for (const [move, entry] of Object.entries(moves ?? {})) {
    const byAsc = entry.damage_by_asc ?? {};
    const key = byAsc[String(asc)] ? String(asc) : Object.keys(byAsc).sort((a, b) => Math.abs(Number(a) - asc) - Math.abs(Number(b) - asc))[0];
    const d = key ? byAsc[key] : undefined;
    const base = mode(d?.base_per_hit);
    const hits = mode(d?.hits) ?? 1;
    const avg = learned?.damage[move] ?? entry.avg_total_shown ?? 0;
    table.moves[move] = {
      damage: base ?? (avg > 0 ? avg / hits : 0),
      hits,
      strength: mode(entry.self_powers_gained?.["STRENGTH_POWER"]) ?? 0,
      block: mode(entry.block_gained) ?? 0,
    };
  }
  for (const [move, damage] of Object.entries(learned?.damage ?? {})) {
    if (!table.moves[move]) table.moves[move] = { damage, hits: 1, strength: 0, block: 0 };
  }
  table.next = learned?.next ?? Object.fromEntries(Object.entries(moves ?? {}).map(([m, e]) => [m, e.next ?? {}]));
  return table;
}

function powersOf(holder: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of asArray(holder["powers"])) {
    const power = asRecord(p);
    const id = String(power["power_id"] ?? "");
    if (id) out[id] = typeof power["amount"] === "number" ? (power["amount"] as number) : 1;
  }
  return out;
}

function deckModels(state: GameState, knowledge: Knowledge): CardModel[] {
  return asArray(asRecord(state.run?.raw)["deck"]).map((raw, i) => {
    const own = asRecord(raw);
    const info = knowledge.card(String(own["card_id"]));
    const model = modelHandCard({ ...own, target_type: info?.target ?? "", requires_target: info?.target === "AnyEnemy", playable: true, index: 900 + i }, 900 + i, knowledge);
    return { ...model, playable: model.type !== "Curse" && model.type !== "Status" && (model.xCost || model.cost >= 0) };
  });
}

const cardKey = (c: { cardId: string; upgraded: boolean }) => `${c.cardId}${c.upgraded ? "+" : ""}`;

async function run(): Promise<void> {
  const shard = Number(arg("shard", "0"));
  const shards = Number(arg("shards", "1"));
  const budget = Number(arg("budget", "1500"));
  const limit = Number(arg("limit", "0"));
  const out = join(work, `eval-${shard}.jsonl`);
  writeFileSync(out, "");
  const config = loadConfig(process.env);
  const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: never }).collections, "cache");
  const mm = JSON.parse(readFileSync("src/knowledge/move-model.json", "utf8")) as MoveModelData;
  const db = (JSON.parse(readFileSync("src/knowledge/monster-db.json", "utf8")) as { monsters: Record<string, { moves?: Record<string, MonsterDbMove> }> }).monsters;
  // --fold-dir (build-fight-value.py folds): each decision gets the model and gates that never saw its run.
  const foldDir = arg("fold-dir", "");
  const folds = foldDir ? (JSON.parse(readFileSync(join(foldDir, "folds.json"), "utf8")) as Record<string, number>) : null;
  const foldModels = folds ? [0, 1, 2, 3, 4].map((k) => JSON.parse(readFileSync(join(foldDir, `fight-value-${k}.json`), "utf8")) as FightValueModel) : [];
  const foldGates = folds ? [0, 1, 2, 3, 4].map((k) => JSON.parse(readFileSync(join(foldDir, `gates-${k}.json`), "utf8")) as FightValueGates) : [];
  const committedModel = loadFightValueModel();
  const committedGates = loadFightValueGates();
  let index = -1;
  let done = 0;
  for await (const line of lines(join(work, "decisions.jsonl"))) {
    index += 1;
    if (index % shards !== shard) continue;
    if (limit && done >= limit) break;
    const item = JSON.parse(line) as {
      key: string;
      row: FvRow;
      decision: { ts: string; label: string; decider: string; rationale: string; answers?: Record<string, Record<string, unknown>>; criteria: Record<string, string> };
      state: Record<string, unknown>;
    };
    const base = { key: item.key, run: item.row.run, floor: item.row.floor, turn: item.row.t, fid: item.row.fid, kind: item.row.kind, act: item.row.act, enc: item.row.enc, decider: item.decision.decider, label: item.decision.label };
    let captured: { input: SolverInput; result: SolveResult } | null = null;
    let state: GameState;
    try {
      state = parseGameState(item.state);
      const env: DecisionEnv = {
        state,
        knowledge,
        brief: buildRunBrief(state, knowledge),
        screenMemory: createScreenMemory("COMBAT"),
        thresholds: config.thresholds,
        runStart: "auto",
        characterPreference: null,
        allowFtueModals: false,
        strictJev: true,
        combatPlanner: "turn",
        shopDiscardPotions: [],
        jevContext: "off",
        fightPlan: "off",
      };
      solveTap.onSolve = (input, result) => {
        captured = { input, result };
      };
      planCombatTurn(env);
    } catch (error) {
      appendFileSync(out, JSON.stringify({ ...base, error: `plan: ${String(error)}` }) + "\n");
      continue;
    } finally {
      solveTap.onSolve = null;
    }
    const cap = captured as { input: SolverInput; result: SolveResult } | null;
    if (!cap || cap.result.plans.length === 0) {
      appendFileSync(out, JSON.stringify({ ...base, error: "no solve" }) + "\n");
      continue;
    }
    const { input, result } = cap;
    // Offered plans (plan1..N) -> solver plans, by plays text (first match not yet taken, same HP loss preferred).
    const offered: { name: string; plays: string; hpLost: number; plan: Plan | null }[] = Object.entries(item.decision.criteria)
      .filter(([k]) => /^plan\d+$/.test(k))
      .sort((a, b) => Number(a[0].slice(4)) - Number(b[0].slice(4)))
      .map(([name, text]) => {
        const facts = JSON.parse(text) as Record<string, unknown>;
        return { name, plays: String(facts["plays"] ?? ""), hpLost: Number(facts["hp_lost"] ?? NaN), plan: null };
      });
    const taken = new Set<Plan>();
    for (const offer of offered) {
      const same = result.plans.filter((p) => !taken.has(p) && playsText(p) === offer.plays);
      const pick = same.find((p) => p.outcome.hpLoss === offer.hpLost) ?? same[0] ?? null;
      if (pick) {
        taken.add(pick);
        offer.plan = pick;
      }
    }
    // The line played: the HP guard's replacement, else Jev's (or the fallback's) choice.
    const guard = /playing plan (\d+) \(/.exec(item.decision.rationale ?? "");
    const choice = String(item.decision.answers?.["plan"]?.["choice"] ?? "");
    const playedName = guard ? `plan${guard[1]}` : /^plan\d+$/.test(choice) ? choice : /chose plan (\d+)\//.exec(item.decision.rationale ?? "")?.[1] ? `plan${/chose plan (\d+)\//.exec(item.decision.rationale)![1]}` : null;
    const played = offered.find((o) => o.name === playedName)?.plan ?? null;

    // Rollout input.
    const combat = asRecord(state.raw["combat"]);
    const enemies: RolloutEnemy[] = asArray(combat["enemies"])
      .map(asRecord)
      .filter((e) => e["is_alive"] !== false)
      .map((e, i) => {
        const powers = powersOf(e);
        return { index: typeof e["index"] === "number" ? (e["index"] as number) : i, id: String(e["enemy_id"] ?? ""), move: e["move_id"] ? String(e["move_id"]) : null, strength: powers["STRENGTH_POWER"] ?? 0, powers };
      });
    const tables: Record<string, EnemyTable> = {};
    for (const e of enemies) {
      const t = enemyTable(e.id, item.row.asc, db, mm);
      if (t) tables[e.id] = t;
    }
    const deck = deckModels(state, knowledge);
    const baseByKey = new Map(deck.map((c) => [cardKey(c), c]));
    const targets = input.enemies.filter((e) => e.hp > 0).map((e) => e.index);
    const pileCtx = { enemyTargets: targets, strength: 0, weak: false };
    const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
    const hasPiles = Array.isArray(view["draw"]) || Array.isArray(view["discard"]);
    let draw = hasPiles ? pileCardModels(state, knowledge, "draw", pileCtx) : [];
    const discard = hasPiles ? pileCardModels(state, knowledge, "discard", pileCtx) : [];
    if (!hasPiles) {
      // No piles in the log: the deck minus the hand (an approximation; the discard pile is unknown).
      const left = [...deck];
      for (const card of input.hand) {
        const at = left.findIndex((c) => cardKey(c) === cardKey(card));
        if (at >= 0) left.splice(at, 1);
      }
      draw = left;
    }
    const handBase = input.hand.map((card) => (card.type === "Potion" ? null : baseByKey.get(cardKey(card)) ?? null));
    const player = asRecord(combat["player"]);
    const potions = asArray(asRecord(state.run?.raw)["potions"]).filter((p) => asRecord(p)["occupied"]).length;
    const meta: FightMeta = { act: item.row.act, t: item.row.t, asc: item.row.asc, kind: item.row.kind as FightMeta["kind"], enc: item.row.enc, deck: item.row.deck, relics: item.row.relics, max_en: item.row.max_en };
    const include = offered.map((o) => o.plan).filter((p): p is Plan => p !== null);
    const fold = folds?.[item.row.run];
    const model = fold === undefined ? committedModel : foldModels[fold]!;
    const gates = fold === undefined ? committedGates : foldGates[fold]!;
    const started = performance.now();
    let res;
    try {
      res = rolloutDecision({
        solver: input,
        plans: result.plans,
        enemies,
        tables,
        piles: { draw, discard, handBase },
        meta,
        playerPowers: powersOf(player),
        potions,
        mm,
        model,
        gates,
        options: { budgetMs: budget, seed: 1 + index, include },
      });
    } catch (error) {
      appendFileSync(out, JSON.stringify({ ...base, error: `rollout: ${String(error).slice(0, 300)}` }) + "\n");
      continue;
    }
    const ms = performance.now() - started;
    const offerName = new Map(offered.filter((o) => o.plan).map((o) => [o.plan!, o.name]));
    appendFileSync(
      out,
      JSON.stringify({
        ...base,
        fold: fold ?? null,
        hp: input.player.hp,
        maxHp: input.player.maxHp,
        piles: hasPiles ? "logged" : "deck-minus-hand",
        drawN: draw.length,
        nPlans: result.plans.length,
        solveNodes: result.nodes,
        offered: offered.length,
        matched: offered.filter((o) => o.plan).length,
        played: playedName,
        playedMatched: played !== null,
        ms: Math.round(ms),
        horizon: res.horizon,
        samples: res.samples,
        degraded: res.degraded,
        policyTurns: res.policyTurns,
        policyMs: Math.round(res.policyMs),
        policyNodes: res.policyNodes,
        lines: res.lines.map((l) => ({
          plays: playsText(l.plan),
          tags: l.tags,
          offer: offerName.get(l.plan) ?? null,
          played: l.plan === played,
          score: +l.score.toFixed(2),
          cur: +l.currentValue.toFixed(2),
          hpLoss0: l.plan.outcome.hpLoss,
          own0: Math.max(0, l.plan.outcome.hpLoss - l.plan.outcome.incomingAfterBlock),
          dmg0: l.plan.outcome.damageDealt,
          win0: l.plan.outcome.winsFight,
          ii: +l.oneTurn.value.toFixed(2),
          iiModel: l.oneTurn.modelValue === null ? null : +l.oneTurn.modelValue.toFixed(2),
          iiLoss: +l.oneTurn.hpLoss.toFixed(2),
          iiWin: +l.oneTurn.winProb.toFixed(4),
          iii: +l.value.toFixed(2),
          iiiModel: l.valueModelTerminal === null ? null : +l.valueModelTerminal.toFixed(2),
          iiiLoss: +l.hpLoss.toFixed(2),
          iiiWin: +l.winProb.toFixed(4),
          iiiTurns: +l.turnsToWin.toFixed(2),
          iiLossM: l.modelForecast.oneTurn ? +l.modelForecast.oneTurn.hpLoss.toFixed(2) : null,
          iiWinM: l.modelForecast.oneTurn ? +l.modelForecast.oneTurn.winProb.toFixed(4) : null,
          iiiLossM: l.modelForecast.rollout ? +l.modelForecast.rollout.hpLoss.toFixed(2) : null,
          iiiWinM: l.modelForecast.rollout ? +l.modelForecast.rollout.winProb.toFixed(4) : null,
          w: l.basis.w,
          seg: l.basis.segment,
          modelN: l.basis.modelN,
        })),
      }) + "\n",
    );
    done += 1;
  }
  console.error(`run shard ${shard}/${shards}: ${done} decisions -> ${out}`);
}

if (stage === "extract") await extract();
else await run();

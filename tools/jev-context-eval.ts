/**
 * Offline evaluation of Jev's combat context (M1, JEV_CONTEXT): recorded combat boards where the turn
 * planner asks Jev a plan choice, each asked three ways:
 *
 *   baseline    — the question as it is today (JEV_CONTEXT=off)
 *   tags        — v1 fact tags on every plan and the combat-trimmed brief, no fight hints
 *   tags_hints  — the full v1 view (tags, trimmed brief, fight hints)
 *
 * Metrics per variant: mean extra predicted HP lost vs the min-loss option, mean damage of the pick,
 * share of lasting_value picks on boards that have a setup_turn option, agreement with code rank 1,
 * and Jev's confidence distribution. Nothing is played; only Jev is called.
 *
 * Usage: npx tsx tools/jev-context-eval.ts [--states logs/states.jsonl] [--boards 120] [--max-calls 360]
 *        [--tail-mb 200] [--concurrency 4] [--out logs/jev-context-eval.json]
 */
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

import { loadConfig, requireJevApiKey } from "../src/config.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { JevClient } from "../src/jev/client.js";
import type { QuestionSet } from "../src/jev/questions.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import type { JsonValue } from "../src/util/json.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const statesPath = arg("states", "logs/states.jsonl");
const maxBoards = Number(arg("boards", "120"));
const maxCalls = Number(arg("max-calls", "360"));
const tailBytes = Number(arg("tail-mb", "200")) * 1024 * 1024;
const concurrency = Number(arg("concurrency", "4"));
const outPath = arg("out", "logs/jev-context-eval.json");

if (existsSync(".env")) (process as NodeJS.Process & { loadEnvFile?: (file?: string) => void }).loadEnvFile?.(".env");
const config = loadConfig(process.env);
const jev = new JevClient({
  apiKey: requireJevApiKey(config),
  baseUrl: config.jev.baseUrl,
  model: config.jev.model,
  timeoutMs: config.jev.timeoutMs,
  maxRetries: config.jev.maxRetries,
});
const knowledge = makeKnowledge(JSON.parse(readFileSync(".cache/game-data.json", "utf8")).collections, "cache");

type Variant = "baseline" | "tags" | "tags_hints";
const VARIANTS: Variant[] = ["baseline", "tags", "tags_hints"];

interface OptionInfo {
  key: string;
  isPlan: boolean;
  hpLost: number;
  damage: number;
  wins: boolean;
  lasting: boolean;
  setupTurn: boolean;
}

interface Board {
  id: string;
  run: string;
  floor: number | null;
  turn: number | null;
  label: string;
  fight: string;
  hints: string[];
  options: OptionInfo[];
  views: Record<Variant, { state: Record<string, JsonValue>; questions: QuestionSet }>;
}

function optionInfo(decision: AskDecision): OptionInfo[] {
  const base = decision.questions["plan"];
  const tagged = decision.jevView?.questions["plan"];
  if (base?.type !== "choice" || tagged?.type !== "choice") return [];
  return Object.entries(base.criteria).map(([key, text]) => {
    const plain = JSON.parse(String(text)) as Record<string, unknown>;
    const facts = JSON.parse(String(tagged.criteria[key])) as Record<string, unknown>;
    const isPlan = key.startsWith("plan");
    return {
      key,
      isPlan,
      hpLost: isPlan ? Number(plain["hp_lost"]) : NaN,
      damage: isPlan ? Number(plain["damage_dealt"]) : NaN,
      wins: String(plain["result"] ?? "").startsWith("wins the fight"),
      lasting: plain["lasting_value"] !== undefined,
      setupTurn: facts["setup_turn"] === true,
    };
  });
}

/** Stream the tail of the states log and keep the distinct combat boards that ask Jev a plan choice. */
async function collectBoards(): Promise<Board[]> {
  const size = statSync(statesPath).size;
  const start = Math.max(0, size - tailBytes);
  const lines = createInterface({ input: createReadStream(statesPath, { start, encoding: "utf8" }), crlfDelay: Infinity });
  const seen = new Set<string>();
  const boards: Board[] = [];
  let first = start > 0;
  let scanned = 0;
  for await (const line of lines) {
    if (first) {
      first = false; // a partial line
      continue;
    }
    if (!line.includes('"screen":"COMBAT"')) continue;
    let entry: { screen?: string; state?: Record<string, unknown> };
    try {
      entry = JSON.parse(line) as typeof entry;
    } catch {
      continue;
    }
    if (entry.screen !== "COMBAT" || !entry.state) continue;
    scanned += 1;
    const state = parseGameState(entry.state);
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
      jevContext: "v1",
    };
    let decision;
    try {
      decision = planCombatTurn(env);
    } catch {
      continue;
    }
    if (decision?.kind !== "ask" || !decision.label.startsWith("combat/plan-choice") || !decision.jevView) continue;
    const key = `${state.run_id}|${state.run?.floor}|${state.turn}|${JSON.stringify(decision.questions)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const tagsState = { ...decision.jevView.state };
    delete tagsState["fight_hints"];
    boards.push({
      id: `${state.run_id}:F${state.run?.floor ?? "?"}:T${state.turn ?? "?"}:${boards.length}`,
      run: state.run_id,
      floor: state.run?.floor ?? null,
      turn: state.turn,
      label: decision.label,
      fight: String(decision.state["fight"]),
      hints: decision.jevView.hints,
      options: optionInfo(decision),
      views: {
        baseline: { state: decision.state, questions: decision.questions },
        tags: { state: tagsState, questions: decision.jevView.questions },
        tags_hints: { state: decision.jevView.state, questions: decision.jevView.questions },
      },
    });
  }
  console.log(`scanned ${scanned} combat states in the last ${(tailBytes / 1024 / 1024).toFixed(0)} MB; ${boards.length} distinct plan-choice boards (${boards.filter((board) => board.hints.length > 0).length} with fight hints)`);
  return boards;
}

/**
 * Evenly spaced sample. Boards with a setup_turn option (rare: ~5 in 120 evenly spread) get up to a
 * quarter of the sample, boards with fight hints up to half, the rest fill it.
 */
function sample(boards: Board[], n: number): Board[] {
  if (boards.length <= n) return boards;
  const setup = spread(boards.filter((board) => board.options.some((option) => option.setupTurn)), Math.floor(n / 4));
  const left = boards.filter((board) => !setup.includes(board));
  const hinted = spread(left.filter((board) => board.hints.length > 0), Math.floor(n / 2) - setup.filter((board) => board.hints.length > 0).length);
  const rest = left.filter((board) => board.hints.length === 0);
  return [...setup, ...hinted, ...spread(rest, n - setup.length - hinted.length)];
}

function spread<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  return Array.from({ length: n }, (_, i) => items[Math.floor((i * items.length) / n)]!);
}

interface Pick {
  choice: string;
  confidence: number;
  latencyMs: number;
  inputTokens: number;
  error?: string;
}

async function main(): Promise<void> {
  const boards = sample(await collectBoards(), maxBoards);
  if (process.argv.includes("--show")) {
    const shown = boards.find((board) => board.hints.length > 0) ?? boards[0];
    if (shown) console.log(JSON.stringify(shown.views.tags_hints, null, 1));
  }
  const calls: { board: Board; variant: Variant }[] = [];
  for (const board of boards) for (const variant of VARIANTS) calls.push({ board, variant });
  const capped = calls.slice(0, Math.floor(Math.min(calls.length, maxCalls) / 3) * 3);
  console.log(`asking Jev: ${capped.length} calls over ${capped.length / 3} boards (cap ${maxCalls})`);
  const picks = new Map<string, Pick>();
  let next = 0;
  let done = 0;
  const worker = async (): Promise<void> => {
    while (next < capped.length) {
      const { board, variant } = capped[next++]!;
      try {
        const result = await jev.ask(board.views[variant].state, board.views[variant].questions);
        const answer = (result.answers as AnswerSet)["plan"];
        picks.set(`${board.id}|${variant}`, {
          choice: answer?.type === "choice" ? answer.choice : "",
          confidence: answer?.type === "choice" ? answer.confidence : 0,
          latencyMs: result.latencyMs,
          inputTokens: result.inputTokens,
        });
      } catch (error) {
        picks.set(`${board.id}|${variant}`, { choice: "", confidence: 0, latencyMs: 0, inputTokens: 0, error: error instanceof Error ? error.message : String(error) });
      }
      done += 1;
      if (done % 30 === 0) console.log(`  ${done}/${capped.length}`);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));

  const evaluated = boards.slice(0, capped.length / 3);
  const summarize = (variant: Variant, subset: Board[]) => {
    const extra: number[] = [];
    const damage: number[] = [];
    const confidences: number[] = [];
    const latency: number[] = [];
    const tokens: number[] = [];
    let agree = 0;
    let answered = 0;
    let potionPicks = 0;
    let setupBoards = 0;
    let setupLasting = 0;
    let errors = 0;
    for (const board of subset) {
      const pick = picks.get(`${board.id}|${variant}`);
      if (!pick || pick.error) {
        errors += 1;
        continue;
      }
      const chosen = board.options.find((option) => option.key === pick.choice);
      if (!chosen) continue;
      answered += 1;
      confidences.push(pick.confidence);
      latency.push(pick.latencyMs);
      tokens.push(pick.inputTokens);
      if (pick.choice === "plan1") agree += 1;
      if (!chosen.isPlan) {
        potionPicks += 1;
        continue;
      }
      const plans = board.options.filter((option) => option.isPlan);
      const minLoss = Math.min(...plans.map((option) => option.hpLost));
      extra.push(chosen.wins ? 0 : chosen.hpLost - minLoss);
      damage.push(chosen.damage);
      if (plans.some((option) => option.setupTurn)) {
        setupBoards += 1;
        if (chosen.lasting) setupLasting += 1;
      }
    }
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    const sorted = [...confidences].sort((a, b) => a - b);
    const bucket = (lo: number, hi: number) => confidences.filter((c) => c >= lo && c < hi).length;
    return {
      boards: subset.length,
      answered,
      errors,
      mean_extra_hp_vs_min_loss: mean(extra),
      mean_damage: mean(damage),
      potion_picks: potionPicks,
      setup_boards: setupBoards,
      lasting_share_on_setup_boards: setupBoards ? setupLasting / setupBoards : null,
      agree_code_rank1: answered ? agree / answered : null,
      confidence: {
        mean: mean(confidences),
        median: sorted.length ? sorted[Math.floor(sorted.length / 2)]! : null,
        "<0.3": bucket(0, 0.3),
        "0.3-0.5": bucket(0.3, 0.5),
        "0.5-0.75": bucket(0.5, 0.75),
        ">=0.75": bucket(0.75, 1.01),
      },
      mean_latency_ms: mean(latency),
      mean_input_tokens: mean(tokens),
    };
  };

  const hinted = evaluated.filter((board) => board.hints.length > 0);
  const summary = Object.fromEntries(VARIANTS.map((variant) => [variant, summarize(variant, evaluated)]));
  const summaryHinted = Object.fromEntries(VARIANTS.map((variant) => [variant, summarize(variant, hinted)]));
  const flips = (a: Variant, b: Variant) =>
    evaluated.filter((board) => {
      const pa = picks.get(`${board.id}|${a}`);
      const pb = picks.get(`${board.id}|${b}`);
      return pa && pb && !pa.error && !pb.error && pa.choice !== pb.choice;
    }).length;
  const report = {
    generated: new Date().toISOString(),
    model: config.jev.model,
    states: statesPath,
    tail_mb: tailBytes / 1024 / 1024,
    calls: capped.length,
    boards: evaluated.length,
    hinted_boards: hinted.length,
    picks_changed: { baseline_vs_tags: flips("baseline", "tags"), tags_vs_tags_hints: flips("tags", "tags_hints"), baseline_vs_tags_hints: flips("baseline", "tags_hints") },
    summary,
    summary_hinted_boards: summaryHinted,
    per_board: evaluated.map((board) => ({
      id: board.id,
      label: board.label,
      fight: board.fight,
      hints: board.hints,
      options: board.options,
      picks: Object.fromEntries(VARIANTS.map((variant) => [variant, picks.get(`${board.id}|${variant}`) ?? null])),
    })),
  };
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  const fmt = (value: number | null, digits = 2) => (value === null ? "-" : value.toFixed(digits));
  const table = (title: string, rows: Record<string, ReturnType<typeof summarize>>) => {
    console.log(`\n${title}`);
    console.log("variant      boards  extraHP  dmg    lasting@setup   agree#1  conf(mean/med)  <.3/.3-.5/.5-.75/>=.75  tokens  potion");
    for (const variant of VARIANTS) {
      const s = rows[variant]!;
      console.log(
        `${variant.padEnd(12)} ${String(s.answered).padStart(6)}  ${fmt(s.mean_extra_hp_vs_min_loss).padStart(7)}  ${fmt(s.mean_damage, 1).padStart(5)}  ${`${fmt(s.lasting_share_on_setup_boards)} (n=${s.setup_boards})`.padStart(14)}  ${fmt(s.agree_code_rank1).padStart(7)}  ${`${fmt(s.confidence.mean)}/${fmt(s.confidence.median)}`.padStart(14)}  ${`${s.confidence["<0.3"]}/${s.confidence["0.3-0.5"]}/${s.confidence["0.5-0.75"]}/${s.confidence[">=0.75"]}`.padStart(22)}  ${fmt(s.mean_input_tokens, 0).padStart(6)}  ${String(s.potion_picks).padStart(6)}`,
      );
    }
  };
  table(`All boards (${evaluated.length})`, summary);
  table(`Boards with fight hints (${hinted.length})`, summaryHinted);
  console.log(`\npicks changed: ${JSON.stringify(report.picks_changed)}`);
  console.log(`wrote ${outPath}`);
}

await main();

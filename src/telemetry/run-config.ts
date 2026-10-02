/**
 * The configuration each run was played with (V4 M4, docs/eval.md §2 and §8): one JSONL row per run in
 * logs/run-config.jsonl (RUN_CONFIG_LOG; "off" writes nothing), written when the loop first sees a new run id.
 * runs.jsonl only knows the code commit; V4's decisions also depend on the environment (BRAIN_ENGINE, per-kind
 * overrides, models, KNOWLEDGE_PREFIX, JEV_CONTEXT, ...), so the evaluator (tools/logdb table run_config,
 * tools/eval/metrics.py --group-by config) reads them from here.
 *
 * - What is written is built field by field from the parsed configuration (a whitelist): API keys, key files and
 *   base URLs are never part of it. Before a row is appended its text is checked against every secret the process
 *   holds (the configured keys and any *KEY* / *TOKEN* / *SECRET* / *PASSWORD* environment value) and against
 *   key-shaped strings; a row that would carry one is not written, and the note names the variable, not the value.
 * - Once per run: a run id is handled once per process, and a restarted process (auto-relaunch mid-run) writes
 *   again only when its configuration differs from a row already in the file for that run (`restart: true`).
 * - The code is read once, when the process starts (the code that runs is the code loaded then): HEAD, branch and
 *   whether tracked files differ from HEAD (ops/run.sh's `+dirty`: after every run the knowledge data is refreshed
 *   in the run worktree), with one `git status` call.
 * - KNOWLEDGE_PREFIX=full: the prefix is rendered for the run's ascension through the brain's own KnowledgePrompt,
 *   so it is the same render (and cache) the run's first question uses; its hash equals that question's brain.jsonl
 *   knowledge.prefix_sha. The brain re-renders the prefix whenever the knowledge files or the lessons change
 *   (brain/knowledge.ts), which a refresh after the last run often does in the next run's first minutes (fix-queue-v4
 *   #10: 1-2 system prompts a run start, WLM6YKJ0ASNE): the row says so (knowledge.prefix_note), and the prefix a
 *   call used is its own brain.jsonl row's. The prefix and system hashes are knowledge data, not configuration: they
 *   are left out of config_sha, so a restart after a knowledge refresh is not a "configuration changed mid-run".
 *   Token counts are estimates from the M1 replay's measured ratios (TOKENS_PER_CHAR).
 * - Never throws: a failure is a note and the run goes on.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Brain } from "../brain/brain.js";
import { KNOWLEDGE_DIR } from "../brain/brain.js";
import { claudeModelId } from "../brain/engines/claude.js";
import { estimateTokens, prefixSizeWarning } from "../brain/knowledge.js";
import type { EngineName } from "../brain/types.js";
import type { AppConfig } from "../config.js";
import { DEFAULT_CLAUDE_MODEL } from "../config.js";
import { isMenuRunId } from "../project/journal-replay.js";
import { str, type JsonValue } from "../util/json.js";
import { resolveJevPromptLog } from "./jev-prompt-log.js";

/** The repository this module runs from (src/telemetry -> the checkout's root). */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// The prefix's token estimate lives with the prefix (brain/knowledge.ts); re-exported for the evaluator's tests.
export { estimateTokens, TOKENS_PER_CHAR } from "../brain/knowledge.js";

/** How far back the file is read to find an earlier row of the same run (a restart writes soon after it). */
const TAIL_BYTES = 2 * 1024 * 1024;
const MAX_DIRTY_FILES = 20;
/** Environment variables whose values are secrets whatever their name says (key files: their paths too). */
const SECRET_NAME = /(API_?KEY|_KEY_FILE|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL)/i;
/** Values shorter than this are not compared (a test's "test" key would match unrelated text). */
const MIN_SECRET_LENGTH = 12;
const KEY_SHAPE = /(sk-(?:ant-)?[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/-]{16,})/;

export interface CodeInfo {
  /** HEAD's full commit id; null when git could not be asked. */
  commit: string | null;
  /** HEAD's short id, plus "+dirty" when tracked files differ from it (ops/run.sh's format, runs.jsonl `code`). */
  code: string | null;
  dirty: boolean | null;
  /** The changed tracked paths (names only, at most 20): after a run these are the refreshed knowledge files. */
  dirty_files: string[];
  /** The checked-out branch; null when detached. */
  branch: string | null;
  /** The checkout's directory name (jev-sts2-v3, jev-sts2-v4run, ...). */
  worktree: string;
  error?: string;
}

export interface EngineSnapshot {
  /** The model id this engine sends (DeepSeek: DEEPSEEK_MODEL; Claude: its pinned id, e.g. opus -> claude-opus-5-5). */
  model: string | null;
  /** BRAIN_<ENGINE>_MODEL_<PREFIX>, as sent. */
  model_by_prefix: Record<string, string>;
  timeout_ms: number | null;
  effort: string | null;
  /** BRAIN_<ENGINE>_REASK (null: the router's default for the engine). */
  reask: boolean | null;
  /** Whether the engine gets the tool list (the router's rule). */
  tools: boolean;
  /** Its call budget per process: BRAIN_<ENGINE>_MAX_CALLS; DeepSeek: DEEPSEEK_MAX_CALLS (the loop's). null: none. */
  max_calls: number | null;
}

export interface RunConfigRow {
  ts: string;
  run_id: string;
  ascension: number | null;
  character: string | null;
  /** The floor this process first saw the run on: above 1 when it joined a run in progress (a restart). */
  floor: number | null;
  /** The file already had a row for this run, with another configuration (a restart with changed settings). */
  restart: boolean;
  process: { pid: number; started: string };
  code: CodeInfo;
  brain: {
    /** False when there is no DeepSeek client (no key): then no brain question is asked at all. */
    active: boolean;
    engine: EngineName;
    by_prefix: Record<string, EngineName>;
    fallback: EngineName | null;
    reask: boolean | null;
    tools: boolean | null;
    /** brain.jsonl's path; null when switched off. */
    log: string | null;
    /** The engines this configuration can ask: the default, the per-kind ones and the fallback. */
    engines: Partial<Record<EngineName, EngineSnapshot>>;
    /** When Claude is among them: its schema mode and per-call budget. */
    claude?: { schema: string; max_budget_usd: number | null };
  };
  knowledge: {
    prefix: "off" | "full";
    /** The ascension the prompt was rendered for (the run's). */
    ascension: number | null;
    /** KNOWLEDGE_PREFIX=full: the prefix rendered at this run's start (its first brain.jsonl row's knowledge.prefix_sha). */
    prefix_sha: string | null;
    /** KNOWLEDGE_PREFIX=full: that the prefix may be re-rendered mid-run, and where each call's is (PREFIX_NOTE). */
    prefix_note?: string;
    prefix_chars: number | null;
    prefix_tokens_est: { deepseek: number; claude: number } | null;
    /** The system prompt the brain sends at this run's start (brain.jsonl system_sha): v3's when off. */
    system_sha: string | null;
    system_chars: number | null;
    /** src/knowledge/experience.json's version. */
    experience_version: string | null;
    /** Why the prefix or the prompt could not be rendered (then v3's prompt goes out, knowledge.ts). */
    error?: string;
  };
  /** The DeepSeek client (null without a key). */
  deepseek: { model: string; max_calls: number; timeout_ms: number; reasoning_effort: string; combat_reasoning_effort: string; effort_by_label: string | null } | null;
  /** prompt_log: jev-prompts.jsonl's path, null when switched off. */
  jev: { enabled: boolean; model: string; context: string; strict: boolean; prompt_log: string | null };
  loop: {
    mode: string;
    combat_planner: string;
    build_decider: string;
    build_oneshot: string;
    /** B3: the act boss simulated for each option of a deck-building question (BOSS_SIM_BUILD). */
    boss_sim_build: string;
    combat_deepseek: string;
    /** THIEF_FACTS (docs/thief.md): the thieves' facts, escape and kill-line coverage on the combat question. */
    thief_facts: boolean;
    /** THIEF_COST (docs/thief.md §7): the thieves' loot as HP in the combat ranking (default off). */
    thief_cost: boolean;
    fight_plan: string;
    run_plan: string;
    escalation: string[];
    confidence: { act: number; strong: number };
    run_start: string;
    character: string | null;
  };
  /** TARGET_ASCENSION (screens/misc.ts holds the ascension there); null when unset. */
  target_ascension: number | null;
  /** ARM: the ablation arm ops/run.sh set, when one is running. */
  arm: string | null;
  /** When the configuration asks Claude: the program the brain runs and its start-up check (Brain.preflight). */
  claude_check?: { bin: string; ok: boolean; version?: string; error?: string };
  /** SL's configuration (SL_ENABLED on only). */
  sl?: Record<string, JsonValue>;
  /** What the run was warned about at its start (a configured engine that cannot run, an oversized prefix). */
  warnings?: string[];
  /** Hash of the configuration part (code, brain, knowledge, DeepSeek, Jev, loop, target, arm): equal = same setup. */
  config_sha: string;
}

export interface RunConfigOptions {
  config: AppConfig;
  /** The loop's brain (null without DeepSeek): its router, prompt and knowledge renderer are what the run uses. */
  brain: Brain | null;
  /** Whether the loop has a Jev client (--no-jev: no). */
  jevEnabled: boolean;
  /** The loop's mode (play / shadow). */
  mode: string;
  /** The knowledge files the brain reads (default src/knowledge, as the loop's tool context: brain.ts toolContextOf). */
  knowledgeDir?: string;
  /** Where rows go; default resolveRunConfigLog(config.log). null: nowhere. */
  path?: string | null;
  /** TARGET_ASCENSION, ARM and the secrets to keep out (default process.env). */
  env?: NodeJS.ProcessEnv;
  /** The code (default codeInfo(REPO_ROOT), read once per process). */
  code?: () => CodeInfo;
  now?: () => Date;
  note?: (message: string) => void;
  /** SL's configuration (src/sl/controller.ts describe()), only when SL_ENABLED is on: the row then has an `sl` field. */
  sl?: Record<string, JsonValue>;
}

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

/** Where the rows go by default: next to the decision log (logs/decisions.jsonl -> logs/run-config.jsonl). */
export function runConfigLogPath(decisionLog: string): string {
  const name = basename(decisionLog);
  return join(dirname(decisionLog), name === "decisions.jsonl" ? "run-config.jsonl" : `${name.replace(/\.jsonl$/, "")}.run-config.jsonl`);
}

/** The path in force: RUN_CONFIG_LOG (config), else next to the decision log; null when switched off. */
export function resolveRunConfigLog(log: { decisionLog: string; runConfigLog?: string | null }): string | null {
  return log.runConfigLog === undefined ? runConfigLogPath(log.decisionLog) : log.runConfigLog;
}

/** Parses `git status --porcelain=v2 --branch --untracked-files=no`. */
export function parseGitStatus(text: string, worktree: string): CodeInfo {
  let commit: string | null = null;
  let branch: string | null = null;
  const files: string[] = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("# branch.oid ")) {
      const oid = line.slice("# branch.oid ".length).trim();
      commit = /^[0-9a-f]{7,64}$/.test(oid) ? oid : null;
    } else if (line.startsWith("# branch.head ")) {
      const head = line.slice("# branch.head ".length).trim();
      branch = head && head !== "(detached)" ? head : null;
    } else if (/^[12u] /.test(line)) {
      // 1 XY sub mH mI mW hH hI path | 2 XY sub mH mI mW hH hI Xscore path<TAB>orig | u XY sub m1 m2 m3 mW h1 h2 h3 path
      const parts = line.split(" ");
      const skip = line[0] === "1" ? 8 : line[0] === "2" ? 9 : 10;
      const path = parts.slice(skip).join(" ").split("\t")[0] ?? "";
      if (path) files.push(path);
    }
  }
  const dirty = files.length > 0;
  return {
    commit,
    code: commit ? `${commit.slice(0, 7)}${dirty ? "+dirty" : ""}` : null,
    dirty: commit ? dirty : null,
    dirty_files: files.slice(0, MAX_DIRTY_FILES),
    branch,
    worktree,
  };
}

/** HEAD, branch and changed tracked files of the checkout at `root` (one git call, no secrets in its environment). */
export function codeInfo(root: string = REPO_ROOT): CodeInfo {
  const worktree = basename(root);
  try {
    const out = execFileSync("git", ["-C", root, "status", "--porcelain=v2", "--branch", "--untracked-files=no"], {
      encoding: "utf8",
      timeout: 10_000,
      stdio: ["ignore", "pipe", "ignore"],
      env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: process.env["HOME"] ?? "/", LC_ALL: "C" },
    });
    return parseGitStatus(out, worktree);
  } catch (error) {
    return { commit: null, code: null, dirty: null, dirty_files: [], branch: null, worktree, error: `git status failed: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`.slice(0, 200) };
  }
}

/** The code of this process, read once (the first time it is asked for: the loop asks at its start). */
let processCode: CodeInfo | null = null;
function processCodeInfo(): CodeInfo {
  processCode ??= codeInfo();
  return processCode;
}

function experienceVersion(dir: string): string | null {
  const path = join(dir, "experience.json");
  let fd: number | null = null;
  try {
    fd = openSync(path, "r");
    const head = Buffer.alloc(512);
    const read = readSync(fd, head, 0, head.length, 0);
    const match = /"version"\s*:\s*"([^"]{1,64})"/.exec(head.subarray(0, read).toString("utf8"));
    return match ? match[1]! : null;
  } catch {
    return null;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

function targetAscension(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const value = Number(raw.trim());
  return Number.isInteger(value) ? value : null;
}

/** The engines a brain configuration can ask, in a stable order: default, per-kind (sorted), fallback. */
export function enginesInUse(brain: AppConfig["brain"]): EngineName[] {
  const names: EngineName[] = [brain.engine, ...Object.keys(brain.byPrefix).sort().map((prefix) => brain.byPrefix[prefix]!), ...(brain.fallback ? [brain.fallback] : [])];
  return [...new Set(names)];
}

function engineSnapshot(name: EngineName, config: AppConfig, brain: Brain | null): EngineSnapshot {
  const settings = config.brain.engines[name];
  const claude = name === "claude";
  const model = name === "deepseek" ? (config.deepseek?.model ?? null) : claude ? claudeModelId(settings.model ?? DEFAULT_CLAUDE_MODEL) : settings.model;
  const byPrefix: Record<string, string> = {};
  for (const prefix of Object.keys(settings.modelByPrefix).sort()) byPrefix[prefix] = claude ? claudeModelId(settings.modelByPrefix[prefix]!) : settings.modelByPrefix[prefix]!;
  return {
    model,
    model_by_prefix: byPrefix,
    timeout_ms: settings.timeoutMs,
    effort: settings.effort,
    reask: settings.reask,
    // The router's rule when there is a router; the same rule (router.ts toolsFor) otherwise.
    tools: brain ? brain.router.toolsFor(name) : (settings.tools ?? config.brain.tools ?? name !== "deepseek"),
    max_calls: name === "deepseek" ? (config.deepseek?.maxCalls ?? null) : settings.maxCalls,
  };
}

/** knowledge.prefix_note: the prefix above is the run's start; brain.jsonl has the one each call used. */
export const PREFIX_NOTE =
  "the prefix at this run's start; the brain re-renders it when the knowledge files or notes/lessons.md change (brain/knowledge.ts), so the prefix each call used is its brain.jsonl row's knowledge.prefix_sha";

/** The knowledge part: the prompt the brain sends for this ascension, its hashes and sizes. */
function knowledgeSnapshot(config: AppConfig, brain: Brain | null, ascension: number | null, knowledgeDir: string): RunConfigRow["knowledge"] {
  const prefix = config.brain.knowledgePrefix;
  const out: RunConfigRow["knowledge"] = {
    prefix,
    ascension,
    prefix_sha: null,
    prefix_chars: null,
    prefix_tokens_est: null,
    system_sha: null,
    system_chars: null,
    experience_version: experienceVersion(knowledgeDir),
  };
  if (!brain) return { ...out, error: "no brain (no DeepSeek client): no system prompt is sent" };
  if (prefix !== "full") {
    const system = brain.deepseek.systemPrompt;
    return { ...out, system_sha: sha(system), system_chars: system.length };
  }
  if (ascension === null) return { ...out, error: "the run's ascension is not known: the prefix was not rendered" };
  try {
    const { system, note } = brain.knowledge.system({ ascension, knowledgeDir });
    const chars = note.prefix_chars ?? null;
    return {
      ...out,
      prefix_sha: note.prefix_sha ?? null,
      prefix_note: PREFIX_NOTE,
      prefix_chars: chars,
      prefix_tokens_est: chars === null ? null : estimateTokens(chars),
      system_sha: sha(system),
      system_chars: system.length,
    };
  } catch (error) {
    return { ...out, error: `knowledge failed to load: ${error instanceof Error ? error.message : String(error)}`.slice(0, 300) };
  }
}

/** Every secret value this process holds, by name (configured keys, and *KEY* / *TOKEN* / ... variables). */
function secrets(config: AppConfig, env: NodeJS.ProcessEnv): [string, string][] {
  const out: [string, string][] = [];
  const add = (name: string, value: string | null | undefined): void => {
    if (typeof value === "string" && value.trim().length >= MIN_SECRET_LENGTH) out.push([name, value.trim()]);
  };
  add("TYPESAFE_API_KEY", config.jev.apiKey);
  add("DEEPSEEK_API_KEY", config.deepseek?.apiKey);
  add("ENRICHER_API_KEY", config.enricher.apiKey);
  for (const [name, value] of Object.entries(env)) if (SECRET_NAME.test(name)) add(name, value);
  return out;
}

/** The name of the first secret found in `text`, or null. */
export function secretIn(text: string, config: AppConfig, env: NodeJS.ProcessEnv): string | null {
  for (const [name, value] of secrets(config, env)) if (text.includes(value)) return name;
  return KEY_SHAPE.test(text) ? "a key-shaped string" : null;
}

/**
 * The row for a run, from the configuration (a whitelist of its fields), the code and the brain. `restart` is
 * false here (set by the writer).
 */
export function runConfigRow(
  opts: Pick<RunConfigOptions, "config" | "brain" | "jevEnabled" | "mode" | "knowledgeDir" | "sl"> & { env: NodeJS.ProcessEnv; code: CodeInfo; processStarted: string },
  run: { runId: string; ascension: number | null; character: string | null; floor: number | null },
  now: Date,
): RunConfigRow {
  const { config, brain, env } = opts;
  const engines: Partial<Record<EngineName, EngineSnapshot>> = {};
  const used = enginesInUse(config.brain);
  for (const name of used) engines[name] = engineSnapshot(name, config, brain);
  const deepseek = config.deepseek
    ? {
        model: config.deepseek.model,
        max_calls: config.deepseek.maxCalls,
        timeout_ms: config.deepseek.timeoutMs,
        reasoning_effort: config.deepseek.reasoningEffort,
        combat_reasoning_effort: config.deepseek.combatReasoningEffort,
        effort_by_label: config.deepseek.effortByLabel ?? null,
      }
    : null;
  const setup = {
    brain: {
      active: brain !== null,
      engine: config.brain.engine,
      by_prefix: Object.fromEntries(Object.keys(config.brain.byPrefix).sort().map((prefix) => [prefix, config.brain.byPrefix[prefix]!])) as Record<string, EngineName>,
      fallback: config.brain.fallback,
      reask: config.brain.reask,
      tools: config.brain.tools,
      log: brain ? (brain.router.config.log || null) : null,
      engines,
      ...(used.includes("claude") ? { claude: { schema: config.brain.claude.schema, max_budget_usd: config.brain.claude.maxBudgetUsd } } : {}),
    },
    knowledge: knowledgeSnapshot(config, brain, run.ascension, opts.knowledgeDir ?? KNOWLEDGE_DIR),
    deepseek,
    jev: {
      enabled: opts.jevEnabled,
      model: config.jev.model,
      context: config.jevContext,
      strict: config.strictJev,
      prompt_log: resolveJevPromptLog(config.log),
    },
    loop: {
      mode: opts.mode,
      combat_planner: config.combatPlanner,
      build_decider: config.buildDecider,
      build_oneshot: config.buildOneshot,
      boss_sim_build: config.bossSimBuild,
      combat_deepseek: config.combatDeepseek,
      thief_facts: config.thiefFacts,
      thief_cost: config.thiefCost,
      mech_rules: config.mechRules,
      mech_move_rules: config.mechMoveRules,
      fight_plan: config.fightPlan,
      run_plan: config.runPlan,
      escalation: [...config.escalation.chain],
      confidence: { act: config.thresholds.act, strong: config.thresholds.strong },
      run_start: config.run.start,
      character: config.run.character,
    },
    target_ascension: targetAscension(env["TARGET_ASCENSION"]),
    arm: str(env["ARM"]) || null,
    // SL_ENABLED only (docs/sl.md): with SL off the row is exactly as before.
    ...(opts.sl ? { sl: opts.sl } : {}),
  };
  const { knowledge } = setup;
  const prefixWarning = knowledge.prefix_chars === null ? null : prefixSizeWarning(knowledge.prefix_chars);
  const warnings = [...(brain?.warnings ?? []), ...(prefixWarning ? [prefixWarning] : [])];
  const identity = {
    code: opts.code.code,
    ...setup,
    // The prompt's setup, not its sizes, a load error's wording, or the hashes of the knowledge data rendered into it
    // (prefix_sha, system_sha: the data is refreshed between runs and re-rendered mid-run; brain.jsonl has each call's).
    knowledge: { prefix: knowledge.prefix, experience_version: knowledge.experience_version },
  };
  return {
    ts: now.toISOString(),
    run_id: run.runId,
    ascension: run.ascension,
    character: run.character,
    floor: run.floor,
    restart: false,
    process: { pid: process.pid, started: opts.processStarted },
    code: opts.code,
    ...setup,
    // Outside the identity: a check's outcome or wording is not a different setup.
    ...(brain?.claudeCheck ? { claude_check: { ...brain.claudeCheck } } : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
    config_sha: sha(JSON.stringify(identity)),
  };
}

export class RunConfigLog {
  private readonly seen = new Set<string>();
  private readonly env: NodeJS.ProcessEnv;
  private readonly code: CodeInfo;
  private readonly started: string;
  private ready = false;

  constructor(
    private readonly opts: RunConfigOptions,
    readonly path: string,
  ) {
    this.env = opts.env ?? process.env;
    this.code = (opts.code ?? processCodeInfo)();
    this.started = (opts.now?.() ?? new Date()).toISOString();
  }

  /**
   * Called with every state the loop reads: on the first state of a run id not seen before (in a run, not a menu),
   * appends its row. Returns the row written, or null.
   */
  observe(state: { run: { ascension: number | null; floor: number | null; character_name?: string | null } | null; raw: Record<string, unknown> }): RunConfigRow | null {
    const runId = str(state.raw["run_id"]);
    if (!state.run || isMenuRunId(runId) || this.seen.has(runId)) return null;
    this.seen.add(runId);
    try {
      const rawRun = state.raw["run"];
      const characterId = rawRun && typeof rawRun === "object" ? str((rawRun as Record<string, unknown>)["character_id"]) : "";
      const row = runConfigRow(
        { ...this.opts, env: this.env, code: this.code, processStarted: this.started },
        { runId, ascension: state.run.ascension, character: characterId || state.run.character_name || null, floor: state.run.floor },
        this.opts.now?.() ?? new Date(),
      );
      const earlier = this.earlierRows(runId);
      if (earlier.includes(row.config_sha)) return null;
      row.restart = earlier.length > 0;
      const text = JSON.stringify(row);
      const leak = secretIn(text, this.opts.config, this.env);
      if (leak) {
        this.opts.note?.(`run ${runId}: run configuration not written to ${this.path}: it would contain ${leak}`);
        return null;
      }
      if (!this.ready) {
        mkdirSync(dirname(this.path), { recursive: true });
        this.ready = true;
      }
      appendFileSync(this.path, `${text}\n`, "utf8");
      return row;
    } catch (error) {
      this.opts.note?.(`run ${runId}: run configuration not written: ${error instanceof Error ? error.message : String(error)}`.slice(0, 300));
      return null;
    }
  }

  /** The config_sha of the rows already in the file for this run (its recent part: a restart follows its run's start). */
  private earlierRows(runId: string): string[] {
    if (!existsSync(this.path)) return [];
    const size = statSync(this.path).size;
    const start = Math.max(0, size - TAIL_BYTES);
    const buffer = Buffer.alloc(size - start);
    const fd = openSync(this.path, "r");
    try {
      readSync(fd, buffer, 0, buffer.length, start);
    } finally {
      closeSync(fd);
    }
    const out: string[] = [];
    for (const line of buffer.toString("utf8").split("\n")) {
      if (!line.includes(runId)) continue;
      try {
        const row = JSON.parse(line) as { run_id?: unknown; config_sha?: unknown };
        if (row.run_id === runId && typeof row.config_sha === "string") out.push(row.config_sha);
      } catch {
        // A cut first line of the tail, or a line being written: not a row of this run.
      }
    }
    return out;
  }
}

/** The loop's run-configuration log; null when RUN_CONFIG_LOG=off. */
export function createRunConfigLog(opts: RunConfigOptions): RunConfigLog | null {
  const path = opts.path === undefined ? resolveRunConfigLog(opts.config.log) : opts.path;
  return path ? new RunConfigLog(opts, path) : null;
}

import { accessSync, constants as fsConstants, readFileSync, statSync } from "node:fs";
import { delimiter, dirname, isAbsolute, join } from "node:path";

import type { Effort, EngineName } from "./brain/types.js";
/**
 * Configuration: environment variables overridden by CLI flags (PLAN.md §9).
 *
 * Nothing here throws for a missing API key: the key is only required by the commands that
 * actually talk to Jev, so `doctor --no-jev` works on a game-only checkout.
 */

export type Mode = "shadow" | "play" | "record" | "replay";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type RunStart = "auto" | "continue" | "new";
export type JevContextVersion = "off" | "v1";

export interface Sts2Config {
  baseUrl: string;
  portScan: { from: number; to: number };
  timeoutMs: number;
}

export interface JevConfig {
  apiKey: string | null;
  baseUrl: string | null;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface EnricherConfig {
  enabled: boolean;
  baseUrl: string | null;
  apiKey: string | null;
  model: string | null;
  tasks: string[];
}

/** SL (docs/sl.md, src/sl/controller.ts). */
export interface SlConfig {
  /** SL_ENABLED (default off). */
  enabled: boolean;
  /** SL_BOSS_RETRIES (default 5, Dai 2026-10-02): a boss fight gets at most 1 + this many attempts. */
  bossRetries: number;
  /** SL_ELITE_RETRIES (default 3, Dai 2026-10-02): the same for the hard fights listed in src/sl/sl-elites.json (any room, not only elites). */
  eliteRetries: number;
  /** SL_RETRY_SHOW_SIM (default on): a retried boss fight's questions show the whole-fight simulation even for a low-trust boss, labelled. */
  retryShowSim: boolean;
  /** SL_LOG: sl-attempts.jsonl (default next to the decision log; off: not written). */
  log: string | null;
  /** SL_STEP_TIMEOUT_MS (default 60000): each reload step's wait (the main menu, then the fight). */
  stepTimeoutMs: number;
}

export interface AppConfig {
  sts2: Sts2Config;
  jev: JevConfig;
  enricher: EnricherConfig;
  /** Escalation model for Jev's near-guesses on high-stakes calls (phase 2). null when no key. */
  deepseek: { apiKey: string; baseUrl: string; model: string; maxCalls: number; timeoutMs: number; guideFile: string; handbookFile: string; reasoningEffort: string; combatReasoningEffort: string; effortByLabel?: string; reasoningLog: string; factsSnapshotDir?: string } | null;
  /** Escalation order, e.g. ["claude", "deepseek"]: the first one that answers wins. */
  escalation: { chain: ("claude" | "deepseek")[]; claudeDir: string; claudeTimeoutMs: number; claudeMaxCalls: number };
  thresholds: { act: number; strong: number };
  budgets: { maxRequests: number; maxTokens: number };
  run: { start: RunStart; character: string | null };
  shop: { discardPotions: string[] };
  /** Allow the loop to answer tutorial/FTUE prompts that change game settings. Default: false. */
  allowFtueModals: boolean;
  /**
   * When Jev is available, act on its answer even if its confidence is low, instead of substituting a
   * code-chosen action. Default true: with Jev enabled the model decides.
   */
  strictJev: boolean;
  /** `turn`: whole-turn solver + Jev on close calls (phase 2). `card`: the original per-card question. */
  combatPlanner: "turn" | "card";
  /**
   * What Jev sees on combat plan choices (M1). `off`: the original question. `v1`: code-computed fact
   * tags on every option, retrieved fight hints (src/knowledge/jev-hints.json) and a combat-trimmed
   * run brief. Jev only: the escalator keeps the original question. Default off.
   */
  jevContext: JevContextVersion;
  /**
   * `v1`: DeepSeek plans each elite/boss fight once at its start (src/strategy/fight-plan.ts) and no
   * longer answers per-turn combat plan choices. `off`: per-turn escalation as before. Default off.
   */
  fightPlan: "off" | "v1";
  /** JSONL log of the fight plans (FIGHT_PLAN=v1). */
  fightPlanLog: string;
  /** `v1`: DeepSeek sets a run plan (strategy only) at run/act start, heavy HP loss and every few floors. */
  runPlan: "off" | "v1";
  runPlanLog: string;
  /**
   * Who decides deck building (card rewards, shop, removals/upgrades/transforms, events, relics, bundles),
   * the route and rest sites. `deepseek` (default): DeepSeek directly, code's values given as facts; the
   * route is planned once per act and followed by code. Jev, then code, when DeepSeek fails or is out of
   * budget. `jev`: the baseline (Jev, DeepSeek only on Jev's near-guesses).
   */
  buildDecider: "deepseek" | "jev";
  /**
   * With BUILD_DECIDER=deepseek, whether a shop visit, a rest site, an event option and the act-start
   * Ancient are decided in one DeepSeek question each, together with the deck card(s) the follow-up screen
   * takes and the act's route (Dai 2026-09-29; screens/oneshot.ts). `on` (default); `off`: the step-by-step
   * questions (one purchase, then the card, per question).
   */
  buildOneshot: "on" | "off";
  /**
   * B3 (docs/boss-sim.md §11): whether each option of a deck-building question DeepSeek decides (card reward, shop,
   * rest site, deck selection, event) carries the act boss fought in simulation with that option's deck, and
   * facts.act_boss_sim replaces the act boss clock. `on` (default); `off`: the questions exactly as before.
   */
  bossSimBuild: "on" | "off";
  /**
   * With BUILD_DECIDER=deepseek, whether in-combat card picks (the only in-combat questions that still
   * carry an escalation; turn plans no longer do) may escalate to DeepSeek on Jev's near-guesses. `off`
   * (default): combat, potions and in-combat card picks stay with code and Jev.
   */
  combatDeepseek: "off" | "on";
  /**
   * THIEF_FACTS (default on; docs/thief.md, src/strategy/thief.ts): while a Thieving Hopper or a Gremlin Merc / Fat
   * Gremlin carries a stolen card or gold, the combat question gets thief_context and a `thief` fact on each option,
   * the rollout lets an enemy whose Escape resolves leave the fight, and a line that kills it before it leaves is kept
   * among the options. off: the combat question exactly as before.
   */
  thiefFacts: boolean;
  /**
   * MECH_RULES (default on; docs/mechanics-learning.md, src/knowledge/mechanics.ts): the mechanics learned from the logs
   * (monster-db.json `observed`, refreshed with the DB) in use. A line stripping an enemy power whose strip to 0 stunned
   * that enemy in the logs (the Thieving Hopper's Flutter) cancels its move this turn in the turn solver and the rollout,
   * and the option says so; the combat question's enemy powers carry the observation; the knowledge prefix renders the
   * notable observations. off: the combat question and the knowledge prefix exactly as before. Without the data (a DB
   * built before it), as off.
   */
  mechRules: boolean;
  /** SL (docs/sl.md): boss and listed-elite fights reloaded on a foreseen certain death (SL_*; off by default). */
  sl: SlConfig;
  /** V4 brain: engine per question kind, fallback, re-ask, tools, log (BRAIN_*). */
  brain: BrainConfig;
  mode: Mode;
  /**
   * jevPromptLog (JEV_PROMPT_LOG): where every request to Jev is logged verbatim (telemetry/jev-prompt-log.ts);
   * unset: next to the decision log (logs/jev-prompts.jsonl); null (JEV_PROMPT_LOG=off): not logged.
   * runConfigLog (RUN_CONFIG_LOG): one row per run with its configuration (telemetry/run-config.ts); unset: next to the
   * decision log (logs/run-config.jsonl); null (RUN_CONFIG_LOG=off): not written.
   */
  log: { level: LogLevel; decisionLog: string; jevPromptLog?: string | null; runConfigLog?: string | null };
  warnings: string[];
}

/** Per-engine brain settings (BRAIN_<ENGINE>_*); null = the engine's or the router's default. */
export interface BrainEngineSettings {
  /**
   * BRAIN_<ENGINE>_MODEL (claude: an alias such as opus / sonnet, or a full id such as claude-opus-5). DeepSeek:
   * DEEPSEEK_MODEL governs (the v3 client); this is ignored for it.
   */
  model: string | null;
  /** BRAIN_<ENGINE>_MODEL_<PREFIX>: the model for one question kind (router.ts labelPrefix), e.g. { MAP: "opus" }. */
  modelByPrefix: Record<string, string>;
  /** BRAIN_<ENGINE>_TIMEOUT_MS: the router's limit on one engine call (null: none beyond the engine's own). */
  timeoutMs: number | null;
  /** BRAIN_<ENGINE>_EFFORT (claude --effort, codex model_reasoning_effort, dsh reasoning effort). */
  effort: Effort | null;
  /** BRAIN_<ENGINE>_REASK=on|off: the router's one re-ask (default on; DeepSeek without tools: off, v3 repairs itself). */
  reask: boolean | null;
  /**
   * BRAIN_<ENGINE>_TOOLS=on|off: whether the engine gets the tool list (default on; DeepSeek off: v3 parity; with
   * KNOWLEDGE_PREFIX=full off for every engine: the knowledge is in the system prompt, set on to add the tools).
   */
  tools: boolean | null;
  /**
   * BRAIN_<ENGINE>_MAX_CALLS: the engine's model calls per process (re-asks included), counted by the router apart
   * from DEEPSEEK_MAX_CALLS; past it the engine's questions go to BRAIN_FALLBACK. null: no limit. DeepSeek: always
   * null (the loop's DEEPSEEK_MAX_CALLS governs it, as in v3). Claude default DEFAULT_CLAUDE_MAX_CALLS.
   */
  maxCalls: number | null;
}

/** KNOWLEDGE_PREFIX: what the brain's system prompt carries (docs/v4-architecture.md §2-§3). */
export type KnowledgePrefixMode = "off" | "full";

/** V4 brain (src/brain/router.ts): which engine answers which question, and each engine's settings. */
export interface BrainConfig {
  /** BRAIN_ENGINE (default deepseek: v3 behaviour). */
  engine: EngineName;
  /** BRAIN_ENGINE_<PREFIX>: per label prefix (router.ts labelPrefix), e.g. { MAP: "claude" }. */
  byPrefix: Record<string, EngineName>;
  /** BRAIN_FALLBACK: the engine asked when the chosen one errors or times out; null = none. */
  fallback: EngineName | null;
  /** BRAIN_REASK=on|off for every engine (BRAIN_<ENGINE>_REASK wins); null = per-engine default. */
  reask: boolean | null;
  /** BRAIN_TOOLS=on|off for every engine (BRAIN_<ENGINE>_TOOLS wins); null = per-engine default. */
  tools: boolean | null;
  /** BRAIN_LOG: one JSONL row per question; null = brain.jsonl next to the decision log. "" disables. */
  log: string | null;
  engines: Record<EngineName, BrainEngineSettings>;
  /**
   * KNOWLEDGE_PREFIX: "off" (default) sends v3's system prompt (rules + guide + handbook) and v3's memory, byte for
   * byte; "full" sends the rules + the whole knowledge base at the run's ascension (src/brain/knowledge.ts), to every
   * engine, and drops what the prefix already holds from the memory (the experience lessons).
   */
  knowledgePrefix: KnowledgePrefixMode;
  /** Claude runs under this machine's Claude login (the subscription); there is no API-key mode. */
  claude: {
    /**
     * BRAIN_CLAUDE_BIN, else the first executable `claude` on PATH, else ~/.local/bin/claude (its install
     * location, which ops/run.sh does not put on PATH), as an absolute path; "claude" when none is found (the
     * loop's start-up check then reports it). resolveClaudeBin.
     */
    bin: string;
    /** BRAIN_CLAUDE_MAX_BUDGET_USD: --max-budget-usd per call; null = none. */
    maxBudgetUsd: number | null;
    /**
     * BRAIN_CLAUDE_SCHEMA: "kind" (default) sends one --json-schema per question kind, so the prompt cache holds
     * across questions (specs.ts stableSchema); "question" sends the question's own schema (its keys as enums:
     * format-tight, but every question writes the whole prompt to the cache again).
     */
    schema: "kind" | "question";
  };
}

/** The brain's default Claude model (claude-api skill, 2026-09: the current Sonnet; BRAIN_CLAUDE_MODEL=opus for Opus). */
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5";

/** The current Opus, pinned (Dai 2026-09-29): BRAIN_CLAUDE_MODEL=opus sends this id, so an alias move changes nothing. */
export const CLAUDE_OPUS_MODEL = "claude-opus-5-5";

/** Model aliases the brain pins to a full id before calling the CLI; other names are sent as given. */
export const CLAUDE_MODEL_ALIASES: Readonly<Record<string, string>> = { opus: CLAUDE_OPUS_MODEL };

/** BRAIN_CLAUDE_TIMEOUT_MS when unset: 2 minutes per call. */
export const DEFAULT_CLAUDE_TIMEOUT_MS = 120_000;

/** The Claude engine's calls per process when BRAIN_CLAUDE_MAX_CALLS is unset (DEEPSEEK_MAX_CALLS is 300). */
export const DEFAULT_CLAUDE_MAX_CALLS = 150;

/** Engine names BRAIN_* may use; codex and dsh are named but not implemented yet (the router says so). */
const ENGINES: readonly EngineName[] = ["deepseek", "claude", "codex", "dsh"];
const EFFORTS: readonly Effort[] = ["low", "medium", "high", "max"];

function parseEngine(raw: string, field: string, problems: ConfigProblem[]): EngineName | null {
  const value = raw.toLowerCase();
  if ((ENGINES as readonly string[]).includes(value)) return value as EngineName;
  problems.push({ field, message: `expected one of ${ENGINES.join(", ")}, got "${raw}"` });
  return null;
}

function parseOnOff(raw: string | null, field: string, problems: ConfigProblem[]): boolean | null {
  if (raw === null) return null;
  const value = raw.toLowerCase();
  if (["on", "true", "1", "yes"].includes(value)) return true;
  if (["off", "false", "0", "no"].includes(value)) return false;
  problems.push({ field, message: `expected on or off, got "${raw}"` });
  return null;
}

function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    accessSync(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The claude program the brain runs: BRAIN_CLAUDE_BIN as given; else the first executable `claude` in PATH's
 * absolute directories; else HOME/.local/bin/claude (where the CLI installs itself: ops/run.sh adds only
 * ~/.local/node/bin to PATH); else "claude", which the start-up check (brain.ts preflight) reports as missing.
 */
export function resolveClaudeBin(env: NodeJS.ProcessEnv): string {
  const set = readEnv(env, "BRAIN_CLAUDE_BIN");
  if (set !== null) return set;
  for (const dir of (env["PATH"] ?? "").split(delimiter)) {
    if (!dir || !isAbsolute(dir)) continue;
    const candidate = join(dir, "claude");
    if (isExecutableFile(candidate)) return candidate;
  }
  const home = env["HOME"];
  if (home && isAbsolute(home)) {
    const installed = join(home, ".local", "bin", "claude");
    if (isExecutableFile(installed)) return installed;
  }
  return "claude";
}

/** BRAIN_<ENGINE>_MAX_CALLS ("off" or "none": no limit); DeepSeek's budget stays DEEPSEEK_MAX_CALLS (the loop's). */
function maxCallsOf(env: NodeJS.ProcessEnv, name: EngineName, problems: ConfigProblem[]): number | null {
  if (name === "deepseek") return null;
  const field = `BRAIN_${name.toUpperCase()}_MAX_CALLS`;
  const raw = readEnv(env, field);
  if (raw === null) return name === "claude" ? DEFAULT_CLAUDE_MAX_CALLS : null;
  if (["off", "none"].includes(raw.toLowerCase())) return null;
  return parseInteger(raw, field, problems, { min: 0, max: 1_000_000 });
}

/** The BRAIN_* variables (docs/v4-architecture.md §2): switching engines is configuration only. */
export function readBrainConfig(env: NodeJS.ProcessEnv, problems: ConfigProblem[]): BrainConfig {
  const engine = parseEngine(readEnv(env, "BRAIN_ENGINE") ?? "deepseek", "BRAIN_ENGINE", problems) ?? "deepseek";
  const byPrefix: Record<string, EngineName> = {};
  for (const key of Object.keys(env).sort()) {
    const m = /^BRAIN_ENGINE_([A-Z0-9_]+)$/.exec(key);
    const raw = readEnv(env, key);
    if (!m || raw === null) continue;
    const name = parseEngine(raw, key, problems);
    if (name) byPrefix[m[1]!] = name;
  }
  const fallbackRaw = readEnv(env, "BRAIN_FALLBACK");
  const fallback = fallbackRaw === null || fallbackRaw.toLowerCase() === "none" ? null : parseEngine(fallbackRaw, "BRAIN_FALLBACK", problems);
  const engines = {} as Record<EngineName, BrainEngineSettings>;
  for (const name of ENGINES) {
    const upper = name.toUpperCase();
    const timeoutRaw = readEnv(env, `BRAIN_${upper}_TIMEOUT_MS`);
    const effortRaw = readEnv(env, `BRAIN_${upper}_EFFORT`);
    let effort: Effort | null = null;
    if (effortRaw !== null) {
      if ((EFFORTS as readonly string[]).includes(effortRaw.toLowerCase())) effort = effortRaw.toLowerCase() as Effort;
      else problems.push({ field: `BRAIN_${upper}_EFFORT`, message: `expected one of ${EFFORTS.join(", ")}, got "${effortRaw}"` });
    }
    // Claude: 2 minutes (a question the loop waits on; two timeouts in a row rest it, router.ts TIMEOUT_REST_AFTER).
    // The other CLI agents (tool calls, long thinking): 5 minutes, as DEEPSEEK_TIMEOUT_MS in the live .env.
    const defaultTimeout = name === "deepseek" ? null : name === "claude" ? DEFAULT_CLAUDE_TIMEOUT_MS : 300_000;
    const modelByPrefix: Record<string, string> = {};
    for (const key of Object.keys(env).sort()) {
      const m = new RegExp(`^BRAIN_${upper}_MODEL_([A-Z0-9_]+)$`).exec(key);
      const raw = readEnv(env, key);
      if (m && raw !== null) modelByPrefix[m[1]!] = raw;
    }
    engines[name] = {
      model: readEnv(env, `BRAIN_${upper}_MODEL`) ?? (name === "claude" ? DEFAULT_CLAUDE_MODEL : null),
      modelByPrefix,
      timeoutMs: timeoutRaw === null ? defaultTimeout : parseInteger(timeoutRaw, `BRAIN_${upper}_TIMEOUT_MS`, problems, { min: 1_000, max: 3_600_000 }),
      effort,
      reask: parseOnOff(readEnv(env, `BRAIN_${upper}_REASK`), `BRAIN_${upper}_REASK`, problems),
      tools: parseOnOff(readEnv(env, `BRAIN_${upper}_TOOLS`), `BRAIN_${upper}_TOOLS`, problems),
      maxCalls: maxCallsOf(env, name, problems),
    };
  }
  const budgetRaw = readEnv(env, "BRAIN_CLAUDE_MAX_BUDGET_USD");
  const maxBudgetUsd = budgetRaw === null ? null : Number(budgetRaw);
  if (maxBudgetUsd !== null && !(Number.isFinite(maxBudgetUsd) && maxBudgetUsd > 0)) problems.push({ field: "BRAIN_CLAUDE_MAX_BUDGET_USD", message: `expected a positive number, got "${budgetRaw}"` });
  const log = readEnv(env, "BRAIN_LOG");
  const schemaRaw = (readEnv(env, "BRAIN_CLAUDE_SCHEMA") ?? "kind").toLowerCase();
  if (schemaRaw !== "kind" && schemaRaw !== "question") problems.push({ field: "BRAIN_CLAUDE_SCHEMA", message: `expected kind or question, got "${schemaRaw}"` });
  const schemaMode: "kind" | "question" = schemaRaw === "question" ? "question" : "kind";
  const prefixRaw = (readEnv(env, "KNOWLEDGE_PREFIX") ?? "off").toLowerCase();
  if (prefixRaw !== "off" && prefixRaw !== "full") problems.push({ field: "KNOWLEDGE_PREFIX", message: `expected off or full, got "${prefixRaw}"` });
  const knowledgePrefix: KnowledgePrefixMode = prefixRaw === "full" ? "full" : "off";
  return {
    engine,
    byPrefix,
    fallback,
    reask: parseOnOff(readEnv(env, "BRAIN_REASK"), "BRAIN_REASK", problems),
    tools: parseOnOff(readEnv(env, "BRAIN_TOOLS"), "BRAIN_TOOLS", problems),
    // BRAIN_LOG=off (or "-") disables the log.
    log: log === null ? null : log === "off" || log === "-" ? "" : log,
    engines,
    knowledgePrefix,
    claude: {
      bin: resolveClaudeBin(env),
      schema: schemaMode,
      maxBudgetUsd: maxBudgetUsd !== null && Number.isFinite(maxBudgetUsd) && maxBudgetUsd > 0 ? maxBudgetUsd : null,
    },
  };
}

/** Where brain.jsonl goes when BRAIN_LOG is unset: next to the decision log ("decisions.jsonl" -> "brain.jsonl"). */
export function brainLogPath(config: Pick<AppConfig, "brain" | "log">): string {
  if (config.brain.log !== null) return config.brain.log;
  const decisions = config.log.decisionLog;
  return /(^|\/)decisions\.jsonl$/.test(decisions) ? decisions.replace(/decisions\.jsonl$/, "brain.jsonl") : decisions.replace(/(\.jsonl)?$/, ".brain.jsonl");
}

export interface ConfigProblem {
  field: string;
  message: string;
}

export class ConfigError extends Error {
  readonly problems: ConfigProblem[];

  constructor(problems: ConfigProblem[]) {
    super(problems.map((problem) => `${problem.field}: ${problem.message}`).join("\n"));
    this.name = "ConfigError";
    this.problems = problems;
  }
}

export interface ConfigOverrides {
  sts2BaseUrl?: string | undefined;
  jevApiKey?: string | undefined;
  jevModel?: string | undefined;
  mode?: string | undefined;
  /** `--allow-fallback`: opt out of trust-Jev for this run. */
  allowFallback?: boolean | undefined;
}

const DEFAULTS = {
  sts2BaseUrl: "http://127.0.0.1:8080",
  sts2PortScan: "8080-8090",
  sts2TimeoutMs: 10_000,
  jevModel: "jev-1.13.0",
  jevTimeoutMs: 20_000,
  jevMaxRetries: 2,
  confidenceAct: 0.55,
  confidenceStrong: 0.75,
  maxRequests: 2_000,
  maxTokens: "20M",
  mode: "shadow",
  logLevel: "info",
  decisionLog: "./logs/decisions.jsonl",
  enricherEnabled: false,
  enricherTasks: "run_brief",
  runStart: "auto",
  allowFtueModals: false,
  strictJev: true,
  combatPlanner: "turn" as "turn" | "card",
  shopDiscardPotions: "FOUL_POTION",
} as const;

const MODES: readonly Mode[] = ["shadow", "play", "record", "replay"];
const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];
const RUN_STARTS: readonly RunStart[] = ["auto", "continue", "new"];

/** Trimmed env value, or null when unset/blank. Blank values are treated as unset. */
export function readEnv(env: NodeJS.ProcessEnv, key: string): string | null {
  const raw = env[key];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCount(raw: string, field: string, problems: ConfigProblem[]): number {
  const match = /^(\d+(?:\.\d+)?)\s*([kKmMbB])?$/.exec(raw.trim());
  if (!match) {
    problems.push({ field, message: `expected a number, optionally with a K/M/B suffix, got "${raw}"` });
    return 0;
  }
  const scale = { k: 1e3, m: 1e6, b: 1e9 }[match[2]?.toLowerCase() ?? ""] ?? 1;
  return Number(match[1]) * scale;
}

function parseInteger(
  raw: string,
  field: string,
  problems: ConfigProblem[],
  range: { min: number; max: number },
): number {
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    problems.push({ field, message: `expected an integer, got "${raw}"` });
    return range.min;
  }
  if (value < range.min || value > range.max) {
    problems.push({ field, message: `expected ${range.min}..${range.max}, got ${value}` });
    return range.min;
  }
  return value;
}

function parseRatio(raw: string, field: string, problems: ConfigProblem[]): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    problems.push({ field, message: `expected a number in 0..1, got "${raw}"` });
    return 0;
  }
  return value;
}

function parseBoolean(raw: string, field: string, problems: ConfigProblem[]): boolean {
  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  problems.push({ field, message: `expected true/false, got "${raw}"` });
  return false;
}

export function parsePortRange(raw: string, field: string, problems: ConfigProblem[]): { from: number; to: number } {
  const text = raw.trim();
  if (!text.includes("-")) {
    const port = parseInteger(text, field, problems, { min: 1, max: 65_535 });
    return { from: port, to: port };
  }
  const bounds = text.split("-", 2);
  const from = parseInteger((bounds[0] ?? "").trim(), field, problems, { min: 1, max: 65_535 });
  const to = parseInteger((bounds[1] ?? "").trim(), field, problems, { min: 1, max: 65_535 });
  if (from > to) {
    problems.push({ field, message: `range start ${from} is greater than end ${to}` });
    return { from: to, to: from };
  }
  return { from, to };
}

function parseUrl(raw: string, field: string, problems: ConfigProblem[]): string {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      problems.push({ field, message: `expected an http(s) URL, got "${raw}"` });
    }
    return url.origin + (url.pathname === "/" ? "" : url.pathname.replace(/\/$/, ""));
  } catch {
    problems.push({ field, message: `not a valid URL: "${raw}"` });
    return raw;
  }
}

function pick(overrides: ConfigOverrides, env: NodeJS.ProcessEnv, key: keyof ConfigOverrides, envKey: string): string | null {
  const override = overrides[key];
  if (typeof override === "string" && override.trim().length > 0) return override.trim();
  return readEnv(env, envKey);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, overrides: ConfigOverrides = {}): AppConfig {
  const problems: ConfigProblem[] = [];
  const warnings: string[] = [];

  const baseUrl = parseUrl(
    pick(overrides, env, "sts2BaseUrl", "STS2_BASE_URL") ?? DEFAULTS.sts2BaseUrl,
    "STS2_BASE_URL",
    problems,
  );
  const portScan = parsePortRange(readEnv(env, "STS2_PORT_SCAN") ?? DEFAULTS.sts2PortScan, "STS2_PORT_SCAN", problems);
  const sts2TimeoutMs = parseInteger(
    readEnv(env, "STS2_TIMEOUT_MS") ?? String(DEFAULTS.sts2TimeoutMs),
    "STS2_TIMEOUT_MS",
    problems,
    { min: 250, max: 120_000 },
  );

  const jevApiKey = pick(overrides, env, "jevApiKey", "TYPESAFE_API_KEY");
  const jevBaseUrlRaw = readEnv(env, "TYPESAFE_BASE_URL");
  const jevBaseUrl = jevBaseUrlRaw ? parseUrl(jevBaseUrlRaw, "TYPESAFE_BASE_URL", problems) : null;
  const jevModel = pick(overrides, env, "jevModel", "JEV_MODEL") ?? DEFAULTS.jevModel;

  const modesRaw = (pick(overrides, env, "mode", "MODE") ?? DEFAULTS.mode).toLowerCase();
  if (!MODES.includes(modesRaw as Mode)) {
    problems.push({ field: "MODE", message: `expected one of ${MODES.join(", ")}, got "${modesRaw}"` });
  }
  const mode = (MODES.includes(modesRaw as Mode) ? modesRaw : DEFAULTS.mode) as Mode;

  const runStartRaw = (readEnv(env, "RUN_START") ?? DEFAULTS.runStart).toLowerCase();
  if (!RUN_STARTS.includes(runStartRaw as RunStart)) {
    problems.push({ field: "RUN_START", message: `expected one of ${RUN_STARTS.join(", ")}, got "${runStartRaw}"` });
  }
  const runStart = (RUN_STARTS.includes(runStartRaw as RunStart) ? runStartRaw : DEFAULTS.runStart) as RunStart;
  const character = readEnv(env, "CHARACTER");
  const shopDiscardPotions = (readEnv(env, "SHOP_DISCARD_POTIONS") ?? DEFAULTS.shopDiscardPotions)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const allowFtueModals = parseBoolean(
    readEnv(env, "ALLOW_FTUE_MODALS") ?? String(DEFAULTS.allowFtueModals),
    "ALLOW_FTUE_MODALS",
    problems,
  );
  const strictJev =
    overrides.allowFallback === true
      ? false
      : parseBoolean(readEnv(env, "STRICT_JEV") ?? String(DEFAULTS.strictJev), "STRICT_JEV", problems);

  let deepseekKey = readEnv(env, "DEEPSEEK_API_KEY") ?? "";
  const deepseekKeyFile = readEnv(env, "DEEPSEEK_API_KEY_FILE");
  if (!deepseekKey && deepseekKeyFile) {
    try {
      deepseekKey = readFileSync(deepseekKeyFile.replace(/^~(?=\/)/, process.env["HOME"] ?? "~"), "utf8").trim();
    } catch {
      problems.push({ field: "DEEPSEEK_API_KEY_FILE", message: "could not read the key file" });
    }
  }
  const deepseek = deepseekKey
    ? {
        apiKey: deepseekKey,
        baseUrl: readEnv(env, "DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com",
        model: readEnv(env, "DEEPSEEK_MODEL") ?? "deepseek-chat",
        // BUILD_DECIDER=deepseek: ~25 (act-1 death) to ~80 (full run) build/route/rest questions a run,
        // plus run plans; 300 leaves room for restarts within a run.
        maxCalls: Number(readEnv(env, "DEEPSEEK_MAX_CALLS") ?? "300") || 300,
        timeoutMs: Number(readEnv(env, "DEEPSEEK_TIMEOUT_MS") ?? "30000") || 30000,
        guideFile: readEnv(env, "DEEPSEEK_GUIDE_FILE") ?? "src/knowledge/ironclad-guide.md",
        handbookFile: readEnv(env, "DEEPSEEK_HANDBOOK_FILE") ?? "src/knowledge/ds-handbook.md",
        reasoningEffort: readEnv(env, "DEEPSEEK_REASONING_EFFORT") ?? "off",
        combatReasoningEffort: readEnv(env, "DEEPSEEK_COMBAT_REASONING_EFFORT") ?? "",
        // Per-label tiers, "label-prefix=effort,…"; unset = DEFAULT_EFFORT_BY_LABEL (llm/deepseek.ts); "-" = none.
        ...(readEnv(env, "DEEPSEEK_EFFORT_BY_LABEL") === null ? {} : { effortByLabel: readEnv(env, "DEEPSEEK_EFFORT_BY_LABEL")! }),
        reasoningLog: readEnv(env, "DEEPSEEK_REASONING_LOG") ?? "logs/deepseek-reasoning.jsonl",
        // The day's guide/handbook with their data facts filled (llm/deepseek.ts frozenGuideFacts); "" = fill at every start.
        factsSnapshotDir: readEnv(env, "DEEPSEEK_FACTS_SNAPSHOT_DIR") ?? "logs/guide-facts",
      }
    : null;

  const chainRaw = (readEnv(env, "ESCALATION_CHAIN") ?? "claude,deepseek").toLowerCase();
  const escalation = {
    chain: chainRaw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry): entry is "claude" | "deepseek" => entry === "claude" || entry === "deepseek"),
    claudeDir: readEnv(env, "CLAUDE_ESCALATION_DIR") ?? "./logs/escalation",
    claudeTimeoutMs: Number(readEnv(env, "CLAUDE_ESCALATION_TIMEOUT_MS") ?? "90000") || 90000,
    claudeMaxCalls: Number(readEnv(env, "CLAUDE_MAX_CALLS") ?? "60") || 60,
  };

  const combatPlannerRaw = (readEnv(env, "COMBAT_PLANNER") ?? DEFAULTS.combatPlanner).toLowerCase();
  if (combatPlannerRaw !== "turn" && combatPlannerRaw !== "card") {
    problems.push({ field: "COMBAT_PLANNER", message: `expected turn or card, got "${combatPlannerRaw}"` });
  }
  const combatPlanner: "turn" | "card" = combatPlannerRaw === "card" ? "card" : "turn";

  const jevContextRaw = (readEnv(env, "JEV_CONTEXT") ?? "off").toLowerCase();
  if (jevContextRaw !== "off" && jevContextRaw !== "v1") {
    problems.push({ field: "JEV_CONTEXT", message: `expected off or v1, got "${jevContextRaw}"` });
  }
  const jevContext: JevContextVersion = jevContextRaw === "v1" ? "v1" : "off";

  const fightPlanRaw = (readEnv(env, "FIGHT_PLAN") ?? "off").toLowerCase();
  if (fightPlanRaw !== "off" && fightPlanRaw !== "v1") {
    problems.push({ field: "FIGHT_PLAN", message: `expected off or v1, got "${fightPlanRaw}"` });
  }
  const fightPlan: "off" | "v1" = fightPlanRaw === "v1" ? "v1" : "off";
  const fightPlanLog = readEnv(env, "FIGHT_PLAN_LOG") ?? "logs/fight-plans.jsonl";
  const runPlanRaw = (readEnv(env, "RUN_PLAN") ?? "off").toLowerCase();
  if (runPlanRaw !== "off" && runPlanRaw !== "v1") {
    problems.push({ field: "RUN_PLAN", message: `expected off or v1, got "${runPlanRaw}"` });
  }
  const runPlan: "off" | "v1" = runPlanRaw === "v1" ? "v1" : "off";
  const runPlanLog = readEnv(env, "RUN_PLAN_LOG") ?? "logs/run-plans.jsonl";
  const buildDeciderRaw = (readEnv(env, "BUILD_DECIDER") ?? "deepseek").toLowerCase();
  if (buildDeciderRaw !== "deepseek" && buildDeciderRaw !== "jev") {
    problems.push({ field: "BUILD_DECIDER", message: `expected deepseek or jev, got "${buildDeciderRaw}"` });
  }
  const buildDecider: "deepseek" | "jev" = buildDeciderRaw === "jev" ? "jev" : "deepseek";
  const buildOneshotRaw = (readEnv(env, "BUILD_ONESHOT") ?? "on").toLowerCase();
  if (buildOneshotRaw !== "on" && buildOneshotRaw !== "off") {
    problems.push({ field: "BUILD_ONESHOT", message: `expected on or off, got "${buildOneshotRaw}"` });
  }
  const buildOneshot: "on" | "off" = buildOneshotRaw === "off" ? "off" : "on";
  const bossSimBuildRaw = (readEnv(env, "BOSS_SIM_BUILD") ?? "on").toLowerCase();
  if (bossSimBuildRaw !== "on" && bossSimBuildRaw !== "off") {
    problems.push({ field: "BOSS_SIM_BUILD", message: `expected on or off, got "${bossSimBuildRaw}"` });
  }
  const bossSimBuild: "on" | "off" = bossSimBuildRaw === "off" ? "off" : "on";
  const combatDeepseekRaw = (readEnv(env, "COMBAT_DEEPSEEK") ?? "off").toLowerCase();
  if (combatDeepseekRaw !== "off" && combatDeepseekRaw !== "on") {
    problems.push({ field: "COMBAT_DEEPSEEK", message: `expected off or on, got "${combatDeepseekRaw}"` });
  }
  const combatDeepseek: "off" | "on" = combatDeepseekRaw === "on" ? "on" : "off";
  // An unreadable THIEF_FACTS is a warning, not a start-up error: the default (on) applies.
  const thiefFactsProblems: ConfigProblem[] = [];
  const thiefFacts = parseOnOff(readEnv(env, "THIEF_FACTS"), "THIEF_FACTS", thiefFactsProblems) ?? true;
  for (const problem of thiefFactsProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  // An unreadable MECH_RULES is a warning too: the default (on) applies.
  const mechRulesProblems: ConfigProblem[] = [];
  const mechRules = parseOnOff(readEnv(env, "MECH_RULES"), "MECH_RULES", mechRulesProblems) ?? true;
  for (const problem of mechRulesProblems) warnings.push(`${problem.field}: ${problem.message}; using on`);
  const decisionLog = readEnv(env, "DECISION_LOG") ?? DEFAULTS.decisionLog;
  const slLogRaw = readEnv(env, "SL_LOG");
  const sl: SlConfig = {
    enabled: parseOnOff(readEnv(env, "SL_ENABLED"), "SL_ENABLED", problems) ?? false,
    bossRetries: parseInteger(readEnv(env, "SL_BOSS_RETRIES") ?? "5", "SL_BOSS_RETRIES", problems, { min: 0, max: 20 }),
    eliteRetries: parseInteger(readEnv(env, "SL_ELITE_RETRIES") ?? "3", "SL_ELITE_RETRIES", problems, { min: 0, max: 20 }),
    retryShowSim: parseOnOff(readEnv(env, "SL_RETRY_SHOW_SIM"), "SL_RETRY_SHOW_SIM", problems) ?? true,
    log: slLogRaw === null ? join(dirname(decisionLog), "sl-attempts.jsonl") : /^(off|none|false|0)$/i.test(slLogRaw) ? null : slLogRaw,
    stepTimeoutMs: parseInteger(readEnv(env, "SL_STEP_TIMEOUT_MS") ?? "60000", "SL_STEP_TIMEOUT_MS", problems, { min: 1000, max: 600_000 }),
  };
  const brain = readBrainConfig(env, problems);

  const logLevelRaw = (readEnv(env, "LOG_LEVEL") ?? DEFAULTS.logLevel).toLowerCase();
  if (!LOG_LEVELS.includes(logLevelRaw as LogLevel)) {
    problems.push({ field: "LOG_LEVEL", message: `expected one of ${LOG_LEVELS.join(", ")}, got "${logLevelRaw}"` });
  }
  const logLevel = (LOG_LEVELS.includes(logLevelRaw as LogLevel) ? logLevelRaw : DEFAULTS.logLevel) as LogLevel;

  const confidenceAct = parseRatio(readEnv(env, "CONFIDENCE_ACT") ?? String(DEFAULTS.confidenceAct), "CONFIDENCE_ACT", problems);
  const confidenceStrong = parseRatio(
    readEnv(env, "CONFIDENCE_STRONG") ?? String(DEFAULTS.confidenceStrong),
    "CONFIDENCE_STRONG",
    problems,
  );
  if (confidenceAct > confidenceStrong) {
    warnings.push(
      `CONFIDENCE_ACT (${confidenceAct}) is above CONFIDENCE_STRONG (${confidenceStrong}); the strong tier is unreachable`,
    );
  }

  const maxRequests = parseInteger(
    readEnv(env, "MAX_REQUESTS") ?? String(DEFAULTS.maxRequests),
    "MAX_REQUESTS",
    problems,
    { min: 1, max: 1_000_000 },
  );
  const maxTokens = parseCount(readEnv(env, "MAX_TOKENS") ?? DEFAULTS.maxTokens, "MAX_TOKENS", problems);

  const enricherEnabled = parseBoolean(
    readEnv(env, "ENRICHER_ENABLED") ?? String(DEFAULTS.enricherEnabled),
    "ENRICHER_ENABLED",
    problems,
  );
  const enricherBaseUrlRaw = readEnv(env, "ENRICHER_BASE_URL");
  const enricherBaseUrl = enricherBaseUrlRaw
    ? parseUrl(enricherBaseUrlRaw, "ENRICHER_BASE_URL", problems)
    : null;
  const enricherApiKey = readEnv(env, "ENRICHER_API_KEY");
  const enricherModel = readEnv(env, "ENRICHER_MODEL");
  const enricherTasks = (readEnv(env, "ENRICHER_TASKS") ?? DEFAULTS.enricherTasks)
    .split(",")
    .map((task) => task.trim())
    .filter((task) => task.length > 0);
  if (enricherEnabled && !enricherBaseUrl) {
    problems.push({ field: "ENRICHER_BASE_URL", message: "required when ENRICHER_ENABLED=true" });
  }
  if (enricherEnabled && !enricherModel) {
    problems.push({ field: "ENRICHER_MODEL", message: "required when ENRICHER_ENABLED=true" });
  }

  if (problems.length > 0) throw new ConfigError(problems);

  return {
    sts2: { baseUrl, portScan, timeoutMs: sts2TimeoutMs },
    jev: {
      apiKey: jevApiKey,
      baseUrl: jevBaseUrl,
      model: jevModel,
      timeoutMs: DEFAULTS.jevTimeoutMs,
      maxRetries: DEFAULTS.jevMaxRetries,
    },
    enricher: {
      enabled: enricherEnabled,
      baseUrl: enricherBaseUrl,
      apiKey: enricherApiKey,
      model: enricherModel,
      tasks: enricherTasks,
    },
    thresholds: { act: confidenceAct, strong: confidenceStrong },
    budgets: { maxRequests, maxTokens },
    run: { start: runStart, character },
    shop: { discardPotions: shopDiscardPotions },
    allowFtueModals,
    strictJev,
    combatPlanner,
    jevContext,
    fightPlan,
    fightPlanLog,
    runPlan,
    runPlanLog,
    buildDecider,
    buildOneshot,
    bossSimBuild,
    combatDeepseek,
    thiefFacts,
    mechRules,
    sl,
    brain,
    deepseek,
    escalation,
    mode,
    log: { level: logLevel, decisionLog, ...jevPromptLogConfig(readEnv(env, "JEV_PROMPT_LOG")), ...runConfigLogConfig(readEnv(env, "RUN_CONFIG_LOG")) },
    warnings,
  };
}

/** JEV_PROMPT_LOG: a path, or off/none/false to log no prompts; unset leaves the default (next to the decision log). */
function jevPromptLogConfig(raw: string | null): { jevPromptLog?: string | null } {
  if (raw === null) return {};
  return /^(off|none|false|0)$/i.test(raw) ? { jevPromptLog: null } : { jevPromptLog: raw };
}

/** RUN_CONFIG_LOG: a path, or off/none/false to write no run configuration; unset leaves the default (next to the decision log). */
function runConfigLogConfig(raw: string | null): { runConfigLog?: string | null } {
  if (raw === null) return {};
  return /^(off|none|false|0)$/i.test(raw) ? { runConfigLog: null } : { runConfigLog: raw };
}

/** Throws a ConfigError with an actionable message when the Jev key is missing. */
export function requireJevApiKey(config: AppConfig): string {
  if (!config.jev.apiKey) {
    throw new ConfigError([
      {
        field: "TYPESAFE_API_KEY",
        message:
          "missing. Set it in the environment or in .env (copy .env.example), " +
          "create a key at https://console.typesafe.ai/settings/keys, " +
          "or pass --no-jev to skip the Jev checks",
      },
    ]);
  }
  return config.jev.apiKey;
}

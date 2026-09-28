import { readFileSync } from "node:fs";
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

export interface AppConfig {
  sts2: Sts2Config;
  jev: JevConfig;
  enricher: EnricherConfig;
  /** Escalation model for Jev's near-guesses on high-stakes calls (phase 2). null when no key. */
  deepseek: { apiKey: string; baseUrl: string; model: string; maxCalls: number; timeoutMs: number; guideFile: string; handbookFile: string; reasoningEffort: string; combatReasoningEffort: string; reasoningLog: string } | null;
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
   * With BUILD_DECIDER=deepseek, whether in-combat card picks (the only in-combat questions that still
   * carry an escalation; turn plans no longer do) may escalate to DeepSeek on Jev's near-guesses. `off`
   * (default): combat, potions and in-combat card picks stay with code and Jev.
   */
  combatDeepseek: "off" | "on";
  mode: Mode;
  log: { level: LogLevel; decisionLog: string };
  warnings: string[];
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
        reasoningLog: readEnv(env, "DEEPSEEK_REASONING_LOG") ?? "logs/deepseek-reasoning.jsonl",
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
  const combatDeepseekRaw = (readEnv(env, "COMBAT_DEEPSEEK") ?? "off").toLowerCase();
  if (combatDeepseekRaw !== "off" && combatDeepseekRaw !== "on") {
    problems.push({ field: "COMBAT_DEEPSEEK", message: `expected off or on, got "${combatDeepseekRaw}"` });
  }
  const combatDeepseek: "off" | "on" = combatDeepseekRaw === "on" ? "on" : "off";

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
    combatDeepseek,
    deepseek,
    escalation,
    mode,
    log: { level: logLevel, decisionLog: readEnv(env, "DECISION_LOG") ?? DEFAULTS.decisionLog },
    warnings,
  };
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

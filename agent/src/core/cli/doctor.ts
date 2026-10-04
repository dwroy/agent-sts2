/**
 * `doctor`: prove the two halves of the system work before any gameplay code exists
 * (M0 acceptance criterion in PLAN.md §12).
 *
 * Order matters: the mod is checked first, because "no game running" is the most common failure and
 * it has nothing to do with Jev.
 */

import { ConfigError, requireJevApiKey, type AppConfig } from "../config.js";
import { JevClient, type JevError } from "../../reflex/jev/client.js";
import { ModClient, ModProtocolError, ModResponseError, ModUnreachableError } from "../../hand/mod/client.js";
import { ModDiscoveryError, discoverMod, type DiscoveryAttempt } from "../../hand/mod/discovery.js";
import { PayloadShapeError, checkCompatibility, type AvailableActions, type GameState, type Health } from "../../hand/mod/schema.js";
import { formatMs, redactSecret, style } from "../util/format.js";

export interface DoctorOptions {
  config: AppConfig;
  skipJev: boolean;
  json: boolean;
}

type CheckStatus = "ok" | "note" | "warn" | "error";

interface Check {
  section: string;
  status: CheckStatus;
  label: string;
  detail: string | null;
}

const MARKERS: Record<CheckStatus, string> = {
  ok: "  ok  ",
  note: " note ",
  warn: " warn ",
  error: " FAIL ",
};

function marker(status: CheckStatus): string {
  const text = MARKERS[status];
  if (status === "ok") return style.green(text);
  if (status === "note") return style.cyan(text);
  if (status === "warn") return style.yellow(text);
  return style.red(text);
}

function describeError(error: unknown): string {
  if (error instanceof ModDiscoveryError) return error.message;
  if (error instanceof ModResponseError) {
    const retry = error.retryable ? " (retryable)" : "";
    return `${error.code}: ${error.message}${retry}`;
  }
  if (error instanceof ModUnreachableError) return error.message;
  if (error instanceof ModProtocolError) {
    const snippet = error.bodySnippet ? ` | body starts with: ${JSON.stringify(error.bodySnippet.slice(0, 80))}` : "";
    return `${error.message}${snippet}`;
  }
  if (error instanceof PayloadShapeError) return error.message;
  if (error instanceof ConfigError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

function jevErrorDetail(error: unknown): string | null {
  if (error && typeof error === "object" && "hint" in error) {
    const hint = (error as JevError).hint;
    return hint ? hint : null;
  }
  return null;
}

function summarizeState(state: GameState): string {
  const parts = [
    `screen ${state.screen}`,
    `session ${state.session.mode}/${state.session.phase}`,
    state.in_combat ? `in combat (turn ${state.turn ?? "?"})` : "not in combat",
  ];
  return parts.join(" | ");
}

function summarizeRun(state: GameState): string | null {
  const run = state.run;
  if (!run) return null;
  const parts: string[] = [];
  if (run.character_name) parts.push(run.character_name);
  if (run.floor !== null) parts.push(`floor ${run.floor}`);
  if (run.current_hp !== null && run.max_hp !== null) {
    const pct = run.max_hp > 0 ? Math.round((run.current_hp / run.max_hp) * 100) : null;
    parts.push(`${run.current_hp}/${run.max_hp} HP${pct === null ? "" : ` (${pct}%)`}`);
  }
  if (run.gold !== null) parts.push(`${run.gold} gold`);
  if (run.ascension !== null && run.ascension > 0) parts.push(`ascension ${run.ascension}`);
  if (run.deck_size !== null) parts.push(`${run.deck_size} cards`);
  return parts.length > 0 ? parts.join(" | ") : null;
}

function summarizeCombat(state: GameState): string | null {
  const combat = state.combat;
  if (!combat) return null;
  const parts: string[] = [];
  if (combat.current_hp !== null && combat.max_hp !== null) parts.push(`${combat.current_hp}/${combat.max_hp} HP`);
  if (combat.energy !== null) parts.push(`${combat.energy} energy`);
  if (combat.block !== null) parts.push(`${combat.block} block`);
  if (combat.hand_count !== null) parts.push(`${combat.hand_count} cards in hand`);
  if (combat.living_enemy_count !== null) parts.push(`${combat.living_enemy_count} enemies alive`);
  if (combat.can_use_combat_actions === false && combat.readiness_reason) parts.push(`waiting: ${combat.readiness_reason}`);
  if (combat.end_turn_will_kill_player === true) parts.push("ending the turn would be lethal");
  return parts.length > 0 ? parts.join(" | ") : null;
}

export async function runDoctor(options: DoctorOptions): Promise<number> {
  const { config } = options;
  const checks: Check[] = [];
  const add = (section: string, status: CheckStatus, label: string, detail: string | null = null): void => {
    checks.push({ section, status, label, detail });
  };

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  add(
    "runtime",
    nodeMajor >= 20 ? "ok" : "error",
    `node ${process.version}`,
    nodeMajor >= 20 ? null : "Node 20 or newer is required by @typesafe-ai/sdk",
  );
  add(
    "config",
    "note",
    `mode ${config.mode} | sts2 ${config.sts2.baseUrl} | scan ${config.sts2.portScan.from}-${config.sts2.portScan.to}`,
    `model ${config.jev.model} | key ${redactSecret(config.jev.apiKey)} | enricher ${config.enricher.enabled ? "on" : "off"}`,
  );
  for (const warning of config.warnings) add("config", "warn", warning);

  /* ---- mod ------------------------------------------------------------------------------------ */

  let discoveryUrl: string | null = null;
  let health: Health | null = null;
  let state: GameState | null = null;
  let actions: AvailableActions | null = null;
  let discoveryAttempts: DiscoveryAttempt[] = [];

  try {
    const discovery = await discoverMod({
      baseUrl: config.sts2.baseUrl,
      portScan: config.sts2.portScan,
      timeoutMs: config.sts2.timeoutMs,
    });
    health = discovery.health;
    discoveryUrl = discovery.url;
    discoveryAttempts = discovery.attempts;
    const scanned = discovery.attempts.filter((attempt) => attempt.source === "scan" && attempt.ok).length;
    add(
      "mod",
      "ok",
      `discovered at ${discovery.url}`,
      scanned > 0
        ? `found by scanning (configured ${config.sts2.baseUrl} did not answer); the mod reports ${discovery.reportedUrl}`
        : null,
    );
    add(
      "mod",
      "ok",
      `service ${health.service} | mod ${health.mod_version} | protocol ${health.protocol_version}`,
      `game ${health.game_version ?? "unknown"} | pid ${health.process_id ?? "?"} | role ${health.instance_role ?? "?"}`,
    );
    add(
      "mod",
      health.status === "ready" ? "ok" : "error",
      `status ${health.status}`,
      health.status === "ready"
        ? null
        : "the mod cannot read every field it needs; affected fields fall back to defaults",
    );
    const compatibility = health.compatibility;
    if (compatibility) {
      const checked = compatibility.reflected_members_checked ?? 0;
      const missing = compatibility.reflected_members_missing ?? 0;
      add(
        "mod",
        missing > 0 ? "error" : "ok",
        `reflection self-check: ${checked - missing}/${checked} members found`,
        missing > 0
          ? compatibility.missing_members.map((entry) => `${entry.member} breaks ${entry.feature}`).join(", ")
          : null,
      );
    }
  } catch (error) {
    add("mod", "error", describeError(error));
  }

  if (discoveryUrl) {
    const client = new ModClient({ baseUrl: discoveryUrl, timeoutMs: config.sts2.timeoutMs });
    try {
      actions = await client.availableActions();
      add(
        "state",
        "ok",
        `${actions.actions.length} legal actions on ${actions.screen}`,
        actions.actions.map((action) => action.name).join(", "),
      );
    } catch (error) {
      add("state", "error", `GET /actions/available failed`, describeError(error));
    }
    try {
      state = await client.state();
      add("state", "ok", summarizeState(state), summarizeRun(state) ?? "no active run");
      const combat = summarizeCombat(state);
      if (combat) add("state", "note", combat);
    } catch (error) {
      add("state", "error", "GET /state failed", describeError(error));
    }
  }

  if (health) {
    const report = checkCompatibility(health, state);
    for (const message of report.warnings) add("compat", "warn", message);
    for (const message of report.errors) add("compat", "error", message);
  }

  /* ---- jev ------------------------------------------------------------------------------------ */

  if (options.skipJev) {
    add("jev", "note", "skipped (--no-jev)");
  } else {
    try {
      const apiKey = requireJevApiKey(config);
      const jev = new JevClient({
        apiKey,
        baseUrl: config.jev.baseUrl,
        model: config.jev.model,
        timeoutMs: config.jev.timeoutMs,
        maxRetries: config.jev.maxRetries,
      });
      try {
        const models = await jev.listModels();
        add("jev", "ok", `authenticated | ${models.length} models available`, models.slice(0, 8).join(", "));
      } catch (error) {
        add("jev", "warn", "could not list models", describeError(error));
      }
      try {
        const smoke = await jev.smoke();
        const sane = smoke.answer >= 0.5;
        add(
          "jev",
          sane ? "ok" : "warn",
          `smoke question answered noul=${smoke.answer.toFixed(3)} in ${formatMs(smoke.latencyMs)}`,
          `model ${smoke.model} | ${smoke.inputTokens} in / ${smoke.outputTokens} out tokens` +
            (sane ? "" : " | expected ~1.0; check JEV_MODEL and TYPESAFE_BASE_URL"),
        );
      } catch (error) {
        add("jev", "error", "smoke question failed", [describeError(error), jevErrorDetail(error)].filter(Boolean).join(" | "));
      }
    } catch (error) {
      add("jev", "error", describeError(error));
    }
  }

  /* ---- output --------------------------------------------------------------------------------- */

  const errors = checks.filter((check) => check.status === "error").length;
  const warnings = checks.filter((check) => check.status === "warn").length;
  const ok = checks.filter((check) => check.status === "ok").length;
  const notes = checks.filter((check) => check.status === "note").length;
  const failed = errors > 0;

  if (options.json) {
    const payload = {
      ok: !failed,
      summary: { ok, notes, warnings, errors },
      checks,
      config: {
        mode: config.mode,
        sts2: config.sts2,
        jev: { model: config.jev.model, baseUrl: config.jev.baseUrl, apiKey: redactSecret(config.jev.apiKey) },
        enricher: { ...config.enricher, apiKey: redactSecret(config.enricher.apiKey) },
      },
      discovery: discoveryAttempts,
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return failed ? 1 : 0;
  }

  process.stdout.write(`${style.bold("jev-sts2 doctor")}\n\n`);
  let currentSection: string | null = null;
  for (const check of checks) {
    if (check.section !== currentSection) {
      currentSection = check.section;
      process.stdout.write(`${style.bold(currentSection)}\n`);
    }
    process.stdout.write(`${marker(check.status)} ${check.label}\n`);
    if (check.detail) process.stdout.write(`         ${style.dim(check.detail)}\n`);
  }
  process.stdout.write(
    `\n${ok} ok, ${notes} notes, ${warnings} warnings, ${errors} errors\n`,
  );
  if (failed) {
    process.stdout.write(`${style.red("doctor failed")} — fix the FAIL lines above and re-run.\n`);
  }
  return failed ? 1 : 0;
}

/**
 * Payload validation for the STS2-Agent HTTP API (protocol `2026-03-11-v1`, state model 11).
 *
 * Hand-rolled on purpose (PLAN.md §4): we check only the fields the loop depends on, keep every
 * other field untouched, and control the error text — so a schema break after a game patch reads as
 * "the mod changed shape at this path" rather than as a stack trace. Field names stay snake_case to
 * match the wire format, which removes a whole class of translation bugs.
 */

export interface ValidationIssue {
  path: string;
  message: string;
}

export class PayloadShapeError extends Error {
  readonly what: string;
  readonly issues: ValidationIssue[];

  constructor(what: string, issues: ValidationIssue[]) {
    super(`${what} did not match the expected shape:\n${issues.map((i) => `  - ${i.path}: ${i.message}`).join("\n")}`);
    this.name = "PayloadShapeError";
    this.what = what;
    this.issues = issues;
  }
}

class Checker {
  readonly issues: ValidationIssue[] = [];

  constructor(private readonly what: string) {}

  add(path: string, message: string): void {
    this.issues.push({ path, message });
  }

  done(): void {
    if (this.issues.length > 0) throw new PayloadShapeError(this.what, this.issues);
  }
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "missing";
  if (Array.isArray(value)) return `array(${value.length})`;
  return typeof value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown, path: string, checker: Checker): Record<string, unknown> {
  if (!isRecord(value)) {
    checker.add(path, `expected an object, got ${describe(value)}`);
    return {};
  }
  return value;
}

function requireString(obj: Record<string, unknown>, key: string, path: string, checker: Checker): string {
  const value = obj[key];
  if (typeof value === "string") return value;
  checker.add(`${path}.${key}`, `expected a string, got ${describe(value)}`);
  return "";
}

function optionalString(obj: Record<string, unknown>, key: string, path: string, checker: Checker): string | null {
  const value = obj[key];
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  checker.add(`${path}.${key}`, `expected a string or null, got ${describe(value)}`);
  return null;
}

function requireNumber(obj: Record<string, unknown>, key: string, path: string, checker: Checker): number {
  const value = obj[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  checker.add(`${path}.${key}`, `expected a number, got ${describe(value)}`);
  return 0;
}

function optionalNumber(obj: Record<string, unknown>, key: string, path: string, checker: Checker): number | null {
  const value = obj[key];
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  checker.add(`${path}.${key}`, `expected a number or null, got ${describe(value)}`);
  return null;
}

function optionalBoolean(obj: Record<string, unknown>, key: string, path: string, checker: Checker): boolean | null {
  const value = obj[key];
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value;
  checker.add(`${path}.${key}`, `expected a boolean or null, got ${describe(value)}`);
  return null;
}

function requireArray(obj: Record<string, unknown>, key: string, path: string, checker: Checker): unknown[] {
  const value = obj[key];
  if (Array.isArray(value)) return value;
  checker.add(`${path}.${key}`, `expected an array, got ${describe(value)}`);
  return [];
}

function requireStringArray(obj: Record<string, unknown>, key: string, path: string, checker: Checker): string[] {
  const raw = requireArray(obj, key, path, checker);
  const out: string[] = [];
  raw.forEach((entry, index) => {
    if (typeof entry === "string") out.push(entry);
    else checker.add(`${path}.${key}[${index}]`, `expected a string, got ${describe(entry)}`);
  });
  return out;
}

function optionalObject(
  obj: Record<string, unknown>,
  key: string,
  path: string,
  checker: Checker,
): Record<string, unknown> | null {
  const value = obj[key];
  if (value === undefined || value === null) return null;
  return asRecord(value, `${path}.${key}`, checker);
}

/* -------------------------------------------------------------------------- */
/* /health                                                                    */
/* -------------------------------------------------------------------------- */

export interface MissingMember {
  member: string;
  feature: string;
}

export interface Compatibility {
  reflected_members_checked: number | null;
  reflected_members_missing: number | null;
  missing_members: MissingMember[];
}

export interface Health {
  service: string;
  mod_version: string;
  protocol_version: string;
  game_version: string | null;
  status: string;
  api_host: string;
  api_port: number;
  process_id: number | null;
  instance_role: string | null;
  play_running: boolean | null;
  play_phase: string | null;
  session_requests: number | null;
  compatibility: Compatibility | null;
  raw: Record<string, unknown>;
}

function parseCompatibility(value: unknown, path: string, checker: Checker): Compatibility | null {
  if (value === undefined || value === null) return null;
  const obj = asRecord(value, path, checker);
  const missingRaw = requireArray(obj, "missing_members", path, checker);
  const missing_members: MissingMember[] = missingRaw.map((entry, index) => {
    const item = asRecord(entry, `${path}.missing_members[${index}]`, checker);
    return {
      member: optionalString(item, "member", `${path}.missing_members[${index}]`, checker) ?? "unknown",
      feature: optionalString(item, "feature", `${path}.missing_members[${index}]`, checker) ?? "unknown",
    };
  });
  return {
    reflected_members_checked: optionalNumber(obj, "reflected_members_checked", path, checker),
    reflected_members_missing: optionalNumber(obj, "reflected_members_missing", path, checker),
    missing_members,
  };
}

export function parseHealth(data: unknown): Health {
  const checker = new Checker("/health");
  const obj = asRecord(data, "data", checker);
  const health: Health = {
    service: requireString(obj, "service", "data", checker),
    mod_version: requireString(obj, "mod_version", "data", checker),
    protocol_version: requireString(obj, "protocol_version", "data", checker),
    game_version: optionalString(obj, "game_version", "data", checker),
    status: requireString(obj, "status", "data", checker),
    api_host: requireString(obj, "api_host", "data", checker),
    api_port: requireNumber(obj, "api_port", "data", checker),
    process_id: optionalNumber(obj, "process_id", "data", checker),
    instance_role: optionalString(obj, "instance_role", "data", checker),
    play_running: optionalBoolean(obj, "play_running", "data", checker),
    play_phase: optionalString(obj, "play_phase", "data", checker),
    session_requests: optionalNumber(obj, "session_requests", "data", checker),
    compatibility: parseCompatibility(obj["compatibility"], "data.compatibility", checker),
    raw: obj,
  };
  checker.done();
  return health;
}

/* -------------------------------------------------------------------------- */
/* /state                                                                     */
/* -------------------------------------------------------------------------- */

export interface SessionSummary {
  mode: string;
  phase: string;
  control_scope: string | null;
  raw: Record<string, unknown>;
}

export interface RunSummary {
  floor: number | null;
  current_hp: number | null;
  max_hp: number | null;
  gold: number | null;
  character_name: string | null;
  act_id: string | null;
  boss_id: string | null;
  ascension: number | null;
  deck_size: number | null;
  raw: Record<string, unknown>;
}

export interface CombatSummary {
  current_hp: number | null;
  max_hp: number | null;
  energy: number | null;
  block: number | null;
  hand_count: number | null;
  enemy_count: number | null;
  living_enemy_count: number | null;
  end_turn_will_kill_player: boolean | null;
  can_use_combat_actions: boolean | null;
  readiness_reason: string | null;
  raw: Record<string, unknown>;
}

export interface GameState {
  state_version: number;
  screen: string;
  session: SessionSummary;
  in_combat: boolean;
  turn: number | null;
  available_actions: string[];
  run: RunSummary | null;
  combat: CombatSummary | null;
  raw: Record<string, unknown>;
}

function parseSession(value: unknown, path: string, checker: Checker): SessionSummary {
  const obj = asRecord(value, path, checker);
  return {
    mode: requireString(obj, "mode", path, checker),
    phase: requireString(obj, "phase", path, checker),
    control_scope: optionalString(obj, "control_scope", path, checker),
    raw: obj,
  };
}

function parseRun(value: unknown, path: string, checker: Checker): RunSummary | null {
  if (value === undefined || value === null) return null;
  const obj = asRecord(value, path, checker);
  const deck = obj["deck"];
  return {
    floor: optionalNumber(obj, "floor", path, checker),
    current_hp: optionalNumber(obj, "current_hp", path, checker),
    max_hp: optionalNumber(obj, "max_hp", path, checker),
    gold: optionalNumber(obj, "gold", path, checker),
    character_name: optionalString(obj, "character_name", path, checker),
    act_id: optionalString(obj, "act_id", path, checker),
    boss_id: optionalString(obj, "boss_id", path, checker),
    ascension: optionalNumber(obj, "ascension", path, checker),
    deck_size: Array.isArray(deck) ? deck.length : null,
    raw: obj,
  };
}

function parseCombat(value: unknown, path: string, checker: Checker): CombatSummary | null {
  if (value === undefined || value === null) return null;
  const obj = asRecord(value, path, checker);
  const player = optionalObject(obj, "player", path, checker);
  const hand = obj["hand"];
  const enemies = obj["enemies"];
  const readiness = optionalObject(obj, "action_readiness", path, checker);
  const enemyList = Array.isArray(enemies) ? enemies : [];
  return {
    current_hp: player ? optionalNumber(player, "current_hp", `${path}.player`, checker) : null,
    max_hp: player ? optionalNumber(player, "max_hp", `${path}.player`, checker) : null,
    energy: player ? optionalNumber(player, "energy", `${path}.player`, checker) : null,
    block: player ? optionalNumber(player, "block", `${path}.player`, checker) : null,
    hand_count: Array.isArray(hand) ? hand.length : null,
    enemy_count: Array.isArray(enemies) ? enemyList.length : null,
    living_enemy_count: Array.isArray(enemies)
      ? enemyList.filter((enemy) => isRecord(enemy) && enemy["is_alive"] !== false).length
      : null,
    end_turn_will_kill_player: optionalBoolean(obj, "end_turn_will_kill_player", path, checker),
    can_use_combat_actions: readiness
      ? optionalBoolean(readiness, "can_use_combat_actions", `${path}.action_readiness`, checker)
      : null,
    readiness_reason: readiness ? optionalString(readiness, "reason", `${path}.action_readiness`, checker) : null,
    raw: obj,
  };
}

export function parseGameState(data: unknown): GameState {
  const checker = new Checker("/state");
  const obj = asRecord(data, "data", checker);
  const state: GameState = {
    state_version: requireNumber(obj, "state_version", "data", checker),
    screen: requireString(obj, "screen", "data", checker),
    session: parseSession(obj["session"], "data.session", checker),
    in_combat: optionalBoolean(obj, "in_combat", "data", checker) ?? false,
    turn: optionalNumber(obj, "turn", "data", checker),
    available_actions: requireStringArray(obj, "available_actions", "data", checker),
    run: parseRun(obj["run"], "data.run", checker),
    combat: parseCombat(obj["combat"], "data.combat", checker),
    raw: obj,
  };
  checker.done();
  return state;
}

/* -------------------------------------------------------------------------- */
/* /actions/available                                                         */
/* -------------------------------------------------------------------------- */

export interface ActionDescriptor {
  name: string;
  requires_target: boolean;
  requires_index: boolean;
  requires_coordinates: boolean;
  requires_tool: boolean;
}

export interface AvailableActions {
  screen: string;
  actions: ActionDescriptor[];
  raw: Record<string, unknown>;
}

export function parseAvailableActions(data: unknown): AvailableActions {
  const checker = new Checker("/actions/available");
  const obj = asRecord(data, "data", checker);
  const raw = requireArray(obj, "actions", "data", checker);
  const actions = raw.map((entry, index) => {
    const path = `data.actions[${index}]`;
    const item = asRecord(entry, path, checker);
    return {
      name: requireString(item, "name", path, checker),
      requires_target: optionalBoolean(item, "requires_target", path, checker) ?? false,
      requires_index: optionalBoolean(item, "requires_index", path, checker) ?? false,
      requires_coordinates: optionalBoolean(item, "requires_coordinates", path, checker) ?? false,
      requires_tool: optionalBoolean(item, "requires_tool", path, checker) ?? false,
    };
  });
  const result: AvailableActions = { screen: requireString(obj, "screen", "data", checker), actions, raw: obj };
  checker.done();
  return result;
}

/* -------------------------------------------------------------------------- */
/* POST /action                                                               */
/* -------------------------------------------------------------------------- */

export type ActionStatus = "completed" | "pending" | "failed";

export interface ActionResult {
  action: string;
  status: ActionStatus;
  stable: boolean;
  message: string;
  state: GameState | null;
  raw: Record<string, unknown>;
}

export function parseActionResult(data: unknown): ActionResult {
  const checker = new Checker("/action");
  const obj = asRecord(data, "data", checker);
  const statusRaw = requireString(obj, "status", "data", checker);
  if (statusRaw && !["completed", "pending", "failed"].includes(statusRaw)) {
    checker.add("data.status", `expected completed|pending|failed, got "${statusRaw}"`);
  }
  const stateRaw = obj["state"];
  const result: ActionResult = {
    action: requireString(obj, "action", "data", checker),
    status: (statusRaw || "failed") as ActionStatus,
    stable: optionalBoolean(obj, "stable", "data", checker) ?? false,
    message: optionalString(obj, "message", "data", checker) ?? "",
    state: stateRaw === undefined || stateRaw === null ? null : parseGameState(stateRaw),
    raw: obj,
  };
  checker.done();
  return result;
}

/* -------------------------------------------------------------------------- */
/* Envelope + version guards                                                  */
/* -------------------------------------------------------------------------- */

export interface Sts2ErrorPayload {
  code: string;
  message: string;
  details: unknown;
  retryable: boolean;
}

export interface Envelope {
  ok: boolean;
  request_id: string | null;
  data: unknown;
  error: Sts2ErrorPayload | null;
}

export function parseEnvelope(value: unknown): Envelope {
  const checker = new Checker("response envelope");
  const obj = asRecord(value, "body", checker);
  const okRaw = obj["ok"];
  if (typeof okRaw !== "boolean") checker.add("body.ok", `expected a boolean, got ${describe(okRaw)}`);
  const ok = okRaw === true;

  let error: Sts2ErrorPayload | null = null;
  const errorRaw = obj["error"];
  if (errorRaw !== undefined && errorRaw !== null) {
    const errorObj = asRecord(errorRaw, "body.error", checker);
    error = {
      code: optionalString(errorObj, "code", "body.error", checker) ?? "unknown_error",
      message: optionalString(errorObj, "message", "body.error", checker) ?? "",
      details: errorObj["details"] ?? null,
      retryable: optionalBoolean(errorObj, "retryable", "body.error", checker) ?? false,
    };
  } else if (okRaw === false) {
    checker.add("body.error", "expected an error object when ok is false");
  }

  const envelope: Envelope = {
    ok,
    request_id: optionalString(obj, "request_id", "body", checker),
    data: obj["data"] ?? null,
    error,
  };
  checker.done();
  return envelope;
}

/** The protocol and state-model versions this project was written against. */
export const KNOWN_PROTOCOL_VERSION = "2026-03-11-v1";
export const KNOWN_PROTOCOL_PREFIX = "2026-03-11";
/**
 * The upstream `docs/api.md` on `main` documents `state_version: 11`, but the installed Workshop
 * build (mod 0.12.5) reports 16. Every field this project validates is present in both, so the guard
 * stays a warning rather than an error: it exists to tell us the shape moved, not to block a run.
 */
export const KNOWN_STATE_VERSION = 16;

export interface CompatibilityReport {
  errors: string[];
  warnings: string[];
}

/**
 * Turns the mod's self-report into actionable messages. Errors stop a run; warnings are printed and
 * the loop continues (PLAN.md §8.2, risk 8).
 */
export function checkCompatibility(health: Health, state: GameState | null): CompatibilityReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (health.service !== "sts2-ai-agent") {
    errors.push(`/health answered with service "${health.service}", not "sts2-ai-agent" — is this the right port?`);
  }
  if (health.status !== "ready") {
    const missing = health.compatibility?.missing_members ?? [];
    const detail =
      missing.length > 0
        ? `: ${missing.map((entry) => `${entry.member} (breaks ${entry.feature})`).join(", ")}`
        : "";
    errors.push(`mod reports status="${health.status}"${detail} — some fields will silently fall back to defaults`);
  }
  if (health.compatibility && health.compatibility.missing_members.length > 0) {
    errors.push(
      `reflected members missing: ${health.compatibility.missing_members
        .map((entry) => `${entry.member} (${entry.feature})`)
        .join(", ")}`,
    );
  }
  if (health.protocol_version !== KNOWN_PROTOCOL_VERSION) {
    const sameSeries = health.protocol_version.startsWith(KNOWN_PROTOCOL_PREFIX);
    warnings.push(
      sameSeries
        ? `mod protocol "${health.protocol_version}" is a revision of the one this project targets ` +
            `("${KNOWN_PROTOCOL_VERSION}") — new fields are expected, removals are not`
        : `mod protocol "${health.protocol_version}" is a different series from the one this project ` +
            `targets ("${KNOWN_PROTOCOL_VERSION}") — payload fields may have changed`,
    );
  }
  if (state && state.state_version !== KNOWN_STATE_VERSION) {
    warnings.push(
      `state model version ${state.state_version} differs from the known version ${KNOWN_STATE_VERSION}`,
    );
  }

  return { errors, warnings };
}

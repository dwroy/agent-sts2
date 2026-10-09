/**
 * The ops session's wake through an interactive codex TUI in a herdr pane (CODEX_OPS_MODE=herdr, or `ops=herdr` in
 * ops/codex-ops/hosting; docs/codex-ops.md「herdr 托管」). The same session as the headless path: the TUI is
 * `codex resume <session id>` with the same permission profile and -c settings (lib.ts interactiveArgs), started once by
 * `herdr agent start ops --kind codex --pane <id> -- …` in the pane labelled `ops` (ops/herdr-host.sh open-pane), and
 * kept open between wakes so a person can watch it or type into it.
 *
 * A wake: wait until the TUI is ready (herdr state idle / done, the composer empty — a person may be typing — and no turn
 * open in the session file), submit the events with `herdr agent prompt ops`, then follow codex's own session file
 * (rollout) until the turn that carries the message ends (task_complete / turn_aborted). herdr's state is screen-read and
 * can stay `unknown`, so the rollout is the authority for completion and for the token usage (token_usage_record).
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, openSync, readFileSync, readSync, statSync, writeFileSync } from "node:fs";

import { findRollout } from "../../learner/lib/summary.js";
import { readRolloutMetadata } from "./rollout-file.js";

/* ---- pure parts (tested) ------------------------------------------------------------------------------------- */

export type ComposerState = "empty" | "text" | "none";

/**
 * The codex composer on a herdr `pane read --format ansi` screen: its line starts with the bold prompt glyph "› ";
 * a placeholder ("Ask Codex to do anything", …) is drawn dim (SGR 2) right after it, typed text is not (codex-cli 0.160,
 * verified 2026-10-05). "none" when no composer line is on the screen (a menu, a dialog, the TUI not drawn yet).
 */
export function composerState(ansi: string): ComposerState {
  const lines = ansi.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!.replace(/\r/g, "");
    const at = line.indexOf("› ");
    if (at < 0) continue;
    // What follows the glyph, without the reset sequences codex puts around it.
    let rest = line.slice(at + 2);
    while (rest.startsWith("\u001b[0m")) rest = rest.slice(4);
    if (rest.replace(/\u001b\[[0-9;]*m/g, "").trim() === "") return "empty";
    if (/^\u001b\[2m/.test(rest)) return "empty";
    return "text";
  }
  return "none";
}

export interface TurnTokens {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  reasoning: number;
}

export interface RolloutTurn {
  /** The turn id of the turn whose user message contains the marker. */
  turnId?: string;
  complete: boolean;
  aborted: boolean;
  lastMessage?: string;
  tokens?: TurnTokens;
  /** A turn started and has not ended (any turn, ours or a person's). */
  openTurn?: string;
  /** The rows of our turn, as written (for the wake log). */
  rows: string[];
}

const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

function userText(row: { type?: string; payload?: Record<string, unknown> }): string {
  const p = row.payload ?? {};
  if (row.type === "event_msg" && p["type"] === "user_message") return String(p["message"] ?? "");
  if (row.type === "response_item" && p["type"] === "message" && p["role"] === "user") {
    const content = Array.isArray(p["content"]) ? (p["content"] as { text?: unknown }[]) : [];
    return content.map((part) => String(part.text ?? "")).join("\n");
  }
  return "";
}

/**
 * Our turn in the part of a codex session file written since the prompt was submitted: the turn whose user message
 * contains `marker`, whether it completed or was aborted, its last answer and its token usage (the last
 * token_usage_record's turn_token_usage; input there includes the cached tokens, as in `codex exec --json`).
 */
export function rolloutTurn(text: string, marker: string): RolloutTurn {
  const turn: RolloutTurn = { complete: false, aborted: false, rows: [] };
  let current: string | undefined;
  let turnRows: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let row: { type?: string; payload?: Record<string, unknown> };
    try {
      row = JSON.parse(line) as typeof row;
    } catch {
      continue; // a line still being written
    }
    const p = row.payload ?? {};
    const kind = String(p["type"] ?? "");
    const id = typeof p["turn_id"] === "string" ? (p["turn_id"] as string) : undefined;
    if (row.type === "event_msg" && kind === "task_started" && id) {
      current = id;
      turn.openTurn = id;
      if (!turn.turnId) turnRows = [];
    }
    if (!turn.turnId) turnRows.push(line); // the current turn's rows until ours is known
    if (row.type === "event_msg" && (kind === "task_complete" || kind === "turn_aborted") && id === turn.openTurn) turn.openTurn = undefined;
    // No task_started after the prompt: the message went into a turn already running (codex steers it in); that turn's
    // first event with an id is ours.
    if (!turn.turnId && marker && userText(row).includes(marker)) {
      turn.turnId = current ?? "?";
      turn.rows.push(...turnRows);
      continue;
    }
    if (turn.turnId === "?" && id) turn.turnId = id;
    if (turn.turnId && (id === undefined || id === turn.turnId)) turn.rows.push(line);
    if (!turn.turnId || id !== turn.turnId) continue;
    if (row.type === "event_msg" && kind === "task_complete") {
      turn.complete = true;
      if (typeof p["last_agent_message"] === "string") turn.lastMessage = p["last_agent_message"] as string;
    }
    if (row.type === "event_msg" && kind === "turn_aborted") turn.aborted = true;
    if (row.type === "token_usage_record") {
      const u = (p["turn_token_usage"] ?? p["usage"]) as Record<string, unknown> | undefined;
      if (u) {
        const cached = num(u["cached_input_tokens"]);
        turn.tokens = {
          input: Math.max(0, num(u["input_tokens"]) - cached),
          output: num(u["output_tokens"]),
          cacheRead: cached,
          cacheCreation: num(u["cache_write_input_tokens"]),
          reasoning: num(u["reasoning_output_tokens"]),
        };
      }
    }
  }
  return turn;
}

/** The last turn of a whole session file is still open (started, neither completed nor aborted). */
export function openTurn(text: string): string | undefined {
  return rolloutTurn(text, "").openTurn;
}

/** A short hash of the TUI's arguments: a TUI started with other ones (a new key file, another effort) is restarted. */
export function argsHash(args: string[]): string {
  return createHash("sha256").update(JSON.stringify(args)).digest("hex").slice(0, 16);
}

/* ---- herdr ---------------------------------------------------------------------------------------------------- */

export interface HerdrResult {
  ok: boolean;
  code: number | null;
  result?: Record<string, unknown>;
  /** herdr's error code (agent_not_found, agent_not_ready, agent_blocked, …) or the process error. */
  error?: string;
  stdout: string;
  stderr: string;
}

export function runCommand(bin: string, args: string[], timeoutMs = 60_000, env: NodeJS.ProcessEnv = process.env): Promise<HerdrResult> {
  return new Promise((done) => {
    const child = spawn(bin, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      done({ ok: false, code: null, error: error.message, stdout, stderr });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const parse = (text: string): Record<string, unknown> | undefined => {
        try {
          return JSON.parse(text) as Record<string, unknown>;
        } catch {
          return undefined;
        }
      };
      const out = parse(stdout.trim());
      const err = parse(stderr.trim()) ?? out;
      const error = (err?.["error"] as { code?: string } | undefined)?.code;
      done({ ok: code === 0 && !error, code, result: out?.["result"] as Record<string, unknown> | undefined, error: error ?? (code === 0 ? undefined : stderr.trim().slice(-300) || `exit ${code}`), stdout, stderr });
    });
  });
}

export interface HerdrWakeOptions {
  herdr: string;
  /** ops/herdr-host.sh */
  hostScript: string;
  /** The live agent name and the pane label (both "ops" unless CODEX_OPS_HERDR_AGENT). */
  agent: string;
  session: string;
  /** The TUI's arguments after `codex` (lib.ts interactiveArgs). */
  args: string[];
  codexHome: string;
  message: string;
  /** A line of the message that identifies its turn in the rollout (the header with the time stamp). */
  marker: string;
  /** ops/codex-ops/herdr-ops.json: the pane, session and argument hash the TUI was started with. */
  stateFile: string;
  timeoutMs: number;
  /** How long to wait for the TUI to be ready (a person's turn or unsent text) before deferring (exit 75). */
  readyWaitMs: number;
  pollMs?: number;
  /** How long a submitted message may take to show up as a turn in the rollout (default 2 min). */
  submitWaitMs?: number;
  env?: NodeJS.ProcessEnv;
  log: (text: string) => void;
}

export interface HerdrWakeResult {
  /** 0 done, 1 failed, 75 deferred (busy, blocked, unsent text: the events stay queued, not a failure), 124 timed out. */
  code: 0 | 1 | 75 | 124;
  reason?: string;
  pane?: string;
  rollout?: string;
  turn?: RolloutTurn;
}

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

function readFrom(file: string, offset: number): string {
  const size = statSync(file).size;
  if (size <= offset) return "";
  const fd = openSync(file, "r");
  try {
    const buffer = Buffer.alloc(size - offset);
    readSync(fd, buffer, 0, buffer.length, offset);
    return buffer.toString("utf8");
  } finally {
    closeSync(fd);
  }
}

interface OpsTui {
  pane: string;
  session: string;
  args_hash: string;
  started: string;
}

function readState(file: string): OpsTui | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as OpsTui;
  } catch {
    return undefined;
  }
}

/** One wake through the herdr-hosted TUI. The caller holds the wake lock, ran the pre-check and runs the broker. */
export async function herdrWake(o: HerdrWakeOptions): Promise<HerdrWakeResult> {
  const env = o.env ?? process.env;
  const poll = o.pollMs ?? 2000;
  const h = (args: string[], ms?: number): Promise<HerdrResult> => runCommand(o.herdr, args, ms, env);
  const agentInfo = async (): Promise<Record<string, unknown> | undefined> => {
    const got = await h(["agent", "get", o.agent], 20_000);
    const agent = got.ok ? (got.result?.["agent"] as Record<string, unknown> | undefined) : undefined;
    return agent && agent["agent"] === "codex" ? agent : undefined;
  };
  const hash = argsHash(o.args);
  let agent = await agentInfo();
  const recorded = readState(o.stateFile);
  const rollout = findRollout(o.codexHome, o.session);
  if (!rollout) return { code: 1, reason: `session file of ${o.session} not found under ${o.codexHome}` };
  const sessionOpen = (): string | undefined => readRolloutMetadata(rollout).openTurn;

  const screen = async (pane: string): Promise<ComposerState> => {
    const read = await h(["pane", "read", pane, "--source", "visible", "--format", "ansi", "--lines", "15"], 20_000);
    return read.code === 0 ? composerState(read.stdout) : "none";
  };
  const shellIdle = async (pane: string): Promise<boolean> => {
    const info = await h(["pane", "process-info", "--pane", pane], 20_000);
    const p = info.result?.["process_info"] as { foreground_process_group_id?: number; shell_pid?: number } | undefined;
    return !!p && p.foreground_process_group_id === p.shell_pid;
  };

  // A TUI started for another session or with other arguments is restarted, but only while nothing is going on in it.
  if (agent && recorded && (recorded.session !== o.session || recorded.args_hash !== hash || recorded.pane !== agent["pane_id"])) {
    const pane = String(agent["pane_id"]);
    const status = String(agent["agent_status"]);
    if ((status === "idle" || status === "done") && (await screen(pane)) === "empty" && !sessionOpen()) {
      o.log(`herdr: the ops TUI in ${pane} runs with other settings (${recorded.session === o.session ? "arguments" : "session"} changed): restarting it`);
      await h(["agent", "send-keys", o.agent, "ctrl+c"]); // on an empty composer: quit
      for (let i = 0; i < 50 && !(await shellIdle(pane)); i++) await sleep(200);
      agent = undefined;
    } else {
      o.log(`herdr: the ops TUI runs with other settings but is busy (${status}); using it as it is this time`);
    }
  }

  if (!agent) {
    const opened = await runCommand("bash", [o.hostScript, "open-pane", o.agent, "--env", `CODEX_HOME=${o.codexHome}`], 90_000, env);
    const pane = opened.stdout.trim().split("\n").pop() ?? "";
    if (opened.code === 4) return { code: 75, reason: `the pane labelled ${o.agent} is busy with something else: ${opened.stderr.trim().slice(-200)}` };
    if (opened.code !== 0 || !/^[A-Za-z0-9]+:p[0-9]+$/.test(pane)) return { code: 1, reason: `open-pane ${o.agent} failed: ${opened.stderr.trim().slice(-300)}` };
    const started = await h(["agent", "start", o.agent, "--kind", "codex", "--pane", pane, "--timeout", "60000", "--", ...o.args], 90_000);
    if (!started.ok) {
      // agent_not_ready = a dialog at startup (trust, update, login): a person has to look; nothing is answered here.
      return { code: started.error === "agent_not_ready" ? 75 : 1, pane, reason: `herdr agent start failed (${started.error}); see herdr agent read ${o.agent}` };
    }
    writeFileSync(o.stateFile, `${JSON.stringify({ pane, session: o.session, args_hash: hash, started: new Date().toISOString() } satisfies OpsTui)}\n`);
    o.log(`herdr: started the ops TUI (codex resume ${o.session}) in pane ${pane}`);
    agent = await agentInfo();
    if (!agent) return { code: 1, pane, reason: "the TUI started but herdr does not see it" };
  }
  const pane = String(agent["pane_id"]);

  // Ready = herdr idle/done (or unknown with no open turn in the session file), an empty composer, no open turn.
  const readyBy = Date.now() + o.readyWaitMs;
  let why = "";
  for (;;) {
    const now = await agentInfo();
    if (!now) return { code: 1, pane, reason: "the ops TUI is gone (herdr sees no codex agent named ops)" };
    const status = String(now["agent_status"]);
    if (status === "blocked") return { code: 75, pane, reason: "the ops TUI shows a dialog (blocked): a person has to answer it" };
    const open = sessionOpen();
    const composer = status === "working" ? "none" : await screen(pane);
    if ((status === "idle" || status === "done" || status === "unknown") && !open && composer === "empty") break;
    why = open ? `a turn is open (${status})` : composer === "text" ? "unsent text in the composer (a person typing?)" : `state ${status}, composer ${composer}`;
    if (Date.now() > readyBy) return { code: 75, pane, reason: `not ready after ${Math.round(o.readyWaitMs / 60_000)} min: ${why}` };
    await sleep(poll);
  }

  const offset = statSync(rollout).size;
  const sent = await h(["agent", "prompt", o.agent, o.message], 60_000);
  if (!sent.ok) return { code: sent.error === "agent_blocked" ? 75 : 1, pane, rollout, reason: `herdr agent prompt failed (${sent.error})` };

  const deadline = Date.now() + o.timeoutMs;
  const submittedBy = Date.now() + (o.submitWaitMs ?? 120_000);
  let checks = 0;
  for (;;) {
    await sleep(poll);
    const turn = rolloutTurn(readFrom(rollout, offset), o.marker);
    if (turn.complete) return { code: 0, pane, rollout, turn };
    if (turn.aborted) return { code: 1, pane, rollout, turn, reason: "the turn was aborted (interrupted in the TUI?)" };
    if (++checks % 5 === 0 && !(await agentInfo())) return { code: 1, pane, rollout, turn, reason: "the ops TUI exited during the wake" };
    if (!turn.turnId && Date.now() > submittedBy) {
      // Pasted but never submitted: clear our own text (ctrl+c on a non-empty composer clears it) so the next wake can run.
      if ((await screen(pane)) === "text") await h(["agent", "send-keys", o.agent, "ctrl+c"]);
      return { code: 1, pane, rollout, turn, reason: `the message did not start a turn within ${Math.round((o.submitWaitMs ?? 120_000) / 1000)} s` };
    }
    if (Date.now() > deadline) {
      await h(["agent", "send-keys", o.agent, "esc"]); // interrupt the turn, keep the TUI
      return { code: 124, pane, rollout, turn, reason: `over ${Math.round(o.timeoutMs / 60_000)} min: interrupted (esc)` };
    }
  }
}

/** Where the ops TUI's pane, session and argument hash are recorded (next to herdr.json). */
export function tuiStateFile(dir: string): string {
  return `${dir}/herdr-ops.json`;
}

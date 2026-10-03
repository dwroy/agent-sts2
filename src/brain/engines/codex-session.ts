/**
 * Codex session mode (BRAIN_CODEX_MODE=session, Dai 2026-10-03): one long-lived `codex app-server` per play process
 * with one saved thread that holds only our system prompt; every brain question is a turn on it, answered with the
 * strict schema, then `thread/revert` takes the thread back to that base, so answers stay independent and the next
 * question's request is the system prompt plus the new question only. The prompt cache then holds the system prompt
 * across questions (measured: 156,672 of 165,586 input tokens cached on the second turn; exec mode: always 0).
 *
 * - Isolation as exec mode (engines/codex.ts): the same request (developer = our system prompt as the thread's base
 *   instructions, user = the question, no tool: the same feature switches, -c overrides and model catalog entry), the
 *   same AGENTS.md refusal. app-server has no --ignore-user-config: $CODEX_HOME/config.toml is checked before each
 *   thread is made (configTomlProblems: only model, model_reasoning_effort and [tui], all overridden or irrelevant),
 *   and the thread/start answer must list no instruction source. Either problem turns session mode off for the process
 *   (exec mode answers instead).
 * - The thread is saved (thread/revert needs a saved history), in $CODEX_HOME/sessions; it holds our prompt. Its
 *   working directory names it ours (<state>/session-cwd/<pid>-<start>): a process deletes its thread when it makes a
 *   new one and when it exits (thread/delete; at exit synchronously, its own rollout files), and deletes, on start,
 *   the ones a dead process left (sweepStale: only threads with a cwd under ours, from our state database).
 * - A new thread (new base) when the process starts, after any failed or interrupted turn, after a failed revert,
 *   and when the system prompt changes (its sha).
 * - Stalls: as exec mode, on the streamed notifications: no first delta within first_token_ms (when set), or, after
 *   it, no notification for stall_ms: the turn is interrupted (turn/interrupt) and reverted; the engine asks once more.
 *   So is a runaway answer: longer than maxAnswerChars, or maxAnswerBlanks whitespace characters in a row between its
 *   JSON tokens (2026-10-03: the runaways were whitespace without end after a complete reason; BlankRun).
 * - The server pushes the plan's rate limits after each turn (account/rateLimits/updated): handed to the usage guard.
 * - The process: stdio JSON-RPC (one JSON object per line), its own process group (killed on close), the agent
 *   environment (no keys), stdin open while it lives (app-server exits when stdin closes: it dies with us).
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { basename, dirname, join } from "node:path";

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/* ---- config.toml guard --------------------------------------------------------------------------- */

/** Top-level config.toml keys session mode accepts (both overridden per turn); any key under [tui] is accepted too. */
const ALLOWED_TOP_KEYS = new Set(["model", "model_reasoning_effort"]);

/**
 * What in $CODEX_HOME/config.toml session mode does not accept (app-server always loads it): [] when the file is fine
 * or absent. Accepted: blank lines, comments, `model` and `model_reasoning_effort` at the top level, and a [tui]
 * table (tui.*) with any single-line key = value. Anything else (another table such as [hooks], [mcp_servers.x],
 * [features], [projects.x]; another top-level key such as instructions, profile, notify; a dotted key; a value over
 * several lines; an array table) is named, by key only, never its value.
 */
export function configTomlProblems(text: string): string[] {
  const problems: string[] = [];
  let table: string | null = null;
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[")) {
      const header = /^\[\s*([A-Za-z0-9_-]+(?:\s*\.\s*[A-Za-z0-9_-]+)*)\s*\]\s*(#.*)?$/.exec(line);
      if (!header || line.startsWith("[[")) {
        problems.push(`line ${index + 1}: a table header session mode does not read`);
        table = "?";
        continue;
      }
      table = header[1]!.replace(/\s+/g, "");
      if (table !== "tui" && !table.startsWith("tui.")) problems.push(`[${table}]`);
      continue;
    }
    const pair = /^([A-Za-z0-9_-]+)\s*=\s*(.+)$/.exec(line);
    if (!pair) {
      problems.push(`line ${index + 1}: not a plain key = value`);
      continue;
    }
    const key = pair[1]!;
    const value = pair[2]!;
    const plain = /^("([^"\\]|\\.)*"|'[^']*'|true|false|-?\d+(\.\d+)?|\[[^\][]*\])\s*(#.*)?$/.test(value);
    const where = table === null ? key : `${table}.${key}`;
    if (!plain) problems.push(`${where}: a value session mode does not read (several lines or not plain)`);
    else if (table === null && !ALLOWED_TOP_KEYS.has(key)) problems.push(where);
  }
  return problems;
}

/** The config.toml check for a home: its problems, or [] (also when there is no config.toml). */
export function configProblems(home: string): string[] {
  const file = join(home, "config.toml");
  if (!existsSync(file)) return [];
  try {
    return configTomlProblems(readFileSync(file, "utf8"));
  } catch (error) {
    return [`config.toml could not be read: ${(error as Error).message.slice(0, 120)}`];
  }
}

/* ---- errors -------------------------------------------------------------------------------------- */

/**
 * A session that cannot go on: "transport" (the server died, a request went unanswered, the stream to the backend
 * failed): restart once, then exec mode; "isolation" (config.toml, instruction sources, AGENTS.md): exec mode at once.
 */
export class SessionError extends Error {
  constructor(
    message: string,
    readonly kind: "transport" | "isolation",
  ) {
    super(message);
    this.name = "SessionError";
  }
}

/* ---- the JSON-RPC client ------------------------------------------------------------------------- */

interface Pending {
  method: string;
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
}

export interface AppServerOptions {
  bin: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

/** stderr kept for the trace: the last part. */
const STDERR_KEEP = 8_000;

/** `codex app-server --listen stdio://` as a JSON-RPC client: requests with timeouts, notifications to a listener. */
export class AppServer {
  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer = "";
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private stderr = "";
  /** Why the server is gone (null while it runs). */
  dead: string | null = null;
  /** Where notifications go (method, params). */
  onNotification: ((method: string, params: Json) => void) | null = null;
  /** Server-to-client requests seen (an approval, a tool call: none is expected), answered with an error. */
  readonly serverRequests: string[] = [];

  constructor(private readonly opts: AppServerOptions) {}

  get pid(): number | undefined {
    return this.child?.pid;
  }

  stderrTail(): string {
    return this.stderr;
  }

  /** Spawns the server and makes the protocol handshake (initialize, initialized). */
  async start(clientName: string): Promise<void> {
    const child = spawn(this.opts.bin, this.opts.args, { cwd: this.opts.cwd, env: this.opts.env, stdio: ["pipe", "pipe", "pipe"], detached: true });
    this.child = child;
    // The server must not keep the play process alive: between questions nothing holds the event loop (a request's own
    // timer does while it waits), so the process ends as before and its exit hook removes the thread.
    child.unref();
    for (const stream of [child.stdin, child.stdout, child.stderr] as Array<{ unref?: () => void }>) stream.unref?.();
    child.stdout.on("data", (chunk: Buffer) => this.onData(chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => {
      this.stderr = (this.stderr + chunk.toString("utf8")).slice(-STDERR_KEEP);
    });
    child.stdin.on("error", () => this.die("its stdin closed"));
    child.on("error", (error) => this.die(`it could not start: ${error.message}`));
    child.on("exit", (code, signal) => this.die(`it exited ${code ?? signal}`));
    await this.request("initialize", { clientInfo: { name: clientName, version: "1" } }, 30_000);
    this.notify("initialized");
  }

  private die(why: string): void {
    if (this.dead) return;
    this.dead = why;
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new SessionError(`codex app-server ${why} (during ${pending.method})`, "transport"));
      this.pending.delete(id);
    }
  }

  private onData(text: string): void {
    this.buffer += text;
    let newline: number;
    while ((newline = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (!line.startsWith("{")) continue;
      let message: Json;
      try {
        const value = JSON.parse(line) as unknown;
        if (!isObject(value)) continue;
        message = value;
      } catch {
        continue;
      }
      this.dispatch(message);
    }
  }

  private dispatch(message: Json): void {
    const id = message["id"];
    const method = typeof message["method"] === "string" ? message["method"] : null;
    if (method && id !== undefined && id !== null) {
      // The server asks us something (an approval, a tool call, input): the brain gives codex no tool, so no.
      this.serverRequests.push(method);
      this.write({ jsonrpc: "2.0", id, error: { code: -32601, message: "not available to this client" } });
      return;
    }
    if (method) {
      try {
        this.onNotification?.(method, isObject(message["params"]) ? message["params"] : {});
      } catch {
        // a listener's error must not break the client
      }
      return;
    }
    if (typeof id !== "number") return;
    const pending = this.pending.get(id);
    if (!pending) return;
    this.pending.delete(id);
    clearTimeout(pending.timer);
    if (isObject(message["error"])) pending.reject(new RpcError(pending.method, message["error"]));
    else pending.resolve(message["result"]);
  }

  private write(message: Json): void {
    if (this.dead || !this.child) throw new SessionError(`codex app-server is gone (${this.dead ?? "not started"})`, "transport");
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  notify(method: string, params?: Json): void {
    this.write({ jsonrpc: "2.0", method, ...(params ? { params } : {}) });
  }

  /** A request; rejects with RpcError (the server said no), or SessionError (no answer in time, the server gone). */
  request(method: string, params: Json, timeoutMs: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (this.dead) {
        reject(new SessionError(`codex app-server is gone (${this.dead})`, "transport"));
        return;
      }
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new SessionError(`codex app-server did not answer ${method} within ${Math.round(timeoutMs / 1000)} s`, "transport"));
      }, timeoutMs);
      this.pending.set(id, { method, resolve, reject, timer });
      try {
        this.write({ jsonrpc: "2.0", id, method, params });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error as Error);
      }
    });
  }

  /** Ends the server: stdin closed, then its process group killed. */
  close(): void {
    const child = this.child;
    if (!child) return;
    this.die("closed");
    try {
      child.stdin.end();
    } catch {
      // gone
    }
    if (child.pid !== undefined) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        // gone
      }
      const pid = child.pid;
      setTimeout(() => {
        try {
          process.kill(-pid, "SIGKILL");
        } catch {
          // gone
        }
      }, 3_000).unref();
    }
  }
}

/** The server answered a request with an error. */
export class RpcError extends Error {
  constructor(
    readonly method: string,
    readonly error: Json,
  ) {
    super(`codex app-server ${method}: ${String(error["message"] ?? "error").slice(0, 300)}`);
    this.name = "RpcError";
  }
}

/* ---- the session --------------------------------------------------------------------------------- */

/** One event of a turn as the trace keeps it (no text): its notification and when it came. */
export interface SessionTraceEvent {
  t: number;
  type: string;
  item?: string;
  chars?: number;
  message?: string;
}

export interface SessionTurn {
  status: "completed" | "failed" | "interrupted" | "stalled" | "aborted";
  turnId: string | null;
  threadId: string;
  /** The final agent message. */
  text: string;
  /** Reasoning summaries. */
  reasoning: string[];
  /** The turn's token usage (thread/tokenUsage/updated `last`). */
  usage: Json | null;
  /** The turn's error (failed / interrupted). */
  error: { message: string; info: unknown } | null;
  /** Error notifications codex retries itself after (willRetry). */
  retries: string[];
  errors: string[];
  /** When the first delta (answer or reasoning text) came, ms after the turn was asked. */
  firstDeltaMs: number | null;
  deltas: number;
  /** The streamed answer's length so far (agentMessage deltas). */
  answerChars: number;
  /** The most whitespace characters in a row between the streamed answer's JSON tokens (outside its strings). */
  maxBlankRun: number;
  /**
   * The streamed answer text (agentMessage deltas), its first ANSWER_TEXT_KEEP characters: the evidence of a turn cut
   * before its answer (a runaway); the trace keeps it only then.
   */
  answerText: string;
  maxGapMs: number;
  ms: number;
  /** Why a stalled turn was given up on. */
  stall?: string;
  events: SessionTraceEvent[];
  /** Whether the thread is back at its base (the revert worked). */
  reverted: boolean;
}

export interface SessionOptions {
  bin: string;
  home: string;
  /** app-server's arguments (the isolation switches and overrides: codex.ts sessionArgs). */
  args: string[];
  env: Record<string, string>;
  stateDir: string;
  model: string;
  serviceTier: string | null;
  /** The plan's rate limits pushed by the server (account/rateLimits/updated's params). */
  onRateLimits?: (params: Json) => void;
  /** Request timeouts (tests). */
  timeouts?: Partial<Record<"start" | "thread" | "turn" | "control", number>>;
}

const sha = (text: string): string => createHash("sha256").update(text).digest("hex").slice(0, 12);

/** Every session alive in this process: their threads are deleted when the process exits. */
const LIVE = new Set<CodexSession>();
let exitHook = false;

/** Our threads' working directories live here: the name of each says which process made it (<pid>-<ms>). */
export function sessionCwdRoot(stateDir: string): string {
  return join(stateDir, "session-cwd");
}

/** Whether a process is alive (kill 0). */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

const DELTAS = new Set(["item/agentMessage/delta", "item/reasoning/summaryTextDelta", "item/reasoning/textDelta"]);
/**
 * The whitespace runs between a streamed JSON answer's tokens: fed the deltas in order, it tracks whether the text is
 * inside a string (and after a backslash there) and counts the whitespace in a row outside strings. feed() returns the
 * longest run so far.
 */
export class BlankRun {
  private inString = false;
  private escaped = false;
  private run = 0;
  private longest = 0;

  feed(delta: string): number {
    for (const ch of delta) {
      if (this.inString) {
        if (this.escaped) this.escaped = false;
        else if (ch === "\\") this.escaped = true;
        else if (ch === '"') this.inString = false;
        continue;
      }
      if (ch === " " || ch === "\n" || ch === "\t" || ch === "\r") {
        this.run += 1;
        if (this.run > this.longest) this.longest = this.run;
        continue;
      }
      this.run = 0;
      if (ch === '"') this.inString = true;
    }
    return this.longest;
  }
}

/**
 * How much of a turn's streamed answer is kept (SessionTurn.answerText). A runaway is cut at BRAIN_CODEX_MAX_ANSWER_CHARS
 * (2000 by default; the cut ones seen were 2001-2329 characters): this keeps all of one, and bounds the trace row.
 */
export const ANSWER_TEXT_KEEP = 8_000;
/** The trace keeps the first and the last notifications of a long turn (deltas are counted, not listed). */
const KEEP_HEAD = 40;
const KEEP_TAIL = 30;

export class CodexSession {
  private server: AppServer | null = null;
  private thread: { id: string; sha: string; path: string | null } | null = null;
  /** Make a new thread before the next question (a failed turn, a failed revert). */
  private renew = false;
  private readonly cwd: string;
  /** The current turn's listener. */
  private listener: ((method: string, params: Json) => void) | null = null;

  constructor(private readonly opts: SessionOptions) {
    this.cwd = join(sessionCwdRoot(opts.stateDir), `${process.pid}-${Date.now()}`);
  }

  private timeout(kind: "start" | "thread" | "turn" | "control"): number {
    return this.opts.timeouts?.[kind] ?? { start: 60_000, thread: 60_000, turn: 30_000, control: 20_000 }[kind];
  }

  get threadId(): string | null {
    return this.thread?.id ?? null;
  }

  stderrTail(): string {
    return this.server?.stderrTail() ?? "";
  }

  get serverRequests(): string[] {
    return this.server?.serverRequests ?? [];
  }

  /** The server, started (and the threads a dead process left swept) when there is none or it died. */
  private async ensureServer(): Promise<AppServer> {
    if (this.server && !this.server.dead) return this.server;
    this.thread = null;
    mkdirSync(this.cwd, { recursive: true });
    const server = new AppServer({ bin: this.opts.bin, args: this.opts.args, cwd: this.cwd, env: this.opts.env });
    server.onNotification = (method, params) => {
      if (method === "account/rateLimits/updated") this.opts.onRateLimits?.(params);
      this.listener?.(method, params);
    };
    this.server = server;
    try {
      await server.start("jev-brain");
    } catch (error) {
      server.close();
      throw error instanceof SessionError ? error : new SessionError(`codex app-server did not start: ${(error as Error).message.slice(0, 200)}`, "transport");
    }
    LIVE.add(this);
    if (!exitHook) {
      exitHook = true;
      process.once("exit", () => {
        for (const session of LIVE) session.closeSync();
      });
    }
    await this.sweepStale(server);
    return server;
  }

  /** Deletes the threads a dead process of ours left (cwd under ours, its pid gone); never anyone else's. */
  private async sweepStale(server: AppServer): Promise<void> {
    const root = sessionCwdRoot(this.opts.stateDir);
    let listed: unknown;
    try {
      listed = await server.request("thread/list", { useStateDbOnly: true, sourceKinds: ["cli", "vscode", "exec", "appServer", "unknown"], modelProviders: [], limit: 100 }, this.timeout("control"));
    } catch {
      return;
    }
    const data = isObject(listed) && Array.isArray(listed["data"]) ? listed["data"] : [];
    for (const thread of data) {
      if (!isObject(thread) || typeof thread["id"] !== "string" || typeof thread["cwd"] !== "string") continue;
      const cwd = thread["cwd"];
      if (dirname(cwd) !== root) continue;
      const pid = Number(basename(cwd).split("-")[0]);
      if (!Number.isInteger(pid) || pid === process.pid || alive(pid)) continue;
      try {
        await server.request("thread/delete", { threadId: thread["id"] }, this.timeout("control"));
      } catch {
        // gone already
      }
      rmSync(cwd, { recursive: true, force: true });
    }
  }

  /**
   * The base thread for this system prompt: the current one, or a new one (the old deleted) when there is none, the
   * prompt changed, or the last turn left it unclean. Checks config.toml and the instruction files first.
   */
  async ensureThread(system: string, guards: () => string[]): Promise<string> {
    const server = await this.ensureServer();
    const wanted = sha(system);
    if (this.thread && this.thread.sha === wanted && !this.renew) return this.thread.id;
    await this.dropThread();
    const problems = guards();
    if (problems.length > 0) throw new SessionError(`session mode isolation: ${problems.join("; ").slice(0, 300)}`, "isolation");
    const result = await server.request(
      "thread/start",
      {
        model: this.opts.model,
        cwd: this.cwd,
        approvalPolicy: "never",
        sandbox: "read-only",
        baseInstructions: system,
        ephemeral: false,
        threadSource: "jev-brain",
        ...(this.opts.serviceTier ? { serviceTier: this.opts.serviceTier } : {}),
      },
      this.timeout("thread"),
    );
    const thread = isObject(result) && isObject(result["thread"]) ? result["thread"] : null;
    if (!thread || typeof thread["id"] !== "string") throw new SessionError("codex app-server thread/start gave no thread", "transport");
    const sources = isObject(result) && Array.isArray(result["instructionSources"]) ? result["instructionSources"] : [];
    this.thread = { id: thread["id"], sha: wanted, path: typeof thread["path"] === "string" ? thread["path"] : null };
    this.renew = false;
    if (sources.length > 0) {
      await this.dropThread();
      throw new SessionError(`session mode isolation: the thread loaded instruction sources (${sources.map(String).join(", ").slice(0, 200)})`, "isolation");
    }
    return this.thread.id;
  }

  /** Deletes the current thread (best effort). */
  private async dropThread(): Promise<void> {
    const thread = this.thread;
    this.thread = null;
    if (!thread || !this.server || this.server.dead) return;
    try {
      await this.server.request("thread/delete", { threadId: thread.id }, this.timeout("control"));
    } catch {
      // the files go at exit or on the next sweep
    }
  }

  /**
   * One question as a turn on the base thread, watched for stalls, then reverted to the base. The turn's outcome is
   * returned whatever it was; a transport failure (the server gone, a request unanswered) throws SessionError.
   */
  async ask(q: { prompt: string; schema: unknown; effort: string; summary: string; model: string; signal?: AbortSignal; stallMs: number | null; firstTokenMs: number | null; maxAnswerChars?: number | null; maxAnswerBlanks?: number | null }): Promise<SessionTurn> {
    const server = await this.ensureServer();
    const threadId = this.thread?.id;
    if (!threadId) throw new SessionError("no thread to ask on", "transport");
    const started = Date.now();
    const turn: SessionTurn = { status: "failed", turnId: null, threadId, text: "", reasoning: [], usage: null, error: null, retries: [], errors: [], firstDeltaMs: null, deltas: 0, answerChars: 0, maxBlankRun: 0, answerText: "", maxGapMs: 0, ms: 0, events: [], reverted: false };
    const blanks = new BlankRun();
    let last = started;
    let dropped = 0;
    let resolveDone: ((status: SessionTurn["status"]) => void) | null = null;
    const done = new Promise<SessionTurn["status"]>((resolve) => {
      resolveDone = resolve;
    });
    const settle = (status: SessionTurn["status"]): void => resolveDone?.(status);
    let timer: NodeJS.Timeout | undefined;
    const stallAfter = (ms: number, why: () => string): void => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        turn.stall = why();
        settle("stalled");
      }, ms);
    };
    if (q.firstTokenMs) stallAfter(q.firstTokenMs, () => `no first token within ${Math.round(q.firstTokenMs! / 1000)} s`);
    const record = (event: SessionTraceEvent): void => {
      if (turn.events.length < KEEP_HEAD + KEEP_TAIL) turn.events.push(event);
      else {
        turn.events.splice(KEEP_HEAD, 1);
        turn.events.push(event);
        dropped += 1;
      }
    };
    this.listener = (method, params) => {
      if (typeof params["threadId"] === "string" && params["threadId"] !== threadId) return;
      if (turn.turnId && typeof params["turnId"] === "string" && params["turnId"] !== turn.turnId) return;
      const now = Date.now();
      turn.maxGapMs = Math.max(turn.maxGapMs, now - last);
      last = now;
      const t = now - started;
      if (DELTAS.has(method)) {
        turn.deltas += 1;
        if (method === "item/agentMessage/delta" && typeof params["delta"] === "string") {
          turn.answerChars += params["delta"].length;
          if (turn.answerText.length < ANSWER_TEXT_KEEP) turn.answerText = (turn.answerText + params["delta"]).slice(0, ANSWER_TEXT_KEEP);
          turn.maxBlankRun = Math.max(turn.maxBlankRun, blanks.feed(params["delta"]));
          // A runaway answer (seen 2026-10-03: a reward answer streaming single characters for 10 minutes): given up on as stalled.
          if (q.maxAnswerChars && turn.answerChars > q.maxAnswerChars && !turn.stall) {
            turn.stall = `the answer ran past ${q.maxAnswerChars} characters (runaway)`;
            settle("stalled");
          }
          // Its usual form (2026-10-03): whitespace without end between JSON tokens after a complete reason.
          if (q.maxAnswerBlanks && turn.maxBlankRun >= q.maxAnswerBlanks && !turn.stall) {
            turn.stall = `the answer ran ${turn.maxBlankRun} whitespace characters between its JSON tokens (runaway)`;
            settle("stalled");
          }
        }
        if (turn.firstDeltaMs === null) {
          turn.firstDeltaMs = t;
          record({ t, type: `${method} (first)` });
        }
      } else {
        const item = isObject(params["item"]) ? params["item"] : null;
        const event: SessionTraceEvent = { t, type: method };
        if (item) {
          event.item = String(item["type"] ?? "?");
          if (typeof item["text"] === "string") event.chars = item["text"].length;
        }
        if (method === "error" && isObject(params["error"])) event.message = String(params["error"]["message"] ?? "").slice(0, 300);
        record(event);
      }
      if (turn.firstDeltaMs !== null && q.stallMs) {
        const stallMs = q.stallMs;
        stallAfter(stallMs, () => `no notification for ${Math.round(stallMs / 1000)} s after the first token at ${Math.round((turn.firstDeltaMs ?? 0) / 1000)} s`);
      }
      if (method === "item/completed" && isObject(params["item"])) {
        const item = params["item"];
        if (item["type"] === "agentMessage" && typeof item["text"] === "string") turn.text = item["text"];
        if (item["type"] === "reasoning" && Array.isArray(item["summary"])) turn.reasoning.push(...item["summary"].filter((part): part is string => typeof part === "string"));
      } else if (method === "thread/tokenUsage/updated" && isObject(params["tokenUsage"]) && isObject(params["tokenUsage"]["last"])) {
        turn.usage = params["tokenUsage"]["last"];
      } else if (method === "error" && isObject(params["error"])) {
        const message = String(params["error"]["message"] ?? "error").slice(0, 300);
        (params["willRetry"] === true ? turn.retries : turn.errors).push(message);
      } else if (method === "turn/completed" && isObject(params["turn"])) {
        const t2 = params["turn"];
        if (turn.turnId && t2["id"] !== turn.turnId) return;
        const error = isObject(t2["error"]) ? t2["error"] : null;
        if (error) turn.error = { message: String(error["message"] ?? "error").slice(0, 400), info: error["codexErrorInfo"] ?? null };
        const status = t2["status"];
        settle(status === "completed" ? "completed" : status === "interrupted" ? "interrupted" : "failed");
      }
    };
    const onAbort = (): void => settle("aborted");
    if (q.signal?.aborted) settle("aborted");
    q.signal?.addEventListener("abort", onAbort, { once: true });
    const dead = setInterval(() => {
      if (server.dead) settle("failed");
    }, 1_000);
    try {
      const params: Json = { threadId, input: [{ type: "text", text: q.prompt, text_elements: [] }], effort: q.effort, summary: q.summary, model: q.model };
      if (q.schema) params["outputSchema"] = q.schema;
      const started2 = server.request("turn/start", params, this.timeout("turn")).then((result) => {
        const t2 = isObject(result) && isObject(result["turn"]) ? result["turn"] : null;
        if (t2 && typeof t2["id"] === "string") turn.turnId = t2["id"];
      });
      // The turn's id comes with turn/start's answer; notifications before it are this turn's (one turn at a time).
      await Promise.race([started2, done.then(() => undefined)]);
      turn.status = await done;
      await started2.catch(() => undefined);
      if (server.dead) throw new SessionError(`codex app-server ${server.dead} during the turn`, "transport");
      if (turn.status === "stalled" || turn.status === "aborted") await this.interrupt(server, threadId, turn);
    } finally {
      clearTimeout(timer);
      clearInterval(dead);
      q.signal?.removeEventListener("abort", onAbort);
      turn.ms = Date.now() - started;
      turn.maxGapMs = Math.max(turn.maxGapMs, Date.now() - last);
      if (dropped > 0) turn.events.push({ t: turn.ms, type: `(${dropped} notifications not kept)` });
      this.listener = null;
    }
    await this.revert(server, threadId, turn);
    if (turn.status !== "completed") this.renew = true;
    return turn;
  }

  /** Stops a stalled or aborted turn (turn/interrupt) and waits briefly for its end. */
  private async interrupt(server: AppServer, threadId: string, turn: SessionTurn): Promise<void> {
    if (!turn.turnId) return;
    const ended = new Promise<void>((resolve) => {
      const previous = this.listener;
      const timer = setTimeout(resolve, this.timeout("control"));
      this.listener = (method, params) => {
        previous?.(method, params);
        if (method === "turn/completed") {
          clearTimeout(timer);
          resolve();
        }
      };
    });
    try {
      await server.request("turn/interrupt", { threadId, turnId: turn.turnId }, this.timeout("control"));
      await ended;
    } catch {
      this.renew = true;
    }
  }

  /** Back to the base: the turn's items dropped (thread/revert); a failed revert makes a new thread next time. */
  private async revert(server: AppServer, threadId: string, turn: SessionTurn): Promise<void> {
    if (!turn.turnId || server.dead) {
      this.renew = true;
      return;
    }
    try {
      await server.request("thread/revert", { threadId, beforeTurnId: turn.turnId }, this.timeout("control"));
      turn.reverted = true;
    } catch {
      this.renew = true;
    }
  }

  /** Ends the session: its thread deleted, the server stopped. */
  async close(): Promise<void> {
    await this.dropThread();
    this.server?.close();
    this.server = null;
    rmSync(this.cwd, { recursive: true, force: true });
    LIVE.delete(this);
  }

  /** At process exit (no async work possible): the thread's own rollout files removed, the server's group killed. */
  closeSync(): void {
    const thread = this.thread;
    if (thread?.path) {
      try {
        const dir = dirname(thread.path);
        for (const name of readdirSync(dir)) if (name.includes(thread.id) && name.endsWith(".jsonl")) unlinkSync(join(dir, name));
      } catch {
        // the next start's sweep deletes it
      }
    }
    this.server?.close();
    rmSync(this.cwd, { recursive: true, force: true });
  }

  /** Whether the thread's path on disk is known (for the exit cleanup). */
  hasPath(): boolean {
    return Boolean(this.thread?.path);
  }

  /** The thread's path, once codex reports it (tests, the exit cleanup). */
  async refreshPath(): Promise<void> {
    const thread = this.thread;
    if (!thread || !this.server || this.server.dead) return;
    try {
      const result = await this.server.request("thread/read", { threadId: thread.id, includeTurns: false }, this.timeout("control"));
      const read = isObject(result) && isObject(result["thread"]) ? result["thread"] : null;
      if (read && typeof read["path"] === "string") thread.path = read["path"];
    } catch {
      // keep what we have
    }
  }
}

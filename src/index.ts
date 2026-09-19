#!/usr/bin/env node
/** CLI entry point. Commands after M0 are listed but not implemented yet. */

import { existsSync } from "node:fs";
import { parseArgs } from "node:util";

import { runDoctor } from "./cli/doctor.js";
import { createReporter } from "./cli/reporter.js";
import { buildRuntime } from "./cli/runtime.js";
import { ConfigError, loadConfig, type AppConfig, type ConfigOverrides } from "./config.js";
import { runLoop } from "./loop.js";
import { buildRunBrief } from "./project/run-brief.js";
import { recordStates } from "./replay/record.js";
import { readRecordedStates, replayStates } from "./replay/replay.js";
import { planDecision } from "./screens/index.js";
import { toJsonValue } from "./util/json.js";
import { style } from "./util/format.js";
import { acquireLock } from "./util/lock.js";

const USAGE = `jev-sts2 — play Slay the Spire 2 with Jev (TypeSafe System One)

Usage:
  jev-sts2 doctor [options]     check the mod, the state payload and the Jev credential
  jev-sts2 shadow [options]     decide against the live game but dispatch nothing (safe first run)
  jev-sts2 play [options]       run the full decision loop and drive the game
  jev-sts2 explain [options]    print the exact request the current state would send to Jev
  jev-sts2 record [options]     capture raw /state snapshots into a fixtures file
  jev-sts2 replay [options]     re-run the decision layer over a fixtures file, offline

Options:
  --sts2-url <url>   mod base URL (default http://127.0.0.1:8080)
  --api-key <key>    TypeSafe API key (default TYPESAFE_API_KEY)
  --model <name>     Jev model id (default jev-1.13.0)
  --mode <mode>      shadow | play | record | replay
  --no-jev           skip the Jev checks (no API key needed)
  --json             machine-readable output (doctor only)
  --max-decisions <n>  stop after n decisions (default 2000)
  --max-runs <n>       stop after n completed runs (default 1)
  --max-minutes <n>    wall-clock cap (default 60)
  --poll <ms>          poll interval while waiting (default 400)
  --out <path>         record output file (default fixtures/states.jsonl)
  --in <path>          replay input file (default fixtures/states.jsonl)
  --ask                replay: also query Jev for each recorded state
                       explain: send the request and print the answer
  --allow-fallback     let the code choose when Jev is unsure (default: trust Jev completely)
  --refresh-data       refetch /data/* instead of using the cache
  --force              take over the single-instance lock from another loop
  -h, --help         show this help

Environment: see .env.example. Values in .env are loaded when present.`;

function loadDotEnv(path = ".env"): void {
  if (!existsSync(path)) return;
  const loader = (process as NodeJS.Process & { loadEnvFile?: (file?: string) => void }).loadEnvFile;
  if (typeof loader !== "function") return;
  try {
    loader.call(process, path);
  } catch {
    // A malformed .env is reported by whatever reads the value; never block startup here.
  }
}

function fail(message: string, code: number): number {
  process.stderr.write(`${style.red("error:")} ${message}\n`);
  return code;
}

/** `parseArgs` widens option values to `string | boolean | (string | boolean)[]`. */
function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function main(argv: string[]): Promise<number> {
  loadDotEnv();

  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        help: { type: "boolean", short: "h" },
        json: { type: "boolean" },
        "no-jev": { type: "boolean" },
        ask: { type: "boolean" },
        "allow-fallback": { type: "boolean" },
        "refresh-data": { type: "boolean" },
        force: { type: "boolean" },
        "sts2-url": { type: "string" },
        "api-key": { type: "string" },
        model: { type: "string" },
        mode: { type: "string" },
        "max-decisions": { type: "string" },
        "max-runs": { type: "string" },
        "max-minutes": { type: "string" },
        poll: { type: "string" },
        out: { type: "string" },
        in: { type: "string" },
      },
    });
  } catch (error) {
    return fail(`${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`, 2);
  }

  const { values, positionals } = parsed;
  // `--help` must work even with a broken configuration, so it is answered before the config loads.
  if (values.help === true || positionals[0] === "help") {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  const overrides: ConfigOverrides = {
    sts2BaseUrl: asString(values["sts2-url"]),
    jevApiKey: asString(values["api-key"]),
    jevModel: asString(values.model),
    mode: asString(values.mode),
    allowFallback: values["allow-fallback"] === true,
  };

  let config: AppConfig;
  try {
    config = loadConfig(process.env, overrides);
  } catch (error) {
    if (error instanceof ConfigError) {
      return fail(`invalid configuration\n${error.message}`, 1);
    }
    throw error;
  }

  // With no command, fall back to MODE from the environment. Without this, `MODE` was configuration
  // that only ever showed up in `doctor` and never selected anything.
  const command = positionals[0] ?? config.mode;
  if (!positionals[0]) {
    process.stdout.write(`no command given: using MODE=${command} (see --help for the command list)\n`);
  }

  const number = (value: unknown, fallback: number): number => {
    const raw = asString(value);
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  switch (command) {
    case "doctor":
      return runDoctor({ config, skipJev: values["no-jev"] === true, json: values.json === true });

    case "record": {
      const outPath = asString(values.out) ?? "fixtures/states.jsonl";
      const runtime = await buildRuntime({ config, needJev: false, onEvent: (message) => process.stdout.write(`${style.dim(message)}\n`) });
      process.stdout.write(`recording distinct states to ${outPath} (Ctrl+C to stop)\n`);
      const stats = await recordStates({
        client: runtime.client,
        outPath,
        intervalMs: number(values.poll, 600),
        durationMs: asString(values["max-minutes"]) ? number(values["max-minutes"], 5) * 60_000 : 300_000,
        maxStates: number(values["max-decisions"], 200),
        onEvent: (message) => process.stdout.write(`${message}\n`),
      });
      process.stdout.write(
        `\ncaptured ${stats.captured} states (${stats.skipped} duplicate polls) -> ${stats.path}\n` +
          Object.entries(stats.byScreen)
            .map(([screen, count]) => `  ${screen}: ${count}`)
            .join("\n") +
          "\n",
      );
      return 0;
    }

    case "explain": {
      const runtime = await buildRuntime({
        config,
        needJev: values.ask === true,
        refreshKnowledge: values["refresh-data"] === true,
        onEvent: (message) => process.stderr.write(`${style.dim(message)}\n`),
      });
      const state = await runtime.client.state();
      const rendered = {
        screen: state.screen,
        session: `${state.session.mode}/${state.session.phase}`,
        brief: buildRunBrief(state, runtime.knowledge),
      };
      const planned = planDecision({
        state,
        knowledge: runtime.knowledge,
        brief: rendered.brief,
        screenMemory: { screen: state.screen, shopOpened: false },
        thresholds: config.thresholds,
        runStart: config.run.start,
        characterPreference: config.run.character,
        allowFtueModals: config.allowFtueModals,
        strictJev: config.strictJev && runtime.jev !== null,
        shopDiscardPotions: config.shop.discardPotions,
      });

      if (planned.kind !== "decision") {
        process.stdout.write(`${JSON.stringify({ screen: state.screen, outcome: planned.kind, reason: planned.reason }, null, 2)}\n`);
        return 0;
      }
      const decision = planned.decision;
      if (decision.kind === "act") {
        process.stdout.write(
          `${JSON.stringify(
            { screen: state.screen, label: decision.label, kind: "act", intent: decision.intent, rationale: decision.rationale },
            null,
            2,
          )}\n`,
        );
        return 0;
      }

      const request = { model: config.jev.model, state: decision.state, questions: decision.questions };
      const serialized = JSON.stringify(request);
      const summary = {
        screen: state.screen,
        label: decision.label,
        kind: "ask",
        option_count: Object.keys(decision.questions["play"]?.criteria ?? decision.questions["pick"]?.criteria ?? {}).length,
        request_chars: serialized.length,
        // Rough only. Measured against a live 19-option combat request: 7474 chars → 2968 tokens, so
        // dense JSON (numbers, braces, option keys) tokenizes near 2.5 chars/token, not 3.6.
        estimated_prompt_tokens: Math.round(serialized.length / 2.5),
      };

      if (values.ask !== true) {
        process.stdout.write(`${JSON.stringify({ ...summary, request }, null, 2)}\n`);
        return 0;
      }
      if (!runtime.jev) return fail("--ask needs an API key (TYPESAFE_API_KEY)", 1);
      const answer = await runtime.jev.ask(decision.state, decision.questions);
      const resolved = decision.resolve(answer.answers);
      process.stdout.write(
        `${JSON.stringify(
          {
            ...summary,
            request,
            answer: {
              model: answer.model,
              answers: toJsonValue(answer.answers),
              usage: { input_tokens: answer.inputTokens, output_tokens: answer.outputTokens },
              request_id: answer.requestId,
              latency_ms: answer.latencyMs,
            },
            resolved,
          },
          null,
          2,
        )}\n`,
      );
      return 0;
    }

    case "replay": {
      const inPath = asString(values.in) ?? "fixtures/states.jsonl";
      const runtime = await buildRuntime({
        config,
        needJev: values.ask === true,
        refreshKnowledge: values["refresh-data"] === true,
        onEvent: (message) => process.stdout.write(`${style.dim(message)}\n`),
      });
      const entries = readRecordedStates(inPath);
      process.stdout.write(`replaying ${entries.length} recorded states from ${inPath}${values.ask === true ? " (asking Jev)" : ""}\n`);
      const jev = runtime.jev;
      const stats = await replayStates({
        entries,
        knowledge: runtime.knowledge,
        config,
        ask:
          values.ask === true && jev
            ? async (state, questions) => {
                const result = await jev.ask(state, questions as never);
                return result.answers;
              }
            : undefined,
        onEvent: (message) => process.stdout.write(`${message}\n`),
      });
      process.stdout.write(
        `\n${stats.total} states | ${stats.decisions} decisions (${stats.deterministic} deterministic, ${stats.asks} asked) | ` +
          `${stats.waits} waits | ${stats.unsupported} unsupported | ${stats.failed} failed\n`,
      );
      return stats.failed > 0 ? 1 : 0;
    }

    case "shadow":
    case "play": {
      const mode = command;
      const skipJev = values["no-jev"] === true;
      const lock = acquireLock("logs/loop.lock", `${mode} (pid ${process.pid})`, { force: values.force === true });
      if (!lock.ok) {
        return fail(
          `another jev-sts2 loop is already running: pid ${lock.holder.pid}` +
            `${lock.holder.startedAt ? ` (started ${lock.holder.startedAt})` : ""}` +
            `\n  command: ${lock.holder.command || "unknown"}` +
            `\nStop it first, or pass --force to take over. Only one loop may drive a game instance.`,
          2,
        );
      }
      const reporter = createReporter();
      try {
        const runtime = await buildRuntime({
          config,
          needJev: !skipJev,
          refreshKnowledge: values["refresh-data"] === true,
          onEvent: (message) => process.stdout.write(`${style.dim(message)}\n`),
        });
        process.stdout.write(
          `${style.bold(mode === "shadow" ? "shadow mode" : "PLAY mode")}: ${runtime.baseUrl}, model ${config.jev.model}` +
            `${mode === "shadow" ? " (decisions are logged, nothing is dispatched)" : ""}` +
            `${skipJev ? style.yellow(" | NO-JEV: every decision uses the deterministic fallback") : ""}\n`,
        );
        const stats = await runLoop({
          config,
          mode,
          client: runtime.client,
          jev: runtime.jev,
          knowledge: runtime.knowledge,
          maxRuns: number(values["max-runs"], 1),
          maxDecisions: number(values["max-decisions"], 2_000),
          maxMinutes: number(values["max-minutes"], 60),
          pollIntervalMs: number(values.poll, 400),
          onEvent: (event) => reporter.handle(event),
        });
        reporter.summary(stats);
        return stats.errors > 0 && stats.acts === 0 ? 1 : 0;
      } finally {
        lock.release();
      }
    }

    default:
      return fail(`unknown command "${command}"\n\n${USAGE}`, 2);
  }
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`${style.red("unexpected failure:")} ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });

/** Console reporting for the loop: one line per decision, waits de-duplicated. */

import { describeIntent, type LoopEvent, type LoopStats } from "../loop.js";
import { formatMs, style } from "../util/format.js";

export interface Reporter {
  handle(event: LoopEvent): void;
  summary(stats: LoopStats): void;
}

function clock(): string {
  return new Date().toTimeString().slice(0, 8);
}

export function createReporter(): Reporter {
  let lastWait: string | null = null;
  let decisions = 0;

  return {
    handle(event) {
      switch (event.type) {
        case "note":
          process.stdout.write(`${style.dim(`${clock()} note`)} ${event.message}\n`);
          return;
        case "wait": {
          const key = `${event.screen}:${event.reason}`;
          if (key === lastWait) return;
          lastWait = key;
          process.stdout.write(`${style.dim(`${clock()} wait`)} ${event.screen}: ${event.reason}\n`);
          return;
        }
        case "decision": {
          lastWait = null;
          decisions += 1;
          const record = event.record;
          const conf = record.confidence === null ? "" : ` conf ${record.confidence.toFixed(2)}`;
          const fallback = record.fallback ? style.yellow(" fallback") : "";
          const reasked = record.reasked ? " reasked" : "";
          const noJev = record.no_jev ? style.yellow(" no-jev") : "";
          const shadow = record.mode === "shadow" ? style.cyan(" shadow") : "";
          process.stdout.write(
            `${style.dim(clock())} ${style.bold(record.screen.padEnd(15))} ${record.label.padEnd(20)} ${style.green("->")} ` +
              `${describeIntent(record.chosen)}${conf}${fallback}${reasked}${noJev}${shadow} ` +
              `${style.dim(`jev ${formatMs(record.latency_ms.jev)} | ${record.usage.input_tokens} in`)}\n`,
          );
          process.stdout.write(`${style.dim(`         ${record.rationale}`)}\n`);
          if (decisions % 25 === 0) {
            process.stdout.write(`${style.dim(`         ${record.result}`)}\n`);
          }
          return;
        }
        case "stop":
          process.stdout.write(`${style.yellow(`${clock()} stop`)} ${event.reason}\n`);
          return;
      }
    },
    summary(stats) {
      process.stdout.write(
        `\n${style.bold("summary")}\n` +
          `  decisions ${stats.decisions} (${stats.acts} dispatched, ${stats.fallbacks} fallbacks)\n` +
          `  Jev calls ${stats.jevCalls} | ${stats.inputTokens} in / ${stats.outputTokens} out tokens\n` +
          `  waits ${stats.waits} | unsupported ${stats.unsupported} | errors ${stats.errors}\n` +
          `  runs completed ${stats.runsCompleted} | elapsed ${formatMs(stats.elapsedMs)}\n` +
          `  stopped: ${stats.stoppedBecause}\n` +
          `  log: ${stats.logPath}\n`,
      );
    },
  };
}

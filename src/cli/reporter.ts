/** Console reporting for the loop: one line per decision, waits de-duplicated. */

import { describeIntent, type LoopEvent, type LoopStats, type LoopTotals } from "../loop.js";
import { formatCostUsd } from "../jev/pricing.js";
import { formatMs, style } from "../util/format.js";

export interface Reporter {
  handle(event: LoopEvent): void;
  summary(stats: LoopStats): void;
}

function clock(): string {
  return new Date().toTimeString().slice(0, 8);
}

function usageLine(totals: LoopTotals): string {
  return (
    `${totals.decisions} decisions | ${totals.jevCalls} Jev calls | ` +
    `${totals.inputTokens.toLocaleString("en-US")} in / ${totals.outputTokens.toLocaleString("en-US")} out tokens | ` +
    `${formatCostUsd(totals.inputTokens)} | ${formatMs(totals.elapsedMs)}`
  );
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
            // Spend is worth watching while it happens, not only at the end.
            process.stdout.write(`${style.dim(`         progress: ${usageLine(event.totals)}`)}\n`);
          }
          return;
        }
        case "stop":
          process.stdout.write(`${style.yellow(`${clock()} stop`)} ${event.reason}\n`);
          return;
      }
    },
    summary(stats) {
      const runs = stats.runs
        .map(
          (run) =>
            `  #${run.index} ${run.outcome} — ${run.decisions} decisions, ${run.jevCalls} Jev calls, ` +
            `${run.inputTokens.toLocaleString("en-US")} in / ${run.outputTokens.toLocaleString("en-US")} out tokens` +
            ` (${formatCostUsd(run.inputTokens)})` +
            `${run.maxFloor === null ? "" : `, reached floor ${run.maxFloor}`}, ${formatMs(run.elapsedMs)}`,
        )
        .join("\n");
      process.stdout.write(
        `\n${style.bold("summary")}\n` +
          `  decisions ${stats.decisions} (${stats.acts} dispatched, ${stats.fallbacks} fallbacks)\n` +
          (runs ? `  runs:\n${runs}\n` : "") +
          `  ${usageLine({
            decisions: stats.decisions,
            acts: stats.acts,
            jevCalls: stats.jevCalls,
            inputTokens: stats.inputTokens,
            outputTokens: stats.outputTokens,
            elapsedMs: stats.elapsedMs,
          })}\n` +
          `  debounce: ${stats.debounced} answers reused, ${stats.staleSkips} calls skipped as stale\n` +
          `  waits ${stats.waits} | unsupported ${stats.unsupported} | errors ${stats.errors}\n` +
          `  runs completed ${stats.runsCompleted} | elapsed ${formatMs(stats.elapsedMs)}\n` +
          `  stopped: ${stats.stoppedBecause}\n` +
          `  log: ${stats.logPath}\n`,
      );
    },
  };
}

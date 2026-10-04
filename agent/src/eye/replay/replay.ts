/**
 * `replay` (PLAN.md §10.3): re-run the decision layer over recorded states, offline.
 *
 * Without `--ask` it is a structural check: every recorded screen must produce a decision or an
 * explicit wait/unsupported result. With `--ask` it re-queries Jev and reports what it chose, which
 * is how question-wording changes get regression-tested.
 */

import { readFileSync } from "node:fs";

import type { AppConfig } from "../../core/config.js";
import type { AnswerSet } from "../../reflex/jev/answers.js";
import type { Knowledge } from "../../knowledge/index.js";
import { parseGameState, type GameState } from "../../hand/mod/schema.js";
import { buildRunBrief } from "../../memory/run-brief.js";
import type { DecisionEnv } from "../../memory/types.js";
import { createScreenMemory } from "../../memory/types.js";
import { planDecision } from "../../hand/screens/index.js";
import { describeIntent } from "../../hand/loop.js";
import { toJsonValue } from "../../core/util/json.js";

export interface RecordedEntry {
  ts: string;
  fingerprint: string;
  screen: string;
  session: string;
  state: unknown;
}

export function readRecordedStates(path: string): RecordedEntry[] {
  const text = readFileSync(path, "utf8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as RecordedEntry);
}

export interface ReplayOptions {
  entries: RecordedEntry[];
  knowledge: Knowledge;
  config: AppConfig;
  ask?: (state: Record<string, never> | unknown, questions: unknown) => Promise<AnswerSet>;
  onEvent?: (message: string) => void;
}

export interface ReplayStats {
  total: number;
  decisions: number;
  deterministic: number;
  asks: number;
  waits: number;
  blocked: number;
  unsupported: number;
  failed: number;
}

export async function replayStates(options: ReplayOptions): Promise<ReplayStats> {
  const onEvent = options.onEvent ?? ((): void => {});
  const stats: ReplayStats = { total: 0, decisions: 0, deterministic: 0, asks: 0, waits: 0, blocked: 0, unsupported: 0, failed: 0 };
  const screenMemory = createScreenMemory();

  for (const entry of options.entries) {
    stats.total += 1;
    let state: GameState;
    try {
      state = parseGameState(entry.state);
    } catch (error) {
      stats.failed += 1;
      onEvent(`#${stats.total} ${entry.screen}: state did not validate — ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
      continue;
    }

    if (screenMemory.screen !== state.screen) {
      screenMemory.screen = state.screen;
      screenMemory.shopOpened = false;
      screenMemory.cardRewardSkipped = false;
    }
    const env: DecisionEnv = {
      state,
      knowledge: options.knowledge,
      brief: buildRunBrief(state, options.knowledge),
      screenMemory,
      thresholds: options.config.thresholds,
      runStart: options.config.run.start,
      characterPreference: options.config.run.character,
      allowFtueModals: options.config.allowFtueModals,
      strictJev: options.config.strictJev && options.ask !== undefined,
      combatPlanner: options.config.combatPlanner,
      jevContext: options.config.jevContext,
      shopDiscardPotions: options.config.shop.discardPotions,
    };

    try {
      const planned = planDecision(env);
      if (planned.kind === "wait") {
        stats.waits += 1;
        onEvent(`#${stats.total} ${state.screen}: wait — ${planned.reason}`);
        continue;
      }
      if (planned.kind === "unsupported") {
        stats.unsupported += 1;
        onEvent(`#${stats.total} ${state.screen}: unsupported — ${planned.reason}`);
        continue;
      }
      if (planned.kind === "blocked") {
        stats.blocked += 1;
        onEvent(`#${stats.total} ${state.screen}: blocked — ${planned.reason}`);
        continue;
      }

      const decision = planned.decision;
      stats.decisions += 1;
      if (decision.kind === "act") {
        stats.deterministic += 1;
        onEvent(`#${stats.total} ${state.screen}: ${decision.label} -> ${describeIntent(toJsonValue(decision.intent))} [${decision.rationale}]`);
        continue;
      }

      const optionKeys = Object.keys((decision.questions["pick"] ?? { criteria: {} } as { criteria?: Record<string, unknown> }).criteria ?? {});
      onEvent(`#${stats.total} ${state.screen}: ${decision.label} -> ask Jev (${Object.keys(decision.questions).join(", ")}; ${optionKeys.length} options)`);
      if (options.ask) {
        stats.asks += 1;
        const answers = await options.ask(decision.jevView?.state ?? decision.state, decision.jevView?.questions ?? decision.questions);
        const resolved = decision.resolve(answers);
        onEvent(`         answer -> ${resolved.intent ? describeIntent(toJsonValue(resolved.intent)) : "(wait)"} [${resolved.rationale}]${resolved.fallback ? " (fallback)" : ""}`);
      }
    } catch (error) {
      stats.failed += 1;
      onEvent(`#${stats.total} ${state.screen}: threw — ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return stats;
}

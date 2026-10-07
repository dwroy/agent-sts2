/** Historical engine fixtures exercise the generic adapter, never the production Codex-only factory. */
import { Brain, createEngine } from "../src/brain/brain.js";
import { BrainRouter, type BrainLogRow, type FallbackBudget } from "../src/brain/router.js";
import { DeepSeekClient } from "../src/brain/llm/deepseek.js";
import { KnowledgePrompt } from "../src/brain/knowledge.js";
import { frozenFacts } from "../src/knowledge/render/facts.js";
import { brainLogPath, type AppConfig } from "../src/core/config.js";
import { runLoop as productionRunLoop, type LoopOptions, type LoopStats } from "../src/hand/loop.js";
import type { BrainEngine, EngineName } from "../src/brain/types.js";
export type { LoopOptions, LoopStats, LoopEvent } from "../src/hand/loop.js";
export * from "../src/hand/loop.js";

export function createBrain(config: AppConfig, ds: DeepSeekClient, options: { log?: (row: BrainLogRow) => void; fallbackBudget?: FallbackBudget } = {}): Brain {
  const engines = new Map<EngineName, BrainEngine>();
  return new Brain(new BrainRouter({
    config: { ...config.brain, log: brainLogPath(config) },
    engine: (name) => {
      let engine = engines.get(name);
      if (!engine) { engine = createEngine(name, config, ds); engines.set(name, engine); }
      return engine;
    }, ...options,
  }), ds, undefined, new KnowledgePrompt({ facts: frozenFacts(config.deepseek?.factsSnapshotDir), mechanics: config.mechRules, moveRules: config.mechMoveRules }));
}

export async function runLoop(options: LoopOptions): Promise<LoopStats> {
  if (options.brain !== undefined) return productionRunLoop(options);
  const ds = options.escalators?.find((e): e is DeepSeekClient => e instanceof DeepSeekClient);
  if (!ds) return productionRunLoop({ ...options, brain: null });
  return productionRunLoop({ ...options, brainFactory: (config, client, deps) => createBrain(config, client!, deps) });
}

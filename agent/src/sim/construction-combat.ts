import { fightSample, type FightSampleResult } from "../sim/boss-sim.js";
import type { RolloutInput } from "../reflex/rollout.js";
import type { BuildState, CoreTemplate, FightEvaluator, PathStep } from "../construction/types.js";

/** The evidence adapter supplies the encounter and candidate deck, without exposing future rooms to the policy. */
export function constructionCombat(setup: {
  input: (state: Readonly<BuildState>, step: PathStep, seed: number) => RolloutInput | null;
  qualify?: (core: CoreTemplate, sample: FightSampleResult) => boolean | null;
  maxTurns?: number;
}): FightEvaluator {
  return (state, step, seed, core) => {
    const supplied = setup.input(state, step, seed);
    if (!supplied) return null;
    const input = structuredClone(supplied);
    input.captureCore = true; input.captureResources = true;
    input.solver.player.hp = state.hp;
    if (state.combatResources) {
      input.solver.player.revives = structuredClone(state.combatResources.revives);
      const spent = new Set(state.combatResources.drunkKeys);
      input.solver.hand = input.solver.hand.filter((c) => !spent.has(c.cardId));
      input.plans = [];
    }
    const result = fightSample(input, null, seed, setup.maxTurns);
    const resources = result.resources;
    const complete = !result.capped && !result.timeUp && (result.won || result.died) && resources !== undefined;
    return { hp: resources?.hp ?? state.hp, gold: state.gold, won: result.won, complete,
      functional: setup.qualify?.(core, result) ?? null, damage: result.dmgByTurn.reduce((a, b) => a + b, 0), turns: result.turns,
      ...(resources ? { combatResources: { revives: resources.revives,
        drunkKeys: [...(state.combatResources?.drunkKeys ?? []), ...resources.drunkKeys] } } : {}) };
  };
}

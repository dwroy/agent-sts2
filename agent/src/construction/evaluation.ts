/** Reuse same-question B3 samples. Inventory signatures and combat realization are separate objectives. */
import { asRecord, numOrNull, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { BuildState, CoreTemplate } from "./types.js";

export interface SimulationBinding {
  run: string; floor: number; label: string;
  /** Supplied by the existing B3 entry point; this reader never imports or runs the simulator. */
  minimumShown: number;
  record: Record<string, JsonValue>;
}
export interface EvaluationOption { key: string; state: BuildState | null; why?: string }

function spread(value: unknown): JsonValue {
  const s = asRecord(value);
  if (!Number.isSafeInteger(s.n) || Number(s.n) <= 0 || numOrNull(s.mean) === null) return null;
  return toJsonValue({ n: s.n, mean: s.mean, meanSe: s.meanSe ?? null, p10: s.p10 ?? null, p90: s.p90 ?? null });
}
function paired(value: unknown): JsonValue {
  const p = asRecord(value), difference = spread(p.difference);
  return difference === null ? null : toJsonValue({ difference, unmatchedBase: p.unmatchedBase, unmatchedOption: p.unmatchedOption });
}
function inventory(state: BuildState) {
  return { cards: state.cards.length, upgraded: state.cards.filter((c) => c.upgraded).length, gold: state.gold, hp: state.hp, maxHp: state.maxHp };
}

/** First-play distributions are conditional on a valid observed simulation trace, not optimal reachability. */
function componentMetrics(quantitative: Record<string, unknown>, template: CoreTemplate, state: BuildState | null): JsonValue {
  const window = asRecord(quantitative.core_window), cards = asRecord(window.cards);
  const valid = numOrNull(window.valid), samples = numOrNull(window.samples);
  const ids = [...new Set(template.requirements.flatMap((r) => r.any.filter((c) => c.kind === "card").map((c) => c.id)))].filter((id) => state?.cards.some((c) => c.id === id) || cards[id] !== undefined);
  return toJsonValue({ traceSamples: samples, validTraces: valid, unknownTraces: window.missing ?? null,
    cards: Object.fromEntries(ids.map((id) => {
      const card = asRecord(cards[id]), first = asRecord(card.first_play_when_played);
      const played = numOrNull(first.n);
      return [id, { playedSamples: valid === null || valid === 0 ? null : played ?? 0,
        playedFractionOnValidTraces: valid === null || valid === 0 ? null : (played ?? 0) / valid,
        firstPlayWhenPlayed: spread(first), manualPlays: spread(card.manual),
        pairedManualPlays: paired(card.paired_manual), pairedFirstPlayWhenBothPlayed: paired(card.paired_first_play_when_both_played) }];
    })),
    qualifiedCore: null,
    limits: "逐牌施放覆盖和首次施放回合是兑现代理，不能相加为完整核心次数；未施放保留在有效轨迹分母，缺轨迹不补零。首次施放差仅配对两侧均施放的样本，不能当所有样本的启动收益。" });
}

/** Every number is tied to this question's candidate key; failures never reuse another question's cache. */
export function constructionEvaluation(initial: BuildState, options: readonly EvaluationOption[], templates: readonly CoreTemplate[],
  expected: Pick<SimulationBinding, "run" | "floor" | "label">, simulation?: SimulationBinding): Record<string, JsonValue> {
  const matched = simulation && simulation.run === expected.run && simulation.floor === expected.floor && simulation.label === expected.label;
  const record = matched ? simulation.record : {};
  const n = numOrNull(record.samples), requested = numOrNull(record.requested);
  const minimumShown = numOrNull(simulation?.minimumShown);
  const eligible = !record.error && !record.skipped && n !== null && requested !== null
    && minimumShown !== null && minimumShown > 0 && n >= Math.min(minimumShown, requested) && requested > 0;
  const quantitative = eligible ? asRecord(record.quantitative) : {};
  const optionValues = asRecord(quantitative.options);
  const before = inventory(initial);
  return toJsonValue({ schema: "construction-evaluation-v1", character: "silent", run: expected.run, floor: expected.floor, label: expected.label,
    coreCatalog: templates.map((core) => ({ id: core.id, name: core.name, candidate: core.status !== "validated", requirements: core.requirements, evidence: core.evidence })),
    simulationStatus: !simulation ? "missing" : !matched ? "binding_mismatch" : eligible ? "sample_gate_passed" : "unavailable",
    boss: record.boss ?? null, simulationSamples: n, simulationError: record.error ?? null,
    options: Object.fromEntries(options.map((option) => {
      const q = asRecord(option.key === "current" ? quantitative.base : optionValues[option.key]);
      const after = option.state ? inventory(option.state) : null;
      return [option.key, { inventory: after, inventoryDelta: after ? {
        cards: after.cards - before.cards, upgraded: after.upgraded - before.upgraded, gold: after.gold - before.gold,
        hp: after.hp - before.hp, maxHp: after.maxHp - before.maxHp } : null,
        unavailableReason: option.why ?? (eligible && Object.keys(q).length ? null : "本题该候选没有通过原模拟样本门槛的结果"),
        fight: Object.keys(q).length ? { samples: q.samples, completeDpr: spread(q.effective_damage_per_turn),
          pairedDpr: paired(q.paired_effective_damage_per_turn), bossMargin: q.boss_relative_margin ?? null,
          hpLoss: spread(q.hp_loss), pairedHpLoss: spread(q.paired_hp_loss_difference),
          turns: spread(q.simulated_turns), blockGained: spread(q.block_gained), potionsUsed: spread(q.potions_used),
          capped: q.capped, timeUp: q.time_up,
          componentRealization: Object.fromEntries(templates.map((core) => [core.id, componentMetrics(q, core, option.state)])) } : null }];
    })),
    limits: "复用本题既有boss条件模拟，不新增整战或未来路线模拟；升级、拿牌、删牌的战斗差与组件集齐率分列。DPR按完整战斗含准备轮统计，配对差保留未匹配分母；模型偏差、未建机制和完整核心资格不因采样通过而消失。" }) as Record<string, JsonValue>;
}

import { asRecord, asArray, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { AnswerSpec } from "../brain/types.js";
import type { JsonSchema } from "../brain/tools/types.js";
import type { BuildState, CoreTemplate } from "../construction/types.js";
import type { ConstructionSupport } from "../construction/support.js";
import { boundDirectionPrompt, completedDirectionSummaries, directionResultLabels, DIRECTION_COMBAT_NOTE, type DirectionCompletedSnapshot } from "./direction-prompt.js";
import type { ProjectionReason } from "./replan-triggers.js";
import type { BuildCore } from "./build-core.js";
import { checkRoute, routeIds, routeMapFromView } from "../sim/route-map.js";
import { validateDirectionWeights, type DirectionContext, type ProjectionEntry } from "./formats.js";

export interface ComboSummary {
  id: string; source: "build-core-v1" | "construction-transition" | "brain";
  requirements: JsonValue; metrics: JsonValue; details: JsonValue;
}
export interface DirectionSummary {
  id: string; name: string; source: "build-core-v1" | "construction-transition";
  components: string[]; requirements: JsonValue; support: JsonValue; details: JsonValue; combos: ComboSummary[];
}
/** Read-only adapter. Support stays outside transition signatures; no knowledge is published. */
export function directionSummaries(character: string, ascension: number, cores: readonly BuildCore[], templates: readonly CoreTemplate[], support: ConstructionSupport | null): DirectionSummary[] {
  const formal = cores.filter(d => d.scope.character === character && d.scope.ascensions.includes(ascension));
  const result: DirectionSummary[] = formal.map(d => {
    const combos = d.combos.map(c => ({ id: c.id, source: "build-core-v1" as const,
      requirements: toJsonValue(c.cards.map((r, i) => ({ id: `${c.id}:${i}`, count: r.count,
        any: ("id" in r ? [r.id] : r.any_of).map(id => ({ kind: "card", id, upgraded: r.upgraded })) }))),
      metrics: toJsonValue(c.metrics),
      details: toJsonValue({ ...c, metrics: c.metrics }) }));
    return { id: d.direction, name: d.name, source: "build-core-v1", components: Object.keys(d.card_pool),
      requirements: toJsonValue(combos.flatMap(c => asArray(c.requirements))), support: null,
      details: toJsonValue({ status: d.status, card_pool: d.card_pool, pivot_signals: d.pivot_signals, failure_modes: d.failure_modes,
        linked_experience: d.linked_experience, linked_reflex: d.linked_reflex }), combos };
  });
  return [...result, ...templates.filter(t => t.character === character && t.ascensions.includes(ascension) && !result.some(d => d.id === t.id)).map(t => {
    const local = support?.character === character ? support.entries.filter(s => s.core === t.id && s.ascensions.includes(ascension)) : [];
    return { id: t.id, name: t.name, source: "construction-transition" as const, components: [...new Set([
      ...t.requirements.flatMap(r => r.any.filter(c => c.kind === "card").map(c => c.id)), ...local.map(s => s.component.id)])],
    requirements: toJsonValue(t.requirements), support: toJsonValue(local), details: toJsonValue({ evidence: t.evidence, limits: t.limits, pivot_signals: [] }),
    combos: [{ id: `${t.id}:minimal`, source: "construction-transition" as const, requirements: toJsonValue(t.requirements), metrics: null,
      details: toJsonValue({ types: ["must_pick_minimal"], evidence: t.evidence, limits: t.limits }) }] };
  })];
}
/** Brain overrides are a temporary combo for the next projection, never a formal build core. */
export function directionCombos(summary: DirectionSummary, previous?: JsonValue): ComboSummary[] {
  const cards = asRecord(asRecord(previous)["ideal_overrides"])[summary.id];
  return [...summary.combos.filter(c => c.source !== "brain"), ...(Array.isArray(cards) && cards.length ? [{ id: `${summary.id}:brain`, source: "brain" as const,
    requirements: toJsonValue(cards.map((id, i) => ({ id: `${summary.id}:brain:${i}`, any: [{ kind: "card", id }], count: 1 }))),
    metrics: null, details: toJsonValue({ ordered_card_ids: cards, temporary: true }) }] : [])];
}
export function directionContext(payload: unknown): DirectionContext | null {
  const st = asRecord(payload), raw = asRecord(st["v6_direction_context"]);
  if (raw["schema"] !== "direction-context-v1") return null;
  const catalog = Object.fromEntries(Object.entries(asRecord(raw["catalog"])).map(([k, v]) => [k, asArray(v).map(String)]));
  const map = routeMapFromView(st["act_route"]);
  return { catalog, appearedCards: new Set(asArray(raw["appeared_cards"]).map(String)), potionIds: new Set(asArray(raw["potion_ids"]).map(String)),
    currentFloor: Number(raw["floor"]), validRoute: route => route === "keep" || Boolean(map && routeIds(route) && checkRoute(map, routeIds(route)!).length === 0) };
}
export function directionPlanSpec(payload: unknown, label = "run-plan"): AnswerSpec | null {
  const context = directionContext(payload);
  if (!context) return null;
  const string: JsonSchema = { type: "string" };
  const properties: Record<string, JsonSchema> = {
    schema: { type: "string", enum: ["direction-weights-v1"] },
    direction_weights: { type: "object", properties: Object.fromEntries(Object.keys(context.catalog).map(id => [id, { type: "number", minimum: 0, maximum: 1 }])), required: Object.keys(context.catalog), additionalProperties: false },
    ideal_overrides: { type: "object", properties: Object.fromEntries(Object.keys(context.catalog).map(id => {
      const ids = [...new Set([...context.catalog[id]!, ...context.appearedCards])];
      return [id, { type: "array", ...(ids.length ? {} : { maxItems: 0 }), items: { type: "string", ...(ids.length ? { enum: ids } : {}) } }];
    })), additionalProperties: false },
    potion_directions: { type: "array", ...(context.potionIds.size ? {} : { maxItems: 0 }), items: { type: "object", properties: { schema: { type: "string", enum: ["potion-direction-v1"] }, potion: { type: "string", ...(context.potionIds.size ? { enum: [...context.potionIds] } : {}) }, tier: { type: "string", enum: ["must", "prefer", "normal", "avoid"] }, for: { type: "string", enum: ["current_boss", "joint", "elite"] }, reason: string }, required: ["schema", "potion", "tier", "reason"], additionalProperties: false } },
    route: string, rest: { type: "string", enum: ["heal", "smith", "auto"] }, checkpoint: { type: "integer", minimum: context.currentFloor + 1, maximum: 100 }, reason: string,
  };
  return { label, kind: "plan", reask: true, schema: { type: "object", properties, required: ["schema", "direction_weights", "potion_directions", "route", "rest", "checkpoint", "reason"], additionalProperties: false },
    validate: answer => { const r = validateDirectionWeights(answer, context); return r.ok ? [] : r.issues; } };
}
export function directionTask(input: { summaries: DirectionSummary[]; entries: ProjectionEntry[]; targets?: readonly string[]; projectionReasons?: readonly ProjectionReason[]; completed?: DirectionCompletedSnapshot | null; inventory?: BuildState; appearedCards: string[]; potionIds: string[]; floor: number; current: JsonValue; map?: JsonValue; previous?: JsonValue }): Record<string, JsonValue> {
  const summaries = input.summaries.map(s => ({ ...s, combos: directionCombos(s, input.previous) }));
  // V5's construction instruction asks for a different answer schema and repeats this catalog.
  const { construction_context: _legacy, ...current } = asRecord(input.current);
  return boundDirectionPrompt({ task: "评估全部方向及其组合凑齐后对各 Boss/连战的结果与当前还差几张牌，输出 direction-weights-v1。比较掉血、回合数、每回合伤害、死亡率、样本误差和可信度；缺失结果保持未知。不提供凑齐概率或概率乘积。全部方向权重和为1，只给方向权重。ideal_overrides仅可引用核心构筑卡牌池或本局出现过的牌，作为来源brain的临时组合。药水按ID或已发布类别给档位。route为合法节点路线或keep；rest为heal/smith/auto；checkpoint必须大于当前层。",
    v6_direction_context: toJsonValue({ schema: "direction-context-v1", catalog: Object.fromEntries(input.summaries.map(s => [s.id, s.components])), appeared_cards: input.appearedCards, potion_ids: input.potionIds, floor: input.floor }),
    build_cores: completedDirectionSummaries(summaries, input.completed, input.inventory),
    result_labels: directionResultLabels(input.completed),
    combat_note: DIRECTION_COMBAT_NOTE,
    targets: toJsonValue(input.completed?.targets.map(t => t.id) ?? input.targets ?? [...new Set(input.entries.map(e => e.target_id))]),
    run_state: toJsonValue(current), ...(input.map ? { act_route: input.map } : {}), ...(input.previous ? { previous_plan: input.previous } : {}) });
}

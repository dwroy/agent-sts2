import { asRecord, asArray, toJsonValue, type JsonValue } from "../core/util/json.js";
import type { AnswerSpec } from "../brain/types.js";
import type { JsonSchema } from "../brain/tools/types.js";
import type { CoreTemplate } from "../construction/types.js";
import type { ConstructionSupport } from "../construction/support.js";
import { checkRoute, routeIds, routeMapFromView } from "../sim/route-map.js";
import { validateDirectionWeights, type DirectionCard, type DirectionContext, type ProjectionEntry } from "./formats.js";

export interface DirectionSummary {
  id: string; name: string; source: "direction-card-v1" | "construction-transition";
  components: string[]; requirements: JsonValue; support: JsonValue; details: JsonValue;
}
/** Read-only adapter. It neither promotes support to core nor publishes a direction card. */
export function directionSummaries(character: string, ascension: number, cards: readonly DirectionCard[], templates: readonly CoreTemplate[], support: ConstructionSupport | null): DirectionSummary[] {
  const formal = cards.filter(d => d.scope.character === character && d.scope.ascensions.includes(ascension));
  const result: DirectionSummary[] = formal.map(d => ({ id: d.id, name: d.name, source: "direction-card-v1",
    components: [...new Set([...d.core.flatMap(r => r.any.filter(c => c.kind === "card").map(c => c.id)), ...d.support.filter(s => s.component.kind === "card").map(s => s.component.id),
      ...Object.values(d.ideal).flatMap(i => i.components.filter(c => c.component.kind === "card").map(c => c.component.id))])],
    requirements: toJsonValue(d.core), support: toJsonValue(d.support), details: toJsonValue(d) }));
  return [...result, ...templates.filter(t => t.character === character && t.ascensions.includes(ascension) && !result.some(d => d.id === t.id)).map(t => {
    const local = support?.character === character ? support.entries.filter(s => s.core === t.id && s.ascensions.includes(ascension)) : [];
    return { id: t.id, name: t.name, source: "construction-transition" as const, components: [...new Set([
      ...t.requirements.flatMap(r => r.any.filter(c => c.kind === "card").map(c => c.id)), ...local.map(s => s.component.id)])],
    requirements: toJsonValue(t.requirements), support: toJsonValue(local), details: toJsonValue({ evidence: t.evidence, limits: t.limits, ideal: null, pivot_signals: [] }) };
  })];
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
export function directionTask(input: { summaries: DirectionSummary[]; entries: ProjectionEntry[]; appearedCards: string[]; potionIds: string[]; floor: number; current: JsonValue; map?: JsonValue; previous?: JsonValue }): Record<string, JsonValue> {
  return { task: "评估全部方向及目标的投影、配对误差、可信度和补齐可得率，输出 direction-weights-v1。全部方向权重和为1；理想补齐不代表当前牌组，未知不得当作收益。过渡摘要不等于正式方向卡。ideal_overrides仅可引用目录组件或本局出现过的牌。药水按ID或已发布类别给档位。route为合法节点路线或keep；rest为heal/smith/auto；checkpoint必须大于当前层。",
    v6_direction_context: toJsonValue({ schema: "direction-context-v1", catalog: Object.fromEntries(input.summaries.map(s => [s.id, s.components])), appeared_cards: input.appearedCards, potion_ids: input.potionIds, floor: input.floor }),
    direction_cards: toJsonValue(input.summaries), direction_evaluation: toJsonValue(input.entries),
    availability: toJsonValue(input.entries.map(e => ({ direction: e.direction_id, target: e.target_id, option: e.option_id, ...e.availability }))),
    run_state: input.current, ...(input.map ? { act_route: input.map } : {}), ...(input.previous ? { previous_plan: input.previous } : {}) };
}

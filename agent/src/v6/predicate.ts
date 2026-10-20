import { custom, plain, safeKey, validate, type Result } from "./schema.js";

export type Scalar = string | number | boolean;
export type Predicate = { op: "and" | "or"; args: Predicate[] } | { op: "not"; arg: Predicate }
  | { op: "any" | "all"; field: string; arg: Predicate }
  | { op: "exists"; field: string }
  | { op: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "contains"; field: string; value: Scalar };

/** Published DTO paths, not paths into arbitrary raw mod objects. Dynamic IDs are own properties only. */
type FieldType = "number" | "string" | "boolean" | "tags" | "record" | "collection";
/** Quantifiers bind one entity at a time; conditions cannot join different cards/enemies. */
export const PREDICATE_COLLECTIONS: Readonly<Record<string, string>> = Object.freeze({
  "enemies.items": "enemy", "player.hand": "card", "player.deck": "card",
  "player.piles.draw": "card", "player.piles.discard": "card", "player.piles.exhaust": "card",
  "potion.slots": "potion", "option.actions": "action", "rest.options": "rest_option", "shop.stock": "shop_item",
  "combos.items": "combo", "targets.items": "target",
});
export const PREDICATE_FIELDS: Readonly<Record<string, FieldType>> = Object.freeze({
  "enemy.intent_type": "string", "enemy.hits": "number", "enemy.total_damage": "number",
  "player.hp": "number", "player.block": "number", "player.energy": "number",
  "option.turn.damage": "number", "option.turn.block": "number", "option.turn.hp_loss": "number",
  "option.turn.energy_left": "number", "option.turn.cards_drawn": "number",
  "card.tags": "tags", "potion.tags": "tags", act: "number", floor: "number",
  "enemy.id": "string", "enemy.hp": "number", "enemy.move_id": "string", "enemy.alive": "boolean", "enemy.index": "number",
  "enemies.alive": "number", "enemies.items": "collection",
  "card.id": "string", "card.upgraded": "boolean", "card.cost": "number", "card.can_play": "boolean", "card.index": "number",
  "card.ids": "tags", "card.count": "number", "card.line": "string",
  "player.hand": "collection", "player.piles": "record", "player.piles.draw": "collection",
  "player.piles.discard": "collection", "player.piles.exhaust": "collection", "player.deck": "collection",
  "player.relics": "tags", "player.relic_counters": "record", "player.max_hp": "number", "player.gold": "number",
  "player.deck_size": "number", "combos.items": "collection", "combo.id": "string", "combo.direction": "string",
  "combo.missing_before": "number", "combo.missing_after": "number", "combo.advanced": "number",
  "targets.items": "collection", "target.id": "string", "target.boss": "string", "target.kind": "string",
  "target.act": "number", "target.floor": "number",
  "potion.id": "string", "potion.usable": "boolean", "potion.index": "number", "potion.occupied": "boolean", "potion.slots": "collection",
  turn: "number", "sl.attempt": "number", "history.first_predicted_death": "record", "history.resource_handoff": "record",
  "room.kind": "string", "rest.options": "collection", "rest_option.id": "string", "rest_option.enabled": "boolean",
  "shop.stock": "collection", "shop.prices": "record", "shop_item.id": "string", "shop_item.kind": "string",
  "shop_item.index": "number", "shop_item.stocked": "boolean", "shop_item.price": "number",
  "option.actions": "collection", "option.kind": "string", "option.future": "record",
  "option.model_version": "string", "option.trust": "string", "option.complete_line": "boolean",
  "action.index": "number", "action.kind": "string", "action.target": "number", "action.cost": "number",
  "action.discards": "tags", "action.card": "record", "action.potion": "record",
});
function fieldType(field: string): FieldType | null {
  if (Object.hasOwn(PREDICATE_FIELDS, field)) return PREDICATE_FIELDS[field]!;
  const parts = field.split(".");
  if (parts.length === 3 && ["enemy", "player"].includes(parts[0]!) && parts[1] === "powers" && safeKey(parts[2]!)) return "number";
  if (parts.length === 2 && parts[0] === "direction_weights" && safeKey(parts[1]!)) return "number";
  if (parts.length === 3 && parts[0] === "player" && parts[1] === "relic_counters" && safeKey(parts[2]!)) return "number";
  if (parts.length === 3 && parts[0] === "shop" && parts[1] === "prices" && safeKey(parts[2]!)) return "number";
  if (parts.length === 4 && parts[0] === "option" && parts[1] === "future" && ["rollout", "whole_fight"].includes(parts[2]!)
    && ["horizon_turns", "samples", "further_hp_loss", "win_probability"].includes(parts[3]!)) return "number";
  return null;
}
export const predicateSchema = custom<Predicate>((value, path, issues) => {
  let nodes = 0;
  function visit(v: unknown, depth: number): void {
    if (++nodes > 128 || depth > 12 || !plain(v)) { issues.push(`${path}: predicate depth/size/object`); return; }
    const op = v["op"];
    const keys = op === "and" || op === "or" ? ["op", "args"] : op === "not" ? ["op", "arg"]
      : op === "any" || op === "all" ? ["op", "field", "arg"] : op === "exists" ? ["op", "field"] : ["op", "field", "value"];
    if (Object.keys(v).length !== keys.length || Object.keys(v).some(k => !keys.includes(k))) { issues.push(`${path}: predicate fields`); return; }
    if (op === "and" || op === "or") {
      if (!Array.isArray(v["args"]) || v["args"].length < 1 || v["args"].length > 32) issues.push(`${path}: predicate args`);
      else v["args"].forEach(arg => visit(arg, depth + 1));
      return;
    }
    if (op === "not") { visit(v["arg"], depth + 1); return; }
    const type = typeof v["field"] === "string" ? fieldType(v["field"]) : null;
    if (!type) { issues.push(`${path}: field outside predicate whitelist`); return; }
    if (op === "any" || op === "all") {
      if (typeof v["field"] !== "string" || !Object.hasOwn(PREDICATE_COLLECTIONS, v["field"])) issues.push(`${path}: quantified collection required`);
      visit(v["arg"], depth + 1); return;
    }
    if (op === "exists") return;
    if (!["eq", "ne", "lt", "lte", "gt", "gte", "contains"].includes(String(op))) { issues.push(`${path}: comparison required`); return; }
    if (type === "record" || type === "collection" || (type === "boolean" ? !["eq", "ne"].includes(String(op)) || typeof v["value"] !== "boolean"
      : type === "tags" ? op !== "contains" || typeof v["value"] !== "string"
      : type === "number" ? op === "contains" || typeof v["value"] !== "number" || !Number.isFinite(v["value"])
        : !["eq", "ne"].includes(String(op)) || typeof v["value"] !== "string")) issues.push(`${path}: incompatible comparison`);
    if (typeof v["value"] === "string" && (v["value"].length === 0 || v["value"].length > 100)) issues.push(`${path}: comparison value length`);
  }
  visit(value, 0);
});
export const validatePredicate = (v: unknown): Result<Predicate> => validate(predicateSchema, v);

/** Every OR branch must constrain candidate identity AND the observed deck/combo state. */
export function cardPickDeckPredicate(p: Predicate): boolean {
  function anchors(p: Predicate, boundCard = false): number {
    if (p.op === "and") return p.args.reduce((bits, arg) => bits | anchors(arg, boundCard), 0);
    if (p.op === "or") return p.args.reduce((bits, arg) => bits & anchors(arg, boundCard), 3);
    if (p.op === "not") return 0;
    if (p.op === "any" || p.op === "all") {
      const bits = anchors(p.arg, boundCard || PREDICATE_COLLECTIONS[p.field] === "card");
      return bits | (["player.deck", "combos.items"].includes(p.field) ? 2 : 0);
    }
    if (!("field" in p) || p.op === "exists") return 0;
    return (!boundCard && p.field === "card.id" && p.op === "eq" ? 1 : 0)
      | (p.field === "player.deck_size" ? 2 : 0);
  }
  return anchors(p) === 3;
}

function read(context: unknown, path: string): unknown {
  let current: unknown = context;
  for (const part of path.split(".")) {
    if (!plain(current) || !Object.hasOwn(current, part)) return undefined;
    current = current[part];
  }
  return current;
}
/** Three-valued logic: missing/invalid facts remain unknown, including under NOT. */
export function evaluatePredicate(value: unknown, context: unknown): boolean | null {
  const result = validatePredicate(value);
  if (!result.ok) return null;
  let work = 0;
  function evaluate(p: Predicate, scope: unknown = context): boolean | null {
    if (++work > 4096) return null;
    if (p.op === "and" || p.op === "or") {
      const values = p.args.map(arg => evaluate(arg, scope));
      if (p.op === "and") return values.includes(false) ? false : values.includes(null) ? null : true;
      return values.includes(true) ? true : values.includes(null) ? null : false;
    }
    if (p.op === "not") { const v = evaluate(p.arg, scope); return v === null ? null : !v; }
    if (!("field" in p)) return null;
    const actual = read(scope, p.field);
    if (p.op === "any" || p.op === "all") {
      if (!Array.isArray(actual) || actual.length > 1000 || !actual.every(plain) || !plain(scope)) return null;
      const binding = PREDICATE_COLLECTIONS[p.field]!;
      const values = actual.map(item => {
        const local = { ...scope, [binding]: item };
        if (binding === "action") { local["card"] = item["card"]; local["potion"] = item["potion"]; }
        return evaluate(p.arg, local);
      });
      return p.op === "any" ? values.includes(true) ? true : values.includes(null) ? null : false
        : values.includes(false) ? false : values.includes(null) ? null : true;
    }
    const type = fieldType(p.field);
    const valid = type === "number" ? typeof actual === "number" && Number.isFinite(actual)
      : type === "string" ? typeof actual === "string" : type === "boolean" ? typeof actual === "boolean"
        : type === "record" ? plain(actual) : type === "collection" ? Array.isArray(actual) && actual.length <= 1000 && actual.every(plain)
        : Array.isArray(actual) && actual.every(tag => typeof tag === "string");
    if (p.op === "exists") return actual !== undefined && actual !== null && valid;
    if (actual == null || !valid) return null;
    switch (p.op) {
      case "contains": return Array.isArray(actual) && actual.includes(p.value);
      case "eq": return actual === p.value;
      case "ne": return actual !== p.value;
      case "lt": return (actual as number) < (p.value as number);
      case "lte": return (actual as number) <= (p.value as number);
      case "gt": return (actual as number) > (p.value as number);
      case "gte": return (actual as number) >= (p.value as number);
    }
    return null;
  }
  try { return evaluate(result.value); } catch { return null; }
}
export const matchesPredicate = (p: unknown, context: unknown): boolean => evaluatePredicate(p, context) === true;

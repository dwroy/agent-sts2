import { custom, plain, safeKey, validate, type Result } from "./schema.js";

export type Scalar = string | number | boolean;
export type Predicate = { op: "and" | "or"; args: Predicate[] } | { op: "not"; arg: Predicate }
  | { op: "exists"; field: string }
  | { op: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "contains"; field: string; value: Scalar };

/** Published DTO paths, not paths into arbitrary raw mod objects. Dynamic IDs are own properties only. */
export const PREDICATE_FIELDS: Readonly<Record<string, "number" | "string" | "tags">> = Object.freeze({
  "enemy.intent_type": "string", "enemy.hits": "number", "enemy.total_damage": "number",
  "player.hp": "number", "player.block": "number", "player.energy": "number",
  "option.turn.damage": "number", "option.turn.block": "number", "option.turn.hp_loss": "number",
  "option.turn.energy_left": "number", "option.turn.cards_drawn": "number",
  "card.tags": "tags", "potion.tags": "tags", act: "number", floor: "number",
});
function fieldType(field: string): "number" | "string" | "tags" | null {
  if (Object.hasOwn(PREDICATE_FIELDS, field)) return PREDICATE_FIELDS[field]!;
  const parts = field.split(".");
  if (parts.length === 3 && ["enemy", "player"].includes(parts[0]!) && parts[1] === "powers" && safeKey(parts[2]!)) return "number";
  if (parts.length === 2 && parts[0] === "direction_weights" && safeKey(parts[1]!)) return "number";
  return null;
}
export const predicateSchema = custom<Predicate>((value, path, issues) => {
  let nodes = 0;
  function visit(v: unknown, depth: number): void {
    if (++nodes > 128 || depth > 12 || !plain(v)) { issues.push(`${path}: predicate depth/size/object`); return; }
    const op = v["op"];
    const keys = op === "and" || op === "or" ? ["op", "args"] : op === "not" ? ["op", "arg"] : op === "exists" ? ["op", "field"] : ["op", "field", "value"];
    if (Object.keys(v).length !== keys.length || Object.keys(v).some(k => !keys.includes(k))) { issues.push(`${path}: predicate fields`); return; }
    if (op === "and" || op === "or") {
      if (!Array.isArray(v["args"]) || v["args"].length < 1 || v["args"].length > 32) issues.push(`${path}: predicate args`);
      else v["args"].forEach(arg => visit(arg, depth + 1));
      return;
    }
    if (op === "not") { visit(v["arg"], depth + 1); return; }
    const type = typeof v["field"] === "string" ? fieldType(v["field"]) : null;
    if (!type) { issues.push(`${path}: field outside predicate whitelist`); return; }
    if (op === "exists") return;
    if (!["eq", "ne", "lt", "lte", "gt", "gte", "contains"].includes(String(op))) { issues.push(`${path}: comparison required`); return; }
    if (type === "tags" ? op !== "contains" || typeof v["value"] !== "string"
      : type === "number" ? op === "contains" || typeof v["value"] !== "number" || !Number.isFinite(v["value"])
        : !["eq", "ne"].includes(String(op)) || typeof v["value"] !== "string") issues.push(`${path}: incompatible comparison`);
    if (typeof v["value"] === "string" && (v["value"].length === 0 || v["value"].length > 100)) issues.push(`${path}: comparison value length`);
  }
  visit(value, 0);
});
export const validatePredicate = (v: unknown): Result<Predicate> => validate(predicateSchema, v);

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
  function evaluate(p: Predicate): boolean | null {
    if (p.op === "and" || p.op === "or") {
      const values = p.args.map(evaluate);
      if (p.op === "and") return values.includes(false) ? false : values.includes(null) ? null : true;
      return values.includes(true) ? true : values.includes(null) ? null : false;
    }
    if (p.op === "not") { const v = evaluate(p.arg); return v === null ? null : !v; }
    if (!("field" in p)) return null;
    const actual = read(context, p.field);
    const type = fieldType(p.field);
    const valid = type === "number" ? typeof actual === "number" && Number.isFinite(actual)
      : type === "string" ? typeof actual === "string"
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

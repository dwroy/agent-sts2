/**
 * Checks a tool input against the tool's inputSchema (the JsonSchema subset of types.ts): an object with known
 * properties of the right type, enum, range and array size. Returns the reasons it fails (Chinese, for the
 * model), or [] when it is valid.
 */

import type { JsonSchema } from "./types.js";

function typeOk(schema: JsonSchema, value: unknown): boolean {
  switch (schema.type) {
    case undefined:
      return true;
    case "string":
      return typeof value === "string";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    case "null":
      return value === null;
    default:
      return false;
  }
}

function check(schema: JsonSchema, value: unknown, path: string, problems: string[]): void {
  if (!typeOk(schema, value)) {
    problems.push(`${path} 应为 ${schema.type}，收到 ${value === null ? "null" : Array.isArray(value) ? "array" : typeof value}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value as string | number)) problems.push(`${path} 只能是 ${schema.enum.map((item) => JSON.stringify(item)).join(", ")}，收到 ${JSON.stringify(value)}`);
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) problems.push(`${path} 不能小于 ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) problems.push(`${path} 不能大于 ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) problems.push(`${path} 至少 ${schema.minItems} 项`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) problems.push(`${path} 最多 ${schema.maxItems} 项`);
    if (schema.items) value.forEach((item, index) => check(schema.items!, item, `${path}[${index}]`, problems));
  }
  if (schema.type === "object") {
    const record = value as Record<string, unknown>;
    const properties = schema.properties ?? {};
    for (const key of schema.required ?? []) if (record[key] === undefined) problems.push(`缺少 ${path === "输入" ? "" : `${path}.`}${key}`);
    for (const [key, child] of Object.entries(record)) {
      const sub = properties[key];
      if (!sub) {
        if (schema.additionalProperties === false) problems.push(`不认识的参数 ${key}（可用: ${Object.keys(properties).join(", ") || "无"}）`);
        continue;
      }
      if (child !== undefined) check(sub, child, path === "输入" ? key : `${path}.${key}`, problems);
    }
  }
}

export function validateInput(schema: JsonSchema, input: unknown): string[] {
  const problems: string[] = [];
  check(schema, input ?? {}, "输入", problems);
  return problems;
}

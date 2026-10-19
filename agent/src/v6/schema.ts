/** Small strict JSON validators. No coercion, defaults, executable strings or unknown keys. */
export type Result<T> = { ok: true; value: T } | { ok: false; issues: string[] };
export interface Schema<T> { check(value: unknown, path: string, issues: string[]): void; readonly output?: T }
export type Infer<S> = S extends Schema<infer T> ? T : never;
type Fields = Record<string, Schema<unknown>>;
type ObjectValue<F extends Fields> = { [K in keyof F as undefined extends Infer<F[K]> ? never : K]: Infer<F[K]> }
  & { [K in keyof F as undefined extends Infer<F[K]> ? K : never]?: Exclude<Infer<F[K]>, undefined> };

export function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
export const safeKey = (key: string): boolean => /^[A-Za-z0-9_:-]{1,100}$/.test(key)
  && !["__proto__", "prototype", "constructor"].includes(key);
export const custom = <T>(check: Schema<T>["check"]): Schema<T> => ({ check });
export const text = (max = 500, min = 1): Schema<string> => custom((v, p, e) => {
  if (typeof v !== "string" || v.length < min || v.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)) e.push(`${p}: text ${min}..${max}`);
});
export const boolean: Schema<boolean> = custom((v, p, e) => { if (typeof v !== "boolean") e.push(`${p}: boolean required`); });
export const id: Schema<string> = custom((v, p, e) => { if (typeof v !== "string" || !safeKey(v)) e.push(`${p}: safe ID required`); });
export const number = (min = -Number.MAX_VALUE, max = Number.MAX_VALUE, integer = false): Schema<number> => custom((v, p, e) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) e.push(`${p}: finite ${integer ? "integer " : ""}${min}..${max}`);
});
export const enumeration = <const T extends readonly string[]>(...values: T): Schema<T[number]> => custom((v, p, e) => {
  if (typeof v !== "string" || !values.includes(v)) e.push(`${p}: expected ${values.join("|")}`);
});
export const literal = <const T extends string>(value: T): Schema<T> => enumeration(value);
export const optional = <T>(s: Schema<T>): Schema<T | undefined> => custom((v, p, e) => { if (v !== undefined) s.check(v, p, e); });
export const nullable = <T>(s: Schema<T>): Schema<T | null> => custom((v, p, e) => { if (v !== null) s.check(v, p, e); });
export const array = <T>(s: Schema<T>, min = 0, max = 1000): Schema<T[]> => custom((v, p, e) => {
  if (!Array.isArray(v) || v.length < min || v.length > max) { e.push(`${p}: array ${min}..${max}`); return; }
  v.forEach((entry, i) => s.check(entry, `${p}[${i}]`, e));
});
export const object = <F extends Fields>(fields: F): Schema<ObjectValue<F>> => custom((v, p, e) => {
  if (!plain(v)) { e.push(`${p}: plain object required`); return; }
  for (const key of Object.keys(v)) if (!Object.hasOwn(fields, key)) e.push(`${p}.${key}: unknown field`);
  for (const [key, s] of Object.entries(fields)) s.check(Object.hasOwn(v, key) ? v[key] : undefined, `${p}.${key}`, e);
});
export const record = <T>(s: Schema<T>): Schema<Record<string, T>> => custom((v, p, e) => {
  if (!plain(v) || Object.keys(v).length > 1000) { e.push(`${p}: bounded record required`); return; }
  for (const [key, value] of Object.entries(v)) {
    if (!safeKey(key)) e.push(`${p}: unsafe key`);
    s.check(value, `${p}.${key}`, e);
  }
});
export const refine = <T>(s: Schema<T>, check: (v: T, issues: string[]) => void): Schema<T> => custom((v, p, e) => {
  const before = e.length;
  s.check(v, p, e);
  if (e.length === before) check(v as T, e);
});
export function validate<T>(schema: Schema<T>, value: unknown): Result<T> {
  const issues: string[] = [];
  try { schema.check(value, "$", issues); } catch { issues.push("$: invalid input"); }
  return issues.length ? { ok: false, issues } : { ok: true, value: value as T };
}

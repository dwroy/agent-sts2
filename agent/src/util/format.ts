/** Small terminal helpers. Kept dependency-free on purpose. */

function colorEnabled(): boolean {
  if (process.env["NO_COLOR"]) return false;
  if (process.env["FORCE_COLOR"]) return true;
  return Boolean(process.stdout.isTTY);
}

function wrap(code: number, text: string): string {
  return colorEnabled() ? `\u001b[${code}m${text}\u001b[0m` : text;
}

export const style = {
  bold: (text: string) => wrap(1, text),
  dim: (text: string) => wrap(2, text),
  red: (text: string) => wrap(31, text),
  green: (text: string) => wrap(32, text),
  yellow: (text: string) => wrap(33, text),
  cyan: (text: string) => wrap(36, text),
};

/** `sk-abcdef...` → `sk-abcd...(28 chars)`. Never print a full credential. */
export function redactSecret(secret: string | null): string {
  if (!secret) return "not set";
  const visible = secret.length <= 8 ? secret.slice(0, 2) : secret.slice(0, 6);
  return `${visible}…(${secret.length} chars)`;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

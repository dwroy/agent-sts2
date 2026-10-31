/** Startup identity parsing only: path resolution must not import fs or SQLite. */
import { resolve } from 'node:path';
import type { StatsBinding } from './runtime/stats-store.js';
export interface AssetsSelection { directory: string; binding: StatsBinding; mode: 'shadow' | 'json' | 'sqlite'; shadow_log?: string }
const captured = process.env['STS2_ASSETS_SELECTION'];
let parsed: AssetsSelection | null | undefined;
export class AssetsBindingError extends Error { readonly statsResourceFailure = true; }
function frozen<T>(value: T): T { if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); } return value; }
export function assetsSelection(): AssetsSelection | null {
 if (parsed !== undefined) return parsed;
 if (!captured) return parsed = null;
 let value: AssetsSelection;
 try { value = JSON.parse(captured) as AssetsSelection; }
 catch { throw new AssetsBindingError('invalid original resource selection JSON'); }
 if (!value || Object.keys(value).some(k => !['directory', 'binding', 'mode', 'shadow_log'].includes(k))
  || typeof value.directory !== 'string' || !value.directory.startsWith('/') || resolve(value.directory) !== value.directory
  || !['shadow', 'json', 'sqlite'].includes(value.mode) || !value.binding
  || value.binding.backend !== (value.mode === 'sqlite' ? 'sqlite' : 'json')
  || value.shadow_log !== undefined && (!value.shadow_log.startsWith('/') || resolve(value.shadow_log) !== value.shadow_log)) throw new AssetsBindingError('invalid original resource selection');
 parsed = frozen(value);
 return parsed;
}

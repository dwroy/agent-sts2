/** Transpile only the two snapshotted repair leaves in a naturally freed worker slot. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { transformSync, version, stop } from '../../../../agent/node_modules/esbuild/lib/main.js';
const out = resolve(process.argv[2]);
const target = resolve(out, 'compiled');
for (const name of ['rollout.ts', 'rollout-live.ts']) {
  const source = resolve(out, 'source-repair', name);
  const code = readFileSync(source, 'utf8');
  const result = transformSync(code, { sourcefile: source, loader: 'ts', target: 'node22', format: 'esm' }).code;
  writeFileSync(resolve(target, 'agent/src/reflex', name.replace(/\.ts$/, '.js')), result);
}
const files = [];
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) walk(path);
    else if (item.isFile() && path.endsWith('.js')) files.push({ path: relative(target, path), sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
  }
}
walk(resolve(target, 'agent/src'));
walk(resolve(target, 'agent/tools/boss-sim'));
files.sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(resolve(out, 'compiled-manifest.json'), JSON.stringify({ esbuild: version, files, scope: 'Two source overlays over the unchanged explicit compiled closure; no new dependencies or model call.' }, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length, esbuild: version }));
stop();

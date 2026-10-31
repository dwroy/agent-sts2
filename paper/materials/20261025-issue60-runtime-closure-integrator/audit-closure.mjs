import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import {createRequire} from 'node:module';
const {transformSync} = createRequire(new URL('../../../agent/package.json', import.meta.url))('esbuild');

const root = process.cwd();
const ref = 'caa480132a67dc94b24be231d889cf37aa7b67d1';
const frozen = path.join(root, '.worktrees/integrator60-runtime-closure-20261025');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function closure(entries) {
  const found = new Map(), unresolved = [];
  function visit(name) {
    if (found.has(name)) return;
    const file = path.join(frozen, name), bytes = fs.readFileSync(file);
    found.set(name, {path: name, sha256: digest(bytes)});
    // Strip type-only edges exactly as the installed runtime's esbuild does.
    const emitted = name.endsWith('.ts') ? transformSync(bytes.toString(), {loader:'ts', format:'esm', tsconfigRaw:{compilerOptions:{verbatimModuleSyntax:true}}}).code : bytes.toString();
    const specs = [...emitted.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']/g)].map(match => match[1]);
    for (const spec of specs.filter(spec => spec.startsWith('.'))) {
      const base = path.normalize(path.join(path.dirname(name), spec));
      const candidates = [base.replace(/\.js$/, '.ts'), base, base + '.ts', path.join(base, 'index.ts')];
      const target = candidates.find(candidate => fs.existsSync(path.join(frozen, candidate)) && fs.statSync(path.join(frozen, candidate)).isFile());
      if (target) visit(target); else unresolved.push({from: name, spec});
    }
  }
  entries.forEach(visit);
  return {entries, files: [...found.values()].sort((a,b) => a.path.localeCompare(b.path)), unresolved};
}
const profiles = {
  host_cli: closure(['agent/tools/knowledge-runtime.ts']),
  host_launcher: closure(['learner/run.ts']),
  game: closure(['agent/src/index.ts']),
};
for (const [kind, profile] of Object.entries(profiles)) {
  profile.physical_mismatches = [];
  for (const row of profile.files) {
    const target = path.join(root, kind === 'game' ? '.worktrees/live' : '', row.path);
    row.current_sha256 = fs.existsSync(target) ? digest(fs.readFileSync(target)) : null;
    if (row.current_sha256 !== row.sha256) profile.physical_mismatches.push(row.path);
  }
}
const hostFiles = cp.execFileSync('git', ['ls-tree', '-r', '--name-only', ref, '--', 'ops', 'learner'], {encoding:'utf8'}).trim().split('\n')
  .filter(name => /^(ops\/[^/]+\.(?:py|sh|ts)|learner\/lib\/[^/]+\.ts|learner\/run.ts|learner\/tasks\/[^/]+\.md)$/.test(name));
const host = hostFiles.map(name => {
  const expected = cp.execFileSync('git', ['show', `${ref}:${name}`]);
  const actual = path.join(root, name);
  return {path: name, sha256: digest(expected), current_sha256: fs.existsSync(actual) ? digest(fs.readFileSync(actual)) : null};
});
const result = {at: new Date().toISOString(), full_anchor: ref, profiles, host_source_count: host.length,
  host_source_mismatches: host.filter(row => row.sha256 !== row.current_sha256), host_source: host};
fs.writeFileSync(path.join(root, 'paper/materials/20261025-issue60-runtime-closure-integrator/entry-closure.json'), JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({profiles: Object.fromEntries(Object.entries(profiles).map(([key,value]) => [key,{files:value.files.length, unresolved:value.unresolved, physical_mismatches:value.physical_mismatches}])),host_source_count:host.length,host_source_mismatches:result.host_source_mismatches}, null,2));

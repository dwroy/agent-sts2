"""Engineering-only closure update for the reviewed S1 IO integration.

Run explicitly in this development tree, never in a refresh or publication.
The emitted registry remains fail-closed at runtime. Existing dynamic edges,
scientific inputs and role boundaries are retained.
"""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'ops'))
from fixed_producer_methods import local_imports, opaque_sites
from learning_runtime_store import sha

path = ROOT / 'ops/fixed-producer-dependencies.json'
body = json.loads(path.read_text())
available = set(subprocess.check_output(['rg', '--files', '--hidden', '-g', '!.git', '-g', '!data', '-g', '!node_modules'], cwd=ROOT, text=True).splitlines())
available = {p for p in available if p.endswith(('.py', '.ts', '.mts', '.js', '.mjs', '.json', '.sql', '.sh'))}

# The entry dispatcher is frozen byte-for-byte. Its queue/publication orchestration
# does not execute inside a staged producer; only step/logdb_sync_steps are used.
overrides = {'knowledge/builders/refresh_driver.py': ('module', ['step', 'logdb_sync_steps']),
             'ops/stats_launch.py': ('module', ['requires_stats']),
             'ops/report.py': ('text', [])}
dynamic = {
 'knowledge/builders/refresh_driver.py': ['ops/stats_refresh.py', 'ops/stats_runtime.py', 'ops/stats_launch.py',
     'ops/refresh_health.py', 'ops/report_log_cache.py', 'agent/tools/logdb/sync.py', 'knowledge/builders/characters.py'],
 'ops/stats_runtime.py': ['agent/tools/stats-runtime.ts', 'agent/tools/stats-loader.mjs'],
 'ops/stats_refresh.py': ['knowledge/builders/refresh_driver.py', 'agent/package.json',
     'agent/tsconfig.json', 'agent/tsconfig.knowledge-runtime.json'],
 'agent/tools/stats-loader.mjs': ['agent/src/knowledge/runtime/stats-store.ts', 'agent/src/knowledge/runtime/stats-schema.ts',
     'agent/src/knowledge/runtime/sqlite-version.ts'],
 'agent/tools/logdb/sync.py': ['agent/tools/logdb/extract.py'],
 'ops/report_log_cache.py': ['ops/report.py', 'eval/jsonl_cache.py'],
 'knowledge/builders/monster-db-check.py': ['agent/src/sim/boss-clock.ts'],
}
# Ready preparation is after the S1 commit. Its reader capability hashes have
# their own immutable bundle receipt, and cannot change computed S1 values.
# Pin the helper source, keeping consumer source hashes in that separate receipt.

for producer, entry in [('catalog', 'knowledge/builders/build-catalog.py'), ('monster-db-check', 'knowledge/builders/monster-db-check.py')]:
 body['producers'].setdefault(producer, {'contract': {'entries': [entry], 'dynamic_edges': {},
     'unknown_dependencies': 'reject; reviewed byte identity required'}, 'inputs': {}})

def identity(name):
 return ('runtime:' if name.startswith('ops/') else 'code:') + name

for producer, selected in body['producers'].items():
 nodes = {**body['common'], **selected['inputs']}
 pending = list(nodes)
 for entry in selected['contract']['entries']:
  pending.append(identity(entry))
 # All A recipes use the same frozen outer S1 orchestration. Unmigrated B
 # keeps its original producer closure, except new imports in shared IO guards.
 if producer not in {'opening-value', 'event-pages', 'silent-boss-calibration'}:
  pending += [identity('knowledge/builders/refresh_driver.py')]
 if producer == 'silent-boss-calibration':
  extra = sorted(p for p in available if p.startswith('agent/src/') and p.endswith('.ts'))
  pending += [identity(p) for p in extra]
  selected['contract']['dynamic_edges']['agent/tools/boss-sim/refresh-silent.py'] = sorted(set(
      selected['contract']['dynamic_edges']['agent/tools/boss-sim/refresh-silent.py'] + extra))
 seen = set()
 while pending:
  key = pending.pop()
  if key in seen:
   continue
  seen.add(key)
  name = key.split(':', 1)[1]
  raw = (ROOT / name).read_bytes()
  old = nodes.get(key, {})
  scan, functions = overrides.get(name, (old.get('scan', 'all'), old.get('functions', [])))
  deps = set(old.get('dependencies', []))
  imports = set() if scan == 'text' else local_imports(name, raw, available, scan == 'module',
      {d.split(':', 1)[1] for d in deps}, functions)
  for target in imports:
   matches = [d for d in deps if d.split(':', 1)[1] == target]
   deps.add(matches[0] if len(matches) == 1 else identity(target))
  deps.update(identity(p) for p in dynamic.get(name, []))
  nodes[key] = {'sha256': sha(raw), 'dependencies': sorted(deps), 'scan': scan,
                'functions': functions, 'opaque_sites': opaque_sites(name, raw)}
  pending.extend(deps)
 selected['inputs'] = {key: value for key, value in sorted(nodes.items()) if key not in body['common']}
 for key in body['common']:
  body['common'][key] = nodes[key]
 selected['contract']['s1_io_revision'] = 'issue86-a1; reviewed frozen orchestration, native Node WAL IO, no algorithm changes'

path.write_text(json.dumps(body, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({name: len(value['inputs']) for name, value in body['producers'].items()}))

#!/usr/bin/env python3
"""Read bounded log prefixes; write only public, projected monitoring evidence."""
import collections
import datetime as dt
import hashlib
import gzip
import json
import math
from pathlib import Path
import re
import sys

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
LOG = Path(sys.argv[1]).resolve()
MANIFEST = OUT / 'input-manifest.json'
NAMES = ['runs.jsonl', 'run-config.jsonl', 'decisions.jsonl', 'brain.jsonl',
         'codex-calls.jsonl', 'v6-build.jsonl', 'sl-attempts.jsonl']


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


if MANIFEST.exists():
    manifest = json.loads(MANIFEST.read_text())
else:
    manifest = {'cut_utc': dt.datetime.now(dt.timezone.utc).isoformat(), 'files': {}}
    for name in NAMES:
        manifest['files'][name] = {'bytes': (LOG / name).stat().st_size}
    manifest['versions_sha256'] = hashlib.sha256((ROOT / 'eval/versions.json').read_bytes()).hexdigest()
    manifest['console'] = {p.name: p.stat().st_size for p in sorted((LOG / 'console').glob('*.log'))
                           if p.name >= '20261017-000000'}
    dump(MANIFEST, manifest)

evidence = []


def rows(name, pattern=None):
    limit = manifest['files'][name]['bytes']
    digest = hashlib.sha256()
    matched = hashlib.sha256()
    count = selected = 0
    with (LOG / name).open('rb') as f:
        while f.tell() < limit:
            offset = f.tell()
            line = f.readline(limit - offset)
            digest.update(line)
            count += 1
            if not line.endswith(b'\n'):
                raise ValueError(f'incomplete frozen line: {name}:{offset}')
            if pattern is not None and not pattern.search(line):
                continue
            row = json.loads(line)
            matched.update(line)
            selected += 1
            yield offset, row
    manifest['files'][name].update(sha256=digest.hexdigest(), lines=count,
                                    matched_lines=selected, matched_sha256=matched.hexdigest())


configs = collections.defaultdict(list)
for offset, c in rows('run-config.jsonl'):
    configs[c['run_id']].append(c)
ends = collections.defaultdict(list)
for offset, r in rows('runs.jsonl'):
    ends[r['run_id']].append(r)
assert all(len(v) == 1 for v in ends.values()), 'duplicate terminal records require explicit reconciliation'
v5 = sorted([v[0] for rid, v in ends.items() if v[0].get('character') == 'SILENT'
             and configs[rid] and not any(c.get('v6', {}).get('mode') == 'on' for c in configs[rid])],
            key=lambda r: r['ended'])[-20:]
versions = json.loads((ROOT / 'eval/versions.json').read_text())['versions']
assert hashlib.sha256((ROOT / 'eval/versions.json').read_bytes()).hexdigest() == manifest['versions_sha256']
boundaries = []
for v in versions:
    if v.get('release_id') in {f'V6-R{i}' for i in range(404, 411)}:
        stamp = re.match(r'(2026-\d\d-\d\d)[T ](\d\d:\d\d:\d\d(?:\.\d+)?)(?:\+08:00| CST)?', v['source'])
        assert stamp, v['release_id']
        t = dt.datetime.fromisoformat(stamp[1] + 'T' + stamp[2] + '+08:00')
        boundaries.append((t.isoformat(), v['release_id'], t.timestamp()))
boundaries.sort(key=lambda x: x[2])


def timestamp(s):
    return dt.datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp()


selected = {}
for r in v5:
    selected[r['run_id']] = ('V5', 'V5-window')
for rid, cs in configs.items():
    c = cs[0]
    if c.get('character') != 'SILENT' or timestamp(c['ts']) < boundaries[0][2]:
        continue
    release = [b[1] for b in boundaries if b[2] <= timestamp(c['ts'])][-1]
    group = 'V6-Jev' if release in ['V6-R405', 'V6-R407'] else 'V6-brain'
    selected[rid] = (group, release)
assert len(v5) == 20
assert 'MWMR855QHTWR' not in selected
pattern = re.compile(rb'"run_id"\s*:\s*"(?:' + b'|'.join(r.encode() for r in selected) + rb')"')
data = {rid: {'run_id': rid, 'group': group, 'release': rel,
              'start': configs[rid][0]['ts'], 'config_card': configs[rid][0].get('v6', {}).get('deciders', {}).get('card'),
              'config_commit': configs[rid][0].get('code', {}).get('commit'),
              'config_git_error': bool(configs[rid][0].get('code', {}).get('error')),
              'ascension': configs[rid][0].get('ascension'),
              'terminal': ends.get(rid, [None])[0], 'decisions': [], 'brain': [],
              'calls': [], 'v6': [], 'sl': [], 'console': [], 'console_counts': {}}
        for rid, (group, rel) in selected.items()}


def project(d, keys):
    return {k: d.get(k) for k in keys}


for name, kind, keys in [
    ('decisions.jsonl', 'decisions', ['ts', 'observed_ts', 'floor', 'turn', 'label', 'decision_id', 'decider',
     'fallback', 'no_jev', 'reused_answer', 'latency_ms', 'sl_attempt', 'chosen', 'result', 'time_budget']),
    ('brain.jsonl', 'brain', ['ts', 'label', 'engine', 'question_id', 'latency_ms', 'accepted', 'problems', 'attempts', 'reasks']),
    ('codex-calls.jsonl', 'calls', ['ts', 'question_id', 'label', 'attempt', 'ms', 'call_ms', 'outcome', 'exit', 'errors', 'retries']),
    ('v6-build.jsonl', 'v6', ['ts', 'question_id', 'kind', 'fallback', 'elapsed_ms', 'cache', 'degradation', 'unknown', 'triggers', 'merged_triggers', 'skipped_triggers']),
    ('sl-attempts.jsonl', 'sl', ['ts', 'floor', 'encounter', 'fight_kind', 'attempt', 'result', 'end_hp', 'reload']),
]:
    for offset, row in rows(name, pattern):
        rid = row.get('run_id')
        if rid not in data:
            continue
        item = project(row, keys)
        item['offset'] = offset
        if kind == 'decisions':
            item['chosen'] = project(row.get('chosen') or {}, ['action', 'option_index'])
            item['time_budget'] = project(row.get('time_budget') or {}, ['kind', 'actual_ms', 'timed_out', 'fallback'])
            item['result_kind'] = (str(row.get('result') or '').split(':')[0])[:70]
            item['action_error'] = any(x in str(row.get('result') or '').lower() for x in ['failed', 'error', 'timed out', 'timeout'])
            del item['result']
        if kind == 'calls':
            # Never publish stderr, auth metadata, endpoints, or free-form error text.
            item['error_count'] = len(item.pop('errors') or [])
            item['retry_count'] = len(item.pop('retries') or [])
        if kind == 'brain':
            item['problem_count'] = len(item.pop('problems') or [])
        if kind == 'sl':
            item['reload'] = bool((row.get('reload') or {}).get('ok'))
        data[rid][kind].append(item)
    print(name, 'read', flush=True)

console_patterns = {
    'boss_nonpositive_hp': r'build-sim worker: Error:.*nonpositive-hp',
    'boss_sim_failed': r'boss sim.*(?:failed|error)|boss-sim.*(?:failed|error)|build-sim worker:\s*Error:',
    'codex_failed': r'Codex failed on',
    'action_failed': r'note action .* failed',
    'mod_timeout': r'(?:cannot reach|request timed out)',
    'loop_error': r'^(?:\d\d:\d\d:\d\d )?(?:error|ERROR)\b',
}
compiled = {k: re.compile(p, re.I) for k, p in console_patterns.items()}
unassigned = []
for name, size in manifest['console'].items():
    raw = (LOG / 'console' / name).open('rb').read(size)
    matched_runs = set(re.findall(rb'note run ([A-Z0-9]+) \(F', raw))
    targets = [rid for rid in data if rid.encode() in matched_runs]
    if len(targets) != 1:
        # SL-only restart logs lack a note-run line; use the unique literal run ID.
        targets = [rid for rid in data if rid.encode() in raw]
    if len(targets) != 1:
        unassigned.append({'file': name, 'bytes': size, 'sha256': hashlib.sha256(raw).hexdigest()})
        continue
    rid = targets[0]
    digest = hashlib.sha256(raw).hexdigest()
    data[rid]['console'].append({'file': name, 'bytes': size, 'sha256': digest})
    counts = collections.Counter(data[rid]['console_counts'])
    for lineno, b in enumerate(raw.splitlines(), 1):
        line = b.decode(errors='replace')
        for category, regex in compiled.items():
            if regex.search(line):
                counts[category] += 1
                evidence.append({'run_id': rid, 'file': 'console/' + name, 'line': lineno,
                                 'category': category, 'line_sha256': hashlib.sha256(b).hexdigest()})
    data[rid]['console_counts'] = dict(counts)
manifest['release_boundaries'] = [{'local': b[0], 'release': b[1]} for b in boundaries]
manifest['console_unassigned'] = unassigned
dump(MANIFEST, manifest)
(OUT / 'projected-evidence.json.gz').write_bytes(gzip.compress(
    (json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n').encode(), mtime=0))
dump(OUT / 'console-error-locations.json', evidence)
print('Selected', len(data), 'runs; frozen at', manifest['cut_utc'])

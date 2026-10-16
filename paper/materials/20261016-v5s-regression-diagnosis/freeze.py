#!/usr/bin/env python3
"""Freeze logged cohort identities and complete source prefixes; never simulate or contact a model."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import sys

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]
sys.path.insert(0, str(ROOT / 'eval'))
import brain_source


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def bound(path):
    stat = path.stat()
    with path.open('rb') as stream:
        head = stream.readline()
        start = max(0, stat.st_size - 65536)
        stream.seek(start)
        tail = stream.read(stat.st_size - start)
    return {'path': str(path.relative_to(ROOT)), 'complete_prefix_bytes': start + tail.rfind(b'\n') + 1,
            'size_at_freeze': stat.st_size, 'inode': stat.st_ino, 'first_line_sha256': digest(head)}


def rows(path, limit):
    with path.open('rb') as stream:
        while stream.tell() < limit:
            off = stream.tell()
            raw = stream.readline()
            if off + len(raw) > limit:
                break
            try:
                row = json.loads(raw)
            except ValueError:
                continue
            row['_source'] = {'path': str(path.relative_to(ROOT)), 'off': off, 'len': len(raw), 'sha256': digest(raw)}
            yield row


def main():
    target = BASE / 'freeze.json'
    assert not target.exists(), 'Preserve the original cut; use existing freeze.json for reproduction.'
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    sources = {name: bound(ROOT / 'logs' / f'{name}.jsonl') for name in
               ('runs', 'run-config', 'brain', 'decisions', 'states', 'sl-attempts', 'run-plans')}
    records = list(rows(ROOT / 'logs/runs.jsonl', sources['runs']['complete_prefix_bytes']))
    finished = {r['run_id']: r for r in records if str(r.get('character', '')).lower() == 'silent' and r.get('ascension') == 10}
    configs = {}
    for row in rows(ROOT / 'logs/run-config.jsonl', sources['run-config']['complete_prefix_bytes']):
        if row.get('run_id') in finished:
            configs.setdefault(row['run_id'], []).append(row)
    for cs in configs.values():
        cs.sort(key=lambda c: c['ts'])
    ordered = sorted(finished, key=lambda rid: configs.get(rid, [{}])[0].get('ts') or finished[rid]['ended'])
    exposed = [rid for rid in ordered if configs.get(rid) and
               configs[rid][0].get('loop', {}).get('s_readiness') == 'on' and
               configs[rid][0].get('loop', {}).get('s_combat_rank') == 'on']
    assert exposed, 'Actual on/on configurations required.'
    boundary = ordered.index(exposed[0])
    pre = ordered[max(0, boundary - 25):boundary]
    post = ordered[boundary:]
    source = brain_source.load_sources(ROOT / 'logs', pre + post, limit=sources['brain']['complete_prefix_bytes'])
    data = []
    for group, ids in [('pre', pre), ('post', post)]:
        for rid in ids:
            r = finished[rid]
            cs = configs.get(rid, [])
            data.append({'cohort': group, 'run_id': rid, 'finished': r, 'configurations': cs,
                         'started': cs[0]['ts'] if cs else None, 'brain_source': source[rid]})
    value = {'at': now, 'schema': 'v5s-regression-frozen-cohorts-v1', 'parent': 'roy-20261016-global-build',
             'owner_session': '01a13dcd-83d4-7c63-b233-f93cf878ecf4', 'scope': 'Offline system-health description; no gameplay mechanism inferred or online changes',
             'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
             'sources': sources, 'boundary_first_on_on_run': exposed[0], 'cohort_definition':
             'Finished Silent A10 runs ordered by actual first process config start; last25 before first logged P1on/P3on process vs all finished processes since. Raw and engine-qualified sensitivity both retained; mixed accounts are separate from engine cohort.',
             'pre_runs': pre, 'post_runs': post, 'runs': data, 'external_claim':
             {'pre_runs': 25, 'pre_victories': 3, 'pre_boss_won': 43, 'pre_boss_total': 51,
              'post_runs': 24, 'post_victories': 0, 'post_boss_won': 33, 'post_boss_total': 46, 'post_final_boss_won': 0, 'post_final_boss_total': 5}}
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    (BASE / 'versions.original.json').write_bytes((ROOT / 'eval/versions.json').read_bytes())
    (BASE / 'logdb-manifest.original.json').write_bytes((ROOT / 'data/logdb/manifest.json').read_bytes())
    print(json.dumps({'cutoff': now, 'pre': len(pre), 'post': len(post), 'pre_wins': sum(finished[r]['victory'] for r in pre),
                      'post_wins': sum(finished[r]['victory'] for r in post), 'first_on_run': exposed[0],
                      'post_non_codex': [(r, source[r]['source']) for r in post if not source[r]['eligible']]}, ensure_ascii=False))


if __name__ == '__main__':
    main()

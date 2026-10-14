import collections
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).parent


def write(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def git(*args, cwd=ROOT):
    return subprocess.run(['git', '-C', str(cwd), *args], capture_output=True, text=True, check=True).stdout.strip()


def locate(handle, stamp):
    handle.seek(0, 2)
    lo, hi = 0, handle.tell()
    while hi - lo > 131072:
        mid = (lo + hi) // 2
        handle.seek(mid)
        handle.readline()
        raw = handle.readline()
        if json.loads(raw)['ts'] < stamp:
            lo = handle.tell()
        else:
            hi = mid
    handle.seek(lo)
    while True:
        pos = handle.tell()
        raw = handle.readline()
        row = json.loads(raw)
        if row['ts'] >= stamp:
            assert row['ts'] == stamp
            return pos, raw, row


refs = json.loads((OUT / 'source-references.json').read_text())
by_source = collections.defaultdict(dict)
for ref in refs:
    by_source[ref['source']][ref['offset']] = ref
counts = {}
for name, entries in by_source.items():
    with (ROOT / 'logs' / (name + '.jsonl')).open('rb') as handle:
        for offset, ref in entries.items():
            handle.seek(offset)
            raw = handle.read(ref['bytes'])
            assert hashlib.sha256(raw).hexdigest() == ref['sha256']
            assert json.loads(raw)['ts'] == ref['ts']
    counts[name] = len(entries)
write('raw-readback-verification.json', {'unique_source_rows': counts, 'all_sha256_match': True})

cases = json.loads((ROOT / '.worktrees/exp/learner/runs/20261008-004303-experience-update/lamp-history.json').read_text())['cases']
observed = []
with (ROOT / 'logs/states.jsonl').open('rb') as handle:
    for case in cases:
        assert case['run'] in ['NHA2KW0RB7VP', 'K3676LU8B0UH', 'SADL3CGYTGSR']
        pos, raw, before_row = locate(handle, case['ts'])
        handle.seek(pos + len(raw))
        after_pos = handle.tell()
        after_raw = handle.readline()
        after_row = json.loads(after_raw)
        b, a = before_row['state'], after_row['state']
        assert b['run_id'] == a['run_id'] == case['run']
        assert b['run']['character_id'].lower() == a['run']['character_id'].lower() == 'silent'
        bp = next(e for e in b['combat']['enemies'] if e['enemy_id'] ==
                  a['combat']['enemies'][0]['enemy_id']) if len(b['combat']['enemies']) == 1 else None
        changes = []
        for enemy in b['combat']['enemies']:
            later = next((e for e in a['combat']['enemies'] if e['index'] == enemy['index']), None)
            if later is None:
                continue
            before = {p['power_id']: p.get('amount') for p in enemy['powers']}
            after = {p['power_id']: p.get('amount') for p in later['powers']}
            if before != after:
                changes.append({'target': enemy['enemy_id'], 'before': before, 'after': after})
        matching = [c for c in changes if c['before'] == case['before'] and c['after'] == case['after']]
        assert matching, (case, changes)
        observed.append({'run': case['run'], 'asc': case['asc'], 'floor': case['floor'], 'turn': case['turn'],
                         'attempt': case['attempt'], 'card': case['card'], 'base': case['base'],
                         'actual': case['actual'], 'target_changes': matching,
                         'before_source': {'offset': pos, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()},
                         'after_source': {'offset': after_pos, 'bytes': len(after_raw), 'sha256': hashlib.sha256(after_raw).hexdigest()}})
write('lamp-window-verification.json', observed)

live = ROOT / '.worktrees/live'
live_head = git('rev-parse', 'HEAD', cwd=live)
base = git('rev-parse', 'HEAD', cwd=OUT.parents[2])
known = {
    'cunning_generation_and_capacity': ('6403fdcdadc803a092beb5165a068e22bf51c412', ['agent/src/reflex/card-model.ts', 'agent/src/reflex/turn-solver.ts', 'agent/src/reflex/combat-plan.ts', 'agent/tests/silent-cunning.test.ts']),
    'ordinary_strangle': ('5c7105ff0294466da8319f2934beda05c6040794', ['agent/src/reflex/card-model.ts', 'agent/src/reflex/turn-solver.ts', 'agent/tests/silent-strangle.test.ts']),
    'royal_poison_opening': ('e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a', ['agent/src/sim/silent-opening.ts', 'agent/src/sim/boss-start.ts', 'agent/tests/silent-opening.test.ts']),
    'sl_current_turn_resource_comparison': ('5604982e13890e0e2bc8bf8246272e8267321c0b', ['agent/src/reflex/silent-sl-resource-comparison.ts', 'agent/src/reflex/combat-plan.ts']),
    'sl_candidate_forecast_comparison': ('c769739b97389fdc978b6515b83a38e3cd900f67', ['agent/src/reflex/silent-sl-comparison.ts', 'agent/src/reflex/combat-plan.ts']),
    'precise_cut_five_six_hand': ('8b9bacbebb20eaaa1133a9945da6c7abfcda745d', ['agent/src/reflex/card-model.ts', 'agent/src/reflex/turn-solver.ts', 'agent/tests/silent-precise-cut.test.ts']),
    'crusher_facing': ('ec29ea34b919344b707e57ba472ea210f9c39d62', ['agent/src/reflex/combat-plan.ts', 'agent/tests/silent-crusher-facing.test.ts']),
}
sources = []
paths = set()
for scope, (commit, files) in known.items():
    assert subprocess.run(['git', '-C', str(live), 'merge-base', '--is-ancestor', commit, live_head],
                          capture_output=True).returncode == 0, (scope, commit)
    changed = git('show', '--format=', '--name-only', commit).splitlines()
    assert any(f in changed for f in files), (scope, commit, changed)
    blobs = {f: {'source': git('rev-parse', commit + ':' + f),
                 'base': git('rev-parse', base + ':' + f),
                 'live': git('rev-parse', live_head + ':' + f)} for f in files}
    sources.append({'scope': scope, 'commit': commit, 'live_ancestor': True, 'blobs': blobs,
                    'limitation': '仅核实既有源码子项，不关闭派发的宽提案，也不替代消费者/整战验收。'})
    paths.update(files)
diff = git('diff', base, live_head, '--', *sorted(paths))
(OUT / 'base-live-source-diff.patch').write_text(diff + '\n')
write('live-source-verification.json', {'base': base, 'live_head': live_head, 'sources': sources,
                                       'source_diff': str(OUT / 'base-live-source-diff.patch')})
print(json.dumps({'raw_rows': counts, 'lamp_windows': len(observed), 'live_sources': len(sources),
                  'live_head': live_head, 'base': base}, ensure_ascii=False))

"""Verify the fixed source/publication trees without reading credentials or mutable data."""
import hashlib
import json
from pathlib import Path
import subprocess

SCRATCH = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
WORK = ROOT / '.worktrees/silent-boss-calibration'


def git(*args, cwd=LIVE):
    return subprocess.check_output(['git', *args], cwd=cwd)


def tree(commit):
    result = {}
    for row in git('ls-tree', '-r', '-z', commit).split(b'\0'):
        if row:
            metadata, path = row.split(b'\t', 1)
            result[path.decode()] = metadata.decode()
    return result


def sha(data):
    return hashlib.sha256(data).hexdigest()


state = json.loads((SCRATCH / 'live-release-state.json').read_text())
request = json.loads((SCRATCH / 'release-request.json').read_text())
assert state['sandbox_exit'] == 0 and state['publication']
source, before, merged, published = [tree(state[k]) for k in ('source', 'before_code', 'merged', 'publication')]
allowed = set(state['paths'])
assert {p for p in set(before) | set(merged) if before.get(p) != merged.get(p)} == allowed
assert all(merged[p] == source[p] == published[p] for p in allowed)
assert {p for p in set(merged) | set(published) if merged.get(p) != published.get(p)} == {'eval/versions.json', 'paper/materials/decision-log.md'}
assert git('rev-parse', state['merged'] + '^{tree}').decode().strip() == state['tested_tree']
assert git('rev-parse', state['publication'] + '^{tree}').decode().strip() == state['publication_tree']
parents = git('rev-list', '--parents', '-n', '1', state['merged']).decode().split()
assert parents == [state['merged'], state['before_code'], state['source']]
for commit in [state['source'], '4b82145428abb718c39d7bf76fbbb28bccd8a8d5', 'cdf75af64fb5b118a5a808ecb3b05e2a05991c36']:
    git('merge-base', '--is-ancestor', commit, state['publication'])

archive = 'experiments/boss-sim/silent/' + request['artifact'] + '/'
manifest = json.loads(git('show', state['source'] + ':' + archive + 'audit-manifest.json'))
for filename, expected in manifest.items():
    assert sha(git('show', state['publication'] + ':' + archive + filename)) == expected, filename
completed = json.loads(git('show', state['source'] + ':' + archive + 'completed.json'))
for filename, expected in completed['files_sha256'].items():
    assert sha(git('show', state['publication'] + ':' + archive + filename)) == expected, filename
assert completed['artifact'] == request['artifact']
assert sha(git('show', state['publication'] + ':knowledge/characters/silent/boss-trust.json')) == completed['trust_sha256']
assert git('show', state['publication'] + ':paper/materials/silent/boss-sim-calibration.md') == git('show', state['publication'] + ':' + archive + 'published-report.md')
assert git('diff', '--name-only', request['baseline'], state['source'], '--', 'agent/src', 'agent/tools', 'knowledge/characters/ironclad') == b''
assert not git('status', '--porcelain', cwd=WORK)

versions = json.loads(git('show', state['publication'] + ':eval/versions.json'))['versions']
matched = [entry for entry in versions if entry['name'] == state['version']]
assert len(matched) == 1 and matched[0]['commit'] == state['merged']
note_key = state['publication']
notification_counts = {}
for filename in ['notes/for-roy.md', 'ops/inbox-dev.md']:
    notification_counts[filename] = (ROOT / filename).read_text().count(note_key)
    assert notification_counts[filename] >= 1
summary = {'source': state['source'], 'merged': state['merged'], 'publication': state['publication'],
           'publication_tree': state['publication_tree'], 'version': state['version'],
           'task_paths': len(allowed), 'audit_files': len(manifest), 'completed_files': len(completed['files_sha256']),
           'all_parallel_live_blobs_preserved': True, 'other_character_data_unchanged': True,
           'real_source_ancestor': True, 'source_worktree_clean': True, 'notifications': notification_counts}
(SCRATCH / 'publication-integrity.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1) + '\n')
print(json.dumps(summary, ensure_ascii=False))

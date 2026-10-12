"""Read-only reconciliation of immutable tested/released trees and actual main integration."""
import datetime as dt
import json
from pathlib import Path
import subprocess

P = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
OWN = ROOT / '.worktrees/codex-only-brain'
LIVE = ROOT / '.worktrees/live'
d = json.loads((P / 'deployment.json').read_text())


def git(*args, cwd=OWN):
    return subprocess.check_output(['git', *args], cwd=cwd, text=True).strip()


def ancestor(a, b):
    return subprocess.run(['git', 'merge-base', '--is-ancestor', a, b], cwd=OWN).returncode == 0


assert not git('status', '--porcelain')
assert d['main_sync_phase'] == 'complete'
assert d['status'] == 'released_ops_verification_pending'
assert all(test['rc'] == 0 for test in d['tests'].values())
for key, tree_key in [('fixed_check_commit', 'fixed_check_tree'), ('actual_merge', 'merged_tree'), ('release_commit', 'release_tree'), ('main_synced', 'main_tree')]:
    assert git('rev-parse', d[key] + '^{tree}') == d[tree_key]
assert ancestor(d['integration_source'], d['actual_merge'])
assert ancestor(d['refresh_commit'], d['release_commit'])
assert ancestor(d['release_commit'], git('rev-parse', 'HEAD', cwd=LIVE))
assert ancestor(d['main_synced'], git('rev-parse', 'HEAD', cwd=ROOT))
paths = d['main_feature_paths_identical']
assert len(paths) == 54
for name in paths:
    blobs = {git('rev-parse', ref + ':' + name) for ref in [d['actual_merge'], d['release_commit'], d['main_publication_source'], d['main_synced']]}
    assert len(blobs) == 1, name
for ref in [d['release_commit'], d['main_synced']]:
    versions = json.loads(git('show', ref + ':eval/versions.json'))
    assert [v for v in versions['versions'] if v['name'] == d['version']] == [d['release_entry']]
    log = git('show', ref + ':paper/materials/decision-log.md')
    assert log.count(d['decision_log_line'].strip()) == 1
assert git('show', d['main_synced'] + ':paper/materials/decision-log.md').count(d['main_sync_registration_line'].strip()) == 1
before_tree = git('rev-parse', d['before_code'] + ':knowledge')
assert before_tree == git('rev-parse', d['actual_merge'] + ':knowledge')
# Original live refresh blobs remain archived despite subsequent runtime refreshes.
saved_refresh = {name: git('rev-parse', d['refresh_commit'] + ':' + name) for name in d['refresh_confirmation']['paths']}
data = {
    'verified_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'checks': 'passed',
    'immutable_refs': {name: d[name] for name in ['integration_source', 'refresh_commit', 'actual_merge', 'fixed_check_tree', 'release_commit', 'release_tree', 'main_publication_source', 'main_feature_source_sync_commit', 'main_synced', 'main_tree']},
    'feature_blobs_identical_across_tested_release_main': len(paths),
    'original_source_direct_live_ancestor': ancestor(d['original_source'], d['actual_merge']),
    'final_curated_source_live_ancestor': True, 'unique_version': d['version'],
    'knowledge_tree_unchanged_by_feature_merge': before_tree,
    'saved_live_refresh_blobs': saved_refresh,
    'owner_worktree_clean': True,
    'observed_live_head': git('rev-parse', 'HEAD', cwd=LIVE),
    'observed_live_dirty_paths_retained': git('status', '--porcelain', cwd=LIVE).splitlines(),
    'observed_main_head': git('rev-parse', 'HEAD', cwd=ROOT),
    'observed_main_dirty_paths_retained': git('status', '--porcelain', cwd=ROOT).splitlines(),
    'shipped': False, 'full_external_checks': 'pending', 'real_llm_or_play_executed': False,
}
(P / 'final-verification.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'checks': data['checks'], 'feature_blobs': len(paths), 'live': data['observed_live_head'], 'main': data['observed_main_head']}))

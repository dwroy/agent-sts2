"""Resolve the records-only main race while preserving all other owners' work."""
import fcntl
import json
from pathlib import Path
import subprocess

P = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
OWN = ROOT / '.worktrees/codex-only-brain'
STATE = json.loads((P / 'deployment.json').read_text())
COAUTHOR = 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'


def run(*args, cwd=OWN, check=True):
    result = subprocess.run(args, cwd=cwd, text=True, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(f'{args[:3]} rc={result.returncode}: {result.stdout[-1200:]} {result.stderr[-1200:]}')
    return result


def git(*args, cwd=OWN):
    return run('git', *args, cwd=cwd).stdout.strip()


def save():
    (P / 'deployment.json').write_text(json.dumps(STATE, ensure_ascii=False, indent=2) + '\n')


with (ROOT / 'ops/live-merge.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    pending_merge = run('git', 'rev-parse', '--verify', 'MERGE_HEAD', check=False).returncode == 0
    if not pending_merge:
        assert not git('status', '--porcelain'), 'owner worktree dirty'
    assert not git('diff', '--cached', '--name-only', cwd=ROOT), 'other owner has staged root work'
    original_candidate = git('rev-parse', 'HEAD')
    assert original_candidate == STATE['main_records_source']
    root_before = STATE['main_records_race']['advanced_root'] if pending_merge else git('rev-parse', 'HEAD', cwd=ROOT)
    advanced = git('diff', '--name-only', STATE['main_before'], root_before).splitlines()
    assert all(name.startswith(('notes/', 'paper/')) for name in advanced), 'root advanced code needs separate verification'
    STATE['main_records_race'] = {'candidate': original_candidate, 'advanced_root': root_before, 'advanced_paths': advanced}
    save()
    if not pending_merge:
        result = run('git', 'merge', '--no-ff', '--no-commit', root_before, check=False)
        (P / 'main-records-merge.log').write_text(result.stdout + result.stderr)
        conflicts = git('diff', '--name-only', '--diff-filter=U').splitlines()
        assert conflicts == ['paper/materials/decision-log.md'], conflicts
        # The root has every pre-existing record plus its new append-only entries.
        root_log = run('git', 'show', f'{root_before}:paper/materials/decision-log.md').stdout
        assert STATE['decision_log_line'].strip() not in root_log
        STATE['main_conflict_resolution_date'] = run('date', '+%Y-%m-%d %H:%M').stdout.strip()
        (OWN / 'paper/materials/decision-log.md').write_text(root_log.rstrip('\n') + '\n\n' + STATE['decision_log_line'])
        run('git', 'add', '--', 'paper/materials/decision-log.md')
    # Previously committed CSV/transcript whitespace belongs to the other owner.
    # Check our outgoing delta, preserving those exact archived bytes.
    all_whitespace = run('git', 'diff', '--cached', '--check', check=False)
    (P / 'main-records-inherited-whitespace.log').write_text(all_whitespace.stdout + all_whitespace.stderr)
    STATE['inherited_records_whitespace_check'] = {'rc': all_whitespace.returncode, 'task_delta_check': 0,
        'log': 'main-records-inherited-whitespace.log', 'foreign_committed_bytes_unchanged': True}
    run('git', 'diff', '--cached', root_before, '--check')
    task_paths = set(git('diff-tree', '--no-commit-id', '--name-only', '-r', STATE['original_source']).splitlines())
    task_paths.add('agent/tools/test-sandbox.sh')
    # This merge adds records/data only; the tested candidate's executable blobs are unchanged.
    for name in task_paths:
        assert git('rev-parse', ':' + name) == git('rev-parse', original_candidate + ':' + name), name
    delta = subprocess.check_output(['git', 'diff', '--cached', '--binary'], cwd=OWN)
    leak = subprocess.run(['gitleaks', 'stdin', '--redact'], input=delta, capture_output=True)
    (P / 'gitleaks-main-records-merge.log').write_bytes(leak.stdout + leak.stderr)
    assert leak.returncode == 0, 'gitleaks rejected the records merge'
    run('git', 'commit', '-m', 'Preserve concurrent operations records during Codex-only publication sync\n\n' + COAUTHOR)
    final_candidate = git('rev-parse', 'HEAD')
    STATE['main_publication_source'] = original_candidate
    STATE['main_records_source'] = final_candidate
    assert git('rev-parse', 'HEAD', cwd=ROOT) == root_before, 'root advanced again; preserve candidate and retry integration'
    incoming = set(git('diff', '--name-only', root_before, final_candidate).splitlines())
    dirty_before = git('status', '--porcelain', cwd=ROOT)
    dirty_paths = set(git('diff', '--name-only', cwd=ROOT).splitlines())
    assert not incoming.intersection(dirty_paths), 'root runtime work overlaps task metadata'
    preflight = run('git', 'merge-tree', '--write-tree', root_before, final_candidate, cwd=ROOT, check=False)
    (P / 'preflight-main-resolved.txt').write_text(preflight.stdout + preflight.stderr)
    assert preflight.returncode == 0
    run('git', 'merge', '--ff-only', final_candidate, cwd=ROOT)
    STATE['main_synced'] = git('rev-parse', 'HEAD', cwd=ROOT)
    STATE['main_tree'] = git('rev-parse', 'HEAD^{tree}', cwd=ROOT)
    STATE['main_sync_phase'] = 'complete'
    STATE['main_dirty_status_before_records_sync'] = dirty_before.splitlines()
    STATE['main_dirty_status_after_records_sync'] = git('status', '--porcelain', cwd=ROOT).splitlines()
    STATE['main_runtime_dirty_paths_after'] = git('diff', '--name-only', cwd=ROOT).splitlines()
    STATE['main_feature_paths_identical'] = []
    STATE['main_feature_paths_with_other_changes'] = []
    for name in sorted(task_paths):
        key = 'main_feature_paths_identical' if git('rev-parse', f"{STATE['main_synced']}:{name}", cwd=ROOT) == git('rev-parse', f"{STATE['release_commit']}:{name}", cwd=ROOT) else 'main_feature_paths_with_other_changes'
        STATE[key].append(name)
    assert len(STATE['main_feature_paths_identical']) == 54
    assert not STATE['main_feature_paths_with_other_changes']
    STATE['main_sync_failure_history'] = 'deployment-main-fast-forward-blocked.json'
    STATE.pop('main_sync_blocked', None)
    STATE['main_runtime_activation']['latest_wait_guard_and_worker_profile_pending_publication_sync'] = False
    save()
print(json.dumps({'main_synced': STATE['main_synced'], 'feature_files_identical': 54, 'source_retest_required': False}))

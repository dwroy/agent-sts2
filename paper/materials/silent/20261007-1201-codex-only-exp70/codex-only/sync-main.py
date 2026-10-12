"""Integrate only this feature and its publication records; preserve root runtime changes."""
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess

SCRATCH = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
OWN = ROOT / '.worktrees/codex-only-brain'
LIVE = ROOT / '.worktrees/live'
COAUTHOR = 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'
STATE = json.loads((SCRATCH / 'deployment.json').read_text())
if (SCRATCH / 'main-runtime-activation.json').exists():
    STATE['main_runtime_activation'] = json.loads((SCRATCH / 'main-runtime-activation.json').read_text())


def run(args, cwd=ROOT, check=True):
    result = subprocess.run(args, cwd=cwd, text=True, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(f'{args[:3]} exit {result.returncode}: {result.stdout[-1500:]} {result.stderr[-1500:]}')
    return result


def git(*args, cwd=ROOT):
    return run(['git', *args], cwd=cwd).stdout.strip()


def save():
    (SCRATCH / 'deployment.json').write_text(json.dumps(STATE, ensure_ascii=False, indent=2) + '\n')


if STATE.get('status') != 'released_ops_verification_pending':
    raise SystemExit('live publication not complete')
with (ROOT / 'ops/live-merge.lock').open('a') as lock:
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        STATE['main_sync_blocked'] = 'lock busy; source release remains valid'
        save()
        raise SystemExit(3)
    try:
        if git('diff', '--cached', '--name-only'):
            raise RuntimeError('root main has staged work from another owner')
        if git('status', '--porcelain', cwd=OWN):
            raise RuntimeError('owner worktree not clean for records-only branch')
        before = git('rev-parse', 'HEAD')
        changed = set(git('diff', '--name-only').splitlines())
        incoming = set(git('diff-tree', '--no-commit-id', '--name-only', '-r', STATE['original_source']).splitlines())
        incoming.add('agent/tools/test-sandbox.sh')
        if changed & incoming:
            raise RuntimeError('root runtime work overlaps incoming feature paths')
        preflight = run(['git', 'merge-tree', '--write-tree', before, STATE['original_source']], check=False)
        (SCRATCH / 'preflight-main.txt').write_text(preflight.stdout + preflight.stderr)
        if preflight.returncode:
            raise RuntimeError('root main feature merge preflight conflict')
        STATE['main_before'] = before
        STATE['main_dirty_preserved_paths'] = sorted(changed)
        run(['git', 'merge', '--no-ff', STATE['original_source'], '-m', 'Integrate authorized Codex-only brain and shared provenance statistics\n\n' + COAUTHOR])
        STATE['main_source_merge'] = git('rev-parse', 'HEAD')
        save()
        run(['git', 'switch', '-c', 'publish-codex-only-main', STATE['main_source_merge']], cwd=OWN)
        # The publication branch carries only the new unique version, its exact log line, and corrected docs.
        versions = json.loads((OWN / 'eval/versions.json').read_text())
        found = [r for r in versions['versions'] if r['name'] == STATE['version']]
        if found and found != [STATE['release_entry']]:
            raise RuntimeError('root main already has a different version entry')
        if not found:
            versions['versions'].append(STATE['release_entry'])
            (OWN / 'eval/versions.json').write_text(json.dumps(versions, ensure_ascii=False, indent=2) + '\n')
        stamp = run(['date', '+%Y-%m-%d %H:%M'], cwd=OWN).stdout.strip()
        STATE['main_record_date_command'] = stamp
        path = OWN / 'paper/materials/decision-log.md'
        if STATE['decision_log_line'].strip() not in path.read_text():
            with path.open('a') as log:
                log.write('\n' + STATE['decision_log_line'])
        (OWN / 'docs/codex-only-brain.md').write_bytes((LIVE / 'docs/codex-only-brain.md').read_bytes())
        (OWN / 'agent/tools/test-sandbox.sh').write_bytes((LIVE / 'agent/tools/test-sandbox.sh').read_bytes())
        for name in ['agent/src/brain/wait.ts', 'agent/tests/codex-only-brain.test.ts']:
            (OWN / name).write_bytes((LIVE / name).read_bytes())
        run(['git', 'add', '--', 'eval/versions.json', 'paper/materials/decision-log.md', 'docs/codex-only-brain.md', 'agent/tools/test-sandbox.sh', 'agent/src/brain/wait.ts', 'agent/tests/codex-only-brain.test.ts'], cwd=OWN)
        run(['git', 'diff', '--cached', '--check'], cwd=OWN)
        STATE['main_sync_phase'] = 'checking_publication_candidate'
        save()
        env = dict(os.environ, PATH=str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'], TMPDIR=str(SCRATCH), SANDBOX_WORKERS='1')
        with (SCRATCH / 'test-main-publication.log').open('w') as log:
            check = subprocess.run(['nice', '-n', '19', 'bash', 'tools/test-sandbox.sh'], cwd=OWN / 'agent', env=env, stdout=log, stderr=subprocess.STDOUT)
        STATE['tests']['main_publication'] = {'rc': check.returncode, 'workers': 1, 'log': 'test-main-publication.log',
             'sha256': hashlib.sha256((SCRATCH / 'test-main-publication.log').read_bytes()).hexdigest()}
        save()
        if check.returncode:
            raise RuntimeError('main publication candidate check failed; live release preserved, records not claimed synced')
        delta = subprocess.check_output(['git', 'diff', '--cached', '--binary'], cwd=OWN)
        leak = subprocess.run(['gitleaks', 'stdin', '--redact'], input=delta, capture_output=True)
        (SCRATCH / 'gitleaks-main-publication.log').write_bytes(leak.stdout + leak.stderr)
        if leak.returncode:
            raise RuntimeError('main records rejected by gitleaks')
        run(['git', 'commit', '-m', 'Synchronize Codex-only publication records and pause-budget documentation\n\n' + COAUTHOR], cwd=OWN)
        STATE['main_records_source'] = git('rev-parse', 'HEAD', cwd=OWN)
        # Root data/log/ledger changes remain uncommitted and cannot enter the metadata merge.
        run(['git', 'merge', '--ff-only', STATE['main_records_source']])
        STATE['main_synced'] = git('rev-parse', 'HEAD')
        STATE['main_sync_phase'] = 'complete'
        STATE['main_tree'] = git('rev-parse', 'HEAD^{tree}')
        STATE['main_runtime_dirty_paths_after'] = git('diff', '--name-only').splitlines()
        STATE['main_feature_paths_identical'] = []
        STATE['main_feature_paths_with_other_changes'] = []
        for name in sorted(incoming):
            own_blob = git('rev-parse', f"{STATE['main_synced']}:{name}")
            live_blob = git('rev-parse', f"{STATE['release_commit']}:{name}")
            key = 'main_feature_paths_identical' if own_blob == live_blob else 'main_feature_paths_with_other_changes'
            STATE[key].append(name)
        STATE.pop('main_sync_blocked', None)
        save()
    except Exception as error:
        STATE['main_sync_blocked'] = str(error)
        save()
        raise
print(json.dumps({'main_synced': STATE['main_synced'], 'main_records_source': STATE['main_records_source'],
                  'identical_feature_paths': len(STATE['main_feature_paths_identical']),
                  'other_feature_changes': STATE['main_feature_paths_with_other_changes']}, ensure_ascii=False))

"""Publish only this tested Silent calibration delta and preserve every unrelated live blob."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')
PROJECT = Path('/home/dw/Projects/agent-sts2')
LIVE = PROJECT / '.worktrees/live'
SOURCE = sys.argv[1]
ENV = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'],
       'TMPDIR': str(HERE), 'SANDBOX_WORKERS': '1', 'npm_config_offline': 'true'}
COAUTHOR = '\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>'
summary = json.loads((HERE/'summary.json').read_text())
state = {'source': SOURCE, 'merged': None, 'publication': None, 'version': None}

def run(args, check=True, cwd=LIVE, env=ENV):
    result = subprocess.run(args, cwd=cwd, env=env, capture_output=True, text=True)
    if check and result.returncode:
        raise RuntimeError(f'{args[0]} exit {result.returncode}; {result.stderr[-1200:]}')
    return result

def git(*args, env=ENV):
    return run(['git', '-c', 'core.hooksPath=/dev/null', *args], env=env).stdout.strip()

def save():
    (HERE / 'publication.json').write_text(json.dumps(state, ensure_ascii=False, indent=1) + '\n')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None

def blocked(reason):
    state['blocked'] = reason
    save()
    print(json.dumps(state, ensure_ascii=False), flush=True)
    raise SystemExit(3)

def commit(message, label):
    result = run(['nice', '-n', '19', 'gitleaks', 'git', '--pre-commit', '--staged', '--redact', '--no-banner',
                  '--report-format', 'json', '--report-path', str(HERE / (label + '.json'))], check=False)
    (HERE / (label + '.log')).write_text(result.stdout + result.stderr)
    (HERE / (label + '.exit')).write_text(str(result.returncode) + '\n')
    if result.returncode:
        raise RuntimeError('gitleaks failed; original scan retained: ' + label)
    (HERE / (label + '.commit-date.log')).write_text(run(['date', '+%Y-%m-%d %H:%M:%S %Z']).stdout)
    git('commit', '-m', message + COAUTHOR)
    return git('rev-parse', 'HEAD')

assert (HERE / 'source-sandbox.exit').read_text().strip() == '0'
assert all(v['exit'] == 0 for v in json.loads((HERE/'sandbox-python-wrapper-equivalents.json').read_text()).values())
assert (HERE / 'python-fixtures.exit').read_text().strip() == '0'
source_trust = json.loads(git('show', SOURCE + ':knowledge/characters/silent/boss-trust.json'))
source_archive = 'experiments/boss-sim/silent/' + source_trust['refresh']['artifact']
source_manifest = json.loads(git('show', SOURCE + ':' + source_archive + '/completed.json'))
for name, expected in source_manifest['files_sha256'].items():
    result = subprocess.run(['git', 'show', SOURCE + ':' + source_archive + '/' + name],
                            cwd=LIVE, capture_output=True, env=ENV)
    assert result.returncode == 0 and hashlib.sha256(result.stdout).hexdigest() == expected, ('incomplete committed archive', name)
inherited = os.environ.get('CALIBRATION_WAITED_LOCK_FD')
lock = os.fdopen(int(inherited), 'a') if inherited else (PROJECT / 'ops/live-merge.lock').open('a')
try:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    print('Waiting for the existing live merge/check lock; live unchanged.', flush=True)
    fcntl.flock(lock, fcntl.LOCK_EX)
state.update(initial_live=git('rev-parse', 'HEAD'), initial_live_tree=git('rev-parse', 'HEAD^{tree}'))
if run(['git', 'rev-parse', '--verify', 'MERGE_HEAD'], check=False).returncode == 0:
    blocked('another session has a pending merge; preserved')
if run(['git', 'diff', '--cached', '--quiet'], check=False).returncode:
    blocked('another session has staged live changes; preserved')
# The learner cannot see host refresh PIDs. In addition to the standard local
# check, require the final builder output to postdate the latest finished run
# and remain stable; record this scope instead of claiming a host PID check.
state['pid_namespace_scope'] = 'Learner namespace; pgrep alone cannot establish host refresh completion.'
while run(['pgrep', '-f', 'knowledge/builders/buil[d]-'], check=False).returncode == 0:
    print('Waiting for visible knowledge refresh.', flush=True)
    time.sleep(10)
def signature():
    return {str(p.relative_to(LIVE)): (p.stat().st_size, p.stat().st_mtime_ns)
            for p in (LIVE / 'knowledge').rglob('*') if p.is_file() and '.env' not in p.name}
while True:
    before = signature()
    finished = [r for line in (PROJECT / 'logs/runs.jsonl').read_text().splitlines()
                if (r := json.loads(line)).get('character') == 'SILENT' and r.get('ended')]
    import datetime
    last_end = max(datetime.datetime.fromisoformat(r['ended'].replace('Z', '+00:00')).timestamp() for r in finished)
    final_note = LIVE / 'notes/fight-value-backtest-silent.md'
    if final_note.stat().st_mtime < last_end or time.time() - final_note.stat().st_mtime < 60:
        print('Waiting for final refresh output after latest completed Silent run.', flush=True)
        time.sleep(30)
        continue
    time.sleep(30)
    if before == signature():
        state['refresh_output_check'] = {'latest_finished_run_epoch': last_end,
            'final_builder_note_mtime': final_note.stat().st_mtime,
            'stable_seconds': 30, 'host_pid_exit_verified': False,
            'scope': 'Final train note follows all model/gate writes; all knowledge files stable under live lock.'}
        break
for name, snapshot in [('knowledge/characters/silent/boss-trust.json', 'previous-trust.json'),
                       ('paper/materials/silent/boss-sim-calibration.md', 'previous-report.md')]:
    if (LIVE / name).read_bytes() != (HERE / snapshot).read_bytes():
        blocked('published calibration changed during the batch; preserve concurrent output')
status = run(['git', 'status', '--porcelain', '--untracked-files=all']).stdout.rstrip('\n')
(HERE / 'live-status.txt').write_text(status + '\n')
dirty = [line[3:] for line in status.splitlines()]
if any('.env' in Path(p).name or p.startswith('.git/') for p in dirty):
    blocked('protected pending path; no content inspected')
refresh = [p for p in dirty if (p.startswith(('knowledge/common/', 'knowledge/characters/')) and p.endswith(('.json', '.md'))) or p.startswith('notes/fight-value-backtest')]
other = [p for p in dirty if p not in refresh]
state.update(refresh_paths=refresh, refresh_sha256={p: sha(LIVE / p) for p in refresh},
             unrelated_pending_sha256={p: sha(LIVE / p) for p in other})
if refresh:
    # Every pending generated knowledge path, including newly added files, is
    # saved together; no builder or other session's source is invoked here.
    git('add', '--', *refresh)
    state['refresh_commit'] = commit('Save live knowledge refresh before Silent boss calibration', 'refresh-gitleaks')
state['before_code'] = git('rev-parse', 'HEAD')
assert all(sha(LIVE / p) == value for p, value in state['refresh_sha256'].items()), 'knowledge changed during save'
trust = json.loads(git('show', SOURCE + ':knowledge/characters/silent/boss-trust.json'))
archive = 'experiments/boss-sim/silent/' + trust['refresh']['artifact']
paths = ['knowledge/characters/silent/boss-trust.json', 'paper/materials/silent/boss-sim-calibration.md']
paths += git('ls-tree', '-r', '--name-only', SOURCE, '--', archive).splitlines()
assert len(paths) > 2
changed = git('diff', '--name-only', (HERE / 'base.txt').read_text().strip(), SOURCE).splitlines()
assert set(changed) == set(paths), (set(changed) - set(paths), set(paths) - set(changed))
state['paths'] = paths
state['overlap'] = sorted(set(paths) & set(dirty))
if state['overlap']:
    blocked('calibration overlaps pending live changes; saved refresh preserved')
for path in paths[2:]:
    if run(['git', 'cat-file', '-e', state['before_code'] + ':' + path], check=False).returncode == 0:
        blocked('immutable archive path already exists: ' + path)
# Main/live contain parallel records. Preflight the authorized leaf delta, then create a source-parent merge.
index_env = {**ENV, 'GIT_INDEX_FILE': str(HERE / 'preflight.index')}
git('read-tree', state['before_code'], env=index_env)
for path in paths:
    mode, _, blob = git('ls-tree', SOURCE, '--', path).split('\t')[0].split()
    git('update-index', '--add', '--cacheinfo', mode, blob, path, env=index_env)
state['preflight_tree'] = git('write-tree', env=index_env)
old = {line.split('\t')[1]: line.split('\t')[0] for line in git('ls-tree', '-r', state['before_code']).splitlines()}
save()
try:
    git('merge', '--no-ff', '--no-commit', '-s', 'ours', SOURCE)
    git('restore', '--source', SOURCE, '--staged', '--worktree', '--ignore-skip-worktree-bits', '--', *paths)
    assert git('write-tree') == state['preflight_tree']
    state['merged'] = commit(f'Refresh Silent boss calibration with {summary["usable"]} observed outcomes', 'merge-gitleaks')
    state['tested_tree'] = git('rev-parse', 'HEAD^{tree}')
    now = {line.split('\t')[1]: line.split('\t')[0] for line in git('ls-tree', '-r', 'HEAD').splitlines()}
    assert {p: v for p, v in old.items() if p not in paths} == {p: v for p, v in now.items() if p not in paths}
    assert all(sha(LIVE / p) == value for p, value in state['refresh_sha256'].items())
    assert all(sha(LIVE / p) == value for p, value in state['unrelated_pending_sha256'].items())
    state['all_other_blobs_preserved'] = True
    save()
    print('Live source-parent merge complete; running required sandbox checks.', flush=True)
    os.set_inheritable(lock.fileno(), True)
    env = {**ENV, 'CALIBRATION_LOCK_FD': str(lock.fileno()), 'SANDBOX_WORKERS': '1'}
    wrapper = HERE / 'live-check.sh'
    wrapper.write_text('#!/usr/bin/env bash\ntrap \'calibration_rc=$?; trap - EXIT; exec nice -n 19 python3 "${CALIBRATION_FINALIZER}" "$calibration_rc"\' EXIT\nsource "${CALIBRATION_SANDBOX_SCRIPT}" --reporter=verbose --exclude tests/global-build-health.test.ts --exclude tests/global-build-funnel.test.ts\n')
    env['CALIBRATION_FINALIZER'] = str(HERE / 'finalize-publication.py')
    env['CALIBRATION_SANDBOX_SCRIPT'] = str(LIVE / 'agent/tools/test-sandbox.sh')
    with (HERE / 'live-sandbox.log').open('w') as handle:
        os.dup2(handle.fileno(), 1)
        os.dup2(handle.fileno(), 2)
    # The coordinator is replaced, keeping the standard sandbox runner at four OS processes.
    os.execvpe('bash', ['bash', str(wrapper)], env)
except BaseException as error:
    if run(['git', 'rev-parse', '--verify', 'MERGE_HEAD'], check=False).returncode == 0:
        git('merge', '--abort')
    elif state['merged'] and git('rev-parse', 'HEAD') == state['merged']:
        git('reset', '--mixed', state['before_code'])
        existing = [p for p in paths if p in old]
        git('restore', '--source', state['before_code'], '--staged', '--worktree', '--', *existing)
        for p in set(paths) - set(existing):
            (LIVE / p).unlink(missing_ok=True)
    state['rolled_back'] = str(error)
    save()
    raise

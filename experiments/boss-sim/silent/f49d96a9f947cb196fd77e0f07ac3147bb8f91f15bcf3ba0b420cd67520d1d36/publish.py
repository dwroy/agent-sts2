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
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
LIVE = PROJECT / '.worktrees/live'
SOURCE = sys.argv[1]
ENV = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'],
       'TMPDIR': str(HERE), 'SANDBOX_WORKERS': '4', 'npm_config_offline': 'true'}
COAUTHOR = '\n\nCo-Authored-By: OpenAI gpt-6.1-sol <noreply@openai.com>'
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

assert json.loads((HERE / 'source-coverage.json').read_text())['complete']
assert (HERE / 'source-supplement.exit').read_text().strip() == '0'
assert (HERE / 'python-calibration.exit').read_text().strip() == '0'
lock = (PROJECT / 'ops/live-merge.lock').open('a')
try:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    blocked('live merge lock busy; live unchanged')
state.update(initial_live=git('rev-parse', 'HEAD'), initial_live_tree=git('rev-parse', 'HEAD^{tree}'))
if run(['git', 'rev-parse', '--verify', 'MERGE_HEAD'], check=False).returncode == 0:
    blocked('another session has a pending merge; preserved')
if run(['git', 'diff', '--cached', '--quiet'], check=False).returncode:
    blocked('another session has staged live changes; preserved')
while run(['pgrep', '-f', 'knowledge/builders/buil[d]-'], check=False).returncode == 0:
    print('Waiting for knowledge refresh.', flush=True)
    time.sleep(10)
def signature():
    return {str(p.relative_to(LIVE)): (p.stat().st_size, p.stat().st_mtime_ns)
            for p in (LIVE / 'knowledge').rglob('*') if p.is_file() and '.env' not in p.name}
while True:
    before = signature()
    time.sleep(10)
    if before == signature():
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
refresh = [p for p in dirty if p.startswith(('knowledge/', 'notes/fight-value-backtest'))]
other = [p for p in dirty if p not in refresh]
state.update(refresh_paths=refresh, refresh_sha256={p: sha(LIVE / p) for p in refresh},
             unrelated_pending_sha256={p: sha(LIVE / p) for p in other})
if refresh:
    git('add', '--', *refresh)
    state['refresh_commit'] = commit('Save live knowledge refresh before Silent boss calibration', 'refresh-gitleaks')
state['before_code'] = git('rev-parse', 'HEAD')
trust = json.loads(git('show', SOURCE + ':knowledge/characters/silent/boss-trust.json'))
archive = 'experiments/boss-sim/silent/' + trust['refresh']['artifact']
paths = ['knowledge/characters/silent/boss-trust.json', 'paper/materials/silent/boss-sim-calibration.md']
paths += git('ls-tree', '-r', '--name-only', SOURCE, '--', archive).splitlines()
assert len(paths) > 2
changed = git('diff-tree', '--no-commit-id', '--name-only', '-r', SOURCE).splitlines()
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
    git('restore', '--source', SOURCE, '--staged', '--worktree', '--', *paths)
    assert git('write-tree') == state['preflight_tree']
    state['merged'] = commit('Refresh Silent boss calibration with 481 observed outcomes', 'merge-gitleaks')
    state['tested_tree'] = git('rev-parse', 'HEAD^{tree}')
    now = {line.split('\t')[1]: line.split('\t')[0] for line in git('ls-tree', '-r', 'HEAD').splitlines()}
    assert {p: v for p, v in old.items() if p not in paths} == {p: v for p, v in now.items() if p not in paths}
    assert all(sha(LIVE / p) == value for p, value in state['refresh_sha256'].items())
    assert all(sha(LIVE / p) == value for p, value in state['unrelated_pending_sha256'].items())
    state['all_other_blobs_preserved'] = True
    save()
    print('Live source-parent merge complete; running required sandbox checks.', flush=True)
    with (HERE / 'live-sandbox.log').open('w') as handle:
        result = subprocess.run(['nice', '-n', '19', 'bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent',
                                env=ENV, stdout=handle, stderr=subprocess.STDOUT)
    (HERE / 'live-sandbox.exit').write_text(str(result.returncode) + '\n')
    state['sandbox_exit'] = result.returncode
    save()
    assert result.returncode == 0, 'live sandbox failed; original log retained'
    assert git('rev-parse', 'HEAD') == state['merged'], 'live HEAD changed under merge lock'
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
stamp = run(['date', '+%Y-%m-%d %H:%M:%S %Z']).stdout.strip()
ledger = (HERE / 'ledger-id.txt').read_text().strip()
vp = LIVE / 'eval/versions.json'
raw = vp.read_text()
versions = json.loads(raw)
number = max(int(v['name'].split('S1.boss-calibration')[1]) for v in versions['versions']
             if v['name'].startswith('S1.boss-calibration')) + 1
version = f'S1.boss-calibration{number}'
# Formal release_id allocation belongs to ops; the actual behavior commit is ready for its verification.
entry = {'name': version, 'family': 'Silent', 'commit': state['merged'],
         'source': f'{stamp}: Roy授权静默boss校准刷新；21新实际结局，270完局/1193尝试/481可用，固定107调参/374验证；源{SOURCE}；{ledger}；固定模型/Platt/切点不变；paper/materials/silent/boss-sim-calibration.md'}
start = raw.index('"versions"')
decoder = json.JSONDecoder()
array_start = raw.index('[', start)
_, consumed = decoder.raw_decode(raw[array_start:])
array_end = array_start + consumed - 1
updated = raw[:array_end].rstrip() + ',\n    ' + json.dumps(entry, ensure_ascii=False) + '\n  ' + raw[array_end:]
assert json.loads(updated)['versions'] == versions['versions'] + [entry]
assert json.loads(updated)['release_numbering'] == versions['release_numbering']
vp.write_text(updated)
with (LIVE / 'paper/materials/decision-log.md').open('a') as handle:
    handle.write(f'\n- {stamp} Codex学习者 / {HERE.name}：Roy已授权新功能静默boss校准刷新，21新实际结局；270完局/1193尝试/481可用，固定107调参/374验证；B2/B3 Brier{trust["overall"]["t1"]["brier"]}/{trust["overall"]["pre"]["brier"]}、可信{len(trust["trusted_b2"])}/{len(trust["trusted_b3"])}，F49仍低信度。证据局及回合见完整报告/来源，固定模型7e1193cef、整体Platt/切点保持；源{SOURCE}→actual {state["merged"]}/{version}，合后沙箱通过。锁内保存刷新、精确叶子预检、source-parent merge，其他角色/源码/并行记录逐blob保持；{ledger}只proposed，shipped和正式release_id交运维核实际发布，完整外部检查交调度器。\n')
git('add', '--', 'paper/materials/decision-log.md', 'eval/versions.json')
state['publication'] = commit('Register ' + version + ' Silent calibration release', 'publication-gitleaks')
state.update(version=version, publication_tree=git('rev-parse', 'HEAD^{tree}'), date=stamp,
             formal_release_id='pending ops allocation')
save()
print(json.dumps(state, ensure_ascii=False), flush=True)

"""Publish only this authorized calibration delta while preserving concurrent live work."""
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
assert json.loads((HERE / 'tests-summary.json').read_text())['vitest'] == 0
COAUTHOR = '\n\nCo-Authored-By: OpenAI GPT-6 <noreply@openai.com>'
ENV = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'],
       'TMPDIR': str(HERE), 'SANDBOX_WORKERS': '4'}
state = {'source': SOURCE, 'merged': None, 'publication': None, 'version': None}


def run(args, check=True):
    result = subprocess.run(args, cwd=LIVE, env=ENV, capture_output=True, text=True)
    if check and result.returncode:
        raise RuntimeError(f'{args[0]} exit {result.returncode}; {result.stdout[-1000:]} {result.stderr[-1000:]}')
    return result


def git(*args):
    return run(['git', '-c', 'core.hooksPath=/dev/null', *args]).stdout.strip()


def save():
    (HERE / 'live-release-state.json').write_text(json.dumps(state, ensure_ascii=False, indent=1) + '\n')


def blocked(reason, code=3):
    state['blocked'] = reason
    save()
    print(json.dumps(state, ensure_ascii=False), flush=True)
    raise SystemExit(code)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def commit(message, label):
    result = run(['nice', '-n', '19', 'gitleaks', 'git', '--pre-commit', '--staged', '--redact', '--no-banner',
                  '--report-format', 'json', '--report-path', str(HERE / (label + '.json'))], check=False)
    (HERE / (label + '.log')).write_text(result.stdout + result.stderr)
    (HERE / (label + '.exit')).write_text(str(result.returncode) + '\n')
    if result.returncode:
        raise RuntimeError('gitleaks scan needs investigation: ' + label)
    git('commit', '-m', message + COAUTHOR)
    return git('rev-parse', 'HEAD')


lock = (PROJECT / 'ops/live-merge.lock').open('a')
try:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    blocked('live merge lock busy; no live changes')
state['lock_acquired'] = True
state['observed_at'] = run(['date', '+%Y-%m-%d %H:%M:%S %Z']).stdout.strip()
state['initial_live'] = git('rev-parse', 'HEAD')
state['initial_live_tree'] = git('rev-parse', 'HEAD^{tree}')
pending = run(['git', 'rev-parse', '--verify', 'MERGE_HEAD'], check=False)
if pending.returncode == 0:
    state['pending_merge_head'] = pending.stdout.strip()
    state['conflict_paths'] = git('diff', '--name-only', '--diff-filter=U').splitlines()
    blocked('another session has an unfinished live merge; its work is preserved', 4)
while run(['pgrep', '-f', 'knowledge/builders/buil[d]-'], check=False).returncode == 0:
    print('waiting for knowledge builders under live lock', flush=True)
    time.sleep(10)


def signature():
    paths = list((LIVE / 'knowledge').rglob('*.json')) + list((LIVE / 'notes').glob('fight-value-backtest*.md'))
    return {str(p.relative_to(LIVE)): (p.stat().st_size, p.stat().st_mtime_ns) for p in paths}


while True:
    before = signature()
    time.sleep(10)
    if before == signature():
        break
    print('waiting for stable knowledge refresh', flush=True)
if (LIVE / 'knowledge/characters/silent/boss-trust.json').read_bytes() != (HERE / 'previous-live-trust.json').read_bytes():
    blocked('published calibration changed since extraction; preserve it and rebase evidence')
status = run(['git', 'status', '--porcelain', '--untracked-files=all']).stdout.rstrip('\n')
(HERE / 'live-status-premerge.txt').write_text(status + '\n')
dirty = status.splitlines()
refresh = [line[3:] for line in dirty if line[3:].startswith(('knowledge/', 'notes/fight-value-backtest'))]
other = [line for line in dirty if line[3:] not in refresh]
if other:
    state['unrelated_pending_paths'] = other
    blocked('unrelated pending live edits; no edits to another session work')
state['refresh_paths'] = refresh
state['refresh_sha256'] = {p: sha(LIVE / p) for p in refresh}
if refresh:
    git('add', '--', *refresh)
    state['refresh_commit'] = commit('Save live knowledge refresh before Silent boss calibration', 'live-refresh-gitleaks')
state['before_code'] = git('rev-parse', 'HEAD')

# All model and strategy code stays at the current live revision. This batch is data only.
trust = json.loads(git('show', SOURCE + ':knowledge/characters/silent/boss-trust.json'))
archive = 'experiments/boss-sim/silent/' + trust['refresh']['artifact']
paths = ['knowledge/characters/silent/boss-trust.json', 'paper/materials/silent/boss-sim-calibration.md']
paths += git('ls-tree', '-r', '--name-only', SOURCE, '--', archive).splitlines()
closeout = 'paper/materials/silent/20261011-191305-boss-calibration-closeout'
paths += git('ls-tree', '-r', '--name-only', SOURCE, '--', closeout).splitlines()
assert len(paths) > 2
state['paths'] = paths
state['overlap'] = sorted(set(paths) & set(refresh))
if state['overlap']:
    blocked('task data overlaps saved live refresh; preserved refresh must not be replaced')
for p in paths[2:]:
    existing = run(['git', 'cat-file', '-e', state['before_code'] + ':' + p], check=False)
    if existing.returncode == 0 and git('diff', '--name-only', state['before_code'], SOURCE, '--', p):
        blocked('immutable artifact path already exists with different contents: ' + p)
preflight = run(['git', 'merge-tree', '--write-tree', state['before_code'], SOURCE], check=False)
(HERE / 'live-preflight.log').write_text(preflight.stdout + preflight.stderr)
(HERE / 'live-preflight.exit').write_text(str(preflight.returncode) + '\n')
state['preflight_exit'] = preflight.returncode
state['method'] = 'task-only two-parent merge; preserve all current live source and unrelated records'
state['validated_model_only'] = trust['source']['model_sha256']
state['live_model_differences'] = [p for p, expected in trust['source']['input_files'].items()
                                 if sha(Path(p) if Path(p).is_absolute() else LIVE / p) != expected]
before_tree = git('ls-tree', '-r', state['before_code']).splitlines()
save()
try:
    git('merge', '--no-ff', '--no-commit', '-s', 'ours', SOURCE)
    git('restore', '--source', SOURCE, '--staged', '--worktree', '--', *paths)
    state['merged'] = commit('Refresh authorized Silent boss calibration with 419 observed outcomes', 'live-merge-gitleaks')
    state['tested_tree'] = git('rev-parse', 'HEAD^{tree}')
    old = {line.split('\t', 1)[1]: line.split('\t', 1)[0] for line in before_tree}
    now = {line.split('\t', 1)[1]: line.split('\t', 1)[0] for line in git('ls-tree', '-r', 'HEAD').splitlines()}
    assert {p:v for p,v in old.items() if p not in paths} == {p:v for p,v in now.items() if p not in paths}
    assert all(sha(LIVE / p) == value for p, value in state['refresh_sha256'].items())
    state['other_paths_byte_equivalent'] = True
    save()
    with (HERE / 'live-sandbox.log').open('w') as out:
        tested = subprocess.run(['nice', '-n', '19', 'bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent',
                                env=ENV, stdout=out, stderr=subprocess.STDOUT)
    (HERE / 'live-sandbox.exit').write_text(str(tested.returncode) + '\n')
    state['sandbox_exit'] = tested.returncode
    if tested.returncode:
        raise RuntimeError('live sandbox tests failed; retain original log and roll back this merge only')
except BaseException as error:
    if run(['git', 'rev-parse', '--verify', 'MERGE_HEAD'], check=False).returncode == 0:
        git('merge', '--abort')
    elif state.get('merged') and git('rev-parse', 'HEAD') == state['merged']:
        git('reset', '--mixed', state['before_code'])
        existing = [p for p in paths if run(['git', 'cat-file', '-e', state['before_code'] + ':' + p], check=False).returncode == 0]
        git('restore', '--source', state['before_code'], '--staged', '--worktree', '--', *existing)
        for p in set(paths) - set(existing):
            (LIVE / p).unlink(missing_ok=True)
    state['rolled_back'] = str(error)
    save()
    raise

timestamp = run(['date', '+%Y-%m-%d %H:%M:%S %Z']).stdout.strip()
ledger = (HERE / 'ledger-id.txt').read_text().strip()
vp = LIVE / 'eval/versions.json'
raw = vp.read_text()
versions = json.loads(raw)
number = max(int(v['name'].split('S1.boss-calibration')[1]) for v in versions['versions'] if v['name'].startswith('S1.boss-calibration')) + 1
version = f'S1.boss-calibration{number}'
entry = {'name': version, 'family': 'S1', 'commit': state['merged'],
         'source': f'decision-log {timestamp}: Roy授权静默boss固定模型校准刷新；源{SOURCE}；55新实结局、107调参/312验证；{ledger}；paper/materials/silent/boss-sim-calibration.md'}
at = raw.rfind(']')
updated = raw[:at].rstrip() + ',\n    ' + json.dumps(entry, ensure_ascii=False) + '\n  ' + raw[at:]
assert json.loads(updated)['versions'] == versions['versions'] + [entry]
vp.write_text(updated)
with (LIVE / 'paper/materials/decision-log.md').open('a') as out:
    out.write(f'\n- {timestamp} Codex学习者 / {HERE.name}：Roy授权静默boss校准刷新上线；233完局/1040尝试/419可用，较live55新实际结局，107调参/312验证（成功310）、UTC切点/模型/Platt不变；新增NYQW6JAD30K4 A10 F17尝试6 T1–13 died有GAME_OVER/HP0双证。B2/B3 Brier0.1099/0.1086，可信6/6，A10残差+5.0/+5.4百分点；F49数量18但质量不达标、低阶各缺10验证保持。源{SOURCE}→actual {state["merged"]}/{version}；账本{ledger}仅proposed，shipped由运维确认。原源测试失败/补验及合后固定自测回执完整保留，其他live源码/角色/刷新逐blob保持；完整外部检查交调度器，不改变策略阈值。\n')
with (LIVE / 'paper/materials/silent/boss-sim-calibration.md').open('a') as out:
    out.write(f'\n## 实际发布补记\n\n{timestamp}：锁内发布源{SOURCE}，实际数据合入{state["merged"]}，已测树{state["tested_tree"]}，版本{version}。live固定沙箱tsc+vitest退出0；原刷新及其他源码逐blob保留。账本{ledger}仍仅proposed，shipped及完整外部检查交运维/调度器。本条更新前文候选状态；最终发布commit/tree见本批result.json。\n')
git('add', '--', 'paper/materials/decision-log.md', 'eval/versions.json', 'paper/materials/silent/boss-sim-calibration.md')
state['publication'] = commit('Register ' + version + ' Silent calibration release', 'live-publication-gitleaks')
state.update(version=version, publication_tree=git('rev-parse', 'HEAD^{tree}'), date=timestamp)
save()
print(json.dumps(state, ensure_ascii=False), flush=True)

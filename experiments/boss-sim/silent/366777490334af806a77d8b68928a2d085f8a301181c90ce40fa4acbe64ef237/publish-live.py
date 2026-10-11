"""Merge only this tested calibration delta under the live lock, preserving all refreshes."""
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
BASE = 'b526cd11a4e44e8f77d081782491090c22273c1f'
COAUTHOR = '\n\nCo-Authored-By: OpenAI GPT-6 <noreply@openai.com>'
source, ledger = sys.argv[1:3]
env = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'],
       'TMPDIR': str(HERE), 'SANDBOX_WORKERS': '4'}
state = {'source': source, 'base': BASE, 'ledger': ledger,
         'implementation': 'cdf75af64fb5b118a5a808ecb3b05e2a05991c36'}

def run(args, cwd=LIVE, check=True):
    r = subprocess.run(args, cwd=cwd, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if check and r.returncode:
        raise RuntimeError(f'{args[0]} exited {r.returncode}: {r.stdout[-2500:]}')
    return r

def git(*args):
    return run(['git', *args]).stdout.strip()

def save():
    (HERE / 'live-release-state.json').write_text(json.dumps(state, ensure_ascii=False, indent=1) + '\n')

def scan(label):
    r = run(['nice', '-n', '19', 'gitleaks', 'git', '--pre-commit', '--staged', '--redact', '--no-banner',
             '--report-format', 'json', '--report-path', str(HERE / f'{label}.json')], check=False)
    (HERE / f'{label}.log').write_text(r.stdout)
    (HERE / f'{label}.exit').write_text(str(r.returncode) + '\n')
    assert r.returncode == 0, f'{label}: scan failed, original log retained'

def commit(message, label):
    scan(label)
    git('commit', '-m', message + COAUTHOR)
    return git('rev-parse', 'HEAD')

def sandbox(label):
    with (HERE / f'{label}.log').open('w') as log:
        r = subprocess.run(['nice', '-n', '19', 'bash', 'tools/test-sandbox.sh'],
                           cwd=LIVE / 'agent', env=env, stdout=log, stderr=subprocess.STDOUT)
    (HERE / f'{label}.exit').write_text(str(r.returncode) + '\n')
    assert r.returncode == 0, f'{label} failed, original log retained'

def tree_rows(commit_name):
    return {line.split('\t', 1)[1]: line.split('\t', 1)[0]
            for line in git('ls-tree', '-r', commit_name).splitlines()}

lock = (PROJECT / 'ops/live-merge.lock').open('a')
try:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    state['blocked'] = 'live merge lock busy; no live edits'
    save()
    raise SystemExit(3)
state['initial_live'] = git('rev-parse', 'HEAD')
pending = run(['git', 'rev-parse', '--verify', 'MERGE_HEAD'], check=False)
if pending.returncode == 0:
    state['blocked'] = 'Another session has a pending live merge; no live edits by this task'
    state['pending_merge_head'] = pending.stdout.strip()
    state['conflict_paths'] = git('diff', '--name-only', '--diff-filter=U').splitlines()
    save()
    raise SystemExit(4)
while run(['pgrep', '-f', 'knowledge/builders/buil[d]-'], check=False).returncode == 0:
    print('Waiting for knowledge builders', flush=True)
    time.sleep(10)

def signatures():
    paths = list((LIVE / 'knowledge').rglob('*.json'))
    paths += list((LIVE / 'notes').glob('fight-value-backtest*.md'))
    return {str(p.relative_to(LIVE)): (p.stat().st_mtime_ns, p.stat().st_size) for p in paths}

while True:
    before = signatures()
    time.sleep(10)
    if before == signatures():
        break
state['refresh_quiescence_seconds'] = 10
assert (LIVE / 'knowledge/characters/silent/boss-trust.json').read_bytes() == (HERE / 'previous-live-trust.json').read_bytes(), 'published calibration moved'
dirty = run(['git', 'status', '--porcelain', '--untracked-files=all']).stdout.splitlines()
refresh = [line[3:] for line in dirty if line[3:].startswith('knowledge/') or line[3:].startswith('notes/fight-value-backtest')]
assert not [line for line in dirty if line[3:] not in refresh], 'unrelated pending live edits'
state['refresh_paths'] = refresh
state['refresh_before_sha256'] = {p: hashlib.sha256((LIVE / p).read_bytes()).hexdigest() for p in refresh}
if refresh:
    sandbox('live-refresh-sandbox')
    git('add', '--', *refresh)
    state['refresh_commit'] = commit('Save live knowledge refresh before Silent calibration', 'live-refresh-gitleaks')
state['before_code'] = git('rev-parse', 'HEAD')
git('merge-base', '--is-ancestor', state['implementation'], state['before_code'])
paths = run(['git', 'diff', '--name-only', BASE, source], cwd=ROOT).stdout.splitlines()
assert paths and all(p.startswith('experiments/boss-sim/silent/') or p in (
    'knowledge/characters/silent/boss-trust.json', 'paper/materials/silent/boss-sim-calibration.md') for p in paths)
state['paths'] = paths
state['overlap'] = sorted(set(paths) & set(refresh))
assert not state['overlap'], 'source overlaps refreshed knowledge'
preflight = run(['git', 'merge-tree', '--write-tree', state['before_code'], source], check=False)
(HERE / 'live-preflight.log').write_text(preflight.stdout)
(HERE / 'live-preflight.exit').write_text(str(preflight.returncode) + '\n')
state['preflight_exit'] = preflight.returncode
old = tree_rows(state['before_code'])
save()
try:
    # Keep source ancestry while importing only the authorized delta; main contains parallel records.
    git('merge', '--no-ff', '--no-commit', '-s', 'ours', source)
    git('restore', '--source', source, '--staged', '--worktree', '--', *paths)
    state['merge_method'] = 'two-parent task-only merge; parallel main/live files preserved exactly'
    git('-c', 'core.whitespace=cr-at-eol', 'diff', '--cached', '--check', '--', '.', ':(glob,exclude)**/*.log')
    staged = git('write-tree')
    now = tree_rows(staged)
    assert {p:v for p,v in old.items() if p not in paths} == {p:v for p,v in now.items() if p not in paths}
    for p, value in state['refresh_before_sha256'].items():
        assert hashlib.sha256((LIVE / p).read_bytes()).hexdigest() == value, p
    sandbox('live-merged-sandbox')
    assert git('write-tree') == staged, 'staged merge changed during tests'
    state['merged'] = commit('Publish Silent boss validation refresh on fixed model', 'live-merge-gitleaks')
    state['tested_tree'] = git('rev-parse', 'HEAD^{tree}')
    assert state['tested_tree'] == staged
    state['sandbox_exit'] = 0
    save()
except BaseException as error:
    if run(['git', 'rev-parse', '--verify', 'MERGE_HEAD'], check=False).returncode == 0:
        git('merge', '--abort')
    elif state.get('merged') and git('rev-parse', 'HEAD') == state['merged']:
        git('reset', '--mixed', state['before_code'])
        existing = [p for p in paths if p in old]
        git('restore', '--source', state['before_code'], '--staged', '--worktree', '--', *existing)
        for p in paths:
            if p not in old:
                (LIVE / p).unlink(missing_ok=True)
    state['rolled_back'] = str(error)
    save()
    raise

timestamp = run(['date', '+%Y-%m-%d %H:%M:%S %Z']).stdout.strip()
vp = LIVE / 'eval/versions.json'
vt = vp.read_text()
versions = json.loads(vt)
numbers = [int(v['name'].split('S1.boss-calibration')[1]) for v in versions['versions'] if v['name'].startswith('S1.boss-calibration')]
version = 'S1.boss-calibration' + str(max(numbers, default=0) + 1)
trust = json.loads((LIVE / 'knowledge/characters/silent/boss-trust.json').read_text())
added = json.loads((HERE / 'new-fights.json').read_text())
evidence = sorted({r['run_id'] for r in added})
line = (f'- {timestamp} Codex学习者：Roy已授权新功能静默boss定期校准；23次新实结局只扩验证257→280，'
        f'212完局/963尝试/387可用，107调参及UTC切点/Platt保持；固定模型7e1193cef9467416bc10c8e344a49f4fd98390c7，210输入SHA核实、4项控制重放等价；'
        f'来源{evidence}，{ledger}为fight/proposed待运维核实，源{source}→实际{state["merged"]}，唯一{version}；'
        f'B2/B3 Brier {trust["overall"]["t1"]["brier"]}/{trust["overall"]["pre"]["brier"]}，可信{len(trust["trusted_b2"])}/{len(trust["trusted_b3"])}，'
        '逐boss/F49失败与低阶验证0限制见paper/materials/silent/boss-sim-calibration.md。'
        '只同步静默校准数据、其他角色及live刷新逐blob保持；源/合后沙箱tsc+vitest0、Python固定夹具0，'
        '完整外部检查交调度器，shipped交运维；未重拟合boss或改变费用/药水/保血/目标/SL阈值，不处理其他队列。\n')
with (LIVE / 'paper/materials/decision-log.md').open('a') as out:
    out.write(line)
entry = {'name': version, 'family': 'S1', 'commit': state['merged'],
         'source': f'decision-log {timestamp}: Roy授权静默boss固定模型验证刷新；源{source}；23新实结局，固定107调参/280验证；{ledger}；paper/materials/silent/boss-sim-calibration.md'}
versions['versions'].append(entry)
end = vt.rfind(']')
updated = vt[:end].rstrip() + ',\n    ' + json.dumps(entry, ensure_ascii=False) + '\n  ' + vt[end:]
assert json.loads(updated) == versions
vp.write_text(updated)
git('add', '--', 'paper/materials/decision-log.md', 'eval/versions.json')
state['publication'] = commit('Register ' + version + ' Silent boss validation release', 'live-records-gitleaks')
state.update({'version': version, 'publication_tree': git('rev-parse', 'HEAD^{tree}'), 'date': timestamp})
save()
print(json.dumps(state, ensure_ascii=False), flush=True)

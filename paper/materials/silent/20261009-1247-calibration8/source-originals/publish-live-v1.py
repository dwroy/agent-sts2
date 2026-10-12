"""Publish only this calibration delta while preserving concurrent live records and refreshes."""
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
BASE = 'f3f4366038918fcb22d25dd80be15716b91f4697'
COAUTHOR = '\n\nCo-Authored-By: OpenAI GPT-6 <noreply@openai.com>'
source = sys.argv[1]
ledger = sys.argv[2]
env = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'],
       'TMPDIR': str(HERE), 'SANDBOX_WORKERS': '4'}
state = {'source': source, 'base': BASE, 'ledger': ledger}

def run(args, cwd=LIVE, check=True):
    r = subprocess.run(args, cwd=cwd, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if check and r.returncode:
        raise RuntimeError(f'{args[0]} failed ({r.returncode}): {r.stdout[-2000:]}')
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
    if r.returncode:
        raise RuntimeError(f'{label} failed; original scan retained')

def commit(message):
    scan('live-' + message.lower().replace(' ', '-')[:55] + '-gitleaks')
    git('commit', '-m', message + COAUTHOR)
    return git('rev-parse', 'HEAD')

lock = (PROJECT / 'ops/live-merge.lock').open('a')
try:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    state['blocked'] = 'live merge lock busy; no live edits'
    save()
    raise SystemExit(3)

state['initial_live'] = git('rev-parse', 'HEAD')
while run(['pgrep', '-f', 'knowledge/builders/buil[d]-'], check=False).returncode == 0:
    print('Waiting for the knowledge builder to finish', flush=True)
    time.sleep(10)
# Process namespaces may hide other sessions; also require stable refresh files before staging.
def refresh_signature():
    candidates = list((LIVE / 'knowledge').rglob('*.json'))
    candidates += list((LIVE / 'notes').glob('fight-value-backtest*.md'))
    return {str(p.relative_to(LIVE)): (p.stat().st_mtime_ns, p.stat().st_size) for p in candidates}
while True:
    signature = refresh_signature()
    time.sleep(10)
    if signature == refresh_signature():
        break
    print('Knowledge files changed; waiting for a stable refresh snapshot', flush=True)
state['refresh_quiescence_seconds'] = 10
if run(['git', 'rev-parse', '--verify', 'MERGE_HEAD'], check=False).returncode == 0:
    raise RuntimeError('live already has a pending merge')
previous = (HERE / 'previous-trust.json').read_bytes()
if (LIVE / 'knowledge/characters/silent/boss-trust.json').read_bytes() != previous:
    raise RuntimeError('published calibration changed while computing; retain source, do not overwrite')
dirty = git('status', '--porcelain', '--untracked-files=all').splitlines()
refresh_paths = [line[3:] for line in dirty if line[3:].startswith('knowledge/')
                 or line[3:].startswith('notes/fight-value-backtest')]
other_dirty = [line for line in dirty if line[3:] not in refresh_paths]
if other_dirty:
    raise RuntimeError('live has non-refresh pending changes: ' + repr(other_dirty))
state['refresh_paths'] = refresh_paths
state['refresh_before_sha256'] = {p: hashlib.sha256((LIVE / p).read_bytes()).hexdigest() for p in refresh_paths}
if refresh_paths:
    git('add', '--', *refresh_paths)
    state['refresh_commit'] = commit('Save live knowledge refresh before Silent boss calibration')
state['before_code'] = git('rev-parse', 'HEAD')
state['implementation'] = 'cdf75af64fb5b118a5a808ecb3b05e2a05991c36'
git('merge-base', '--is-ancestor', state['implementation'], state['before_code'])
state['source_numeric_code_live_diff_paths'] = git('diff', '--name-only', source, state['before_code'], '--',
                                                  'agent/src', 'agent/tools').splitlines()
paths = run(['git', 'diff', '--name-only', BASE, source], cwd=ROOT).stdout.splitlines()
if any(not (p.startswith('experiments/boss-sim/silent/')
            or p in ('knowledge/characters/silent/boss-trust.json', 'paper/materials/silent/boss-sim-calibration.md')) for p in paths):
    raise RuntimeError('source delta includes unrelated paths')
state['paths'] = paths
state['overlap'] = sorted(set(paths) & set(refresh_paths))
if state['overlap']:
    save()
    raise RuntimeError('source overlaps refreshed knowledge')
preflight = run(['git', 'merge-tree', '--write-tree', state['before_code'], source], check=False)
(HERE / 'live-preflight.log').write_text(preflight.stdout)
(HERE / 'live-preflight.exit').write_text(str(preflight.returncode) + '\n')
state['preflight_exit'] = preflight.returncode
before_tree = git('ls-tree', '-r', state['before_code']).splitlines()
(HERE / 'preserved-live-tree.txt').write_text('\n'.join(before_tree) + '\n')
save()
try:
    # A task-only two-parent merge retains source ancestry without importing parallel main records.
    git('merge', '--no-ff', '--no-commit', '-s', 'ours', source)
    git('restore', '--source', source, '--staged', '--worktree', '--', *paths)
    # Raw evidence logs retain their exact original whitespace and are audited by SHA256.
    git('-c', 'core.whitespace=cr-at-eol', 'diff', '--cached', '--check', '--', '.', ':(glob,exclude)**/*.log')
    state['merged'] = commit('Publish authorized Silent boss calibration validation refresh')
    state['tested_tree'] = git('rev-parse', 'HEAD^{tree}')
    old = {line.split('\t', 1)[1]: line.split('\t', 1)[0] for line in before_tree}
    now = {line.split('\t', 1)[1]: line.split('\t', 1)[0] for line in git('ls-tree', '-r', 'HEAD').splitlines()}
    assert {p:v for p,v in old.items() if p not in paths} == {p:v for p,v in now.items() if p not in paths}
    for p, expected in state['refresh_before_sha256'].items():
        assert hashlib.sha256((LIVE / p).read_bytes()).hexdigest() == expected, p
    save()
    with (HERE / 'live-sandbox.log').open('w') as log:
        r = subprocess.run(['nice', '-n', '19', 'bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent',
                           env=env, stdout=log, stderr=subprocess.STDOUT)
    (HERE / 'live-sandbox.exit').write_text(str(r.returncode) + '\n')
    state['sandbox_exit'] = r.returncode
    if r.returncode:
        raise RuntimeError('live sandbox check failed; log retained')
except BaseException as error:
    if run(['git', 'rev-parse', '--verify', 'MERGE_HEAD'], check=False).returncode == 0:
        git('merge', '--abort')
    elif state.get('merged') and git('rev-parse', 'HEAD') == state['merged']:
        # Reset the commit/index, then restore only this task's files. Later live refreshes stay on disk.
        git('reset', '--mixed', state['before_code'])
        existing = [p for p in paths if run(['git', 'cat-file', '-e', state['before_code'] + ':' + p], check=False).returncode == 0]
        added = [p for p in paths if p not in existing]
        git('restore', '--source', state['before_code'], '--staged', '--worktree', '--', *existing)
        for p in added:
            (LIVE / p).unlink(missing_ok=True)
    state['rolled_back'] = str(error)
    save()
    raise

timestamp = run(['date', '+%Y-%m-%d %H:%M:%S %Z']).stdout.strip()
version_path = LIVE / 'eval/versions.json'
version_text = version_path.read_text()
versions = json.loads(version_text)
numbers = [int(v['name'].split('S1.boss-calibration')[1]) for v in versions['versions']
           if v['name'].startswith('S1.boss-calibration')]
version = 'S1.boss-calibration' + str(max(numbers, default=0) + 1)
trust = json.loads((LIVE / 'knowledge/characters/silent/boss-trust.json').read_text())
new = json.loads((HERE / 'new-fights.json').read_text())
evidence = sorted({r['run_id'] for r in new})
line = (f'- {timestamp} Codex学习者：Roy已授权新功能静默boss定期校准刷新；20新实际结局触发，'
        f'166完局/760尝试/301可用，固定107调参与UTC切点，验证174→194；来源{evidence}，'
        f'账本{ledger}为fight/proposed待运维核实；复用实现cdf75af64fb5b118a5a808ecb3b05e2a05991c36，'
        f'本批源{source}→实际{state["merged"]}，版本{version}；'
        f'B2/B3 Brier={trust["overall"]["t1"]["brier"]}/{trust["overall"]["pre"]["brier"]}，'
        f'可信{trust["trusted_b2"]}/{trust["trusted_b3"]}，F49独立限制保留；'
        '完整来源/残差/不足见paper/materials/silent/boss-sim-calibration.md与新指纹目录。'
        '原阈值与其他角色等价，知识刷新逐blob保持；源/合后固定沙箱tsc+vitest0，Python固定夹具0，'
        '完整外部检查交调度器，shipped交运维；不修其他队列、不运行play、不推送。\n')
with (LIVE / 'paper/materials/decision-log.md').open('a') as out:
    out.write(line)
entry = {'name': version, 'family': 'S1', 'commit': state['merged'],
         'source': f'decision-log {timestamp}: Roy授权静默boss定期校准；源{source}；20新实际结局，固定107调参/194验证；{ledger}；paper/materials/silent/boss-sim-calibration.md'}
versions['versions'].append(entry)
end_array = version_text.rfind(']')
head = version_text[:end_array].rstrip()
updated = head + ',\n    ' + json.dumps(entry, ensure_ascii=False) + '\n  ' + version_text[end_array:]
assert json.loads(updated) == versions
version_path.write_text(updated)
git('add', '--', 'paper/materials/decision-log.md', 'eval/versions.json')
state['publication'] = commit('Register ' + version + ' Silent boss calibration release')
state.update({'version': version, 'publication_tree': git('rev-parse', 'HEAD^{tree}'), 'date': timestamp})
save()
print(json.dumps(state, ensure_ascii=False))

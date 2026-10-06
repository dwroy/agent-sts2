import json
import os
import re
import subprocess
from pathlib import Path

O = Path(__file__).parent
ROOT = O.parents[2]
LIVE = ROOT / '.worktrees/live'
source = (O / 'commit.txt').read_text().strip()
os.environ['TMPDIR'] = str(O)
os.environ['PATH'] = str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH']
os.environ.pop('CHARACTER', None)
meta = dict(source_commit=source, branch='exp-silent', merged=None, test_rc=None)

def run(*args, check=True):
    p = subprocess.run(['git', *args], cwd=LIVE, capture_output=True, text=True)
    if check and p.returncode:
        raise RuntimeError(p.stdout + p.stderr)
    return p

def git(*args):
    return run(*args).stdout.strip()

def save():
    (O / 'live-merge.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')

def stop(reason):
    meta['reason'] = reason
    save()
    print(reason, flush=True)
    raise SystemExit(3)

def scan(name):
    patch = O / (name + '.patch')
    patch.write_text(git('diff', '--cached', '--binary') + '\n')
    with (O / ('gitleaks-' + name + '.log')).open('w') as handle:
        subprocess.run(['nice', '-n', '19', str(Path.home() / '.local/bin/gitleaks'), 'dir', '--redact', '--no-banner', str(patch)], stdout=handle, stderr=subprocess.STDOUT, check=True)

def blob(ref, path):
    p = run('rev-parse', ref + ':' + path, check=False)
    return p.stdout.strip() if p.returncode == 0 else None

assert (O/'test-source-final.rc').read_text().strip()=='0'
meta['initial_head'] = git('rev-parse', 'HEAD')
meta['initial_experience_version']=json.loads((LIVE/'knowledge/characters/silent/experience.json').read_text())['version']
tip = git('rev-parse', 'exp-silent')
assert tip == source
if run('rev-parse', '-q', '--verify', 'MERGE_HEAD', check=False).returncode == 0:
    stop('live已有未完成合并，停止、不动索引')
if git('diff', '--cached', '--name-only'):
    stop('live已有他人暂存改动，停止、不动索引')
base = git('merge-base', 'HEAD', source)
incoming = set(git('diff', '--name-only', base, source, '--', 'knowledge').splitlines())
refresh = set(git('diff', '--name-only', '--', 'knowledge', 'notes/fight-value-backtest.md').splitlines())
meta.update(fork=base, incoming=sorted(incoming), refresh=sorted(refresh))
git('add', 'notes/fight-value-backtest.md', 'knowledge')
if git('diff', '--cached', '--name-only'):
    scan('live-refresh')
    git('-c', 'user.name=dwroy', '-c', 'user.email=roy.dongwei@gmail.com', 'commit', '-m', 'Refresh knowledge data', '-m', 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
    meta['refresh_commit'] = git('rev-parse', 'HEAD')
meta['base'] = git('rev-parse', 'HEAD')
live_changed = set(git('diff', '--name-only', base, 'HEAD', '--', 'knowledge').splitlines())
overlap = incoming & live_changed
identical = {path for path in overlap if blob('HEAD', path) == blob(source, path)}
experience = 'knowledge/characters/silent/experience.json'
baseline_blob = git('hash-object', str(O / 'experience-before.json'))
predecessor = {path for path in overlap if path == experience and blob('HEAD', path) == baseline_blob}
conflicting = overlap - identical - predecessor
meta.update(overlap=sorted(overlap), identical_overlap=sorted(identical), tested_predecessor_overlap=sorted(predecessor), conflicting_overlap=sorted(conflicting))
save()
if conflicting:
    stop('刷新知识与本分支不同blob重叠，停止、不覆盖刷新数据')
if git('diff', '--name-only', '--', 'knowledge', 'notes/fight-value-backtest.md'):
    stop('后台刷新仍在写入，停止合入')
meta['knowledge_before'] = git('ls-tree', '-r', 'HEAD', 'knowledge')
preview = run('merge-tree', '--write-tree', 'HEAD', source, check=False)
(O / 'merge-tree-locked.txt').write_text(preview.stdout + preview.stderr)
meta['preflight_rc'] = preview.returncode
conflicts = set(re.findall(r'^\d{6} [0-9a-f]+ [123]\t(.+)$', preview.stdout, re.M))
history = 'paper/materials/decision-log.md'
if preview.returncode and conflicts != {history}:
    stop('锁内预检有知识或非追加记录冲突，停止不硬解')
meta['preview_history_only_conflict'] = bool(preview.returncode)
preview_tree = preview.stdout.splitlines()[0]
assert blob(preview_tree, experience) == blob(source, experience)
preview_patch = O / 'live-merge-preview.patch'
preview_patch.write_text(git('diff', '--binary', 'HEAD', preview_tree) + '\n')
with (O / 'gitleaks-live-preview.log').open('w') as handle:
    subprocess.run(['nice', '-n', '19', str(Path.home() / '.local/bin/gitleaks'), 'dir', '--redact', '--no-banner', str(preview_patch)], stdout=handle, stderr=subprocess.STDOUT, check=True)
p = run('-c', 'user.name=dwroy', '-c', 'user.email=roy.dongwei@gmail.com', 'merge', '--no-edit', 'exp-silent', check=False)
(O / 'git-merge-live.log').write_text(p.stdout + p.stderr)
if p.returncode:
    unresolved = set(git('diff', '--name-only', '--diff-filter=U').splitlines())
    if unresolved != {history}:
        if run('rev-parse', '-q', '--verify', 'MERGE_HEAD', check=False).returncode == 0:
            git('merge', '--abort')
        stop('实际合并受阻，已中止、保留刷新数据')
    originals = []
    for stage, name in [(2, 'history-live'), (1, 'history-base'), (3, 'history-source')]:
        data = git('show', f':{stage}:{history}') + '\n'
        path = O / (name + '.md')
        path.write_text(data)
        originals.append(path)
    combined = subprocess.run(['git', 'merge-file', '-p', '--union', *map(str, originals)], capture_output=True, text=True)
    def subsequence(before, after):
        iterator = iter(after.splitlines())
        return all(any(line == candidate for candidate in iterator) for line in before.splitlines())
    if combined.returncode or not all(subsequence(path.read_text(), combined.stdout) for path in [originals[0], originals[2]]):
        git('merge', '--abort')
        stop('追加历史union未能完整保留双方有序原文，已中止合并')
    (LIVE / history).write_text(combined.stdout)
    git('add', history)
    git('-c', 'core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol', 'diff', '--cached', '--check', '--', experience, history)
    scan('live-merge')
    git('-c', 'user.name=dwroy', '-c', 'user.email=roy.dongwei@gmail.com', 'commit', '-m', 'Merge Silent experience 2026-10-07.3: add 1, update 19, retire 0', '-m', 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
    meta['append_history_union'] = dict(path=history, both_ordered_histories_preserved=True)
elif len(git('rev-list', '--parents', '-n', '1', 'HEAD').split()) > 2:
    git('-c', 'user.name=dwroy', '-c', 'user.email=roy.dongwei@gmail.com', 'commit', '--amend', '--no-edit', '--trailer', 'Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
meta['merged'] = git('rev-parse', 'HEAD')
save()
print('实际合入', meta['merged'], '开始合后固定沙箱测试', flush=True)
with (O / 'test-live.log').open('w') as handle:
    p = subprocess.run(['bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent', stdout=handle, stderr=subprocess.STDOUT)
meta['test_first_rc'] = p.returncode
save()
if p.returncode:
    with (O / 'test-live-retry.log').open('w') as handle:
        p = subprocess.run(['bash', 'tools/test-sandbox.sh'], cwd=LIVE / 'agent', stdout=handle, stderr=subprocess.STDOUT)
meta['test_rc'] = p.returncode
save()
if p.returncode:
    git('reset', '--merge', meta['base'])
    meta['rolled_back_from'] = meta['merged']
    meta['merged'] = None
    stop('合后沙箱重跑仍失败，已回退到合前提交、保留刷新数据')
assert blob('HEAD', 'knowledge/characters/silent/experience.json') == blob(source, 'knowledge/characters/silent/experience.json')
before = {r.split('\t')[1]: r.split()[2] for r in meta['knowledge_before'].splitlines()}
after = {r.split('\t')[1]: r.split()[2] for r in git('ls-tree', '-r', 'HEAD', 'knowledge').splitlines()}
assert all(after[path] == value for path, value in before.items() if path not in incoming or path in identical)
meta['untouched_knowledge_blobs_preserved'] = True
save()
print('合后沙箱通过、其他知识blob保持', flush=True)

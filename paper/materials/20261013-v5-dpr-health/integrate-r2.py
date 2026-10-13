"""Exact feature integration under the shared lock; no game/process/knowledge actions."""
from pathlib import Path
import datetime
import fcntl
import hashlib
import json
import subprocess
import sys

root = Path('/home/dw/Projects/agent-sts2')
out = root / 'paper/materials/20261013-v5-dpr-health'
source = sys.argv[1]
files = [row['path'] for row in json.loads((out / 'source-leaves.json').read_text())]
live = root / '.worktrees/live'

def git(directory, *args):
    return subprocess.check_output(['git', '-C', str(directory), *args], text=True).strip()

def assert_clear(directory):
    if git(directory, 'diff', '--cached', '--name-only'):
        raise RuntimeError(f'{directory.name}: another staged operation present')
    if git(directory, 'status', '--porcelain', '--untracked-files=no', '--', *files):
        raise RuntimeError(f'{directory.name}: changed target leaves')
    for name in files:
        if (directory / name).exists() and subprocess.run(['git', '-C', str(directory), 'ls-files', '--error-unmatch', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode:
            raise RuntimeError(f'{directory.name}: untracked target {name}')

def dirty_knowledge(directory):
    names = git(directory, 'diff', '--name-only', '--', 'knowledge', 'notes').splitlines()
    return {name: hashlib.sha256((directory/name).read_bytes()).hexdigest() for name in names}

with (root / 'ops/live-merge.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    assert_clear(root)
    assert_clear(live)
    before = {'main': git(root, 'rev-parse', 'HEAD'), 'live': git(live, 'rev-parse', 'HEAD')}
    preserved = dirty_knowledge(live)
    # Validate the live target's only divergence from the tested parent consists of
    # the already documented Roy/Dai historical name comments and prose.
    parent = git(root, 'rev-parse', source + '^')
    documentation_append = b''
    for name in files:
        a = subprocess.run(['git', '-C', str(root), 'show', f'{parent}:{name}'], capture_output=True)
        b = subprocess.run(['git', '-C', str(live), 'show', f'HEAD:{name}'], capture_output=True)
        if name == 'docs/codex-ops.md':
            new_doc = subprocess.check_output(['git', '-C', str(root), 'show', f'{source}:{name}'])
            if not new_doc.startswith(a.stdout):
                raise RuntimeError('documentation source is not append-only')
            documentation_append = new_doc[len(a.stdout):]
            continue
        if a.returncode == 0 and b.returncode == 0 and a.stdout.replace(b'Dai', b'Roy') != b.stdout.replace(b'Dai', b'Roy'):
            raise RuntimeError(f'parallel live changes require review: {name}')
        if (a.returncode == 0) != (b.returncode == 0):
            raise RuntimeError(f'parallel target presence change: {name}')
    git(root, 'merge', '--no-ff', source, '-m', 'Integrate Silent V5 DPR health acceptance\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>')
    main = git(root, 'rev-parse', 'HEAD')
    git(live, 'restore', '--source', source, '--staged', '--worktree', '--', *[n for n in files if n != 'docs/codex-ops.md'])
    with (live/'docs/codex-ops.md').open('ab') as handle:
        handle.write(documentation_append)
    git(live, 'add', '--', 'docs/codex-ops.md')
    staged = set(git(live, 'diff', '--cached', '--name-only').splitlines())
    if staged != set(files):
        raise RuntimeError('unexpected staged leaf set; preserved for review')
    git(live, 'commit', '-m', f'Deploy Silent V5 DPR health acceptance\n\nExact source: {source}\nTelemetry and service acceptance only; simulation policy unchanged.\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>')
    deployed = git(live, 'rev-parse', 'HEAD')
    verification = []
    for name in files:
        blobs = {lane: git(path, 'rev-parse', f'{ref}:{name}') for lane,path,ref in [('source',root,source),('main',root,main),('live',live,deployed)]}
        if name == 'docs/codex-ops.md':
            expected = subprocess.check_output(['git', '-C', str(live), 'show', before['live'] + ':' + name]) + documentation_append
            if (live/name).read_bytes() != expected:
                raise RuntimeError('live documentation changed outside feature append')
        elif len(set(blobs.values())) != 1:
            raise RuntimeError(f'deployed blob mismatch: {name}')
        verification.append({'path': name, **blobs})
    if preserved != dirty_knowledge(live):
        raise RuntimeError('refreshed knowledge/notes changed during integration; inspect external writer')
    receipt = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'source': source, 'before': before,
               'main': main, 'live': deployed, 'tree': git(live,'rev-parse','HEAD^{tree}'),
               'leaves': verification, 'preserved_dirty_knowledge': preserved,
               'documentation_exception': 'live pre-existing docs retained; only the new feature section appended',
               'behavior_version': 'none: metrics/logging/acceptance only; budgets, thresholds and game policy unchanged',
               'natural_telemetry': 'pending next naturally started process; running game not restarted'}
    (out/'integration.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'main':main,'live':deployed,'source':source,'leaves':len(files)}))

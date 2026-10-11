"""Inspect publication blockers under the live lock without touching another merge."""
import fcntl
import hashlib
import json
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
PROJECT = Path('/home/dw/Projects/agent-sts2')
LIVE = PROJECT / '.worktrees/live'
state = {'source': sys.argv[1], 'merged': None, 'publication': None, 'version': None}

def run(args):
    return subprocess.run(args, cwd=LIVE, capture_output=True, text=True)

def save():
    (HERE / 'live-release-state.json').write_text(json.dumps(state, ensure_ascii=False, indent=1) + '\n')

with (PROJECT / 'ops/live-merge.lock').open('a') as lock:
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        state['blocked'] = 'live merge lock busy; no live changes'
        save()
        raise SystemExit(3)
    state['lock_acquired'] = True
    state['observed_at'] = run(['date', '+%Y-%m-%d %H:%M:%S %Z']).stdout.strip()
    state['initial_live'] = run(['git', 'rev-parse', 'HEAD']).stdout.strip()
    state['initial_live_tree'] = run(['git', 'rev-parse', 'HEAD^{tree}']).stdout.strip()
    pending = run(['git', 'rev-parse', '--verify', 'MERGE_HEAD'])
    status = run(['git', 'status', '--porcelain', '--untracked-files=all']).stdout
    (HERE / 'live-status.txt').write_text(status)
    state['trust_sha256'] = hashlib.sha256((LIVE / 'knowledge/characters/silent/boss-trust.json').read_bytes()).hexdigest()
    state['previous_unchanged'] = state['trust_sha256'] == hashlib.sha256((HERE / 'previous-live-trust.json').read_bytes()).hexdigest()
    if pending.returncode == 0:
        state['blocked'] = 'Another session has an unfinished live merge; no live writes, no refresh commit, no code merge or publication'
        state['pending_merge_head'] = pending.stdout.strip()
        state['conflict_paths'] = run(['git', 'diff', '--name-only', '--diff-filter=U']).stdout.splitlines()
        state['source_is_live_ancestor'] = run(['git', 'merge-base', '--is-ancestor', state['source'], 'HEAD']).returncode == 0
        save()
        print(json.dumps(state, ensure_ascii=False))
        raise SystemExit(4)
    state['ready_for_full_locked_workflow'] = True
    save()
    print(json.dumps(state, ensure_ascii=False))
